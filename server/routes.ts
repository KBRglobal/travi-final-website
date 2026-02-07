import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "node:http";

import { storage } from "./storage";
import multer from "multer";
// Object Storage is now handled through the unified storage adapter
import type OpenAI from "openai";
import { authenticator } from "otplib";

// Configure TOTP with time window tolerance for clock drift (1 step = 30 seconds before/after)
authenticator.options = { window: 1 };
import { Resend } from "resend";
import {
  type UserRole,
  type HomepageSection,
  type ContentBlock,
  type InsertContent,
} from "@shared/schema";
import { setupAuth, getSession } from "./replitAuth";

import passport from "passport";
import {
  requireAuth,
  requirePermission,
  csrfProtection,
  secureErrorHandler,
  securityHeaders,
  ipBlockMiddleware,
  approvedBotMiddleware,
  logAuditEvent as logSecurityEvent,
} from "./security";
import { bootstrapFoundationDomains, bootstrapFoundationErrorHandler } from "./foundation";
import {} from "./cms-translations";
import * as fs from "node:fs";
import * as path from "node:path";
// Image generation functions from modular AI system
import { type GeneratedImage, type ImageGenerationOptions } from "./ai";
// AI client providers (single source of truth)
import { type AIProvider, type ProviderStatus, type FailureReason } from "./ai/providers";
// AI generators (stub modules - originals replaced by Octypo pipeline)
// Security validators (single source of truth for sanitization)
import { sanitizeHtml as sanitizeHtmlContent } from "./security/validators";

// Rate limiter for auth endpoints (magic-link, TOTP) - excludes login which has its own limiter
// Security audit logger for critical auth events (failed logins, password changes, role changes)
// PII masking is enabled by default - does NOT affect request flow
import { log } from "./lib/logger";
// Performance monitoring (N+1 detection, latency tracking)
// Admin security hardening: Emergency kill switch, IP allowlist, mandatory 2FA
import {} from "./security/admin-hardening";
// Strict password policy enforcement for admin users
// Note: Uses dual lockout (per-IP + per-username) instead of legacy single-username lockout
import {} from "./security/password-policy";
// Pre-auth token for MFA flow (session created only after TOTP verification)
import {} from "./security/pre-auth-token";
// File upload hardening with magic bytes validation
// IDOR protection middleware for ownership and permission checks
import {} from "./middleware/idor-protection";
import { type TranslateJobData, type AiGenerateJobData } from "./job-queue";

import {} from "./enterprise-security";
import { registerEnterpriseRoutes } from "./enterprise-routes";
import { registerSiteConfigRoutes } from "./site-config-routes";
import { registerFeatureRoutes } from "./feature-routes";
import { registerImageRoutes } from "./routes/image-routes";
import { registerLogRoutes } from "./routes/log-routes";
import { registerMiscRoutes } from "./routes/misc-routes";
import { registerSEORoutes } from "./routes/seo-routes";
import { registerSEOEngineRoutes } from "./seo-engine/routes";
// [REMOVED] automation-routes deleted in Phase 4.1 cleanup
// [REMOVED] content-intelligence-routes deleted in Phase 4.1 cleanup
// [REMOVED] destination-intelligence deleted in Phase 4.1 cleanup
import { registerAdminIntelligenceRoutes, registerAdminIngestionRoutes } from "./admin";
// [REMOVED] auto-pilot-routes deleted in Phase 4.1 cleanup
import { registerGrowthRoutes } from "./routes/admin/growth-routes";
import { registerObservabilityRoutes } from "./routes/admin/observability-routes";
import adminJobsRoutes from "./routes/admin/jobs-routes";
import { registerAdminJobsRoutes } from "./routes/admin-jobs-routes";

import { alertRoutes, startAlertEngine, isAlertingEnabled } from "./alerts";

import { coverageRoutes } from "./intelligence/coverage";
import { autonomyPolicyRoutes, initAutonomyPolicy } from "./autonomy/policy";
import { controlPlaneRoutes, initControlPlane } from "./autonomy/control-plane";
import { initEnforcement } from "./autonomy/enforcement";
import mediaLibraryRoutes from "./routes/admin/media-library-routes";
import octypoRoutes from "./routes/admin/octypo-routes";
import gatekeeperRoutes from "./routes/admin/gatekeeper-routes";
import gatekeeperDashboardRoutes from "./routes/admin/gatekeeper-dashboard-routes";
import octypoSettingsRoutes from "./routes/admin/octypo-settings-routes";
import pilotLocalizationRoutes from "./octypo/pilot/routes";
import { vamsRoutes } from "./vams";
import { mediaIntelligenceRoutes } from "./media-intelligence";
import { growthOSRoutes } from "./growth-os";
import localizedAssetsRoutes from "./routes/localized-assets-routes";

// [REMOVED] enhancement-routes deleted in Phase 4.1 cleanup
import { registerCustomerJourneyRoutes } from "./customer-journey-routes";
import { registerDocUploadRoutes } from "./doc-upload-routes";
import { registerSearchRoutes } from "./search/routes";
import translateRouter from "./routes/translate";
// Chat System (AI Orchestrator-based contextual chat)
import chatRouter from "./routes/chat";
// Domain-based route organization
import { registerAllRoutes } from "./routes/index.js";
// AEO (Answer Engine Optimization) routes
import { aeoRoutes, aeoTrackingMiddleware } from "./aeo";
// Localization Engine (Translation Queue + AEO)
import localizationRoutes from "./localization/routes";
// Localization Governance (Multi-locale content management)
import {
  localizationGovernanceRoutes,
  isLocalizationGovernanceEnabled,
} from "./localization-governance";
// Simulation Mode removed during cleanup
// Content Scheduling (Calendar + Auto-publish)
import { registerSchedulingRoutes } from "./scheduling";

// Publishing Control & Safety
// Entity Merge & Canonicalization
import { registerEntityMergeRoutes } from "./entity-merge";
import { registerPublishingRoutes, registerChecklistRoutes } from "./publishing";
// Content Ownership & Responsibility (Feature 1)
import { registerContentOwnershipRoutes } from "./content-ownership";
// Editorial SLA & Staleness Enforcement (Feature 2)
import { registerEditorialSlaRoutes } from "./editorial-sla";
// Canonical & Duplicate Content Manager (Feature 3)
import { registerCanonicalManagerRoutes as registerCanonicalRoutes } from "./canonical-manager";
// [REMOVED] AI Output Audit Trail deleted in Phase 4.1 cleanup
// Content Experiments / A-B Testing (Feature 5)
import { registerContentExperimentsRoutes } from "./content-experiments";
// Entity Quality Scoring (Feature 6)
import { registerEntityQualityRoutes } from "./entity-quality";
// Broken Promise Detector (Feature 7)
import { registerBrokenPromiseRoutes } from "./broken-promise-detector";
// Knowledge Decay Detection (Feature 8)
import { registerKnowledgeDecayRoutes } from "./knowledge-decay";
// Internal Competition Detector (Feature 9)
import { registerInternalCompetitionRoutes } from "./internal-competition";
// Content Lifecycle Timeline (Feature 10)
import { registerLifecycleRoutes } from "./content-lifecycle";
// Production Change Management System (PCMS)
import { registerChangeManagementRoutes } from "./change-management";
// Search Admin Debug Mode
import { registerSearchDebugRoutes } from "./search/search-debug-routes";
import { registerPageBuilderRoutes } from "./page-builder-routes";
import { registerSocialRoutes } from "./social-routes";
import { registerReferralRoutes } from "./routes/referral-routes";
import { registerQaRoutes } from "./routes/qa-routes";
import { registerPublicSearchRoutes } from "./routes/public-search";
import { registerHotelsRoutes } from "./routes/hotels-routes";
import { registerAttractionsRoutes } from "./routes/attractions-routes";
import { registerAdminTiqetsRoutes } from "./routes/admin/tiqets-routes";
import { registerAdminContentQualityRoutes } from "./routes/admin/content-quality-routes";
import { registerAdminHomepageRoutes } from "./routes/admin/homepage-routes";
import { registerTopicBankRoutes } from "./routes/topic-bank-routes";
import { registerIntelligenceRoutes } from "./routes/intelligence-routes";
import { registerAnalyticsRoutes } from "./routes/analytics-routes";
import { registerLiveChatRoutes } from "./routes/live-chat-routes";
import { registerSettingsRoutes } from "./routes/settings-routes";
import { registerAbTestingRoutes } from "./routes/ab-testing-routes";
import { registerRealEstatePagesRoutes } from "./routes/real-estate-pages-routes";
import { registerSurveyRoutes } from "./routes/survey-routes";
import { registerGdprRoutes } from "./routes/gdpr-routes";
import { registerWeeklyDigestRoutes } from "./routes/weekly-digest-routes";
import { registerWebhookWorkflowRoutes } from "./routes/webhook-workflow-routes";
import { registerAffiliateRoutes } from "./routes/affiliate-routes";
import { registerAiToolsRoutes } from "./routes/ai-tools-routes";
import { registerMagicRoutes } from "./routes/magic-routes";
// Ops features (Feature-flagged, default OFF)
import { incidentsRoutes } from "./incidents";
import { auditV2Routes } from "./audit-v2";
import { entityQualityRoutes } from "./entity-quality";
import { exportsRoutes } from "./exports";
import { goLiveRoutes } from "./go-live";
// Platform systems (Feature-flagged, default OFF)
import { platformReadinessRoutes } from "./platform-readiness";
import { platformGovernorRoutes } from "./platform-governor";
// Production Cutover & Continuous Readiness (Feature-flagged, default OFF)
import { cutoverRoutes } from "./production-cutover";
import { readinessRoutes } from "./continuous-readiness";
import { blastRadiusRoutes } from "./blast-radius";
import { forensicsRoutes } from "./go-live-forensics";
import { executiveReportRoutes } from "./executive/go-live-report";
// Platform Command & Accountability Layer (Feature-flagged, default OFF)
import { pcalRoutes } from "./pcal";
import { registerGovernanceRoutes } from "./governance";
import swaggerRouter from "./openapi/swagger-ui";
import { getStorageManager } from "./services/storage-adapter";
import { type ArticleResponse } from "./content-writer-guidelines";

// ============================================================================
// MODULARIZED HELPERS (from routes/helpers/)
// ============================================================================
import { type AuthRequest, type PermissionKey, type ConvertedImage } from "./routes/helpers";

// [REMOVED] rss-processing deleted in Phase 4.1 cleanup
// autoProcessRssFeeds is no longer needed - Gatekeeper pipeline handles RSS

const upload = multer({ storage: multer.memoryStorage() });

// Object storage is now handled through the unified StorageManager
// See: ./services/storage-adapter.ts

// AI client functions imported from ./ai/providers (single source of truth)

// Get appropriate model based on provider and task type
function getModelForProvider(provider: string, task: "chat" | "image" = "chat"): string {
  if (task === "image") {
    if (provider === "openai") return "dall-e-3";
    return "dall-e-3"; // OpenRouter can proxy to DALL-E
  }

  switch (provider) {
    case "openai":
      return process.env.OPENAI_MODEL || "gpt-4o-mini";
    case "gemini":
      return "gemini-1.5-flash";
    case "openrouter":
      return "google/gemini-flash-1.5"; // Free on OpenRouter
    default:
      return "gpt-4o-mini";
  }
}

// sanitizeHtmlContent imported from ./security/validators (uses DOMPurify)

// Persist DALL-E image to storage (DALL-E URLs expire in ~1 hour)
async function persistImageToStorage(imageUrl: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storagePath = `public/generated/${filename}`;
    const storageManager = getStorageManager();
    const result = await storageManager.upload(storagePath, buffer);

    return result.url;
  } catch (error) {
    return null;
  }
}

// Email client helper
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use(
    "/uploads",
    (await import("./middleware/cache-headers")).uploadsCacheHeaders,
    (await import("express")).default.static(uploadsDir)
  );

  // Phase 1 Foundation: Register domain routes (feature flagged, default OFF)
  bootstrapFoundationDomains(app);

  // AI Metrics routes (PHASE 5 + 7)
  const aiMetricsRouter = (await import("./routes/ai-metrics")).default;
  app.use("/api/ai/metrics", aiMetricsRouter);
  app.use("/api/system", aiMetricsRouter);

  // External Data routes (Update 9987 - POIs, Holidays, Destinations)
  const externalDataRouter = (await import("./routes/external-data-routes")).default;
  app.use("/api/external", externalDataRouter);

  // Destination-aware POI and Holiday routes
  const destinationPoisRouter = (await import("./routes/destination-pois-routes")).default;
  app.use("/api/destinations", destinationPoisRouter);

  // AI Quality routes (Update 9987)
  const aiQualityRouter = (await import("./routes/ai-quality-routes")).default;
  app.use("/api/ai-quality", aiQualityRouter);

  // Guides routes (Wikivoyage integration)
  const guidesRouter = (await import("./routes/guides-routes")).default;
  app.use(guidesRouter);

  // Destination content routes (guide sections, holidays, essentials)
  const destinationContentRouter = (await import("./routes/destination-content-routes")).default;
  app.use(destinationContentRouter);

  // ============================================================================
  // SESSION MIDDLEWARE (BEFORE AUTH ROUTES)
  // Session must be initialized before auth routes that use req.session
  // ============================================================================
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize/deserialize for passport (required for session support)
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // ============================================================================
  // DOMAIN-BASED ROUTE ORGANIZATION
  // Register all domain-specific route modules (auth, content, analytics, newsletter)
  // ============================================================================
  await registerAllRoutes(app);

  // ============================================================================
  // ADMIN LOGS API - System logging for debugging
  // ============================================================================

  type LogLevel = "error" | "warning" | "info" | "debug";
  type LogCategory =
    | "system"
    | "ai"
    | "images"
    | "storage"
    | "rss"
    | "content"
    | "auth"
    | "api"
    | "seo"
    | "publishing";

  interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    category: LogCategory;
    message: string;
    details?: Record<string, unknown>;
  }

  // Import console logger for real-time log streaming
  const { consoleLogger } = await import("./console-logger");

  // Helper function for structured logging (backwards compatibility)
  function addSystemLog(
    level: LogLevel,
    category: LogCategory,
    message: string,
    _details?: Record<string, unknown>
  ) {
    const normalizedLevel = level === "warning" ? "warn" : level;
    consoleLogger.addManualLog(normalizedLevel as any, category, message);
  }

  // Expose for use in other parts of the app
  (global as any).addSystemLog = addSystemLog;

  // Admin logs routes moved to routes/admin-logs-routes.ts
  // Object storage routes moved to routes/object-storage-routes.ts

  // FIRST: Mark approved bots (AI crawlers, search engines, social media) early
  // This allows them to bypass rate limiting, IP blocking, and threat detection
  app.use(approvedBotMiddleware);

  // Security headers for all responses (CSP, X-Frame-Options, etc.)
  app.use(securityHeaders);

  // IP blocking for suspicious activity (approved bots bypass this)
  app.use("/api", ipBlockMiddleware);

  // Setup auth routes: standalone (username/password) is PRIMARY,
  // Replit OIDC is fallback only when REPL_ID env var exists
  await setupAuth(app);

  // Global CSRF protection for admin write endpoints (AFTER setupAuth)
  app.use("/api", csrfProtection);

  // DEV ONLY: Global auto-authentication middleware for all admin APIs
  // This makes ALL /api requests behave as if logged in as admin
  // SECURITY: This is ONLY enabled in development AND with DEV_AUTO_AUTH=true
  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTO_AUTH === "true") {
    let cachedAdminUser: Awaited<ReturnType<typeof storage.getUsers>>[number] | null = null;

    app.use("/api", async (req: Request, res: Response, next: NextFunction) => {
      // Skip if already authenticated
      if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
      }

      // Skip public endpoints and auth routes
      // Note: req.path excludes the mount prefix when middleware is mounted at "/api"
      const publicPaths = ["/public/", "/auth/", "/dev/", "/health"];
      const authRoutes = ["/login", "/logout", "/callback"];
      if (publicPaths.some(p => req.path.startsWith(p)) || authRoutes.includes(req.path)) {
        return next();
      }

      try {
        // Get cached admin user or fetch it
        if (!cachedAdminUser) {
          const allUsers = await storage.getUsers();
          cachedAdminUser = allUsers.find(u => u.role === "admin") || allUsers[0];
        }

        if (cachedAdminUser) {
          // Mock authentication for this request
          (req as any).user = { claims: { sub: cachedAdminUser.id }, id: cachedAdminUser.id };
          (req as any).dbUser = cachedAdminUser;
          (req as any).userRole = cachedAdminUser.role;
          (req as any).isAuthenticated = () => true;
          if (req.session) {
            (req.session as any).totpVerified = true;
          }
        }
      } catch (e) {
        // Ignore errors, proceed without auth
      }

      next();
    });
  }

  // Background scheduler for auto-publishing scheduled content
  // Runs every minute to check for content that should be published
  const runScheduledPublishing = async () => {
    try {
      const contentToPublish = await storage.getScheduledContentToPublish();
      for (const content of contentToPublish) {
        // Create version history before auto-publishing
        const latestVersion = await storage.getLatestVersionNumber(content.id);
        await storage.createContentVersion({
          contentId: content.id,
          versionNumber: latestVersion + 1,
          title: content.title,
          slug: content.slug,
          metaTitle: content.metaTitle,
          metaDescription: content.metaDescription,
          primaryKeyword: content.primaryKeyword,
          heroImage: content.heroImage,
          heroImageAlt: content.heroImageAlt,
          blocks: content.blocks || [],
          changedBy: "system-scheduler",
          changeNote: "Auto-published by scheduler",
        });

        await storage.publishScheduledContent(content.id);

        // Create audit log for auto-publish
        await storage.createAuditLog({
          userId: null,
          userName: "System Scheduler",
          userRole: "system",
          actionType: "publish",
          entityType: "content",
          entityId: content.id,
          description: `Auto-published scheduled content: ${content.title}`,
          beforeState: { status: content.status, scheduledAt: content.scheduledAt },
          afterState: { status: "published", publishedAt: new Date() },
          ipAddress: "system",
          userAgent: "scheduled-publishing-job",
        });
      }
      if (contentToPublish.length > 0) {
      }
    } catch (error) {
      /* ignored */
    }
  };

  // DISABLED: Scheduled publishing automation disabled for UI-only mode
  // To re-enable: runScheduledPublishing(); setInterval(runScheduledPublishing, 60 * 1000);

  // Admin audit logs routes moved to routes/admin-audit-routes.ts

  // ============================================================================
  // ENTERPRISE ROUTES (Teams, Workflows, Notifications, etc.)
  // ============================================================================
  registerEnterpriseRoutes(app);
  registerSiteConfigRoutes(app);

  // Feature Routes (all feature-flagged)
  registerFeatureRoutes(app);

  // ============================================================================
  // ENTERPRISE GOVERNANCE (RBAC, Approvals, Audit, Policies)
  // ============================================================================
  registerGovernanceRoutes(app);

  // ============================================================================
  // IMAGE ROUTES (Smart image selection + SEO + processing)
  // ============================================================================
  registerImageRoutes(app);

  // ============================================================================
  // LOG ROUTES (Admin Panel log viewer)
  // ============================================================================
  registerLogRoutes(app);

  // ============================================================================
  // MISC ROUTES (AI images, internal links, scheduled content, leads, audit logs, content rules, backups)
  // ============================================================================
  registerMiscRoutes(app);

  // ============================================================================
  // SEO ROUTES (Validation, Auto-fix, Publishing gates)
  // ============================================================================
  registerSEORoutes(app);

  // ============================================================================
  // SEO ENGINE (Unified SEO/AEO system, Schema.org, Canonical, Index Health)
  // ============================================================================
  registerSEOEngineRoutes(app);

  // [REMOVED] Automation routes deleted in Phase 4.1 cleanup

  // [REMOVED] Content intelligence routes deleted in Phase 4.1 cleanup

  // [REMOVED] Destination intelligence routes deleted in Phase 4.1 cleanup

  // ============================================================================
  // ADMIN INTELLIGENCE (System health, coverage metrics, blocking issues)
  // ============================================================================
  registerAdminIntelligenceRoutes(app);
  registerAdminIngestionRoutes(app);

  // [REMOVED] Auto-pilot routes deleted in Phase 4.1 cleanup

  // ============================================================================
  // GROWTH DASHBOARD (Unified view of auto-pilot activities and metrics)
  // ============================================================================
  registerGrowthRoutes(app);

  // ============================================================================

  // OBSERVABILITY (Content intelligence, jobs, RSS status, search coverage)
  // ============================================================================
  registerObservabilityRoutes(app);

  // ============================================================================
  // ADMIN JOB MANAGEMENT (Job queue, blocked IPs, performance, migration)
  // ============================================================================
  registerAdminJobsRoutes(app);

  // ============================================================================
  // ALERTING SYSTEM (Operational alerting & failure escalation)
  // Routes always mounted for visibility; engine only starts when enabled
  // ============================================================================
  app.use("/api/admin/alerts", requireAuth, requirePermission("canViewAnalytics"), alertRoutes);
  if (isAlertingEnabled()) {
    startAlertEngine();
  } else {
  }

  // ============================================================================

  // CONTENT SCHEDULING (Calendar UI only - auto-publish disabled)
  // ============================================================================
  registerSchedulingRoutes(app);
  // DISABLED: startScheduler(); - Backend automation disabled for UI-only mode

  // ============================================================================
  // PUBLISHING CONTROL & SAFETY (Eligibility guards)
  // ============================================================================
  registerPublishingRoutes(app);

  // ============================================================================

  // ENTITY MERGE & CANONICALIZATION (Duplicate detection, admin merges)
  // ============================================================================
  registerEntityMergeRoutes(app);
  // PRE-PUBLISH CHECKLIST (Detailed publish readiness checks)
  // ============================================================================
  registerChecklistRoutes(app);

  // ============================================================================
  // CONTENT OWNERSHIP & RESPONSIBILITY (Feature 1)
  // ============================================================================
  registerContentOwnershipRoutes(app);

  // ============================================================================
  // EDITORIAL SLA & STALENESS ENFORCEMENT (Feature 2)
  // ============================================================================
  registerEditorialSlaRoutes(app);

  // ============================================================================
  // CANONICAL & DUPLICATE CONTENT MANAGER (Feature 3)
  // ============================================================================
  registerCanonicalRoutes(app);

  // [REMOVED] AI Output Audit Trail deleted in Phase 4.1 cleanup

  // ============================================================================
  // CONTENT EXPERIMENTS / A-B TESTING (Feature 5)
  // ============================================================================
  registerContentExperimentsRoutes(app);

  // ============================================================================
  // ENTITY QUALITY SCORING (Feature 6)
  // ============================================================================
  registerEntityQualityRoutes(app);

  // ============================================================================
  // BROKEN PROMISE DETECTOR (Feature 7)
  // ============================================================================
  registerBrokenPromiseRoutes(app);

  // ============================================================================
  // KNOWLEDGE DECAY DETECTION (Feature 8)
  // ============================================================================
  registerKnowledgeDecayRoutes(app);

  // ============================================================================
  // INTERNAL COMPETITION DETECTOR (Feature 9)
  // ============================================================================
  registerInternalCompetitionRoutes(app);

  // ============================================================================
  // CONTENT LIFECYCLE TIMELINE (Feature 10)
  // ============================================================================
  registerLifecycleRoutes(app);

  // ============================================================================
  // PRODUCTION CHANGE MANAGEMENT SYSTEM (PCMS)
  // Terraform-like plan/apply/rollback for content changes
  // ============================================================================
  registerChangeManagementRoutes(app);
  // ============================================================================
  // SEARCH ADMIN DEBUG MODE (Query pipeline analysis)
  // ============================================================================
  registerSearchDebugRoutes(app);

  // ============================================================================

  // ADMIN JOBS (Job queue metrics for operations dashboard)
  // ============================================================================
  app.use("/api/admin/jobs", requireAuth, requirePermission("canEdit"), adminJobsRoutes);

  // ============================================================================

  // INTELLIGENCE COVERAGE ENGINE (Content intelligence metrics)
  // ============================================================================
  app.use("/api/admin/intelligence/coverage", requireAuth, coverageRoutes);

  // ============================================================================
  // AUTONOMY POLICY ENGINE (Risk Budgets & Policy Governance)
  // Enable with: ENABLE_AUTONOMY_POLICY=true
  // ============================================================================
  app.use("/api/admin/autonomy", requireAuth, autonomyPolicyRoutes);
  app.use("/api/admin/autonomy/control-plane", requireAuth, controlPlaneRoutes);

  // OPS FEATURES (Feature-flagged, default OFF)
  // ============================================================================
  app.use("/api/admin/incidents", requireAuth, requirePermission("canEdit"), incidentsRoutes);
  app.use("/api/admin/audit", requireAuth, requirePermission("canViewAuditLogs"), auditV2Routes);
  app.use(
    "/api/admin/entity-quality",
    requireAuth,
    requirePermission("canEdit"),
    entityQualityRoutes
  );
  app.use("/api/admin/exports", requireAuth, requirePermission("canEdit"), exportsRoutes);
  app.use("/api/admin/go-live", requireAuth, requirePermission("canEdit"), goLiveRoutes);

  // ============================================================================
  // PLATFORM SYSTEMS (Feature-flagged, default OFF)
  // ============================================================================
  app.use(
    "/api/admin/readiness",
    requireAuth,
    requirePermission("canEdit"),
    platformReadinessRoutes
  );
  app.use("/api/admin/governor", requireAuth, requirePermission("canEdit"), platformGovernorRoutes);

  // ============================================================================
  // PRODUCTION CUTOVER & CONTINUOUS READINESS (Feature-flagged, default OFF)
  // ============================================================================
  app.use("/api/ops/cutover", requireAuth, requirePermission("canEdit"), cutoverRoutes);
  app.use("/api/ops/readiness", requireAuth, requirePermission("canEdit"), readinessRoutes);
  app.use("/api/ops/blast-radius", requireAuth, requirePermission("canEdit"), blastRadiusRoutes);
  app.use("/api/ops/forensics", requireAuth, requirePermission("canEdit"), forensicsRoutes);
  app.use(
    "/api/ops/executive/report",
    requireAuth,
    requirePermission("canEdit"),
    executiveReportRoutes
  );

  // ============================================================================
  // PLATFORM COMMAND & ACCOUNTABILITY LAYER (Feature-flagged, default OFF)
  // ============================================================================
  app.use("/api/ops/pcal", requireAuth, requirePermission("canEdit"), pcalRoutes);
  // MEDIA LIBRARY (Asset indexing, orphan detection, cleanup)
  // Feature flag: ENABLE_MEDIA_LIBRARY=true
  // ============================================================================
  app.use("/api/admin/media", requireAuth, mediaLibraryRoutes);

  // ============================================================================
  // MEDIA INTELLIGENCE (Performance analysis, recommendations, alt text quality)
  // Feature flag: ENABLE_MEDIA_INTELLIGENCE=true
  // ============================================================================
  app.use("/api/admin/media-intelligence", requireAuth, mediaIntelligenceRoutes);

  // ============================================================================
  // LOCALIZED ASSETS (Per-locale media management)
  // ============================================================================
  app.use(localizedAssetsRoutes);

  // ============================================================================
  // GROWTH OS (Autonomous Growth Operating System)
  // Feature flags: ENABLE_GROWTH_OS=true, ENABLE_GROWTH_OS_*=true
  // ============================================================================
  app.use("/api/growth-os", requireAuth, growthOSRoutes);

  // ============================================================================
  // OCTYPO ENGINE (AI Content Generation System - Writers, Validators, Orchestrator)
  // ============================================================================
  app.use("/api/octypo", requireAuth, requirePermission("canEdit"), octypoRoutes);

  // ============================================================================
  // MAGIC ENGINE (AI-powered field generation for CMS content)
  // ============================================================================
  registerMagicRoutes(app);

  // ============================================================================
  // GATEKEEPER (Autonomous Content Selection & Approval System)
  // Two gates: 1) RSS Selection 2) Article Approval → 30 languages
  // ============================================================================
  app.use("/api/admin/gatekeeper", requireAuth, requirePermission("canEdit"), gatekeeperRoutes);
  app.use(
    "/api/admin/gatekeeper",
    requireAuth,
    requirePermission("canEdit"),
    gatekeeperDashboardRoutes
  );
  app.use("/api/admin/octypo", requireAuth, requirePermission("canEdit"), octypoSettingsRoutes);

  // ============================================================================
  // PILOT: Octypo × Localization Integration (Isolated for pilot testing)
  // ============================================================================
  app.use("/api/octypo/pilot", requireAuth, requirePermission("canEdit"), pilotLocalizationRoutes);

  // ============================================================================
  // VAMS (Visual Asset Management System - Stock Images + AI Generation)
  // ============================================================================
  app.use("/api/vams", requireAuth, requirePermission("canEdit"), vamsRoutes);

  // [REMOVED] Enhancement routes deleted in Phase 4.1 cleanup

  // ============================================================================
  // SEMANTIC SEARCH ENGINE (Full-text + Vector + Intent + Hybrid Ranking)
  // ============================================================================
  registerSearchRoutes(app);

  // ============================================================================
  // PUBLIC SEARCH (Never-empty search with fallbacks)
  // ============================================================================
  registerPublicSearchRoutes(app);

  // ============================================================================
  // CUSTOMER JOURNEY ANALYTICS (Page views, clicks, scroll, conversions, heatmaps)
  // ============================================================================
  registerCustomerJourneyRoutes(app);

  // ============================================================================
  // SOCIAL MEDIA MARKETING (LinkedIn scheduling, campaigns, analytics)
  // ============================================================================
  registerSocialRoutes(app);

  // ============================================================================
  // REFERRAL/AFFILIATE PROGRAM (Partner registration, tracking, admin)
  // ============================================================================
  registerReferralRoutes(app);

  // ============================================================================
  // QA CHECKLIST SYSTEM (Quality Assurance Testing)
  // ============================================================================
  registerQaRoutes(app);

  // ============================================================================
  // HOTELS API (Search, Details, Popular)
  // ============================================================================
  registerHotelsRoutes(app);

  // ============================================================================
  // ATTRACTIONS API (Tiqets Integration)
  // ============================================================================
  registerAttractionsRoutes(app);

  // ============================================================================
  // ADMIN TIQETS ROUTES (Cities, Attractions, Content Generation)
  // ============================================================================
  registerAdminTiqetsRoutes(app);

  // ============================================================================
  // ADMIN CONTENT QUALITY ROUTES (Regeneration, Validation, Publishing)
  // ============================================================================
  registerAdminContentQualityRoutes(app);

  // ============================================================================
  // ADMIN HOMEPAGE CMS ROUTES (Sections, Hero, Cards, Destinations, CTA, SEO)
  // ============================================================================
  registerAdminHomepageRoutes(app);

  // ============================================================================
  // TOPIC BANK ROUTES (CRUD, Generation, Auto-generate)
  // ============================================================================
  registerTopicBankRoutes(app);

  // ============================================================================
  // CONTENT INTELLIGENCE ROUTES (Gaps, Watchlist, Events, Clusters, Links)
  // ============================================================================
  registerIntelligenceRoutes(app);

  // ============================================================================
  // ANALYTICS ROUTES (Overview, Views, Top Content)
  // ============================================================================
  registerAnalyticsRoutes(app);

  // ============================================================================
  // LIVE CHAT SUPPORT ROUTES
  // ============================================================================
  registerLiveChatRoutes(app);

  // ============================================================================
  // SITE SETTINGS AND CONTENT SAFETY ROUTES
  // ============================================================================
  registerSettingsRoutes(app);

  // ============================================================================
  // A/B TESTING ROUTES
  // ============================================================================
  registerAbTestingRoutes(app);

  // ============================================================================
  // REAL ESTATE PAGES ROUTES
  // ============================================================================
  registerRealEstatePagesRoutes(app);

  // ============================================================================
  // WEBHOOKS & WORKFLOWS ROUTES
  // ============================================================================
  registerWebhookWorkflowRoutes(app);

  // ============================================================================
  // SURVEY BUILDER ROUTES
  // ============================================================================
  registerSurveyRoutes(app);

  // ============================================================================
  // GDPR COMPLIANCE ROUTES
  // ============================================================================
  registerGdprRoutes(app);

  // ============================================================================
  // WEEKLY DIGEST ROUTES
  // ============================================================================
  registerWeeklyDigestRoutes(app);

  // ============================================================================
  // AFFILIATE & PARTNER ROUTES
  // ============================================================================
  registerAffiliateRoutes(app);

  // ============================================================================
  // AI TOOLS ROUTES (Scoring, Plagiarism, Visual Search)
  // ============================================================================
  registerAiToolsRoutes(app);

  // ============================================================================
  // PAGE BUILDER ROUTES (Universal section editor with version history)
  // ============================================================================
  registerPageBuilderRoutes(app);

  // ============================================================================
  // TRANSLATION ROUTES (Multi-provider translation: Claude, GPT, DeepL)
  // ============================================================================
  app.use("/api/translate", requireAuth, translateRouter);

  // ============================================================================
  // CHAT ROUTES (AI Orchestrator-based contextual chat)
  // ============================================================================
  app.use("/api/chat", requireAuth, chatRouter);

  // ============================================================================
  // DOC/DOCX UPLOAD (Import content directly from Word documents)
  // ============================================================================
  registerDocUploadRoutes(app);

  // Magic link auth routes moved to routes/auth-routes.ts

  // ============================================================================
  // AEO (Answer Engine Optimization) ROUTES
  // Optimizes content for AI platforms like ChatGPT, Perplexity, Google AI
  // ============================================================================

  // Add AEO tracking middleware for AI crawler and referrer tracking
  app.use(aeoTrackingMiddleware());

  // Register AEO routes (includes robots.txt, llms.txt, and API endpoints)
  app.use(aeoRoutes);

  // ============================================================================
  // LOCALIZATION ENGINE ROUTES
  // Translation queue management, AEO generation, and publish hooks
  // ============================================================================
  app.use("/api/localization", localizationRoutes);

  // ============================================================================
  // LOCALIZATION GOVERNANCE
  // Multi-locale content management and translation status tracking
  // ============================================================================
  if (isLocalizationGovernanceEnabled()) {
    app.use("/api/localization/governance", localizationGovernanceRoutes);
    log.info("[Routes] Localization governance routes ENABLED");
  }

  // ============================================================================
  // SIMULATION MODE removed during cleanup

  // ============================================================================
  // OPENAPI/SWAGGER DOCUMENTATION
  // Interactive API documentation at /api/docs
  // In production, require auth to prevent exposing API surface to attackers
  // ============================================================================
  if (process.env.NODE_ENV === "production") {
    app.use("/api/docs", requireAuth, swaggerRouter);
  } else {
    app.use("/api/docs", swaggerRouter);
  }

  // ============================================================================
  // INITIALIZE AUTONOMY POLICY ENGINE
  // ============================================================================

  try {
    await initAutonomyPolicy();
    initEnforcement();
    initControlPlane();
  } catch (error) {
    /* ignored */
  }

  // ============================================================================
  // WEEKLY DIGEST SCHEDULER (DISABLED - UI-only mode)
  // ============================================================================

  // ============================================================================
  // SITEMAP (Using sitemap.ts)
  // ============================================================================

  // ============================================================================
  // TRAFFIC INTELLIGENCE (DISABLED - UI-only mode)
  // ============================================================================

  // ============================================================================
  // TRAFFIC OPTIMIZATION (DISABLED - UI-only mode)
  // ============================================================================

  // ============================================================================
  // USER INTENT & DECISION GRAPH (DISABLED - UI-only mode)
  // ============================================================================

  // ============================================================================
  // AUTONOMOUS FUNNEL DESIGNER (DISABLED - UI-only mode)
  // ============================================================================

  // ============================================================================
  // IMPACT FORECASTING ENGINE (DISABLED - UI-only mode)
  // ============================================================================

  // ============================================================================
  // AUTONOMOUS EXECUTION ORCHESTRATOR (DISABLED - UI-only mode)
  // ============================================================================

  // ============================================================================
  // GROWTH COMMAND CENTER (DISABLED - UI-only mode)
  // ============================================================================

  // ============================================================================
  // DEPLOYMENT SAFETY & MONITORING (Routes only - monitoring disabled)
  // Zero surprises. Everything controlled.
  // ============================================================================
  const { deploymentSafetyRoutes } = await import("./deployment-safety");
  app.use("/api/deploy-safety", requireAuth, deploymentSafetyRoutes);
  // DISABLED: initializeDeploymentSafety(); - Backend automation disabled

  // Google Drive sync routes moved to routes/google-drive-routes.ts

  // ============================================================================
  // SECURE ERROR HANDLER (no stack traces to client)
  // ============================================================================
  app.use(secureErrorHandler);

  // Phase 1 Foundation: Add foundation error handler (feature flagged, default OFF)
  // When enabled, this handler catches DomainErrors and provides structured responses
  bootstrapFoundationErrorHandler(app);

  return httpServer;
}
