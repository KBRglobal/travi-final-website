import type { Express } from "express";
import { registerContentRoutes } from "./content-routes";
import { registerPublicApiRoutes } from "./public-api";
import { registerAdminApiRoutes } from "./admin-api";
import { registerAiApiRoutes } from "./ai-api";
import { registerLocalizationApiRoutes } from "./localization-api";
import { registerAutomationApiRoutes } from "./automation-api";
import { registerCmsApiRoutes } from "./cms-api";
import { registerMetricsRoutes } from "./metrics-routes";
import { registerMediaIntelligenceRoutes } from "../media-intelligence/routes";
import { registerNewsletterRoutes } from "./newsletter-routes";
import { registerSurveyRoutes } from "./survey-routes";
import { registerGdprRoutes } from "./gdpr-routes";
import { registerWeeklyDigestRoutes } from "./weekly-digest-routes";
import { registerWebhookWorkflowRoutes } from "./webhook-workflow-routes";
import { registerAffiliateRoutes } from "./affiliate-routes";
import { registerAiToolsRoutes } from "./ai-tools-routes";
import { registerEmailMarketingRoutes } from "./email-marketing-routes";
import { registerContentOrganizationRoutes } from "./content-organization-routes";
import { registerTranslationRoutes } from "./translation-routes";
import { registerUserRoutes } from "./user-routes";
import { registerPageLayoutRoutes } from "./page-layout-routes";
import { registerWriterPromotionRoutes } from "./writer-promotion-routes";
import { registerRssFeedRoutes } from "./rss-feed-routes";

/**
 * Main router registry that coordinates all domain-specific route modules.
 */

export async function registerAllRoutes(app: Express): Promise<void> {
  // Content management routes
  registerContentRoutes(app);

  // Public API routes
  registerPublicApiRoutes(app);

  // Admin API routes
  registerAdminApiRoutes(app);

  // AI API routes
  registerAiApiRoutes(app);

  // Localization API routes
  registerLocalizationApiRoutes(app);

  // Automation API routes
  registerAutomationApiRoutes(app);

  // CMS API routes
  registerCmsApiRoutes(app);

  // Prometheus metrics routes
  registerMetricsRoutes(app);

  // Media Intelligence routes
  registerMediaIntelligenceRoutes(app);

  // Newsletter routes
  registerNewsletterRoutes(app);

  // Survey routes
  registerSurveyRoutes(app);

  // GDPR compliance routes
  registerGdprRoutes(app);

  // Weekly digest routes
  registerWeeklyDigestRoutes(app);

  // Webhook and workflow routes
  registerWebhookWorkflowRoutes(app);

  // Affiliate and partner routes
  registerAffiliateRoutes(app);

  // AI tools routes
  registerAiToolsRoutes(app);

  // Email marketing routes
  registerEmailMarketingRoutes(app);

  // Content organization routes
  registerContentOrganizationRoutes(app);

  // Translation routes
  registerTranslationRoutes(app);

  // User management routes
  registerUserRoutes(app);

  // Page layout and sitemap routes
  registerPageLayoutRoutes(app);

  // AI writers and homepage promotions routes
  registerWriterPromotionRoutes(app);

  // RSS feed management routes
  registerRssFeedRoutes(app);
}

// Export individual registrars for selective usage
export {
  registerContentRoutes,
  registerPublicApiRoutes,
  registerAdminApiRoutes,
  registerAiApiRoutes,
  registerLocalizationApiRoutes,
  registerAutomationApiRoutes,
  registerCmsApiRoutes,
};
