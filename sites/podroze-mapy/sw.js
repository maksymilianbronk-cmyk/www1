/* Trasa — service worker:
   1) offline-shell — powłoka aplikacji zawsze z cache,
   2) opcjonalny bufor kafelków (włączany w panelu Offline) — sieć z zapisem
      do cache, a przy braku sieci kafelki wracają z bufora.
   Limity i czyszczenie bufora obsługuje strona (panel Offline). */

const CACHE = "trasa-shell-v22";
const TILE_CACHE = "trasa-tiles-v1";
const CONFIG_CACHE = "trasa-config";
const TILE_LIMIT = 4000;

const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./layers.js",
  "./cloud-config.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./vendor/leaflet/leaflet.css",
  "./vendor/leaflet/leaflet.js",
  "./vendor/leaflet/images/marker-icon.png",
  "./vendor/leaflet/images/marker-icon-2x.png",
  "./vendor/leaflet/images/marker-shadow.png",
  "./vendor/leaflet/images/layers.png",
  "./vendor/leaflet/images/layers-2x.png",
];

/* Domeny dynamiczne — nigdy nie buforuj (API, wyszukiwarka) */
const NO_CACHE_HOSTS = ["api.github.com", "nominatim.openstreetmap.org",
  "raw.githubusercontent.com"];

let tilesOn = null; // null = jeszcze nie wczytano markera

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => ![CACHE, TILE_CACHE, CONFIG_CACHE].includes(k))
        .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "tiles") {
    tilesOn = !!e.data.on;
    e.waitUntil(caches.open(CONFIG_CACHE).then(c =>
      c.put("https://trasa.local/tiles-flag", new Response(tilesOn ? "1" : "0"))));
  }
});

async function tilesEnabled() {
  if (tilesOn !== null) return tilesOn;
  try {
    const c = await caches.open(CONFIG_CACHE);
    const r = await c.match("https://trasa.local/tiles-flag");
    tilesOn = r ? (await r.text()) === "1" : false;
  } catch { tilesOn = false; }
  return tilesOn;
}

let putCount = 0;
async function putTile(url, resp) {
  try {
    const c = await caches.open(TILE_CACHE);
    await c.put(url, resp);
    /* przycinaj bufor co ~200 zapisów, usuwając najstarsze wpisy */
    if (++putCount % 200 === 0) {
      const keys = await c.keys();
      if (keys.length > TILE_LIMIT) {
        for (const k of keys.slice(0, keys.length - TILE_LIMIT)) await c.delete(k);
      }
    }
  } catch { /* pełny magazyn — trudno */ }
}

async function handleTile(req) {
  try {
    const r = await fetch(req);
    if (r && (r.ok || r.type === "opaque")) putTile(req.url, r.clone());
    return r;
  } catch (err) {
    const hit = await caches.match(req.url, { cacheName: TILE_CACHE });
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  const isShell = SHELL.some(s =>
    e.request.url === new URL(s, self.registration.scope).href);
  if (isShell || url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(hit =>
        hit ||
        fetch(e.request).then(res => {
          if (res.ok && isShell) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  /* zasoby zewnętrzne (kafelki map) — bufor tylko gdy włączony */
  if (NO_CACHE_HOSTS.includes(url.host)) return;
  e.respondWith((async () => {
    if (await tilesEnabled()) return handleTile(e.request);
    /* bufor wyłączony: sieć, ale w razie awarii spróbuj starego bufora */
    try { return await fetch(e.request); }
    catch (err) {
      const hit = await caches.match(e.request.url, { cacheName: TILE_CACHE });
      if (hit) return hit;
      throw err;
    }
  })());
});
