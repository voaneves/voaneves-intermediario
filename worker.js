/* Service Worker — voaneves.com (v4)
 *
 * Strategy:
 *  - HTML navigations  -> network-first (always fresh after a deploy; cache fallback offline)
 *  - Static assets     -> stale-while-revalidate (instant from cache, refreshed in background,
 *                         so non-hashed assets update within a visit after a deploy)
 *  - Cache VERSION is bumped on every deploy -> activate() purges all old caches.
 *
 * NOTE: bump VERSION on every deploy (or wire it to your build hash) so returning
 * visitors never get served stale CSS/JS.
 */
const VERSION = "v-202607012358";
const PRECACHE = "precache-" + VERSION;
const RUNTIME = "runtime-" + VERSION;

// Paths are relative to the SW scope, so this works at both /voaneves-intermediario/ and the root.
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./assets/styles/styles.css",
  "./assets/js/app.min.js",
  "./assets/js/cursor.min.js",
  "./assets/js/playful.min.js",
  "./assets/js/toast.min.js",
  "./assets/js/console.min.js",
  "./assets/fonts/fraunces-normal.woff2",
  "./assets/fonts/header.woff2",
  "./assets/img/main_1.webp",
];

// Install: precache critical assets. allSettled => a single 404 won't block activation.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

// Activate: drop caches from previous versions, take control of open pages immediately.
self.addEventListener("activate", (event) => {
  const keep = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !keep.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // HTML navigations -> network-first (fresh index after every deploy; cached fallback offline).
  const accept = req.headers.get("accept") || "";
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Static assets -> stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
