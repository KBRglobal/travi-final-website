import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import "./lib/i18n/config";

// Lazy-load PostHog analytics after page is interactive
function initPostHog() {
  if (import.meta.env.VITE_POSTHOG_KEY) {
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
        capture_pageview: false,
      });
    });
  }
}
if (typeof globalThis.requestIdleCallback === "undefined") {
  setTimeout(initPostHog, 2000);
} else {
  globalThis.requestIdleCallback(initPostHog);
}

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  globalThis.addEventListener("load", async () => {
    const swCleanupKey = "travi_sw_cleanup_v1";
    if (!sessionStorage.getItem(swCleanupKey)) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          for (const registration of registrations) {
            await registration.unregister();
          }
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
          }
          sessionStorage.setItem(swCleanupKey, "done");
          globalThis.location.reload();
          return;
        }
      } catch (e) {
        console.error("SW cleanup error:", e);
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
