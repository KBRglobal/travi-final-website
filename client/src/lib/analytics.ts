// Google Analytics Integration
// Using Replit blueprint for GA4 integration

// Google Analytics types
type GtagCommand = "config" | "event" | "js" | "set";
type GtagConfigParams = { page_path?: string; [key: string]: unknown };
type GtagEventParams = {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: unknown;
};

declare global {
  interface Window {
    dataLayer: Array<unknown>;
    gtag: (
      command: GtagCommand,
      targetOrDate: string | Date,
      params?: GtagConfigParams | GtagEventParams
    ) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement("script");
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement("script");
  script2.textContent = `
    globalThis.dataLayer = globalThis.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof globalThis.window === "undefined" || !globalThis.gtag) return;

  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;

  globalThis.gtag("config", measurementId, {
    page_path: url,
  });
};

// Track events
export const trackEvent = (action: string, category?: string, label?: string, value?: number) => {
  if (typeof globalThis.window === "undefined" || !globalThis.gtag) return;

  globalThis.gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};
