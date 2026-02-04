const CACHE_VERSION = 'travi-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;
const IMAGES_CACHE = `${CACHE_VERSION}-images`;
const FONTS_CACHE = `${CACHE_VERSION}-fonts`;

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon-48x48.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/ogImage.jpg',
  '/site.webmanifest'
];

const API_CACHE_PATTERNS = [
  /\/api\/contents/,
  /\/api\/public\//,
  /\/api\/destinations/,
  /\/api\/attractions/,
  /\/api\/hotels/,
  /\/api\/dining/,
  /\/api\/districts/
];

const FONT_PATTERNS = [
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /fonts\.cdnfonts\.com/
];

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { cache: 'reload' });
        })).catch((error) => {
          console.warn('Failed to cache some static assets:', error);
        });
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW Install] Failed to install service worker:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('travi-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== API_CACHE && name !== IMAGES_CACHE && name !== FONTS_CACHE)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
      .catch((error) => {
        console.error('[SW Activate] Failed to activate service worker:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin !== location.origin && !FONT_PATTERNS.some(pattern => pattern.test(request.url))) {
    return;
  }

  if (FONT_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(cacheFirst(request, FONTS_CACHE, 365 * 24 * 60 * 60 * 1000));
    return;
  }

  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE, 24 * 60 * 60 * 1000));
    return;
  }

  if (IMAGE_EXTENSIONS.test(url.pathname)) {
    event.respondWith(cacheFirst(request, IMAGES_CACHE, 30 * 24 * 60 * 60 * 1000));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, 60 * 60 * 1000));
    return;
  }

  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  event.respondWith(networkFirst(request, DYNAMIC_CACHE, 60 * 60 * 1000));
});

async function cacheFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const dateHeader = cachedResponse.headers.get('sw-cache-date');
    if (dateHeader) {
      const cacheDate = new Date(dateHeader);
      if (Date.now() - cacheDate.getTime() < maxAge) {
        return cachedResponse;
      }
    } else {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-date', new Date().toISOString());
      
      const body = await responseToCache.blob();
      const cachedResponse = new Response(body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, cachedResponse);
    }
    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function networkFirst(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Network timeout')), 10000)
      )
    ]);

    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-date', new Date().toISOString());
      
      const body = await responseToCache.blob();
      const cachedResponse = new Response(body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers
      });
      
      cache.put(request, cachedResponse);
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    if (request.mode === 'navigate') {
      const offlineCache = await caches.open(STATIC_CACHE);
      const offlineResponse = await offlineCache.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
