import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import "./lib/i18n/config";

// Lazy-load PostHog analytics after page is interactive (saves ~172KB from initial bundle)
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

if (typeof requestIdleCallback !== "undefined") {
  requestIdleCallback(initPostHog);
} else {
  setTimeout(initPostHog, 2000);
}

// SW cleanup handled in index.html inline script (runs earlier)

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
