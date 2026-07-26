/* =========================================================================
   Samoloty: model lotu, sterowanie gracza, lądowanie, uszkodzenia, SI
   Skala: 1 px ≈ 1 m, prędkość w px/s czytana wprost jako km/h
   ========================================================================= */
'use strict';

const GRAV = 300;          // 1 px ≈ 1 m, przyspieszenie dobrane pod czytelne łuki lotu
const CL_MAX = 1.62;       // maksymalny współczynnik siły nośnej (przed przeciągnięciem)

/* Dane maszyn — podajemy wielkości „fizyczne", resztę wyliczamy niżej.
   thrust  — przyspieszenie od silnika (px/s²)
   vStall  — prędkość przeciągnięcia (px/s ≈ km/h)
   vMax    — prędkość maksymalna w locie poziomym
   turn    — maksymalna prędkość obrotu sterem wysokości (rad/s)
   cdi     — opór indukowany (wytraca prędkość w ciasnym wirażu)         */
const PLANES = {
  pws26: {
    name: 'PWS-26', full: 'PWS-26', role: 'Samolot szkolno-treningowy', year: 1936,
    thrust: 130, vStall: 118, vMax: 300, turn: 2.0, cdi: 0.0009,
    hp: 90, guns: 1, rof: 0.14, ammo: 400, gunDmg: 5.2, bombs: 0, torps: 0, fuel: 260,
    hitR: 26, desc: 'Zwrotny dwupłatowiec szkolny. Wolny, ale wybacza błędy — na nim uczysz się latać.',
    stats: { spd: 0.3, arm: 0.2, agi: 0.8, tuf: 0.35 },
  },
  p7a: {
    name: 'PZL P.7a', full: 'PZL P.7a', role: 'Myśliwiec', year: 1932,
    thrust: 150, vStall: 138, vMax: 355, turn: 2.1, cdi: 0.0008,
    hp: 105, guns: 2, rof: 0.1, ammo: 600, gunDmg: 5.6, bombs: 0, torps: 0, fuel: 300,
    hitR: 27, desc: 'Pierwszy polski myśliwiec o konstrukcji metalowej. Skrzydło mewie daje świetną widoczność.',
    stats: { spd: 0.42, arm: 0.4, agi: 0.85, tuf: 0.4 },
  },
  p11c: {
    name: 'PZL P.11c', full: 'PZL P.11c', role: 'Myśliwiec', year: 1935,
    thrust: 168, vStall: 150, vMax: 400, turn: 2.2, cdi: 0.0008,
    hp: 125, guns: 4, rof: 0.085, ammo: 800, gunDmg: 6.2, bombs: 2, bombKind: 'bomb', torps: 0, fuel: 330,
    hitR: 28, desc: 'Podstawowy myśliwiec września. Cztery karabiny, zwrotny jak osa, ale wolniejszy od Messerschmitta.',
    stats: { spd: 0.5, arm: 0.62, agi: 0.9, tuf: 0.45 },
  },
  karas: {
    name: 'PZL.23 Karaś', full: 'PZL.23B Karaś', role: 'Lekki bombowiec', year: 1936,
    thrust: 158, vStall: 155, vMax: 385, turn: 1.7, cdi: 0.0010,
    hp: 190, guns: 2, rof: 0.11, ammo: 700, gunDmg: 5.4, bombs: 6, bombKind: 'bomb', torps: 0, fuel: 460,
    hitR: 34, desc: 'Lekki bombowiec liniowy. Dźwiga 700 kg bomb, ale w walce z myśliwcem jest ciężki i powolny.',
    stats: { spd: 0.46, arm: 0.55, agi: 0.45, tuf: 0.62 },
  },
  los: {
    name: 'PZL.37 Łoś', full: 'PZL.37B Łoś', role: 'Bombowiec średni', year: 1938,
    thrust: 178, vStall: 170, vMax: 425, turn: 1.35, cdi: 0.0011,
    hp: 300, guns: 2, rof: 0.12, ammo: 800, gunDmg: 5.6, bombs: 8, bombKind: 'heavy', torps: 2, fuel: 620,
    hitR: 42, desc: 'Duma polskiego lotnictwa — nowoczesny bombowiec o dużym udźwigu. Może przenosić torpedy lotnicze.',
    stats: { spd: 0.62, arm: 0.85, agi: 0.3, tuf: 0.9 },
  },
  /* --- maszyny przeciwnika --- */
  bf109: {
    name: 'Bf 109 E', full: 'Messerschmitt Bf 109 E-1', role: 'Myśliwiec', year: 1938,
    thrust: 198, vStall: 165, vMax: 470, turn: 2.0, cdi: 0.0008,
    hp: 130, guns: 4, rof: 0.09, ammo: 9999, gunDmg: 6.4, bombs: 0, torps: 0, fuel: 9999,
    hitR: 28, enemy: true, desc: 'Najgroźniejszy przeciwnik. Szybszy i lepiej uzbrojony, ale mniej zwrotny w ciasnym wirażu.',
    stats: { spd: 0.85, arm: 0.8, agi: 0.7, tuf: 0.5 },
  },
  stuka: {
    name: 'Ju 87 Stuka', full: 'Junkers Ju 87 B', role: 'Bombowiec nurkujący', year: 1937,
    thrust: 148, vStall: 145, vMax: 355, turn: 1.6, cdi: 0.0010,
    hp: 165, guns: 2, rof: 0.13, ammo: 9999, gunDmg: 5, bombs: 3, torps: 0, fuel: 9999,
    hitR: 34, enemy: true, rearGun: true, desc: 'Bombowiec nurkujący z syreną. Powolny — świetny cel, jeśli dopadniesz go po zrzucie.',
    stats: { spd: 0.42, arm: 0.6, agi: 0.4, tuf: 0.62 },
  },
  he111: {
    name: 'He 111', full: 'Heinkel He 111 P', role: 'Bombowiec średni', year: 1937,
    thrust: 162, vStall: 165, vMax: 400, turn: 1.15, cdi: 0.0012,
    hp: 380, guns: 1, rof: 0.16, ammo: 9999, gunDmg: 4.4, bombs: 10, torps: 0, fuel: 9999,
    hitR: 48, enemy: true, rearGun: true, desc: 'Bombowiec, który równał z ziemią polskie miasta. Twardy, ale powolny i słabo uzbrojony w ogon.',
    stats: { spd: 0.6, arm: 0.75, agi: 0.2, tuf: 0.95 },
  },
  bf110: {
    name: 'Bf 110', full: 'Messerschmitt Bf 110 C', role: 'Ciężki myśliwiec', year: 1938,
    thrust: 182, vStall: 170, vMax: 440, turn: 1.5, cdi: 0.0010,
    hp: 240, guns: 5, rof: 0.085, ammo: 9999, gunDmg: 6.8, bombs: 0, torps: 0, fuel: 9999,
    hitR: 38, enemy: true, rearGun: true, desc: 'Niszczyciel — ciężko uzbrojony, ale ociężały w wirażu.',
    stats: { spd: 0.78, arm: 0.95, agi: 0.35, tuf: 0.75 },
  },
  hs126: {
    name: 'Hs 126', full: 'Henschel Hs 126', role: 'Samolot rozpoznawczy', year: 1938,
    thrust: 138, vStall: 125, vMax: 330, turn: 1.7, cdi: 0.0010,
    hp: 110, guns: 1, rof: 0.16, ammo: 9999, gunDmg: 4, bombs: 0, torps: 0, fuel: 9999,
    hitR: 30, enemy: true, rearGun: true, desc: 'Oczy niemieckiej artylerii. Zestrzelenie go ratuje życie naszych żołnierzy.',
    stats: { spd: 0.35, arm: 0.25, agi: 0.5, tuf: 0.4 },
  },
};

/* Współczynniki pochodne — jedno źródło prawdy dla całej fizyki:
   liftK dobrany tak, by przy CL_MAX i vStall siła nośna równoważyła ciężar,
   cd0 tak, by ciąg równoważył opór dokładnie przy vMax.                    */
for (const k in PLANES) {
  const S = PLANES[k];
  S.key = k;
  S.liftK = GRAV / (S.vStall * S.vStall * CL_MAX);
  S.cd0 = S.thrust / (S.vMax * S.vMax);
  S.vCtrl = S.vStall * 1.25;          // pełna skuteczność steru
  S.vTake = S.vStall * 1.12;          // prędkość oderwania
  S.vLand = S.vStall * 1.45;          // maksymalna prędkość przyziemienia
}

class Plane {
  constructor(key, o = {}) {
    const S = PLANES[key] || PLANES.p11c;
    this.key = key; this.S = S;
    this.x = o.x || 0; this.y = o.y || 400;
    this.vx = o.vx ?? 0; this.vy = o.vy ?? 0;
    this.a = o.a ?? 0;
    this.team = o.team || (S.enemy ? 'ger' : 'pol');
    this.isPlayer = !!o.isPlayer;
    this.throttle = o.throttle ?? (o.grounded ? 0 : 0.8);
    this.rpm = this.throttle;
    this.hp = S.hp; this.maxHp = S.hp;
    this.hitR = S.hitR;
    this.ammo = S.ammo; this.maxAmmo = S.ammo;
    this.bombs = o.bombs ?? S.bombs; this.maxBombs = this.bombs;
    this.torps = o.torps ?? S.torps; this.maxTorps = this.torps;
    this.fuel = S.fuel; this.maxFuel = S.fuel;
    this.gearT = o.grounded ? 1 : (S.key === 'los' ? 0 : 1);
    this.gearDown = !!o.grounded || key !== 'los';
    this.onGround = !!o.grounded;
    this.landed = !!o.grounded;
    this.alive = true; this.dead = false; this.remove = false;
    this.gunT = 0; this.heat = 0; this.overheat = false;
    this.prop = 0; this.flip = Math.cos(this.a) < 0;
    this.smokeT = 0; this.fire = 0; this.dmgSmoke = 0;
    this.bombT = 0; this.stallT = 0; this.alpha = 0;
    this.rollBank = 0;
    this.name = o.name || S.name;
    this.aiKind = o.ai || null;     // 'fighter' | 'bomber' | 'stuka' | 'recon' | 'escort'
    this.aiTargetX = o.targetX ?? 0;
    this.ai = this.aiKind ? { state: 'cruise', t: 0, fireT: 0, evadeT: 0, targetAlt: o.alt || rnd(1400, 700), bombDone: false, rearT: 0 } : null;
    this.trail = [];
    this.landT = 0; this.rearmT = 0;
    this.invuln = o.invuln || 0;
    this.score = o.score || 0;
    this.lastHitBy = null;
    this.brakes = 0;
    this.wobble = rnd(TAU);
  }

  get speed() { return Math.hypot(this.vx, this.vy); }
  /** 1 = maszyna zwrócona w prawo, -1 = w lewo. */
  get faceDir() { return Math.cos(this.a) >= 0 ? 1 : -1; }
  /** Pochylenie względem horyzontu: dodatnie = nos w górę, niezależnie od kierunku lotu. */
  get pitch() { return this.faceDir > 0 ? wrapAngle(this.a) : -wrapAngle(this.a - Math.PI); }
  set pitch(v) { const d = this.faceDir; this.a = d > 0 ? wrapAngle(v) : wrapAngle(Math.PI - v); }
  get kmh() { return this.speed; }
  get altM() { return Math.max(0, this.y); }
  get aglM() { return Math.max(0, this.y - (this.groundY ?? 0)); }

  /* ================= aktualizacja ================= */
  update(dt, G) {
    if (!this.alive) { this.updateWreckFall(dt, G); return; }
    const S = this.S;
    this.prop += (0.4 + this.rpm * 3) * dt * 34;
    this.wobble += dt;
    // odstępy między strzałami i zrzutami
    if (this.gunT > 0) this.gunT = Math.max(0, this.gunT - dt);
    if (this.bombT > 0) this.bombT = Math.max(0, this.bombT - dt);
    if (this.invuln > 0) this.invuln -= dt;

    // teren pod maszyną (uwzględnia pokład lotniskowca)
    const gl = G.groundLevelFor(this.x);
    this.groundY = gl.y; this.groundRw = gl.rw;

    if (this.isPlayer) this.controlPlayer(dt, G);
    else if (this.ai) this.controlAI(dt, G);

    // paliwo
    if (this.fuel > 0) {
      this.fuel -= (0.25 + this.throttle * 1.35) * dt;
      if (this.fuel <= 0) { this.fuel = 0; if (this.isPlayer) G.toast('BRAK PALIWA! Silnik zgasł'); }
    }
    const fuelOk = this.fuel > 0 ? 1 : 0;

    // silnik: obroty gonią przepustnicę, uszkodzenia obniżają moc
    const powerLoss = this.hp < this.maxHp * 0.35 ? 0.62 : this.hp < this.maxHp * 0.6 ? 0.85 : 1;
    this.rpm = approach(this.rpm, this.throttle * fuelOk * powerLoss, dt * 0.9);

    if (this.onGround) this.updateGround(dt, G);
    else this.updateFlight(dt, G);

    // podwozie
    const gearTarget = this.gearDown ? 1 : 0;
    this.gearT = approach(this.gearT, gearTarget, dt * 0.9);

    // ogień i dym uszkodzeń
    this.updateDamageFx(dt, G);

    // przegrzanie luf
    this.heat = Math.max(0, this.heat - dt * (this.overheat ? 0.32 : 0.42));
    if (this.overheat && this.heat < 0.25) this.overheat = false;

    // granice świata
    if (this.x < 40) { this.x = 40; this.vx = Math.abs(this.vx) * 0.4; }
    if (this.x > G.world.width - 40) { this.x = G.world.width - 40; this.vx = -Math.abs(this.vx) * 0.4; }
    if (this.y > G.world.ceiling) { this.y = G.world.ceiling; if (this.vy > 0) this.vy *= 0.2; }

    // smugi kondensacyjne z końcówek skrzydeł
    if (this.y > 1650 && this.speed > 190 && Settings.quality !== 'low') {
      if (chance(dt * 30)) {
        const c = Math.cos(this.a), sn = Math.sin(this.a);
        for (const off of [-11, 11]) {
          Particles.add({
            x: this.x - c * 16 - sn * off, y: this.y - sn * 16 + c * off, vx: rnd(4, -4), vy: rnd(3, -3),
            life: rnd(5, 2.6), size: rnd(6, 3), grow: 7, type: 'smoke', col: '#eef5fa',
            alpha: 0.3 * clamp((this.y - 1650) / 500, 0, 1), drag: 2.4, prio: 0.3,
          });
        }
      }
    }
    if (this.flipHold === undefined) this.flipHold = this.flip;
    const c = Math.cos(this.a);
    if (c < -0.06) this.flip = true; else if (c > 0.06) this.flip = false;
  }

  /* ---------------- sterowanie gracza ---------------- */
  controlPlayer(dt, G) {
    const S = this.S;
    let pitch = 0;
    if (Input.down('ArrowLeft')) pitch += 1;
    if (Input.down('ArrowRight')) pitch -= 1;
    const hard = Input.down('ShiftLeft', 'ShiftRight');

    if (Input.down('ArrowUp')) this.throttle = clamp(this.throttle + dt * 0.85, 0, 1);
    if (Input.down('ArrowDown')) {
      this.throttle = clamp(this.throttle - dt * 1.15, 0, 1);
      this.brakes = approach(this.brakes, 1, dt * 3);
    } else this.brakes = approach(this.brakes, 0, dt * 3);

    // ster wysokości
    if (!this.onGround) {
      // asystent przeciwprzeciągnięciowy: nie pozwala „zadrzeć" maszyny
      // ponad kąt krytyczny — samolot nadal można przeciągnąć świecą,
      // ale nie zawiśnie w powietrzu przez samo trzymanie steru
      if (pitch > 0 && this.alpha > 0.27) pitch *= 0.18;
      if (pitch < 0 && this.alpha < -0.27) pitch *= 0.18;
      const eff = clamp(this.speed / S.vCtrl, 0.15, 1.0) * (hard ? 1.45 : 1);
      const damaged = this.hp < this.maxHp * 0.3 ? 0.7 : 1;
      this.a += pitch * S.turn * eff * damaged * dt;
      if (hard && Math.abs(pitch) > 0) {
        this.vx *= 1 - dt * 0.32; this.vy *= 1 - dt * 0.32;
        if (chance(dt * 20)) Particles.add({
          x: this.x + rnd(30, -30), y: this.y + rnd(20, -20), vx: 0, vy: 0, life: 0.5, size: 4, grow: 22,
          type: 'smoke', col: '#ffffff', alpha: 0.22, drag: 2, prio: 0.4,
        });
      }
    } else {
      // na ziemi ster wysokości podrywa ogon — działa tak samo w obie strony
      const d = this.faceDir;
      const pr = clamp(this.pitch + pitch * d * 1.2 * dt * clamp(this.speed / 110, 0.15, 1), -0.28, 0.55);
      this.pitch = pr;
    }

    // podwozie
    if (Input.hit('KeyL')) { this.gearDown = !this.gearDown; G.toast(this.gearDown ? 'Podwozie wypuszczone' : 'Podwozie schowane'); }
    // automat: nisko nad lotniskiem wypuść podwozie
    if (!this.gearDown && this.groundRw && this.y - this.groundY < 220 && this.vy < 40) {
      this.gearDown = true; G.toast('Podwozie wypuszczone automatycznie');
    }

    // broń
    if (Input.down('Space')) this.fireGuns(G);
    if (Input.hit('ControlLeft', 'ControlRight', 'KeyZ')) this.dropOrdnance(G);
  }

  /* ---------------- model lotu ---------------- */
  updateFlight(dt, G) {
    const S = this.S;
    const v = this.speed;
    let ax = 0, ay = -GRAV;

    // ciąg
    ax += Math.cos(this.a) * S.thrust * this.rpm;
    ay += Math.sin(this.a) * S.thrust * this.rpm;

    if (v > 6) {
      const vdx = this.vx / v, vdy = this.vy / v;
      const flightAng = Math.atan2(this.vy, this.vx);
      let alpha = wrapAngle(this.a - flightAng);
      // przy locie „na plecach" siła nośna działa symetrycznie
      if (Math.abs(alpha) > Math.PI / 2) alpha = wrapAngle(Math.PI - alpha) * -1;
      this.alpha = alpha;

      const stallA = 0.30;
      let Cl;
      const aa = Math.abs(alpha);
      if (aa <= stallA) Cl = 5.4 * alpha;
      else {
        const over = aa - stallA;
        Cl = sign(alpha) * 5.4 * stallA * Math.max(0.18, Math.cos(over * 2.6));
        this.stallT += dt;
      }
      if (aa <= stallA) this.stallT = Math.max(0, this.stallT - dt * 2);

      const q = v * v;
      const L = S.liftK * q * Cl;
      const drag = S.cd0 * q + S.cdi * q * Cl * Cl + (this.gearDown ? 0.00035 * q : 0) + this.brakes * 0.0009 * q;

      // siła nośna prostopadle do wektora lotu
      ax += -vdy * L; ay += vdx * L;
      ax += -vdx * drag; ay += -vdy * drag;

      // stateczność — maszyna jest wytrymowana: nos sam ustawia się tak,
      // by przy danej prędkości utrzymać lot poziomy (bez tego trzeba by
      // stale „podtrzymywać" drążek, co przy sterowaniu obrotem jest męczące)
      const clTrim = clamp(GRAV / Math.max(60, S.liftK * v * v), -CL_MAX, CL_MAX);
      const trimA = flightAng + clTrim / 5.4;
      const stab = clamp(v / 340, 0, 1.3) * 1.4;
      this.a += wrapAngle(trimA - this.a) * Math.min(0.9, stab * dt);

      // przeciągnięcie: opadanie na skrzydło
      if (this.stallT > 0.25) {
        this.a += (chance(0.5) ? 1 : -1) * dt * 0.5 * clamp(this.stallT, 0, 1);
        if (this.isPlayer && chance(dt * 3)) G.warn('PRZECIĄGNIĘCIE');
      }
    } else {
      // prawie zerowa prędkość — nos opada
      this.a += wrapAngle(-Math.PI / 2 - this.a) * dt * 0.7;
    }

    this.vx += ax * dt; this.vy += ay * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.a = wrapAngle(this.a);

    // dotknięcie ziemi / wody
    const gy = this.groundY;
    if (this.y - 8 <= gy) this.touchdown(G, gy);
  }

  touchdown(G, gy) {
    const rw = this.groundRw;
    const slope = rw ? 0 : G.world.slopeAt(this.x);
    const water = !rw && G.world.isWater(this.x);
    const vs = this.vy;                       // prędkość opadania
    const attitudeOk = Math.abs(this.pitch - slope * this.faceDir) < 0.34;
    const speedOk = this.speed < this.S.vLand;
    const softOk = vs > -130;
    const canLand = rw && this.gearT > 0.85 && attitudeOk && speedOk && softOk && !water;
    // za szybkie, ale poprawne podejście — maszyna odbija się od pasa zamiast ginąć
    const bounce = !canLand && rw && !water && this.gearT > 0.85 && attitudeOk &&
      vs > -240 && this.speed < this.S.vLand * 1.5;
    if (bounce) {
      this.y = gy + 9;
      this.vy = Math.max(60, -vs * 0.45);
      this.vx *= 0.94;
      this.hp -= 3;
      Particles.dirt(this.x, gy, 8, { spd: 160, col: rw.deck ? '#b9b3a2' : '#7a6a4c' });
      Audio2.hitMetal();
      Cam.kick(0.3);
      if (this.isPlayer) G.warn(speedOk ? 'TWARDE PRZYZIEMIENIE' : 'ZA SZYBKO — ZMNIEJSZ GAZ');
      return;
    }

    if (canLand) {
      this.y = gy + 8;
      this.vy = 0;
      this.onGround = true;
      this.pitch = slope * this.faceDir;
      if (!this.landed) {
        this.landed = true;
        if (this.isPlayer) {
          G.onPlayerLanded(rw);
          Particles.dirt(this.x, gy, 10, { spd: 120, col: rw.deck ? '#b9b3a2' : '#7a6a4c' });
          Audio2.hitMetal();
        }
      }
    } else {
      this.crash(G, water);
    }
  }

  updateGround(dt, G) {
    const S = this.S;
    const rw = this.groundRw || G.world.inRunway(this.x);
    const gy = this.groundY;
    this.y = gy + 8;
    this.vy = 0;
    const slope = rw ? 0 : G.world.slopeAt(this.x);

    // toczenie: ciąg minus tarcie kół i opór powietrza
    const v = Math.abs(this.vx);
    // na pokładzie lotniskowca hak chwyta liny hamujące — maszyna staje w kilkadziesiąt metrów
    const arrest = (rw && rw.deck && this.landed && v > 12) ? 900 : 0;
    const roll = 26 + this.brakes * 520 + arrest;
    if (arrest && chance(0.4)) Particles.dirt(this.x - sign(this.vx) * 14, gy, 2, { spd: 90, col: '#b9b3a2' });
    const aero = S.cd0 * v * v * 1.25;
    this.vx += (S.thrust * this.rpm * Math.cos(this.a) - sign(this.vx) * (roll + aero)) * dt;
    if (Math.abs(this.vx) < 3 && this.rpm < 0.15) this.vx = 0;
    this.x += this.vx * dt;

    // kurz spod kół
    if (Math.abs(this.vx) > 40 && chance(dt * 20)) {
      Particles.dirt(this.x - 10, gy, 1, { spd: 40, col: rw && rw.deck ? '#9aa0a3' : '#7d6a4a' });
    }

    // oderwanie — po osiągnięciu prędkości startowej maszyna sama unosi ogon
    const vt = S.vTake;
    if (Math.abs(this.vx) > vt * (this.pitch > 0.05 ? 0.94 : 1.06)) {
      this.onGround = false;
      this.landed = false;
      this.vy = 26;
      if (this.pitch < 0.09) this.pitch = 0.09;
      if (this.isPlayer) { G.toast('W POWIETRZU — schowaj podwozie (L)'); G.onPlayerTookOff(); }
    }
    // koniec pasa
    if (rw && (this.x < rw.x0 - 30 || this.x > rw.x1 + 30) && Math.abs(this.vx) > 120) {
      this.crash(G, false);
    }
    if (rw && rw.deck && (this.x < rw.x0 - 6 || this.x > rw.x1 + 6)) {
      // zjazd z pokładu do wody
      this.onGround = false; this.groundY = 0; this.vy = -40;
    }

    // uzupełnianie zapasów po zatrzymaniu
    if (this.isPlayer && this.landed && Math.abs(this.vx) < 12) G.serviceOnGround(dt);
  }

  /* ---------------- broń ---------------- */
  fireGuns(G) {
    if (this.gunT > 0 || this.ammo <= 0 || this.overheat || !this.alive) return;
    const S = this.S;
    this.gunT = S.rof;
    this.ammo -= this.isPlayer ? 1 : 0;
    this.heat += 0.045;
    if (this.heat > 1) { this.overheat = true; if (this.isPlayer) G.warn('PRZEGRZANE LUFY'); }
    const n = Math.min(2, S.guns);
    const c = Math.cos(this.a), s = Math.sin(this.a);
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * 9 * (this.flip ? -1 : 1);
      const bx = this.x + c * 30 - s * off;
      const by = this.y + s * 30 + c * off;
      const spread = rnd(0.016, -0.016);
      const aa = this.a + spread;
      const mv = 1500;
      G.spawnBullet({
        x: bx, y: by,
        vx: Math.cos(aa) * mv + this.vx * 0.5, vy: Math.sin(aa) * mv + this.vy * 0.5,
        dmg: S.gunDmg * (this.team === 'pol' ? 1 : diffMul().dmg), team: this.team, kind: 'mg', life: 1.1,
        owner: this,
      });
      Particles.flash(bx, by, 7, 0.05);
    }
    Particles.casing(this.x + c * 10, this.y + s * 10, -this.vx * 0.1, -this.vy * 0.1);
    if (this.isPlayer) { Audio2.gun(1); G.stats.shots += n; }
    else if (dist(this.x, this.y, Cam.x, Cam.y) < 900) Audio2.gun(0.45);
  }

  dropOrdnance(G) {
    if (this.bombT > 0 || !this.alive) return;
    const S = this.S;
    const useTorp = this.torps > 0 && (this.S.torps > 0) && (G.world.isWater(this.x) || this.bombs <= 0);
    if (useTorp && this.torps > 0) {
      this.torps--; this.bombT = 0.6;
      const c = Math.cos(this.a), s = Math.sin(this.a);
      const ok = this.y < 260 && this.speed < 340 && Math.abs(this.a) < 0.3;
      G.spawnOrdnance(new Ordnance({
        kind: 'torpedo', x: this.x + c * 4 - s * -12, y: this.y + s * 4 + c * -12,
        vx: this.vx * (ok ? 1 : 1), vy: this.vy - 20, owner: this,
      }));
      if (this.isPlayer) {
        G.stats.bombsDropped++;
        G.toast(ok ? 'TORPEDA POSZŁA!' : 'Zrzut z zbyt dużej wysokości — torpeda może się rozbić');
      }
      return;
    }
    if (this.bombs <= 0) { if (this.isPlayer) G.warn('BRAK BOMB'); return; }
    this.bombs--; this.bombT = 0.32;
    const c = Math.cos(this.a), s = Math.sin(this.a);
    G.spawnOrdnance(new Ordnance({
      kind: S.bombKind === 'heavy' ? 'heavy' : 'bomb',
      x: this.x + c * 2 - s * -10, y: this.y + s * 2 + c * -10,
      vx: this.vx, vy: this.vy - 30, owner: this, team: this.team,
    }));
    if (this.isPlayer) { G.stats.bombsDropped++; Audio2.tone(200, 0.12, 0.1, 'triangle', 120); }
  }

  /* ---------------- uszkodzenia ---------------- */
  hit(dmg, x, y, G, by) {
    if (!this.alive || this.invuln > 0) return;
    this.hp -= dmg;
    this.lastHitBy = by;
    if (this.isPlayer) {
      Cam.kick(0.18);
      G.hudFlash = Math.min(1, (G.hudFlash || 0) + 0.35);
      if (chance(0.25)) Audio2.hitMetal();
    }
    Particles.spark(x, y, 3, { spd: 180, col: '#ffd9a0' });
    if (this.hp <= 0) this.destroy(G, by);
    else if (this.hp < this.maxHp * 0.3 && this.fire <= 0) {
      this.fire = 1;
      if (this.isPlayer) G.warn('POŻAR SILNIKA — LĄDUJ!');
    }
  }

  updateDamageFx(dt, G) {
    const f = this.hp / this.maxHp;
    if (f < 0.62) {
      this.smokeT -= dt;
      if (this.smokeT <= 0) {
        this.smokeT = f < 0.3 ? 0.03 : 0.09;
        Particles.smoke(this.x - Math.cos(this.a) * 16, this.y - Math.sin(this.a) * 16, {
          col: f < 0.3 ? '#1e1c19' : '#5b5852', sizeMul: f < 0.3 ? 1.3 : 0.8, dens: 1,
          vx: this.vx * 0.12, vy: this.vy * 0.12, alpha: 0.6,
        });
      }
    }
    if (this.fire > 0) {
      this.hp -= dt * 2.6;
      if (chance(dt * 20)) Particles.fire(this.x + rnd(14, -14), this.y + rnd(8, -8), { vx: this.vx * 0.2, vy: this.vy * 0.2, sizeMul: 0.85 });
      if (this.hp <= 0) this.destroy(G, this.lastHitBy);
    }
  }

  destroy(G, by) {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    // pilot czasem zdąży wyskoczyć
    if (!this.isPlayer && this.y - G.world.groundAt(this.x) > 260 && chance(0.55)) {
      G.addParachute(this.x, this.y, this.team);
    }
    this.deathT = 0;
    this.spin = rnd(3.4, -3.4);
    Particles.explosion(this.x, this.y, this.isPlayer ? 2.4 : 2, { debrisCol: '#3a3730' });
    Audio2.boom(1.4);
    Cam.kick(this.isPlayer ? 1.2 : 0.5);
    G.onPlaneDestroyed(this, by);
  }

  /* spadanie zestrzelonej maszyny */
  updateWreckFall(dt, G) {
    this.deathT = (this.deathT || 0) + dt;
    this.vy -= GRAV * 0.85 * dt;
    this.vx *= 1 - dt * 0.25;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.a += this.spin * dt;
    this.prop += dt * 6;
    if (chance(dt * 24)) Particles.fire(this.x + rnd(12, -12), this.y + rnd(10, -10), { sizeMul: 1.1 });
    if (chance(dt * 30)) Particles.smoke(this.x, this.y, { col: '#1c1a17', sizeMul: 1.6, dens: 1 });
    if (chance(dt * 12)) Particles.debris(this.x, this.y, 1, { spd: 60 });

    const gy = G.groundLevelFor(this.x).y;
    if (this.y <= gy + 6) {
      // uderzenie w ziemię — zostaje płonący wrak
      const water = G.world.isWater(this.x) && !G.groundLevelFor(this.x).rw;
      if (water) {
        Particles.water(this.x, 0, 34, { spd: 460 });
        Particles.explosion(this.x, 6, 1.4, { smokeCol: '#8fa9b6' });
        Audio2.splash();
      } else {
        Particles.explosion(this.x, gy + 8, 2.4);
        G.world.crater(this.x, 30, 10);
        G.world.scorch(this.x, gy, 46);
        G.world.blastScenery(this.x, 80);
        G.addWreck({ x: this.x, y: gy, kind: 'plane', w: 44, h: 18, dir: this.vx > 0 ? 1 : -1, rot: rnd(0.2, -0.2), fire: 1.3 });
        Audio2.boom(1.5);
      }
      Cam.kick(0.5);
      this.remove = true;
    }
    if (this.y < -400) this.remove = true;
  }

  crash(G, water) {
    if (!this.alive) return;
    if (water) {
      Particles.water(this.x, 0, 40, { spd: 520 });
      Particles.explosion(this.x, 8, 1.6, { smokeCol: '#8fa9b6' });
      Audio2.splash();
      if (this.isPlayer) G.toast('WODOWANIE — maszyna stracona');
    } else {
      Particles.explosion(this.x, this.y, 2.2);
      G.world.crater(this.x, 30, 12);
      G.world.scorch(this.x, this.groundY, 48);
      G.addWreck({ x: this.x, y: this.groundY, kind: 'plane', w: 44, h: 18, dir: sign(this.vx) || 1, rot: rnd(0.25, -0.25), fire: 1.3 });
      Audio2.boom(1.6);
    }
    Cam.kick(1.1);
    this.alive = false; this.remove = true;
    G.onPlaneDestroyed(this, null, true);
  }

  /* ================= SI ================= */
  controlAI(dt, G) {
    const ai = this.ai, S = this.S;
    ai.t += dt;
    const P = G.player;
    const D = diffMul();
    let wantA = this.a;
    let wantThr = 0.85;

    const groundY = G.world.groundAt(this.x);
    const agl = this.y - groundY;

    // priorytet bezwzględny: nie rozbić się o ziemię
    // (im szybciej opadamy, tym wcześniej trzeba zacząć wyrywać)
    const pullAlt = 300 + Math.max(0, -this.vy) * 2.4;
    if (agl < pullAlt && this.vy < 40) {
      const climb = clamp(0.35 + (1 - agl / Math.max(1, pullAlt)) * 0.5, 0.3, 0.9);
      wantA = this.vx >= 0 ? climb : Math.PI - climb;
      this.aiSteer(dt, wantA, 1);
      return;
    }

    switch (this.aiKind) {
      case 'fighter': case 'escort': this.aiFighter(dt, G, P, D); return;
      case 'bomber': this.aiBomber(dt, G, P); return;
      case 'stuka': this.aiStuka(dt, G, P); return;
      case 'recon': this.aiRecon(dt, G, P); return;
      default: this.aiSteer(dt, 0, 0.8); return;
    }
  }

  aiSteer(dt, wantA, wantThr) {
    const S = this.S;
    const d = wrapAngle(wantA - this.a);
    const eff = clamp(this.speed / S.vCtrl, 0.15, 1.15);
    const rate = S.turn * eff * 0.9;
    this.a += clamp(d, -rate * dt, rate * dt);
    this.throttle = approach(this.throttle, wantThr, dt);
  }

  /** Podąża za celem z wyprzedzeniem i strzela. */
  aiFighter(dt, G, P, D) {
    const ai = this.ai;
    let target = null;
    if (this.team === 'ger') {
      target = P && P.alive ? P : (G.planes.find(q => q.team === 'pol' && q.alive) || null);
    } else {
      // nasz skrzydłowy szuka najbliższego Niemca
      let bd = Infinity;
      for (const q of G.planes) {
        if (!q.alive || q.team === this.team) continue;
        const d = dist2(this.x, this.y, q.x, q.y);
        if (d < bd) { bd = d; target = q; }
      }
    }
    if (!target) { this.aiPatrol(dt, G); return; }

    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    const t = clamp(d / 1500, 0, 0.6);
    const lead = { x: target.x + target.vx * t, y: target.y + target.vy * t };
    let wantA = Math.atan2(lead.y - this.y, lead.x - this.x);

    ai.evadeT -= dt;
    // rozejście się przy locie czołowym — inaczej obie maszyny lecą na taran
    const headOn = Math.abs(wrapAngle(Math.atan2(target.vy, target.vx) - this.a)) > 2.1;
    if (headOn && d < 420 && ai.evadeT < 0) { ai.evadeT = rnd(1.6, 0.9); ai.evadeDir = this.y > target.y ? 1 : -1; }
    if (d < 190 && ai.evadeT < -1.2) { ai.evadeT = rnd(2.4, 1.2); ai.evadeDir = chance(0.5) ? 1 : -1; }
    if (ai.evadeT > 0) {
      wantA = this.a + ai.evadeDir * 1.2;
      this.aiSteer(dt, wantA, 1);
      return;
    }

    // uszkodzony — ucieka
    if (this.hp < this.maxHp * 0.28 && chance(dt)) ai.state = 'flee';
    if (ai.state === 'flee') {
      wantA = Math.atan2(0.3, sign(this.x - target.x) || 1);
      this.aiSteer(dt, wantA, 1);
      return;
    }

    this.aiSteer(dt, wantA, d > 700 ? 1 : 0.82);

    // ogień
    const aimErr = Math.abs(wrapAngle(wantA - this.a));
    ai.fireT -= dt;
    if (d < 720 && aimErr < 0.1 && ai.fireT <= 0) {
      this.fireGuns(G);
      if (chance(dt * 1.2)) ai.fireT = rnd(1.4, 0.4) / D.enemy;
    }
  }

  aiPatrol(dt, G) {
    const ai = this.ai;
    const targetY = ai.targetAlt;
    const dirX = this.vx >= 0 ? 1 : -1;
    const climb = clamp((targetY - this.y) / 500, -0.5, 0.5);
    const wantA = dirX > 0 ? climb : Math.PI - climb;
    this.aiSteer(dt, wantA, 0.8);
    if (this.x < 300) this.vx = Math.abs(this.vx);
    if (this.x > G.world.width - 300) this.vx = -Math.abs(this.vx);
  }

  /** Bombowiec: leci do celu, zrzuca bomby na polskie pozycje. */
  aiBomber(dt, G, P) {
    const ai = this.ai;
    const tx = this.aiTargetX;
    const dirX = sign(tx - this.x) || 1;
    const climb = clamp((ai.targetAlt - this.y) / 600, -0.35, 0.4);
    const wantA = dirX > 0 ? climb : Math.PI - climb;
    this.aiSteer(dt, wantA, 0.9);

    // zrzut: uwzględniamy czas spadania bomby i prędkość maszyny
    if (!ai.bombDone && this.bombs > 0) {
      const h = Math.max(0, this.y - G.world.groundAt(tx));
      const tFall = Math.sqrt(h / 190);
      const releaseX = tx - this.vx * tFall;
      ai.dropT = (ai.dropT || 0) - dt;
      if (Math.abs(this.x - releaseX) < 90 && ai.dropT <= 0) {
        this.bombT = 0;
        this.dropOrdnance(G);
        ai.dropT = 0.28;
        ai.bombDrop = (ai.bombDrop || 0) + 1;
        if (ai.bombDrop >= 4 || this.bombs <= 0) ai.bombDone = true;
      }
    }
    if (ai.bombDone && Math.abs(this.x - tx) > 1400) {
      // odlot — znika za mapą
      if (this.x < 200 || this.x > G.world.width - 200) this.remove = true;
    }
    this.aiRearGun(dt, G, P);
  }

  /** Stuka: krąży, nurkuje na cel, zrzuca i wyrywa. */
  aiStuka(dt, G, P) {
    const ai = this.ai;
    const tx = this.aiTargetX;
    if (ai.state === 'cruise') {
      const dirX = sign(tx - this.x) || 1;
      const climb = clamp((ai.targetAlt - this.y) / 500, -0.3, 0.4);
      this.aiSteer(dt, dirX > 0 ? climb : Math.PI - climb, 0.85);
      if (Math.abs(this.x - tx) < 280 && this.y > 700 && this.bombs > 0) {
        ai.state = 'dive'; ai.diveDir = sign(this.vx) || 1;
        if (dist(this.x, this.y, Cam.x, Cam.y) < 1400) Audio2.tone(700, 1.4, 0.1, 'sawtooth', 260);
      }
    } else if (ai.state === 'dive') {
      const wantA = ai.diveDir > 0 ? -0.85 : Math.PI + 0.85;
      this.aiSteer(dt, wantA, 0.35);
      this.brakes = 1;                       // hamulce nurkowe Ju 87
      if (this.y - G.world.groundAt(this.x) < 900) {
        this.bombT = 0; this.dropOrdnance(G);
        ai.state = 'pullout';
      }
    } else if (ai.state === 'pullout') {
      this.brakes = 0;
      const dirX = sign(this.vx) || 1;
      this.aiSteer(dt, dirX > 0 ? 0.62 : Math.PI - 0.62, 1);
      if (this.y > 1000) { ai.state = this.bombs > 0 ? 'cruise' : 'leave'; }
    } else {
      const dirX = this.x < G.world.width / 2 ? -1 : 1;
      this.aiSteer(dt, dirX > 0 ? 0.15 : Math.PI - 0.15, 1);
      if (this.x < 150 || this.x > G.world.width - 150) this.remove = true;
    }
    this.aiRearGun(dt, G, P);
  }

  aiRecon(dt, G, P) {
    this.aiPatrol(dt, G);
    this.aiRearGun(dt, G, P);
  }

  /** Strzelec pokładowy broni ogona. */
  aiRearGun(dt, G, P) {
    if (!this.S.rearGun || !P.alive) return;
    const ai = this.ai;
    ai.rearT -= dt;
    const d = dist(this.x, this.y, P.x, P.y);
    if (d < 520 && ai.rearT <= 0) {
      ai.rearT = rnd(0.42, 0.16) / diffMul().enemy;
      const t = d / 1200;
      const a = Math.atan2(P.y + P.vy * t - this.y, P.x + P.vx * t - this.x) + rnd(0.06, -0.06);
      G.spawnBullet({
        x: this.x + Math.cos(a) * 20, y: this.y + Math.sin(a) * 20,
        vx: Math.cos(a) * 1150 + this.vx * 0.4, vy: Math.sin(a) * 1150 + this.vy * 0.4,
        dmg: 3.4 * diffMul().dmg, team: 'ger', kind: 'mg', life: 1.1,
      });
      Particles.flash(this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 20, 5, 0.05);
    }
  }

  /* ================= rysowanie ================= */
  draw(ctx, W, H, G) {
    const z = Cam.zoom;
    const sx = Cam.sx(this.x, W), sy = Cam.sy(this.y, H);
    if (sx < -220 || sx > W + 220 || sy < -220 || sy > H + 220) return;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-this.a);
    if (this.flip) ctx.scale(1, -1);
    ctx.scale(z, z);
    // cień pod maszyną nisko nad ziemią
    ctx.globalAlpha = 1;
    Art.plane(ctx, this.key, { gear: this.gearT, prop: this.prop, damage: 1 - this.hp / this.maxHp });
    ctx.restore();

    // cień na ziemi
    const agl = this.y - (this.groundY ?? G.world.groundAt(this.x));
    if (agl < 420 && agl > 0) {
      const gsy = Cam.sy(this.groundY ?? G.world.groundAt(this.x), H);
      ctx.save();
      ctx.globalAlpha = clamp(0.34 * (1 - agl / 420), 0, 0.34);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx, gsy, 34 * z * Math.abs(Math.cos(this.a)) + 8 * z, 5 * z, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
}
