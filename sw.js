// Service worker dell'app Orus: tiene in memoria solo il contenitore (pagina, icone, manifest).
// I dati della piattaforma arrivano sempre dal vivo da Google, non vengono mai salvati qui.
var VERSIONE = 'orus-app-v1';
var FILE = ['./', 'index.html', 'offline.html', 'manifest.json',
            'icone/icona-192.png', 'icone/icona-512.png', 'icone/icona-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSIONE).then(function (c) { return c.addAll(FILE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (chiavi) {
    return Promise.all(chiavi.filter(function (k) { return k !== VERSIONE; })
                             .map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (new URL(e.request.url).origin !== location.origin) return; // Google: mai toccato
  e.respondWith(
    fetch(e.request).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || (e.request.mode === 'navigate' ? caches.match('offline.html') : undefined);
      });
    })
  );
});
