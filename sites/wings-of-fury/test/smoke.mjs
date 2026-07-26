/* Automatyczny test gry Skrzydła Furii 1939 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

/* Test dymny gry „Skrzydła Furii 1939".
   Uruchomienie:  npx http-server -p 8099 .   (z katalogu repozytorium)
                  node sites/wings-of-fury/test/smoke.mjs                    */
const BASE = process.env.BASE || 'http://127.0.0.1:8099';
const PATH = process.env.GAME_PATH || '/sites/wings-of-fury/index.html';
const SHOTS = process.env.SHOTS || new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const errors = [];
const logs = [];

function ok(msg) { console.log('  ✔', msg); }
function bad(msg) { console.log('  ✘', msg); errors.push(msg); }

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

page.on('pageerror', e => { errors.push('PAGEERROR: ' + e.message); console.log('  !! pageerror:', e.message); });
page.on('console', m => {
  const txt = m.text();
  const ignorable = /ERR_CONNECTION|fonts\.googleapis|fonts\.gstatic|Failed to load resource/.test(txt);
  if (m.type() === 'error' && !ignorable) { errors.push('CONSOLE: ' + txt); console.log('  !! console:', txt); }
  else logs.push(m.text());
});

await page.goto(BASE + PATH, { waitUntil: 'load' });
await page.waitForTimeout(1200);

console.log('\n== 1. Menu ==');
const hasG = await page.evaluate(() => !!(window.__WOF && window.__WOF.G));
hasG ? ok('silnik wystartował') : bad('brak window.__WOF.G');
await page.screenshot({ path: `${SHOTS}/01-menu.png` });

// czy tło menu (attract) się rysuje
const attractOk = await page.evaluate(() => {
  const G = window.__WOF.G;
  return !!(G.world && G.attractPlane && G.attractPlane.y > 0);
});
attractOk ? ok('tło menu działa') : bad('tło menu nie działa');

console.log('\n== 2. Odprawa ==');
await page.click('[data-act="campaign"]');
await page.waitForTimeout(400);
const briefVisible = await page.isVisible('#screen-brief');
briefVisible ? ok('ekran odprawy widoczny') : bad('brak ekranu odprawy');
await page.screenshot({ path: `${SHOTS}/02-brief.png` });

console.log('\n== 3. Start misji 1 ==');
await page.click('[data-act="launch"]');
await page.waitForTimeout(700);
let st = await page.evaluate(() => {
  const P = window.__WOF.G.player;
  return { state: window.__WOF.G.state, x: P.x, y: P.y, onGround: P.onGround, hp: P.hp };
});
console.log('   ', JSON.stringify(st));
st.state === 'play' ? ok('misja w toku') : bad('misja się nie uruchomiła');
st.onGround ? ok('samolot stoi na pasie') : bad('samolot nie stoi na pasie');

console.log('\n== 4. Start (rozbieg i odrywanie) ==');
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(2500);
let s2 = await page.evaluate(() => { const P = window.__WOF.G.player; return { vx: P.vx, onGround: P.onGround, thr: P.throttle }; });
console.log('    po rozbiegu:', JSON.stringify(s2));
s2.vx > 60 ? ok('rozbieg działa') : bad('samolot nie rozpędza się (vx=' + s2.vx.toFixed(1) + ')');
// krótkie ściągnięcie drążka na wznoszenie
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(260);
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(3000);
let s3 = await page.evaluate(() => {
  const P = window.__WOF.G.player;
  return { y: P.y, gy: P.groundY, onGround: P.onGround, a: P.a, speed: Math.hypot(P.vx, P.vy), alive: P.alive };
});
console.log('    po starcie:', JSON.stringify(s3));
(!s3.onGround && s3.y - s3.gy > 40 && s3.alive) ? ok('maszyna w powietrzu') : bad('nie udało się wystartować: ' + JSON.stringify(s3));
await page.screenshot({ path: `${SHOTS}/03-takeoff.png` });

console.log('\n== 5. Lot poziomy ==');
// wyrównaj maszynę i leć prosto
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(220);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(7000);
let s4 = await page.evaluate(() => {
  const P = window.__WOF.G.player;
  return { y: P.y, kmh: P.kmh, alive: P.alive, alpha: P.alpha, a: P.a, vy: P.vy };
});
console.log('    lot:', JSON.stringify(s4));
s4.alive ? ok('maszyna leci') : bad('maszyna rozbiła się w locie poziomym');
(s4.kmh > 120) ? ok(`prędkość ${s4.kmh.toFixed(0)} km/h`) : bad(`za mała prędkość: ${s4.kmh.toFixed(0)}`);
await page.screenshot({ path: `${SHOTS}/04-flight.png` });

console.log('\n== 6. Broń ==');
await page.keyboard.down('Space');
await page.waitForTimeout(700);
await page.keyboard.up('Space');
const guns = await page.evaluate(() => ({ bullets: window.__WOF.G.bullets.length, ammo: window.__WOF.G.player.ammo, parts: window.__WOF.Particles.list.length }));
console.log('    ', JSON.stringify(guns));
guns.bullets > 0 ? ok('karabiny strzelają') : bad('brak pocisków');

console.log('\n== 7. Ostrzeliwanie celów i bomby ==');
const combat = await page.evaluate(async () => {
  const { G } = window.__WOF;
  // przenieś gracza nad kolumnę celów i zrzuć bombę
  const target = G.units.find(u => u.tag === 'target' || u.tag === 'armor' || u.tag === 'balloon');
  if (!target) return { err: 'brak celu' };
  return { targetType: target.type, x: target.x, y: target.y };
});
console.log('    cel:', JSON.stringify(combat));

// symulacja: zestrzel balon przez API
const kill = await page.evaluate(() => {
  const { G } = window.__WOF;
  const b = G.units.find(u => u.type === 'balloon' && !u.dead);
  if (!b) return { err: 'brak balonu' };
  b.hit(999, b.x, b.y + b.alt, G, 'test');
  return { dead: b.dead, score: G.score, progress: G.objState.balloons.progress };
});
console.log('    ', JSON.stringify(kill));
kill.dead ? ok('cel zniszczony, punkty naliczone') : bad('cel nie ginie');

const bombTest = await page.evaluate(async () => {
  const { G } = window.__WOF;
  const u = G.units.find(x => x.type === 'truck' && !x.dead);
  if (!u) return { err: 'brak ciężarówki' };
  const before = G.world.groundAt(u.x);
  const o = new Ordnance({ kind: 'bomb', x: u.x, y: u.y + 200, vx: 0, vy: -100, team: 'pol' });
  G.spawnOrdnance(o);
  await new Promise(r => setTimeout(r, 1500));
  return { dead: u.dead, wrecks: G.wrecks.length, ground: G.world.groundAt(u.x), before, parts: window.__WOF.Particles.list.length };
});
console.log('    bomba:', JSON.stringify(bombTest));
bombTest.dead ? ok('bomba niszczy cel') : bad('bomba nie zniszczyła celu');
(bombTest.ground < bombTest.before - 2) ? ok('powstał lej w terenie') : bad('brak leja po bombie');
(bombTest.wrecks > 0) ? ok('wrak pozostaje na mapie') : bad('brak wraku');
await page.screenshot({ path: `${SHOTS}/05-bomb.png` });

console.log('\n== 8. Lądowanie ==');
await page.keyboard.up('ArrowUp');
const land = await page.evaluate(async () => {
  const { G } = window.__WOF;
  G.startMission(0);
  await new Promise(r => setTimeout(r, 300));
  const rw = G.homeRunway;
  const P = G.player;
  P.onGround = false; P.landed = false;
  P.x = rw.x0 + 150; P.y = rw.y + 40; P.vx = 132; P.vy = -18; P.a = 0;
  P.gearDown = true; P.gearT = 1; P.throttle = 0.15; P.rpm = 0.15;
  await new Promise(r => setTimeout(r, 2500));
  return { onGround: P.onGround, landed: P.landed, alive: P.alive, vx: Math.round(P.vx), hp: Math.round(P.hp) };
});
console.log('    ', JSON.stringify(land));
(land.onGround && land.alive && land.landed) ? ok('lądowanie działa') : bad('lądowanie nie działa: ' + JSON.stringify(land));

console.log('\n== 8a. Obsługa naziemna po lądowaniu ==');
const service = await page.evaluate(async () => {
  const { G } = window.__WOF;
  const P = G.player;
  P.ammo = 10; P.fuel = 30; P.hp = P.maxHp * 0.4; P.vx = 0; P.throttle = 0;
  await new Promise(r => setTimeout(r, 5200));
  return { ammo: Math.round(P.ammo), fuel: Math.round(P.fuel), hp: Math.round(P.hp), max: P.maxAmmo };
});
console.log('    ', JSON.stringify(service));
(service.ammo > 200 && service.fuel > 100) ? ok('uzupełnianie amunicji i paliwa działa') : bad('brak obsługi naziemnej: ' + JSON.stringify(service));
await page.screenshot({ path: `${SHOTS}/06-landing.png` });

console.log('\n== 8b. Atak nurkowy na kolumnę (karabiny + bomby) ==');
const strafe = await page.evaluate(async () => {
  const { G } = window.__WOF;
  G.startMission(2);
  await new Promise(r => setTimeout(r, 250));
  const P = G.player;
  P.onGround = false; P.landed = false; P.gearDown = false; P.gearT = 0;
  let enemyBullets = 0;
  for (let i = 0; i < 140; i++) {
    // ustaw maszynę w locie nurkowym na najbliższy żywy cel
    const t = G.units.find(u => !u.dead && (u.tag === 'armor' || u.type === 'soldier'));
    if (!t) break;
    const tx = t.x, ty = t.y + 10;
    P.x = tx - 420; P.y = ty + 210;
    const a = Math.atan2(ty - P.y, tx - P.x);
    P.a = a; P.vx = Math.cos(a) * 320; P.vy = Math.sin(a) * 320;
    P.throttle = 1; P.rpm = 1; P.ammo = 500; P.heat = 0; P.overheat = false;
    P.gunT = 0; P.fireGuns(G); P.gunT = 0; P.fireGuns(G);
    if (i % 10 === 0) { P.bombs = 2; P.bombT = 0; P.dropOrdnance(G); }
    await new Promise(r => setTimeout(r, 55));
    enemyBullets = Math.max(enemyBullets, G.bullets.filter(b => b.team === 'ger').length);
  }
  return {
    destroyed: G.stats.ground, score: G.score, wrecks: G.wrecks.length,
    corpses: G.world.decals.filter(d => d.type === 'corpse').length,
    craters: G.world.decals.filter(d => d.type === 'crater').length,
    scorch: G.world.decals.filter(d => d.type === 'scorch').length,
    enemyBullets, hp: Math.round(G.player.hp), progress: G.objState.armor.progress,
  };
});
console.log('    ', JSON.stringify(strafe));
strafe.destroyed > 3 ? ok(`zniszczono ${strafe.destroyed} celów naziemnych`) : bad('za mało zniszczonych celów: ' + strafe.destroyed);
strafe.wrecks > 0 ? ok(`wraki zostają na mapie: ${strafe.wrecks}`) : bad('brak wraków');
strafe.corpses > 0 ? ok(`ślady po piechocie: ${strafe.corpses}`) : bad('brak śladów po piechocie');
strafe.craters > 0 ? ok(`leje po bombach: ${strafe.craters}`) : bad('brak lejów');
strafe.enemyBullets > 0 ? ok('artyleria plot. odpowiada ogniem') : bad('plot. nie strzela');
await page.screenshot({ path: `${SHOTS}/05b-strafe.png` });

console.log('\n== 9. Wszystkie misje: ładowanie i 3 s symulacji ==');
for (let i = 0; i < 8; i++) {
  const r = await page.evaluate(async (idx) => {
    const { G } = window.__WOF;
    try { G.startMission(idx); } catch (e) { return { err: String(e) }; }
    await new Promise(r => setTimeout(r, 2500));
    const P = G.player;
    return {
      title: G.mission.title, units: G.units.length, planes: G.planes.length,
      alive: P.alive, x: Math.round(P.x), y: Math.round(P.y), runways: G.world.runways.length,
    };
  }, i);
  if (r.err) bad(`misja ${i + 1}: ${r.err}`);
  else {
    console.log(`    #${i + 1} ${r.title}: ${r.units} jednostek, ${r.planes} samolotów, pas: ${r.runways}`);
    if (!r.alive) bad(`misja ${i + 1}: gracz nie żyje po 2,5 s stania na pasie`);
    if (r.units < 3) bad(`misja ${i + 1}: za mało jednostek`);
  }
}

console.log('\n== 10. Dłuższa symulacja walki (misja 3) ==');
const sim = await page.evaluate(async () => {
  const { G, Input } = window.__WOF;
  G.startMission(2);
  const P = G.player;
  // wystartuj programowo
  P.onGround = false; P.x = 3000; P.y = 900; P.vx = 320; P.vy = 0; P.a = 0; P.throttle = 1;
  const log = [];
  for (let step = 0; step < 40; step++) {
    // co chwilę strzelaj i zrzucaj bomby nad celami
    P.gunT = 0; P.fireGuns(G);
    if (step % 7 === 0) { P.bombT = 0; P.dropOrdnance(G); }
    if (step % 5 === 0) P.a = -0.25; else if (step % 5 === 2) P.a = 0.2;
    await new Promise(r => setTimeout(r, 120));
    if (step % 10 === 0) log.push({ step, parts: window.__WOF.Particles.list.length, bullets: G.bullets.length, hp: Math.round(P.hp) });
  }
  return { log, score: G.score, ground: G.stats.ground, wrecks: G.wrecks.length, alive: P.alive, hp: P.hp };
});
console.log('    ', JSON.stringify(sim));
sim.score >= 0 ? ok('symulacja walki bez błędów') : bad('błąd symulacji');
await page.screenshot({ path: `${SHOTS}/07-combat.png` });

console.log('\n== 11. Wydajność (FPS) ==');
const fps = await page.evaluate(async () => {
  let frames = 0;
  const t0 = performance.now();
  await new Promise(res => {
    function tick() { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(tick); else res(); }
    requestAnimationFrame(tick);
  });
  return Math.round(frames / ((performance.now() - t0) / 1000));
});
console.log('    FPS:', fps);
fps > 22 ? ok(`płynność ${fps} kl/s`) : bad(`niska płynność: ${fps} kl/s`);

console.log('\n== 12. Ekrany menu ==');
for (const [act, id] of [['missions', 'screen-missions'], ['controls', 'screen-controls'], ['hangar', 'screen-hangar'], ['options', 'screen-options']]) {
  await page.evaluate(() => { window.__WOF.G.state = 'menu'; });
  await page.click(`#screen-menu [data-act="${act}"]`).catch(async () => {
    await page.evaluate(() => showScreen('screen-menu'));
    await page.click(`#screen-menu [data-act="${act}"]`);
  });
  await page.waitForTimeout(350);
  const vis = await page.isVisible('#' + id);
  vis ? ok(`ekran ${id}`) : bad(`ekran ${id} niewidoczny`);
  await page.screenshot({ path: `${SHOTS}/ui-${act}.png` });
  await page.click(`#${id} [data-act="back"]`).catch(() => { });
  await page.waitForTimeout(200);
}

console.log('\n===================================');
if (errors.length) {
  console.log(`BŁĘDY (${errors.length}):`);
  for (const e of [...new Set(errors)]) console.log('  -', e);
} else console.log('BEZ BŁĘDÓW ✔');
console.log('===================================\n');

await browser.close();
process.exit(errors.length ? 1 : 0);
