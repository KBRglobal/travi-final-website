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
}
