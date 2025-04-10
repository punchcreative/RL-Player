// cache name
const CACHE_NAME = "rl-player-v1";

// files and folders to cache
const urlsToCache = [
  // "./",
  // "./index.html",
  // "./css/style.css",
  // "./js/script.js",
  "./img/cover.png",
  "./img/background.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      console.log("Cache opened: " + CACHE_NAME);
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (response) {
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
