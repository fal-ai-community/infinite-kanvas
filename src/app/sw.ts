import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  NetworkFirst,
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
  ExpirationPlugin,
  CacheableResponsePlugin,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope &
  typeof globalThis & {
    skipWaiting(): void;
    addEventListener(
      type: "message",
      listener: (event: MessageEvent) => void,
    ): void;
    addEventListener(type: "sync", listener: (event: any) => void): void;
  };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Cache the home page
    {
      matcher: /^\/$/,
      handler: new NetworkFirst({
        cacheName: "pages",
        plugins: [
          {
            handlerDidError: async () => Response.redirect("/offline", 302),
          },
        ],
      }),
    },
    // Cache canvas pages
    {
      matcher: /^\/k\/[^/]+$/,
      handler: new NetworkFirst({
        cacheName: "canvas-pages",
        plugins: [
          {
            handlerDidError: async () => Response.redirect("/offline", 302),
          },
        ],
      }),
    },
    // Cache API responses for canvas data
    {
      matcher: /^\/api\/trpc\/.*/,
      handler: new NetworkFirst({
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
      }),
    },
    // Cache images from R2/Cloudflare
    {
      matcher: ({ url }) => {
        return (
          url.hostname.includes("r2.cloudflarestorage.com") ||
          url.hostname.includes("imagedelivery.net") ||
          url.hostname.includes("fal.media") ||
          url.hostname.includes("fal.ai")
        );
      },
      handler: new CacheFirst({
        cacheName: "images",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
    // Cache static assets
    {
      matcher: /\.(?:js|css|woff2|woff|ttf|otf|eot)$/,
      handler: new CacheFirst({
        cacheName: "static-assets",
      }),
    },
    // Default cache for everything else
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

// Handle messages from the client
self.addEventListener("message", (event: MessageEvent) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Background sync for saving canvas state
self.addEventListener("sync", async (event: any) => {
  if (event.tag.startsWith("save-canvas-")) {
    const canvasId = event.tag.replace("save-canvas-", "");
    event.waitUntil(syncCanvasData(canvasId));
  }
});

async function syncCanvasData(canvasId: string) {
  try {
    // Get cached canvas data from IndexedDB or other storage
    const cache = await caches.open("canvas-sync");
    const pendingResponses = await cache.matchAll(`/sync/${canvasId}`);

    for (const cachedResponse of pendingResponses) {
      try {
        // Get the request body from the cached response
        const requestData = await cachedResponse.json();

        // Attempt to send the request to the server
        const response = await fetch(`/api/trpc/canvas.update`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        });

        if (response.ok) {
          // Remove from cache on successful sync
          await cache.delete(`/sync/${canvasId}`);
        }
      } catch (error) {
        // Keep in cache for next sync attempt
        console.error("Failed to sync canvas:", error);
      }
    }
  } catch (error) {
    console.error("Background sync error:", error);
  }
}

serwist.addEventListeners();
