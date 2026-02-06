/**
 * Content CRUD Routes
 *
 * Handles all content CRUD operations:
 * - GET /api/contents (list contents with filters)
 * - GET /api/contents/attention (content needing attention for dashboard)
 * - GET /api/contents/:id (get content by ID)
 * - GET /api/contents/slug/:slug (get content by slug)
 * - GET /api/contents/:id/schema (generate JSON-LD schema)
 * - POST /api/contents (create content)
 * - PATCH /api/contents/:id (update content)
 * - DELETE /api/contents/:id (delete content)
 * - GET /api/contents/:id/versions (get version history)
 * - GET /api/contents/:id/versions/:versionId (get specific version)
 * - POST /api/contents/:id/versions/:versionId/restore (restore version)
 * - GET /api/contents/:id/translations (get translations)
 * - POST /api/contents/:id/translations (create translation)
 * - GET /api/contents/:id/translation-status (get translation status)
 * - POST /api/contents/:id/translate-all (auto-translate to all languages)
 * - POST /api/contents/:id/cancel-translation (cancel pending translations)
 *
 * Note: /api/public/* routes are handled separately in public-content-routes.ts
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  requireAuth,
  requirePermission,
  requireOwnContentOrPermission,
  checkReadOnlyMode,
  rateLimiters,
} from "../security";
import { checkOptimisticLock } from "../middleware/optimistic-locking";
import { requireOwnershipOrPermission } from "../middleware/idor-protection";
import { logAuditEvent } from "../utils/audit-logger";
import { sanitizeContentBlocks } from "../lib/sanitize-ai-output";
import { emitContentPublished, emitContentUpdated } from "../events";
import { enterprise } from "../enterprise";
import { guardManualPublish, isPublishGuardsEnabled } from "../publishing";
import {
  insertContentSchema,
  insertTranslationSchema,
  insertItinerarySchema,
  ROLE_PERMISSIONS,
  SUPPORTED_LOCALES,
  type ContentBlock,
  type InsertContent,
  contents,
} from "@shared/schema";
import { parsePagination, createPaginatedResponse } from "../lib/pagination";
import { db } from "../db";
import { eq, and, ilike, desc, sql, isNull } from "drizzle-orm";

/**
 * Register all content CRUD routes
 */
export function registerContentCrudRoutes(app: Express): void {
  // ============================================================================
  // READ ROUTES
  // ============================================================================

  /**
   * GET /api/contents
   * List contents with optional filters (type, status, search).
   * Supports pagination via ?page=1&pageSize=20 or legacy ?offset=0&limit=20.
   * When page/offset params are present, returns { data, pagination } envelope.
   * Without pagination params, returns a plain array for backward compatibility.
   */
  app.get("/api/contents", requireAuth, async (req: Request, res: Response) => {
    try {
      const { type, status, search } = req.query;
      const wantsPagination =
        req.query.page !== undefined ||
        req.query.offset !== undefined ||
        req.query.limit !== undefined;

      if (wantsPagination) {
        const pg = parsePagination(req);
        const filters = {
          type: type as string | undefined,
          status: status as string | undefined,
          search: search as string | undefined,
          limit: pg.pageSize,
          offset: pg.offset,
        };

        const data = await storage.getContentsWithRelations(filters);

        // Build count query with same filters
        const conditions: any[] = [isNull(contents.deletedAt)];
        if (type) conditions.push(eq(contents.type, type as any));
        if (status) conditions.push(eq(contents.status, status as any));
        if (search) conditions.push(ilike(contents.title, `%${search}%`));

        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(contents)
          .where(and(...conditions));
        const total = Number(countRow?.count || 0);

        res.json(createPaginatedResponse(data, total, pg));
      } else {
        // Legacy: return plain array for existing clients
        const filters = {
          type: type as string | undefined,
          status: status as string | undefined,
          search: search as string | undefined,
        };
        const data = await storage.getContentsWithRelations(filters);
        res.json(data);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contents" });
    }
  });

  /**
   * GET /api/contents/attention
   * Content needing attention for dashboard - requires authentication
   */
  app.get("/api/contents/attention", requireAuth, async (req: Request, res: Response) => {
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

  /**
   * GET /api/contents/:id
   * Admin/CMS content by ID - requires authentication
   */
  app.get("/api/contents/:id", requireAuth, async (req: Request, res: Response) => {
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

  /**
   * GET /api/contents/slug/:slug
   * Content by slug - requires authentication for unpublished, public for published
   */
  app.get("/api/contents/slug/:slug", async (req: Request, res: Response) => {
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

  /**
   * GET /api/contents/:id/schema
   * Generate JSON-LD schema for content
   */
  app.get("/api/contents/:id/schema", async (req: Request, res: Response) => {
    try {
      const content = await storage.getContent(req.params.id);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }

      const { generateAllSchemas, schemasToJsonLd } = await import("../lib/schema-generator");

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

  // ============================================================================
  // CREATE ROUTES
  // ============================================================================

  /**
   * POST /api/contents
   * Content creation - requires authentication and permission
   */
  app.post(
    "/api/contents",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    rateLimiters.contentWrite,
    async (req: Request, res: Response) => {
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

  // ============================================================================
  // UPDATE ROUTES
  // ============================================================================

  /**
   * PATCH /api/contents/:id
   * Content update - requires authentication and permission (Author/Contributor can edit own content)
   * Uses optimistic locking via If-Match header to prevent concurrent edit conflicts
   */
  app.patch(
    "/api/contents/:id",
    requireOwnContentOrPermission("canEdit"),
    checkOptimisticLock(),
    checkReadOnlyMode,
    rateLimiters.contentWrite,
    async (req: Request, res: Response) => {
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

  // ============================================================================
  // DELETE ROUTES
  // ============================================================================

  /**
   * DELETE /api/contents/:id
   * Content deletion - requires ownership OR canDelete permission (admin)
   * IDOR Protection: Authors can delete their own content, admins can delete any content
   */
  app.delete(
    "/api/contents/:id",
    requireOwnershipOrPermission("canDelete"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
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

  // ============================================================================
  // VERSION HISTORY ROUTES
  // ============================================================================

  /**
   * GET /api/contents/:id/versions
   * Get version history for content
   */
  app.get("/api/contents/:id/versions", async (req: Request, res: Response) => {
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

  /**
   * GET /api/contents/:id/versions/:versionId
   * Get a specific version of content
   */
  app.get("/api/contents/:id/versions/:versionId", async (req: Request, res: Response) => {
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

  /**
   * POST /api/contents/:id/versions/:versionId/restore
   * Restore content to a specific version
   */
  app.post(
    "/api/contents/:id/versions/:versionId/restore",
    requireAuth,
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
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

  // ============================================================================
  // TRANSLATION ROUTES
  // ============================================================================

  /**
   * GET /api/contents/:id/translations
   * Get all translations for a content item
   */
  app.get("/api/contents/:id/translations", async (req: Request, res: Response) => {
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

  /**
   * POST /api/contents/:id/translations
   * Create a new translation for content
   */
  app.post(
    "/api/contents/:id/translations",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
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

  /**
   * GET /api/contents/:id/translation-status
   * Get translation status for content
   */
  app.get("/api/contents/:id/translation-status", async (req: Request, res: Response) => {
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

  /**
   * POST /api/contents/:id/translate-all
   * Auto-translate content to all languages
   * IMPORTANT: Only translates PUBLISHED content to save translation costs
   */
  app.post(
    "/api/contents/:id/translate-all",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
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
        const { translateToAllLanguages } = await import("../services/translation-service");

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
              } catch (err) {
                console.error(err);
              }
            }
          })
          .catch(console.error);

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

  /**
   * POST /api/contents/:id/cancel-translation
   * Cancel in-progress translations for content
   */
  app.post(
    "/api/contents/:id/cancel-translation",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
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
}
