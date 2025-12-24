/* Simple runtime cache for static assets on GitHub Pages
 * Scope is set to BASE_URL by registration in Layout.astro
 */
const CACHE_NAME = 'site-static-v2'; // 更新版本号以清除旧缓存
// 静态资源缓存模式（Cache-first with stale-while-revalidate）
const STATIC_PATTERNS = [
  /\/(_astro)\//,            // Vite hashed bundles
  /\/(pio\/static)\//,       // Pio static scripts/styles
  /\/(pio\/models)\//        // Pio models
];
// 资源缓存模式（网络优先，但缓存图片和媒体）
const RESOURCE_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,  // 图片资源
  /\.(woff|woff2|ttf|otf|eot)$/i,         // 字体文件
  /\.(json)$/i,                           // JSON 数据文件（音乐元数据等）
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

function matchesResource(url) {
  try {
    const u = new URL(url);
    const path = u.pathname;
    return RESOURCE_PATTERNS.some((re) => re.test(path));
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

  // 排除 Meting API 请求，让它们总是走网络（不使用缓存）
  if (url.includes('/meting/') || url.includes('meting')) {
    return; // 不拦截，直接走网络
  }

  if (!isSameOrigin) return; // only cache same-origin

  // Cache-first for static assets (hashed bundles) with stale-while-revalidate pattern
  if (matchesStatic(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        // 返回缓存版本（速度最快），后台更新
        if (cached) {
          // 异步更新缓存（stale-while-revalidate）
          fetch(request).then(res => {
            if (res && res.status === 200) {
              cache.put(request, res.clone());
            }
          }).catch(() => {}); // 网络错误时忽略，使用缓存版本
          return cached;
        }
        // 无缓存时网络获取
        const res = await fetch(request);
        if (res && res.status === 200) {
          cache.put(request, res.clone());
        }
        return res;
      })
    );
    return;
  }

  // Cache-first for resource files (images, fonts, JSON) with timeout
  if (matchesResource(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // 有缓存则立即返回，后台更新（对图片等资源更新时间可以晚一些）
          fetch(request).then(res => {
            if (res && res.status === 200) {
              cache.put(request, res.clone());
            }
          }).catch(() => {});
          return cached;
        }
        // 无缓存时网络获取
        try {
          const resp = await fetch(request);
          if (resp && resp.status === 200) {
            cache.put(request, resp.clone());
          }
          return resp;
        } catch (err) {
          return Promise.reject(err);
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
