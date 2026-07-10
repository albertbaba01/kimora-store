const V='kimora-v7';
// Réseau d'abord : toujours la dernière version
self.addEventListener('install', e=>{ self.skipWaiting(); });
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e=>{
  // ⚠️ Ne JAMAIS intercepter/mettre en cache :
  // - les requêtes non-GET (commandes, écritures)
  // - les autres domaines (Firebase, Google, cartes...) => évite cache corrompu dans la WebView Android
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin) return;
  if(url.pathname.includes('/api/')) return;

  e.respondWith(
    fetch(e.request).then(r=>{
      // Ne mettre en cache que les réponses valides
      if(r&&r.ok){
        const clone=r.clone();
        caches.open(V).then(c=>c.put(e.request,clone)).catch(()=>{});
      }
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('/')))
  );
});
