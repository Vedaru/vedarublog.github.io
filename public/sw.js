// Empty service worker for Swup
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// No caching logic since cache is disabled in Swup config