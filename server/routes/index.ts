import type { Express } from "express";
import { registerContentRoutes } from "./content-routes";
import { registerPublicApiRoutes } from "./public-api";
import { registerAdminApiRoutes } from "./admin-api";
import { registerAiApiRoutes } from "./ai-api";
import { registerLocalizationApiRoutes } from "./localization-api";
import { registerAutomationApiRoutes } from "./automation-api";
import { registerCmsApiRoutes } from "./cms-api";
import { registerMetricsRoutes } from "./metrics-routes";
import { registerMediaIntelligenceRoutes } from "../media-intelligence";
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
import { registerSecurityRoutes } from "./security-routes";
import { registerContentMetricsRoutes } from "./content-metrics-routes";
import { registerTopicClustersRoutes } from "./topic-clusters-routes";
import { registerMediaRoutes } from "./media-routes";
import { registerKeywordsRoutes } from "./keywords-routes";
import { registerAiGenerationRoutes } from "./ai-generation-routes";
import { registerContentCrudRoutes } from "./content-crud-routes";
import { registerPublicContentRoutes } from "./public-content-routes";
import { registerAuthRoutes } from "./auth-routes";
import { registerHealthRoutes } from "./health-routes";
import { registerAdminLogsRoutes } from "./admin-logs-routes";
import { registerObjectStorageRoutes } from "./object-storage-routes";
import { registerAdminAuditRoutes } from "./admin-audit-routes";
import { registerGoogleDriveRoutes } from "./google-drive-routes";
// octypoRouter removed: /api/octypo is already mounted in routes.ts with proper auth guards
// import octypoRouter from "./admin/octypo-routes";

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

  // Enterprise security and TOTP 2FA routes
  registerSecurityRoutes(app);

  // Content metrics and performance routes
  await registerContentMetricsRoutes(app);

  // Topic clusters and RSS aggregation routes
  await registerTopicClustersRoutes(app);

  // Media files and affiliate links routes
  registerMediaRoutes(app);

  // Keywords repository routes
  registerKeywordsRoutes(app);

  // AI content generation routes
  registerAiGenerationRoutes(app);

  // Content CRUD routes
  registerContentCrudRoutes(app);

  // Public content API routes
  registerPublicContentRoutes(app);

  // Auth routes
  registerAuthRoutes(app);

  // Health check routes
  registerHealthRoutes(app);

  // Admin logs and console logger routes
  registerAdminLogsRoutes(app);

  // Object storage file serving routes
  registerObjectStorageRoutes(app);

  // Admin audit logs routes
  registerAdminAuditRoutes(app);

  // Google Drive asset sync routes
  registerGoogleDriveRoutes(app);

  // Octypo routes are mounted in routes.ts with requireAuth + requirePermission guards
}

// Export individual registrars for selective usage
export { registerContentRoutes } from "./content-routes";
export { registerPublicApiRoutes } from "./public-api";
export { registerAdminApiRoutes } from "./admin-api";
export { registerAiApiRoutes } from "./ai-api";
export { registerLocalizationApiRoutes } from "./localization-api";
export { registerAutomationApiRoutes } from "./automation-api";
export { registerCmsApiRoutes } from "./cms-api";
