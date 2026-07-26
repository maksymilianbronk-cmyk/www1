/* =========================================================================
   Skrzydła Furii 1939 — rdzeń: matematyka, wejście, dźwięk, cząsteczki
   ========================================================================= */
'use strict';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b = 0) => b + Math.random() * (a - b);
const rndi = (a, b) => Math.floor(rnd(a, b));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const chance = p => Math.random() < p;
const sign = v => (v < 0 ? -1 : v > 0 ? 1 : 0);
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

/** Normalizuje kąt do (-PI, PI]. */
function wrapAngle(a) {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  if (a <= -Math.PI) a += TAU;
  return a;
}
/** Najkrótsza różnica kątowa a-b. */
const angDiff = (a, b) => wrapAngle(a - b);

/** Deterministyczny generator (mulberry32) — stabilny teren misji. */
function makeRng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/*  USTAWIENIA + ZAPIS                                                 */
/* ------------------------------------------------------------------ */
const SAVE_KEY = 'wof1939.save.v1';

const Settings = {
  sound: true, volume: 0.7, quality: 'high', shake: true, gore: true,
  difficulty: 'normal', markers: true,
};

const Save = {
  data: { unlocked: 1, best: {}, medals: {}, totalScore: 0, kills: 0, missionsFlown: 0 },
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        Object.assign(this.data, o.progress || {});
        Object.assign(Settings, o.settings || {});
      }
    } catch (e) { /* brak localStorage — gramy bez zapisu */ }
  },
  store() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ progress: this.data, settings: Settings }));
    } catch (e) { /* ignoruj */ }
  },
  reset() {
    this.data = { unlocked: 1, best: {}, medals: {}, totalScore: 0, kills: 0, missionsFlown: 0 };
    this.store();
  },
};

/** Mnożniki trudności. */
function diffMul() {
  switch (Settings.difficulty) {
    case 'easy': return { aa: 0.55, dmg: 0.6, enemy: 0.75, score: 0.8 };
    case 'hard': return { aa: 1.45, dmg: 1.55, enemy: 1.3, score: 1.35 };
    default: return { aa: 1, dmg: 1, enemy: 1, score: 1 };
  }
}

/** Budżet cząsteczek zależny od jakości. */
function particleBudget() {
  return Settings.quality === 'low' ? 700 : Settings.quality === 'med' ? 1800 : 4200;
}
function qScale() {
  return Settings.quality === 'low' ? 0.35 : Settings.quality === 'med' ? 0.65 : 1;
}

/* ------------------------------------------------------------------ */
/*  WEJŚCIE                                                            */
/* ------------------------------------------------------------------ */
const Input = {
  keys: Object.create(null),
  pressed: Object.create(null),   // jednorazowe (konsumowane)
  held: Object.create(null),      // czas przytrzymania w sekundach
  anyKeyAt: 0,
  init() {
    const block = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ControlLeft',
      'ControlRight', 'ShiftLeft', 'ShiftRight', 'KeyP', 'KeyM', 'KeyL', 'KeyR', 'Tab']);
    addEventListener('keydown', e => {
      if (block.has(e.code)) e.preventDefault();
      if (!this.keys[e.code]) { this.pressed[e.code] = true; this.held[e.code] = 0; }
      this.keys[e.code] = true;
      this.anyKeyAt = performance.now();
      Audio2.unlock();
    }, { passive: false });
    addEventListener('keyup', e => {
      if (block.has(e.code)) e.preventDefault();
      this.keys[e.code] = false; this.held[e.code] = 0;
    }, { passive: false });
    addEventListener('blur', () => { this.keys = Object.create(null); this.held = Object.create(null); });
  },
  update(dt) {
    for (const k in this.keys) if (this.keys[k]) this.held[k] = (this.held[k] || 0) + dt;
  },
  endFrame() { this.pressed = Object.create(null); },
  down(...codes) { return codes.some(c => !!this.keys[c]); },
  hit(...codes) { return codes.some(c => !!this.pressed[c]); },
  heldFor(code) { return this.held[code] || 0; },
};

/* ------------------------------------------------------------------ */
/*  DŹWIĘK (syntezowany — bez plików zewnętrznych)                     */
/* ------------------------------------------------------------------ */
const Audio2 = {
  ctx: null, master: null, noiseBuf: null,
  engine: null, engineGain: null, engineFilter: null,
  ready: false, lastShot: 0,
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = Settings.sound ? Settings.volume * 0.5 : 0;
      this.master.connect(this.ctx.destination);
      // bufor szumu
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      this.ready = true;
    } catch (e) { this.ready = false; }
  },
  setVolume() { if (this.master) this.master.gain.value = Settings.sound ? Settings.volume * 0.5 : 0; },
  /** Silnik: ciągły warkot modulowany obrotami. */
  startEngine() {
    if (!this.ready || this.engine) return;
    const c = this.ctx;
    const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 70;
    const osc2 = c.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 35;
    const g = c.createGain(); g.gain.value = 0.0;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 3;
    osc.connect(f); osc2.connect(f); f.connect(g); g.connect(this.master);
    osc.start(); osc2.start();
    this.engine = { osc, osc2 }; this.engineGain = g; this.engineFilter = f;
  },
  stopEngine() {
    if (!this.engine) return;
    try { this.engine.osc.stop(); this.engine.osc2.stop(); } catch (e) { }
    this.engine = null; this.engineGain = null;
  },
  engineParams(rpm, vol) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    this.engine.osc.frequency.setTargetAtTime(48 + rpm * 92, t, 0.08);
    this.engine.osc2.frequency.setTargetAtTime(24 + rpm * 46, t, 0.08);
    this.engineFilter.frequency.setTargetAtTime(260 + rpm * 900, t, 0.1);
    this.engineGain.gain.setTargetAtTime(vol * 0.16, t, 0.1);
  },
  noise(dur, freq, q, gain, type = 'bandpass') {
    if (!this.ready || !Settings.sound) return;
    const c = this.ctx, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    src.playbackRate.value = rnd(1.3, 0.7);
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  },
  tone(freq, dur, gain, type = 'sine', slideTo) {
    if (!this.ready || !Settings.sound) return;
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  gun(v = 1) {
    const now = performance.now();
    if (now - this.lastShot < 45) return;
    this.lastShot = now;
    this.noise(0.07, 1400, 1.2, 0.28 * v, 'bandpass');
    this.tone(160, 0.05, 0.12 * v, 'square', 60);
  },
  flak() { this.noise(0.22, 320, 0.7, 0.2, 'lowpass'); },
  boom(big = 1) {
    this.noise(0.55 * big, 180 / big, 0.6, 0.5, 'lowpass');
    this.tone(90 / big, 0.4 * big, 0.28, 'sine', 28);
  },
  splash() { this.noise(0.4, 900, 0.8, 0.22, 'bandpass'); },
  hitMetal() { this.noise(0.09, 2600, 3, 0.16, 'bandpass'); },
  pickup() { this.tone(660, 0.1, 0.15, 'square'); setTimeout(() => this.tone(990, 0.12, 0.13, 'square'), 90); },
  alarm() { this.tone(440, 0.18, 0.12, 'sawtooth', 300); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 0.14, 'triangle'), i * 140)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 0.14, 'sawtooth'), i * 160)); },
};

/* ------------------------------------------------------------------ */
/*  KAMERA                                                             */
/* ------------------------------------------------------------------ */
const Cam = {
  x: 0, y: 0, zoom: 1, shake: 0, shakeX: 0, shakeY: 0, targetZoom: 1,
  set(x, y) { this.x = x; this.y = y; },
  follow(t, dt, W, H) {
    const lead = t.vx * 0.55;
    const tx = t.x + lead;
    const ty = t.y + t.vy * 0.18 + 60;
    const k = 1 - Math.pow(0.0016, dt);
    this.x = lerp(this.x, tx, k);
    this.y = lerp(this.y, ty, k);
    this.zoom = lerp(this.zoom, this.targetZoom, 1 - Math.pow(0.2, dt));
    // trzęsienie
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.4);
      const s = Settings.shake ? this.shake : 0;
      this.shakeX = rnd(s, -s) * 14;
      this.shakeY = rnd(s, -s) * 14;
    } else { this.shakeX = this.shakeY = 0; }
  },
  kick(v) { this.shake = Math.min(2.2, this.shake + v); },
  /** świat -> ekran */
  sx(x, W) { return (x - this.x) * this.zoom + W / 2 + this.shakeX; },
  sy(y, H) { return H / 2 - (y - this.y) * this.zoom + this.shakeY; },
};

/** #rrggbb -> rgba(r,g,b,a) z pamięcią podręczną (wywoływane tysiące razy na klatkę). */
const _rgbCache = Object.create(null);
function rgba(hex, a) {
  let c = _rgbCache[hex];
  if (!c) {
    if (hex[0] === '#') {
      const h = hex.length === 4
        ? '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
        : hex;
      c = _rgbCache[hex] = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    } else {
      c = _rgbCache[hex] = [200, 200, 200];
    }
  }
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/* ------------------------------------------------------------------ */
/*  CZĄSTECZKI                                                         */
/* ------------------------------------------------------------------ */
/*  Typy: smoke, darksmoke, fire, spark, debris, dirt, water, blood,
    ring, flash, ember, wake, tracer, leaf, casing                     */
const Particles = {
  list: [],
  add(o) {
    const budget = particleBudget();
    if (this.list.length >= budget) {
      // wypchnij najstarszą "tanią" cząsteczkę
      let idx = -1, worst = Infinity;
      for (let i = 0; i < 40; i++) {
        const j = (Math.random() * this.list.length) | 0;
        const p = this.list[j];
        if (p.prio < worst) { worst = p.prio; idx = j; }
      }
      if (idx >= 0 && worst < (o.prio || 0)) this.list.splice(idx, 1);
      else if (this.list.length >= budget * 1.05) return null;
    }
    const p = {
      x: 0, y: 0, vx: 0, vy: 0, life: 1, max: 1, size: 4, grow: 0, type: 'smoke',
      col: '#888', drag: 0.6, grav: 0, rot: 0, vr: 0, alpha: 1, prio: 1, wind: 0, seed: Math.random() * 10,
    };
    Object.assign(p, o);
    p.max = p.life;
    this.list.push(p);
    return p;
  },
  update(dt, world) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) { L.splice(i, 1); continue; }
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.vy -= p.grav * dt;
      if (p.wind) p.vx += p.wind * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.size += p.grow * dt;
      // odbicie od ziemi dla odłamków / gilz
      if ((p.type === 'debris' || p.type === 'casing') && world) {
        const g = world.groundAt(p.x);
        if (p.y < g) {
          p.y = g; p.vy = Math.abs(p.vy) * 0.32; p.vx *= 0.62; p.vr *= 0.5;
          if (Math.abs(p.vy) < 12) { p.vy = 0; p.grav = 0; p.drag = 6; }
        }
      }
      if (p.type === 'dirt' && world) {
        const g = world.groundAt(p.x);
        if (p.y < g && p.vy < 0) { p.life = Math.min(p.life, 0.12); }
      }
    }
  },
  clear() { this.list.length = 0; },

  /* --- generatory efektów --- */
  smoke(x, y, opt = {}) {
    const q = qScale();
    if (Math.random() > q * (opt.dens ?? 1)) return;
    // limit zadymienia — bez tego kilka wybuchów naraz zasłania cały ekran
    if (this.list.length > particleBudget() * 0.5 && Math.random() < 0.65) return;
    this.add({
      x, y, vx: rnd(16, -16) + (opt.vx || 0), vy: rnd(30, 8) + (opt.vy || 0),
      life: rnd(3.2, 1.5) * (opt.lifeMul || 1), size: rnd(8, 3.5) * (opt.sizeMul || 1),
      grow: rnd(15, 7) * (opt.sizeMul || 1), type: 'smoke', drag: 0.55, grav: -6,
      col: opt.col || '#5a5c58', alpha: opt.alpha ?? 0.5, prio: 0.4, rot: rnd(TAU), vr: rnd(1.2, -1.2),
    });
  },
  darkSmoke(x, y, opt = {}) { this.smoke(x, y, Object.assign({ col: '#26241f', alpha: 0.75 }, opt)); },
  fire(x, y, opt = {}) {
    const q = qScale();
    if (Math.random() > q * (opt.dens ?? 1)) return;
    this.add({
      x, y, vx: rnd(26, -26) + (opt.vx || 0), vy: rnd(70, 20) + (opt.vy || 0),
      life: rnd(0.5, 0.2), size: rnd(7.5, 3) * (opt.sizeMul || 1), grow: rnd(14, 5),
      type: 'fire', drag: 1.2, grav: -30, col: pick(['#ffcc44', '#ff8d21', '#ff5b12', '#ffe89a']),
      alpha: 0.95, prio: 1.2,
    });
  },
  spark(x, y, n = 6, opt = {}) {
    n = Math.max(1, Math.round(n * qScale()));
    for (let i = 0; i < n; i++) {
      const a = opt.dir !== undefined ? opt.dir + rnd(opt.spread || 1.2, -(opt.spread || 1.2)) : rnd(TAU);
      const s = rnd(opt.spd || 320, (opt.spd || 320) * 0.25);
      this.add({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.5, 0.14),
        size: rnd(2.6, 1), type: 'spark', drag: 1.6, grav: 200, col: opt.col || '#ffd166',
        prio: 1.1,
      });
    }
  },
  debris(x, y, n = 8, opt = {}) {
    n = Math.max(1, Math.round(n * qScale()));
    for (let i = 0; i < n; i++) {
      const a = rnd(TAU), s = rnd(opt.spd || 260, 40);
      this.add({
        x, y, vx: Math.cos(a) * s, vy: Math.abs(Math.sin(a)) * s + rnd(120, 20), life: rnd(4.2, 1.6),
        size: rnd(opt.size || 5, 1.6), type: 'debris', drag: 0.35, grav: 420,
        col: opt.col || pick(['#3a3a38', '#514a3d', '#6b6257', '#22201d']),
        rot: rnd(TAU), vr: rnd(9, -9), prio: 0.8,
      });
    }
  },
  dirt(x, y, n = 12, opt = {}) {
    n = Math.max(1, Math.round(n * qScale()));
    for (let i = 0; i < n; i++) {
      const a = rnd(-0.25, -Math.PI + 0.25) * -1; // do góry
      const s = rnd(opt.spd || 340, 60);
      this.add({
        x: x + rnd(18, -18), y, vx: Math.cos(a) * s * rnd(1, -1), vy: Math.sin(a) * s, life: rnd(1.8, 0.7),
        size: rnd(9, 3), type: 'dirt', drag: 0.5, grav: 460, col: opt.col || pick(['#6b5a3e', '#7d6a48', '#4e4130', '#8a7550']),
        prio: 0.6, rot: rnd(TAU), vr: rnd(6, -6),
      });
    }
  },
  water(x, y, n = 14, opt = {}) {
    n = Math.max(1, Math.round(n * qScale()));
    for (let i = 0; i < n; i++) {
      const s = rnd(opt.spd || 420, 80);
      const a = rnd(-1.05, -2.09) * -1;
      this.add({
        x: x + rnd(16, -16), y, vx: Math.cos(a) * s * rnd(1, -1), vy: Math.sin(a) * s, life: rnd(1.6, 0.6),
        size: rnd(10, 3), type: 'water', drag: 0.35, grav: 520, col: '#cfe8f5', alpha: 0.8, prio: 0.7,
      });
    }
  },
  blood(x, y, n = 8) {
    if (!Settings.gore) { this.dirt(x, y, 4, { col: '#5a5347', spd: 120 }); return; }
    n = Math.max(1, Math.round(n * qScale()));
    for (let i = 0; i < n; i++) {
      const a = rnd(TAU), s = rnd(150, 30);
      this.add({
        x, y, vx: Math.cos(a) * s, vy: Math.abs(Math.sin(a)) * s, life: rnd(1.1, 0.4),
        size: rnd(3.4, 1.2), type: 'blood', drag: 0.6, grav: 460, col: pick(['#8d1f1f', '#a52a2a', '#6b1414']), prio: 0.5,
      });
    }
  },
  ring(x, y, r0, r1, life, col = 'rgba(255,220,150,.8)') {
    this.add({ x, y, size: r0, grow: (r1 - r0) / life, life, type: 'ring', col, drag: 0, prio: 1.5 });
  },
  flash(x, y, size, life = 0.12) {
    this.add({ x, y, size, life, type: 'flash', col: '#fff2c0', drag: 0, prio: 2, grow: size * 2 });
  },
  ember(x, y) {
    if (Math.random() > qScale() * 0.6) return;
    this.add({
      x, y, vx: rnd(24, -24), vy: rnd(90, 30), life: rnd(2.2, 0.9), size: rnd(2.2, 0.8),
      type: 'ember', drag: 0.7, grav: -14, col: pick(['#ff9d3c', '#ffc857', '#ff6b1a']), prio: 0.9,
    });
  },
  casing(x, y, vx, vy) {
    if (Math.random() > qScale() * 0.5) return;
    this.add({
      x, y, vx: vx * 0.2 + rnd(60, -60), vy: vy * 0.2 + rnd(40, -40), life: 2.5, size: 1.8,
      type: 'casing', drag: 0.3, grav: 420, col: '#c8a24a', rot: rnd(TAU), vr: rnd(20, -20), prio: 0.3,
    });
  },
  wake(x, y) {
    this.add({ x, y, vx: rnd(12, -12), vy: rnd(14, 2), life: rnd(1.4, 0.6), size: rnd(6, 2), grow: 8, type: 'wake', col: '#e8f6ff', alpha: 0.7, drag: 1.2, prio: 0.4 });
  },

  /** Duży wybuch — komplet efektów. */
  explosion(x, y, power = 1, opt = {}) {
    const p = clamp(power, 0.35, 4);
    this.flash(x, y, 26 * p, 0.13);
    this.ring(x, y, 8 * p, 90 * p, 0.42, 'rgba(255,210,140,.55)');
    if (p > 1.2) this.ring(x, y, 4 * p, 150 * p, 0.7, 'rgba(255,255,255,.14)');
    const n = Math.round(16 * p * qScale());
    for (let i = 0; i < n; i++) {
      const a = rnd(TAU), s = rnd(240 * p, 40);
      this.add({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + 40, life: rnd(0.75, 0.28) * p,
        size: rnd(11, 4) * p, grow: 22 * p, type: 'fire', drag: 1.4, grav: -50,
        col: pick(['#fff0b0', '#ffbe3d', '#ff7a18', '#ff4d0d']), prio: 1.6,
      });
    }
    const pc = Math.min(p, 1.8);           // wielkie wybuchy nie mogą zasłonić nieba
    for (let i = 0; i < Math.round(8 * p * qScale()); i++) {
      this.add({
        x: x + rnd(20 * p, -20 * p), y: y + rnd(14 * p, -6), vx: rnd(70, -70), vy: rnd(90, 10),
        life: rnd(3.2, 1.4) * pc, size: rnd(11, 4) * pc, grow: 13 * pc, type: 'smoke', drag: 0.5, grav: -10,
        col: opt.smokeCol || pick(['#3b3833', '#4c4842', '#2a2723']), alpha: 0.55, prio: 1.0, rot: rnd(TAU), vr: rnd(1, -1),
      });
    }
    this.spark(x, y, 18 * p, { spd: 460 * p, col: '#ffd98a' });
    this.debris(x, y, 10 * p, { spd: 300 * p, size: 6 * p, col: opt.debrisCol });
  },
};

/* ------------------------------------------------------------------ */
/*  RYSOWANIE CZĄSTECZEK                                               */
/* ------------------------------------------------------------------ */
function drawParticles(ctx, W, H) {
  const L = Particles.list;
  const z = Cam.zoom;
  // pierwsza warstwa: normalne
  ctx.save();
  for (let i = 0; i < L.length; i++) {
    const p = L[i];
    const t = p.life / p.max;
    if (p.type === 'fire' || p.type === 'spark' || p.type === 'flash' || p.type === 'ring' || p.type === 'ember') continue;
    const sx = Cam.sx(p.x, W), sy = Cam.sy(p.y, H);
    if (sx < -160 || sx > W + 160 || sy < -160 || sy > H + 160) continue;
    const s = Math.max(0.4, p.size * z);
    switch (p.type) {
      case 'smoke': {
        const a = clamp(t * t * p.alpha, 0, 1);
        if (a < 0.02) break;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s);
        g.addColorStop(0, rgba(p.col, a));
        g.addColorStop(0.55, rgba(p.col, a * 0.6));
        g.addColorStop(1, rgba(p.col, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); ctx.fill();
        break;
      }
      case 'wake': {
        ctx.globalAlpha = clamp(t * p.alpha, 0, 1);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.ellipse(sx, sy, s * 1.6, s * 0.55, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'water': {
        ctx.globalAlpha = clamp(t * p.alpha, 0, 1);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.ellipse(sx, sy, s * 0.5, s, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'debris': case 'casing': {
        ctx.globalAlpha = clamp(t * 1.6, 0, 1);
        ctx.fillStyle = p.col;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot);
        ctx.fillRect(-s * 0.5, -s * 0.32, s, s * 0.64);
        ctx.restore();
        break;
      }
      case 'dirt': case 'blood': {
        ctx.globalAlpha = clamp(t * 1.4, 0, 1);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(sx, sy, s * 0.5, 0, TAU); ctx.fill();
        break;
      }
    }
  }
  ctx.restore();

  // druga warstwa: addytywne
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < L.length; i++) {
    const p = L[i];
    const t = p.life / p.max;
    if (!(p.type === 'fire' || p.type === 'spark' || p.type === 'flash' || p.type === 'ring' || p.type === 'ember')) continue;
    const sx = Cam.sx(p.x, W), sy = Cam.sy(p.y, H);
    if (sx < -200 || sx > W + 200 || sy < -200 || sy > H + 200) continue;
    const s = Math.max(0.4, p.size * z);
    switch (p.type) {
      case 'fire': {
        const a = clamp(t * t * 0.9, 0, 1);
        if (a < 0.02) break;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s);
        g.addColorStop(0, rgba('#fff2c8', a));
        g.addColorStop(0.35, rgba(p.col, a * 0.85));
        g.addColorStop(0.7, rgba(p.col, a * 0.3));
        g.addColorStop(1, rgba(p.col, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); ctx.fill();
        break;
      }
      case 'ember': {
        ctx.globalAlpha = clamp(t, 0, 1);
        ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); ctx.fill();
        break;
      }
      case 'spark': {
        ctx.globalAlpha = clamp(t * 1.4, 0, 1);
        ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1, s * 0.7); ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - p.vx * 0.016 * z, sy + p.vy * 0.016 * z);
        ctx.stroke();
        break;
      }
      case 'flash': {
        ctx.globalAlpha = clamp(t, 0, 1) * 0.9;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, s);
        g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.4, 'rgba(255,210,120,.7)'); g.addColorStop(1, 'rgba(255,120,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); ctx.fill();
        break;
      }
      case 'ring': {
        ctx.globalAlpha = clamp(t, 0, 1) * 0.8;
        ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1, 3 * t * z);
        ctx.beginPath(); ctx.arc(sx, sy, s, 0, TAU); ctx.stroke();
        break;
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
