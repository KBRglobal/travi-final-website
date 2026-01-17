/**
 * Social Media Marketing Routes
 * LinkedIn scheduling, campaign management, and analytics (inspired by ALwrity)
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { 
  socialCampaigns, 
  socialPosts, 
  socialAnalytics, 
  socialCredentials,
  insertSocialCampaignSchema,
  insertSocialPostSchema,
  insertSocialAnalyticsSchema,
  type SocialPost,
  type SocialCampaign
} from "@shared/schema";
import { requireAuth, requirePermission } from "./security";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

export function registerSocialRoutes(app: Express) {

  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  // List all campaigns
  app.get("/api/social/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const campaigns = await db.select().from(socialCampaigns).orderBy(desc(socialCampaigns.createdAt));
      res.json(campaigns);
    } catch (error) {
      console.error("[Social] Error listing campaigns:", error);
      res.status(500).json({ error: "Failed to list campaigns" });
    }
  });

  // Create campaign
  app.post("/api/social/campaigns", requirePermission("canEdit"), async (req: Request, res: Response) => {
    try {
      const parsed = insertSocialCampaignSchema.parse(req.body);
      const [campaign] = await db.insert(socialCampaigns).values(parsed as any).returning();
      res.json(campaign);
    } catch (error) {
      console.error("[Social] Error creating campaign:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  // Get single campaign
  app.get("/api/social/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const [campaign] = await db.select().from(socialCampaigns).where(eq(socialCampaigns.id, req.params.id));
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("[Social] Error getting campaign:", error);
      res.status(500).json({ error: "Failed to get campaign" });
    }
  });

  // Update campaign
  app.patch("/api/social/campaigns/:id", requirePermission("canEdit"), async (req: Request, res: Response) => {
    try {
      const updateSchema = z.object({
        name: z.string().optional(),
        description: z.string().nullable().optional(),
        startDate: z.string().transform(d => new Date(d)).optional(),
        endDate: z.string().transform(d => new Date(d)).optional(),
        status: z.enum(["active", "paused", "completed"]).optional(),
        targetPlatforms: z.array(z.string()).optional(),
        goals: z.object({
          impressions: z.number().optional(),
          clicks: z.number().optional(),
          engagement: z.number().optional(),
        }).optional(),
      });
      const parsed = updateSchema.parse(req.body);
      const [campaign] = await db.update(socialCampaigns)
        .set({ ...parsed, updatedAt: new Date() } as any)
        .where(eq(socialCampaigns.id, req.params.id))
        .returning();
      res.json(campaign);
    } catch (error) {
      console.error("[Social] Error updating campaign:", error);
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  // Delete campaign
  app.delete("/api/social/campaigns/:id", requirePermission("canManageSettings"), async (req: Request, res: Response) => {
    try {
      await db.delete(socialCampaigns).where(eq(socialCampaigns.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("[Social] Error deleting campaign:", error);
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  // ============================================================================
  // POSTS
  // ============================================================================

  // List posts (with optional filters)
  app.get("/api/social/posts", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, platform, campaignId } = req.query;
      let query = db.select().from(socialPosts);
      
      const conditions: any[] = [];
      if (status) conditions.push(eq(socialPosts.status, status as any));
      if (platform) conditions.push(eq(socialPosts.platform, platform as any));
      if (campaignId) conditions.push(eq(socialPosts.campaignId, campaignId as string));
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const posts = await query.orderBy(desc(socialPosts.scheduledAt));
      res.json(posts);
    } catch (error) {
      console.error("[Social] Error listing posts:", error);
      res.status(500).json({ error: "Failed to list posts" });
    }
  });

  // Create post
  app.post("/api/social/posts", requirePermission("canEdit"), async (req: Request, res: Response) => {
    try {
      const parsed = insertSocialPostSchema.parse(req.body);
      const [post] = await db.insert(socialPosts).values(parsed as any).returning();
      res.json(post);
    } catch (error) {
      console.error("[Social] Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  // Get single post
  app.get("/api/social/posts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, req.params.id));
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      console.error("[Social] Error getting post:", error);
      res.status(500).json({ error: "Failed to get post" });
    }
  });

  // Update post
  app.patch("/api/social/posts/:id", requirePermission("canEdit"), async (req: Request, res: Response) => {
    try {
      const updateSchema = z.object({
        campaignId: z.string().nullable().optional(),
        platform: z.enum(["linkedin", "twitter", "facebook", "instagram"]).optional(),
        status: z.enum(["draft", "scheduled", "published", "failed"]).optional(),
        text: z.string().optional(),
        textHe: z.string().nullable().optional(),
        mediaUrls: z.array(z.string()).optional(),
        linkUrl: z.string().nullable().optional(),
        hashtags: z.array(z.string()).optional(),
        scheduledAt: z.string().transform(d => d ? new Date(d) : null).nullable().optional(),
      });
      const parsed = updateSchema.parse(req.body);
      const [post] = await db.update(socialPosts)
        .set({ ...parsed, updatedAt: new Date() } as any)
        .where(eq(socialPosts.id, req.params.id))
        .returning();
      res.json(post);
    } catch (error) {
      console.error("[Social] Error updating post:", error);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  // Delete post
  app.delete("/api/social/posts/:id", requirePermission("canEdit"), async (req: Request, res: Response) => {
    try {
      await db.delete(socialPosts).where(eq(socialPosts.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("[Social] Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Schedule post
  app.post("/api/social/posts/:id/schedule", requirePermission("canEdit"), async (req: Request, res: Response) => {
    try {
      const { scheduledAt } = req.body;
      const [post] = await db.update(socialPosts)
        .set({ 
          scheduledAt: new Date(scheduledAt), 
          status: "scheduled",
          updatedAt: new Date() 
        } as any)
        .where(eq(socialPosts.id, req.params.id))
        .returning();
      res.json(post);
    } catch (error) {
      console.error("[Social] Error scheduling post:", error);
      res.status(500).json({ error: "Failed to schedule post" });
    }
  });

  // Get posts due for publishing (for scheduler)
  app.get("/api/social/posts/due", requireAuth, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const posts = await db.select()
        .from(socialPosts)
        .where(and(
          eq(socialPosts.status, "scheduled"),
          lte(socialPosts.scheduledAt, now)
        ))
        .orderBy(socialPosts.scheduledAt);
      res.json(posts);
    } catch (error) {
      console.error("[Social] Error getting due posts:", error);
      res.status(500).json({ error: "Failed to get due posts" });
    }
  });

  // ============================================================================
  // AI CONTENT GENERATION
  // ============================================================================

  // Generate social post from content
  app.post("/api/social/generate", requirePermission("canEdit"), async (req: Request, res: Response) => {
    try {
      const { contentId, platform, tone, includeHashtags } = req.body;
      
      // TODO: Integrate with existing AI system to generate post
      // For now, return a placeholder
      res.json({
        text: `Generated ${platform} post for content ${contentId}`,
        hashtags: includeHashtags ? ["#Dubai", "#Travel"] : [],
        generatedByAi: true
      });
    } catch (error) {
      console.error("[Social] Error generating post:", error);
      res.status(500).json({ error: "Failed to generate post" });
    }
  });

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  // Get analytics for a post
  app.get("/api/social/analytics/post/:postId", requireAuth, async (req: Request, res: Response) => {
    try {
      const analytics = await db.select()
        .from(socialAnalytics)
        .where(eq(socialAnalytics.postId, req.params.postId))
        .orderBy(desc(socialAnalytics.fetchedAt));
      res.json(analytics);
    } catch (error) {
      console.error("[Social] Error getting post analytics:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Get campaign analytics summary
  app.get("/api/social/analytics/campaign/:campaignId", requireAuth, async (req: Request, res: Response) => {
    try {
      const analytics = await db.select({
        totalImpressions: sql<number>`SUM(${socialAnalytics.impressions})`,
        totalClicks: sql<number>`SUM(${socialAnalytics.clicks})`,
        totalLikes: sql<number>`SUM(${socialAnalytics.likes})`,
        totalComments: sql<number>`SUM(${socialAnalytics.comments})`,
        totalShares: sql<number>`SUM(${socialAnalytics.shares})`,
      })
        .from(socialAnalytics)
        .where(eq(socialAnalytics.campaignId, req.params.campaignId));
      res.json(analytics[0] || {});
    } catch (error) {
      console.error("[Social] Error getting campaign analytics:", error);
      res.status(500).json({ error: "Failed to get campaign analytics" });
    }
  });

  // Get overall dashboard stats
  app.get("/api/social/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const [campaignCount] = await db.select({ count: sql<number>`COUNT(*)` }).from(socialCampaigns);
      const [postCounts] = await db.select({
        total: sql<number>`COUNT(*)`,
        scheduled: sql<number>`COUNT(*) FILTER (WHERE status = 'scheduled')`,
        published: sql<number>`COUNT(*) FILTER (WHERE status = 'published')`,
        draft: sql<number>`COUNT(*) FILTER (WHERE status = 'draft')`,
      }).from(socialPosts);
      
      const [analytics] = await db.select({
        totalImpressions: sql<number>`COALESCE(SUM(impressions), 0)`,
        totalEngagement: sql<number>`COALESCE(SUM(likes + comments + shares), 0)`,
      }).from(socialAnalytics);

      res.json({
        campaigns: campaignCount?.count || 0,
        posts: postCounts || { total: 0, scheduled: 0, published: 0, draft: 0 },
        analytics: analytics || { totalImpressions: 0, totalEngagement: 0 }
      });
    } catch (error) {
      console.error("[Social] Error getting dashboard:", error);
      res.status(500).json({ error: "Failed to get dashboard" });
    }
  });

  // ============================================================================
  // CREDENTIALS (OAuth)
  // ============================================================================

  // List connected accounts
  app.get("/api/social/credentials", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const credentials = await db.select({
        id: socialCredentials.id,
        platform: socialCredentials.platform,
        platformUsername: socialCredentials.platformUsername,
        profileUrl: socialCredentials.profileUrl,
        isActive: socialCredentials.isActive,
        lastSyncAt: socialCredentials.lastSyncAt,
      })
        .from(socialCredentials)
        .where(eq(socialCredentials.userId, userId));
      res.json(credentials);
    } catch (error) {
      console.error("[Social] Error listing credentials:", error);
      res.status(500).json({ error: "Failed to list credentials" });
    }
  });

  // Disconnect account
  app.delete("/api/social/credentials/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      await db.delete(socialCredentials)
        .where(and(
          eq(socialCredentials.id, req.params.id),
          eq(socialCredentials.userId, userId)
        ));
      res.json({ success: true });
    } catch (error) {
      console.error("[Social] Error deleting credential:", error);
      res.status(500).json({ error: "Failed to delete credential" });
    }
  });

  console.log("[Social] Routes registered successfully");
}
