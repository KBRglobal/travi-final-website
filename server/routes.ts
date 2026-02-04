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
import { logAuditEvent } from "./utils/audit-logger";
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
import { registerFeatureRoutes } from "./feature-routes";
import { enterprise } from "./enterprise";
import { registerImageRoutes } from "./routes/image-routes";
import { registerLogRoutes } from "./routes/log-routes";
import { registerMiscRoutes } from "./routes/misc-routes";
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
import { registerAdminJobsRoutes } from "./routes/admin-jobs-routes";

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
import { vamsRoutes } from "./vams";
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

// Email client helper
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
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

  // Admin audit logs routes moved to routes/admin-audit-routes.ts

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
  // VAMS (Visual Asset Management System - Stock Images + AI Generation)
  // ============================================================================
  app.use("/api/vams", requireAuth, requirePermission("canEdit"), vamsRoutes);

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
  // ============================================================================
  app.use("/api/docs", swaggerRouter);

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
