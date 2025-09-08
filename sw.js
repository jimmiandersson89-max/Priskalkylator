// ----- Priskalkylator service worker -----
// Bumpa VERSION när du gjort större ändringar på HTML/CSS/JS/ikoner
const VERSION    = 'V.Benjii.2';
const CACHE_NAME = `rg-kalkylator-${VERSION}`;

const START_URL  = './index.html?source=pwa';

const CORE_ASSETS = [
  './',
  './index.html',
  START_URL,
  './manifest.webmanifest',
  './sw.js',
  './icon.svg',
  './Apple-touch-icon.png',   // versaler som i repot
  './Icon-192.png',
  './Icon-512.png',
  './Icon-512-maskable.png',
  // './screenshot1.png', // ta med om du vill kunna visa offline
];

// Precache kärnfiler
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting(); // ta över direkt
});

// Rensa gamla cachar
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
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
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        // försök matcha exakt URL först, annars fallback till index & START_URL
        const cached =
          (await cache.match(req)) ||
          (await cache.match(START_URL)) ||
          (await cache.match('./index.html'));
        return cached || Response.error();
      }
    })());
    return;
  }

  // stale-while-revalidate för övrigt
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const fetchPromise = fetch(req)
      .then((res) => {
        // cachbara svar (undvik opaque från t.ex. tredjeparts-CORS)
        if (res && res.status === 200 && res.type !== 'opaque') {
          cache.put(req, res.clone());
        }
        return res;
      })
      .catch(() => cached); // offline => använd cache
    return cached || fetchPromise;
  })());
});

// Tillåt att sidan ber SW hoppa över "waiting"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
