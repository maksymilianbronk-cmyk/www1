/* =========================================================================
   Uzbrojenie: pociski, bomby, torpedy, pociski artylerii przeciwlotniczej
   ========================================================================= */
'use strict';

class Bullet {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, vx: 0, vy: 0, life: 1.6, dmg: 4, team: 'pol', kind: 'mg',
      tracer: true, dead: false, px: o.x, py: o.y, grav: 0,
    }, o);
    if (this.kind === 'rifle') this.grav = 45;
    if (this.kind === 'flak') this.grav = 80;
    if (this.kind === 'mg') this.grav = 30;
    this.px = this.x; this.py = this.y;
  }
  update(dt, G) {
    this.px = this.x; this.py = this.y;
    this.vy -= this.grav * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    // ziemia / woda
    const surf = G.world.surfaceAt(this.x);
    if (this.y <= surf) {
      if (G.world.isWater(this.x)) {
        Particles.water(this.x, 0, 3, { spd: 130 });
      } else {
        Particles.dirt(this.x, surf, 3, { spd: 130 });
        Particles.spark(this.x, surf, 2, { spd: 90, col: '#ffd08a' });
        if (chance(0.16)) G.world.addDecal({ type: 'scorch', x: this.x, y: surf, r: rnd(7, 3) });
      }
      this.dead = true; return;
    }

    // cele
    if (this.team === 'pol') {
      for (const u of G.units) {
        if (u.dead || u.remove) continue;
        if (u.type === 'carrier') continue;
        if (u.contains(this.x, this.y, 2)) {
          const killed = u.hit(this.dmg, this.x, this.y, G, 'guns');
          G.stats.hits++;
          Audio2.hitMetal();
          this.dead = true; return;
        }
      }
      for (const p of G.planes) {
        if (p === G.player || !p.alive || p.team === 'pol') continue;
        if (dist2(this.x, this.y, p.x, p.y) < p.hitR * p.hitR) {
          p.hit(this.dmg, this.x, this.y, G, G.player);
          G.stats.hits++;
          Particles.spark(this.x, this.y, 4, { spd: 200, col: '#ffd7a0' });
          Audio2.hitMetal();
          this.dead = true; return;
        }
      }
    } else {
      const p = G.player;
      if (p.alive && dist2(this.x, this.y, p.x, p.y) < p.hitR * p.hitR) {
        p.hit(this.dmg, this.x, this.y, G, null);
        Particles.spark(this.x, this.y, 5, { spd: 220, col: '#ffcf80' });
        this.dead = true; return;
      }
      // pociski wroga trafiają też w polskie samoloty sojusznicze
      for (const q of G.planes) {
        if (q.team !== 'pol' || !q.alive || q === G.player) continue;
        if (dist2(this.x, this.y, q.x, q.y) < q.hitR * q.hitR) {
          q.hit(this.dmg, this.x, this.y, G, null);
          this.dead = true; return;
        }
      }
    }
  }
  draw(ctx, W, H) {
    const z = Cam.zoom;
    const sx = Cam.sx(this.x, W), sy = Cam.sy(this.y, H);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) return;
    const psx = Cam.sx(this.px, W), psy = Cam.sy(this.py, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = this.team === 'pol' ? 'rgba(255,238,170,.95)' : 'rgba(255,150,90,.95)';
    ctx.lineWidth = Math.max(1, (this.kind === 'flak' ? 2.4 : 1.6) * z);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(psx, psy); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = this.team === 'pol' ? 'rgba(255,255,220,.5)' : 'rgba(255,90,40,.5)';
    ctx.lineWidth = Math.max(1, 3.6 * z);
    ctx.beginPath(); ctx.moveTo(psx, psy); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/*  Pocisk 88 mm — zapalnik czasowy, wybucha przy samolocie            */
/* ------------------------------------------------------------------ */
class FlakShell {
  constructor(x, y, a, fuseDist, owner) {
    this.x = x; this.y = y;
    const v = 1500;
    this.vx = Math.cos(a) * v; this.vy = Math.sin(a) * v;
    this.dist = 0; this.fuse = fuseDist * rnd(1.12, 0.86);
    this.dead = false; this.owner = owner;
    this.px = x; this.py = y;
  }
  update(dt, G) {
    this.px = this.x; this.py = this.y;
    this.vy -= 70 * dt;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.dist += Math.hypot(this.vx, this.vy) * dt;
    if (this.y <= G.world.surfaceAt(this.x)) { this.dead = true; Particles.dirt(this.x, this.y, 6, { spd: 160 }); return; }
    if (this.dist >= this.fuse) this.burst(G);
  }
  burst(G) {
    this.dead = true;
    const x = this.x, y = this.y;
    // czarny obłok + odłamki
    Particles.add({ x, y, life: 2.6, size: 12, grow: 22, type: 'smoke', col: '#1c1a17', alpha: 0.85, drag: 0.9, grav: -4, prio: 1.4 });
    Particles.add({ x, y, life: 3.4, size: 20, grow: 12, type: 'smoke', col: '#2b2823', alpha: 0.6, drag: 0.9, grav: -6, prio: 1.2 });
    Particles.flash(x, y, 26, 0.1);
    Particles.spark(x, y, 16, { spd: 420, col: '#ffdf9a' });
    Audio2.flak();
    const P = G.player;
    if (P.alive) {
      const d = dist(x, y, P.x, P.y);
      if (d < 150) {
        const dmg = (1 - d / 150) * 26 * diffMul().dmg;
        P.hit(dmg, x, y, G, null);
        Cam.kick(0.4);
      }
    }
  }
  draw(ctx, W, H) {
    const sx = Cam.sx(this.x, W), sy = Cam.sy(this.y, H);
    const psx = Cam.sx(this.px, W), psy = Cam.sy(this.py, H);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,190,120,.8)';
    ctx.lineWidth = Math.max(1, 2.6 * Cam.zoom);
    ctx.beginPath(); ctx.moveTo(psx, psy); ctx.lineTo(sx, sy); ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ */
/*  Bomby i torpedy                                                    */
/* ------------------------------------------------------------------ */
class Ordnance {
  constructor(o) {
    Object.assign(this, {
      x: 0, y: 0, vx: 0, vy: 0, kind: 'bomb', team: 'pol', dead: false,
      angle: 0, armT: 0.22, t: 0, power: 1.6, radius: 130, dmg: 220,
      inWater: false, runT: 0, owner: null, drag: 0.06,
    }, o);
    this.angle = Math.atan2(this.vy, this.vx);
    if (this.kind === 'torpedo') { this.power = 2.6; this.radius = 150; this.dmg = 620; }
    if (this.kind === 'heavy') { this.power = 3.2; this.radius = 200; this.dmg = 460; }
  }

  update(dt, G) {
    this.t += dt;
    const W = G.world;

    if (this.kind === 'torpedo' && this.inWater) {
      // bieg torpedy tuż pod powierzchnią
      this.runT += dt;
      this.x += this.vx * dt;
      this.y = -10 + Math.sin(this.t * 8) * 1.5;
      if (chance(dt * 22)) Particles.wake(this.x - sign(this.vx) * 14, 1);
      if (chance(dt * 10)) Particles.add({ x: this.x - sign(this.vx) * 10, y: 1, vx: 0, vy: rnd(10, 2), life: rnd(1.6, .7), size: rnd(4, 2), grow: 6, type: 'wake', col: '#dff0fa', alpha: .6, drag: 1, prio: .3 });
      if (this.runT > 9 || this.x < 60 || this.x > W.width - 60) { this.dead = true; return; }
      // trafienie w okręt
      for (const u of G.units) {
        if (u.dead || !u.ship || u.type === 'carrier') continue;
        const b = u.bounds();
        if (this.x > b.x0 && this.x < b.x1) { this.explode(G, u); return; }
      }
      // mielizna
      if (W.groundAt(this.x) > -14) { this.explode(G, null); return; }
      return;
    }

    // lot swobodny
    this.vy -= 380 * dt;
    const v = Math.hypot(this.vx, this.vy);
    const k = this.drag * dt * v / 200;
    this.vx -= this.vx * k; this.vy -= this.vy * k;
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.angle = lerp(this.angle, Math.atan2(this.vy, this.vx), 1 - Math.pow(0.001, dt));

    if (this.t > 0.25 && chance(dt * 8) && this.kind !== 'torpedo') {
      Particles.smoke(this.x, this.y, { dens: 0.25, sizeMul: 0.25, lifeMul: 0.4, alpha: 0.25 });
    }

    const surf = W.surfaceAt(this.x);
    if (this.y <= surf) {
      if (W.isWater(this.x)) {
        if (this.kind === 'torpedo') {
          // wodowanie torpedy
          this.inWater = true; this.y = -10;
          this.vx = sign(this.vx) * 460; this.vy = 0;
          Particles.water(this.x, 0, 20, { spd: 340 });
          Audio2.splash();
          return;
        }
        Particles.water(this.x, 0, 28, { spd: 420 });
        Particles.add({ x: this.x, y: 10, life: 1.4, size: 10, grow: 46, type: 'smoke', col: '#dceaf2', alpha: 0.5, grav: -10, drag: 1, prio: 1 });
        Audio2.splash();
        this.explode(G, null, true);
        return;
      }
      this.explode(G, null);
      return;
    }

    // trafienie bezpośrednie w jednostkę
    if (this.t > this.armT) {
      for (const u of G.units) {
        if (u.dead || u.remove || u.type === 'carrier') continue;
        if (u.contains(this.x, this.y, 4)) { this.explode(G, u); return; }
      }
    }
  }

  explode(G, directTarget, inWater) {
    if (this.dead) return;
    this.dead = true;
    const W = G.world;
    const x = this.x, y = Math.max(this.y, W.surfaceAt(this.x));
    const P = this.power;

    Particles.explosion(x, y + 6, P, { smokeCol: inWater ? '#8fa9b6' : undefined });
    if (!inWater) {
      Particles.dirt(x, y, 34 * P, { spd: 520 * P });
      W.crater(x, 34 * P, 15 * P);
      W.scorch(x, y, 40 * P);
      W.blastScenery(x, 70 * P);
    } else {
      Particles.water(x, 0, 40, { spd: 620 });
    }
    Cam.kick(clamp(P * 0.55, 0.2, 1.6) * (dist(x, y, Cam.x, Cam.y) < 900 ? 1 : 0.3));
    Audio2.boom(P * 0.8);

    // obrażenia obszarowe
    G.areaDamage(x, y, this.radius * (this.kind === 'heavy' ? 1.2 : 1), this.dmg, 'bomb', directTarget);
    if (directTarget && !directTarget.dead) directTarget.hit(this.dmg * 0.8, x, y, G, 'bomb');
  }

  draw(ctx, W, H) {
    const z = Cam.zoom;
    const sx = Cam.sx(this.x, W), sy = Cam.sy(this.y, H);
    if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) return;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-this.angle);
    ctx.scale(z, z);
    if (this.kind === 'torpedo') {
      ctx.fillStyle = '#3f4a4e';
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 3.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2b3336';
      ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(-17, -4); ctx.lineTo(-17, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d0d4d6';
      ctx.beginPath(); ctx.arc(11, 0, 2.6, 0, TAU); ctx.fill();
    } else {
      const s = this.kind === 'heavy' ? 1.5 : 1;
      ctx.fillStyle = '#4b5147';
      ctx.beginPath();
      ctx.moveTo(9 * s, 0); ctx.quadraticCurveTo(6 * s, -3.4 * s, -6 * s, -3 * s);
      ctx.lineTo(-9 * s, -2 * s); ctx.lineTo(-9 * s, 2 * s); ctx.lineTo(-6 * s, 3 * s);
      ctx.quadraticCurveTo(6 * s, 3.4 * s, 9 * s, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2f342d';
      ctx.beginPath(); ctx.moveTo(-8 * s, 0); ctx.lineTo(-12 * s, -4 * s); ctx.lineTo(-10 * s, 0); ctx.lineTo(-12 * s, 4 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8d3a2c';
      ctx.fillRect(2 * s, -3.2 * s, 2 * s, 6.4 * s);
    }
    ctx.restore();
  }
}
