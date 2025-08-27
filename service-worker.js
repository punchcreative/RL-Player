const activeCacheVersion = 1135;
const activeCacheName = `rlplayer-${activeCacheVersion}`;

// files and folders to cache
const cacheAssets = [
  "",
  "index.html",
  "offline.html",
  "css/style.css",
  "css/bootstrap.min.css",
  "css/font-awesome.min.css",
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
  "fonts/fontawesome-webfont.woff2",
  "fonts/fontawesome-webfont.woff",
  "fonts/fontawesome-webfont.ttf",
  "fonts/fontawesome-webfont.eot",
  "fonts/fontawesome-webfont.svg",
  "fonts/FontAwesome.otf",
];

// Service workers can't directly listen for FTP uploads or external file changes.
// The fetch event only triggers when a client requests the file.
// To detect a change after FTP upload, you must rely on clients requesting "playlist.json".
// This code ensures the latest version is fetched and cached when requested.

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === "/kvpn/playlist.json") {
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
  }
});

self.addEventListener("fetch", (event) => {
  // Check if this is a navigation request
  if (event.request.mode === "navigate") {
    // Open the cache
    event.respondWith(
      caches.open(activeCacheName).then(async (cache) => {
        // Go to the network first
        try {
          const fetchedResponse = await fetch(event.request.url);
          cache.put(event.request, fetchedResponse.clone());
          return fetchedResponse;
        } catch {
          return await cache.match(event.request.url);
        }
      })
    );
  } else {
    return;
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
