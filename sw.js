/* Casier 1.1.0 : garde l'application disponible sans internet. */
const CACHE = 'casier-1.1.0-202611010622';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE)
    .then(cache => cache.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('casier-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Réponse immédiate depuis le cache, puis mise à jour en arrière-plan quand internet est disponible.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const fromNetwork = fetch(req).then(res => {
    if (!res || !res.ok || res.type !== 'basic') return res;
    const copy = res.clone();
    return caches.open(CACHE).then(cache => cache.put(req, copy)).then(() => res);
  }).catch(() => undefined);
  event.waitUntil(fromNetwork.then(() => undefined));
  event.respondWith(caches.open(CACHE)
    .then(cache => cache.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? cache.match('./') : undefined)))
    .then(hit => hit || fromNetwork.then(res => res || new Response('Casier est hors ligne et ce fichier n\'est pas encore enregistré.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))));
});
