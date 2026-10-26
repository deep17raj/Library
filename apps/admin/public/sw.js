// Service worker for the admin app (served at /admin/sw.js, scope /admin/). Two jobs,
// kept deliberately small — the admin app has no push notifications:
//  1. Build assets (/admin/assets/*, content-hashed) are cached forever → fast starts.
//  2. App pages are network-first; offline, the last app shell is shown.
// API responses are business data and are never cached here (CLAUDE.md).

const ASSETS = "admin-assets-v1";
const SHELL = "admin-shell-v1";
const SHELL_KEY = "/admin/";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([ASSETS, SHELL]);
      for (const name of await caches.keys()) if (!keep.has(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/admin/assets/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate" && url.pathname.startsWith("/admin/")) {
    event.respondWith(networkFirstShell(request));
  }
  // Everything else (the API, uploads) goes to the network as usual.
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstShell(request) {
  // Every admin page is the same shell; keep one copy and fall back to it offline.
  const cache = await caches.open(SHELL);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(SHELL_KEY, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(SHELL_KEY);
    if (cached) return cached;
    throw error;
  }
}
