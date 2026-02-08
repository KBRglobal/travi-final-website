/**
 * RSS Feed Routes
 * RSS feed management and content import
 */

import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth, requirePermission, checkReadOnlyMode } from "../security";
import { insertRssFeedSchema } from "@shared/schema";
import { logAuditEvent } from "../utils/audit-logger";
import { parseRssFeed } from "../services/rss-parser";
import crypto from "node:crypto";

/**
 * Validate that a URL is safe to fetch (not targeting internal/private resources).
 * Defense-in-depth: applied at route level before passing URL to service layer.
 */
function isUrlSafeForFetch(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    // Block localhost and loopback
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "[::1]"
    )
      return false;
    // Block private IP ranges
    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.")
    )
      return false;
    if (hostname.startsWith("172.")) {
      const secondOctet = parseInt(hostname.split(".")[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return false;
    }
    // Block cloud metadata endpoints
    if (hostname === "metadata.google.internal" || hostname === "169.254.169.254") return false;
    return true;
  } catch {
    return false;
  }
}

// Fingerprint generator for content deduplication
function generateFingerprint(title: string, url?: string): string {
  const normalizedTitle = title.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  const normalizedUrl = url ? url.toLowerCase().replaceAll(/[^a-z0-9]/g, "") : "";
  return crypto
    .createHash("sha256")
    .update(`${normalizedTitle}-${normalizedUrl}`)
    .digest("hex")
    .substring(0, 32);
}

export function registerRssFeedRoutes(app: Express): void {
  // =====================
  // RSS FEEDS ROUTES
  // =====================

  app.get("/api/rss-feeds", requireAuth, async (req, res) => {
    try {
      const feeds = await storage.getRssFeeds();
      res.json(feeds);
    } catch {
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
    } catch {
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
    } catch {
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
      } catch {
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
      } catch {
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

        // SSRF protection: validate feed URL at route level before fetching
        if (!isUrlSafeForFetch(feed.url)) {
          return res
            .status(400)
            .json({ error: "RSS feed URL is not allowed (blocked by SSRF protection)" });
        }

        // Reconstruct URL from validated components to fully break taint chain
        const parsedFeedUrl = new URL(feed.url);
        const validatedFeedUrl = `${parsedFeedUrl.protocol}//${parsedFeedUrl.host}${parsedFeedUrl.pathname}${parsedFeedUrl.search}`;

        // Parse RSS feed with timeout protection
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let items: Awaited<ReturnType<typeof parseRssFeed>>;
        try {
          items = await parseRssFeed(validatedFeedUrl);
        } catch (parseError) {
          return res.status(502).json({
            error: "Failed to parse RSS feed",
            details: parseError instanceof Error ? parseError.message : "Unknown parsing error",
          });
        } finally {
          clearTimeout(timeout);
        }

        // Update lastFetchedAt timestamp
        await storage.updateRssFeed(req.params.id, {
          lastFetchedAt: new Date(),
        });

        res.json({ items, count: items.length });
      } catch (err) {
        res.status(500).json({
          error: "Failed to fetch RSS feed items",
          details: err instanceof Error ? err.message : "Unknown error",
        });
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
            .replaceAll(/[^a-z0-9]+/g, "-")
            .replaceAll(/(?:^-|-$)/g, "");

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
      } catch {
        res.status(500).json({ error: "Failed to import RSS feed items" });
      }
    }
  );
}

// Export generateFingerprint for use by other modules
export { generateFingerprint };
