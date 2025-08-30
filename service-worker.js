const activeCacheVersion = 1140;
const activeCacheName = `rlplayer-${activeCacheVersion}`;

console.log(`Service Worker: Using cache version ${activeCacheVersion}`);

// files and folders to cache
const cacheAssets = [
  "",
  "index.html",
  "offline.html",
  "css/style.css",
  "css/bootstrap.min.css",
  "css/fontawesome.min.css",
  "css/regular.min.css",
  "css/solid.min.css",
  "css/thin.min.css",
  "css/animate.css",
  "js/script.js",
  "js/bootstrap.min.js",
  "img/cover.png",
  "img/background.png",
  "img/app-icon.png",
  "img/icon-dark-koptelefoon.png",
  "img/icon-wit-koptelefoon.png",
  "img/icon-wit.png",
  "manifest.json",
  "webfonts/fa-light-300.woff2",
  "webfonts/fa-solid-900.woff2",
  "webfonts/fa-regular-400.woff2",
  "webfonts/fa-thin-100.woff2",
];

// Service workers can't directly listen for FTP uploads or external file changes.
// The fetch event only triggers when a client requests the file.
// To detect a change after FTP upload, you must rely on clients requesting "playlist.json".
// This code ensures the latest version is fetched and cached when requested.

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Special handling for playlist.json - always fetch fresh
  if (
    url.pathname === "/kvpn/playlist.json" ||
    url.pathname.endsWith("/playlist.json")
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(activeCacheName);
        try {
          // Always fetch from network to get the latest playlist.json after FTP upload
          const networkResponse = await fetch(event.request, {
            cache: "reload",
          });
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        } catch {
          // Fallback to cache if offline
          const cachedResponse = await cache.match(event.request);
          return cachedResponse || Response.error();
        }
      })()
    );
    return;
  }

  // Cache-first strategy for static assets
  if (
    event.request.destination === "style" ||
    event.request.destination === "script" ||
    event.request.destination === "image" ||
    event.request.destination === "font" ||
    event.request.url.includes(".css") ||
    event.request.url.includes(".js") ||
    event.request.url.includes(".png") ||
    event.request.url.includes(".jpg") ||
    event.request.url.includes(".woff")
  ) {
    event.respondWith(
      caches.open(activeCacheName).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return Response.error();
        }
      })
    );
    return;
  }

  // Network-first strategy for navigation requests and HTML
  if (
    event.request.mode === "navigate" ||
    event.request.destination === "document"
  ) {
    event.respondWith(
      caches.open(activeCacheName).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedResponse = await cache.match(event.request);
          return (
            cachedResponse ||
            (await cache.match("/offline.html")) ||
            Response.error()
          );
        }
      })
    );
  }
});

self.addEventListener("error", (event) => {
  console.error("Service Worker error:", event);
});

// workbox voorbereiding
self.addEventListener("install", (event) => {
  // Precache assets on install
  event.waitUntil(
    caches.open(activeCacheName).then(async (cache) => {
      // Filter out assets that fail to fetch
      const validAssets = [];
      for (const url of cacheAssets) {
        try {
          const response = await fetch(url, { method: "HEAD" });
          if (response.ok) {
            validAssets.push(url);
          } else {
            console.warn(`Asset not found or not ok: ${url}`);
          }
        } catch (e) {
          console.warn(`Failed to fetch asset: ${url}`, e);
        }
      }
      return cache.addAll(validAssets);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Specify allowed cache keys
  const cacheAllowList = [activeCacheName];

  // Get all the currently active `Cache` instances.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        // Delete all caches that aren't in the allow list:
        return Promise.all(
          keys.map((key) => {
            console.log(`Cache key check: ${key}`);
            if (!cacheAllowList.includes(key)) {
              console.log(`Cache removed: ${key}`);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Push notifications
// self.addEventListener("push", (event) => {
//   const data = event.data.json();
//   const options = {
//     body: data.body,
//     icon: "/images/notification-icon.png",
//     badge: "/images/notification-badge.png",
//   };

//   event.waitUntil(self.registration.showNotification(data.title, options));
// });
