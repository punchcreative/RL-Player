const activeCacheVersion = 1144;
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

  // Only handle requests to the same origin (localhost)
  // Let external API calls (like https://eajt.nl/kvpn/playlist.json) pass through
  if (url.origin !== self.location.origin) {
    console.log(
      "Service Worker: Ignoring external request:",
      event.request.url
    );
    return; // Let the browser handle external requests normally
  }

  // Special handling for local playlist.json - always fetch fresh
  if (
    url.pathname === "/playlist.json" ||
    url.pathname.endsWith("/playlist.json") ||
    event.request.url.includes("playlist.json")
  ) {
    console.log(
      "Service Worker: Handling local playlist.json request:",
      event.request.url
    );
    event.respondWith(
      (async () => {
        try {
          // Always fetch from network to get the latest playlist.json after FTP upload
          console.log(
            "Service Worker: Fetching fresh local playlist.json from network"
          );
          const networkResponse = await fetch(event.request, {
            cache: "no-cache",
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          });

          if (!networkResponse.ok) {
            throw new Error(
              `Network response not ok: ${networkResponse.status}`
            );
          }

          console.log("Service Worker: Successfully fetched playlist.json");
          return networkResponse;
        } catch (error) {
          console.error(
            "Service Worker: Failed to fetch playlist.json from network:",
            error
          );
          // Don't use cache for playlist.json to avoid stale data
          return Response.error();
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

// Service worker installation
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");

  // Precache critical assets only
  event.waitUntil(
    caches.open(activeCacheName).then(async (cache) => {
      // Only cache critical assets that we know exist
      const criticalAssets = [
        "index.html",
        "css/style.css",
        "css/bootstrap.min.css",
        "js/script.js",
        "js/bootstrap.min.js",
        "manifest.json",
      ];

      console.log("Service Worker: Caching critical assets...");

      try {
        await cache.addAll(criticalAssets);
        console.log("Service Worker: Critical assets cached successfully");
      } catch (error) {
        console.warn("Service Worker: Some assets failed to cache:", error);
        // Don't fail installation if some assets can't be cached
      }
    })
  );

  // Don't force immediate activation - let it happen naturally
  console.log("Service Worker: Installation complete");
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");

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
            if (!cacheAllowList.includes(key)) {
              console.log(`Service Worker: Removing old cache: ${key}`);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker: Activation complete, taking control");
        return self.clients.claim();
      })
  );
});
