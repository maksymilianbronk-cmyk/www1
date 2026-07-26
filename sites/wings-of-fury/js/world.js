/* =========================================================================
   Świat: teren, morze, chmury, sceneria, leje i ślady po zniszczeniach
   ========================================================================= */
'use strict';

const STEP = 16;          // rozdzielczość mapy wysokości (px)
const SEA_Y = 0;          // poziom morza / bazowy poziom gruntu

class World {
  constructor(cfg) {
    this.cfg = cfg;
    this.width = cfg.width || 9000;
    this.rng = makeRng(cfg.seed || 1337);
    this.n = Math.ceil(this.width / STEP) + 2;
    this.h = new Float32Array(this.n);
    this.baseH = new Float32Array(this.n);
    this.decals = [];
    this.scenery = [];
    this.clouds = [];
    this.runways = [];
    this.time = cfg.time || 'day';
    this.wind = cfg.wind ?? rnd(14, -14);
    this.hasSea = !!cfg.sea;
    this.waveT = 0;
    this.ceiling = cfg.ceiling || 3000;
    this.generate();
  }

  /* ---------------- generowanie ---------------- */
  generate() {
    const r = this.rng, cfg = this.cfg;
    const base = cfg.baseHeight ?? 260;
    const amp = cfg.relief ?? 90;
    // suma kilku sinusów o losowych fazach — łagodne polskie pagórki
    const oct = [
      { w: 2600, a: amp * 1.0, p: r() * TAU },
      { w: 1100, a: amp * 0.5, p: r() * TAU },
      { w: 430, a: amp * 0.22, p: r() * TAU },
      { w: 170, a: amp * 0.08, p: r() * TAU },
    ];
    for (let i = 0; i < this.n; i++) {
      const x = i * STEP;
      let y = base;
      for (const o of oct) y += Math.sin(x / o.w * TAU + o.p) * o.a;
      this.h[i] = y;
    }
    // morze: zanurz wskazane przedziały
    if (cfg.seaSpans) {
      for (const s of cfg.seaSpans) this.carveSea(s[0], s[1], s[2] ?? 340);
    }
    // wyspy
    if (cfg.islands) {
      for (const isl of cfg.islands) this.raiseIsland(isl.x, isl.w, isl.h);
    }
    // płaskie pola / lotniska
    if (cfg.flats) for (const f of cfg.flats) this.flatten(f[0], f[1], f[2]);

    for (let i = 0; i < this.n; i++) this.baseH[i] = this.h[i];
    this.buildScenery();
    this.buildClouds();
  }

  carveSea(x0, x1, depth) {
    const i0 = Math.max(0, Math.floor(x0 / STEP)), i1 = Math.min(this.n - 1, Math.ceil(x1 / STEP));
    const feather = 900 / STEP;
    for (let i = i0; i <= i1; i++) {
      const d0 = (i - i0) / feather, d1 = (i1 - i) / feather;
      const k = clamp(Math.min(d0, d1), 0, 1);
      const t = k * k * (3 - 2 * k);
      const target = -depth + Math.sin(i * 0.21) * 22;
      this.h[i] = lerp(this.h[i], target, t);
    }
  }

  raiseIsland(cx, w, hh) {
    const i0 = Math.max(0, Math.floor((cx - w / 2) / STEP)), i1 = Math.min(this.n - 1, Math.ceil((cx + w / 2) / STEP));
    for (let i = i0; i <= i1; i++) {
      const t = (i * STEP - (cx - w / 2)) / w;
      const bell = Math.sin(clamp(t, 0, 1) * Math.PI);
      this.h[i] = Math.max(this.h[i], -140 + bell * (hh + 140));
    }
  }

  flatten(x0, x1, y) {
    const i0 = Math.max(0, Math.floor(x0 / STEP)), i1 = Math.min(this.n - 1, Math.ceil(x1 / STEP));
    const ramp = 340 / STEP;
    for (let i = Math.max(0, i0 - ramp | 0); i <= Math.min(this.n - 1, i1 + ramp); i++) {
      let t = 1;
      if (i < i0) t = clamp(1 - (i0 - i) / ramp, 0, 1);
      else if (i > i1) t = clamp(1 - (i - i1) / ramp, 0, 1);
      t = t * t * (3 - 2 * t);
      this.h[i] = lerp(this.h[i], y, t);
    }
  }

  buildScenery() {
    const r = this.rng;
    const density = this.cfg.treeDensity ?? 0.55;
    for (let x = 60; x < this.width - 60; x += rnd(120, 34)) {
      const g = this.groundAt(x);
      if (g <= 6) continue;                         // nie sadzimy w morzu
      if (this.inRunway(x)) continue;
      const t = r();
      if (t < density * 0.6) {
        this.scenery.push({ type: r() < 0.55 ? 'pine' : 'tree', x, y: g, s: rnd(1.35, 0.7), sway: r() * TAU, burnt: false });
      } else if (t < density * 0.78) {
        this.scenery.push({ type: 'bush', x, y: g, s: rnd(1.1, 0.6), sway: r() * TAU, burnt: false });
      } else if (t < density * 0.86) {
        this.scenery.push({ type: 'rock', x, y: g, s: rnd(1, 0.5), burnt: false });
      } else if (t < density * 0.92) {
        this.scenery.push({ type: 'pole', x, y: g, s: rnd(1.1, 0.85), burnt: false });
      } else if (t < density * 0.97) {
        this.scenery.push({ type: 'hay', x, y: g, s: rnd(1.1, 0.7), burnt: false });
      } else {
        this.scenery.push({ type: 'fence', x, y: g, s: 1, burnt: false });
      }
    }
    this.scenery.sort((a, b) => a.x - b.x);
  }

  buildClouds() {
    const r = this.rng;
    const n = Math.round(this.width / 620);
    for (let i = 0; i < n; i++) {
      const layer = r() < 0.45 ? 0 : 1;
      this.clouds.push({
        x: r() * this.width * 1.2 - this.width * 0.1,
        y: 700 + r() * 1900 + layer * 260,
        s: rnd(1.9, 0.7) * (layer ? 1 : 0.72),
        p: layer ? 0.96 : 0.84,           // parallaksa
        puffs: Array.from({ length: 4 + ((r() * 4) | 0) }, () => ({ dx: rnd(110, -110), dy: rnd(20, -20), r: rnd(46, 20) })),
        v: rnd(9, 2) * (r() < 0.5 ? -1 : 1),
        a: rnd(0.62, 0.3),
      });
    }
  }

  /* ---------------- odczyt terenu ---------------- */
  groundAt(x) {
    const fi = x / STEP;
    let i = fi | 0;
    if (i < 0) i = 0; else if (i > this.n - 2) i = this.n - 2;
    const t = clamp(fi - i, 0, 1);
    return lerp(this.h[i], this.h[i + 1], t);
  }
  /** Nachylenie terenu (rad). */
  slopeAt(x) {
    const a = this.groundAt(x - 24), b = this.groundAt(x + 24);
    return Math.atan2(b - a, 48);
  }
  isWater(x) { return this.hasSea && this.groundAt(x) < SEA_Y - 4; }
  /** Wysokość powierzchni (woda lub grunt). */
  surfaceAt(x) { return this.isWater(x) ? SEA_Y : this.groundAt(x); }

  inRunway(x) {
    for (const rw of this.runways) if (x > rw.x0 - 40 && x < rw.x1 + 40) return rw;
    return null;
  }
  addRunway(x0, x1, y, opt = {}) {
    const rw = Object.assign({ x0, x1, y, name: 'Lotnisko', friendly: true, deck: false }, opt);
    // pokład lotniskowca unosi się nad wodą — terenu nie ruszamy
    if (!rw.deck) {
      this.flatten(x0 - 120, x1 + 120, y);
      for (let i = 0; i < this.n; i++) this.baseH[i] = this.h[i];
      this.scenery = this.scenery.filter(s => s.x < x0 - 60 || s.x > x1 + 60);
    }
    this.runways.push(rw);
    return rw;
  }

  /* ---------------- deformacja ---------------- */
  crater(x, radius, depth) {
    const i0 = Math.max(0, Math.floor((x - radius) / STEP)), i1 = Math.min(this.n - 1, Math.ceil((x + radius) / STEP));
    for (let i = i0; i <= i1; i++) {
      const dx = (i * STEP - x) / radius;
      if (Math.abs(dx) > 1) continue;
      const k = Math.cos(dx * Math.PI * 0.5);
      const rim = Math.max(0, Math.abs(dx) - 0.62) * 2.4;      // wał wokół leja
      this.h[i] += -depth * k * k + depth * 0.28 * rim;
      // nie kopiemy w nieskończoność
      const floor = this.baseH[i] - depth * 2.4;
      if (this.h[i] < floor) this.h[i] = floor;
    }
    this.addDecal({ type: 'crater', x, y: this.groundAt(x), r: radius * rnd(1.05, 0.8), rot: 0 });
  }

  addDecal(d) {
    d.age = 0;
    this.decals.push(d);
    const MAXD = Settings.quality === 'low' ? 120 : Settings.quality === 'med' ? 260 : 520;
    if (this.decals.length > MAXD) this.decals.splice(0, this.decals.length - MAXD);
  }

  scorch(x, y, r) { this.addDecal({ type: 'scorch', x, y, r, rot: rnd(TAU) }); }
  corpse(x, y, dir) { this.addDecal({ type: 'corpse', x, y, dir, rot: rnd(0.5, -0.5) }); }

  /** Wypalanie drzew w promieniu wybuchu. */
  blastScenery(x, r) {
    for (const s of this.scenery) {
      if (s.burnt) continue;
      const d = Math.abs(s.x - x);
      if (d < r) {
        if (d < r * 0.55 && (s.type === 'tree' || s.type === 'pine' || s.type === 'hay' || s.type === 'bush')) {
          s.burnt = true; s.fire = rnd(6, 3);
          Particles.debris(s.x, s.y + 20, 5, { col: '#3b2f1f', spd: 160 });
        } else if (s.type === 'pole' || s.type === 'fence') {
          if (d < r * 0.6) { s.burnt = true; s.fire = 0; }
        } else {
          s.sway += rnd(0.6, -0.6);
        }
      }
    }
  }

  update(dt) {
    this.waveT += dt;
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x < -600) c.x = this.width + 400;
      if (c.x > this.width + 600) c.x = -400;
    }
    // dymiące zgliszcza roślinności
    for (const s of this.scenery) {
      if (s.burnt && s.fire > 0) {
        s.fire -= dt;
        if (Math.random() < dt * 3) Particles.fire(s.x + rnd(10, -10), s.y + 14, { dens: 0.5, sizeMul: 0.7 });
        if (Math.random() < dt * 2) Particles.smoke(s.x, s.y + 20, { dens: 0.4, col: '#2f2c27', sizeMul: 0.8 });
      }
    }
    for (const d of this.decals) d.age += dt;
  }

  /* ================= RYSOWANIE ================= */
  palette() {
    switch (this.time) {
      case 'dawn': return {
        sky: ['#26364f', '#7a5a6a', '#d9915e', '#f0c08a'],
        far: '#3d4a5c', mid: '#33414f', grassTop: '#4e5c3a', grass: '#3f4a30', soil: '#3a2f24', rock: '#464040',
        water: ['#2b4258', '#16283a'], sun: '#ffd9a0', haze: 'rgba(255,190,140,.12)',
      };
      case 'dusk': return {
        sky: ['#1b2440', '#4b3358', '#a34e4a', '#e08a52'],
        far: '#33384d', mid: '#2b3040', grassTop: '#41482f', grass: '#343a26', soil: '#31281e', rock: '#3b3636',
        water: ['#243a51', '#132234'], sun: '#ff9b57', haze: 'rgba(255,150,90,.14)',
      };
      case 'overcast': return {
        sky: ['#333c48', '#4d5763', '#6e7883', '#98a2ab'],
        far: '#4a5560', mid: '#3a444e', grassTop: '#465138', grass: '#39422e', soil: '#332b20', rock: '#43403d',
        water: ['#3f4f5c', '#22303b'], sun: '#c3cad1', haze: 'rgba(200,210,220,.12)',
      };
      default: return {
        sky: ['#124b83', '#2b76b3', '#6aa7d4', '#b2d3e8'],
        far: '#6f8ea9', mid: '#54755f', grassTop: '#5d7a3c', grass: '#4a6330', soil: '#4a3a29', rock: '#585250',
        water: ['#2f6f93', '#17415c'], sun: '#fff3c4', haze: 'rgba(255,255,255,.10)',
      };
    }
  }

  drawSky(ctx, W, H) {
    const P = this.palette();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.sky[0]); g.addColorStop(0.42, P.sky[1]);
    g.addColorStop(0.78, P.sky[2]); g.addColorStop(1, P.sky[3]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // słońce — prawie nieruchome, lekko reaguje na ruch kamery
    const sunX = W * 0.74 - (Cam.x * 0.012) % (W * 2);
    const sunY = H * 0.15 + Cam.y * 0.02;
    const cloudy = this.time === 'overcast';
    const rad = cloudy ? 240 : 190;
    const sg = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, rad);
    sg.addColorStop(0, P.sun);
    sg.addColorStop(cloudy ? 0.35 : 0.12, cloudy ? 'rgba(210,218,226,.30)' : 'rgba(255,240,190,.55)');
    sg.addColorStop(1, cloudy ? 'rgba(200,210,220,0)' : 'rgba(255,220,160,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sunX, sunY, rad, 0, TAU); ctx.fill();
  }

  drawClouds(ctx, W, H, front) {
    const top = this.time === 'dusk' ? '255,214,186' : this.time === 'dawn' ? '252,225,201'
      : this.time === 'overcast' ? '196,203,210' : '255,255,255';
    const bot = this.time === 'overcast' ? '120,129,138' : this.time === 'dusk' ? '166,132,132' : '176,196,214';
    for (const c of this.clouds) {
      if ((c.p > 0.9) !== !!front) continue;
      const sx = (c.x - Cam.x * c.p) * Cam.zoom + W / 2;
      const sy = H / 2 - (c.y - Cam.y * c.p) * Cam.zoom;
      const s = c.s * Cam.zoom;
      if (sx < -300 * s || sx > W + 300 * s || sy < -220 * s || sy > H + 220 * s) continue;
      ctx.save();
      ctx.translate(sx, sy);
      // każdy kłąb rysowany miękkim gradientem — bez twardych kół
      for (const p of c.puffs) {
        const r = p.r * s;
        if (r < 0.6) continue;
        const px = p.dx * s, py = p.dy * s;
        const gs = ctx.createRadialGradient(px, py - r * 0.25, r * 0.1, px, py, r);
        gs.addColorStop(0, `rgba(${top},${c.a})`);
        gs.addColorStop(0.5, `rgba(${top},${c.a * 0.62})`);
        gs.addColorStop(0.82, `rgba(${bot},${c.a * 0.22})`);
        gs.addColorStop(1, `rgba(${bot},0)`);
        ctx.fillStyle = gs;
        ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /** Odległe pasma wzgórz (parallaksa). */
  drawParallax(ctx, W, H) {
    const P = this.palette();
    // trzy pasma wzgórz coraz bliżej — im dalej, tym bardziej „rozmyte" w powietrzu
    const layers = [
      { p: 0.16, col: P.far, amp: 62, base: -30, w: 2400, a: 0.42, det: 0.3 },
      { p: 0.3, col: P.far, amp: 78, base: 10, w: 1500, a: 0.6, det: 0.4 },
      { p: 0.48, col: P.mid, amp: 92, base: 70, w: 950, a: 0.85, det: 0.5 },
    ];
    for (const L of layers) {
      ctx.beginPath();
      ctx.moveTo(-10, H + 20);
      for (let sx = -10; sx <= W + 10; sx += 10) {
        const wx = (sx - W / 2) / Cam.zoom + Cam.x * L.p;
        const y = L.base + Math.sin(wx / L.w * TAU) * L.amp
          + Math.sin(wx / (L.w * 0.37) * TAU + 1.3) * L.amp * L.det
          + Math.sin(wx / (L.w * 0.13) * TAU + 2.1) * L.amp * L.det * 0.35;
        const sy = H / 2 - (y - Cam.y * L.p) * Cam.zoom;
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(W + 10, H + 20); ctx.closePath();
      ctx.globalAlpha = L.a; ctx.fillStyle = L.col; ctx.fill();
      ctx.globalAlpha = 1;
    }
    // mgiełka nad horyzontem
    const hy = Cam.sy(120, H);
    if (hy > -200 && hy < H + 200) {
      const g = ctx.createLinearGradient(0, hy - 160, 0, hy + 90);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, this.time === 'dusk' ? 'rgba(255,170,120,.30)' :
        this.time === 'dawn' ? 'rgba(255,200,160,.30)' :
          this.time === 'overcast' ? 'rgba(210,216,222,.36)' : 'rgba(210,228,244,.34)');
      ctx.fillStyle = g;
      ctx.fillRect(0, hy - 160, W, 250);
    }
  }

  /** Główny teren + woda + sceneria + ślady. */
  drawTerrain(ctx, W, H) {
    const P = this.palette();
    const z = Cam.zoom;
    const x0 = Cam.x - (W / 2) / z - 80, x1 = Cam.x + (W / 2) / z + 80;
    const stepPx = Math.max(6, STEP * z) / z;

    // --- ziemia ---
    ctx.beginPath();
    ctx.moveTo(Cam.sx(x0, W), H + 20);
    for (let x = x0; x <= x1; x += stepPx) ctx.lineTo(Cam.sx(x, W), Cam.sy(this.groundAt(x), H));
    ctx.lineTo(Cam.sx(x1, W), H + 20);
    ctx.closePath();
    const topY = Cam.sy(600, H), botY = H + 20;
    const gg = ctx.createLinearGradient(0, topY, 0, botY);
    gg.addColorStop(0, P.grassTop); gg.addColorStop(0.18, P.grass); gg.addColorStop(0.55, P.soil); gg.addColorStop(1, '#241c15');
    ctx.fillStyle = gg;
    ctx.fill();

    // faktura gruntu — wszystko wewnątrz obrysu terenu
    ctx.save();
    ctx.clip();

    // ciemniejszy cień tuż pod darnią (głębia)
    ctx.strokeStyle = 'rgba(0,0,0,.20)'; ctx.lineWidth = Math.max(3, 22 * z);
    ctx.beginPath();
    for (let x = x0; x <= x1; x += stepPx) {
      const sx = Cam.sx(x, W), sy = Cam.sy(this.groundAt(x) - 16, H);
      if (x === x0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // darń
    ctx.strokeStyle = P.grassTop; ctx.lineWidth = Math.max(2, 8 * z);
    ctx.beginPath();
    for (let x = x0; x <= x1; x += stepPx) {
      const sx = Cam.sx(x, W), sy = Cam.sy(this.groundAt(x), H);
      if (x === x0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // kępki trawy i kamyki — deterministyczne, więc nie migoczą
    const hash = n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
    if (z > 0.55) {
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = Math.max(1, 1.6 * z);
      ctx.beginPath();
      for (let x = Math.floor(x0 / 22) * 22; x <= x1; x += 22) {
        const r1 = hash(x), r2 = hash(x + 7.3);
        if (r1 > 0.55) continue;
        const gy = this.groundAt(x);
        const sx = Cam.sx(x + r2 * 12, W), sy = Cam.sy(gy, H);
        ctx.moveTo(sx, sy - 1 * z); ctx.lineTo(sx + (r2 - 0.5) * 7 * z, sy - (5 + r1 * 9) * z);
      }
      ctx.stroke();
      // kamienie i korzenie w glebie
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let x = Math.floor(x0 / 70) * 70; x <= x1; x += 70) {
        const r1 = hash(x * 0.7), r2 = hash(x * 1.7 + 3);
        const gy = this.groundAt(x) - 30 - r1 * 260;
        ctx.beginPath();
        ctx.ellipse(Cam.sx(x + r2 * 40, W), Cam.sy(gy, H), (3 + r1 * 7) * z, (2 + r2 * 4) * z, r1 * 2, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(0,0,0,.10)';
      for (let x = Math.floor(x0 / 90) * 90; x <= x1; x += 90) {
        const r1 = hash(x * 2.3), r2 = hash(x * 0.31 + 11);
        const gy = this.groundAt(x) - 50 - r1 * 300;
        ctx.beginPath();
        ctx.ellipse(Cam.sx(x + r2 * 60, W), Cam.sy(gy, H), (5 + r2 * 12) * z, (2 + r1 * 5) * z, 0, 0, TAU);
        ctx.fill();
      }
    }

    // miedze / granice pól
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(1, 1.4 * z);
    for (let x = Math.floor(x0 / 140) * 140; x <= x1; x += 140) {
      const sx = Cam.sx(x, W), sy = Cam.sy(this.groundAt(x), H);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 26 * z, sy + 160 * z); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // --- ślady na ziemi (leje, przypalenia, ciała) ---
    this.drawDecals(ctx, W, H, x0, x1);

    // --- pasy startowe ---
    for (const rw of this.runways) {
      if (rw.deck) continue;
      if (rw.x1 < x0 || rw.x0 > x1) continue;
      const sy = Cam.sy(rw.y, H);
      const sx0 = Cam.sx(rw.x0, W), sx1 = Cam.sx(rw.x1, W);
      ctx.fillStyle = '#6b5c3f';
      ctx.fillRect(sx0, sy - 1, sx1 - sx0, Math.max(3, 9 * z));
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.fillRect(sx0, sy + Math.max(3, 8 * z), sx1 - sx0, 3 * z);
      ctx.fillStyle = '#e6dcc0';
      for (let x = rw.x0 + 40; x < rw.x1 - 20; x += 120) {
        ctx.fillRect(Cam.sx(x, W), sy + 1, Math.max(2, 46 * z), Math.max(1, 2.4 * z));
      }
      // wiatrowskaz
      const wsx = Cam.sx(rw.x0 + 18, W), wsy = Cam.sy(rw.y, H);
      ctx.strokeStyle = '#d8d2c0'; ctx.lineWidth = Math.max(1, 2 * z);
      ctx.beginPath(); ctx.moveTo(wsx, wsy); ctx.lineTo(wsx, wsy - 42 * z); ctx.stroke();
      ctx.save();
      ctx.translate(wsx, wsy - 40 * z);
      const wob = Math.sin(this.waveT * 2) * 0.12 + (this.wind > 0 ? 0 : Math.PI);
      ctx.rotate(wob * 0.4);
      ctx.fillStyle = '#d8543a';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(26 * z * sign(this.wind || 1), -6 * z); ctx.lineTo(26 * z * sign(this.wind || 1), 6 * z); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // --- sceneria ---
    this.drawScenery(ctx, W, H, x0, x1);

    // --- woda ---
    if (this.hasSea) this.drawWater(ctx, W, H, x0, x1);
  }

  drawDecals(ctx, W, H, x0, x1) {
    const z = Cam.zoom;
    for (const d of this.decals) {
      if (d.x < x0 - 100 || d.x > x1 + 100) continue;
      const sx = Cam.sx(d.x, W);
      if (d.type === 'crater') {
        const sy = Cam.sy(this.groundAt(d.x), H);
        const r = d.r * z;
        ctx.save();
        ctx.globalAlpha = 0.85;
        const g = ctx.createRadialGradient(sx, sy, r * 0.1, sx, sy, r);
        g.addColorStop(0, '#1d1710'); g.addColorStop(0.55, '#33281d'); g.addColorStop(1, 'rgba(60,48,34,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(sx, sy + r * 0.12, r, r * 0.42, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (d.type === 'scorch') {
        const sy = Cam.sy(d.y, H);
        ctx.save();
        ctx.globalAlpha = clamp(0.55 - d.age * 0.002, 0.18, 0.55);
        ctx.fillStyle = '#16120d';
        ctx.beginPath(); ctx.ellipse(sx, sy, d.r * z, d.r * 0.34 * z, 0, 0, TAU); ctx.fill();
        ctx.restore();
      } else if (d.type === 'corpse') {
        const sy = Cam.sy(this.groundAt(d.x), H);
        ctx.save();
        ctx.translate(sx, sy); ctx.scale(z, z); ctx.rotate(d.rot);
        ctx.fillStyle = '#4a4632';
        ctx.fillRect(-7, -3.4, 14, 3.4);
        ctx.fillStyle = '#3b3826';
        ctx.fillRect(-9 * d.dir, -4.4, 4, 4.4);
        if (Settings.gore) {
          ctx.globalAlpha = 0.55; ctx.fillStyle = '#5e1414';
          ctx.beginPath(); ctx.ellipse(0, 0, 11, 2.6, 0, 0, TAU); ctx.fill();
        }
        ctx.restore();
      } else if (d.type === 'rubble') {
        const sy = Cam.sy(this.groundAt(d.x), H);
        ctx.save(); ctx.translate(sx, sy); ctx.scale(z, z);
        ctx.fillStyle = '#2e2a25';
        ctx.beginPath(); ctx.moveTo(-d.r, 0); ctx.lineTo(-d.r * 0.5, -d.r * 0.42); ctx.lineTo(0, -d.r * 0.2);
        ctx.lineTo(d.r * 0.45, -d.r * 0.5); ctx.lineTo(d.r, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
  }

  drawScenery(ctx, W, H, x0, x1) {
    const z = Cam.zoom;
    const sw = Math.sin(this.waveT * 1.4);
    for (const s of this.scenery) {
      if (s.x < x0 - 60) continue;
      if (s.x > x1 + 60) break;
      const gy = this.groundAt(s.x);
      const sx = Cam.sx(s.x, W), sy = Cam.sy(gy, H);
      // drzewo zapadnięte w lej
      if (gy < s.y - 26 && !s.burnt) { s.burnt = true; s.fire = 0; }
      const sc = s.s * z;
      ctx.save();
      ctx.translate(sx, sy);
      const lean = (sw * 0.03 + Math.sin(this.waveT + (s.sway || 0)) * 0.035) * (this.wind / 14);
      switch (s.type) {
        case 'pine': {
          ctx.rotate(lean);
          ctx.fillStyle = s.burnt ? '#231d16' : '#3a2a1c';
          ctx.fillRect(-1.6 * sc, 0, 3.2 * sc, -12 * sc);
          ctx.fillStyle = s.burnt ? '#1d1912' : '#2f4a24';
          for (let k = 0; k < 3; k++) {
            const yy = -10 * sc - k * 11 * sc, w = (16 - k * 4) * sc, hh = 18 * sc;
            ctx.beginPath(); ctx.moveTo(0, yy - hh); ctx.lineTo(-w, yy); ctx.lineTo(w, yy); ctx.closePath(); ctx.fill();
          }
          break;
        }
        case 'tree': {
          ctx.rotate(lean);
          ctx.fillStyle = s.burnt ? '#221c15' : '#4a3524';
          ctx.fillRect(-2 * sc, 0, 4 * sc, -16 * sc);
          if (!s.burnt) {
            ctx.fillStyle = '#3c5a2a';
            ctx.beginPath(); ctx.arc(0, -26 * sc, 15 * sc, 0, TAU); ctx.fill();
            ctx.fillStyle = '#4a6d33';
            ctx.beginPath(); ctx.arc(-5 * sc, -30 * sc, 10 * sc, 0, TAU); ctx.fill();
          } else {
            ctx.strokeStyle = '#221c15'; ctx.lineWidth = 1.6 * sc;
            ctx.beginPath();
            ctx.moveTo(0, -14 * sc); ctx.lineTo(-9 * sc, -24 * sc);
            ctx.moveTo(0, -16 * sc); ctx.lineTo(8 * sc, -26 * sc);
            ctx.stroke();
          }
          break;
        }
        case 'bush':
          ctx.fillStyle = s.burnt ? '#1e1a13' : '#3a5528';
          ctx.beginPath(); ctx.ellipse(0, -5 * sc, 11 * sc, 7 * sc, 0, 0, TAU); ctx.fill();
          break;
        case 'rock':
          ctx.fillStyle = '#5b554e';
          ctx.beginPath(); ctx.moveTo(-8 * sc, 0); ctx.lineTo(-4 * sc, -8 * sc); ctx.lineTo(4 * sc, -9 * sc); ctx.lineTo(9 * sc, 0); ctx.closePath(); ctx.fill();
          break;
        case 'pole':
          ctx.strokeStyle = s.burnt ? '#241d16' : '#4b3a27'; ctx.lineWidth = 2.4 * sc;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -40 * sc); ctx.stroke();
          if (!s.burnt) {
            ctx.beginPath(); ctx.moveTo(-9 * sc, -34 * sc); ctx.lineTo(9 * sc, -34 * sc); ctx.stroke();
            ctx.strokeStyle = 'rgba(20,20,20,.5)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-9 * sc, -34 * sc); ctx.quadraticCurveTo(60 * sc, -20 * sc, 120 * sc, -34 * sc); ctx.stroke();
          }
          break;
        case 'hay':
          ctx.fillStyle = s.burnt ? '#241c12' : '#b79a4e';
          ctx.beginPath(); ctx.moveTo(-12 * sc, 0); ctx.lineTo(0, -20 * sc); ctx.lineTo(12 * sc, 0); ctx.closePath(); ctx.fill();
          break;
        case 'fence':
          ctx.strokeStyle = '#5a4630'; ctx.lineWidth = 1.6 * sc;
          for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(k * 12 * sc, 0); ctx.lineTo(k * 12 * sc, -13 * sc); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(0, -9 * sc); ctx.lineTo(36 * sc, -9 * sc); ctx.stroke();
          break;
      }
      ctx.restore();
    }
  }

  drawWater(ctx, W, H, x0, x1) {
    const P = this.palette();
    const z = Cam.zoom;
    const surfY = Cam.sy(SEA_Y, H);
    if (surfY > H + 40) return;
    // maska: rysujemy wodę tylko tam, gdzie dno < 0
    let spanStart = null;
    const spans = [];
    for (let x = x0; x <= x1; x += STEP) {
      const wet = this.groundAt(x) < SEA_Y;
      if (wet && spanStart === null) spanStart = x;
      if (!wet && spanStart !== null) { spans.push([spanStart, x]); spanStart = null; }
    }
    if (spanStart !== null) spans.push([spanStart, x1]);

    const waveAt = wx => Math.sin(wx * 0.02 + this.waveT * 2.2) * 3 + Math.sin(wx * 0.061 - this.waveT * 1.3) * 1.6;
    for (const sp of spans) {
      const sx0 = Cam.sx(sp[0], W), sx1 = Cam.sx(sp[1], W);
      const g = ctx.createLinearGradient(0, surfY, 0, Math.max(surfY + 60, H));
      g.addColorStop(0, P.water[0]);
      g.addColorStop(0.32, P.water[0]);
      g.addColorStop(1, P.water[1]);
      ctx.fillStyle = g;
      ctx.fillRect(sx0, surfY, sx1 - sx0, H - surfY + 20);

      ctx.save();
      ctx.beginPath(); ctx.rect(sx0, surfY - 14 * z, sx1 - sx0, H + 20); ctx.clip();

      // jaśniejszy pas tuż pod powierzchnią
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.fillRect(sx0, surfY, sx1 - sx0, 7 * z);

      // dwie warstwy fal
      for (const L of [{ o: 0, a: 0.34, w: 1.6 }, { o: 9, a: 0.16, w: 1.1 }]) {
        ctx.strokeStyle = `rgba(255,255,255,${L.a})`;
        ctx.lineWidth = Math.max(1, L.w * z);
        ctx.beginPath();
        for (let sx = sx0; sx <= sx1; sx += 6) {
          const wx = (sx - W / 2) / z + Cam.x;
          const y = surfY + (waveAt(wx + L.o * 30) + L.o) * z;
          if (sx === sx0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
        }
        ctx.stroke();
      }

      // grzywacze i refleksy słońca
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (let sx = sx0; sx <= sx1; sx += 34 * z) {
        const wx = (sx - W / 2) / z + Cam.x;
        const ph = Math.sin(wx * 0.013 + this.waveT * 1.7) + Math.sin(wx * 0.0037 - this.waveT * 0.8);
        if (ph > 1.15) {
          const y = surfY + waveAt(wx) * z;
          ctx.fillRect(sx, y - 1, rnd(20, 9) * z, Math.max(1, 1.5 * z));
        }
      }
      // głębsze, ciemniejsze smugi
      ctx.strokeStyle = 'rgba(0,0,0,.10)'; ctx.lineWidth = Math.max(1, 6 * z);
      ctx.beginPath();
      for (let sx = sx0; sx <= sx1; sx += 10) {
        const wx = (sx - W / 2) / z + Cam.x;
        const y = surfY + (34 + Math.sin(wx * 0.008 + this.waveT * 0.6) * 10) * z;
        if (sx === sx0) ctx.moveTo(sx, y); else ctx.lineTo(sx, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    // piana przy brzegu
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    for (const sp of spans) {
      for (const ex of [sp[0], sp[1]]) {
        if (ex <= x0 + STEP || ex >= x1 - STEP) continue;
        const sx = Cam.sx(ex, W);
        const y = surfY + Math.sin(this.waveT * 2.4 + ex) * 2 * z;
        ctx.beginPath();
        ctx.ellipse(sx, y, 26 * z, 2.6 * z, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** Delikatna mgiełka/atmosfera na wierzchu. */
  drawHaze(ctx, W, H) {
    // delikatna winieta — bez mlecznej mgły na całym ekranie
    const g = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.42, W / 2, H * 0.5, Math.max(W, H) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}
