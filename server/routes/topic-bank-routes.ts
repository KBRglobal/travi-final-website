import type { Express } from "express";
import { storage } from "../storage";
import { requirePermission } from "../security";

import {
  generateContentImages,
  getAIClient,
  getModelForProvider,
  type GeneratedImage,
} from "../ai";
import { insertTopicBankSchema, type ContentBlock } from "@shared/schema";
import { z } from "zod";
import { getStorageManager } from "../services/storage-adapter";

// Helper to clean JSON from markdown code blocks
function cleanJsonFromMarkdown(content: string): string {
  if (!content) return "{}";
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

  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, match => {
    return match.replace(new RegExp(String.raw`[\x00-\x1F\x7F]`, "g"), char => {
      const code = char.charCodeAt(0);
      if (code === 0x09) return String.raw`\t`;
      if (code === 0x0a) return String.raw`\n`;
      if (code === 0x0d) return String.raw`\r`;
      return String.raw`\u` + code.toString(16).padStart(4, "0");
    });
  });

  return cleaned;
}

// Safe JSON parse that handles markdown-wrapped JSON
function safeParseJson(content: string, fallback: Record<string, unknown> = {}): any {
  try {
    const cleaned = cleanJsonFromMarkdown(content);
    return JSON.parse(cleaned);
  } catch (e) {
    return fallback;
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

// Create default blocks for when validation fails
function createDefaultBlocks(title: string): ContentBlock[] {
  const timestamp = Date.now();
  return [
    {
      id: `hero-${timestamp}-0`,
      type: "hero",
      data: { title, subtitle: "Discover Travel Destinations", overlayText: "" },
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
      id: `cta-${timestamp}-5`,
      type: "cta",
      data: {
        title: "Plan Your Visit",
        content: "Ready to experience this amazing destination? Book your trip today!",
        buttonText: "Book Now",
        buttonLink: "#",
      },
      order: 5,
    },
  ];
}

// Normalize a single block
function normalizeBlock(
  type: string,
  data: Record<string, unknown>
): Omit<ContentBlock, "id" | "order"> | null {
  switch (type) {
    case "hero":
      return { type: "hero" as const, data };

    case "text":
      return { type: "text" as const, data };

    case "highlights": {
      let highlightItems = (data as any).items || (data as any).highlights;
      if (Array.isArray(highlightItems) && highlightItems.length > 0) {
        const highlightContent = highlightItems
          .map((item: unknown) => {
            if (typeof item === "string") return item;
            if (typeof item === "object" && item && (item as any).title) {
              const t = item as { title?: string; description?: string };
              return t.description ? `${t.title}: ${t.description}` : t.title;
            }
            return String(item);
          })
          .join("\n");
        return { type: "highlights" as const, data: { ...data, content: highlightContent } };
      }
      if (typeof (data as any).content === "string" && (data as any).content.length > 0) {
        return { type: "highlights" as const, data };
      }
      return {
        type: "highlights" as const,
        data: {
          ...data,
          content:
            "Key attraction feature\nUnique experience offered\nMust-see element\nPopular activity",
        },
      };
    }

    case "tips": {
      let tipsArray = (data as any).tips || (data as any).items;
      if (Array.isArray(tipsArray) && tipsArray.length > 0) {
        const tipsContent = tipsArray.map((tip: unknown) => String(tip)).join("\n");
        return { type: "tips" as const, data: { ...data, content: tipsContent } };
      }
      if (typeof (data as any).content === "string" && (data as any).content.length > 0) {
        return { type: "tips" as const, data };
      }
      return {
        type: "tips" as const,
        data: {
          ...data,
          content:
            "Visit during off-peak hours\nBook in advance\nWear comfortable clothing\nStay hydrated\nCheck local customs",
        },
      };
    }

    case "faq": {
      if (typeof (data as any).question === "string" && (data as any).question.length > 0) {
        return { type: "faq" as const, data };
      }
      let faqsArray = (data as any).faqs || (data as any).items || (data as any).questions;
      if (Array.isArray(faqsArray) && faqsArray.length > 0) {
        const firstFaq = faqsArray[0];
        if (typeof firstFaq === "object" && firstFaq) {
          const q = firstFaq.question || firstFaq.q || "Question?";
          const a = (firstFaq as any).answer || (firstFaq as any).a || "Answer pending.";
          return {
            type: "faq" as const,
            data: { question: q, answer: a, _remainingFaqs: faqsArray.slice(1) },
          };
        }
      }
      return {
        type: "faq" as const,
        data: {
          question: "What are the opening hours?",
          answer: "Check the official website for current timings.",
        },
      };
    }

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
      return { type: "banner" as const, data };
    case "recommendations":
      return { type: "recommendations" as const, data };
    case "related_articles":
      return { type: "related_articles" as const, data };
    case "room_cards":
      return { type: "room_cards" as const, data };

    default:
      return null;
  }
}

// Validate and normalize AI-generated content blocks
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

      if (normalized.type === "faq" && (normalized.data as any)._remainingFaqs) {
        const remainingFaqs = (normalized.data as any)._remainingFaqs as Array<{
          question?: string;
          answer?: string;
          q?: string;
          a?: string;
        }>;
        delete (normalized.data as any)._remainingFaqs;

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

  if (!blockTypes.has("hero")) {
    normalizedBlocks.unshift({
      type: "hero",
      data: { title, subtitle: "Discover Travel Destinations", overlayText: "" },
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

  return normalizedBlocks.map((block, index) => ({
    ...block,
    id: `${block.type}-${Date.now()}-${index}`,
    order: index,
  }));
}

export function registerTopicBankRoutes(app: Express): void {
  // Topic Bank CRUD
  app.get("/api/topic-bank", async (req, res) => {
    try {
      const { category, isActive } = req.query;
      const items = await storage.getTopicBankItems({
        category: category as string | undefined,
        isActive: isActive === undefined ? undefined : isActive === "true",
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topic bank items" });
    }
  });

  // Topic bank stats for dashboard
  app.get("/api/topic-bank/stats", async (req, res) => {
    try {
      const items = await storage.getTopicBankItems({ isActive: true });
      // Count unused topics (timesUsed === 0 or undefined)
      const unusedCount = items.filter(item => !item.timesUsed || item.timesUsed === 0).length;
      res.json({ unusedCount, totalTopics: items.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topic bank stats" });
    }
  });

  app.get("/api/topic-bank/:id", async (req, res) => {
    try {
      const item = await storage.getTopicBankItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch topic bank item" });
    }
  });

  app.post("/api/topic-bank", requirePermission("canCreate"), async (req, res) => {
    try {
      const parsed = insertTopicBankSchema.parse(req.body);
      const item = await storage.createTopicBankItem(parsed);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create topic bank item" });
    }
  });

  app.patch("/api/topic-bank/:id", requirePermission("canEdit"), async (req, res) => {
    try {
      const item = await storage.updateTopicBankItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to update topic bank item" });
    }
  });

  app.delete("/api/topic-bank/:id", requirePermission("canDelete"), async (req, res) => {
    try {
      await storage.deleteTopicBankItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete topic bank item" });
    }
  });

  // Merge duplicate topics (same title)
  app.post("/api/topic-bank/merge-duplicates", requirePermission("canDelete"), async (req, res) => {
    try {
      const allTopics = await storage.getTopicBankItems({});

      // Group topics by normalized title (lowercase, trimmed)
      const topicsByTitle = new Map<string, typeof allTopics>();
      for (const topic of allTopics) {
        const normalizedTitle = topic.title.toLowerCase().trim();
        if (!topicsByTitle.has(normalizedTitle)) {
          topicsByTitle.set(normalizedTitle, []);
        }
        topicsByTitle.get(normalizedTitle)!.push(topic);
      }

      let mergedCount = 0;
      let deletedCount = 0;

      // Process each group of duplicates
      for (const [, duplicates] of topicsByTitle) {
        if (duplicates.length <= 1) continue;

        // Sort by: priority (desc), timesUsed (desc), createdAt (desc - newest first for ties)
        duplicates.sort((a, b) => {
          if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
          if ((b.timesUsed || 0) !== (a.timesUsed || 0))
            return (b.timesUsed || 0) - (a.timesUsed || 0);
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bTime - aTime; // Newest first when other fields are equal
        });

        // Keep the first one (best), merge data into it
        const keeper = duplicates[0];
        const toDelete = duplicates.slice(1);

        // Merge all fields from duplicates - prefer non-null values
        const allKeywords = new Set<string>(keeper.keywords || []);
        let longestOutline = keeper.outline || "";
        let totalTimesUsed = keeper.timesUsed || 0;
        let bestCategory = keeper.category;
        let bestMainCategory = keeper.mainCategory;
        let bestTopicType = keeper.topicType;
        let bestViralPotential = keeper.viralPotential;
        let bestFormat = keeper.format;
        let bestHeadlineAngle = keeper.headlineAngle;
        let bestPriority = keeper.priority || 0;
        let isActive = keeper.isActive === true; // Only true if explicitly true, not undefined

        for (const dup of toDelete) {
          // Merge keywords
          if (dup.keywords) {
            for (const kw of dup.keywords) {
              allKeywords.add(kw);
            }
          }
          // Keep longest outline
          if (dup.outline && dup.outline.length > longestOutline.length) {
            longestOutline = dup.outline;
          }
          // Sum up usage
          totalTimesUsed += dup.timesUsed || 0;
          // Prefer non-null values for categorical fields
          if (!bestCategory && dup.category) bestCategory = dup.category;
          if (!bestMainCategory && dup.mainCategory) bestMainCategory = dup.mainCategory;
          if (!bestTopicType && dup.topicType) bestTopicType = dup.topicType;
          if (!bestViralPotential && dup.viralPotential) bestViralPotential = dup.viralPotential;
          if (!bestFormat && dup.format) bestFormat = dup.format;
          if (!bestHeadlineAngle && dup.headlineAngle) bestHeadlineAngle = dup.headlineAngle;
          // Keep highest priority
          if ((dup.priority || 0) > bestPriority) bestPriority = dup.priority || 0;
          // If any duplicate is explicitly active, keep active
          if (dup.isActive === true) isActive = true;
        }

        // Update keeper with merged data
        await storage.updateTopicBankItem(keeper.id, {
          keywords: Array.from(allKeywords),
          outline: longestOutline || null,
          timesUsed: totalTimesUsed,
          category: bestCategory,
          mainCategory: bestMainCategory,
          topicType: bestTopicType,
          viralPotential: bestViralPotential,
          format: bestFormat,
          headlineAngle: bestHeadlineAngle,
          priority: bestPriority,
          isActive: isActive,
        });

        // Delete duplicates
        for (const dup of toDelete) {
          await storage.deleteTopicBankItem(dup.id);
          deletedCount++;
        }

        mergedCount++;
      }

      res.json({
        success: true,
        message: `Merged ${mergedCount} groups, deleted ${deletedCount} duplicates`,
        mergedGroups: mergedCount,
        deletedItems: deletedCount,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to merge duplicate topics" });
    }
  });

  app.post("/api/topic-bank/:id/use", requirePermission("canCreate"), async (req, res) => {
    try {
      const item = await storage.incrementTopicUsage(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Topic not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to increment topic usage" });
    }
  });

  // Auto-generate article from Topic Bank item
  app.post("/api/topic-bank/:id/generate", requirePermission("canCreate"), async (req, res) => {
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({
          error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
        });
      }
      const { client: openai, provider } = aiClient;

      const topic = await storage.getTopicBankItem(req.params.id);
      if (!topic) {
        return res.status(404).json({ error: "Topic not found" });
      }

      const keywordsContext = topic.keywords?.length
        ? `Target Keywords: ${topic.keywords.join(", ")}`
        : "";

      const outlineContext = topic.outline ? `Content Outline:\n${topic.outline}` : "";

      const systemPrompt = `You are an expert travel content writer. Generate a complete, SEO-optimized article based on the provided topic information.

OUTPUT FORMAT - Return valid JSON matching this exact structure:
{
  "title": "SEO-optimized article title (50-65 chars)",
  "metaDescription": "Compelling meta description (150-160 chars)",
  "slug": "url-friendly-slug",
  "heroImageAlt": "Descriptive alt text for hero image",
  "blocks": [
    {
      "type": "hero",
      "data": {
        "title": "Main article headline",
        "subtitle": "Engaging subtitle",
        "overlayText": "Brief tagline or context"
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Introduction",
        "content": "Engaging introduction paragraph (200-300 words)..."
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Section 2 heading",
        "content": "Detailed paragraph content (200-300 words)..."
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Section 3 heading",
        "content": "Detailed paragraph content (200-300 words)..."
      }
    },
    {
      "type": "highlights",
      "data": {
        "title": "Key Highlights",
        "items": ["Highlight 1", "Highlight 2", "Highlight 3", "Highlight 4", "Highlight 5", "Highlight 6"]
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Practical Information",
        "content": "Useful practical details for travelers..."
      }
    },
    {
      "type": "tips",
      "data": {
        "title": "Expert Tips",
        "tips": ["Detailed tip 1", "Detailed tip 2", "Detailed tip 3", "Detailed tip 4", "Detailed tip 5", "Detailed tip 6", "Detailed tip 7"]
      }
    },
    {
      "type": "faq",
      "data": {
        "title": "Frequently Asked Questions",
        "faqs": [
          {"question": "Q1?", "answer": "Detailed answer (100-150 words)..."},
          {"question": "Q2?", "answer": "Detailed answer (100-150 words)..."},
          {"question": "Q3?", "answer": "Detailed answer (100-150 words)..."},
          {"question": "Q4?", "answer": "Detailed answer (100-150 words)..."},
          {"question": "Q5?", "answer": "Detailed answer (100-150 words)..."}
        ]
      }
    },
    {
      "type": "cta",
      "data": {
        "heading": "Ready to explore?",
        "text": "Compelling call to action",
        "buttonText": "Learn More",
        "buttonLink": "#"
      }
    }
  ]
}

RULES:
1. Article MUST be MINIMUM 1800-2500 words total across all text blocks (this is CRITICAL for SEO compliance)
2. Include 4-6 text sections with detailed content (each H2 section should be 300-500 words)
3. Add a highlights block with 6 key takeaways
4. Include a tips block with 7 actionable expert tips - THIS IS REQUIRED
5. Include 5 FAQ items with comprehensive 100-150 word answers each - THIS IS REQUIRED
6. Make content traveler-focused and SEO-optimized
7. No fake data, invented prices, or unverifiable facts
8. Include a CTA block at the end
9. Include 5-8 internal links to related content
10. Include 2-3 external links to authoritative sources`;

      const userPrompt = `Generate a complete article for this travel topic:

Topic: ${topic.title}
Category: ${topic.category}
${keywordsContext}
${outlineContext}

Create engaging, informative content that would appeal to travelers. Return valid JSON only.`;

      const response = await openai.chat.completions.create({
        model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 8000,
      });

      const generated = safeParseJson(response.choices[0].message.content || "{}", {});

      // Validate and normalize blocks to ensure all required sections exist
      const blocks = validateAndNormalizeBlocks(
        generated.blocks || [],
        generated.title || topic.title
      );

      // Create the content in the database
      const slug =
        generated.slug ||
        topic.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      // Generate hero image for the article and persist to storage
      let heroImageUrl = null;
      let generatedImages: GeneratedImage[] = [];
      try {
        generatedImages = await generateContentImages({
          contentType: "article",
          title: generated.title || topic.title,
          description: generated.metaDescription || topic.title,
          generateHero: true,
          generateContentImages: false,
        });

        if (generatedImages.length > 0) {
          const heroImage = generatedImages.find(img => img.type === "hero");
          if (heroImage) {
            // Persist to object storage (DALL-E URLs expire in ~1 hour)
            const persistedUrl = await persistImageToStorage(heroImage.url, heroImage.filename);
            heroImageUrl = persistedUrl || heroImage.url; // Fallback to temp URL if persist fails
          }
        }
      } catch (imageError) {
        // Continue without images - don't fail the whole article generation
      }

      const content = await storage.createContent({
        title: generated.title || topic.title,
        slug: `${slug}-${Date.now()}`,
        type: "article",
        status: "draft",
        metaDescription: generated.metaDescription || null,
        heroImage: heroImageUrl,
        heroImageAlt: generated.heroImageAlt || `${generated.title || topic.title} - Travel Guide`,
        blocks: blocks,
      });

      await storage.createArticle({ contentId: content.id, category: topic.category });

      // Increment topic usage
      await storage.incrementTopicUsage(req.params.id);

      res.status(201).json({
        content,
        generated,
        images: generatedImages,
        message: "Article generated successfully from topic",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate article from topic" });
    }
  });

  // Generate NEWS from Topic Bank item and DELETE the topic after
  app.post(
    "/api/topic-bank/:id/generate-news",
    requirePermission("canCreate"),
    async (req, res) => {
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const topic = await storage.getTopicBankItem(req.params.id);
        if (!topic) {
          return res.status(404).json({ error: "Topic not found" });
        }

        const keywordsContext = topic.keywords?.length
          ? `Target Keywords: ${topic.keywords.join(", ")}`
          : "";

        const systemPrompt = `You are an expert travel news and viral content writer. Generate a news/trending article based on the topic.

This should be written in a NEWS/trending format - engaging, timely-feeling, and shareable.

Topic Details:
- Title: ${topic.title}
- Headline Angle: ${topic.headlineAngle || "Create an engaging hook"}
- Format: ${topic.format || "article"}
- Viral Potential: ${topic.viralPotential}/5 stars
- Category: ${topic.mainCategory || topic.category}

OUTPUT FORMAT - Return valid JSON:
{
  "title": "Attention-grabbing news headline (50-70 chars)",
  "metaDescription": "Compelling meta description (150-160 chars)",
  "slug": "url-friendly-slug",
  "heroImageAlt": "Descriptive alt text",
  "blocks": [
    {
      "type": "hero",
      "data": {
        "title": "Main headline",
        "subtitle": "Breaking/Trending subheader",
        "overlayText": "Travel 2025"
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "The Story",
        "content": "Lead paragraph with the key news/trend (200-300 words)..."
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "Why It Matters",
        "content": "Context and significance (200-250 words)..."
      }
    },
    {
      "type": "highlights",
      "data": {
        "title": "Key Takeaways",
        "items": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
      }
    },
    {
      "type": "text",
      "data": {
        "heading": "What Travelers Need to Know",
        "content": "Practical info for visitors (200-250 words)..."
      }
    },
    {
      "type": "tips",
      "data": {
        "title": "Quick Tips",
        "tips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5"]
      }
    },
    {
      "type": "faq",
      "data": {
        "title": "FAQs",
        "faqs": [
          {"question": "Q1?", "answer": "Answer..."},
          {"question": "Q2?", "answer": "Answer..."},
          {"question": "Q3?", "answer": "Answer..."}
        ]
      }
    }
  ]
}

RULES:
1. Write 800-1200 words total - news articles are shorter
2. Use the headline angle: "${topic.headlineAngle || topic.title}"
3. Make it feel current and newsworthy
4. Include social-media-friendly quotes/stats
5. No invented facts or fake statistics`;

        const response = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Generate a viral news article for: ${topic.title}\n${keywordsContext}`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 3000,
        });

        const generated = safeParseJson(response.choices[0].message.content || "{}", {});
        const blocks = validateAndNormalizeBlocks(
          generated.blocks || [],
          generated.title || topic.title
        );

        const slug =
          generated.slug ||
          topic.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Generate hero image
        let heroImageUrl = null;
        try {
          const generatedImages = await generateContentImages({
            contentType: "article",
            title: generated.title || topic.title,
            description: generated.metaDescription || topic.title,
            generateHero: true,
            generateContentImages: false,
          });

          if (generatedImages.length > 0) {
            const heroImage = generatedImages.find(img => img.type === "hero");
            if (heroImage) {
              const persistedUrl = await persistImageToStorage(heroImage.url, heroImage.filename);
              heroImageUrl = persistedUrl || heroImage.url;
            }
          }
        } catch (imageError) {
          console.error(imageError);
        }

        // Create news article
        const content = await storage.createContent({
          title: generated.title || topic.title,
          slug: `${slug}-${Date.now()}`,
          type: "article",
          status: "draft",
          metaDescription: generated.metaDescription || null,
          heroImage: heroImageUrl,
          heroImageAlt: generated.heroImageAlt || `${topic.title} - Travel News`,
          blocks: blocks,
          primaryKeyword: topic.keywords?.[0] || null,
          secondaryKeywords: topic.keywords?.slice(1) || [],
        });

        // Create with "news" category
        await storage.createArticle({ contentId: content.id, category: "news" });

        // DELETE the topic after successful generation
        await storage.deleteTopicBankItem(req.params.id);

        res.status(201).json({
          content,
          generated,
          topicDeleted: true,
          message: "News article generated and topic removed from bank",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to generate news from topic" });
      }
    }
  );

  // Batch auto-generate from priority topics (for when RSS lacks content)
  app.post("/api/topic-bank/auto-generate", requirePermission("canCreate"), async (req, res) => {
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({
          error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
        });
      }
      const { client: openai, provider } = aiClient;

      const { count = 1, category } = req.body;
      const limit = Math.min(Math.max(1, count), 5); // Max 5 at a time

      // Get high-priority active topics that haven't been used much
      const topics = await storage.getTopicBankItems({
        category,
        isActive: true,
      });

      // Sort by priority (high first) and usage count (low first)
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const sortedTopics = topics
        .sort((a, b) => {
          const priorityDiff =
            (priorityOrder[a.priority || "medium"] || 1) -
            (priorityOrder[b.priority || "medium"] || 1);
          if (priorityDiff !== 0) return priorityDiff;
          return (a.timesUsed || 0) - (b.timesUsed || 0);
        })
        .slice(0, limit);

      if (sortedTopics.length === 0) {
        return res.json({
          generated: [],
          message: "No active topics available for generation",
        });
      }

      const results = [];
      for (const topic of sortedTopics) {
        try {
          const keywordsContext = topic.keywords?.length
            ? `Target Keywords: ${topic.keywords.join(", ")}`
            : "";

          const response = await openai.chat.completions.create({
            model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
            messages: [
              {
                role: "system",
                content: `You are an expert travel content writer. Generate a complete, SEO-optimized article.

Return JSON with: title, metaDescription, slug, heroImageAlt, blocks (array with hero, 4-6 text sections, highlights with 6 items, tips with 7 tips, faq with 5 items using "faqs" key, cta).
Article MUST be MINIMUM 1800-2500 words (this is CRITICAL for SEO compliance). Each H2 section should be 300-500 words.
IMPORTANT: Include a "tips" block with "tips" array containing 7 actionable tips.
IMPORTANT: Include a "faq" block with "faqs" array containing 5 Q&A objects with "question" and "answer" keys (each answer 100-150 words).
IMPORTANT: Include 5-8 internal links and 2-3 external links in your text sections.`,
              },
              {
                role: "user",
                content: `Generate article for: ${topic.title}\nCategory: ${topic.category}\n${keywordsContext}`,
              },
            ],
            response_format: { type: "json_object" },
            max_tokens: 8000,
          });

          const generated = safeParseJson(response.choices[0].message.content || "{}", {});

          const slug =
            generated.slug ||
            topic.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "");

          // Validate and normalize blocks to ensure all required sections exist
          const blocks = validateAndNormalizeBlocks(
            generated.blocks || [],
            generated.title || topic.title
          );

          // Generate hero image for the article and persist to storage
          let heroImageUrl = null;
          try {
            const batchImages = await generateContentImages({
              contentType: "article",
              title: generated.title || topic.title,
              description: generated.metaDescription || topic.title,
              generateHero: true,
              generateContentImages: false,
            });

            if (batchImages.length > 0) {
              const heroImage = batchImages.find(img => img.type === "hero");
              if (heroImage) {
                // Persist to object storage (DALL-E URLs expire in ~1 hour)
                const persistedUrl = await persistImageToStorage(heroImage.url, heroImage.filename);
                heroImageUrl = persistedUrl || heroImage.url;
              }
            }
          } catch (imageError) {
            console.error(imageError);
          }

          const content = await storage.createContent({
            title: generated.title || topic.title,
            slug: `${slug}-${Date.now()}`,
            type: "article",
            status: "draft",
            metaDescription: generated.metaDescription || null,
            heroImage: heroImageUrl,
            heroImageAlt:
              generated.heroImageAlt || `${generated.title || topic.title} - Travel Guide`,
            blocks: blocks,
          });

          await storage.createArticle({ contentId: content.id, category: topic.category });
          await storage.incrementTopicUsage(topic.id);

          results.push({
            topicId: topic.id,
            topicTitle: topic.title,
            contentId: content.id,
            hasImage: !!heroImageUrl,
            success: true,
          });
        } catch (err) {
          results.push({
            topicId: topic.id,
            topicTitle: topic.title,
            success: false,
            error: (err as Error).message,
          });
        }
      }

      res.json({
        generated: results.filter(r => r.success),
        failed: results.filter(r => !r.success),
        message: `Generated ${results.filter(r => r.success).length} of ${sortedTopics.length} articles`,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to batch generate from topics" });
    }
  });
}
