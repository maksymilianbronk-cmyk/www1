/* Trasa — service worker: cache'uje powłokę aplikacji (offline-shell).
   Kafelki map celowo NIE są cache'owane — regulaminy większości dostawców
   zabraniają masowego zapisu; offline'owe mapy to zadanie wersji Android. */

const CACHE = "trasa-shell-v1";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./layers.js",
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

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  const isShell = SHELL.some(s => e.request.url === new URL(s, self.registration.scope).href);
  if (e.request.method !== "GET" || (!isShell && url.origin !== location.origin)) return;
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
});
