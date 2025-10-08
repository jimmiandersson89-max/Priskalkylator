// ----- Priskalkylator service worker -----
const VERSION    = 'V.Benjii.15';                  // bumpa vid varje deploy
const CACHE_NAME = `rg-kalkylator-${VERSION}`;

const START_URL  = './index.html?source=pwa';

const CORE_ASSETS = [
  './',
  './index.html',
  './index.js',                                     // viktigt: precacha appens logik
  START_URL,
  './manifest.webmanifest',
  './sw.js',
  './icon.svg',
  './Apple-touch-icon.png',
  './Icon-192.png',
  './Icon-512.png',
  './Icon-512-maskable.png',
  // jsPDF för PDF offline
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
];

// --- Install: precacha kärnfiler ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// --- Activate: rensa gamla cachar ---
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// --- Fetch: HTML = network-first, annat = stale-while-revalidate ---
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isHTML =
    req.headers.get('accept')?.includes('text/html') || req.destination === 'document';

  if (isHTML) {
    // Network-first för dokument så GitHub-uppdateringar syns direkt
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(req)) ||
               (await cache.match(START_URL)) ||
               (await cache.match('./index.html')) ||
               Response.error();
      }
    })());
    return;
  }

  // Övriga resurser: stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);

    const fetchPromise = fetch(req).then((res) => {
      // undvik att cacha opaque / felaktiga svar
      if (res && res.status === 200 && res.type !== 'opaque') {
        cache.put(req, res.clone());
      }
      return res;
    }).catch(() => cached);

    return cached || fetchPromise;
  })());
});

// Tillåt att sidan beordrar SW att hoppa över "waiting"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
