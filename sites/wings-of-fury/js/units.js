/* =========================================================================
   Jednostki naziemne i morskie: piechota, czołgi, artyleria plot.,
   budynki, okręty. Zniszczone zostają na mapie jako płonące wraki.
   ========================================================================= */
'use strict';

/** Statystyki bazowe typów jednostek. */
const UNIT_DEF = {
  soldier: { hp: 8, w: 12, h: 18, score: 25, name: 'piechur', wreck: null },
  officer: { hp: 12, w: 12, h: 19, score: 60, name: 'oficer', wreck: null },
  tank: { hp: 130, w: 40, h: 24, score: 300, name: 'czołg', wreck: 'tank' },
  truck: { hp: 45, w: 34, h: 16, score: 120, name: 'ciężarówka', wreck: 'truck' },
  flak: { hp: 55, w: 30, h: 20, score: 220, name: 'stanowisko plot.', wreck: 'gun' },
  flak88: { hp: 90, w: 36, h: 24, score: 400, name: 'działo 88 mm', wreck: 'gun' },
  bunker: { hp: 220, w: 50, h: 30, score: 350, name: 'bunkier', wreck: 'building' },
  hangar: { hp: 160, w: 100, h: 46, score: 400, name: 'hangar', wreck: 'building' },
  depot: { hp: 120, w: 60, h: 34, score: 350, name: 'skład amunicji', wreck: 'building' },
  fuel: { hp: 70, w: 44, h: 44, score: 380, name: 'zbiornik paliwa', wreck: 'building' },
  house: { hp: 70, w: 48, h: 30, score: 60, name: 'zabudowanie', wreck: 'building' },
  radio: { hp: 60, w: 24, h: 74, score: 260, name: 'maszt radiowy', wreck: 'building' },
  bridge: { hp: 460, w: 230, h: 60, score: 900, name: 'most', wreck: 'building' },
  train: { hp: 180, w: 70, h: 30, score: 450, name: 'lokomotywa', wreck: 'truck' },
  wagon: { hp: 90, w: 56, h: 24, score: 200, name: 'wagon', wreck: 'truck' },
  parked: { hp: 60, w: 60, h: 22, score: 320, name: 'samolot na ziemi', wreck: 'plane' },
  balloon: { hp: 25, w: 54, h: 32, score: 150, name: 'balon', wreck: null },
  transport: { hp: 620, w: 190, h: 60, score: 1200, name: 'transportowiec', wreck: null },
  destroyer: { hp: 780, w: 200, h: 60, score: 1600, name: 'niszczyciel', wreck: null },
  carrier: { hp: 4000, w: 320, h: 90, score: 0, name: 'lotniskowiec', wreck: null },
};

class Unit {
  constructor(o) {
    const def = UNIT_DEF[o.type] || UNIT_DEF.soldier;
    Object.assign(this, {
      type: o.type, x: o.x, y: o.y ?? 0, team: o.team || 'ger',
      hp: (o.hp ?? def.hp) * (o.hpMul || 1), maxHp: (o.hp ?? def.hp) * (o.hpMul || 1),
      w: def.w, h: def.h, score: def.score, name: def.name, wreckKind: def.wreck,
      dir: o.dir ?? (chance(0.5) ? 1 : -1), dead: false, remove: false,
      animT: rnd(10), state: 'idle', gunAngle: 0.9, fireT: rnd(3, 0.5), burst: 0, burstT: 0,
      tag: o.tag || o.type, vx: 0, speed: o.speed ?? 0, hitFlash: 0, scale: o.scale || 1,
      ship: o.ship || null, len: o.len || 180, sink: 0, big: o.big || false,
      // nasza obrona plot. jest wsparciem, nie zastępstwem dla pilota
      skill: (o.team || 'ger') === 'pol' ? 0.4 : 1,
      color: o.color, alt: o.alt || 0, patrol: o.patrol || null, id: Unit.nextId++,
    });
    if (o.type === 'transport' || o.type === 'destroyer' || o.type === 'carrier') {
      this.ship = o.type; this.len = o.len || (o.type === 'carrier' ? 330 : o.type === 'destroyer' ? 210 : 190);
      this.w = this.len; this.h = 70;
    }
    if (o.type === 'soldier' || o.type === 'officer') { this.speed = o.speed ?? rnd(46, 22); this.state = 'walk'; }
    if (o.type === 'tank') this.speed = o.speed ?? rnd(28, 14);
    if (o.type === 'truck') this.speed = o.speed ?? rnd(58, 34);
    if (o.type === 'train') this.speed = o.speed ?? 70;
    if (o.type === 'balloon') this.alt = o.alt || 420;
  }

  get cx() { return this.x; }
  get cy() {
    if (this.ship) return this.y - 18;
    if (this.type === 'balloon') return this.y + this.alt;
    return this.y - this.h / 2;
  }

  /** Prostokąt kolizyjny w świecie (y rośnie do góry). */
  bounds() {
    const halfW = (this.ship ? this.len : this.w) / 2 * (this.scale || 1);
    if (this.ship) return { x0: this.x - halfW, x1: this.x + halfW, y0: this.y - 26, y1: this.y + (this.ship === 'carrier' ? 62 : 46) };
    if (this.type === 'balloon') return { x0: this.x - 30, x1: this.x + 30, y0: this.y + this.alt - 18, y1: this.y + this.alt + 18 };
    return { x0: this.x - halfW, x1: this.x + halfW, y0: this.y, y1: this.y + this.h * (this.scale || 1) };
  }

  contains(px, py, pad = 0) {
    const b = this.bounds();
    return px > b.x0 - pad && px < b.x1 + pad && py > b.y0 - pad && py < b.y1 + pad;
  }

  /** Samolot, do którego ta jednostka strzela (nasze działa biją w Niemców). */
  targetPlane(G) {
    if (this.team !== 'pol') return G.player && G.player.alive ? G.player : null;
    let best = null, bd = Infinity;
    for (const p of G.planes) {
      if (!p.alive || p.team === 'pol') continue;
      const d = dist2(this.x, this.y, p.x, p.y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  /* ------------------------ logika ------------------------ */
  update(dt, G) {
    this.animT += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.dead) { this.updateDead(dt, G); return; }

    const P = this.targetPlane(G);
    // ustaw na terenie
    if (!this.ship && this.type !== 'balloon') this.y = G.world.groundAt(this.x);

    switch (this.type) {
      case 'soldier': case 'officer': this.updateInfantry(dt, G, P); break;
      case 'tank': this.updateTank(dt, G, P); break;
      case 'truck': this.updateVehicle(dt, G, 40); break;
      case 'train': this.updateVehicle(dt, G, 0); break;
      case 'flak': case 'flak88': this.updateFlak(dt, G, P); break;
      case 'bunker': this.updateBunker(dt, G, P); break;
      case 'balloon': this.animT += dt; break;
      case 'transport': case 'destroyer': this.updateShip(dt, G, P); break;
      case 'carrier': this.updateCarrier(dt, G); break;
      default: break;
    }
  }

  updateDead(dt, G) {
    // tonący okręt
    if (this.ship && this.sink < 1) {
      this.sink = Math.min(1, this.sink + dt * 0.11);
      this.y = -this.sink * 46;
      if (chance(dt * 6)) Particles.smoke(this.x + rnd(this.len / 2, -this.len / 2), 10, { col: '#2a2723', sizeMul: 2.4, dens: 0.7 });
      if (chance(dt * 3)) Particles.fire(this.x + rnd(this.len / 3, -this.len / 3), 6, { sizeMul: 1.8 });
    }
  }

  updateInfantry(dt, G, P) {
    if (!P) {
      this.state = 'walk';
      this.x += this.dir * this.speed * dt;
      if (this.patrol) {
        if (this.x < this.patrol[0]) { this.x = this.patrol[0]; this.dir = 1; }
        if (this.x > this.patrol[1]) { this.x = this.patrol[1]; this.dir = -1; }
      }
      return;
    }
    const dToP = Math.abs(P.x - this.x);
    const lowPass = P.y - G.world.groundAt(P.x) < 500 && dToP < 700;
    if (lowPass && !this.panic) { this.panic = true; this.state = 'run'; this.dir = sign(this.x - P.x) || 1; this.speed = rnd(74, 52); }
    if (this.panic && dToP > 1100) { this.panic = false; this.state = 'walk'; this.speed = rnd(46, 22); }

    // co jakiś czas przystają i strzelają do samolotu
    this.fireT -= dt;
    if (!this.panic && lowPass === false && dToP < 900 && P.y - G.world.groundAt(P.x) < 900 && this.fireT <= 0) {
      this.fireT = rnd(2.6, 1.1);
      this.state = 'shoot';
      this.dir = sign(P.x - this.x) || 1;
      const a = Math.atan2(P.y + P.vy * 0.25 - (this.y + 16), P.x + P.vx * 0.25 - this.x);
      G.spawnBullet({
        x: this.x + Math.cos(a) * 10, y: this.y + 16 + Math.sin(a) * 10,
        vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, dmg: 2.2 * diffMul().dmg, team: this.team, kind: 'rifle', life: 1.4,
      });
      Particles.spark(this.x + Math.cos(a) * 12, this.y + 16 + Math.sin(a) * 12, 2, { dir: a, spread: 0.3, spd: 90 });
      setTimeout(() => { if (!this.dead) this.state = this.panic ? 'run' : 'walk'; }, 340);
    }
    this.x += this.dir * this.speed * dt;
    if (this.patrol) {
      if (this.x < this.patrol[0]) { this.x = this.patrol[0]; this.dir = 1; }
      if (this.x > this.patrol[1]) { this.x = this.patrol[1]; this.dir = -1; }
    } else if (this.x < 60 || this.x > G.world.width - 60) this.dir *= -1;
    // strome zbocze — zawróć
    const sl = G.world.slopeAt(this.x);
    if (Math.abs(sl) > 0.9) this.dir *= -1;
  }

  updateTank(dt, G, P) {
    this.updateVehicle(dt, G, 26);
    if (!P) { this.gunAngle = approach(this.gunAngle, 0.5, dt); return; }
    // wieża śledzi samolot i strzela rzadko
    const dx = P.x - this.x, dy = P.y - (this.y + 20);
    const range = 900;
    if (Math.hypot(dx, dy) < range && P.alive) {
      const want = Math.atan2(dy, Math.abs(dx));
      this.gunAngle = approach(this.gunAngle, clamp(want, 0.15, 1.45), dt * 1.6);
      if (sign(dx) !== 0) this.dir = sign(dx);
      this.fireT -= dt;
      if (this.fireT <= 0 && P.y - G.world.groundAt(P.x) < 700) {
        this.fireT = rnd(4.2, 2.4) / diffMul().aa;
        const a = Math.atan2(dy, dx);
        G.spawnBullet({
          x: this.x + Math.cos(a) * 24, y: this.y + 20 + Math.sin(a) * 24,
          vx: Math.cos(a) * 1250, vy: Math.sin(a) * 1250, dmg: 7 * diffMul().dmg, team: this.team, kind: 'mg', life: 1.6,
        });
        Particles.flash(this.x + Math.cos(a) * 26, this.y + 20 + Math.sin(a) * 26, 9, 0.08);
        Audio2.gun(0.4);
      }
    } else this.gunAngle = approach(this.gunAngle, 0.5, dt);
  }

  updateVehicle(dt, G, turnSlope) {
    if (!this.speed) return;
    this.x += this.dir * this.speed * dt;
    if (this.patrol) {
      if (this.x < this.patrol[0]) { this.x = this.patrol[0]; this.dir = 1; }
      if (this.x > this.patrol[1]) { this.x = this.patrol[1]; this.dir = -1; }
    } else if (this.x < 80 || this.x > G.world.width - 80) this.dir *= -1;
    if (chance(dt * 2.2)) Particles.smoke(this.x - this.dir * 16, this.y + 12, { dens: 0.25, sizeMul: 0.4, col: '#63625c', alpha: 0.3, lifeMul: 0.4 });
    // kurz spod kół
    if (chance(dt * 6)) Particles.dirt(this.x - this.dir * 14, this.y + 2, 1, { spd: 40, col: '#6d5f47' });
  }

  updateFlak(dt, G, P) {
    const D = diffMul();
    if (!P) { this.gunAngle = approach(this.gunAngle, 1.1, dt * 0.6); this.burst = 0; return; }
    const dx = P.x - this.x, dy = P.y - (this.y + 14);
    const d = Math.hypot(dx, dy);
    const range = (this.type === 'flak88' ? 2400 : 1500) * (this.skill < 1 ? 0.7 : 1);
    if (!P.alive || d > range) { this.gunAngle = approach(this.gunAngle, 1.1, dt * 0.6); this.burst = 0; return; }

    // wyprzedzenie toru lotu
    const shellV = this.type === 'flak88' ? 1500 : 1150;
    const t = d / shellV;
    const px = P.x + P.vx * t, py = P.y + P.vy * t;
    const a = Math.atan2(py - (this.y + 14), px - this.x);
    this.dir = sign(px - this.x) || this.dir;
    this.gunAngle = approach(this.gunAngle, clamp(Math.abs(wrapAngle(a)) > Math.PI / 2 ? Math.PI - Math.abs(a) : Math.abs(a), 0.1, 1.5), dt * 2.4);

    this.fireT -= dt;
    if (this.burst > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) {
        this.burst--;
        this.burstT = this.type === 'flak88' ? 0.9 : 0.09;
        const spread = (this.type === 'flak88' ? 0.055 : 0.035) / (D.aa * this.skill);
        const aa = a + rnd(spread, -spread);
        if (this.type === 'flak88') {
          this._flakTarget = P;
          G.spawnFlakShell(this.x, this.y + 16, aa, d, this);
        } else {
          G.spawnBullet({
            x: this.x + Math.cos(aa) * 20, y: this.y + 16 + Math.sin(aa) * 20,
            vx: Math.cos(aa) * shellV, vy: Math.sin(aa) * shellV,
            dmg: 5.5 * D.dmg * this.skill, team: this.team, kind: 'flak', life: 2.2, tracer: true,
          });
        }
        Particles.flash(this.x + Math.cos(aa) * 22, this.y + 16 + Math.sin(aa) * 22, this.type === 'flak88' ? 16 : 9, 0.07);
        Particles.smoke(this.x + Math.cos(aa) * 24, this.y + 16 + Math.sin(aa) * 24, { dens: 0.35, sizeMul: 0.5, lifeMul: 0.4, col: '#7d7a72' });
        if (d < 2000) (this.type === 'flak88' ? Audio2.flak() : Audio2.gun(0.5));
      }
    } else if (this.fireT <= 0) {
      this.burst = this.type === 'flak88' ? 1 : rndi(5, 9);
      this.burstT = 0;
      this.fireT = (this.type === 'flak88' ? rnd(3.4, 2) : rnd(2.4, 1.1)) / (D.aa * this.skill);
    }
  }

  updateBunker(dt, G, P) {
    if (!P) return;
    const dx = P.x - this.x, dy = P.y - (this.y + 16);
    const d = Math.hypot(dx, dy);
    if (!P.alive || d > 1000) return;
    this.fireT -= dt;
    if (this.fireT <= 0) {
      this.fireT = rnd(1.6, 0.7) / diffMul().aa;
      const t = d / 1100;
      const a = Math.atan2(P.y + P.vy * t - (this.y + 16), P.x + P.vx * t - this.x);
      for (let i = 0; i < 3; i++) {
        const aa = a + rnd(0.05, -0.05);
        setTimeout(() => {
          if (this.dead || !G.running) return;
          G.spawnBullet({
            x: this.x + Math.cos(aa) * 18, y: this.y + 16 + Math.sin(aa) * 18,
            vx: Math.cos(aa) * 1100, vy: Math.sin(aa) * 1100, dmg: 3.4 * diffMul().dmg, team: this.team, kind: 'mg', life: 1.6, tracer: true,
          });
        }, i * 70);
      }
    }
  }

  updateShip(dt, G, P) {
    this.y = Math.sin(this.animT * 0.6) * 2;
    if (!P) { this.updateShipMove(dt, G); return; }
    this.updateShipMove(dt, G);
    // artyleria plot. okrętu
    const dx = P.x - this.x, dy = P.y - this.y;
    const d = Math.hypot(dx, dy);
    const range = this.type === 'destroyer' ? 2000 : 1200;
    if (P.alive && d < range) {
      const shellV = 1200, t = d / shellV;
      const a = Math.atan2(P.y + P.vy * t - (this.y + 20), P.x + P.vx * t - this.x);
      this.gunAngle = approach(this.gunAngle, clamp(Math.abs(a) > Math.PI / 2 ? Math.PI - Math.abs(a) : Math.abs(a), 0.1, 1.5), dt * 2);
      this.dir = sign(dx) || this.dir;
      this.fireT -= dt;
      if (this.fireT <= 0) {
        const guns = this.type === 'destroyer' ? 3 : 1;
        this.fireT = rnd(1.8, 0.8) / diffMul().aa;
        for (let i = 0; i < guns; i++) setTimeout(() => {
          if (this.dead || !G.running) return;
          const aa = a + rnd(0.06, -0.06);
          const ox = rnd(this.len * 0.35, -this.len * 0.35);
          G.spawnBullet({
            x: this.x + ox, y: this.y + 26, vx: Math.cos(aa) * shellV, vy: Math.sin(aa) * shellV,
            dmg: 5 * diffMul().dmg, team: this.team, kind: 'flak', life: 2.2, tracer: true,
          });
          Particles.flash(this.x + ox, this.y + 28, 10, 0.06);
        }, i * 110);
      }
    }
  }

  updateShipMove(dt, G) {
    if (!this.speed) return;
    this.x += this.dir * this.speed * dt;
    if (this.x < 300 || this.x > G.world.width - 300) this.dir *= -1;
    if (chance(dt * 8)) Particles.wake(this.x - this.dir * this.len / 2, 2);
    if (chance(dt * 3)) Particles.smoke(this.x + this.dir * this.len * 0.05, 48, { col: '#4a463f', dens: 0.5, sizeMul: 1.4 });
  }

  updateCarrier(dt, G) {
    this.y = Math.sin(this.animT * 0.5) * 1.4;
    if (chance(dt * 1.5)) Particles.smoke(this.x + this.len * 0.3, 66, { col: '#575349', dens: 0.4, sizeMul: 1.1 });
  }

  /* ------------------------ obrażenia ------------------------ */
  hit(dmg, x, y, G, cause) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.hitFlash = 0.09;
    if (this.type === 'soldier' || this.type === 'officer') {
      Particles.blood(x || this.x, y || this.y + 10, 7);
    } else if (this.ship) {
      Particles.spark(x, y, 5, { spd: 200 });
      Particles.smoke(x, y, { dens: 0.5, col: '#4a4640', sizeMul: 0.8 });
    } else {
      Particles.spark(x, y, 4, { spd: 220, col: '#ffe08a' });
      Particles.debris(x, y, 2, { spd: 120, size: 3 });
    }
    if (this.hp <= 0) { this.destroy(G, cause); return true; }
    return false;
  }

  destroy(G, cause) {
    if (this.dead) return;
    this.dead = true;
    const W = G.world;
    G.onUnitDestroyed(this, cause);

    switch (this.type) {
      case 'soldier': case 'officer': {
        W.corpse(this.x, this.y, this.dir);
        Particles.blood(this.x, this.y + 10, 12);
        this.remove = true;
        break;
      }
      case 'balloon': {
        Particles.explosion(this.x, this.y + this.alt, 1.6, { smokeCol: '#3a3630' });
        Audio2.boom(1.1);
        this.remove = true;
        break;
      }
      case 'fuel': {
        Particles.explosion(this.x, this.y + 24, 3.2, { smokeCol: '#1e1b17' });
        for (let i = 0; i < 16; i++) setTimeout(() => Particles.fire(this.x + rnd(60, -60), this.y + rnd(80, 10), { sizeMul: 1.6 }), i * 45);
        W.crater(this.x, 60, 26);
        W.scorch(this.x, this.y, 74);
        W.blastScenery(this.x, 130);
        G.addWreck({ x: this.x, y: this.y, kind: 'building', w: 46, h: 40, fire: 1.6 });
        Cam.kick(1.0); Audio2.boom(1.7);
        break;
      }
      case 'depot': {
        Particles.explosion(this.x, this.y + 20, 2.8);
        for (let i = 0; i < 10; i++) setTimeout(() => {
          Particles.explosion(this.x + rnd(70, -70), this.y + rnd(40, 4), rnd(1.4, 0.6));
          Audio2.boom(0.8);
        }, 120 + i * 180);
        W.crater(this.x, 54, 22); W.scorch(this.x, this.y, 66); W.blastScenery(this.x, 120);
        G.addWreck({ x: this.x, y: this.y, kind: 'building', w: 56, h: 30, fire: 1.4 });
        Cam.kick(0.9); Audio2.boom(1.5);
        break;
      }
      case 'bridge': {
        Particles.explosion(this.x, this.y + 30, 3.4, { smokeCol: '#3a3833' });
        for (let i = 0; i < 5; i++) setTimeout(() => Particles.explosion(this.x + rnd(110, -110), this.y + rnd(30, 0), 1.4), i * 160);
        Particles.debris(this.x, this.y + 20, 40, { spd: 420, size: 9, col: '#4a463c' });
        W.scorch(this.x, this.y, 110);
        G.addWreck({ x: this.x, y: this.y, kind: 'building', w: 210, h: 40, fire: 1.2, bridge: true });
        Cam.kick(1.4); Audio2.boom(2);
        break;
      }
      case 'transport': case 'destroyer': {
        Particles.explosion(this.x, this.y + 20, 3.6, { smokeCol: '#26241f' });
        for (let i = 0; i < 8; i++) setTimeout(() => {
          Particles.explosion(this.x + rnd(this.len / 2, -this.len / 2), rnd(40, 0), rnd(2, 0.9));
          Audio2.boom(1.2);
        }, 200 + i * 260);
        Particles.water(this.x, 0, 40, { spd: 520 });
        Cam.kick(1.5); Audio2.boom(2.2);
        break;   // tonie w updateDead — zostaje na powierzchni jako wrak
      }
      case 'radio': {
        Particles.explosion(this.x, this.y + 30, 1.6);
        Particles.debris(this.x, this.y + 40, 16, { spd: 260, col: '#5a5e52' });
        G.addWreck({ x: this.x, y: this.y, kind: 'other', fire: 0.6 });
        Audio2.boom(1);
        break;
      }
      default: {
        const big = this.w > 44;
        Particles.explosion(this.x, this.y + this.h * 0.5, big ? 2.2 : 1.5);
        if (this.type === 'tank' || this.type === 'parked') {
          for (let i = 0; i < 6; i++) setTimeout(() => Particles.fire(this.x + rnd(20, -20), this.y + rnd(20, 4), { sizeMul: 1.6 }), i * 90);
        }
        if (big) { W.crater(this.x, 42, 16); W.blastScenery(this.x, 90); }
        W.scorch(this.x, this.y, big ? 50 : 32);
        G.addWreck({
          x: this.x, y: this.y, kind: this.wreckKind || 'other', w: this.w, h: this.h,
          dir: this.dir, rot: rnd(0.12, -0.12), fire: 1,
        });
        Cam.kick(big ? 0.6 : 0.35);
        Audio2.boom(big ? 1.3 : 0.9);
        break;
      }
    }
    if (this.type !== 'transport' && this.type !== 'destroyer' && this.type !== 'carrier') {
      if (this.type !== 'soldier' && this.type !== 'officer' && this.type !== 'balloon') this.remove = true;
    }
  }

  /* ------------------------ rysowanie ------------------------ */
  draw(ctx, W, H, G) {
    const b = this.bounds();
    if (b.x1 < G.viewX0 - 60 || b.x0 > G.viewX1 + 60) return;
    const z = Cam.zoom;
    const sx = Cam.sx(this.x, W);
    const sy = Cam.sy(this.type === 'balloon' ? this.y + this.alt : this.y, H);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(z, z);
    if (this.dead && this.ship) ctx.rotate(this.sink * 0.24 * this.dir);
    if (this.hitFlash > 0) { ctx.globalAlpha = 1; ctx.filter = 'brightness(1.8)'; }

    switch (this.type) {
      case 'soldier': case 'officer':
        Art.soldier(ctx, this); break;
      case 'tank': Art.tank(ctx, this); break;
      case 'truck': Art.truck(ctx, this); break;
      case 'flak': Art.flak(ctx, this); break;
      case 'flak88': Art.flak(ctx, Object.assign({ big: true }, this)); break;
      case 'bunker': Art.bunker(ctx, this); break;
      case 'hangar': Art.hangar(ctx, this); break;
      case 'depot': Art.depot(ctx, this); break;
      case 'fuel': Art.fueltank(ctx, { r: 20 }); break;
      case 'house': Art.house(ctx, this); break;
      case 'radio': Art.radio(ctx, { h: 74 }); break;
      case 'bridge': Art.bridge(ctx, { w: 230 }); break;
      case 'train': Art.train(ctx, this); break;
      case 'wagon': Art.wagon(ctx, this); break;
      case 'balloon': {
        // lina do wciągarki na ziemi
        ctx.save();
        ctx.strokeStyle = 'rgba(210,215,220,.16)'; ctx.lineWidth = 0.8;
        ctx.setLineDash([6, 7]);
        ctx.beginPath(); ctx.moveTo(0, 15); ctx.lineTo(0, this.alt); ctx.stroke();
        ctx.restore();
        Art.balloon(ctx, this);
        break;
      }
      case 'parked': {
        ctx.save(); ctx.scale(this.dir, 1); ctx.translate(0, -12);
        Art.plane(ctx, this.planeKey || 'bf109', { gear: 1, prop: 0 });
        ctx.restore();
        break;
      }
      case 'transport': case 'destroyer': case 'carrier':
        Art.ship(ctx, this); break;
      default: break;
    }
    ctx.filter = 'none';
    ctx.restore();

    // pasek uszkodzeń dla dużych celów
    if (!this.dead && this.maxHp > 100 && this.hp < this.maxHp * 0.999 && this.type !== 'carrier') {
      const bw = Math.min(90, (this.ship ? this.len : this.w) * z);
      const bx = sx - bw / 2, by = Cam.sy(b.y1, H) - 10;
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(bx, by, bw, 4);
      const f = clamp(this.hp / this.maxHp, 0, 1);
      ctx.fillStyle = f > 0.5 ? '#7fc16a' : f > 0.22 ? '#e0b02a' : '#d0402c';
      ctx.fillRect(bx, by, bw * f, 4);
    }
  }
}
Unit.nextId = 1;

/* =========================================================================
   WRAKI — pozostają na mapie do końca misji i cały czas dymią / płoną
   ========================================================================= */
class Wreck {
  constructor(o, world) {
    Object.assign(this, { x: 0, y: 0, kind: 'other', w: 30, h: 20, dir: 1, rot: 0, fire: 1, t: 0 }, o);
    this.y = o.y ?? (world ? world.groundAt(o.x) : 0);
    this.smokeT = rnd(0.4);
  }
  update(dt, G) {
    this.t += dt;
    // ogień z czasem przygasa do trwałego tlenia się, ale nie gaśnie
    const intensity = Math.max(0.28, this.fire * Math.exp(-this.t / 26));
    if (!this.onScreen) return;
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = rnd(0.36, 0.18) / Math.max(0.4, intensity);
      Particles.smoke(this.x + rnd(this.w * 0.2, -this.w * 0.2), this.y + 8 + rnd(8), {
        col: this.t > 40 ? '#3d3a34' : '#2a2723', sizeMul: 0.7 + intensity * 0.5,
        dens: 0.8, alpha: 0.38, lifeMul: 1.15,
      });
      if (intensity > 0.3 && chance(0.7)) Particles.fire(this.x + rnd(this.w * 0.24, -this.w * 0.24), this.y + 6, { sizeMul: 0.7 + intensity * 0.5, dens: 0.85 });
      if (chance(0.3)) Particles.ember(this.x + rnd(this.w * 0.2, -this.w * 0.2), this.y + 10);
    }
  }
  draw(ctx, W, H, G) {
    this.onScreen = !(this.x < G.viewX0 - 120 || this.x > G.viewX1 + 120);
    if (!this.onScreen) return;
    const z = Cam.zoom;
    ctx.save();
    ctx.translate(Cam.sx(this.x, W), Cam.sy(this.y, H));
    ctx.scale(z, z);
    if (this.bridge) {
      // przerwane przęsło
      ctx.fillStyle = '#3a352e';
      ctx.fillRect(-115, -10, 60, 8);
      ctx.fillRect(55, -10, 60, 8);
      ctx.fillStyle = '#2a2620';
      ctx.beginPath(); ctx.moveTo(-55, -10); ctx.lineTo(-20, 20); ctx.lineTo(-10, 20); ctx.lineTo(-48, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(55, -10); ctx.lineTo(24, 22); ctx.lineTo(14, 20); ctx.lineTo(48, -2); ctx.closePath(); ctx.fill();
    } else {
      Art.wreck(ctx, this);
    }
    ctx.restore();
  }
}

/* =========================================================================
   SPADOCHRONIARZ — pilot, który wyskoczył z płonącej maszyny
   ========================================================================= */
class Parachute {
  constructor(x, y, team, world) {
    this.x = x; this.y = y; this.team = team;
    this.vx = rnd(30, -30); this.vy = 60;
    this.open = 0; this.t = 0; this.landed = false; this.remove = false;
    this.swing = rnd(TAU);
    this.wind = world ? world.wind : 0;
  }
  update(dt, G) {
    this.t += dt;
    if (this.landed) {
      // po wylądowaniu odchodzi w bok i znika za horyzontem zdarzeń misji
      this.x += sign(this.vx || 1) * 26 * dt;
      this.y = G.world.groundAt(this.x);
      if (this.t > 40) this.remove = true;
      return;
    }
    this.open = Math.min(1, this.open + dt * 1.6);
    this.swing += dt * 1.6;
    const drag = 0.4 + this.open * 5.2;
    this.vy += (-GRAV + drag * 42) * dt;
    this.vy = clamp(this.vy, -220, 90);
    if (this.open > 0.5) this.vy = approach(this.vy, -34, dt * 90);
    this.vx = approach(this.vx, this.wind * 1.4, dt * 12);
    this.x += (this.vx + Math.sin(this.swing) * 12 * this.open) * dt;
    this.y += this.vy * dt;
    const g = G.world.surfaceAt(this.x);
    if (this.y <= g + 8) {
      this.y = g; this.landed = true; this.t = 0;
      if (G.world.isWater(this.x)) { Particles.water(this.x, 0, 10, { spd: 120 }); this.remove = true; }
    }
  }
  draw(ctx, W, H, G) {
    if (this.x < G.viewX0 - 80 || this.x > G.viewX1 + 80) return;
    const z = Cam.zoom;
    ctx.save();
    ctx.translate(Cam.sx(this.x, W), Cam.sy(this.y, H));
    ctx.scale(z, z);
    if (!this.landed) {
      const sw = Math.sin(this.swing) * 0.16 * this.open;
      ctx.rotate(sw);
      const r = 16 * this.open;
      if (this.open > 0.05) {
        ctx.fillStyle = this.team === 'pol' ? '#e6e2d4' : '#d9d4c4';
        ctx.beginPath(); ctx.arc(0, -30, r, Math.PI, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.12)';
        ctx.beginPath(); ctx.arc(0, -30, r, Math.PI * 1.5, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(230,226,212,.75)'; ctx.lineWidth = 0.7;
        for (const dx of [-r * 0.85, -r * 0.3, r * 0.3, r * 0.85]) {
          ctx.beginPath(); ctx.moveTo(dx, -30); ctx.lineTo(0, -10); ctx.stroke();
        }
      }
      ctx.fillStyle = '#4a4f3a';
      ctx.fillRect(-2.4, -10, 4.8, 8);
      ctx.fillStyle = '#3c4130';
      ctx.beginPath(); ctx.arc(0, -11.5, 2.6, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3c4130'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -2); ctx.lineTo(-2.6 + Math.sin(this.swing) * 1.6, 4);
      ctx.moveTo(0, -2); ctx.lineTo(2.6 - Math.sin(this.swing) * 1.6, 4);
      ctx.stroke();
    } else {
      Art.soldier(ctx, { dir: sign(this.vx) || 1, animT: this.t, state: 'run', color: '#4a4f3a', helmet: '#3c4130' });
    }
    ctx.restore();
  }
}
