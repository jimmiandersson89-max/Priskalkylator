// sw.js — Priskalkylator PWA Service Worker
// ÖKA VERSION vid varje ny release så att alla får uppdateringen.
const VERSION = "v14";
const CACHE   = "priskalk-" + VERSION;

// Lägg filer här som krävs offline. (Relativa sökvägar funkar bäst på GitHub Pages repo.)
const CORE_ASSETS = [
  "index.html",
  "manifest.webmanifest",
  "icon-512.png",
  "apple-touch-icon.png",
  "IMG_0028.jpeg"
];

// Ta emot "SKIP_WAITING" från sidan (när användaren trycker Uppdatera)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Install: cacha kärnfiler och aktivera direkt
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

// Activate: rensa gamla cachar och ta kontroll över alla klienter
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("priskalk-") && k !== CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch-strategi:
// • HTML: nätverk-först (så index.html alltid blir färsk när du släpper nytt)
// • Övrigt (bilder/ikoner/etc): cache-först med nätverksfallback
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const accept = req.headers.get("accept") || "";
  const isHTML = req.mode === "navigate" || accept.includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        });
      })
    );
  }
});
