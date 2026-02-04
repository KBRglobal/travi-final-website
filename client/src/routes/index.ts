import * as Components from "./lazy-imports";

export interface RouteDefinition {
  path: string;
  component: React.ComponentType<any>;
}

// Locale codes for URL prefixes (16 languages, English is default without prefix)
export const LOCALE_PREFIXES = [
  "ar", "hi",                    // Tier 1
  "zh", "ru", "ur", "fr",        // Tier 2
  "de", "fa", "bn", "fil",       // Tier 3
  "es", "tr", "it", "ja", "ko", "he"  // Tier 4
];

// All public routes - will be mounted with and without locale prefix
export const publicRoutes: RouteDefinition[] = [
  { path: "/login", component: Components.Login },
  { path: "/access-denied", component: Components.AccessDenied },
  { path: "/coming-soon", component: Components.ComingSoon },
  { path: "/search", component: Components.PublicSearch },
  { path: "/attractions", component: Components.Attractions },
  { path: "/attractions/:slug", component: Components.PublicContentViewer },
  { path: "/hotels", component: Components.HotelsPage },
  { path: "/hotels/:slug", component: Components.PublicContentViewer },
  { path: "/dining", component: Components.PublicDining },
  { path: "/dining/:slug", component: Components.PublicContentViewer },
  { path: "/transport/:slug", component: Components.PublicContentViewer },
  { path: "/articles", component: Components.PublicArticles },
  { path: "/articles/:slug", component: Components.PublicContentViewer },
  { path: "/events", component: Components.PublicEvents },
  { path: "/events/:slug", component: Components.PublicContentViewer },

  // Help Center
  { path: "/help", component: Components.HelpCenterPublic },
  { path: "/help/:slug", component: Components.HelpCategory },
  { path: "/help/:categorySlug/:articleSlug", component: Components.HelpArticle },

  // Glossary
  { path: "/glossary", component: Components.GlossaryHub },

  // Shopping & News
  { path: "/shopping", component: Components.PublicShopping },
  { path: "/news", component: Components.PublicNews },

  // Documentation
  { path: "/docs", component: Components.PublicDocs },
  { path: "/docs/:path*", component: Components.PublicDocs },

  // Legal Pages
  { path: "/privacy", component: Components.PrivacyPolicy },
  { path: "/privacy-policy", component: Components.PrivacyPolicy },
  { path: "/terms", component: Components.TermsConditions },
  { path: "/terms-conditions", component: Components.TermsConditions },
  { path: "/cookie-policy", component: Components.CookiePolicy },
  { path: "/cookies", component: Components.CookiePolicy },
  { path: "/security", component: Components.SecurityPolicy },
  { path: "/affiliate-disclosure", component: Components.AffiliateDisclosure },

  // About & Contact
  { path: "/about", component: Components.PublicAbout },
  { path: "/contact", component: Components.PublicContact },

  // Survey Pages
  { path: "/survey/:slug", component: Components.PublicSurvey },

  // Partner/Referral Pages
  { path: "/partners/join", component: Components.PartnersJoin },
  { path: "/partners/dashboard", component: Components.PartnersDashboard },
];

// Admin routes (not exported as we keep them in App.tsx for now)
// These are managed directly in the AdminRouter component
export const adminRoutes: RouteDefinition[] = [
  // Note: Admin routes are defined in App.tsx AdminRouter component
  // This export is here for future refactoring if needed
];
