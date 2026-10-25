// Retire the old website-wide calculator worker. Preserve localStorage and the scoped calculator cache.
self.addEventListener("install",event=>event.waitUntil(self.skipWaiting()));
self.addEventListener("activate",event=>event.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("lyndco-lyndquote-shell-")&&key!=="lyndco-lyndquote-shell-v017").map(key=>caches.delete(key))))
 .then(()=>self.registration.unregister())
));
// No fetch handler: the main website now always uses the network.
