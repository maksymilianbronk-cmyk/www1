/* =========================================================================
   Kampania wrześniowa — scenariusze misji
   ========================================================================= */
'use strict';

/** Skróty pomocnicze przy rozstawianiu jednostek. */
function U(G, type, x, o = {}) { return G.addUnit(Object.assign({ type, x }, o)); }
function column(G, type, x0, count, gap, o = {}) {
  const arr = [];
  for (let i = 0; i < count; i++) arr.push(U(G, type, x0 + i * gap, o));
  return arr;
}
function squad(G, x0, count, o = {}) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(U(G, chance(0.12) ? 'officer' : 'soldier', x0 + rnd(count * 26, 0), Object.assign({
      patrol: [x0 - 160, x0 + count * 30 + 160],
    }, o)));
  }
  return arr;
}
function village(G, x0, n) {
  for (let i = 0; i < n; i++) U(G, 'house', x0 + i * rnd(120, 70), { tag: 'house' });
}

const MISSIONS = [
  /* =================== 1. SZKOLENIE =================== */
  {
    id: 1, title: 'Szkolenie bojowe', place: 'Dęblin, Szkoła Orląt', date: '20 sierpnia 1939',
    plane: 'pws26', medalPar: [1200, 2200, 3200],
    brief: 'Ostatnie ćwiczenia przed wojną. Instruktor wypuścił balony na uwięzi i rozstawił makiety. ' +
      'Wystartuj, zestrzel wszystkie balony, ostrzelaj makiety i wróć na lotnisko. ' +
      'Zapamiętaj: strzałkami w lewo i w prawo obracasz maszynę, strzałką w górę dodajesz gazu.',
    world: { seed: 101, width: 7200, baseHeight: 240, relief: 46, treeDensity: 0.5, time: 'day', ceiling: 2600 },
    setup(G) {
      const W = G.world;
      W.addRunway(700, 1900, 240, { name: 'Dęblin' });
      U(G, 'hangar', 560, { team: 'pol', tag: 'own' });
      U(G, 'hangar', 2120, { team: 'pol', tag: 'own' });
      U(G, 'radio', 2320, { team: 'pol', tag: 'own' });
      village(G, 3000, 3);
      for (let i = 0; i < 5; i++) {
        U(G, 'balloon', 3200 + i * 620, { alt: 420 + rnd(300, 0), tag: 'balloon', team: 'ger' });
      }
      for (let i = 0; i < 6; i++) U(G, 'truck', 4200 + i * 260, { tag: 'target', speed: 0, team: 'ger' });
      G.playerStart = { x: 900, y: 240, grounded: true };
    },
    objectives: [
      { id: 'balloons', text: 'Zestrzel 5 balonów ćwiczebnych', type: 'destroyTag', tag: 'balloon', count: 5 },
      { id: 'targets', text: 'Ostrzelaj 4 makiety pojazdów', type: 'destroyTag', tag: 'target', count: 4 },
      { id: 'land', text: 'Wróć i wyląduj w Dęblinie', type: 'land' },
    ],
  },

  /* =================== 2. PIERWSZY DZIEŃ WOJNY =================== */
  {
    id: 2, title: 'Pierwszy dzień', place: 'lotnisko Balice pod Krakowem', date: '1 września 1939, 5:30',
    plane: 'p7a', medalPar: [2200, 3600, 5000],
    brief: 'O świcie Luftwaffe uderzyła na polskie lotniska. Nad Balicami krążą Ju 87. ' +
      'Poderwij P.7a, rozbij wyprawę bombową i nie daj im zniszczyć naszych hangarów.',
    world: { seed: 202, width: 8200, baseHeight: 250, relief: 70, treeDensity: 0.5, time: 'dawn', ceiling: 2800 },
    setup(G) {
      const W = G.world;
      W.addRunway(900, 2300, 250, { name: 'Balice' });
      G.protect = [];
      G.protect.push(U(G, 'hangar', 700, { team: 'pol', tag: 'own' }));
      G.protect.push(U(G, 'hangar', 2500, { team: 'pol', tag: 'own' }));
      U(G, 'depot', 2760, { team: 'pol', tag: 'own' });
      U(G, 'flak', 620, { team: 'pol', tag: 'ownflak' });
      U(G, 'flak', 2660, { team: 'pol', tag: 'ownflak' });
      squad(G, 1000, 6, { team: 'pol', color: '#4b5238', helmet: '#4a5040' });
      village(G, 3600, 4);
      village(G, 6000, 3);
      G.playerStart = { x: 1050, y: 250, grounded: true };
    },
    objectives: [
      { id: 'stukas', text: 'Zestrzel 4 bombowce nurkujące Ju 87', type: 'killPlane', key: 'stuka', count: 4 },
      { id: 'fighters', text: 'Odpędź eskortę — zestrzel 2 Bf 109', type: 'killPlane', key: 'bf109', count: 2 },
      { id: 'land', text: 'Wyląduj na macierzystym lotnisku', type: 'land' },
    ],
    waves: [
      { t: 4, fn: G => { G.toast('Wieża: Sztukasy nad lotniskiem! Start natychmiast!'); Audio2.alarm(); } },
      { t: 14, fn: G => { G.spawnFriendly('p7a', { x: 1400, y: 700, dir: 1 }); G.toast('Skrzydłowy w powietrzu — trzymaj się blisko'); } },
      { t: 8, fn: G => { for (let i = 0; i < 2; i++) G.spawnEnemy('stuka', { x: 5200 + i * 420, y: 1250, dir: -1, ai: 'stuka', targetX: 1600 }); } },
      { t: 34, fn: G => { for (let i = 0; i < 2; i++) G.spawnEnemy('stuka', { x: 5600 + i * 400, y: 1350, dir: -1, ai: 'stuka', targetX: 2400 }); } },
      { t: 58, fn: G => { G.spawnEnemy('bf109', { x: 6200, y: 1500, dir: -1, ai: 'fighter' }); G.toast('Uwaga — myśliwce eskorty!'); } },
      { t: 84, fn: G => { G.spawnEnemy('bf109', { x: 400, y: 1400, dir: 1, ai: 'fighter' }); } },
      { t: 120, fn: G => { G.spawnEnemy('stuka', { x: 5800, y: 1300, dir: -1, ai: 'stuka', targetX: 2000 }); } },
    ],
  },

  /* =================== 3. KOLUMNA PANCERNA =================== */
  {
    id: 3, title: 'Kolumna pancerna', place: 'szosa pod Wieluniem', date: '2 września 1939',
    plane: 'p11c', medalPar: [3000, 4800, 6600],
    brief: 'Niemiecka kolumna pancerna prze na wschód, a nasza piechota nie ma czym jej zatrzymać. ' +
      'Zejdź nisko, rozbij czołgi i ciężarówki. Uwaga na stanowiska przeciwlotnicze w kolumnie.',
    world: { seed: 303, width: 10000, baseHeight: 235, relief: 60, treeDensity: 0.62, time: 'day', ceiling: 2800 },
    setup(G) {
      const W = G.world;
      W.addRunway(600, 1800, 235, { name: 'lotnisko polowe' });
      U(G, 'hangar', 480, { team: 'pol', tag: 'own' });
      U(G, 'depot', 2000, { team: 'pol', tag: 'own' });
      village(G, 2600, 3);
      // kolumna
      column(G, 'tank', 4200, 4, 300, { tag: 'armor', dir: -1, speed: 26, patrol: [3400, 8600] });
      column(G, 'truck', 5600, 5, 210, { tag: 'armor', dir: -1, speed: 46, patrol: [3400, 8800] });
      U(G, 'tank', 7400, { tag: 'armor', dir: -1, speed: 22, patrol: [3400, 8600] });
      U(G, 'tank', 7900, { tag: 'armor', dir: -1, speed: 24, patrol: [3400, 8600] });
      U(G, 'flak', 4900, { tag: 'aa' });
      U(G, 'flak', 6400, { tag: 'aa' });
      U(G, 'flak88', 7100, { tag: 'aa' });
      squad(G, 4500, 8);
      squad(G, 6100, 8);
      squad(G, 7600, 6);
      village(G, 8800, 4);
      G.playerStart = { x: 760, y: 235, grounded: true };
    },
    objectives: [
      { id: 'armor', text: 'Zniszcz 8 pojazdów kolumny', type: 'destroyTag', tag: 'armor', count: 8 },
      { id: 'aa', text: 'Ucisz 2 stanowiska przeciwlotnicze', type: 'destroyTag', tag: 'aa', count: 2 },
      { id: 'land', text: 'Wróć i wyląduj', type: 'land' },
    ],
    waves: [
      { t: 70, fn: G => { G.spawnEnemy('hs126', { x: 9000, y: 900, dir: -1, ai: 'recon' }); G.toast('Nad kolumną krąży samolot obserwacyjny'); } },
      { t: 130, fn: G => { G.spawnEnemy('bf109', { x: 9400, y: 1400, dir: -1, ai: 'fighter' }); G.warn('Myśliwce przeciwnika!'); } },
    ],
  },

  /* =================== 4. MOST NA WARCIE =================== */
  {
    id: 4, title: 'Most na Warcie', place: 'przeprawa pod Sieradzem', date: '4 września 1939',
    plane: 'karas', medalPar: [3400, 5200, 7200],
    brief: 'Saperzy nie zdążyli wysadzić przeprawy. Zniszcz most bombami, zanim przejdzie po nim dywizja pancerna. ' +
      'Karaś dźwiga sześć bomb — celuj nisko, ale uważaj na artylerię plot. przy przyczółkach.',
    world: {
      seed: 404, width: 10500, baseHeight: 250, relief: 54, treeDensity: 0.55, time: 'day', ceiling: 2800,
      sea: true, seaSpans: [[5000, 5900, 150]],
    },
    setup(G) {
      const W = G.world;
      W.addRunway(700, 2000, 250, { name: 'lotnisko polowe' });
      U(G, 'hangar', 560, { team: 'pol', tag: 'own' });
      village(G, 2600, 4);
      // most nad rzeką
      const bx = 5450;
      W.flatten(5200, 5700, 30);
      const br = U(G, 'bridge', bx, { tag: 'bridge', y: 30 });
      br.y = 30;
      U(G, 'flak88', 5000, { tag: 'aa' });
      U(G, 'flak88', 5950, { tag: 'aa' });
      U(G, 'flak', 4700, { tag: 'aa' });
      U(G, 'flak', 6250, { tag: 'aa' });
      U(G, 'bunker', 4500, { tag: 'aa' });
      column(G, 'truck', 6600, 5, 190, { tag: 'convoy', dir: -1, speed: 40, patrol: [6000, 9200] });
      column(G, 'tank', 7700, 3, 250, { tag: 'convoy', dir: -1, speed: 24, patrol: [6000, 9200] });
      squad(G, 6300, 8);
      squad(G, 4300, 6);
      village(G, 8600, 4);
      G.playerStart = { x: 820, y: 250, grounded: true };
    },
    objectives: [
      { id: 'bridge', text: 'Zniszcz most', type: 'destroyTag', tag: 'bridge', count: 1 },
      { id: 'aa', text: 'Zniszcz 2 działa przeciwlotnicze przy przeprawie', type: 'destroyTag', tag: 'aa', count: 2 },
      { id: 'land', text: 'Wróć i wyląduj', type: 'land' },
    ],
    waves: [
      { t: 100, fn: G => { G.spawnEnemy('bf109', { x: 10100, y: 1500, dir: -1, ai: 'fighter' }); G.warn('Myśliwiec przeciwnika nad przeprawą!'); } },
      { t: 190, fn: G => { G.spawnEnemy('bf109', { x: 300, y: 1500, dir: 1, ai: 'fighter' }); } },
    ],
  },

  /* =================== 5. LOTNISKO POLOWE LUFTWAFFE =================== */
  {
    id: 5, title: 'Gniazdo os', place: 'polowe lotnisko Luftwaffe pod Radomiem', date: '6 września 1939',
    plane: 'karas', medalPar: [4200, 6400, 8600],
    brief: 'Rozpoznanie zlokalizowało polowe lotnisko, z którego startują Sztukasy. Zniszcz maszyny na ziemi, ' +
      'cysterny paliwa i hangary. Lotnisko jest silnie bronione — wchodź nisko i nie krąż nad celem.',
    world: { seed: 505, width: 11000, baseHeight: 245, relief: 40, treeDensity: 0.45, time: 'day', ceiling: 2900 },
    setup(G) {
      const W = G.world;
      W.addRunway(600, 1800, 245, { name: 'lotnisko macierzyste' });
      U(G, 'hangar', 470, { team: 'pol', tag: 'own' });
      village(G, 2600, 3);

      // lotnisko wroga
      W.flatten(6000, 8400, 240);
      for (let i = 0; i < 5; i++) {
        U(G, 'parked', 6300 + i * 380, { tag: 'parked', dir: 1, planeKey: i % 2 ? 'stuka' : 'bf109' });
      }
      U(G, 'hangar', 6200, { tag: 'building' });
      U(G, 'hangar', 7900, { tag: 'building' });
      U(G, 'fuel', 7000, { tag: 'fuelt' });
      U(G, 'fuel', 7180, { tag: 'fuelt' });
      U(G, 'depot', 8250, { tag: 'building' });
      U(G, 'radio', 8500, { tag: 'building' });
      U(G, 'flak', 5900, { tag: 'aa' });
      U(G, 'flak', 6700, { tag: 'aa' });
      U(G, 'flak', 7600, { tag: 'aa' });
      U(G, 'flak88', 8600, { tag: 'aa' });
      U(G, 'flak88', 5600, { tag: 'aa' });
      squad(G, 6500, 10);
      squad(G, 7700, 8);
      column(G, 'truck', 6900, 3, 150, { speed: 0, tag: 'building' });
      village(G, 9600, 3);
      G.playerStart = { x: 760, y: 245, grounded: true };
    },
    objectives: [
      { id: 'parked', text: 'Zniszcz 4 samoloty na ziemi', type: 'destroyTag', tag: 'parked', count: 4 },
      { id: 'fuelt', text: 'Wysadź cysterny paliwa', type: 'destroyTag', tag: 'fuelt', count: 2 },
      { id: 'aa', text: 'Ucisz 3 stanowiska przeciwlotnicze', type: 'destroyTag', tag: 'aa', count: 3 },
      { id: 'land', text: 'Wróć i wyląduj', type: 'land' },
    ],
    waves: [
      { t: 60, fn: G => { G.spawnEnemy('bf109', { x: 9500, y: 1200, dir: -1, ai: 'fighter' }); G.warn('Poderwały się myśliwce!'); } },
      { t: 140, fn: G => { G.spawnEnemy('bf109', { x: 10200, y: 1400, dir: -1, ai: 'fighter' }); } },
      { t: 230, fn: G => { G.spawnEnemy('bf110', { x: 10500, y: 1600, dir: -1, ai: 'fighter' }); G.warn('Bf 110 — uwaga na siłę ognia!'); } },
    ],
  },

  /* =================== 6. OBRONA WARSZAWY =================== */
  {
    id: 6, title: 'Niebo nad Warszawą', place: 'Brygada Pościgowa, Okęcie', date: '8 września 1939',
    plane: 'p11c', medalPar: [4600, 7000, 9500],
    brief: 'Wyprawa Heinkli leci na Warszawę. Brygada Pościgowa ma ostatnie sprawne maszyny. ' +
      'Rozbij bombowce, zanim dolecą nad miasto. Osłaniają je Messerschmitty.',
    world: { seed: 606, width: 11500, baseHeight: 230, relief: 34, treeDensity: 0.32, time: 'overcast', ceiling: 3200 },
    setup(G) {
      const W = G.world;
      W.addRunway(900, 2300, 230, { name: 'Okęcie' });
      U(G, 'hangar', 700, { team: 'pol', tag: 'own' });
      U(G, 'hangar', 2500, { team: 'pol', tag: 'own' });
      U(G, 'flak', 640, { team: 'pol', tag: 'ownflak' });
      U(G, 'flak', 2600, { team: 'pol', tag: 'ownflak' });
      U(G, 'radio', 2900, { team: 'pol', tag: 'own' });
      // miasto do obrony
      G.protect = [];
      for (let i = 0; i < 10; i++) {
        const h = U(G, 'house', 3400 + i * 150, { team: 'pol', tag: 'city' });
        G.protect.push(h);
      }
      U(G, 'depot', 5100, { team: 'pol', tag: 'city' });
      squad(G, 3600, 8, { team: 'pol', color: '#4b5238' });
      G.playerStart = { x: 1050, y: 230, grounded: true };
    },
    objectives: [
      { id: 'bombers', text: 'Zestrzel 5 bombowców He 111', type: 'killPlane', key: 'he111', count: 5 },
      { id: 'fighters', text: 'Zestrzel 3 myśliwce osłony', type: 'killPlane', key: 'bf109', count: 3 },
      { id: 'city', text: 'Nie pozwól zniszczyć więcej niż 5 budynków miasta', type: 'protectTag', tag: 'city', maxLost: 5 },
      { id: 'land', text: 'Wyląduj na Okęciu', type: 'land' },
    ],
    waves: [
      { t: 5, fn: G => { G.toast('Dowództwo: wyprawa bombowa na kursie 270. Start!'); Audio2.alarm(); } },
      { t: 20, fn: G => { for (let i = 0; i < 2; i++) G.spawnEnemy('he111', { x: 10800 + i * 500, y: 1800, dir: -1, ai: 'bomber', targetX: 3900 + i * 300, alt: 1800 }); } },
      { t: 30, fn: G => { G.spawnFriendly('p11c', { x: 2600, y: 1100, dir: 1 }); G.toast('Klucz por. Skalskiego dołącza do walki'); } },
      { t: 55, fn: G => { G.spawnEnemy('bf109', { x: 10600, y: 2000, dir: -1, ai: 'fighter' }); } },
      { t: 95, fn: G => { G.spawnFriendly('p11c', { x: 2400, y: 1300, dir: 1 }); } },
      { t: 80, fn: G => { for (let i = 0; i < 2; i++) G.spawnEnemy('he111', { x: 11000 + i * 460, y: 1900, dir: -1, ai: 'bomber', targetX: 4200 + i * 260, alt: 1900 }); } },
      { t: 110, fn: G => { G.spawnEnemy('bf109', { x: 11200, y: 2100, dir: -1, ai: 'fighter' }); } },
      { t: 150, fn: G => { G.spawnEnemy('he111', { x: 11200, y: 1750, dir: -1, ai: 'bomber', targetX: 4000, alt: 1750 }); } },
      { t: 175, fn: G => { G.spawnEnemy('bf109', { x: 400, y: 2000, dir: 1, ai: 'fighter' }); } },
      { t: 215, fn: G => { for (let i = 0; i < 2; i++) G.spawnEnemy('he111', { x: 11000 + i * 420, y: 1850, dir: -1, ai: 'bomber', targetX: 3700 + i * 400, alt: 1850 }); } },
    ],
  },

  /* =================== 7. ATAK TORPEDOWY =================== */
  {
    id: 7, title: 'Wilcze stado', place: 'Zatoka Gdańska', date: '12 września 1939',
    plane: 'los', medalPar: [5200, 7800, 10500],
    brief: 'Niemieckie transportowce dowożą zaopatrzenie dla wojsk oblegających Hel, osłania je niszczyciel. ' +
      'Łoś zabiera dwie torpedy i osiem bomb. Torpedę zrzucaj nisko nad wodą, w linii prostej. ' +
      'Po ataku siadaj na pokładzie okrętu-bazy albo na polowym lotnisku na wyspie — jak wolisz.',
    world: {
      seed: 707, width: 12000, baseHeight: 230, relief: 40, treeDensity: 0.35, time: 'day', ceiling: 3000,
      sea: true, seaSpans: [[3000, 11400, 420]], islands: [{ x: 9000, w: 1500, h: 150 }],
    },
    setup(G) {
      const W = G.world;
      W.addRunway(700, 2100, 230, { name: 'Puck' });
      U(G, 'hangar', 560, { team: 'pol', tag: 'own' });
      U(G, 'flak', 2300, { team: 'pol', tag: 'ownflak' });
      village(G, 2500, 2);

      // lotniskowiec-baza (na kotwicy)
      const carrier = U(G, 'carrier', 4300, { team: 'pol', tag: 'own', len: 340, dir: 1 });
      carrier.y = 0;
      const deck = W.addRunway(4300 - 168, 4300 + 168, 30, { name: 'pokład', deck: true, carrier });
      G.carrier = carrier; G.deck = deck;

      // konwój
      U(G, 'transport', 7200, { tag: 'ships', speed: 26, dir: 1, patrol: [6200, 10200] });
      U(G, 'transport', 8000, { tag: 'ships', speed: 24, dir: 1, patrol: [6200, 10200] });
      U(G, 'destroyer', 6600, { tag: 'escort', speed: 34, dir: 1, patrol: [5600, 10600] });
      // wyspa: zdobyte lotnisko polowe (można na nim lądować) i bateria nadbrzeżna
      W.addRunway(8560, 9240, 140, { name: 'lotnisko na wyspie', island: true });
      U(G, 'hangar', 8460, { team: 'pol', tag: 'own' });
      U(G, 'flak88', 9700, { tag: 'shore' });
      U(G, 'flak', 9950, { tag: 'shore' });
      U(G, 'bunker', 10150, { tag: 'shore' });
      squad(G, 9800, 6);
      G.playerStart = { x: 850, y: 230, grounded: true };
    },
    objectives: [
      { id: 'ships', text: 'Zatop 2 transportowce (najlepiej torpedami)', type: 'destroyTag', tag: 'ships', count: 2 },
      { id: 'escort', text: 'Zatop niszczyciel osłony', type: 'destroyTag', tag: 'escort', count: 1 },
      { id: 'land', text: 'Wyląduj na pokładzie lotniskowca albo na lotnisku na wyspie', type: 'land', deckOrIsland: true },
    ],
    waves: [
      { t: 90, fn: G => { G.spawnEnemy('bf109', { x: 11600, y: 1400, dir: -1, ai: 'fighter' }); G.warn('Myśliwce znad morza!'); } },
      { t: 190, fn: G => { G.spawnEnemy('bf110', { x: 11800, y: 1600, dir: -1, ai: 'fighter' }); } },
    ],
  },

  /* =================== 8. OSTATNI LOT =================== */
  {
    id: 8, title: 'Ostatni lot', place: 'przyczółek nad Bugiem', date: '16 września 1939',
    plane: 'los', medalPar: [6500, 9500, 13000],
    brief: 'Zostały nam trzy Łosie i jedna szansa. Transport kolejowy z amunicją, przeprawa i baterie plot. ' +
      'Zrób z tego zgliszcza — a potem wracaj. To ostatnie lotnisko, jakie mamy.',
    world: {
      seed: 808, width: 13000, baseHeight: 240, relief: 66, treeDensity: 0.5, time: 'dusk', ceiling: 3200,
      sea: true, seaSpans: [[8200, 9000, 160]],
    },
    setup(G) {
      const W = G.world;
      W.addRunway(700, 2200, 240, { name: 'lotnisko zapasowe' });
      U(G, 'hangar', 540, { team: 'pol', tag: 'own' });
      U(G, 'flak', 2400, { team: 'pol', tag: 'ownflak' });
      village(G, 2800, 3);

      // stacja kolejowa
      W.flatten(4600, 6200, 230);
      const loco = U(G, 'train', 5000, { tag: 'train', dir: 1, speed: 0 });
      for (let i = 1; i <= 4; i++) U(G, 'wagon', 5000 + i * 120, { tag: 'train', dir: 1, flak: i === 2 });
      U(G, 'depot', 5800, { tag: 'depot' });
      U(G, 'depot', 6000, { tag: 'depot' });
      U(G, 'flak', 4700, { tag: 'aa' });
      U(G, 'flak88', 6300, { tag: 'aa' });
      squad(G, 5400, 10);

      // przeprawa
      W.flatten(8300, 8900, 30);
      U(G, 'bridge', 8600, { tag: 'bridge', y: 30 });
      U(G, 'flak88', 8150, { tag: 'aa' });
      U(G, 'flak', 9050, { tag: 'aa' });
      U(G, 'bunker', 9300, { tag: 'aa' });
      column(G, 'tank', 9700, 4, 260, { tag: 'armor', dir: -1, speed: 24, patrol: [9200, 12200] });
      column(G, 'truck', 10800, 4, 190, { tag: 'armor', dir: -1, speed: 44, patrol: [9200, 12400] });
      squad(G, 9800, 10);
      village(G, 11800, 4);
      G.playerStart = { x: 820, y: 240, grounded: true };
    },
    objectives: [
      { id: 'train', text: 'Zniszcz transport kolejowy (lokomotywa + 3 wagony)', type: 'destroyTag', tag: 'train', count: 4 },
      { id: 'depot', text: 'Wysadź składy amunicji', type: 'destroyTag', tag: 'depot', count: 2 },
      { id: 'bridge', text: 'Zerwij przeprawę', type: 'destroyTag', tag: 'bridge', count: 1 },
      { id: 'armor', text: 'Rozbij 5 pojazdów kolumny', type: 'destroyTag', tag: 'armor', count: 5 },
      { id: 'land', text: 'Wróć i wyląduj — ostatni raz', type: 'land' },
    ],
    waves: [
      { t: 70, fn: G => { G.spawnEnemy('bf109', { x: 12600, y: 1500, dir: -1, ai: 'fighter' }); G.warn('Myśliwce!'); } },
      { t: 150, fn: G => { G.spawnEnemy('bf109', { x: 300, y: 1500, dir: 1, ai: 'fighter' }); } },
      { t: 165, fn: G => { G.spawnFriendly('p11c', { x: 2000, y: 1200, dir: 1 }); G.toast('Osłona myśliwska nad przeprawą'); } },
      { t: 210, fn: G => { G.spawnEnemy('bf110', { x: 12800, y: 1700, dir: -1, ai: 'fighter' }); } },
      { t: 280, fn: G => { G.spawnEnemy('stuka', { x: 12400, y: 1400, dir: -1, ai: 'stuka', targetX: 1400 }); G.warn('Sztukasy lecą na nasze lotnisko!'); } },
      { t: 330, fn: G => { G.spawnEnemy('bf109', { x: 12900, y: 1600, dir: -1, ai: 'fighter' }); } },
    ],
  },
];

/** Kolejność maszyn w hangarze. */
const HANGAR_ORDER = ['pws26', 'p7a', 'p11c', 'karas', 'los', 'bf109', 'stuka', 'he111', 'bf110', 'hs126'];
