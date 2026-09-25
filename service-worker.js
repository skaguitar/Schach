const CACHE_NAME = "schach-lernen-v7";
const PRECACHE_URLS = [
  "index.html",
  "manifest.json",
  "css/style.css",
  "js/app.js",
  "js/board.js",
  "js/chess-utils.js",
  "js/engine.js",
  "js/eval-utils.js",
  "js/coaching-text.js",
  "js/lessons.js",
  "js/lessons-data.js",
  "js/sparring.js",
  "js/review.js",
  "js/coach.js",
  "js/notation-legend.js",
  "vendor/chess.esm.js",
  "vendor/stockfish.js",
  "vendor/stockfish.wasm",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
