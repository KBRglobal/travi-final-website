/**
 * Content Intelligence Routes
 * Endpoints for analyzing content quality, gaps, watchlist, events, clusters, and internal links
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { requireAuth, type AuthRequest } from "../security";

export function registerIntelligenceRoutes(app: Express): void {
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
}
