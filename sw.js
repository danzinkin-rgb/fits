/* Network first, falling back to cache, so the game works offline and updates are picked up straight away. */
const CACHE = 'fits-v14';
const FILES = ['./', 'index.html', 'style.css', 'rules.js', 'app.js', 'icon.svg', 'manifest.webmanifest', 'words.txt', 'config.js', 'privacy.html', 'icons/icon-192.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
