// Service worker dell'app Orus: tiene in memoria solo il contenitore (pagina, icone, manifest)
// e mostra le notifiche sul telefono (v2, 16/11/2026). I dati della piattaforma arrivano sempre dal vivo da Google.
var VERSIONE = 'orus-app-v2';
var FILE = ['./', 'index.html', 'offline.html', 'manifest.json',
            'icone/icona-192.png', 'icone/icona-512.png', 'icone/icona-maskable-512.png', 'icone/badge-96.png'];

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
  if (new URL(e.request.url).origin !== location.origin) return; // Google e Firebase: mai toccati
  e.respondWith(
    fetch(e.request).catch(function () {
      return caches.match(e.request).then(function (r) {
        return r || (e.request.mode === 'navigate' ? caches.match('offline.html') : undefined);
      });
    })
  );
});

// ----- Notifiche (Firebase Cloud Messaging, messaggi "data": titolo, testo, vai, link, tag) -----
self.addEventListener('push', function (e) {
  var p = {};
  try { p = e.data ? e.data.json() : {}; } catch (x) { p = { data: { testo: e.data ? e.data.text() : '' } }; }
  var d = p.data || p;
  var titolo = d.titolo || (p.notification && p.notification.title) || 'Orus';
  var opzioni = {
    body: d.testo || (p.notification && p.notification.body) || '',
    icon: 'icone/icona-192.png',
    badge: 'icone/badge-96.png',
    data: { link: d.link || './', vai: d.vai || '' },
    vibrate: [120, 60, 120]
  };
  if (d.tag) opzioni.tag = d.tag;
  e.waitUntil(self.registration.showNotification(titolo, opzioni));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var d = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (lista) {
    for (var i = 0; i < lista.length; i++) {
      var c = lista[i];
      if (c.url.indexOf(self.registration.scope) === 0) {
        if (d.vai) c.postMessage({ orus: 'vai', vai: d.vai });
        return c.focus();
      }
    }
    return self.clients.openWindow(d.link || './');
  }));
});
