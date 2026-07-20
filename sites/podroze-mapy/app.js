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
  pois: null,                                 // ładowane niżej (z migracją)
  poiHiddenCats: new Set(LS.get("poiHiddenCats", [])),
};

/* POI v2 + migracja ze starego formatu waypoints */
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
  state.pois = pois || [];
})();

const byId = {};
MAP_SOURCES.forEach(s => (byId[s.id] = s));

function buzz(ms = 12) { try { navigator.vibrate && navigator.vibrate(ms); } catch {} }

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

function makeLayer(src, extra = {}) {
  const opts = Object.assign({ crossOrigin: false }, src.opts, extra);
  if (state.opacity[src.id] != null && !extra.pane) opts.opacity = state.opacity[src.id];
  if (src.type === "wms") {
    const wms = Object.assign({ version: "1.1.1", transparent: false }, src.wms, {
      format: src.wms.format || "image/png",
    });
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
    toast(`🔑 Warstwa „${src.name}" wymaga klucza ${KEY_PROVIDERS[src.key].name} — dodaj go w menu kluczy.`);
    openKeysModal();
    return;
  }
  if (baseLayer) map.removeLayer(baseLayer);
  baseLayer = makeLayer(src).addTo(map);
  baseLayer.on("tileerror", onTileError(src));
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
        toast(`🔑 Nakładka „${src.name}" wymaga klucza ${KEY_PROVIDERS[src.key].name}.`);
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
      toast(`⚠️ „${src.name}" używa http — przeglądarka blokuje ją na stronie https.`);
    } else if (src.home) {
      toast(`⚠️ „${src.name}" może nie pokrywać tego obszaru — użyj ▶ przy warstwie, aby przelecieć do jej zasięgu.`);
    } else {
      toast(`⚠️ Kafelki „${src.name}" nie odpowiadają (serwer/zasięg/limit).`);
    }
  };
}

/* ───────────────────────── Profile map (presety) ───────────────────────── */

const BUILTIN_PRESETS = [
  { name: "🥾 Turystyka", base: "opentopo", overlays: ["wt-hiking"] },
  { name: "🚴 Rower", base: "cyclosm", overlays: ["wt-cycling"] },
  { name: "⛷️ Zima", base: "opentopo", overlays: ["wt-slopes", "opensnowmap"] },
  { name: "🛰️ Satelita+", base: "esri-imagery", overlays: ["google-roads"] },
  { name: "🇵🇱 Orto+działki", base: "geoportal-orto", overlays: ["gugik-dzialki"] },
];

function applyPreset(p) {
  clearOverlays();
  if (p.opacity) {
    Object.assign(state.opacity, p.opacity);
    LS.set("opacity", state.opacity);
  }
  setBase(p.base);
  (p.overlays || []).forEach(id => { if (byId[id]) toggleOverlay(id, true); });
  toast(`🗺️ Profil: ${p.name}`, 1800);
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
  toast(`💾 Zapisano profil „${name}".`);
}

function renderPresets() {
  const box = document.getElementById("preset-chips");
  box.innerHTML = "";
  const mk = (p, removable, idx) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.innerHTML = `<span>${p.name}</span>${removable ? '<i class="chip-x" title="Usuń profil">✕</i>' : ""}`;
    chip.addEventListener("click", e => {
      if (e.target.classList.contains("chip-x")) {
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
  add.textContent = "＋ zapisz obecny";
  add.title = "Zapisz aktualną mapę + nakładki jako profil";
  add.addEventListener("click", () => openNameModal());
  box.appendChild(add);
}

function openNameModal() {
  const inp = document.getElementById("name-input");
  inp.value = "";
  openModal("name-modal");
  setTimeout(() => inp.focus(), 60);
}
document.getElementById("name-save").addEventListener("click", () => {
  const name = document.getElementById("name-input").value.trim();
  if (!name) { toast("Podaj nazwę profilu."); return; }
  saveCurrentPreset(name);
  closeModal("name-modal");
});
document.getElementById("name-input").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("name-save").click();
});

/* ───────────────────────── Tryb porównywania (🆚) ───────────────────────── */

const compare = { layer: null, srcId: null, x: 0.55, active: false, selecting: false };
const divider = document.getElementById("compare-divider");
const stCompare = document.getElementById("st-compare");

document.getElementById("btn-compare").addEventListener("click", () => {
  if (compare.active) { stopCompare(); return; }
  compare.selecting = true;
  document.getElementById("btn-compare").classList.add("on");
  toast("🆚 Wybierz z listy drugą mapę do porównania…", 4200);
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
  toast(`🆚 Porównujesz: ${byId[state.baseId].name} | ${src.name}. Przeciągnij uchwyt.`);
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

function buildList(filter = "") {
  const q = filter.trim().toLowerCase();
  layerList.innerHTML = "";
  const cats = ["⭐ Ulubione", "🕘 Ostatnio używane", ...CATEGORY_ORDER];
  let shown = 0;

  cats.forEach(cat => {
    let items;
    if (cat === "⭐ Ulubione") items = MAP_SOURCES.filter(s => state.favs.has(s.id));
    else if (cat === "🕘 Ostatnio używane")
      items = state.recents.map(id => byId[id]).filter(Boolean);
    else items = MAP_SOURCES.filter(s => s.cat === cat);

    const visible = items.filter(s =>
      !q || (s.name + " " + (s.desc || "") + " " + s.id).toLowerCase().includes(q));
    if (!visible.length) return;

    const sec = document.createElement("section");
    sec.className = "cat";
    const head = document.createElement("div");
    head.className = "cat-head";
    head.innerHTML = `<span class="cat-name">${cat}</span>
      <span class="cat-n">${visible.length}</span>
      <button class="cat-test" title="Testuj dostępność warstw w kategorii">⚡</button>`;
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
        !["⭐ Ulubione", "🕘 Ostatnio używane", "OpenStreetMap", "Topo / Outdoor"].includes(cat)) {
      sec.classList.add("closed");
    }
    layerList.appendChild(sec);
    shown += visible.length;
  });

  document.getElementById("layer-count").textContent = `${MAP_SOURCES.length} warstw`;
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

  const badge = src.overlay ? "🧩" : "🗺️";
  const lock = keyMissing(src) ? " 🔒" : "";
  const httpWarn = src.http ? ` <span class="http-badge" title="Serwer tylko http">http</span>` : "";
  const cmp = compare.srcId === src.id ? ` <span class="cmp-badge">🆚</span>` : "";

  row.innerHTML = `
    <button class="lr-main" title="${(src.desc || "").replace(/"/g, "&quot;")}">
      <span class="lr-type">${badge}</span>
      <span class="lr-name">${src.name}${lock}${httpWarn}${cmp}</span>
      <span class="lr-dot" title="Status testu"></span>
    </button>
    ${src.home ? `<button class="lr-home" title="Przeleć do zasięgu mapy">▶</button>` : ""}
    <button class="lr-fav ${state.favs.has(src.id) ? "on" : ""}" title="Ulubione">★</button>
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
}

/* Test dostępności: ładuje 1 kafelek testowy każdej warstwy w kategorii */
function lngLatToTile(lat, lng, z) {
  const n = 2 ** z;
  const x = Math.floor(((lng + 180) / 360) * n);
  const rad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n);
  return { x, y };
}

function testTileUrl(src) {
  const [lat, lng, z] = src.home || [52.2, 19.4, 6];
  const zz = Math.min(z, src.opts.maxZoom || 19);
  let { x, y } = lngLatToTile(lat, lng, zz);
  if (src.type === "wms") {
    const R = 6378137, d = 20037508.34 / 2 ** zz;
    const mx = (lng * Math.PI * R) / 180;
    const my = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const bbox = [mx - d, my - d, mx + d, my + d].join(",");
    const p = new URLSearchParams({
      SERVICE: "WMS", REQUEST: "GetMap", VERSION: "1.1.1",
      LAYERS: src.wms.layers, STYLES: "", SRS: "EPSG:3857",
      BBOX: bbox, WIDTH: 256, HEIGHT: 256,
      FORMAT: src.wms.format || "image/png",
      TRANSPARENT: src.wms.transparent ? "TRUE" : "FALSE",
    });
    return src.url + (src.url.includes("?") ? "&" : "?") + p;
  }
  if (src.opts.tms) y = 2 ** zz - 1 - y;
  let u = resolveUrl(src)
    .replace("{z}", zz).replace("{x}", x).replace("{y}", y).replace("{r}", "");
  if (src.opts.subdomains) u = u.replace("{s}", String(src.opts.subdomains)[0]);
  return u;
}

function testCategory(items, sec) {
  toast("⚡ Testuję warstwy… (zielona kropka = OK)");
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
  if (next) { buzz(); setBase(next.id); toast(`🗺️ ${next.name}`, 1600); }
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
  toast("📍 Ustalam pozycję…");
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
    toast("📏 Klikaj na mapie, aby mierzyć. Ponowne kliknięcie przycisku kończy i czyści.");
    stMeasure.classList.remove("hidden");
    stMeasure.textContent = "📏 0 m";
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
  other:     { e: "⭐", n: "Ogólny",     c: "#ff7a1a" },
  sleep:     { e: "🛏️", n: "Nocleg",     c: "#8b5cf6" },
  food:      { e: "🍴", n: "Jedzenie",   c: "#ef4444" },
  water:     { e: "💧", n: "Woda",       c: "#2f8cff" },
  peak:      { e: "⛰️", n: "Szczyt",     c: "#10b981" },
  view:      { e: "📷", n: "Widok",      c: "#f59e0b" },
  heritage:  { e: "🏰", n: "Zabytek",    c: "#b0813f" },
  transport: { e: "🚉", n: "Transport",  c: "#64748b" },
  danger:    { e: "⚠️", n: "Uwaga",      c: "#e5484d" },
};
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
  const e = POI_CATS[p.cat]?.e || "⭐";
  return L.divIcon({
    className: "poi-div",
    iconSize: [34, 44], iconAnchor: [17, 42], popupAnchor: [0, -40],
    html: `<div class="poi-pin" style="--pc:${c}">
      <svg viewBox="0 0 34 44" width="34" height="44">
        <path d="M17 1C8.7 1 2 7.7 2 16c0 10.5 12.2 24.3 14.2 26.5a1.1 1.1 0 0 0 1.6 0C19.8 40.3 32 26.5 32 16 32 7.7 25.3 1 17 1z"
          fill="var(--pc)" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>
        <circle cx="17" cy="16" r="11" fill="rgba(255,255,255,.92)"/>
      </svg>
      <span class="poi-emoji">${e}</span>
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
    <strong>${POI_CATS[p.cat]?.e || "⭐"} ${esc(p.name)}</strong>
    ${p.note ? `<p>${esc(p.note)}</p>` : ""}
    <small>${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</small>
    <div class="poi-popup-btns">
      <button data-a="edit">✏️ Edytuj</button>
      <button data-a="nav">🧭 Nawiguj</button>
      <button data-a="copy">📋</button>
      <button data-a="del" class="danger">🗑️</button>
    </div>`;
  div.addEventListener("click", e => {
    const a = e.target.dataset?.a;
    if (!a) return;
    if (a === "edit") { map.closePopup(); openPoiEditor(p); }
    else if (a === "nav") window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, "_blank");
    else if (a === "copy") {
      navigator.clipboard?.writeText(`${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
      toast("📋 Skopiowano współrzędne.");
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
  buzz(20);
  toast(`🗑️ Usunięto „${lastDeleted.poi.name}".`, 6000, {
    label: "↩️ Cofnij",
    fn: () => {
      state.pois.splice(lastDeleted.index, 0, lastDeleted.poi);
      savePois(); renderPois(); renderPoiList();
      toast("Przywrócono punkt.");
    },
  });
}

/* tryb dodawania: przycisk 📌 albo long-press na mapie */
function setPoiAddMode(on) {
  poiAddMode = on;
  setActionState("poi-add", on);
  document.getElementById("map").style.cursor = on ? "crosshair" : "";
  if (on) toast("📌 Kliknij na mapie, aby dodać punkt (albo przytrzymaj palec).");
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
    stMeasure.textContent = "📏 " + fmtDist(d);
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
      <button data-a="add">📌 Dodaj POI</button>
      <button data-a="copy">📋 Kopiuj</button>
      <button data-a="nav">🧭 Nawiguj</button>
    </div>`;
  const pop = L.popup({ maxWidth: 240 }).setLatLng(ll).setContent(div).openOn(map);
  div.addEventListener("click", ev => {
    const a = ev.target.dataset?.a;
    if (!a) return;
    map.closePopup(pop);
    if (a === "add") openPoiEditor(null, ll);
    else if (a === "copy") {
      navigator.clipboard?.writeText(`${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)}`);
      toast("📋 Skopiowano współrzędne.");
    } else if (a === "nav") window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${ll.lat},${ll.lng}`, "_blank");
  });
});

/* ── edytor POI ── */

let editCat = "other", editColor = "";

function openPoiEditor(poi, latlng) {
  editingPoiId = poi ? poi.id : null;
  pendingLatLng = poi ? { lat: poi.lat, lng: poi.lng } : latlng;
  editCat = poi ? poi.cat : "other";
  editColor = poi ? poi.color : "";
  document.getElementById("poi-modal-title").textContent =
    poi ? "✏️ Edytuj punkt" : "📌 Nowy punkt";
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

function renderPoiCatChips() {
  const box = document.getElementById("poi-cats");
  box.innerHTML = "";
  Object.entries(POI_CATS).forEach(([id, c]) => {
    const b = document.createElement("button");
    b.className = "chip" + (editCat === id ? " sel" : "");
    b.textContent = `${c.e} ${c.n}`;
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
    if (p) Object.assign(p, { name, note, cat: editCat, color: editColor });
  } else {
    state.pois.push({
      id: "p" + Date.now() + "_" + Math.floor(Math.random() * 1e4),
      lat: pendingLatLng.lat, lng: pendingLatLng.lng,
      name, note, cat: editCat, color: editColor, ts: Date.now(),
    });
  }
  savePois(); renderPois(); renderPoiList();
  closeModal("poi-modal");
  buzz();
  toast(editingPoiId ? "✏️ Zapisano zmiany." : `📌 Dodano: ${name}`);
});

document.getElementById("poi-delete").addEventListener("click", () => {
  if (!editingPoiId) return;
  closeModal("poi-modal");
  deletePoi(editingPoiId);
});

/* ── panel listy POI ── */

let poiPanelQ = "", poiPanelCat = null;

function openPoiPanel() {
  poiPanelQ = "";
  document.getElementById("poi-filter").value = "";
  renderPoiCatFilter();
  renderPoiList();
  openModal("poi-panel");
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
    b.className = "chip" + (poiPanelCat === id ? " sel" : "");
    const hidden = state.poiHiddenCats.has(id);
    b.innerHTML = `${c.e} ${c.n}${hidden ? " 🚫" : ""}`;
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
    .filter(p => !poiPanelCat || p.cat === poiPanelCat)
    .filter(p => !poiPanelQ ||
      (p.name + " " + p.note).toLowerCase().includes(poiPanelQ))
    .map(p => ({ p, d: map.distance(center, [p.lat, p.lng]) }))
    .sort((a, b) => a.d - b.d);

  document.getElementById("poi-count").textContent =
    state.pois.length ? `${state.pois.length}` : "";

  if (!items.length) {
    box.innerHTML = `<div class="empty">Brak punktów. Dodaj pierwszy przyciskiem 📌
      albo przytrzymując palec na mapie.</div>`;
    return;
  }
  box.innerHTML = "";
  items.forEach(({ p, d }) => {
    const row = document.createElement("div");
    row.className = "poi-row";
    row.innerHTML = `
      <span class="poi-row-ico" style="--pc:${poiColor(p)}">${POI_CATS[p.cat]?.e || "⭐"}</span>
      <span class="poi-row-body">
        <b>${esc(p.name)}</b>
        ${p.note ? `<small>${esc(p.note.slice(0, 60))}${p.note.length > 60 ? "…" : ""}</small>` : ""}
      </span>
      <span class="poi-row-dist">${fmtDist(d)}</span>
      <button class="poi-row-edit" title="Edytuj">✏️</button>`;
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
  toast(`💾 Wyeksportowano ${state.pois.length} punktów (GPX).`);
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
  toast(`💾 Wyeksportowano ${state.pois.length} punktów (GeoJSON).`);
});

document.getElementById("poi-import").addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => {
    let n = 0;
    try {
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
            color: ft.properties?.color || "", ts: Date.now(),
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
            color: "", ts: Date.now(),
          });
          n++;
        });
      }
      if (!n) throw new Error("brak punktów");
      savePois(); renderPois(); renderPoiCatFilter(); renderPoiList();
      toast(`📂 Zaimportowano ${n} punktów.`);
    } catch (err) {
      toast(`❌ Nie udało się zaimportować: ${err.message}`);
    }
  };
  rd.readAsText(f);
  e.target.value = "";
});

document.getElementById("poi-wipe").addEventListener("click", () => {
  if (!state.pois.length) return;
  if (!confirm(`Usunąć wszystkie punkty (${state.pois.length})? Zrób wcześniej eksport!`)) return;
  state.pois = [];
  savePois(); renderPois(); renderPoiList(); renderPoiCatFilter();
});

/* ───────────────────────── GPX — ślady ───────────────────────── */

const gpxLayers = [];

document.getElementById("gpx-file").addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => importGpx(rd.result, f.name);
  rd.readAsText(f);
  e.target.value = "";
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
          cat: "other", color: "", ts: Date.now(),
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
    if (wptAsPoi && nWpt) { savePois(); renderPois(); }
    status.textContent = `✅ ${fname}: ${nTrk} tras, ${nWpt} punktów${wptAsPoi && nWpt ? " (dopisano do POI)" : ""}.`;
    closeModal("gpx-modal");
    toast(`🛰️ Wczytano ${fname}`);
  } catch (err) {
    status.textContent = `❌ Nie udało się wczytać ${fname} (${err.message}).`;
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
  toast("🔑 Zapisano klucze.");
  if (byId[state.baseId].key) setBase(state.baseId);
  Object.keys(activeOverlays).forEach(id => {
    if (byId[id].key) { toggleOverlay(id); toggleOverlay(id); }
  });
  refreshListUI();
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

/* PWA — rejestracja service workera (fundament pod aplikację Android/TWA) */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
