/* Cepario HDSR — Service Worker
   Sube el número al editar la app para que los equipos actualicen. */
const VERSION = "cepario-v9";
const APP_SHELL = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./maskable-512.png",
  "./monochrome-512.png", "./apple-touch-icon.png"
];
const SIEMPRE_RED = ["firestore.googleapis.com", "firebase", "googleapis.com/google.firestore", "identitytoolkit"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_SHELL)).catch(()=>{}).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (SIEMPRE_RED.some(d => url.host.includes(d) || url.href.includes(d))) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(r=>{cachear(r.clone());return r;}).catch(()=>caches.match(req).then(m=>m||caches.match("./index.html"))));
    return;
  }
  const esFuente = url.host.includes("fonts.googleapis.com") || url.host.includes("fonts.gstatic.com");
  if (url.origin === location.origin || esFuente) {
    e.respondWith(caches.match(req).then(hit => {
      const red = fetch(req).then(r=>{cachear(r.clone());return r;}).catch(()=>hit);
      return hit || red;
    }));
  }
});
function cachear(resp){ if(!resp||(resp.status!==200&&resp.type!=="opaque"))return; caches.open(VERSION).then(c=>c.put(resp.url,resp)).catch(()=>{}); }
