/* =========================================================================
   Grafika wektorowa — samoloty, pojazdy, okręty, piechota, budynki
   Wszystko rysowane ścieżkami canvas: nos maszyny wskazuje +X, -Y to góra.
   ========================================================================= */
'use strict';

const Art = {

  /* ---------------- elementy wspólne ---------------- */
  propDisc(ctx, x, r, spin, col = 'rgba(220,225,230,.28)') {
    ctx.save();
    ctx.translate(x, 0);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, 3.2, r, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 2; i++) {
      const a = spin + i * Math.PI;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * 1.5, Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  /** Polska szachownica lotnicza. */
  checker(ctx, x, y, s) {
    const h = s / 2;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#d21f26'; ctx.fillRect(-h, -h, h, h); ctx.fillRect(0, 0, h, h);
    ctx.fillStyle = '#f4f1e8'; ctx.fillRect(0, -h, h, h); ctx.fillRect(-h, 0, h, h);
    ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.5; ctx.strokeRect(-h, -h, s, s);
    ctx.restore();
  },

  /** Krzyż Luftwaffe. */
  balken(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#1b1b1b';
    ctx.fillRect(-s / 2, -s / 6, s, s / 3);
    ctx.fillRect(-s / 6, -s / 2, s / 3, s);
    ctx.fillStyle = '#e9e6dd';
    ctx.fillRect(-s / 2, -s / 12, s, s / 6);
    ctx.fillRect(-s / 12, -s / 2, s / 6, s);
    ctx.restore();
  },

  wheel(ctx, x, y, r, strutLen, ang = 0) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = '#2c2c2c'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(ang) * strutLen, strutLen); ctx.stroke();
    ctx.fillStyle = '#191919';
    ctx.beginPath(); ctx.arc(Math.sin(ang) * strutLen, strutLen, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath(); ctx.arc(Math.sin(ang) * strutLen, strutLen, r * 0.42, 0, TAU); ctx.fill();
    ctx.restore();
  },

  canopy(ctx, x, y, w, h, col = 'rgba(150,205,225,.75)') {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x - w / 4, y - h, x + w / 4, y - h * 0.92);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,45,55,.7)'; ctx.lineWidth = 0.8; ctx.stroke();
  },

  /* =======================================================================
     SAMOLOTY
     ======================================================================= */
  plane(ctx, key, o = {}) {
    const f = this['p_' + key] || this.p_p11c;
    f.call(this, ctx, o);
  },

  /* --- PWS-26: dwupłatowiec szkolny --- */
  p_pws26(ctx, o) {
    const gear = o.gear ?? 1;
    // dolny płat
    ctx.fillStyle = '#7d8a5c';
    ctx.beginPath(); ctx.ellipse(-1, 4, 21, 3, 0, 0, TAU); ctx.fill();
    // rozpórki
    ctx.strokeStyle = '#5d6448'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-12, 2); ctx.lineTo(-14, -11); ctx.moveTo(8, 2); ctx.lineTo(10, -11);
    ctx.moveTo(-12, 2); ctx.lineTo(10, -11); ctx.stroke();
    // kadłub
    ctx.fillStyle = '#8b976a';
    ctx.beginPath();
    ctx.moveTo(30, 0); ctx.quadraticCurveTo(24, -6, 8, -6.5);
    ctx.lineTo(-22, -4.5); ctx.lineTo(-31, -2); ctx.lineTo(-31, 2.5);
    ctx.lineTo(-20, 4.5); ctx.quadraticCurveTo(6, 6.5, 26, 4); ctx.closePath(); ctx.fill();
    // statecznik pionowy
    ctx.fillStyle = '#7d8a5c';
    ctx.beginPath(); ctx.moveTo(-24, -4); ctx.lineTo(-33, -16); ctx.lineTo(-31, -3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d21f26';
    ctx.beginPath(); ctx.moveTo(-29, -8); ctx.lineTo(-33, -16); ctx.lineTo(-31.5, -6); ctx.closePath(); ctx.fill();
    // statecznik poziomy
    ctx.fillStyle = '#7d8a5c';
    ctx.beginPath(); ctx.ellipse(-27, 0, 9, 2, 0, 0, TAU); ctx.fill();
    // górny płat
    ctx.fillStyle = '#96a374';
    ctx.beginPath(); ctx.ellipse(-2, -12, 25, 3.2, 0, 0, TAU); ctx.fill();
    // kabiny
    this.canopy(ctx, 0, -6, 9, 4, 'rgba(40,50,45,.85)');
    this.canopy(ctx, -10, -5, 8, 4, 'rgba(40,50,45,.85)');
    // silnik + śmigło
    ctx.fillStyle = '#43483a';
    ctx.beginPath(); ctx.ellipse(26, 0, 5, 6, 0, 0, TAU); ctx.fill();
    this.propDisc(ctx, 31, 15, o.prop || 0);
    // podwozie stałe
    if (gear > 0.02) { this.wheel(ctx, 4, 4, 4, 9 * gear); this.wheel(ctx, -3, 4, 4, 9 * gear); this.wheel(ctx, -29, 2, 2, 4 * gear); }
    this.checker(ctx, -6, -13, 7);
    this.checker(ctx, -20, -4, 5);
  },

  /* --- PZL P.7a: myśliwiec o skrzydle mewim --- */
  p_p7a(ctx, o) {
    const gear = o.gear ?? 1;
    ctx.fillStyle = '#8d9a6f';
    // skrzydło mewie
    ctx.beginPath();
    ctx.moveTo(-4, -8); ctx.lineTo(-24, -11); ctx.lineTo(-26, -8); ctx.lineTo(-6, -4);
    ctx.lineTo(-4, -4); ctx.lineTo(16, -8); ctx.lineTo(20, -11); ctx.lineTo(2, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a8760';
    ctx.beginPath(); ctx.moveTo(-2, -7.5); ctx.lineTo(-3, -12); ctx.lineTo(3, -12); ctx.lineTo(4, -7.5); ctx.closePath(); ctx.fill();
    // kadłub
    ctx.fillStyle = '#96a374';
    ctx.beginPath();
    ctx.moveTo(30, -0.5); ctx.quadraticCurveTo(26, -6, 12, -7);
    ctx.lineTo(-20, -4.5); ctx.lineTo(-32, -2); ctx.lineTo(-32, 2); ctx.lineTo(-18, 4.5);
    ctx.quadraticCurveTo(8, 6.5, 27, 4); ctx.closePath(); ctx.fill();
    // ogon
    ctx.fillStyle = '#7a8760';
    ctx.beginPath(); ctx.moveTo(-24, -4); ctx.lineTo(-34, -15); ctx.lineTo(-31, -3.5); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-28, 0.5, 9.5, 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d21f26';
    ctx.beginPath(); ctx.moveTo(-30, -9); ctx.lineTo(-34, -15); ctx.lineTo(-32, -5); ctx.closePath(); ctx.fill();
    // odkryta kabina + zagłówek
    ctx.fillStyle = '#2c3327';
    ctx.beginPath(); ctx.ellipse(0, -6.5, 4, 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7a8760';
    ctx.beginPath(); ctx.moveTo(-4, -6.6); ctx.lineTo(-9, -6.2); ctx.lineTo(-9, -3.6); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
    // silnik gwiazdowy
    ctx.fillStyle = '#3d4236';
    ctx.beginPath(); ctx.ellipse(27, 0, 4.4, 6.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5b6150'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(24, i * 2.2); ctx.lineTo(29, i * 2.2); ctx.stroke(); }
    this.propDisc(ctx, 31, 16, o.prop || 0);
    // podwozie stałe z owiewkami
    if (gear > 0.02) {
      ctx.fillStyle = '#6c7458';
      ctx.beginPath(); ctx.moveTo(2, 3); ctx.lineTo(6, 11 * gear); ctx.lineTo(-1, 11 * gear); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#191919';
      ctx.beginPath(); ctx.arc(2.5, 11.5 * gear, 3.6, 0, TAU); ctx.fill();
      this.wheel(ctx, -30, 2, 1.8, 3.4 * gear);
    }
    this.checker(ctx, -14, -9, 6);
    this.checker(ctx, -22, -3.5, 5);
  },

  /* --- PZL P.11c: podstawowy myśliwiec września --- */
  p_p11c(ctx, o) {
    const gear = o.gear ?? 1;
    ctx.fillStyle = '#8d9a6f';
    ctx.beginPath();
    ctx.moveTo(-5, -8.5); ctx.lineTo(-27, -12); ctx.lineTo(-29, -8.5); ctx.lineTo(-7, -4.2);
    ctx.lineTo(-4, -4.2); ctx.lineTo(18, -9); ctx.lineTo(23, -12); ctx.lineTo(2, -9.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#79865f';
    ctx.beginPath(); ctx.moveTo(-2, -8); ctx.lineTo(-3.5, -13); ctx.lineTo(3.5, -13); ctx.lineTo(5, -8); ctx.closePath(); ctx.fill();
    // kadłub
    ctx.fillStyle = '#9aa878';
    ctx.beginPath();
    ctx.moveTo(33, -0.5); ctx.quadraticCurveTo(28, -6.4, 13, -7.4);
    ctx.lineTo(-21, -5); ctx.lineTo(-34, -2); ctx.lineTo(-34, 2.2); ctx.lineTo(-19, 5);
    ctx.quadraticCurveTo(9, 7, 29, 4.2); ctx.closePath(); ctx.fill();
    // pas cieniowania
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.moveTo(29, 4.2); ctx.lineTo(-19, 5); ctx.lineTo(-19, 2.6); ctx.lineTo(29, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#79865f';
    ctx.beginPath(); ctx.moveTo(-25, -4.4); ctx.lineTo(-37, -16); ctx.lineTo(-33, -3.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-30, 0.6, 10, 2.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d21f26';
    ctx.beginPath(); ctx.moveTo(-32.5, -9); ctx.lineTo(-37, -16); ctx.lineTo(-34, -5); ctx.closePath(); ctx.fill();
    // kabina
    ctx.fillStyle = '#26301f';
    ctx.beginPath(); ctx.ellipse(1, -7, 4.6, 2.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#79865f';
    ctx.beginPath(); ctx.moveTo(-3.5, -7.2); ctx.lineTo(-10, -6.6); ctx.lineTo(-10, -4); ctx.lineTo(-3.5, -4.4); ctx.closePath(); ctx.fill();
    // silnik
    ctx.fillStyle = '#3d4236';
    ctx.beginPath(); ctx.ellipse(29, 0, 4.6, 6.6, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5b6150'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(26, i * 2.3); ctx.lineTo(31, i * 2.3); ctx.stroke(); }
    // karabiny w kadłubie
    ctx.strokeStyle = '#33372e'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(20, -4.5); ctx.lineTo(31, -4.2); ctx.moveTo(20, 3); ctx.lineTo(31, 2.8); ctx.stroke();
    this.propDisc(ctx, 34, 17, o.prop || 0);
    if (gear > 0.02) {
      ctx.fillStyle = '#6c7458';
      ctx.beginPath(); ctx.moveTo(3, 3.4); ctx.lineTo(7, 12 * gear); ctx.lineTo(-1, 12 * gear); ctx.lineTo(-4, 3.4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#191919';
      ctx.beginPath(); ctx.arc(3, 12.4 * gear, 3.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.arc(3, 12.4 * gear, 1.5, 0, TAU); ctx.fill();
      this.wheel(ctx, -32, 2, 1.8, 3.4 * gear);
    }
    this.checker(ctx, -16, -10, 6.5);
    this.checker(ctx, -24, -3.8, 5.5);
  },

  /* --- PZL.23 Karaś: lekki bombowiec --- */
  p_karas(ctx, o) {
    const gear = o.gear ?? 1;
    // skrzydło
    ctx.fillStyle = '#7f8c60';
    ctx.beginPath(); ctx.moveTo(-6, 1); ctx.lineTo(-30, -2); ctx.lineTo(-32, 2); ctx.lineTo(-6, 5);
    ctx.lineTo(14, 5); ctx.lineTo(26, 1); ctx.lineTo(24, -2); ctx.closePath(); ctx.fill();
    // kadłub
    ctx.fillStyle = '#93a06f';
    ctx.beginPath();
    ctx.moveTo(38, 0); ctx.quadraticCurveTo(33, -7, 18, -8.5);
    ctx.lineTo(-8, -9); ctx.lineTo(-26, -5); ctx.lineTo(-40, -2.5); ctx.lineTo(-40, 2.5);
    ctx.lineTo(-24, 5); ctx.quadraticCurveTo(8, 8, 34, 4.6); ctx.closePath(); ctx.fill();
    // długa oszklona kabina
    this.canopy(ctx, 6, -8.6, 26, 6);
    ctx.fillStyle = 'rgba(30,40,45,.5)';
    ctx.fillRect(-2, -11.5, 1.2, 3);
    ctx.fillRect(8, -12, 1.2, 3.4);
    // gondola strzelca dolnego
    ctx.fillStyle = '#7f8c60';
    ctx.beginPath(); ctx.moveTo(-6, 5); ctx.lineTo(-16, 5); ctx.lineTo(-14, 10); ctx.lineTo(-7, 10); ctx.closePath(); ctx.fill();
    // ogon
    ctx.fillStyle = '#7f8c60';
    ctx.beginPath(); ctx.moveTo(-30, -4.5); ctx.lineTo(-44, -18); ctx.lineTo(-39, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-36, 0.4, 12, 2.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d21f26';
    ctx.beginPath(); ctx.moveTo(-38.5, -10); ctx.lineTo(-44, -18); ctx.lineTo(-40, -5); ctx.closePath(); ctx.fill();
    // silnik
    ctx.fillStyle = '#3d4236';
    ctx.beginPath(); ctx.ellipse(34, 0, 5.4, 7.4, 0, 0, TAU); ctx.fill();
    this.propDisc(ctx, 39, 19, o.prop || 0);
    if (gear > 0.02) {
      ctx.fillStyle = '#6c7458';
      ctx.beginPath(); ctx.moveTo(9, 4); ctx.lineTo(13, 13 * gear); ctx.lineTo(4, 13 * gear); ctx.lineTo(2, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#191919'; ctx.beginPath(); ctx.arc(8.5, 13.4 * gear, 4, 0, TAU); ctx.fill();
      this.wheel(ctx, -38, 2, 1.9, 3.6 * gear);
    }
    this.checker(ctx, -20, -6, 7);
    this.checker(ctx, -26, 1, 6);
  },

  /* --- PZL.37 Łoś: dwusilnikowy bombowiec --- */
  p_los(ctx, o) {
    const gear = o.gear ?? 0;
    // skrzydło
    ctx.fillStyle = '#75835a';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-36, -3); ctx.lineTo(-38, 3); ctx.lineTo(-8, 7);
    ctx.lineTo(20, 7); ctx.lineTo(34, 1); ctx.lineTo(31, -3); ctx.closePath(); ctx.fill();
    // gondole silnikowe
    for (const gx of [10]) {
      ctx.fillStyle = '#7f8d61';
      ctx.beginPath(); ctx.ellipse(gx + 8, 1.5, 16, 5.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3d4236';
      ctx.beginPath(); ctx.ellipse(gx + 22, 1.5, 4.4, 5.6, 0, 0, TAU); ctx.fill();
      this.propDisc(ctx, gx + 26, 17, (o.prop || 0) + 1.2);
      if (gear > 0.02) { this.wheel(ctx, gx + 10, 5, 3.6, 11 * gear); }
    }
    // kadłub
    ctx.fillStyle = '#8b996b';
    ctx.beginPath();
    ctx.moveTo(44, 1); ctx.quadraticCurveTo(40, -6, 26, -8);
    ctx.lineTo(0, -9.5); ctx.lineTo(-30, -6); ctx.lineTo(-48, -3); ctx.lineTo(-48, 3);
    ctx.lineTo(-28, 6); ctx.quadraticCurveTo(10, 9, 40, 5.4); ctx.closePath(); ctx.fill();
    // przeszklony nos
    ctx.fillStyle = 'rgba(150,205,225,.62)';
    ctx.beginPath(); ctx.moveTo(44, 1); ctx.quadraticCurveTo(40, -6, 28, -7.6); ctx.lineTo(28, 4.6);
    ctx.quadraticCurveTo(40, 5, 44, 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,45,55,.6)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(33, -7); ctx.lineTo(33, 5); ctx.moveTo(38, -5.6); ctx.lineTo(38, 5.2); ctx.stroke();
    this.canopy(ctx, 16, -9, 18, 5.5);
    // wieżyczka grzbietowa
    ctx.fillStyle = '#5f6a4c';
    ctx.beginPath(); ctx.arc(-12, -9, 4.2, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = '#33372e'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-12, -11); ctx.lineTo(-24, -15); ctx.stroke();
    // podwójne usterzenie
    ctx.fillStyle = '#75835a';
    ctx.beginPath(); ctx.ellipse(-44, 0.4, 13, 2.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-40, -2); ctx.lineTo(-48, -14); ctx.lineTo(-52, -13); ctx.lineTo(-50, -1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-40, 2); ctx.lineTo(-48, 12); ctx.lineTo(-52, 11); ctx.lineTo(-50, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d21f26';
    ctx.beginPath(); ctx.moveTo(-46, -9); ctx.lineTo(-48, -14); ctx.lineTo(-51.5, -13); ctx.lineTo(-49.6, -8); ctx.closePath(); ctx.fill();
    this.checker(ctx, -24, -7.4, 8);
    this.checker(ctx, -30, 3, 7);
  },

  /* --- Messerschmitt Bf 109 E --- */
  p_bf109(ctx, o) {
    const gear = o.gear ?? 0;
    ctx.fillStyle = '#5d6a52';
    ctx.beginPath(); ctx.moveTo(-4, -1); ctx.lineTo(-24, -4); ctx.lineTo(-26, 1); ctx.lineTo(-4, 4.5);
    ctx.lineTo(12, 4.5); ctx.lineTo(24, 0); ctx.lineTo(21, -3.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6f7b60';
    ctx.beginPath();
    ctx.moveTo(34, 0); ctx.quadraticCurveTo(31, -5.4, 20, -6.6);
    ctx.lineTo(-6, -7); ctx.lineTo(-24, -4.4); ctx.lineTo(-35, -2); ctx.lineTo(-35, 2);
    ctx.lineTo(-22, 4.6); ctx.quadraticCurveTo(6, 6.6, 30, 3.6); ctx.closePath(); ctx.fill();
    // żółty nos (oznaczenie taktyczne)
    ctx.fillStyle = '#e0b02a';
    ctx.beginPath(); ctx.moveTo(34, 0); ctx.quadraticCurveTo(31, -5.4, 25, -6.2); ctx.lineTo(25, 4.6);
    ctx.quadraticCurveTo(31, 3.8, 34, 0); ctx.closePath(); ctx.fill();
    this.canopy(ctx, 3, -7, 14, 5, 'rgba(160,200,220,.7)');
    ctx.fillStyle = '#5d6a52';
    ctx.beginPath(); ctx.moveTo(-4, -7); ctx.lineTo(-14, -6); ctx.lineTo(-14, -3.4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
    // ogon
    ctx.fillStyle = '#5d6a52';
    ctx.beginPath(); ctx.moveTo(-26, -4); ctx.lineTo(-37, -14); ctx.lineTo(-33, -3.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-31, -1, 9, 2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a4034'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-30, -8); ctx.lineTo(-36, -12); ctx.stroke();
    this.propDisc(ctx, 35, 15, o.prop || 0);
    if (gear > 0.02) { this.wheel(ctx, 12, 4, 3.4, 10 * gear); }
    this.balken(ctx, -14, -5.4, 7);
    this.balken(ctx, -20, 2, 6);
  },

  /* --- Junkers Ju 87 Stuka --- */
  p_stuka(ctx, o) {
    // odwrócone skrzydło mewie
    ctx.fillStyle = '#4f5a4a';
    ctx.beginPath();
    ctx.moveTo(-2, 0); ctx.lineTo(-12, 5); ctx.lineTo(-30, 3); ctx.lineTo(-31, 7); ctx.lineTo(-10, 9);
    ctx.lineTo(6, 9); ctx.lineTo(22, 4); ctx.lineTo(24, 0); ctx.lineTo(8, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#63705b';
    ctx.beginPath();
    ctx.moveTo(36, 1); ctx.quadraticCurveTo(33, -6, 20, -7.5);
    ctx.lineTo(-8, -8); ctx.lineTo(-28, -4.5); ctx.lineTo(-40, -2); ctx.lineTo(-40, 3);
    ctx.lineTo(-26, 5.5); ctx.quadraticCurveTo(6, 8, 32, 4.6); ctx.closePath(); ctx.fill();
    // długa oszklona kabina dwumiejscowa
    this.canopy(ctx, 6, -8, 24, 6, 'rgba(150,195,215,.6)');
    ctx.strokeStyle = 'rgba(25,35,40,.75)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, -8); ctx.moveTo(10, -11.4); ctx.lineTo(10, -8); ctx.stroke();
    // karabin tylny
    ctx.strokeStyle = '#2c2f28'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-8, -8.5); ctx.lineTo(-20, -12); ctx.stroke();
    // ogon
    ctx.fillStyle = '#4f5a4a';
    ctx.beginPath(); ctx.moveTo(-30, -4); ctx.lineTo(-42, -16); ctx.lineTo(-38, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-35, 0, 12, 2.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a4034'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(-40, -13); ctx.stroke();
    // stałe podwozie z owiewkami ("spodenki")
    ctx.fillStyle = '#4a5245';
    ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(9, 15); ctx.lineTo(1, 15); ctx.lineTo(-2, 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#191919'; ctx.beginPath(); ctx.arc(4.5, 15.5, 3.6, 0, TAU); ctx.fill();
    // silnik rzędowy + śmigło
    ctx.fillStyle = '#3a3f36';
    ctx.beginPath(); ctx.ellipse(33, 1, 4.6, 6, 0, 0, TAU); ctx.fill();
    this.propDisc(ctx, 37, 16, o.prop || 0);
    this.balken(ctx, -18, -5, 7);
    this.balken(ctx, -24, 3, 6);
  },

  /* --- Heinkel He 111 --- */
  p_he111(ctx, o) {
    ctx.fillStyle = '#4b5750';
    ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-44, -3); ctx.lineTo(-46, 4); ctx.lineTo(-12, 8);
    ctx.lineTo(24, 8); ctx.lineTo(42, 2); ctx.lineTo(38, -3); ctx.closePath(); ctx.fill();
    for (const gx of [8]) {
      ctx.fillStyle = '#5b6960';
      ctx.beginPath(); ctx.ellipse(gx + 10, 2, 19, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#33382f';
      ctx.beginPath(); ctx.ellipse(gx + 27, 2, 4.6, 6, 0, 0, TAU); ctx.fill();
      this.propDisc(ctx, gx + 31, 19, (o.prop || 0) + 0.8);
    }
    ctx.fillStyle = '#657266';
    ctx.beginPath();
    ctx.moveTo(52, 2); ctx.quadraticCurveTo(48, -6, 32, -8);
    ctx.lineTo(0, -9); ctx.lineTo(-34, -5); ctx.lineTo(-56, -2); ctx.lineTo(-56, 4);
    ctx.lineTo(-32, 7); ctx.quadraticCurveTo(12, 10, 48, 6); ctx.closePath(); ctx.fill();
    // charakterystyczny przeszklony nos
    ctx.fillStyle = 'rgba(150,205,225,.6)';
    ctx.beginPath(); ctx.moveTo(52, 2); ctx.quadraticCurveTo(48, -6, 34, -7.6); ctx.lineTo(34, 5.6);
    ctx.quadraticCurveTo(48, 6, 52, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,45,55,.55)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(40, -7); ctx.lineTo(40, 6); ctx.moveTo(46, -5); ctx.lineTo(46, 6); ctx.stroke();
    // wieżyczka górna i gondola dolna
    ctx.fillStyle = '#4b5750';
    ctx.beginPath(); ctx.arc(-6, -9, 4.4, Math.PI, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, 8); ctx.lineTo(-10, 8); ctx.lineTo(-8, 13); ctx.lineTo(2, 13); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4b5750';
    ctx.beginPath(); ctx.moveTo(-40, -3); ctx.lineTo(-56, -16); ctx.lineTo(-52, -2.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-48, 1, 14, 2.6, 0, 0, TAU); ctx.fill();
    this.balken(ctx, -26, -6, 9);
    this.balken(ctx, -34, 4, 8);
  },

  /* --- Bf 110 — ciężki myśliwiec --- */
  p_bf110(ctx, o) {
    ctx.fillStyle = '#4d5a4c';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-36, -3); ctx.lineTo(-38, 3); ctx.lineTo(-8, 7);
    ctx.lineTo(20, 7); ctx.lineTo(34, 1); ctx.lineTo(31, -3); ctx.closePath(); ctx.fill();
    for (const gx of [8]) {
      ctx.fillStyle = '#5d6b5b';
      ctx.beginPath(); ctx.ellipse(gx + 8, 1.5, 15, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#33382f';
      ctx.beginPath(); ctx.ellipse(gx + 21, 1.5, 4, 5.2, 0, 0, TAU); ctx.fill();
      this.propDisc(ctx, gx + 25, 16, (o.prop || 0) + 0.6);
    }
    ctx.fillStyle = '#68765f';
    ctx.beginPath();
    ctx.moveTo(40, 0); ctx.quadraticCurveTo(36, -6, 24, -7.4);
    ctx.lineTo(-2, -8); ctx.lineTo(-28, -5); ctx.lineTo(-44, -2); ctx.lineTo(-44, 2.6);
    ctx.lineTo(-26, 5.4); ctx.quadraticCurveTo(8, 8, 36, 4.6); ctx.closePath(); ctx.fill();
    this.canopy(ctx, 10, -8, 26, 5.4, 'rgba(150,200,220,.65)');
    ctx.strokeStyle = '#2c2f28'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-6, -8.5); ctx.lineTo(-18, -12); ctx.stroke();
    ctx.fillStyle = '#4d5a4c';
    ctx.beginPath(); ctx.ellipse(-40, 0.4, 12, 2.4, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-36, -2); ctx.lineTo(-44, -13); ctx.lineTo(-48, -12); ctx.lineTo(-46, -1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-36, 2); ctx.lineTo(-44, 11); ctx.lineTo(-48, 10); ctx.lineTo(-46, 1); ctx.closePath(); ctx.fill();
    this.balken(ctx, -20, -6, 8);
    this.balken(ctx, -28, 3, 7);
  },

  /* --- Henschel Hs 126 — samolot rozpoznawczy --- */
  p_hs126(ctx, o) {
    ctx.fillStyle = '#5b6a4e';
    ctx.beginPath(); ctx.ellipse(0, -10, 26, 3.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a5540'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-6, -2); ctx.moveTo(8, -8); ctx.lineTo(6, -2); ctx.stroke();
    ctx.fillStyle = '#6b7a5c';
    ctx.beginPath();
    ctx.moveTo(32, 0); ctx.quadraticCurveTo(28, -6, 14, -7);
    ctx.lineTo(-16, -5); ctx.lineTo(-34, -2); ctx.lineTo(-34, 2.4); ctx.lineTo(-16, 5);
    ctx.quadraticCurveTo(6, 7, 28, 4); ctx.closePath(); ctx.fill();
    this.canopy(ctx, 0, -6, 16, 4.6, 'rgba(40,55,50,.8)');
    ctx.fillStyle = '#5b6a4e';
    ctx.beginPath(); ctx.moveTo(-26, -3.6); ctx.lineTo(-36, -14); ctx.lineTo(-33, -3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-30, 0.6, 10, 2.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3d4236';
    ctx.beginPath(); ctx.ellipse(28, 0, 4.6, 6.4, 0, 0, TAU); ctx.fill();
    this.propDisc(ctx, 32, 16, o.prop || 0);
    this.wheel(ctx, 4, 4, 4, 11);
    this.balken(ctx, -16, -4, 7);
  },

  /* =======================================================================
     JEDNOSTKI NAZIEMNE  (rysowane w układzie: 0,0 = punkt styku z ziemią)
     ======================================================================= */

  soldier(ctx, u) {
    const t = u.animT || 0;
    const d = u.dir || 1;
    const dead = u.dead;
    ctx.save();
    ctx.scale(d, 1);
    if (dead) { ctx.restore(); return; }
    const leg = Math.sin(t * 12) * (u.state === 'run' ? 3.4 : 0.6);
    const arm = Math.sin(t * 12 + Math.PI) * (u.state === 'run' ? 2.6 : 0.4);
    // nogi
    ctx.strokeStyle = '#3d4331'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(leg * 0.8, 0); ctx.moveTo(0, -6); ctx.lineTo(-leg * 0.8, 0); ctx.stroke();
    // tułów
    ctx.strokeStyle = u.color || '#4b5238'; ctx.lineWidth = 3.4;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0.6, -13); ctx.stroke();
    // ręce / karabin
    ctx.strokeStyle = '#3d4331'; ctx.lineWidth = 1.8;
    if (u.state === 'shoot') {
      ctx.beginPath(); ctx.moveTo(0.6, -11.5); ctx.lineTo(5, -16); ctx.stroke();
      ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(9, -19); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(0.6, -11.5); ctx.lineTo(arm + 2.4, -8); ctx.stroke();
      ctx.strokeStyle = '#2a2622'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-2, -13); ctx.lineTo(3, -6); ctx.stroke();
    }
    // hełm
    ctx.fillStyle = u.helmet || '#454b36';
    ctx.beginPath(); ctx.arc(0.8, -15, 2.9, Math.PI, TAU); ctx.fill();
    ctx.fillRect(-2.4, -15.2, 6.4, 1.2);
    ctx.restore();
  },

  tank(ctx, u) {
    const d = u.dir || 1;
    ctx.save(); ctx.scale(d, 1);
    const s = u.scale || 1;
    ctx.scale(s, s);
    // gąsienice
    ctx.fillStyle = '#242423';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-19, -9, 38, 9, 4) : ctx.rect(-19, -9, 38, 9); ctx.fill();
    ctx.fillStyle = '#3a3a37';
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.arc(i * 4.2, -4.5, 2.4, 0, TAU); ctx.fill(); }
    // kadłub
    ctx.fillStyle = u.color || '#5a5f4a';
    ctx.beginPath();
    ctx.moveTo(-19, -9); ctx.lineTo(-17, -15); ctx.lineTo(13, -15); ctx.lineTo(19, -9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.06)';
    ctx.fillRect(-17, -15, 30, 2);
    // wieża
    ctx.fillStyle = u.color2 || '#666b53';
    ctx.beginPath();
    ctx.moveTo(-8, -15); ctx.lineTo(-6, -22); ctx.lineTo(6, -22); ctx.lineTo(8, -15); ctx.closePath(); ctx.fill();
    // lufa
    ctx.save();
    ctx.translate(5, -19);
    ctx.rotate(-(u.gunAngle || 0));
    ctx.fillStyle = '#33372e';
    ctx.fillRect(0, -1.2, 17, 2.4);
    ctx.restore();
    // krzyż
    ctx.save(); ctx.scale(1, 1); Art.balken(ctx, -12, -11, 5); ctx.restore();
    ctx.restore();
  },

  truck(ctx, u) {
    const d = u.dir || 1;
    ctx.save(); ctx.scale(d, 1);
    ctx.fillStyle = '#2a2a28';
    ctx.beginPath(); ctx.arc(-11, -3.4, 3.6, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -3.4, 3.6, 0, TAU); ctx.fill();
    ctx.fillStyle = u.color || '#55603f';
    ctx.fillRect(-17, -13, 18, 9);   // plandeka
    ctx.fillStyle = '#454f34';
    ctx.fillRect(1, -10, 10, 6);     // kabina
    ctx.fillStyle = 'rgba(150,190,205,.6)';
    ctx.fillRect(4, -9, 5, 3);
    ctx.fillStyle = '#33372e';
    ctx.fillRect(-17, -13.8, 18, 1.4);
    ctx.restore();
  },

  flak(ctx, u) {
    const d = u.dir || 1;
    // worki z piaskiem
    ctx.fillStyle = '#7a6f52';
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(i * 8, -3, 5, 3.4, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#6b6047';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(i * 8, -8.5, 5, 3.4, 0, 0, TAU); ctx.fill(); }
    // podstawa
    ctx.fillStyle = '#4a5040';
    ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(7, -6); ctx.lineTo(5, -12); ctx.lineTo(-5, -12); ctx.closePath(); ctx.fill();
    // lufa
    ctx.save();
    ctx.translate(0, -12);
    ctx.rotate(-(u.gunAngle || 1));
    ctx.fillStyle = '#33372e';
    ctx.fillRect(0, -1.6, u.big ? 30 : 20, 3.2);
    if (u.big) { ctx.fillStyle = '#2a2e26'; ctx.fillRect(0, -2.6, 8, 5.2); }
    ctx.restore();
    // obsługa
    ctx.save(); ctx.translate(-11, 0); ctx.scale(0.8, 0.8);
    Art.soldier(ctx, { dir: d, animT: 0, state: 'idle', color: '#4a4f3a', helmet: '#3f4433' });
    ctx.restore();
  },

  bunker(ctx, u) {
    const w = u.w || 46, h = u.h || 26;
    ctx.fillStyle = '#6a6a62';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2 + 5, -h); ctx.lineTo(w / 2 - 5, -h); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#585850';
    ctx.fillRect(-w / 2 + 4, -h - 5, w - 8, 6);
    ctx.fillStyle = '#1b1b1a';
    ctx.fillRect(-w / 4, -h * 0.62, w / 2, 5);   // strzelnica
    ctx.strokeStyle = '#4c4c46'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-w / 2 + 6, -6); ctx.lineTo(w / 2 - 6, -6); ctx.stroke();
    // ślady maskowania
    ctx.fillStyle = 'rgba(60,80,45,.35)';
    ctx.beginPath(); ctx.ellipse(-w * 0.2, -h * 0.9, 9, 4, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.25, -h * 0.85, 7, 3.4, 0, 0, TAU); ctx.fill();
  },

  hangar(ctx, u) {
    const w = u.w || 96, h = u.h || 44;
    ctx.fillStyle = '#5d6156';
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.55);
    ctx.quadraticCurveTo(0, -h * 1.35, w / 2, -h * 0.55); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * w / 8, 0); ctx.lineTo(i * w / 8, -h * (0.6 + 0.3 * Math.cos(i * 0.4))); ctx.stroke();
    }
    ctx.fillStyle = '#2e312a';
    ctx.fillRect(-w * 0.22, -h * 0.62, w * 0.44, h * 0.62);
    ctx.fillStyle = '#3d4137';
    ctx.fillRect(-w * 0.2, -h * 0.58, w * 0.19, h * 0.58);
  },

  fueltank(ctx, u) {
    const r = u.r || 20;
    ctx.fillStyle = '#7d7a5f';
    ctx.beginPath(); ctx.ellipse(0, -r, r, r * 1.05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(r * 0.35, -r, r * 0.5, r * 0.95, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#565442'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, -r); ctx.stroke();
    ctx.fillStyle = '#b03a2e';
    ctx.beginPath(); ctx.moveTo(-4, -r * 1.6); ctx.lineTo(4, -r * 1.6); ctx.lineTo(0, -r * 2.1); ctx.closePath(); ctx.fill();
  },

  depot(ctx, u) {
    const w = u.w || 56, h = u.h || 30;
    ctx.fillStyle = '#6a5f45';
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = '#564d38';
    ctx.beginPath(); ctx.moveTo(-w / 2 - 4, -h); ctx.lineTo(0, -h - 12); ctx.lineTo(w / 2 + 4, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a3527';
    ctx.fillRect(-w * 0.16, -h * 0.66, w * 0.32, h * 0.66);
    // skrzynie amunicyjne
    ctx.fillStyle = '#4e5540';
    ctx.fillRect(w / 2 - 4, -9, 12, 9);
    ctx.fillRect(-w / 2 - 12, -7, 11, 7);
  },

  radio(ctx, u) {
    const h = u.h || 70;
    ctx.strokeStyle = '#6b6f63'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(0, -h); ctx.lineTo(9, 0); ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      const y = -h * i / 7, w = 9 * (1 - i / 7.6);
      ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w * 0.6, y + h / 7); ctx.stroke();
    }
    ctx.fillStyle = '#8f9483';
    ctx.beginPath(); ctx.arc(0, -h - 3, 3, 0, TAU); ctx.fill();
  },

  house(ctx, u) {
    const w = u.w || 44, h = u.h || 28;
    ctx.fillStyle = u.color || '#9c8f76';
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.fillStyle = '#7a3f30';
    ctx.beginPath(); ctx.moveTo(-w / 2 - 5, -h); ctx.lineTo(0, -h - 16); ctx.lineTo(w / 2 + 5, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a4433';
    ctx.fillRect(-w * 0.12, -h * 0.55, w * 0.24, h * 0.55);
    ctx.fillStyle = 'rgba(160,200,220,.55)';
    ctx.fillRect(-w * 0.4, -h * 0.72, w * 0.18, h * 0.3);
    ctx.fillRect(w * 0.22, -h * 0.72, w * 0.18, h * 0.3);
    ctx.fillStyle = '#5d5548';
    ctx.fillRect(w * 0.2, -h - 22, 6, 10);
  },

  bridge(ctx, u) {
    const w = u.w || 220;
    ctx.fillStyle = '#5f5a52';
    ctx.fillRect(-w / 2, -10, w, 8);
    ctx.strokeStyle = '#6b665c'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -10);
    ctx.quadraticCurveTo(0, -58, w / 2, -10);
    ctx.stroke();
    ctx.lineWidth = 1.6;
    for (let i = -4; i <= 4; i++) {
      const t = (i + 4) / 8;
      const x = -w / 2 + t * w;
      const y = -10 - Math.sin(t * Math.PI) * 34;
      ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, y); ctx.stroke();
    }
    // przyczółki
    ctx.fillStyle = '#4d483f';
    ctx.fillRect(-w / 2 - 12, -14, 16, 26);
    ctx.fillRect(w / 2 - 4, -14, 16, 26);
  },

  train(ctx, u) {
    const d = u.dir || 1;
    ctx.save(); ctx.scale(d, 1);
    // lokomotywa
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(-30, -18, 34, 14);
    ctx.beginPath(); ctx.arc(4, -11, 7, -Math.PI / 2, Math.PI / 2); ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(-32, -26, 14, 9);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(-2, -26, 5, 9);    // komin
    ctx.fillStyle = '#171717';
    for (const wx of [-24, -14, -2, 6]) { ctx.beginPath(); ctx.arc(wx, -3, 4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#8a2f24';
    ctx.fillRect(-30, -6, 34, 2.4);
    ctx.restore();
  },

  wagon(ctx, u) {
    const d = u.dir || 1;
    ctx.save(); ctx.scale(d, 1);
    ctx.fillStyle = u.color || '#4b4a3c';
    ctx.fillRect(-26, -20, 52, 15);
    ctx.fillStyle = '#3a392f';
    ctx.fillRect(-26, -22, 52, 3);
    ctx.fillStyle = '#171717';
    for (const wx of [-18, -8, 8, 18]) { ctx.beginPath(); ctx.arc(wx, -3, 4, 0, TAU); ctx.fill(); }
    if (u.flak) {
      ctx.save(); ctx.translate(0, -22);
      ctx.rotate(-(u.gunAngle || 1));
      ctx.fillStyle = '#33372e'; ctx.fillRect(0, -1.4, 22, 2.8);
      ctx.restore();
    }
    ctx.restore();
  },

  balloon(ctx, u) {
    ctx.fillStyle = '#9aa2a8';
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 15, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#818a90';
    ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-34, -9); ctx.lineTo(-32, 0); ctx.lineTo(-34, 9); ctx.closePath(); ctx.fill();

  },

  /* --- okręty (0,0 = linia wodna, środek) --- */
  ship(ctx, u) {
    const d = u.dir || 1;
    const L = u.len || 180;
    ctx.save(); ctx.scale(d, 1);
    // cień kadłuba w wodzie
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath(); ctx.ellipse(0, 10, L * 0.52, 7, 0, 0, TAU); ctx.fill();
    switch (u.ship) {
      case 'transport': {
        ctx.fillStyle = '#5d5d58';
        ctx.beginPath();
        ctx.moveTo(-L / 2, 0); ctx.lineTo(-L / 2 + 12, -16); ctx.lineTo(L / 2 - 16, -16);
        ctx.lineTo(L / 2, -4); ctx.lineTo(L / 2 - 4, 8); ctx.lineTo(-L / 2 + 8, 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.20)';
        ctx.fillRect(-L / 2 + 8, -6, L - 22, 6);
        ctx.fillStyle = '#8b8779';
        ctx.fillRect(-14, -34, 40, 18);
        ctx.fillStyle = '#b7c6cc';
        for (let i = 0; i < 4; i++) ctx.fillRect(-8 + i * 9, -30, 5, 5);
        ctx.fillStyle = '#3a3a36';
        ctx.fillRect(6, -50, 10, 17);
        ctx.fillStyle = '#c8492f';
        ctx.fillRect(6, -50, 10, 5);
        ctx.fillStyle = '#9a9486';
        ctx.fillRect(-L / 2 + 20, -24, 20, 8);
        // ładunek na pokładzie
        ctx.fillStyle = '#6a6250';
        ctx.fillRect(-L / 2 + 26, -26, 16, 10);
        ctx.fillRect(L / 2 - 52, -24, 18, 8);
        ctx.strokeStyle = '#7a7668'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(-40, -16); ctx.lineTo(-40, -44); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-52, -30); ctx.lineTo(-28, -30); ctx.stroke();
        break;
      }
      case 'destroyer': {
        ctx.fillStyle = '#6a7075';
        ctx.beginPath();
        ctx.moveTo(-L / 2, -2); ctx.lineTo(-L / 2 + 10, -14); ctx.lineTo(L / 2 - 24, -14);
        ctx.lineTo(L / 2, -6); ctx.lineTo(L / 2 - 6, 7); ctx.lineTo(-L / 2 + 6, 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.20)';
        ctx.fillRect(-L / 2 + 8, -5, L - 26, 5);
        ctx.fillStyle = '#818a90';
        ctx.fillRect(-18, -30, 34, 16);
        ctx.fillRect(-4, -40, 14, 11);
        ctx.fillStyle = '#b7c6cc';
        ctx.fillRect(-14, -37, 20, 4);
        ctx.fillStyle = '#464c50';
        ctx.fillRect(20, -34, 9, 20);
        ctx.fillRect(-34, -30, 8, 16);
        ctx.strokeStyle = '#8d959a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(2, -40); ctx.lineTo(2, -58); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-10, -50); ctx.lineTo(14, -50); ctx.stroke();
        // działa
        ctx.fillStyle = '#3f4548';
        ctx.beginPath(); ctx.arc(-L / 2 + 34, -16, 7, Math.PI, TAU); ctx.fill();
        ctx.save(); ctx.translate(-L / 2 + 34, -18); ctx.rotate(-(u.gunAngle || 0.9));
        ctx.fillRect(0, -1.5, 20, 3); ctx.restore();
        ctx.beginPath(); ctx.arc(L / 2 - 44, -16, 7, Math.PI, TAU); ctx.fill();
        ctx.save(); ctx.translate(L / 2 - 44, -18); ctx.rotate(-(u.gunAngle || 0.9));
        ctx.fillRect(0, -1.5, 18, 3); ctx.restore();
        break;
      }
      case 'carrier': {
        // kadłub
        ctx.fillStyle = '#606669';
        ctx.beginPath();
        ctx.moveTo(-L / 2, -6); ctx.lineTo(-L / 2 + 12, -20); ctx.lineTo(L / 2 - 18, -20);
        ctx.lineTo(L / 2, -8); ctx.lineTo(L / 2 - 8, 10); ctx.lineTo(-L / 2 + 8, 10); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.20)';
        ctx.fillRect(-L / 2 + 8, -6, L - 24, 6);
        // pokład
        ctx.fillStyle = '#7a705f';
        ctx.fillRect(-L / 2 - 6, -30, L + 12, 11);
        ctx.fillStyle = '#8d8271';
        ctx.fillRect(-L / 2 - 6, -30, L + 12, 3);
        ctx.fillStyle = 'rgba(0,0,0,.18)';
        for (let x = -L / 2; x < L / 2; x += 18) ctx.fillRect(x, -27, 1.5, 8);
        // linia środkowa
        ctx.fillStyle = '#e8e2cf';
        for (let x = -L / 2 + 10; x < L / 2 - 10; x += 26) ctx.fillRect(x, -25.5, 13, 2);
        // wyspa nadbudówki
        ctx.fillStyle = '#585e60';
        ctx.fillRect(L * 0.22, -52, 26, 23);
        ctx.fillStyle = '#3f4547';
        ctx.fillRect(L * 0.28, -66, 8, 15);
        ctx.fillStyle = 'rgba(160,200,220,.5)';
        ctx.fillRect(L * 0.24, -47, 20, 5);
        // liny hamujące
        ctx.strokeStyle = 'rgba(20,20,20,.5)'; ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const x = -L / 2 + 40 + i * 22;
          ctx.beginPath(); ctx.moveTo(x, -29); ctx.lineTo(x, -25); ctx.stroke();
        }
        break;
      }
      default: {
        ctx.fillStyle = '#4a4a48';
        ctx.fillRect(-L / 2, -14, L, 20);
      }
    }
    ctx.restore();
  },

  /* --- wraki --- */
  wreck(ctx, u) {
    const k = u.kind;
    ctx.save();
    if (u.dir) ctx.scale(u.dir, 1);
    ctx.rotate(u.rot || 0);
    if (k === 'plane') {
      ctx.fillStyle = '#25231e';
      ctx.beginPath();
      ctx.moveTo(-24, 0); ctx.lineTo(-18, -7); ctx.lineTo(8, -8); ctx.lineTo(20, -2); ctx.lineTo(14, 3); ctx.lineTo(-20, 4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1815';
      ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-26, -12); ctx.lineTo(-22, -4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#151310'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-24, -1); ctx.lineTo(-34, -9); ctx.stroke();
    } else if (k === 'tank') {
      ctx.fillStyle = '#211f1c';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-19, -14, 38, 14, 3) : ctx.rect(-19, -14, 38, 14); ctx.fill();
      ctx.fillStyle = '#191714';
      ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(-4, -20); ctx.lineTo(7, -19); ctx.lineTo(9, -14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#151310'; ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(4, -17); ctx.lineTo(20, -24); ctx.stroke();
      ctx.fillStyle = '#2c2823';
      ctx.beginPath(); ctx.arc(-14, -3, 3, 0, TAU); ctx.fill();
    } else if (k === 'building') {
      ctx.fillStyle = '#26231e';
      ctx.beginPath();
      ctx.moveTo(-(u.w || 40) / 2, 0); ctx.lineTo(-(u.w || 40) / 2 + 4, -(u.h || 20) * 0.55);
      ctx.lineTo(-4, -(u.h || 20) * 0.3); ctx.lineTo(6, -(u.h || 20) * 0.62);
      ctx.lineTo((u.w || 40) / 2 - 6, -(u.h || 20) * 0.2); ctx.lineTo((u.w || 40) / 2, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1b1915';
      ctx.fillRect(-(u.w || 40) / 2, -3, (u.w || 40), 3);
    } else if (k === 'gun') {
      ctx.fillStyle = '#221f1b';
      ctx.beginPath(); ctx.ellipse(0, -4, 14, 6, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#171512'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(12, -16); ctx.stroke();
    } else if (k === 'truck') {
      ctx.fillStyle = '#211f1b';
      ctx.fillRect(-15, -10, 30, 10);
      ctx.strokeStyle = '#171512'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-15, -10); ctx.lineTo(-8, -16); ctx.lineTo(6, -14); ctx.stroke();
    } else {
      ctx.fillStyle = '#211f1b';
      ctx.beginPath(); ctx.ellipse(0, -5, 16, 7, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },
};
