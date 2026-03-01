/**
 * Service worker for ZigNum PWA.
 * Uses a cache-first strategy for local assets and a network-only strategy
 * for external resources (PeerJS CDN). Updates the cache in the background
 * when a new service worker version is activated.
 *
 * @version 1
 */

const CACHE_NAME = 'zignum-v1';

/**
 * Local assets to pre-cache during installation.
 * @type {string[]}
 */
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/icons/icon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/js/app.js',
  '/js/components/znum-app.js',
  '/js/components/main-menu.js',
  '/js/components/how-to-play.js',
  '/js/components/player-setup.js',
  '/js/components/game-board.js',
  '/js/components/game-stone.js',
  '/js/components/game-screen.js',
  '/js/components/score-bar.js',
  '/js/components/game-over-dialog.js',
  '/js/components/network-lobby.js',
  '/js/game/game-logic.js',
  '/js/game/game-state.js',
  '/js/game/ai.js',
  '/js/model/constants.js',
  '/js/model/stone.js',
  '/js/model/board.js',
  '/js/model/player.js',
  '/js/network/peer-manager.js',
  '/js/utils/storage.js'
];

/**
 * Install event — pre-caches all local assets.
 * @param {ExtendableEvent} event
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/**
 * Activate event — removes old caches and claims all clients.
 * @param {ExtendableEvent} event
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/**
 * Determines whether a request URL is a local (same-origin) asset.
 * @param {Request} request
 * @returns {boolean}
 */
function isLocalAsset(request) {
  return new URL(request.url).origin === self.location.origin;
}

/**
 * Fetch event — cache-first for local assets, network-only for external
 * resources (e.g. PeerJS CDN). Falls back to cache when offline.
 * @param {FetchEvent} event
 */
self.addEventListener('fetch', (event) => {
  if (!isLocalAsset(event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        /* Refresh the cache in the background for next visit */
        event.waitUntil(
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                return caches.open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => { /* offline — ignore */ })
        );
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          const cloned = networkResponse.clone();
          event.waitUntil(
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, cloned))
          );
        }
        return networkResponse;
      });
    })
  );
});
