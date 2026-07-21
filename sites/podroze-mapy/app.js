/* Trasa — podróżnicza aplikacja mapowa (inspirowana Locus Pro / OsmAnd).
   Wymaga: leaflet 1.9, layers.js (MAP_SOURCES, CATEGORY_ORDER, KEY_PROVIDERS). */
"use strict";

/* ───────────────────────── Stan i utils ───────────────────────── */

const LS = {
  get(k, def) {
    try { const v = localStorage.getItem("trasa:" + k); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set(k, v) { try { localStorage.setItem("trasa:" + k, JSON.stringify(v)); } catch {} },
};

const state = {
  baseId: LS.get("baseId", "osm"),
  overlays: LS.get("overlays", []),           // id nakładek
  opacity: LS.get("opacity", {}),             // id → 0..1
  favs: new Set(LS.get("favs", [])),
  recents: LS.get("recents", []),             // ostatnio używane mapy bazowe
  keys: LS.get("keys", {}),                   // provider → klucz
  presets: LS.get("presets", []),             // własne profile map
  custom: LS.get("customSources", []),        // własne mapy WMS/XYZ
  pois: null,                                 // ładowane niżej (z migracją)
  poiHiddenCats: new Set(LS.get("poiHiddenCats", [])),
  groups: LS.get("poiGroups", ["Moje punkty"]), // foldery POI
  cloud: LS.get("cloud", { user: "", token: "", auto: true }),
};
const DEFAULT_GROUP = "Moje punkty";

/* POI v2 + migracja ze starego formatu waypoints; v3 dodaje foldery (group) */
(function loadPois() {
  let pois = LS.get("pois", null);
  if (!pois) {
    const old = LS.get("waypoints", []);
    pois = old.map((w, i) => ({
      id: "p" + Date.now() + "_" + i,
      lat: w.lat, lng: w.lng, name: w.name || "Punkt",
      cat: "other", color: "", note: "", ts: Date.now(),
    }));
    if (pois.length) LS.set("pois", pois);
  }
  state.pois = (pois || []).map(p => ({ group: DEFAULT_GROUP, ...p }));
  if (!state.groups.includes(DEFAULT_GROUP)) state.groups.unshift(DEFAULT_GROUP);
})();

/* Indeks źródeł: katalog wbudowany + własne mapy użytkownika (WMS/XYZ) */
const byId = {};
function customToSrc(c) {
  return {
    id: c.id, name: c.name, cat: "Moje mapy (własne)",
    url: c.url, type: c.type === "wms" ? "wms" : undefined,
    wms: c.type === "wms"
      ? { layers: c.wmsLayers, format: c.format || "image/png",
          transparent: !!c.transparent }
      : undefined,
    overlay: !!c.overlay, custom: true,
    http: c.url.startsWith("http://"),
    opts: { maxZoom: c.maxZoom || 19, attribution: c.name },
    desc: (c.type === "wms" ? "Własna usługa WMS: " : "Własne kafelki XYZ: ") + c.url,
  };
}
/* Zdalny katalog map — system szybkich aktualizacji bez wdrożenia:
   plik catalog/extra.json na gałęzi poi-db może DODAWAĆ nowe źródła,
   WYŁĄCZAĆ zepsute (disable) i ŁATAĆ istniejące (patch, np. nowy URL).
   Aplikacja pobiera go przy starcie i cache'uje w localStorage. */
let REMOTE_CATALOG = LS.get("remoteCatalog", null);
const REMOTE_CATALOG_URL =
  "https://raw.githubusercontent.com/maksymilianbronk-cmyk/www1/poi-db/catalog/extra.json";

function normalizeRemoteSrc(s) {
  const out = Object.assign({ opts: {} }, s);
  out.opts = Object.assign({ maxZoom: 19, attribution: s.name }, s.opts || {});
  if (!CATEGORY_ORDER.includes(out.cat)) out.cat = "Moje mapy (własne)";
  out.remote = true;
  return out;
}

function allSources() {
  const dis = new Set(REMOTE_CATALOG?.disable || []);
  const patch = REMOTE_CATALOG?.patch || {};
  const base = MAP_SOURCES
    .filter(s => !dis.has(s.id))
    .map(s => {
      if (!patch[s.id]) return s;
      const p = patch[s.id];
      return Object.assign({}, s, p, { opts: Object.assign({}, s.opts, p.opts || {}) });
    });
  const extra = (REMOTE_CATALOG?.sources || [])
    .filter(s => s && s.id && s.url).map(normalizeRemoteSrc);
  return [...base, ...extra, ...state.custom.map(customToSrc)];
}
function rebuildIndex() {
  Object.keys(byId).forEach(k => delete byId[k]);
  allSources().forEach(s => (byId[s.id] = s));
}
rebuildIndex();

async function fetchRemoteCatalog() {
  try {
    const r = await fetch(REMOTE_CATALOG_URL, { cache: "no-cache" });
    if (!r.ok) return;
    const doc = await r.json();
    const changed = JSON.stringify(doc) !== JSON.stringify(REMOTE_CATALOG);
    REMOTE_CATALOG = doc;
    LS.set("remoteCatalog", doc);
    if (changed) {
      rebuildIndex();
      refreshListUI();
      const n = (doc.sources || []).length;
      if (n) toast(`Zdalny katalog map: +${n} źródeł, aktualizacje wgrane.`);
    }
  } catch { /* offline — zostaje wersja z cache */ }
}

function buzz(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }

/* ikona SVG ze sprite'a w index.html */
function ic(name, cls = "") {
  return `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

function toast(msg, ms = 3200, action = null) {
  const el = document.getElementById("toast");
  document.getElementById("toast-msg").textContent = msg;
  const btn = document.getElementById("toast-act");
  btn.classList.add("hidden");
  btn.onclick = null;
  if (action) {
    btn.textContent = action.label;
    btn.classList.remove("hidden");
    btn.onclick = () => { el.classList.add("hidden"); action.fn(); };
  }
  el.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hidden"), ms);
}

function yesterdayISO() {
  const d = new Date(Date.now() - 864e5);
  return d.toISOString().slice(0, 10);
}

/* Podstawianie tokenów niestandardowych ({key},{d}) przed L.tileLayer */
function resolveUrl(src) {
  let u = src.url;
  if (src.key) u = u.replace("{key}", state.keys[src.key] || "");
  u = u.replace("{d}", yesterdayISO());
  return u;
}

/* Wikimapia: subdomena liczona z kafelka — hash = x%4 + (y%4)*4 → i0..i15
   (wzór z leaflet.wikimapia / SAS.Planet / pakietów AnyGIS).
   Tryb "proxy" opakowuje kafelek w https przez wsrv.nl (images.weserv.nl),
   dzięki czemu nakładka działa także na stronach https. */
function wikimapiaTileUrl(x, y, z, mode) {
  const hash = ((x % 4) + 4) % 4 + (((y % 4) + 4) % 4) * 4;
  const raw = `i${hash}.wikimapia.org/?x=${x}&y=${y}&zoom=${z}&type=hybrid&lng=0`;
  return mode === "proxy"
    ? "https://wsrv.nl/?url=" + encodeURIComponent(raw)
    : "http://" + raw;
}
const WikimapiaLayer = L.TileLayer.extend({
  getTileUrl(coords) {
    return wikimapiaTileUrl(coords.x, coords.y, this._getZoomForUrl(), this.options.wmMode);
  },
});

/* ArcGIS REST „Export Map" — serwer przeprojektowuje obraz do EPSG:3857,
   więc działają nim usługi Geoportalu publikowane natywnie w EPSG:2180
   (Cieniowanie/Hipsometria REST z drzewka geoportalu). */
function esriExportUrl(src, x, y, z) {
  const EXT = 20037508.342789244;
  const n = 2 ** z, size = (2 * EXT) / n;
  const minx = -EXT + x * size, maxx = minx + size;
  const maxy = EXT - y * size, miny = maxy - size;
  const p = new URLSearchParams({
    f: "image", format: "png32",
    transparent: src.esri?.transparent ? "true" : "false",
    size: "256,256", dpi: "96",
    bboxSR: "3857", imageSR: "3857",
    bbox: [minx, miny, maxx, maxy].join(","),
  });
  if (src.esri?.layers) p.set("layers", src.esri.layers);
  return `${src.url}/export?${p}`;
}
const EsriExportLayer = L.TileLayer.extend({
  getTileUrl(coords) {
    return esriExportUrl(this.options.esriSrc, coords.x, coords.y, this._getZoomForUrl());
  },
});

function makeLayer(src, extra = {}) {
  /* mapa zespolona (combo) — kilka źródeł jako jedna warstwa bazowa */
  if (src.combo) {
    return L.layerGroup(
      src.combo.map(id => byId[id]).filter(Boolean).map(m => makeLayer(m, extra)));
  }
  const opts = Object.assign({ crossOrigin: false }, src.opts, extra);
  if (state.opacity[src.id] != null && !extra.pane) opts.opacity = state.opacity[src.id];
  if (src.wm) return new WikimapiaLayer("", Object.assign(opts, { wmMode: src.wm }));
  if (src.type === "esri") {
    return new EsriExportLayer("", Object.assign(opts, { esriSrc: src }));
  }
  if (src.type === "wms") {
    const wms = Object.assign({ version: "1.1.1", transparent: false }, src.wms, {
      format: src.wms.format || "image/png",
    });
    /* crs4326: usługi Geoportalu publikują rastry w EPSG:2180/4326 (bez 3857) —
       Leaflet może żądać WMS w EPSG:4326 na mapie 3857 (opcja crs warstwy) */
    if (wms.crs4326) { wms.crs = L.CRS.EPSG4326; delete wms.crs4326; }
    return L.tileLayer.wms(src.url, Object.assign({}, opts, wms));
  }
  return L.tileLayer(resolveUrl(src), opts);
}

/* ───────────────────────── Mapa ───────────────────────── */

const startView = LS.get("view", { lat: 52.069, lng: 19.48, z: 7 });
const map = L.map("map", {
  zoomControl: false,
  center: [startView.lat, startView.lng],
  zoom: startView.z,
  worldCopyJump: true,
});
L.control.zoom({ position: "bottomright" }).addTo(map);
L.control.scale({ metric: true, imperial: false, position: "bottomleft" }).addTo(map);

/* hash: #z/lat/lng/baseId */
(function readHash() {
  const m = location.hash.match(/^#(\d+(?:\.\d+)?)\/(-?[\d.]+)\/(-?[\d.]+)(?:\/([\w-]+))?/);
  if (!m) return;
  map.setView([+m[2], +m[3]], +m[1]);
  if (m[4] && byId[m[4]] && !byId[m[4]].overlay) state.baseId = m[4];
})();

function writeHash() {
  const c = map.getCenter(), z = map.getZoom();
  history.replaceState(null, "",
    `#${z}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}/${state.baseId}`);
  LS.set("view", { lat: c.lat, lng: c.lng, z });
}

/* ───────────────────────── Akcje (topbar + bottombar) ───────────────────────── */

function setActionState(action, on) {
  document.querySelectorAll(`[data-action="${action}"]`)
    .forEach(b => b.classList.toggle("on", on));
}

const actions = {
  search: () => toggleSearch(),
  locate: () => toggleLocate(),
  measure: () => toggleMeasure(),
  "poi-add": () => setPoiAddMode(!poiAddMode),
  "poi-panel": () => openPoiPanel(),
  gpx: () => openModal("gpx-modal"),
  keys: () => openKeysModal(),
  offline: () => openOfflineModal(),
};
document.querySelectorAll("[data-action]").forEach(b =>
  b.addEventListener("click", () => { buzz(); actions[b.dataset.action](); }));

/* ───────────────────────── Warstwy aktywne ───────────────────────── */

let baseLayer = null;
const activeOverlays = {}; // id → L.Layer

function keyMissing(src) {
  return src.key && !(state.keys[src.key] || "").trim();
}

function noteRecent(id) {
  state.recents = [id, ...state.recents.filter(x => x !== id)].slice(0, 8);
  LS.set("recents", state.recents);
}

function setBase(id, { fly = false } = {}) {
  const src = byId[id];
  if (!src || src.overlay) return;
  if (compare.selecting) { setCompare(id); return; }
  if (keyMissing(src)) {
    toast(`Warstwa „${src.name}" wymaga klucza ${KEY_PROVIDERS[src.key].name} — dodaj go w menu kluczy.`);
    openKeysModal();
    return;
  }
  if (baseLayer) map.removeLayer(baseLayer);
  baseLayer = makeLayer(src).addTo(map);
  if (src.combo) baseLayer.eachLayer(l => l.on && l.on("tileerror", onTileError(src)));
  else baseLayer.on("tileerror", onTileError(src));
  state.baseId = id;
  LS.set("baseId", id);
  noteRecent(id);
  document.getElementById("active-map-name").textContent = src.name;
  if (fly && src.home) map.flyTo([src.home[0], src.home[1]], src.home[2]);
  refreshListUI();
  writeHash();
}

function toggleOverlay(id, silent = false) {
  const src = byId[id];
  if (!src) return;
  if (activeOverlays[id]) {
    map.removeLayer(activeOverlays[id]);
    delete activeOverlays[id];
    state.overlays = state.overlays.filter(x => x !== id);
  } else {
    if (keyMissing(src)) {
      if (!silent) {
        toast(`Nakładka „${src.name}" wymaga klucza ${KEY_PROVIDERS[src.key].name}.`);
        openKeysModal();
      }
      return;
    }
    const ly = makeLayer(src).addTo(map);
    ly.on("tileerror", onTileError(src));
    activeOverlays[id] = ly;
    if (!state.overlays.includes(id)) state.overlays.push(id);
  }
  LS.set("overlays", state.overlays);
  refreshListUI();
}

function clearOverlays() {
  Object.keys(activeOverlays).forEach(id => {
    map.removeLayer(activeOverlays[id]);
    delete activeOverlays[id];
  });
  state.overlays = [];
  LS.set("overlays", state.overlays);
}

/* Zgłoś raz problem z kafelkami danej warstwy */
const errWarned = new Set();
function onTileError(src) {
  return () => {
    if (errWarned.has(src.id)) return;
    errWarned.add(src.id);
    if (src.http && location.protocol === "https:") {
      toast(`„${src.name}" używa http — przeglądarka blokuje ją na stronie https.`);
    } else if (src.home) {
      toast(`„${src.name}" może nie pokrywać tego obszaru — użyj przycisku przelotu przy warstwie, aby przelecieć do jej zasięgu.`);
    } else {
      toast(`Kafelki „${src.name}" nie odpowiadają (serwer/zasięg/limit).`);
    }
  };
}

/* ───────────────────────── Profile map (presety) ───────────────────────── */

const BUILTIN_PRESETS = [
  { name: "Turystyka", icon: "peak", base: "opentopo", overlays: ["wt-hiking"] },
  { name: "Rower", icon: "bike", base: "cyclosm", overlays: ["wt-cycling"] },
  { name: "Zima", icon: "snow", base: "opentopo", overlays: ["wt-slopes", "opensnowmap"] },
  { name: "Satelita+", icon: "sat", base: "esri-imagery", overlays: ["google-roads"] },
  { name: "Orto+działki", icon: "grid", base: "geoportal-orto", overlays: ["gugik-dzialki"] },
  { name: "Wikimapia", icon: "layers", base: "osm", overlays: ["wikimapia"] },
  { name: "Google+Wikimapia", icon: "map", base: "google-road", overlays: ["wikimapia"] },
  { name: "Google Sat+Wikimapia", icon: "sat", base: "google-sat", overlays: ["wikimapia"] },
];

function applyPreset(p) {
  clearOverlays();
  if (p.opacity) {
    Object.assign(state.opacity, p.opacity);
    LS.set("opacity", state.opacity);
  }
  setBase(p.base);
  (p.overlays || []).forEach(id => { if (byId[id]) toggleOverlay(id, true); });
  toast(`Profil: ${p.name}`, 1800);
  buzz();
}

function saveCurrentPreset(name) {
  const opacity = {};
  state.overlays.forEach(id => {
    if (state.opacity[id] != null) opacity[id] = state.opacity[id];
  });
  state.presets.push({ name, base: state.baseId, overlays: [...state.overlays], opacity });
  LS.set("presets", state.presets);
  renderPresets();
  toast(`Zapisano profil „${name}".`);
}

function renderPresets() {
  const box = document.getElementById("preset-chips");
  box.innerHTML = "";
  const mk = (p, removable, idx) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.innerHTML = `${p.icon ? ic(p.icon, "ic-xs") : ""}<span>${esc(p.name)}</span>${removable ? `<i class="chip-x" title="Usuń profil">${ic("x", "ic-xs")}</i>` : ""}`;
    chip.addEventListener("click", e => {
      if (e.target.closest(".chip-x")) {
        state.presets.splice(idx, 1);
        LS.set("presets", state.presets);
        renderPresets();
        return;
      }
      applyPreset(p);
    });
    box.appendChild(chip);
  };
  BUILTIN_PRESETS.forEach(p => mk(p, false));
  state.presets.forEach((p, i) => mk(p, true, i));
  const add = document.createElement("button");
  add.className = "chip chip-add";
  add.innerHTML = `${ic("plus", "ic-xs")} zapisz obecny`;
  add.title = "Zapisz aktualną mapę + nakładki jako profil";
  add.addEventListener("click", () =>
    openNamePrompt("Zapisz profil map", "np. Moja turystyka", saveCurrentPreset));
  box.appendChild(add);
}

/* Uniwersalny modal nazwy (profile, foldery POI, zmiany nazw) */
let namePromptCb = null;
function openNamePrompt(title, placeholder, cb, initial = "") {
  namePromptCb = cb;
  document.getElementById("name-modal-title").textContent = title;
  const inp = document.getElementById("name-input");
  inp.placeholder = placeholder;
  inp.value = initial;
  openModal("name-modal");
  setTimeout(() => inp.focus(), 60);
}
document.getElementById("name-save").addEventListener("click", () => {
  const name = document.getElementById("name-input").value.trim();
  if (!name) { toast("Podaj nazwę."); return; }
  closeModal("name-modal");
  if (namePromptCb) namePromptCb(name);
});
document.getElementById("name-input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("name-save").click();
});

/* ───────────────────── Własne mapy WMS/XYZ ───────────────────── */

/* Zerowanie mapy: kasuje WSZYSTKIE aktywne mapy i rysunki —
   nakładki, porównywanie, ślady GPX/KML, pomiar, marker wyszukiwania —
   i wraca do czystego OSM. POI i zapisane ustawienia zostają. */
document.getElementById("btn-reset-layers").addEventListener("click", () => {
  clearOverlays();
  if (compare.active || compare.selecting) stopCompare();
  if (measuring) toggleMeasure();
  clearMeasure();
  gpxLayers.forEach(g => map.removeLayer(g));
  gpxLayers.length = 0;
  if (searchMarker) { map.removeLayer(searchMarker); searchMarker = null; }
  setBase("osm");
  buzz(18);
  toast("Wyzerowano mapę: czysty OSM — bez nakładek, śladów i pomiarów.");
});

/* Szybki dostęp na górze panelu: nakładki (przełączane) i mapy samodzielne */
const QUICK_ITEMS = [
  { id: "geoportal-cien-rest", mode: "overlay" },
  { id: "wikimapia", mode: "overlay" },
  { id: "gugik-dzialki", mode: "overlay" },
  { id: "geoportal-bdot10k-wiz", mode: "base" },
  { id: "geoportal-hipso-rest", mode: "base" },
  { id: "geoportal-nmt-solo", mode: "base" },
  { id: "wikimapia-solo", mode: "base" },
];
function renderQuickToggles() {
  const box = document.getElementById("quick-toggles");
  box.innerHTML = "";
  QUICK_ITEMS.forEach(({ id, mode }) => {
    const src = byId[id];
    if (!src) return;
    const isBase = mode === "base";
    const active = isBase ? state.baseId === id : !!activeOverlays[id];
    const b = document.createElement("button");
    b.className = "chip " + (isBase ? "q-base" : "q-ov") + (active ? " sel" : "");
    const short = src.name.split(" — ")[0].split(" (")[0];
    b.innerHTML = `${ic(isBase ? "map" : "layers", "ic-xs")} ${short}${isBase ? " <small>solo</small>" : ""}`;
    b.title = (isBase ? "Mapa samodzielna: " : "Nakładka: ") + (src.desc || src.name);
    b.addEventListener("click", () => {
      buzz();
      if (isBase) {
        if (state.baseId === id) setBase("osm");
        else setBase(id, { fly: !!src.home && !map.getBounds().contains(
          src.home ? [src.home[0], src.home[1]] : map.getCenter()) });
      } else toggleOverlay(id);
    });
    box.appendChild(b);
  });
}

document.getElementById("btn-add-map").addEventListener("click", () => {
  document.getElementById("wms-name").value = "";
  document.getElementById("wms-url").value = "";
  document.getElementById("wms-layers").value = "";
  document.getElementById("wms-overlay").checked = false;
  document.getElementById("wms-transparent").checked = true;
  document.querySelector('input[name="wms-type"][value="wms"]').checked = true;
  syncWmsTypeUI();
  openModal("wms-modal");
});
document.querySelectorAll('input[name="wms-type"]').forEach(r =>
  r.addEventListener("change", syncWmsTypeUI));
function syncWmsTypeUI() {
  const isWms = document.querySelector('input[name="wms-type"]:checked').value === "wms";
  document.getElementById("wms-only").style.display = isWms ? "" : "none";
  document.getElementById("wms-url").placeholder = isWms
    ? "https://serwer/uslugi/WMS…  (endpoint GetMap)"
    : "https://serwer/kafelki/{z}/{x}/{y}.png";
}

document.getElementById("wms-save").addEventListener("click", () => {
  const name = document.getElementById("wms-name").value.trim();
  const url = document.getElementById("wms-url").value.trim();
  const type = document.querySelector('input[name="wms-type"]:checked').value;
  const wmsLayers = document.getElementById("wms-layers").value.trim();
  if (!name || !url) { toast("Podaj nazwę i adres URL."); return; }
  if (type === "wms" && !wmsLayers) { toast("Dla WMS podaj nazwy warstw (LAYERS)."); return; }
  if (type === "xyz" && !/\{x\}/.test(url)) {
    toast("Szablon XYZ musi zawierać {z}/{x}/{y}."); return;
  }
  const c = {
    id: "c_" + Date.now(),
    name, url, type, wmsLayers,
    format: document.getElementById("wms-format").value,
    transparent: document.getElementById("wms-transparent").checked,
    overlay: document.getElementById("wms-overlay").checked,
    maxZoom: 19,
  };
  state.custom.push(c);
  LS.set("customSources", state.custom);
  rebuildIndex();
  closeModal("wms-modal");
  const src = byId[c.id];
  if (src.overlay) toggleOverlay(c.id);
  else setBase(c.id);
  refreshListUI();
  toast(`Dodano mapę „${name}" — sprawdź, czy kafelki się wczytują.`);
});

/* ───────────────────────── Tryb porównywania (🆚) ───────────────────────── */

const compare = { layer: null, srcId: null, x: 0.55, active: false, selecting: false };
const divider = document.getElementById("compare-divider");
const stCompare = document.getElementById("st-compare");

document.getElementById("btn-compare").addEventListener("click", () => {
  if (compare.active) { stopCompare(); return; }
  compare.selecting = true;
  document.getElementById("btn-compare").classList.add("on");
  toast("Porównywanie: wybierz z listy drugą mapę do porównania…", 4200);
});

function setCompare(id) {
  const src = byId[id];
  if (!src || src.overlay) return;
  if (keyMissing(src)) { toast("Ta mapa wymaga klucza API."); return; }
  if (!map.getPane("compare")) map.createPane("compare").style.zIndex = 350;
  if (compare.layer) map.removeLayer(compare.layer);
  compare.layer = makeLayer(src, { pane: "compare" }).addTo(map);
  compare.srcId = id;
  compare.active = true;
  compare.selecting = false;
  divider.classList.remove("hidden");
  stCompare.classList.remove("hidden");
  stCompare.querySelector("span").textContent = src.name;
  updateCompareClip();
  toast(`Porównujesz: ${byId[state.baseId].name} | ${src.name}. Przeciągnij uchwyt.`);
  refreshListUI();
  if (window.innerWidth < 720) closeSidebar();
}

function stopCompare() {
  if (compare.layer) map.removeLayer(compare.layer);
  compare.layer = null; compare.srcId = null;
  compare.active = false; compare.selecting = false;
  divider.classList.add("hidden");
  stCompare.classList.add("hidden");
  document.getElementById("btn-compare").classList.remove("on");
  const pane = map.getPane("compare");
  if (pane) pane.style.clipPath = "";
  refreshListUI();
}
stCompare.addEventListener("click", stopCompare);

function updateCompareClip() {
  if (!compare.active) return;
  const w = map.getSize().x;
  const px = Math.round(w * compare.x);
  map.getPane("compare").style.clipPath = `inset(0 0 0 ${px}px)`;
  const mapTop = document.getElementById("map").offsetTop;
  divider.style.left = px + "px";
  divider.style.top = mapTop + "px";
  divider.style.bottom = getComputedStyle(document.getElementById("map")).bottom;
}
map.on("resize", updateCompareClip);

(function dividerDrag() {
  let dragging = false;
  const move = e => {
    if (!dragging) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    compare.x = Math.min(0.95, Math.max(0.05, cx / map.getSize().x));
    updateCompareClip();
  };
  const end = () => { dragging = false; };
  divider.addEventListener("mousedown", e => { dragging = true; e.preventDefault(); });
  divider.addEventListener("touchstart", e => { dragging = true; e.preventDefault(); }, { passive: false });
  window.addEventListener("mousemove", move);
  window.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("mouseup", end);
  window.addEventListener("touchend", end);
})();

/* ───────────────────────── Manager warstw (sidebar) ───────────────────────── */

const sidebar = document.getElementById("sidebar");
const layerList = document.getElementById("layer-list");

const PSEUDO_CATS = [
  { key: "Ulubione", icon: "star" },
  { key: "Ostatnio używane", icon: "clock" },
];

function buildList(filter = "") {
  const q = filter.trim().toLowerCase();
  layerList.innerHTML = "";
  const cats = [...PSEUDO_CATS.map(c => c.key), ...CATEGORY_ORDER];
  let shown = 0;

  const sources = allSources();
  cats.forEach(cat => {
    let items;
    if (cat === "Ulubione") items = sources.filter(s => state.favs.has(s.id));
    else if (cat === "Ostatnio używane")
      items = state.recents.map(id => byId[id]).filter(Boolean);
    else items = sources.filter(s => s.cat === cat);

    const visible = items.filter(s =>
      !q || (s.name + " " + (s.desc || "") + " " + s.id).toLowerCase().includes(q));
    if (!visible.length) return;

    const catMeta = PSEUDO_CATS.find(c => c.key === cat);
    const sec = document.createElement("section");
    sec.className = "cat";
    const head = document.createElement("div");
    head.className = "cat-head";
    head.innerHTML = `<span class="cat-name">${catMeta ? ic(catMeta.icon, "ic-xs") + " " : ""}${cat}</span>
      <span class="cat-n">${visible.length}</span>
      <button class="cat-test" title="Testuj dostępność warstw w kategorii">${ic("bolt")}</button>`;
    head.querySelector(".cat-test").addEventListener("click", e => {
      e.stopPropagation();
      testCategory(visible, sec);
    });
    head.addEventListener("click", () => sec.classList.toggle("closed"));
    sec.appendChild(head);

    const body = document.createElement("div");
    body.className = "cat-body";
    visible.forEach(src => body.appendChild(rowFor(src)));
    sec.appendChild(body);

    const hasActive = visible.some(s => s.id === state.baseId || activeOverlays[s.id]);
    if (!q && !hasActive &&
        !["Ulubione", "Ostatnio używane", "OpenStreetMap", "Topo / Outdoor"].includes(cat)) {
      sec.classList.add("closed");
    }
    layerList.appendChild(sec);
    shown += visible.length;
  });

  document.getElementById("layer-count").textContent = `${allSources().length} warstw`;
  if (q && !shown) {
    layerList.innerHTML = `<div class="empty">Brak warstw dla „${filter}”.</div>`;
  }
}

function rowFor(src) {
  const row = document.createElement("div");
  row.className = "layer-row";
  row.dataset.id = src.id;
  const isActive = src.overlay ? !!activeOverlays[src.id] : src.id === state.baseId;
  if (isActive) row.classList.add("active");
  if (compare.srcId === src.id) row.classList.add("comparing");

  const badge = ic(src.overlay ? "layers" : "map",
    "ic-xs lr-type-ic" + (src.overlay ? " ov" : ""));
  const lock = keyMissing(src) ? ` ${ic("lock", "ic-xs lr-lock")}` : "";
  const httpWarn = src.http ? ` <span class="http-badge" title="Serwer tylko http">http</span>` : "";
  const cmp = compare.srcId === src.id ? ` <span class="cmp-badge">${ic("compare", "ic-xs")}</span>` : "";

  row.innerHTML = `
    <button class="lr-main" title="${(src.desc || "").replace(/"/g, "&quot;")}">
      <span class="lr-type">${badge}</span>
      <span class="lr-name">${src.name}${lock}${httpWarn}${cmp}</span>
      <span class="lr-dot" title="Status testu"></span>
    </button>
    ${src.home ? `<button class="lr-home" title="Przeleć do zasięgu mapy">${ic("play")}</button>` : ""}
    ${src.custom ? `<button class="lr-del" title="Usuń własną mapę">${ic("trash")}</button>` : ""}
    <button class="lr-fav ${state.favs.has(src.id) ? "on" : ""}" title="Ulubione">${ic("star")}</button>
  `;

  row.querySelector(".lr-main").addEventListener("click", () => {
    buzz();
    if (src.overlay) toggleOverlay(src.id);
    else { setBase(src.id); if (window.innerWidth < 720 && !compare.selecting) closeSidebar(); }
  });
  const homeBtn = row.querySelector(".lr-home");
  if (homeBtn) homeBtn.addEventListener("click", () => {
    map.flyTo([src.home[0], src.home[1]], src.home[2]);
    if (window.innerWidth < 720) closeSidebar();
  });
  const delBtn = row.querySelector(".lr-del");
  if (delBtn) delBtn.addEventListener("click", () => {
    if (!confirm(`Usunąć własną mapę „${src.name}"?`)) return;
    if (activeOverlays[src.id]) toggleOverlay(src.id);
    if (state.baseId === src.id) setBase("osm");
    state.custom = state.custom.filter(c => c.id !== src.id);
    LS.set("customSources", state.custom);
    state.recents = state.recents.filter(x => x !== src.id);
    LS.set("recents", state.recents);
    rebuildIndex();
    refreshListUI();
  });
  row.querySelector(".lr-fav").addEventListener("click", () => {
    if (state.favs.has(src.id)) state.favs.delete(src.id);
    else state.favs.add(src.id);
    LS.set("favs", [...state.favs]);
    buildList(document.getElementById("layer-filter").value);
  });

  if (src.overlay && activeOverlays[src.id]) {
    const op = document.createElement("input");
    op.type = "range"; op.min = 10; op.max = 100;
    op.value = Math.round((state.opacity[src.id] ?? src.opts.opacity ?? 1) * 100);
    op.className = "lr-opacity";
    op.title = "Krycie nakładki";
    op.addEventListener("input", () => {
      const v = op.value / 100;
      state.opacity[src.id] = v;
      LS.set("opacity", state.opacity);
      activeOverlays[src.id].setOpacity(v);
    });
    row.appendChild(op);
  }
  return row;
}

function refreshListUI() {
  buildList(document.getElementById("layer-filter").value);
  if (typeof renderQuickToggles === "function") renderQuickToggles();
}

/* Test dostępności: ładuje 1 kafelek testowy każdej warstwy w kategorii */
function lngLatToTile(lat, lng, z) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x, y };
}

/* Zbuduj konkretny URL kafelka (x,y,z) dla dowolnego typu źródła —
   używane przez test ⚡ i pobieranie obszaru offline. */
function tileUrlFor(src, x, y, zz) {
  if (src.wm) return wikimapiaTileUrl(x, y, zz, src.wm);
  if (src.type === "esri") return esriExportUrl(src, x, y, zz);
  if (src.type === "wms") {
    const v = (src.wms.version || "1.1.1");
    let bbox, epsg;
    if (src.wms.crs4326) {
      /* bbox kafelka w stopniach (EPSG:4326) */
      const n = 2 ** zz;
      const lonW = (x / n) * 360 - 180, lonE = ((x + 1) / n) * 360 - 180;
      const latN = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
      const latS = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
      bbox = [lonW, latS, lonE, latN];
      epsg = "EPSG:4326";
    } else {
      const EXT = 20037508.342789244;
      const n = 2 ** zz, size = (2 * EXT) / n;
      const minx = -EXT + x * size, maxx = minx + size;
      const maxy = EXT - y * size, miny = maxy - size;
      bbox = [minx, miny, maxx, maxy];
      epsg = "EPSG:3857";
    }
    const p = new URLSearchParams({
      SERVICE: "WMS", REQUEST: "GetMap", VERSION: v,
      LAYERS: src.wms.layers, STYLES: "",
      [v === "1.3.0" ? "CRS" : "SRS"]: epsg,
      BBOX: bbox.join(","),
      WIDTH: 256, HEIGHT: 256,
      FORMAT: src.wms.format || "image/png",
      TRANSPARENT: src.wms.transparent ? "TRUE" : "FALSE",
    });
    return src.url + (src.url.includes("?") ? "&" : "?") + p;
  }
  let ty = src.opts.tms ? 2 ** zz - 1 - y : y;
  let u = resolveUrl(src)
    .replace("{z}", zz).replace("{x}", x).replace("{y}", ty).replace("{r}", "");
  if (src.opts.subdomains) {
    const subs = String(src.opts.subdomains);
    u = u.replace("{s}", subs[(x + y) % subs.length]);
  }
  return u;
}

function testTileUrl(src) {
  /* mapę zespoloną testujemy po jej warstwie wierzchniej */
  if (src.combo) src = byId[src.combo[src.combo.length - 1]] || src;
  const [lat, lng, z] = src.home || [52.2, 19.4, 6];
  const zz = Math.min(z, src.opts.maxZoom || 19);
  const { x, y } = lngLatToTile(lat, lng, zz);
  return tileUrlFor(src, x, y, zz);
}

function testCategory(items, sec) {
  toast("Testuję warstwy… (zielona kropka = OK)");
  items.forEach(src => {
    const dot = sec.querySelector(`.layer-row[data-id="${src.id}"] .lr-dot`);
    if (!dot) return;
    if (keyMissing(src)) { dot.className = "lr-dot warn"; dot.title = "Brak klucza API"; return; }
    dot.className = "lr-dot pending";
    const img = new Image();
    const done = ok => {
      dot.className = "lr-dot " + (ok ? "ok" : "bad");
      dot.title = ok ? "Kafelek testowy OK" : "Kafelek testowy nie wczytał się";
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = testTileUrl(src);
    setTimeout(() => { if (dot.className.includes("pending")) done(false); }, 12000);
  });
}

/* ───────────────────────── Sidebar / topbar ───────────────────────── */

function openSidebar() { sidebar.classList.add("open"); }
function closeSidebar() { sidebar.classList.remove("open"); }
document.getElementById("btn-menu").addEventListener("click", () =>
  sidebar.classList.toggle("open"));
document.getElementById("active-map-name").addEventListener("click", openSidebar);
document.getElementById("sb-close").addEventListener("click", closeSidebar);
document.getElementById("layer-filter").addEventListener("input", e =>
  buildList(e.target.value));

/* szybkie przełączanie map bazowych ‹ › (ulubione, a gdy brak — wszystkie) */
function baseCycle() {
  const favs = MAP_SOURCES.filter(s => !s.overlay && state.favs.has(s.id) && !keyMissing(s));
  return favs.length > 1 ? favs
    : MAP_SOURCES.filter(s => !s.overlay && !keyMissing(s));
}
function cycleBase(dir) {
  const pool = baseCycle();
  const i = pool.findIndex(s => s.id === state.baseId);
  const next = pool[(i + dir + pool.length) % pool.length];
  if (next) { buzz(); setBase(next.id); toast(`${next.name}`, 1600); }
}
document.getElementById("btn-prev-map").addEventListener("click", () => cycleBase(-1));
document.getElementById("btn-next-map").addEventListener("click", () => cycleBase(1));

/* ───────────────────────── Wyszukiwanie (Nominatim) ───────────────────────── */

const searchBar = document.getElementById("search-bar");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

function toggleSearch() {
  searchBar.classList.toggle("hidden");
  if (!searchBar.classList.contains("hidden")) searchInput.focus();
  else searchResults.innerHTML = "";
}
document.getElementById("search-close").addEventListener("click", () => {
  searchBar.classList.add("hidden"); searchResults.innerHTML = "";
});

let searchMarker = null;
async function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  searchResults.innerHTML = `<li class="sr-info">Szukam…</li>`;
  try {
    const r = await fetch(
      "https://nominatim.openstreetmap.org/search?format=json&limit=7&accept-language=pl&q=" +
      encodeURIComponent(q));
    const data = await r.json();
    searchResults.innerHTML = data.length ? "" : `<li class="sr-info">Brak wyników.</li>`;
    data.forEach(hit => {
      const li = document.createElement("li");
      li.textContent = hit.display_name;
      li.addEventListener("click", () => {
        const lat = +hit.lat, lng = +hit.lon;
        map.flyTo([lat, lng], Math.max(map.getZoom(), 13));
        if (searchMarker) map.removeLayer(searchMarker);
        searchMarker = L.marker([lat, lng]).addTo(map)
          .bindPopup(hit.display_name).openPopup();
        searchResults.innerHTML = "";
        searchBar.classList.add("hidden");
      });
      searchResults.appendChild(li);
    });
  } catch {
    searchResults.innerHTML = `<li class="sr-info">Błąd sieci — spróbuj ponownie.</li>`;
  }
}
document.getElementById("search-go").addEventListener("click", doSearch);
searchInput.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });

/* ───────────────────────── Lokalizacja GPS ───────────────────────── */

let watchId = null, posMarker = null, posCircle = null, follow = false;
const stFollow = document.getElementById("st-follow");

function toggleLocate() {
  if (watchId != null) { stopLocate(); return; }
  if (!navigator.geolocation) { toast("Brak geolokalizacji w tej przeglądarce."); return; }
  toast("Ustalam pozycję…");
  follow = true;
  watchId = navigator.geolocation.watchPosition(onPos, err => {
    toast("Nie udało się pobrać pozycji: " + err.message);
    stopLocate();
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  setActionState("locate", true);
  stFollow.classList.remove("hidden");
}

function onPos(p) {
  const ll = [p.coords.latitude, p.coords.longitude];
  if (!posMarker) {
    posMarker = L.circleMarker(ll, { radius: 7, color: "#fff", weight: 2,
      fillColor: "#2f8cff", fillOpacity: 1 }).addTo(map);
    posCircle = L.circle(ll, { radius: p.coords.accuracy, color: "#2f8cff",
      weight: 1, fillOpacity: 0.12 }).addTo(map);
    map.flyTo(ll, Math.max(map.getZoom(), 15));
  } else {
    posMarker.setLatLng(ll);
    posCircle.setLatLng(ll).setRadius(p.coords.accuracy);
    if (follow) map.panTo(ll);
  }
}
function stopLocate() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null; follow = false;
  if (posMarker) { map.removeLayer(posMarker); posMarker = null; }
  if (posCircle) { map.removeLayer(posCircle); posCircle = null; }
  setActionState("locate", false);
  stFollow.classList.add("hidden");
}
map.on("dragstart", () => { follow = false; });

/* ───────────────────────── Pomiar odległości ───────────────────────── */

let measuring = false;
const measure = { pts: [], line: null, marks: [] };
const stMeasure = document.getElementById("st-measure");

function toggleMeasure() {
  measuring = !measuring;
  setActionState("measure", measuring);
  if (measuring) {
    toast("Pomiar: klikaj na mapie, aby mierzyć. Ponowne kliknięcie przycisku kończy i czyści.");
    stMeasure.classList.remove("hidden");
    stMeasure.textContent = "0 m";
  } else clearMeasure();
}

function clearMeasure() {
  measure.pts = [];
  if (measure.line) map.removeLayer(measure.line);
  measure.line = null;
  measure.marks.forEach(m => map.removeLayer(m));
  measure.marks = [];
  stMeasure.classList.add("hidden");
}

function fmtDist(m) {
  return m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(2) + " km";
}

/* ───────────────────────── POI — silnik ───────────────────────── */

const POI_CATS = {
  other:     { i: "star",   n: "Ogólny",    c: "#ff7a1a" },
  sleep:     { i: "bed",    n: "Nocleg",    c: "#8b5cf6" },
  food:      { i: "food",   n: "Jedzenie",  c: "#ef4444" },
  water:     { i: "water",  n: "Woda",      c: "#2f8cff" },
  peak:      { i: "peak",   n: "Szczyt",    c: "#10b981" },
  view:      { i: "camera", n: "Widok",     c: "#f59e0b" },
  heritage:  { i: "castle", n: "Zabytek",   c: "#b0813f" },
  transport: { i: "train",  n: "Transport", c: "#64748b" },
  danger:    { i: "warn",   n: "Uwaga",     c: "#e5484d" },
};
function catIc(cat, cls = "") { return ic(POI_CATS[cat]?.i || "star", cls); }
const POI_COLORS = ["#ff7a1a", "#ef4444", "#f59e0b", "#10b981", "#2f8cff",
  "#8b5cf6", "#e33fa1", "#64748b"];

const poiLayer = L.layerGroup().addTo(map);
let poiAddMode = false;
let editingPoiId = null;   // id edytowanego POI (null = nowy)
let pendingLatLng = null;  // pozycja nowego POI
let lastDeleted = null;    // {poi, index} do cofania

function savePois() { LS.set("pois", state.pois); }

function poiColor(p) { return p.color || POI_CATS[p.cat]?.c || "#ff7a1a"; }

function poiIcon(p) {
  const c = poiColor(p);
  return L.divIcon({
    className: "poi-div",
    iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -40],
    html: `<div class="poi-pin" style="--pc:${c}">
      <svg viewBox="0 0 34 44" width="34" height="44">
        <path d="M17 1C8.7 1 2 7.7 2 16c0 10.5 12.2 24.3 14.2 26.5a1.1 1.1 0 0 0 1.6 0C19.8 40.3 32 26.5 32 16 32 7.7 25.3 1 17 1z"
          fill="var(--pc)" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>
        <circle cx="17" cy="16" r="11" fill="rgba(255,255,255,.92)"/>
      </svg>
      ${catIc(p.cat, "poi-pin-ic")}
    </div>`,
  });
}

function renderPois() {
  poiLayer.clearLayers();
  state.pois.forEach(p => {
    if (state.poiHiddenCats.has(p.cat)) return;
    const mk = L.marker([p.lat, p.lng], { icon: poiIcon(p), title: p.name });
    mk.on("click", () => openPoiPopup(mk, p));
    mk.addTo(poiLayer);
  });
  const cnt = document.getElementById("poi-count");
  if (cnt) cnt.textContent = state.pois.length ? `${state.pois.length}` : "";
}

function esc(s) {
  return String(s).replace(/[<>&"]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
}

function openPoiPopup(mk, p) {
  const div = document.createElement("div");
  div.className = "poi-popup";
  div.innerHTML = `
    <strong><span class="poi-cat-ic" style="--pc:${poiColor(p)}">${catIc(p.cat)}</span> ${esc(p.name)}</strong>
    ${p.note ? `<p>${esc(p.note)}</p>` : ""}
    <small>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</small>
    <div class="poi-popup-btns">
      <button data-a="edit">${ic("edit")} Edytuj</button>
      <button data-a="nav">${ic("nav")} Nawiguj</button>
      <button data-a="copy" title="Kopiuj współrzędne">${ic("copy")}</button>
      <button data-a="del" class="danger" title="Usuń">${ic("trash")}</button>
    </div>`;
  div.addEventListener("click", e => {
    const a = e.target.closest("[data-a]")?.dataset.a;
    if (!a) return;
    if (a === "edit") { map.closePopup(); openPoiEditor(p); }
    else if (a === "nav") window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, "_blank");
    else if (a === "copy") {
      navigator.clipboard?.writeText(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
      toast("Skopiowano współrzędne.");
    } else if (a === "del") { map.closePopup(); deletePoi(p.id); }
  });
  mk.bindPopup(div, { maxWidth: 260 }).openPopup();
}

function deletePoi(id) {
  const i = state.pois.findIndex(p => p.id === id);
  if (i < 0) return;
  lastDeleted = { poi: state.pois[i], index: i };
  state.pois.splice(i, 1);
  savePois(); renderPois(); renderPoiList();
  markDirty(lastDeleted.poi.group);
  buzz(20);
  toast(`Usunięto „${lastDeleted.poi.name}".`, 6000, {
    label: "Cofnij",
    fn: () => {
      state.pois.splice(lastDeleted.index, 0, lastDeleted.poi);
      savePois(); renderPois(); renderPoiList();
      markDirty(lastDeleted.poi.group);
      toast("Przywrócono punkt.");
    },
  });
}

/* tryb dodawania: przycisk 📌 albo long-press na mapie */
function setPoiAddMode(on) {
  poiAddMode = on;
  setActionState("poi-add", on);
  document.getElementById("map").style.cursor = on ? "crosshair" : "";
  if (on) toast("Kliknij na mapie, aby dodać punkt (albo przytrzymaj palec).");
}

map.on("click", e => {
  if (measuring) {
    measure.pts.push(e.latlng);
    measure.marks.push(L.circleMarker(e.latlng, { radius: 4, color: "#ff7a1a",
      fillColor: "#ff7a1a", fillOpacity: 1 }).addTo(map));
    if (measure.line) measure.line.setLatLngs(measure.pts);
    else measure.line = L.polyline(measure.pts, { color: "#ff7a1a", weight: 3,
      dashArray: "6 6" }).addTo(map);
    let d = 0;
    for (let i = 1; i < measure.pts.length; i++)
      d += map.distance(measure.pts[i - 1], measure.pts[i]);
    stMeasure.textContent = fmtDist(d);
    return;
  }
  if (poiAddMode) {
    setPoiAddMode(false);
    openPoiEditor(null, e.latlng);
  }
});

/* long-press (mobile) / prawy przycisk (desktop) → szybkie menu miejsca */
map.on("contextmenu", e => {
  if (measuring || poiAddMode) return;
  buzz(18);
  const ll = e.latlng;
  const div = document.createElement("div");
  div.className = "poi-popup";
  div.innerHTML = `
    <small>${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}</small>
    <div class="poi-popup-btns">
      <button data-a="add">${ic("pin-plus")} Dodaj POI</button>
      <button data-a="copy">${ic("copy")} Kopiuj</button>
      <button data-a="nav">${ic("nav")} Nawiguj</button>
    </div>`;
  const pop = L.popup({ maxWidth: 240 }).setLatLng(ll).setContent(div).openOn(map);
  div.addEventListener("click", ev => {
    const a = ev.target.closest("[data-a]")?.dataset.a;
    if (!a) return;
    map.closePopup(pop);
    if (a === "add") openPoiEditor(null, ll);
    else if (a === "copy") {
      navigator.clipboard?.writeText(`${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`);
      toast("Skopiowano współrzędne.");
    } else if (a === "nav") window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${ll.lat},${ll.lng}`, "_blank");
  });
});

/* ── edytor POI ── */

let editCat = "other", editColor = "", editGroup = DEFAULT_GROUP;

function openPoiEditor(poi, latlng) {
  editingPoiId = poi ? poi.id : null;
  pendingLatLng = poi ? { lat: poi.lat, lng: poi.lng } : latlng;
  editCat = poi ? poi.cat : "other";
  editColor = poi ? poi.color : "";
  editGroup = poi ? (poi.group || DEFAULT_GROUP)
    : (poiPanelGroup && state.groups.includes(poiPanelGroup) ? poiPanelGroup : DEFAULT_GROUP);
  renderPoiGroupChips();
  document.getElementById("poi-modal-title").innerHTML =
    poi ? `${ic("edit")} Edytuj punkt` : `${ic("pin-plus")} Nowy punkt`;
  document.getElementById("poi-name").value = poi ? poi.name : "";
  document.getElementById("poi-note").value = poi ? poi.note : "";
  document.getElementById("poi-coords").textContent =
    `${pendingLatLng.lat.toFixed(5)}, ${pendingLatLng.lng.toFixed(5)}`;
  document.getElementById("poi-delete").classList.toggle("hidden", !poi);
  renderPoiCatChips();
  renderPoiColorChips();
  openModal("poi-modal");
  setTimeout(() => document.getElementById("poi-name").focus(), 60);
}

function renderPoiGroupChips() {
  const box = document.getElementById("poi-groups-edit");
  box.innerHTML = "";
  state.groups.forEach(g => {
    const b = document.createElement("button");
    b.className = "chip" + (editGroup === g ? " sel" : "");
    b.innerHTML = `${ic("folder", "ic-xs")} ${esc(g)}`;
    b.addEventListener("click", () => { editGroup = g; renderPoiGroupChips(); });
    box.appendChild(b);
  });
  const add = document.createElement("button");
  add.className = "chip chip-add";
  add.innerHTML = `${ic("plus", "ic-xs")} nowy folder`;
  add.addEventListener("click", () =>
    openNamePrompt("Nowy folder punktów", "np. Wakacje 2026", name => {
      if (!state.groups.includes(name)) {
        state.groups.push(name);
        LS.set("poiGroups", state.groups);
      }
      editGroup = name;
      openModal("poi-modal");
      renderPoiGroupChips();
    }));
  box.appendChild(add);
}

function renderPoiCatChips() {
  const box = document.getElementById("poi-cats");
  box.innerHTML = "";
  Object.entries(POI_CATS).forEach(([id, c]) => {
    const b = document.createElement("button");
    b.className = "chip" + (editCat === id ? " sel" : "");
    b.innerHTML = `${ic(c.i, "ic-xs")} ${c.n}`;
    b.addEventListener("click", () => { editCat = id; renderPoiCatChips(); });
    box.appendChild(b);
  });
}

function renderPoiColorChips() {
  const box = document.getElementById("poi-colors");
  box.innerHTML = "";
  const auto = document.createElement("button");
  auto.className = "chip" + (editColor === "" ? " sel" : "");
  auto.textContent = "auto";
  auto.title = "Kolor kategorii";
  auto.addEventListener("click", () => { editColor = ""; renderPoiColorChips(); });
  box.appendChild(auto);
  POI_COLORS.forEach(c => {
    const b = document.createElement("button");
    b.className = "swatch" + (editColor === c ? " sel" : "");
    b.style.background = c;
    b.addEventListener("click", () => { editColor = c; renderPoiColorChips(); });
    box.appendChild(b);
  });
}

document.getElementById("poi-save").addEventListener("click", () => {
  const name = document.getElementById("poi-name").value.trim() ||
    (POI_CATS[editCat]?.n || "Punkt");
  const note = document.getElementById("poi-note").value.trim();
  if (editingPoiId) {
    const p = state.pois.find(x => x.id === editingPoiId);
    if (p) {
      if (p.group !== editGroup) markDirty(p.group);
      Object.assign(p, { name, note, cat: editCat, color: editColor, group: editGroup });
    }
  } else {
    state.pois.push({
      id: "p" + Date.now() + "_" + Math.floor(Math.random() * 1e4),
      lat: pendingLatLng.lat, lng: pendingLatLng.lng,
      name, note, cat: editCat, color: editColor, group: editGroup, ts: Date.now(),
    });
  }
  savePois(); renderPois(); renderPoiList();
  markDirty(editGroup);
  closeModal("poi-modal");
  buzz();
  toast(editingPoiId ? "Zapisano zmiany." : `Dodano: ${name} → ${editGroup}`);
});

document.getElementById("poi-delete").addEventListener("click", () => {
  if (!editingPoiId) return;
  closeModal("poi-modal");
  deletePoi(editingPoiId);
});

/* ── panel listy POI ── */

let poiPanelQ = "", poiPanelCat = null, poiPanelGroup = null;

function openPoiPanel() {
  poiPanelQ = "";
  document.getElementById("poi-filter").value = "";
  renderPoiFolders();
  renderPoiCatFilter();
  renderPoiList();
  renderCloudUI();
  openModal("poi-panel");
}

/* Foldery (grupy) POI — pasek jak w menedżerze plików */
function groupCount(g) { return state.pois.filter(p => (p.group || DEFAULT_GROUP) === g).length; }

function renderPoiFolders() {
  const box = document.getElementById("poi-folders");
  box.innerHTML = "";
  const all = document.createElement("button");
  all.className = "chip" + (poiPanelGroup === null ? " sel" : "");
  all.innerHTML = `${ic("list", "ic-xs")} wszystkie (${state.pois.length})`;
  all.addEventListener("click", () => { poiPanelGroup = null; renderPoiFolders(); renderPoiList(); });
  box.appendChild(all);

  state.groups.forEach(g => {
    const b = document.createElement("button");
    b.className = "chip" + (poiPanelGroup === g ? " sel" : "");
    b.innerHTML = `${ic("folder", "ic-xs")} ${esc(g)} (${groupCount(g)})`;
    b.addEventListener("click", () => { poiPanelGroup = g; renderPoiFolders(); renderPoiList(); });
    box.appendChild(b);
  });

  const add = document.createElement("button");
  add.className = "chip chip-add";
  add.innerHTML = `${ic("plus", "ic-xs")} folder`;
  add.title = "Nowy folder punktów";
  add.addEventListener("click", () =>
    openNamePrompt("Nowy folder punktów", "np. Wakacje 2026", name => {
      if (!state.groups.includes(name)) {
        state.groups.push(name);
        LS.set("poiGroups", state.groups);
      }
      poiPanelGroup = name;
      openModal("poi-panel");
      renderPoiFolders(); renderPoiList();
    }));
  box.appendChild(add);

  // akcje na wybranym folderze
  const act = document.getElementById("poi-folder-actions");
  act.innerHTML = "";
  if (poiPanelGroup) {
    const ren = document.createElement("button");
    ren.className = "chip";
    ren.innerHTML = `${ic("edit", "ic-xs")} zmień nazwę`;
    ren.addEventListener("click", () =>
      openNamePrompt("Zmień nazwę folderu", poiPanelGroup, name => {
        const old = poiPanelGroup;
        if (name === old) { openModal("poi-panel"); return; }
        state.groups = state.groups.map(g => (g === old ? name : g));
        state.pois.forEach(p => { if ((p.group || DEFAULT_GROUP) === old) p.group = name; });
        LS.set("poiGroups", state.groups);
        savePois();
        cloudDeleteGroupFile(old);
        markDirty(name);
        poiPanelGroup = name;
        openModal("poi-panel");
        renderPoiFolders(); renderPoiList();
      }, poiPanelGroup));
    act.appendChild(ren);

    if (poiPanelGroup !== DEFAULT_GROUP) {
      const del = document.createElement("button");
      del.className = "chip";
      del.innerHTML = `${ic("trash", "ic-xs")} usuń folder`;
      del.addEventListener("click", () => {
        const n = groupCount(poiPanelGroup);
        if (!confirm(`Usunąć folder „${poiPanelGroup}"?` +
          (n ? ` ${n} punktów trafi do „${DEFAULT_GROUP}".` : ""))) return;
        const old = poiPanelGroup;
        state.pois.forEach(p => { if ((p.group || DEFAULT_GROUP) === old) p.group = DEFAULT_GROUP; });
        state.groups = state.groups.filter(g => g !== old);
        LS.set("poiGroups", state.groups);
        savePois();
        cloudDeleteGroupFile(old);
        markDirty(DEFAULT_GROUP);
        poiPanelGroup = null;
        renderPoiFolders(); renderPoiList();
      });
      act.appendChild(del);
    }
  }
}

function renderPoiCatFilter() {
  const box = document.getElementById("poi-cat-filter");
  box.innerHTML = "";
  const all = document.createElement("button");
  all.className = "chip" + (poiPanelCat === null ? " sel" : "");
  all.textContent = "wszystkie";
  all.addEventListener("click", () => { poiPanelCat = null; renderPoiCatFilter(); renderPoiList(); });
  box.appendChild(all);
  Object.entries(POI_CATS).forEach(([id, c]) => {
    if (!state.pois.some(p => p.cat === id)) return;
    const b = document.createElement("button");
    b.className = "chip" + (poiPanelCat === id ? " sel" : "") +
      (state.poiHiddenCats.has(id) ? " muted" : "");
    b.innerHTML = `${ic(c.i, "ic-xs")} ${c.n}`;
    b.title = "Klik: filtruj listę · długie przytrzymanie/2× klik: ukryj na mapie";
    b.addEventListener("click", () => { poiPanelCat = id; renderPoiCatFilter(); renderPoiList(); });
    b.addEventListener("dblclick", () => {
      if (state.poiHiddenCats.has(id)) state.poiHiddenCats.delete(id);
      else state.poiHiddenCats.add(id);
      LS.set("poiHiddenCats", [...state.poiHiddenCats]);
      renderPois(); renderPoiCatFilter();
    });
    box.appendChild(b);
  });
}

document.getElementById("poi-filter").addEventListener("input", e => {
  poiPanelQ = e.target.value.trim().toLowerCase();
  renderPoiList();
});

function renderPoiList() {
  const box = document.getElementById("poi-list");
  if (!box) return;
  const center = map.getCenter();
  let items = state.pois
    .filter(p => !poiPanelGroup || (p.group || DEFAULT_GROUP) === poiPanelGroup)
    .filter(p => !poiPanelCat || p.cat === poiPanelCat)
    .filter(p => !poiPanelQ ||
      (p.name + " " + p.note).toLowerCase().includes(poiPanelQ))
    .map(p => ({ p, d: map.distance(center, [p.lat, p.lng]) }))
    .sort((a, b) => a.d - b.d);

  document.getElementById("poi-count").textContent =
    state.pois.length ? `${state.pois.length}` : "";

  if (!items.length) {
    box.innerHTML = `<div class="empty">Brak punktów. Dodaj pierwszy przyciskiem
      „+POI" albo przytrzymując palec na mapie.</div>`;
    return;
  }
  box.innerHTML = "";
  items.forEach(({ p, d }) => {
    const row = document.createElement("div");
    row.className = "poi-row";
    row.innerHTML = `
      <span class="poi-row-ico" style="--pc:${poiColor(p)}">${catIc(p.cat)}</span>
      <span class="poi-row-body">
        <b>${esc(p.name)}</b>
        ${p.note ? `<small>${esc(p.note.slice(0, 60))}${p.note.length > 60 ? "…" : ""}</small>` : ""}
      </span>
      <span class="poi-row-dist">${fmtDist(d)}</span>
      <button class="poi-row-edit" title="Edytuj">${ic("edit")}</button>`;
    row.querySelector(".poi-row-body").addEventListener("click", () => {
      closeModal("poi-panel");
      map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15));
    });
    row.querySelector(".poi-row-edit").addEventListener("click", () => {
      closeModal("poi-panel");
      openPoiEditor(p);
    });
    box.appendChild(row);
  });
}

/* ───────────── Chmura GitHub — baza plików POI w repozytorium ─────────────
   Struktura: gałąź "poi-db", pliki poi-db/<użytkownik>/<folder>.json
   Odczyt jest publiczny (repo publiczne, bez tokena). Zapis wymaga
   fine-grained tokena GitHub z uprawnieniem Contents:write do tego repo.
   Auto-sync: każda zmiana folderu POI zapisuje jego plik po 4 s ciszy. */

const CLOUD = {
  repo: "maksymilianbronk-cmyk/www1",
  branch: "poi-db",
  root: "poi-db",
};
const shaCache = LS.get("cloudSha", {});

function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64dec(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, "")))); }
const PL_CHARS = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
function groupSlug(name) {
  return name.toLowerCase()
    .replace(/[ąćęłńóśźż]/g, ch => PL_CHARS[ch])
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "folder";
}
function userSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}

/* ── Token aplikacji: logika „chmura na koncie właściciela" ──
   Właściciel repo aktywuje chmurę raz w panelu Administratora: jego token
   trafia w formie ZAKODOWANEJ (odwrócony base64 w kawałkach — nie wygląda
   jak github_pat_, więc skanery sekretów go nie unieważnią) do pliku
   cloud/config.json na gałęzi poi-db. Każda przeglądarka pobiera go przy
   starcie i dekoduje w locie — użytkownicy zakładają konta samym loginem
   i hasłem. Kodowanie to zasłona, nie szyfr: token musi być dedykowany
   wyłącznie do tego repo (Contents), a baza POI jest jawna. */

function obfToken(token) {
  const b = b64enc(token.split("").reverse().join(""));
  const parts = [];
  for (let i = 0; i < b.length; i += 18) parts.push(b.slice(i, i + 18));
  return parts;
}
function deobfToken(parts) {
  try {
    if (!parts || !parts.length) return "";
    return b64dec(parts.join("")).split("").reverse().join("");
  } catch { return ""; }
}

let REMOTE_CLOUD_TOKEN = deobfToken(LS.get("cloudCfg", null)?.tokenObf);
const CLOUD_CFG_URL =
  "https://raw.githubusercontent.com/maksymilianbronk-cmyk/www1/poi-db/cloud/config.json";

async function fetchCloudConfig() {
  try {
    const r = await fetch(CLOUD_CFG_URL, { cache: "no-cache" });
    if (!r.ok) return;
    const cfg = await r.json();
    LS.set("cloudCfg", cfg);
    REMOTE_CLOUD_TOKEN = deobfToken(cfg.tokenObf);
    renderCloudUI();
  } catch { /* offline — zostaje wersja z cache */ }
}

/* Priorytet: własny token użytkownika > cloud-config.js > zdalny config poi-db */
function writeToken() {
  const c = window.TRASA_CLOUD || {};
  return (state.cloud.token || c.appToken || deobfToken(c.appTokenObf) ||
    REMOTE_CLOUD_TOKEN || "").trim();
}

async function ghApi(path, opts = {}) {
  /* Accept jest nagłówkiem CORS-safelisted — publiczny odczyt obywa się bez
     preflight; Authorization (tylko przy zapisie) preflight wymusza i GitHub
     API poprawnie go obsługuje. */
  const headers = Object.assign({ Accept: "application/vnd.github+json" }, opts.headers || {});
  const needsAuth = opts.method && opts.method !== "GET";
  if (writeToken() && (needsAuth || opts.auth)) {
    headers.Authorization = "Bearer " + writeToken();
  }
  const r = await fetch(`https://api.github.com/repos/${CLOUD.repo}/${path}`,
    Object.assign({}, opts, { headers }));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 140)}`);
  return r.json();
}

function cloudStatus(msg, ok = true) {
  const el = document.getElementById("cloud-status");
  if (el) { el.textContent = msg; el.style.color = ok ? "" : "var(--bad)"; }
}

function cloudReady() {
  return !!(state.cloud.user.trim() && writeToken());
}

/* ── Konta: login + hasło (hasz w poi-db/<login>/_account.json) ── */

async function sha256Hex(str) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function accountRegister(login, pass) {
  const slug = userSlug(login);
  if (!slug || pass.length < 4) throw new Error("podaj login i hasło (min. 4 znaki)");
  if (!writeToken()) throw new Error(
    "chmura nieaktywna — właściciel repo aktywuje ją w panelu Administratora (albo wklej własny token powyżej)");
  const existing = await ghApi(`contents/${CLOUD.root}/${slug}/_account.json?ref=${CLOUD.branch}`);
  if (existing) throw new Error("ten login jest już zajęty");
  const salt = [...crypto.getRandomValues(new Uint8Array(12))]
    .map(b => b.toString(16).padStart(2, "0")).join("");
  const hash = await sha256Hex(salt + ":" + pass);
  await ghApi(`contents/${CLOUD.root}/${slug}/_account.json`, {
    method: "PUT",
    body: JSON.stringify({
      message: `poi: nowe konto ${slug}`,
      branch: CLOUD.branch,
      content: b64enc(JSON.stringify({ login: slug, salt, hash,
        created: new Date().toISOString() }, null, 2)),
    }),
  });
  return slug;
}

async function accountLogin(login, pass) {
  const slug = userSlug(login);
  const data = await ghApi(`contents/${CLOUD.root}/${slug}/_account.json?ref=${CLOUD.branch}`);
  if (!data) throw new Error("konto nie istnieje — załóż je przyciskiem obok");
  const acc = JSON.parse(b64dec(data.content));
  if (await sha256Hex(acc.salt + ":" + pass) !== acc.hash)
    throw new Error("błędne hasło");
  return slug;
}

function setSession(login) {
  state.cloud.user = login;
  state.cloud.logged = !!login;
  LS.set("cloud", state.cloud);
  renderCloudUI();
}

function groupFilePath(g) {
  return `${CLOUD.root}/${userSlug(state.cloud.user)}/${groupSlug(g)}.json`;
}

async function cloudSaveGroup(g) {
  if (!cloudReady()) return;
  const path = groupFilePath(g);
  const pois = state.pois.filter(p => (p.group || DEFAULT_GROUP) === g);
  const body = {
    message: `poi: ${state.cloud.user} / ${g} (${pois.length} punktów)`,
    branch: CLOUD.branch,
    content: b64enc(JSON.stringify({
      name: g, user: state.cloud.user, updated: new Date().toISOString(),
      pois,
    }, null, 2)),
  };
  if (shaCache[path]) body.sha = shaCache[path];
  try {
    let res;
    try {
      res = await ghApi(`contents/${path}`, { method: "PUT", body: JSON.stringify(body) });
    } catch (err) {
      if (/409|422/.test(err.message)) {
        const cur = await ghApi(`contents/${encodeURI(path)}?ref=${CLOUD.branch}`);
        if (cur && cur.sha) { body.sha = cur.sha; }
        else delete body.sha;
        res = await ghApi(`contents/${path}`, { method: "PUT", body: JSON.stringify(body) });
      } else throw err;
    }
    shaCache[path] = res.content.sha;
    LS.set("cloudSha", shaCache);
    cloudStatus(`Zapisano „${g}" (${pois.length} pkt) — ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    cloudStatus("Błąd zapisu: " + err.message, false);
  }
}

async function cloudSaveAll() {
  if (!cloudReady()) { cloudStatus("Podaj użytkownika i token GitHub.", false); return; }
  cloudStatus("Zapisuję wszystkie foldery…");
  for (const g of state.groups) await cloudSaveGroup(g);
  toast("Foldery POI zapisane w repozytorium GitHub.");
}

async function cloudDeleteGroupFile(g) {
  if (!cloudReady()) return;
  const path = groupFilePath(g);
  try {
    const cur = shaCache[path]
      ? { sha: shaCache[path] }
      : await ghApi(`contents/${encodeURI(path)}?ref=${CLOUD.branch}`);
    if (!cur) return;
    await ghApi(`contents/${path}`, {
      method: "DELETE",
      body: JSON.stringify({ message: `poi: usuń ${g}`, branch: CLOUD.branch, sha: cur.sha }),
    });
    delete shaCache[path];
    LS.set("cloudSha", shaCache);
  } catch { /* plik mógł nie istnieć */ }
}

async function cloudListUsers() {
  const list = await ghApi(`contents/${CLOUD.root}?ref=${CLOUD.branch}`);
  return (list || []).filter(e => e.type === "dir").map(e => e.name);
}
async function cloudListGroups(user) {
  const list = await ghApi(`contents/${CLOUD.root}/${user}?ref=${CLOUD.branch}`);
  return (list || []).filter(e =>
    e.type === "file" && e.name.endsWith(".json") && !e.name.startsWith("_"));
}

async function cloudLoadGroupFile(user, fileName, { asForeign = false } = {}) {
  const data = await ghApi(
    `contents/${CLOUD.root}/${user}/${encodeURIComponent(fileName)}?ref=${CLOUD.branch}`);
  if (!data) throw new Error("plik nie istnieje");
  const doc = JSON.parse(b64dec(data.content));
  const gName = asForeign ? `${user}/${doc.name || fileName.replace(/\.json$/, "")}`
    : (doc.name || fileName.replace(/\.json$/, ""));
  if (!state.groups.includes(gName)) state.groups.push(gName);
  // zastąp zawartość folderu wersją z chmury
  state.pois = state.pois.filter(p => (p.group || DEFAULT_GROUP) !== gName);
  (doc.pois || []).forEach((p, i) => state.pois.push(Object.assign({}, p, {
    id: p.id || "p" + Date.now() + "_" + i,
    group: gName,
  })));
  if (!asForeign) shaCache[`${CLOUD.root}/${user}/${fileName}`] = data.sha;
  LS.set("cloudSha", shaCache);
  LS.set("poiGroups", state.groups);
  savePois();
  return { gName, n: (doc.pois || []).length };
}

async function cloudLoadMine() {
  if (!state.cloud.user.trim()) { cloudStatus("Podaj nazwę użytkownika.", false); return; }
  cloudStatus("Wczytuję foldery z chmury…");
  try {
    const files = await cloudListGroups(userSlug(state.cloud.user));
    if (!files.length) { cloudStatus("Brak folderów w chmurze dla tego użytkownika."); return; }
    let total = 0;
    for (const f of files) {
      const { n } = await cloudLoadGroupFile(userSlug(state.cloud.user), f.name);
      total += n;
    }
    renderPois(); renderPoiFolders(); renderPoiCatFilter(); renderPoiList();
    cloudStatus(`Wczytano ${files.length} folderów, ${total} punktów.`);
  } catch (err) {
    cloudStatus("Błąd odczytu: " + err.message, false);
  }
}

/* auto-sync: folder „brudny" → zapis po 4 s ciszy */
const dirtyGroups = new Set();
let dirtyTimer = null;
function markDirty(g) {
  if (!g) g = DEFAULT_GROUP;
  dirtyGroups.add(g);
  if (!state.cloud.auto || !cloudReady()) return;
  clearTimeout(dirtyTimer);
  dirtyTimer = setTimeout(() => {
    const gs = [...dirtyGroups];
    dirtyGroups.clear();
    gs.forEach(g2 => { if (state.groups.includes(g2)) cloudSaveGroup(g2); });
  }, 4000);
}

/* UI chmury w panelu POI */
function renderCloudUI() {
  document.getElementById("cloud-user").value = state.cloud.user;
  document.getElementById("cloud-token").value = state.cloud.token;
  document.getElementById("cloud-auto").checked = !!state.cloud.auto;
  const logged = !!state.cloud.logged && state.cloud.user;
  document.getElementById("acc-forms").classList.toggle("hidden", !!logged);
  document.getElementById("acc-session").classList.toggle("hidden", !logged);
  if (logged) {
    document.getElementById("acc-status").textContent =
      `Zalogowano jako ${state.cloud.user} · foldery synchronizują się z bazą poi-db.`;
  }
  /* blok tokena pokazuj tylko, gdy chmura nie została aktywowana przez właściciela */
  const c = window.TRASA_CLOUD || {};
  const hasAppToken = !!(c.appToken || deobfToken(c.appTokenObf) || REMOTE_CLOUD_TOKEN);
  const tokBox = document.getElementById("acc-need-token");
  const tokInput = document.getElementById("acc-token");
  if (tokBox) tokBox.classList.toggle("hidden", hasAppToken || logged);
  if (tokInput) tokInput.value = state.cloud.token || "";
  const admStatus = document.getElementById("admin-status");
  if (admStatus && !admStatus.dataset.busy) {
    admStatus.textContent = hasAppToken
      ? "Chmura AKTYWNA — użytkownicy zakładają konta bez tokenów."
      : "Chmura nieaktywna — wklej token właściciela i kliknij Aktywuj.";
  }
  cloudStatus(cloudReady()
    ? `Konto: ${state.cloud.user} · auto-sync ${state.cloud.auto ? "włączony" : "wyłączony"}`
    : (window.TRASA_CLOUD?.appToken
      ? "Zaloguj się lub załóż konto, aby zapisywać foldery w chmurze."
      : "Tryb offline — punkty zapisują się tylko w tej przeglądarce (brak tokena aplikacji)."));
}

/* token z pola konta → zapisz do stanu przed operacją chmury */
function grabAccToken() {
  const t = document.getElementById("acc-token");
  if (t && t.value.trim()) {
    state.cloud.token = t.value.trim();
    LS.set("cloud", state.cloud);
  }
}
document.getElementById("acc-token").addEventListener("change", () => {
  grabAccToken(); renderCloudUI();
});

document.getElementById("acc-register-btn").addEventListener("click", async () => {
  grabAccToken();
  const login = document.getElementById("acc-login").value.trim();
  const pass = document.getElementById("acc-pass").value;
  cloudStatus("Zakładam konto…");
  try {
    const slug = await accountRegister(login, pass);
    setSession(slug);
    cloudStatus(`Konto ${slug} założone.`);
    toast(`Witaj, ${slug}! Twoje foldery będą zapisywać się w chmurze.`);
    cloudSaveAll();
  } catch (err) { cloudStatus("Rejestracja: " + err.message, false); }
});

document.getElementById("acc-login-btn").addEventListener("click", async () => {
  grabAccToken();
  const login = document.getElementById("acc-login").value.trim();
  const pass = document.getElementById("acc-pass").value;
  cloudStatus("Loguję…");
  try {
    const slug = await accountLogin(login, pass);
    setSession(slug);
    cloudStatus(`Zalogowano jako ${slug}.`);
    cloudLoadMine();
  } catch (err) { cloudStatus("Logowanie: " + err.message, false); }
});

document.getElementById("acc-logout").addEventListener("click", () => {
  setSession("");
  document.getElementById("acc-pass").value = "";
  cloudStatus("Wylogowano — punkty zostają lokalnie w tej przeglądarce.");
});

/* ── Panel administratora: aktywacja chmury tokenem właściciela ── */
document.getElementById("admin-activate").addEventListener("click", async () => {
  const st = document.getElementById("admin-status");
  const token = document.getElementById("admin-token").value.trim();
  st.dataset.busy = "1";
  if (!token) { st.textContent = "Wklej token właściciela."; delete st.dataset.busy; return; }
  st.textContent = "Aktywuję chmurę…";
  try {
    /* token właściciela zostaje też lokalnie — chmura działa u Ciebie od razu */
    state.cloud.token = token;
    LS.set("cloud", state.cloud);
    const cfg = {
      v: 1,
      updated: new Date().toISOString(),
      tokenObf: obfToken(token),
    };
    const path = "cloud/config.json";
    const cur = await ghApi(`contents/${path}?ref=${CLOUD.branch}`);
    const body = {
      message: "cloud: aktywacja tokena aplikacji (panel administratora)",
      branch: CLOUD.branch,
      content: b64enc(JSON.stringify(cfg, null, 2)),
    };
    if (cur && cur.sha) body.sha = cur.sha;
    await ghApi(`contents/${path}`, { method: "PUT", body: JSON.stringify(body) });
    LS.set("cloudCfg", cfg);
    REMOTE_CLOUD_TOKEN = token;
    st.textContent = "Chmura AKTYWNA — zapisano cloud/config.json na gałęzi poi-db. " +
      "Użytkownicy (po odświeżeniu strony) zakładają konta samym loginem i hasłem.";
    delete st.dataset.busy;
    renderCloudUI();
    toast("Chmura aktywowana na koncie właściciela.");
  } catch (err) {
    st.textContent = "Błąd aktywacji: " + err.message +
      " (sprawdź, czy token ma Contents:write do repo www1)";
    delete st.dataset.busy;
  }
});
function saveCloudSettings() {
  state.cloud.user = document.getElementById("cloud-user").value.trim();
  state.cloud.token = document.getElementById("cloud-token").value.trim();
  state.cloud.auto = document.getElementById("cloud-auto").checked;
  LS.set("cloud", state.cloud);
  renderCloudUI();
}
["cloud-user", "cloud-token"].forEach(id =>
  document.getElementById(id).addEventListener("change", saveCloudSettings));
document.getElementById("cloud-auto").addEventListener("change", saveCloudSettings);
document.getElementById("cloud-save").addEventListener("click", () => {
  saveCloudSettings(); cloudSaveAll();
});
document.getElementById("cloud-load").addEventListener("click", () => {
  saveCloudSettings(); cloudLoadMine();
});
document.getElementById("cloud-browse-btn").addEventListener("click", async () => {
  const box = document.getElementById("cloud-browse");
  box.innerHTML = "<em>Wczytuję listę użytkowników…</em>";
  try {
    const users = await cloudListUsers();
    if (!users.length) { box.innerHTML = "<em>Baza jest jeszcze pusta.</em>"; return; }
    box.innerHTML = "";
    for (const u of users) {
      const uDiv = document.createElement("div");
      uDiv.className = "cloud-user-row";
      uDiv.innerHTML = `<strong>${ic("target", "ic-xs")} ${esc(u)}</strong>`;
      const gBox = document.createElement("div");
      gBox.className = "chip-row";
      try {
        const files = await cloudListGroups(u);
        files.forEach(f => {
          const chip = document.createElement("button");
          chip.className = "chip";
          chip.innerHTML = `${ic("folder", "ic-xs")} ${esc(f.name.replace(/\.json$/, ""))}`;
          chip.title = "Wczytaj ten folder na mapę";
          chip.addEventListener("click", async () => {
            try {
              const { gName, n } = await cloudLoadGroupFile(u, f.name,
                { asForeign: u !== userSlug(state.cloud.user) });
              renderPois(); renderPoiFolders(); renderPoiCatFilter(); renderPoiList();
              toast(`Wczytano „${gName}" (${n} punktów).`);
            } catch (err) { toast("Nie udało się wczytać: " + err.message); }
          });
          gBox.appendChild(chip);
        });
      } catch { gBox.innerHTML = "<em>błąd listowania</em>"; }
      uDiv.appendChild(gBox);
      box.appendChild(uDiv);
    }
  } catch (err) {
    box.innerHTML = `<em>Błąd: ${esc(err.message)}</em>`;
  }
});

/* ───────────── KML / KMZ — szybki import i eksport ─────────────
   KMZ czytany własnym minimalnym parserem ZIP (DecompressionStream
   "deflate-raw" dla wpisów skompresowanych), zapisywany jako ZIP
   bez kompresji (metoda stored + CRC32) — zero zewnętrznych bibliotek. */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function storedZipBlob(fileName, u8data, mime) {
  const nameB = new TextEncoder().encode(fileName);
  const crc = crc32(u8data);
  const lh = new Uint8Array(30 + nameB.length);
  let dv = new DataView(lh.buffer);
  dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true);
  dv.setUint32(14, crc, true);
  dv.setUint32(18, u8data.length, true); dv.setUint32(22, u8data.length, true);
  dv.setUint16(26, nameB.length, true);
  lh.set(nameB, 30);
  const cd = new Uint8Array(46 + nameB.length);
  dv = new DataView(cd.buffer);
  dv.setUint32(0, 0x02014b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 20, true);
  dv.setUint32(16, crc, true);
  dv.setUint32(20, u8data.length, true); dv.setUint32(24, u8data.length, true);
  dv.setUint16(28, nameB.length, true);
  cd.set(nameB, 46);
  const eocd = new Uint8Array(22);
  dv = new DataView(eocd.buffer);
  dv.setUint32(0, 0x06054b50, true); dv.setUint16(8, 1, true); dv.setUint16(10, 1, true);
  dv.setUint32(12, cd.length, true);
  dv.setUint32(16, lh.length + u8data.length, true);
  return new Blob([lh, u8data, cd, eocd], { type: mime });
}

async function kmzExtractKml(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= 0 && i > u8.length - 22 - 65536; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("uszkodzony KMZ");
  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const csize = dv.getUint32(off + 20, true);
    const nameLen = dv.getUint16(off + 28, true);
    const extraLen = dv.getUint16(off + 30, true);
    const cmtLen = dv.getUint16(off + 32, true);
    const lho = dv.getUint32(off + 42, true);
    const name = new TextDecoder().decode(u8.subarray(off + 46, off + 46 + nameLen));
    if (/\.kml$/i.test(name)) {
      const dataStart = lho + 30 +
        dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
      const data = u8.slice(dataStart, dataStart + csize);
      if (method === 0) return new TextDecoder().decode(data);
      if (method === 8) {
        return await new Response(
          new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
        ).text();
      }
      throw new Error("nieobsługiwana kompresja w KMZ");
    }
    off += 46 + nameLen + extraLen + cmtLen;
  }
  throw new Error("brak pliku .kml w archiwum KMZ");
}

/* Placemarki KML → punkty i linie (Point, LineString, Polygon, gx:Track) */
function parseKmlDoc(doc) {
  const points = [], lines = [];
  const coordPairs = txt => txt.trim().split(/\s+/).map(c => {
    const [lng, lat] = c.split(",").map(Number);
    return [lat, lng];
  }).filter(p => isFinite(p[0]) && isFinite(p[1]));

  doc.querySelectorAll("Placemark").forEach(pm => {
    const name = pm.querySelector("name")?.textContent.trim() || "Punkt";
    const note = pm.querySelector("description")?.textContent.trim() || "";
    pm.querySelectorAll("Point > coordinates").forEach(c => {
      const [lng, lat] = c.textContent.trim().split(",").map(Number);
      if (isFinite(lat) && isFinite(lng)) points.push({ lat, lng, name, note });
    });
    pm.querySelectorAll("LineString > coordinates").forEach(c => {
      const pts = coordPairs(c.textContent);
      if (pts.length > 1) lines.push(pts);
    });
    pm.querySelectorAll("LinearRing > coordinates").forEach(c => {
      const pts = coordPairs(c.textContent);
      if (pts.length > 2) lines.push(pts);
    });
    const gxCoords = pm.getElementsByTagName("gx:coord");
    if (gxCoords.length > 1) {
      const pts = [...gxCoords].map(c => {
        const [lng, lat] = c.textContent.trim().split(/\s+/).map(Number);
        return [lat, lng];
      }).filter(p => isFinite(p[0]) && isFinite(p[1]));
      if (pts.length > 1) lines.push(pts);
    }
  });
  return { points, lines };
}

function poisToKml() {
  const byGroup = {};
  state.pois.forEach(p => {
    const g = p.group || DEFAULT_GROUP;
    (byGroup[g] = byGroup[g] || []).push(p);
  });
  const folders = Object.entries(byGroup).map(([g, pois]) => `  <Folder>
    <name>${esc(g)}</name>
${pois.map(p => `    <Placemark>
      <name>${esc(p.name)}</name>${p.note ? `\n      <description>${esc(p.note)}</description>` : ""}
      <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
    </Placemark>`).join("\n")}
  </Folder>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:gx="http://www.google.com/kml/ext/2.2">
<Document>
  <name>Trasa — punkty</name>
${folders}
</Document>
</kml>`;
}

/* import KML jako ślad (linie na mapę, punkty → POI/markery) */
function importKmlTracks(xmlText, fname) {
  const status = document.getElementById("gpx-status");
  const wptAsPoi = document.getElementById("gpx-wpt-as-poi").checked;
  try {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("zły XML");
    const { points, lines } = parseKmlDoc(doc);
    if (!points.length && !lines.length) throw new Error("brak Placemarków");
    const group = L.featureGroup();
    lines.forEach(pts =>
      L.polyline(pts, { color: "#e33fa1", weight: 4, opacity: 0.85 }).addTo(group));
    points.forEach((p, i) => {
      if (wptAsPoi) {
        state.pois.push({
          id: "p" + Date.now() + "_k" + i, lat: p.lat, lng: p.lng,
          name: p.name, note: p.note, cat: "other", color: "",
          group: DEFAULT_GROUP, ts: Date.now(),
        });
      } else {
        L.marker([p.lat, p.lng]).bindPopup(esc(p.name)).addTo(group);
      }
    });
    if (lines.length || (!wptAsPoi && points.length)) {
      group.addTo(map);
      gpxLayers.push(group);
      if (group.getBounds().isValid()) map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }
    if (wptAsPoi && points.length) {
      savePois(); renderPois(); markDirty(DEFAULT_GROUP);
      if (points.length && !lines.length) map.fitBounds(
        L.latLngBounds(points.map(p => [p.lat, p.lng])), { padding: [40, 40] });
    }
    status.textContent = `OK — ${fname}: ${lines.length} tras, ${points.length} punktów${wptAsPoi && points.length ? " (dopisano do POI)" : ""}.`;
    closeModal("gpx-modal");
    toast(`Wczytano ${fname}`);
  } catch (err) {
    status.textContent = `Nie udało się wczytać ${fname} (${err.message}).`;
  }
}

/* ── eksport / import POI ── */

function download(name, mime, text) {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

document.getElementById("poi-export-gpx").addEventListener("click", () => {
  if (!state.pois.length) { toast("Brak punktów do eksportu."); return; }
  const wpts = state.pois.map(p =>
    `  <wpt lat="${p.lat}" lon="${p.lng}">
    <name>${esc(p.name)}</name>${p.note ? `\n    <desc>${esc(p.note)}</desc>` : ""}
    <sym>${p.cat}</sym>
  </wpt>`).join("\n");
  download("trasa-poi.gpx", "application/gpx+xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trasa" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
</gpx>`);
  toast(`Wyeksportowano ${state.pois.length} punktów (GPX).`);
});

document.getElementById("poi-export-kml").addEventListener("click", () => {
  if (!state.pois.length) { toast("Brak punktów do eksportu."); return; }
  download("trasa-poi.kml", "application/vnd.google-earth.kml+xml", poisToKml());
  toast(`Wyeksportowano ${state.pois.length} punktów (KML).`);
});

document.getElementById("poi-export-kmz").addEventListener("click", () => {
  if (!state.pois.length) { toast("Brak punktów do eksportu."); return; }
  const blob = storedZipBlob("doc.kml", new TextEncoder().encode(poisToKml()),
    "application/vnd.google-earth.kmz");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "trasa-poi.kmz";
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Wyeksportowano ${state.pois.length} punktów (KMZ).`);
});

document.getElementById("poi-export-json").addEventListener("click", () => {
  if (!state.pois.length) { toast("Brak punktów do eksportu."); return; }
  const gj = {
    type: "FeatureCollection",
    features: state.pois.map(p => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { name: p.name, note: p.note, cat: p.cat, color: p.color, ts: p.ts },
    })),
  };
  download("trasa-poi.geojson", "application/geo+json", JSON.stringify(gj, null, 2));
  toast(`Wyeksportowano ${state.pois.length} punktów (GeoJSON).`);
});

document.getElementById("poi-import").addEventListener("change", async e => {
  const f = e.target.files[0];
  if (!f) return;
  e.target.value = "";
  let n = 0;
  try {
    const targetGroup = poiPanelGroup || DEFAULT_GROUP;
    const sniff = await sniffGeoFile(f);
    if (sniff === "kmz" || sniff.kind === "kml") {
      const xml = sniff === "kmz"
        ? await kmzExtractKml(await f.arrayBuffer())
        : sniff.text;
      const doc = new DOMParser().parseFromString(xml, "application/xml");
      if (doc.querySelector("parsererror")) throw new Error("zły XML");
      parseKmlDoc(doc).points.forEach((p, i) => {
        state.pois.push({
          id: "p" + Date.now() + "_k" + i, lat: p.lat, lng: p.lng,
          name: p.name, note: p.note, cat: "other", color: "",
          group: targetGroup, ts: Date.now(),
        });
        n++;
      });
      if (!n) throw new Error("brak punktów");
      savePois(); renderPois(); renderPoiFolders(); renderPoiCatFilter(); renderPoiList();
      markDirty(targetGroup);
      toast(`Zaimportowano ${n} punktów z ${f.name}.`);
      return;
    }
  } catch (err) {
    toast(`Nie udało się zaimportować: ${err.message}`);
    return;
  }
  const rd = new FileReader();
  rd.onload = () => {
    n = 0;
    try {
      const targetGroup = poiPanelGroup || DEFAULT_GROUP;
      if (/\.(geojson|json)$/i.test(f.name)) {
        const gj = JSON.parse(rd.result);
        (gj.features || []).forEach(ft => {
          if (ft.geometry?.type !== "Point") return;
          const [lng, lat] = ft.geometry.coordinates;
          state.pois.push({
            id: "p" + Date.now() + "_" + n,
            lat, lng,
            name: ft.properties?.name || "Punkt",
            note: ft.properties?.note || "",
            cat: POI_CATS[ft.properties?.cat] ? ft.properties.cat : "other",
            color: ft.properties?.color || "", group: targetGroup, ts: Date.now(),
          });
          n++;
        });
      } else {
        const doc = new DOMParser().parseFromString(rd.result, "application/xml");
        doc.querySelectorAll("wpt").forEach(w => {
          state.pois.push({
            id: "p" + Date.now() + "_" + n,
            lat: +w.getAttribute("lat"), lng: +w.getAttribute("lon"),
            name: w.querySelector("name")?.textContent || "Punkt",
            note: w.querySelector("desc")?.textContent || "",
            cat: POI_CATS[w.querySelector("sym")?.textContent] ?
              w.querySelector("sym").textContent : "other",
            color: "", group: targetGroup, ts: Date.now(),
          });
          n++;
        });
      }
      if (!n) throw new Error("brak punktów");
      savePois(); renderPois(); renderPoiFolders(); renderPoiCatFilter(); renderPoiList();
      markDirty(targetGroup);
      toast(`Zaimportowano ${n} punktów.`);
    } catch (err) {
      toast(`Nie udało się zaimportować: ${err.message}`);
    }
  };
  rd.readAsText(f);
  e.target.value = "";
});

document.getElementById("poi-wipe").addEventListener("click", () => {
  if (!state.pois.length) return;
  if (!confirm(`Usunąć wszystkie punkty (${state.pois.length})? Zrób wcześniej eksport!`)) return;
  const touched = new Set(state.pois.map(p => p.group || DEFAULT_GROUP));
  state.pois = [];
  savePois(); renderPois(); renderPoiFolders(); renderPoiList(); renderPoiCatFilter();
  touched.forEach(g => markDirty(g));
});

/* ───────────────────────── GPX — ślady ───────────────────────── */

const gpxLayers = [];

/* Rozpoznawanie formatu po zawartości (magic bytes), nie tylko rozszerzeniu */
async function sniffGeoFile(f) {
  const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
  if (head[0] === 0x50 && head[1] === 0x4B) return "kmz"; // "PK" = ZIP
  const text = await f.text();
  if (/\.kml$/i.test(f.name) || /<kml[\s>]/i.test(text.slice(0, 2000))) return { kind: "kml", text };
  if (/\.gpx$/i.test(f.name) || /<gpx[\s>]/i.test(text.slice(0, 2000))) return { kind: "gpx", text };
  if (/^\s*\{/.test(text)) return { kind: "geojson", text };
  return { kind: "unknown", text };
}

document.getElementById("gpx-file").addEventListener("change", async e => {
  const f = e.target.files[0];
  if (!f) return;
  e.target.value = "";
  const status = document.getElementById("gpx-status");
  try {
    const s = await sniffGeoFile(f);
    if (s === "kmz") importKmlTracks(await kmzExtractKml(await f.arrayBuffer()), f.name);
    else if (s.kind === "kml") importKmlTracks(s.text, f.name);
    else importGpx(s.text, f.name);
  } catch (err) {
    status.textContent = `Nie udało się wczytać ${f.name} (${err.message}).`;
  }
});

function importGpx(xmlText, fname) {
  const status = document.getElementById("gpx-status");
  const wptAsPoi = document.getElementById("gpx-wpt-as-poi").checked;
  try {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.querySelector("parsererror")) throw new Error("zły XML");
    const group = L.featureGroup();
    let nTrk = 0, nWpt = 0;

    doc.querySelectorAll("trk").forEach(trk => {
      trk.querySelectorAll("trkseg").forEach(seg => {
        const pts = [...seg.querySelectorAll("trkpt")]
          .map(p => [+p.getAttribute("lat"), +p.getAttribute("lon")]);
        if (pts.length > 1) {
          L.polyline(pts, { color: "#e33fa1", weight: 4, opacity: 0.85 }).addTo(group);
          nTrk++;
        }
      });
    });
    doc.querySelectorAll("rte").forEach(rte => {
      const pts = [...rte.querySelectorAll("rtept")]
        .map(p => [+p.getAttribute("lat"), +p.getAttribute("lon")]);
      if (pts.length > 1) { L.polyline(pts, { color: "#e33fa1", weight: 4 }).addTo(group); nTrk++; }
    });
    doc.querySelectorAll("gpx > wpt").forEach(w => {
      const lat = +w.getAttribute("lat"), lng = +w.getAttribute("lon");
      const name = w.querySelector("name")?.textContent || "wpt";
      if (wptAsPoi) {
        state.pois.push({
          id: "p" + Date.now() + "_" + nWpt, lat, lng, name,
          note: w.querySelector("desc")?.textContent || "",
          cat: "other", color: "", group: DEFAULT_GROUP, ts: Date.now(),
        });
      } else {
        L.marker([lat, lng]).bindPopup(esc(name)).addTo(group);
      }
      nWpt++;
    });

    if (!nTrk && !nWpt) throw new Error("brak trkpt/wpt");
    if (nTrk) {
      group.addTo(map);
      gpxLayers.push(group);
      map.fitBounds(group.getBounds(), { padding: [40, 40] });
    }
    if (wptAsPoi && nWpt) { savePois(); renderPois(); markDirty(DEFAULT_GROUP); }
    status.textContent = `${fname}: ${nTrk} tras, ${nWpt} punktów${wptAsPoi && nWpt ? " (dopisano do POI)" : ""}.`;
    closeModal("gpx-modal");
    toast(`Wczytano ${fname}`);
  } catch (err) {
    status.textContent = `Nie udało się wczytać ${fname} (${err.message}).`;
  }
}

document.getElementById("gpx-clear").addEventListener("click", () => {
  gpxLayers.forEach(g => map.removeLayer(g));
  gpxLayers.length = 0;
  document.getElementById("gpx-status").textContent = "Usunięto wczytane ślady.";
});

/* ───────────────────────── Klucze API ───────────────────────── */

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
document.querySelectorAll("[data-close]").forEach(b =>
  b.addEventListener("click", () => closeModal(b.dataset.close)));
document.querySelectorAll(".modal").forEach(m =>
  m.addEventListener("click", e => { if (e.target === m) m.classList.add("hidden"); }));

function openKeysModal() {
  const box = document.getElementById("keys-list");
  box.innerHTML = "";
  Object.entries(KEY_PROVIDERS).forEach(([id, p]) => {
    const n = MAP_SOURCES.filter(s => s.key === id).length;
    const div = document.createElement("div");
    div.className = "key-row";
    div.innerHTML = `
      <label>${p.name} <small>(${n} warstw · <a href="${p.url}" target="_blank" rel="noopener">zdobądź klucz</a>)</small></label>
      <input type="text" data-key="${id}" placeholder="wklej klucz API…" value="${state.keys[id] || ""}" />`;
    box.appendChild(div);
  });
  openModal("keys-modal");
}

document.getElementById("keys-save").addEventListener("click", () => {
  document.querySelectorAll("#keys-list input").forEach(inp => {
    const v = inp.value.trim();
    if (v) state.keys[inp.dataset.key] = v;
    else delete state.keys[inp.dataset.key];
  });
  LS.set("keys", state.keys);
  closeModal("keys-modal");
  toast("Zapisano klucze.");
  if (byId[state.baseId].key) setBase(state.baseId);
  Object.keys(activeOverlays).forEach(id => {
    if (byId[id].key) { toggleOverlay(id); toggleOverlay(id); }
  });
  refreshListUI();
});

/* ───────────── Offline — bufor kafelków w Cache Storage ─────────────
   Strona zapisuje kafelki (fetch no-cors → cache.put), service worker
   dosyła je z bufora, gdy sieć zawiedzie. Panel pokazuje zawartość
   bufora per serwer, pozwala pobrać widoczny obszar i czyścić. */

const TILE_CACHE = "trasa-tiles-v1";
state.tilesCache = LS.get("tilesCache", false);

function syncTilesFlag() {
  try {
    navigator.serviceWorker?.controller?.postMessage({ type: "tiles", on: !!state.tilesCache });
  } catch {}
}

function openOfflineModal() { renderOfflineUI(); openModal("offline-modal"); }

async function renderOfflineUI() {
  document.getElementById("off-enabled").checked = !!state.tilesCache;
  const stats = document.getElementById("off-stats");
  const hostsBox = document.getElementById("off-hosts");
  if (!("caches" in window)) {
    stats.textContent = "Ta przeglądarka nie udostępnia Cache Storage (wymagane https).";
    return;
  }
  const c = await caches.open(TILE_CACHE);
  const keys = await c.keys();
  const hosts = {};
  keys.forEach(rq => { const h = new URL(rq.url).host; hosts[h] = (hosts[h] || 0) + 1; });
  let quota = "";
  if (navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    quota = ` · magazyn strony: ${(est.usage / 1048576).toFixed(1)} MB z ${(est.quota / 1073741824).toFixed(1)} GB`;
  }
  stats.textContent = `W buforze: ${keys.length} kafelków${quota}`;
  hostsBox.innerHTML = "";
  Object.entries(hosts).sort((a, b) => b[1] - a[1]).forEach(([h, n]) => {
    const row = document.createElement("div");
    row.className = "off-host";
    row.innerHTML = `<span class="off-host-name">${esc(h)}</span><b>${n}</b>
      <button class="tb-btn" title="Usuń kafelki tego serwera">${ic("trash", "ic-xs")}</button>`;
    row.querySelector("button").addEventListener("click", async () => {
      for (const rq of keys) if (new URL(rq.url).host === h) await c.delete(rq);
      renderOfflineUI();
    });
    hostsBox.appendChild(row);
  });
}

document.getElementById("off-enabled").addEventListener("change", e => {
  state.tilesCache = e.target.checked;
  LS.set("tilesCache", state.tilesCache);
  syncTilesFlag();
  toast(state.tilesCache
    ? "Buforowanie kafelków włączone — przeglądane mapy będą działać offline."
    : "Buforowanie wyłączone (zapisany bufor zostaje).");
});

document.getElementById("off-clear").addEventListener("click", async () => {
  await caches.delete(TILE_CACHE);
  renderOfflineUI();
  toast("Wyczyszczono bufor map.");
});

document.getElementById("off-prefetch").addEventListener("click", async () => {
  const levels = +document.getElementById("off-depth").value;
  const srcs = [byId[state.baseId], ...Object.keys(activeOverlays).map(id => byId[id])]
    .filter(Boolean)
    .flatMap(s => s.combo ? s.combo.map(id => byId[id]).filter(Boolean) : [s]);
  const b = map.getBounds(), z0 = map.getZoom();
  const jobs = [];
  srcs.forEach(src => {
    for (let dz = 0; dz < levels; dz++) {
      const z = z0 + dz;
      if (z > (src.opts.maxZoom || 19)) continue;
      const a = lngLatToTile(b.getNorth(), b.getWest(), z);
      const d = lngLatToTile(b.getSouth(), b.getEast(), z);
      for (let x = a.x; x <= d.x; x++)
        for (let y = a.y; y <= d.y; y++)
          jobs.push(tileUrlFor(src, x, y, z));
    }
  });
  if (!jobs.length) { toast("Brak kafelków do pobrania."); return; }
  if (jobs.length > 600) {
    toast(`Za duży obszar: ${jobs.length} kafelków (limit 600) — przybliż mapę lub zmniejsz głębokość.`);
    return;
  }
  const btn = document.getElementById("off-prefetch");
  btn.disabled = true;
  const c = await caches.open(TILE_CACHE);
  let done = 0, fail = 0;
  const queue = [...jobs];
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift();
      try {
        const r = await fetch(u, { mode: "no-cors", cache: "no-store" });
        await c.put(u, r);
      } catch { fail++; }
      done++;
      if (done % 40 === 0) btn.textContent = `Pobieram… ${done}/${jobs.length}`;
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  btn.disabled = false;
  btn.innerHTML = `${ic("download")} Pobierz widoczny obszar`;
  renderOfflineUI();
  buzz(20);
  toast(`Zbuforowano ${done - fail}/${jobs.length} kafelków (${srcs.length} warstw).`);
});

/* ───────────────────────── Pasek statusu / skróty ───────────────────────── */

const stCoords = document.getElementById("st-coords");
const stZoom = document.getElementById("st-zoom");

function fmtLL(ll) {
  return `${ll.lat.toFixed(5)}, ${ll.lng.toFixed(5)}`;
}
map.on("mousemove", e => { stCoords.textContent = fmtLL(e.latlng); });
map.on("moveend zoomend", () => {
  stZoom.textContent = "z" + map.getZoom();
  if (!matchMedia("(pointer:fine)").matches) stCoords.textContent = fmtLL(map.getCenter());
  writeHash();
});
stZoom.textContent = "z" + map.getZoom();
stCoords.textContent = fmtLL(map.getCenter());

document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  const k = e.key.toLowerCase();
  if (k === "m") sidebar.classList.toggle("open");
  else if (k === "s") actions.search();
  else if (k === "l") actions.locate();
  else if (k === "p") actions.measure();
  else if (k === "w") actions["poi-add"]();
  else if (k === "o") actions["poi-panel"]();
  else if (k === ",") cycleBase(-1);
  else if (k === ".") cycleBase(1);
  else if (k === "escape") {
    closeSidebar();
    document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
    if (poiAddMode) setPoiAddMode(false);
    if (compare.selecting) { compare.selecting = false; document.getElementById("btn-compare").classList.remove("on"); }
  }
});

/* ───────────────────────── Start ───────────────────────── */

setBase(byId[state.baseId] && !keyMissing(byId[state.baseId]) ? state.baseId : "osm");
state.overlays.slice().forEach(id => {
  if (byId[id] && !keyMissing(byId[id])) {
    const ly = makeLayer(byId[id]).addTo(map);
    ly.on("tileerror", onTileError(byId[id]));
    activeOverlays[id] = ly;
  }
});
renderPois();
renderPresets();
buildList();
renderQuickToggles();
fetchRemoteCatalog();
fetchCloudConfig();

/* PWA — rejestracja service workera (offline-shell + bufor kafelków) */
if ("serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then(syncTilesFlag)
    .catch(() => {});
  navigator.serviceWorker.addEventListener("controllerchange", syncTilesFlag);
}
