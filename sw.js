const CACHE_NAME = 'kimora-v71';
const ASSETS = ['/','/index.html','/style.css','/js/app.js','/manifest.json','/icon-192.png','/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) { e.respondWith(fetch(e.request).catch(() => new Response('{"error":"Offline"}',{status:503,headers:{'Content-Type':'application/json'}}))); return; }
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) { e.respondWith(caches.match(e.request).then(c => c || fetch(e.request))); return; }
  e.respondWith(fetch(e.request).then(r => { caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone())); return r; }).catch(() => caches.match(e.request)));
});
