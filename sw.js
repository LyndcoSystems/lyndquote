// LyndQuote offline shell: prefer updates while online, fall back to cache offline.
const CACHE='lyndco-lyndquote-shell-v013';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lyndco-lyndquote-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
e.respondWith((async()=>{const cache=await caches.open(CACHE);
try{const response=await fetch(e.request);if(response.ok)await cache.put(e.request,response.clone());return response}
catch(error){const cached=await caches.match(e.request);if(cached)return cached;throw error}})());});