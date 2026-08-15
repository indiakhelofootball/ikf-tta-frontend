/* Exists so Chrome installs TTA as a WebAPK — a standalone app with its own
   launcher icon and no browser UI. That upgrade from "home screen shortcut" to
   "installed app" requires a registered worker with a fetch handler.

   Caching is deliberately narrow. Only content-hashed build assets are stored,
   because a rebuild changes their filename and a cached copy can never go
   stale. The HTML shell is always fetched from the network: a stale shell
   references asset filenames that no longer exist, which is what renders a
   blank page. API responses are never cached — they are per-user and mutable. */

const CACHE = 'tta-static-v1';
const MAX_ENTRIES = 60;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isHashedAsset(url) {
  return (
    url.origin === self.location.origin && /^\/static\/(js|css|media)\//.test(url.pathname)
  );
}

// Each deploy introduces new filenames rather than replacing old ones, so the
// cache would grow by a full bundle every release without a cap. Cache.keys()
// returns insertion order, making the oldest entries the ones to drop.
async function putCapped(request, response) {
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
  const keys = await cache.keys();
  if (keys.length > MAX_ENTRIES) {
    await Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((key) => cache.delete(key)));
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!isHashedAsset(new URL(request.url))) return;

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) putCapped(request, response.clone());
          return response;
        })
    )
  );
});
