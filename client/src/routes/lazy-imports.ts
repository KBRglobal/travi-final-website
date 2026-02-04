import { lazy } from "react";

// Public Pages
export const Homepage = lazy(() => import("@/pages/homepage"));
export const Attractions = lazy(() => import("@/pages/attractions"));
export const HotelsPage = lazy(() => import("@/pages/hotels"));

// Destination Pages
export const DestinationsLanding = lazy(() => import("@/pages/destinations"));
export const DestinationPage = lazy(() => import("@/pages/destination-page"));
export const DestinationAttractions = lazy(() => import("@/pages/destination-attractions"));
export const DestinationDining = lazy(() => import("@/pages/destination-dining"));

// Public Content Pages
export const PublicNews = lazy(() => import("@/pages/public-news"));

// Legal Pages
export const PrivacyPolicy = lazy(() => import("@/pages/privacy"));
export const TermsConditions = lazy(() => import("@/pages/terms"));
export const CookiePolicy = lazy(() => import("@/pages/cookies"));
export const SecurityPolicy = lazy(() => import("@/pages/security"));

// About & Contact
export const PublicAbout = lazy(() => import("@/pages/about"));
export const PublicContact = lazy(() => import("@/pages/contact"));

// Auth Pages
export const Login = lazy(() => import("@/pages/login"));
export const AccessDenied = lazy(() => import("@/pages/access-denied"));
export const NotFound = lazy(() => import("@/pages/not-found"));

// Admin Pages
export const Dashboard = lazy(() => import("@/pages/dashboard"));
export const Settings = lazy(() => import("@/pages/settings"));
export const DestinationBrowser = lazy(() => import("@/pages/destination-browser"));

// Admin Destination Pages
export const DestinationsListPage = lazy(
  () => import("@/pages/admin/destinations/destinations-list")
);
export const DestinationHubPage = lazy(() => import("@/pages/admin/destinations/destination-hub"));

// Admin Site Config
export const SiteSettingsPage = lazy(() => import("@/pages/admin/site-settings"));
export const HomepageEditorPage = lazy(() => import("@/pages/admin/homepage-editor"));

// Tiqets Integration Pages
export const TiqetsAttractionDetail = lazy(() => import("@/pages/admin/tiqets/attraction-detail"));

// Octypo Dashboard (redirect page)
export const OctopusDashboard = lazy(() => import("@/pages/admin/octypo-dashboard"));
