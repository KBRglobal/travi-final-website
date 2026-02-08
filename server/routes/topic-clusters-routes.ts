/**
 * Topic Clusters & RSS Aggregation Routes
 * AI-powered article merging and RSS content processing
 */

import type { Express } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { storage } from "../storage";
import { requireAuth, requirePermission, checkReadOnlyMode } from "../security";
import type { ContentBlock } from "@shared/schema";

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

// Safe JSON parse that handles markdown-wrapped JSON
function safeParseJson(content: string, fallback: Record<string, unknown> = {}): any {
  try {
    let cleaned = content.trim();
    if (cleaned.startsWith("```")) {
      const firstNewline = cleaned.indexOf("\n");
      if (firstNewline !== -1) {
        cleaned = cleaned.substring(firstNewline + 1);
      }
      if (cleaned.endsWith("```")) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
    }
    cleaned = cleaned.trim() || "{}";
    return JSON.parse(cleaned);
  } catch (e) {
    return fallback;
  }
}

// Get model name for provider
function getModelForProvider(provider: string): string {
  const models: Record<string, string> = {
    openai: "gpt-4o",
    anthropic: "claude-3-sonnet-20240229",
    gemini: "gemini-pro",
    openrouter: "openai/gpt-4o",
  };
  return models[provider] || "gpt-4o";
}

export async function registerTopicClustersRoutes(app: Express): Promise<void> {
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

        // Helper: process a single RSS item into a cluster
        const processItem = async (item: (typeof items)[number]) => {
          const fingerprint = generateFingerprint(item.title, item.link);
          const existingFp = await storage.getContentFingerprintByHash(fingerprint);
          if (existingFp) {
            skippedDuplicates.push(item.title);
            return;
          }

          let cluster = await storage.findSimilarCluster(item.title);

          if (!cluster) {
            cluster = await storage.createTopicCluster({
              topic: item.title,
              status: "pending",
              articleCount: 0,
            });
            newClusters.push({ clusterId: cluster.id, topic: cluster.topic });
          }

          await storage.createTopicClusterItem({
            clusterId: cluster.id,
            sourceTitle: item.title,
            sourceDescription: item.description || null,
            sourceUrl: item.link || null,
            rssFeedId: item.rssFeedId || null,
            pubDate: item.pubDate ? new Date(item.pubDate) : null,
          });

          try {
            await storage.createContentFingerprint({
              contentId: null,
              fingerprint: fingerprint,
              sourceUrl: item.link || null,
              sourceTitle: item.title,
              rssFeedId: item.rssFeedId || null,
            });
          } catch {
            void 0; // Fingerprint might already exist in rare edge case
          }

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
        };

        for (const item of items) {
          await processItem(item);
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
        const { getAIClient } = await import("../ai/providers");
        const {
          getContentWriterSystemPrompt,
          buildArticleGenerationPrompt,
          determineContentCategory,
          CONTENT_WRITER_PERSONALITIES,
          CATEGORY_PERSONALITY_MAPPING,
        } = await import("../content-writer-guidelines");

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
        const systemPrompt = getContentWriterSystemPrompt(category);
        const userPrompt = buildArticleGenerationPrompt(
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
          .replaceAll(/[^a-z0-9]+/g, "-")
          .replaceAll(/^-|-$/g, "")
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
          .replaceAll(/<[^>]*>/g, "")
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
        const categoryMap: Record<string, string> = {
          food: "food",
          restaurants: "food",
          dining: "food",
          attractions: "attractions",
          activities: "attractions",
          hotels: "hotels",
          accommodation: "hotels",
          transport: "transport",
          transportation: "transport",
          logistics: "transport",
          events: "events",
          festivals: "events",
          tips: "tips",
          guides: "tips",
          shopping: "shopping",
          deals: "shopping",
        };
        const articleCategory = categoryMap[category] || "news";

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
            } catch {
              void 0; // Fingerprint might already exist
            }
          }
          await storage.updateTopicClusterItem(item.id, { isUsedInMerge: true });
        }

        // Update cluster status
        await storage.updateTopicCluster(cluster.id, {
          status: "merged",
          mergedContentId: content.id,
        });

        res.status(201).json({
          message: `Successfully merged ${items.length} articles using ${personalityData?.name || "Professional"} personality`,
          content,
          mergedFrom: items.length,
          sources: mergedData.sources || [],
          category,
          personality: personalityKey,
          structure: "standard",
          wordCount,
          translationsQueued: 0,
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
        // rss-processing deleted in Phase 4.1 cleanup - Gatekeeper pipeline handles RSS
        res.status(410).json({
          message: "Legacy RSS auto-processing has been removed. Use Gatekeeper pipeline instead.",
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
}
