/* Service worker de TEGC Sky Port: permite instalar la app y abrirla sin conexion. No guarda datos privados de Supabase. */
var V='skyport-v1',SHELL=['./','index.html','config.js','ost.js','manifest.webmanifest','icon-192.png','icon-512.png','favicon.svg'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(V).then(function(c){return c.addAll(SHELL)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(n){return n!==V}).map(function(n){return caches.delete(n)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){
 var r=e.request;if(r.method!=='GET')return;
 var u=new URL(r.url);
 if(u.hostname.indexOf('supabase.co')>-1||r.headers.has('range')||/\.mp3$/.test(u.pathname))return;
 var cdn=/cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u.hostname);
 if(u.origin===location.origin){
  e.respondWith(fetch(r).then(function(res){if(res&&res.ok){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp)})}return res}).catch(function(){return caches.match(r).then(function(m){return m||(r.mode==='navigate'?caches.match('index.html'):Response.error())})}));
 }else if(cdn){
  e.respondWith(caches.match(r).then(function(m){var f=fetch(r).then(function(res){if(res&&(res.ok||res.type==='opaque')){var cp=res.clone();caches.open(V).then(function(c){c.put(r,cp)})}return res}).catch(function(){return m});return m||f}));
 }
});
