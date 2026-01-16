/**
 * Link Management API Routes
 * 
 * Endpoints for managing internal links:
 * - GET /api/links/health - Overall link health metrics
 * - GET /api/links/orphans - Pages with no inbound links
 * - GET /api/links/:contentId/stats - Link stats for a specific content
 * - POST /api/links/process/:contentId - Process links for a content
 * - POST /api/links/batch-process - Batch process multiple contents
 * - GET /api/links/opportunities/:contentId - Get link opportunities
 */

import { Router, Request, Response } from "express";
import { 
  processContentLinks, 
  getContentLinkStats, 
  batchProcessLinks,
  findOrphanPages,
  getLinkHealthMetrics,
  type ContentForLinking 
} from "../octypo/post-processors/link-processor";
import { getLinkOpportunities } from "../link-opportunities";
import { db } from "../db";
import { internalLinks, contents } from "@shared/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { createLogger } from "../lib/logger";

const logger = createLogger("link-management-routes");

export function registerLinkManagementRoutes(app: Router) {
  const router = Router();

  router.get("/health", async (_req: Request, res: Response) => {
    try {
      const metrics = await getLinkHealthMetrics();
      res.json({
        success: true,
        data: metrics,
        _meta: { apiVersion: "v1" },
      });
    } catch (error) {
      logger.error("Failed to get link health metrics", { error });
      res.status(500).json({ success: false, error: "Failed to get link health metrics" });
    }
  });

  router.get("/orphans", async (_req: Request, res: Response) => {
    try {
      const orphans = await findOrphanPages();
      res.json({
        success: true,
        data: {
          count: orphans.length,
          pages: orphans,
        },
        _meta: { apiVersion: "v1" },
      });
    } catch (error) {
      logger.error("Failed to find orphan pages", { error });
      res.status(500).json({ success: false, error: "Failed to find orphan pages" });
    }
  });

  router.get("/:contentId/stats", async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const stats = await getContentLinkStats(contentId);
      res.json({
        success: true,
        data: stats,
        _meta: { apiVersion: "v1" },
      });
    } catch (error) {
      logger.error("Failed to get content link stats", { error });
      res.status(500).json({ success: false, error: "Failed to get content link stats" });
    }
  });

  router.get("/opportunities/:contentId", async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const opportunities = await getLinkOpportunities(contentId, limit);
      res.json({
        success: true,
        data: opportunities,
        _meta: { apiVersion: "v1" },
      });
    } catch (error) {
      logger.error("Failed to get link opportunities", { error });
      res.status(500).json({ success: false, error: "Failed to get link opportunities" });
    }
  });

  router.post("/process/:contentId", async (req: Request, res: Response) => {
    try {
      const { contentId } = req.params;
      
      const content = await db
        .select({
          id: contents.id,
          type: contents.type,
          title: contents.title,
          contentBlocks: contents.contentBlocks,
        })
        .from(contents)
        .where(eq(contents.id, contentId))
        .limit(1);
      
      if (content.length === 0) {
        return res.status(404).json({ success: false, error: "Content not found" });
      }
      
      const record = content[0];
      const blocks = (record.contentBlocks as any) || {};
      
      const contentForLinking: ContentForLinking = {
        id: record.id,
        type: record.type as any,
        sections: {
          introduction: blocks.introduction || blocks.intro,
          whatToExpect: blocks.whatToExpect || blocks.body,
          visitorTips: blocks.visitorTips || blocks.tips,
          howToGetThere: blocks.howToGetThere || blocks.directions,
        },
      };
      
      const result = await processContentLinks(contentForLinking);
      
      res.json({
        success: true,
        data: result,
        _meta: { apiVersion: "v1" },
      });
    } catch (error) {
      logger.error("Failed to process content links", { error });
      res.status(500).json({ success: false, error: "Failed to process content links" });
    }
  });

  router.post("/batch-process", async (req: Request, res: Response) => {
    try {
      const { contentIds, concurrency = 5 } = req.body;
      
      if (!Array.isArray(contentIds) || contentIds.length === 0) {
        return res.status(400).json({ success: false, error: "contentIds must be a non-empty array" });
      }
      
      if (contentIds.length > 100) {
        return res.status(400).json({ success: false, error: "Maximum 100 contents per batch" });
      }
      
      const results = await batchProcessLinks(contentIds, Math.min(concurrency, 10));
      
      const summary = {
        total: contentIds.length,
        processed: results.size,
        totalLinksAdded: 0,
        successful: 0,
        failed: 0,
      };
      
      results.forEach((result) => {
        if (result.success) {
          summary.successful++;
          summary.totalLinksAdded += result.linksAdded;
        } else {
          summary.failed++;
        }
      });
      
      res.json({
        success: true,
        data: {
          summary,
          results: Object.fromEntries(results),
        },
        _meta: { apiVersion: "v1" },
      });
    } catch (error) {
      logger.error("Failed to batch process links", { error });
      res.status(500).json({ success: false, error: "Failed to batch process links" });
    }
  });

  router.get("/recent", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      
      const recentLinks = await db
        .select({
          id: internalLinks.id,
          sourceContentId: internalLinks.sourceContentId,
          targetContentId: internalLinks.targetContentId,
          anchorText: internalLinks.anchorText,
          isAutoSuggested: internalLinks.isAutoSuggested,
          createdAt: internalLinks.createdAt,
        })
        .from(internalLinks)
        .orderBy(desc(internalLinks.createdAt))
        .limit(limit);
      
      res.json({
        success: true,
        data: recentLinks,
        _meta: { apiVersion: "v1" },
      });
    } catch (error) {
      logger.error("Failed to get recent links", { error });
      res.status(500).json({ success: false, error: "Failed to get recent links" });
    }
  });

  router.get("/top-linked", async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      
      const topLinked = await db
        .select({
          targetContentId: internalLinks.targetContentId,
          inboundCount: sql<number>`count(*)::int`,
        })
        .from(internalLinks)
        .groupBy(internalLinks.targetContentId)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);
      
      const enriched = await Promise.all(
        topLinked.map(async (item) => {
          const content = await db
            .select({ title: contents.title, type: contents.type, slug: contents.slug })
            .from(contents)
            .where(eq(contents.id, item.targetContentId!))
            .limit(1);
          
          return {
            contentId: item.targetContentId,
            inboundCount: item.inboundCount,
            title: content[0]?.title || "Unknown",
            type: content[0]?.type || "unknown",
            slug: content[0]?.slug || "",
          };
        })
      );
      
      res.json({
        success: true,
        data: enriched,
        _meta: { apiVersion: "v1" },
      });
    } catch (error) {
      logger.error("Failed to get top linked pages", { error });
      res.status(500).json({ success: false, error: "Failed to get top linked pages" });
    }
  });

  app.use("/api/links", router);
  logger.info("[LinkManagement] Routes registered at /api/links/*");
}
