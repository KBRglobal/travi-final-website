import * as Components from "./lazy-imports";

export interface RouteDefinition {
  path: string;
  component: React.ComponentType<any>;
}

// Locale codes for URL prefixes (16 languages, English is default without prefix)
export const LOCALE_PREFIXES = [
  "ar",
  "hi", // Tier 1
  "zh",
  "ru",
  "ur",
  "fr", // Tier 2
  "de",
  "fa",
  "bn",
  "fil", // Tier 3
  "es",
  "tr",
  "it",
  "ja",
  "ko",
  "he", // Tier 4
];

// All public routes - will be mounted with and without locale prefix
export const publicRoutes: RouteDefinition[] = [
  { path: "/login", component: Components.Login },
  { path: "/access-denied", component: Components.AccessDenied },
  { path: "/attractions", component: Components.Attractions },
  { path: "/hotels", component: Components.HotelsPage },
  { path: "/news", component: Components.PublicNews },

  // Legal Pages
  { path: "/privacy", component: Components.PrivacyPolicy },
  { path: "/privacy-policy", component: Components.PrivacyPolicy },
  { path: "/terms", component: Components.TermsConditions },
  { path: "/terms-conditions", component: Components.TermsConditions },
  { path: "/cookie-policy", component: Components.CookiePolicy },
  { path: "/cookies", component: Components.CookiePolicy },
  { path: "/security", component: Components.SecurityPolicy },

  // About & Contact
  { path: "/about", component: Components.PublicAbout },
  { path: "/contact", component: Components.PublicContact },
];

// Admin routes (not exported as we keep them in App.tsx for now)
// These are managed directly in the AdminRouter component
export const adminRoutes: RouteDefinition[] = [
  // Note: Admin routes are defined in App.tsx AdminRouter component
  // This export is here for future refactoring if needed
];
