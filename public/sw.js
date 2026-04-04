/**
 * Ragnarök Service Worker
 * Uses Workbox via CDN for caching strategies.
 * Handles offline fallback, background sync, and push notifications.
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

const { strategies, routing, expiration, backgroundSync, precaching } = workbox;

// ─── Precache app shell ─────────────────────────────────────────────────────
// Next.js assets are hashed so we don't need precise precaching;
// we'll handle them with runtime caching instead.
precaching.cleanupOutdatedCaches();

// ─── Offline fallback ────────────────────────────────────────────────────────
const offlineFallback = "/offline";

// ─── Static assets — Cache First ────────────────────────────────────────────
routing.registerRoute(
  ({ request }) =>
    request.destination === "image" ||
    request.destination === "font" ||
    request.destination === "style",
  new strategies.CacheFirst({
    cacheName: "ragnarok-static-assets",
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// ─── Next.js static chunks — Cache First ─────────────────────────────────────
routing.registerRoute(
  ({ url }) => url.pathname.startsWith("/_next/static/"),
  new strategies.CacheFirst({
    cacheName: "ragnarok-next-static",
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year (immutable hashes)
      }),
    ],
  })
);

// ─── Next.js image optimisation — Stale While Revalidate ─────────────────────
routing.registerRoute(
  ({ url }) => url.pathname.startsWith("/_next/image"),
  new strategies.StaleWhileRevalidate({
    cacheName: "ragnarok-next-images",
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// ─── API routes — Network First with fallback ────────────────────────────────
routing.registerRoute(
  ({ url }) =>
    url.pathname.startsWith("/api/community/") ||
    url.pathname.startsWith("/api/fitness/") ||
    url.pathname.startsWith("/api/nutrition/") ||
    url.pathname.startsWith("/api/notifications/") ||
    url.pathname.startsWith("/api/account/"),
  new strategies.NetworkFirst({
    cacheName: "ragnarok-api-dynamic",
    networkTimeoutSeconds: 10,
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// ─── Search — Network First ───────────────────────────────────────────────────
routing.registerRoute(
  ({ url }) => url.pathname.startsWith("/api/search"),
  new strategies.NetworkFirst({
    cacheName: "ragnarok-search",
    networkTimeoutSeconds: 8,
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 2 * 60, // 2 minutes
      }),
    ],
  })
);

// ─── Semi-static pages — Stale While Revalidate ──────────────────────────────
routing.registerRoute(
  ({ url, request }) =>
    request.mode === "navigate" &&
    (url.pathname === "/" ||
      url.pathname.startsWith("/product/") ||
      url.pathname === "/policies"),
  new strategies.StaleWhileRevalidate({
    cacheName: "ragnarok-pages-semi-static",
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// ─── Navigation fallback (offline page) ─────────────────────────────────────
routing.setCatchHandler(async ({ event }) => {
  if (event.request.destination === "document") {
    const offlineResponse = await caches.match(offlineFallback);
    if (offlineResponse) return offlineResponse;
    // Try to fetch offline page directly
    return fetch(offlineFallback);
  }
  return Response.error();
});

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Ragnarök", body: event.data.text() };
  }

  const options = {
    body: payload.body ?? "",
    icon: payload.icon ?? "/icons/icon-192x192.png",
    badge: payload.badge ?? "/icons/icon-72x72.png",
    tag: payload.tag ?? "ragnarok",
    data: { url: payload.url ?? "/" },
    vibrate: [100, 50, 100],
    actions: payload.url
      ? [{ action: "open", title: "Open" }]
      : [],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Ragnarök", options)
  );
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});

// ─── Skip waiting (activate immediately) ─────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
