const CACHE = 'silsilah-pwa-v28-1';
const SHELL = [
  './','./index.html','./admin.html','./offline.html','./manifest.webmanifest',
  './supabase-config.js','./data.js','./assets/style.css','./assets/app.js','./assets/admin.js',
  './assets/foto-leluhur.jpg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return; // Supabase tetap live/network
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));return r;}).catch(()=>caches.match(req).then(r=>r||caches.match('./offline.html'))));
    return;
  }
  e.respondWith(caches.match(req).then(cached=>{
    const net=fetch(req).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return r;}).catch(()=>cached);
    return cached||net;
  }));
});
