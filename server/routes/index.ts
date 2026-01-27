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
import { registerMetricsRoutes } from "./metrics-routes";
import { registerMediaIntelligenceRoutes } from "../media-intelligence/routes";

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
  // Authentication and security routes
  // Handles: login, logout, TOTP 2FA, device management, session security
  registerAuthRoutes(app);

  // Content management routes
  // Handles: Content CRUD, public APIs, translations, versions
  registerContentRoutes(app);

  // Analytics and metrics routes
  // Handles: Stats, content metrics, performance tracking
  await registerAnalyticsRoutes(app);

  // Newsletter routes
  // Handles: Subscriptions, campaigns, A/B testing
  registerNewsletterRoutes(app);

  // Public API routes
  // Handles: Destinations, attractions, homepage config, surveys, layouts
  registerPublicApiRoutes(app);

  // Admin API routes
  // Handles: Logs, homepage CMS, auto-meta, destinations admin, hero slides, etc.
  registerAdminApiRoutes(app);

  // AI API routes
  // Handles: Content generation, image generation, SEO tools, plagiarism detection, content scoring
  registerAiApiRoutes(app);

  // Monetization API routes
  // Handles: Affiliate links, partners, payouts management
  registerMonetizationApiRoutes(app);

  // Localization API routes
  // Handles: Translations, locales, coverage stats, DeepL/Claude translation
  registerLocalizationApiRoutes(app);

  // Automation API routes
  // Handles: Workflows, webhooks, A/B testing
  registerAutomationApiRoutes(app);

  // CMS API routes
  // Handles: Site settings, homepage promotions
  registerCmsApiRoutes(app);

  // Prometheus metrics routes
  // Handles: /api/metrics for Prometheus scraping, /api/metrics/json for internal use
  registerMetricsRoutes(app);

  // Media Intelligence routes
  // Handles: AI-powered image analysis, multi-language alt text, smart compression
  registerMediaIntelligenceRoutes(app);
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
