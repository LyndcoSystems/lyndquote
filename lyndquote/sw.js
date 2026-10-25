// Cache only the calculator shell within this worker's scope.
const CACHE="lyndco-lyndquote-shell-v017";
const ASSETS=["./","./index.html","./manifest.webmanifest","./icon.svg"].map(p=>new URL(p,self.location.href).href);
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("lyndco-lyndquote-shell-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET"||!ASSETS.includes(event.request.url))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const response=await fetch(event.request);
   if(response.ok)await cache.put(event.request,response.clone());
   return response;
  }catch(error){
   const cached=await cache.match(event.request);
   if(cached)return cached;
   throw error;
  }
 })());
});
