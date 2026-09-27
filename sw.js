/* Radar Eventi — service worker: app installabile e uso con poca rete */
const CACHE = "radar-eventi-v1";
const CORE = ["./", "./index.html", "./evento.html", "./admin.html", "./esempi.html", "./style.css", "./common.js", "./evento.js", "./admin.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Dati degli eventi e pagine: prima la rete (dati freschi), se manca la rete la copia salvata
  if (url.origin === location.origin && (url.pathname.endsWith(".json") || req.mode === "navigate")) {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req, {ignoreSearch: req.mode === "navigate"}).then(r => r || caches.match("./index.html"))));
    return;
  }
  // File statici e librerie: prima la copia salvata, poi la rete
  if (url.origin === location.origin || url.hostname === "cdnjs.cloudflare.com" || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r; })));
  }
});
