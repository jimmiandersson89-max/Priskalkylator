// ----- Priskalkylator service worker -----
// Bumpa VERSION när du gjort större ändringar på HTML/CSS/JS/ikoner
const VERSION = 'v27';
const CACHE_NAME = `rg-kalkylator-${VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icon.svg',
  './apple-touch-icon.png',
  './icon-512.png',
  './icon-512-maskable.png',
  // valfritt: ta med skärmdumpen om du vill kunna visa den offline
  // './screenshot1.png'
];

// Precache kärnfiler
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // Ta över direkt när installationen är klar
  self.skipWaiting();
});

// Rensa gamla cachar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
      // Gör SW aktiv på alla öppna flikar direkt
      await self.clients.claim();
    })()
  );
});

// Strategi:
// - HTML: network-first (så du får senaste index snabbt)
// - Övriga GET: stale-while-revalidate (snabb cache, uppdatera i bakgrunden)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML =
    req.headers.get('accept')?.includes('text/html') ||
    req.destination === 'document';

  if (isHTML) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req, { cache: 'no-store' });
          // uppdatera cache för index också
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          // offline fallback
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match('./index.html');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // stale-while-revalidate för övrigt
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          // Bara cachbara svar
          if (res && res.status === 200 && res.type !== 'opaque') {
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(() => cached); // om offline, återanvänd cache
      return cached || fetchPromise;
    })()
  );
});

// Tillåter att sidan ber SW hoppa över ”waiting”
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
