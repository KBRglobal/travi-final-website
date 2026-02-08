/**
 * Admin Job Management Routes
 *
 * Routes for managing job queue operations, blocked IPs, performance metrics,
 * and content migration.
 *
 * Routes:
 * - GET /api/admin/blocked-ips - Get blocked IP addresses
 * - GET /api/admin/performance - Get performance metrics
 * - GET /api/admin/jobs/stats - Get job queue statistics
 * - GET /api/admin/jobs - Get jobs by status
 * - GET /api/admin/jobs/:id - Get single job
 * - DELETE /api/admin/jobs/:id - Cancel a pending job
 * - POST /api/admin/jobs/:id/retry - Retry a failed job
 * - POST /api/admin/migrate-blocks - Migrate content to blocks format
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requirePermission, getBlockedIps } from "../security";
import { getPerformanceMetrics } from "../monitoring";
import { jobQueue } from "../job-queue";

/** Helper: Create a block with auto-incrementing order */
function makeBlock(type: string, data: any, orderRef: { value: number }): any {
  return {
    id: `${type}-${Date.now()}-${orderRef.value}`,
    type,
    data,
    order: orderRef.value++,
  };
}

/** Check if an array field is non-empty */
function isNonEmptyArray(val: unknown): val is any[] {
  return Array.isArray(val) && val.length > 0;
}

/** Extract blocks from attraction data */
function extractAttractionBlocks(attr: any, orderRef: { value: number }): any[] {
  const blocks: any[] = [];
  if (attr.introText) blocks.push(makeBlock("text", { content: attr.introText }, orderRef));
  if (attr.expandedIntroText && attr.expandedIntroText !== attr.introText) {
    blocks.push(makeBlock("text", { content: attr.expandedIntroText }, orderRef));
  }
  if (isNonEmptyArray(attr.highlights))
    blocks.push(makeBlock("highlights", { items: attr.highlights }, orderRef));
  if (isNonEmptyArray(attr.visitorTips))
    blocks.push(makeBlock("tips", { items: attr.visitorTips }, orderRef));
  if (isNonEmptyArray(attr.faq)) {
    for (const faqItem of attr.faq) {
      blocks.push(
        makeBlock("faq", { question: faqItem.question, answer: faqItem.answer }, orderRef)
      );
    }
  }
  if (isNonEmptyArray(attr.gallery))
    blocks.push(makeBlock("gallery", { images: attr.gallery }, orderRef));
  return blocks;
}

/** Extract blocks from hotel data */
function extractHotelBlocks(hotel: any, orderRef: { value: number }): any[] {
  const blocks: any[] = [];
  if (hotel.description) blocks.push(makeBlock("text", { content: hotel.description }, orderRef));
  if (isNonEmptyArray(hotel.highlights))
    blocks.push(makeBlock("highlights", { items: hotel.highlights }, orderRef));
  if (isNonEmptyArray(hotel.faq)) {
    for (const faqItem of hotel.faq) {
      blocks.push(
        makeBlock("faq", { question: faqItem.question, answer: faqItem.answer }, orderRef)
      );
    }
  }
  return blocks;
}

/** Build migration blocks for a content item */
function buildMigrationBlocks(content: any): any[] {
  const blocks: any[] = [];
  const orderRef = { value: 0 };

  if (content.heroImage) {
    blocks.push(
      makeBlock(
        "hero",
        {
          image: content.heroImage,
          alt: content.heroImageAlt || content.title,
          title: content.title,
        },
        orderRef
      )
    );
  }

  const contentWithData = content as any;
  if (content.type === "attraction" && contentWithData.attractionData) {
    blocks.push(...extractAttractionBlocks(contentWithData.attractionData, orderRef));
  } else if (content.type === "hotel" && contentWithData.hotelData) {
    blocks.push(...extractHotelBlocks(contentWithData.hotelData, orderRef));
  } else if (content.type === "article" && contentWithData.articleData?.body) {
    blocks.push(makeBlock("text", { content: contentWithData.articleData.body }, orderRef));
  }

  return blocks;
}

export function registerAdminJobsRoutes(app: Express): void {
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
        if (content.blocks && Array.isArray(content.blocks) && content.blocks.length > 0) {
          continue;
        }

        const blocks = buildMigrationBlocks(content);
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
}
