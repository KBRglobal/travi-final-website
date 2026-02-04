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
  contents,
  type SocialPost,
} from "@shared/schema";
import { requireAuth, requirePermission } from "./security";
import { eq, desc, and, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { getAllUnifiedProviders } from "./ai/providers";
import { log } from "./lib/logger";

export function registerSocialRoutes(app: Express) {
  // ============================================================================
  // CAMPAIGNS
  // ============================================================================

  // List all campaigns
  app.get("/api/social/campaigns", requireAuth, async (req: Request, res: Response) => {
    try {
      const campaigns = await db
        .select()
        .from(socialCampaigns)
        .orderBy(desc(socialCampaigns.createdAt));
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to list campaigns" });
    }
  });

  // Create campaign
  app.post(
    "/api/social/campaigns",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const parsed = insertSocialCampaignSchema.parse(req.body);
        const [campaign] = await db
          .insert(socialCampaigns)
          .values(parsed as any)
          .returning();
        res.json(campaign);
      } catch (error) {
        res.status(500).json({ error: "Failed to create campaign" });
      }
    }
  );

  // Get single campaign
  app.get("/api/social/campaigns/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const [campaign] = await db
        .select()
        .from(socialCampaigns)
        .where(eq(socialCampaigns.id, req.params.id));
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to get campaign" });
    }
  });

  // Update campaign
  app.patch(
    "/api/social/campaigns/:id",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const updateSchema = z.object({
          name: z.string().optional(),
          description: z.string().nullable().optional(),
          startDate: z
            .string()
            .transform(d => new Date(d))
            .optional(),
          endDate: z
            .string()
            .transform(d => new Date(d))
            .optional(),
          status: z.enum(["active", "paused", "completed"]).optional(),
          targetPlatforms: z.array(z.string()).optional(),
          goals: z
            .object({
              impressions: z.number().optional(),
              clicks: z.number().optional(),
              engagement: z.number().optional(),
            })
            .optional(),
        });
        const parsed = updateSchema.parse(req.body);
        const [campaign] = await db
          .update(socialCampaigns)
          .set({ ...parsed, updatedAt: new Date() } as any)
          .where(eq(socialCampaigns.id, req.params.id))
          .returning();
        res.json(campaign);
      } catch (error) {
        res.status(500).json({ error: "Failed to update campaign" });
      }
    }
  );

  // Delete campaign
  app.delete(
    "/api/social/campaigns/:id",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        await db.delete(socialCampaigns).where(eq(socialCampaigns.id, req.params.id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete campaign" });
      }
    }
  );

  // ============================================================================
  // POSTS
  // ============================================================================

  // List posts (with optional filters)
  app.get("/api/social/posts", requireAuth, async (req: Request, res: Response) => {
    try {
      const { status, platform, campaignId } = req.query;
      let query = db.select().from(socialPosts);

      const conditions: ReturnType<typeof eq>[] = [];
      if (status) conditions.push(eq(socialPosts.status, status as SocialPost["status"]));
      if (platform) conditions.push(eq(socialPosts.platform, platform as SocialPost["platform"]));
      if (campaignId) conditions.push(eq(socialPosts.campaignId, campaignId as string));

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      const posts = await query.orderBy(desc(socialPosts.scheduledAt));
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to list posts" });
    }
  });

  // Create post
  app.post(
    "/api/social/posts",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const parsed = insertSocialPostSchema.parse(req.body);
        const [post] = await db
          .insert(socialPosts)
          .values(parsed as any)
          .returning();
        res.json(post);
      } catch (error) {
        res.status(500).json({ error: "Failed to create post" });
      }
    }
  );

  // Get single post
  app.get("/api/social/posts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const [post] = await db.select().from(socialPosts).where(eq(socialPosts.id, req.params.id));
      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ error: "Failed to get post" });
    }
  });

  // Update post
  app.patch(
    "/api/social/posts/:id",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
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
          scheduledAt: z
            .string()
            .transform(d => (d ? new Date(d) : null))
            .nullable()
            .optional(),
        });
        const parsed = updateSchema.parse(req.body);
        const [post] = await db
          .update(socialPosts)
          .set({ ...parsed, updatedAt: new Date() } as any)
          .where(eq(socialPosts.id, req.params.id))
          .returning();
        res.json(post);
      } catch (error) {
        res.status(500).json({ error: "Failed to update post" });
      }
    }
  );

  // Delete post
  app.delete(
    "/api/social/posts/:id",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        await db.delete(socialPosts).where(eq(socialPosts.id, req.params.id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete post" });
      }
    }
  );

  // Schedule post
  app.post(
    "/api/social/posts/:id/schedule",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { scheduledAt } = req.body;
        const [post] = await db
          .update(socialPosts)
          .set({
            scheduledAt: new Date(scheduledAt),
            status: "scheduled",
            updatedAt: new Date(),
          } as any)
          .where(eq(socialPosts.id, req.params.id))
          .returning();
        res.json(post);
      } catch (error) {
        res.status(500).json({ error: "Failed to schedule post" });
      }
    }
  );

  // Get posts due for publishing (for scheduler)
  app.get("/api/social/posts/due", requireAuth, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const posts = await db
        .select()
        .from(socialPosts)
        .where(and(eq(socialPosts.status, "scheduled"), lte(socialPosts.scheduledAt, now)))
        .orderBy(socialPosts.scheduledAt);
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get due posts" });
    }
  });

  // ============================================================================
  // AI CONTENT GENERATION
  // ============================================================================

  // Generate social post from content
  app.post(
    "/api/social/generate",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { contentId, platform, tone = "professional", includeHashtags = true } = req.body;

        // Validate platform
        const validPlatforms = ["linkedin", "twitter", "facebook", "instagram"];
        if (!validPlatforms.includes(platform)) {
          return res
            .status(400)
            .json({ error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}` });
        }

        // Get content from database
        const [content] = await db
          .select()
          .from(contents)
          .where(eq(contents.id, contentId))
          .limit(1);

        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        // Get an AI provider
        const providers = getAllUnifiedProviders();
        if (providers.length === 0) {
          // Fallback to basic generation if no AI provider
          return res.json({
            text: content.metaDescription || `Check out: ${content.title}`,
            hashtags: includeHashtags ? ["#Travel", "#Explore", "#TravelGuide"] : [],
            generatedByAi: false,
          });
        }

        const provider = providers[0];

        // Platform-specific constraints
        const platformConfig: Record<string, { maxLength: number; hashtagStyle: string }> = {
          twitter: { maxLength: 280, hashtagStyle: "inline" },
          linkedin: { maxLength: 3000, hashtagStyle: "end" },
          facebook: { maxLength: 500, hashtagStyle: "end" },
          instagram: { maxLength: 2200, hashtagStyle: "end" },
        };

        const config = platformConfig[platform];

        // Generate with AI
        const result = await provider.generateCompletion({
          messages: [
            {
              role: "system",
              content: `You are a social media marketing expert. Generate a ${platform} post with a ${tone} tone. Max length: ${config.maxLength} characters. Return JSON: {"text": "post text", "hashtags": ["tag1", "tag2"]}`,
            },
            {
              role: "user",
              content: `Create a ${platform} post for this travel content:\nTitle: ${content.title}\nDescription: ${content.metaDescription || ""}\n${includeHashtags ? "Include 3-5 relevant hashtags" : "No hashtags needed"}`,
            },
          ],
          temperature: 0.7,
          maxTokens: 500,
          responseFormat: { type: "json_object" },
        });

        try {
          const parsed = JSON.parse(result.content);
          res.json({
            text: parsed.text || content.title,
            hashtags: includeHashtags ? parsed.hashtags || [] : [],
            generatedByAi: true,
            provider: result.provider,
          });
        } catch {
          // If JSON parsing fails, use the raw text
          res.json({
            text: result.content.slice(0, config.maxLength),
            hashtags: includeHashtags ? ["#Travel", "#Explore"] : [],
            generatedByAi: true,
            provider: result.provider,
          });
        }
      } catch (error) {
        log.error("[Social] Failed to generate post:", error);
        res.status(500).json({ error: "Failed to generate post" });
      }
    }
  );

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  // Get analytics for a post
  app.get(
    "/api/social/analytics/post/:postId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const analytics = await db
          .select()
          .from(socialAnalytics)
          .where(eq(socialAnalytics.postId, req.params.postId))
          .orderBy(desc(socialAnalytics.fetchedAt));
        res.json(analytics);
      } catch (error) {
        res.status(500).json({ error: "Failed to get analytics" });
      }
    }
  );

  // Get campaign analytics summary
  app.get(
    "/api/social/analytics/campaign/:campaignId",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const analytics = await db
          .select({
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
        res.status(500).json({ error: "Failed to get campaign analytics" });
      }
    }
  );

  // Get overall dashboard stats
  app.get("/api/social/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const [campaignCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(socialCampaigns);
      const [postCounts] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          scheduled: sql<number>`COUNT(*) FILTER (WHERE status = 'scheduled')`,
          published: sql<number>`COUNT(*) FILTER (WHERE status = 'published')`,
          draft: sql<number>`COUNT(*) FILTER (WHERE status = 'draft')`,
        })
        .from(socialPosts);

      const [analytics] = await db
        .select({
          totalImpressions: sql<number>`COALESCE(SUM(impressions), 0)`,
          totalEngagement: sql<number>`COALESCE(SUM(likes + comments + shares), 0)`,
        })
        .from(socialAnalytics);

      res.json({
        campaigns: campaignCount?.count || 0,
        posts: postCounts || { total: 0, scheduled: 0, published: 0, draft: 0 },
        analytics: analytics || { totalImpressions: 0, totalEngagement: 0 },
      });
    } catch (error) {
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
      const credentials = await db
        .select({
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
      res.status(500).json({ error: "Failed to list credentials" });
    }
  });

  // Disconnect account
  app.delete("/api/social/credentials/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      await db
        .delete(socialCredentials)
        .where(and(eq(socialCredentials.id, req.params.id), eq(socialCredentials.userId, userId)));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete credential" });
    }
  });
}
