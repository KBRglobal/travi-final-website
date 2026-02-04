/**
 * AI Generation Routes
 * AI-powered content generation, translation, and image creation endpoints
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import {
  safeMode,
  rateLimiters,
  checkAiUsageLimit,
  requirePermission,
  checkReadOnlyMode,
} from "../security";
import {
  getAIClient,
  getAllAIClients,
  getOpenAIClient,
  getProviderStatus,
  markProviderFailed,
  markProviderSuccess,
} from "../ai/providers";
import { enforceWriterEngineSEO } from "../seo-enforcement";
import { generateContentImages, generateImage, type GeneratedImage } from "../ai";

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
    return match.replace(/[\x00-\x1F\x7F]/g, char => {
      const code = char.charCodeAt(0);
      if (code === 0x09) return "\\t";
      if (code === 0x0a) return "\\n";
      if (code === 0x0d) return "\\r";
      return `\\u${code.toString(16).padStart(4, "0")}`;
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

// Get appropriate model based on provider and task type
function getModelForProvider(provider: string, task: "chat" | "image" = "chat"): string {
  if (task === "image") {
    if (provider === "openai") return "dall-e-3";
    return "dall-e-3";
  }

  switch (provider) {
    case "openai":
      return process.env.OPENAI_MODEL || "gpt-4o-mini";
    case "gemini":
      return "gemini-1.5-flash";
    case "openrouter":
      return "google/gemini-flash-1.5";
    default:
      return "gpt-4o-mini";
  }
}

// Type definitions
type LogLevel = "info" | "warning" | "error" | "debug";
type LogCategory = "ai" | "images" | "system" | "security" | "content" | "api";

// System logging helper (uses global if available, otherwise noop)
function addSystemLog(
  level: LogLevel,
  category: LogCategory,
  message: string,
  _details?: Record<string, unknown>
): void {
  if (typeof (global as any).addSystemLog === "function") {
    (global as any).addSystemLog(level, category, message, _details);
  }
}

export function registerAiGenerationRoutes(app: Express): void {
  // AI Status endpoint - check if AI is available
  app.get("/api/ai/status", async (req, res) => {
    try {
      const aiClient = getAIClient();
      const hasOpenAI = !!getOpenAIClient();
      const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GEMINI || process.env.gemini);
      const hasOpenRouter = !!(
        process.env.OPENROUTER_API_KEY ||
        process.env.openrouterapi ||
        process.env.OPENROUTERAPI ||
        process.env.travisite
      );
      const providerStatuses = getProviderStatus();

      res.json({
        available: !!aiClient && !safeMode.aiDisabled,
        provider: aiClient?.provider || null,
        safeMode: safeMode.aiDisabled,
        providers: {
          openai: hasOpenAI,
          gemini: hasGemini,
          openrouter: hasOpenRouter,
        },
        providerStatuses,
        features: {
          textGeneration: !!aiClient,
          imageGeneration: hasOpenAI,
          translation: !!aiClient,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to check AI status" });
    }
  });

  app.post(
    "/api/ai/generate",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      try {
        const { aiWritersContentGenerator } = await import("../ai/writers/content-generator");

        const {
          type,
          topic,
          keywords,
          writerId,
          locale,
          length,
          tone,
          targetAudience,
          additionalContext,
        } = req.body;

        if (!type || !topic) {
          return res.status(400).json({ error: "Type and topic are required" });
        }

        const result = await aiWritersContentGenerator.generate({
          writerId,
          contentType: type,
          topic,
          keywords: keywords || [],
          locale: locale || "en",
          length: length || "medium",
          tone,
          targetAudience,
          additionalContext,
        });

        res.json({
          ...result,
          _system: "ai-writers",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate content";
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    "/api/ai/suggest-internal-links",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const { contentId, text } = req.body;

        const allContents = await storage.getContents();
        const otherContents = allContents.filter(c => c.id !== contentId);

        if (otherContents.length === 0) {
          return res.json({ suggestions: [] });
        }

        const contentList = otherContents
          .map(c => `- ${c.title} (${c.type}): ${c.slug}`)
          .join("\n");

        const response = await openai.chat.completions.create({
          model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
          messages: [
            {
              role: "system",
              content:
                "You are an SEO expert. Suggest internal links that would naturally fit within the given text. Only suggest links that are contextually relevant.",
            },
            {
              role: "user",
              content: `Given this content:\n\n${text}\n\nAnd these available pages to link to:\n${contentList}\n\nSuggest up to 5 internal links. For each suggestion, provide the anchor text and the target slug.\n\nFormat as JSON: { "suggestions": [{ "anchorText": "...", "targetSlug": "...", "reason": "..." }] }`,
            },
          ],
          response_format: { type: "json_object" },
        });

        markProviderSuccess(provider);
        const suggestions = safeParseJson(
          response.choices[0].message.content || '{"suggestions":[]}',
          { suggestions: [] }
        );
        res.json(suggestions);
      } catch (error) {
        res.status(500).json({ error: "Failed to suggest internal links" });
      }
    }
  );

  // Comprehensive AI Article Generator - Full Spec Implementation with Multi-Provider Fallback
  app.post(
    "/api/ai/generate-article",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        addSystemLog("warning", "ai", "AI article generation blocked - safe mode enabled");
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiProviders = getAllAIClients();
        if (aiProviders.length === 0) {
          addSystemLog(
            "error",
            "ai",
            "AI article generation failed - no AI provider configured (need OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or openrouterapi)"
          );
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or openrouterapi to Secrets.",
          });
        }

        addSystemLog(
          "info",
          "ai",
          `Available AI providers: ${aiProviders.map(p => p.provider).join(", ")}`
        );

        const { title, topic, summary, sourceUrl, sourceText, inputType = "title_only" } = req.body;

        const articleTitle = title || topic;

        if (!articleTitle) {
          addSystemLog("warning", "ai", "AI article generation failed - no title provided");
          return res.status(400).json({ error: "Title is required" });
        }

        addSystemLog("info", "ai", `Starting AI article generation: "${articleTitle}"`, {
          inputType,
        });

        let contextInfo = `Title: "${articleTitle}"`;
        if (summary) contextInfo += `\nSummary: ${summary}`;
        if (sourceText) contextInfo += `\nSource text: ${sourceText}`;
        if (sourceUrl) contextInfo += `\nSource URL: ${sourceUrl}`;

        const systemPrompt = `You are an expert travel content writer.
Write a comprehensive, SEO-optimized article based on the given information.
The article should be engaging, informative, and helpful for tourists planning their trip.

Return your response as a valid JSON object with this exact structure:
{
  "title": "The article title (SEO-optimized, 50-60 characters)",
  "metaDescription": "Meta description (150-160 characters)",
  "content": "The full article content in HTML format with proper headings (h2, h3), paragraphs, lists where appropriate",
  "primaryKeyword": "The main SEO keyword",
  "secondaryKeywords": ["array", "of", "secondary", "keywords"],
  "faqs": [
    {"question": "Question 1?", "answer": "Answer 1"},
    {"question": "Question 2?", "answer": "Answer 2"}
  ],
  "quickFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "proTips": ["Tip 1", "Tip 2"]
}

Guidelines:
- Write in a friendly, helpful tone
- Include practical information (prices, hours, locations)
- Use local insights and insider tips
- Make content scannable with headers and lists
- Include 3-5 FAQs based on common tourist questions
- Ensure all information is accurate for the destination`;

        const userPrompt = `Write a comprehensive travel article based on this information:

${contextInfo}

Generate a complete, SEO-optimized article ready for publication.`;

        let result: any = null;
        let lastError: Error | null = null;
        let usedProvider = "";

        for (const { client: openai, provider } of aiProviders) {
          try {
            addSystemLog("info", "ai", `Attempting article generation with ${provider}`);

            const response = await openai.chat.completions.create({
              model: getModelForProvider(provider),
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
              temperature: 0.7,
              max_tokens: 4000,
            });

            markProviderSuccess(provider);
            result = safeParseJson(response.choices[0].message.content || "{}", {});
            usedProvider = provider;

            if (result.title && result.content) {
              addSystemLog(
                "info",
                "ai",
                `Article generation successful with ${provider}: "${result.title}"`
              );
              break;
            } else {
              addSystemLog(
                "warning",
                "ai",
                `${provider} returned incomplete response, trying next provider`
              );
              result = null;
            }
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const isCreditsError =
              lastError.message.includes("insufficient") ||
              lastError.message.includes("quota") ||
              lastError.message.includes("credits");
            markProviderFailed(provider, isCreditsError ? "no_credits" : "rate_limited");
            addSystemLog("warning", "ai", `${provider} failed: ${lastError.message}`);
          }
        }

        if (!result || !result.title || !result.content) {
          addSystemLog(
            "error",
            "ai",
            `All AI providers failed for article generation: ${lastError?.message}`
          );
          return res.status(500).json({
            error: "Failed to generate article - all AI providers failed",
            details: lastError?.message,
          });
        }

        const enforced = enforceWriterEngineSEO(result);
        res.json({
          ...enforced,
          provider: usedProvider,
          _system: "ai-article-generator",
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate article";
        addSystemLog("error", "ai", `Article generation exception: ${message}`);
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    "/api/ai/generate-article-simple",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const { topic, category, keywords } = req.body;
        if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
          return res.status(400).json({ error: "Article topic is required" });
        }

        const { aiWritersContentGenerator } = await import("../ai/writers/content-generator");
        const result = await aiWritersContentGenerator.generate({
          contentType: "article",
          topic: topic.trim(),
          keywords: keywords || [topic.trim()],
          length: "long",
          additionalContext: category ? `Category: ${category}` : undefined,
        });

        const enforced = enforceWriterEngineSEO(result);
        res.json({ ...enforced, _system: "ai-writers" });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate article content";
        res.status(500).json({ error: message });
      }
    }
  );

  // AI Image Generation endpoint
  app.post(
    "/api/ai/generate-images",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        addSystemLog("warning", "images", "AI image generation blocked - safe mode enabled");
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const {
          contentType,
          title,
          description,
          location,
          generateHero,
          generateContentImages: genContentImages,
          contentImageCount,
        } = req.body;

        if (!contentType || !title) {
          addSystemLog(
            "warning",
            "images",
            "AI image generation failed - missing content type or title"
          );
          return res.status(400).json({ error: "Content type and title are required" });
        }

        const validContentTypes = [
          "hotel",
          "attraction",
          "article",
          "dining",
          "district",
          "transport",
          "event",
          "itinerary",
        ];
        if (!validContentTypes.includes(contentType)) {
          addSystemLog(
            "warning",
            "images",
            `AI image generation failed - invalid content type: ${contentType}`
          );
          return res.status(400).json({ error: "Invalid content type" });
        }

        const hasOpenAI = !!(
          process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
        );
        const hasReplicate = !!process.env.REPLICATE_API_KEY;
        const hasFreepik = !!process.env.FREEPIK_API_KEY;

        if (!hasOpenAI && !hasReplicate && !hasFreepik) {
          addSystemLog(
            "error",
            "images",
            "AI image generation failed - no image API configured (need OPENAI_API_KEY, REPLICATE_API_KEY, or FREEPIK_API_KEY)"
          );
          return res.status(503).json({
            error:
              "No image generation service configured. Please add OPENAI_API_KEY, REPLICATE_API_KEY, or FREEPIK_API_KEY to Secrets.",
          });
        }

        addSystemLog("info", "images", `Starting image generation for ${contentType}: ${title}`, {
          hasOpenAI,
          hasReplicate,
          hasFreepik,
        });

        const images = await generateContentImages({
          contentType: contentType as any,
          title,
          description,
          location: location || "",
          generateHero: generateHero !== false,
          generateContentImages: genContentImages !== false,
          contentImageCount: contentImageCount || 3,
        });

        if (!images || images.length === 0) {
          addSystemLog("error", "images", `Image generation failed: No images generated`);
          return res.status(500).json({ error: "Image generation failed - no images created" });
        }

        addSystemLog(
          "info",
          "images",
          `Successfully generated ${images.length} images for ${contentType}: ${title}`
        );

        res.json({
          success: true,
          images,
          heroImage: images.find((img: GeneratedImage) => img.type === "hero"),
          contentImages: images.filter((img: GeneratedImage) => img.type !== "hero"),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate images";
        addSystemLog("error", "images", `Image generation exception: ${message}`);
        res.status(500).json({ error: message });
      }
    }
  );

  // Single image generation endpoint
  app.post(
    "/api/ai/generate-image",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const { prompt, style, size } = req.body;

        if (!prompt) {
          return res.status(400).json({ error: "Image prompt is required" });
        }

        const imageUrl = await generateImage(prompt, {
          style: style || "natural",
          size: size || "1024x1024",
        });

        if (!imageUrl) {
          return res.status(500).json({ error: "Image generation failed" });
        }

        // Generate a filename from the prompt
        const slug = prompt
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .substring(0, 50);
        const filename = `${slug}-${Date.now()}.jpg`;

        res.json({ url: imageUrl, filename });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate image";
        res.status(500).json({ error: message });
      }
    }
  );

  app.post(
    "/api/ai/block-action",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const { action, content, context, targetLanguage } = req.body;

        if (!action || !content) {
          return res.status(400).json({ error: "Action and content are required" });
        }

        const validActions = [
          "rewrite",
          "expand",
          "shorten",
          "translate",
          "seo_optimize",
          "improve_grammar",
          "add_examples",
        ];
        if (!validActions.includes(action)) {
          return res.status(400).json({ error: "Invalid action" });
        }

        let systemPrompt = "You are a professional content editor for a travel website.";
        let userPrompt = "";

        switch (action) {
          case "rewrite":
            userPrompt = `Rewrite the following text in a fresh, engaging way while keeping the same meaning and key information:\n\n${content}`;
            break;
          case "expand":
            userPrompt = `Expand the following text with more details, examples, and engaging information. Make it at least 50% longer while maintaining quality:\n\n${content}`;
            break;
          case "shorten":
            userPrompt = `Condense the following text to be more concise while keeping all essential information. Reduce length by about 30-40%:\n\n${content}`;
            break;
          case "translate":
            const langName = targetLanguage || "Arabic";
            userPrompt = `Translate the following text to ${langName}. Maintain the same tone and style:\n\n${content}`;
            break;
          case "seo_optimize":
            userPrompt = `Optimize the following text for SEO while keeping it natural and engaging. Add relevant keywords and improve structure:\n\n${content}`;
            break;
          case "improve_grammar":
            userPrompt = `Fix any grammar, spelling, or punctuation errors in the following text. Keep the same style and meaning:\n\n${content}`;
            break;
          case "add_examples":
            userPrompt = `Add relevant examples, statistics, or specific details to make the following text more informative and credible:\n\n${content}`;
            break;
        }

        if (context) {
          userPrompt += `\n\nContext: ${context}`;
        }

        const response = await openai.chat.completions.create({
          model: getModelForProvider(provider),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        });

        markProviderSuccess(provider);
        const result = response.choices[0].message.content || "";
        res.json({ result, action, provider });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to process block action";
        res.status(500).json({ error: message });
      }
    }
  );

  // AI Assistant endpoint for chat-based help
  app.post(
    "/api/ai/assistant",
    requirePermission("canCreate"),
    rateLimiters.ai,
    checkAiUsageLimit,
    async (req, res) => {
      if (safeMode.aiDisabled) {
        return res
          .status(503)
          .json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
      }
      try {
        const aiClient = getAIClient();
        if (!aiClient) {
          return res.status(503).json({
            error:
              "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi.",
          });
        }
        const { client: openai, provider } = aiClient;

        const { prompt } = req.body;

        if (!prompt) {
          return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await openai.chat.completions.create({
          model: getModelForProvider(provider),
          messages: [
            {
              role: "system",
              content: `You are a helpful travel content assistant. Help users with questions about:
- Writing and improving travel content
- SEO optimization for tourism topics
- Creating engaging descriptions for hotels, attractions, restaurants
- Answering questions about travel destinations

Keep responses concise but helpful. Use bullet points and formatting when appropriate.
Focus on travel, tourism, hotels, attractions, dining, and related topics.`,
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        const result = response.choices[0].message.content || "";
        res.json({ response: result });
      } catch (error) {
        res.status(500).json({ error: "Failed to process assistant request" });
      }
    }
  );
}
