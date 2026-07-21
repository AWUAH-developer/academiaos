const CACHE = 'academiaos-static-v1';
const STATIC_ASSETS = ['/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never cache authenticated HTML pages or API/server-action traffic.
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/api/')) return;

  if (url.pathname.startsWith('/_next/static/') || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
          return response;
        });
      })
    );
  }
});
