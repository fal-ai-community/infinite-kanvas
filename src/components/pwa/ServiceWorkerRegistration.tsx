"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 1000); // Check every minute

          // Handle updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New service worker available
                  toast("Update available", {
                    description:
                      "A new version is available. Refresh to update.",
                    action: {
                      label: "Refresh",
                      onClick: () => {
                        newWorker.postMessage({ type: "SKIP_WAITING" });
                        window.location.reload();
                      },
                    },
                    duration: 10000,
                  });
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("Service worker registration failed:", error);
        });

      // Handle controller change (when new SW takes over)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });

      // Handle online/offline events
      const handleOnline = () => {
        toast.success("You're back online");
      };

      const handleOffline = () => {
        toast.error("You're offline", {
          description: "Some features may be limited",
        });
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  return null;
}
