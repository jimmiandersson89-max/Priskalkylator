// sw.js — Priskalkylator PWA Service Worker
// Öka VERSION varje gång du släpper nytt (v18, v19, ...).
const VERSION = "v18";
const CACHE   = "priskalk-" + VERSION;

// Filer vi alltid vill ha offline
const CORE_ASSETS = [
  "index.html",
  "manifest.webmanifest",
  "icon-512.png",
  "apple-touch-icon.png",
  "IMG_0028.jpeg"
];

// Ta emot SKIP_WAITING från index.html (uppdatera-knappen)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Installera direkt och cacha kärnfiler
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

// Aktivera, ta bort gamla cachar och ta kontroll direkt
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k.startsWith("priskalk-") && k !== CACHE)
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Nätverk-först för alla requests, fallback cache
self.addEventListener("fetch", (event) => {
  const req = event.request;
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch:true }))
  );
});
