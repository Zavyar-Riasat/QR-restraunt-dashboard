/**
 * Dineflow Service Worker
 * Fast offline App Shell caching + Live Network Only for Orders & API
 */

const CACHE_NAME = 'dineflow-pwa-v6';

// Static icons & manifest to precache (never precache HTML or JS bundles at install time)
const PRECACHE_ASSETS = [
  '/manifest.json',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
];

function isLocalhostOrigin() {
  const host = self.location?.hostname || '';
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

// Domains and endpoints that must NEVER be cached (strictly Live / Network Only)
const LIVE_NETWORK_PATTERNS = [
  'supabase.co',
  '/api/',
  '/src/',
  '/@vite/',
  '/@react-refresh',
  '/node_modules/',
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

// 1. Install Event: Cache static icons & skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  if (isLocalhostOrigin()) {
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => {
        console.warn('[Dineflow SW] Precaching notice:', err);
      })
  );
});

// 2. Activate Event: Clean up legacy caches & unregister on localhost
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (isLocalhostOrigin() || name !== CACHE_NAME) {
              return caches.delete(name);
            }
          })
        )
      )
      .then(async () => {
        await self.clients.claim();
        if (isLocalhostOrigin() && self.registration) {
          await self.registration.unregister();
        }
      })
  );
});

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
  // Never intercept requests on localhost / dev server
  if (isLocalhostOrigin()) {
    return;
  }

  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests or unsupported schemes
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // RULE A: API calls, Supabase endpoints, dev modules, orders, and geocoding MUST NEVER BE CACHED.
  if (isLiveNetworkRequest(url)) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Network offline. Live data could not be fetched.' }),
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

  // RULE B: HTML Navigation requests (e.g. /dashboard, /) -> NetworkFirst with App Shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(async () => {
          const cachedShell = await caches.match('/index.html');
          return cachedShell || caches.match('/');
        })
    );
    return;
  }

  // RULE C: JS / CSS Bundles & Static Assets -> NetworkFirst to guarantee fresh deployments
  const isCodeAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.endsWith('.css');

  if (isCodeAsset) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const contentType = networkResponse.headers.get('content-type') || '';
          // Never cache HTML fallback responses returned for missing JS/CSS chunks
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            !contentType.includes('text/html')
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || Response.error();
        })
    );
    return;
  }

  // RULE D: Images, Fonts, Icons -> Stale While Revalidate
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
        .catch(() => cachedResponse);

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
      data = { title: 'Dineflow Alert', body: event.data.text() };
    }
  }

  const title = data.title || '🍽️ New Kitchen Order!';
  const options = {
    body: data.body || 'A new order has arrived. Tap to view on dashboard.',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200, 100, 300],
    tag: data.tag || 'dineflow-order',
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
