/* Cepario HDSR — Service Worker
   Cambia la versión (v) cuando modifiques el HTML o los íconos
   para que los dispositivos descarguen la versión nueva.        */
const VERSION = "cepario-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-light-32.png",
  "./icons/favicon-dark-32.png",
  "./icons/logo-light.png",
  "./icons/logo-dark.png"
];

// Dominios que SIEMPRE deben ir a la red (datos en vivo, nunca caché)
const SIEMPRE_RED = [
  "firestore.googleapis.com",
  "firebase",
  "googleapis.com/google.firestore",
  "identitytoolkit"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(APP_SHELL))
      .catch(() => {})            // no bloquear la instalación si falla algún recurso
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Firebase / datos en vivo → red directa, sin tocar caché
  if (SIEMPRE_RED.some(d => url.host.includes(d) || url.href.includes(d))) return;

  // Navegación (abrir la app) → red primero, con respaldo al caché para uso offline
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => { cachear(r.clone()); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match("./index.html")))
    );
    return;
  }

  // Fuentes de Google → cache-first (para que la app abra sin conexión)
  const esFuente = url.host.includes("fonts.googleapis.com") || url.host.includes("fonts.gstatic.com");

  // Mismo origen o fuentes → cache-first con actualización en segundo plano
  if (url.origin === location.origin || esFuente) {
    e.respondWith(
      caches.match(req).then(hit => {
        const red = fetch(req).then(r => { cachear(r.clone()); return r; }).catch(() => hit);
        return hit || red;
      })
    );
  }
});

function cachear(resp) {
  if (!resp || (resp.status !== 200 && resp.type !== "opaque")) return;
  caches.open(VERSION).then(c => c.put(resp.url, resp)).catch(() => {});
}
