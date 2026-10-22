/**
 * DineHQ Service Worker
 * Fast offline App Shell caching + Live Network Only for Orders & API
 */

const CACHE_NAME = 'dinehq-pwa-v1';

// App shell and critical static assets to precache
const PRECACHE_ASSETS = [
  '/',
  '/dashboard',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

// Domains and endpoints that must NEVER be cached (strictly Live / Network Only)
const LIVE_NETWORK_PATTERNS = [
  'supabase.co',
  '/api/',
  'nominatim.openstreetmap.org',
  'tile.openstreetmap.org',
  'carto.com',
  'chrome-extension',
];

// Helper to check if a URL is dynamic / live data
function isLiveNetworkRequest(url) {
  const urlStr = url.toString().toLowerCase();
  return LIVE_NETWORK_PATTERNS.some((pattern) => urlStr.includes(pattern));
}

// 1. Install Event: Cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[DineHQ SW] Precaching notice:', err);
      })
  );
});

// 2. Activate Event: Clean up legacy caches & take immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests or unsupported schemes
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // RULE A: API calls, Supabase endpoints, orders, and geocoding MUST NEVER BE CACHED.
  // Always fetch live from the network.
  if (isLiveNetworkRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return a clean 503 response if network is down
        return new Response(
          JSON.stringify({ error: 'Network offline. Live live-data could not be fetched.' }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' },
          }
        );
      })
    );
    return;
  }

  // RULE B: HTML Navigation requests (e.g. /dashboard, /) -> NetworkFirst with App Shell cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback to app shell
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const shell = await caches.match('/index.html');
          return shell || caches.match('/');
        })
    );
    return;
  }

  // RULE C: Static Assets (JS, CSS, SVGs, PNGs, Fonts) -> Stale While Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, fallback gracefully
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// 4. Web Push Notification Event (Background order alerts)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'DineHQ Alert', body: event.data.text() };
    }
  }

  const title = data.title || '🍽️ New Kitchen Order!';
  const options = {
    body: data.body || 'A new order has arrived. Tap to view on dashboard.',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 300],
    tag: data.tag || 'dinehq-order',
    renotify: true,
    data: {
      url: data.url || '/dashboard',
    },
    actions: [
      { action: 'open', title: 'Open Dashboard' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 5. Notification Click Event: Focus or Open Dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
