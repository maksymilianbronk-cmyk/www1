/* =========================================================================
   Silnik gry, przebieg misji, interfejs
   ========================================================================= */
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
let VW = 1280, VH = 720, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = Math.max(320, canvas.clientWidth || window.innerWidth);
  VH = Math.max(240, canvas.clientHeight || window.innerHeight);
  canvas.width = Math.round(VW * DPR);
  canvas.height = Math.round(VH * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
addEventListener('resize', resize);

/* =========================================================================
   OBIEKT GRY
   ========================================================================= */
const G = {
  state: 'menu',            // menu | play | paused | debrief
  running: false,
  world: null, mission: null, player: null,
  units: [], planes: [], bullets: [], ordnance: [], shells: [], wrecks: [],
  objState: {}, objectiveTags: new Set(),
  missionT: 0, waveIdx: 0, score: 0, lives: 3,
  stats: { shots: 0, hits: 0, kills: 0, ground: 0, bombsDropped: 0, planesLost: 0 },
  toastText: '', toastT: 0, warnText: '', warnT: 0, feed: [], hudFlash: 0,
  viewX0: 0, viewX1: 0, respawnT: 0, endT: 0, ended: false,
  homeRunway: null, needLanding: false, carrier: null, deck: null,
  attract: false, serviceT: 0, servicing: false,

  /* ---------------- start misji ---------------- */
  startMission(idx) {
    const m = MISSIONS[idx];
    if (!m) return;
    this.mission = m;
    this.missionIdx = idx;
    this.attract = false;
    this.world = new World(Object.assign({ wind: rnd(16, -16) }, m.world));
    this.units = []; this.planes = []; this.bullets = []; this.ordnance = [];
    this.shells = []; this.wrecks = []; this.feed = [];
    Particles.clear();
    this.score = 0; this.missionT = 0; this.waveIdx = 0; this.lives = 3;
    this.stats = { shots: 0, hits: 0, kills: 0, ground: 0, bombsDropped: 0, planesLost: 0 };
    this.killed = {}; this.destroyedTags = {}; this.lostTags = {};
    this.ended = false; this.endT = 0; this.respawnT = 0;
    this.protect = [];
    this.carrier = null; this.deck = null;
    this.hudFlash = 0; this.toastT = 0; this.warnT = 0;
    this.servicing = false; this.serviceT = 0;
    this.tookOff = false; this.landAnnounced = false;

    m.setup(this);

    this.homeRunway = this.world.runways.find(r => !r.deck) || this.world.runways[0];
    // stany celów
    this.objState = {};
    this.objectiveTags = new Set();
    for (const o of m.objectives) {
      this.objState[o.id] = { done: false, failed: false, progress: 0, lost: 0 };
      if (o.tag && o.type === 'destroyTag') this.objectiveTags.add(o.tag);
    }

    // gracz
    const st = this.playerStart || { x: 800, y: 300, grounded: true };
    this.player = new Plane(m.plane, { x: st.x, y: st.y + 8, isPlayer: true, grounded: st.grounded, a: 0, vx: 0, vy: 0 });
    this.player.throttle = 0;
    this.planes.push(this.player);

    Cam.set(this.player.x, this.player.y + 120);
    Cam.zoom = 1; Cam.targetZoom = 1; Cam.shake = 0;

    this.state = 'play';
    this.running = true;
    Audio2.unlock(); Audio2.startEngine();
    showScreen(null);
    this.toast(`${m.title.toUpperCase()} — ${m.place}`);
    setTimeout(() => { if (this.state === 'play') this.toast('Gaz: strzałka ↑   ·   Ster: ← →'); }, 3200);
  },

  /* ---------------- tło menu ---------------- */
  startAttract() {
    try {
      this.attract = true;
      this.state = 'menu';
      this.world = new World({ seed: 24, width: 6000, baseHeight: 250, relief: 80, treeDensity: 0.6, time: 'dusk', ceiling: 2600 });
      this.units = []; this.planes = []; this.bullets = []; this.ordnance = []; this.shells = []; this.wrecks = [];
      Particles.clear();
      const p = new Plane('p11c', { x: 1000, y: 900, vx: 300, vy: 0, ai: 'fighter' });
      p.team = 'pol'; p.aiKind = null; p.ai = { state: 'cruise', t: 0, fireT: 0, evadeT: 0, targetAlt: 900 };
      p.aiKind = 'patrolOnly';
      this.planes.push(p);
      this.attractPlane = p;
      Cam.set(p.x, p.y + 60);
      this.running = true;
    } catch (e) { this.attract = false; }
  },

  /* ---------------- pomocnicze: świat ---------------- */
  addUnit(o) {
    const u = new Unit(o);
    if (o.y === undefined) u.y = u.ship ? 0 : this.world.groundAt(u.x);
    if (o.planeKey) u.planeKey = o.planeKey;
    if (o.flak) u.flak = true;
    if (o.color) u.color = o.color;
    if (o.helmet) u.helmet = o.helmet;
    this.units.push(u);
    return u;
  },
  addWreck(o) { this.wrecks.push(new Wreck(o, this.world)); if (this.wrecks.length > 160) this.wrecks.shift(); },

  groundLevelFor(x) {
    if (this.deck && x > this.deck.x0 - 4 && x < this.deck.x1 + 4) return { y: this.deck.y, rw: this.deck };
    const rw = this.world.inRunway(x);
    if (rw && rw.deck) return { y: this.world.groundAt(x), rw: null };
    return { y: this.world.groundAt(x), rw };
  },
  nearRunway(x, range) {
    let best = null, bd = range;
    for (const rw of this.world.runways) {
      const c = (rw.x0 + rw.x1) / 2;
      const d = Math.abs(x - c);
      if (d < bd) { bd = d; best = rw; }
    }
    return best;
  },

  /* ---------------- pomocnicze: byty ---------------- */
  spawnBullet(o) { if (this.bullets.length < 900) this.bullets.push(new Bullet(o)); },
  spawnOrdnance(o) { this.ordnance.push(o); },
  spawnFlakShell(x, y, a, d, owner) { if (this.shells.length < 120) this.shells.push(new FlakShell(x, y, a, d, owner)); },
  spawnEnemy(key, o = {}) {
    const p = new Plane(key, Object.assign({ team: 'ger' }, o));
    if (o.dir === -1) { p.a = Math.PI; p.vx = -PLANES[key].vMax * 0.7; }
    else { p.a = 0; p.vx = PLANES[key].vMax * 0.7; }
    p.y = o.y || 1200;
    p.throttle = 0.9; p.rpm = 0.9;
    p.gearDown = false; p.gearT = 0;
    this.planes.push(p);
    return p;
  },

  /** Obrażenia obszarowe (bomby, torpedy). */
  areaDamage(x, y, radius, dmg, cause, skip) {
    for (const u of this.units) {
      if (u.dead || u.remove || u === skip) continue;
      if (u.type === 'carrier') continue;
      const b = u.bounds();
      const ux = clamp(x, b.x0, b.x1), uy = clamp(y, b.y0, b.y1);
      const d = dist(x, y, ux, uy);
      if (d < radius) {
        const f = Math.pow(1 - d / radius, 1.35);
        u.hit(dmg * f, ux, uy, this, cause);
      }
    }
    for (const p of this.planes) {
      if (!p.alive) continue;
      const d = dist(x, y, p.x, p.y);
      if (d < radius * 0.9) {
        const f = Math.pow(1 - d / (radius * 0.9), 1.4);
        p.hit(dmg * f * 0.45, x, y, this, null);
      }
    }
    this.world.blastScenery(x, radius * 0.9);
  },

  /* ---------------- zdarzenia ---------------- */
  onUnitDestroyed(u, cause) {
    const pts = Math.round(u.score * diffMul().score);
    this.score += pts;
    this.stats.ground++;
    if (u.team === 'ger') this.feedAdd(`${u.name} zniszczony  +${pts}`);
    const t = u.tag || u.type;
    this.destroyedTags[t] = (this.destroyedTags[t] || 0) + 1;
    if (u.team === 'pol') {
      this.lostTags[t] = (this.lostTags[t] || 0) + 1;
      this.score -= Math.round(u.score * 0.5);
    }
    this.checkObjectives();
  },

  onPlaneDestroyed(p, by, crashed) {
    if (p.isPlayer) {
      this.stats.planesLost++;
      this.lives--;
      this.warn(crashed ? 'ROZBIŁEŚ SIĘ' : 'ZESTRZELONO CIĘ');
      Audio2.lose();
      this.respawnT = 3.2;
      return;
    }
    if (p.team === 'ger') {
      const pts = Math.round((p.S.hp * 3 + 120) * diffMul().score);
      this.score += pts;
      this.stats.kills++;
      this.killed[p.key] = (this.killed[p.key] || 0) + 1;
      this.feedAdd(`${p.S.name} zestrzelony  +${pts}`);
      Save.data.kills = (Save.data.kills || 0) + 1;
      this.checkObjectives();
    }
  },

  onPlayerLanded(rw) {
    this.toast(rw.deck ? 'PRZYZIEMIENIE NA POKŁADZIE' : 'PRZYZIEMIENIE — hamuj (↓)');
    Audio2.pickup();
    Cam.kick(0.3);
  },
  onPlayerTookOff() { this.servicing = false; this.serviceT = 0; this.tookOff = true; },

  /** Obsługa naziemna po zatrzymaniu na pasie. */
  serviceOnGround(dt) {
    const P = this.player;
    const need = P.ammo < P.maxAmmo || P.bombs < P.maxBombs || P.torps < P.maxTorps || P.fuel < P.maxFuel || P.hp < P.maxHp;
    // sprawdź, czy to koniec misji
    const others = this.mission.objectives.filter(o => o.type !== 'land');
    const allDone = others.every(o => this.objState[o.id].done);
    const landObj = this.mission.objectives.find(o => o.type === 'land');
    // powrót liczy się tylko wtedy, gdy maszyna faktycznie była w powietrzu
    if (allDone && landObj && this.tookOff && !this.objState[landObj.id].done) {
      const rw = this.player.groundRw;
      if (!landObj.deck || (rw && rw.deck)) {
        this.objState[landObj.id].done = true;
        this.checkObjectives();
        return;
      }
    }
    if (!need) { this.servicing = false; return; }
    if (!this.servicing) {
      this.servicing = true; this.serviceT = 0;
      this.toast('OBSŁUGA NAZIEMNA: uzupełnianie amunicji i paliwa…');
    }
    this.serviceT += dt;
    const r = dt / 4.5;
    P.ammo = Math.min(P.maxAmmo, P.ammo + P.maxAmmo * r);
    P.bombs = Math.min(P.maxBombs, P.bombs + P.maxBombs * r + (P.maxBombs ? 0 : 0));
    P.torps = Math.min(P.maxTorps, P.torps + P.maxTorps * r);
    P.fuel = Math.min(P.maxFuel, P.fuel + P.maxFuel * r * 1.4);
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * r * 0.8);
    P.fire = 0;
    if (P.ammo >= P.maxAmmo && P.fuel >= P.maxFuel && P.hp >= P.maxHp) {
      P.ammo = P.maxAmmo; P.bombs = P.maxBombs; P.torps = P.maxTorps;
      this.servicing = false;
      this.toast('GOTOWE — dodaj gazu i startuj (↑)');
      Audio2.pickup();
    }
  },

  feedAdd(text) {
    this.feed.unshift({ text, t: 4 });
    if (this.feed.length > 5) this.feed.pop();
  },
  toast(text) { this.toastText = text; this.toastT = 3.4; },
  warn(text) { if (this.warnText === text && this.warnT > 0.6) return; this.warnText = text; this.warnT = 2.2; },

  /* ---------------- cele misji ---------------- */
  checkObjectives() {
    if (this.ended) return;
    let allDone = true;
    for (const o of this.mission.objectives) {
      const st = this.objState[o.id];
      switch (o.type) {
        case 'destroyTag':
          st.progress = Math.min(o.count, this.destroyedTags[o.tag] || 0);
          if (st.progress >= o.count && !st.done) { st.done = true; this.objDone(o); }
          break;
        case 'killPlane':
          st.progress = Math.min(o.count, this.killed[o.key] || 0);
          if (st.progress >= o.count && !st.done) { st.done = true; this.objDone(o); }
          break;
        case 'protectTag':
          st.lost = this.lostTags[o.tag] || 0;
          if (st.lost > o.maxLost) { st.failed = true; }
          else st.done = true;    // spełniony dopóki nie przekroczono limitu
          break;
        case 'land':
          break;
      }
      if (o.type !== 'land' && !st.done) allDone = false;
      if (st.failed) { this.finishMission(false, 'Nie obroniłeś powierzonych celów'); return; }
    }
    this.needLanding = allDone;
    const landObj = this.mission.objectives.find(o => o.type === 'land');
    if (allDone && landObj && !this.landAnnounced) {
      this.landAnnounced = true;
      this.toast('ZADANIA WYKONANE — wracaj i ląduj!');
      Audio2.pickup();
    }
    if (allDone && (!landObj || this.objState[landObj.id].done)) {
      this.finishMission(true);
    }
  },

  objDone(o) {
    this.toast(`ZADANIE WYKONANE: ${o.text}`);
    this.score += 500;
    Audio2.pickup();
  },

  finishMission(success, reason) {
    if (this.ended) return;
    this.ended = true;
    this.endT = 0;
    this.successFlag = success;
    this.endReason = reason || '';
    if (success) Audio2.win(); else Audio2.lose();
  },

  /* ---------------- pętla ---------------- */
  update(dt) {
    const W = this.world;
    if (!W) return;
    // widoczny zakres
    this.viewX0 = Cam.x - (VW / 2) / Cam.zoom;
    this.viewX1 = Cam.x + (VW / 2) / Cam.zoom;

    W.update(dt);
    Particles.update(dt, W);

    if (this.attract) {
      const p = this.attractPlane;
      if (p) {
        p.aiPatrol(dt, this);
        p.updateFlight(dt, this);
        p.prop += dt * 90;
        const c = Math.cos(p.a);
        if (c < -0.06) p.flip = true; else if (c > 0.06) p.flip = false;
        if (p.x < 400) { p.x = 400; p.vx = Math.abs(p.vx); }
        if (p.x > W.width - 400) { p.x = W.width - 400; p.vx = -Math.abs(p.vx); }
        if (p.y < 500) { p.y = 500; p.vy = Math.abs(p.vy); }
        Cam.follow(p, dt, VW, VH);
      }
      for (const w of this.wrecks) w.update(dt, this);
      return;
    }

    if (this.state !== 'play') return;

    this.missionT += dt;
    this.toastT = Math.max(0, this.toastT - dt);
    this.warnT = Math.max(0, this.warnT - dt);
    this.hudFlash = Math.max(0, this.hudFlash - dt * 1.6);
    for (let i = this.feed.length - 1; i >= 0; i--) { this.feed[i].t -= dt; if (this.feed[i].t <= 0) this.feed.splice(i, 1); }

    // fale przeciwnika
    const waves = this.mission.waves || [];
    while (this.waveIdx < waves.length && this.missionT >= waves[this.waveIdx].t) {
      try { waves[this.waveIdx].fn(this); } catch (e) { console.error(e); }
      this.waveIdx++;
    }

    // byty
    for (const u of this.units) u.update(dt, this);
    for (const w of this.wrecks) w.update(dt, this);
    for (const p of this.planes) p.update(dt, this);
    for (const b of this.bullets) b.update(dt, this);
    for (const s of this.shells) s.update(dt, this);
    for (const o of this.ordnance) o.update(dt, this);

    // sprzątanie
    this.bullets = this.bullets.filter(b => !b.dead);
    this.shells = this.shells.filter(s => !s.dead);
    this.ordnance = this.ordnance.filter(o => !o.dead);
    this.units = this.units.filter(u => !u.remove);
    this.planes = this.planes.filter(p => !p.remove);

    // kolizje samolot–ziemia dla SI oraz zderzenia z jednostkami
    for (const p of this.planes) {
      if (!p.alive || p.isPlayer) continue;
      const gy = this.world.groundAt(p.x);
      if (p.y - 6 <= gy) { p.crash(this, this.world.isWater(p.x)); }
      if (p.x < 60 || p.x > this.world.width - 60) p.remove = true;
    }
    // zderzenia maszyn w powietrzu — taran kończy się źle dla obu stron
    for (let i = 0; i < this.planes.length; i++) {
      const a = this.planes[i];
      if (!a.alive || a.onGround) continue;
      for (let j = i + 1; j < this.planes.length; j++) {
        const b = this.planes[j];
        if (!b.alive || b.onGround || a.team === b.team) continue;
        const rr = (a.hitR + b.hitR) * 0.45;
        if (dist2(a.x, a.y, b.x, b.y) < rr * rr) {
          Particles.explosion((a.x + b.x) / 2, (a.y + b.y) / 2, 2.2);
          a.hit(a.maxHp * 1.2, a.x, a.y, this, b);
          b.hit(b.maxHp * 1.2, b.x, b.y, this, a);
          Cam.kick(0.9);
          if (a.isPlayer || b.isPlayer) this.warn('ZDERZENIE!');
        }
      }
    }

    // zderzenie gracza z balonem / okrętem / budynkiem
    const P = this.player;
    if (P.alive && !P.onGround) {
      for (const u of this.units) {
        if (u.dead || u.remove) continue;
        if (u.type === 'balloon' || u.type === 'radio' || u.ship) {
          if (u.type === 'carrier' && P.gearT > 0.5) continue;
          if (u.contains(P.x, P.y, 8)) {
            if (u.type === 'balloon') { u.hit(999, P.x, P.y, this, 'ram'); P.hit(24, P.x, P.y, this, null); }
            else { P.crash(this, false); }
            break;
          }
        }
      }
    }

    // respawn gracza
    if (!P.alive) {
      if (this.respawnT > 0) {
        this.respawnT -= dt;
        if (this.respawnT <= 0) {
          if (this.lives > 0) this.respawnPlayer();
          else this.finishMission(false, 'Straciłeś wszystkie maszyny');
        }
      }
    }

    // silnik audio
    if (P.alive) Audio2.engineParams(P.rpm, clamp(1 - dist(P.x, P.y, Cam.x, Cam.y) / 1400, 0.15, 1));
    else Audio2.engineParams(0, 0);

    // kamera
    const camTarget = P.alive || P.remove === false ? P : P;
    Cam.targetZoom = clamp(1 - (P.speed - 320) / 3200, 0.84, 1);
    Cam.follow(camTarget, dt, VW, VH);
    Cam.y = Math.max(Cam.y, this.world.groundAt(Cam.x) - 40);

    // zakończenie
    if (this.ended) {
      this.endT += dt;
      if (this.endT > 2.4) this.showDebrief();
    }

    // ostrzeżenia
    if (P.alive && !P.onGround) {
      const agl = P.y - (P.groundY || 0);
      if (agl < 90 && P.vy < -30) this.warn('PODCIĄGNIJ!');
      if (P.fuel < P.maxFuel * 0.12 && P.fuel > 0) this.warn('MAŁO PALIWA');
    }
  },

  respawnPlayer() {
    const rw = this.homeRunway;
    const x = rw ? rw.x0 + 140 : 800;
    const y = rw ? rw.y : this.world.groundAt(x);
    const P = new Plane(this.mission.plane, { x, y: y + 8, isPlayer: true, grounded: true, a: 0 });
    P.throttle = 0; P.invuln = 2;
    this.player = P;
    this.planes.push(P);
    Cam.set(x, y + 120);
    this.toast(`Nowa maszyna gotowa. Pozostało: ${this.lives}`);
  },

  /* ---------------- rysowanie ---------------- */
  draw() {
    const W = this.world;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!W) {
      ctx.fillStyle = '#0b0d10'; ctx.fillRect(0, 0, VW, VH);
      return;
    }
    W.drawSky(ctx, VW, VH);
    W.drawClouds(ctx, VW, VH, false);
    W.drawParallax(ctx, VW, VH);
    W.drawTerrain(ctx, VW, VH);

    for (const w of this.wrecks) w.draw(ctx, VW, VH, this);
    for (const u of this.units) if (!u.ship) u.draw(ctx, VW, VH, this);
    for (const u of this.units) if (u.ship) u.draw(ctx, VW, VH, this);
    for (const o of this.ordnance) o.draw(ctx, VW, VH);
    for (const p of this.planes) if (!p.isPlayer) p.draw(ctx, VW, VH, this);
    if (this.player) this.player.draw(ctx, VW, VH, this);
    for (const b of this.bullets) b.draw(ctx, VW, VH);
    for (const s of this.shells) s.draw(ctx, VW, VH);

    drawParticles(ctx, VW, VH);
    W.drawClouds(ctx, VW, VH, true);
    W.drawHaze(ctx, VW, VH);

    if (this.state === 'play' && !this.attract && this.player) HUD.draw(ctx, VW, VH, this);
    if (this.attract) this.drawAttractOverlay();
  },

  drawAttractOverlay() {
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, 'rgba(8,10,13,.30)'); g.addColorStop(0.55, 'rgba(8,10,13,.42)');
    g.addColorStop(1, 'rgba(8,10,13,.66)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  },

  /* ---------------- podsumowanie ---------------- */
  showDebrief() {
    if (this.state === 'debrief') return;
    this.state = 'debrief';
    this.running = true;
    Audio2.stopEngine();
    const m = this.mission;
    const acc = this.stats.shots ? Math.round(this.stats.hits / this.stats.shots * 100) : 0;
    const timeBonus = this.successFlag ? Math.max(0, Math.round((900 - this.missionT) * 2)) : 0;
    const accBonus = this.successFlag ? acc * 12 : 0;
    const livesBonus = this.successFlag ? this.lives * 400 : 0;
    const total = Math.max(0, this.score + timeBonus + accBonus + livesBonus);

    let medal = 0;
    if (this.successFlag) {
      const par = m.medalPar;
      medal = total >= par[2] ? 3 : total >= par[1] ? 2 : total >= par[0] ? 1 : 1;
    }
    // zapis
    if (this.successFlag) {
      const best = Save.data.best[m.id] || 0;
      if (total > best) Save.data.best[m.id] = total;
      const om = Save.data.medals[m.id] || 0;
      if (medal > om) Save.data.medals[m.id] = medal;
      if (Save.data.unlocked < m.id + 1) Save.data.unlocked = Math.min(MISSIONS.length, m.id + 1);
      Save.data.totalScore = (Save.data.totalScore || 0) + total;
      Save.data.missionsFlown = (Save.data.missionsFlown || 0) + 1;
      Save.store();
    }

    document.getElementById('debrief-title').textContent = this.successFlag ? 'MISJA WYKONANA' : 'MISJA NIEUDANA';
    document.getElementById('debrief-medal').textContent = this.successFlag ? ['', '🥉', '🥈', '🥇'][medal] : '💥';
    const rows = [
      ['Cele misji', this.mission.objectives.filter(o => this.objState[o.id].done).length + '/' + this.mission.objectives.length],
      ['Zestrzelone samoloty', this.stats.kills],
      ['Zniszczone cele naziemne', this.stats.ground],
      ['Celność', acc + '%'],
      ['Zrzucone bomby / torpedy', this.stats.bombsDropped],
      ['Stracone maszyny', this.stats.planesLost],
      ['Punkty za walkę', this.score],
      ['Premia za czas', timeBonus],
      ['Premia za celność', accBonus],
      ['Premia za zachowane maszyny', livesBonus],
    ];
    const tb = document.getElementById('score-table');
    tb.innerHTML = rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') +
      `<tr class="total"><td>RAZEM</td><td>${total}</td></tr>`;
    document.getElementById('debrief-text').textContent = this.successFlag
      ? ['', 'Brązowy Krzyż Zasługi — zadanie wykonane.', 'Srebrny Krzyż Zasługi — świetna robota, poruczniku.',
        'Krzyż Virtuti Militari — lot, o którym będą pisać w podręcznikach.'][medal]
      : (this.endReason || 'Wróć na lotnisko i spróbuj ponownie.');
    const nextBtn = document.querySelector('#screen-debrief [data-act="next"]');
    nextBtn.textContent = this.successFlag
      ? (this.missionIdx + 1 < MISSIONS.length ? 'NASTĘPNA MISJA ▸' : 'KONIEC KAMPANII ▸')
      : 'DZIENNIK ▸';
    showScreen('screen-debrief');
  },
};

/* =========================================================================
   INTERFEJS
   ========================================================================= */
const screens = ['screen-menu', 'screen-missions', 'screen-brief', 'screen-controls', 'screen-hangar', 'screen-options', 'screen-pause', 'screen-debrief'];
let prevScreen = 'screen-menu';

function showScreen(id) {
  for (const s of screens) {
    const el = document.getElementById(s);
    if (!el) continue;
    el.classList.toggle('show', s === id);
  }
  if (id) prevScreen = id;
}

function toastDom(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastDom._t);
  toastDom._t = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- lista misji ---------- */
function buildMissionGrid() {
  const grid = document.getElementById('mission-grid');
  grid.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const unlocked = m.id <= (Save.data.unlocked || 1);
    const medal = Save.data.medals[m.id] || 0;
    const best = Save.data.best[m.id] || 0;
    const el = document.createElement('div');
    el.className = 'm-card' + (unlocked ? '' : ' locked') + (medal ? ' done' : '');
    el.innerHTML = `
      <div class="no">MISJA ${m.id} · ${m.date}</div>
      <h3>${m.title}</h3>
      <p>${m.place} — ${PLANES[m.plane].name}</p>
      <div class="m-meta">
        <span class="medal-chip">${['—', '🥉', '🥈', '🥇'][medal]}</span>
        <span>${best ? best + ' pkt' : 'brak wyniku'}</span>
      </div>
      ${unlocked ? '' : '<div class="lock">🔒</div>'}`;
    if (unlocked) el.addEventListener('click', () => openBrief(i));
    grid.appendChild(el);
  });
  const d = Save.data;
  document.getElementById('career-line').textContent =
    `Misje: ${Object.keys(d.medals || {}).length}/${MISSIONS.length} · Zestrzelenia: ${d.kills || 0} · Punkty kariery: ${d.totalScore || 0}`;
}

/* ---------- odprawa ---------- */
let briefIdx = 0;
function openBrief(i) {
  briefIdx = i;
  const m = MISSIONS[i];
  const S = PLANES[m.plane];
  document.getElementById('brief-title').textContent = `MISJA ${m.id}: ${m.title.toUpperCase()}`;
  document.getElementById('brief-date').textContent = `${m.place} · ${m.date}`;
  document.getElementById('brief-text').textContent = m.brief;
  document.getElementById('brief-objectives').innerHTML =
    m.objectives.map(o => `<li>${o.text}</li>`).join('');
  document.getElementById('plane-name').textContent = S.full;
  document.getElementById('plane-stats').innerHTML =
    `<b>Rola:</b> ${S.role} (${S.year})<br>` +
    `<b>Prędkość maks.:</b> ${S.vMax} km/h<br>` +
    `<b>Uzbrojenie:</b> ${S.guns} km${S.bombs ? ` · ${S.bombs} bomb` : ''}${S.torps ? ` · ${S.torps} torpedy` : ''}<br>` +
    `<b>Wytrzymałość:</b> ${S.hp}<br>${S.desc}`;
  document.getElementById('brief-controls').innerHTML =
    '<kbd>←</kbd><kbd>→</kbd> ster · <kbd>↑</kbd> gaz · <kbd>↓</kbd> hamowanie<br>' +
    '<kbd>SPACJA</kbd> karabiny · <kbd>CTRL</kbd> bomby/torpedy · <kbd>L</kbd> podwozie';
  drawPlanePreview(document.getElementById('brief-plane'), m.plane);
  showScreen('screen-brief');
}

function drawPlanePreview(cv, key, scale) {
  const c = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  c.clearRect(0, 0, w, h);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1c2c3a'); g.addColorStop(1, '#0d151d');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.save();
  c.translate(w / 2, h / 2 + 6);
  const s = scale || Math.min(w / 130, h / 60);
  c.scale(s, s);
  Art.plane(c, key, { gear: 1, prop: 0.6 });
  c.restore();
}

/* ---------- hangar ---------- */
function buildHangar() {
  const grid = document.getElementById('hangar-grid');
  grid.innerHTML = '';
  for (const key of HANGAR_ORDER) {
    const S = PLANES[key];
    const el = document.createElement('div');
    el.className = 'h-card';
    el.innerHTML = `
      <canvas width="360" height="120"></canvas>
      <h3>${S.full}</h3>
      <div class="role">${S.enemy ? 'LUFTWAFFE' : 'LOTNICTWO POLSKIE'} · ${S.role} · ${S.year}</div>
      <p>${S.desc}</p>
      <div class="bars">
        ${[['Prędkość', S.stats.spd], ['Uzbrojenie', S.stats.arm], ['Zwrotność', S.stats.agi], ['Wytrzymałość', S.stats.tuf]]
        .map(b => `<div class="bar"><span>${b[0]}</span><i><s style="width:${Math.round(b[1] * 100)}%"></s></i></div>`).join('')}
      </div>`;
    grid.appendChild(el);
    drawPlanePreview(el.querySelector('canvas'), key, 2.1);
  }
}

/* ---------- opcje ---------- */
function bindOptions() {
  const q = id => document.getElementById(id);
  q('opt-sound').checked = Settings.sound;
  q('opt-volume').value = Math.round(Settings.volume * 100);
  q('opt-quality').value = Settings.quality;
  q('opt-shake').checked = Settings.shake;
  q('opt-gore').checked = Settings.gore;
  q('opt-difficulty').value = Settings.difficulty;
  q('opt-markers').checked = Settings.markers;
  const save = () => { Save.store(); Audio2.setVolume(); };
  q('opt-sound').addEventListener('change', e => { Settings.sound = e.target.checked; if (Settings.sound) Audio2.unlock(); save(); });
  q('opt-volume').addEventListener('input', e => { Settings.volume = e.target.value / 100; save(); });
  q('opt-quality').addEventListener('change', e => { Settings.quality = e.target.value; save(); });
  q('opt-shake').addEventListener('change', e => { Settings.shake = e.target.checked; save(); });
  q('opt-gore').addEventListener('change', e => { Settings.gore = e.target.checked; save(); });
  q('opt-difficulty').addEventListener('change', e => { Settings.difficulty = e.target.value; save(); });
  q('opt-markers').addEventListener('change', e => { Settings.markers = e.target.checked; save(); });
}

/* ---------- obsługa przycisków ---------- */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  Audio2.unlock();
  if (!btn) return;
  const act = btn.dataset.act;
  switch (act) {
    case 'campaign': {
      const idx = Math.min(MISSIONS.length - 1, Math.max(0, (Save.data.unlocked || 1) - 1));
      openBrief(idx);
      break;
    }
    case 'missions': buildMissionGrid(); showScreen('screen-missions'); break;
    case 'controls': showScreen('screen-controls'); break;
    case 'hangar': buildHangar(); showScreen('screen-hangar'); break;
    case 'options': showScreen('screen-options'); break;
    case 'back': showScreen('screen-menu'); break;
    case 'launch': G.startMission(briefIdx); break;
    case 'resume': resumeGame(); break;
    case 'restart': G.startMission(G.missionIdx); break;
    case 'abort': abortToMenu(); break;
    case 'retry': G.startMission(G.missionIdx); break;
    case 'next': {
      if (G.successFlag && G.missionIdx + 1 < MISSIONS.length) openBrief(G.missionIdx + 1);
      else { buildMissionGrid(); showScreen('screen-missions'); backToMenuWorld(); }
      break;
    }
    case 'reset-progress': {
      if (confirm('Skasować cały postęp kampanii?')) { Save.reset(); buildMissionGrid(); toastDom('Postęp skasowany'); }
      break;
    }
  }
});

function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'paused';
  Audio2.engineParams(0, 0);
  const objs = G.mission.objectives.map(o => {
    const st = G.objState[o.id];
    return `<div class="${st.done ? 'ok' : 'no'}">${st.done ? '✔' : '□'} ${o.text}${o.count ? ` (${st.progress}/${o.count})` : ''}</div>`;
  }).join('');
  document.getElementById('pause-objs').innerHTML = objs;
  showScreen('screen-pause');
}
function resumeGame() {
  if (G.state !== 'paused') return;
  G.state = 'play';
  showScreen(null);
  Audio2.unlock();
}
function abortToMenu() {
  G.state = 'menu';
  Audio2.stopEngine();
  backToMenuWorld();
  showScreen('screen-menu');
}
function backToMenuWorld() {
  G.startAttract();
  G.state = 'menu';
}

/* ---------- klawiatura globalna ---------- */
addEventListener('keydown', e => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (G.state === 'play') pauseGame();
    else if (G.state === 'paused') resumeGame();
  }
  if (e.code === 'KeyM') {
    Settings.sound = !Settings.sound;
    Audio2.setVolume(); Save.store();
    toastDom(Settings.sound ? 'Dźwięk włączony' : 'Dźwięk wyciszony');
    const cb = document.getElementById('opt-sound'); if (cb) cb.checked = Settings.sound;
  }
});

document.getElementById('fs-btn').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

/* =========================================================================
   PĘTLA GŁÓWNA
   ========================================================================= */
let lastT = performance.now();
let acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.12) dt = 0.12;         // po powrocie z tła nie przewijamy świata
  Input.update(dt);

  // restart misji przytrzymaniem R
  if (G.state === 'play' && Input.heldFor('KeyR') > 1) { Input.keys['KeyR'] = false; G.startMission(G.missionIdx); }

  if (G.state === 'play' || G.state === 'menu') G.update(dt);
  G.draw();
  Input.endFrame();
}

/* ---------------- start ---------------- */
Save.load();
Input.init();
resize();
bindOptions();
buildMissionGrid();
G.startAttract();
G.state = 'menu';
showScreen('screen-menu');
requestAnimationFrame(frame);

// udostępnij do testów automatycznych
window.__WOF = { G, MISSIONS, PLANES, Settings, Save, Particles, Input, Cam };
