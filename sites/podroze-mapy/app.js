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
  keys: LS.get("keys", {}),                   // provider → klucz
  waypoints: LS.get("waypoints", []),         // {lat,lng,name}
};

const byId = {};
MAP_SOURCES.forEach(s => (byId[s.id] = s));

function toast(msg, ms = 3200) {
  const el = document.getElementById("toast");
  el.textContent = msg;
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

function makeLayer(src) {
  const opts = Object.assign({ crossOrigin: false }, src.opts);
  if (state.opacity[src.id] != null) opts.opacity = state.opacity[src.id];
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

/* ───────────────────────── Warstwy aktywne ───────────────────────── */

let baseLayer = null;
const activeOverlays = {}; // id → L.Layer

function keyMissing(src) {
  return src.key && !(state.keys[src.key] || "").trim();
}

function setBase(id, { fly = false } = {}) {
  const src = byId[id];
  if (!src || src.overlay) return;
  if (keyMissing(src)) {
    toast(`🔑 Warstwa „${src.name}" wymaga klucza ${KEY_PROVIDERS[src.key].name} — dodaj go w menu kluczy.`);
    openModal("keys-modal");
    return;
  }
  if (baseLayer) map.removeLayer(baseLayer);
  baseLayer = makeLayer(src).addTo(map);
  baseLayer.on("tileerror", onTileError(src));
  state.baseId = id;
  LS.set("baseId", id);
  document.getElementById("active-map-name").textContent = src.name;
  if (fly && src.home) map.flyTo([src.home[0], src.home[1]], src.home[2]);
  refreshListUI();
  writeHash();
}

function toggleOverlay(id) {
  const src = byId[id];
  if (!src) return;
  if (activeOverlays[id]) {
    map.removeLayer(activeOverlays[id]);
    delete activeOverlays[id];
    state.overlays = state.overlays.filter(x => x !== id);
  } else {
    if (keyMissing(src)) {
      toast(`🔑 Nakładka „${src.name}" wymaga klucza ${KEY_PROVIDERS[src.key].name}.`);
      openModal("keys-modal");
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

/* Zgłoś raz problem z kafelkami danej warstwy */
const errWarned = new Set();
function onTileError(src) {
  return () => {
    if (errWarned.has(src.id)) return;
    errWarned.add(src.id);
    if (src.http && location.protocol === "https:") {
      toast(`⚠️ „${src.name}" używa http — przeglądarka blokuje ją na stronie https.`);
    } else if (src.home) {
      const [lat, lng, z] = src.home;
      toast(`⚠️ „${src.name}" może nie pokrywać tego obszaru — kliknij ▶ przy warstwie, aby przelecieć do jej zasięgu.`);
    } else {
      toast(`⚠️ Kafelki „${src.name}" nie odpowiadają (serwer/zasięg/limit).`);
    }
  };
}

/* ───────────────────────── Manager warstw (sidebar) ───────────────────────── */

const sidebar = document.getElementById("sidebar");
const layerList = document.getElementById("layer-list");

function catFor(src) { return src.cat; }

function buildList(filter = "") {
  const q = filter.trim().toLowerCase();
  layerList.innerHTML = "";
  const cats = ["⭐ Ulubione", ...CATEGORY_ORDER];
  let shown = 0;

  cats.forEach(cat => {
    const items = cat === "⭐ Ulubione"
      ? MAP_SOURCES.filter(s => state.favs.has(s.id))
      : MAP_SOURCES.filter(s => catFor(s) === cat);
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

    // domyślnie zwinięte dalsze kategorie (chyba że filtrujemy / aktywna warstwa w środku)
    const hasActive = visible.some(s => s.id === state.baseId || activeOverlays[s.id]);
    if (!q && !hasActive && !["⭐ Ulubione", "OpenStreetMap", "Topo / Outdoor"].includes(cat)) {
      sec.classList.add("closed");
    }
    layerList.appendChild(sec);
    shown += visible.length;
  });

  document.getElementById("layer-count").textContent =
    `${MAP_SOURCES.length} warstw`;
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

  const badge = src.overlay ? "🧩" : "🗺️";
  const lock = keyMissing(src) ? " 🔒" : "";
  const httpWarn = src.http ? ` <span class="http-badge" title="Serwer tylko http">http</span>` : "";

  row.innerHTML = `
    <button class="lr-main" title="${(src.desc || "").replace(/"/g, "&quot;")}">
      <span class="lr-type">${badge}</span>
      <span class="lr-name">${src.name}${lock}${httpWarn}</span>
      <span class="lr-dot" title="Status testu"></span>
    </button>
    ${src.home ? `<button class="lr-home" title="Przeleć do zasięgu mapy">▶</button>` : ""}
    <button class="lr-fav ${state.favs.has(src.id) ? "on" : ""}" title="Ulubione">★</button>
  `;

  row.querySelector(".lr-main").addEventListener("click", () => {
    if (src.overlay) toggleOverlay(src.id);
    else { setBase(src.id); if (window.innerWidth < 720) closeSidebar(); }
  });
  const homeBtn = row.querySelector(".lr-home");
  if (homeBtn) homeBtn.addEventListener("click", () => {
    map.flyTo([src.home[0], src.home[1]], src.home[2]);
    if (window.innerWidth < 720) closeSidebar();
  });
  row.querySelector(".lr-fav").addEventListener("click", e => {
    if (state.favs.has(src.id)) state.favs.delete(src.id);
    else state.favs.add(src.id);
    LS.set("favs", [...state.favs]);
    buildList(document.getElementById("layer-filter").value);
  });

  // suwak krycia dla aktywnych nakładek
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
    // ręczny GetMap 256×256 wokół punktu testowego (EPSG:3857)
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
document.getElementById("sb-close").addEventListener("click", closeSidebar);
document.getElementById("layer-filter").addEventListener("input", e =>
  buildList(e.target.value));

/* szybkie przełączanie map bazowych ‹ › (ulubione, a gdy brak — wszystkie) */
function baseCycle() {
  const favs = MAP_SOURCES.filter(s => !s.overlay && state.favs.has(s.id) && !keyMissing(s));
  const pool = favs.length > 1 ? favs
    : MAP_SOURCES.filter(s => !s.overlay && !keyMissing(s));
  return pool;
}
function cycleBase(dir) {
  const pool = baseCycle();
  const i = pool.findIndex(s => s.id === state.baseId);
  const next = pool[(i + dir + pool.length) % pool.length];
  if (next) { setBase(next.id); toast(`🗺️ ${next.name}`, 1600); }
}
document.getElementById("btn-prev-map").addEventListener("click", () => cycleBase(-1));
document.getElementById("btn-next-map").addEventListener("click", () => cycleBase(1));

/* ───────────────────────── Wyszukiwanie (Nominatim) ───────────────────────── */

const searchBar = document.getElementById("search-bar");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");

document.getElementById("btn-search").addEventListener("click", () => {
  searchBar.classList.toggle("hidden");
  if (!searchBar.classList.contains("hidden")) searchInput.focus();
});
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

document.getElementById("btn-locate").addEventListener("click", () => {
  if (watchId != null) { stopLocate(); return; }
  if (!navigator.geolocation) { toast("Brak geolokalizacji w tej przeglądarce."); return; }
  toast("📍 Ustalam pozycję…");
  follow = true;
  watchId = navigator.geolocation.watchPosition(onPos, err => {
    toast("Nie udało się pobrać pozycji: " + err.message);
    stopLocate();
  }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  document.getElementById("btn-locate").classList.add("on");
  stFollow.classList.remove("hidden");
});

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
  document.getElementById("btn-locate").classList.remove("on");
  stFollow.classList.add("hidden");
}
map.on("dragstart", () => { follow = false; });

/* ───────────────────────── Pomiar odległości ───────────────────────── */

let measuring = false;
const measure = { pts: [], line: null, marks: [] };
const stMeasure = document.getElementById("st-measure");

document.getElementById("btn-measure").addEventListener("click", () => {
  measuring = !measuring;
  document.getElementById("btn-measure").classList.toggle("on", measuring);
  if (measuring) {
    toast("📏 Klikaj na mapie, aby mierzyć. Ponowne kliknięcie przycisku kończy i czyści.");
    stMeasure.classList.remove("hidden");
    stMeasure.textContent = "📏 0 m";
  } else clearMeasure();
});

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
  if (addingWpt) {
    const name = prompt("Nazwa punktu:", "Punkt " + (state.waypoints.length + 1));
    if (name != null) addWaypoint(e.latlng.lat, e.latlng.lng, name.trim() || "Punkt");
    setWptMode(false);
  }
});

/* ───────────────────────── Punkty (waypointy) ───────────────────────── */

let addingWpt = false;
const wptLayer = L.layerGroup().addTo(map);

function setWptMode(on) {
  addingWpt = on;
  document.getElementById("btn-waypoint").classList.toggle("on", on);
  document.getElementById("map").style.cursor = on ? "crosshair" : "";
  if (on) toast("📌 Kliknij na mapie, aby dodać punkt.");
}
document.getElementById("btn-waypoint").addEventListener("click", () =>
  setWptMode(!addingWpt));

function renderWaypoints() {
  wptLayer.clearLayers();
  state.waypoints.forEach((w, i) => {
    const mk = L.marker([w.lat, w.lng], { title: w.name }).addTo(wptLayer);
    mk.bindPopup(`<b>${w.name}</b><br>${w.lat.toFixed(5)}, ${w.lng.toFixed(5)}<br>
      <a href="#" data-del="${i}">🗑️ usuń punkt</a>`);
    mk.on("popupopen", ev => {
      const a = ev.popup.getElement().querySelector("[data-del]");
      if (a) a.addEventListener("click", e2 => {
        e2.preventDefault();
        state.waypoints.splice(i, 1);
        LS.set("waypoints", state.waypoints);
        renderWaypoints(); renderWptList();
      });
    });
  });
}
function addWaypoint(lat, lng, name) {
  state.waypoints.push({ lat, lng, name });
  LS.set("waypoints", state.waypoints);
  renderWaypoints(); renderWptList();
  toast(`📌 Dodano: ${name}`);
}

function renderWptList() {
  const box = document.getElementById("wpt-list");
  if (!state.waypoints.length) { box.innerHTML = "<em>Brak zapisanych punktów.</em>"; return; }
  box.innerHTML = "<strong>Twoje punkty:</strong>";
  state.waypoints.forEach(w => {
    const div = document.createElement("div");
    div.className = "wpt-item";
    div.textContent = `📌 ${w.name} (${w.lat.toFixed(4)}, ${w.lng.toFixed(4)})`;
    div.addEventListener("click", () => {
      map.flyTo([w.lat, w.lng], 15);
      closeModal("gpx-modal");
    });
    box.appendChild(div);
  });
}

/* ───────────────────────── GPX import / eksport ───────────────────────── */

const gpxLayers = [];

document.getElementById("btn-gpx").addEventListener("click", () => {
  renderWptList();
  openModal("gpx-modal");
});

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
      const name = w.querySelector("name")?.textContent || "wpt";
      L.marker([+w.getAttribute("lat"), +w.getAttribute("lon")])
        .bindPopup(name).addTo(group);
      nWpt++;
    });

    if (!nTrk && !nWpt) throw new Error("brak trkpt/wpt");
    group.addTo(map);
    gpxLayers.push(group);
    map.fitBounds(group.getBounds(), { padding: [40, 40] });
    status.textContent = `✅ ${fname}: ${nTrk} tras, ${nWpt} punktów.`;
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

document.getElementById("gpx-export").addEventListener("click", () => {
  if (!state.waypoints.length) { toast("Brak punktów do eksportu — dodaj 📌."); return; }
  const esc = s => s.replace(/[<>&"]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const wpts = state.waypoints.map(w =>
    `  <wpt lat="${w.lat}" lon="${w.lng}">\n    <name>${esc(w.name)}</name>\n  </wpt>`).join("\n");
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Trasa" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
</gpx>`;
  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "trasa-punkty.gpx";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ───────────────────────── Klucze API ───────────────────────── */

function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
document.querySelectorAll("[data-close]").forEach(b =>
  b.addEventListener("click", () => closeModal(b.dataset.close)));
document.querySelectorAll(".modal").forEach(m =>
  m.addEventListener("click", e => { if (e.target === m) m.classList.add("hidden"); }));

document.getElementById("btn-keys").addEventListener("click", () => {
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
});

document.getElementById("keys-save").addEventListener("click", () => {
  document.querySelectorAll("#keys-list input").forEach(inp => {
    const v = inp.value.trim();
    if (v) state.keys[inp.dataset.key] = v;
    else delete state.keys[inp.dataset.key];
  });
  LS.set("keys", state.keys);
  closeModal("keys-modal");
  toast("🔑 Zapisano klucze.");
  // odśwież aktywne warstwy korzystające z kluczy
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
  else if (k === "s") document.getElementById("btn-search").click();
  else if (k === "l") document.getElementById("btn-locate").click();
  else if (k === "p") document.getElementById("btn-measure").click();
  else if (k === "w") document.getElementById("btn-waypoint").click();
  else if (k === ",") cycleBase(-1);
  else if (k === ".") cycleBase(1);
  else if (k === "escape") {
    closeSidebar();
    document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"));
    if (addingWpt) setWptMode(false);
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
renderWaypoints();
buildList();

/* PWA — rejestracja service workera (fundament pod aplikację Android/TWA) */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
