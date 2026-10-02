// Service worker for the student app (served at /sw.js, registered per library with
// scope /s/<slug>/). Three jobs, kept deliberately small:
//  1. Build assets (/student/assets/*, content-hashed) are cached forever → fast starts.
//  2. App pages are network-first; offline, the library's last app shell is shown.
//  3. Show push notifications (sent from milestone 8) and open them on tap.
// API responses are business data and are never cached here (CLAUDE.md).

const ASSETS = "student-assets-v1";
const SHELLS = "student-shells-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([ASSETS, SHELLS]);
      for (const name of await caches.keys()) if (!keep.has(name)) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/student/assets/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate" && /^\/s\/[a-z0-9-]+\//.test(url.pathname)) {
    event.respondWith(networkFirstShell(request, url));
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

async function networkFirstShell(request, url) {
  // Every page of one library's app is the same shell; keep one copy per library.
  const shellKey = `/s/${url.pathname.split("/")[2]}/`;
  const cache = await caches.open(SHELLS);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(shellKey, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(shellKey);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const scope = self.registration.scope;
  event.waitUntil(
    self.registration.showNotification(data.title || "Library update", {
      body: data.body || "",
      icon: `${scope}icon-192.png`,
      badge: `${scope}icon-192.png`,
      data: { url: data.url || scope },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only open pages of this app (same origin); anything else falls back to the app.
  const scope = self.registration.scope;
  const target = new URL(event.notification.data?.url || scope, scope);
  const url = target.origin === self.location.origin ? target.href : scope;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => w.url.startsWith(scope));
      if (open) {
        await open.focus();
        return open.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
