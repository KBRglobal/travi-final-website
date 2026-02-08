/**
 * PWA + Offline Support
 *
 * - Service Worker generation
 * - Manifest configuration
 * - Offline content caching strategy
 * - Push notifications setup
 */

import { db } from "./db";
import { contents, pushSubscriptions } from "@shared/schema";

import { eq, desc } from "drizzle-orm";

// ============================================================================
// MANIFEST CONFIGURATION
// ============================================================================

export interface PWAManifest {
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  display: "fullscreen" | "standalone" | "minimal-ui" | "browser";
  orientation: "any" | "natural" | "landscape" | "portrait";
  background_color: string;
  theme_color: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
  categories: string[];
  lang: string;
  dir: "ltr" | "rtl" | "auto";
  screenshots?: Array<{
    src: string;
    sizes: string;
    type: string;
    label: string;
  }>;
  shortcuts?: Array<{
    name: string;
    short_name: string;
    description: string;
    url: string;
    icons: Array<{ src: string; sizes: string }>;
  }>;
  related_applications?: Array<{
    platform: string;
    url: string;
    id?: string;
  }>;
}

const defaultManifest: PWAManifest = {
  name: "Travi - Dubai Travel Guide",
  short_name: "Travi",
  description: "Your complete guide to Dubai - hotels, attractions, restaurants, and more",
  start_url: "/",
  display: "standalone",
  orientation: "any",
  background_color: "#ffffff",
  theme_color: "#1a237e",
  icons: [
    { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png" },
    { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
    { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png" },
    { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png" },
    { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
    {
      src: "/icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png" },
    {
      src: "/icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
  categories: ["travel", "lifestyle", "entertainment"],
  lang: "en",
  dir: "ltr",
  shortcuts: [
    {
      name: "Hotels",
      short_name: "Hotels",
      description: "Browse Dubai hotels",
      url: "/hotels",
      icons: [{ src: "/icons/hotel.png", sizes: "96x96" }],
    },
    {
      name: "Attractions",
      short_name: "Attractions",
      description: "Explore Dubai attractions",
      url: "/attractions",
      icons: [{ src: "/icons/attraction.png", sizes: "96x96" }],
    },
    {
      name: "Restaurants",
      short_name: "Dining",
      description: "Find restaurants",
      url: "/dining",
      icons: [{ src: "/icons/restaurant.png", sizes: "96x96" }],
    },
  ],
};

// ============================================================================
// SERVICE WORKER CONFIGURATION
// ============================================================================

export interface ServiceWorkerConfig {
  cacheName: string;
  version: string;
  precacheUrls: string[];
  runtimeCaching: Array<{
    urlPattern: string | RegExp;
    handler: "CacheFirst" | "NetworkFirst" | "StaleWhileRevalidate" | "NetworkOnly" | "CacheOnly";
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      networkTimeoutSeconds?: number;
    };
  }>;
  offlineFallback?: {
    page: string;
    image: string;
  };
}

const defaultSwConfig: ServiceWorkerConfig = {
  cacheName: "travi-cache",
  version: "v1",
  precacheUrls: [
    "/",
    "/offline",
    "/manifest.json",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
  ],
  runtimeCaching: [
    // API responses - network first, cache as fallback
    {
      urlPattern: "/api/contents",
      handler: "NetworkFirst",
      options: {
        cacheName: "api-contents",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 3600, // 1 hour
        },
        networkTimeoutSeconds: 5,
      },
    },
    // Images - cache first
    {
      urlPattern: String.raw`\.(png|jpg|jpeg|webp|gif|svg)$`,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 86400 * 30, // 30 days
        },
      },
    },
    // CSS/JS - stale while revalidate
    {
      urlPattern: String.raw`\.(css|js)$`,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-assets",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 86400 * 7, // 7 days
        },
      },
    },
    // Fonts - cache first, long expiration
    {
      urlPattern: String.raw`\.(woff|woff2|ttf|eot)$`,
      handler: "CacheFirst",
      options: {
        cacheName: "fonts",
        expiration: {
          maxEntries: 20,
          maxAgeSeconds: 86400 * 365, // 1 year
        },
      },
    },
    // Pages - network first
    {
      urlPattern: "^/(?!api)",
      handler: "NetworkFirst",
      options: {
        cacheName: "pages",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 3600,
        },
        networkTimeoutSeconds: 3,
      },
    },
  ],
  offlineFallback: {
    page: "/offline",
    image: "/images/offline-placeholder.png",
  },
};

// ============================================================================
// PWA MANAGER
// ============================================================================

export const pwaManager = {
  /**
   * Generate manifest.json
   */
  async generateManifest(locale: string = "en"): Promise<PWAManifest> {
    const manifest = { ...defaultManifest };

    if (locale === "he") {
      manifest.name = "";
      manifest.short_name = "";
      manifest.description = "";
      manifest.lang = "he";
      manifest.dir = "rtl";
      manifest.shortcuts = [
        {
          name: "",
          short_name: "",
          description: "",
          url: "/he/hotels",
          icons: [{ src: "/icons/hotel.png", sizes: "96x96" }],
        },
        {
          name: "",
          short_name: "",
          description: "",
          url: "/he/attractions",
          icons: [{ src: "/icons/attraction.png", sizes: "96x96" }],
        },
        {
          name: "",
          short_name: "",
          description: "",
          url: "/he/dining",
          icons: [{ src: "/icons/restaurant.png", sizes: "96x96" }],
        },
      ];
    }

    return manifest;
  },

  /**
   * Generate service worker script
   */
  generateServiceWorker(): string {
    const config = defaultSwConfig;
    const bslash = String.fromCodePoint(92);

    return `
// Service Worker for Travi PWA
// Version: ${config.version}
// Cache Name: ${config.cacheName}

const CACHE_NAME = '${config.cacheName}-${config.version}';
const PRECACHE_URLS = ${JSON.stringify(config.precacheUrls)};

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('${config.cacheName}') && name !== CACHE_NAME)
            .map((name) => {
              
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - runtime caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // API requests - Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request, 'api-cache', 5000));
    return;
  }

  // Images - Cache First
  if (/${bslash}.(png|jpg|jpeg|webp|gif|svg)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, 'images'));
    return;
  }

  // Static assets - Stale While Revalidate
  if (/${bslash}.(css|js)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request, 'static-assets'));
    return;
  }

  // Fonts - Cache First (long expiration)
  if (/${bslash}.(woff|woff2|ttf|eot)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, 'fonts'));
    return;
  }

  // Pages - Network First with offline fallback
  event.respondWith(networkFirstWithFallback(event.request));
});

// Cache First Strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// Network First Strategy
async function networkFirst(request, cacheName, timeout = 3000) {
  const cache = await caches.open(cacheName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Network First with Offline Fallback
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open('pages');
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }

    return new Response('Offline', { status: 503 });
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || 'New update from Travi',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Travi', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  // Sync offline favorites when back online
  const db = await openDB('travi-offline', 1);
  const pendingFavorites = await db.getAll('pending-favorites');

  for (const favorite of pendingFavorites) {
    try {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(favorite),
      });
      await db.delete('pending-favorites', favorite.id);
    } catch { void 0; }
  }
}


`;
  },

  /**
   * Get content for offline caching
   */
  async getOfflineContent(limit: number = 20): Promise<{
    urls: string[];
    totalSize: number;
  }> {
    // Get most popular/recent content for offline caching
    const popularContent = await db
      .select({
        slug: contents.slug,
        type: contents.type,
      })
      .from(contents)
      .where(eq(contents.status, "published"))
      .orderBy(desc(contents.publishedAt))
      .limit(limit);

    const urls = popularContent.map(c => `/${c.type}/${c.slug}`);

    return {
      urls,
      totalSize: urls.length * 100000, // Estimate ~100KB per page
    };
  },

  /**
   * Generate offline page HTML
   */
  generateOfflinePage(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Travi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
      color: white;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 24px;
    }
    button {
      background: white;
      color: #1a237e;
      border: none;
      padding: 12px 32px;
      font-size: 16px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .cached-pages {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }
    .cached-pages h3 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      opacity: 0.7;
    }
    .cached-pages ul {
      list-style: none;
    }
    .cached-pages li {
      margin: 8px 0;
    }
    .cached-pages a {
      color: white;
      text-decoration: none;
      opacity: 0.9;
    }
    .cached-pages a:hover {
      opacity: 1;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection. Some content might still be available from your cache.</p>
    <button onclick="window.location.reload()">Try Again</button>

    <div class="cached-pages" id="cached-pages" style="display: none;">
      <h3>Available Offline</h3>
      <ul id="cached-list"></ul>
    </div>
  </div>

  <script>
    // Check for cached pages
    if ('caches' in window) {
      caches.open('pages').then(cache => {
        cache.keys().then(requests => {
          if (requests.length > 0) {
            document.getElementById('cached-pages').style.display = 'block';
            const list = document.getElementById('cached-list');
            requests.slice(0, 5).forEach(request => {
              const url = new URL(request.url);
              const li = document.createElement('li');
              const a = document.createElement('a');
              a.href = url.pathname;
              a.textContent = url.pathname === '/' ? 'Home' : url.pathname.slice(1);
              li.appendChild(a);
              list.appendChild(li);
            });
          }
        });
      });
    }
  </script>
</body>
</html>
`;
  },
};

// ============================================================================
// PUSH NOTIFICATIONS - Database-backed storage
// ============================================================================

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  locale: string;
  userAgent?: string;
  createdAt: Date;
}

export const pushNotifications = {
  /**
   * Save push subscription
   */
  async subscribe(
    subscription: Omit<PushSubscriptionData, "createdAt">,
    userId?: string
  ): Promise<void> {
    // Check if subscription already exists
    const [existing] = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          userId: userId || null,
          locale: subscription.locale,
          userAgent: subscription.userAgent || null,
          updatedAt: new Date(),
        } as any)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else {
      // Create new subscription
      await db.insert(pushSubscriptions).values({
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
        userId: userId || null,
        locale: subscription.locale,
        userAgent: subscription.userAgent || null,
      } as any);
    }
  },

  /**
   * Remove push subscription
   */
  async unsubscribe(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  },

  /**
   * Send push notification
   */
  async send(
    title: string,
    body: string,
    options?: {
      url?: string;
      icon?: string;
      badge?: string;
      targetUsers?: string[];
      targetLocales?: string[];
    }
  ): Promise<{ sent: number; failed: number }> {
    // In production, use web-push library
    // const webpush = require('web-push');
    // webpush.setVapidDetails(...)

    let targets = await db.select().from(pushSubscriptions);

    if (options?.targetUsers) {
      targets = targets.filter(s => s.userId && options.targetUsers!.includes(s.userId));
    }
    if (options?.targetLocales) {
      targets = targets.filter(s => options.targetLocales!.includes(s.locale));
    }

    let sent = 0;
    let failed = 0;

    for (const subscription of targets) {
      try {
        // In production:
        // await webpush.sendNotification({
        //   endpoint: subscription.endpoint,
        //   keys: { p256dh: subscription.p256dhKey, auth: subscription.authKey }
        // }, JSON.stringify({ title, body, ...options }));
        sent++;
      } catch (error) {
        failed++;
        // Remove invalid subscriptions (gone)
        if ((error as any).statusCode === 410) {
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        }
      }
    }

    return { sent, failed };
  },

  /**
   * Get subscription count
   */
  async getStats(): Promise<{
    total: number;
    byLocale: Record<string, number>;
    withUser: number;
    anonymous: number;
  }> {
    const all = await db.select().from(pushSubscriptions);
    const byLocale: Record<string, number> = {};

    for (const sub of all) {
      byLocale[sub.locale] = (byLocale[sub.locale] || 0) + 1;
    }

    return {
      total: all.length,
      byLocale,
      withUser: all.filter(s => s.userId).length,
      anonymous: all.filter(s => !s.userId).length,
    };
  },

  /**
   * Get all subscriptions (for admin)
   */
  async getAll(): Promise<PushSubscriptionData[]> {
    const rows = await db.select().from(pushSubscriptions);
    return rows.map(r => ({
      endpoint: r.endpoint,
      keys: {
        p256dh: r.p256dhKey,
        auth: r.authKey,
      },
      userId: r.userId || undefined,
      locale: r.locale,
      userAgent: r.userAgent || undefined,
      createdAt: r.createdAt,
    }));
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const pwa = {
  manager: pwaManager,
  push: pushNotifications,
};

export default pwa;
