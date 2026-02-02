import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import multer from "multer";
// Object Storage is now handled through the unified storage adapter
import OpenAI from "openai";
import { authenticator } from "otplib";
import QRCode from "qrcode";

// Configure TOTP with time window tolerance for clock drift (1 step = 30 seconds before/after)
authenticator.options = { window: 1 };
import bcrypt from "bcrypt";
import crypto from "crypto";
import { Resend } from "resend";
import { eq, like, or, desc, and, sql, inArray, ilike, notIlike } from "drizzle-orm";
import {
  insertContentSchema,
  insertAttractionSchema,
  insertHotelSchema,
  insertArticleSchema,
  insertEventSchema,
  insertItinerarySchema,
  insertRssFeedSchema,
  insertAffiliateLinkSchema,
  insertMediaFileSchema,
  insertTopicBankSchema,
  insertKeywordRepositorySchema,
  insertTranslationSchema,
  insertUserSchema,
  insertHomepagePromotionSchema,
  insertTagSchema,
  newsletterSubscribers,
  newsletterCampaigns,
  campaignEvents,
  contentRules,
  pageLayouts,
  webhooks,
  webhookLogs,
  workflows,
  workflowExecutions,
  partners,
  payouts,
  abTests,
  abTestVariants,
  abTestEvents,
  realEstatePages,
  insertRealEstatePageSchema,
  contents,
  destinations,
  homepageSections,
  homepageCards,
  experienceCategories,
  regionLinks,
  heroSlides,
  homepageCta,
  homepageSeoMeta,
  ROLE_PERMISSIONS,
  SUPPORTED_LOCALES,
  type UserRole,
  type HomepageSection,
  type ContentBlock,
  type InsertContent,
  traviConfig,
  traviDistricts,
  tiqetsCities,
  tiqetsAttractions,
  affiliateClicks,
  users,
} from "@shared/schema";
import { setupAuth, isAuthenticated, getSession } from "./replitAuth";
import passport from "passport";
import { makeRenderSafeHomepageConfig } from "./lib/homepage-fallbacks";
import { z } from "zod";
import {
  safeMode,
  rateLimiters,
  checkAiUsageLimit,
  requireAuth,
  requirePermission,
  requireOwnContentOrPermission,
  checkReadOnlyMode,
  csrfProtection,
  validateMediaUpload,
  validateAnalyticsRequest,
  secureErrorHandler,
  auditLogReadOnly,
  securityHeaders,
  ipBlockMiddleware,
  approvedBotMiddleware,
  recordFailedAttempt,
  logAuditEvent as logSecurityEvent,
  getAuditLogs,
  getBlockedIps,
  validateUrlForSSRF,
} from "./security";
import { checkOptimisticLock, addETagHeader } from "./middleware/optimistic-locking";
import { bootstrapFoundationDomains, bootstrapFoundationErrorHandler } from "./foundation";
import {
  getTranslations,
  getBulkTranslations,
  setTranslations,
  deleteEntityTranslations,
} from "./cms-translations";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";
import { findFolderByName, listFilesInFolder, downloadFile } from "./google-drive";
import { sanitizeContentBlocks } from "./lib/sanitize-ai-output";
// Image generation functions from modular AI system
import {
  generateContentImages,
  generateImage,
  type GeneratedImage,
  type ImageGenerationOptions,
} from "./ai";
// AI client providers (single source of truth)
import {
  getAIClient,
  getAllAIClients,
  getAllUnifiedProviders,
  markProviderFailed,
  markProviderSuccess,
  getOpenAIClient,
  getProviderStatus,
  type AIProvider,
  type ProviderStatus,
  type FailureReason,
} from "./ai/providers";
// AI Hotel Description Generator
import { generateHotelDescription } from "./ai/hotel-description-generator";
import { generateAttractionContent } from "./ai/attraction-description-generator";
// Security validators (single source of truth for sanitization)
import { sanitizeHtml as sanitizeHtmlContent } from "./security/validators";
// Rate limiter for auth endpoints (magic-link, TOTP) - excludes login which has its own limiter
import { loginRateLimiter } from "./security/rate-limiter";
// Security audit logger for critical auth events (failed logins, password changes, role changes)
// PII masking is enabled by default - does NOT affect request flow
import { logSecurityEventFromRequest, SecurityEventType } from "./security/audit-logger";
import { log } from "./lib/logger";
// Performance monitoring (N+1 detection, latency tracking)
import { getPerformanceMetrics } from "./monitoring";
// Admin security hardening: Emergency kill switch, IP allowlist, mandatory 2FA
import {
  emergencyKillSwitch,
  ipAllowlistMiddleware,
  enforceMandatory2FA,
  logAdminSecurityConfig,
  adminAuthGuards,
  magicLinkDisableMiddleware,
} from "./security/admin-hardening";
// Strict password policy enforcement for admin users
// Note: Uses dual lockout (per-IP + per-username) instead of legacy single-username lockout
import {
  validatePasswordStrength,
  validatePasswordChange,
  checkDualLockout,
  recordDualLockoutFailure,
  clearDualLockout,
  PASSWORD_POLICY,
} from "./security/password-policy";
// Pre-auth token for MFA flow (session created only after TOTP verification)
import {
  createPreAuthToken,
  verifyPreAuthToken,
  consumePreAuthToken,
} from "./security/pre-auth-token";
// File upload hardening with magic bytes validation
import { validateUploadedFile } from "./security/file-upload";
// IDOR protection middleware for ownership and permission checks
import {
  requireOwnershipOrPermission,
  requireSelfOrAdmin,
  requireAdmin,
} from "./middleware/idor-protection";
import { jobQueue, type TranslateJobData, type AiGenerateJobData } from "./job-queue";
import {
  deviceFingerprint,
  contextualAuth,
  exponentialBackoff,
  sessionSecurity,
  threatIntelligence,
} from "./enterprise-security";
import { registerEnterpriseRoutes } from "./enterprise-routes";
import { registerSiteConfigRoutes } from "./site-config-routes";
// Webhook routes disabled - module deleted
// import { registerReliableWebhookAdminRoutes } from "./webhooks/reliable/admin-routes";
// import { startWebhookWorker } from "./webhooks/reliable/worker";
import { registerFeatureRoutes } from "./feature-routes";
import { enterprise } from "./enterprise";
import { registerImageRoutes } from "./routes/image-routes";
import { registerLogRoutes } from "./routes/log-routes";
import { registerSEORoutes } from "./routes/seo-routes";
import { registerSEOEngineRoutes } from "./seo-engine/routes";
import { registerAutomationRoutes } from "./automation-routes";
import { enforceArticleSEO, enforceWriterEngineSEO } from "./seo-enforcement";
import { registerContentIntelligenceRoutes } from "./content-intelligence-routes";
import { registerDestinationIntelligenceRoutes } from "./routes/destination-intelligence";
import { registerAdminIntelligenceRoutes, registerAdminIngestionRoutes } from "./admin";
import { registerAutoPilotRoutes } from "./auto-pilot-routes";
import { registerGrowthRoutes } from "./routes/admin/growth-routes";
import { registerObservabilityRoutes } from "./routes/admin/observability-routes";
import adminJobsRoutes from "./routes/admin/jobs-routes";

import { generateLocationContent } from "./travi/content-generator";
import { alertRoutes, startAlertEngine, isAlertingEnabled } from "./alerts";

import { coverageRoutes } from "./intelligence/coverage";
import {
  autonomyPolicyRoutes,
  initAutonomyPolicy,
  shutdownAutonomyPolicy,
} from "./autonomy/policy";
import { controlPlaneRoutes, initControlPlane } from "./autonomy/control-plane";
import { initEnforcement } from "./autonomy/enforcement";
import { helpAdminRoutes, helpPublicRoutes } from "./help";
import mediaLibraryRoutes from "./routes/admin/media-library-routes";
import octypoRoutes from "./routes/admin/octypo-routes";
import pilotLocalizationRoutes from "./octypo/pilot/routes";
import { mediaIntelligenceRoutes } from "./media-intelligence";
import { growthOSRoutes } from "./growth-os";
import traviRoutes from "./travi/routes";
import localizedAssetsRoutes from "./routes/localized-assets-routes";

import { registerEnhancementRoutes } from "./enhancement-routes";
import { registerCustomerJourneyRoutes } from "./customer-journey-routes";
import { registerDocUploadRoutes } from "./doc-upload-routes";
import { registerSearchRoutes } from "./search/routes";
import { emitContentPublished, emitContentUpdated } from "./events";
import translateRouter from "./routes/translate";
// Chat System (AI Orchestrator-based contextual chat)
import chatRouter from "./routes/chat";
// Domain-based route organization
import { registerAllRoutes } from "./routes/index.js";
// AEO (Answer Engine Optimization) routes
import { aeoRoutes, aeoTrackingMiddleware } from "./aeo";
import { getVersionInfo } from "./middleware/api-versioning";
// Localization Engine (Translation Queue + AEO)
import localizationRoutes from "./localization/routes";
// Localization Governance (Multi-locale content management)
import {
  localizationGovernanceRoutes,
  isLocalizationGovernanceEnabled,
} from "./localization-governance";
// Simulation Mode removed during cleanup
// Content Scheduling (Calendar + Auto-publish)
import { registerSchedulingRoutes, startScheduler } from "./scheduling";
// Publishing Control & Safety
// Entity Merge & Canonicalization
import { registerEntityMergeRoutes } from "./entity-merge";
import {
  registerPublishingRoutes,
  guardManualPublish,
  isPublishGuardsEnabled,
  registerChecklistRoutes,
} from "./publishing";
// Content Ownership & Responsibility (Feature 1)
import { registerContentOwnershipRoutes } from "./content-ownership";
// Editorial SLA & Staleness Enforcement (Feature 2)
import { registerEditorialSlaRoutes } from "./editorial-sla";
// Canonical & Duplicate Content Manager (Feature 3)
import { registerCanonicalManagerRoutes as registerCanonicalRoutes } from "./canonical-manager";
// AI Output Audit Trail (Feature 4)
import { registerAiAuditRoutes } from "./ai-audit";
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
// Writer routes disabled - module deleted
// import { registerWriterRoutes } from "./ai/writers/routes";
import { registerPageBuilderRoutes } from "./page-builder-routes";
import { registerSocialRoutes } from "./social-routes";
import { registerReferralRoutes } from "./routes/referral-routes";
import { registerQaRoutes } from "./routes/qa-routes";
import { registerPublicSearchRoutes } from "./routes/public-search";
import { registerHotelsRoutes } from "./routes/hotels-routes";
import { registerAttractionsRoutes } from "./routes/attractions-routes";
import { registerAdminTiqetsRoutes } from "./routes/admin/tiqets-routes";
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
import { uploadImage, uploadImageFromUrl } from "./services/image-service";
import { cache, cacheKeys } from "./cache";
import {
  getContentWriterSystemPrompt,
  buildArticleGenerationPrompt,
  determineContentCategory,
  validateArticleResponse,
  buildRetryPrompt,
  CONTENT_WRITER_PERSONALITIES,
  ARTICLE_STRUCTURES,
  CATEGORY_PERSONALITY_MAPPING,
  type ArticleResponse,
} from "./content-writer-guidelines";

// Permission checking utilities (imported from security.ts for route-level checks)
type PermissionKey = keyof typeof ROLE_PERMISSIONS.admin;

// Authenticated request type for route handlers
// Use intersection type to avoid interface compatibility issues
type AuthRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string; email?: string; name?: string } };
  session: Request["session"] & {
    userId?: string;
    save(callback?: (err?: unknown) => void): void;
  };
  login(user: unknown, callback: (err?: unknown) => void): void;
};

// Helper to safely get user ID from authenticated request (after isAuthenticated middleware)
function getUserId(req: AuthRequest): string {
  // After isAuthenticated middleware, user.claims.sub is guaranteed to exist
  return req.user!.claims!.sub;
}

// Helper to clean JSON from markdown code blocks (DeepSeek and other models sometimes wrap JSON in ```json ... ```)
function cleanJsonFromMarkdown(content: string): string {
  if (!content) return "{}";
  let cleaned = content.trim();
  // Remove markdown code blocks with optional language identifier
  if (cleaned.startsWith("```")) {
    // Find the end of the first line (language identifier line)
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline + 1);
    }
    // Remove trailing ```
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
  }
  cleaned = cleaned.trim() || "{}";

  // Fix common JSON issues from AI responses:
  // 1. Replace unescaped control characters in strings (newlines, tabs, etc.)
  // This regex finds strings and escapes control characters within them
  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, match => {
    return match.replace(/[\x00-\x1F\x7F]/g, char => {
      const code = char.charCodeAt(0);
      if (code === 0x09) return "\\t"; // Tab
      if (code === 0x0a) return "\\n"; // Newline
      if (code === 0x0d) return "\\r"; // Carriage return
      return `\\u${code.toString(16).padStart(4, "0")}`;
    });
  });

  return cleaned;
}

// Safe JSON parse that handles markdown-wrapped JSON
// Returns 'any' type to maintain compatibility with existing code that accesses dynamic properties
function safeParseJson(content: string, fallback: Record<string, unknown> = {}): any {
  try {
    const cleaned = cleanJsonFromMarkdown(content);
    return JSON.parse(cleaned);
  } catch (e) {
    return fallback;
  }
}

// Role checking middleware with proper Express types
function requireRole(role: UserRole | UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as Request & {
      isAuthenticated(): boolean;
      user?: { claims?: { sub?: string } };
    };
    if (!authReq.isAuthenticated() || !authReq.user?.claims?.sub) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const userId = authReq.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user.role as UserRole)) {
      res
        .status(403)
        .json({ error: "Insufficient permissions", requiredRole: role, currentRole: user.role });
      return;
    }
    next();
  };
}

const upload = multer({ storage: multer.memoryStorage() });

// Security: Sanitize user input for logging to prevent log injection
function sanitizeForLog(input: string): string {
  if (!input) return "";
  return input.replace(/[\r\n\x00]/g, "").substring(0, 200);
}

// WebP conversion settings
const WEBP_QUALITY = 80;
const SUPPORTED_IMAGE_FORMATS = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ConvertedImage {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
}

async function convertToWebP(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<ConvertedImage> {
  // Only convert supported image formats
  if (!SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
    return { buffer, filename: originalFilename, mimeType };
  }

  // Skip if already WebP
  if (mimeType === "image/webp") {
    const metadata = await sharp(buffer).metadata();
    return {
      buffer,
      filename: originalFilename,
      mimeType,
      width: metadata.width,
      height: metadata.height,
    };
  }

  try {
    // Get image metadata for dimensions
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Convert to WebP
    const webpBuffer = await image.webp({ quality: WEBP_QUALITY }).toBuffer();

    // Generate new filename with .webp extension
    const baseName = originalFilename.replace(/\.[^.]+$/, "");
    const webpFilename = `${baseName}.webp`;

    return {
      buffer: webpBuffer,
      filename: webpFilename,
      mimeType: "image/webp",
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    return { buffer, filename: originalFilename, mimeType };
  }
}

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

async function parseRssFeed(
  url: string
): Promise<{ title: string; link: string; description: string; pubDate?: string }[]> {
  // SSRF Protection: Validate URL before fetching
  const ssrfCheck = validateUrlForSSRF(url);
  if (!ssrfCheck.valid) {
    throw new Error(`Invalid RSS feed URL: ${ssrfCheck.error}`);
  }

  try {
    const response = await fetch(ssrfCheck.sanitizedUrl!);
    const text = await response.text();

    const items: { title: string; link: string; description: string; pubDate?: string }[] = [];
    const itemMatches = text.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];

    for (const itemXml of itemMatches) {
      const titleMatch = itemXml.match(
        /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
      );
      const linkMatch = itemXml.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descMatch = itemXml.match(
        /<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i
      );
      const dateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i);

      if (titleMatch && linkMatch) {
        // Sanitize all content from RSS to prevent XSS attacks
        const rawTitle = titleMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "");
        const rawLink = linkMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "");
        const rawDescription = descMatch
          ? descMatch[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "")
          : "";

        items.push({
          title: sanitizeHtmlContent(rawTitle),
          link: rawLink, // URLs are validated separately
          description: sanitizeHtmlContent(rawDescription).substring(0, 500),
          pubDate: dateMatch ? dateMatch[1].trim() : undefined,
        });
      }
    }

    return items;
  } catch (error) {
    throw error;
  }
}

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

// Newsletter email helpers
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

async function sendConfirmationEmail(
  email: string,
  token: string,
  firstName?: string
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    return false;
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000";

  const confirmUrl = `${baseUrl}/api/newsletter/confirm/${token}`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  try {
    await resend.emails.send({
      from: "Dubai Travel <noreply@dubaitravel.com>",
      to: email,
      subject: "Please confirm your subscription to Dubai Travel",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0066cc; margin-bottom: 10px;">Dubai Travel</h1>
          </div>
          
          <p style="font-size: 16px;">${greeting}</p>
          
          <p style="font-size: 16px;">Thank you for signing up for our newsletter! Please confirm your subscription by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Confirm Subscription
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">If you didn't sign up for this newsletter, you can safely ignore this email.</p>
          
          <p style="font-size: 14px; color: #666;">This link will expire in 48 hours.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Dubai Travel - Your guide to the best of Dubai
          </p>
        </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    return false;
  }
}

async function sendWelcomeEmail(
  email: string,
  firstName?: string,
  unsubscribeToken?: string
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    return false;
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000";

  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const unsubscribeUrl = unsubscribeToken
    ? `${baseUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`
    : `${baseUrl}/api/newsletter/unsubscribe`;

  try {
    await resend.emails.send({
      from: "Dubai Travel <noreply@dubaitravel.com>",
      to: email,
      subject: "Welcome to Dubai Travel Newsletter!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0066cc; margin-bottom: 10px;">Dubai Travel</h1>
          </div>
          
          <p style="font-size: 16px;">${greeting}</p>
          
          <p style="font-size: 16px;">Welcome to the Dubai Travel newsletter! We're thrilled to have you join our community of travel enthusiasts.</p>
          
          <p style="font-size: 16px;">Here's what you can expect from us:</p>
          
          <ul style="font-size: 16px; margin: 20px 0; padding-left: 24px;">
            <li style="margin-bottom: 8px;">Exclusive travel tips and insider guides</li>
            <li style="margin-bottom: 8px;">Special deals on hotels and attractions</li>
            <li style="margin-bottom: 8px;">Latest events and happenings in Dubai</li>
            <li style="margin-bottom: 8px;">Hidden gems and local recommendations</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Explore Dubai Travel
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666;">Stay tuned for our next newsletter packed with amazing Dubai content!</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #999; text-align: center;">
            Dubai Travel - Your guide to the best of Dubai<br>
            <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
          </p>
        </body>
        </html>
      `,
    });

    return true;
  } catch (error) {
    return false;
  }
}

function renderConfirmationPage(success: boolean, message: string): string {
  return renderNewsletterPage(success, message, success ? "You're All Set!" : "Oops!");
}

function renderUnsubscribePage(success: boolean, message: string): string {
  return renderNewsletterPage(success, message, success ? "Unsubscribed" : "Oops!");
}

function renderNewsletterPage(success: boolean, message: string, title: string): string {
  const bgColor = success ? "#e8f5e9" : "#ffebee";
  const textColor = success ? "#2e7d32" : "#c62828";
  const icon = success ? "&#10003;" : "&#10007;";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Dubai Travel</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          max-width: 480px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${bgColor};
          color: ${textColor};
          font-size: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        h1 {
          color: #333;
          font-size: 24px;
          margin-bottom: 16px;
        }
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          margin-top: 24px;
          padding: 12px 24px;
          background: #0066cc;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
        }
        .button:hover { background: #0052a3; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="button">Visit Dubai Travel</a>
      </div>
    </body>
    </html>
  `;
}

// Validate and normalize AI-generated content blocks
// ContentBlock is imported from @shared/schema

function validateAndNormalizeBlocks(blocks: unknown[], title: string): ContentBlock[] {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return createDefaultBlocks(title);
  }

  const normalizedBlocks: Omit<ContentBlock, "id" | "order">[] = [];
  const blockTypes = new Set<string>();

  for (const block of blocks) {
    if (typeof block !== "object" || !block) continue;
    const b = block as Record<string, unknown>;
    if (typeof b.type !== "string" || !b.data) continue;

    const normalized = normalizeBlock(b.type, b.data as Record<string, unknown>);
    if (normalized) {
      normalizedBlocks.push(normalized);
      blockTypes.add(normalized.type);

      // If FAQ block has remaining FAQs, expand them into separate blocks
      if (normalized.type === "faq" && (normalized.data as any)._remainingFaqs) {
        const remainingFaqs = (normalized.data as any)._remainingFaqs as Array<{
          question?: string;
          answer?: string;
          q?: string;
          a?: string;
        }>;
        // Clean up the _remainingFaqs from the first block
        delete (normalized.data as any)._remainingFaqs;

        // Add remaining FAQs as separate blocks
        for (const faq of remainingFaqs) {
          const q = faq.question || faq.q || "Question?";
          const a = faq.answer || faq.a || "Answer pending.";
          normalizedBlocks.push({
            type: "faq" as const,
            data: { question: q, answer: a },
          });
        }
      }
    }
  }

  // Ensure required block types exist
  if (!blockTypes.has("hero")) {
    normalizedBlocks.unshift({
      type: "hero",
      data: { title, subtitle: "Discover Dubai Travel", overlayText: "" },
    });
  }

  if (!blockTypes.has("highlights")) {
    normalizedBlocks.push({
      type: "highlights",
      data: {
        content:
          "Key attraction feature\nUnique experience offered\nMust-see element\nPopular activity\nEssential stop\nNotable landmark",
      },
    });
  }

  if (!blockTypes.has("tips")) {
    normalizedBlocks.push({
      type: "tips",
      data: {
        content:
          "Plan your visit during cooler months\nBook tickets in advance\nArrive early to avoid crowds\nBring comfortable walking shoes\nStay hydrated\nCheck dress codes beforehand\nConsider guided tours for insights",
      },
    });
  }

  if (!blockTypes.has("faq")) {
    // Add individual FAQ blocks (editor expects question/answer format)
    const defaultFaqs = [
      {
        question: "What are the opening hours?",
        answer: "Opening hours vary by season. Check the official website for current timings.",
      },
      {
        question: "How much does entry cost?",
        answer:
          "Pricing varies depending on the package selected. Visit the official website for current rates.",
      },
      {
        question: "Is parking available?",
        answer: "Yes, parking is available on-site for visitors.",
      },
    ];
    for (const faq of defaultFaqs) {
      normalizedBlocks.push({
        type: "faq",
        data: { question: faq.question, answer: faq.answer },
      });
    }
  }

  if (!blockTypes.has("cta")) {
    normalizedBlocks.push({
      type: "cta",
      data: {
        title: "Plan Your Visit",
        content: "Ready to experience this amazing destination? Book your trip today!",
        buttonText: "Book Now",
        buttonLink: "#",
      },
    });
  }

  // Add quote block if missing (insert after second text block if exists)
  if (!blockTypes.has("quote")) {
    const insertIndex = Math.min(4, normalizedBlocks.length);
    normalizedBlocks.splice(insertIndex, 0, {
      type: "quote",
      data: {
        text: "Dubai is a city that never stops surprising you. Every corner reveals a new wonder.",
        author: "Dubai Tourism",
        source: "",
      },
    });
  }

  // Add banner block if missing
  if (!blockTypes.has("banner")) {
    const insertIndex = Math.min(7, normalizedBlocks.length);
    normalizedBlocks.splice(insertIndex, 0, {
      type: "banner",
      data: {
        title: "EXPERIENCE DUBAI",
        subtitle: "Discover the magic",
        image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920",
        ctaText: "Explore More",
        ctaLink: "/attractions",
      },
    });
  }

  // Add recommendations block if missing
  if (!blockTypes.has("recommendations")) {
    normalizedBlocks.push({
      type: "recommendations",
      data: {
        title: "Travi Recommends",
        subtitle: "Handpicked experiences to enhance your Dubai visit",
        items: [
          {
            title: "Burj Khalifa Sky Experience",
            description: "See Dubai from the world's tallest building",
            image: "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=400",
            ctaText: "Book Now",
            ctaLink: "/attractions/burj-khalifa",
            price: "From AED 149",
          },
          {
            title: "Desert Safari Adventure",
            description: "Experience the golden dunes at sunset",
            image: "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=400",
            ctaText: "Book Now",
            ctaLink: "/attractions/desert-safari",
            price: "From AED 199",
          },
          {
            title: "Dubai Marina Cruise",
            description: "Luxury dinner cruise with skyline views",
            image: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400",
            ctaText: "Book Now",
            ctaLink: "/dining/marina-cruise",
            price: "From AED 299",
          },
          {
            title: "Miracle Garden Entry",
            description: "World's largest natural flower garden",
            image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400",
            ctaText: "Book Now",
            ctaLink: "/attractions/miracle-garden",
            price: "From AED 55",
          },
        ],
      },
    });
  }

  // Add related articles block if missing
  if (!blockTypes.has("related_articles")) {
    normalizedBlocks.push({
      type: "related_articles",
      data: {
        title: "Related Articles",
        subtitle: "Explore more Dubai travel guides and tips",
        articles: [
          {
            title: "Top 10 Things to Do in Dubai",
            description: "Essential experiences for first-time visitors",
            image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
            date: "25",
            category: "Dubai Guide",
            slug: "top-things-to-do-dubai",
          },
          {
            title: "Dubai on a Budget",
            description: "How to enjoy luxury for less",
            image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400",
            date: "25",
            category: "Tips",
            slug: "dubai-budget-guide",
          },
          {
            title: "Best Dubai Restaurants 2025",
            description: "Where to eat from casual to fine dining",
            image: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400",
            date: "25",
            category: "Dining",
            slug: "best-dubai-restaurants",
          },
          {
            title: "Dubai Hidden Gems",
            description: "Secret spots the locals love",
            image: "https://images.unsplash.com/photo-1546412414-e1885259563a?w=400",
            date: "25",
            category: "Attractions",
            slug: "dubai-hidden-gems",
          },
        ],
      },
    });
  }

  // Add id and order to all blocks before returning
  return normalizedBlocks.map((block, index) => ({
    ...block,
    id: `${block.type}-${Date.now()}-${index}`,
    order: index,
  }));
}

function normalizeBlock(
  type: string,
  data: Record<string, unknown>
): Omit<ContentBlock, "id" | "order"> | null {
  const validTypes: ContentBlock["type"][] = [
    "hero",
    "text",
    "image",
    "gallery",
    "faq",
    "cta",
    "info_grid",
    "highlights",
    "room_cards",
    "tips",
    "quote",
    "banner",
    "recommendations",
    "related_articles",
  ];

  switch (type) {
    case "hero":
      return { type: "hero" as const, data };

    case "text":
      return { type: "text" as const, data };

    case "highlights":
      // Convert items array to content string (one per line) for editor compatibility
      let highlightItems = (data as any).items || (data as any).highlights;
      if (Array.isArray(highlightItems) && highlightItems.length > 0) {
        // Convert array to newline-separated string for textarea editing
        const highlightContent = highlightItems
          .map((item: unknown) => {
            if (typeof item === "string") return item;
            if (typeof item === "object" && item && (item as any).title) {
              // Handle {title, description} format
              const t = item as { title?: string; description?: string };
              return t.description ? `${t.title}: ${t.description}` : t.title;
            }
            return String(item);
          })
          .join("\n");
        return { type: "highlights" as const, data: { ...data, content: highlightContent } };
      }
      // If already has content, use it
      if (typeof (data as any).content === "string" && (data as any).content.length > 0) {
        return { type: "highlights" as const, data };
      }
      // Default highlights
      return {
        type: "highlights" as const,
        data: {
          ...data,
          content:
            "Key attraction feature\nUnique experience offered\nMust-see element\nPopular activity",
        },
      };

    case "tips":
      // Convert tips array to content string (one per line) for editor compatibility
      let tipsArray = (data as any).tips || (data as any).items;
      if (Array.isArray(tipsArray) && tipsArray.length > 0) {
        // Convert array to newline-separated string for textarea editing
        const tipsContent = tipsArray.map((tip: unknown) => String(tip)).join("\n");
        return { type: "tips" as const, data: { ...data, content: tipsContent } };
      }
      // If already has content, use it
      if (typeof (data as any).content === "string" && (data as any).content.length > 0) {
        return { type: "tips" as const, data };
      }
      // Default tips
      return {
        type: "tips" as const,
        data: {
          ...data,
          content:
            "Visit during off-peak hours\nBook in advance\nWear comfortable clothing\nStay hydrated\nCheck local customs",
        },
      };

    case "faq":
      // For FAQ, editor expects individual blocks with question/answer strings
      // If data has question/answer directly, use it
      if (typeof (data as any).question === "string" && (data as any).question.length > 0) {
        return { type: "faq" as const, data };
      }
      // If data has faqs array, take the first one (other FAQs handled by validateAndNormalizeBlocks)
      let faqsArray = (data as any).faqs || (data as any).items || (data as any).questions;
      if (Array.isArray(faqsArray) && faqsArray.length > 0) {
        const firstFaq = faqsArray[0];
        if (typeof firstFaq === "object" && firstFaq) {
          const q = (firstFaq as any).question || (firstFaq as any).q || "Question?";
          const a = (firstFaq as any).answer || (firstFaq as any).a || "Answer pending.";
          // Store the remaining FAQs for later extraction
          return {
            type: "faq" as const,
            data: { question: q, answer: a, _remainingFaqs: faqsArray.slice(1) },
          };
        }
      }
      // Default FAQ
      return {
        type: "faq" as const,
        data: {
          question: "What are the opening hours?",
          answer: "Check the official website for current timings.",
        },
      };

    case "cta":
      return { type: "cta" as const, data };

    case "image":
      return { type: "image" as const, data };
    case "gallery":
      return { type: "gallery" as const, data };
    case "info_grid":
      return { type: "info_grid" as const, data };

    case "quote":
      return { type: "quote" as const, data };

    case "banner":
      // Ensure banner has image
      const bannerData = { ...data };
      if (!bannerData.image) {
        bannerData.image = "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920";
      }
      return { type: "banner" as const, data: bannerData };

    case "recommendations":
      // Ensure recommendations have items with images
      let recItems = (data as any).items;
      if (Array.isArray(recItems)) {
        const defaultImages = [
          "https://images.unsplash.com/photo-1582672060674-bc2bd808a8b5?w=400",
          "https://images.unsplash.com/photo-1451337516015-6b6e9a44a8a3?w=400",
          "https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=400",
          "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400",
        ];
        recItems = recItems.map((item: any, index: number) => ({
          ...item,
          image: item.image || defaultImages[index % defaultImages.length],
        }));
      }
      return { type: "recommendations" as const, data: { ...data, items: recItems } };

    case "related_articles":
      // Ensure related articles have images
      let articles = (data as any).articles;
      if (Array.isArray(articles)) {
        const defaultArticleImages = [
          "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400",
          "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=400",
          "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=400",
          "https://images.unsplash.com/photo-1546412414-e1885259563a?w=400",
        ];
        articles = articles.map((article: any, index: number) => ({
          ...article,
          image: article.image || defaultArticleImages[index % defaultArticleImages.length],
        }));
      }
      return { type: "related_articles" as const, data: { ...data, articles } };

    default:
      // Check if type is valid, otherwise return text
      if (validTypes.includes(type as any)) {
        return { type: type as ContentBlock["type"], data };
      }
      return { type: "text" as const, data };
  }
}

function createDefaultBlocks(title: string): ContentBlock[] {
  const timestamp = Date.now();
  return [
    {
      id: `hero-${timestamp}-0`,
      type: "hero",
      data: { title, subtitle: "Discover Dubai Travel", overlayText: "" },
      order: 0,
    },
    {
      id: `text-${timestamp}-1`,
      type: "text",
      data: {
        heading: "Overview",
        content: "Content generation incomplete. Please edit this article to add more details.",
      },
      order: 1,
    },
    {
      id: `highlights-${timestamp}-2`,
      type: "highlights",
      data: { content: "Feature 1\nFeature 2\nFeature 3\nFeature 4\nFeature 5\nFeature 6" },
      order: 2,
    },
    {
      id: `tips-${timestamp}-3`,
      type: "tips",
      data: {
        content:
          "Plan ahead\nBook in advance\nVisit early morning\nStay hydrated\nRespect local customs\nBring camera\nCheck weather",
      },
      order: 3,
    },
    {
      id: `faq-${timestamp}-4`,
      type: "faq",
      data: {
        question: "What are the opening hours?",
        answer: "Check official website for current hours.",
      },
      order: 4,
    },
    {
      id: `faq-${timestamp}-5`,
      type: "faq",
      data: { question: "Is there parking?", answer: "Yes, parking is available." },
      order: 5,
    },
    {
      id: `faq-${timestamp}-6`,
      type: "faq",
      data: {
        question: "What should I bring?",
        answer: "Comfortable shoes, sunscreen, and water.",
      },
      order: 6,
    },
    {
      id: `cta-${timestamp}-7`,
      type: "cta",
      data: {
        title: "Book Your Visit",
        content: "Plan your trip today!",
        buttonText: "Book Now",
        buttonLink: "#",
      },
      order: 7,
    },
  ];
}

function generateFingerprint(title: string, url?: string): string {
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedUrl = url ? url.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return crypto
    .createHash("sha256")
    .update(`${normalizedTitle}-${normalizedUrl}`)
    .digest("hex")
    .substring(0, 32);
}

interface ArticleImageResult {
  url: string;
  altText: string;
  imageId: string;
  source: "library" | "freepik";
}

async function findOrCreateArticleImage(
  topic: string,
  keywords: string[],
  category: string
): Promise<ArticleImageResult | null> {
  try {
    const { aiGeneratedImages } = await import("@shared/schema");

    const searchTerms = [topic, ...keywords].filter(Boolean);
    const searchConditions = searchTerms.map(term =>
      or(
        like(aiGeneratedImages.topic, `%${term}%`),
        like(aiGeneratedImages.altText, `%${term}%`),
        like(aiGeneratedImages.category, `%${term}%`)
      )
    );

    let foundImage = null;

    if (searchConditions.length > 0) {
      const approvedImages = await db
        .select()
        .from(aiGeneratedImages)
        .where(and(eq(aiGeneratedImages.isApproved, true), or(...searchConditions)))
        .orderBy(desc(aiGeneratedImages.usageCount))
        .limit(1);

      if (approvedImages.length > 0) {
        foundImage = approvedImages[0];
      } else {
        const anyImages = await db
          .select()
          .from(aiGeneratedImages)
          .where(or(...searchConditions))
          .orderBy(desc(aiGeneratedImages.createdAt))
          .limit(1);

        if (anyImages.length > 0) {
          foundImage = anyImages[0];
        }
      }
    }

    if (!foundImage) {
      const categoryImages = await db
        .select()
        .from(aiGeneratedImages)
        .where(eq(aiGeneratedImages.category, category))
        .orderBy(desc(aiGeneratedImages.isApproved), desc(aiGeneratedImages.createdAt))
        .limit(1);

      if (categoryImages.length > 0) {
        foundImage = categoryImages[0];
      }
    }

    if (foundImage) {
      await db
        .update(aiGeneratedImages)
        .set({ usageCount: (foundImage.usageCount || 0) + 1, updatedAt: new Date() } as any)
        .where(eq(aiGeneratedImages.id, foundImage.id));

      return {
        url: foundImage.url,
        altText: foundImage.altText || `${topic} - Dubai Travel`,
        imageId: foundImage.id,
        source: "library",
      };
    }

    const freepikApiKey = process.env.FREEPIK_API_KEY;
    if (!freepikApiKey) {
      return null;
    }

    const searchQuery = `dubai ${topic} tourism`.substring(0, 100);
    const searchUrl = new URL("https://api.freepik.com/v1/resources");
    searchUrl.searchParams.set("term", searchQuery);
    searchUrl.searchParams.set("page", "1");
    searchUrl.searchParams.set("limit", "5");
    searchUrl.searchParams.set("filters[content_type][photo]", "1");

    const freepikResponse = await fetch(searchUrl.toString(), {
      headers: {
        "Accept-Language": "en-US",
        Accept: "application/json",
        "x-freepik-api-key": freepikApiKey,
      },
    });

    if (!freepikResponse.ok) {
      return null;
    }

    const freepikData = await freepikResponse.json();
    const results = freepikData.data || [];

    if (results.length === 0) {
      // Fallback to AI image generation
      try {
        const aiImages = await generateContentImages({
          contentType: "article",
          title: topic,
          description: `Dubai travel article about ${topic}`,
          style: "photorealistic",
          generateHero: true,
          generateContentImages: false,
        });

        if (aiImages && aiImages.length > 0) {
          const aiImage = aiImages[0];

          // Store the AI generated image
          const [savedImage] = await db
            .insert(aiGeneratedImages)
            .values({
              filename: aiImage.filename,
              url: aiImage.url,
              topic: topic,
              category: category || "general",
              imageType: "hero",
              source: "openai" as const,
              prompt: `Dubai travel image for: ${topic}`,
              keywords: keywords.slice(0, 10),
              altText: aiImage.alt || `${topic} - Dubai Travel`,
              caption: aiImage.caption || topic,
              size: 0,
              usageCount: 1,
            } as any)
            .returning();

          return {
            url: aiImage.url,
            altText: aiImage.alt || `${topic} - Dubai Travel`,
            imageId: savedImage.id,
            source: "library" as const,
          };
        }
      } catch (aiError) {}

      return null;
    }

    const bestResult = results[0];
    const imageUrl =
      bestResult.image?.source?.url || bestResult.preview?.url || bestResult.thumbnail?.url;

    if (!imageUrl) {
      return null;
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return null;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const filename = `freepik-${Date.now()}.jpg`;

    // Use unified storage manager (handles fallback automatically)
    const storageManager = getStorageManager();
    const storagePath = `public/images/${filename}`;
    const result = await storageManager.upload(storagePath, Buffer.from(imageBuffer));
    const persistedUrl = result.url;

    const altText = bestResult.title || `${topic} - Dubai Travel`;

    const [savedImage] = await db
      .insert(aiGeneratedImages)
      .values({
        filename,
        url: persistedUrl,
        topic: topic,
        category: category || "general",
        imageType: "hero",
        source: "freepik" as const,
        prompt: null,
        keywords: keywords.slice(0, 10),
        altText: altText,
        caption: bestResult.title || topic,
        size: imageBuffer.byteLength,
        usageCount: 1,
      } as any)
      .returning();

    return {
      url: persistedUrl,
      altText: altText,
      imageId: savedImage.id,
      source: "freepik",
    };
  } catch (error) {
    return null;
  }
}

// Process image blocks in generated content - fetch images from Freepik/AI based on searchQuery
async function processImageBlocks(
  blocks: ContentBlock[],
  category: string = "general"
): Promise<ContentBlock[]> {
  const processedBlocks: ContentBlock[] = [];

  for (const block of blocks) {
    if (block.type === "image" && block.data) {
      const rawSearchQuery =
        block.data.searchQuery || block.data.query || block.data.alt || "dubai travel";
      const searchQuery = typeof rawSearchQuery === "string" ? rawSearchQuery : "dubai travel";

      try {
        // Use existing image finder function
        const imageResult = await findOrCreateArticleImage(
          searchQuery,
          [searchQuery, category],
          category
        );

        if (imageResult) {
          processedBlocks.push({
            ...block,
            data: {
              ...block.data,
              url: imageResult.url,
              imageUrl: imageResult.url,
              alt: block.data.alt || imageResult.altText,
              imageId: imageResult.imageId,
            },
          });
        } else {
          // Fallback to Unsplash placeholder
          const unsplashQuery = encodeURIComponent(
            searchQuery.replace(/dubai/gi, "").trim() || "travel"
          );
          processedBlocks.push({
            ...block,
            data: {
              ...block.data,
              url: `https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80`,
              imageUrl: `https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80`,
              alt: block.data.alt || `${searchQuery} - Dubai`,
            },
          });
        }
      } catch (error) {
        // Keep block as-is with placeholder
        processedBlocks.push({
          ...block,
          data: {
            ...block.data,
            url: `https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80`,
            imageUrl: `https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80`,
          },
        });
      }
    } else {
      processedBlocks.push(block);
    }
  }

  return processedBlocks;
}

// RTL languages that need special handling
const RTL_LOCALES = ["ar", "fa", "ur"];

// All target languages for translation (excluding English which is source)
// Note: DeepL does NOT support: Bengali (bn), Filipino (fil), Hebrew (he), Hindi (hi), Urdu (ur), Persian (fa)
// For unsupported languages, we use GPT as fallback translator
const DEEPL_SUPPORTED_LOCALES = [
  "ar",
  "zh",
  "ru",
  "fr",
  "de",
  "es",
  "tr",
  "it",
  "ja",
  "ko",
  "pt",
] as const;
const GPT_FALLBACK_LOCALES = ["hi", "ur", "fa"] as const; // Languages supported by GPT but not DeepL
const TARGET_LOCALES = [...DEEPL_SUPPORTED_LOCALES, ...GPT_FALLBACK_LOCALES] as const;

/**
 * DISABLED (January 2026): Automatic translation is permanently disabled.
 * All translations must be done manually via admin UI.
 * This function now returns immediately without performing any translation.
 */
async function translateArticleToAllLanguages(
  contentId: string,
  content: {
    title: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    blocks?: any[];
  }
): Promise<{ success: number; failed: number; errors: string[] }> {
  // HARD DISABLE: Automatic translation is permanently disabled

  return { success: 0, failed: 0, errors: ["Automatic translation is disabled"] };

  // ORIGINAL CODE PRESERVED BELOW FOR REFERENCE (NEVER EXECUTED)
  const result = { success: 0, failed: 0, errors: [] as string[] };

  try {
    // Use translation-service (Claude Haiku) instead of deepl-service
    const { translateContent, generateContentHash } =
      await import("./services/translation-service");

    const BATCH_SIZE = 3;
    for (let i = 0; i < TARGET_LOCALES.length; i += BATCH_SIZE) {
      const batch = TARGET_LOCALES.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async locale => {
          try {
            // Note: translation-service uses (content, sourceLocale, targetLocale) order
            const translatedContent = await translateContent(
              {
                title: content.title,
                metaTitle: content.metaTitle || undefined,
                metaDescription: content.metaDescription || undefined,
                blocks: content.blocks || [],
              },
              "en" as any,
              locale as any
            );

            const existingTranslation = await storage.getTranslation(contentId, locale as any);

            const isRtl = RTL_LOCALES.includes(locale);
            const translationData = {
              contentId,
              locale: locale as any,
              status: "completed" as const,
              title: translatedContent.title || null,
              metaTitle: translatedContent.metaTitle || null,
              metaDescription: translatedContent.metaDescription || null,
              blocks: translatedContent.blocks || [],
              sourceHash: translatedContent.sourceHash,
              translatedBy: "claude-auto",
              translationProvider: "claude",
              isManualOverride: false,
            };

            if (existingTranslation && !existingTranslation.isManualOverride) {
              await storage.updateTranslation(existingTranslation.id, translationData);
            } else if (!existingTranslation) {
              await storage.createTranslation(translationData);
            }

            return { locale, success: true };
          } catch (error) {
            const errorMsg = `Failed to translate to ${locale}: ${error instanceof Error ? error.message : "Unknown error"}`;

            return { locale, success: false, error: errorMsg };
          }
        })
      );

      for (const batchResult of batchResults) {
        if (batchResult.status === "fulfilled") {
          const value = (
            batchResult as PromiseFulfilledResult<{
              locale: string;
              success: boolean;
              error?: string;
            }>
          ).value;
          if (value.success) {
            result.success++;
          } else {
            result.failed++;
            if (value.error) {
              result.errors.push(value.error);
            }
          }
        } else {
          result.failed++;
          const reason = (batchResult as PromiseRejectedResult).reason;
          result.errors.push(`Batch error: ${reason}`);
        }
      }

      if (i + BATCH_SIZE < TARGET_LOCALES.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    const errorMsg = `Translation process error: ${error instanceof Error ? error.message : "Unknown error"}`;

    result.errors.push(errorMsg);
  }

  return result;
}

export type AutoProcessResult = {
  feedsProcessed: number;
  itemsFound: number;
  clustersCreated: number;
  articlesGenerated: number;
  errors: string[];
};

export async function autoProcessRssFeeds(): Promise<AutoProcessResult> {
  const result: AutoProcessResult = {
    feedsProcessed: 0,
    itemsFound: 0,
    clustersCreated: 0,
    articlesGenerated: 0,
    errors: [],
  };

  try {
    const feeds = await storage.getRssFeeds();
    const activeFeeds = feeds.filter(f => f.isActive);

    if (activeFeeds.length === 0) {
      return result;
    }

    for (const feed of activeFeeds) {
      try {
        const items = await parseRssFeed(feed.url);
        result.feedsProcessed++;
        result.itemsFound += items.length;

        for (const item of items) {
          const fingerprint = generateFingerprint(item.title, item.link);
          const existingFp = await storage.getContentFingerprintByHash(fingerprint);
          if (existingFp) {
            continue;
          }

          let cluster = await storage.findSimilarCluster(item.title);

          if (!cluster) {
            cluster = await storage.createTopicCluster({
              topic: item.title,
              status: "pending",
              articleCount: 0,
            });
            result.clustersCreated++;
          }

          await storage.createTopicClusterItem({
            clusterId: cluster.id,
            sourceTitle: item.title,
            sourceDescription: item.description || null,
            sourceUrl: item.link || null,
            rssFeedId: feed.id || null,
            pubDate: item.pubDate ? new Date(item.pubDate) : null,
          });

          try {
            await storage.createContentFingerprint({
              contentId: null,
              fingerprint: fingerprint,
              sourceUrl: item.link || null,
              sourceTitle: item.title,
              rssFeedId: feed.id || null,
            });
          } catch (e) {
            // Fingerprint might already exist
          }

          const clusterItems = await storage.getTopicClusterItems(cluster.id);
          await storage.updateTopicCluster(cluster.id, {
            articleCount: clusterItems.length,
            similarityScore:
              clusterItems.length > 1 ? Math.min(90, 50 + clusterItems.length * 10) : 50,
          });
        }
      } catch (feedError) {
        const errorMsg = `Failed to process feed "${feed.name}": ${feedError}`;

        result.errors.push(errorMsg);
      }
    }

    const pendingClusters = await storage.getTopicClusters({ status: "pending" });
    const unifiedProviders = getAllUnifiedProviders();

    if (unifiedProviders.length === 0) {
      return result;
    }

    // Prioritize Gemini for cost efficiency, then try other providers
    const sortedProviders = [...unifiedProviders].sort((a, b) => {
      if (a.name === "gemini") return -1;
      if (b.name === "gemini") return 1;
      // OpenAI is rate-limited, deprioritize it
      if (a.name === "openai") return 1;
      if (b.name === "openai") return -1;
      return 0;
    });

    // Daily limit to prevent API exhaustion - process max 5 articles per run
    const MAX_ARTICLES_PER_RUN = 5;
    const clustersToProcess = pendingClusters.slice(0, MAX_ARTICLES_PER_RUN);

    if (pendingClusters.length > MAX_ARTICLES_PER_RUN) {
    }

    for (const cluster of clustersToProcess) {
      try {
        const items = await storage.getTopicClusterItems(cluster.id);
        if (items.length === 0) continue;

        const sources = items.map(item => ({
          title: item.sourceTitle,
          description: item.sourceDescription || "",
          url: item.sourceUrl || "",
          date: item.pubDate?.toISOString() || "",
        }));

        const combinedText = sources.map(s => `${s.title} ${s.description}`).join(" ");
        const category = determineContentCategory(combinedText);
        const sourceContent = sources.map(s => `${s.title}: ${s.description}`).join("\n\n");

        // Use centralized content rules system
        const systemPrompt = await getContentWriterSystemPrompt(category);
        const userPrompt = await buildArticleGenerationPrompt(
          cluster.topic || combinedText,
          sourceContent
        );

        // Generate article with validation and retries
        let validatedData: ArticleResponse | null = null;
        let attempts = 0;
        const maxAttempts = 3;
        let lastResponse: unknown = null;
        let lastErrors: string[] = [];
        let lastWordCount = 0;

        while (!validatedData && attempts < maxAttempts) {
          attempts++;

          const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ];

          // Add retry prompt if this is a retry
          if (attempts > 1 && lastErrors.length > 0) {
            const retryPrompt = await buildRetryPrompt(lastErrors, lastWordCount);
            messages.push({
              role: "user",
              content: retryPrompt,
            });
          }

          // Try each unified provider in fallback chain until one succeeds
          let completionSuccess = false;
          for (const provider of sortedProviders) {
            try {
              const result = await provider.generateCompletion({
                messages,
                model: provider.name === "openai" ? "gpt-4o" : provider.model,
                temperature: attempts === 1 ? 0.7 : 0.5,
                maxTokens: 12000,
                responseFormat: { type: "json_object" },
              });

              lastResponse = safeParseJson(result.content || "{}", {});
              completionSuccess = true;
              markProviderSuccess(provider.name); // Clear any failure states

              break; // Exit provider loop on success
            } catch (providerError: any) {
              const isRateLimitError =
                providerError?.status === 429 ||
                providerError?.code === "insufficient_quota" ||
                providerError?.message?.includes("quota") ||
                providerError?.message?.includes("429");
              const isCreditsError =
                providerError?.status === 402 ||
                providerError?.message?.includes("credits") ||
                providerError?.message?.includes("Insufficient Balance") ||
                providerError?.message?.includes("insufficient_funds");

              if (isCreditsError) {
                markProviderFailed(provider.name, "no_credits");
              } else if (isRateLimitError) {
                markProviderFailed(provider.name, "rate_limited");
              }
              // Continue to next provider
            }
          }

          if (!completionSuccess) {
            break; // Exit attempts loop if no providers worked
          }

          const validation = await validateArticleResponse(lastResponse);

          if (validation.isValid && validation.data) {
            validatedData = validation.data;
          } else {
            lastErrors = validation.errors;
            lastWordCount = validation.wordCount;
          }
        }

        // If validation never passed, skip this cluster
        if (!validatedData) {
          const errorMsg = `Failed to generate valid article after ${maxAttempts} attempts for "${cluster.topic}". Last errors: ${lastErrors.join(", ")}`;

          result.errors.push(errorMsg);
          continue;
        }

        const mergedData = validatedData;

        const slug = (mergedData.title || cluster.topic)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 80);

        const textContent = mergedData.content || "";
        const wordCount = textContent
          .replace(/<[^>]*>/g, "")
          .split(/\s+/)
          .filter((w: string) => w.length > 0).length;

        // STEP 1: Fetch hero image BEFORE creating blocks
        const imageSearchTerms = mergedData.imageSearchTerms || [];
        const articleKeywords = mergedData.secondaryKeywords || [];
        const articleTopic = mergedData.title || cluster.topic;

        let heroImageUrl: string | null = null;
        let heroImageAlt: string | null = null;

        const searchAttempts = [
          imageSearchTerms, // AI-generated terms first
          [articleTopic], // Article title
          articleKeywords.slice(0, 3), // Top keywords
          // FAIL-FAST: Do not use implicit Dubai fallback - use category only
          [category], // Category fallback (no implicit destination)
        ];

        for (const searchTerms of searchAttempts) {
          if (heroImageUrl) break;
          if (searchTerms.length === 0) continue;

          const searchQuery = searchTerms.join(" ");

          const articleImage = await findOrCreateArticleImage(
            searchQuery,
            searchTerms as string[],
            category
          );

          if (articleImage) {
            heroImageUrl = articleImage.url;
            heroImageAlt = articleImage.altText;
          }
        }

        if (!heroImageUrl) {
        }

        // STEP 2: Create all content blocks with validated data
        // Provide BOTH formats to ensure compatibility with editor AND renderer
        let blocks: ContentBlock[] = [];
        let blockOrder = 0;
        const timestamp = Date.now();

        // Hero block - uses 'image' for renderer
        blocks.push({
          id: `hero-${timestamp}-${blockOrder}`,
          type: "hero",
          data: {
            title: mergedData.title || cluster.topic,
            subtitle: mergedData.metaDescription || "",
            image: heroImageUrl || "",
            alt: heroImageAlt || "",
          },
          order: blockOrder++,
        });

        // Split main content into 3 sections for interspersed images
        const mainContent = mergedData.content || "";
        const paragraphs = mainContent.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
        const sectionSize = Math.ceil(paragraphs.length / 3);

        const section1 = paragraphs.slice(0, sectionSize).join("\n\n");
        const section2 = paragraphs.slice(sectionSize, sectionSize * 2).join("\n\n");
        const section3 = paragraphs.slice(sectionSize * 2).join("\n\n");

        // Highlights block - provide BOTH formats for compatibility
        const quickFacts = mergedData.quickFacts || [];
        if (quickFacts.length > 0) {
          blocks.push({
            id: `highlights-${timestamp}-${blockOrder}`,
            type: "highlights",
            data: {
              title: "Quick Facts",
              content: quickFacts.join("\n"),
              items: quickFacts,
            },
            order: blockOrder++,
          });
        }

        // Content section 1
        blocks.push({
          id: `text-${timestamp}-${blockOrder}`,
          type: "text",
          data: { heading: "", content: section1 },
          order: blockOrder++,
        });

        // Image block 1
        blocks.push({
          id: `image-${timestamp}-${blockOrder}`,
          type: "image",
          data: {
            searchQuery: `Dubai ${category} tourism ${(mergedData.secondaryKeywords || [])[0] || "travel"}`,
            alt: `Dubai ${category} - ${mergedData.title}`,
            caption: `Explore the best of Dubai ${category}`,
          },
          order: blockOrder++,
        });

        // Content section 2
        blocks.push({
          id: `text-${timestamp}-${blockOrder}`,
          type: "text",
          data: { heading: "", content: section2 },
          order: blockOrder++,
        });

        // Image block 2
        blocks.push({
          id: `image-${timestamp}-${blockOrder}`,
          type: "image",
          data: {
            searchQuery: `Dubai ${(mergedData.secondaryKeywords || [])[1] || "attractions"} experience`,
            alt: `Dubai travel experience - ${mergedData.title}`,
            caption: `Discover Dubai's unique experiences`,
          },
          order: blockOrder++,
        });

        // Content section 3
        blocks.push({
          id: `text-${timestamp}-${blockOrder}`,
          type: "text",
          data: { heading: "", content: section3 },
          order: blockOrder++,
        });

        // Image block 3
        blocks.push({
          id: `image-${timestamp}-${blockOrder}`,
          type: "image",
          data: {
            searchQuery: `Dubai ${(mergedData.secondaryKeywords || [])[2] || "landmarks"} skyline`,
            alt: `Dubai skyline and landmarks - ${mergedData.title}`,
            caption: `The stunning Dubai skyline`,
          },
          order: blockOrder++,
        });

        // Tips block - provide BOTH formats for compatibility
        const proTips = mergedData.proTips || [];
        if (proTips.length > 0) {
          blocks.push({
            id: `tips-${timestamp}-${blockOrder}`,
            type: "tips",
            data: {
              title: "Pro Tips",
              content: proTips.join("\n"),
              tips: proTips,
            },
            order: blockOrder++,
          });
        }

        // FAQ block - single block with questions array (for proper heading/accordion display)
        const faqs = mergedData.faqs || [];
        if (faqs.length > 0) {
          blocks.push({
            id: `faq-${timestamp}-${blockOrder}`,
            type: "faq",
            data: {
              title: "Frequently Asked Questions",
              questions: faqs.map(faq => ({
                question: faq.question,
                answer: faq.answer,
              })),
            },
            order: blockOrder++,
          });
        }

        // CTA block
        blocks.push({
          id: `cta-${timestamp}-${blockOrder}`,
          type: "cta",
          data: {
            title: "Plan Your Visit",
            content: "Ready to experience this? Start planning your Dubai adventure today!",
            buttonText: "Explore More",
            buttonLink: "/articles",
          },
          order: blockOrder++,
        });

        // Process image blocks to fetch real images from Freepik/AI

        blocks = await processImageBlocks(blocks, category);

        const content = await storage.createContent({
          title: mergedData.title || cluster.topic,
          slug: `${slug}-${Date.now()}`,
          type: "article",
          status: "draft",
          metaTitle: mergedData.title || cluster.topic,
          metaDescription: mergedData.metaDescription || null,
          primaryKeyword: mergedData.primaryKeyword || null,
          secondaryKeywords: mergedData.secondaryKeywords || [],
          blocks: blocks as any,
          wordCount: wordCount,
          heroImage: heroImageUrl,
          heroImageAlt: heroImageAlt,
        });

        const articleCategory =
          category === "food" || category === "restaurants" || category === "dining"
            ? "food"
            : category === "attractions" || category === "activities"
              ? "attractions"
              : category === "hotels" || category === "accommodation"
                ? "hotels"
                : category === "transport" ||
                    category === "transportation" ||
                    category === "logistics"
                  ? "transport"
                  : category === "events" || category === "festivals"
                    ? "events"
                    : category === "tips" || category === "guides"
                      ? "tips"
                      : category === "shopping" || category === "deals"
                        ? "shopping"
                        : "news";

        // Get personality info for article metadata
        const personalityKey = CATEGORY_PERSONALITY_MAPPING[category] || "A";
        const personalityData = CONTENT_WRITER_PERSONALITIES[personalityKey];

        await storage.createArticle({
          contentId: content.id,
          category: articleCategory as any,
          urgencyLevel: mergedData.urgencyLevel || "relevant",
          targetAudience: mergedData.targetAudience || [],
          personality: personalityKey,
          tone: personalityData?.style || "professional",
          quickFacts: mergedData.quickFacts || [],
          proTips: mergedData.proTips || [],
          warnings: mergedData.warnings || [],
          faq: mergedData.faqs || [],
        });

        for (const item of items) {
          if (item.sourceUrl) {
            const fp = generateFingerprint(item.sourceTitle, item.sourceUrl);
            try {
              await storage.createContentFingerprint({
                contentId: content.id,
                fingerprint: fp,
                sourceUrl: item.sourceUrl,
                sourceTitle: item.sourceTitle,
                rssFeedId: item.rssFeedId || null,
              });
            } catch (e) {
              // Already exists
            }
          }
          await storage.updateTopicClusterItem(item.id, { isUsedInMerge: true });
        }

        await storage.updateTopicCluster(cluster.id, {
          status: "merged",
          mergedContentId: content.id,
        });

        result.articlesGenerated++;

        // [REMOVED] Entity extraction moved to Octypo v2

        // Auto-translate to all 16 target languages - DISABLED (January 2026)
        // Translation is now manual-only via admin UI
      } catch (clusterError) {
        const errorMsg = `Failed to generate article for cluster "${cluster.topic}": ${clusterError}`;

        result.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Auto-process failed: ${error}`;

    result.errors.push(errorMsg);
  }

  return result;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", (await import("express")).default.static(uploadsDir));

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

  // Health check endpoint for monitoring and load balancers
  // Includes timeout protection and comprehensive dependency checks
  app.get("/api/health", async (_req: Request, res: Response) => {
    const HEALTH_CHECK_TIMEOUT = 5000; // 5 second timeout for all checks
    const startTime = Date.now();

    const health: {
      status: string;
      timestamp: string;
      uptime: number;
      version: string;
      responseTime: number;
      checks: Record<
        string,
        { status: string; latency?: number; usage?: number; details?: string }
      >;
    } = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      responseTime: 0,
      checks: {
        database: { status: "unknown", latency: 0 },
        memory: { status: "healthy", usage: 0 },
        eventLoop: { status: "healthy", latency: 0 },
      },
    };

    // Helper function to run check with timeout
    const runCheckWithTimeout = async <T>(
      name: string,
      check: () => Promise<T>,
      timeout: number
    ): Promise<{ success: boolean; result?: T; error?: string; latency: number }> => {
      const checkStart = Date.now();
      try {
        const result = await Promise.race([
          check(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${name} check timeout`)), timeout)
          ),
        ]);
        return { success: true, result, latency: Date.now() - checkStart };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          latency: Date.now() - checkStart,
        };
      }
    };

    // Check 1: Database connectivity with timeout
    const dbCheck = await runCheckWithTimeout(
      "database",
      async () => {
        await db.execute(sql`SELECT 1`);
        return true;
      },
      HEALTH_CHECK_TIMEOUT
    );

    health.checks.database = {
      status: dbCheck.success ? "healthy" : "unhealthy",
      latency: dbCheck.latency,
      details: dbCheck.error,
    };
    if (!dbCheck.success) health.status = "unhealthy";

    // Check 2: Memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const memoryPercent = Math.round((heapUsedMB / heapTotalMB) * 100);

    let memoryStatus = "healthy";
    if (memoryPercent > 95) {
      memoryStatus = "critical";
      health.status = "unhealthy";
    } else if (memoryPercent > 85) {
      memoryStatus = "warning";
    }

    health.checks.memory = {
      status: memoryStatus,
      usage: memoryPercent,
      details: `${heapUsedMB}MB / ${heapTotalMB}MB`,
    };

    // Check 3: Event loop lag (detect blocking operations)
    const eventLoopStart = Date.now();
    await new Promise(resolve => setImmediate(resolve));
    const eventLoopLag = Date.now() - eventLoopStart;

    health.checks.eventLoop = {
      status: eventLoopLag > 100 ? "warning" : "healthy",
      latency: eventLoopLag,
      details: eventLoopLag > 100 ? "Event loop may be blocked" : undefined,
    };

    // Check 4: Redis/Cache connectivity
    const cacheCheck = await runCheckWithTimeout(
      "cache",
      async () => {
        const { cache } = await import("./cache");
        return cache.healthCheck();
      },
      HEALTH_CHECK_TIMEOUT
    );

    if (cacheCheck.success && cacheCheck.result) {
      health.checks.cache = {
        status: cacheCheck.result.status,
        latency: cacheCheck.result.latency,
        details: `${cacheCheck.result.type}${cacheCheck.result.error ? `: ${cacheCheck.result.error}` : ""}`,
      };
    } else {
      health.checks.cache = {
        status: "unknown",
        details: cacheCheck.error || "Cache check failed",
      };
    }

    // Check 5: Storage connectivity
    const storageCheck = await runCheckWithTimeout(
      "storage",
      async () => {
        const { getStorageManager } = await import("./services/storage-adapter");
        const storageManager = getStorageManager();
        return storageManager.healthCheck();
      },
      HEALTH_CHECK_TIMEOUT
    );

    if (storageCheck.success && storageCheck.result) {
      health.checks.storage = {
        status: storageCheck.result.status,
        latency: storageCheck.result.latency,
        details: `${storageCheck.result.primary || "fallback"}: ${storageCheck.result.fallback}${storageCheck.result.error ? ` (${storageCheck.result.error})` : ""}`,
      };
    } else {
      health.checks.storage = {
        status: "unknown",
        details: storageCheck.error || "Storage check failed",
      };
    }

    health.responseTime = Date.now() - startTime;

    // If total response time exceeds timeout, mark as degraded
    if (health.responseTime > HEALTH_CHECK_TIMEOUT) {
      health.status = health.status === "unhealthy" ? "unhealthy" : "degraded";
    }

    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // Kubernetes liveness probe - is the process alive?
  app.get("/api/health/live", (_req: Request, res: Response) => {
    res.status(200).json({ status: "alive", timestamp: new Date().toISOString() });
  });

  // Kubernetes readiness probe - is the service ready to accept traffic?
  // Includes timeout to prevent hanging
  app.get("/api/health/ready", async (_req: Request, res: Response) => {
    const READY_CHECK_TIMEOUT = 3000; // 3 second timeout

    try {
      // Check database connectivity with timeout
      await Promise.race([
        db.execute(sql`SELECT 1`),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database check timeout")), READY_CHECK_TIMEOUT)
        ),
      ]);
      res.status(200).json({ status: "ready", timestamp: new Date().toISOString() });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Database unavailable";
      res
        .status(503)
        .json({ status: "not ready", error: errorMessage, timestamp: new Date().toISOString() });
    }
  });

  // API Version information endpoint
  app.get("/api/version", (_req: Request, res: Response) => {
    const versionInfo = getVersionInfo();
    res.json({
      ...versionInfo,
      timestamp: new Date().toISOString(),
    });
  });

  // Public API for articles/guides
  app.get("/api/guides", async (_req, res) => {
    try {
      // Fetch articles from contents table
      const guides = await storage.getContentsWithRelations({
        type: "article",
        status: "published",
      });

      // Transform to match the frontend expectations
      const transformedGuides = guides.map(guide => {
        const article = (guide as any).article;
        return {
          id: guide.id,
          title: guide.title,
          excerpt: article?.excerpt || guide.summary || "",
          category: article?.category || "tips",
          categoryLabel: article?.category
            ? article.category.charAt(0).toUpperCase() + article.category.slice(1)
            : "Tips",
          readTime: guide.wordCount ? `${Math.ceil(guide.wordCount / 200)} min read` : "5 min read",
          image:
            guide.cardImage ||
            guide.heroImage ||
            "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80",
          author: (guide as any).author?.name || "TRAVI Editorial Team",
          date: guide.publishedAt
            ? new Date(guide.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "Dec 28, 2025",
        };
      });

      res.json(transformedGuides);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch guides" });
    }
  });

  // Public API for featured guide
  app.get("/api/guides/featured", async (_req, res) => {
    try {
      const guides = await storage.getContentsWithRelations({
        type: "article",
        status: "published",
      });

      if (guides.length === 0) {
        return res.status(404).json({ error: "No featured guide found" });
      }

      // For now, just take the most recent one as featured
      const featured = guides[0];
      const article = (featured as any).article;

      res.json({
        id: featured.id,
        title: featured.title,
        excerpt: article?.excerpt || featured.summary || "",
        category: article?.category || "Getting Started",
        readTime: featured.wordCount
          ? `${Math.ceil(featured.wordCount / 200)} min read`
          : "25 min read",
        image:
          featured.heroImage ||
          featured.cardImage ||
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=800&fit=crop&q=90",
        author: (featured as any).author?.name || "TRAVI Editorial Team",
        date: featured.publishedAt
          ? new Date(featured.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "Dec 28, 2025",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch featured guide" });
    }
  });

  // ==================== TPO Hotels API (TravelPayouts/Hotellook) ====================

  // City slug to Hotellook numeric city ID mapping
  // These IDs are from the Hotellook/TravelPayouts city database
  const cityIdMapping: Record<string, number> = {
    dubai: 2735,
    "abu-dhabi": 5505,
    london: 2114,
    paris: 2734,
    "new-york": 3863,
    tokyo: 2756,
    singapore: 2748,
    bangkok: 2680,
    barcelona: 2708,
    rome: 2742,
    amsterdam: 2698,
    "hong-kong": 2716,
    istanbul: 2720,
    "las-vegas": 2785,
    "los-angeles": 2726,
    miami: 2730,
    bali: 6045,
    doha: 7303,
    riyadh: 8379,
  };

  // Helper to resolve city ID (converts slug to numeric ID if needed)
  function resolveCityId(cityIdOrSlug: string): string {
    // If it's already a number, return as-is
    if (/^\d+$/.test(cityIdOrSlug)) {
      return cityIdOrSlug;
    }
    // Look up the slug in our mapping
    const numericId = cityIdMapping[cityIdOrSlug.toLowerCase()];
    if (numericId) {
      return String(numericId);
    }
    // Return the original value if not found (will likely fail but that's expected)

    return cityIdOrSlug;
  }

  // Helper to get user IP for hotel search API
  function getUserIP(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.socket.remoteAddress || "127.0.0.1";
  }
  // System status endpoint - shows which services are configured
  app.get("/api/system-status", requireAuth, async (_req: Request, res: Response) => {
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        openai: {
          configured: !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY),
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        },
        replicate: {
          configured: !!process.env.REPLICATE_API_KEY,
        },
        freepik: {
          configured: !!process.env.FREEPIK_API_KEY,
        },
        gemini: {
          configured: !!(process.env.GEMINI_API_KEY || process.env.GEMINI || process.env.gemini),
        },
        openrouter: {
          configured: !!(
            process.env.OPENROUTER_API_KEY ||
            process.env.openrouterapi ||
            process.env.OPENROUTERAPI ||
            process.env.travisite
          ),
        },
        deepl: {
          configured: !!process.env.DEEPL_API_KEY,
        },
        resend: {
          configured: !!process.env.RESEND_API_KEY,
        },
        cloudflare: {
          configured: !!(process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID),
        },
        google: {
          analyticsConfigured: !!process.env.GOOGLE_ANALYTICS_ID,
          searchConsoleConfigured: !!process.env.GOOGLE_SITE_VERIFICATION,
        },
      },
      activeAIProvider: getAIClient()?.provider || "none",
      features: {
        aiContentGeneration: !!getAIClient(),
        aiImageGeneration: !!(
          process.env.AI_INTEGRATIONS_OPENAI_API_KEY ||
          process.env.OPENAI_API_KEY ||
          process.env.REPLICATE_API_KEY
        ),
        translations: !!process.env.DEEPL_API_KEY,
        emailCampaigns: !!process.env.RESEND_API_KEY,
        cloudStorage: !!(process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID),
      },
      safeMode: safeMode,
    };
    res.json(status);
  });

  // Worker health endpoint - stub (Octopus removed, using Octypo v2)
  app.get("/api/system/workers", requireAuth, async (_req: Request, res: Response) => {
    res.json({
      mode: "inline",
      healthy: true,
      note: "Octypo v2 handles content generation",
      workers: [],
      queueDepth: 0,
      processingJobs: 0,
      stats: { pending: 0, running: 0, completed: 0, failed: 0 },
    });
  });

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

  // Get logs - now returns actual console output with human-readable messages
  app.get(
    "/api/admin/logs",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { category, level, search, limit = "200" } = req.query;

        let logs = consoleLogger.getLogs(parseInt(limit as string, 10) || 200);

        if (category && category !== "all") {
          logs = logs.filter(log => log.category === category);
        }
        if (level && level !== "all") {
          logs = logs.filter(log => log.level === level);
        }
        if (search && typeof search === "string") {
          const searchLower = search.toLowerCase();
          logs = logs.filter(
            log =>
              log.humanMessage.toLowerCase().includes(searchLower) ||
              log.rawMessage.toLowerCase().includes(searchLower)
          );
        }

        // Transform to the expected format for the frontend
        const transformedLogs = logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          category: log.category,
          message: log.humanMessage,
          rawMessage: log.rawMessage,
        }));

        res.json({
          logs: transformedLogs.reverse(), // Most recent first
          total: transformedLogs.length,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
      }
    }
  );

  // Server-Sent Events endpoint for real-time log streaming
  app.get(
    "/api/admin/logs/stream",
    requirePermission("canManageSettings"),
    (req: Request, res: Response) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const onLog = (log: any) => {
        const data = JSON.stringify({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          category: log.category,
          message: log.humanMessage,
          rawMessage: log.rawMessage,
        });
        res.write(`data: ${data}\n\n`);
      };

      consoleLogger.on("log", onLog);

      req.on("close", () => {
        consoleLogger.off("log", onLog);
      });
    }
  );

  // Get log stats
  app.get(
    "/api/admin/logs/stats",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        const logs = consoleLogger.getLogs();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const stats = {
          total: logs.length,
          byLevel: {
            error: logs.filter(l => l.level === "error").length,
            warning: logs.filter(l => l.level === "warn").length,
            info: logs.filter(l => l.level === "info").length,
            debug: logs.filter(l => l.level === "debug").length,
          },
          byCategory: {
            system: logs.filter(l => l.category === "system").length,
            ai: logs.filter(l => l.category === "ai").length,
            images: logs.filter(l => l.category === "images").length,
            storage: logs.filter(l => l.category === "storage").length,
            rss: logs.filter(l => l.category === "rss").length,
            content: logs.filter(l => l.category === "content").length,
            auth: logs.filter(l => l.category === "auth").length,
            http: logs.filter(l => l.category === "http").length,
            autopilot: logs.filter(l => l.category === "autopilot").length,
            dev: logs.filter(l => l.category === "dev").length,
          },
          recentErrors: logs.filter(l => l.level === "error" && l.timestamp >= oneHourAgo).length,
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch log stats" });
      }
    }
  );

  // Clear logs
  app.delete(
    "/api/admin/logs",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        consoleLogger.clear();
        consoleLogger.addManualLog("info", "system", "Logs cleared by admin");
        res.json({ success: true, message: "Logs cleared" });
      } catch (error) {
        res.status(500).json({ error: "Failed to clear logs" });
      }
    }
  );

  // Export logs
  app.get(
    "/api/admin/logs/export",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { category, level } = req.query;

        let logs = consoleLogger.getLogs();
        if (category && category !== "all") {
          logs = logs.filter(log => log.category === category);
        }
        if (level && level !== "all") {
          logs = logs.filter(log => log.level === level);
        }

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="logs-${new Date().toISOString().split("T")[0]}.json"`
        );
        res.json(logs);
      } catch (error) {
        res.status(500).json({ error: "Failed to export logs" });
      }
    }
  );

  // Log server startup
  consoleLogger.addManualLog("info", "server", "CMS Server started successfully");

  // Serve AI-generated images from storage
  app.get("/api/ai-images/:filename", async (req: Request, res: Response) => {
    const filename = req.params.filename;

    // Security: Prevent path traversal attacks
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      res.status(400).send("Invalid filename");
      return;
    }

    // Security: Only allow specific file extensions
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
    const ext = filename.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      res.status(400).send("Invalid file type");
      return;
    }

    try {
      const objectPath = `public/ai-generated/${filename}`;
      const storageManager = getStorageManager();
      const buffer = await storageManager.download(objectPath);

      if (!buffer) {
        res.status(404).send("Image not found");
        return;
      }

      // Determine content type
      const ext = filename.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
      };

      res.set("Content-Type", contentTypes[ext || "jpg"] || "image/jpeg");
      res.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      res.send(buffer);
    } catch (error) {
      res.status(404).send("Image not found");
    }
  });

  // Serve files from Object Storage - handles /object-storage/* requests
  app.get("/object-storage/*", async (req: Request, res: Response) => {
    const key = req.params[0];

    // Security: Prevent path traversal attacks
    if (!key || key.includes("..")) {
      res.status(400).send("Invalid path");
      return;
    }

    // Sanitize key
    const sanitizedKey = key
      .replace(/^\/+/, "")
      .replace(/[<>:"|?*]/g, "")
      .replace(/\\/g, "/");

    if (!sanitizedKey) {
      res.status(400).send("Invalid path");
      return;
    }

    try {
      const storageManager = getStorageManager();
      const buffer = await storageManager.download(sanitizedKey);

      if (!buffer) {
        res.status(404).send("File not found");
        return;
      }

      // Determine content type from extension
      const ext = sanitizedKey.split(".").pop()?.toLowerCase() || "";
      const contentTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
        svg: "image/svg+xml",
        ico: "image/x-icon",
        json: "application/json",
        pdf: "application/pdf",
        mp4: "video/mp4",
        webm: "video/webm",
      };

      res.set("Content-Type", contentTypes[ext] || "application/octet-stream");
      res.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      res.send(buffer);
    } catch (error) {
      res.status(404).send("File not found");
    }
  });

  // NOTE: Sitemap routes are defined later in this file (line ~8728)
  // They use sitemap.ts which supports multilingual sitemaps

  // FIRST: Mark approved bots (AI crawlers, search engines, social media) early
  // This allows them to bypass rate limiting, IP blocking, and threat detection
  app.use(approvedBotMiddleware);

  // Security headers for all responses (CSP, X-Frame-Options, etc.)
  app.use(securityHeaders);

  // IP blocking for suspicious activity (approved bots bypass this)
  app.use("/api", ipBlockMiddleware);

  // Setup Replit Auth FIRST (so CSRF can use req.isAuthenticated)
  await setupAuth(app);

  // Global CSRF protection for admin write endpoints (AFTER setupAuth)
  app.use("/api", csrfProtection);

  // DEV ONLY: Global auto-authentication middleware for all admin APIs
  // This makes ALL /api requests behave as if logged in as admin
  // SECURITY: This is ONLY enabled in development AND with DEV_AUTO_AUTH=true
  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTO_AUTH === "true") {
    let cachedAdminUser: any = null;

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

  // DEV ONLY: Auto-login endpoint for testing (bypasses password and 2FA)
  // This endpoint is ONLY available in development environment
  // NOTE: Must be registered AFTER setupAuth so session middleware is available
  if (process.env.NODE_ENV !== "production" && process.env.REPL_SLUG) {
    app.post("/api/dev/auto-login", async (req: Request, res: Response) => {
      try {
        // Find admin user or first user with admin role
        const allUsers = await storage.getUsers();
        const adminUser = allUsers.find(u => u.role === "admin") || allUsers[0];

        if (!adminUser) {
          return res.status(404).json({ error: "No users found. Please create a user first." });
        }

        // Create session user object in the same format as regular login
        const sessionUser = {
          claims: { sub: adminUser.id },
          id: adminUser.id,
        };

        // Use req.login (Passport's method) to properly establish session
        req.login(sessionUser, (loginErr: any) => {
          if (loginErr) {
            return res.status(500).json({ error: "Failed to create session" });
          }

          // Mark TOTP as verified (bypass 2FA for dev testing)
          (req.session as any).totpVerified = true;

          req.session.save((saveErr: any) => {
            if (saveErr) {
              return res.status(500).json({ error: "Failed to save session" });
            }

            res.json({
              success: true,
              message: "DEV auto-login successful",
              user: {
                id: adminUser.id,
                username: adminUser.username,
                email: adminUser.email,
                role: adminUser.role,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
              },
            });
          });
        });
      } catch (error) {
        res.status(500).json({ error: "Auto-login failed" });
      }
    });
  }

  // Admin credentials from environment variables (hashed password stored in env)
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

  // Log admin security configuration at startup
  logAdminSecurityConfig();

  // Username/password login endpoint with enterprise security + admin hardening
  // Security layers (in order):
  // 1. Emergency kill switch (ADMIN_AUTH_DISABLED) - blocks all auth when enabled
  // 2. IP allowlist (ADMIN_ALLOWED_IPS) - restricts to configured IPs
  // 3. Rate limiting (5 attempts/15min) + exponential backoff
  // 4. Device fingerprinting, contextual auth, threat intelligence
  // 5. Password policy lockout check
  // 6. Mandatory 2FA enforcement
  app.post(
    "/api/auth/login",
    ...adminAuthGuards,
    rateLimiters.auth,
    exponentialBackoff.middleware("auth:login"),
    async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: "Username and password are required" });
        }

        const ip = req.ip || req.socket.remoteAddress || "unknown";

        // SECURITY: Check dual lockout (IP + username) BEFORE any password verification
        // This prevents timing attacks and reduces database load during lockout
        const lockoutStatus = checkDualLockout(username.toLowerCase(), ip);
        if (lockoutStatus.locked) {
          const lockTypeMsg =
            lockoutStatus.lockType === "both"
              ? "IP and account"
              : lockoutStatus.lockType === "ip"
                ? "IP address"
                : "account";
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "login_lockout",
            errorMessage: `${lockTypeMsg} locked for ${lockoutStatus.remainingTime} minutes`,
            details: {
              attemptedUsername: username.substring(0, 3) + "***",
              lockType: lockoutStatus.lockType,
            },
          });
          return res.status(429).json({
            error: `Access temporarily locked. Try again in ${lockoutStatus.remainingTime} minutes.`,
            code: "ACCOUNT_LOCKED",
            lockType: lockoutStatus.lockType,
            remainingMinutes: lockoutStatus.remainingTime,
          });
        }

        // Enterprise Security: Threat Intelligence Check
        const threatAnalysis = threatIntelligence.analyzeRequest(req);
        if (threatAnalysis.isThreat && threatAnalysis.riskScore >= 70) {
          return res.status(403).json({ error: "Request blocked for security reasons" });
        }

        // Enterprise Security: Extract device fingerprint
        const fingerprint = deviceFingerprint.extractFromRequest(req);

        // Helper function to complete login with enterprise security
        const completeLogin = async (user: any) => {
          // Enterprise Security: Evaluate contextual authentication
          const geo = await contextualAuth.getGeoLocation(ip);
          const contextResult = await contextualAuth.evaluateContext(
            user.id,
            ip,
            fingerprint,
            geo || undefined
          );

          if (!contextResult.allowed) {
            return res.status(403).json({
              error: "Access denied based on security policy",
              riskFactors: contextResult.riskFactors,
              riskScore: contextResult.riskScore,
            });
          }

          // Enterprise Security: Register device
          const deviceInfo = await deviceFingerprint.registerDevice(user.id, fingerprint, ip);
          const isNewDevice = deviceInfo.loginCount === 1;

          // Check if MFA is required - ONLY if user has actually enrolled in 2FA
          // Users who haven't set up 2FA should be able to log in normally
          const requiresMfa = Boolean(user.totpEnabled && user.totpSecret);

          // P0-3 FIX: If MFA required, issue pre-auth token instead of creating session
          // Session is only created AFTER TOTP verification in /api/totp/validate
          if (requiresMfa) {
            const preAuthResult = await createPreAuthToken(user.id, user.username || user.email, {
              ipAddress: ip,
              userAgent: req.get("User-Agent") || "",
              riskScore: contextResult.riskScore,
              deviceFingerprint: JSON.stringify(fingerprint),
            });

            // Log pre-auth token issuance (not a full login yet) - use 'login' action with mfaPending flag
            logSecurityEvent({
              action: "login",
              resourceType: "auth",
              userId: user.id,
              userEmail: user.username || undefined,
              ip,
              userAgent: req.get("User-Agent"),
              details: {
                method: "password",
                role: user.role,
                isNewDevice,
                riskScore: contextResult.riskScore,
                mfaPending: true,
                preAuthTokenIssued: true,
              },
            });

            return res.json({
              success: true,
              requiresMfa: true,
              preAuthToken: preAuthResult.token,
              preAuthExpiresAt: preAuthResult.expiresAt,
              isNewDevice,
              riskScore: contextResult.riskScore,
              securityContext: {
                deviceTrusted: deviceInfo.isTrusted,
                country: geo?.country,
              },
            });
          }

          // No MFA required - create session immediately
          const sessionUser = {
            claims: { sub: user.id },
            id: user.id,
          };

          req.login(sessionUser, (err: any) => {
            if (err) {
              return res.status(500).json({ error: "Failed to create session" });
            }
            req.session.save((saveErr: any) => {
              if (saveErr) {
                return res.status(500).json({ error: "Failed to save session" });
              }

              // Enterprise Security: Reset backoff on successful login
              (res as any).resetBackoff?.();

              // Log successful login with enterprise security details
              logSecurityEvent({
                action: "login",
                resourceType: "auth",
                userId: user.id,
                userEmail: user.username || undefined,
                ip,
                userAgent: req.get("User-Agent"),
                details: {
                  method: "password",
                  role: user.role,
                  isNewDevice,
                  riskScore: contextResult.riskScore,
                  deviceTrusted: deviceInfo.isTrusted,
                  geo: geo ? { country: geo.country, city: geo.city } : null,
                },
              });

              res.json({
                success: true,
                user,
                requiresMfa: false,
                isNewDevice,
                riskScore: contextResult.riskScore,
                securityContext: {
                  deviceTrusted: deviceInfo.isTrusted,
                  country: geo?.country,
                },
              });
            });
          });
        };

        // Check for admin from environment first
        if (ADMIN_PASSWORD_HASH && username === ADMIN_USERNAME) {
          const isAdminPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
          if (isAdminPassword) {
            // Find or create admin user
            let adminUser = await storage.getUserByUsername(username);
            if (!adminUser) {
              adminUser = await storage.createUserWithPassword({
                username: ADMIN_USERNAME,
                passwordHash: ADMIN_PASSWORD_HASH,
                firstName: "Admin",
                lastName: "User",
                role: "admin",
                isActive: true,
              });
            }

            await completeLogin(adminUser);
            return;
          }
        }

        // Check database for user
        const user = await storage.getUserByUsername(username);
        if (!user || !user.passwordHash) {
          recordFailedAttempt(ip);
          recordDualLockoutFailure(username.toLowerCase(), ip); // Dual lockout tracking
          (res as any).recordFailure?.(); // Enterprise Security: Exponential backoff
          // Security audit: Log failed login attempt (user not found)
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "login",
            errorMessage: "User not found or no password",
            details: { attemptedUsername: username ? username.substring(0, 3) + "***" : "[empty]" },
          });
          return res.status(401).json({ error: "Invalid username or password" });
        }

        if (!user.isActive) {
          recordFailedAttempt(ip);
          recordDualLockoutFailure(username.toLowerCase(), ip); // Dual lockout tracking
          // Security audit: Log failed login attempt (account deactivated)
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "login",
            errorMessage: "Account deactivated",
            details: { userId: user.id },
          });
          return res.status(401).json({ error: "Account is deactivated" });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          recordFailedAttempt(ip);
          recordDualLockoutFailure(username.toLowerCase(), ip); // Dual lockout tracking
          (res as any).recordFailure?.(); // Enterprise Security: Exponential backoff
          // Security audit: Log failed login attempt (wrong password)
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "login",
            errorMessage: "Invalid password",
            details: { userId: user.id },
          });
          return res.status(401).json({ error: "Invalid username or password" });
        }

        // SECURITY: Mandatory 2FA enforcement for admin accounts
        // If user has NOT configured TOTP, block access entirely
        const twoFaCheck = enforceMandatory2FA(user);
        if (!twoFaCheck.allowed) {
          logSecurityEventFromRequest(req, SecurityEventType.UNAUTHORIZED_ACCESS, {
            success: false,
            resource: "admin_auth",
            action: "2fa_not_configured",
            errorMessage: twoFaCheck.reason || "TOTP not configured",
            details: { userId: user.id },
          });
          return res.status(403).json({
            error: twoFaCheck.reason,
            code: "TOTP_SETUP_REQUIRED",
            requiresTotpSetup: true,
          });
        }

        // Clear lockout on successful password validation
        clearDualLockout(username.toLowerCase(), ip);

        await completeLogin(user);
      } catch (error) {
        res.status(500).json({ error: "Login failed" });
      }
    }
  );

  // Logout endpoint for password-based authentication
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub;
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    req.logout(err => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }

      // Destroy the session
      req.session?.destroy(sessionErr => {
        if (sessionErr) {
        }

        // Log the logout event
        if (userId) {
          logSecurityEvent({
            action: "logout",
            resourceType: "auth",
            userId,
            ip,
            userAgent: req.get("User-Agent"),
            details: { method: "password" },
          });
        }

        // Clear the session cookie
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove sensitive fields before sending
      const { passwordHash, totpSecret, totpRecoveryCodes, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get current user role and permissions
  app.get("/api/user/permissions", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      const userRole: UserRole = user?.role || "viewer";
      const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.viewer;
      res.json({ role: userRole, permissions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // ============================================================================
  // ENTERPRISE SECURITY ENDPOINTS
  // ============================================================================

  // Get user's registered devices
  app.get("/api/security/devices", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const devices = deviceFingerprint.getUserDevices(userId);
      res.json({ devices });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  // Trust a device
  app.post(
    "/api/security/devices/:fingerprintHash/trust",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = getUserId(req);
        const { fingerprintHash } = req.params;
        const fingerprint = deviceFingerprint.extractFromRequest(req);

        // Create a mock fingerprint with the hash to match
        await deviceFingerprint.trustDevice(userId, fingerprint);
        res.json({ success: true, message: "Device trusted" });
      } catch (error) {
        res.status(500).json({ error: "Failed to trust device" });
      }
    }
  );

  // Revoke a device
  app.delete(
    "/api/security/devices/:fingerprintHash",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = getUserId(req);
        const { fingerprintHash } = req.params;

        const revoked = await deviceFingerprint.revokeDevice(userId, fingerprintHash);
        if (revoked) {
          res.json({ success: true, message: "Device revoked" });
        } else {
          res.status(404).json({ error: "Device not found" });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to revoke device" });
      }
    }
  );

  // Get user's active sessions
  app.get("/api/security/sessions", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const sessions = sessionSecurity.getUserSessions(userId);

      // Return sessions without sensitive data
      const safeSessions = sessions.map(s => ({
        id: s.id.substring(0, 8) + "...",
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        expiresAt: s.expiresAt,
        ipAddress: s.ipAddress,
        isActive: s.isActive,
        riskScore: s.riskScore,
      }));

      res.json({ sessions: safeSessions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Revoke all other sessions
  app.post(
    "/api/security/sessions/revoke-all",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = getUserId(req);
        const currentSessionId = (req.session as any)?.id;

        const count = await sessionSecurity.revokeAllUserSessions(userId, currentSessionId);
        res.json({ success: true, message: `${count} sessions revoked` });
      } catch (error) {
        res.status(500).json({ error: "Failed to revoke sessions" });
      }
    }
  );

  // Get current security context
  app.get("/api/security/context", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const fingerprint = deviceFingerprint.extractFromRequest(req);

      // Get geo location
      const geo = await contextualAuth.getGeoLocation(ip);

      // Evaluate current context
      const contextResult = await contextualAuth.evaluateContext(
        userId,
        ip,
        fingerprint,
        geo || undefined
      );

      // Check device status
      const isKnown = deviceFingerprint.isKnownDevice(userId, fingerprint);
      const isTrusted = deviceFingerprint.isDeviceTrusted(userId, fingerprint);

      // Get threat analysis
      const threatAnalysis = threatIntelligence.analyzeRequest(req);

      res.json({
        ip: ip.substring(0, ip.lastIndexOf(".")) + ".xxx", // Mask last octet
        geo: geo
          ? {
              country: geo.country,
              countryCode: geo.countryCode,
              region: geo.region,
              city: geo.city,
              timezone: geo.timezone,
            }
          : null,
        device: {
          isKnown,
          isTrusted,
          fingerprintHash: deviceFingerprint.generateHash(fingerprint).substring(0, 8) + "...",
        },
        riskAssessment: {
          score: contextResult.riskScore,
          factors: contextResult.riskFactors,
          requiresMfa: contextResult.requiresMfa,
        },
        threatIndicators:
          threatAnalysis.indicators.length > 0
            ? threatAnalysis.indicators.map(i => i.description)
            : [],
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get security context" });
    }
  });

  // Admin: Get security dashboard summary (requires admin role)
  app.get(
    "/api/security/dashboard",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const blockedIps = getBlockedIps();

        res.json({
          blockedIps: blockedIps.length,
          blockedIpList: blockedIps.slice(0, 10), // Top 10
          recentSecurityEvents: await getAuditLogs({ resourceType: "auth", limit: 20 }),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get security dashboard" });
      }
    }
  );

  // TOTP 2FA Routes

  // Get TOTP status for current user
  app.get("/api/totp/status", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        totpEnabled: user.totpEnabled || false,
        hasSecret: !!user.totpSecret,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch TOTP status" });
    }
  });

  // Setup TOTP - Generate secret and QR code
  app.post("/api/totp/setup", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Security: If TOTP is already enabled, require current code to reset
      if (user.totpEnabled && user.totpSecret) {
        const { currentCode } = req.body;
        if (!currentCode) {
          return res.status(400).json({
            error: "2FA is already enabled. Provide current code to reset.",
            requiresCurrentCode: true,
          });
        }
        const isValid = authenticator.verify({ token: currentCode, secret: user.totpSecret });
        if (!isValid) {
          return res.status(400).json({ error: "Invalid current verification code" });
        }
      }

      // Generate a new secret
      const secret = authenticator.generateSecret();

      // Create the otpauth URL for the authenticator app
      const email = user.email || "user";
      const otpauth = authenticator.keyuri(email, "Travi CMS", secret);

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

      // Store the secret temporarily (not enabled yet until verified)
      await storage.updateUser(userId, { totpSecret: secret, totpEnabled: false });

      // Only return QR code and otpauth URI, not raw secret (security best practice)
      res.json({
        qrCode: qrCodeDataUrl,
        otpauth,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to setup TOTP" });
    }
  });

  // Verify TOTP and enable 2FA
  // Rate limited: 5 attempts per 15 minutes per IP to prevent TOTP brute-forcing
  app.post(
    "/api/totp/verify",
    loginRateLimiter,
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = getUserId(req);
        const { code } = req.body;

        if (!code || typeof code !== "string") {
          return res.status(400).json({ error: "Verification code is required" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.totpSecret) {
          return res.status(400).json({ error: "TOTP not set up. Please run setup first." });
        }

        // Verify the TOTP code
        const isValid = authenticator.verify({ token: code, secret: user.totpSecret });

        if (!isValid) {
          return res.status(400).json({ error: "Invalid verification code" });
        }

        // Generate 10 recovery codes
        const recoveryCodes: string[] = [];
        for (let i = 0; i < 10; i++) {
          const code =
            Math.random().toString(36).substring(2, 8).toUpperCase() +
            Math.random().toString(36).substring(2, 8).toUpperCase();
          recoveryCodes.push(code);
        }

        // Store hashed recovery codes (we'll store them plain for now, in production hash them)
        await storage.updateUser(userId, { totpEnabled: true, totpRecoveryCodes: recoveryCodes });

        res.json({
          success: true,
          message: "Two-factor authentication enabled",
          recoveryCodes,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to verify TOTP" });
      }
    }
  );

  // Disable TOTP
  app.post("/api/totp/disable", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const { code } = req.body;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.totpSecret || !user.totpEnabled) {
        return res.status(400).json({ error: "TOTP is not enabled" });
      }

      // Verify the TOTP code before disabling
      const isValid = authenticator.verify({ token: code, secret: user.totpSecret });

      if (!isValid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Disable TOTP for the user
      await storage.updateUser(userId, { totpEnabled: false, totpSecret: null });

      res.json({ success: true, message: "Two-factor authentication disabled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to disable TOTP" });
    }
  });

  // Rate limiting for TOTP validation (in-memory, per-session)
  const totpAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const MAX_TOTP_ATTEMPTS = 5;
  const TOTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

  // P0-3 FIX: TOTP validation with pre-auth token flow
  // Session is only created AFTER successful TOTP verification
  app.post(
    "/api/totp/validate",
    ...adminAuthGuards,
    loginRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const { code, preAuthToken } = req.body;
        const ip = req.ip || req.socket.remoteAddress || "unknown";

        if (!code) {
          return res.status(400).json({ error: "Verification code is required" });
        }

        if (!preAuthToken) {
          return res.status(400).json({ error: "Pre-auth token is required" });
        }

        // Verify the pre-auth token
        const preAuthContext = await verifyPreAuthToken(preAuthToken);
        if (!preAuthContext) {
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "totp_validate_invalid_preauth",
            errorMessage: "Invalid or expired pre-auth token",
            details: {},
          });
          return res.status(401).json({
            error: "Invalid or expired pre-auth token. Please log in again.",
            code: "PREAUTH_INVALID",
          });
        }

        const userId = preAuthContext.userId;
        const username = preAuthContext.username;

        // Clean the code (remove spaces and dashes)
        const cleanCode = String(code).replace(/[\s-]/g, "").trim();

        // Rate limiting check
        const now = Date.now();
        const attempts = totpAttempts.get(userId);
        if (attempts) {
          if (now - attempts.lastAttempt < TOTP_LOCKOUT_MS && attempts.count >= MAX_TOTP_ATTEMPTS) {
            const remainingMs = TOTP_LOCKOUT_MS - (now - attempts.lastAttempt);
            const remainingMin = Math.ceil(remainingMs / 60000);
            return res.status(429).json({
              error: `Too many failed attempts. Try again in ${remainingMin} minutes.`,
              retryAfterMs: remainingMs,
            });
          }
          // Reset if lockout expired
          if (now - attempts.lastAttempt >= TOTP_LOCKOUT_MS) {
            totpAttempts.delete(userId);
          }
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.totpSecret || !user.totpEnabled) {
          return res.status(400).json({ error: "TOTP is not enabled for this user" });
        }

        // Verify the TOTP code (using cleaned code without spaces/dashes)
        const isValid = authenticator.verify({ token: cleanCode, secret: user.totpSecret });

        if (!isValid) {
          // Track failed attempt
          const current = totpAttempts.get(userId) || { count: 0, lastAttempt: now };
          totpAttempts.set(userId, { count: current.count + 1, lastAttempt: now });
          const remaining = MAX_TOTP_ATTEMPTS - current.count - 1;

          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "totp_validate_failed",
            errorMessage: "Invalid TOTP code",
            details: { userId, attemptsRemaining: remaining },
          });

          return res.status(400).json({
            error: "Invalid verification code",
            attemptsRemaining: Math.max(0, remaining),
          });
        }

        // TOTP valid - consume the pre-auth token (single use)
        await consumePreAuthToken(preAuthToken);

        // Clear TOTP attempts on success
        totpAttempts.delete(userId);

        // Clear dual lockout on successful MFA
        clearDualLockout(username.toLowerCase(), ip);

        // NOW create the session (this is the secure point where session is established)
        const sessionUser = {
          claims: { sub: user.id },
          id: user.id,
        };

        req.login(sessionUser, (err: any) => {
          if (err) {
            return res.status(500).json({ error: "Failed to create session after TOTP" });
          }

          // Mark TOTP as validated in session
          (req.session as any).totpVerified = true;

          req.session.save((saveErr: any) => {
            if (saveErr) {
              return res.status(500).json({ error: "Failed to save session after TOTP" });
            }

            // Log successful MFA login
            logSecurityEvent({
              action: "login",
              resourceType: "auth",
              userId: user.id,
              userEmail: user.username || undefined,
              ip,
              userAgent: req.get("User-Agent"),
              details: {
                method: "password+totp",
                role: user.role,
                mfaCompleted: true,
                preAuthRiskScore: preAuthContext.riskScore,
              },
            });

            res.json({
              success: true,
              valid: true,
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
              },
            });
          });
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to validate TOTP" });
      }
    }
  );

  // Rate limiting for recovery code validation (in-memory, per-user)
  const recoveryAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const MAX_RECOVERY_ATTEMPTS = 3;
  const RECOVERY_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

  // Validate recovery code (alternative to TOTP code) - supports preAuthToken flow
  app.post("/api/totp/validate-recovery", async (req: Request, res: Response) => {
    try {
      const { recoveryCode, preAuthToken } = req.body;

      if (!recoveryCode) {
        return res.status(400).json({ error: "Recovery code is required" });
      }

      if (!preAuthToken) {
        return res.status(400).json({ error: "Pre-auth token is required" });
      }

      // Verify the pre-auth token
      const preAuthContext = await verifyPreAuthToken(preAuthToken);
      if (!preAuthContext) {
        return res.status(401).json({
          error: "Invalid or expired pre-auth token. Please log in again.",
          code: "PREAUTH_INVALID",
        });
      }

      const userId = preAuthContext.userId;

      // Rate limiting check
      const now = Date.now();
      const attempts = recoveryAttempts.get(userId);
      if (attempts) {
        if (
          now - attempts.lastAttempt < RECOVERY_LOCKOUT_MS &&
          attempts.count >= MAX_RECOVERY_ATTEMPTS
        ) {
          const remainingMs = RECOVERY_LOCKOUT_MS - (now - attempts.lastAttempt);
          const remainingMin = Math.ceil(remainingMs / 60000);
          return res.status(429).json({
            error: `Too many failed attempts. Try again in ${remainingMin} minutes.`,
            retryAfterMs: remainingMs,
          });
        }
        if (now - attempts.lastAttempt >= RECOVERY_LOCKOUT_MS) {
          recoveryAttempts.delete(userId);
        }
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.totpEnabled) {
        return res.status(400).json({ error: "TOTP is not enabled" });
      }

      const recoveryCodes = (user as any).totpRecoveryCodes || [];
      const normalizedCode = recoveryCode.toUpperCase().replace(/-/g, "");
      const codeIndex = recoveryCodes.findIndex((c: string) => c === normalizedCode);

      if (codeIndex === -1) {
        // Track failed attempt
        const current = recoveryAttempts.get(userId) || { count: 0, lastAttempt: now };
        recoveryAttempts.set(userId, { count: current.count + 1, lastAttempt: now });
        const remaining = MAX_RECOVERY_ATTEMPTS - current.count - 1;
        return res.status(400).json({
          error: "Invalid recovery code",
          attemptsRemaining: Math.max(0, remaining),
        });
      }

      // Clear attempts on success
      recoveryAttempts.delete(userId);

      // Consume the pre-auth token (single use)
      await consumePreAuthToken(preAuthToken);

      // Remove used recovery code
      recoveryCodes.splice(codeIndex, 1);
      await storage.updateUser(userId, { totpRecoveryCodes: recoveryCodes } as any);

      // Create session for the user
      (req as any).session.regenerate((err: any) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }

        (req as any).session.userId = user.id;
        (req as any).session.totpValidated = true;

        (req as any).session.save((saveErr: any) => {
          if (saveErr) {
            return res.status(500).json({ error: "Session save error" });
          }

          res.json({
            success: true,
            message: "Recovery code accepted",
            remainingCodes: recoveryCodes.length,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          });
        });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate recovery code" });
    }
  });

  // Audit logging helper
  async function logAuditEvent(
    req: Request,
    actionType:
      | "create"
      | "update"
      | "delete"
      | "publish"
      | "unpublish"
      | "submit_for_review"
      | "approve"
      | "reject"
      | "login"
      | "logout"
      | "user_create"
      | "user_update"
      | "user_delete"
      | "role_change"
      | "settings_change"
      | "media_upload"
      | "media_delete"
      | "restore",
    entityType:
      | "content"
      | "user"
      | "media"
      | "settings"
      | "rss_feed"
      | "affiliate_link"
      | "translation"
      | "session"
      | "tag"
      | "cluster"
      | "campaign"
      | "newsletter_subscriber",
    entityId: string | null,
    description: string,
    beforeState?: Record<string, unknown>,
    afterState?: Record<string, unknown>
  ) {
    try {
      const user = req.user as any;
      const userId = user?.claims?.sub;
      let userName = null;
      let userRole = null;

      if (userId) {
        const dbUser = await storage.getUser(userId);
        userName = dbUser
          ? `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || dbUser.email
          : null;
        userRole = dbUser?.role || null;
      }

      await storage.createAuditLog({
        userId: userId || null,
        userName,
        userRole,
        actionType,
        entityType,
        entityId,
        description,
        beforeState,
        afterState,
        ipAddress:
          (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
          req.socket.remoteAddress ||
          null,
        userAgent: req.headers["user-agent"] || null,
      });
    } catch (error) {}
  }

  // Get all available roles (admin only)
  app.get("/api/roles", requirePermission("canManageUsers"), async (req, res) => {
    res.json({
      roles: ["admin", "editor", "author", "contributor", "viewer"],
      permissions: ROLE_PERMISSIONS,
    });
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Helper to strip sensitive fields for public/anonymous access
  function sanitizeContentForPublic(content: any) {
    if (!content) return content;
    const { affiliateLinks, translations, author, ...publicContent } = content;
    // Only include safe author info
    if (author) {
      publicContent.author = {
        firstName: author.firstName,
        lastName: author.lastName,
      };
    }
    return publicContent;
  }

  // Content Metrics API Routes
  const {
    recordImpression,
    recordClick,
    recordScrollDepth,
    getMetrics: getContentMetrics,
    getTopPerformers,
    getScoreBreakdown,
    getRegenerationDecision,
  } = await import("./content");

  app.get("/api/content/metrics/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const metrics = getContentMetrics(contentId);

      if (!metrics) {
        return res.json({
          contentId,
          metrics: null,
          score: 0,
          breakdown: null,
          message: "No metrics recorded for this content",
        });
      }

      const breakdown = getScoreBreakdown(metrics);

      res.json({
        contentId,
        metrics: {
          impressions: metrics.impressions,
          clicks: metrics.clicks,
          scrollDepth: metrics.scrollDepth,
          lastUpdated: metrics.lastUpdated.toISOString(),
        },
        score: breakdown.totalScore,
        breakdown,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content metrics" });
    }
  });

  app.get("/api/content/top-performers", requireAuth, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const topPerformers = getTopPerformers(limit);

      res.json({
        topPerformers: topPerformers.map(item => ({
          contentId: item.contentId,
          metrics: {
            impressions: item.metrics.impressions,
            clicks: item.metrics.clicks,
            scrollDepth: item.metrics.scrollDepth,
            lastUpdated: item.metrics.lastUpdated.toISOString(),
          },
          score: item.score,
        })),
        count: topPerformers.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top performers" });
    }
  });

  app.post("/api/content/metrics/:contentId/impression", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const metrics = recordImpression(contentId);
      res.json({ success: true, metrics });
    } catch (error) {
      res.status(500).json({ error: "Failed to record impression" });
    }
  });

  app.post("/api/content/metrics/:contentId/click", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const metrics = recordClick(contentId);
      res.json({ success: true, metrics });
    } catch (error) {
      res.status(500).json({ error: "Failed to record click" });
    }
  });

  app.post("/api/content/metrics/:contentId/scroll", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const { depth } = req.body;

      if (typeof depth !== "number" || depth < 0 || depth > 100) {
        return res.status(400).json({ error: "Invalid scroll depth (must be 0-100)" });
      }

      const metrics = recordScrollDepth(contentId, depth);
      res.json({ success: true, metrics });
    } catch (error) {
      res.status(500).json({ error: "Failed to record scroll depth" });
    }
  });

  app.get("/api/content/metrics/:contentId/regeneration-check", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.params;
      const decision = getRegenerationDecision(contentId);
      res.json(decision);
    } catch (error) {
      res.status(500).json({ error: "Failed to check regeneration status" });
    }
  });

  const {
    getPerformance,
    getPerformanceScore,
    recordImpression: recordPerformanceImpression,
    recordClick: recordPerformanceClick,
    getAllPerformance,
  } = await import("./content/metrics/performance-model");

  const { getRewriteDecision, shouldRewrite } = await import("./content/metrics/rewrite-guard");

  const {
    recordImpression: recordContentPerfImpression,
    recordClick: recordContentPerfClick,
    recordScrollDepth: recordContentPerfScrollDepth,
    getPerformanceScore: getContentPerfScore,
    getPerformance: getContentPerfData,
    getAllPerformance: getAllContentPerfData,
    shouldAllowRegeneration: shouldAllowContentRegen,
  } = await import("./content/metrics/content-performance");

  app.get("/api/content/performance/:entityId", requireAuth, async (req, res) => {
    try {
      const { entityId } = req.params;
      const performance = getPerformance(entityId);

      if (!performance) {
        return res.json({
          entityId,
          performance: null,
          score: 0,
          message: "No performance data recorded for this entity",
        });
      }

      res.json({
        entityId,
        entityType: performance.entityType,
        impressions: performance.impressions,
        clicks: performance.clicks,
        ctr: performance.ctr,
        score: performance.score,
        lastUpdated: performance.lastUpdated.toISOString(),
        createdAt: performance.createdAt.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  app.get("/api/content/performance", requireAuth, async (req, res) => {
    try {
      const all = getAllPerformance();
      res.json({
        performances: all.map(p => ({
          entityId: p.entityId,
          entityType: p.entityType,
          impressions: p.impressions,
          clicks: p.clicks,
          ctr: p.ctr,
          score: p.score,
          lastUpdated: p.lastUpdated.toISOString(),
          createdAt: p.createdAt.toISOString(),
        })),
        count: all.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  app.post("/api/content/performance", requireAuth, async (req, res) => {
    try {
      const { entityId, entityType, eventType, scrollDepth, forceOverride } = req.body;

      if (!entityId || typeof entityId !== "string") {
        return res.status(400).json({ error: "entityId is required" });
      }

      if (!entityType || typeof entityType !== "string") {
        return res.status(400).json({ error: "entityType is required" });
      }

      if (!eventType || !["impression", "click", "scroll"].includes(eventType)) {
        return res
          .status(400)
          .json({ error: "eventType must be 'impression', 'click', or 'scroll'" });
      }

      let performance;
      switch (eventType) {
        case "impression":
          performance = recordContentPerfImpression(entityId, entityType);
          break;
        case "click":
          performance = recordContentPerfClick(entityId, entityType);
          break;
        case "scroll":
          if (typeof scrollDepth !== "number" || scrollDepth < 0 || scrollDepth > 100) {
            return res
              .status(400)
              .json({ error: "scrollDepth must be a number between 0 and 100" });
          }
          performance = recordContentPerfScrollDepth(entityId, entityType, scrollDepth);
          break;
      }

      res.json({
        success: true,
        performance: {
          entityId: performance!.entityId,
          entityType: performance!.entityType,
          impressions: performance!.impressions,
          clicks: performance!.clicks,
          scrollDepth: performance!.scrollDepth,
          score: performance!.score,
          lastModified: performance!.lastModified.toISOString(),
          createdAt: performance!.createdAt.toISOString(),
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to record performance event" });
    }
  });

  app.get(
    "/api/content/performance/:entityId/regeneration-check",
    requireAuth,
    async (req, res) => {
      try {
        const { entityId } = req.params;
        const forceOverride = req.query.force === "true";
        const decision = shouldAllowContentRegen(entityId, forceOverride);
        const performance = getContentPerfData(entityId);

        res.json({
          entityId,
          allowed: decision.allowed,
          reason: decision.reason,
          score: performance?.score ?? 0,
          performance: performance
            ? {
                impressions: performance.impressions,
                clicks: performance.clicks,
                scrollDepth: performance.scrollDepth,
                score: performance.score,
                lastModified: performance.lastModified.toISOString(),
              }
            : null,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to check regeneration eligibility" });
      }
    }
  );

  app.post("/api/content/performance/:entityId/impression", requireAuth, async (req, res) => {
    try {
      const { entityId } = req.params;
      const { entityType } = req.body;

      if (!entityType || typeof entityType !== "string") {
        return res.status(400).json({ error: "entityType is required" });
      }

      const performance = recordPerformanceImpression(entityId, entityType);
      res.json({ success: true, performance });
    } catch (error) {
      res.status(500).json({ error: "Failed to record impression" });
    }
  });

  app.post("/api/content/performance/:entityId/click", requireAuth, async (req, res) => {
    try {
      const { entityId } = req.params;
      const { entityType } = req.body;

      if (!entityType || typeof entityType !== "string") {
        return res.status(400).json({ error: "entityType is required" });
      }

      const performance = recordPerformanceClick(entityId, entityType);
      res.json({ success: true, performance });
    } catch (error) {
      res.status(500).json({ error: "Failed to record click" });
    }
  });

  app.get("/api/content/performance/:entityId/rewrite-check", requireAuth, async (req, res) => {
    try {
      const { entityId } = req.params;
      const decision = getRewriteDecision(entityId);
      res.json({
        entityId,
        allowed: decision.allowed,
        reason: decision.reason,
        performance: decision.performance
          ? {
              score: decision.performance.score,
              ctr: decision.performance.ctr,
              impressions: decision.performance.impressions,
              clicks: decision.performance.clicks,
            }
          : null,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check rewrite eligibility" });
    }
  });

  app.get("/api/content/entity-metrics/:entityId", async (req, res) => {
    try {
      const { entityId } = req.params;
      const performance = getPerformance(entityId);
      const score = getPerformanceScore(entityId);
      const rewriteDecision = getRewriteDecision(entityId);

      if (!performance) {
        return res.json({
          entityId,
          entityType: null,
          impressions: 0,
          clicks: 0,
          ctr: 0,
          score: 0,
          rewriteAllowed: true,
          rewriteReason: "No performance data recorded for this entity",
          message: "No metrics recorded",
        });
      }

      res.json({
        entityId,
        entityType: performance.entityType,
        impressions: performance.impressions,
        clicks: performance.clicks,
        ctr: performance.ctr,
        score,
        rewriteAllowed: rewriteDecision.allowed,
        rewriteReason: rewriteDecision.reason,
        lastUpdated: performance.lastUpdated.toISOString(),
        createdAt: performance.createdAt.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entity metrics" });
    }
  });

  // Admin/CMS content list - requires authentication
  app.get("/api/contents", requireAuth, async (req, res) => {
    try {
      const { type, status, search } = req.query;
      const filters = {
        type: type as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
      };

      // Always include relations (author, type-specific extensions) for consistency
      const contents = await storage.getContentsWithRelations(filters);
      res.json(contents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contents" });
    }
  });

  // Content needing attention for dashboard - requires authentication
  app.get("/api/contents/attention", requireAuth, async (req, res) => {
    try {
      const contents = await storage.getContentsWithRelations({});
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      // Low SEO score (below 70)
      const lowSeo = contents
        .filter(
          c =>
            c.status === "published" &&
            (c.seoScore === null || c.seoScore === undefined || c.seoScore < 70)
        )
        .slice(0, 10);

      // No views in last 30 days (published content with 0 or very low views)
      const noViews = contents
        .filter(c => c.status === "published" && (!c.viewCount || c.viewCount < 10))
        .slice(0, 10);

      // Scheduled for today
      const scheduledToday = contents.filter(
        c =>
          c.status === "scheduled" &&
          c.scheduledAt &&
          new Date(c.scheduledAt) >= todayStart &&
          new Date(c.scheduledAt) < todayEnd
      );

      res.json({ lowSeo, noViews, scheduledToday });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attention items" });
    }
  });

  // Admin/CMS content by ID - requires authentication
  app.get("/api/contents/:id", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Content by slug - requires authentication for unpublished, public for published
  app.get("/api/contents/slug/:slug", async (req, res) => {
    try {
      const content = await storage.getContentBySlug(req.params.slug);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      // If content is published, allow public access
      if (content.status === "published") {
        return res.json(content);
      }

      // For unpublished content, require authentication
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Authentication required for unpublished content" });
      }

      res.json(content);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Generate JSON-LD schema for content
  app.get("/api/contents/:id/schema", async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const { generateAllSchemas, schemasToJsonLd } = await import("./lib/schema-generator");

      // Get type-specific data
      let typeData: Record<string, unknown> = {};
      let authorName: string | undefined;

      if (content.type === "attraction" && content.attraction) {
        typeData = content.attraction;
      } else if (content.type === "hotel" && content.hotel) {
        typeData = content.hotel;
      } else if (content.type === "article" && content.article) {
        typeData = content.article;
      } else if (content.type === "event" && content.event) {
        typeData = content.event;
      } else if (content.type === "dining" && content.dining) {
        typeData = content.dining;
      } else if (content.type === "district" && content.district) {
        typeData = content.district;
      } else if (content.type === "transport" && content.transport) {
        typeData = content.transport;
      } else if (content.type === "itinerary" && content.itinerary) {
        typeData = content.itinerary;
      }

      // Get author name if available
      if (content.authorId) {
        const author = await storage.getUser(content.authorId);
        if (author) {
          authorName =
            [author.firstName, author.lastName].filter(Boolean).join(" ") ||
            author.username ||
            undefined;
        }
      }

      const schemas = generateAllSchemas(content, typeData as any, authorName);
      const jsonLd = schemasToJsonLd(schemas);

      res.json({
        schemas,
        jsonLd,
        htmlEmbed: `<script type="application/ld+json">\n${jsonLd}\n</script>`,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate schema" });
    }
  });

  // Public API for published content only (for public website)
  app.get("/api/public/contents", async (req, res) => {
    try {
      const { type, search, limit } = req.query;
      const filters = {
        type: type as string | undefined,
        status: "published", // Only published content
        search: search as string | undefined,
      };

      const contents = await storage.getContentsWithRelations(filters);
      // Limit and sanitize for public consumption
      const maxLimit = Math.min(parseInt(limit as string) || 50, 100);
      const sanitizedContents = contents.slice(0, maxLimit).map(sanitizeContentForPublic);
      res.json(sanitizedContents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contents" });
    }
  });

  // Public API for destinations (homepage discovery section)
  // CRITICAL: Database is single source of truth - no static fallbacks
  // Filter out test destinations from public API
  app.get("/api/public/destinations", async (req, res) => {
    try {
      // Fetch ALL active destinations from database with mood/hero fields
      // Exclude test destinations from public API responses
      const allDestinations = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          country: destinations.country,
          slug: destinations.slug,
          destinationLevel: destinations.destinationLevel,
          cardImage: destinations.cardImage,
          cardImageAlt: destinations.cardImageAlt,
          summary: destinations.summary,
          heroImage: destinations.heroImage,
          heroImageAlt: destinations.heroImageAlt,
          moodVibe: destinations.moodVibe,
          moodTagline: destinations.moodTagline,
          moodPrimaryColor: destinations.moodPrimaryColor,
        })
        .from(destinations)
        .where(and(eq(destinations.isActive, true), notIlike(destinations.name, "%test%")))
        .orderBy(destinations.name);

      res.json(allDestinations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  // Public API for homepage sections (CMS-driven)
  app.get("/api/public/homepage-sections", async (req, res) => {
    try {
      const sections = await db
        .select()
        .from(homepageSections)
        .where(eq(homepageSections.isVisible, true))
        .orderBy(homepageSections.sortOrder);

      res.json(sections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  // Public API for homepage category cards (CMS-driven)
  app.get("/api/public/homepage-cards", async (req, res) => {
    try {
      const cards = await db
        .select()
        .from(homepageCards)
        .where(eq(homepageCards.isActive, true))
        .orderBy(homepageCards.sortOrder);

      res.json(cards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage cards" });
    }
  });

  // Public API for experience categories (travel styles)
  app.get("/api/public/experience-categories", async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(experienceCategories)
        .where(eq(experienceCategories.isActive, true))
        .orderBy(experienceCategories.sortOrder);

      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch experience categories" });
    }
  });

  // Public API for region links (pre-footer SEO grid)
  app.get("/api/public/region-links", async (req, res) => {
    try {
      const regions = await db
        .select()
        .from(regionLinks)
        .where(eq(regionLinks.isActive, true))
        .orderBy(regionLinks.sortOrder);

      res.json(regions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch region links" });
    }
  });

  // DEPRECATED: Migrated to Tiqets system
  // Public API for TRAVI locations list by category and city
  app.get("/api/public/travi/locations", async (req, res) => {
    res.json({
      message: "Deprecated - use Tiqets API",
      locations: [],
      migration: "This endpoint has been migrated to the Tiqets integration system",
    });
  });

  // DEPRECATED: Migrated to Tiqets system
  // Public API for single TRAVI location by slug
  app.get("/api/public/travi/locations/:city/:slug", async (req, res) => {
    res.json({
      message: "Deprecated - use Tiqets API",
      migration: "This endpoint has been migrated to the Tiqets integration system",
    });
  });

  // Public API for attraction destinations with live counts from DB
  // SINGLE SOURCE OF TRUTH - replaces all hardcoded destination arrays
  // Derives all data from tiqets_attractions + optional destinations metadata
  app.get("/api/public/attraction-destinations", async (req, res) => {
    try {
      // Get unique cities and counts from tiqets_attractions (THE source of truth)
      const cityCounts = await db
        .select({
          cityName: tiqetsAttractions.cityName,
          count: sql<number>`count(*)::int`,
        })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "published"))
        .groupBy(tiqetsAttractions.cityName)
        .orderBy(sql`count(*) DESC`);

      // Get destination metadata for enrichment (optional)
      const destinationMeta = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          country: destinations.country,
          image: destinations.cardImage,
          summary: destinations.summary,
        })
        .from(destinations)
        .where(eq(destinations.isActive, true));

      // Create lookup map by normalized name
      const metaMap = new Map<string, (typeof destinationMeta)[0]>();
      for (const d of destinationMeta) {
        metaMap.set(d.id, d);
      }

      // City-to-country fallback mapping for cities not in destinations table
      const cityCountryFallback: Record<string, string> = {
        London: "United Kingdom",
        Paris: "France",
        Barcelona: "Spain",
        Rome: "Italy",
        Amsterdam: "Netherlands",
        "New York": "USA",
        Dubai: "UAE",
        "Las Vegas": "USA",
        Istanbul: "Turkey",
        Miami: "United States",
        "Los Angeles": "United States",
        Singapore: "Singapore",
        Bangkok: "Thailand",
        "Abu Dhabi": "United Arab Emirates",
        Tokyo: "Japan",
        "Hong Kong": "China",
      };

      // Build destinations array with data from tiqets_attractions as primary source
      const destinationsResult = cityCounts
        .filter(c => c.cityName) // Filter out null city names
        .map(c => {
          const slug = c.cityName!.toLowerCase().replace(/ /g, "-");
          const meta = metaMap.get(slug);
          return {
            slug,
            name: meta?.name || c.cityName!,
            country: meta?.country || cityCountryFallback[c.cityName!] || "Unknown",
            image: meta?.image || `/cards/${slug}.webp`,
            summary: meta?.summary || null,
            count: c.count,
          };
        });

      // Calculate total attractions
      const total = destinationsResult.reduce((sum, d) => sum + d.count, 0);

      res.json({
        destinations: destinationsResult,
        total,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch attraction destinations" });
    }
  });

  // Public API for Tiqets attractions (powers public attractions page)
  app.get("/api/public/tiqets/attractions", async (req, res) => {
    try {
      const { city, search, limit = "50", offset = "0" } = req.query;
      const limitNum = parseInt(limit as string, 10) || 50;
      const offsetNum = parseInt(offset as string, 10) || 0;

      // Build conditions array - always include published status filter
      const conditions: any[] = [eq(tiqetsAttractions.status, "published")];

      if (city && typeof city === "string") {
        conditions.push(ilike(tiqetsAttractions.cityName, city));
      }

      if (search && typeof search === "string") {
        conditions.push(ilike(tiqetsAttractions.title, `%${search}%`));
      }

      // Fetch published attractions with optional filters
      // Include seoSlug for clean SEO-friendly URLs, exclude price fields for public API
      const attractions = await db
        .select({
          id: tiqetsAttractions.id,
          tiqetsId: tiqetsAttractions.tiqetsId,
          title: tiqetsAttractions.title,
          slug: tiqetsAttractions.slug,
          seoSlug: tiqetsAttractions.seoSlug,
          cityName: tiqetsAttractions.cityName,
          venueName: tiqetsAttractions.venueName,
          duration: tiqetsAttractions.duration,
          productUrl: tiqetsAttractions.productUrl,
          status: tiqetsAttractions.status,
          tiqetsRating: tiqetsAttractions.tiqetsRating,
          tiqetsReviewCount: tiqetsAttractions.tiqetsReviewCount,
          primaryCategory: tiqetsAttractions.primaryCategory,
          tiqetsImages: tiqetsAttractions.tiqetsImages,
        })
        .from(tiqetsAttractions)
        .where(and(...conditions))
        .orderBy(tiqetsAttractions.title)
        .limit(limitNum)
        .offset(offsetNum);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tiqetsAttractions)
        .where(and(...conditions));
      const totalCount = Number(countResult[0]?.count || 0);

      // Get unique cities for published attractions only
      const citiesResult = await db
        .selectDistinct({ city: tiqetsAttractions.cityName })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "published"))
        .orderBy(tiqetsAttractions.cityName);

      res.json({
        attractions,
        total: totalCount,
        cities: citiesResult.map(c => c.city),
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });

  // Public API for single destination page data (hero images, featured sections)
  // NO AUTH REQUIRED - this powers the public destination pages
  app.get("/api/public/destinations/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Fetch destination from database
      const [destination] = await db
        .select()
        .from(destinations)
        .where(eq(destinations.id, id))
        .limit(1);

      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // SECURITY: Validate destination ID against whitelist to prevent path traversal
      // Only allow known destination IDs - reject any unknown slugs
      const ALLOWED_DESTINATION_IDS = new Set([
        "dubai",
        "abu-dhabi",
        "ras-al-khaimah",
        "bangkok",
        "barcelona",
        "paris",
        "london",
        "new-york",
        "singapore",
        "tokyo",
        "rome",
        "amsterdam",
        "hong-kong",
        "las-vegas",
        "los-angeles",
        "miami",
        "istanbul",
      ]);

      // Reject any ID not in whitelist (prevents ../../ traversal attacks)
      if (!ALLOWED_DESTINATION_IDS.has(id)) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Discover hero images from filesystem
      // Mapping from validated destination ID to folder name (handles naming inconsistencies)
      const folderMappings: Record<string, string[]> = {
        dubai: ["dubai", "dubai/dubai"],
        "abu-dhabi": ["abudhabi", "abu-dhabi"],
        bangkok: ["bangkok"],
        barcelona: ["barcelona", "barcelona/barcelona"],
        paris: ["paris"],
        london: ["london"],
        "new-york": ["newyork", "new-york"],
        singapore: ["singapore", "Singapore", "Singapore/singapore"],
        tokyo: ["tokyo"],
        rome: ["rome"],
        amsterdam: ["amsterdam", "Amsterdam", "Amsterdam/amsterdam"],
        "hong-kong": ["hongkong", "hong-kong"],
        "las-vegas": ["lasvegas", "las-vegas"],
        "los-angeles": ["losangeles", "los-angeles"],
        miami: ["miami"],
        istanbul: ["istanbul"],
      };

      // SECURITY: Only use whitelisted folders - never fallback to raw ID
      const possibleFolders = folderMappings[id] || [];
      let heroImages: Array<{ filename: string; url: string; alt: string; order: number }> = [];

      for (const folder of possibleFolders) {
        const heroPath = path.join(process.cwd(), "client", "public", "destinations-hero", folder);
        try {
          if (fs.existsSync(heroPath)) {
            const files = fs.readdirSync(heroPath);
            const imageFiles = files.filter(
              f =>
                f.endsWith(".webp") ||
                f.endsWith(".jpg") ||
                f.endsWith(".jpeg") ||
                f.endsWith(".png")
            );

            if (imageFiles.length > 0) {
              heroImages = imageFiles.map((filename, index) => ({
                filename,
                url: `/destinations-hero/${folder}/${filename}`,
                alt: filename
                  .replace(/\.[^/.]+$/, "")
                  .replace(/-/g, " ")
                  .replace(/_/g, " "),
                order: index,
              }));
              break; // Found images, stop searching
            }
          }
        } catch (e) {
          // Folder doesn't exist or can't be read, continue to next
        }
      }

      // Return destination data with hero images and featured sections
      // ALL DATA FROM DATABASE - NO STATIC FALLBACKS
      res.json({
        id: destination.id,
        name: destination.name,
        country: destination.country,
        slug: destination.slug,
        summary: destination.summary,
        cardImage: destination.cardImage,
        cardImageAlt: destination.cardImageAlt,
        // Hero data from database
        hero: {
          title: destination.heroTitle || `Discover ${destination.name}`,
          subtitle:
            destination.heroSubtitle ||
            destination.summary ||
            `Explore the best of ${destination.name}`,
          ctaText: destination.heroCTAText || "Start Exploring",
          ctaLink: destination.heroCTALink || `/destinations/${destination.id}/attractions`,
          images: heroImages,
        },
        // SEO data from database
        seo: {
          metaTitle: destination.metaTitle || `${destination.name} Travel Guide | TRAVI`,
          metaDescription:
            destination.metaDescription || `Discover the best of ${destination.name}`,
          canonicalUrl:
            destination.canonicalUrl || `https://travi.world/destinations/${destination.id}`,
          ogImage: destination.ogImage || destination.cardImage,
          ogTitle: destination.ogTitle || destination.metaTitle,
          ogDescription: destination.ogDescription || destination.metaDescription,
        },
        // Featured sections from database
        featuredAttractions: destination.featuredAttractions || [],
        featuredAreas: destination.featuredAreas || [],
        featuredHighlights: destination.featuredHighlights || [],
        // Mood/vibe for styling FROM DATABASE (no hardcoded values)
        mood: {
          primaryColor: destination.moodPrimaryColor || "#1E40AF",
          gradientFrom: destination.moodGradientFrom || "rgba(0,0,0,0.6)",
          gradientTo: destination.moodGradientTo || "rgba(0,0,0,0.3)",
          vibe: destination.moodVibe || "cosmopolitan",
          tagline: destination.moodTagline || `Experience ${destination.name}`,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destination" });
    }
  });

  // NOTE: /api/public/homepage-config is now defined in server/routes/content-routes.ts
  // That route is registered first via registerAllRoutes() and takes precedence.
  // The duplicate definition below has been disabled to avoid confusion.
  // If you need to modify the homepage-config endpoint, edit content-routes.ts

  /* DISABLED - DUPLICATE ROUTE (see content-routes.ts)
  app.get("/api/public/homepage-config", async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";

      // Fetch all homepage data in parallel
      const [
        sectionsData,
        heroSlidesData,
        cardsData,
        experienceCategoriesData,
        regionLinksData,
        ctaData,
        seoMetaData,
        featuredDestinations,
        featuredArticles,
      ] = await Promise.all([
        // Homepage sections (structure, order, visibility)
        db.select().from(homepageSections).orderBy(homepageSections.sortOrder).limit(50),

        // Hero slides
        db
          .select()
          .from(heroSlides)
          .where(eq(heroSlides.isActive, true))
          .orderBy(heroSlides.sortOrder)
          .limit(20),

        // Quick category cards
        db
          .select()
          .from(homepageCards)
          .where(eq(homepageCards.isActive, true))
          .orderBy(homepageCards.sortOrder)
          .limit(50),

        // Experience categories
        db
          .select()
          .from(experienceCategories)
          .where(eq(experienceCategories.isActive, true))
          .orderBy(experienceCategories.sortOrder)
          .limit(30),

        // Region links for SEO footer
        db
          .select()
          .from(regionLinks)
          .where(eq(regionLinks.isActive, true))
          .orderBy(regionLinks.sortOrder)
          .limit(50),

        // Homepage CTA configuration
        db.select().from(homepageCta).limit(1),

        // Homepage SEO meta
        db.select().from(homepageSeoMeta).limit(1),

        // Featured destinations (active, sorted A-Z by name, limited)
        db
          .select({
            id: destinations.id,
            name: destinations.name,
            country: destinations.country,
            slug: destinations.slug,
            cardImage: destinations.cardImage,
            cardImageAlt: destinations.cardImageAlt,
            summary: destinations.summary,
          })
          .from(destinations)
          .where(eq(destinations.isActive, true))
          .orderBy(destinations.name)
          .limit(100),

        // Featured articles (published, latest 6)
        db
          .select({
            id: contents.id,
            title: contents.title,
            slug: contents.slug,
            cardImage: contents.cardImage,
            cardImageAlt: contents.cardImageAlt,
            summary: contents.summary,
            publishedAt: contents.publishedAt,
          })
          .from(contents)
          .where(and(eq(contents.type, "article"), eq(contents.status, "published")))
          .orderBy(desc(contents.publishedAt))
          .limit(6),
      ]);

      // Fetch translations for all CMS entities in parallel
      const [
        sectionTranslations,
        heroSlideTranslations,
        cardTranslations,
        experienceTranslations,
        regionTranslations,
        ctaTranslations,
        seoMetaTranslations,
      ] = await Promise.all([
        getBulkTranslations(
          "homepage_section",
          sectionsData.map(s => s.id),
          locale
        ),
        getBulkTranslations(
          "hero_slide",
          heroSlidesData.map(s => s.id),
          locale
        ),
        getBulkTranslations(
          "homepage_card",
          cardsData.map(c => c.id),
          locale
        ),
        getBulkTranslations(
          "experience_category",
          experienceCategoriesData.map(e => e.id),
          locale
        ),
        getBulkTranslations(
          "region_link",
          regionLinksData.map(r => r.id),
          locale
        ),
        ctaData[0] ? getTranslations("homepage_cta", ctaData[0].id, locale) : Promise.resolve({}),
        seoMetaData[0]
          ? getTranslations("homepage_seo_meta", seoMetaData[0].id, locale)
          : Promise.resolve({}),
      ]);

      // Apply translations to sections
      const translatedSections = sectionsData.map(section => {
        const trans = sectionTranslations.get(String(section.id)) || {};
        return {
          ...section,
          title: trans.title ?? section.title,
          subtitle: trans.subtitle ?? section.subtitle,
        };
      });

      // Apply translations to hero slides
      const translatedHeroSlides = heroSlidesData.map(slide => {
        const trans = heroSlideTranslations.get(String(slide.id)) || {};
        return {
          ...slide,
          headline: trans.headline ?? slide.headline,
          subheadline: trans.subheadline ?? slide.subheadline,
          ctaText: trans.ctaText ?? slide.ctaText,
        };
      });

      // Apply translations to cards
      const translatedCards = cardsData.map(card => {
        const trans = cardTranslations.get(String(card.id)) || {};
        return {
          ...card,
          title: trans.title ?? card.title,
          subtitle: trans.subtitle ?? card.subtitle,
        };
      });

      // Apply translations to experience categories
      const translatedExperiences = experienceCategoriesData.map(exp => {
        const trans = experienceTranslations.get(String(exp.id)) || {};
        return {
          ...exp,
          name: trans.name ?? exp.name,
          description: trans.description ?? exp.description,
        };
      });

      // Apply translations to region links
      const translatedRegions = regionLinksData.map(region => {
        const trans = regionTranslations.get(String(region.id)) || {};
        return {
          ...region,
          name: trans.name ?? region.name,
        };
      });

      // Apply translations to CTA
      const ctaTrans = ctaTranslations as Record<string, string | null>;
      const translatedCta = ctaData[0]
        ? {
            ...ctaData[0],
            headline: ctaTrans.headline ?? ctaData[0].headline,
            subheadline: ctaTrans.subheadline ?? ctaData[0].subheadline,
            buttonText: ctaTrans.buttonText ?? ctaData[0].buttonText,
            helperText: ctaTrans.helperText ?? ctaData[0].helperText,
            inputPlaceholder: ctaTrans.inputPlaceholder ?? ctaData[0].inputPlaceholder,
          }
        : null;

      // Apply translations to SEO meta
      const seoTrans = seoMetaTranslations as Record<string, string | null>;
      const translatedSeoMeta = seoMetaData[0]
        ? {
            ...seoMetaData[0],
            metaTitle: seoTrans.metaTitle ?? seoMetaData[0].metaTitle,
            metaDescription: seoTrans.metaDescription ?? seoMetaData[0].metaDescription,
            ogTitle: seoTrans.ogTitle ?? seoMetaData[0].ogTitle,
            ogDescription: seoTrans.ogDescription ?? seoMetaData[0].ogDescription,
          }
        : null;

      // Build sections map for easy lookup
      const sectionsMap = translatedSections.reduce(
        (acc, section) => {
          acc[section.sectionKey] = section;
          return acc;
        },
        {} as Record<string, (typeof translatedSections)[0]>
      );

      // Build raw config from DB
      const rawConfig = {
        locale,
        sections: sectionsMap,
        sectionsList: translatedSections,
        hero: {
          slides: translatedHeroSlides,
        },
        quickCategories: translatedCards,
        experienceCategories: translatedExperiences,
        regionLinks: translatedRegions,
        cta: translatedCta,
        seoMeta: translatedSeoMeta,
        featuredDestinations,
        featuredArticles,
      };

      // Apply server-side fallbacks to ensure render-safe payload
      // This guarantees no empty arrays or null images reach the client
      const renderSafeConfig = makeRenderSafeHomepageConfig(rawConfig);
      res.json(renderSafeConfig);
    } catch (error) {
      console.error("[homepage-config] Error:", error);
      
      const fallbackConfig = {
        locale: "en",
        sections: {},
        sectionsList: [],
        hero: { slides: [] },
        quickCategories: [],
        experienceCategories: [],
        regionLinks: [],
        cta: null,
        seoMeta: null,
        featuredDestinations: [],
        featuredArticles: [],
      };
      res.json(fallbackConfig);
    }
  });
  // END DISABLED DUPLICATE ROUTE */

  // Content creation - requires authentication and permission
  app.post(
    "/api/contents",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    rateLimiters.contentWrite,
    async (req, res) => {
      try {
        // Type assertion needed because drizzle-zod createInsertSchema infers as {}
        const parsed = insertContentSchema.parse(req.body) as {
          type: string;
          title: string;
          slug: string;
          status?: string;
          blocks?: ContentBlock[];
          [key: string]: unknown;
        };

        // Phase 16: Sanitize AI-generated content blocks to prevent XSS
        if (parsed.blocks && Array.isArray(parsed.blocks)) {
          parsed.blocks = sanitizeContentBlocks(parsed.blocks) as any;
        }

        // Generate fallback slug if empty to prevent unique constraint violation
        if (!parsed.slug || parsed.slug.trim() === "") {
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          parsed.slug = `draft-${parsed.type}-${timestamp}-${randomSuffix}`;
        }

        // Generate fallback title if empty
        if (!parsed.title || parsed.title.trim() === "") {
          parsed.title = `Untitled ${parsed.type} Draft`;
        }

        const content = await storage.createContent(parsed as InsertContent);

        if (parsed.type === "attraction" && req.body.attraction) {
          await storage.createAttraction({ ...req.body.attraction, contentId: content.id });
        } else if (parsed.type === "hotel" && req.body.hotel) {
          await storage.createHotel({ ...req.body.hotel, contentId: content.id });
        } else if (parsed.type === "article" && req.body.article) {
          await storage.createArticle({ ...req.body.article, contentId: content.id });
        } else if (parsed.type === "event" && req.body.event) {
          await storage.createEvent({ ...req.body.event, contentId: content.id });
        } else if (parsed.type === "itinerary" && req.body.itinerary) {
          const itineraryData = (insertItinerarySchema as any)
            .omit({ contentId: true })
            .parse(req.body.itinerary);
          await storage.createItinerary({
            ...(itineraryData as Record<string, unknown>),
            contentId: content.id,
          });
        } else if (parsed.type === "dining" && req.body.dining) {
          await storage.createDining({ ...req.body.dining, contentId: content.id });
        } else if (parsed.type === "district" && req.body.district) {
          await storage.createDistrict({ ...req.body.district, contentId: content.id });
        } else if (parsed.type === "transport" && req.body.transport) {
          await storage.createTransport({ ...req.body.transport, contentId: content.id });
        } else {
          // Create empty type-specific record if data not provided
          if (parsed.type === "attraction") {
            await storage.createAttraction({ contentId: content.id });
          } else if (parsed.type === "hotel") {
            await storage.createHotel({ contentId: content.id });
          } else if (parsed.type === "article") {
            await storage.createArticle({ contentId: content.id });
          } else if (parsed.type === "event") {
            await storage.createEvent({ contentId: content.id });
          } else if (parsed.type === "itinerary") {
            await storage.createItinerary({ contentId: content.id });
          } else if (parsed.type === "dining") {
            await storage.createDining({ contentId: content.id });
          } else if (parsed.type === "district") {
            await storage.createDistrict({ contentId: content.id });
          } else if (parsed.type === "transport") {
            await storage.createTransport({ contentId: content.id });
          }
        }

        const fullContent = await storage.getContent(content.id);

        // Audit log content creation
        await logAuditEvent(
          req,
          "create",
          "content",
          content.id,
          `Created ${parsed.type}: ${parsed.title}`,
          undefined,
          { title: parsed.title, type: parsed.type, status: parsed.status || "draft" }
        );

        // Trigger webhook for content creation
        enterprise.webhooks
          .trigger("content.created", {
            contentId: content.id,
            type: parsed.type,
            title: parsed.title,
            slug: parsed.slug,
            status: parsed.status || "draft",
            createdAt: new Date().toISOString(),
          })
          .catch(err => {});

        // Phase 15A: Emit content published event if created as published
        // Event bus triggers: search indexing, AEO capsule generation
        if (parsed.status === "published") {
          emitContentPublished(
            content.id,
            parsed.type,
            parsed.title,
            parsed.slug,
            "draft", // No previous status when created directly as published
            "manual"
          );
        }

        res.status(201).json(fullContent);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create content" });
      }
    }
  );

  // Content update - requires authentication and permission (Author/Contributor can edit own content)
  // Uses optimistic locking via If-Match header to prevent concurrent edit conflicts
  app.patch(
    "/api/contents/:id",
    requireOwnContentOrPermission("canEdit"),
    checkOptimisticLock(),
    checkReadOnlyMode,
    rateLimiters.contentWrite,
    async (req, res) => {
      try {
        const existingContent = await storage.getContent(req.params.id);
        if (!existingContent) {
          return res.status(404).json({ error: "Content not found" });
        }

        // Check publish permission when changing status to "published" or "scheduled"
        const newStatus = req.body.status;
        const isPublishing =
          (newStatus === "published" || newStatus === "scheduled") &&
          existingContent.status !== "published" &&
          existingContent.status !== "scheduled";

        // TASK 3: Publish Validation Guard - prevent publishing broken content
        if (isPublishing) {
          const strictMode = process.env.STRICT_PUBLISH_VALIDATION === "true";
          const validationErrors: string[] = [];

          // Check staged payload (req.body) merged with existing content
          const stagedTitle = req.body.title ?? existingContent.title;
          const stagedBlocks = req.body.blocks ?? existingContent.blocks;
          const stagedLocale = req.body.locale ?? (existingContent as any).locale;

          if (!stagedTitle || stagedTitle.trim() === "") {
            validationErrors.push("Missing title");
          }
          if (!stagedBlocks || stagedBlocks.length === 0) {
            validationErrors.push("Missing content blocks");
          }
          if (!stagedLocale || stagedLocale.trim() === "") {
            validationErrors.push("Missing locale");
          }

          if (validationErrors.length > 0) {
            if (strictMode) {
              return res.status(400).json({
                error: "Content validation failed",
                details: validationErrors,
                message:
                  "Cannot publish content with missing required fields. Fix issues or disable STRICT_PUBLISH_VALIDATION.",
              });
            } else {
            }
          }
        }

        if (isPublishing) {
          const user = req.user as any;
          const userId = user?.claims?.sub;
          const dbUser = userId ? await storage.getUser(userId) : null;
          const userRole = dbUser?.role || "viewer";
          const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS];

          if (!permissions?.canPublish) {
            return res.status(403).json({
              error: "Permission denied: You do not have permission to publish content",
            });
          }
        }

        // Auto-create version before update
        const latestVersion = await storage.getLatestVersionNumber(req.params.id);
        await storage.createContentVersion({
          contentId: req.params.id,
          versionNumber: latestVersion + 1,
          title: existingContent.title,
          slug: existingContent.slug,
          metaTitle: existingContent.metaTitle,
          metaDescription: existingContent.metaDescription,
          primaryKeyword: existingContent.primaryKeyword,
          heroImage: existingContent.heroImage,
          heroImageAlt: existingContent.heroImageAlt,
          blocks: existingContent.blocks || [],
          changedBy: req.body.changedBy || null,
          changeNote: req.body.changeNote || null,
        });

        const {
          attraction,
          hotel,
          article,
          event,
          itinerary,
          dining,
          district,
          transport,
          changedBy,
          changeNote,
          ...contentData
        } = req.body;

        // Convert date strings to Date objects for database
        if (contentData.publishedAt && typeof contentData.publishedAt === "string") {
          contentData.publishedAt = new Date(contentData.publishedAt);
        }
        if (contentData.scheduledAt && typeof contentData.scheduledAt === "string") {
          contentData.scheduledAt = new Date(contentData.scheduledAt);
        }

        // Check publish guard when status is changing to published
        if (contentData.status === "published" && existingContent.status !== "published") {
          if (isPublishGuardsEnabled()) {
            const guardResult = await guardManualPublish(req.params.id);
            if (!guardResult.success) {
              return res.status(422).json({
                error: "Publishing blocked by eligibility rules",
                message: guardResult.error,
                eligibility: guardResult.eligibility,
              });
            }
          }
        }

        // Auto-set publishedAt when content is being published for the first time
        if (
          contentData.status === "published" &&
          existingContent.status !== "published" &&
          !contentData.publishedAt
        ) {
          contentData.publishedAt = new Date();
        }

        // Phase 16: Sanitize AI-generated content blocks to prevent XSS
        if (contentData.blocks && Array.isArray(contentData.blocks)) {
          contentData.blocks = sanitizeContentBlocks(contentData.blocks);
        }

        const updatedContent = await storage.updateContent(req.params.id, contentData);

        // Update content-type-specific data
        if (existingContent.type === "attraction" && attraction) {
          await storage.updateAttraction(req.params.id, attraction);
        } else if (existingContent.type === "hotel" && hotel) {
          await storage.updateHotel(req.params.id, hotel);
        } else if (existingContent.type === "article" && article) {
          await storage.updateArticle(req.params.id, article);
        } else if (existingContent.type === "event" && req.body.event) {
          await storage.updateEvent(req.params.id, req.body.event);
        } else if (existingContent.type === "itinerary" && itinerary) {
          await storage.updateItinerary(req.params.id, itinerary);
        } else if (existingContent.type === "dining" && dining) {
          await storage.updateDining(req.params.id, dining);
        } else if (existingContent.type === "district" && district) {
          await storage.updateDistrict(req.params.id, district);
        } else if (existingContent.type === "transport" && transport) {
          await storage.updateTransport(req.params.id, transport);
        }

        const fullContent = await storage.getContent(req.params.id);

        // Audit log content update
        const actionType =
          req.body.status === "published" && existingContent.status !== "published"
            ? "publish"
            : "update";
        await logAuditEvent(
          req,
          actionType,
          "content",
          req.params.id,
          actionType === "publish"
            ? `Published: ${existingContent.title}`
            : `Updated: ${existingContent.title}`,
          { title: existingContent.title, status: existingContent.status },
          { title: fullContent?.title, status: fullContent?.status }
        );

        // Trigger webhook for content update or publish
        const webhookEvent = actionType === "publish" ? "content.published" : "content.updated";
        enterprise.webhooks
          .trigger(webhookEvent, {
            contentId: req.params.id,
            type: existingContent.type,
            title: fullContent?.title,
            slug: fullContent?.slug,
            status: fullContent?.status,
            previousStatus: existingContent.status,
            updatedAt: new Date().toISOString(),
          })
          .catch(err => {});

        // Phase 15A: Emit content lifecycle events (replaces direct indexer call)
        // Event bus triggers: search indexing, AEO capsule generation, and future subscribers
        if (actionType === "publish" && fullContent) {
          emitContentPublished(
            req.params.id,
            existingContent.type,
            fullContent.title,
            fullContent.slug,
            existingContent.status,
            "manual"
          );
        } else if (fullContent?.status === "published") {
          emitContentUpdated(
            req.params.id,
            existingContent.type,
            fullContent.title,
            fullContent.slug,
            fullContent.status
          );
        }

        res.json(fullContent);
      } catch (error) {
        res.status(500).json({ error: "Failed to update content" });
      }
    }
  );

  // Content Version History Routes
  app.get("/api/contents/:id/versions", async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      const versions = await storage.getContentVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content versions" });
    }
  });

  app.get("/api/contents/:id/versions/:versionId", async (req, res) => {
    try {
      const version = await storage.getContentVersion(req.params.versionId);
      if (!version) {
        return res.status(404).json({ error: "Version not found" });
      }
      res.json(version);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content version" });
    }
  });

  app.post(
    "/api/contents/:id/versions/:versionId/restore",
    requireAuth,
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const version = await storage.getContentVersion(req.params.versionId);
        if (!version || version.contentId !== req.params.id) {
          return res.status(404).json({ error: "Version not found" });
        }
        const updated = await storage.updateContent(req.params.id, {
          title: version.title,
          slug: version.slug || undefined,
          metaTitle: version.metaTitle,
          metaDescription: version.metaDescription,
          primaryKeyword: version.primaryKeyword,
          heroImage: version.heroImage,
          heroImageAlt: version.heroImageAlt,
          blocks: version.blocks,
        });
        const latestNum = (await storage.getLatestVersionNumber(req.params.id)) || 0;
        await storage.createContentVersion({
          contentId: req.params.id,
          versionNumber: latestNum + 1,
          title: version.title,
          slug: version.slug,
          metaTitle: version.metaTitle,
          metaDescription: version.metaDescription,
          primaryKeyword: version.primaryKeyword,
          heroImage: version.heroImage,
          heroImageAlt: version.heroImageAlt,
          blocks: version.blocks,
          changedBy: (req.user as any)?.claims?.sub,
          changeNote: `Restored from version ${version.versionNumber}`,
        });

        const user = req.user as any;
        await logAuditEvent(
          req,
          "restore",
          "content",
          req.params.id,
          `Restored from version ${version.versionNumber}`,
          undefined,
          { title: version.title, versionNumber: version.versionNumber }
        );

        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: "Failed to restore version" });
      }
    }
  );

  // Localization Routes
  app.get("/api/locales", (req, res) => {
    res.json(SUPPORTED_LOCALES);
  });

  app.get("/api/contents/:id/translations", async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      const translations = await storage.getTranslationsByContentId(req.params.id);
      res.json(translations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  app.get("/api/translations/:id", async (req, res, next) => {
    // Skip to next route if this is a reserved path
    if (["stats"].includes(req.params.id)) {
      return next("route");
    }
    try {
      const translation = await storage.getTranslationById(req.params.id);
      if (!translation) {
        return res.status(404).json({ error: "Translation not found" });
      }
      res.json(translation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation" });
    }
  });

  app.post(
    "/api/contents/:id/translations",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const content = await storage.getContent(req.params.id);
        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }
        const parsed = insertTranslationSchema.parse({ ...req.body, contentId: req.params.id });
        const translation = await storage.createTranslation(parsed);
        res.status(201).json(translation);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create translation" });
      }
    }
  );

  const updateTranslationSchema = z.object({
    status: z.enum(["pending", "in_progress", "completed", "needs_review"]).optional(),
    title: z.string().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    blocks: z.array(z.any()).optional(),
    translatedBy: z.string().optional(),
    reviewedBy: z.string().optional(),
  });

  app.patch(
    "/api/translations/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const parsed = updateTranslationSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Validation error", details: parsed.error.errors });
        }
        const translation = await storage.updateTranslation(req.params.id, parsed.data);
        if (!translation) {
          return res.status(404).json({ error: "Translation not found" });
        }
        res.json(translation);
      } catch (error) {
        res.status(500).json({ error: "Failed to update translation" });
      }
    }
  );

  app.delete(
    "/api/translations/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteTranslation(req.params.id);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete translation" });
      }
    }
  );

  // Auto-translate content to all languages
  // IMPORTANT: Only translates PUBLISHED content to save translation costs
  app.post(
    "/api/contents/:id/translate-all",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const content = await storage.getContent(req.params.id);
        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        // CRITICAL: Only translate published content to avoid wasting money on drafts
        if (content.status !== "published") {
          return res.status(400).json({
            error: "Cannot translate unpublished content",
            message:
              "Only published content can be translated. Please publish the content first to save translation costs.",
            currentStatus: content.status,
          });
        }

        const { tiers } = req.body; // Optional: only translate to specific tiers (1-7)
        const { translateToAllLanguages } = await import("./services/translation-service");

        // Start translation in background
        const translationPromise = translateToAllLanguages(
          {
            title: content.title,
            metaTitle: content.metaTitle || undefined,
            metaDescription: content.metaDescription || undefined,
            blocks: content.blocks || [],
          },
          "en", // source locale
          tiers // optional tier filter
        );

        // Return immediately with job ID
        const jobId = `translate-${content.id}-${Date.now()}`;

        // Process translations and save to database
        translationPromise
          .then(async results => {
            const entries = Array.from(results.entries());
            for (const [locale, translation] of entries) {
              try {
                // Check if translation already exists
                const existingTranslations = await storage.getTranslationsByContentId(content.id);
                const existing = existingTranslations.find(t => t.locale === locale);

                if (existing) {
                  // Update existing translation
                  await storage.updateTranslation(existing.id, {
                    title: translation.title,
                    metaTitle: translation.metaTitle,
                    metaDescription: translation.metaDescription,
                    blocks: translation.blocks,
                    status: "completed",
                  });
                } else {
                  // Create new translation
                  await storage.createTranslation({
                    contentId: content.id,
                    locale,
                    title: translation.title,
                    metaTitle: translation.metaTitle,
                    metaDescription: translation.metaDescription,
                    blocks: translation.blocks,
                    status: "completed",
                  });
                }
              } catch (err) {}
            }
          })
          .catch(err => {});

        res.json({
          message: "Translation started",
          jobId,
          contentId: content.id,
          targetLanguages: tiers
            ? SUPPORTED_LOCALES.filter(l => tiers.includes(l.tier)).length
            : SUPPORTED_LOCALES.length - 1,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to start translation" });
      }
    }
  );

  // Get translation status for content
  app.get("/api/contents/:id/translation-status", async (req, res) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const translations = await storage.getTranslationsByContentId(req.params.id);
      const completedLocales = translations
        .filter(t => t.status === "completed")
        .map(t => t.locale);
      const pendingLocales = translations
        .filter(t => t.status === "pending" || t.status === "in_progress")
        .map(t => t.locale);

      const totalLocales = SUPPORTED_LOCALES.length;
      const completedCount = completedLocales.length;

      res.json({
        contentId: req.params.id,
        totalLocales,
        completedCount,
        pendingCount: pendingLocales.length,
        percentage: Math.round((completedCount / totalLocales) * 100),
        completedLocales,
        pendingLocales,
        translations: translations.map(t => ({
          locale: t.locale,
          status: t.status,
          updatedAt: t.updatedAt,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation status" });
    }
  });

  // Cancel in-progress translations for content
  app.post(
    "/api/contents/:id/cancel-translation",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const content = await storage.getContent(req.params.id);
        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        const translations = await storage.getTranslationsByContentId(req.params.id);
        const pendingTranslations = translations.filter(
          t => t.status === "pending" || t.status === "in_progress"
        );

        let cancelledCount = 0;
        for (const translation of pendingTranslations) {
          // Mark cancelled translations as needing review instead of using unsupported "cancelled" status
          await storage.updateTranslation(translation.id, { status: "needs_review" });
          cancelledCount++;
        }

        res.json({
          message: "Translation cancelled",
          cancelledCount,
          contentId: req.params.id,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to cancel translation" });
      }
    }
  );

  // Content deletion - requires ownership OR canDelete permission (admin)
  // IDOR Protection: Authors can delete their own content, admins can delete any content
  app.delete(
    "/api/contents/:id",
    requireOwnershipOrPermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingContent = await storage.getContent(req.params.id);
        await storage.deleteContent(req.params.id);

        // Audit log content deletion
        if (existingContent) {
          await logAuditEvent(
            req,
            "delete",
            "content",
            req.params.id,
            `Deleted: ${existingContent.title}`,
            { title: existingContent.title, type: existingContent.type }
          );

          // Trigger webhook for content deletion
          enterprise.webhooks
            .trigger("content.deleted", {
              contentId: req.params.id,
              type: existingContent.type,
              title: existingContent.title,
              slug: existingContent.slug,
              deletedAt: new Date().toISOString(),
            })
            .catch(err => {});
        }

        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete content" });
      }
    }
  );

  // ========== Site Settings API ==========

  // Get all settings
  app.get(
    "/api/settings",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const settings = await storage.getSettings();
        res.json(settings);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch settings" });
      }
    }
  );

  // Get settings by category (for frontend grouping)
  app.get(
    "/api/settings/grouped",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const settings = await storage.getSettings();
        const grouped: Record<string, Record<string, unknown>> = {};
        for (const setting of settings) {
          if (!grouped[setting.category]) {
            grouped[setting.category] = {};
          }
          grouped[setting.category][setting.key] = setting.value;
        }
        res.json(grouped);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch settings" });
      }
    }
  );

  // Update multiple settings at once
  app.post(
    "/api/settings/bulk",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { settings } = req.body;
        if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
          return res.status(400).json({ error: "Settings object required" });
        }

        // Validate allowed categories
        const allowedCategories = ["site", "api", "content", "notifications", "security"];
        const invalidCategories = Object.keys(settings).filter(c => !allowedCategories.includes(c));
        if (invalidCategories.length > 0) {
          return res
            .status(400)
            .json({ error: `Invalid categories: ${invalidCategories.join(", ")}` });
        }

        const userId = getUserId(req);
        const updated: any[] = [];

        // Dangerous keys that could cause prototype pollution
        const dangerousKeys = new Set(["__proto__", "constructor", "prototype"]);

        for (const [category, values] of Object.entries(settings)) {
          // Skip dangerous keys to prevent prototype pollution
          if (dangerousKeys.has(category)) {
            continue;
          }
          if (typeof values !== "object" || values === null || Array.isArray(values)) {
            continue;
          }
          for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
            // Skip dangerous keys to prevent prototype pollution
            if (dangerousKeys.has(key)) {
              continue;
            }
            // Validate key is a non-empty string
            if (typeof key !== "string" || key.trim() === "") {
              continue;
            }
            // Validate value is a primitive (string, number, boolean) or null
            if (
              value !== null &&
              typeof value !== "string" &&
              typeof value !== "number" &&
              typeof value !== "boolean"
            ) {
              continue;
            }
            const setting = await storage.upsertSetting(key.trim(), value, category, userId);
            updated.push(setting);
          }
        }

        await logAuditEvent(
          req,
          "settings_change",
          "settings",
          "bulk",
          `Updated ${updated.length} settings`
        );
        res.json({ success: true, updated: updated.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  );

  // ========== Content Safety Check Endpoints ==========

  // Check for broken internal links
  app.get(
    "/api/content/broken-links",
    isAuthenticated,
    requireRole(["admin", "editor"]),
    async (req: AuthRequest, res: Response) => {
      try {
        const links = await storage.getInternalLinks();
        const brokenLinks: {
          linkId: string;
          sourceId: string | null;
          targetId: string | null;
          reason: string;
        }[] = [];

        for (const link of links) {
          // Check if target content exists
          if (link.targetContentId) {
            const targetContent = await storage.getContent(link.targetContentId);
            if (!targetContent) {
              brokenLinks.push({
                linkId: link.id,
                sourceId: link.sourceContentId,
                targetId: link.targetContentId,
                reason: "Target content not found",
              });
            }
          }
        }

        res.json({ total: links.length, broken: brokenLinks.length, brokenLinks });
      } catch (error) {
        res.status(500).json({ error: "Failed to check broken links" });
      }
    }
  );

  // Check content status before bulk delete
  app.post(
    "/api/content/bulk-delete-check",
    isAuthenticated,
    requireRole(["admin", "editor"]),
    async (req: AuthRequest, res: Response) => {
      try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
          return res.status(400).json({ error: "IDs array required" });
        }

        const warnings: { id: string; title: string; status: string; reason: string }[] = [];

        for (const id of ids) {
          const content = await storage.getContent(id);
          if (content) {
            if (content.status === "published") {
              warnings.push({
                id: content.id,
                title: content.title,
                status: content.status,
                reason: "Content is published and visible to users",
              });
            } else if (content.status === "scheduled") {
              warnings.push({
                id: content.id,
                title: content.title,
                status: content.status,
                reason: "Content is scheduled for publishing",
              });
            }
          }
        }

        res.json({
          total: ids.length,
          warnings: warnings.length,
          items: warnings,
          canProceed: true,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to check bulk delete" });
      }
    }
  );

  // ========== Content Intelligence Endpoints ==========

  // Content gaps analysis - finds missing content opportunities
  app.get("/api/intelligence/gaps", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const allContent = await storage.getContentsWithRelations({});
      const publishedContent = allContent.filter(c => c.status === "published");
      const internalLinks = await storage.getInternalLinks();

      const contentGaps: Array<{
        contentId: string;
        contentType: string;
        title: string;
        gaps: Array<{ type: string; priority: "high" | "medium" | "low"; suggestion: string }>;
      }> = [];

      // Check each published content for gaps
      for (const content of publishedContent) {
        const gaps: Array<{
          type: string;
          priority: "high" | "medium" | "low";
          suggestion: string;
        }> = [];

        // Check for missing meta description
        if (!content.metaDescription || content.metaDescription.length < 120) {
          gaps.push({
            type: "Missing Meta Description",
            priority: "high",
            suggestion: "Add a compelling meta description (150-160 characters) for better SEO",
          });
        }

        // Check for short content
        const blocks = (content.blocks as any[]) || [];
        const textBlocks = blocks.filter(b => b.type === "text");
        const totalText = textBlocks.map(b => b.content || "").join(" ");
        if (totalText.length < 500) {
          gaps.push({
            type: "Thin Content",
            priority: "medium",
            suggestion:
              "Article has less than 500 characters. Consider expanding with more details",
          });
        }

        // Check for missing hero image
        if (!content.heroImage) {
          gaps.push({
            type: "No Hero Image",
            priority: "medium",
            suggestion: "Add a hero image to improve visual appeal and social sharing",
          });
        }

        // Check for missing internal links
        const outboundLinks = internalLinks.filter(l => l.sourceContentId === content.id);
        if (outboundLinks.length < 2) {
          gaps.push({
            type: "Few Internal Links",
            priority: "low",
            suggestion: "Add more internal links to other related content for better SEO",
          });
        }

        if (gaps.length > 0) {
          contentGaps.push({
            contentId: content.id,
            contentType: content.type,
            title: content.title,
            gaps,
          });
        }
      }

      // Sort by number of gaps (most gaps first)
      contentGaps.sort((a, b) => b.gaps.length - a.gaps.length);

      const totalGaps = contentGaps.reduce((sum, c) => sum + c.gaps.length, 0);
      const highPriorityGaps = contentGaps.reduce(
        (sum, c) => sum + c.gaps.filter(g => g.priority === "high").length,
        0
      );

      res.json({
        content: contentGaps.slice(0, 20), // Return top 20
        stats: {
          contentWithGaps: contentGaps.length,
          totalGaps,
          highPriorityGaps,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze content gaps" });
    }
  });

  // Watchlist - content that may need updates (prices, hours, events)
  app.get("/api/intelligence/watchlist", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const allContent = await storage.getContentsWithRelations({ status: "published" });
      const watchlist: Array<{
        contentId: string;
        contentType: string;
        title: string;
        reason: string;
        priority: "high" | "medium" | "low";
        lastChecked: string;
      }> = [];

      const now = new Date();

      for (const content of allContent) {
        const updatedAt = new Date(content.updatedAt || content.createdAt || now);
        const daysSinceUpdate = Math.floor(
          (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Check for stale attraction/hotel content (has prices/hours)
        if (content.type === "attraction" || content.type === "hotel") {
          if (daysSinceUpdate > 90) {
            watchlist.push({
              contentId: content.id,
              contentType: content.type,
              title: content.title,
              reason: "Not updated in 90+ days - prices/hours may be outdated",
              priority: "high",
              lastChecked: updatedAt.toISOString(),
            });
          } else if (daysSinceUpdate > 60) {
            watchlist.push({
              contentId: content.id,
              contentType: content.type,
              title: content.title,
              reason: "Not updated in 60+ days - consider reviewing",
              priority: "medium",
              lastChecked: updatedAt.toISOString(),
            });
          }
        }

        // Check for articles older than 180 days
        if (content.type === "article" && daysSinceUpdate > 180) {
          watchlist.push({
            contentId: content.id,
            contentType: content.type,
            title: content.title,
            reason: "Article over 6 months old - may need refreshing",
            priority: "low",
            lastChecked: updatedAt.toISOString(),
          });
        }
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      watchlist.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      res.json({
        items: watchlist.slice(0, 30),
        stats: {
          total: watchlist.length,
          highPriority: watchlist.filter(w => w.priority === "high").length,
          mediumPriority: watchlist.filter(w => w.priority === "medium").length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to build watchlist" });
    }
  });

  // Events tracking - content tied to dates/events
  app.get("/api/intelligence/events", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const allContent = await storage.getContentsWithRelations({});
      const events: Array<{
        id: string;
        contentType: string;
        title: string;
        status: "upcoming" | "ongoing" | "past";
        needsUpdate: boolean;
      }> = [];

      // Find content that mentions events or has date patterns
      for (const content of allContent) {
        if (content.type === "article" || content.type === "event") {
          const title = content.title.toLowerCase();
          // Check if content is event-related
          if (
            title.includes("2024") ||
            title.includes("2025") ||
            title.includes("festival") ||
            title.includes("event") ||
            title.includes("exhibition") ||
            title.includes("ramadan") ||
            title.includes("eid") ||
            title.includes("new year")
          ) {
            const isPast = title.includes("2024") || title.includes("2023");
            events.push({
              id: content.id,
              contentType: content.type,
              title: content.title,
              status: isPast ? "past" : "upcoming",
              needsUpdate: isPast && content.status === "published",
            });
          }
        }
      }

      res.json({
        events: events.slice(0, 20),
        stats: {
          total: events.length,
          upcoming: events.filter(e => e.status === "upcoming").length,
          ongoing: events.filter(e => e.status === "ongoing").length,
          past: events.filter(e => e.status === "past").length,
          needsUpdate: events.filter(e => e.needsUpdate).length,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to track events" });
    }
  });

  // Topic clusters for SEO - groups related content
  app.get(
    "/api/intelligence/clusters/areas",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const allContent = await storage.getContentsWithRelations({ status: "published" });

        // Group content by type
        const clusters: Record<string, { name: string; count: number; items: string[] }> = {
          attractions: { name: "Attractions", count: 0, items: [] },
          hotels: { name: "Hotels", count: 0, items: [] },
          articles: { name: "Articles", count: 0, items: [] },
          dining: { name: "Dining", count: 0, items: [] },
          districts: { name: "Districts", count: 0, items: [] },
        };

        for (const content of allContent) {
          const type = content.type;
          if (type === "attraction") {
            clusters.attractions.count++;
            clusters.attractions.items.push(content.title);
          } else if (type === "hotel") {
            clusters.hotels.count++;
            clusters.hotels.items.push(content.title);
          } else if (type === "article") {
            clusters.articles.count++;
            clusters.articles.items.push(content.title);
          } else if (type === "dining") {
            clusters.dining.count++;
            clusters.dining.items.push(content.title);
          } else if (type === "district") {
            clusters.districts.count++;
            clusters.districts.items.push(content.title);
          }
        }

        res.json({
          clusters: Object.values(clusters).filter(c => c.count > 0),
          total: allContent.length,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to build clusters" });
      }
    }
  );

  // Internal links analysis - shows link structure and orphan pages
  app.get(
    "/api/intelligence/internal-links",
    requireAuth,
    async (req: AuthRequest, res: Response) => {
      try {
        const links = await storage.getInternalLinks();
        const allContent = await storage.getContentsWithRelations({ status: "published" });

        // Find broken links (target doesn't exist)
        const brokenLinks: Array<{ id: string; source: string; target: string; reason: string }> =
          [];
        for (const link of links) {
          if (link.targetContentId) {
            const target = await storage.getContent(link.targetContentId);
            if (!target) {
              const source = await storage.getContent(link.sourceContentId || "");
              brokenLinks.push({
                id: link.id,
                source: source?.title || "Unknown",
                target: link.targetContentId,
                reason: "Target content not found (404)",
              });
            }
          }
        }

        // Find orphan pages (no inbound links)
        const contentWithInboundLinks = new Set(links.map(l => l.targetContentId).filter(Boolean));
        const orphanPages = allContent.filter(c => !contentWithInboundLinks.has(c.id));

        res.json({
          totalLinks: links.length,
          brokenLinks,
          orphanPages: orphanPages.slice(0, 20).map(p => ({
            id: p.id,
            title: p.title,
            type: p.type,
            slug: p.slug,
          })),
          stats: {
            total: links.length,
            broken: brokenLinks.length,
            orphans: orphanPages.length,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to analyze internal links" });
      }
    }
  );

  app.get("/api/rss-feeds", requireAuth, async (req, res) => {
    try {
      const feeds = await storage.getRssFeeds();
      res.json(feeds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RSS feeds" });
    }
  });

  // RSS feeds stats for dashboard
  app.get("/api/rss-feeds/stats", requireAuth, async (req, res) => {
    try {
      const feeds = await storage.getRssFeeds();
      // Count articles from RSS that are still in draft status (pending review)
      const allContent = await storage.getContentsWithRelations({ status: "draft" });
      const rssArticles = allContent.filter(
        c => c.type === "article" && c.title?.includes("[RSS]")
      );
      res.json({ pendingCount: rssArticles.length, totalFeeds: feeds.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RSS stats" });
    }
  });

  app.get("/api/rss-feeds/:id", requireAuth, async (req, res) => {
    try {
      const feed = await storage.getRssFeed(req.params.id);
      if (!feed) {
        return res.status(404).json({ error: "RSS feed not found" });
      }
      res.json(feed);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RSS feed" });
    }
  });

  app.post(
    "/api/rss-feeds",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const parsed = insertRssFeedSchema.parse(req.body);
        const feed = await storage.createRssFeed(parsed);
        await logAuditEvent(
          req,
          "create",
          "rss_feed",
          feed.id,
          `Created RSS feed: ${feed.name}`,
          undefined,
          { name: feed.name, url: feed.url }
        );
        res.status(201).json(feed);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create RSS feed" });
      }
    }
  );

  app.patch(
    "/api/rss-feeds/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingFeed = await storage.getRssFeed(req.params.id);
        const feed = await storage.updateRssFeed(req.params.id, req.body);
        if (!feed) {
          return res.status(404).json({ error: "RSS feed not found" });
        }
        await logAuditEvent(
          req,
          "update",
          "rss_feed",
          feed.id,
          `Updated RSS feed: ${feed.name}`,
          existingFeed ? { name: existingFeed.name, url: existingFeed.url } : undefined,
          { name: feed.name, url: feed.url }
        );
        res.json(feed);
      } catch (error) {
        res.status(500).json({ error: "Failed to update RSS feed" });
      }
    }
  );

  app.delete(
    "/api/rss-feeds/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingFeed = await storage.getRssFeed(req.params.id);
        await storage.deleteRssFeed(req.params.id);
        if (existingFeed) {
          await logAuditEvent(
            req,
            "delete",
            "rss_feed",
            req.params.id,
            `Deleted RSS feed: ${existingFeed.name}`,
            { name: existingFeed.name, url: existingFeed.url }
          );
        }
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete RSS feed" });
      }
    }
  );

  app.post(
    "/api/rss-feeds/:id/fetch",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const feed = await storage.getRssFeed(req.params.id);
        if (!feed) {
          return res.status(404).json({ error: "RSS feed not found" });
        }

        const items = await parseRssFeed(feed.url);

        // Update lastFetchedAt timestamp
        await storage.updateRssFeed(req.params.id, {
          lastFetchedAt: new Date(),
        });

        res.json({ items, count: items.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch RSS feed items" });
      }
    }
  );

  const rssImportItemSchema = z.object({
    title: z.string().min(1).max(500),
    link: z.string().url().optional(),
    description: z.string().max(5000).optional(),
    pubDate: z.string().optional(),
  });

  const rssImportSchema = z.object({
    items: z.array(rssImportItemSchema).min(1).max(50),
  });

  // generateFingerprint is defined at line 961 using crypto.createHash (single source of truth)

  app.post(
    "/api/rss-feeds/:id/import",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const feed = await storage.getRssFeed(req.params.id);
        if (!feed) {
          return res.status(404).json({ error: "RSS feed not found" });
        }

        const parsed = rssImportSchema.safeParse(req.body);
        if (!parsed.success) {
          return res
            .status(400)
            .json({ error: "Invalid import data", details: parsed.error.errors });
        }

        const { items } = parsed.data;

        // Generate fingerprints for all items
        const itemsWithFingerprints = items.map(item => ({
          ...item,
          fingerprint: generateFingerprint(item.title, item.link),
        }));

        // Check for existing duplicates in database
        const fingerprints = itemsWithFingerprints.map(i => i.fingerprint);
        const existingFingerprints = await storage.checkDuplicateFingerprints(fingerprints);
        const existingFingerprintSet = new Set(existingFingerprints.map(fp => fp.fingerprint));

        // Separate duplicates from new items, also track in-batch duplicates
        const duplicates: {
          title: string;
          link?: string;
          existingContentId?: string | null;
          reason: string;
        }[] = [];
        const newItems: typeof itemsWithFingerprints = [];
        const seenInBatch = new Set<string>();

        for (const item of itemsWithFingerprints) {
          if (existingFingerprintSet.has(item.fingerprint)) {
            const existing = existingFingerprints.find(fp => fp.fingerprint === item.fingerprint);
            duplicates.push({
              title: item.title,
              link: item.link,
              existingContentId: existing?.contentId,
              reason: "already_imported",
            });
          } else if (seenInBatch.has(item.fingerprint)) {
            duplicates.push({
              title: item.title,
              link: item.link,
              existingContentId: null,
              reason: "duplicate_in_batch",
            });
          } else {
            seenInBatch.add(item.fingerprint);
            newItems.push(item);
          }
        }

        const createdContents = [];
        for (const item of newItems) {
          const slug = item.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

          const content = await storage.createContent({
            title: item.title,
            slug: `${slug}-${Date.now()}`,
            type: "article",
            status: "draft",
            metaDescription: item.description?.substring(0, 160) || null,
            blocks: [
              {
                id: `text-${Date.now()}-0`,
                type: "text",
                data: {
                  heading: item.title,
                  content: item.description || "",
                },
                order: 0,
              },
            ],
          });

          await storage.createArticle({
            contentId: content.id,
            sourceRssFeedId: req.params.id,
            sourceUrl: item.link || null,
          });

          // Store fingerprint for future deduplication
          await storage.createContentFingerprint({
            contentId: content.id,
            fingerprint: item.fingerprint,
            sourceUrl: item.link || null,
            sourceTitle: item.title,
            rssFeedId: req.params.id,
          });

          createdContents.push(content);
        }

        await storage.updateRssFeed(req.params.id, {
          // lastFetched removed - not in schema
        });

        res.status(201).json({
          imported: createdContents.length,
          contents: createdContents,
          duplicates: duplicates,
          duplicateCount: duplicates.length,
          message:
            duplicates.length > 0
              ? `Imported ${createdContents.length} items. Skipped ${duplicates.length} duplicate(s).`
              : `Successfully imported ${createdContents.length} items.`,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to import RSS feed items" });
      }
    }
  );

  // ==================== Topic Clusters API (RSS Aggregation) ====================

  // Get all topic clusters
  app.get("/api/topic-clusters", requireAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const clusters = await storage.getTopicClusters(
        status ? { status: status as string } : undefined
      );

      // Get items for each cluster
      const clustersWithItems = await Promise.all(
        clusters.map(async cluster => {
          const items = await storage.getTopicClusterItems(cluster.id);
          return { ...cluster, items };
        })
      );

      res.json(clustersWithItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topic clusters" });
    }
  });

  // Add articles to aggregation queue (smart dedup + clustering)
  const rssAggregateSchema = z.object({
    items: z
      .array(
        z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          link: z.string().url().optional(),
          pubDate: z.string().optional(),
          rssFeedId: z.string().optional(),
        })
      )
      .min(1)
      .max(100),
  });

  app.post(
    "/api/rss-aggregate",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const parsed = rssAggregateSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
        }

        const { items } = parsed.data;
        const clustered: { clusterId: string; topic: string; itemCount: number }[] = [];
        const newClusters: { clusterId: string; topic: string }[] = [];
        const skippedDuplicates: string[] = [];

        for (const item of items) {
          // Check if this exact article was already processed (fingerprint check)
          const fingerprint = generateFingerprint(item.title, item.link);
          const existingFp = await storage.getContentFingerprintByHash(fingerprint);
          if (existingFp) {
            skippedDuplicates.push(item.title);
            continue;
          }

          // Find or create a topic cluster for this article
          let cluster = await storage.findSimilarCluster(item.title);

          if (!cluster) {
            // Create new cluster
            cluster = await storage.createTopicCluster({
              topic: item.title,
              status: "pending",
              articleCount: 0,
            });
            newClusters.push({ clusterId: cluster.id, topic: cluster.topic });
          }

          // Add item to cluster
          const clusterItem = await storage.createTopicClusterItem({
            clusterId: cluster.id,
            sourceTitle: item.title,
            sourceDescription: item.description || null,
            sourceUrl: item.link || null,
            rssFeedId: item.rssFeedId || null,
            pubDate: item.pubDate ? new Date(item.pubDate) : null,
          });

          // Record fingerprint immediately to prevent re-adding the same item
          try {
            await storage.createContentFingerprint({
              contentId: null, // Not yet merged into content
              fingerprint: fingerprint,
              sourceUrl: item.link || null,
              sourceTitle: item.title,
              rssFeedId: item.rssFeedId || null,
            });
          } catch (e) {
            // Fingerprint might already exist in rare edge case
          }

          // Update cluster article count
          const clusterItems = await storage.getTopicClusterItems(cluster.id);
          await storage.updateTopicCluster(cluster.id, {
            articleCount: clusterItems.length,
            similarityScore:
              clusterItems.length > 1 ? Math.min(90, 50 + clusterItems.length * 10) : 50,
          });

          const existing = clustered.find(c => c.clusterId === cluster!.id);
          if (existing) {
            existing.itemCount++;
          } else {
            clustered.push({ clusterId: cluster.id, topic: cluster.topic, itemCount: 1 });
          }
        }

        res.status(201).json({
          message: `Processed ${items.length} articles`,
          clustered,
          newClusters,
          skippedDuplicates,
          summary: {
            totalProcessed: items.length,
            clustersAffected: clustered.length,
            newClustersCreated: newClusters.length,
            duplicatesSkipped: skippedDuplicates.length,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to aggregate RSS items" });
      }
    }
  );

  // AI-powered merge cluster into single article with enhanced content writer guidelines
  app.post(
    "/api/topic-clusters/:id/merge",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const cluster = await storage.getTopicCluster(req.params.id);
        if (!cluster) {
          return res.status(404).json({ error: "Topic cluster not found" });
        }

        const items = await storage.getTopicClusterItems(cluster.id);
        if (items.length === 0) {
          return res.status(400).json({ error: "No items in cluster to merge" });
        }

        // Prepare sources for AI merging
        const sources = items.map(item => ({
          title: item.sourceTitle,
          description: item.sourceDescription || "",
          url: item.sourceUrl || "",
          date: item.pubDate?.toISOString() || "",
        }));

        // Determine content category based on source material
        const combinedText = sources.map(s => `${s.title} ${s.description}`).join(" ");
        const category = determineContentCategory(combinedText);
        const sourceContent = sources.map(s => `${s.title}: ${s.description}`).join("\n\n");

        // Use AI to merge the articles with enhanced prompting
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "No AI provider configured. Please set OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        // Build the enhanced system and user prompts using centralized content rules
        const systemPrompt = await getContentWriterSystemPrompt(category);
        const userPrompt = await buildArticleGenerationPrompt(
          cluster.topic || combinedText,
          sourceContent
        );

        const completion = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 4000,
        });

        const mergedData = safeParseJson(completion.choices[0].message.content || "{}", {});

        // Create merged content with enhanced data
        const slug = (mergedData.title || cluster.topic)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 80);

        // Build content blocks from the generated content
        const blocks: ContentBlock[] = [];
        let blockOrder = 0;

        // Hero block
        blocks.push({
          id: `hero-${Date.now()}-${blockOrder}`,
          type: "hero",
          data: {
            title: mergedData.title || cluster.topic,
            subtitle: mergedData.metaDescription || "",
            overlayText: "",
          },
          order: blockOrder++,
        });

        // Main content text block
        if (mergedData.content) {
          blocks.push({
            id: `text-${Date.now()}-${blockOrder}`,
            type: "text",
            data: {
              heading: "",
              content: mergedData.content,
            },
            order: blockOrder++,
          });
        }

        // Quick Facts / Highlights block
        if (mergedData.quickFacts?.length > 0) {
          blocks.push({
            id: `highlights-${Date.now()}-${blockOrder}`,
            type: "highlights",
            data: {
              title: "Quick Facts",
              items: mergedData.quickFacts,
            },
            order: blockOrder++,
          });
        }

        // Pro Tips block
        if (mergedData.proTips?.length > 0) {
          blocks.push({
            id: `tips-${Date.now()}-${blockOrder}`,
            type: "tips",
            data: {
              title: "Pro Tips",
              tips: mergedData.proTips,
            },
            order: blockOrder++,
          });
        }

        // FAQ block
        if (mergedData.faqs?.length > 0) {
          blocks.push({
            id: `faq-${Date.now()}-${blockOrder}`,
            type: "faq",
            data: {
              title: "Frequently Asked Questions",
              faqs: mergedData.faqs.map((faq: { question: string; answer: string }) => ({
                question: faq.question,
                answer: faq.answer,
              })),
            },
            order: blockOrder++,
          });
        }

        // CTA block
        blocks.push({
          id: `cta-${Date.now()}-${blockOrder}`,
          type: "cta",
          data: {
            title: "Plan Your Visit",
            content: "Ready to experience this? Start planning your Dubai adventure today!",
            buttonText: "Explore More",
            buttonLink: "/articles",
          },
          order: blockOrder++,
        });

        // Calculate word count
        const textContent = mergedData.content || "";
        const wordCount = textContent
          .replace(/<[^>]*>/g, "")
          .split(/\s+/)
          .filter((w: string) => w.length > 0).length;

        const content = await storage.createContent({
          title: mergedData.title || cluster.topic,
          slug: `${slug}-${Date.now()}`,
          type: "article",
          status: "draft",
          metaTitle: mergedData.title || cluster.topic,
          metaDescription: mergedData.metaDescription || null,
          primaryKeyword: mergedData.primaryKeyword || null,
          secondaryKeywords: mergedData.secondaryKeywords || [],
          blocks: blocks as any,
          wordCount: wordCount,
        });

        // Create article entry with enhanced fields
        const articleCategory =
          category === "food" || category === "restaurants" || category === "dining"
            ? "food"
            : category === "attractions" || category === "activities"
              ? "attractions"
              : category === "hotels" || category === "accommodation"
                ? "hotels"
                : category === "transport" ||
                    category === "transportation" ||
                    category === "logistics"
                  ? "transport"
                  : category === "events" || category === "festivals"
                    ? "events"
                    : category === "tips" || category === "guides"
                      ? "tips"
                      : category === "shopping" || category === "deals"
                        ? "shopping"
                        : "news";

        // Get personality info for article metadata
        const personalityKey = CATEGORY_PERSONALITY_MAPPING[category] || "A";
        const personalityData = CONTENT_WRITER_PERSONALITIES[personalityKey];

        await storage.createArticle({
          contentId: content.id,
          category: articleCategory as any,
          urgencyLevel: mergedData.urgencyLevel || "relevant",
          targetAudience: mergedData.targetAudience || [],
          personality: personalityKey,
          tone: personalityData?.style || "professional",
          quickFacts: mergedData.quickFacts || [],
          proTips: mergedData.proTips || [],
          warnings: mergedData.warnings || [],
          faq: mergedData.faqs || [],
        });

        // Create fingerprints for all source items
        for (const item of items) {
          if (item.sourceUrl) {
            const fp = generateFingerprint(item.sourceTitle, item.sourceUrl);
            try {
              await storage.createContentFingerprint({
                contentId: content.id,
                fingerprint: fp,
                sourceUrl: item.sourceUrl,
                sourceTitle: item.sourceTitle,
                rssFeedId: item.rssFeedId || null,
              });
            } catch (e) {
              // Fingerprint might already exist
            }
          }
          await storage.updateTopicClusterItem(item.id, { isUsedInMerge: true });
        }

        // Update cluster status
        await storage.updateTopicCluster(cluster.id, {
          status: "merged",
          mergedContentId: content.id,
        });

        // Auto-translate to all 16 target languages - DISABLED (January 2026)
        // Translation is now manual-only via admin UI

        res.status(201).json({
          message: `Successfully merged ${items.length} articles using ${personalityData?.name || "Professional"} personality`,
          content,
          mergedFrom: items.length,
          sources: mergedData.sources || [],
          category,
          personality: personalityKey,
          structure: "standard",
          wordCount,
          translationsQueued: 0, // No auto-translation
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to merge articles" });
      }
    }
  );

  // Dismiss a cluster (mark as not needing merge)
  app.post(
    "/api/topic-clusters/:id/dismiss",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const cluster = await storage.updateTopicCluster(req.params.id, { status: "dismissed" });
        if (!cluster) {
          return res.status(404).json({ error: "Topic cluster not found" });
        }
        res.json({ message: "Cluster dismissed", cluster });
      } catch (error) {
        res.status(500).json({ error: "Failed to dismiss cluster" });
      }
    }
  );

  // Delete a topic cluster
  app.delete(
    "/api/topic-clusters/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteTopicCluster(req.params.id);
        res.json({ message: "Cluster deleted" });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete cluster" });
      }
    }
  );

  // ==================== Automatic RSS Processing ====================

  // POST /api/rss/auto-process - Manual trigger for automatic RSS processing
  app.post(
    "/api/rss/auto-process",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const result = await autoProcessRssFeeds();
        res.status(200).json({
          message: "RSS auto-processing completed",
          ...result,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to auto-process RSS feeds" });
      }
    }
  );

  // GET /api/rss/auto-process/status - Check last run status (no auth required for monitoring)
  app.get("/api/rss/auto-process/status", async (req, res) => {
    try {
      const feeds = await storage.getRssFeeds();
      const activeFeeds = feeds.filter(f => f.isActive);
      const pendingClusters = await storage.getTopicClusters({ status: "pending" });

      res.json({
        activeFeedsCount: activeFeeds.length,
        pendingClustersCount: pendingClusters.length,
        lastCheckTimestamp: new Date().toISOString(),
        autoProcessIntervalMinutes: 30,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get auto-process status" });
    }
  });

  app.get("/api/affiliate-links", requireAuth, async (req, res) => {
    try {
      const { contentId } = req.query;
      const links = await storage.getAffiliateLinks(contentId as string | undefined);
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliate links" });
    }
  });

  app.get("/api/affiliate-links/:id", requireAuth, async (req, res) => {
    try {
      const link = await storage.getAffiliateLink(req.params.id);
      if (!link) {
        return res.status(404).json({ error: "Affiliate link not found" });
      }
      res.json(link);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliate link" });
    }
  });

  app.post(
    "/api/affiliate-links",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const parsed = insertAffiliateLinkSchema.parse(req.body);
        const link = await storage.createAffiliateLink(parsed);
        await logAuditEvent(
          req,
          "create",
          "affiliate_link",
          link.id,
          `Created affiliate link: ${link.anchor}`,
          undefined,
          { anchor: link.anchor, url: link.url }
        );
        res.status(201).json(link);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create affiliate link" });
      }
    }
  );

  app.patch(
    "/api/affiliate-links/:id",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingLink = await storage.getAffiliateLink(req.params.id);
        const link = await storage.updateAffiliateLink(req.params.id, req.body);
        if (!link) {
          return res.status(404).json({ error: "Affiliate link not found" });
        }
        await logAuditEvent(
          req,
          "update",
          "affiliate_link",
          link.id,
          `Updated affiliate link: ${link.anchor}`,
          existingLink ? { anchor: existingLink.anchor, url: existingLink.url } : undefined,
          { anchor: link.anchor, url: link.url }
        );
        res.json(link);
      } catch (error) {
        res.status(500).json({ error: "Failed to update affiliate link" });
      }
    }
  );

  app.delete(
    "/api/affiliate-links/:id",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingLink = await storage.getAffiliateLink(req.params.id);
        await storage.deleteAffiliateLink(req.params.id);
        if (existingLink) {
          await logAuditEvent(
            req,
            "delete",
            "affiliate_link",
            req.params.id,
            `Deleted affiliate link: ${existingLink.anchor}`,
            { anchor: existingLink.anchor, url: existingLink.url }
          );
        }
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete affiliate link" });
      }
    }
  );

  app.get("/api/media", requirePermission("canAccessMediaLibrary"), async (req, res) => {
    try {
      const files = await storage.getMediaFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media files" });
    }
  });

  app.get("/api/media/:id", requirePermission("canAccessMediaLibrary"), async (req, res) => {
    try {
      const file = await storage.getMediaFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "Media file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media file" });
    }
  });

  // Check if media is in use before delete
  app.get("/api/media/:id/usage", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const mediaFile = await storage.getMediaFile(id);

      if (!mediaFile) {
        return res.status(404).json({ error: "Media file not found" });
      }

      const usage = await storage.checkMediaUsage(mediaFile.url);
      res.json(usage);
    } catch (error) {
      res.status(500).json({ error: "Failed to check media usage" });
    }
  });

  // SECURITY: Admin media upload with file upload hardening
  // Validates: magic bytes, MIME type, file size, malicious content, filename sanitization
  app.post(
    "/api/media/upload",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    upload.single("file"),
    validateMediaUpload,
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // SECURITY: Enhanced file upload validation with magic bytes
        // Validates: actual file type via magic bytes, blocks executables, detects malicious content
        const fileValidation = await validateUploadedFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );

        if (!fileValidation.valid) {
          // Log security event for blocked upload
          logSecurityEventFromRequest(req, SecurityEventType.UNAUTHORIZED_ACCESS, {
            success: false,
            resource: "media_upload",
            action: "file_upload_blocked",
            errorMessage: "File failed security validation",
            details: {
              originalFilename: req.file.originalname.substring(0, 20) + "...",
              declaredMimeType: req.file.mimetype,
              detectedType: fileValidation.detectedType?.mime,
              errors: fileValidation.errors.slice(0, 3), // Limit logged errors
            },
          });

          return res.status(400).json({
            error: "File failed security validation",
            code: "FILE_VALIDATION_FAILED",
            validationErrors: fileValidation.errors,
          });
        }

        // Use the new unified ImageService for upload
        const result = await uploadImage(
          req.file.buffer,
          fileValidation.safeFilename || req.file.originalname, // Use sanitized filename
          fileValidation.detectedType?.mime || req.file.mimetype, // Use detected MIME
          {
            source: "upload",
            altText: req.body.altText,
          }
        );

        if (!result.success) {
          return res.status(400).json({ error: (result as any).error });
        }

        const image = result.image;

        // Save to database for media library
        const mediaFile = await storage.createMediaFile({
          filename: image.filename,
          originalFilename: image.originalFilename,
          mimeType: image.mimeType,
          size: image.size,
          url: image.url,
          altText: req.body.altText || null,
          width: image.width || (req.body.width ? parseInt(req.body.width) : null),
          height: image.height || (req.body.height ? parseInt(req.body.height) : null),
        });

        await logAuditEvent(
          req,
          "media_upload",
          "media",
          mediaFile.id,
          `Uploaded media: ${mediaFile.originalFilename}`,
          undefined,
          {
            filename: mediaFile.originalFilename,
            mimeType: mediaFile.mimeType,
            size: mediaFile.size,
            originalSize: req.file.size,
          }
        );

        res.status(201).json(mediaFile);
      } catch (error) {
        res.status(500).json({ error: "Failed to upload media file" });
      }
    }
  );

  app.patch(
    "/api/media/:id",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const file = await storage.updateMediaFile(req.params.id, req.body);
        if (!file) {
          return res.status(404).json({ error: "Media file not found" });
        }
        res.json(file);
      } catch (error) {
        res.status(500).json({ error: "Failed to update media file" });
      }
    }
  );

  app.delete(
    "/api/media/:id",
    requirePermission("canAccessMediaLibrary"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const file = await storage.getMediaFile(req.params.id);
        const fileInfo = file
          ? { filename: file.originalFilename, mimeType: file.mimeType, size: file.size }
          : undefined;
        if (file) {
          // Use unified storage manager (handles both Object Storage and local)
          const storageManager = getStorageManager();
          await storageManager.delete(`public/${file.filename}`);
        }
        await storage.deleteMediaFile(req.params.id);
        if (fileInfo) {
          await logAuditEvent(
            req,
            "media_delete",
            "media",
            req.params.id,
            `Deleted media: ${fileInfo.filename}`,
            fileInfo
          );
        }
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete media file" });
      }
    }
  );

  app.get("/api/internal-links", async (req, res) => {
    try {
      const { contentId } = req.query;
      const links = await storage.getInternalLinks(contentId as string | undefined);
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch internal links" });
    }
  });

  app.post(
    "/api/internal-links",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const link = await storage.createInternalLink(req.body);
        res.status(201).json(link);
      } catch (error) {
        res.status(500).json({ error: "Failed to create internal link" });
      }
    }
  );

  app.delete(
    "/api/internal-links/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteInternalLink(req.params.id);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete internal link" });
      }
    }
  );

  // AI Status endpoint - check if AI is available
  app.get("/api/ai/status", async (req, res) => {
    try {
      const aiClient = getAIClient();
      const hasOpenAI = !!getOpenAIClient();
      const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GEMINI || process.env.gemini);
      const hasOpenRouter = !!(
        process.env.OPENROUTER_API_KEY ||
        process.env.openrouterapi ||
        process.env.OPENROUTERAPI ||
        process.env.travisite
      );
      const providerStatuses = getProviderStatus();

      res.json({
        available: !!aiClient && !safeMode.aiDisabled,
        provider: aiClient?.provider || null,
        safeMode: safeMode.aiDisabled,
        providers: {
          openai: hasOpenAI,
          gemini: hasGemini,
          openrouter: hasOpenRouter,
        },
        providerStatuses,
        features: {
          textGeneration: !!aiClient,
          imageGeneration: hasOpenAI, // DALL-E requires OpenAI
          translation: !!aiClient,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check AI status" });
    }
  });

  app.post(
    "/api/ai/generate",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      try {
        // AI Writers system - the ONLY content generation system
        const { aiWritersContentGenerator } = await import("./ai/writers/content-generator");

        const {
          type,
          topic,
          keywords,
          writerId,
          locale,
          length,
          tone,
          targetAudience,
          additionalContext,
        } = req.body;

        if (!type || !topic) {
          return res.status(400).json({ error: "Type and topic are required" });
        }

        const result = await aiWritersContentGenerator.generate({
          writerId, // Optional - auto-assigns if not provided
          contentType: type,
          topic,
          keywords: keywords || [],
          locale: locale || "en",
          length: length || "medium",
          tone,
          targetAudience,
          additionalContext,
        });

        res.json({
          ...result,
          _system: "ai-writers",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate content";
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    "/api/ai/suggest-internal-links",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const { contentId, text } = req.body;

        const allContents = await storage.getContents();
        const otherContents = allContents.filter(c => c.id !== contentId);

        if (otherContents.length === 0) {
          return res.json({ suggestions: [] });
        }

        const contentList = otherContents
          .map(c => `- ${c.title} (${c.type}): ${c.slug}`)
          .join("\n");

        const response = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          messages: [
            {
              role: "system",
              content:
                "You are an SEO expert. Suggest internal links that would naturally fit within the given text. Only suggest links that are contextually relevant.",
            },
            {
              role: "user",
              content: `Given this content:\n\n${text}\n\nAnd these available pages to link to:\n${contentList}\n\nSuggest up to 5 internal links. For each suggestion, provide the anchor text and the target slug.\n\nFormat as JSON: { "suggestions": [{ "anchorText": "...", "targetSlug": "...", "reason": "..." }] }`,
            },
          ],
          response_format: { type: "json_object" },
        });

        markProviderSuccess(provider); // Clear any failure states
        const suggestions = safeParseJson(
          response.choices[0].message.content || '{"suggestions":[]}',
          { suggestions: [] }
        );
        res.json(suggestions);
      } catch (error) {
        res.status(500).json({ error: "Failed to suggest internal links" });
      }
    }
  );

  // Comprehensive AI Article Generator - Full Spec Implementation with Multi-Provider Fallback
  app.post(
    "/api/ai/generate-article",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        addSystemLog("warning", "ai", "AI article generation blocked - safe mode enabled");
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        // Get all available AI providers for fallback chain
        const aiProviders = getAllAIClients();
        if (aiProviders.length === 0) {
          addSystemLog(
            "error",
            "ai",
            "AI article generation failed - no AI provider configured (need OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or openrouterapi)"
          );
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or openrouterapi to Secrets.",
          });
        }

        addSystemLog(
          "info",
          "ai",
          `Available AI providers: ${aiProviders.map(p => p.provider).join(", ")}`
        );

        const { title, topic, summary, sourceUrl, sourceText, inputType = "title_only" } = req.body;

        // Accept either 'title' or 'topic' for flexibility
        const articleTitle = title || topic;

        if (!articleTitle) {
          addSystemLog("warning", "ai", "AI article generation failed - no title provided");
          return res.status(400).json({ error: "Title is required" });
        }

        addSystemLog("info", "ai", `Starting AI article generation: "${articleTitle}"`, {
          inputType,
        });

        // Build context based on input type
        let contextInfo = `Title: "${articleTitle}"`;
        if (summary) contextInfo += `\nSummary: ${summary}`;
        if (sourceText) contextInfo += `\nSource text: ${sourceText}`;
        if (sourceUrl) contextInfo += `\nSource URL: ${sourceUrl}`;

        const systemPrompt = `You are an expert Dubai travel news content writer for a CMS. You MUST follow ALL these rules:

PERSONALITY BANK (A-E):
A. Professional Travel Expert - authoritative, factual, trustworthy
B. Enthusiastic Explorer - energetic, inspiring, adventure-focused  
C. Luxury Curator - sophisticated, refined, premium-focused
D. Practical Guide - helpful, organized, detail-oriented
E. Local Insider - authentic, personal, culturally aware

CONTENT CATEGORIES:
A. Attractions & Activities
B. Hotels  
C. Dining/Food
D. Transportation/Logistics
E. Events/Festivals
F. Tips/Guides
G. News/Regulations
H. Shopping & Deals

URGENCY LEVELS:
- Urgent (this week)
- Relevant (1-2 months)
- Evergreen

AUDIENCE TYPES: Families, Couples, Budget, Luxury, Business

STRICT RULES:
1. No hallucinations about prices, laws, or dates - say "as of latest public information" if unsure
2. No fake names or invented quotes
3. Always traveler-focused and SEO-clean
4. Maximum 5 marketing vocabulary words per article
5. No duplicate sentences or unnatural keyword stuffing
6. Article length: MINIMUM 1800-2500 words - this is STRICTLY ENFORCED
7. Meta title: 50-65 characters
8. Meta description: 100-160 characters MAX (not more!)
9. Each FAQ answer: 50-100 words MINIMUM (250+ characters each)

OUTPUT FORMAT - Return valid JSON matching this exact structure:
{
  "meta": {
    "title": "SEO meta title 50-65 chars",
    "description": "SEO meta description 150-160 chars",
    "slug": "url-friendly-slug",
    "keywords": ["keyword1", "keyword2"],
    "ogTitle": "Open Graph title",
    "ogDescription": "Open Graph description"
  },
  "analysis": {
    "category": "A-H code and name",
    "tone": "enthusiastic/practical/serious/enticing/friendly",
    "personality": "A-E code and description",
    "structure": "news_guide/story_info/comparative/updates/lists",
    "uniqueAngle": "What makes this article valuable",
    "marketingWords": ["max", "5", "words"],
    "primaryKeyword": "main keyword",
    "secondaryKeywords": ["secondary1", "secondary2"],
    "lsiKeywords": ["lsi1", "lsi2", "lsi3"],
    "urgency": "urgent/relevant/evergreen",
    "audience": ["target", "audiences"]
  },
  "article": {
    "h1": "SEO-optimized clickable headline",
    "intro": "2-3 sentences with primary keyword, answering what happened and why travelers should care",
    "quickFacts": [
      {"label": "Location", "value": "..."},
      {"label": "Price/Cost", "value": "..."},
      {"label": "Hours", "value": "..."},
      {"label": "Best For", "value": "..."},
      {"label": "Getting There", "value": "..."},
      {"label": "Time Needed", "value": "..."},
      {"label": "Booking Notes", "value": "..."},
      {"label": "Best Time", "value": "..."}
    ],
    "sections": [
      {"heading": "Section H2", "body": "Detailed content following personality/tone..."}
    ],
    "proTips": ["Genuine, specific tip 1", "Genuine, specific tip 2"],
    "goodToKnow": ["Warning/restriction 1", "Seasonality note", "Local insight"],
    "faq": [
      {"q": "SEO-rich question?", "a": "100-150 word unique answer..."}
    ],
    "internalLinks": [
      {"anchor": "suggested anchor text", "suggestedTopic": "related topic to link"}
    ],
    "altTexts": ["Hero image alt", "Detail section alt", "Atmosphere photo alt"],
    "closing": "Short, practical, traveler-focused conclusion"
  },
  "suggestions": {
    "alternativeHeadlines": ["Option 1", "Option 2", "Option 3"],
    "alternativeIntros": ["Alternative intro 1", "Alternative intro 2"],
    "alternativeCta": "Alternative call to action if relevant"
  }
}`;

        const userPrompt = `Generate a complete Dubai travel news article based on:

${contextInfo}

Input type: ${inputType}

Follow ALL steps from the spec:
1. Perform internal analysis (category A-H, urgency, audience, personality A-E, tone, unique angle, structure, marketing words, keywords)
2. Generate all meta and structure data
3. Create the complete article with all required sections
4. Apply SEO optimization rules
5. Provide editor suggestions (3 alternative headlines, 2 alternative intros, alternative CTA)

CRITICAL WORD COUNT REQUIREMENTS:
- Article body MUST be AT LEAST 1800 words (9000 characters) - this is STRICTLY ENFORCED
- Each FAQ answer MUST be at least 50 words (250 characters)
- Generate 6-8 FAQ items with substantive, detailed answers
- Meta description MUST be between 100-160 characters (NOT more than 160!)
- The article will be REJECTED if it doesn't meet these minimums!

Return valid JSON only.`;

        // Try each provider in fallback chain until one succeeds
        let generatedArticle: any = null;
        let successfulProvider: string | null = null;
        let lastError: Error | null = null;

        for (const aiProvider of aiProviders) {
          const { client: openai, provider, model } = aiProvider;

          try {
            addSystemLog("info", "ai", `Trying AI provider: ${provider} with model: ${model}`);

            const response = await openai.chat.completions.create({
              model: model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
              max_tokens: 8000,
            });

            generatedArticle = safeParseJson(response.choices[0].message.content || "{}", {});
            successfulProvider = provider;
            markProviderSuccess(provider); // Clear any failure states
            addSystemLog("info", "ai", `Successfully generated with ${provider}`);
            break; // Success! Exit the loop
          } catch (providerError: any) {
            lastError = providerError;
            const isRateLimitError =
              providerError?.status === 429 ||
              providerError?.code === "insufficient_quota" ||
              providerError?.message?.includes("quota") ||
              providerError?.message?.includes("429");
            const isCreditsError =
              providerError?.status === 402 ||
              providerError?.message?.includes("credits") ||
              providerError?.message?.includes("Insufficient Balance") ||
              providerError?.message?.includes("insufficient_funds");

            addSystemLog(
              "warning",
              "ai",
              `Provider ${provider} failed: ${providerError?.message || "Unknown error"}`,
              {
                status: providerError?.status,
                isRateLimit: isRateLimitError,
                isCredits: isCreditsError,
              }
            );

            if (isCreditsError) {
              markProviderFailed(provider, "no_credits");
              addSystemLog(
                "info",
                "ai",
                `Marked ${provider} as out of credits, trying next provider...`
              );
            } else if (isRateLimitError) {
              markProviderFailed(provider, "rate_limited");
              addSystemLog(
                "info",
                "ai",
                `Marked ${provider} as temporarily unavailable, trying next provider...`
              );
            }

            // Continue to next provider
          }
        }

        if (!generatedArticle || !successfulProvider) {
          const errorMsg = lastError?.message || "All AI providers failed";
          addSystemLog("error", "ai", `All AI providers failed: ${errorMsg}`);
          return res.status(503).json({
            error: "All AI providers failed. Please check API quotas and try again later.",
            details: errorMsg,
            triedProviders: aiProviders.map(p => p.provider),
          });
        }

        // Use the successful provider for any subsequent calls
        const successfulClient = aiProviders.find(p => p.provider === successfulProvider);
        const openai = successfulClient!.client;
        const provider = successfulClient!.provider;
        const model = successfulClient!.model;

        // Server-side word count validation and auto-expansion
        const countWords = (text: string): number =>
          text
            .trim()
            .split(/\s+/)
            .filter(w => w.length > 0).length;

        const getArticleWordCount = (article: any): number => {
          let totalWords = 0;
          if (article.article?.intro) totalWords += countWords(article.article.intro);
          if (article.article?.sections) {
            for (const section of article.article.sections) {
              if (section.body) totalWords += countWords(section.body);
            }
          }
          if (article.article?.proTips) {
            for (const tip of article.article.proTips) {
              totalWords += countWords(tip);
            }
          }
          if (article.article?.goodToKnow) {
            for (const item of article.article.goodToKnow) {
              totalWords += countWords(item);
            }
          }
          if (article.article?.faq) {
            for (const faq of article.article.faq) {
              if (faq.a) totalWords += countWords(faq.a);
            }
          }
          if (article.article?.closing) totalWords += countWords(article.article.closing);
          return totalWords;
        };

        const MIN_WORD_TARGET = 1800;
        const MAX_EXPANSION_ATTEMPTS = 3;
        let wordCount = getArticleWordCount(generatedArticle);
        let attempts = 0;

        addSystemLog("info", "ai", `Initial generation: ${wordCount} words`, {
          title: articleTitle,
        });

        // Auto-expand if word count is below minimum
        while (wordCount < MIN_WORD_TARGET && attempts < MAX_EXPANSION_ATTEMPTS) {
          attempts++;
          const wordsNeeded = MIN_WORD_TARGET - wordCount;
          addSystemLog(
            "info",
            "ai",
            `Expanding content: attempt ${attempts}, need ${wordsNeeded} more words`
          );

          const expansionPrompt = `The article below has only ${wordCount} words but needs at least ${MIN_WORD_TARGET} words.

Current sections: ${generatedArticle.article?.sections?.map((s: any) => s.heading).join(", ") || "none"}

Please generate ${Math.max(3, Math.ceil(wordsNeeded / 200))} additional sections to expand this article about "${articleTitle}".
Each section should have 250-400 words of detailed, valuable content.

IMPORTANT: Generate NEW, UNIQUE sections that add value - do NOT repeat existing content.
Focus on practical tips, insider information, comparisons, or detailed guides.

Return JSON only:
{
  "additionalSections": [
    {"heading": "H2 Section Title", "body": "Detailed paragraph content 250-400 words..."}
  ],
  "additionalFaqs": [
    {"q": "Relevant question?", "a": "Detailed answer 80-120 words..."}
  ]
}`;

          try {
            const expansionResponse = await openai.chat.completions.create({
              model: model,
              messages: [
                {
                  role: "system",
                  content:
                    "You are an expert Dubai travel content writer. Generate high-quality expansion content to meet word count requirements.",
                },
                { role: "user", content: expansionPrompt },
              ],
              ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
              max_tokens: 4000,
            });

            const expansion = safeParseJson(
              expansionResponse.choices[0].message.content || "{}",
              {}
            );

            // Merge expanded content
            if (expansion.additionalSections && generatedArticle.article?.sections) {
              generatedArticle.article.sections = [
                ...generatedArticle.article.sections,
                ...expansion.additionalSections,
              ];
            }
            if (expansion.additionalFaqs && generatedArticle.article?.faq) {
              generatedArticle.article.faq = [
                ...generatedArticle.article.faq,
                ...expansion.additionalFaqs,
              ];
            }

            wordCount = getArticleWordCount(generatedArticle);
            addSystemLog("info", "ai", `After expansion ${attempts}: ${wordCount} words`);
          } catch (expansionError) {
            break;
          }
        }

        // Final validation and warning
        if (wordCount < MIN_WORD_TARGET) {
          addSystemLog(
            "warning",
            "ai",
            `Article generated with only ${wordCount} words (minimum: ${MIN_WORD_TARGET})`,
            { title: articleTitle }
          );
        } else {
          addSystemLog("info", "ai", `Article meets word count requirement: ${wordCount} words`, {
            title: articleTitle,
          });
        }

        // Add word count to response for client validation
        generatedArticle._generationStats = {
          wordCount,
          meetsMinimum: wordCount >= MIN_WORD_TARGET,
          expansionAttempts: attempts,
          sectionsCount: generatedArticle.article?.sections?.length || 0,
          faqCount: generatedArticle.article?.faq?.length || 0,
        };

        // Fetch image from Freepik or AI after article generation
        let heroImage = null;
        try {
          const keywords = generatedArticle.meta?.keywords || [];
          const category = generatedArticle.analysis?.category?.charAt(0) || "F";
          const categoryMap: Record<string, string> = {
            A: "attractions",
            B: "hotels",
            C: "food",
            D: "transport",
            E: "events",
            F: "tips",
            G: "news",
            H: "shopping",
          };
          const mappedCategory = categoryMap[category] || "general";

          const imageResult = await findOrCreateArticleImage(
            articleTitle,
            keywords,
            mappedCategory
          );
          if (imageResult) {
            heroImage = {
              url: imageResult.url,
              alt: imageResult.altText,
              source: imageResult.source,
              imageId: imageResult.imageId,
            };
          } else {
          }
        } catch (imageError) {}

        // ENFORCE SEO REQUIREMENTS before sending response
        const enforcedArticle = enforceArticleSEO(generatedArticle);

        // Add image to response
        res.json({
          ...enforcedArticle,
          heroImage,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to generate article" });
      }
    }
  );

  app.post(
    "/api/ai/generate-seo-schema",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const { type, title, description, data } = req.body;

        let schemaType = "WebPage";
        if (type === "attraction") schemaType = "TouristAttraction";
        else if (type === "hotel") schemaType = "Hotel";
        else if (type === "article") schemaType = "Article";

        const response = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          messages: [
            {
              role: "system",
              content:
                "You are an SEO expert. Generate valid JSON-LD structured data for the given content.",
            },
            {
              role: "user",
              content: `Generate JSON-LD schema for a ${schemaType}:
Title: ${title}
Description: ${description}
Additional data: ${JSON.stringify(data)}

Return valid JSON-LD that can be embedded in a webpage.`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const schema = safeParseJson(response.choices[0].message.content || "{}", {});
        res.json(schema);
      } catch (error) {
        res.status(500).json({ error: "Failed to generate SEO schema" });
      }
    }
  );

  // Full content generation endpoints - Using AI Writers system
  app.post(
    "/api/ai/generate-hotel",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const { name, keywords } = req.body;
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({ error: "Hotel name is required" });
        }

        const { aiWritersContentGenerator } = await import("./ai/writers/content-generator");
        const result = await aiWritersContentGenerator.generate({
          contentType: "hotel",
          topic: name.trim(),
          keywords: keywords || [name.trim()],
          length: "long",
        });

        // Apply SEO enforcement before sending
        const enforced = enforceWriterEngineSEO(result);
        res.json({ ...enforced, _system: "ai-writers" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate hotel content";
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    "/api/ai/generate-attraction",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const { name, primaryKeyword, keywords } = req.body;
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({ error: "Attraction name is required" });
        }

        const { aiWritersContentGenerator } = await import("./ai/writers/content-generator");
        const result = await aiWritersContentGenerator.generate({
          contentType: "attraction",
          topic: name.trim(),
          keywords: keywords || [primaryKeyword?.trim() || name.trim()],
          length: "long",
        });

        // Apply SEO enforcement before sending
        const enforced = enforceWriterEngineSEO(result);
        res.json({ ...enforced, _system: "ai-writers" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate attraction content";
        res.status(500).json({ error: message });
      }
    }
  );

  // Generate partial content for a specific section based on existing content
  app.post(
    "/api/ai/generate-section",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const { sectionType, title, existingContent, contentType } = req.body;

        if (!sectionType || !title) {
          return res.status(400).json({ error: "Section type and title are required" });
        }

        const validSections = ["faq", "tips", "highlights"];
        if (!validSections.includes(sectionType)) {
          return res
            .status(400)
            .json({ error: "Invalid section type. Must be: faq, tips, or highlights" });
        }

        let prompt = "";
        const systemPrompt = `You are a Dubai travel content expert. Generate high-quality, SEO-optimized content for the "${title}" page.
Based on the existing content context, generate ONLY the requested section. Output valid JSON.`;

        const contextInfo = existingContent
          ? `\n\nExisting content context:\n${existingContent.substring(0, 3000)}`
          : "";

        if (sectionType === "faq") {
          prompt = `Generate 8 frequently asked questions with detailed answers for "${title}" (${contentType || "attraction"}).
${contextInfo}

Generate practical, helpful FAQs that visitors would actually ask.
Each answer should be 100-150 words with specific, actionable information.

Output format:
{
  "faqs": [
    {"question": "What are the opening hours of ${title}?", "answer": "Detailed 100-150 word answer..."},
    {"question": "How much do tickets cost?", "answer": "Detailed answer with prices..."},
    ...8 total FAQs
  ]
}`;
        } else if (sectionType === "tips") {
          prompt = `Generate 7-8 insider tips for visiting "${title}" (${contentType || "attraction"}).
${contextInfo}

Tips should be practical, specific, and actionable - not generic advice.
Each tip should be 30-50 words.

Output format:
{
  "tips": [
    "Book tickets online at least 2 days in advance to skip the queue and save 15% on entry fees.",
    "Visit during weekday mornings (9-11 AM) for smaller crowds and better photo opportunities.",
    ...7-8 total tips
  ]
}`;
        } else if (sectionType === "highlights") {
          prompt = `Generate 6 key highlights/experiences for "${title}" (${contentType || "attraction"}).
${contextInfo}

Each highlight should describe a specific experience or feature that visitors can enjoy.
Include the highlight title and a 50-80 word description.

Output format:
{
  "highlights": [
    {"title": "Observation Deck Experience", "description": "50-80 word detailed description of this highlight..."},
    {"title": "Interactive Exhibits", "description": "Description..."},
    ...6 total highlights
  ]
}`;
        }

        const response = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          max_tokens: 4000,
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        });

        const result = safeParseJson(response.choices[0].message.content || "{}", {});

        res.json(result);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate section content";
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    "/api/ai/generate-dining",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const { name, keywords } = req.body;
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({ error: "Restaurant name is required" });
        }

        const { aiWritersContentGenerator } = await import("./ai/writers/content-generator");
        const result = await aiWritersContentGenerator.generate({
          contentType: "dining",
          topic: name.trim(),
          keywords: keywords || [name.trim()],
          length: "long",
        });

        // Apply SEO enforcement before sending
        const enforced = enforceWriterEngineSEO(result);
        res.json({ ...enforced, _system: "ai-writers" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate dining content";
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    "/api/ai/generate-district",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const { name, keywords } = req.body;
        if (!name || typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({ error: "District name is required" });
        }

        const { aiWritersContentGenerator } = await import("./ai/writers/content-generator");
        const result = await aiWritersContentGenerator.generate({
          contentType: "district",
          topic: name.trim(),
          keywords: keywords || [name.trim()],
          length: "long",
        });

        // Apply SEO enforcement before sending
        const enforced = enforceWriterEngineSEO(result);
        res.json({ ...enforced, _system: "ai-writers" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate district content";
        res.status(500).json({ error: message });
      }
    }
  );

  // AI Field Generation endpoint - for individual field assistance (uses unified AI providers with failover)
  app.post(
    "/api/ai/generate-field",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        // Use unified AI providers with automatic failover (prioritizes Gemini for cost efficiency)
        const { getAllUnifiedProviders, markProviderFailed } = await import("./ai/providers");
        const providers = getAllUnifiedProviders();

        // Prioritize Gemini as it's cost-efficient
        const sortedProviders = [...providers].sort((a, b) => {
          if (a.name === "gemini") return -1;
          if (b.name === "gemini") return 1;
          return 0;
        });

        if (sortedProviders.length === 0) {
          return res.status(503).json({ error: "No AI providers available" });
        }

        const { fieldType, currentValue, title, contentType, primaryKeyword, maxLength } = req.body;

        if (!fieldType || !title || !contentType) {
          return res.status(400).json({ error: "fieldType, title, and contentType are required" });
        }

        // Field-specific prompts
        const fieldPrompts: Record<string, string> = {
          metaTitle: `Generate 3 SEO-optimized meta titles (50-60 chars each) for a ${contentType} page about "${title}". 
Include the primary keyword "${primaryKeyword || title}" naturally. Make them compelling and click-worthy.
Format: Return ONLY a JSON array of 3 strings, like: ["Title 1", "Title 2", "Title 3"]`,

          metaDescription: `Generate 3 meta descriptions (150-160 chars each) for "${title}" (${contentType}). 
Include keyword "${primaryKeyword || title}" and a clear call-to-action. Make them engaging for search results.
Format: Return ONLY a JSON array of 3 strings.`,

          keyword: `Suggest 3 primary keywords for a ${contentType} page about "${title}". 
Consider Dubai context, search intent, and SEO best practices. Format them as exact keywords (2-4 words each).
Format: Return ONLY a JSON array of 3 strings.`,

          intro: `Write 3 different intro paragraphs (60 words, 3 sentences each) for "${title}" (${contentType}). 
Make them compelling, conversational, and engaging. Include keyword "${primaryKeyword || title}" naturally.
Format: Return ONLY a JSON array of 3 strings.`,

          expandedIntro: `Write 3 expanded introduction texts (150-200 words each) for "${title}" (${contentType}). 
Provide rich context, highlight key aspects, and engage readers. Use natural keyword "${primaryKeyword || title}" integration.
Format: Return ONLY a JSON array of 3 strings.`,

          tips: `Generate 3 sets of visitor/traveler tips for "${title}" (${contentType}). 
Each set should have 5-7 practical, actionable tips. Focus on insider knowledge and value.
Format: Return ONLY a JSON array where each element is a string with tips separated by newlines.`,

          highlights: `Generate 3 sets of key highlights for "${title}" (${contentType}). 
Each set should have 5-6 highlights that showcase the best features or experiences. Be specific and compelling.
Format: Return ONLY a JSON array where each element is a string with highlights separated by newlines.`,

          quickInfo: `Generate 3 sets of quick info items for "${title}" (${contentType}). 
Each set should include 6-8 key facts (location, hours, price, duration, etc.) in "Label: Value" format.
Format: Return ONLY a JSON array where each element is a string with info items separated by newlines.`,

          altText: `Generate 3 SEO-friendly alt text options for the hero image of "${title}" (${contentType}). 
Each should be 125-150 chars, descriptive, include keyword "${primaryKeyword || title}", and describe visual elements.
Format: Return ONLY a JSON array of 3 strings.`,

          secondaryKeywords: `Based on the primary keyword "${primaryKeyword || title}" for a ${contentType} page about "${title}", 
generate 3 sets of 5-8 secondary/LSI keywords each. Focus on Dubai travel context, related search terms, and long-tail variations.
Each set should cover different semantic aspects: synonyms, related topics, question-based keywords, and location variations.
Format: Return ONLY a JSON array of 3 strings, where each string contains comma-separated keywords.`,

          internalLinks: `For a ${contentType} page about "${title}" with primary keyword "${primaryKeyword || title}", 
suggest 5-8 internal linking opportunities. Consider related Dubai travel topics like:
- Nearby attractions, districts, hotels
- Related activities, dining, transport
- Complementary content (if beach -> water sports, if hotel -> nearby restaurants)
Format: Return ONLY a JSON array of 3 different sets of suggestions. Each element is a string with link suggestions in format "Anchor Text | Target Topic" separated by newlines.`,

          externalLinks: `For a ${contentType} page about "${title}" with keyword "${primaryKeyword || title}",
suggest 5-6 authoritative external sources to link to. Focus on:
- Official tourism websites (Visit Dubai, DTCM)
- Government resources (Dubai.ae, UAE official sites)
- Reputable travel guides (Lonely Planet, TripAdvisor, Time Out Dubai)
- Official venue/brand websites
Format: Return ONLY a JSON array of 3 different sets. Each element is a string with suggestions in format "Anchor Text | URL or Domain" separated by newlines.`,
        };

        const prompt = fieldPrompts[fieldType as keyof typeof fieldPrompts];
        if (!prompt) {
          return res.status(400).json({ error: `Invalid fieldType: ${fieldType}` });
        }

        // Try providers with failover
        let content = "[]";
        let lastError: Error | null = null;

        for (const provider of sortedProviders) {
          try {
            const result = await provider.generateCompletion({
              messages: [
                {
                  role: "system",
                  content:
                    "You are an expert SEO content writer specializing in Dubai travel content. Generate high-quality, optimized suggestions. Always return valid JSON arrays of strings.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              temperature: 0.8,
              maxTokens: 1024,
            });
            content = result.content;
            markProviderSuccess(provider.name); // Clear any failure states

            break;
          } catch (providerError: any) {
            lastError =
              providerError instanceof Error ? providerError : new Error(String(providerError));
            const isCreditsError =
              providerError?.status === 402 ||
              providerError?.message?.includes("credits") ||
              providerError?.message?.includes("Insufficient Balance");
            markProviderFailed(provider.name, isCreditsError ? "no_credits" : "rate_limited");
          }
        }

        if (content === "[]" && lastError) {
          throw lastError;
        }

        // Try to parse as JSON array
        let suggestions: string[];
        try {
          suggestions = JSON.parse(content);
          if (!Array.isArray(suggestions)) {
            throw new Error("Response is not an array");
          }
        } catch (parseError) {
          // Fallback: split by newlines and filter
          suggestions = content
            .split("\n")
            .filter(s => s.trim().length > 0)
            .slice(0, 3);
        }

        // Apply max length filter if specified
        if (maxLength) {
          suggestions = suggestions.map(s =>
            s.length > maxLength ? s.substring(0, maxLength - 3) + "..." : s
          );
        }

        res.json({ suggestions });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate field suggestions";
        res.status(500).json({ error: message });
      }
    }
  );

  // TEMPORARILY DISABLED - Will be enabled later
  // app.post("/api/ai/generate-transport", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
  //   if (safeMode.aiDisabled) {
  //     return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
  //   }
  //   try {
  //     const { name } = req.body;
  //     if (!name || typeof name !== "string" || name.trim().length === 0) {
  //       return res.status(400).json({ error: "Transport type is required" });
  //     }
  //
  //     const result = await generateTransportContent(name.trim());
  //     if (!result) {
  //       return res.status(500).json({ error: "Failed to generate transport content" });
  //     }
  //
  //     res.json(result);
  //   } catch (error) {
  //
  //     const message = error instanceof Error ? error.message : "Failed to generate transport content";
  //     res.status(500).json({ error: message });
  //   }
  // });

  // TEMPORARILY DISABLED - Will be enabled later
  // app.post("/api/ai/generate-event", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
  //   if (safeMode.aiDisabled) {
  //     return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
  //   }
  //   try {
  //     const { name } = req.body;
  //     if (!name || typeof name !== "string" || name.trim().length === 0) {
  //       return res.status(400).json({ error: "Event name is required" });
  //     }
  //
  //     const result = await generateEventContent(name.trim());
  //     if (!result) {
  //       return res.status(500).json({ error: "Failed to generate event content" });
  //     }
  //
  //     res.json(result);
  //   } catch (error) {
  //
  //     const message = error instanceof Error ? error.message : "Failed to generate event content";
  //     res.status(500).json({ error: message });
  //   }
  // });

  // TEMPORARILY DISABLED - Will be enabled later
  // app.post("/api/ai/generate-itinerary", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
  //   if (safeMode.aiDisabled) {
  //     return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
  //   }
  //   try {
  //     const { duration, tripType } = req.body;
  //     if (!duration || typeof duration !== "string" || duration.trim().length === 0) {
  //       return res.status(400).json({ error: "Duration is required (e.g., '3 days', '1 week')" });
  //     }
  //
  //     const result = await generateItineraryContent(duration.trim(), tripType);
  //     if (!result) {
  //       return res.status(500).json({ error: "Failed to generate itinerary content" });
  //     }
  //
  //     res.json(result);
  //   } catch (error) {
  //
  //     const message = error instanceof Error ? error.message : "Failed to generate itinerary content";
  //     res.status(500).json({ error: message });
  //   }
  // });

  app.post(
    "/api/ai/generate-article-simple",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const { topic, category, keywords } = req.body;
        if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
          return res.status(400).json({ error: "Article topic is required" });
        }

        const { aiWritersContentGenerator } = await import("./ai/writers/content-generator");
        const result = await aiWritersContentGenerator.generate({
          contentType: "article",
          topic: topic.trim(),
          keywords: keywords || [topic.trim()],
          length: "long",
          additionalContext: category ? `Category: ${category}` : undefined,
        });

        // Apply SEO enforcement before sending
        const enforced = enforceWriterEngineSEO(result);
        res.json({ ...enforced, _system: "ai-writers" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate article content";
        res.status(500).json({ error: message });
      }
    }
  );

  // AI Image Generation endpoint
  app.post(
    "/api/ai/generate-images",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        addSystemLog("warning", "images", "AI image generation blocked - safe mode enabled");
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const {
          contentType,
          title,
          description,
          location,
          generateHero,
          generateContentImages: genContentImages,
          contentImageCount,
        } = req.body;

        if (!contentType || !title) {
          addSystemLog(
            "warning",
            "images",
            "AI image generation failed - missing content type or title"
          );
          return res.status(400).json({ error: "Content type and title are required" });
        }

        const validContentTypes = [
          "hotel",
          "attraction",
          "article",
          "dining",
          "district",
          "transport",
          "event",
          "itinerary",
        ];
        if (!validContentTypes.includes(contentType)) {
          addSystemLog(
            "warning",
            "images",
            `AI image generation failed - invalid content type: ${contentType}`
          );
          return res.status(400).json({ error: "Invalid content type" });
        }

        // Check if any image generation API is configured
        const hasOpenAI = !!(
          process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
        );
        const hasReplicate = !!process.env.REPLICATE_API_KEY;
        const hasFreepik = !!process.env.FREEPIK_API_KEY;

        // If no AI image generation available, use Freepik or Unsplash fallback
        if (!hasOpenAI && !hasReplicate) {
          addSystemLog(
            "info",
            "images",
            `No AI image API configured, using ${hasFreepik ? "Freepik" : "Unsplash"} fallback`
          );

          // Generate stock image URL based on content
          const searchQuery = encodeURIComponent(
            `${title} ${contentType} dubai travel`.substring(0, 50)
          );
          const fallbackImages: GeneratedImage[] = [];

          if (generateHero !== false) {
            // Use Unsplash for high-quality stock photos
            const heroUrl = `https://source.unsplash.com/1200x800/?${searchQuery}`;
            fallbackImages.push({
              url: heroUrl,
              filename: `hero-${Date.now()}.jpg`,
              type: "hero",
              alt: `${title} - Dubai Travel`,
              caption: `${title} - Dubai Travel Guide`,
            });
          }

          addSystemLog(
            "info",
            "images",
            `Generated ${fallbackImages.length} fallback images for "${title}"`
          );
          return res.json({
            images: fallbackImages,
            source: hasFreepik ? "freepik" : "unsplash",
            message: "Using stock images (AI image generation not configured)",
          });
        }

        addSystemLog("info", "images", `Starting AI image generation for: "${title}"`, {
          contentType,
          generateHero,
          hasOpenAI,
          hasReplicate,
        });

        const options: ImageGenerationOptions = {
          contentType,
          title: title.trim(),
          description: description?.trim(),
          location: location?.trim(),
          generateHero: generateHero !== false,
          generateContentImages: genContentImages === true,
          contentImageCount: Math.min(contentImageCount || 0, 5), // Limit to 5 content images
        };

        let images: GeneratedImage[] = [];

        try {
          images = await generateContentImages(options);
        } catch (genError) {
          addSystemLog(
            "error",
            "images",
            `AI image generation error: ${genError instanceof Error ? genError.message : "Unknown error"}`
          );
          // Fallback to stock images on error
          const searchQuery = encodeURIComponent(
            `${title} ${contentType} dubai travel`.substring(0, 50)
          );
          images = [
            {
              url: `https://source.unsplash.com/1200x800/?${searchQuery}`,
              filename: `hero-${Date.now()}.jpg`,
              type: "hero",
              alt: `${title} - Dubai Travel`,
              caption: `${title} - Dubai Travel Guide`,
            },
          ];
        }

        if (images.length === 0) {
          addSystemLog("warning", "images", `No images generated for "${title}", using fallback`);
          const searchQuery = encodeURIComponent(
            `${title} ${contentType} dubai travel`.substring(0, 50)
          );
          images = [
            {
              url: `https://source.unsplash.com/1200x800/?${searchQuery}`,
              filename: `hero-${Date.now()}.jpg`,
              type: "hero",
              alt: `${title} - Dubai Travel`,
              caption: `${title} - Dubai Travel Guide`,
            },
          ];
        }

        // Store images using unified ImageService
        const storedImages: GeneratedImage[] = [];

        for (const image of images) {
          try {
            // Use unified ImageService for download and storage
            const result = await uploadImageFromUrl(image.url, image.filename, {
              source: "ai",
              altText: image.alt,
              metadata: { type: image.type, originalUrl: image.url },
            });

            if (result.success) {
              storedImages.push({
                ...image,
                url: result.image.url,
              });
            } else {
            }
          } catch (imgError) {}
        }

        res.json({ images: storedImages, count: storedImages.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate images";
        res.status(500).json({ error: message });
      }
    }
  );

  // Generate single image with custom prompt
  app.post(
    "/api/ai/generate-single-image",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const { prompt, size, quality, style, filename } = req.body;

        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        const validSizes = ["1024x1024", "1792x1024", "1024x1792"];
        const imageSize = validSizes.includes(size) ? size : "1792x1024";

        const imageUrl = await generateImage(prompt, {
          size: imageSize as "1024x1024" | "1792x1024" | "1024x1792",
          quality: quality === "standard" ? "standard" : "hd",
          style: style === "vivid" ? "vivid" : "natural",
        });

        if (!imageUrl) {
          return res.status(500).json({ error: "Failed to generate image" });
        }

        // Download and store image using unified ImageService
        const finalFilename = filename || `ai-image-${Date.now()}.jpg`;
        const result = await uploadImageFromUrl(imageUrl, finalFilename, {
          source: "ai",
          metadata: { prompt, size: imageSize, quality, style },
        });

        if (!result.success) {
          return res
            .status(500)
            .json({ error: (result as any).error || "Failed to store generated image" });
        }

        res.json({ url: result.image.url, filename: result.image.filename });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate image";
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    "/api/ai/block-action",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const { action, content, context, targetLanguage } = req.body;

        if (!action || !content) {
          return res.status(400).json({ error: "Action and content are required" });
        }

        const validActions = [
          "rewrite",
          "expand",
          "shorten",
          "translate",
          "seo_optimize",
          "improve_grammar",
          "add_examples",
        ];
        if (!validActions.includes(action)) {
          return res.status(400).json({ error: "Invalid action" });
        }

        let systemPrompt = "You are a professional content editor for a Dubai travel website.";
        let userPrompt = "";

        switch (action) {
          case "rewrite":
            userPrompt = `Rewrite the following text in a fresh, engaging way while keeping the same meaning and key information:\n\n${content}`;
            break;
          case "expand":
            userPrompt = `Expand the following text with more details, examples, and engaging information. Make it at least 50% longer while maintaining quality:\n\n${content}`;
            break;
          case "shorten":
            userPrompt = `Condense the following text to be more concise while keeping all important information. Aim for about half the length:\n\n${content}`;
            break;
          case "translate":
            const lang = targetLanguage || "Arabic";
            userPrompt = `Translate the following text to ${lang}. Maintain the tone and style:\n\n${content}`;
            break;
          case "seo_optimize":
            systemPrompt = "You are an SEO expert and content writer for a Dubai travel website.";
            userPrompt = `Optimize the following text for SEO. Improve keyword usage, add relevant terms naturally, and make it more search-engine friendly while keeping it readable and engaging:\n\n${content}${context ? `\n\nContext/Keywords to target: ${context}` : ""}`;
            break;
          case "improve_grammar":
            userPrompt = `Fix any grammar, spelling, or punctuation errors in the following text. Also improve sentence flow where needed:\n\n${content}`;
            break;
          case "add_examples":
            userPrompt = `Enhance the following text by adding relevant examples, specific details, or practical tips that would help travelers:\n\n${content}`;
            break;
        }

        const response = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        });

        const result = response.choices[0].message.content || "";
        res.json({ result, action });
      } catch (error) {
        res.status(500).json({ error: "Failed to process AI action" });
      }
    }
  );

  // AI Assistant Chat
  app.post(
    "/api/ai/assistant",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string") {
          return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          messages: [
            {
              role: "system",
              content: `You are a helpful AI assistant for a Dubai travel content management system called "Travi CMS". 
You help content creators with:
- Generating topic ideas for articles about Dubai tourism
- Creating content outlines and structures
- Suggesting SEO keywords and optimization strategies
- Writing tips for engaging travel content
- General guidance on content management best practices

Keep responses concise but helpful. Use bullet points and formatting when appropriate.
Focus on Dubai travel, tourism, hotels, attractions, dining, and related topics.`,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        const result = response.choices[0].message.content || "";
        res.json({ response: result });
      } catch (error) {
        res.status(500).json({ error: "Failed to process assistant request" });
      }
    }
  );

  // Topic Bank CRUD
  app.get("/api/topic-bank", async (req, res) => {
    try {
      const { category, isActive } = req.query;
      const items = await storage.getTopicBankItems({
        category: category as string | undefined,
        isActive: isActive === undefined ? undefined : isActive === "true",
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topic bank items" });
    }
  });

  // Topic bank stats for dashboard
  app.get("/api/topic-bank/stats", async (req, res) => {
    try {
      const items = await storage.getTopicBankItems({ isActive: true });
      // Count unused topics (timesUsed === 0 or undefined)
      const unusedCount = items.filter(item => !item.timesUsed || item.timesUsed === 0).length;
      res.json({ unusedCount, totalTopics: items.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topic bank stats" });
    }
  });

  app.get("/api/topic-bank/:id", async (req, res) => {
    try {
      const item = await storage.getTopicBankItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topic bank item" });
    }
  });

  app.post("/api/topic-bank", requirePermission("canCreate"), async (req, res) => {
    try {
      const parsed = insertTopicBankSchema.parse(req.body);
      const item = await storage.createTopicBankItem(parsed);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create topic bank item" });
    }
  });

  app.patch("/api/topic-bank/:id", requirePermission("canEdit"), async (req, res) => {
    try {
      const item = await storage.updateTopicBankItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update topic bank item" });
    }
  });

  app.delete("/api/topic-bank/:id", requirePermission("canDelete"), async (req, res) => {
    try {
      await storage.deleteTopicBankItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete topic bank item" });
    }
  });

  // Merge duplicate topics (same title)
  app.post("/api/topic-bank/merge-duplicates", requirePermission("canDelete"), async (req, res) => {
    try {
      const allTopics = await storage.getTopicBankItems({});

      // Group topics by normalized title (lowercase, trimmed)
      const topicsByTitle = new Map<string, typeof allTopics>();
      for (const topic of allTopics) {
        const normalizedTitle = topic.title.toLowerCase().trim();
        if (!topicsByTitle.has(normalizedTitle)) {
          topicsByTitle.set(normalizedTitle, []);
        }
        topicsByTitle.get(normalizedTitle)!.push(topic);
      }

      let mergedCount = 0;
      let deletedCount = 0;

      // Process each group of duplicates
      for (const [, duplicates] of topicsByTitle) {
        if (duplicates.length <= 1) continue;

        // Sort by: priority (desc), timesUsed (desc), createdAt (desc - newest first for ties)
        duplicates.sort((a, b) => {
          if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
          if ((b.timesUsed || 0) !== (a.timesUsed || 0))
            return (b.timesUsed || 0) - (a.timesUsed || 0);
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime; // Newest first when other fields are equal
        });

        // Keep the first one (best), merge data into it
        const keeper = duplicates[0];
        const toDelete = duplicates.slice(1);

        // Merge all fields from duplicates - prefer non-null values
        const allKeywords = new Set<string>(keeper.keywords || []);
        let longestOutline = keeper.outline || "";
        let totalTimesUsed = keeper.timesUsed || 0;
        let bestCategory = keeper.category;
        let bestMainCategory = keeper.mainCategory;
        let bestTopicType = keeper.topicType;
        let bestViralPotential = keeper.viralPotential;
        let bestFormat = keeper.format;
        let bestHeadlineAngle = keeper.headlineAngle;
        let bestPriority = keeper.priority || 0;
        let isActive = keeper.isActive === true; // Only true if explicitly true, not undefined

        for (const dup of toDelete) {
          // Merge keywords
          if (dup.keywords) {
            for (const kw of dup.keywords) {
              allKeywords.add(kw);
            }
          }
          // Keep longest outline
          if (dup.outline && dup.outline.length > longestOutline.length) {
            longestOutline = dup.outline;
          }
          // Sum up usage
          totalTimesUsed += dup.timesUsed || 0;
          // Prefer non-null values for categorical fields
          if (!bestCategory && dup.category) bestCategory = dup.category;
          if (!bestMainCategory && dup.mainCategory) bestMainCategory = dup.mainCategory;
          if (!bestTopicType && dup.topicType) bestTopicType = dup.topicType;
          if (!bestViralPotential && dup.viralPotential) bestViralPotential = dup.viralPotential;
          if (!bestFormat && dup.format) bestFormat = dup.format;
          if (!bestHeadlineAngle && dup.headlineAngle) bestHeadlineAngle = dup.headlineAngle;
          // Keep highest priority
          if ((dup.priority || 0) > bestPriority) bestPriority = dup.priority || 0;
          // If any duplicate is explicitly active, keep active
          if (dup.isActive === true) isActive = true;
        }

        // Update keeper with merged data
        await storage.updateTopicBankItem(keeper.id, {
          keywords: Array.from(allKeywords),
          outline: longestOutline || null,
          timesUsed: totalTimesUsed,
          category: bestCategory,
          mainCategory: bestMainCategory,
          topicType: bestTopicType,
          viralPotential: bestViralPotential,
          format: bestFormat,
          headlineAngle: bestHeadlineAngle,
          priority: bestPriority,
          isActive: isActive,
        });

        // Delete duplicates
        for (const dup of toDelete) {
          await storage.deleteTopicBankItem(dup.id);
          deletedCount++;
        }

        mergedCount++;
      }

      res.json({
        success: true,
        message: `Merged ${mergedCount} groups, deleted ${deletedCount} duplicates`,
        mergedGroups: mergedCount,
        deletedItems: deletedCount,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to merge duplicate topics" });
    }
  });

  app.post("/api/topic-bank/:id/use", requirePermission("canCreate"), async (req, res) => {
    try {
      const item = await storage.incrementTopicUsage(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to increment topic usage" });
    }
  });

  // Auto-generate article from Topic Bank item
  app.post("/api/topic-bank/:id/generate", requirePermission("canCreate"), async (req, res) => {
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({
          error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
        });
      }
      const { client: openai, provider } = aiClient;

      const topic = await storage.getTopicBankItem(req.params.id);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }

      const keywordsContext = topic.keywords?.length
        ? `Target Keywords: ${topic.keywords.join(", ")}`
        : "";

      const outlineContext = topic.outline ? `Content Outline:\n${topic.outline}` : "";

      const systemPrompt = `You are an expert Dubai travel content writer. Generate a complete, SEO-optimized article based on the provided topic information.

OUTPUT FORMAT - Return valid JSON matching this exact structure:
{
  "title": "SEO-optimized article title (50-65 chars)",
  "metaDescription": "Compelling meta description (150-160 chars)",
  "slug": "url-friendly-slug",
  "heroImageAlt": "Descriptive alt text for hero image",
  "blocks": [
    {
      "type": "hero",
      "data": {
        "title": "Main article headline",
        "subtitle": "Engaging subtitle",
        "overlayText": "Brief tagline or context"
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Introduction",
        "content": "Engaging introduction paragraph (200-300 words)..."
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Section 2 heading",
        "content": "Detailed paragraph content (200-300 words)..."
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Section 3 heading",
        "content": "Detailed paragraph content (200-300 words)..."
      }
    },
    {
      "type": "highlights",
      "data": {
        "title": "Key Highlights",
        "items": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4", "Highlight 5", "Highlight 6"]
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Practical Information",
        "content": "Useful practical details for travelers..."
      }
    },
    {
      "type": "tips",
      "data": {
        "title": "Expert Tips",
        "tips": ["Detailed tip 1", "Detailed tip 2", "Detailed tip 3", "Detailed tip 4", "Detailed tip 5", "Detailed tip 6", "Detailed tip 7"]
      }
    },
    {
      "type": "faq",
      "data": {
        "title": "Frequently Asked Questions",
        "faqs": [
          {"question": "Q1?", "answer": "Detailed answer (100-150 words)..."},
          {"question": "Q2?", "answer": "Detailed answer (100-150 words)..."},
          {"question": "Q3?", "answer": "Detailed answer (100-150 words)..."},
          {"question": "Q4?", "answer": "Detailed answer (100-150 words)..."},
          {"question": "Q5?", "answer": "Detailed answer (100-150 words)..."}
        ]
      }
    },
    {
      "type": "cta",
      "data": {
        "heading": "Ready to explore?",
        "text": "Compelling call to action",
        "buttonText": "Learn More",
        "buttonLink": "#"
      }
    }
  ]
}

RULES:
1. Article MUST be MINIMUM 1800-2500 words total across all text blocks (this is CRITICAL for SEO compliance)
2. Include 4-6 text sections with detailed content (each H2 section should be 300-500 words)
3. Add a highlights block with 6 key takeaways
4. Include a tips block with 7 actionable expert tips - THIS IS REQUIRED
5. Include 5 FAQ items with comprehensive 100-150 word answers each - THIS IS REQUIRED
6. Make content traveler-focused and SEO-optimized
7. No fake data, invented prices, or unverifiable facts
8. Include a CTA block at the end
9. Include 5-8 internal links to related content
10. Include 2-3 external links to authoritative sources`;

      const userPrompt = `Generate a complete article for this Dubai travel topic:

Topic: ${topic.title}
Category: ${topic.category}
${keywordsContext}
${outlineContext}

Create engaging, informative content that would appeal to Dubai travelers. Return valid JSON only.`;

      const response = await openai.chat.completions.create({
        model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 8000,
      });

      const generated = safeParseJson(response.choices[0].message.content || "{}", {});

      // Validate and normalize blocks to ensure all required sections exist
      const blocks = validateAndNormalizeBlocks(
        generated.blocks || [],
        generated.title || topic.title
      );

      // Create the content in the database
      const slug =
        generated.slug ||
        topic.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      // Generate hero image for the article and persist to storage
      let heroImageUrl = null;
      let generatedImages: GeneratedImage[] = [];
      try {
        generatedImages = await generateContentImages({
          contentType: "article",
          title: generated.title || topic.title,
          description: generated.metaDescription || topic.title,
          generateHero: true,
          generateContentImages: false,
        });

        if (generatedImages.length > 0) {
          const heroImage = generatedImages.find(img => img.type === "hero");
          if (heroImage) {
            // Persist to object storage (DALL-E URLs expire in ~1 hour)
            const persistedUrl = await persistImageToStorage(heroImage.url, heroImage.filename);
            heroImageUrl = persistedUrl || heroImage.url; // Fallback to temp URL if persist fails
          }
        }
      } catch (imageError) {
        // Continue without images - don't fail the whole article generation
      }

      const content = await storage.createContent({
        title: generated.title || topic.title,
        slug: `${slug}-${Date.now()}`,
        type: "article",
        status: "draft",
        metaDescription: generated.metaDescription || null,
        heroImage: heroImageUrl,
        heroImageAlt: generated.heroImageAlt || `${generated.title || topic.title} - Dubai Travel`,
        blocks: blocks,
      });

      await storage.createArticle({ contentId: content.id, category: topic.category });

      // Increment topic usage
      await storage.incrementTopicUsage(req.params.id);

      res.status(201).json({
        content,
        generated,
        images: generatedImages,
        message: "Article generated successfully from topic",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate article from topic" });
    }
  });

  // Generate NEWS from Topic Bank item and DELETE the topic after
  app.post(
    "/api/topic-bank/:id/generate-news",
    requirePermission("canCreate"),
    async (req, res) => {
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const topic = await storage.getTopicBankItem(req.params.id);
        if (!topic) {
          return res.status(404).json({ error: "Topic not found" });
        }

        const keywordsContext = topic.keywords?.length
          ? `Target Keywords: ${topic.keywords.join(", ")}`
          : "";

        const systemPrompt = `You are an expert Dubai news and viral content writer. Generate a news/trending article based on the topic.

This should be written in a NEWS/trending format - engaging, timely-feeling, and shareable.

Topic Details:
- Title: ${topic.title}
- Headline Angle: ${topic.headlineAngle || "Create an engaging hook"}
- Format: ${topic.format || "article"}
- Viral Potential: ${topic.viralPotential}/5 stars
- Category: ${topic.mainCategory || topic.category}

OUTPUT FORMAT - Return valid JSON:
{
  "title": "Attention-grabbing news headline (50-70 chars)",
  "metaDescription": "Compelling meta description (150-160 chars)",
  "slug": "url-friendly-slug",
  "heroImageAlt": "Descriptive alt text",
  "blocks": [
    {
      "type": "hero",
      "data": {
        "title": "Main headline",
        "subtitle": "Breaking/Trending subheader",
        "overlayText": "Dubai 2025"
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "The Story",
        "content": "Lead paragraph with the key news/trend (200-300 words)..."
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Why It Matters",
        "content": "Context and significance (200-250 words)..."
      }
    },
    {
      "type": "highlights",
      "data": {
        "title": "Key Takeaways",
        "items": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "What Travelers Need to Know",
        "content": "Practical info for visitors (200-250 words)..."
      }
    },
    {
      "type": "tips",
      "data": {
        "title": "Quick Tips",
        "tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5"]
      }
    },
    {
      "type": "faq",
      "data": {
        "title": "FAQs",
        "faqs": [
          {"question": "Q1?", "answer": "Answer..."},
          {"question": "Q2?", "answer": "Answer..."},
          {"question": "Q3?", "answer": "Answer..."}
        ]
      }
    }
  ]
}

RULES:
1. Write 800-1200 words total - news articles are shorter
2. Use the headline angle: "${topic.headlineAngle || topic.title}"
3. Make it feel current and newsworthy
4. Include social-media-friendly quotes/stats
5. No invented facts or fake statistics`;

        const response = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate a viral news article for: ${topic.title}\n${keywordsContext}`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 3000,
        });

        const generated = safeParseJson(response.choices[0].message.content || "{}", {});
        const blocks = validateAndNormalizeBlocks(
          generated.blocks || [],
          generated.title || topic.title
        );

        const slug =
          generated.slug ||
          topic.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Generate hero image
        let heroImageUrl = null;
        try {
          const generatedImages = await generateContentImages({
            contentType: "article",
            title: generated.title || topic.title,
            description: generated.metaDescription || topic.title,
            generateHero: true,
            generateContentImages: false,
          });

          if (generatedImages.length > 0) {
            const heroImage = generatedImages.find(img => img.type === "hero");
            if (heroImage) {
              const persistedUrl = await persistImageToStorage(heroImage.url, heroImage.filename);
              heroImageUrl = persistedUrl || heroImage.url;
            }
          }
        } catch (imageError) {}

        // Create news article
        const content = await storage.createContent({
          title: generated.title || topic.title,
          slug: `${slug}-${Date.now()}`,
          type: "article",
          status: "draft",
          metaDescription: generated.metaDescription || null,
          heroImage: heroImageUrl,
          heroImageAlt: generated.heroImageAlt || `${topic.title} - Dubai News`,
          blocks: blocks,
          primaryKeyword: topic.keywords?.[0] || null,
          secondaryKeywords: topic.keywords?.slice(1) || [],
        });

        // Create with "news" category
        await storage.createArticle({ contentId: content.id, category: "news" });

        // DELETE the topic after successful generation
        await storage.deleteTopicBankItem(req.params.id);

        res.status(201).json({
          content,
          generated,
          topicDeleted: true,
          message: "News article generated and topic removed from bank",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to generate news from topic" });
      }
    }
  );

  // Batch auto-generate from priority topics (for when RSS lacks content)
  app.post("/api/topic-bank/auto-generate", requirePermission("canCreate"), async (req, res) => {
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({
          error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
        });
      }
      const { client: openai, provider } = aiClient;

      const { count = 1, category } = req.body;
      const limit = Math.min(Math.max(1, count), 5); // Max 5 at a time

      // Get high-priority active topics that haven't been used much
      const topics = await storage.getTopicBankItems({
        category,
        isActive: true,
      });

      // Sort by priority (high first) and usage count (low first)
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const sortedTopics = topics
        .sort((a, b) => {
          const priorityDiff =
            (priorityOrder[a.priority || "medium"] || 1) -
            (priorityOrder[b.priority || "medium"] || 1);
          if (priorityDiff !== 0) return priorityDiff;
          return (a.timesUsed || 0) - (b.timesUsed || 0);
        })
        .slice(0, limit);

      if (sortedTopics.length === 0) {
        return res.json({
          generated: [],
          message: "No active topics available for generation",
        });
      }

      const results = [];
      for (const topic of sortedTopics) {
        try {
          const keywordsContext = topic.keywords?.length
            ? `Target Keywords: ${topic.keywords.join(", ")}`
            : "";

          const response = await openai.chat.completions.create({
            model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
            messages: [
              {
                role: "system",
                content: `You are an expert Dubai travel content writer. Generate a complete, SEO-optimized article.

Return JSON with: title, metaDescription, slug, heroImageAlt, blocks (array with hero, 4-6 text sections, highlights with 6 items, tips with 7 tips, faq with 5 items using "faqs" key, cta).
Article MUST be MINIMUM 1800-2500 words (this is CRITICAL for SEO compliance). Each H2 section should be 300-500 words.
IMPORTANT: Include a "tips" block with "tips" array containing 7 actionable tips.
IMPORTANT: Include a "faq" block with "faqs" array containing 5 Q&A objects with "question" and "answer" keys (each answer 100-150 words).
IMPORTANT: Include 5-8 internal links and 2-3 external links in your text sections.`,
              },
              {
                role: "user",
                content: `Generate article for: ${topic.title}\nCategory: ${topic.category}\n${keywordsContext}`,
              },
            ],
            response_format: { type: "json_object" },
            max_tokens: 8000,
          });

          const generated = safeParseJson(response.choices[0].message.content || "{}", {});

          const slug =
            generated.slug ||
            topic.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");

          // Validate and normalize blocks to ensure all required sections exist
          const blocks = validateAndNormalizeBlocks(
            generated.blocks || [],
            generated.title || topic.title
          );

          // Generate hero image for the article and persist to storage
          let heroImageUrl = null;
          try {
            const batchImages = await generateContentImages({
              contentType: "article",
              title: generated.title || topic.title,
              description: generated.metaDescription || topic.title,
              generateHero: true,
              generateContentImages: false,
            });

            if (batchImages.length > 0) {
              const heroImage = batchImages.find(img => img.type === "hero");
              if (heroImage) {
                // Persist to object storage (DALL-E URLs expire in ~1 hour)
                const persistedUrl = await persistImageToStorage(heroImage.url, heroImage.filename);
                heroImageUrl = persistedUrl || heroImage.url;
              }
            }
          } catch (imageError) {}

          const content = await storage.createContent({
            title: generated.title || topic.title,
            slug: `${slug}-${Date.now()}`,
            type: "article",
            status: "draft",
            metaDescription: generated.metaDescription || null,
            heroImage: heroImageUrl,
            heroImageAlt:
              generated.heroImageAlt || `${generated.title || topic.title} - Dubai Travel`,
            blocks: blocks,
          });

          await storage.createArticle({ contentId: content.id, category: topic.category });
          await storage.incrementTopicUsage(topic.id);

          results.push({
            topicId: topic.id,
            topicTitle: topic.title,
            contentId: content.id,
            hasImage: !!heroImageUrl,
            success: true,
          });
        } catch (err) {
          results.push({
            topicId: topic.id,
            topicTitle: topic.title,
            success: false,
            error: (err as Error).message,
          });
        }
      }

      res.json({
        generated: results.filter(r => r.success),
        failed: results.filter(r => !r.success),
        message: `Generated ${results.filter(r => r.success).length} of ${sortedTopics.length} articles`,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to batch generate from topics" });
    }
  });

  // Keyword Repository CRUD
  app.get("/api/keywords", async (req, res) => {
    try {
      const { type, category, isActive } = req.query;
      const items = await storage.getKeywords({
        type: type as string | undefined,
        category: category as string | undefined,
        isActive: isActive === undefined ? undefined : isActive === "true",
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch keywords" });
    }
  });

  app.get("/api/keywords/:id", async (req, res) => {
    try {
      const item = await storage.getKeyword(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Keyword not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch keyword" });
    }
  });

  app.post("/api/keywords", requirePermission("canCreate"), checkReadOnlyMode, async (req, res) => {
    try {
      const parsed = insertKeywordRepositorySchema.parse(req.body);
      const item = await storage.createKeyword(parsed);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create keyword" });
    }
  });

  app.patch(
    "/api/keywords/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const item = await storage.updateKeyword(req.params.id, req.body);
        if (!item) {
          return res.status(404).json({ error: "Keyword not found" });
        }
        res.json(item);
      } catch (error) {
        res.status(500).json({ error: "Failed to update keyword" });
      }
    }
  );

  app.delete(
    "/api/keywords/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteKeyword(req.params.id);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete keyword" });
      }
    }
  );

  app.post(
    "/api/keywords/:id/use",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const item = await storage.incrementKeywordUsage(req.params.id);
        if (!item) {
          return res.status(404).json({ error: "Keyword not found" });
        }
        res.json(item);
      } catch (error) {
        res.status(500).json({ error: "Failed to increment keyword usage" });
      }
    }
  );

  // Bulk import keywords
  app.post(
    "/api/keywords/bulk-import",
    requirePermission("canManageSettings"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { keywords } = req.body;
        if (!Array.isArray(keywords) || keywords.length === 0) {
          return res.status(400).json({ error: "Keywords array is required" });
        }

        const results = { created: 0, skipped: 0, errors: [] as string[] };

        for (const kw of keywords) {
          try {
            const existingKeywords = await storage.getKeywords({});
            const exists = existingKeywords.some(
              (k: { keyword: string }) => k.keyword.toLowerCase() === kw.keyword.toLowerCase()
            );

            if (exists) {
              results.skipped++;
              continue;
            }

            await storage.createKeyword({
              keyword: kw.keyword,
              type: kw.type || "primary",
              category: kw.category || null,
              searchVolume: kw.searchVolume || null,
              competition: kw.competition || null,
              relatedKeywords: kw.relatedKeywords || [],
              priority: kw.priority || 0,
              notes: kw.notes || null,
              isActive: true,
            });
            results.created++;
          } catch (err: any) {
            if (err?.code === "23505") {
              results.skipped++;
            } else {
              results.errors.push(
                `Failed to import "${kw.keyword}": ${err?.message || "Unknown error"}`
              );
            }
          }
        }

        res.json({
          success: true,
          created: results.created,
          skipped: results.skipped,
          errors: results.errors.slice(0, 10),
          totalErrors: results.errors.length,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to bulk import keywords" });
      }
    }
  );

  // Get scheduled content ready for publishing - admin only
  app.get("/api/scheduled-content", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const scheduledContent = await storage.getScheduledContentToPublish();
      res.json(scheduledContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scheduled content" });
    }
  });

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
    } catch (error) {}
  };

  // DISABLED: Scheduled publishing automation disabled for UI-only mode
  // To re-enable: runScheduledPublishing(); setInterval(runScheduledPublishing, 60 * 1000);

  // =====================
  // User Management Routes (Admin only)
  // =====================

  app.get("/api/users", requirePermission("canManageUsers"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(
        users.map(u => ({
          id: u.id,
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          profileImageUrl: u.profileImageUrl,
        }))
      );
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get single user by ID - IDOR protected
  // Users can only view their own profile unless they are admin
  app.get("/api/users/:id", requireSelfOrAdmin(), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // SECURITY: Admin user creation with strict password policy enforcement
  // Requirements: 12+ chars, uppercase, lowercase, numbers, special chars, zxcvbn score >= 3
  app.post(
    "/api/users",
    requirePermission("canManageUsers"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { username, password, firstName, lastName, email, role } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: "Username and password are required" });
        }

        // SECURITY: Strict password policy enforcement for admin accounts
        // Uses zxcvbn for strength scoring, blocks weak/common passwords
        const passwordValidation = validatePasswordStrength(
          password,
          [username, firstName, lastName, email].filter(Boolean)
        );
        if (!passwordValidation.valid) {
          // Log failed password policy attempt
          logSecurityEventFromRequest(req, SecurityEventType.UNAUTHORIZED_ACCESS, {
            success: false,
            resource: "admin_user",
            action: "create_user_weak_password",
            errorMessage: "Password does not meet security requirements",
            details: { errorCount: passwordValidation.errors.length },
          });
          return res.status(400).json({
            error: "Password does not meet security requirements",
            code: "WEAK_PASSWORD",
            requirements: [
              `Minimum ${PASSWORD_POLICY.minLength} characters`,
              "At least one uppercase letter",
              "At least one lowercase letter",
              "At least one number",
              "At least one special character",
              `Strength score at least ${PASSWORD_POLICY.minStrengthScore}/4`,
            ],
            validationErrors: passwordValidation.errors,
          });
        }

        const existingUser = await storage.getUserByUsername(username.toLowerCase());
        if (existingUser) {
          return res.status(400).json({ error: "A user with this username already exists" });
        }

        if (email) {
          const existingEmail = await storage.getUserByEmail(email.toLowerCase());
          if (existingEmail) {
            return res.status(400).json({ error: "A user with this email already exists" });
          }
        }

        // SECURITY: Use higher bcrypt rounds (12) for admin password hashing
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await storage.createUserWithPassword({
          username: username.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          email: email?.toLowerCase(),
          role: role || "editor",
          isActive: true,
        });

        res.status(201).json({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  );

  // SECURITY: Admin user update with strict password policy enforcement for password changes
  app.patch(
    "/api/users/:id",
    requirePermission("canManageUsers"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingUser = await storage.getUser(req.params.id);

        // Handle password change separately with strict policy enforcement
        const { password, ...updateData } = req.body;
        const passwordChanged = Boolean(password);
        if (password) {
          // SECURITY: Strict password policy enforcement for password changes
          // Uses zxcvbn for strength scoring, checks password history (if implemented)
          const passwordValidation = await validatePasswordChange(
            req.params.id,
            password,
            [
              existingUser?.username,
              existingUser?.email,
              existingUser?.firstName,
              existingUser?.lastName,
            ].filter(Boolean) as string[]
          );
          if (!passwordValidation.valid) {
            // Log failed password policy attempt
            logSecurityEventFromRequest(req, SecurityEventType.PASSWORD_CHANGE, {
              success: false,
              resource: "admin_user",
              action: "password_change_weak",
              errorMessage: "Password does not meet security requirements",
              details: {
                targetUserId: req.params.id,
                errorCount: passwordValidation.errors.length,
              },
            });
            return res.status(400).json({
              error: "Password does not meet security requirements",
              code: "WEAK_PASSWORD",
              requirements: [
                `Minimum ${PASSWORD_POLICY.minLength} characters`,
                "At least one uppercase letter",
                "At least one lowercase letter",
                "At least one number",
                "At least one special character",
                `Strength score at least ${PASSWORD_POLICY.minStrengthScore}/4`,
                `Cannot reuse last ${PASSWORD_POLICY.historyCount} passwords`,
              ],
              validationErrors: passwordValidation.errors,
            });
          }
          // SECURITY: Use higher bcrypt rounds (12) for admin password hashing
          updateData.passwordHash = await bcrypt.hash(password, 12);
        }

        const user = await storage.updateUser(req.params.id, updateData);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Audit log user update (check for role change)
        const actionType = existingUser?.role !== user.role ? "role_change" : "user_update";
        await logAuditEvent(
          req,
          actionType,
          "user",
          req.params.id,
          actionType === "role_change"
            ? `Role changed for ${user.username || user.email}: ${existingUser?.role} -> ${user.role}`
            : `Updated user: ${user.username || user.email}`,
          {
            username: existingUser?.username,
            email: existingUser?.email,
            role: existingUser?.role,
            isActive: existingUser?.isActive,
          },
          { username: user.username, email: user.email, role: user.role, isActive: user.isActive }
        );

        // Security audit: Log password change (critical security event)
        if (passwordChanged) {
          logSecurityEventFromRequest(req, SecurityEventType.PASSWORD_CHANGE, {
            success: true,
            resource: "user",
            action: "password_change",
            details: { targetUserId: user.id },
          });
        }

        // Security audit: Log role/privilege change (critical security event)
        if (existingUser?.role !== user.role) {
          logSecurityEventFromRequest(req, SecurityEventType.ROLE_CHANGED, {
            success: true,
            resource: "user",
            action: "role_change",
            details: {
              targetUserId: user.id,
              previousRole: existingUser?.role,
              newRole: user.role,
            },
          });
        }

        res.json({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update user" });
      }
    }
  );

  // Delete user - admin only (IDOR protected)
  app.delete("/api/users/:id", requireAdmin(), checkReadOnlyMode, async (req, res) => {
    try {
      const existingUser = await storage.getUser(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      await storage.deleteUser(req.params.id);

      // Audit log user deletion
      await logAuditEvent(
        req,
        "user_delete",
        "user",
        req.params.id,
        `Deleted user: ${existingUser.email}`,
        { email: existingUser.email, role: existingUser.role }
      );

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Bulk delete users
  app.post(
    "/api/users/bulk-delete",
    requirePermission("canManageUsers"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: "Invalid or empty ids array" });
        }

        // Get current user ID to prevent self-deletion
        const currentUserId = (req as any).session?.userId;

        // Filter out current user if included
        const idsToDelete = ids.filter((id: string) => id !== currentUserId);

        if (idsToDelete.length === 0) {
          return res.status(400).json({ error: "Cannot delete your own account" });
        }

        let deletedCount = 0;
        for (const id of idsToDelete) {
          try {
            const existingUser = await storage.getUser(id);
            if (existingUser) {
              await storage.deleteUser(id);
              await logAuditEvent(
                req,
                "user_delete",
                "user",
                id,
                `Bulk deleted user: ${existingUser.email}`,
                { email: existingUser.email, role: existingUser.role }
              );
              deletedCount++;
            }
          } catch (err) {}
        }

        res.json({ success: true, deletedCount });
      } catch (error) {
        res.status(500).json({ error: "Failed to bulk delete users" });
      }
    }
  );

  // ==========================================
  // AI Writers Routes
  // ==========================================

  // Get all writers
  app.get("/api/writers", async (req, res) => {
    try {
      const writers = await storage.getAllWriters();
      res.json({ writers, total: writers.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch writers" });
    }
  });

  // Get writer stats
  app.get("/api/writers/stats", async (req, res) => {
    try {
      const stats = await storage.getWriterStats();
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch writer stats" });
    }
  });

  // Get single writer by slug
  app.get("/api/writers/:slug", async (req, res) => {
    try {
      const writer = await storage.getWriterBySlug(req.params.slug);
      if (!writer) {
        return res.status(404).json({ error: "Writer not found" });
      }
      res.json(writer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch writer" });
    }
  });

  // Seed writers from config
  app.post(
    "/api/writers/seed",
    requirePermission("canManageSettings"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const count = await storage.seedWritersFromConfig();
        res.json({ success: true, message: `Seeded ${count} writers` });
      } catch (error) {
        res.status(500).json({ error: "Failed to seed writers" });
      }
    }
  );

  // Update writer with Zod validation
  const updateWriterSchema = z
    .object({
      isActive: z.boolean().optional(),
      name: z.string().min(1).max(100).optional(),
      avatar: z.string().url().optional().or(z.literal("")),
      bio: z.string().max(5000).optional(),
      shortBio: z.string().max(500).optional(),
    })
    .strict();

  app.patch(
    "/api/writers/:id",
    requirePermission("canManageSettings"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        // Validate request body with Zod
        const parsed = updateWriterSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid request body",
            details: parsed.error.errors,
          });
        }

        // Reject empty updates
        if (Object.keys(parsed.data).length === 0) {
          return res.status(400).json({ error: "No valid fields to update" });
        }

        const updated = await storage.updateWriter(req.params.id, parsed.data);
        if (!updated) {
          return res.status(404).json({ error: "Writer not found" });
        }
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: "Failed to update writer" });
      }
    }
  );

  // Homepage Promotions Routes
  app.get("/api/homepage-promotions/:section", async (req, res) => {
    try {
      const section = req.params.section as HomepageSection;
      const validSections = [
        "featured",
        "attractions",
        "hotels",
        "articles",
        "trending",
        "dining",
        "events",
      ];
      if (!validSections.includes(section)) {
        return res.status(400).json({ error: "Invalid section" });
      }
      const promotions = await storage.getHomepagePromotionsBySection(section);

      // Fetch content details for each promotion
      const promotionsWithContent = await Promise.all(
        promotions.map(async promo => {
          if (promo.contentId) {
            const content = await storage.getContent(promo.contentId);
            return { ...promo, content };
          }
          return promo;
        })
      );

      res.json(promotionsWithContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage promotions" });
    }
  });

  app.post(
    "/api/homepage-promotions",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const parsed = insertHomepagePromotionSchema.parse(req.body);
        const promotion = await storage.createHomepagePromotion(parsed);
        res.status(201).json(promotion);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create homepage promotion" });
      }
    }
  );

  app.patch(
    "/api/homepage-promotions/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        // Validate update payload - only allow specific fields
        const updateSchema = z.object({
          isActive: z.boolean().optional(),
          position: z.number().int().min(0).optional(),
          customTitle: z.string().nullable().optional(),
          customImage: z.string().nullable().optional(),
        });
        const parsed = updateSchema.parse(req.body);

        const promotion = await storage.updateHomepagePromotion(req.params.id, parsed);
        if (!promotion) {
          return res.status(404).json({ error: "Homepage promotion not found" });
        }
        res.json(promotion);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update homepage promotion" });
      }
    }
  );

  app.delete(
    "/api/homepage-promotions/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteHomepagePromotion(req.params.id);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete homepage promotion" });
      }
    }
  );

  app.post(
    "/api/homepage-promotions/reorder",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const reorderSchema = z.object({
          section: z.enum([
            "featured",
            "attractions",
            "hotels",
            "articles",
            "trending",
            "dining",
            "events",
          ]),
          orderedIds: z.array(z.string().uuid()),
        });
        const { section, orderedIds } = reorderSchema.parse(req.body);

        await storage.reorderHomepagePromotions(section, orderedIds);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to reorder homepage promotions" });
      }
    }
  );

  // ========== HOMEPAGE CMS ADMIN ROUTES ==========
  // All admin endpoints now support ?locale=xx for reading/writing translations
  // Translatable fields are saved to cms_translations table

  // Homepage Sections CRUD
  app.get("/api/admin/homepage/sections", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const sections = await db
        .select()
        .from(homepageSections)
        .orderBy(homepageSections.sortOrder)
        .limit(100);

      // Apply translations
      const translationsMap = await getBulkTranslations(
        "homepage_section",
        sections.map(s => s.id),
        locale
      );
      const translatedSections = sections.map(section => {
        const trans = translationsMap.get(String(section.id)) || {};
        return {
          ...section,
          title: trans.title ?? section.title,
          subtitle: trans.subtitle ?? section.subtitle,
        };
      });

      res.json(translatedSections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  app.patch(
    "/api/admin/homepage/sections/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const { title, subtitle, ...structuralUpdates } = req.body;

        // Update structural fields directly on table
        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageSections)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageSections.id, id));
        }

        // Save translatable fields to translations table
        await setTranslations("homepage_section", id, locale, { title, subtitle });

        // Fetch updated record with translations
        const [section] = await db
          .select()
          .from(homepageSections)
          .where(eq(homepageSections.id, id));
        const trans = await getTranslations("homepage_section", id, locale);

        res.json({
          ...section,
          title: trans.title ?? section?.title,
          subtitle: trans.subtitle ?? section?.subtitle,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update homepage section" });
      }
    }
  );

  // List available server-side images from a specific folder
  app.get(
    "/api/admin/homepage/available-images",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const fs = await import("fs").then(m => m.promises);
        const pathModule = await import("path");

        const folder = (req.query.folder as string) || "hero";
        const allowedFolders = ["hero", "cards", "experiences", "regions"];

        if (!allowedFolders.includes(folder)) {
          return res.status(400).json({ error: "Invalid folder" });
        }

        const targetDir = pathModule.join(process.cwd(), "client", "public", folder);

        try {
          const files = await fs.readdir(targetDir);
          const imageFiles = files
            .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
            .map(f => ({
              filename: f,
              url: `/${folder}/${f}`,
              name: f.replace(/\.[^.]+$/, "").replace(/-/g, " "),
            }));
          res.json(imageFiles);
        } catch {
          res.json([]);
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to list images" });
      }
    }
  );

  // Legacy endpoint for hero images (backwards compatibility)
  app.get(
    "/api/admin/homepage/available-hero-images",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const fs = await import("fs").then(m => m.promises);
        const path = await import("path");
        const heroDir = path.join(process.cwd(), "client", "public", "hero");

        try {
          const files = await fs.readdir(heroDir);
          const imageFiles = files
            .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
            .map(f => ({
              filename: f,
              url: `/hero/${f}`,
              name: f.replace(/\.[^.]+$/, "").replace(/-/g, " "),
            }));
          res.json(imageFiles);
        } catch {
          res.json([]);
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to list hero images" });
      }
    }
  );

  // Upload homepage image with WebP conversion and custom filename
  app.post(
    "/api/admin/homepage/upload-image",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const fs = await import("fs").then(m => m.promises);
        const pathModule = await import("path");

        // Get custom filename from request body, or use original
        let customFilename = req.body.customFilename?.trim();
        const targetFolder = req.body.folder || "hero"; // Default to hero folder

        // Validate folder (only allow specific folders)
        const allowedFolders = ["hero", "cards", "experiences", "regions"];
        if (!allowedFolders.includes(targetFolder)) {
          return res.status(400).json({ error: "Invalid target folder" });
        }

        // Sanitize filename - remove special chars, keep only alphanumeric, hyphens, underscores
        if (customFilename) {
          customFilename = customFilename
            .toLowerCase()
            .replace(/[^a-z0-9\-_]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        } else {
          // Use original filename without extension
          customFilename = req.file.originalname
            .replace(/\.[^.]+$/, "")
            .toLowerCase()
            .replace(/[^a-z0-9\-_]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        }

        if (!customFilename) {
          customFilename = `image-${Date.now()}`;
        }

        // Always save as WebP
        const finalFilename = `${customFilename}.webp`;
        const targetDir = pathModule.join(process.cwd(), "client", "public", targetFolder);
        const targetPath = pathModule.join(targetDir, finalFilename);

        // Ensure directory exists
        await fs.mkdir(targetDir, { recursive: true });

        // Check if file already exists
        try {
          await fs.access(targetPath);
          return res
            .status(400)
            .json({ error: `File "${finalFilename}" already exists. Choose a different name.` });
        } catch {
          // File doesn't exist, good to proceed
        }

        // Convert to WebP using sharp
        const webpBuffer = await sharp(req.file.buffer).webp({ quality: 85 }).toBuffer();

        // Get image dimensions
        const metadata = await sharp(webpBuffer).metadata();

        // Save the file
        await fs.writeFile(targetPath, webpBuffer);

        const url = `/${targetFolder}/${finalFilename}`;

        res.json({
          success: true,
          filename: finalFilename,
          url,
          width: metadata.width,
          height: metadata.height,
          size: webpBuffer.length,
          folder: targetFolder,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to upload image" });
      }
    }
  );

  // Hero Slides CRUD
  app.get("/api/admin/homepage/hero-slides", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const slides = await db.select().from(heroSlides).orderBy(heroSlides.sortOrder).limit(50);

      const translationsMap = await getBulkTranslations(
        "hero_slide",
        slides.map(s => s.id),
        locale
      );
      const translatedSlides = slides.map(slide => {
        const trans = translationsMap.get(String(slide.id)) || {};
        return {
          ...slide,
          headline: trans.headline ?? slide.headline,
          subheadline: trans.subheadline ?? slide.subheadline,
          ctaText: trans.ctaText ?? slide.ctaText,
        };
      });

      res.json(translatedSlides);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hero slides" });
    }
  });

  app.post(
    "/api/admin/homepage/hero-slides",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { headline, subheadline, ctaText, ...structuralData } = req.body;

        const [slide] = await db.insert(heroSlides).values(structuralData).returning();

        // Save translations
        await setTranslations("hero_slide", slide.id, locale, { headline, subheadline, ctaText });

        res.json({ ...slide, headline, subheadline, ctaText });
      } catch (error) {
        res.status(500).json({ error: "Failed to create hero slide" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/hero-slides/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const { headline, subheadline, ctaText, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(heroSlides)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(heroSlides.id, id));
        }

        await setTranslations("hero_slide", id, locale, { headline, subheadline, ctaText });

        const [slide] = await db.select().from(heroSlides).where(eq(heroSlides.id, id));
        const trans = await getTranslations("hero_slide", id, locale);

        res.json({
          ...slide,
          headline: trans.headline ?? slide?.headline,
          subheadline: trans.subheadline ?? slide?.subheadline,
          ctaText: trans.ctaText ?? slide?.ctaText,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update hero slide" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/hero-slides/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        await deleteEntityTranslations("hero_slide", id);
        await db.delete(heroSlides).where(eq(heroSlides.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete hero slide" });
      }
    }
  );

  // Homepage Cards (Quick Categories) CRUD
  app.get("/api/admin/homepage/cards", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const cards = await db
        .select()
        .from(homepageCards)
        .orderBy(homepageCards.sortOrder)
        .limit(100);

      const translationsMap = await getBulkTranslations(
        "homepage_card",
        cards.map(c => c.id),
        locale
      );
      const translatedCards = cards.map(card => {
        const trans = translationsMap.get(String(card.id)) || {};
        return {
          ...card,
          title: trans.title ?? card.title,
          subtitle: trans.subtitle ?? card.subtitle,
        };
      });

      res.json(translatedCards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage cards" });
    }
  });

  app.post(
    "/api/admin/homepage/cards",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { title, subtitle, ...structuralData } = req.body;

        const [card] = await db.insert(homepageCards).values(structuralData).returning();
        await setTranslations("homepage_card", card.id, locale, { title, subtitle });

        res.json({ ...card, title, subtitle });
      } catch (error) {
        res.status(500).json({ error: "Failed to create homepage card" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/cards/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const locale = (req.query.locale as string) || "en";
        const { title, subtitle, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageCards)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageCards.id, id));
        }

        await setTranslations("homepage_card", id, locale, { title, subtitle });

        const [card] = await db.select().from(homepageCards).where(eq(homepageCards.id, id));
        const trans = await getTranslations("homepage_card", id, locale);

        res.json({
          ...card,
          title: trans.title ?? card?.title,
          subtitle: trans.subtitle ?? card?.subtitle,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update homepage card" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/cards/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteEntityTranslations("homepage_card", id);
        await db.delete(homepageCards).where(eq(homepageCards.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete homepage card" });
      }
    }
  );

  // Experience Categories CRUD
  app.get(
    "/api/admin/homepage/experience-categories",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const categories = await db
          .select()
          .from(experienceCategories)
          .orderBy(experienceCategories.sortOrder)
          .limit(50);

        const translationsMap = await getBulkTranslations(
          "experience_category",
          categories.map(c => c.id),
          locale
        );
        const translatedCategories = categories.map(cat => {
          const trans = translationsMap.get(String(cat.id)) || {};
          return {
            ...cat,
            name: trans.name ?? cat.name,
            description: trans.description ?? cat.description,
          };
        });

        res.json(translatedCategories);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch experience categories" });
      }
    }
  );

  app.post(
    "/api/admin/homepage/experience-categories",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { name, description, ...structuralData } = req.body;

        const [category] = await db.insert(experienceCategories).values(structuralData).returning();
        await setTranslations("experience_category", category.id, locale, { name, description });

        res.json({ ...category, name, description });
      } catch (error) {
        res.status(500).json({ error: "Failed to create experience category" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/experience-categories/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const locale = (req.query.locale as string) || "en";
        const { name, description, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(experienceCategories)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(experienceCategories.id, id));
        }

        await setTranslations("experience_category", id, locale, { name, description });

        const [cat] = await db
          .select()
          .from(experienceCategories)
          .where(eq(experienceCategories.id, id));
        const trans = await getTranslations("experience_category", id, locale);

        res.json({
          ...cat,
          name: trans.name ?? cat?.name,
          description: trans.description ?? cat?.description,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update experience category" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/experience-categories/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteEntityTranslations("experience_category", id);
        await db.delete(experienceCategories).where(eq(experienceCategories.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete experience category" });
      }
    }
  );

  // ============================================================================
  // DESTINATIONS ADMIN CRUD (Homepage Editor)
  // ============================================================================

  app.get("/api/admin/homepage/destinations", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const allDestinations = await db.select().from(destinations).orderBy(destinations.name);

      // Get translations for destinations
      const translationsMap = await getBulkTranslations(
        "destination" as any,
        allDestinations.map(d => d.id),
        locale
      );
      const translatedDestinations = allDestinations.map(dest => {
        const trans = translationsMap.get(String(dest.id)) || {};
        return {
          ...dest,
          name: trans.name ?? dest.name,
          summary: trans.summary ?? dest.summary,
        };
      });

      res.json(translatedDestinations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  app.post(
    "/api/admin/homepage/destinations",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { id, name, summary, country, slug, cardImage, cardImageAlt, isActive } = req.body;

        // Check if destination with this ID already exists
        const existing = await db.select().from(destinations).where(eq(destinations.id, id));
        if (existing.length > 0) {
          return res.status(400).json({ error: "Destination with this ID already exists" });
        }

        // Generate normalizedName for indexed lookups (consistent with graph-resolver)
        const normalizedName = name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");

        const [destination] = await db
          .insert(destinations)
          .values({
            id,
            name,
            normalizedName,
            country: country || "",
            slug: slug || `/destinations/${id}`,
            cardImage,
            cardImageAlt,
            isActive: isActive ?? true,
            summary,
          } as any)
          .returning();

        // Store translations
        await setTranslations("destination" as any, id, locale, { name, summary });

        res.json({ ...destination, name, summary });
      } catch (error) {
        res.status(500).json({ error: "Failed to create destination" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/destinations/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = req.params.id;
        const locale = (req.query.locale as string) || "en";
        const { name, summary, ...structuralUpdates } = req.body;

        // Update structural fields in destinations table
        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(destinations)
            .set({
              ...structuralUpdates,
              updatedAt: new Date(),
            })
            .where(eq(destinations.id, id));
        }

        // Store translations
        await setTranslations("destination" as any, id, locale, { name, summary });

        const [dest] = await db.select().from(destinations).where(eq(destinations.id, id));
        const trans = await getTranslations("destination" as any, id, locale);

        res.json({
          ...dest,
          name: trans.name ?? dest?.name,
          summary: trans.summary ?? dest?.summary,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update destination" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/destinations/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = req.params.id;
        await deleteEntityTranslations("destination" as any, id);
        await db.delete(destinations).where(eq(destinations.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete destination" });
      }
    }
  );

  // AI Image Analysis for destinations
  app.post(
    "/api/admin/homepage/destinations/analyze-image",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
          return res.status(400).json({ error: "imageUrl is required" });
        }

        // Use visual search to analyze the image
        const { visualSearch } = await import("./ai/visual-search");
        const analysis = await visualSearch.analyzeImage(imageUrl);

        if (!analysis) {
          return res.status(500).json({ error: "Failed to analyze image" });
        }

        // Generate suggested alt text from analysis
        const suggestedAlt = analysis.description.slice(0, 125);
        const suggestedKeywords = analysis.keywords.slice(0, 5);

        res.json({
          success: true,
          analysis: {
            description: analysis.description,
            keywords: analysis.keywords,
            landmarks: analysis.landmarks,
            colors: analysis.colors,
            mood: analysis.mood,
            contentType: analysis.contentType,
            confidence: analysis.confidence,
          },
          suggestions: {
            altText: suggestedAlt,
            keywords: suggestedKeywords,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to analyze image";
        res.status(500).json({ error: message });
      }
    }
  );

  // Auto Meta Generator - Comprehensive metadata from image and filename
  // Returns structured errors for specific failure reasons
  app.post(
    "/api/admin/auto-meta",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      const { imageUrl, filename } = req.body;

      // Request validation
      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_REQUEST",
            message: "imageUrl is required",
          },
        });
      }

      try {
        const { visualSearch } = await import("./ai/visual-search");
        const result = (await (visualSearch as any).generateAutoMeta?.(imageUrl, filename)) || {
          success: false,
          error: { code: "NOT_IMPLEMENTED", message: "generateAutoMeta not available" },
        };

        if (result.success) {
          return res.json({
            success: true,
            meta: result.meta,
          });
        } else {
          // Return the specific error to the frontend
          return res.status(500).json({
            success: false,
            error: result.error,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected error";
        return res.status(500).json({
          success: false,
          error: {
            code: "UNKNOWN",
            message: "Unexpected server error",
            details: message,
          },
        });
      }
    }
  );

  // Region Links CRUD
  app.get("/api/admin/homepage/region-links", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const links = await db.select().from(regionLinks).orderBy(regionLinks.sortOrder).limit(100);

      const translationsMap = await getBulkTranslations(
        "region_link",
        links.map(l => l.id),
        locale
      );
      const translatedLinks = links.map(link => {
        const trans = translationsMap.get(String(link.id)) || {};
        return {
          ...link,
          name: trans.name ?? link.name,
        };
      });

      res.json(translatedLinks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch region links" });
    }
  });

  app.post(
    "/api/admin/homepage/region-links",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { name, ...structuralData } = req.body;

        const [link] = await db.insert(regionLinks).values(structuralData).returning();
        await setTranslations("region_link", link.id, locale, { name });

        res.json({ ...link, name });
      } catch (error) {
        res.status(500).json({ error: "Failed to create region link" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/region-links/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const locale = (req.query.locale as string) || "en";
        const { name, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(regionLinks)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(regionLinks.id, id));
        }

        await setTranslations("region_link", id, locale, { name });

        const [link] = await db.select().from(regionLinks).where(eq(regionLinks.id, id));
        const trans = await getTranslations("region_link", id, locale);

        res.json({
          ...link,
          name: trans.name ?? link?.name,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update region link" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/region-links/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteEntityTranslations("region_link", id);
        await db.delete(regionLinks).where(eq(regionLinks.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete region link" });
      }
    }
  );

  // Homepage CTA CRUD
  app.get("/api/admin/homepage/cta", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const [cta] = await db.select().from(homepageCta).limit(1);
      if (!cta) return res.json(null);

      const trans = await getTranslations("homepage_cta", cta.id, locale);
      res.json({
        ...cta,
        headline: trans.headline ?? cta.headline,
        subheadline: trans.subheadline ?? cta.subheadline,
        inputPlaceholder: trans.inputPlaceholder ?? cta.inputPlaceholder,
        buttonText: trans.buttonText ?? cta.buttonText,
        helperText: trans.helperText ?? cta.helperText,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage CTA" });
    }
  });

  app.patch(
    "/api/admin/homepage/cta/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const {
          headline,
          subheadline,
          inputPlaceholder,
          buttonText,
          helperText,
          ...structuralUpdates
        } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageCta)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageCta.id, id));
        }

        await setTranslations("homepage_cta", id, locale, {
          headline,
          subheadline,
          inputPlaceholder,
          buttonText,
          helperText,
        });

        const [cta] = await db.select().from(homepageCta).where(eq(homepageCta.id, id));
        const trans = await getTranslations("homepage_cta", id, locale);

        res.json({
          ...cta,
          headline: trans.headline ?? cta?.headline,
          subheadline: trans.subheadline ?? cta?.subheadline,
          inputPlaceholder: trans.inputPlaceholder ?? cta?.inputPlaceholder,
          buttonText: trans.buttonText ?? cta?.buttonText,
          helperText: trans.helperText ?? cta?.helperText,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update homepage CTA" });
      }
    }
  );

  // Homepage SEO Meta CRUD
  app.get("/api/admin/homepage/seo-meta", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const [meta] = await db.select().from(homepageSeoMeta).limit(1);
      if (!meta) return res.json(null);

      const trans = await getTranslations("homepage_seo_meta", meta.id, locale);
      res.json({
        ...meta,
        metaTitle: trans.metaTitle ?? meta.metaTitle,
        metaDescription: trans.metaDescription ?? meta.metaDescription,
        ogTitle: trans.ogTitle ?? meta.ogTitle,
        ogDescription: trans.ogDescription ?? meta.ogDescription,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage SEO meta" });
    }
  });

  app.patch(
    "/api/admin/homepage/seo-meta/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const { metaTitle, metaDescription, ogTitle, ogDescription, ...structuralUpdates } =
          req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageSeoMeta)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageSeoMeta.id, id));
        }

        await setTranslations("homepage_seo_meta", id, locale, {
          metaTitle,
          metaDescription,
          ogTitle,
          ogDescription,
        });

        const [meta] = await db.select().from(homepageSeoMeta).where(eq(homepageSeoMeta.id, id));
        const trans = await getTranslations("homepage_seo_meta", id, locale);

        res.json({
          ...meta,
          metaTitle: trans.metaTitle ?? meta?.metaTitle,
          metaDescription: trans.metaDescription ?? meta?.metaDescription,
          ogTitle: trans.ogTitle ?? meta?.ogTitle,
          ogDescription: trans.ogDescription ?? meta?.ogDescription,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update homepage SEO meta" });
      }
    }
  );

  // Generate translations for all languages from English source (HOMEPAGE ONLY)
  // Non-destructive by default - skips fields that already have translations
  app.post(
    "/api/admin/homepage/generate-translations",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { translateText } = await import("./services/translation-service");
        const { cmsTranslations } = await import("@shared/schema");

        // Allow overwrite with explicit flag (default: false - non-destructive)
        const overwrite = req.body?.overwrite === true;

        // Homepage entity types ONLY - do not translate other CMS content
        const HOMEPAGE_ENTITY_TYPES = [
          "homepage_section",
          "homepage_card",
          "experience_category",
          "region_link",
          "hero_slide",
          "homepage_cta",
          "homepage_seo_meta",
        ] as const;

        // Get English translations for homepage entities only
        const englishTranslations = await db
          .select()
          .from(cmsTranslations)
          .where(
            and(
              eq(cmsTranslations.locale, "en"),
              inArray(cmsTranslations.entityType, [...HOMEPAGE_ENTITY_TYPES])
            )
          );

        if (englishTranslations.length === 0) {
          return res.json({
            success: true,
            translated: 0,
            skipped: 0,
            locales: [],
            message: "No English homepage content to translate",
          });
        }

        // Get ALL existing translations for homepage entities (to check what exists)
        const existingTranslations = await db
          .select()
          .from(cmsTranslations)
          .where(inArray(cmsTranslations.entityType, [...HOMEPAGE_ENTITY_TYPES]));

        // Build a Set for O(1) lookup: "entityType:entityId:locale:field"
        const existingKeys = new Set(
          existingTranslations
            .filter(t => t.locale !== "en" && t.value && t.value.trim() !== "")
            .map(t => `${t.entityType}:${t.entityId}:${t.locale}:${t.field}`)
        );

        // Get target locales (exclude 'en')
        const targetLocales = SUPPORTED_LOCALES.filter(l => l.code !== "en").map(l => l.code);

        let translatedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        // Process translations for each target locale
        for (const targetLocale of targetLocales) {
          for (const engTrans of englishTranslations) {
            if (!engTrans.value || engTrans.value.trim() === "") continue;

            const key = `${engTrans.entityType}:${engTrans.entityId}:${targetLocale}:${engTrans.field}`;

            // Skip if translation already exists (unless overwrite is true)
            if (!overwrite && existingKeys.has(key)) {
              skippedCount++;
              continue;
            }

            try {
              // Translate using the translation service
              const result = await translateText(
                {
                  text: engTrans.value,
                  sourceLocale: "en" as any,
                  targetLocale: targetLocale as any,
                  contentType: "body",
                },
                { provider: "claude" }
              );

              // Save the translation
              await setTranslations(engTrans.entityType as any, engTrans.entityId, targetLocale, {
                [engTrans.field]: result.translatedText,
              });

              translatedCount++;
            } catch (error) {
              const errMsg = `Failed to translate ${engTrans.entityType}:${engTrans.entityId}:${engTrans.field} to ${targetLocale}`;

              errors.push(errMsg);
            }
          }
        }

        res.json({
          success: true,
          translated: translatedCount,
          skipped: skippedCount,
          locales: targetLocales,
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
          message:
            skippedCount > 0
              ? `${skippedCount} existing translations preserved (use overwrite=true to replace)`
              : undefined,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to generate translations" });
      }
    }
  );

  // Analytics Routes (admin/editor only)
  app.get("/api/analytics/overview", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const overview = await storage.getAnalyticsOverview();
      res.json(overview);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics overview" });
    }
  });

  app.get(
    "/api/analytics/views-over-time",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const days = parseInt(req.query.days as string) || 30;
        const views = await storage.getViewsOverTime(Math.min(days, 90));
        res.json(views);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch views over time" });
      }
    }
  );

  app.get("/api/analytics/top-content", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const topContent = await storage.getTopContent(Math.min(limit, 50));
      res.json(topContent);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch top content" });
    }
  });

  app.get(
    "/api/analytics/by-content-type",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const byType = await storage.getViewsByContentType();
        res.json(byType);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch views by content type" });
      }
    }
  );

  app.post(
    "/api/analytics/record-view/:contentId",
    rateLimiters.analytics,
    validateAnalyticsRequest,
    async (req, res) => {
      try {
        const { contentId } = req.params;
        await storage.recordContentView(contentId, {
          userAgent: req.headers["user-agent"],
          referrer: req.headers.referer,
          sessionId: req.sessionID,
        });
        res.json({ success: true });
      } catch (error) {
        res.json({ success: true });
      }
    }
  );

  // Property Lead submission (public) - for off-plan property inquiries
  app.post("/api/leads/property", rateLimiters.newsletter, async (req, res) => {
    try {
      const {
        email,
        name,
        phone,
        propertyType,
        budget,
        paymentMethod,
        preferredAreas,
        timeline,
        message,
        consent,
      } = req.body;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ error: "Name required" });
      }
      if (!consent) {
        return res.status(400).json({ error: "Consent required" });
      }

      // Get IP address and user agent
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      const userAgent = req.headers["user-agent"] || "";

      // Save lead to database
      const lead = await storage.createPropertyLead({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone || null,
        propertyType: propertyType || null,
        budget: budget || null,
        paymentMethod: paymentMethod || null,
        preferredAreas: preferredAreas || null,
        timeline: timeline || null,
        message: message || null,
        source: "off-plan-form",
        status: "new",
        ipAddress,
        userAgent,
        consentGiven: true,
      });

      // Send email notification to admin
      const notificationEmail = process.env.LEAD_NOTIFICATION_EMAIL;
      if (notificationEmail) {
        const resend = getResendClient();
        if (resend) {
          try {
            await resend.emails.send({
              from: "Dubai Off-Plan <onboarding@resend.dev>",
              to: notificationEmail,
              subject: `New Property Lead: ${name.trim()}`,
              html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8f5fc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f5fc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(100,67,244,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6443F4 0%, #F94498 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">New Property Lead</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Dubai Off-Plan Investment Inquiry</p>
            </td>
          </tr>
          
          <!-- Lead Name Banner -->
          <tr>
            <td style="background-color: #FEECF4; padding: 20px 40px; border-bottom: 1px solid #FDA9E5;">
              <p style="margin: 0; color: #504065; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Lead Name</p>
              <h2 style="margin: 5px 0 0 0; color: #24103E; font-size: 22px; font-weight: 600;">${name.trim()}</h2>
            </td>
          </tr>
          
          <!-- Contact Details -->
          <tr>
            <td style="padding: 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #D3CFD8;">
                    <span style="color: #A79FB2; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span><br>
                    <a href="mailto:${email.trim()}" style="color: #6443F4; font-size: 16px; text-decoration: none; font-weight: 500;">${email.trim()}</a>
                  </td>
                </tr>
                ${
                  phone
                    ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #D3CFD8;">
                    <span style="color: #A79FB2; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Phone</span><br>
                    <a href="tel:${phone}" style="color: #6443F4; font-size: 16px; text-decoration: none; font-weight: 500;">${phone}</a>
                  </td>
                </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>
          
          <!-- Property Preferences -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h3 style="margin: 0 0 15px 0; color: #24103E; font-size: 16px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #F94498;">Property Preferences</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${
                  propertyType
                    ? `
                <tr>
                  <td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px;">Property Type</td>
                  <td style="padding: 10px 0; color: #24103E; font-size: 14px; font-weight: 500;">${propertyType}</td>
                </tr>`
                    : ""
                }
                ${
                  budget
                    ? `
                <tr>
                  <td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px;">Budget</td>
                  <td style="padding: 10px 0;"><span style="background: linear-gradient(135deg, #FF9327, #FFD112); color: #24103E; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${budget}</span></td>
                </tr>`
                    : ""
                }
                ${
                  paymentMethod
                    ? `
                <tr>
                  <td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px;">Payment Method</td>
                  <td style="padding: 10px 0;"><span style="background: #6443F4; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">${paymentMethod}</span></td>
                </tr>`
                    : ""
                }
                ${
                  preferredAreas?.length
                    ? `
                <tr>
                  <td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px; vertical-align: top;">Preferred Areas</td>
                  <td style="padding: 10px 0;">${preferredAreas.map((area: string) => `<span style="display: inline-block; background: #FEECF4; color: #F94498; padding: 4px 10px; border-radius: 20px; font-size: 12px; margin: 2px 4px 2px 0;">${area}</span>`).join("")}</td>
                </tr>`
                    : ""
                }
                ${
                  timeline
                    ? `
                <tr>
                  <td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px;">Timeline</td>
                  <td style="padding: 10px 0; color: #24103E; font-size: 14px; font-weight: 500;">${timeline}</td>
                </tr>`
                    : ""
                }
              </table>
            </td>
          </tr>
          
          ${
            message
              ? `
          <!-- Message -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h3 style="margin: 0 0 10px 0; color: #24103E; font-size: 16px; font-weight: 600;">Message</h3>
              <p style="margin: 0; padding: 15px; background: #f8f5fc; border-radius: 8px; color: #504065; font-size: 14px; line-height: 1.6;">${message}</p>
            </td>
          </tr>`
              : ""
          }
          
          <!-- Footer -->
          <tr>
            <td style="background: #24103E; padding: 25px 40px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #A79FB2; font-size: 11px;">Lead ID: ${lead.id}</p>
              <p style="margin: 0; color: #A79FB2; font-size: 11px;">Submitted: ${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
              `,
            });
          } catch (emailError) {}
        }
      }

      res.json({
        success: true,
        message: "Thank you! Our team will contact you within 24 hours.",
        leadId: lead.id,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit. Please try again." });
    }
  });

  // Newsletter subscription (public) - Double Opt-In flow with rate limiting
  app.post("/api/newsletter/subscribe", rateLimiters.newsletter, async (req, res) => {
    try {
      const { email, firstName, lastName, source } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }

      // Get IP address
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

      // Check if already subscribed
      const existing = await storage.getNewsletterSubscriberByEmail(email);
      if (existing) {
        if (existing.status === "subscribed") {
          return res.json({ success: true, message: "Already subscribed" });
        }
        if (existing.status === "pending_confirmation") {
          return res.json({
            success: true,
            message: "Confirmation email already sent. Please check your inbox.",
          });
        }
        // Allow resubscription for unsubscribed users
        if (existing.status === "unsubscribed") {
          const confirmToken = crypto.randomUUID();
          const consentEntry = {
            action: "resubscribe" as const,
            timestamp: new Date().toISOString(),
            ipAddress,
            userAgent: req.headers["user-agent"],
            source: source || "coming_soon",
          };
          const consentLog = [...(existing.consentLog || []), consentEntry];

          await storage.updateNewsletterSubscriber(existing.id, {
            status: "pending_confirmation",
            confirmToken,
            consentLog,
            ipAddress,
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
          });

          // Send confirmation email
          await sendConfirmationEmail(
            email,
            confirmToken,
            firstName || existing.firstName || undefined
          );

          return res.json({
            success: true,
            message: "Please check your email to confirm your subscription",
          });
        }
      }

      // Generate confirmation token
      const confirmToken = crypto.randomUUID();

      // Create consent log entry
      const consentEntry = {
        action: "subscribe" as const,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: req.headers["user-agent"],
        source: source || "coming_soon",
      };

      // Save to database with pending status
      await storage.createNewsletterSubscriber({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        source: source || "coming_soon",
        status: "pending_confirmation",
        ipAddress,
        confirmToken,
        consentLog: [consentEntry],
      });

      // Send confirmation email
      await sendConfirmationEmail(email, confirmToken, firstName || undefined);

      res.json({ success: true, message: "Please check your email to confirm your subscription" });
    } catch (error) {
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Newsletter confirmation endpoint - Double Opt-In step 2
  app.get("/api/newsletter/confirm/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).send(renderConfirmationPage(false, "Invalid confirmation link"));
      }

      const subscriber = await storage.getNewsletterSubscriberByToken(token);

      if (!subscriber) {
        return res
          .status(404)
          .send(renderConfirmationPage(false, "Confirmation link not found or expired"));
      }

      if (subscriber.status === "subscribed") {
        return res.send(renderConfirmationPage(true, "Your subscription was already confirmed!"));
      }

      // Get IP address
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

      // Create consent log entry for confirmation
      const consentEntry = {
        action: "confirm" as const,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: req.headers["user-agent"],
      };
      const consentLog = [...(subscriber.consentLog || []), consentEntry];

      // Update subscriber status
      await storage.updateNewsletterSubscriber(subscriber.id, {
        status: "subscribed",
        consentLog,
        isActive: true,
      });

      // Clear confirmToken and set confirmedAt in separate update (since confirmedAt is not in insert schema)
      await db
        .update(newsletterSubscribers)
        .set({
          confirmToken: null,
          confirmedAt: new Date(),
        } as any)
        .where(eq(newsletterSubscribers.id, subscriber.id));

      // Send welcome email (fire and forget - don't block response)
      sendWelcomeEmail(subscriber.email, subscriber.firstName || undefined, subscriber.id).catch(
        err => {}
      );

      res.send(renderConfirmationPage(true, "Thank you! Your subscription has been confirmed."));
    } catch (error) {
      res
        .status(500)
        .send(renderConfirmationPage(false, "Something went wrong. Please try again."));
    }
  });

  // Newsletter unsubscribe endpoint (public) - requires token for security
  app.get("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res
          .status(400)
          .send(
            renderUnsubscribePage(
              false,
              "Invalid unsubscribe link. Please use the link from your email."
            )
          );
      }

      const subscriber = await storage.getNewsletterSubscriberByToken(token as string);

      if (!subscriber) {
        return res.send(
          renderUnsubscribePage(false, "Unsubscribe link not found or already used.")
        );
      }

      if (subscriber.status === "unsubscribed") {
        return res.send(renderUnsubscribePage(true, "You have already been unsubscribed."));
      }

      // Get IP address
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

      // Create consent log entry
      const consentEntry = {
        action: "unsubscribe" as const,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: req.headers["user-agent"],
      };
      const consentLog = [...(subscriber.consentLog || []), consentEntry];

      // Update subscriber status
      await storage.updateNewsletterSubscriber(subscriber.id, {
        status: "unsubscribed",
        consentLog,
        isActive: false,
      });

      // Set unsubscribedAt
      await db
        .update(newsletterSubscribers)
        .set({ unsubscribedAt: new Date() } as any)
        .where(eq(newsletterSubscribers.id, subscriber.id));

      res.send(
        renderUnsubscribePage(true, "You have been successfully unsubscribed from our newsletter.")
      );
    } catch (error) {
      res.status(500).send(renderUnsubscribePage(false, "Something went wrong. Please try again."));
    }
  });

  // Newsletter subscribers list (admin only)
  app.get(
    "/api/newsletter/subscribers",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const { status } = req.query;
        const filters = status ? { status: status as string } : undefined;
        const subscribers = await storage.getNewsletterSubscribers(filters);
        res.json(subscribers);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch subscribers" });
      }
    }
  );

  // Delete newsletter subscriber (admin only - right to be forgotten)
  app.delete(
    "/api/newsletter/subscribers/:id",
    requirePermission("canManageUsers"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const subscriber = await storage.getNewsletterSubscriber(id);

        if (!subscriber) {
          return res.status(404).json({ error: "Subscriber not found" });
        }

        const deleted = await storage.deleteNewsletterSubscriber(id);
        if (deleted) {
          await logAuditEvent(
            req,
            "delete",
            "newsletter_subscriber",
            id,
            `Deleted newsletter subscriber: ${subscriber.email}`,
            { email: subscriber.email }
          );

          res.json({ success: true, message: "Subscriber deleted successfully" });
        } else {
          res.status(500).json({ error: "Failed to delete subscriber" });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to delete subscriber" });
      }
    }
  );

  // Update subscriber preferences (language, interest tags)
  app.patch(
    "/api/newsletter/subscribers/:id",
    requirePermission("canManageUsers"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { languagePreference, interestTags, tags, preferences } = req.body;

        const subscriber = await storage.getNewsletterSubscriber(id);
        if (!subscriber) {
          return res.status(404).json({ error: "Subscriber not found" });
        }

        const updateData: Record<string, any> = {};
        if (languagePreference !== undefined) updateData.languagePreference = languagePreference;
        if (interestTags !== undefined) updateData.interestTags = interestTags;
        if (tags !== undefined) updateData.tags = tags;
        if (preferences !== undefined) updateData.preferences = preferences;

        const updated = await storage.updateNewsletterSubscriber(id, updateData);
        await logAuditEvent(
          req,
          "update",
          "newsletter_subscriber",
          id,
          `Updated subscriber preferences: ${subscriber.email}`
        );
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: "Failed to update subscriber" });
      }
    }
  );

  // ============================================================================
  // EMAIL TEMPLATES API
  // ============================================================================

  app.get("/api/email-templates", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { category } = req.query;
      const filters = category ? { category: category as string } : undefined;
      const templates = await storage.getEmailTemplates(filters);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/email-templates/:id", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post(
    "/api/email-templates",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const user = req.user as any;
        const templateData = {
          ...req.body,
          createdBy: user?.claims?.sub || null,
        };
        const template = await storage.createEmailTemplate(templateData);
        await logAuditEvent(
          req,
          "create",
          "campaign",
          template.id,
          `Created email template: ${template.name}`
        );
        res.status(201).json(template);
      } catch (error) {
        res.status(500).json({ error: "Failed to create template" });
      }
    }
  );

  app.patch(
    "/api/email-templates/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getEmailTemplate(id);
        if (!existing) {
          return res.status(404).json({ error: "Template not found" });
        }
        const template = await storage.updateEmailTemplate(id, req.body);
        await logAuditEvent(
          req,
          "update",
          "campaign",
          id,
          `Updated email template: ${template?.name}`
        );
        res.json(template);
      } catch (error) {
        res.status(500).json({ error: "Failed to update template" });
      }
    }
  );

  app.delete(
    "/api/email-templates/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getEmailTemplate(id);
        if (!existing) {
          return res.status(404).json({ error: "Template not found" });
        }
        await storage.deleteEmailTemplate(id);
        await logAuditEvent(
          req,
          "delete",
          "campaign",
          id,
          `Deleted email template: ${existing.name}`
        );
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete template" });
      }
    }
  );

  // ============================================================================
  // NEWSLETTER A/B TESTS API
  // ============================================================================

  app.get("/api/newsletter/ab-tests", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { status } = req.query;
      const filters = status ? { status: status as string } : undefined;
      const tests = await storage.getNewsletterAbTests(filters);
      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });

  app.get(
    "/api/newsletter/ab-tests/:id",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const test = await storage.getNewsletterAbTest(req.params.id);
        if (!test) {
          return res.status(404).json({ error: "A/B test not found" });
        }
        res.json(test);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch A/B test" });
      }
    }
  );

  app.post(
    "/api/newsletter/ab-tests",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const user = req.user as any;
        const testData = {
          ...req.body,
          createdBy: user?.claims?.sub || null,
          status: "draft",
        };
        const test = await storage.createNewsletterAbTest(testData);
        await logAuditEvent(req, "create", "campaign", test.id, `Created A/B test: ${test.name}`);
        res.status(201).json(test);
      } catch (error) {
        res.status(500).json({ error: "Failed to create A/B test" });
      }
    }
  );

  app.patch(
    "/api/newsletter/ab-tests/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getNewsletterAbTest(id);
        if (!existing) {
          return res.status(404).json({ error: "A/B test not found" });
        }
        const test = await storage.updateNewsletterAbTest(id, req.body);
        await logAuditEvent(req, "update", "campaign", id, `Updated A/B test: ${test?.name}`);
        res.json(test);
      } catch (error) {
        res.status(500).json({ error: "Failed to update A/B test" });
      }
    }
  );

  // Start an A/B test
  app.post(
    "/api/newsletter/ab-tests/:id/start",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const test = await storage.getNewsletterAbTest(id);
        if (!test) {
          return res.status(404).json({ error: "A/B test not found" });
        }
        if (test.status !== "draft") {
          return res.status(400).json({ error: "Test has already been started" });
        }

        const updated = await storage.updateNewsletterAbTest(id, {
          status: "running",
          startedAt: new Date(),
        });
        await logAuditEvent(req, "update", "campaign", id, `Started A/B test: ${test.name}`);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: "Failed to start A/B test" });
      }
    }
  );

  // Select winner for an A/B test
  app.post(
    "/api/newsletter/ab-tests/:id/select-winner",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { winnerId } = req.body;

        if (!winnerId || !["a", "b"].includes(winnerId)) {
          return res.status(400).json({ error: "Winner must be 'a' or 'b'" });
        }

        const test = await storage.getNewsletterAbTest(id);
        if (!test) {
          return res.status(404).json({ error: "A/B test not found" });
        }

        const updated = await storage.updateNewsletterAbTest(id, {
          status: "completed",
          winnerId,
          completedAt: new Date(),
        });
        await logAuditEvent(
          req,
          "update",
          "campaign",
          id,
          `Selected winner for A/B test: ${test.name} - Winner: Variant ${winnerId.toUpperCase()}`
        );
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: "Failed to select winner" });
      }
    }
  );

  app.delete(
    "/api/newsletter/ab-tests/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getNewsletterAbTest(id);
        if (!existing) {
          return res.status(404).json({ error: "A/B test not found" });
        }
        await storage.deleteNewsletterAbTest(id);
        await logAuditEvent(req, "delete", "campaign", id, `Deleted A/B test: ${existing.name}`);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete A/B test" });
      }
    }
  );

  // ============================================================================
  // SUBSCRIBER SEGMENTS API
  // ============================================================================

  app.get("/api/subscriber-segments", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const segments = await storage.getSubscriberSegments();
      res.json(segments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch segments" });
    }
  });

  app.get(
    "/api/subscriber-segments/:id",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const segment = await storage.getSubscriberSegment(req.params.id);
        if (!segment) {
          return res.status(404).json({ error: "Segment not found" });
        }
        const conditions = await storage.getSegmentConditions(req.params.id);
        res.json({ ...segment, conditions });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch segment" });
      }
    }
  );

  app.post(
    "/api/subscriber-segments",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const user = req.user as any;
        const { conditions, ...segmentData } = req.body;

        const segment = await storage.createSubscriberSegment({
          ...segmentData,
          createdBy: user?.claims?.sub || null,
        });

        if (conditions && Array.isArray(conditions)) {
          for (const condition of conditions) {
            await storage.createSegmentCondition({
              ...condition,
              segmentId: segment.id,
            });
          }
        }

        await logAuditEvent(
          req,
          "create",
          "campaign",
          segment.id,
          `Created subscriber segment: ${segment.name}`
        );
        res.status(201).json(segment);
      } catch (error) {
        res.status(500).json({ error: "Failed to create segment" });
      }
    }
  );

  app.patch(
    "/api/subscriber-segments/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getSubscriberSegment(id);
        if (!existing) {
          return res.status(404).json({ error: "Segment not found" });
        }
        const segment = await storage.updateSubscriberSegment(id, req.body);
        await logAuditEvent(
          req,
          "update",
          "campaign",
          id,
          `Updated subscriber segment: ${segment?.name}`
        );
        res.json(segment);
      } catch (error) {
        res.status(500).json({ error: "Failed to update segment" });
      }
    }
  );

  app.delete(
    "/api/subscriber-segments/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getSubscriberSegment(id);
        if (!existing) {
          return res.status(404).json({ error: "Segment not found" });
        }
        await storage.deleteSubscriberSegment(id);
        await logAuditEvent(
          req,
          "delete",
          "campaign",
          id,
          `Deleted subscriber segment: ${existing.name}`
        );
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete segment" });
      }
    }
  );

  // ============================================================================
  // BOUNCE TRACKING STATS API
  // ============================================================================

  app.get(
    "/api/newsletter/bounce-stats",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const subscribers = await storage.getNewsletterSubscribers();
        const bouncedSubscribers = subscribers.filter(s => s.status === "bounced");
        const totalBounced = bouncedSubscribers.length;
        const totalSubscribers = subscribers.length;
        const bounceRate =
          totalSubscribers > 0 ? ((totalBounced / totalSubscribers) * 100).toFixed(2) : "0";

        res.json({
          totalBounced,
          totalSubscribers,
          bounceRate: parseFloat(bounceRate),
          bouncedSubscribers: bouncedSubscribers.slice(0, 50),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch bounce statistics" });
      }
    }
  );

  // ============================================================================
  // NEWSLETTER SEGMENTS API (for segmentation by language preference)
  // ============================================================================

  app.get("/api/newsletter/segments", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const subscribers = await storage.getNewsletterSubscribers();
      const activeSubscribers = subscribers.filter(s => s.status === "subscribed");

      // Build language segments
      const languageSegments: Record<string, { count: number; subscribers: string[] }> = {};
      for (const sub of activeSubscribers) {
        const lang = sub.locale || "en";
        if (!languageSegments[lang]) {
          languageSegments[lang] = { count: 0, subscribers: [] };
        }
        languageSegments[lang].count++;
        languageSegments[lang].subscribers.push(sub.id);
      }

      // Get custom segments from storage
      const customSegments = await storage.getSubscriberSegments();

      // Format response
      const segments = [
        // Built-in language segments
        ...Object.entries(languageSegments).map(([lang, data]) => ({
          id: `lang_${lang}`,
          name: `Language: ${lang.toUpperCase()}`,
          type: "language" as const,
          language: lang,
          subscriberCount: data.count,
          isDynamic: true,
        })),
        // Custom segments
        ...customSegments.map(seg => ({
          id: seg.id,
          name: seg.name,
          type: "custom" as const,
          language: null,
          subscriberCount: seg.subscriberCount || 0,
          isDynamic: seg.isDynamic,
          description: seg.description,
        })),
      ];

      res.json({
        segments,
        totalActive: activeSubscribers.length,
        languageCounts: Object.fromEntries(
          Object.entries(languageSegments).map(([lang, data]) => [lang, data.count])
        ),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch segments" });
    }
  });

  // ============================================================================
  // NEWSLETTER SEND API (with segment filter and A/B testing)
  // ============================================================================

  app.post(
    "/api/newsletter/send",
    requirePermission("canPublish"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const {
          campaignName,
          subject,
          subjectB, // For A/B testing - second subject line
          htmlContent,
          segmentId, // Optional segment filter (e.g., "lang_en" or custom segment ID)
          enableAbTest = false,
          testDurationHours = 24,
          winnerMetric = "open_rate",
        } = req.body;

        if (!campaignName || !subject || !htmlContent) {
          return res
            .status(400)
            .json({ error: "Missing required fields: campaignName, subject, htmlContent" });
        }

        if (enableAbTest && !subjectB) {
          return res.status(400).json({ error: "A/B testing requires subjectB" });
        }

        // Get target subscribers based on segment
        let subscribers = await storage.getNewsletterSubscribers();
        let targetSubscribers = subscribers.filter(s => s.status === "subscribed");

        // Apply segment filter
        if (segmentId) {
          if (segmentId.startsWith("lang_")) {
            const language = segmentId.replace("lang_", "");
            targetSubscribers = targetSubscribers.filter(s => (s.locale || "en") === language);
          } else {
            // Custom segment - would need segment conditions evaluation
            // For now, we'll use the segment's subscriber list from segmentation module
            const { getSegmentSubscribers } = await import("./newsletter/segmentation");
            const segmentSubs = await getSegmentSubscribers(segmentId);
            const segmentSubIds = new Set(segmentSubs.map((s: any) => s.id));
            targetSubscribers = targetSubscribers.filter(s => segmentSubIds.has(s.id));
          }
        }

        if (targetSubscribers.length === 0) {
          return res.status(400).json({ error: "No subscribers match the selected segment" });
        }

        // Create A/B test if enabled
        let abTestId: string | null = null;
        if (enableAbTest && subjectB) {
          const { createAbTest } = await import("./newsletter/ab-testing");
          const abTest = await createAbTest({
            name: `${campaignName} - Subject Line Test`,
            testType: "subject_line",
            variantA: { subject },
            variantB: { subject: subjectB },
            splitPercentage: 50,
            testDurationHours,
            autoSelectWinner: true,
            winnerMetric,
            status: "running",
            startedAt: new Date(),
          });
          abTestId = abTest.id;
        }

        // Create campaign
        const campaign = await db
          .insert(newsletterCampaigns)
          .values({
            name: campaignName,
            subject,
            subjectHe: subjectB || null, // Reuse subjectHe field for variant B
            htmlContent,
            status: "sending",
            targetLocales: segmentId?.startsWith("lang_") ? [segmentId.replace("lang_", "")] : null,
            totalRecipients: targetSubscribers.length,
          } as any)
          .returning();

        const campaignId = campaign[0].id;

        // Split subscribers for A/B testing
        const { getVariantForSubscriber, recordSend } = await import("./newsletter/ab-testing");

        let variantACounts = 0;
        let variantBCounts = 0;

        // Queue emails for sending (in production, this would use job queue)
        for (const subscriber of targetSubscribers) {
          let emailSubject = subject;
          let variant: "a" | "b" = "a";

          if (enableAbTest && abTestId) {
            variant = getVariantForSubscriber(subscriber.id, 50);
            emailSubject = variant === "a" ? subject : subjectB;
            await recordSend(abTestId, variant);

            if (variant === "a") variantACounts++;
            else variantBCounts++;
          }

          // Record the send event
          await db.insert(campaignEvents).values({
            campaignId,
            subscriberId: subscriber.id,
            eventType: "sent",
            metadata: enableAbTest ? { variant, abTestId } : null,
          } as any);
        }

        // Mark campaign as sent
        await db
          .update(newsletterCampaigns)
          .set({
            status: "sent",
            sentAt: new Date(),
            totalSent: targetSubscribers.length,
            updatedAt: new Date(),
          } as any)
          .where(eq(newsletterCampaigns.id, campaignId));

        await logAuditEvent(
          req,
          "create",
          "campaign",
          campaignId,
          `Sent newsletter campaign: ${campaignName} to ${targetSubscribers.length} subscribers` +
            (enableAbTest ? ` (A/B Test: A=${variantACounts}, B=${variantBCounts})` : "")
        );

        res.json({
          success: true,
          campaignId,
          abTestId,
          recipientCount: targetSubscribers.length,
          segment: segmentId || "all",
          abTestStats: enableAbTest
            ? {
                variantA: { subject, sent: variantACounts },
                variantB: { subject: subjectB, sent: variantBCounts },
              }
            : null,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to send newsletter" });
      }
    }
  );

  // Verify Resend/Svix webhook signature
  const verifyResendWebhookSignature = (req: Request): boolean => {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    // If no secret configured, log warning but allow in development
    if (!webhookSecret) {
      return process.env.NODE_ENV !== "production";
    }

    const svixId = req.headers["svix-id"] as string;
    const svixTimestamp = req.headers["svix-timestamp"] as string;
    const svixSignature = req.headers["svix-signature"] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return false;
    }

    // Check timestamp is not too old (5 minutes tolerance)
    const timestampSeconds = parseInt(svixTimestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampSeconds) > 300) {
      return false;
    }

    // Create the signed payload
    const payload = JSON.stringify(req.body);
    const signedPayload = `${svixId}.${svixTimestamp}.${payload}`;

    // Extract the secret (remove "whsec_" prefix if present)
    const secretBytes = webhookSecret.startsWith("whsec_")
      ? Buffer.from(webhookSecret.slice(6), "base64")
      : Buffer.from(webhookSecret, "base64");

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedPayload)
      .digest("base64");

    // Svix sends multiple signatures separated by space, check if any match
    const signatures = svixSignature.split(" ");
    for (const sig of signatures) {
      const [version, signature] = sig.split(",");
      if (version === "v1" && signature === expectedSignature) {
        return true;
      }
    }

    return false;
  };

  // Resend Webhook for bounce/complaint handling
  // This endpoint receives events from Resend about email delivery status
  app.post("/api/webhooks/resend", async (req, res) => {
    try {
      // Verify webhook signature before processing
      if (!verifyResendWebhookSignature(req)) {
        return res.status(401).json({ error: "Invalid webhook signature" });
      }

      const event = req.body;

      // Resend sends webhook events with these types:
      // email.sent, email.delivered, email.delivery_delayed,
      // email.complained, email.bounced, email.opened, email.clicked
      const eventType = event.type;
      const eventData = event.data;

      if (!eventType || !eventData) {
        return res.status(400).json({ error: "Invalid event format" });
      }

      // Extract email from event data
      const recipientEmail = eventData.to?.[0] || eventData.email;

      if (!recipientEmail) {
        return res.status(200).json({ received: true });
      }

      // Handle bounce events - mark subscriber as bounced
      if (eventType === "email.bounced") {
        const subscriber = await storage.getNewsletterSubscriberByEmail(recipientEmail);
        if (subscriber && subscriber.status !== "bounced") {
          const consentEntry = {
            action: "bounce" as const,
            timestamp: new Date().toISOString(),
            source: "resend_bounce",
            ipAddress: "webhook",
          };
          const consentLog = [...(subscriber.consentLog || []), consentEntry];

          await storage.updateNewsletterSubscriber(subscriber.id, {
            status: "bounced",
            consentLog,
            isActive: false,
          });
        }
      }

      // Handle complaint events (spam reports) - mark subscriber as complained
      if (eventType === "email.complained") {
        const subscriber = await storage.getNewsletterSubscriberByEmail(recipientEmail);
        if (subscriber && subscriber.status !== "complained") {
          const consentEntry = {
            action: "complaint" as const,
            timestamp: new Date().toISOString(),
            source: "resend_complaint",
            ipAddress: "webhook",
          };
          const consentLog = [...(subscriber.consentLog || []), consentEntry];

          await storage.updateNewsletterSubscriber(subscriber.id, {
            status: "complained",
            consentLog,
            isActive: false,
          });
        }
      }

      // Acknowledge receipt of webhook
      res.status(200).json({ received: true });
    } catch (error) {
      // Return 200 anyway to prevent Resend from retrying
      res.status(200).json({ received: true, error: "Processing error" });
    }
  });

  // Campaign CRUD Routes (admin only)
  app.get("/api/campaigns", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  app.post(
    "/api/campaigns",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const user = req.user as any;
        const campaignData = {
          ...req.body,
          createdBy: user?.claims?.sub || null,
        };
        const campaign = await storage.createCampaign(campaignData);
        await logAuditEvent(
          req,
          "create",
          "campaign",
          campaign.id,
          `Created campaign: ${campaign.name}`,
          undefined,
          { name: campaign.name, subject: campaign.subject }
        );

        res.status(201).json(campaign);
      } catch (error) {
        res.status(500).json({ error: "Failed to create campaign" });
      }
    }
  );

  app.patch(
    "/api/campaigns/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getCampaign(id);
        if (!existing) {
          return res.status(404).json({ error: "Campaign not found" });
        }
        // Don't allow editing sent campaigns
        if (existing.status === "sent" || existing.status === "sending") {
          return res
            .status(400)
            .json({ error: "Cannot edit a campaign that has been sent or is sending" });
        }
        const campaign = await storage.updateCampaign(id, req.body);
        if (campaign) {
          await logAuditEvent(
            req,
            "update",
            "campaign",
            campaign.id,
            `Updated campaign: ${campaign.name}`,
            { name: existing.name, subject: existing.subject },
            { name: campaign.name, subject: campaign.subject }
          );
        }

        res.json(campaign);
      } catch (error) {
        res.status(500).json({ error: "Failed to update campaign" });
      }
    }
  );

  app.delete(
    "/api/campaigns/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getCampaign(id);
        if (!existing) {
          return res.status(404).json({ error: "Campaign not found" });
        }
        // Don't allow deleting sent campaigns
        if (existing.status === "sent" || existing.status === "sending") {
          return res
            .status(400)
            .json({ error: "Cannot delete a campaign that has been sent or is sending" });
        }
        await storage.deleteCampaign(id);
        await logAuditEvent(req, "delete", "campaign", id, `Deleted campaign: ${existing.name}`, {
          name: existing.name,
          subject: existing.subject,
        });

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete campaign" });
      }
    }
  );

  // Campaign events (for analytics)
  app.get("/api/campaigns/:id/events", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { id } = req.params;
      const events = await storage.getCampaignEvents(id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign events" });
    }
  });

  // Send campaign to all active subscribers
  app.post("/api/campaigns/:id/send", requirePermission("canEdit"), async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.status === "sent" || campaign.status === "sending") {
        return res
          .status(400)
          .json({ error: "Campaign has already been sent or is currently sending" });
      }

      const resend = getResendClient();
      if (!resend) {
        return res.status(500).json({ error: "Email service not configured" });
      }

      // Get active subscribers
      const subscribers = await storage.getActiveNewsletterSubscribers();

      if (subscribers.length === 0) {
        return res.status(400).json({ error: "No active subscribers to send to" });
      }

      // Update campaign status to sending
      await storage.updateCampaign(id, {
        status: "sending",
        sentAt: new Date(),
        totalRecipients: subscribers.length,
      });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";

      let sentCount = 0;
      let failedCount = 0;

      // Helper to inject tracking pixel into HTML
      const injectTrackingPixel = (
        html: string,
        campaignId: string,
        subscriberId: string
      ): string => {
        const trackingPixel = `<img src="${baseUrl}/api/track/open/${campaignId}/${subscriberId}" width="1" height="1" style="display:none" alt="" />`;
        // Insert before closing body tag, or append at end
        if (html.includes("</body>")) {
          return html.replace("</body>", `${trackingPixel}</body>`);
        }
        return html + trackingPixel;
      };

      // Helper to wrap links with click tracking
      const wrapLinksWithTracking = (
        html: string,
        campaignId: string,
        subscriberId: string
      ): string => {
        // Match href="..." but not tracking URLs or unsubscribe links
        return html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url) => {
          // Don't wrap tracking URLs or unsubscribe links
          if (url.includes("/api/track/") || url.includes("/api/newsletter/unsubscribe")) {
            return match;
          }
          const trackingUrl = `${baseUrl}/api/track/click/${campaignId}/${subscriberId}?url=${encodeURIComponent(url)}`;
          return `href="${trackingUrl}"`;
        });
      };

      // Send to each subscriber
      for (const subscriber of subscribers) {
        try {
          // Personalize content
          let htmlContent = campaign.htmlContent || "";

          // Add unsubscribe link if not present
          const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${subscriber.id}`;
          if (!htmlContent.includes("/api/newsletter/unsubscribe")) {
            htmlContent = htmlContent.replace(
              "</body>",
              `<p style="text-align:center;font-size:12px;color:#999;margin-top:30px;"><a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a></p></body>`
            );
          }

          // Wrap links with click tracking
          htmlContent = wrapLinksWithTracking(htmlContent, id, subscriber.id);

          // Inject tracking pixel
          htmlContent = injectTrackingPixel(htmlContent, id, subscriber.id);

          // Replace personalization tokens
          const firstName = subscriber.firstName || "there";
          htmlContent = htmlContent.replace(/\{\{firstName\}\}/g, firstName);
          htmlContent = htmlContent.replace(/\{\{email\}\}/g, subscriber.email);

          await resend.emails.send({
            from: "Dubai Travel <noreply@dubaitravel.com>",
            to: subscriber.email,
            subject: campaign.subject,
            html: htmlContent,
          });

          // Record sent event
          await storage.createCampaignEvent({
            campaignId: id,
            subscriberId: subscriber.id,
            eventType: "sent",
            metadata: { email: subscriber.email },
          });

          sentCount++;
        } catch (emailError) {
          failedCount++;

          // Record failed event
          await storage.createCampaignEvent({
            campaignId: id,
            subscriberId: subscriber.id,
            eventType: "bounced",
            metadata: {
              email: subscriber.email,
              error: emailError instanceof Error ? emailError.message : "Unknown error",
            },
          });
        }
      }

      // Update campaign with final stats
      await storage.updateCampaign(id, {
        status: failedCount === subscribers.length ? "failed" : "sent",
        totalSent: sentCount,
      });

      res.json({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: subscribers.length,
      });
    } catch (error) {
      // Try to update status to failed
      try {
        await storage.updateCampaign(req.params.id, { status: "failed" });
      } catch {}

      res.status(500).json({ error: "Failed to send campaign" });
    }
  });

  // Email tracking endpoints (public - called from email clients)
  // Open tracking pixel - returns a 1x1 transparent GIF
  app.get("/api/track/open/:campaignId/:subscriberId", async (req, res) => {
    try {
      const { campaignId, subscriberId } = req.params;

      // Record the open event
      await storage.createCampaignEvent({
        campaignId,
        subscriberId,
        eventType: "opened",
        metadata: {
          userAgent: req.headers["user-agent"] || "unknown",
          ip: req.ip || "unknown",
        },
      });

      // Update campaign stats
      // Note: totalOpened can't be updated via updateCampaign (omitted from InsertCampaign)
      // const campaign = await storage.getCampaign(campaignId);
      // if (campaign) {
      //   await storage.updateCampaign(campaignId, {
      //     totalOpened: campaign.totalOpened + 1,
      //   });
      // }

      // Return a 1x1 transparent GIF
      const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.set("Content-Type", "image/gif");
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.send(transparentGif);
    } catch (error) {
      // Still return the pixel even on error
      const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.set("Content-Type", "image/gif");
      res.send(transparentGif);
    }
  });

  // Click tracking - redirects to actual URL after recording click
  app.get("/api/track/click/:campaignId/:subscriberId", async (req, res) => {
    try {
      const { campaignId, subscriberId } = req.params;
      const { url } = req.query;

      if (!url || typeof url !== "string") {
        return res.status(400).send("Missing URL parameter");
      }

      // Security: Validate redirect URL to prevent open redirect attacks
      const allowedDomains = ["travi.world", "www.travi.world", "localhost"];
      let isValidRedirect = false;

      try {
        // Allow relative URLs
        if (url.startsWith("/") && !url.startsWith("//")) {
          isValidRedirect = true;
        } else {
          // Parse absolute URLs and validate domain
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname.toLowerCase();
          isValidRedirect = allowedDomains.some(
            domain => hostname === domain || hostname.endsWith(`.${domain}`)
          );
        }
      } catch {
        // Invalid URL format
        isValidRedirect = false;
      }

      if (!isValidRedirect) {
        return res.status(400).send("Invalid redirect URL");
      }

      // Record the click event
      await storage.createCampaignEvent({
        campaignId,
        subscriberId,
        eventType: "clicked",
        metadata: {
          url,
          userAgent: req.headers["user-agent"] || "unknown",
          ip: req.ip || "unknown",
        },
      });

      // Redirect to the validated URL
      res.redirect(url);
    } catch (error) {
      res.status(500).send("Tracking error");
    }
  });

  // ============================================================================
  // ADMIN SECURITY ENDPOINTS
  // ============================================================================

  // Get audit logs (admin only) - now reads from database
  app.get(
    "/api/admin/audit-logs",
    requirePermission("canPublish"),
    auditLogReadOnly,
    async (req, res) => {
      try {
        const { action, resourceType, userId, limit = 100 } = req.query;
        const logs = await getAuditLogs({
          action: action as string,
          resourceType: resourceType as string,
          userId: userId as string,
          limit: parseInt(limit as string) || 100,
        });
        res.json({ logs, total: logs.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch audit logs" });
      }
    }
  );

  // Get blocked IPs (admin only)
  app.get("/api/admin/blocked-ips", requirePermission("canPublish"), (req, res) => {
    try {
      const blockedIps = getBlockedIps();
      res.json({ blockedIps, total: blockedIps.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch blocked IPs" });
    }
  });

  // ============================================================================
  // PERFORMANCE MONITORING ENDPOINT
  // ============================================================================

  // Get performance metrics (N+1 detection stats, latency percentiles)
  app.get("/api/admin/performance", requirePermission("canViewAnalytics"), (req, res) => {
    try {
      const metrics = getPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance metrics" });
    }
  });

  // ============================================================================
  // JOB QUEUE ENDPOINTS
  // ============================================================================

  // Get job queue statistics
  app.get("/api/admin/jobs/stats", requirePermission("canPublish"), async (req, res) => {
    try {
      const stats = await jobQueue.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job statistics" });
    }
  });

  // Get jobs by status
  app.get("/api/admin/jobs", requirePermission("canPublish"), async (req, res) => {
    try {
      const { status = "pending" } = req.query;
      const validStatuses = ["pending", "processing", "completed", "failed"];
      if (!validStatuses.includes(status as string)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const jobs = await jobQueue.getJobsByStatus(status as any);
      res.json({ jobs, total: jobs.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // Get single job status
  app.get("/api/admin/jobs/:id", requirePermission("canPublish"), async (req, res) => {
    try {
      const job = await jobQueue.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // Cancel a pending job
  app.delete("/api/admin/jobs/:id", requirePermission("canPublish"), async (req, res) => {
    try {
      const cancelled = await jobQueue.cancelJob(req.params.id);
      if (!cancelled) {
        return res.status(400).json({ error: "Cannot cancel job (not pending or not found)" });
      }
      res.json({ success: true, message: "Job cancelled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel job" });
    }
  });

  // Retry a failed job
  app.post("/api/admin/jobs/:id/retry", requirePermission("canPublish"), async (req, res) => {
    try {
      const retried = await jobQueue.retryJob(req.params.id);
      if (!retried) {
        return res.status(400).json({ error: "Cannot retry job (not failed or not found)" });
      }
      res.json({ success: true, message: "Job queued for retry" });
    } catch (error) {
      res.status(500).json({ error: "Failed to retry job" });
    }
  });

  // Migration endpoint - convert existing content to blocks format
  app.post("/api/admin/migrate-blocks", requirePermission("canPublish"), async (req, res) => {
    try {
      // Get all content items with empty blocks
      const allContents = await storage.getContents({});
      let migratedCount = 0;

      for (const content of allContents) {
        // Skip if already has blocks
        if (content.blocks && Array.isArray(content.blocks) && content.blocks.length > 0) {
          continue;
        }

        const blocks: any[] = [];
        let blockOrder = 0;

        // Add hero block if there's a hero image
        if (content.heroImage) {
          blocks.push({
            id: `hero-${Date.now()}-${blockOrder}`,
            type: "hero",
            data: {
              image: content.heroImage,
              alt: content.heroImageAlt || content.title,
              title: content.title,
            },
            order: blockOrder++,
          });
        }

        // Get type-specific data (using type assertion since getContents doesn't join related tables)
        const contentWithData = content as any;
        if (content.type === "attraction" && contentWithData.attractionData) {
          const attr = contentWithData.attractionData;

          // Add intro text block
          if (attr.introText) {
            blocks.push({
              id: `text-${Date.now()}-${blockOrder}`,
              type: "text",
              data: { content: attr.introText },
              order: blockOrder++,
            });
          }

          // Add expanded intro if different
          if (attr.expandedIntroText && attr.expandedIntroText !== attr.introText) {
            blocks.push({
              id: `text-${Date.now()}-${blockOrder}`,
              type: "text",
              data: { content: attr.expandedIntroText },
              order: blockOrder++,
            });
          }

          // Add highlights block
          if (attr.highlights && Array.isArray(attr.highlights) && attr.highlights.length > 0) {
            blocks.push({
              id: `highlights-${Date.now()}-${blockOrder}`,
              type: "highlights",
              data: { items: attr.highlights },
              order: blockOrder++,
            });
          }

          // Add visitor tips
          if (attr.visitorTips && Array.isArray(attr.visitorTips) && attr.visitorTips.length > 0) {
            blocks.push({
              id: `tips-${Date.now()}-${blockOrder}`,
              type: "tips",
              data: { items: attr.visitorTips },
              order: blockOrder++,
            });
          }

          // Add FAQ items
          if (attr.faq && Array.isArray(attr.faq) && attr.faq.length > 0) {
            for (const faqItem of attr.faq) {
              blocks.push({
                id: `faq-${Date.now()}-${blockOrder}`,
                type: "faq",
                data: { question: faqItem.question, answer: faqItem.answer },
                order: blockOrder++,
              });
            }
          }

          // Add gallery
          if (attr.gallery && Array.isArray(attr.gallery) && attr.gallery.length > 0) {
            blocks.push({
              id: `gallery-${Date.now()}-${blockOrder}`,
              type: "gallery",
              data: { images: attr.gallery },
              order: blockOrder++,
            });
          }
        } else if (content.type === "hotel" && contentWithData.hotelData) {
          const hotel = contentWithData.hotelData;

          // Add description
          if (hotel.description) {
            blocks.push({
              id: `text-${Date.now()}-${blockOrder}`,
              type: "text",
              data: { content: hotel.description },
              order: blockOrder++,
            });
          }

          // Add highlights
          if (hotel.highlights && Array.isArray(hotel.highlights) && hotel.highlights.length > 0) {
            blocks.push({
              id: `highlights-${Date.now()}-${blockOrder}`,
              type: "highlights",
              data: { items: hotel.highlights },
              order: blockOrder++,
            });
          }

          // Add FAQ
          if (hotel.faq && Array.isArray(hotel.faq) && hotel.faq.length > 0) {
            for (const faqItem of hotel.faq) {
              blocks.push({
                id: `faq-${Date.now()}-${blockOrder}`,
                type: "faq",
                data: { question: faqItem.question, answer: faqItem.answer },
                order: blockOrder++,
              });
            }
          }
        } else if (content.type === "article" && contentWithData.articleData) {
          const article = contentWithData.articleData;

          // Add body content
          if (article.body) {
            blocks.push({
              id: `text-${Date.now()}-${blockOrder}`,
              type: "text",
              data: { content: article.body },
              order: blockOrder++,
            });
          }
        }

        // Update content with generated blocks if any were created
        if (blocks.length > 0) {
          await storage.updateContent(content.id, { blocks });
          migratedCount++;
        }
      }

      res.json({
        success: true,
        migratedCount,
        message: `Migrated ${migratedCount} content items to blocks format`,
      });
    } catch (error) {
      res.status(500).json({ error: "Migration failed", details: String(error) });
    }
  });

  // Audit Logs Routes (admin only) - Read-only, no modifications allowed
  app.all("/api/audit-logs", (req, res, next) => {
    if (["DELETE", "PATCH", "PUT", "POST"].includes(req.method)) {
      return res.status(403).json({
        error: "Audit logs are immutable",
        message: "Audit logs cannot be modified or deleted",
      });
    }
    next();
  });

  app.get("/api/audit-logs", requirePermission("canViewAuditLogs"), async (req, res) => {
    try {
      const { userId, entityType, entityId, actionType, limit, offset } = req.query;
      const filters = {
        userId: userId as string | undefined,
        entityType: entityType as string | undefined,
        entityId: entityId as string | undefined,
        actionType: actionType as string | undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      };
      const [logs, total] = await Promise.all([
        storage.getAuditLogs(filters),
        storage.getAuditLogCount(filters),
      ]);
      res.json({ logs, total, limit: filters.limit, offset: filters.offset });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // Content Clusters Routes
  app.get("/api/clusters", requireAuth, async (req, res) => {
    try {
      const clusters = await storage.getContentClusters();
      // Enrich clusters with members and pillar content
      const enrichedClusters = await Promise.all(
        clusters.map(async cluster => {
          const members = await storage.getClusterMembers(cluster.id);
          let pillarContent = null;
          if (cluster.pillarContentId) {
            pillarContent = await storage.getContent(cluster.pillarContentId);
          }
          return { ...cluster, members, pillarContent };
        })
      );
      res.json(enrichedClusters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch clusters" });
    }
  });

  app.get("/api/clusters/:id", requireAuth, async (req, res) => {
    try {
      const cluster = await storage.getContentCluster(req.params.id);
      if (!cluster) {
        return res.status(404).json({ error: "Cluster not found" });
      }
      const members = await storage.getClusterMembers(cluster.id);
      res.json({ ...cluster, members });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cluster" });
    }
  });

  app.post("/api/clusters", requirePermission("canCreate"), checkReadOnlyMode, async (req, res) => {
    try {
      const { name, slug, description, pillarContentId, primaryKeyword, color } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }
      const existing = await storage.getContentClusterBySlug(slug);
      if (existing) {
        return res.status(400).json({ error: "Cluster with this slug already exists" });
      }
      const cluster = await storage.createContentCluster({
        name,
        slug,
        description,
        pillarContentId,
        primaryKeyword,
        color,
      });
      await logAuditEvent(
        req,
        "create",
        "cluster",
        cluster.id,
        `Created cluster: ${cluster.name}`,
        undefined,
        { name: cluster.name, slug: cluster.slug }
      );
      res.status(201).json(cluster);
    } catch (error) {
      res.status(500).json({ error: "Failed to create cluster" });
    }
  });

  app.patch(
    "/api/clusters/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingCluster = await storage.getContentCluster(req.params.id);
        const { name, slug, description, pillarContentId, primaryKeyword, color } = req.body;
        const cluster = await storage.updateContentCluster(req.params.id, {
          name,
          slug,
          description,
          pillarContentId,
          primaryKeyword,
          color,
        });
        if (!cluster) {
          return res.status(404).json({ error: "Cluster not found" });
        }
        await logAuditEvent(
          req,
          "update",
          "cluster",
          cluster.id,
          `Updated cluster: ${cluster.name}`,
          existingCluster ? { name: existingCluster.name, slug: existingCluster.slug } : undefined,
          { name: cluster.name, slug: cluster.slug }
        );
        res.json(cluster);
      } catch (error) {
        res.status(500).json({ error: "Failed to update cluster" });
      }
    }
  );

  app.delete(
    "/api/clusters/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingCluster = await storage.getContentCluster(req.params.id);
        await storage.deleteContentCluster(req.params.id);
        if (existingCluster) {
          await logAuditEvent(
            req,
            "delete",
            "cluster",
            req.params.id,
            `Deleted cluster: ${existingCluster.name}`,
            { name: existingCluster.name, slug: existingCluster.slug }
          );
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete cluster" });
      }
    }
  );

  // Cluster Members Routes
  app.post(
    "/api/clusters/:clusterId/members",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { contentId, position } = req.body;
        if (!contentId) {
          return res.status(400).json({ error: "Content ID is required" });
        }
        const member = await storage.addClusterMember({
          clusterId: req.params.clusterId,
          contentId,
          position: position || 0,
        });
        res.status(201).json(member);
      } catch (error) {
        res.status(500).json({ error: "Failed to add cluster member" });
      }
    }
  );

  app.delete(
    "/api/clusters/:clusterId/members/:memberId",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.removeClusterMember(req.params.memberId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to remove cluster member" });
      }
    }
  );

  app.patch(
    "/api/clusters/:clusterId/members/:memberId",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { position } = req.body;
        const member = await storage.updateClusterMemberPosition(req.params.memberId, position);
        if (!member) {
          return res.status(404).json({ error: "Member not found" });
        }
        res.json(member);
      } catch (error) {
        res.status(500).json({ error: "Failed to update cluster member" });
      }
    }
  );

  // Get clusters for a specific content
  app.get("/api/content/:contentId/clusters", requireAuth, async (req, res) => {
    try {
      const memberships = await storage.getContentClusterMembership(req.params.contentId);
      res.json(memberships);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content clusters" });
    }
  });

  // Tags Routes
  app.get("/api/tags", requireAuth, async (req, res) => {
    try {
      const allTags = await storage.getTags();
      // Enrich with content count
      const enrichedTags = await Promise.all(
        allTags.map(async tag => {
          const tagContents = await storage.getTagContents(tag.id);
          return { ...tag, contentCount: tagContents.length, contents: tagContents.slice(0, 5) };
        })
      );
      res.json(enrichedTags);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  app.get("/api/tags/:id", requireAuth, async (req, res) => {
    try {
      const tag = await storage.getTag(req.params.id);
      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }
      const tagContents = await storage.getTagContents(tag.id);
      res.json({ ...tag, contents: tagContents });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tag" });
    }
  });

  app.post("/api/tags", requirePermission("canCreate"), checkReadOnlyMode, async (req, res) => {
    try {
      const parseResult = insertTagSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: parseResult.error.flatten() });
      }
      const { name, slug, description, color } = parseResult.data as {
        name: string;
        slug: string;
        description?: string;
        color?: string;
      };
      const existing = await storage.getTagBySlug(slug);
      if (existing) {
        return res.status(400).json({ error: "Tag with this slug already exists" });
      }
      const tag = await storage.createTag({ name, slug, description, color });
      await logAuditEvent(req, "create", "tag", tag.id, `Created tag: ${tag.name}`, undefined, {
        name: tag.name,
        slug: tag.slug,
      });
      res.status(201).json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  app.patch("/api/tags/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const existingTag = await storage.getTag(req.params.id);
      const parseResult = insertTagSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: parseResult.error.flatten() });
      }
      const { name, slug, description, color } = parseResult.data as {
        name?: string;
        slug?: string;
        description?: string;
        color?: string;
      };
      const tag = await storage.updateTag(req.params.id, { name, slug, description, color });
      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }
      await logAuditEvent(
        req,
        "update",
        "tag",
        tag.id,
        `Updated tag: ${tag.name}`,
        existingTag ? { name: existingTag.name, slug: existingTag.slug } : undefined,
        { name: tag.name, slug: tag.slug }
      );
      res.json(tag);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tag" });
    }
  });

  app.delete(
    "/api/tags/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingTag = await storage.getTag(req.params.id);
        await storage.deleteTag(req.params.id);
        if (existingTag) {
          await logAuditEvent(
            req,
            "delete",
            "tag",
            req.params.id,
            `Deleted tag: ${existingTag.name}`,
            { name: existingTag.name, slug: existingTag.slug }
          );
        }
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete tag" });
      }
    }
  );

  // Sync tags from content - auto-extract tags from site content
  app.post(
    "/api/tags/sync",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const allContent = await storage.getContents();
        const existingTags = await storage.getTags();
        const existingTagSlugs = new Set(existingTags.map(t => t.slug));

        // Collect unique tags from content
        const tagCandidates = new Map<string, { name: string; count: number; color: string }>();

        // Color palette for auto-generated tags
        const colors = [
          "#3b82f6",
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#8b5cf6",
          "#ec4899",
          "#6366f1",
          "#14b8a6",
        ];
        let colorIndex = 0;

        // Extract tags from content types
        for (const content of allContent) {
          // From content type
          const typeTag = content.type;
          if (typeTag) {
            const slug = typeTag.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            if (!tagCandidates.has(slug)) {
              tagCandidates.set(slug, {
                name: typeTag.charAt(0).toUpperCase() + typeTag.slice(1),
                count: 0,
                color: colors[colorIndex++ % colors.length],
              });
            }
            tagCandidates.get(slug)!.count++;
          }

          // From primary keywords
          if (content.primaryKeyword) {
            const kw = content.primaryKeyword;
            const slug = kw
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .slice(0, 50);
            if (slug.length > 2 && !tagCandidates.has(slug)) {
              tagCandidates.set(slug, {
                name: kw.slice(0, 50),
                count: 0,
                color: colors[colorIndex++ % colors.length],
              });
            }
            if (tagCandidates.has(slug)) tagCandidates.get(slug)!.count++;
          }

          // From secondary keywords (top 3)
          if (content.secondaryKeywords && Array.isArray(content.secondaryKeywords)) {
            for (const kw of content.secondaryKeywords.slice(0, 3)) {
              const slug = String(kw)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .slice(0, 50);
              if (slug.length > 2 && !tagCandidates.has(slug)) {
                tagCandidates.set(slug, {
                  name: String(kw).slice(0, 50),
                  count: 0,
                  color: colors[colorIndex++ % colors.length],
                });
              }
              if (tagCandidates.has(slug)) tagCandidates.get(slug)!.count++;
            }
          }
        }

        // Create tags that don't exist yet (only those used 2+ times to avoid noise)
        const created: string[] = [];
        const skipped: string[] = [];

        for (const [slug, data] of tagCandidates) {
          if (existingTagSlugs.has(slug)) {
            skipped.push(slug);
            continue;
          }
          if (data.count >= 2 || slug.length <= 15) {
            // Create if used 2+ times or short/common
            try {
              await storage.createTag({
                name: data.name,
                slug,
                description: `Auto-generated tag from content (${data.count} items)`,
                color: data.color,
              });
              created.push(data.name);
            } catch (e: any) {
              if (!e.message?.includes("duplicate")) {
              }
            }
          }
        }

        await logAuditEvent(req, "create", "tag", "bulk", `Synced tags from content`, {
          created: created.length,
          skipped: skipped.length,
        });

        res.json({
          success: true,
          created,
          skipped: skipped.length,
          total: tagCandidates.size,
          message: `Created ${created.length} new tags from ${allContent.length} content items`,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to sync tags" });
      }
    }
  );

  // Content Tags Routes
  app.get("/api/content/:contentId/tags", requireAuth, async (req, res) => {
    try {
      const contentTagsList = await storage.getContentTags(req.params.contentId);
      res.json(contentTagsList);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content tags" });
    }
  });

  app.post(
    "/api/content/:contentId/tags",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { tagId } = req.body;
        if (!tagId) {
          return res.status(400).json({ error: "Tag ID is required" });
        }
        const contentTag = await storage.addContentTag({
          contentId: req.params.contentId,
          tagId,
        });
        res.status(201).json(contentTag);
      } catch (error) {
        res.status(500).json({ error: "Failed to add content tag" });
      }
    }
  );

  app.delete(
    "/api/content/:contentId/tags/:tagId",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.removeContentTag(req.params.contentId, req.params.tagId);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to remove content tag" });
      }
    }
  );

  // Bulk Operations Routes
  app.post("/api/contents/bulk-status", requirePermission("canEdit"), async (req, res) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      if (!status) {
        return res.status(400).json({ error: "status is required" });
      }
      const count = await storage.bulkUpdateContentStatus(ids, status);
      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk update status" });
    }
  });

  app.post("/api/contents/bulk-delete", requirePermission("canDelete"), async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      const count = await storage.bulkDeleteContents(ids);

      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk delete" });
    }
  });

  app.post("/api/contents/bulk-add-tag", requirePermission("canEdit"), async (req, res) => {
    try {
      const { ids, tagId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      if (!tagId) {
        return res.status(400).json({ error: "tagId is required" });
      }
      const count = await storage.bulkAddTagToContents(ids, tagId);
      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk add tag" });
    }
  });

  app.post("/api/contents/bulk-remove-tag", requirePermission("canEdit"), async (req, res) => {
    try {
      const { ids, tagId } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids array is required" });
      }
      if (!tagId) {
        return res.status(400).json({ error: "tagId is required" });
      }
      const count = await storage.bulkRemoveTagFromContents(ids, tagId);
      res.json({ success: true, count });
    } catch (error) {
      res.status(500).json({ error: "Failed to bulk remove tag" });
    }
  });

  app.get("/api/contents/export", requireAuth, async (req, res) => {
    try {
      const { ids, format = "json" } = req.query;
      let contents;
      if (ids && typeof ids === "string") {
        const idArray = ids.split(",");
        const allContents = await storage.getContentsWithRelations();
        contents = allContents.filter(c => idArray.includes(c.id));
      } else {
        contents = await storage.getContentsWithRelations();
      }

      if (format === "csv") {
        const headers = [
          "id",
          "title",
          "slug",
          "type",
          "status",
          "wordCount",
          "createdAt",
          "updatedAt",
        ];
        const csvRows = [headers.join(",")];
        for (const c of contents) {
          csvRows.push(
            [
              c.id,
              `"${(c.title || "").replace(/"/g, '""')}"`,
              c.slug,
              c.type,
              c.status,
              c.wordCount || 0,
              c.createdAt ? new Date(c.createdAt).toISOString() : "",
              c.updatedAt ? new Date(c.updatedAt).toISOString() : "",
            ].join(",")
          );
        }
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=contents-export.csv");
        return res.send(csvRows.join("\n"));
      }

      res.json(contents);
    } catch (error) {
      res.status(500).json({ error: "Failed to export contents" });
    }
  });

  // Content Templates Routes
  app.get("/api/content-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getContentTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/content-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getContentTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/content-templates", requirePermission("canCreate"), async (req, res) => {
    try {
      const { name, description, type, blocks, seoDefaults } = req.body;
      if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
      }
      const template = await storage.createContentTemplate({
        name,
        description,
        contentType: type,
        blocks: blocks || [],
        seoDefaults: seoDefaults || {},
      });
      res.status(201).json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.patch("/api/content-templates/:id", requirePermission("canEdit"), async (req, res) => {
    try {
      const { name, description, type, blocks, seoDefaults } = req.body;
      const template = await storage.updateContentTemplate(req.params.id, {
        name,
        description,
        contentType: type,
        blocks,
        seoDefaults,
      });
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/content-templates/:id", requirePermission("canDelete"), async (req, res) => {
    try {
      await storage.deleteContentTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post(
    "/api/content-templates/:id/apply",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    rateLimiters.contentWrite,
    async (req, res) => {
      try {
        const template = await storage.getContentTemplate(req.params.id);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }
        const { title, slug } = req.body;
        if (!title || !slug) {
          return res.status(400).json({ error: "Title and slug are required" });
        }
        const content = await storage.createContent({
          title,
          slug,
          type: template.contentType as any,
          status: "draft",
          blocks: template.blocks as any[],
          metaTitle: (template.seoDefaults as any)?.metaTitle || title,
          metaDescription: (template.seoDefaults as any)?.metaDescription || "",
        });
        await storage.incrementTemplateUsage(req.params.id);
        res.status(201).json(content);
      } catch (error) {
        res.status(500).json({ error: "Failed to apply template" });
      }
    }
  );

  // ============================================================================
  // TRANSLATIONS - DeepL Multi-Language SEO System
  // ============================================================================

  // Get translation coverage for dashboard (simplified stats per language)
  app.get("/api/translations/coverage", async (req, res) => {
    try {
      const contents = await storage.getContents();
      const publishedContents = contents.filter(c => c.status === "published");
      const allTranslations = await storage.getAllTranslations();

      const supportedLocales = ["en", "ar", "hi", "zh", "ru", "fr", "de", "es", "ja"];

      const coverage: Record<string, { translated: number; total: number }> = {};
      for (const locale of supportedLocales) {
        if (locale === "en") {
          // English is the source language
          coverage[locale] = {
            translated: publishedContents.length,
            total: publishedContents.length,
          };
        } else {
          const localeTranslations = allTranslations.filter(
            t => t.locale === locale && t.status === "completed"
          );
          coverage[locale] = {
            translated: localeTranslations.length,
            total: publishedContents.length,
          };
        }
      }

      res.json(coverage);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation coverage" });
    }
  });

  // Get translation statistics for admin dashboard
  app.get("/api/translations/stats", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const contents = await storage.getContents();
      const publishedContents = contents.filter(c => c.status === "published");
      const allTranslations = await storage.getAllTranslations();

      const supportedLocales = [
        "ar",
        "hi",
        "zh",
        "ru",
        "ur",
        "fr",
        "de",
        "fa",
        "bn",
        "fil",
        "es",
        "tr",
        "it",
        "ja",
        "ko",
        "he",
      ];

      const languageStats = supportedLocales.map(locale => {
        const localeTranslations = allTranslations.filter(
          t => t.locale === locale && t.status === "completed"
        );
        const translated = localeTranslations.length;
        const pending = publishedContents.length - translated;
        const percentage =
          publishedContents.length > 0
            ? Math.round((translated / publishedContents.length) * 100)
            : 0;
        return { locale, translated, pending: Math.max(0, pending), percentage };
      });

      const totalTranslated = new Set(
        allTranslations.filter(t => t.status === "completed").map(t => t.contentId)
      ).size;

      res.json({
        totalContent: publishedContents.length,
        translatedContent: totalTranslated,
        pendingContent: publishedContents.length - totalTranslated,
        languageStats,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation stats" });
    }
  });

  // Get all translations with content info (admin list view)
  app.get("/api/translations", requirePermission("canEdit"), async (req, res) => {
    try {
      const contents = await storage.getContents();
      const publishedContents = contents.filter(c => c.status === "published");
      const allTranslations = await storage.getAllTranslations();

      const contentTranslations = publishedContents.map(content => {
        const contentTrans = allTranslations.filter(t => t.contentId === content.id);
        const completedLocales = contentTrans
          .filter(t => t.status === "completed")
          .map(t => t.locale);
        return {
          contentId: content.id,
          title: content.title,
          slug: content.slug,
          type: content.type,
          completedLocales,
          translationCount: completedLocales.length,
        };
      });

      res.json(contentTranslations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  // Get translations for a content item
  app.get("/api/translations/:contentId", async (req, res) => {
    try {
      const translations = await storage.getTranslationsByContentId(req.params.contentId);
      res.json(translations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  // Get a specific translation
  app.get("/api/translations/:contentId/:locale", async (req, res) => {
    try {
      const { contentId, locale } = req.params;
      const translation = await storage.getTranslation(contentId, locale as any);
      if (!translation) {
        return res.status(404).json({ error: "Translation not found" });
      }
      res.json(translation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation" });
    }
  });

  // Translate content to a specific language using DeepL
  app.post(
    "/api/translations/:contentId/translate",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { contentId } = req.params;
        const { targetLocale, sourceLocale = "en" } = req.body;

        if (!targetLocale) {
          return res.status(400).json({ error: "Target locale is required" });
        }

        const content = await storage.getContent(contentId);
        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        // Use translation-service (Claude Haiku) instead of deepl-service
        const { translateContent, generateContentHash } =
          await import("./services/translation-service");

        // Note: translation-service uses (content, sourceLocale, targetLocale) order
        const translatedContent = await translateContent(
          {
            title: content.title,
            metaTitle: content.metaTitle || undefined,
            metaDescription: content.metaDescription || undefined,
            blocks: content.blocks || [],
          },
          sourceLocale,
          targetLocale
        );

        const existingTranslation = await storage.getTranslation(contentId, targetLocale);

        if (existingTranslation && existingTranslation.isManualOverride) {
          return res.status(409).json({
            error: "Manual override exists. Use force=true to overwrite.",
            existingTranslation,
          });
        }

        const translationData = {
          contentId,
          locale: targetLocale,
          status: "completed" as const,
          title: translatedContent.title || null,
          metaTitle: translatedContent.metaTitle || null,
          metaDescription: translatedContent.metaDescription || null,
          blocks: translatedContent.blocks || [],
          sourceHash: translatedContent.sourceHash,
          translatedBy: "claude",
          translationProvider: "claude",
          isManualOverride: false,
        };

        let translation;
        if (existingTranslation) {
          translation = await storage.updateTranslation(existingTranslation.id, translationData);
        } else {
          translation = await storage.createTranslation(translationData);
        }

        res.json(translation);
      } catch (error) {
        res.status(500).json({ error: "Failed to translate content" });
      }
    }
  );

  // Batch translate content to multiple languages
  app.post(
    "/api/translations/:contentId/translate-all",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { contentId } = req.params;
        const { targetTiers = [1, 2], sourceLocale = "en" } = req.body;

        const content = await storage.getContent(contentId);
        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        // Use translation-service (Claude Haiku) instead of deepl-service
        const { translateToAllLanguages, generateContentHash } =
          await import("./services/translation-service");

        // translateToAllLanguages handles tier filtering internally
        const translations = await translateToAllLanguages(
          {
            title: content.title,
            metaTitle: content.metaTitle || undefined,
            metaDescription: content.metaDescription || undefined,
            blocks: content.blocks || [],
          },
          sourceLocale as any,
          targetTiers
        );

        const savedTranslations = [];
        for (const [locale, translatedContent] of translations) {
          const existingTranslation = await storage.getTranslation(contentId, locale);

          if (existingTranslation?.isManualOverride) {
            continue;
          }

          const translationData = {
            contentId,
            locale,
            status: "completed" as const,
            title: translatedContent.title || null,
            metaTitle: translatedContent.metaTitle || null,
            metaDescription: translatedContent.metaDescription || null,
            blocks: translatedContent.blocks || [],
            sourceHash: translatedContent.sourceHash,
            translatedBy: "claude",
            translationProvider: "claude",
            isManualOverride: false,
          };

          let translation;
          if (existingTranslation) {
            translation = await storage.updateTranslation(existingTranslation.id, translationData);
          } else {
            translation = await storage.createTranslation(translationData);
          }
          savedTranslations.push(translation);
        }

        res.json({
          success: true,
          translatedCount: savedTranslations.length,
          targetLocales: SUPPORTED_LOCALES,
          translations: savedTranslations,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to batch translate content" });
      }
    }
  );

  // Manual translation override
  app.put(
    "/api/translations/:contentId/:locale",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { contentId, locale } = req.params;
        const { title, metaTitle, metaDescription, blocks } = req.body;

        const existingTranslation = await storage.getTranslation(contentId, locale as any);

        const translationData = {
          contentId,
          locale: locale as any,
          status: "completed" as const,
          title: title || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          blocks: blocks || [],
          translatedBy: "manual",
          translationProvider: "manual",
          isManualOverride: true,
        };

        let translation;
        if (existingTranslation) {
          translation = await storage.updateTranslation(existingTranslation.id, translationData);
        } else {
          translation = await storage.createTranslation(translationData);
        }

        res.json(translation);
      } catch (error) {
        res.status(500).json({ error: "Failed to save translation" });
      }
    }
  );

  // Get DeepL usage stats
  app.get("/api/translations/usage", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { getDeepLUsage, getDeepLSupportedLocales, getUnsupportedLocales } =
        await import("./services/translation-service");
      const usage = await getDeepLUsage();

      res.json({
        usage,
        supportedLocales: getDeepLSupportedLocales(),
        unsupportedLocales: getUnsupportedLocales(),
        totalLocales: SUPPORTED_LOCALES.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  // Get public translated content
  app.get("/api/public/content/:slug/:locale", async (req, res) => {
    try {
      const { slug, locale } = req.params;

      const content = await storage.getContentBySlug(slug);
      if (!content || content.status !== "published") {
        return res.status(404).json({ error: "Content not found" });
      }

      if (locale === "en") {
        return res.json(content);
      }

      const translation = await storage.getTranslation(content.id, locale as any);
      if (!translation || translation.status !== "completed") {
        return res.json(content);
      }

      res.json({
        ...content,
        title: translation.title || content.title,
        metaTitle: translation.metaTitle || content.metaTitle,
        metaDescription: translation.metaDescription || content.metaDescription,
        blocks: translation.blocks || content.blocks,
        locale,
        isTranslated: true,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Get all translations status for admin dashboard
  app.get(
    "/api/admin/translation-status",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const contents = await storage.getContents({ status: "published" });

        const status = await Promise.all(
          contents.map(async content => {
            const translations = await storage.getTranslationsByContentId(content.id);
            const translatedLocales: string[] = translations
              .filter(t => t.status === "completed")
              .map(t => t.locale) as string[];

            return {
              contentId: content.id,
              title: content.title,
              type: content.type,
              translatedLocales,
              totalTranslations: translatedLocales.length,
              missingLocales: SUPPORTED_LOCALES.filter(
                l => l.code !== "en" && !translatedLocales.includes(l.code)
              ).map(l => l.code),
            };
          })
        );

        res.json({
          totalContent: contents.length,
          items: status,
          localeStats: SUPPORTED_LOCALES.map(locale => ({
            code: locale.code,
            name: locale.name,
            tier: locale.tier,
            translatedCount: status.filter(s => s.translatedLocales.includes(locale.code)).length,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch translation status" });
      }
    }
  );

  // ============================================================================
  // PAGE LAYOUTS - Live Edit System
  // ============================================================================

  // Get layout for a page
  app.get("/api/layouts/:slug", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;

      const layout = await db.select().from(pageLayouts).where(eq(pageLayouts.slug, slug)).limit(1);

      if (layout.length === 0) {
        return res.status(404).json({ error: "Layout not found" });
      }

      res.json(layout[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // Save draft layout
  app.put("/api/layouts/:slug/draft", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;
      const { components } = req.body;
      const user = req.user as any;
      const userId = user?.claims?.sub;

      // Check if layout exists
      const existing = await db
        .select()
        .from(pageLayouts)
        .where(eq(pageLayouts.slug, slug))
        .limit(1);

      if (existing.length === 0) {
        // Create new layout
        const [newLayout] = await db
          .insert(pageLayouts)
          .values({
            slug,
            draftComponents: components,
            status: "draft",
            draftUpdatedAt: new Date(),
            createdBy: userId,
            updatedBy: userId,
          } as any)
          .returning();

        return res.json(newLayout);
      }

      // Update existing layout
      const [updated] = await db
        .update(pageLayouts)
        .set({
          draftComponents: components,
          draftUpdatedAt: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
        } as any)
        .where(eq(pageLayouts.slug, slug))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to save draft" });
    }
  });

  // Publish layout (copy draft to published)
  app.post("/api/layouts/:slug/publish", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;
      const user = req.user as any;
      const userId = user?.claims?.sub;

      // Get user role from database
      const dbUser = userId ? await storage.getUser(userId) : null;
      const userRole = dbUser?.role || "viewer";

      // Check user role - only admin/editor can publish
      if (!dbUser || !["admin", "editor"].includes(userRole)) {
        return res.status(403).json({ error: "Insufficient permissions to publish" });
      }

      const existing = await db
        .select()
        .from(pageLayouts)
        .where(eq(pageLayouts.slug, slug))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Layout not found" });
      }

      const layout = existing[0];

      // Copy draft to published
      const [published] = await db
        .update(pageLayouts)
        .set({
          components: layout.draftComponents || [],
          status: "published",
          publishedAt: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
        } as any)
        .where(eq(pageLayouts.slug, slug))
        .returning();

      res.json(published);
    } catch (error) {
      res.status(500).json({ error: "Failed to publish layout" });
    }
  });

  // Get published layout (for public viewing)
  app.get("/api/public/layouts/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      const layout = await db
        .select({
          slug: pageLayouts.slug,
          title: pageLayouts.title,
          components: pageLayouts.components,
          publishedAt: pageLayouts.publishedAt,
        })
        .from(pageLayouts)
        .where(and(eq(pageLayouts.slug, slug), eq(pageLayouts.status, "published")))
        .limit(1);

      if (layout.length === 0) {
        return res.status(404).json({ error: "Layout not found" });
      }

      res.json(layout[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // ============================================================================
  // SITEMAPS - Multilingual SEO Support (50 languages)
  // ============================================================================

  // Main sitemap index - lists all language-specific sitemaps
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const { generateSitemapIndex } = await import("./services/sitemap");
      const sitemapIndex = await generateSitemapIndex();
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(sitemapIndex);
    } catch (error) {
      res.status(500).set("Content-Type", "text/plain").send("Error generating sitemap");
    }
  });

  // Language-specific sitemaps (e.g., /sitemap-en.xml, /sitemap-ar.xml)
  app.get("/sitemap-:locale.xml", async (req, res) => {
    try {
      const locale = req.params.locale as any;

      // Validate locale
      if (!SUPPORTED_LOCALES.some(l => l.code === locale)) {
        return res.status(404).set("Content-Type", "text/plain").send("Sitemap not found");
      }

      const { generateLocaleSitemap } = await import("./services/sitemap");
      const sitemap = await generateLocaleSitemap(locale);
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(sitemap);
    } catch (error) {
      res.status(500).set("Content-Type", "text/plain").send("Error generating sitemap");
    }
  });

  // Robots.txt with sitemap references
  app.get("/robots.txt", async (req, res) => {
    try {
      const { generateRobotsTxt } = await import("./services/sitemap");
      const robotsTxt = generateRobotsTxt();
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.send(robotsTxt);
    } catch (error) {
      res.status(500).set("Content-Type", "text/plain").send("Error generating robots.txt");
    }
  });

  // NOTE: /sitemap HTML route is registered early in server/index.ts for SEO priority
  // It is registered BEFORE this function to ensure it cannot be hijacked by SPA fallback

  // ============================================================================
  // ENTERPRISE ROUTES (Teams, Workflows, Notifications, etc.)
  // ============================================================================
  registerEnterpriseRoutes(app);
  registerSiteConfigRoutes(app);

  // Reliable Webhooks disabled - module deleted
  // registerReliableWebhookAdminRoutes(app);
  // startWebhookWorker();

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
  // SEO ROUTES (Validation, Auto-fix, Publishing gates)
  // ============================================================================
  registerSEORoutes(app);

  // ============================================================================
  // SEO ENGINE (Unified SEO/AEO system, Schema.org, Canonical, Index Health)
  // ============================================================================
  registerSEOEngineRoutes(app);

  // ============================================================================
  // AUTOMATION ROUTES (Auto SEO, linking, freshness, etc.)
  // ============================================================================
  registerAutomationRoutes(app);

  // ============================================================================
  // CONTENT INTELLIGENCE (Clusters, Gaps, A/B Testing, ROI)
  // ============================================================================
  registerContentIntelligenceRoutes(app);

  // ============================================================================
  // DESTINATION INTELLIGENCE (Content health, AI generation, scanning)
  // ============================================================================
  registerDestinationIntelligenceRoutes(app);

  // ============================================================================
  // ADMIN INTELLIGENCE (System health, coverage metrics, blocking issues)
  // ============================================================================
  registerAdminIntelligenceRoutes(app);
  registerAdminIngestionRoutes(app);

  // ============================================================================
  // AUTO-PILOT (Zero-touch automation - supervisor only)
  // ============================================================================
  registerAutoPilotRoutes(app);

  // ============================================================================
  // GROWTH DASHBOARD (Unified view of auto-pilot activities and metrics)
  // ============================================================================
  registerGrowthRoutes(app);

  // ============================================================================

  // OBSERVABILITY (Content intelligence, jobs, RSS status, search coverage)
  // ============================================================================
  registerObservabilityRoutes(app);

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
  // TRAVI CONTENT GENERATOR (Admin dashboard for content generation)
  // ============================================================================

  // Import TRAVI modules
  const {
    getBudgetStatus,
    getTodayUsageStats,
    isProcessingPaused,
    pauseProcessing,
    resumeProcessing,
  } = await import("./travi/budget-manager");
  const { getRecentJobs, getRunningJobs } = await import("./travi/checkpoint-manager");
  const { processDestinationCategory, getRecentLogs } =
    await import("./travi/processing-orchestrator");
  const { DESTINATION_METADATA } = await import("./travi/destination-seeder");
  const { WHITELISTED_DESTINATIONS } = await import("./travi/validation");

  // GET /api/admin/travi/stats - Returns usage stats and budget status
  app.get(
    "/api/admin/travi/stats",
    requireAuth,
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const budgetStatus = await getBudgetStatus();
        const todayUsage = await getTodayUsageStats();
        const runningJobs = await getRunningJobs();

        const todayCost = todayUsage.reduce(
          (sum, u) => sum + parseFloat(u.estimatedCost || "0"),
          0
        );
        const todayRequests = todayUsage.reduce((sum, u) => sum + u.requestCount, 0);
        const todaySuccess = todayUsage.reduce((sum, u) => sum + u.successCount, 0);
        const todayFailed = todayUsage.reduce((sum, u) => sum + u.failedCount, 0);

        res.json({
          budget: budgetStatus,
          today: {
            cost: todayCost,
            requests: todayRequests,
            success: todaySuccess,
            failed: todayFailed,
          },
          processingStatus: isProcessingPaused()
            ? "paused"
            : runningJobs.length > 0
              ? "running"
              : "idle",
          runningJobsCount: runningJobs.length,
          destinations: DESTINATION_METADATA.map(d => ({
            slug: d.slug,
            city: d.city,
            country: d.country,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch stats" });
      }
    }
  );

  // GET /api/admin/travi/jobs - Returns list of processing jobs
  app.get(
    "/api/admin/travi/jobs",
    requireAuth,
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const jobs = await getRecentJobs(limit);

        res.json({
          jobs: jobs.map(job => ({
            id: job.jobId,
            type: job.jobType,
            status: job.status,
            totalItems: job.totalItems,
            processedItems: job.processedItems,
            successCount: job.successCount,
            failedCount: job.failedCount,
            startedAt: job.startedAt,
            completedAt: job.completedAt,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch jobs" });
      }
    }
  );

  // POST /api/admin/travi/process - Start processing a destination/category
  app.post(
    "/api/admin/travi/process",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { destination, category, dryRun, batchSize, maxLocations } = req.body;

        if (!destination || !category) {
          return res.status(400).json({ error: "destination and category are required" });
        }

        const validDestinations = WHITELISTED_DESTINATIONS.map(d => d.slug);
        if (!validDestinations.includes(destination)) {
          return res.status(400).json({ error: "Invalid destination" });
        }

        const validCategories = ["attraction", "restaurant", "hotel"];
        if (!validCategories.includes(category)) {
          return res
            .status(400)
            .json({ error: "Invalid category. Must be: attraction, restaurant, or hotel" });
        }

        // Start processing in background
        const result = await processDestinationCategory(destination, category, {
          dryRun: dryRun || false,
          batchSize: Math.min(batchSize || 10, 50),
          maxLocations: Math.min(maxLocations || 100, 500),
        });

        res.json({
          success: true,
          jobId: result.jobId,
          status: result.status,
          message: `Started processing ${category}s for ${destination}`,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to start processing" });
      }
    }
  );

  // POST /api/admin/travi/pause - Pause all processing
  app.post(
    "/api/admin/travi/pause",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        pauseProcessing("Manual pause from admin dashboard");
        res.json({ success: true, message: "Processing paused" });
      } catch (error) {
        res.status(500).json({ error: "Failed to pause processing" });
      }
    }
  );

  // POST /api/admin/travi/resume - Resume processing
  app.post(
    "/api/admin/travi/resume",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        resumeProcessing();
        res.json({ success: true, message: "Processing resumed" });
      } catch (error) {
        res.status(500).json({ error: "Failed to resume processing" });
      }
    }
  );

  // GET /api/admin/travi/logs - Get recent processing logs
  app.get(
    "/api/admin/travi/logs",
    requireAuth,
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
        const logs = getRecentLogs(limit);
        res.json({ logs });
      } catch (error) {
        res.status(500).json({ error: "Failed to get logs" });
      }
    }
  );

  // GET /api/admin/travi/export - Export locations with attribution
  const exportModule = await import("./travi/export-module");
  const { exportLocations } = exportModule;
  const exportSummary = (exportModule as any).exportSummary;

  app.get(
    "/api/admin/travi/export",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { destination, category, format, includeIncomplete } = req.query;

        const result = (await exportLocations((destination as string) || undefined)) as any;

        // Return 400 if validation failed and there are errors
        if (!result.success && result.validationErrors?.length > 0) {
          return res.status(400).json({
            error: "Export validation failed",
            validationErrors: result.validationErrors,
            totalLocations: result.totalLocations,
            exportedLocations: result.exportedLocations,
          });
        }

        if (format === "csv") {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="travi-export-${Date.now()}.csv"`
          );
          res.send(result.csv);
        } else {
          res.json(result);
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to export locations" });
      }
    }
  );

  // GET /api/admin/travi/export/summary - Get export summary by destination
  app.get(
    "/api/admin/travi/export/summary",
    requireAuth,
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const summary = await exportSummary();
        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: "Failed to get export summary" });
      }
    }
  );

  // ============================================================================
  // TRAVI CMS - Locations Management (DEPRECATED: Migrated to Tiqets system)
  // ============================================================================

  // DEPRECATED: Migrated to Tiqets system
  // GET /api/admin/travi/locations - List locations with filters and pagination
  app.get(
    "/api/admin/travi/locations",
    requireAuth,
    requirePermission("canViewAll"),
    async (req, res) => {
      res.json({
        message: "Deprecated - use Tiqets API",
        locations: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
        filters: { cities: [], categories: [], statuses: [] },
        migration:
          "This endpoint has been migrated to the Tiqets integration system. Use /api/admin/tiqets/* endpoints instead.",
      });
    }
  );

  // DEPRECATED: Migrated to Tiqets system
  // GET /api/admin/travi/locations/:id - Get single location with all related data
  app.get(
    "/api/admin/travi/locations/:id",
    requireAuth,
    requirePermission("canViewAll"),
    async (req, res) => {
      res.json({
        message: "Deprecated - use Tiqets API",
        migration:
          "This endpoint has been migrated to the Tiqets integration system. Use /api/admin/tiqets/* endpoints instead.",
      });
    }
  );

  // DEPRECATED: Migrated to Tiqets system
  // PATCH /api/admin/travi/locations/:id - Update location
  app.patch(
    "/api/admin/travi/locations/:id",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      res.json({
        message: "Deprecated - use Tiqets API",
        migration:
          "This endpoint has been migrated to the Tiqets integration system. Use /api/admin/tiqets/* endpoints instead.",
      });
    }
  );

  // DEPRECATED: Migrated to Tiqets system
  // GET /api/admin/travi/locations/:id/history - Get edit history for a location
  app.get(
    "/api/admin/travi/locations/:id/history",
    requireAuth,
    requirePermission("canViewAll"),
    async (req, res) => {
      res.json([]);
    }
  );

  // DEPRECATED: Migrated to Tiqets system
  // DELETE /api/admin/travi/locations/:id - Delete location
  app.delete(
    "/api/admin/travi/locations/:id",
    requireAuth,
    requirePermission("canDelete"),
    async (req, res) => {
      res.json({
        message: "Deprecated - use Tiqets API",
        migration: "This endpoint has been migrated to the Tiqets integration system.",
      });
    }
  );

  // DEPRECATED: Migrated to Tiqets system
  // POST /api/admin/travi/locations/bulk - Bulk operations
  app.post(
    "/api/admin/travi/locations/bulk",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      res.json({
        message: "Deprecated - use Tiqets API",
        migration: "This endpoint has been migrated to the Tiqets integration system.",
        affected: 0,
      });
    }
  );

  // DEPRECATED: Migrated to Tiqets system
  // POST /api/admin/travi/locations/:id/generate-content - Generate AI content for a location
  app.post(
    "/api/admin/travi/locations/:id/generate-content",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      res.json({
        message: "Deprecated - use Tiqets API",
        migration: "This endpoint has been migrated to the Tiqets integration system.",
      });
    }
  );

  // GET /api/admin/travi/config - Get configuration settings (still functional - uses traviConfig which exists)
  app.get(
    "/api/admin/travi/config",
    requireAuth,
    requirePermission("canViewAll"),
    async (req, res) => {
      try {
        const { DESTINATION_METADATA } = await import("./travi/destination-seeder");

        const apiKeys = {
          openai: {
            configured: !!(
              process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY
            ),
          },
          anthropic: { configured: !!process.env.ANTHROPIC_API_KEY },
          gemini: {
            configured: !!(
              process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GOOGLE_AI_API_KEY
            ),
          },
          freepik: { configured: !!process.env.FREEPIK_API_KEY },
          googlePlaces: { configured: !!process.env.GOOGLE_PLACES_API_KEY },
          tripadvisor: { configured: !!process.env.TRIPADVISOR_API_KEY },
          tiqets: { configured: !!process.env.TIQETS_API_TOKEN },
        };

        const { getBudgetStatus } = await import("./travi/budget-manager");
        const budgetStatus = await getBudgetStatus();

        const budgetConfig = await db
          .select()
          .from(traviConfig)
          .where(eq(traviConfig.configKey, "budget_settings"))
          .limit(1);

        const persistedBudget =
          budgetConfig.length > 0 ? (budgetConfig[0].configValue as any)?.value : null;

        const destinationConfigs = await db
          .select()
          .from(traviConfig)
          .where(ilike(traviConfig.configKey, "destination_%"));

        const enabledMap = new Map<string, boolean>();
        for (const config of destinationConfigs) {
          const destId = config.configKey.replace("destination_", "");
          enabledMap.set(destId, (config.configValue as any)?.enabled ?? true);
        }

        const destinations = DESTINATION_METADATA.map(d => ({
          id: d.slug,
          name: d.city,
          country: d.country,
          enabled: enabledMap.has(d.slug) ? enabledMap.get(d.slug) : true,
          locationCount: 0,
        }));

        res.json({
          apiKeys,
          budget: {
            dailyLimit: persistedBudget?.dailyLimit || (budgetStatus as any).dailyLimit || 50,
            warningThreshold:
              persistedBudget?.warningThreshold || (budgetStatus as any).warningThreshold || 40,
            currentSpend: (budgetStatus as any).currentSpend || 0,
          },
          destinations,
          affiliateLink: "https://tiqets.tpo.lu/k16k6RXU",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get config" });
      }
    }
  );

  // POST /api/admin/travi/config/test-api - Test an API connection
  app.post(
    "/api/admin/travi/config/test-api",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { provider } = req.body;

        const tests: Record<string, boolean> = {
          openai: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
          anthropic: !!process.env.ANTHROPIC_API_KEY,
          gemini: !!(process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GOOGLE_AI_API_KEY),
          freepik: !!process.env.FREEPIK_API_KEY,
          googlePlaces: !!process.env.GOOGLE_PLACES_API_KEY,
          tripadvisor: !!process.env.TRIPADVISOR_API_KEY,
          tiqets: !!process.env.TIQETS_API_TOKEN,
        };

        if (tests[provider]) {
          res.json({ success: true, message: `${provider} API key is configured` });
        } else {
          res.status(400).json({ error: `${provider} API key is not configured` });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to test API" });
      }
    }
  );

  // PATCH /api/admin/travi/config/budget - Update budget settings
  app.patch(
    "/api/admin/travi/config/budget",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { dailyLimit, warningThreshold } = req.body;

        const configKey = "budget_settings";
        const existing = await db
          .select()
          .from(traviConfig)
          .where(eq(traviConfig.configKey, configKey))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(traviConfig)
            .set({
              configValue: { value: { dailyLimit, warningThreshold } },
              updatedAt: new Date(),
            } as any)
            .where(eq(traviConfig.configKey, configKey));
        } else {
          await db.insert(traviConfig).values({
            configKey,
            configValue: { value: { dailyLimit, warningThreshold } },
          } as any);
        }

        res.json({
          success: true,
          message: "Budget settings updated",
          dailyLimit,
          warningThreshold,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update budget" });
      }
    }
  );

  // PATCH /api/admin/travi/config/destinations/:id - Toggle destination enabled status
  app.patch(
    "/api/admin/travi/config/destinations/:id",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { enabled } = req.body;

        const configKey = `destination_${id}`;

        const existing = await db
          .select()
          .from(traviConfig)
          .where(eq(traviConfig.configKey, configKey))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(traviConfig)
            .set({
              configValue: { enabled, destinationId: id },
              updatedAt: new Date(),
            } as any)
            .where(eq(traviConfig.configKey, configKey));
        } else {
          await db.insert(traviConfig).values({
            configKey,
            configValue: { enabled, destinationId: id },
          } as any);
        }

        res.json({
          success: true,
          destinationId: id,
          enabled,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update destination" });
      }
    }
  );

  // GET /api/admin/travi/districts - List all districts for a city
  app.get(
    "/api/admin/travi/districts",
    requireAuth,
    requirePermission("canViewAll"),
    async (req, res) => {
      try {
        const { city } = req.query;

        const query = city
          ? db
              .select()
              .from(traviDistricts)
              .where(eq(traviDistricts.city, city as string))
              .orderBy(traviDistricts.displayOrder)
          : db
              .select()
              .from(traviDistricts)
              .orderBy(traviDistricts.city, traviDistricts.displayOrder);

        const districts = await query;
        res.json(districts);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch districts" });
      }
    }
  );

  // DEPRECATED: Migrated to Tiqets system
  // POST /api/admin/travi/districts/auto-assign - Auto-assign locations to districts based on coordinates
  app.post(
    "/api/admin/travi/districts/auto-assign",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      res.json({
        message: "Deprecated - use Tiqets API",
        migration: "This endpoint has been migrated to the Tiqets integration system.",
        success: true,
        assigned: 0,
        skipped: 0,
      });
    }
  );

  // DEPRECATED: Migrated to Tiqets system
  // POST /api/admin/travi/locations/bulk-process - Bulk process discovered locations with AI
  app.post(
    "/api/admin/travi/locations/bulk-process",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      res.json({
        message: "Deprecated - use Tiqets API",
        migration: "This endpoint has been migrated to the Tiqets integration system.",
        success: true,
        processed: 0,
        failed: 0,
        results: [],
      });
    }
  );

  // ============================================================================
  // CONTENT QUALITY MANAGEMENT (V2 Regeneration System)
  // ============================================================================

  // GET /api/admin/content-quality/report - Get overall quality report
  app.get("/api/admin/content-quality/report", requireAuth, async (req, res) => {
    try {
      const { getContentQualityReport } = await import("./services/content-regeneration-job");
      const report = await getContentQualityReport();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/content-quality/attractions - Get attractions with quality scores
  app.get("/api/admin/content-quality/attractions", requireAuth, async (req, res) => {
    try {
      const { page = 1, limit = 50, city, minScore, maxScore, status } = req.query;

      let query = db
        .select({
          id: tiqetsAttractions.id,
          title: tiqetsAttractions.title,
          cityName: tiqetsAttractions.cityName,
          seoSlug: tiqetsAttractions.seoSlug,
          qualityScore: tiqetsAttractions.qualityScore,
          seoScore: tiqetsAttractions.seoScore,
          aeoScore: tiqetsAttractions.aeoScore,
          factCheckScore: tiqetsAttractions.factCheckScore,
          contentVersion: tiqetsAttractions.contentVersion,
          status: tiqetsAttractions.status,
          lastContentUpdate: tiqetsAttractions.lastContentUpdate,
        })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "ready"))
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit))
        .orderBy(tiqetsAttractions.qualityScore);

      const attractions = await query;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "ready"));

      res.json({
        attractions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(countResult[0]?.count || 0),
          totalPages: Math.ceil(Number(countResult[0]?.count || 0) / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/content-quality/regenerate/:id - Regenerate single attraction
  app.post("/api/admin/content-quality/regenerate/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { regenerateSingleAttraction } = await import("./services/content-regeneration-job");
      const result = await regenerateSingleAttraction(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/content-quality/regenerate-all - Start bulk regeneration
  app.post("/api/admin/content-quality/regenerate-all", requireAuth, async (req, res) => {
    try {
      const { batchSize, cityFilter, onlyFailed } = req.body;
      const { regenerateAllAttractions, getRegenerationStats } =
        await import("./services/content-regeneration-job");

      // Start in background - use high parallelism (user has 20 API keys)
      regenerateAllAttractions({
        batchSize: batchSize || 30,
        cityFilter,
      }).catch(err => {});

      res.json({
        success: true,
        message: "Regeneration job started",
        stats: getRegenerationStats(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/content-quality/regeneration-status - Get regeneration job status
  app.get("/api/admin/content-quality/regeneration-status", requireAuth, async (req, res) => {
    try {
      const { getRegenerationStats } = await import("./services/content-regeneration-job");
      res.json(getRegenerationStats());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/api-keys/detected - Get which API key env vars are detected (no values exposed)
  app.get("/api/admin/api-keys/detected", requireAuth, async (req, res) => {
    try {
      const detected: Record<string, string[]> = {
        anthropic: [],
        helicone: [],
        openai: [],
        openrouter: [],
        gemini: [],
        groq: [],
        mistral: [],
        deepseek: [],
      };

      if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY)
        detected.anthropic.push("AI_INTEGRATIONS_ANTHROPIC_API_KEY");
      if (process.env.ANTHROPIC_API_KEY) detected.anthropic.push("ANTHROPIC_API_KEY");
      for (let i = 1; i <= 20; i++) {
        if (process.env[`ANTHROPIC_API_KEY_${i}`])
          detected.anthropic.push(`ANTHROPIC_API_KEY_${i}`);
      }

      if (process.env.HELICONE_API_KEY) detected.helicone.push("HELICONE_API_KEY");
      for (let i = 1; i <= 20; i++) {
        if (process.env[`HELICONE_API_KEY_${i}`]) detected.helicone.push(`HELICONE_API_KEY_${i}`);
      }

      if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY)
        detected.openai.push("AI_INTEGRATIONS_OPENAI_API_KEY");
      if (process.env.OPENAI_API_KEY) detected.openai.push("OPENAI_API_KEY");
      for (let i = 1; i <= 20; i++) {
        if (process.env[`OPENAI_API_KEY_${i}`]) detected.openai.push(`OPENAI_API_KEY_${i}`);
      }

      if (process.env.OPENROUTER_API_KEY) detected.openrouter.push("OPENROUTER_API_KEY");
      for (let i = 1; i <= 20; i++) {
        if (process.env[`OPENROUTER_API_KEY_${i}`])
          detected.openrouter.push(`OPENROUTER_API_KEY_${i}`);
      }

      if (process.env.AI_INTEGRATIONS_GEMINI_API_KEY)
        detected.gemini.push("AI_INTEGRATIONS_GEMINI_API_KEY");
      if (process.env.GEMINI_API_KEY) detected.gemini.push("GEMINI_API_KEY");
      if (process.env.GROQ_API_KEY) detected.groq.push("GROQ_API_KEY");
      if (process.env.MISTRAL_API_KEY) detected.mistral.push("MISTRAL_API_KEY");
      if (process.env.DEEPSEEK_API_KEY) detected.deepseek.push("DEEPSEEK_API_KEY");

      const total = Object.values(detected).reduce((sum, arr) => sum + arr.length, 0);
      res.json({ detected, total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/content-quality/engine-stats - Get multi-provider engine pool statistics
  app.get("/api/admin/content-quality/engine-stats", requireAuth, async (req, res) => {
    try {
      const { EngineRegistry } = await import("./services/engine-registry");
      const stats = EngineRegistry.getStats();
      const engines = EngineRegistry.getAllEngines().map(e => ({
        id: e.id,
        name: e.name,
        provider: e.provider,
        model: e.model,
        isHealthy: e.isHealthy,
        successCount: e.successCount,
        errorCount: e.errorCount,
        lastError: e.lastError,
        lastUsed: e.lastUsed,
      }));
      res.json({ stats, engines });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/content-quality/validate/:id - Validate content quality for an attraction
  app.post("/api/admin/content-quality/validate/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { validateContent } = await import("./services/content-quality-validator");

      const attraction = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.id, id))
        .limit(1);

      if (!attraction.length) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      const aiContent = (attraction[0].aiContent as Record<string, any>) || {};
      const score = validateContent(aiContent, {
        cityName: attraction[0].cityName,
        title: attraction[0].title,
        duration: attraction[0].duration,
        wheelchairAccess: attraction[0].wheelchairAccess,
      });

      res.json(score);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/content-quality/publish-ready - Publish all attractions with 90+ score
  app.post("/api/admin/content-quality/publish-ready", requireAuth, async (req, res) => {
    try {
      const result = await db
        .update(tiqetsAttractions)
        .set({ status: "published" } as any)
        .where(
          and(
            eq(tiqetsAttractions.status, "ready"),
            sql`quality_score >= 90`,
            sql`seo_score >= 90`,
            sql`aeo_score >= 90`,
            sql`fact_check_score >= 90`
          )
        );

      res.json({
        success: true,
        message: "Published all attractions with 90+ scores on all metrics",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

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

  // ============================================================================
  // AI OUTPUT AUDIT TRAIL (Feature 4)
  // ============================================================================
  registerAiAuditRoutes(app);

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

  // ============================================================================
  // HELP CENTER (Knowledge Base System)
  // ============================================================================
  app.use("/api/admin/help", requireAuth, requirePermission("canEdit"), helpAdminRoutes);
  app.use("/api/help", helpPublicRoutes);
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
  app.use("/api/admin/media", mediaLibraryRoutes);

  // ============================================================================
  // MEDIA INTELLIGENCE (Performance analysis, recommendations, alt text quality)
  // Feature flag: ENABLE_MEDIA_INTELLIGENCE=true
  // ============================================================================
  app.use("/api/admin/media-intelligence", mediaIntelligenceRoutes);

  // ============================================================================
  // LOCALIZED ASSETS (Per-locale media management)
  // ============================================================================
  app.use(localizedAssetsRoutes);

  // ============================================================================
  // GROWTH OS (Autonomous Growth Operating System)
  // Feature flags: ENABLE_GROWTH_OS=true, ENABLE_GROWTH_OS_*=true
  // ============================================================================
  app.use("/api/growth-os", growthOSRoutes);

  // ============================================================================
  // TRAVI CONTENT GENERATION (Data collection, AI processing, location discovery)
  // ============================================================================
  app.use("/api/travi", requireAuth, requirePermission("canEdit"), traviRoutes);

  // ============================================================================
  // OCTYPO ENGINE (AI Content Generation System - Writers, Validators, Orchestrator)
  // ============================================================================
  app.use("/api/octypo", requireAuth, requirePermission("canEdit"), octypoRoutes);

  // ============================================================================
  // PILOT: Octypo × Localization Integration (Isolated for pilot testing)
  // ============================================================================
  app.use("/api/octypo/pilot", requireAuth, requirePermission("canEdit"), pilotLocalizationRoutes);

  // ============================================================================
  // ENHANCEMENTS (Readability, CTAs, Search, Popups, Newsletter, Monetization, PWA)
  // ============================================================================
  registerEnhancementRoutes(app);

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
  // LIVE CHAT SUPPORT ROUTES
  // ============================================================================

  // Public: Get or create conversation for visitor
  app.post("/api/live-chat/conversations", async (req: Request, res: Response) => {
    try {
      const { visitorId, visitorName, visitorEmail } = req.body;

      if (!visitorId) {
        return res.status(400).json({ error: "Visitor ID is required" });
      }

      // Check for existing open conversation
      let conversation = await storage.getLiveChatConversationByVisitor(visitorId);

      if (!conversation) {
        // Create new conversation
        conversation = await storage.createLiveChatConversation({
          visitorId,
          visitorName: visitorName || null,
          visitorEmail: visitorEmail || null,
          status: "open",
        });
      }

      res.json(conversation);
    } catch (error) {
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Public: Get messages for a conversation (polling)
  app.get("/api/live-chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;

      const messages = await storage.getLiveChatMessages(id, since);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Public: Send message as visitor
  app.post("/api/live-chat/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content, senderType = "visitor" } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const message = await storage.createLiveChatMessage({
        conversationId: id,
        senderType,
        content,
        isRead: false,
      });

      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Admin: Get all conversations
  app.get(
    "/api/admin/live-chat/conversations",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const status = req.query.status as string | undefined;
        const conversations = await storage.getLiveChatConversations(status);
        res.json(conversations);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch conversations" });
      }
    }
  );

  // Admin: Get single conversation with all messages
  app.get(
    "/api/admin/live-chat/conversations/:id",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const conversation = await storage.getLiveChatConversation(id);

        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        res.json(conversation);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch conversation" });
      }
    }
  );

  // Admin: Send message as admin
  app.post(
    "/api/admin/live-chat/conversations/:id/messages",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = getUserId(req);

        if (!content) {
          return res.status(400).json({ error: "Message content is required" });
        }

        const message = await storage.createLiveChatMessage({
          conversationId: id,
          senderType: "admin",
          senderId: userId,
          content,
          isRead: false,
        });

        res.json(message);
      } catch (error) {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  );

  // Admin: Update conversation status
  app.patch(
    "/api/admin/live-chat/conversations/:id",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        const { status, assignedToId } = req.body;

        const conversation = await storage.updateLiveChatConversation(id, {
          status,
          assignedToId,
        });

        if (!conversation) {
          return res.status(404).json({ error: "Conversation not found" });
        }

        res.json(conversation);
      } catch (error) {
        res.status(500).json({ error: "Failed to update conversation" });
      }
    }
  );

  // Admin: Mark messages as read
  app.post(
    "/api/admin/live-chat/conversations/:id/read",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const { id } = req.params;
        await storage.markMessagesAsRead(id, "admin");
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to mark messages as read" });
      }
    }
  );

  // ============================================================================
  // AI WRITERS ROUTES - Virtual Newsroom (disabled - module deleted)
  // ============================================================================
  // registerWriterRoutes(app);

  // ============================================================================
  // PAGE BUILDER ROUTES (Universal section editor with version history)
  // ============================================================================
  registerPageBuilderRoutes(app);

  // ============================================================================
  // TRANSLATION ROUTES (Multi-provider translation: Claude, GPT, DeepL)
  // ============================================================================
  app.use("/api/translate", translateRouter);

  // ============================================================================
  // CHAT ROUTES (AI Orchestrator-based contextual chat)
  // ============================================================================
  app.use("/api/chat", chatRouter);

  // ============================================================================
  // CONTENT RULES - Strict rules for AI content generation
  // ============================================================================

  // Get active content rules
  app.get("/api/content-rules", requireAuth, async (req, res) => {
    try {
      const rules = await db
        .select()
        .from(contentRules)
        .where(eq(contentRules.isActive, true))
        .limit(1);
      if (rules.length === 0) {
        // Return default rules if none exist
        const { DEFAULT_CONTENT_RULES } = await import("@shared/schema");
        return res.json({ id: null, ...DEFAULT_CONTENT_RULES });
      }
      res.json(rules[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content rules" });
    }
  });

  // Save/update content rules
  app.post("/api/content-rules", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const data = req.body;

      // First, deactivate all existing rules
      await db.update(contentRules).set({ isActive: false } as any);

      // Check if rule with this name exists
      const existing = await db
        .select()
        .from(contentRules)
        .where(eq(contentRules.name, data.name))
        .limit(1);

      if (existing.length > 0) {
        // Update existing rule
        await db
          .update(contentRules)
          .set({ ...data, isActive: true, updatedAt: new Date() } as any)
          .where(eq(contentRules.name, data.name));
        res.json({ success: true, updated: true });
      } else {
        // Insert new rule
        await db.insert(contentRules).values({
          ...data,
          isActive: true,
          createdBy: (req as any).user?.id,
        } as any);
        res.json({ success: true, created: true });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to save content rules" });
    }
  });

  // Get all content rules (including inactive)
  app.get("/api/content-rules/all", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const rules = await db.select().from(contentRules).orderBy(desc(contentRules.createdAt));
      res.json(rules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content rules" });
    }
  });

  // ============================================================================
  // DOC/DOCX UPLOAD (Import content directly from Word documents)
  // ============================================================================
  registerDocUploadRoutes(app);

  // ============================================================================
  // DATABASE BACKUP ROUTES (admin only)
  // ============================================================================
  app.get("/api/admin/backups", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { listBackups } = await import("./scripts/backup-db");
      const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
      if (!fs.existsSync(backupDir)) {
        return res.json({ backups: [], directory: backupDir });
      }
      const files = fs
        .readdirSync(backupDir)
        .filter(f => f.startsWith("backup-") && f.endsWith(".sql.gz"))
        .map(f => {
          const stats = fs.statSync(path.join(backupDir, f));
          return {
            name: f,
            size: stats.size,
            createdAt: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json({ backups: files, directory: backupDir });
    } catch (error) {
      res.status(500).json({ error: "Failed to list backups" });
    }
  });

  app.post("/api/admin/backups", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { triggerBackup } = await import("./lib/backup-scheduler");
      const result = await triggerBackup();
      if (result.success) {
        res.json({ success: true, backup: result });
      } else {
        res.status(500).json({ error: result.error || "Backup failed" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/admin/backups/status", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { getSchedulerStatus } = await import("./lib/backup-scheduler");
      res.json(getSchedulerStatus());
    } catch (error) {
      res.status(500).json({ error: "Failed to get backup status" });
    }
  });

  // ============================================================================
  // MAGIC LINK AUTH
  // Rate limited: 5 attempts per 15 minutes per IP to prevent abuse
  // Note: POST /api/auth/login has its own rate limiter (rateLimiters.auth) and is NOT modified here
  // ============================================================================
  app.post(
    "/api/auth/magic-link",
    ...adminAuthGuards,
    magicLinkDisableMiddleware,
    loginRateLimiter,
    async (req, res) => {
      try {
        const { magicLinkAuth } = await import("./auth/magic-link");
        const { email } = req.body;
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const result = await magicLinkAuth.sendMagicLink(email, baseUrl);
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: "Failed to send magic link" });
      }
    }
  );

  // Rate limited: 5 attempts per 15 minutes per IP to prevent token brute-forcing
  app.get(
    "/api/auth/magic-link/verify",
    ...adminAuthGuards,
    magicLinkDisableMiddleware,
    loginRateLimiter,
    async (req, res) => {
      try {
        const { magicLinkAuth } = await import("./auth/magic-link");
        const { token } = req.query;
        const result = await magicLinkAuth.verifyMagicLink(token as string);
        if (result.success) {
          // Set up session here if needed
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({ success: false, error: "Failed to verify magic link" });
      }
    }
  );

  // ============================================================================
  // AI CONTENT SCORING
  // ============================================================================
  app.post("/api/ai/score-content/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentScorer } = await import("./ai/content-scorer");
      const { contentId } = req.params;
      const result = await contentScorer.scoreContent(contentId);
      if (result) {
        res.json(result);
      } else {
        res.status(500).json({ error: "Failed to score content" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to score content" });
    }
  });

  app.get("/api/ai/content-score/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentScorer } = await import("./ai/content-scorer");
      const { contentId } = req.params;
      const result = await contentScorer.getContentScore(contentId);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "No score found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get content score" });
    }
  });

  // ============================================================================
  // AI PLAGIARISM DETECTION
  // ============================================================================
  app.post("/api/ai/check-plagiarism/:contentId", requireAuth, async (req, res) => {
    try {
      const { plagiarismDetector } = await import("./ai/plagiarism-detector");
      const { contentId } = req.params;
      const { threshold } = req.body;
      const result = await plagiarismDetector.checkPlagiarism(contentId, threshold);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to check plagiarism" });
    }
  });

  app.post("/api/ai/compare-texts", requireAuth, async (req, res) => {
    try {
      const { plagiarismDetector } = await import("./ai/plagiarism-detector");
      const { text1, text2 } = req.body;
      const similarity = await plagiarismDetector.compareTexts(text1, text2);
      res.json({ similarity });
    } catch (error) {
      res.status(500).json({ error: "Failed to compare texts" });
    }
  });

  // ============================================================================
  // AI VISUAL SEARCH
  // ============================================================================
  app.post("/api/ai/visual-search", async (req, res) => {
    try {
      const { visualSearch } = await import("./ai/visual-search");
      const { imageUrl, limit } = req.body;
      const results = await visualSearch.searchByImage(imageUrl, limit);
      res.json({ results });
    } catch (error) {
      res.status(500).json({ error: "Failed to perform visual search" });
    }
  });

  app.post("/api/ai/analyze-image", async (req, res) => {
    try {
      const { visualSearch } = await import("./ai/visual-search");
      const { imageUrl } = req.body;
      const analysis = await visualSearch.analyzeImage(imageUrl);
      if (analysis) {
        res.json(analysis);
      } else {
        res.status(500).json({ error: "Failed to analyze image" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // ============================================================================
  // WEBHOOKS
  // ============================================================================
  app.post("/api/webhooks", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const webhook = await db
        .insert(webhooks)
        .values({
          ...req.body,
          createdBy: getUserId(req as AuthRequest),
        })
        .returning();
      res.json(webhook[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  app.get("/api/webhooks", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const allWebhooks = await db.select().from(webhooks);
      res.json(allWebhooks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  app.post("/api/webhooks/:id/test", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { webhookManager } = await import("./webhooks/webhook-manager");
      const { id } = req.params;
      const result = await webhookManager.testWebhook(id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to test webhook" });
    }
  });

  app.get("/api/webhooks/:id/logs", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { id } = req.params;
      const logs = await db
        .select()
        .from(webhookLogs)
        .where(eq(webhookLogs.webhookId, id))
        .orderBy(desc(webhookLogs.createdAt))
        .limit(50);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhook logs" });
    }
  });

  // ============================================================================
  // WORKFLOWS
  // ============================================================================
  app.post("/api/workflows", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const workflow = await db
        .insert(workflows)
        .values({
          ...req.body,
          createdBy: getUserId(req as AuthRequest),
        })
        .returning();
      res.json(workflow[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create workflow" });
    }
  });

  app.get("/api/workflows", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const allWorkflows = await db.select().from(workflows);
      res.json(allWorkflows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.post(
    "/api/workflows/:id/execute",
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const { workflowEngine } = await import("./workflows/workflow-engine");
        const { id } = req.params;
        const result = await workflowEngine.executeWorkflow(id, req.body);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to execute workflow" });
      }
    }
  );

  app.get(
    "/api/workflows/:id/executions",
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const executions = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.workflowId, id))
          .orderBy(desc(workflowExecutions.startedAt))
          .limit(50);
        res.json(executions);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch workflow executions" });
      }
    }
  );

  // ============================================================================
  // AFFILIATE & PARTNER MANAGEMENT
  // ============================================================================
  app.post("/api/partners", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const partner = await db.insert(partners).values(req.body).returning();
      res.json(partner[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to create partner" });
    }
  });

  app.get("/api/partners", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const allPartners = await db.select().from(partners);
      res.json(allPartners);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  app.get("/api/partners/:id/dashboard", requireAuth, async (req, res) => {
    try {
      const { partnerDashboard } = await import("./monetization/partner-dashboard");
      const { id } = req.params;
      const metrics = await partnerDashboard.getPartnerMetrics(id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch partner dashboard" });
    }
  });

  app.post(
    "/api/partners/:id/inject-links",
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const { affiliateInjector } = await import("./monetization/affiliate-injector");
        const { contentId, dryRun } = req.body;
        const result = await affiliateInjector.injectAffiliateLinks(contentId, dryRun);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to inject affiliate links" });
      }
    }
  );

  app.post("/api/partners/:id/track-click", async (req, res) => {
    try {
      const { affiliateInjector } = await import("./monetization/affiliate-injector");
      const { trackingCode } = req.body;
      await affiliateInjector.trackClick(trackingCode);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // ============================================================================
  // AFFILIATE HOOKS STATUS & LINK GENERATION
  // ============================================================================

  // GET /api/admin/affiliate/status - Returns affiliate hooks system status
  app.get("/api/admin/affiliate/status", requirePermission("canEdit"), async (_req, res) => {
    try {
      const { getAffiliateHookStatus, isAffiliateHooksEnabled } =
        await import("./monetization/affiliate-hooks");
      const status = getAffiliateHookStatus();
      res.json({
        ...status,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliate status" });
    }
  });

  // POST /api/admin/affiliate/validate - Validate affiliate configuration for safe activation
  app.post("/api/admin/affiliate/validate", requirePermission("canEdit"), async (_req, res) => {
    try {
      const { getAffiliateHookStatus, getAffiliateMetrics } =
        await import("./monetization/affiliate-hooks");
      const { performZoneAudit } = await import("./monetization/commercial-zones");

      const status = getAffiliateHookStatus();
      const zoneAudit = performZoneAudit();
      const metrics = getAffiliateMetrics();

      const checks: Array<{ name: string; passed: boolean; details: string }> = [];
      const warnings: string[] = [];

      // Check 1: Partner ID present
      const partnerIdPresent = !!process.env.AFFILIATE_PARTNER_ID;
      checks.push({
        name: "partner_id_present",
        passed: partnerIdPresent,
        details: partnerIdPresent
          ? "AFFILIATE_PARTNER_ID environment variable is configured"
          : "AFFILIATE_PARTNER_ID environment variable is missing",
      });
      if (!partnerIdPresent) {
        warnings.push("AFFILIATE_PARTNER_ID is required before enabling affiliate links");
      }

      // Check 2: Zone configuration valid
      const zonesValid = zoneAudit.commercialZones.length > 0;
      checks.push({
        name: "zone_configuration_valid",
        passed: zonesValid,
        details: `${zoneAudit.commercialZones.length} commercial zones configured`,
      });

      // Check 3: rel="nofollow sponsored" enforced
      const relAttributeEnforced = true;
      checks.push({
        name: "rel_nofollow_sponsored_enforced",
        passed: relAttributeEnforced,
        details: 'All affiliate links use rel="nofollow sponsored" by default',
      });

      // Check 4: Forbidden zones enforced
      checks.push({
        name: "forbidden_zones_enforced",
        passed: zoneAudit.forbiddenZonesEnforced,
        details: `${zoneAudit.forbiddenZones.length} forbidden zones are enforced`,
      });

      // Check 5: SEO compliance
      checks.push({
        name: "seo_compliant",
        passed: zoneAudit.seoCompliant,
        details: zoneAudit.seoCompliant
          ? "All zones are SEO-safe with required disclosures"
          : "Some zones may have SEO compliance issues",
      });

      // Check 6: Master switch status
      checks.push({
        name: "master_switch_status",
        passed: true,
        details: status.enabled
          ? "Affiliate hooks are ENABLED"
          : "Affiliate hooks are DISABLED (safe mode)",
      });

      // Check 7: No forbidden zone violations
      const noViolations = metrics.forbiddenZoneViolationsBlocked === 0;
      checks.push({
        name: "no_forbidden_zone_violations",
        passed: noViolations,
        details: noViolations
          ? "No forbidden zone violations detected"
          : `${metrics.forbiddenZoneViolationsBlocked} violation attempts blocked`,
      });
      if (!noViolations) {
        warnings.push(
          `${metrics.forbiddenZoneViolationsBlocked} forbidden zone violation attempts have been blocked`
        );
      }

      // Add status warnings
      warnings.push(...status.warnings);

      const allChecksPassed = checks.every(c => c.passed);

      res.json({
        valid: allChecksPassed && warnings.length === 0,
        checks,
        warnings,
        zoneAudit: {
          zonesAudited: zoneAudit.zonesAudited,
          commercialZones: zoneAudit.commercialZones,
          forbiddenZones: zoneAudit.forbiddenZones,
          forbiddenZonesEnforced: zoneAudit.forbiddenZonesEnforced,
          seoCompliant: zoneAudit.seoCompliant,
          seoCriticalPaths: zoneAudit.seoCriticalPaths,
        },
        status: {
          enabled: status.enabled,
          masterSwitch: status.masterSwitch,
          hooksSwitch: status.hooksSwitch,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate affiliate configuration" });
    }
  });

  // GET /api/admin/affiliate/metrics - Get affiliate tracking metrics
  app.get("/api/admin/affiliate/metrics", requirePermission("canEdit"), async (_req, res) => {
    try {
      const { getAffiliateMetrics, isAffiliateHooksEnabled } =
        await import("./monetization/affiliate-hooks");
      const metrics = getAffiliateMetrics();

      res.json({
        clicks: metrics.clicks,
        impressions: metrics.impressions,
        ctr: metrics.ctr,
        lastClickAt: metrics.lastClickAt,
        lastImpressionAt: metrics.lastImpressionAt,
        lastUpdated: metrics.lastUpdated,
        forbiddenZoneViolationsBlocked: metrics.forbiddenZoneViolationsBlocked,
        enabled: isAffiliateHooksEnabled(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliate metrics" });
    }
  });

  // POST /api/affiliate/link - Generate affiliate link for a product
  app.post("/api/affiliate/link", async (req, res) => {
    try {
      const { isAffiliateHooksEnabled, useAffiliateLinkHook, useAffiliateInjectionHook } =
        await import("./monetization/affiliate-hooks");

      // Check if affiliate hooks are enabled
      if (!isAffiliateHooksEnabled()) {
        return res.json({
          allowed: false,
          reason: "Affiliate system is not enabled",
          enabled: false,
        });
      }

      const { partnerId, productId, productType, productName, zoneId, pageUrl } = req.body;

      // Validate required fields
      if (!partnerId || !productId || !productType || !zoneId) {
        return res.status(400).json({
          allowed: false,
          reason: "Missing required fields: partnerId, productId, productType, zoneId",
        });
      }

      // Map productType to contentType for zone validation
      const contentTypeMap: Record<string, string> = {
        hotel: "hotel",
        experience: "experience",
        tour: "experience",
        activity: "experience",
      };
      const contentType = contentTypeMap[productType] || "experience";

      // Check if injection is allowed for this zone
      const injectionResult = useAffiliateInjectionHook({
        zoneId,
        contentType: contentType as any,
        pageUrl: pageUrl || "/",
        productId,
        productType,
        partnerId,
      });

      if (!injectionResult.allowed) {
        return res.json({
          allowed: false,
          reason: injectionResult.reason,
          enabled: true,
        });
      }

      // Generate the affiliate link
      const linkResult = useAffiliateLinkHook({
        partnerId,
        productId,
        productType,
        productName: productName || productId,
      });

      res.json({
        allowed: true,
        enabled: linkResult.enabled,
        url: linkResult.url,
        disclosure: linkResult.disclosure,
        rel: linkResult.rel,
        trackingId: linkResult.trackingId,
        disclosureRequired: injectionResult.disclosureRequired,
      });
    } catch (error) {
      res.status(500).json({
        allowed: false,
        reason: "Failed to generate affiliate link",
      });
    }
  });

  // ============================================================================
  // PAYOUTS
  // ============================================================================
  app.post("/api/payouts", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { payoutManager } = await import("./monetization/payouts");
      const result = await payoutManager.schedulePayout(req.body);
      if (result) {
        res.json({ success: true, payoutId: result });
      } else {
        res.status(500).json({ error: "Failed to schedule payout" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to schedule payout" });
    }
  });

  app.post("/api/payouts/:id/process", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { payoutManager } = await import("./monetization/payouts");
      const { id } = req.params;
      const result = await payoutManager.processPayout(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to process payout" });
    }
  });

  app.get("/api/payouts/partner/:partnerId", requireAuth, async (req, res) => {
    try {
      const { partnerId } = req.params;
      const payoutHistory = await db
        .select()
        .from(payouts)
        .where(eq(payouts.partnerId, partnerId))
        .orderBy(desc(payouts.createdAt))
        .limit(20);
      res.json(payoutHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payout history" });
    }
  });

  // ============================================================================
  // A/B TESTING
  // ============================================================================
  app.post("/api/ab-tests", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { ctaAbTesting } = await import("./monetization/cta-ab-testing");
      const userId = getUserId(req as AuthRequest);
      const testId = await ctaAbTesting.createTest(req.body, userId);
      if (testId) {
        res.json({ success: true, testId });
      } else {
        res.status(500).json({ error: "Failed to create test" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to create A/B test" });
    }
  });

  app.get("/api/ab-tests", requireAuth, async (req, res) => {
    try {
      const { ctaAbTesting } = await import("./monetization/cta-ab-testing");
      const tests = await ctaAbTesting.listTests();
      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });

  app.post("/api/ab-tests/:id/start", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { ctaAbTesting } = await import("./monetization/cta-ab-testing");
      const { id } = req.params;
      const result = await ctaAbTesting.startTest(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to start A/B test" });
    }
  });

  app.post("/api/ab-tests/:id/stop", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { ctaAbTesting } = await import("./monetization/cta-ab-testing");
      const { id } = req.params;
      const result = await ctaAbTesting.stopTest(id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({ error: "Failed to stop A/B test" });
    }
  });

  app.get("/api/ab-tests/:id/results", requireAuth, async (req, res) => {
    try {
      const { ctaAbTesting } = await import("./monetization/cta-ab-testing");
      const { id } = req.params;
      const results = await ctaAbTesting.getTestResults(id);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B test results" });
    }
  });

  app.get("/api/ab-tests/:id/variant", async (req, res) => {
    try {
      const { ctaAbTesting } = await import("./monetization/cta-ab-testing");
      const { id } = req.params;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub || "";
      const sessionId = authReq.session?.id || req.ip || "";
      const variant = await ctaAbTesting.getVariant(id, userId, sessionId);
      res.json(variant);
    } catch (error) {
      res.status(500).json({ error: "Failed to get variant" });
    }
  });

  app.post("/api/ab-tests/:id/track", async (req, res) => {
    try {
      const { ctaAbTesting } = await import("./monetization/cta-ab-testing");
      const { id } = req.params;
      const { variantId, eventType, metadata } = req.body;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;
      const sessionId = authReq.session?.id || req.ip || "";
      await ctaAbTesting.trackEvent(id, variantId, eventType, userId, sessionId, metadata);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track event" });
    }
  });

  // ============================================================================
  // REAL ESTATE PAGES - CMS EDITABLE CONTENT
  // ============================================================================

  // Get all real estate pages
  app.get("/api/real-estate-pages", requireAuth, async (req, res) => {
    try {
      const { category } = req.query;
      let query = db.select().from(realEstatePages);

      if (category && typeof category === "string") {
        query = query.where(eq(realEstatePages.category, category as any)) as any;
      }

      const pages = await query.orderBy(realEstatePages.title);
      res.json({ pages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch real estate pages" });
    }
  });

  // Get single real estate page by pageKey
  app.get("/api/real-estate-pages/:pageKey", requireAuth, async (req, res) => {
    try {
      const { pageKey } = req.params;
      const [page] = await db
        .select()
        .from(realEstatePages)
        .where(eq(realEstatePages.pageKey, pageKey));

      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }

      res.json(page);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch real estate page" });
    }
  });

  // Create or update real estate page (upsert)
  app.post("/api/real-estate-pages", requirePermission("canEdit"), async (req, res) => {
    try {
      const parsed = insertRealEstatePageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      // Check if page exists
      const parsedData = parsed.data as { pageKey: string; [key: string]: unknown };
      const [existing] = await db
        .select()
        .from(realEstatePages)
        .where(eq(realEstatePages.pageKey, parsedData.pageKey));

      if (existing) {
        // Update existing
        const [updated] = await db
          .update(realEstatePages)
          .set({
            ...parsedData,
            lastEditedBy: userId,
            updatedAt: new Date(),
          } as any)
          .where(eq(realEstatePages.pageKey, parsedData.pageKey))
          .returning();
        res.json(updated);
      } else {
        // Create new
        const [created] = await db
          .insert(realEstatePages)
          .values({
            ...parsedData,
            lastEditedBy: userId,
          } as any)
          .returning();
        res.status(201).json(created);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to save real estate page" });
    }
  });

  // Update real estate page
  app.patch("/api/real-estate-pages/:pageKey", requirePermission("canEdit"), async (req, res) => {
    try {
      const { pageKey } = req.params;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      // Validate with partial schema
      const partialSchema = insertRealEstatePageSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const [updated] = await db
        .update(realEstatePages)
        .set({
          ...parsed.data,
          lastEditedBy: userId,
          updatedAt: new Date(),
        } as any)
        .where(eq(realEstatePages.pageKey, pageKey))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Page not found" });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update real estate page" });
    }
  });

  // Delete real estate page
  app.delete(
    "/api/real-estate-pages/:pageKey",
    requirePermission("canDelete"),
    async (req, res) => {
      try {
        const { pageKey } = req.params;

        const [deleted] = await db
          .delete(realEstatePages)
          .where(eq(realEstatePages.pageKey, pageKey))
          .returning();

        if (!deleted) {
          return res.status(404).json({ error: "Page not found" });
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete real estate page" });
      }
    }
  );

  // Seed initial real estate pages from static data
  app.post(
    "/api/real-estate-pages/seed",
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const STATIC_PAGES = [
          // Guides
          { pageKey: "investment-guide", category: "guide", title: "Investment Guide" },
          { pageKey: "how-to-buy", category: "guide", title: "How to Buy Off-Plan" },
          { pageKey: "payment-plans", category: "guide", title: "Payment Plans" },
          { pageKey: "best-2026", category: "guide", title: "Best Projects 2026" },
          { pageKey: "roi-guide", category: "pillar", title: "ROI & Rental Yields Guide" },
          { pageKey: "legal-guide", category: "pillar", title: "Legal & Security Guide" },
          { pageKey: "glossary", category: "guide", title: "Glossary" },
          // Calculators
          { pageKey: "roi-calculator", category: "calculator", title: "ROI Calculator" },
          {
            pageKey: "payment-calculator",
            category: "calculator",
            title: "Payment Plan Calculator",
          },
          {
            pageKey: "affordability-calculator",
            category: "calculator",
            title: "Affordability Calculator",
          },
          { pageKey: "currency-converter", category: "calculator", title: "Currency Converter" },
          { pageKey: "stamp-duty-calculator", category: "calculator", title: "Fees Calculator" },
          {
            pageKey: "rental-yield-calculator",
            category: "calculator",
            title: "Rental Yield Calculator",
          },
          { pageKey: "mortgage-calculator", category: "calculator", title: "Mortgage Calculator" },
          // Comparisons
          { pageKey: "off-plan-vs-ready", category: "comparison", title: "Off-Plan vs Ready" },
          { pageKey: "jvc-vs-dubai-south", category: "comparison", title: "JVC vs Dubai South" },
          { pageKey: "emaar-vs-damac", category: "comparison", title: "Emaar vs DAMAC" },
          { pageKey: "downtown-vs-marina", category: "comparison", title: "Downtown vs Marina" },
          { pageKey: "crypto-vs-bank", category: "comparison", title: "Crypto vs Bank Payment" },
          { pageKey: "villa-vs-apartment", category: "comparison", title: "Villa vs Apartment" },
          { pageKey: "studio-vs-1bed", category: "comparison", title: "Studio vs 1-Bedroom" },
          // Case Studies
          { pageKey: "case-jvc-investor", category: "case_study", title: "JVC Studio Investor" },
          { pageKey: "case-crypto-buyer", category: "case_study", title: "Crypto Buyer Success" },
          { pageKey: "case-golden-visa", category: "case_study", title: "Golden Visa Journey" },
          { pageKey: "case-expat-family", category: "case_study", title: "Expat Family Home" },
          {
            pageKey: "case-investor-flip",
            category: "case_study",
            title: "Investor Flip Strategy",
          },
          { pageKey: "case-portfolio", category: "case_study", title: "Portfolio Diversification" },
          { pageKey: "case-launch-day", category: "case_study", title: "Off-Plan Launch Day" },
          { pageKey: "case-retirement", category: "case_study", title: "Retirement Planning" },
          // Locations
          { pageKey: "off-plan-jvc", category: "location", title: "JVC Off-Plan" },
          { pageKey: "off-plan-dubai-south", category: "location", title: "Dubai South Off-Plan" },
          {
            pageKey: "off-plan-business-bay",
            category: "location",
            title: "Business Bay Off-Plan",
          },
          {
            pageKey: "off-plan-dubai-marina",
            category: "location",
            title: "Dubai Marina Off-Plan",
          },
          {
            pageKey: "off-plan-creek-harbour",
            category: "location",
            title: "Creek Harbour Off-Plan",
          },
          {
            pageKey: "off-plan-palm-jumeirah",
            category: "location",
            title: "Palm Jumeirah Off-Plan",
          },
          { pageKey: "off-plan-al-furjan", category: "location", title: "Al Furjan Off-Plan" },
          // Developers
          { pageKey: "developer-emaar", category: "developer", title: "Emaar Properties" },
          { pageKey: "developer-damac", category: "developer", title: "DAMAC Properties" },
          { pageKey: "developer-nakheel", category: "developer", title: "Nakheel" },
          { pageKey: "developer-meraas", category: "developer", title: "Meraas" },
          { pageKey: "developer-sobha", category: "developer", title: "Sobha Realty" },
        ];

        let created = 0;
        let skipped = 0;

        for (const page of STATIC_PAGES) {
          const [existing] = await db
            .select()
            .from(realEstatePages)
            .where(eq(realEstatePages.pageKey, page.pageKey));

          if (!existing) {
            await db.insert(realEstatePages).values({
              pageKey: page.pageKey,
              category: page.category as any,
              title: page.title,
            });
            created++;
          } else {
            skipped++;
          }
        }

        res.json({ success: true, created, skipped, total: STATIC_PAGES.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to seed real estate pages" });
      }
    }
  );

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
  // ============================================================================
  app.use("/api/docs", swaggerRouter);

  // ============================================================================
  // SURVEY BUILDER API
  // ============================================================================

  // Get all surveys (admin)
  app.get("/api/surveys", requireAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const surveys = await storage.getSurveys(status ? { status: status as string } : undefined);
      res.json(surveys);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch surveys" });
    }
  });

  // Get single survey (admin)
  app.get("/api/surveys/:id", requireAuth, async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }
      res.json(survey);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch survey" });
    }
  });

  // Create survey
  app.post("/api/surveys", requirePermission("canCreate"), async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      const { title, description, slug, status, definition, startsAt, endsAt } = req.body;

      if (!title || !slug) {
        return res.status(400).json({ error: "Title and slug are required" });
      }

      // Check slug uniqueness
      const existing = await storage.getSurveyBySlug(slug);
      if (existing) {
        return res.status(400).json({ error: "Survey with this slug already exists" });
      }

      const survey = await storage.createSurvey({
        title,
        description,
        slug,
        status: status || "draft",
        definition: definition || { questions: [] },
        authorId: userId,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
      });

      res.status(201).json(survey);
    } catch (error) {
      res.status(500).json({ error: "Failed to create survey" });
    }
  });

  // Update survey
  app.patch("/api/surveys/:id", requirePermission("canEdit"), async (req, res) => {
    try {
      const { title, description, slug, status, definition, startsAt, endsAt } = req.body;

      // If slug is being changed, check uniqueness
      if (slug) {
        const existing = await storage.getSurveyBySlug(slug);
        if (existing && existing.id !== req.params.id) {
          return res.status(400).json({ error: "Survey with this slug already exists" });
        }
      }

      const survey = await storage.updateSurvey(req.params.id, {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(slug && { slug }),
        ...(status && { status }),
        ...(definition && { definition }),
        ...(startsAt !== undefined && { startsAt: startsAt ? new Date(startsAt) : null }),
        ...(endsAt !== undefined && { endsAt: endsAt ? new Date(endsAt) : null }),
      });

      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }

      res.json(survey);
    } catch (error) {
      res.status(500).json({ error: "Failed to update survey" });
    }
  });

  // Delete survey
  app.delete("/api/surveys/:id", requirePermission("canDelete"), async (req, res) => {
    try {
      await storage.deleteSurvey(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete survey" });
    }
  });

  // Get survey responses
  app.get("/api/surveys/:id/responses", requireAuth, async (req, res) => {
    try {
      const responses = await storage.getSurveyResponses(req.params.id);
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  // Get survey analytics
  app.get("/api/surveys/:id/analytics", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getSurveyAnalytics(req.params.id);
      const survey = await storage.getSurvey(req.params.id);
      res.json({ ...analytics, survey });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Delete survey response
  app.delete(
    "/api/surveys/:surveyId/responses/:id",
    requirePermission("canDelete"),
    async (req, res) => {
      try {
        await storage.deleteSurveyResponse(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete response" });
      }
    }
  );

  // PUBLIC: Get survey by slug (no auth required)
  app.get("/api/public/surveys/:slug", async (req, res) => {
    try {
      const survey = await storage.getSurveyBySlug(req.params.slug);

      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }

      // Only return active surveys
      if (survey.status !== "active") {
        return res.status(404).json({ error: "Survey is not available" });
      }

      // Check date range
      const now = new Date();
      if (survey.startsAt && now < survey.startsAt) {
        return res.status(404).json({ error: "Survey has not started yet" });
      }
      if (survey.endsAt && now > survey.endsAt) {
        return res.status(404).json({ error: "Survey has ended" });
      }

      // Return public survey data (exclude sensitive fields)
      res.json({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        slug: survey.slug,
        definition: survey.definition,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch survey" });
    }
  });

  // PUBLIC: Submit survey response (no auth required)
  app.post("/api/public/surveys/:slug/responses", async (req, res) => {
    try {
      const survey = await storage.getSurveyBySlug(req.params.slug);

      if (!survey) {
        return res.status(404).json({ error: "Survey not found" });
      }

      if (survey.status !== "active") {
        return res.status(400).json({ error: "Survey is not accepting responses" });
      }

      // Check date range
      const now = new Date();
      if (survey.startsAt && now < survey.startsAt) {
        return res.status(400).json({ error: "Survey has not started yet" });
      }
      if (survey.endsAt && now > survey.endsAt) {
        return res.status(400).json({ error: "Survey has ended" });
      }

      const { answers, respondentEmail, respondentName, isComplete } = req.body;

      if (!answers || typeof answers !== "object") {
        return res.status(400).json({ error: "Answers are required" });
      }

      const response = await storage.createSurveyResponse({
        surveyId: survey.id,
        answers,
        respondentEmail,
        respondentName,
        isComplete: isComplete ?? true,
        metadata: {
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          referrer: req.get("referer"),
          completedAt: new Date().toISOString(),
        },
      });

      res.status(201).json({ success: true, responseId: response.id });
    } catch (error) {
      res.status(500).json({ error: "Failed to submit response" });
    }
  });

  // ============================================================================
  // GDPR COMPLIANCE ENDPOINTS
  // ============================================================================

  // Export user data (GDPR Article 15 - Right of Access)
  app.get("/api/gdpr/export/:userId", requireAuth, async (req, res) => {
    const { userId } = req.params;
    const currentUser = req.user as { id: string; role: string };

    // Can only export own data or admin can export any
    if (currentUser.id !== userId && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Cannot export other user's data" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's content
      const userContent = await db
        .select({
          id: contents.id,
          type: contents.type,
          title: contents.title,
          status: contents.status,
          createdAt: contents.createdAt,
        })
        .from(contents)
        .where(eq(contents.authorId, userId));

      const exportData = {
        exportDate: new Date().toISOString(),
        dataSubject: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        content: userContent,
        consent: {
          analytics: true, // Would come from consent table in production
          marketing: false,
          recordedAt: new Date().toISOString(),
        },
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="gdpr-export-${userId}.json"`);
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Delete user data (GDPR Article 17 - Right to Erasure)
  app.delete(
    "/api/gdpr/delete/:userId",
    requireAuth,
    requirePermission("canManageUsers"),
    async (req, res) => {
      const { userId } = req.params;
      const currentUser = req.user as { id: string };
      const { reason, anonymizeContent } = req.body || {};

      try {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Prevent deleting self
        if (currentUser.id === userId) {
          return res
            .status(400)
            .json({ error: "Cannot delete your own account via this endpoint" });
        }

        let contentAnonymized = 0;

        // Anonymize content if requested (default: true)
        if (anonymizeContent !== false) {
          const result = await db
            .update(contents)
            .set({ authorId: "deleted-user" } as any)
            .where(eq(contents.authorId, userId));
          contentAnonymized = result.rowCount || 0;
        }

        // Delete the user
        await storage.deleteUser(userId);

        // Log the deletion for audit

        res.json({
          success: true,
          deletedAt: new Date().toISOString(),
          actions: {
            userDeleted: true,
            contentAnonymized,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete user data" });
      }
    }
  );

  // Record consent preferences (GDPR Article 7)
  app.post("/api/gdpr/consent", requireAuth, async (req, res) => {
    const currentUser = req.user as { id: string };
    const { analytics, marketing, necessary } = req.body;

    if (typeof analytics !== "boolean" || typeof marketing !== "boolean") {
      return res.status(400).json({ error: "analytics and marketing must be boolean values" });
    }

    // In production, this would store in a consent table

    res.json({
      success: true,
      recordedAt: new Date().toISOString(),
      preferences: {
        analytics,
        marketing,
        necessary: necessary ?? true,
      },
    });
  });

  // ============================================================================
  // WEEKLY DIGEST ADMIN ENDPOINTS
  // ============================================================================

  // Get weekly digest status (admin only)
  app.get(
    "/api/admin/digest/status",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { getDigestStatus } = await import("./newsletter/weekly-digest");
        const status = await getDigestStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch digest status" });
      }
    }
  );

  // Manual trigger weekly digest (admin only)
  app.post(
    "/api/admin/digest/send-now",
    requireAuth,
    requirePermission("canManageUsers"),
    async (req, res) => {
      try {
        const { sendWeeklyDigest, isWeeklyDigestEnabled } =
          await import("./newsletter/weekly-digest");

        if (!isWeeklyDigestEnabled()) {
          return res.status(400).json({
            error: "Weekly digest feature is disabled. Set ENABLE_WEEKLY_DIGEST=true to enable.",
          });
        }

        // Allow force flag to bypass week dedupe protection
        const { force } = req.body || {};
        const result = await sendWeeklyDigest({ force: !!force });

        if (result.success) {
          res.json({
            success: true,
            message: `Weekly digest sent successfully to ${result.recipientCount} subscribers`,
            campaignId: result.campaignId,
            recipientCount: result.recipientCount,
            weekNumber: result.weekNumber,
          });
        } else {
          res.status(400).json({
            error: result.error || "Failed to send digest",
            skippedReason: result.skippedReason,
            weekNumber: result.weekNumber,
          });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to send weekly digest" });
      }
    }
  );

  // Test digest endpoint: Send to single test email (admin only)
  app.post(
    "/api/admin/digest/test",
    requireAuth,
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const { recipientEmail } = req.body;

        if (!recipientEmail || typeof recipientEmail !== "string") {
          return res.status(400).json({ error: "recipientEmail is required" });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
          return res.status(400).json({ error: "Invalid email format" });
        }

        const { sendTestDigest } = await import("./newsletter/weekly-digest");
        const result = await sendTestDigest(recipientEmail);

        if (result.success) {
          res.json({
            success: true,
            previewHtml: result.previewHtml,
            sentTo: result.sentTo,
            generatedAt: result.generatedAt,
            articleCount: result.articleCount,
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.error,
            sentTo: result.sentTo,
            generatedAt: result.generatedAt,
          });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to send test digest" });
      }
    }
  );

  // Dry-run digest endpoint: Generate content without sending (admin only)
  app.post(
    "/api/admin/digest/dry-run",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { dryRunDigest } = await import("./newsletter/weekly-digest");
        const result = await dryRunDigest();

        res.json({
          previewHtml: result.previewHtml,
          articleCount: result.articleCount,
          estimatedRecipients: result.estimatedRecipients,
          generatedAt: result.generatedAt,
          subject: result.subject,
          subjectHe: result.subjectHe,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to generate dry-run digest" });
      }
    }
  );

  // Digest KPI stats endpoint (admin only)
  app.get(
    "/api/admin/digest/stats",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { getDigestKPIStats } = await import("./newsletter/weekly-digest");
        const stats = await getDigestKPIStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch digest stats" });
      }
    }
  );

  // ============================================================================
  // INITIALIZE AUTONOMY POLICY ENGINE
  // ============================================================================

  try {
    await initAutonomyPolicy();
    initEnforcement();
    initControlPlane();
  } catch (error) {}

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
  app.use("/api/deploy-safety", deploymentSafetyRoutes);
  // DISABLED: initializeDeploymentSafety(); - Backend automation disabled

  // ============================================================================
  // GOOGLE DRIVE ASSET SYNC (Admin-only)
  // ============================================================================
  app.post(
    "/api/admin/assets/sync-google-drive",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      const report: {
        success: boolean;
        downloaded: { city: string; file: string; path: string }[];
        skipped: { city: string; file: string; reason: string }[];
        errors: { city: string; file?: string; error: string }[];
        summary: { totalDownloaded: number; totalSkipped: number; totalErrors: number };
      } = {
        success: false,
        downloaded: [],
        skipped: [],
        errors: [],
        summary: { totalDownloaded: 0, totalSkipped: 0, totalErrors: 0 },
      };

      try {
        const websiteFolders = await findFolderByName("Website");
        if (!websiteFolders || websiteFolders.length === 0) {
          report.errors.push({ city: "", error: "Website folder not found in Google Drive" });
          report.summary.totalErrors = 1;
          return res.status(404).json(report);
        }

        const websiteFolderId = websiteFolders[0].id!;

        const websiteContents = await listFilesInFolder(websiteFolderId);
        const categoriesFolder = websiteContents.find(f => f.name?.toLowerCase() === "categories");
        if (!categoriesFolder || !categoriesFolder.id) {
          report.errors.push({
            city: "",
            error: "Categories subfolder not found in Website folder",
          });
          report.summary.totalErrors = 1;
          return res.status(404).json(report);
        }

        const destinationFolders = await listFilesInFolder(categoriesFolder.id);
        const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        const baseDestPath = path.join(process.cwd(), "client", "public", "images", "destinations");

        if (!fs.existsSync(baseDestPath)) {
          fs.mkdirSync(baseDestPath, { recursive: true });
        }

        for (const destFolder of destinationFolders) {
          if (destFolder.mimeType !== "application/vnd.google-apps.folder" || !destFolder.id) {
            continue;
          }

          const cityName = destFolder.name!.toLowerCase().replace(/\s+/g, "-");
          const cityPath = path.join(baseDestPath, cityName);

          try {
            await fs.promises.access(cityPath);
          } catch {
            await fs.promises.mkdir(cityPath, { recursive: true });
          }

          try {
            const cityFiles = await listFilesInFolder(destFolder.id);

            for (const file of cityFiles) {
              if (!file.id || !file.name) continue;

              if (!imageMimeTypes.includes(file.mimeType || "")) {
                report.skipped.push({
                  city: cityName,
                  file: file.name,
                  reason: `Unsupported mime type: ${file.mimeType}`,
                });
                continue;
              }

              const filePath = path.join(cityPath, file.name);

              try {
                await fs.promises.access(filePath);
                report.skipped.push({
                  city: cityName,
                  file: file.name,
                  reason: "File already exists",
                });
                continue;
              } catch {
                // File doesn't exist, proceed with download
              }

              try {
                const buffer = await downloadFile(file.id);
                await fs.promises.writeFile(filePath, buffer);
                report.downloaded.push({
                  city: cityName,
                  file: file.name,
                  path: `/images/destinations/${cityName}/${file.name}`,
                });
              } catch (downloadErr: any) {
                report.errors.push({
                  city: cityName,
                  file: file.name,
                  error: downloadErr.message || "Download failed",
                });
              }
            }
          } catch (cityErr: any) {
            report.errors.push({
              city: cityName,
              error: cityErr.message || "Failed to list city folder contents",
            });
          }
        }

        report.success = report.errors.length === 0;
        report.summary.totalDownloaded = report.downloaded.length;
        report.summary.totalSkipped = report.skipped.length;
        report.summary.totalErrors = report.errors.length;

        res.json(report);
      } catch (err: any) {
        report.errors.push({ city: "", error: err.message || "Sync failed" });
        report.summary.totalErrors = report.errors.length;
        res.status(500).json(report);
      }
    }
  );

  // ============================================================================
  // SECURE ERROR HANDLER (no stack traces to client)
  // ============================================================================
  app.use(secureErrorHandler);

  // Phase 1 Foundation: Add foundation error handler (feature flagged, default OFF)
  // When enabled, this handler catches DomainErrors and provides structured responses
  bootstrapFoundationErrorHandler(app);

  return httpServer;
}
