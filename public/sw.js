/*
 * A.R.M.O.R. Studio - the service worker of the wall-panel mode.
 * It keeps the files of the page (the shell and the hashed files of /assets/) so a tablet that loses its network still opens the panel and shows that it is reconnecting.
 * It never keeps anything the server answers: every request to /api/ (and the address and health files) goes straight to the network, so no state of the house is ever read from a copy.
 * Copyright (C) 2026 JuanenRac (Electro Hobby 3D). GPL-3.0-or-later.
 */
const CACHE = "armor-studio-shell-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];
const NEVER = ["/api/", "/armor-config.json", "/healthz"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(name => name.startsWith("armor-studio-shell-") && name !== CACHE).map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || NEVER.some(prefix => url.pathname === prefix || url.pathname.startsWith(prefix))) return;   // the browser handles it: nothing of the server is kept
  if (request.mode === "navigate") {
    // the page comes from the network when there is one (a new version is seen at once), else from the copy
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put("/", copy)); }
      return response;
    }).catch(() => caches.match("/")));
    return;
  }
  event.respondWith(caches.match(request).then(hit => hit || fetch(request).then(response => {
    if (response.ok && url.pathname.startsWith("/assets/")) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
    return response;
  })));
});
