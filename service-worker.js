const activeCacheVersion = 215;
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

// Check cahce in browser
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

//Offline analytics
// self.addEventListener("fetch", (event) => {
//   if (event.request.url.endsWith("/track-interaction")) {
//     event.respondWith(
//       (async () => {
//         const db = await openDatabase();
//         const tx = db.transaction("interactions", "readwrite");
//         const store = tx.objectStore("interactions");
//         store.put({
//           url: event.request.url,
//           timestamp: Date.now(),
//         });
//         await tx.complete;
//         return new Response("Interaction tracked", { status: 202 });
//       })()
//     );
//   }
// });

// async function openDatabase() {
//   return new Promise((resolve, reject) => {
//     const request = indexedDB.open("analytics", 1);
//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve(request.result);
//     request.onupgradeneeded = () => {
//       const db = request.result;
//       db.createObjectStore("interactions", {
//         keyPath: "id",
//         autoIncrement: true,
//       });
//     };
//   });
// }

// Synchroniseer offline analytics bij verbinding
// self.addEventListener("sync", (event) => {
//   if (event.tag === "sync-analytics") {
//     event.waitUntil(syncAnalytics());
//   }
// });

// async function syncAnalytics() {
//   const db = await openDatabase();
//   const tx = db.transaction("interactions", "readonly");
//   const store = tx.objectStore("interactions");
//   const allRecords = await store.getAll();

//   const response = await fetch("/sync-analytics", {
//     method: "POST",
//     body: JSON.stringify(allRecords),
//     headers: {
//       "Content-Type": "application/json",
//     },
//   });

//   if (response.ok) {
//     const tx = db.transaction("interactions", "readwrite");
//     const store = tx.objectStore("interactions");
//     await store.clear();
//   }
// }
