// ----- Priskalkylator service worker -----
const VERSION    = 'V.Benjii.11';  // bumpad version
const CACHE_NAME = `rg-kalkylator-${VERSION}`;

const START_URL  = './index.html?source=pwa';

const CORE_ASSETS = [
  './',
  './index.html',
  START_URL,
  './manifest.webmanifest',
  './sw.js',
  './icon.svg',
  './Apple-touch-icon.png',
  './Icon-192.png',
  './Icon-512.png',
  './Icon-512-maskable.png',
  // Lägg till jsPDF så PDF funkar offline:
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
];

// Precache kärnfiler
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Rensa gamla cachar
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

// ====== SÄKERHETSKOLL ======
function isAllowedRequest(req) {
  // Tillåt alltid core assets
  if (CORE_ASSETS.some(path => req.url.endsWith(path.replace('./','')) || req.url === path)) return true;

  // Tillåt din egen domän + jsDelivr (för jsPDF)
  const allowedHosts = [
    self.location.hostname,           // din GitHub Pages-domän
    'cdn.jsdelivr.net',               // jsPDF
    'localhost'                       // lokal test
  ];

  try {
    const url = new URL(req.url);
    return allowedHosts.includes(url.hostname);
  } catch {
    return false;
  }
}
// ====== SLUT SÄKERHETSKOLL ======

// Strategi: HTML = network-first, övrigt = stale-while-revalidate
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Blockera otillåtna hostar (men låt navigeringar gå igenom vår hantering nedan)
  const isHTML = req.headers.get('accept')?.includes('text/html') || req.destination === 'document';

  if (!isHTML && !isAllowedRequest(req)) {
    event.respondWith(new Response("Åtkomst nekad", { status: 403 }));
    return;
  }

  if (isHTML) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cache = await caches.open(CACHE_NAME);
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
        if (res && res.status === 200 && res.type !== 'opaque') {
          cache.put(req, res.clone());
        }
        return res;
      })
      .catch(() => cached);
    return cached || fetchPromise;
  })());
});

// Tillåt att sidan ber SW hoppa över "waiting"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
