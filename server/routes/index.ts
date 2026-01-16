import type { Express } from "express";
import { registerAuthRoutes } from "./auth-routes";
import { registerContentRoutes } from "./content-routes";
import { registerAnalyticsRoutes } from "./analytics-routes";
import { registerNewsletterRoutes } from "./newsletter-routes";
import { registerPublicApiRoutes } from "./public-api";
import { registerAdminApiRoutes } from "./admin-api";
import { registerAiApiRoutes } from "./ai-api";
import { registerMonetizationApiRoutes } from "./monetization-api";
import { registerLocalizationApiRoutes } from "./localization-api";
import { registerAutomationApiRoutes } from "./automation-api";
import { registerCmsApiRoutes } from "./cms-api";

/**
 * Main router registry that coordinates all domain-specific route modules.
 *
 * This file serves as a single entry point for registering all application routes,
 * organized by business domain for better maintainability and code organization.
 *
 * Domain route modules:
 * - auth-routes: Authentication, TOTP 2FA, and security endpoints
 * - content-routes: Content CRUD operations and public content APIs
 * - analytics-routes: Metrics, performance tracking, and statistics
 * - newsletter-routes: Newsletter subscriptions, campaigns, and management
 * - public-api: Public API endpoints (destinations, attractions, homepage config, etc.)
 * - admin-api: Admin API endpoints (logs, homepage CMS, auto-meta, etc.)
 * - ai-api: AI content generation, image generation, SEO tools, and content analysis
 * - monetization-api: Affiliate links, partners, payouts management
 * - localization-api: Translation management, locales, DeepL integration
 * - automation-api: Workflows, webhooks, A/B testing endpoints
 * - cms-api: CMS configuration, site settings, homepage promotions
 *
 * Usage:
 * import { registerAllRoutes } from "./routes";
 * registerAllRoutes(app);
 */

export async function registerAllRoutes(app: Express): Promise<void> {
  console.log("[Routes] Registering domain-based route modules...");

  // Authentication and security routes
  // Handles: login, logout, TOTP 2FA, device management, session security
  registerAuthRoutes(app);
  console.log("[Routes] ✓ Auth routes registered");

  // Content management routes
  // Handles: Content CRUD, public APIs, translations, versions
  registerContentRoutes(app);
  console.log("[Routes] ✓ Content routes registered");

  // Analytics and metrics routes
  // Handles: Stats, content metrics, performance tracking
  await registerAnalyticsRoutes(app);
  console.log("[Routes] ✓ Analytics routes registered");

  // Newsletter routes
  // Handles: Subscriptions, campaigns, A/B testing
  registerNewsletterRoutes(app);
  console.log("[Routes] ✓ Newsletter routes registered");

  // Public API routes
  // Handles: Destinations, attractions, homepage config, surveys, layouts
  registerPublicApiRoutes(app);
  console.log("[Routes] ✓ Public API routes registered");

  // Admin API routes
  // Handles: Logs, homepage CMS, auto-meta, destinations admin, hero slides, etc.
  registerAdminApiRoutes(app);
  console.log("[Routes] ✓ Admin API routes registered");

  // AI API routes
  // Handles: Content generation, image generation, SEO tools, plagiarism detection, content scoring
  registerAiApiRoutes(app);
  console.log("[Routes] ✓ AI API routes registered");

  // Monetization API routes
  // Handles: Affiliate links, partners, payouts management
  registerMonetizationApiRoutes(app);
  console.log("[Routes] ✓ Monetization API routes registered");

  // Localization API routes
  // Handles: Translations, locales, coverage stats, DeepL/Claude translation
  registerLocalizationApiRoutes(app);
  console.log("[Routes] ✓ Localization API routes registered");

  // Automation API routes
  // Handles: Workflows, webhooks, A/B testing
  registerAutomationApiRoutes(app);
  console.log("[Routes] ✓ Automation API routes registered");

  // CMS API routes
  // Handles: Site settings, homepage promotions
  registerCmsApiRoutes(app);
  console.log("[Routes] ✓ CMS API routes registered");

  console.log("[Routes] All domain route modules registered successfully");
}

// Export individual registrars for selective usage
export {
  registerAuthRoutes,
  registerContentRoutes,
  registerAnalyticsRoutes,
  registerNewsletterRoutes,
  registerPublicApiRoutes,
  registerAdminApiRoutes,
  registerAiApiRoutes,
  registerMonetizationApiRoutes,
  registerLocalizationApiRoutes,
  registerAutomationApiRoutes,
  registerCmsApiRoutes,
};
