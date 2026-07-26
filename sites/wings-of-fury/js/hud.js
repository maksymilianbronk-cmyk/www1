/* =========================================================================
   HUD — przyrządy pokładowe rysowane na canvasie
   ========================================================================= */
'use strict';

const HUD = {
  F: (s, w = '') => `${w} ${s}px "Share Tech Mono", ui-monospace, monospace`,

  draw(ctx, W, H, G) {
    const P = G.player;
    const s = clamp(Math.min(W / 1280, H / 720), 0.62, 1.35);
    ctx.save();
    ctx.textBaseline = 'middle';

    this.damageOverlay(ctx, W, H, G, P);
    this.objectives(ctx, W, H, G, s);
    this.instruments(ctx, W, H, G, P, s);
    this.weapons(ctx, W, H, G, P, s);
    this.radar(ctx, W, H, G, s);
    this.markers(ctx, W, H, G, P);
    this.messages(ctx, W, H, G, s);
    this.killFeed(ctx, W, H, G, s);
    this.landingCue(ctx, W, H, G, P, s);

    ctx.restore();
  },

  panel(ctx, x, y, w, h, alpha = 0.42) {
    ctx.fillStyle = `rgba(8,11,9,${alpha})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(216,178,74,.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  },

  /* --- czerwony błysk po trafieniu + winieta uszkodzeń --- */
  damageOverlay(ctx, W, H, G, P) {
    if (G.hudFlash > 0) {
      ctx.fillStyle = `rgba(190,30,20,${clamp(G.hudFlash * 0.34, 0, 0.36)})`;
      ctx.fillRect(0, 0, W, H);
    }
    const f = P.alive ? P.hp / P.maxHp : 0;
    if (f < 0.55) {
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(120,10,5,${(0.55 - f) * 0.8})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  },

  /* --- lista zadań --- */
  objectives(ctx, W, H, G, s) {
    const x = 14 * s, y = 12 * s;
    const lh = 17 * s;
    const objs = G.mission.objectives;
    const w = 300 * s;
    const h = lh * (objs.length + 1) + 14 * s;
    this.panel(ctx, x, y, w, h);
    ctx.font = this.F(11 * s);
    ctx.fillStyle = '#d8b24a';
    ctx.fillText(`MISJA ${G.mission.id}: ${G.mission.title.toUpperCase()}`, x + 9 * s, y + 12 * s);
    ctx.font = this.F(11.5 * s);
    objs.forEach((o, i) => {
      const st = G.objState[o.id];
      const done = st.done;
      const failed = st.failed;
      ctx.fillStyle = failed ? '#e05a49' : done ? '#7fc16a' : '#cfcabb';
      const mark = failed ? '✕' : done ? '✔' : '□';
      let txt = `${mark} ${o.text}`;
      if (o.count && !done) txt += `  ${st.progress}/${o.count}`;
      if (o.maxLost !== undefined) txt += `  (${st.lost}/${o.maxLost})`;
      ctx.fillText(this.fit(ctx, txt, w - 18 * s), x + 9 * s, y + 12 * s + lh * (i + 1));
    });
    // czas i punkty
    ctx.font = this.F(11 * s);
    ctx.fillStyle = '#9aa0a6';
    const t = Math.floor(G.missionT);
    ctx.fillText(`CZAS ${String((t / 60) | 0).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, x + 9 * s, y + h + 12 * s);
    ctx.fillStyle = '#d8b24a';
    ctx.fillText(`PUNKTY ${G.score}`, x + 110 * s, y + h + 12 * s);
    ctx.fillStyle = '#cfcabb';
    ctx.fillText('MASZYNY', x + 196 * s, y + h + 12 * s);
    for (let i = 0; i < Math.max(0, G.lives); i++) {
      const px = x + 252 * s + i * 12 * s, py = y + h + 12 * s;
      ctx.fillStyle = '#7fc16a';
      ctx.beginPath();
      ctx.moveTo(px + 5 * s, py); ctx.lineTo(px - 4 * s, py - 3.4 * s);
      ctx.lineTo(px - 2 * s, py); ctx.lineTo(px - 4 * s, py + 3.4 * s);
      ctx.closePath(); ctx.fill();
    }
  },

  fit(ctx, txt, maxW) {
    if (ctx.measureText(txt).width <= maxW) return txt;
    let t = txt;
    while (t.length > 4 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  },

  /* --- przyrządy: prędkość, wysokość, gaz, paliwo, uszkodzenia --- */
  instruments(ctx, W, H, G, P, s) {
    const bw = 200 * s, bh = 96 * s;
    const x = 14 * s, y = H - bh - 14 * s;
    this.panel(ctx, x, y, bw, bh, 0.5);

    // prędkościomierz (łuk)
    const cx = x + 44 * s, cy = y + 46 * s, r = 32 * s;
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
    const vmax = P.S.vMax * 1.25;
    const vf = clamp(P.kmh / vmax, 0, 1);
    ctx.strokeStyle = P.stallT > 0.2 ? '#e05a49' : vf > 0.92 ? '#e0b02a' : '#7fc16a';
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * vf); ctx.stroke();
    ctx.font = this.F(15 * s, 'bold');
    ctx.fillStyle = '#f0ece1'; ctx.textAlign = 'center';
    ctx.fillText(Math.round(P.kmh), cx, cy - 2 * s);
    ctx.font = this.F(8.5 * s);
    ctx.fillStyle = '#8d938f';
    ctx.fillText('km/h', cx, cy + 11 * s);
    ctx.textAlign = 'left';

    // wysokościomierz
    const ax = x + 92 * s;
    ctx.font = this.F(9 * s);
    ctx.fillStyle = '#8d938f';
    ctx.fillText('WYSOKOŚĆ', ax, y + 16 * s);
    ctx.font = this.F(16 * s, 'bold');
    ctx.fillStyle = '#f0ece1';
    ctx.fillText(`${Math.round(P.altM)} m`, ax, y + 32 * s);
    ctx.font = this.F(9 * s);
    ctx.fillStyle = P.aglM < 60 ? '#e05a49' : '#8d938f';
    ctx.fillText(`nad ziemią ${Math.round(P.y - (P.groundY || 0))} m`, ax, y + 46 * s);

    // paski: gaz / paliwo / kadłub
    const bx = ax, by = y + 56 * s, bwid = 92 * s;
    this.bar(ctx, bx, by, bwid, 6 * s, P.throttle, '#e0b02a', 'GAZ', s);
    this.bar(ctx, bx, by + 13 * s, bwid, 6 * s, P.fuel / P.maxFuel, '#6aa9c1', 'PALIWO', s);
    this.bar(ctx, bx, by + 26 * s, bwid, 6 * s, clamp(P.hp / P.maxHp, 0, 1), P.hp / P.maxHp > 0.5 ? '#7fc16a' : P.hp / P.maxHp > 0.25 ? '#e0b02a' : '#e05a49', 'KADŁUB', s);

    // wariometr
    const vsx = x + 12 * s, vsy = y + 84 * s;
    ctx.fillStyle = '#8d938f'; ctx.font = this.F(8.5 * s);
    ctx.fillText(`${P.vy >= 0 ? '▲' : '▼'} ${Math.abs(Math.round(P.vy))} m/s`, vsx, vsy);
  },

  bar(ctx, x, y, w, h, f, col, label, s) {
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w * clamp(f, 0, 1), h);
    ctx.font = this.F(8 * s);
    ctx.fillStyle = '#7f857f';
    ctx.fillText(label, x + w + 5 * s, y + h / 2);
  },

  /* --- uzbrojenie --- */
  weapons(ctx, W, H, G, P, s) {
    const bw = 176 * s, bh = 78 * s;
    const x = W - bw - 14 * s, y = H - bh - 14 * s;
    this.panel(ctx, x, y, bw, bh, 0.5);
    ctx.font = this.F(10 * s);
    ctx.fillStyle = '#8d938f';
    ctx.fillText('AMUNICJA', x + 10 * s, y + 14 * s);
    ctx.font = this.F(15 * s, 'bold');
    ctx.fillStyle = P.ammo > P.maxAmmo * 0.2 ? '#f0ece1' : '#e05a49';
    ctx.fillText(String(P.ammo).padStart(4, '0'), x + 92 * s, y + 14 * s);

    // przegrzanie
    this.bar(ctx, x + 10 * s, y + 24 * s, 100 * s, 5 * s, P.heat, P.overheat ? '#e05a49' : '#e0b02a', '', s);
    ctx.font = this.F(8 * s);
    ctx.fillStyle = P.overheat ? '#e05a49' : '#7f857f';
    ctx.fillText(P.overheat ? 'PRZEGRZANIE' : 'LUFY', x + 116 * s, y + 26 * s);

    // bomby
    const by = y + 42 * s;
    ctx.font = this.F(10 * s);
    ctx.fillStyle = '#8d938f';
    ctx.fillText('BOMBY', x + 10 * s, by + 4 * s);
    for (let i = 0; i < P.maxBombs; i++) {
      const bx = x + 52 * s + (i % 8) * 12 * s;
      const byy = by + Math.floor(i / 8) * 10 * s;
      ctx.fillStyle = i < P.bombs ? '#d8b24a' : 'rgba(255,255,255,.14)';
      ctx.beginPath();
      ctx.ellipse(bx, byy + 4 * s, 3.4 * s, 5 * s, 0, 0, TAU);
      ctx.fill();
    }
    if (P.maxTorps > 0) {
      const ty = by + 18 * s;
      ctx.fillStyle = '#8d938f'; ctx.font = this.F(10 * s);
      ctx.fillText('TORPEDY', x + 10 * s, ty + 4 * s);
      for (let i = 0; i < P.maxTorps; i++) {
        ctx.fillStyle = i < P.torps ? '#6aa9c1' : 'rgba(255,255,255,.14)';
        ctx.fillRect(x + 62 * s + i * 18 * s, ty + 1 * s, 14 * s, 5 * s);
      }
    }
    if (P.maxBombs === 0 && P.maxTorps === 0) {
      ctx.fillStyle = '#5f645f'; ctx.font = this.F(10 * s);
      ctx.fillText('brak uzbrojenia podwieszanego', x + 10 * s, by + 20 * s);
    }
  },

  /* --- pasek radaru --- */
  radar(ctx, W, H, G, s) {
    const w = Math.min(520 * s, W * 0.46), h = 26 * s;
    const x = (W - w) / 2, y = H - h - 12 * s;
    this.panel(ctx, x, y, w, h, 0.45);
    const sc = w / G.world.width;
    // teren
    ctx.strokeStyle = 'rgba(140,150,130,.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const wx = (i / 60) * G.world.width;
      const gy = G.world.groundAt(wx);
      const py = y + h - 4 * s - clamp(gy / 900, -0.4, 1) * 10 * s;
      if (i === 0) ctx.moveTo(x + wx * sc, py); else ctx.lineTo(x + wx * sc, py);
    }
    ctx.stroke();
    // baza
    for (const rw of G.world.runways) {
      ctx.fillStyle = rw.deck ? '#6aa9c1' : '#7fc16a';
      ctx.fillRect(x + rw.x0 * sc, y + 4 * s, Math.max(2, (rw.x1 - rw.x0) * sc), 3 * s);
    }
    // cele misji
    for (const u of G.units) {
      if (u.dead || u.remove) continue;
      const isObj = G.objectiveTags.has(u.tag);
      if (!isObj && u.team !== 'ger') continue;
      ctx.fillStyle = isObj ? '#e0b02a' : 'rgba(200,90,70,.55)';
      const px = x + u.x * sc;
      ctx.fillRect(px, y + h * 0.5, isObj ? 2.4 * s : 1.4 * s, isObj ? 7 * s : 4 * s);
    }
    // samoloty wroga
    for (const p of G.planes) {
      if (!p.alive || p.team === 'pol') continue;
      ctx.fillStyle = '#e05a49';
      ctx.beginPath(); ctx.arc(x + p.x * sc, y + 8 * s, 2.6 * s, 0, TAU); ctx.fill();
    }
    // gracz
    const px = x + G.player.x * sc;
    ctx.fillStyle = '#f4f1e8';
    ctx.beginPath();
    ctx.moveTo(px, y + 6 * s); ctx.lineTo(px - 4 * s, y + 14 * s); ctx.lineTo(px + 4 * s, y + 14 * s);
    ctx.closePath(); ctx.fill();
  },

  /* --- strzałki do celów poza ekranem --- */
  markers(ctx, W, H, G, P) {
    if (!Settings.markers || !P.alive) return;
    const list = [];
    for (const u of G.units) {
      if (u.dead || u.remove) continue;
      if (!G.objectiveTags.has(u.tag)) continue;
      list.push({ x: u.x, y: u.cy, col: '#e0b02a' });
    }
    for (const p of G.planes) {
      if (!p.alive || p.team === 'pol') continue;
      list.push({ x: p.x, y: p.y, col: '#e05a49' });
    }
    if (G.needLanding) {
      const rw = G.homeRunway;
      if (rw) list.push({ x: (rw.x0 + rw.x1) / 2, y: rw.y, col: '#7fc16a', home: true });
    }
    // pokazujemy tylko kilka najbliższych wskaźników, żeby nie zaśmiecać krawędzi
    list.sort((a, b) => dist2(a.x, a.y, P.x, P.y) - dist2(b.x, b.y, P.x, P.y));
    const shown = list.slice(0, 7);
    const m = 26;
    for (const t of shown) {
      const sx = Cam.sx(t.x, W), sy = Cam.sy(t.y, H);
      if (sx > m && sx < W - m && sy > m && sy < H - m) continue;
      const cx = W / 2, cy = H / 2;
      const a = Math.atan2(sy - cy, sx - cx);
      const rx = (W / 2 - m * 2) / Math.abs(Math.cos(a) || 1e-3);
      const ry = (H / 2 - m * 2) / Math.abs(Math.sin(a) || 1e-3);
      const r = Math.min(rx, ry);
      const mx = cx + Math.cos(a) * r, my = cy + Math.sin(a) * r;
      ctx.save();
      ctx.translate(mx, my); ctx.rotate(a);
      const far = clamp(1 - dist(t.x, t.y, P.x, P.y) / 4000, 0.28, 0.8);
      ctx.globalAlpha = far;
      ctx.fillStyle = t.col;
      ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -4.6); ctx.lineTo(-5, 4.6); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  /* --- komunikaty --- */
  messages(ctx, W, H, G, s) {
    if (G.warnT > 0 && G.warnText) {
      const a = 0.5 + 0.5 * Math.sin(G.warnT * 14);
      ctx.font = this.F(22 * s, 'bold');
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(224,90,73,${0.55 + 0.45 * a})`;
      ctx.fillText(G.warnText, W / 2, H * 0.2);
      ctx.textAlign = 'left';
    }
    if (G.toastT > 0 && G.toastText) {
      ctx.font = this.F(14 * s);
      ctx.textAlign = 'center';
      const w = ctx.measureText(G.toastText).width + 26 * s;
      this.panel(ctx, W / 2 - w / 2, H * 0.26, w, 26 * s, 0.55);
      ctx.fillStyle = '#e8e3d4';
      ctx.fillText(G.toastText, W / 2, H * 0.26 + 13 * s);
      ctx.textAlign = 'left';
    }
  },

  killFeed(ctx, W, H, G, s) {
    ctx.font = this.F(11.5 * s);
    ctx.textAlign = 'right';
    G.feed.forEach((f, i) => {
      const a = clamp(f.t / 1.2, 0, 1);
      ctx.fillStyle = `rgba(216,178,74,${a})`;
      ctx.fillText(f.text, W - 16 * s, 24 * s + i * 17 * s);
    });
    ctx.textAlign = 'left';
  },

  /* --- pomoc przy lądowaniu --- */
  landingCue(ctx, W, H, G, P, s) {
    if (!P.alive || P.onGround) return;
    const rw = G.nearRunway(P.x, 900);
    if (!rw) return;
    const agl = P.y - rw.y;
    if (agl > 700 || agl < -20) return;
    const w = 210 * s, h = 62 * s;
    const x = W / 2 - w / 2, y = 18 * s;
    this.panel(ctx, x, y, w, h, 0.5);
    ctx.font = this.F(11 * s);
    ctx.fillStyle = '#d8b24a';
    ctx.fillText(`PODEJŚCIE — ${rw.name.toUpperCase()}`, x + 10 * s, y + 13 * s);
    const rows = [
      ['Podwozie', P.gearT > 0.85, P.gearT > 0.85 ? 'wypuszczone' : 'SCHOWANE (L)'],
      ['Prędkość', P.speed < P.S.vLand, `${Math.round(P.kmh)} km/h ${P.speed < P.S.vLand ? 'ok' : '— za szybko'}`],
      ['Pochylenie', Math.abs(P.pitch) < 0.3, Math.abs(P.pitch) < 0.3 ? 'poziomo' : 'WYRÓWNAJ'],
      ['Opadanie', P.vy > -130, `${Math.round(P.vy)} m/s`],
    ];
    ctx.font = this.F(10.5 * s);
    rows.forEach((r, i) => {
      const yy = y + 27 * s + i * 11 * s;
      ctx.fillStyle = r[1] ? '#7fc16a' : '#e05a49';
      ctx.fillText(`${r[1] ? '✔' : '✕'} ${r[0]}: ${r[2]}`, x + 10 * s, yy);
    });
  },
};
