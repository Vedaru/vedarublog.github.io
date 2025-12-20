/* Simple runtime cache for static assets on GitHub Pages
 * Scope is set to BASE_URL by registration in Layout.astro
 */
const CACHE_NAME = 'site-static-v1';
const STATIC_PATTERNS = [
  /\/(_astro)\//,            // Vite hashed bundles
  /\/(pio\/static)\//,       // Pio static scripts/styles
  /\/(pio\/models)\//        // Pio models
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

function matchesStatic(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    return STATIC_PATTERNS.some((re) => re.test(path));
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = request.url;
  const isSameOrigin = (() => {
    try { return new URL(url).origin === self.location.origin; } catch { return false; }
  })();

  if (!isSameOrigin) return; // only cache same-origin

  // Cache-first for static assets
  if (matchesStatic(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const resp = await fetch(request);
          // Only cache successful, non-opaque responses
          if (resp && resp.status === 200 && resp.type === 'basic') {
            cache.put(request, resp.clone());
          }
          return resp;
        } catch (err) {
          return cached || Promise.reject(err);
        }
      })
    );
    return;
  }

  // Default: network-first with cache fallback for HTML pages
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    event.respondWith(
      fetch(request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match(request))
    );
  }
});
