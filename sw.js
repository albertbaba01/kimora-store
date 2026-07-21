const V='kimora-v54';
self.addEventListener('install', e=>{ self.skipWaiting(); });
self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const ks=await caches.keys();
    await Promise.all(ks.map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin) return;
  if(url.pathname.includes('/api/')) return;
  // RÉSEAU D'ABORD : toujours la dernière version ; le cache n'est qu'un secours hors-ligne
  e.respondWith(
    fetch(e.request).then(r=>{
      if(r&&r.ok){const clone=r.clone();caches.open(V).then(c=>c.put(e.request,clone)).catch(()=>{});}
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('/')))
  );
});
