/* =========================================================================
   Grafika wektorowa — samoloty, pojazdy, okręty, piechota, budynki
   Wszystko rysowane ścieżkami canvas: nos maszyny wskazuje +X, -Y to góra.
   ========================================================================= */
'use strict';

const Art = {

  /* ---------------- elementy wspólne ---------------- */
  /* Malowanie z 1939 r.: polskie khaki i błękit spodu, niemiecki splinter. */
  POL: { top: '#6f6c4a', topL: '#7d7a55', topD: '#585640', bot: '#9db0bb' },
  GER: { top: '#4e5947', topL: '#5c6853', topD: '#3b4435', bot: '#9fb4c2' },

  propDisc(ctx, x, r, spin, col = 'rgba(214,220,226,.9)', cy = 0) {
    ctx.save();
    ctx.translate(x, cy);
    // rozmyty krąg pracującego śmigła
    const g = ctx.createLinearGradient(-r * 0.34, 0, r * 0.34, 0);
    g.addColorStop(0, 'rgba(206,214,222,0)');
    g.addColorStop(0.35, 'rgba(214,220,226,.26)');
    g.addColorStop(0.6, 'rgba(226,232,238,.34)');
    g.addColorStop(1, 'rgba(206,214,222,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.34, r, 0, 0, TAU); ctx.fill();
    // dwie łopaty jako smugi — długość zmienia się z fazą obrotu
    ctx.strokeStyle = 'rgba(46,48,44,.42)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const a = spin + i * Math.PI;
      const len = Math.sin(a) * r;
      ctx.lineWidth = 1 + Math.abs(Math.cos(a)) * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a) * 2.4, len * 0.55, Math.cos(a) * 1.2, len);
      ctx.stroke();
    }
    // kołpak
    ctx.fillStyle = '#31352c';
    ctx.beginPath(); ctx.ellipse(-1, 0, 2, 3, 0, 0, TAU); ctx.fill();
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

  /* --------------------------------------------------------------------
     Sylwetki odwzorowane z rysunków bocznych (Militaria 615 „1939"):
     proporcje wg rzeczywistych długości, skala 9 px = 1 m,
     malowanie polskie: khaki na górze, błękit od spodu.
     Płat rysujemy jako cięciwę przy kadłubie (jak na rysunku bocznym),
     a nie jako pas na całą długość maszyny.
     -------------------------------------------------------------------- */

  /** Biało-czerwony pas na sterze kierunku. */
  rudderFlash(ctx, x0, y0, x1, y1, w) {
    ctx.save();
    ctx.fillStyle = '#f4f1e8';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.lineTo(x1 + w, y1); ctx.lineTo(x0 + w, y0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d21f26';
    ctx.beginPath(); ctx.moveTo(x0 + w, y0); ctx.lineTo(x1 + w, y1); ctx.lineTo(x1 + w * 2, y1); ctx.lineTo(x0 + w * 2, y0); ctx.closePath(); ctx.fill();
    ctx.restore();
  },

  /** Owiewka („spodenka") stałego podwozia. */
  spat(ctx, x, y, h, s = 1) {
    ctx.fillStyle = Art.POL.topD;
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, y);
    ctx.quadraticCurveTo(x - 4.6 * s, y + h * 0.6, x - 3.4 * s, y + h);
    ctx.lineTo(x + 3.4 * s, y + h);
    ctx.quadraticCurveTo(x + 4.6 * s, y + h * 0.6, x + 3 * s, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#17171a';
    ctx.beginPath(); ctx.arc(x, y + h + 1.2 * s, 4.2 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3d3d40';
    ctx.beginPath(); ctx.arc(x, y + h + 1.2 * s, 1.7 * s, 0, TAU); ctx.fill();
  },

  /** Dalszy płat w perspektywie — jak na rysunkach bocznych z Militarii:
      od nasady biegnie w tył i w dół, spod kadłuba wystaje wyraźna końcówka. */
  farWing(ctx, rootLE, rootTE, y, tipX, tipY, chordTip, col, colEdge) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(rootLE, y);
    ctx.lineTo(tipX, tipY);
    ctx.quadraticCurveTo(tipX - 4.5, tipY + chordTip * 0.55, tipX + 3, tipY + chordTip);
    ctx.lineTo(rootTE, y + chordTip * 0.55);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = colEdge || 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.moveTo(rootLE, y); ctx.lineTo(tipX, tipY);
    ctx.lineTo(tipX + 1.6, tipY + 1.4); ctx.lineTo(rootLE, y + 1.4);
    ctx.closePath(); ctx.fill();
  },

  /** Gwiazdowy silnik w pierścieniu Townenda / NACA. */
  radial(ctx, x, r) {
    ctx.fillStyle = '#31352c';
    ctx.beginPath(); ctx.ellipse(x, 0, r * 0.42, r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#565b4c'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(x - r * 0.34, i * r * 0.36); ctx.lineTo(x + r * 0.34, i * r * 0.36); ctx.stroke();
    }
    ctx.fillStyle = '#22251e';
    ctx.beginPath(); ctx.ellipse(x + r * 0.36, 0, r * 0.16, r * 0.92, 0, 0, TAU); ctx.fill();
  },

  /* --- PWS-26: dwupłatowiec szkolny (dł. 7,36 m) --- */
  p_pws26(ctx, o) {
    const gear = o.gear ?? 1, P = Art.POL;
    // dolny płat (dalszy, widoczny spod kadłuba)
    Art.farWing(ctx, 10, -6, 3.6, -24, 6.4, 4.2, '#5b5939');
    // kadłub
    ctx.fillStyle = P.top;
    ctx.beginPath();
    ctx.moveTo(25, -1); ctx.quadraticCurveTo(22, -7, 8, -8);
    ctx.lineTo(-20, -6); ctx.lineTo(-33, -2.6); ctx.lineTo(-33, 1.4);
    ctx.lineTo(-19, 4.4); ctx.quadraticCurveTo(6, 6.6, 23, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.bot;
    ctx.beginPath();
    ctx.moveTo(23, 4); ctx.quadraticCurveTo(6, 6.6, -19, 4.4); ctx.lineTo(-19, 3.3);
    ctx.quadraticCurveTo(6, 5.5, 23, 3); ctx.closePath(); ctx.fill();
    // usterzenie
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-23, -5.4); ctx.quadraticCurveTo(-29, -14.6, -34.6, -13.6);
    ctx.quadraticCurveTo(-33.6, -7, -33, -2.6); ctx.closePath(); ctx.fill();
    Art.rudderFlash(ctx, -33.2, -3, -34.5, -13, 2.1);
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-24, -1.4); ctx.lineTo(-38, -3); ctx.lineTo(-38, -0.4); ctx.lineTo(-24, 1); ctx.closePath(); ctx.fill();
    // odkryte kabiny
    ctx.fillStyle = '#23271e';
    ctx.beginPath(); ctx.ellipse(2, -7.6, 3.4, 2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-8, -6.8, 3.2, 1.9, 0, 0, TAU); ctx.fill();
    // rozpórki międzypłatowe i baldachim
    ctx.strokeStyle = '#4e4c38'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-12, 3.6); ctx.lineTo(-14, -12.4);
    ctx.moveTo(9, 3.2); ctx.lineTo(8, -12.6);
    ctx.moveTo(-4, -7.6); ctx.lineTo(-6, -12.6);
    ctx.moveTo(4, -7.6); ctx.lineTo(4, -12.6);
    ctx.moveTo(-12, 3.6); ctx.lineTo(8, -12.6);
    ctx.stroke();
    // górny płat: bliższy pas + dalszy panel w perspektywie
    ctx.fillStyle = '#5b5939';
    ctx.beginPath();
    ctx.moveTo(12, -13.6); ctx.lineTo(-22, -11.2); ctx.quadraticCurveTo(-27, -10.6, -21, -8.4);
    ctx.lineTo(11, -10.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.topL;
    ctx.beginPath();
    ctx.moveTo(13, -14.4); ctx.lineTo(-15, -14.4); ctx.lineTo(-16.5, -11.6); ctx.lineTo(12, -11.6); ctx.closePath(); ctx.fill();
    // silnik rzędowy w owiewce + śmigło
    ctx.fillStyle = '#3a3d31';
    ctx.beginPath(); ctx.moveTo(25, -1); ctx.quadraticCurveTo(28, -5, 25, -6); ctx.lineTo(25, 3.6);
    ctx.quadraticCurveTo(28, 3, 25, -1); ctx.closePath(); ctx.fill();
    Art.propDisc(ctx, 28, 15, o.prop || 0);
    if (gear > 0.02) {
      ctx.strokeStyle = '#3a3a36'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(0, 4); ctx.lineTo(2, 4 + 8 * gear); ctx.moveTo(9, 4); ctx.lineTo(3.4, 4 + 8 * gear); ctx.stroke();
      ctx.fillStyle = '#17171a';
      ctx.beginPath(); ctx.arc(2.6, 4 + 9 * gear, 3.6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3d3d40'; ctx.beginPath(); ctx.arc(2.6, 4 + 9 * gear, 1.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2c2c28';
      ctx.beginPath(); ctx.arc(-32, 2.6, 1.8, 0, TAU); ctx.fill();
    }
    Art.checker(ctx, -8, -13.2, 5.6);
    Art.checker(ctx, -26, -4.4, 5);
  },

  /* --- PZL P.7a: myśliwiec o skrzydle mewim (dł. 7,15 m) --- */
  p_p7a(ctx, o) {
    const gear = o.gear ?? 1, P = Art.POL;
    // skrzydło mewie: od góry kadłuba stromo w dół, potem cienka cięciwa
    ctx.fillStyle = P.topD;
    ctx.beginPath();
    ctx.moveTo(11, -9.4); ctx.lineTo(-8, -9.4); ctx.lineTo(-11, -6.6); ctx.lineTo(9, -6.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.topL;
    ctx.beginPath();
    ctx.moveTo(9, -8.2); ctx.lineTo(-2, -8.6); ctx.lineTo(-3.6, -6.2); ctx.lineTo(8, -6.2); ctx.closePath(); ctx.fill();
    // kadłub
    ctx.fillStyle = P.top;
    ctx.beginPath();
    ctx.moveTo(26, -0.6); ctx.quadraticCurveTo(24, -6.4, 12, -7.4);
    ctx.lineTo(-18, -5.6); ctx.lineTo(-31, -2.6); ctx.lineTo(-31, 1.4);
    ctx.lineTo(-17, 4.2); ctx.quadraticCurveTo(6, 6.2, 24, 3.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.bot;
    ctx.beginPath();
    ctx.moveTo(24, 3.6); ctx.quadraticCurveTo(6, 6.2, -17, 4.2); ctx.lineTo(-17, 2.6);
    ctx.quadraticCurveTo(6, 4.2, 24, 2); ctx.closePath(); ctx.fill();
    // zagłówek pilota i odkryta kabina
    ctx.fillStyle = '#23271e';
    ctx.beginPath(); ctx.ellipse(0, -7, 3.6, 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-3.6, -7.2); ctx.quadraticCurveTo(-9, -7.4, -10, -4.6); ctx.lineTo(-3.6, -5); ctx.closePath(); ctx.fill();
    // statecznik pionowy i poziomy
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-21, -5); ctx.quadraticCurveTo(-28, -15.4, -33, -14.4);
    ctx.lineTo(-31, -2.6); ctx.closePath(); ctx.fill();
    Art.rudderFlash(ctx, -31.4, -3, -33.2, -13.8, 2.2);
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-22, -1.2); ctx.lineTo(-36, -2.8); ctx.lineTo(-36, -0.2); ctx.lineTo(-22, 1.2); ctx.closePath(); ctx.fill();
    // silnik gwiazdowy
    Art.radial(ctx, 25, 6.6);
    Art.propDisc(ctx, 29, 15.5, o.prop || 0);
    if (gear > 0.02) {
      ctx.strokeStyle = '#3a3a36'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(-2, 4); ctx.lineTo(3, 3 + 7 * gear); ctx.moveTo(8, 3.4); ctx.lineTo(4, 3 + 7 * gear); ctx.stroke();
      Art.spat(ctx, 3.4, 2.6, 6.4 * gear, 0.86);
      ctx.fillStyle = '#2c2c28';
      ctx.beginPath(); ctx.arc(-30, 2.6, 1.8, 0, TAU); ctx.fill();
    }
    Art.checker(ctx, -13, -8.6, 5.6);
    Art.checker(ctx, -24, -3.6, 5);
  },

  /* --- PZL P.11c: myśliwiec września (dł. 7,55 m, wys. 2,85 m) --- */
  p_p11c(ctx, o) {
    const gear = o.gear ?? 1, P = Art.POL;
    // płat mewi: krótki, stromy odcinek przy kadłubie + długa cienka cięciwa
    // dalszy płat — cieńszy i ciemniejszy, widoczny zza kadłuba
    ctx.fillStyle = '#4c4a36';
    ctx.beginPath();
    ctx.moveTo(15, -11.6); ctx.lineTo(-11, -11.6); ctx.lineTo(-15, -8.4); ctx.lineTo(12, -8.4); ctx.closePath(); ctx.fill();
    // bliższy płat
    ctx.fillStyle = P.topD;
    ctx.beginPath();
    ctx.moveTo(14, -10.2); ctx.lineTo(-10, -10.2); ctx.lineTo(-14, -6.6); ctx.lineTo(11, -6.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.topL;
    ctx.beginPath();
    ctx.moveTo(12.5, -9.4); ctx.lineTo(-6, -9.6); ctx.lineTo(-8.6, -7); ctx.lineTo(10.6, -7); ctx.closePath(); ctx.fill();
    // charakterystyczne załamanie „mewy" tuż przy kadłubie
    ctx.fillStyle = P.top;
    ctx.beginPath();
    ctx.moveTo(-1.4, -10); ctx.lineTo(4.4, -10.2); ctx.lineTo(6.4, -6.2); ctx.lineTo(-3.6, -6); ctx.closePath(); ctx.fill();
    // kadłub
    ctx.fillStyle = P.top;
    ctx.beginPath();
    ctx.moveTo(30, -0.6); ctx.quadraticCurveTo(27, -6.6, 14, -7.8);
    ctx.lineTo(-20, -6); ctx.lineTo(-35, -2.8); ctx.lineTo(-35, 1.6);
    ctx.lineTo(-19, 4.6); ctx.quadraticCurveTo(8, 6.8, 27, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.bot;
    ctx.beginPath();
    ctx.moveTo(27, 4); ctx.quadraticCurveTo(8, 6.8, -19, 4.6); ctx.lineTo(-19, 3.6);
    ctx.quadraticCurveTo(8, 5.6, 27, 3); ctx.closePath(); ctx.fill();
    // wiatrochron i zagłówek
    ctx.fillStyle = 'rgba(150,200,220,.55)';
    ctx.beginPath(); ctx.moveTo(3.6, -8); ctx.lineTo(1, -11); ctx.lineTo(-1.4, -10.8); ctx.lineTo(-1.4, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#23271e';
    ctx.beginPath(); ctx.ellipse(-3.4, -7.6, 3.2, 1.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-6.6, -7.8); ctx.quadraticCurveTo(-12, -8, -13.4, -5); ctx.lineTo(-6.6, -5.4); ctx.closePath(); ctx.fill();
    // usterzenie z zaokrąglonym sterem
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-24, -5.2); ctx.quadraticCurveTo(-31.5, -15.6, -37, -14.4);
    ctx.quadraticCurveTo(-36.2, -8, -35, -2.8); ctx.closePath(); ctx.fill();
    Art.rudderFlash(ctx, -35.2, -3.4, -36.9, -13.6, 2.1);
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-24, -1.2); ctx.lineTo(-39.5, -3.2); ctx.lineTo(-39.5, -0.2); ctx.lineTo(-24, 1.4); ctx.closePath(); ctx.fill();
    // silnik Mercury w wąskiej osłonie
    Art.radial(ctx, 28, 7);
    // karabiny w kadłubie
    ctx.strokeStyle = '#2f322a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(18, -5); ctx.lineTo(30, -4.6); ctx.moveTo(18, 2.6); ctx.lineTo(30, 2.4); ctx.stroke();
    Art.propDisc(ctx, 32, 16.5, o.prop || 0);
    if (gear > 0.02) {
      ctx.strokeStyle = '#3a3a36'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-3, 4.4); ctx.lineTo(4, 3.4 + 7 * gear); ctx.moveTo(10, 3.6); ctx.lineTo(5.4, 3.4 + 7 * gear); ctx.stroke();
      Art.spat(ctx, 4.6, 3, 7 * gear, 0.92);
      ctx.fillStyle = '#2c2c28';
      ctx.beginPath(); ctx.arc(-34, 2.8, 1.9, 0, TAU); ctx.fill();
    }
    Art.checker(ctx, -15, -9.6, 6);
    Art.checker(ctx, -27, -4, 5.4);
  },

  /* --- PZL.23 Karaś: lekki bombowiec (dł. 9,68 m, wys. 3,3 m) --- */
  p_karas(ctx, o) {
    const gear = o.gear ?? 1, P = Art.POL;
    // dalszy płat w perspektywie — wychodzi spod kadłuba w tył
    Art.farWing(ctx, 16, -8, 3, -34, 6.6, 5, '#5b5939');
    // kadłub
    ctx.fillStyle = P.top;
    ctx.beginPath();
    ctx.moveTo(38, 0); ctx.quadraticCurveTo(35, -8, 20, -9.6);
    ctx.lineTo(-10, -8.6); ctx.lineTo(-30, -5.4); ctx.lineTo(-47, -2.4); ctx.lineTo(-47, 2.2);
    ctx.lineTo(-28, 5); ctx.quadraticCurveTo(6, 8, 35, 4.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.bot;
    ctx.beginPath();
    ctx.moveTo(35, 4.8); ctx.quadraticCurveTo(6, 8, -28, 5); ctx.lineTo(-28, 3.9);
    ctx.quadraticCurveTo(6, 6.8, 35, 3.4); ctx.closePath(); ctx.fill();
    // długa oszklona kabina (pilot + obserwator)
    ctx.fillStyle = 'rgba(152,204,224,.6)';
    ctx.beginPath();
    ctx.moveTo(24, -9.6); ctx.lineTo(19, -14.6); ctx.lineTo(-6, -14.6);
    ctx.lineTo(-13, -8.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,40,46,.75)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(19, -14.5); ctx.lineTo(19, -9.6);
    ctx.moveTo(11, -14.6); ctx.lineTo(11, -9.3);
    ctx.moveTo(3, -14.6); ctx.lineTo(3, -9);
    ctx.moveTo(-6, -14.5); ctx.lineTo(-6, -8.7);
    ctx.stroke();
    // gondola dolnego strzelca
    ctx.fillStyle = P.bot;
    ctx.beginPath();
    ctx.moveTo(-4, 5.6); ctx.lineTo(-19, 5.2); ctx.quadraticCurveTo(-17, 11.4, -8, 11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2f322a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-14, 8.6); ctx.lineTo(-24, 11.4); ctx.stroke();
    // karabin strzelca górnego
    ctx.beginPath(); ctx.moveTo(-6, -9.4); ctx.lineTo(-17, -13.4); ctx.stroke();
    // usterzenie
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-32, -6.4); ctx.quadraticCurveTo(-42, -21, -50.5, -19.4);
    ctx.quadraticCurveTo(-49, -10, -47, -2.4); ctx.closePath(); ctx.fill();
    Art.rudderFlash(ctx, -47.4, -3, -50.4, -18.6, 3);
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-33, -1.6); ctx.lineTo(-53, -4); ctx.lineTo(-53, -0.2); ctx.lineTo(-33, 1.8); ctx.closePath(); ctx.fill();
    // silnik gwiazdowy Pegaz
    Art.radial(ctx, 35, 8.4);
    Art.propDisc(ctx, 39.5, 20, o.prop || 0);
    // stałe podwozie w owiewkach
    if (gear > 0.02) {
      ctx.strokeStyle = '#3a3a36'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(2, 5.2); ctx.lineTo(9, 4 + 9 * gear); ctx.moveTo(18, 4.4); ctx.lineTo(13, 4 + 9 * gear); ctx.stroke();
      Art.spat(ctx, 15.5, 3.6, 8.6 * gear, 0.95);      // owiewka dalszego koła
      Art.spat(ctx, 9.5, 3.6, 9 * gear, 1.08);
      ctx.fillStyle = '#2c2c28';
      ctx.beginPath(); ctx.arc(-45, 3.2, 2.1, 0, TAU); ctx.fill();
    }
    Art.checker(ctx, -22, -7.2, 7);
    Art.checker(ctx, -36, -3.4, 6);
  },

  /* --- PZL.37 Łoś: bombowiec średni (dł. 12,92 m, wys. 4,25 m) --- */
  p_los(ctx, o) {
    const gear = o.gear ?? 0, P = Art.POL;
    // dalszy płat w perspektywie
    Art.farWing(ctx, 24, -14, 4, -46, 8.4, 6.2, '#5b5939');
    // gondola silnikowa wystająca spod płata
    ctx.fillStyle = P.topL;
    ctx.beginPath();
    ctx.moveTo(31, 4); ctx.quadraticCurveTo(29, -2.6, 19, -3.2);
    ctx.lineTo(-4, -0.6); ctx.quadraticCurveTo(-8, 5, -2, 9.6);
    ctx.lineTo(20, 10); ctx.quadraticCurveTo(30, 9.4, 31, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    ctx.beginPath(); ctx.moveTo(-2, 9.6); ctx.lineTo(20, 10); ctx.quadraticCurveTo(27, 9.6, 30, 6.4);
    ctx.lineTo(-1, 6.2); ctx.closePath(); ctx.fill();
    Art.radial(ctx, 28, 8.2);
    if (gear > 0.02) {
      ctx.fillStyle = '#2b2e27';
      ctx.fillRect(11, 9, 5, 8 * gear);
      ctx.fillStyle = '#17171a';
      ctx.beginPath(); ctx.arc(13.5, 9 + 9 * gear, 4.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(17.5, 9 + 9 * gear, 3.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3d3d40';
      ctx.beginPath(); ctx.arc(13.5, 9 + 9 * gear, 1.8, 0, TAU); ctx.fill();
    }
    // kadłub
    ctx.fillStyle = P.top;
    ctx.beginPath();
    ctx.moveTo(51, 1.2); ctx.quadraticCurveTo(48, -6.6, 34, -8.6);
    ctx.lineTo(0, -10); ctx.lineTo(-34, -6.6); ctx.lineTo(-60, -3); ctx.lineTo(-60, 2.6);
    ctx.lineTo(-32, 5.6); ctx.quadraticCurveTo(10, 8.4, 46, 5.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = P.bot;
    ctx.beginPath();
    ctx.moveTo(46, 5.2); ctx.quadraticCurveTo(10, 8.4, -32, 5.6); ctx.lineTo(-32, 4.3);
    ctx.quadraticCurveTo(10, 7.1, 46, 3.7); ctx.closePath(); ctx.fill();
    // oszklony nos bombardiera
    ctx.fillStyle = 'rgba(152,204,224,.62)';
    ctx.beginPath();
    ctx.moveTo(51, 1.2); ctx.quadraticCurveTo(48, -6.6, 36, -8.4);
    ctx.lineTo(36, 5.6); ctx.quadraticCurveTo(47, 5.2, 51, 1.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,40,46,.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(41, -7.8); ctx.lineTo(41, 5.4); ctx.moveTo(46, -6); ctx.lineTo(46, 5.2);
    ctx.moveTo(36, -8.4); ctx.lineTo(51, 1.2); ctx.stroke();
    // kabina pilotów
    ctx.fillStyle = 'rgba(152,204,224,.62)';
    ctx.beginPath();
    ctx.moveTo(30, -8.8); ctx.lineTo(26, -13.4); ctx.lineTo(12, -13.2); ctx.lineTo(9, -9.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,40,46,.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(20, -13.3); ctx.lineTo(20, -9.2); ctx.stroke();
    // wieżyczka grzbietowa
    ctx.fillStyle = '#4f5540';
    ctx.beginPath(); ctx.arc(-14, -9.6, 5, Math.PI, TAU); ctx.fill();
    ctx.strokeStyle = '#2f322a'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(-28, -16.4); ctx.stroke();
    // stanowisko dolne
    ctx.fillStyle = P.bot;
    ctx.beginPath(); ctx.moveTo(-12, 6.2); ctx.lineTo(-26, 5.6); ctx.quadraticCurveTo(-24, 10.6, -14, 10.4); ctx.closePath(); ctx.fill();
    // podwójne usterzenie pionowe na tapered stateczniku
    ctx.fillStyle = P.topD;
    ctx.beginPath(); ctx.moveTo(-40, -2.4); ctx.lineTo(-64, -4.6); ctx.lineTo(-64, -0.4); ctx.lineTo(-40, 1.8); ctx.closePath(); ctx.fill();
    // dwa stateczniki pionowe na końcach statecznika poziomego —
    // w rzucie bocznym dalszy jest nieco przesunięty i ciemniejszy
    for (const far of [true, false]) {
      const dx = far ? 3.4 : 0;
      ctx.fillStyle = far ? '#43412e' : P.topD;
      ctx.beginPath();
      ctx.moveTo(-49 + dx, -3);
      ctx.quadraticCurveTo(-53 + dx, -16.6, -60.5 + dx, -15.6);
      ctx.quadraticCurveTo(-62.5 + dx, -8, -62.5 + dx, -2.6);
      ctx.closePath(); ctx.fill();
      if (!far) Art.rudderFlash(ctx, -60.4, -3, -61.4, -14.6, 2.4);
    }
    Art.checker(ctx, -30, -8, 8);
    Art.checker(ctx, -42, -1.2, 6.6);
    Art.propDisc(ctx, 34, 16, (o.prop || 0) + 1.2, undefined, 3.4);
  },

  /* --- Messerschmitt Bf 109 E (dł. 8,64 m) --- */
  p_bf109(ctx, o) {
    const gear = o.gear ?? 0, G = Art.GER;
    Art.farWing(ctx, 13, -11, 3.2, -29, 6.8, 4.8, '#414a38');
    ctx.fillStyle = G.top;
    ctx.beginPath();
    ctx.moveTo(34, 0); ctx.quadraticCurveTo(32, -6.2, 22, -7.4);
    ctx.lineTo(-6, -7.8); ctx.lineTo(-26, -5); ctx.lineTo(-40, -2.4); ctx.lineTo(-40, 1.8);
    ctx.lineTo(-24, 4.6); ctx.quadraticCurveTo(6, 7, 30, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = G.bot;
    ctx.beginPath();
    ctx.moveTo(30, 4); ctx.quadraticCurveTo(6, 7, -24, 4.6); ctx.lineTo(-24, 2.8);
    ctx.quadraticCurveTo(6, 5, 30, 2.2); ctx.closePath(); ctx.fill();
    // żółty nos i kołpak
    ctx.fillStyle = '#e0b02a';
    ctx.beginPath(); ctx.moveTo(34, 0); ctx.quadraticCurveTo(32, -6.2, 26, -7); ctx.lineTo(26, 4.4);
    ctx.quadraticCurveTo(32, 3.6, 34, 0); ctx.closePath(); ctx.fill();
    // kabina
    ctx.fillStyle = 'rgba(160,205,225,.6)';
    ctx.beginPath(); ctx.moveTo(11, -7.8); ctx.lineTo(7, -12); ctx.lineTo(-4, -11.8); ctx.lineTo(-6, -7.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,40,46,.75)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(1, -11.9); ctx.lineTo(1, -7.8); ctx.stroke();
    ctx.fillStyle = G.topD;
    ctx.beginPath(); ctx.moveTo(-6, -8); ctx.quadraticCurveTo(-13, -8, -15, -4.6); ctx.lineTo(-6, -5); ctx.closePath(); ctx.fill();
    // usterzenie z podpórką
    ctx.fillStyle = G.topD;
    ctx.beginPath();
    ctx.moveTo(-27, -5.4); ctx.quadraticCurveTo(-36, -15.6, -43.5, -14.4);
    ctx.quadraticCurveTo(-42, -8, -40, -2.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = G.topD;
    ctx.beginPath(); ctx.moveTo(-30, -3.4); ctx.lineTo(-47, -6.6); ctx.lineTo(-47, -3.4); ctx.lineTo(-30, -0.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#33382e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-44, -5.6); ctx.lineTo(-42.6, -12.4); ctx.stroke();
    Art.propDisc(ctx, 36, 16, o.prop || 0);
    if (gear > 0.02) {
      ctx.strokeStyle = '#33332f'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(14, 4); ctx.lineTo(10, 4 + 9 * gear); ctx.stroke();
      ctx.fillStyle = '#17171a';
      ctx.beginPath(); ctx.arc(10, 5 + 9 * gear, 4, 0, TAU); ctx.fill();
    }
    Art.balken(ctx, -17, -5.4, 7.5);
    Art.balken(ctx, -27, 1.6, 6.4);
  },

  /* --- Junkers Ju 87 B „Stuka" (dł. 11,1 m) --- */
  p_stuka(ctx, o) {
    const G = Art.GER;
    // odwrócone skrzydło mewie: od kadłuba w dół, potem cięciwa
    // odwrócone skrzydło mewie: od kadłuba w dół, potem dalszy płat w tył
    Art.farWing(ctx, 8, -10, 6.4, -34, 8.6, 5.4, '#414a38');
    ctx.fillStyle = G.topD;
    ctx.beginPath();
    ctx.moveTo(12, 1); ctx.lineTo(4, 6.6); ctx.lineTo(-8, 6.6); ctx.lineTo(-10, 2.4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = G.top;
    ctx.beginPath();
    ctx.moveTo(42, 1); ctx.quadraticCurveTo(39, -7, 24, -8.6);
    ctx.lineTo(-8, -8.8); ctx.lineTo(-30, -5.6); ctx.lineTo(-52, -2.6); ctx.lineTo(-52, 2.4);
    ctx.lineTo(-28, 5.4); ctx.quadraticCurveTo(8, 8, 38, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = G.bot;
    ctx.beginPath();
    ctx.moveTo(38, 5); ctx.quadraticCurveTo(8, 8, -28, 5.4); ctx.lineTo(-28, 3.4);
    ctx.quadraticCurveTo(8, 6, 38, 2.8); ctx.closePath(); ctx.fill();
    // długa, kanciasta kabina dwumiejscowa
    ctx.fillStyle = 'rgba(150,198,220,.58)';
    ctx.beginPath();
    ctx.moveTo(24, -8.6); ctx.lineTo(20, -14.4); ctx.lineTo(-6, -14.2); ctx.lineTo(-9, -8.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(25,35,42,.8)'; ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(12, -14.3); ctx.lineTo(12, -9); ctx.moveTo(4, -14.3); ctx.lineTo(4, -8.9);
    ctx.moveTo(-2, -14.2); ctx.lineTo(-2, -8.8); ctx.stroke();
    ctx.strokeStyle = '#2c2f28'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-8, -9.4); ctx.lineTo(-22, -13.6); ctx.stroke();
    // usterzenie z zastrzałami
    ctx.fillStyle = G.topD;
    ctx.beginPath(); ctx.moveTo(-34, -5.6); ctx.lineTo(-52, -19.4); ctx.lineTo(-56, -16.4); ctx.lineTo(-52, -2.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-36, -2); ctx.lineTo(-58, -5.2); ctx.lineTo(-58, -1.8); ctx.lineTo(-36, 1.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#33382e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-53, -4.4); ctx.lineTo(-55, -15); ctx.stroke();
    // stałe podwozie w „spodenkach"
    // charakterystyczne „spodenki" stałego podwozia
    for (const [gx, sc] of [[12, 0.9], [5, 1.05]]) {
      ctx.fillStyle = sc > 1 ? '#414a38' : '#37402f';
      ctx.beginPath();
      ctx.moveTo(gx - 4.6 * sc, 6.6); ctx.quadraticCurveTo(gx - 6.6 * sc, 13, gx - 4 * sc, 17.4);
      ctx.lineTo(gx + 4 * sc, 17.4); ctx.quadraticCurveTo(gx + 6.6 * sc, 13, gx + 4.6 * sc, 6.6);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#17171a';
      ctx.beginPath(); ctx.arc(gx, 18.4, 4.4 * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3d3d40';
      ctx.beginPath(); ctx.arc(gx, 18.4, 1.7 * sc, 0, TAU); ctx.fill();
    }
    // silnik rzędowy + syrena
    ctx.fillStyle = '#31352c';
    ctx.beginPath(); ctx.ellipse(39, 1, 4.6, 6.4, 0, 0, TAU); ctx.fill();
    Art.propDisc(ctx, 43, 17.5, o.prop || 0);
    Art.balken(ctx, -22, -6, 8);
    Art.balken(ctx, -34, 2.4, 7);
  },

  /* --- Heinkel He 111 P (dł. 16,4 m) --- */
  p_he111(ctx, o) {
    const G = Art.GER;
    Art.farWing(ctx, 30, -16, 3.6, -56, 9, 7, '#414a38');
    // gondola silnikowa
    ctx.fillStyle = G.top;
    ctx.beginPath();
    ctx.moveTo(40, 3); ctx.quadraticCurveTo(38, -4, 26, -4.6);
    ctx.lineTo(-4, -2); ctx.lineTo(-4, 6.4); ctx.lineTo(28, 8.4);
    ctx.quadraticCurveTo(39, 8, 40, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f342b';
    ctx.beginPath(); ctx.ellipse(37, 3, 4.6, 6.6, 0, 0, TAU); ctx.fill();
    // kadłub
    ctx.fillStyle = G.top;
    ctx.beginPath();
    ctx.moveTo(64, 1.6); ctx.quadraticCurveTo(62, -7.4, 46, -9.6);
    ctx.lineTo(4, -11); ctx.lineTo(-40, -7.2); ctx.lineTo(-76, -3.2); ctx.lineTo(-76, 3);
    ctx.lineTo(-38, 6.2); ctx.quadraticCurveTo(14, 9.4, 58, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = G.bot;
    ctx.beginPath();
    ctx.moveTo(58, 6); ctx.quadraticCurveTo(14, 9.4, -38, 6.2); ctx.lineTo(-38, 3.8);
    ctx.quadraticCurveTo(14, 7, 58, 3.4); ctx.closePath(); ctx.fill();
    // charakterystyczny, w pełni oszklony nos
    ctx.fillStyle = 'rgba(152,204,224,.6)';
    ctx.beginPath();
    ctx.moveTo(64, 1.6); ctx.quadraticCurveTo(62, -7.4, 46, -9.4);
    ctx.lineTo(40, -9); ctx.lineTo(40, 6); ctx.quadraticCurveTo(57, 6, 64, 1.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,40,46,.65)'; ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(46, -9.4); ctx.lineTo(46, 6); ctx.moveTo(53, -8); ctx.lineTo(53, 6);
    ctx.moveTo(58, -5); ctx.lineTo(58, 6); ctx.stroke();
    // wieżyczka górna i gondola dolna
    ctx.fillStyle = G.topD;
    ctx.beginPath(); ctx.arc(-6, -10.8, 5.4, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = G.bot;
    ctx.beginPath(); ctx.moveTo(4, 7); ctx.lineTo(-18, 6.6); ctx.quadraticCurveTo(-16, 13.6, 2, 13); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2c2f28'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-14, 10.4); ctx.lineTo(-26, 13.4); ctx.stroke();
    // usterzenie
    ctx.fillStyle = G.topD;
    ctx.beginPath(); ctx.moveTo(-52, -6); ctx.quadraticCurveTo(-66, -22, -78, -19.6);
    ctx.quadraticCurveTo(-77, -10, -76, -3.2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-54, -2.2); ctx.lineTo(-82, -5.4); ctx.lineTo(-82, -1.4); ctx.lineTo(-54, 1.8); ctx.closePath(); ctx.fill();
    Art.balken(ctx, -34, -8, 10);
    Art.balken(ctx, -50, 2.4, 8.6);
    Art.propDisc(ctx, 46, 17, (o.prop || 0) + 0.8, undefined, 3);
  },

  /* --- Messerschmitt Bf 110 C (dł. 12,1 m) --- */
  p_bf110(ctx, o) {
    const G = Art.GER;
    Art.farWing(ctx, 22, -12, 3, -42, 7.4, 5.6, '#414a38');
    ctx.fillStyle = G.top;
    ctx.beginPath();
    ctx.moveTo(30, 2.4); ctx.quadraticCurveTo(28, -3.6, 17, -4.2);
    ctx.lineTo(-8, -1.8); ctx.lineTo(-8, 5.4); ctx.lineTo(19, 7);
    ctx.quadraticCurveTo(29, 6.8, 30, 2.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2f342b';
    ctx.beginPath(); ctx.ellipse(27, 2.4, 4.2, 5.8, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = G.top;
    ctx.beginPath();
    ctx.moveTo(48, 0.6); ctx.quadraticCurveTo(45, -6.4, 32, -7.6);
    ctx.lineTo(-2, -8.4); ctx.lineTo(-30, -5.4); ctx.lineTo(-56, -2.6); ctx.lineTo(-56, 2.2);
    ctx.lineTo(-28, 5.2); ctx.quadraticCurveTo(12, 7.8, 44, 4.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = G.bot;
    ctx.beginPath();
    ctx.moveTo(44, 4.6); ctx.quadraticCurveTo(12, 7.8, -28, 5.2); ctx.lineTo(-28, 3.2);
    ctx.quadraticCurveTo(12, 5.6, 44, 2.6); ctx.closePath(); ctx.fill();
    // długa oszklona kabina
    ctx.fillStyle = 'rgba(152,204,224,.6)';
    ctx.beginPath();
    ctx.moveTo(30, -7.6); ctx.lineTo(26, -12.8); ctx.lineTo(-2, -12.4); ctx.lineTo(-5, -8.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(28,40,46,.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(16, -12.7); ctx.lineTo(16, -8.2); ctx.moveTo(6, -12.6); ctx.lineTo(6, -8.4); ctx.stroke();
    ctx.strokeStyle = '#2c2f28'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-4, -8.8); ctx.lineTo(-18, -12.4); ctx.stroke();
    // podwójne usterzenie
    ctx.fillStyle = G.topD;
    ctx.beginPath(); ctx.moveTo(-38, -2.2); ctx.lineTo(-60, -4.4); ctx.lineTo(-60, -0.4); ctx.lineTo(-38, 1.8); ctx.closePath(); ctx.fill();
    for (const far of [true, false]) {
      const dx = far ? 3 : 0;
      ctx.fillStyle = far ? '#2f3629' : G.topD;
      ctx.beginPath();
      ctx.moveTo(-47 + dx, -2.8);
      ctx.quadraticCurveTo(-51 + dx, -14.6, -57.5 + dx, -13.8);
      ctx.quadraticCurveTo(-59 + dx, -7, -59 + dx, -2.2);
      ctx.closePath(); ctx.fill();
    }
    Art.balken(ctx, -24, -6.4, 8.6);
    Art.balken(ctx, -38, 2.6, 7.4);
    Art.propDisc(ctx, 32, 15.5, (o.prop || 0) + 0.6, undefined, 2.4);
  },

  /* --- Henschel Hs 126 (dł. 10,85 m) --- */
  p_hs126(ctx, o) {
    const G = Art.GER;
    // górnopłat na zastrzałach
    ctx.fillStyle = G.topD;
    ctx.beginPath(); ctx.moveTo(20, -14.4); ctx.lineTo(-16, -14.4); ctx.lineTo(-19, -11); ctx.lineTo(17, -11); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3d4436'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-10, -11.4); ctx.lineTo(-4, -3); ctx.moveTo(12, -11.4); ctx.lineTo(6, -3);
    ctx.moveTo(2, -11.2); ctx.lineTo(2, -7.6); ctx.stroke();
    ctx.fillStyle = G.top;
    ctx.beginPath();
    ctx.moveTo(36, 0); ctx.quadraticCurveTo(33, -6.4, 18, -7.6);
    ctx.lineTo(-14, -6); ctx.lineTo(-42, -2.6); ctx.lineTo(-42, 2); ctx.lineTo(-14, 5);
    ctx.quadraticCurveTo(8, 7, 32, 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = G.bot;
    ctx.beginPath();
    ctx.moveTo(32, 4); ctx.quadraticCurveTo(8, 7, -14, 5); ctx.lineTo(-14, 3);
    ctx.quadraticCurveTo(8, 5, 32, 2.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(150,198,220,.55)';
    ctx.beginPath(); ctx.moveTo(14, -7.6); ctx.lineTo(10, -11.2); ctx.lineTo(-6, -10.8); ctx.lineTo(-8, -6.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2c2f28'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-7, -7.4); ctx.lineTo(-19, -11.4); ctx.stroke();
    ctx.fillStyle = G.topD;
    ctx.beginPath(); ctx.moveTo(-28, -4.6); ctx.quadraticCurveTo(-38, -17, -45, -15.6);
    ctx.quadraticCurveTo(-43.6, -8, -42, -2.6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-30, -1.4); ctx.lineTo(-47, -3.8); ctx.lineTo(-47, -0.6); ctx.lineTo(-30, 1.6); ctx.closePath(); ctx.fill();
    Art.radial(ctx, 33, 7.4);
    Art.propDisc(ctx, 37, 17.5, o.prop || 0);
    ctx.fillStyle = '#3f4738';
    ctx.beginPath();
    ctx.moveTo(2, 5); ctx.quadraticCurveTo(-1, 11, 0, 14.6); ctx.lineTo(9, 14.6);
    ctx.quadraticCurveTo(11, 10, 8, 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#17171a';
    ctx.beginPath(); ctx.arc(4.4, 15.2, 4, 0, TAU); ctx.fill();
    Art.balken(ctx, -22, -4.6, 7.6);
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
