/* Service worker des applications Cockpit et Scanner.
   Réseau d'abord : on voit toujours la dernière version publiée. Le cache sert seulement
   à ouvrir l'application sans réseau (le scanner garde alors ses scans en file d'attente).
   Les appels au serveur Apps Script ne passent jamais par le cache. */
var CACHE = 'jef-appli-2.4.1';
var BASE = ['assets/jef.css', 'assets/cockpit.css', 'assets/jef.js', 'assets/config.js', 'logo-acses.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE).catch(function () { /* hors ligne à l'installation */ }); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k.indexOf('jef-appli-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var url = new URL(r.url);
  if (url.origin !== self.location.origin) return; // API, Google : jamais en cache
  e.respondWith(fetch(r).then(function (rep) {
    if (rep.ok && rep.type === 'basic') { var copie = rep.clone(); caches.open(CACHE).then(function (c) { c.put(r, copie); }); }
    return rep;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: true }).then(function (m) { return m || caches.match(url.pathname.replace(/^\//, '')); });
  }));
});
