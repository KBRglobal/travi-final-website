import type { Express, Request, Response } from "express";
import { Router } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { eq, like, or, desc, and } from "drizzle-orm";
import {
  safeMode,
  rateLimiters,
  checkAiUsageLimit,
  requireAuth,
  requirePermission,
} from "../security";
import {
  generateContentImages,
  generateImage,
  type GeneratedImage,
  type ImageGenerationOptions
} from "../ai";
import {
  getAIClient,
  getAllAIClients,
  getAllUnifiedProviders,
  markProviderFailed,
  markProviderSuccess,
  getOpenAIClient,
  getProviderStatus,
} from "../ai/providers";
import { enforceArticleSEO, enforceWriterEngineSEO } from "../seo-enforcement";
import { getStorageManager } from "../services/storage-adapter";
import { uploadImageFromUrl } from "../services/image-service";

function cleanJsonFromMarkdown(content: string): string {
  let cleaned = content.trim();
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  } else {
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
  }
  cleaned = cleaned.trim() || "{}";
  cleaned = cleaned.replace(/"([^"\\]|\\.)*"/g, (match) => {
    return match
      .replace(/[\x00-\x1F\x7F]/g, (char) => {
        const code = char.charCodeAt(0);
        if (code === 0x09) return '\\t';
        if (code === 0x0A) return '\\n';
        if (code === 0x0D) return '\\r';
        return `\\u${code.toString(16).padStart(4, '0')}`;
      });
  });
  return cleaned;
}

function safeParseJson(content: string, fallback: Record<string, unknown> = {}): any {
  try {
    const cleaned = cleanJsonFromMarkdown(content);
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("[JSON Parse] Failed to parse JSON, returning fallback:", e);
    return fallback;
  }
}

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

function addSystemLog(level: string, category: string, message: string, _details?: Record<string, unknown>) {
  if (typeof (global as any).addSystemLog === 'function') {
    (global as any).addSystemLog(level, category, message, _details);
  } else {
    console.log(`[${level.toUpperCase()}] [${category}] ${message}`);
  }
}

interface ArticleImageResult {
  url: string;
  altText: string;
  imageId: string;
  source: 'library' | 'freepik';
}

async function findOrCreateArticleImage(
  topic: string,
  keywords: string[],
  category: string
): Promise<ArticleImageResult | null> {
  console.log(`[Image Finder] Searching for image: topic="${topic}", category="${category}", keywords=${JSON.stringify(keywords)}`);
  
  try {
    const { aiGeneratedImages } = await import("@shared/schema");
    
    const searchTerms = [topic, ...keywords].filter(Boolean);
    const searchConditions = searchTerms.map(term => 
      or(
        like(aiGeneratedImages.topic, `%${term}%`),
        like(aiGeneratedImages.altText, `%${term}%`),
        like(aiGeneratedImages.category, `%${term}%`)
      )
    );
    
    let foundImage = null;
    
    if (searchConditions.length > 0) {
      const approvedImages = await db.select()
        .from(aiGeneratedImages)
        .where(and(
          eq(aiGeneratedImages.isApproved, true),
          or(...searchConditions)
        ))
        .orderBy(desc(aiGeneratedImages.usageCount))
        .limit(1);
      
      if (approvedImages.length > 0) {
        foundImage = approvedImages[0];
        console.log(`[Image Finder] Found approved library image: ${foundImage.id}`);
      } else {
        const anyImages = await db.select()
          .from(aiGeneratedImages)
          .where(or(...searchConditions))
          .orderBy(desc(aiGeneratedImages.createdAt))
          .limit(1);
        
        if (anyImages.length > 0) {
          foundImage = anyImages[0];
          console.log(`[Image Finder] Found library image (not approved): ${foundImage.id}`);
        }
      }
    }
    
    if (!foundImage) {
      const categoryImages = await db.select()
        .from(aiGeneratedImages)
        .where(eq(aiGeneratedImages.category, category))
        .orderBy(desc(aiGeneratedImages.isApproved), desc(aiGeneratedImages.createdAt))
        .limit(1);
      
      if (categoryImages.length > 0) {
        foundImage = categoryImages[0];
        console.log(`[Image Finder] Found category fallback image: ${foundImage.id}`);
      }
    }
    
    if (foundImage) {
      await db.update(aiGeneratedImages)
        .set({ usageCount: (foundImage.usageCount || 0) + 1, updatedAt: new Date() })
        .where(eq(aiGeneratedImages.id, foundImage.id));
      
      return {
        url: foundImage.url,
        altText: foundImage.altText || `${topic} - Dubai Travel`,
        imageId: foundImage.id,
        source: 'library'
      };
    }
    
    console.log(`[Image Finder] No library images found, trying Freepik...`);
    
    const freepikApiKey = process.env.FREEPIK_API_KEY;
    if (!freepikApiKey) {
      console.log(`[Image Finder] Freepik API key not configured, skipping`);
      return null;
    }
    
    const searchQuery = `dubai ${topic} tourism`.substring(0, 100);
    const searchUrl = new URL("https://api.freepik.com/v1/resources");
    searchUrl.searchParams.set("term", searchQuery);
    searchUrl.searchParams.set("page", "1");
    searchUrl.searchParams.set("limit", "5");
    searchUrl.searchParams.set("filters[content_type][photo]", "1");
    
    const freepikResponse = await fetch(searchUrl.toString(), {
      headers: {
        "Accept-Language": "en-US",
        "Accept": "application/json",
        "x-freepik-api-key": freepikApiKey,
      },
    });
    
    if (!freepikResponse.ok) {
      console.error(`[Image Finder] Freepik search failed: ${freepikResponse.status}`);
      return null;
    }
    
    const freepikData = await freepikResponse.json();
    const results = freepikData.data || [];
    
    if (results.length === 0) {
      console.log(`[Image Finder] No Freepik results found for: ${searchQuery}, trying AI generation...`);
      
      try {
        const aiImages = await generateContentImages({
          contentType: 'article',
          title: topic,
          description: `Dubai travel article about ${topic}`,
          style: 'photorealistic',
          generateHero: true,
          generateContentImages: false,
        });
        
        if (aiImages && aiImages.length > 0) {
          const aiImage = aiImages[0];
          console.log(`[Image Finder] AI generated image: ${aiImage.url}`);
          
          const [savedImage] = await db.insert(aiGeneratedImages).values({
            filename: aiImage.filename,
            url: aiImage.url,
            topic: topic,
            category: category || "general",
            imageType: "hero",
            source: "openai" as const,
            prompt: `Dubai travel image for: ${topic}`,
            keywords: keywords.slice(0, 10),
            altText: aiImage.alt || `${topic} - Dubai Travel`,
            caption: aiImage.caption || topic,
            size: 0,
            usageCount: 1,
          }).returning();
          
          return {
            url: aiImage.url,
            altText: aiImage.alt || `${topic} - Dubai Travel`,
            imageId: savedImage.id,
            source: 'library' as const
          };
        }
      } catch (aiError) {
        console.error(`[Image Finder] AI image generation failed:`, aiError);
      }
      
      return null;
    }
    
    const bestResult = results[0];
    const imageUrl = bestResult.image?.source?.url || bestResult.preview?.url || bestResult.thumbnail?.url;
    
    if (!imageUrl) {
      console.log(`[Image Finder] No usable image URL from Freepik result`);
      return null;
    }
    
    console.log(`[Image Finder] Importing Freepik image: ${bestResult.id}`);
    
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      console.error(`[Image Finder] Failed to fetch Freepik image: ${imageResponse.status}`);
      return null;
    }
    
    const imageBuffer = await imageResponse.arrayBuffer();
    const filename = `freepik-${Date.now()}.jpg`;

    const storageManager = getStorageManager();
    const storagePath = `public/images/${filename}`;
    const result = await storageManager.upload(storagePath, Buffer.from(imageBuffer));
    const persistedUrl = result.url;
    
    const altText = bestResult.title || `${topic} - Dubai Travel`;
    
    const [savedImage] = await db.insert(aiGeneratedImages).values({
      filename,
      url: persistedUrl,
      topic: topic,
      category: category || "general",
      imageType: "hero",
      source: "freepik" as const,
      prompt: null,
      keywords: keywords.slice(0, 10),
      altText: altText,
      caption: bestResult.title || topic,
      size: imageBuffer.byteLength,
      usageCount: 1,
    }).returning();
    
    console.log(`[Image Finder] Successfully imported Freepik image: ${savedImage.id}`);
    
    return {
      url: persistedUrl,
      altText: altText,
      imageId: savedImage.id,
      source: 'freepik'
    };
  } catch (error) {
    console.error(`[Image Finder] Error finding/creating article image:`, error);
    return null;
  }
}

export function registerAiApiRoutes(app: Express): void {
  const router = Router();

  router.get("/status", async (req, res) => {
    try {
      const aiClient = getAIClient();
      const hasOpenAI = !!getOpenAIClient();
      const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GEMINI || process.env.gemini);
      const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.openrouterapi || process.env.OPENROUTERAPI || process.env.travisite);
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
        }
      });
    } catch (error) {
      console.error("Error checking AI status:", error);
      res.status(500).json({ error: "Failed to check AI status" });
    }
  });

  router.post("/generate", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    try {
      const { aiWritersContentGenerator } = await import("../ai/writers/content-generator");

      const { type, topic, keywords, writerId, locale, length, tone, targetAudience, additionalContext } = req.body;

      if (!type || !topic) {
        return res.status(400).json({ error: "Type and topic are required" });
      }

      const result = await aiWritersContentGenerator.generate({
        writerId,
        contentType: type,
        topic,
        keywords: keywords || [],
        locale: locale || 'en',
        length: length || 'medium',
        tone,
        targetAudience,
        additionalContext,
      });

      res.json({
        ...result,
        _system: 'ai-writers',
      });
    } catch (error) {
      console.error("Error generating AI content:", error);
      const message = error instanceof Error ? error.message : "Failed to generate content";
      res.status(500).json({ error: message });
    }
  });

  router.post("/suggest-internal-links", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({ error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi." });
      }
      const { client: openai, provider } = aiClient;

      const { contentId, text } = req.body;

      const allContents = await storage.getContents();
      const otherContents = allContents.filter(c => c.id !== contentId);

      if (otherContents.length === 0) {
        return res.json({ suggestions: [] });
      }

      const contentList = otherContents.map(c => `- ${c.title} (${c.type}): ${c.slug}`).join("\n");

      const response = await openai.chat.completions.create({
        model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
        messages: [
          {
            role: "system",
            content: "You are an SEO expert. Suggest internal links that would naturally fit within the given text. Only suggest links that are contextually relevant.",
          },
          {
            role: "user",
            content: `Given this content:\n\n${text}\n\nAnd these available pages to link to:\n${contentList}\n\nSuggest up to 5 internal links. For each suggestion, provide the anchor text and the target slug.\n\nFormat as JSON: { "suggestions": [{ "anchorText": "...", "targetSlug": "...", "reason": "..." }] }`,
          },
        ],
        response_format: { type: "json_object" },
      });

      markProviderSuccess(provider);
      const suggestions = safeParseJson(response.choices[0].message.content || '{"suggestions":[]}', { suggestions: [] });
      res.json(suggestions);
    } catch (error) {
      console.error("Error suggesting internal links:", error);
      res.status(500).json({ error: "Failed to suggest internal links" });
    }
  });

  router.post("/generate-article", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      addSystemLog("warning", "ai", "AI article generation blocked - safe mode enabled");
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const aiProviders = getAllAIClients();
      if (aiProviders.length === 0) {
        addSystemLog("error", "ai", "AI article generation failed - no AI provider configured (need OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or openrouterapi)");
        return res.status(503).json({ error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI_API_KEY, ANTHROPIC_API_KEY, or openrouterapi to Secrets." });
      }

      addSystemLog("info", "ai", `Available AI providers: ${aiProviders.map(p => p.provider).join(", ")}`);

      const { title, topic, summary, sourceUrl, sourceText, inputType = "title_only" } = req.body;

      const articleTitle = title || topic;

      if (!articleTitle) {
        addSystemLog("warning", "ai", "AI article generation failed - no title provided");
        return res.status(400).json({ error: "Title is required" });
      }

      addSystemLog("info", "ai", `Starting AI article generation: "${articleTitle}"`, { inputType });

      let contextInfo = `Title: "${articleTitle}"`;
      if (summary) contextInfo += `\nSummary: ${summary}`;
      if (sourceText) contextInfo += `\nSource text: ${sourceText}`;
      if (sourceUrl) contextInfo += `\nSource URL: ${sourceUrl}`;

      const systemPrompt = `You are an expert Dubai travel news content writer for a CMS. You MUST follow ALL these rules:

PERSONALITY BANK (A-E):
A. Professional Travel Expert - authoritative, factual, trustworthy
B. Enthusiastic Explorer - energetic, inspiring, adventure-focused  
C. Luxury Curator - sophisticated, refined, premium-focused
D. Practical Guide - helpful, organized, detail-oriented
E. Local Insider - authentic, personal, culturally aware

CONTENT CATEGORIES:
A. Attractions & Activities
B. Hotels  
C. Dining/Food
D. Transportation/Logistics
E. Events/Festivals
F. Tips/Guides
G. News/Regulations
H. Shopping & Deals

URGENCY LEVELS:
- Urgent (this week)
- Relevant (1-2 months)
- Evergreen

AUDIENCE TYPES: Families, Couples, Budget, Luxury, Business

STRICT RULES:
1. No hallucinations about prices, laws, or dates - say "as of latest public information" if unsure
2. No fake names or invented quotes
3. Always traveler-focused and SEO-clean
4. Maximum 5 marketing vocabulary words per article
5. No duplicate sentences or unnatural keyword stuffing
6. Article length: MINIMUM 1800-2500 words - this is STRICTLY ENFORCED
7. Meta title: 50-65 characters
8. Meta description: 100-160 characters MAX (not more!)
9. Each FAQ answer: 50-100 words MINIMUM (250+ characters each)

OUTPUT FORMAT - Return valid JSON matching this exact structure:
{
  "meta": {
    "title": "SEO meta title 50-65 chars",
    "description": "SEO meta description 150-160 chars",
    "slug": "url-friendly-slug",
    "keywords": ["keyword1", "keyword2"],
    "ogTitle": "Open Graph title",
    "ogDescription": "Open Graph description"
  },
  "analysis": {
    "category": "A-H code and name",
    "tone": "enthusiastic/practical/serious/enticing/friendly",
    "personality": "A-E code and description",
    "structure": "news_guide/story_info/comparative/updates/lists",
    "uniqueAngle": "What makes this article valuable",
    "marketingWords": ["max", "5", "words"],
    "primaryKeyword": "main keyword",
    "secondaryKeywords": ["secondary1", "secondary2"],
    "lsiKeywords": ["lsi1", "lsi2", "lsi3"],
    "urgency": "urgent/relevant/evergreen",
    "audience": ["target", "audiences"]
  },
  "article": {
    "h1": "SEO-optimized clickable headline",
    "intro": "2-3 sentences with primary keyword, answering what happened and why travelers should care",
    "quickFacts": [
      {"label": "Location", "value": "..."},
      {"label": "Price/Cost", "value": "..."},
      {"label": "Hours", "value": "..."},
      {"label": "Best For", "value": "..."},
      {"label": "Getting There", "value": "..."},
      {"label": "Time Needed", "value": "..."},
      {"label": "Booking Notes", "value": "..."},
      {"label": "Best Time", "value": "..."}
    ],
    "sections": [
      {"heading": "Section H2", "body": "Detailed content following personality/tone..."}
    ],
    "proTips": ["Genuine, specific tip 1", "Genuine, specific tip 2"],
    "goodToKnow": ["Warning/restriction 1", "Seasonality note", "Local insight"],
    "faq": [
      {"q": "SEO-rich question?", "a": "100-150 word unique answer..."}
    ],
    "internalLinks": [
      {"anchor": "suggested anchor text", "suggestedTopic": "related topic to link"}
    ],
    "altTexts": ["Hero image alt", "Detail section alt", "Atmosphere photo alt"],
    "closing": "Short, practical, traveler-focused conclusion"
  },
  "suggestions": {
    "alternativeHeadlines": ["Option 1", "Option 2", "Option 3"],
    "alternativeIntros": ["Alternative intro 1", "Alternative intro 2"],
    "alternativeCta": "Alternative call to action if relevant"
  }
}`;

      const userPrompt = `Generate a complete Dubai travel news article based on:

${contextInfo}

Input type: ${inputType}

Follow ALL steps from the spec:
1. Perform internal analysis (category A-H, urgency, audience, personality A-E, tone, unique angle, structure, marketing words, keywords)
2. Generate all meta and structure data
3. Create the complete article with all required sections
4. Apply SEO optimization rules
5. Provide editor suggestions (3 alternative headlines, 2 alternative intros, alternative CTA)

CRITICAL WORD COUNT REQUIREMENTS:
- Article body MUST be AT LEAST 1800 words (9000 characters) - this is STRICTLY ENFORCED
- Each FAQ answer MUST be at least 50 words (250 characters)
- Generate 6-8 FAQ items with substantive, detailed answers
- Meta description MUST be between 100-160 characters (NOT more than 160!)
- The article will be REJECTED if it doesn't meet these minimums!

Return valid JSON only.`;

      let generatedArticle: any = null;
      let successfulProvider: string | null = null;
      let lastError: Error | null = null;

      for (const aiProvider of aiProviders) {
        const { client: openai, provider, model } = aiProvider;
        
        try {
          addSystemLog("info", "ai", `Trying AI provider: ${provider} with model: ${model}`);
          
          const response = await openai.chat.completions.create({
            model: model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
            max_tokens: 8000,
          });

          generatedArticle = safeParseJson(response.choices[0].message.content || "{}", {});
          successfulProvider = provider;
          markProviderSuccess(provider);
          addSystemLog("info", "ai", `Successfully generated with ${provider}`);
          break;
          
        } catch (providerError: any) {
          lastError = providerError;
          const isRateLimitError = providerError?.status === 429 || 
                                   providerError?.code === 'insufficient_quota' ||
                                   providerError?.message?.includes('quota') ||
                                   providerError?.message?.includes('429');
          const isCreditsError = providerError?.status === 402 ||
                                 providerError?.message?.includes('credits') ||
                                 providerError?.message?.includes('Insufficient Balance') ||
                                 providerError?.message?.includes('insufficient_funds');
          
          addSystemLog("warning", "ai", `Provider ${provider} failed: ${providerError?.message || 'Unknown error'}`, {
            status: providerError?.status,
            isRateLimit: isRateLimitError,
            isCredits: isCreditsError
          });
          
          if (isCreditsError) {
            markProviderFailed(provider, "no_credits");
            addSystemLog("info", "ai", `Marked ${provider} as out of credits, trying next provider...`);
          } else if (isRateLimitError) {
            markProviderFailed(provider, "rate_limited");
            addSystemLog("info", "ai", `Marked ${provider} as temporarily unavailable, trying next provider...`);
          }
        }
      }

      if (!generatedArticle || !successfulProvider) {
        const errorMsg = lastError?.message || 'All AI providers failed';
        addSystemLog("error", "ai", `All AI providers failed: ${errorMsg}`);
        return res.status(503).json({ 
          error: "All AI providers failed. Please check API quotas and try again later.",
          details: errorMsg,
          triedProviders: aiProviders.map(p => p.provider)
        });
      }

      const successfulClient = aiProviders.find(p => p.provider === successfulProvider);
      const openai = successfulClient!.client;
      const provider = successfulClient!.provider;
      const model = successfulClient!.model;
      
      const countWords = (text: string): number => text.trim().split(/\s+/).filter(w => w.length > 0).length;
      
      const getArticleWordCount = (article: any): number => {
        let totalWords = 0;
        if (article.article?.intro) totalWords += countWords(article.article.intro);
        if (article.article?.sections) {
          for (const section of article.article.sections) {
            if (section.body) totalWords += countWords(section.body);
          }
        }
        if (article.article?.proTips) {
          for (const tip of article.article.proTips) {
            totalWords += countWords(tip);
          }
        }
        if (article.article?.goodToKnow) {
          for (const item of article.article.goodToKnow) {
            totalWords += countWords(item);
          }
        }
        if (article.article?.faq) {
          for (const faq of article.article.faq) {
            if (faq.a) totalWords += countWords(faq.a);
          }
        }
        if (article.article?.closing) totalWords += countWords(article.article.closing);
        return totalWords;
      };

      const MIN_WORD_TARGET = 1800;
      const MAX_EXPANSION_ATTEMPTS = 3;
      let wordCount = getArticleWordCount(generatedArticle);
      let attempts = 0;

      addSystemLog("info", "ai", `Initial generation: ${wordCount} words`, { title: articleTitle });

      while (wordCount < MIN_WORD_TARGET && attempts < MAX_EXPANSION_ATTEMPTS) {
        attempts++;
        const wordsNeeded = MIN_WORD_TARGET - wordCount;
        addSystemLog("info", "ai", `Expanding content: attempt ${attempts}, need ${wordsNeeded} more words`);

        const expansionPrompt = `The article below has only ${wordCount} words but needs at least ${MIN_WORD_TARGET} words.

Current sections: ${generatedArticle.article?.sections?.map((s: any) => s.heading).join(", ") || "none"}

Please generate ${Math.max(3, Math.ceil(wordsNeeded / 200))} additional sections to expand this article about "${articleTitle}".
Each section should have 250-400 words of detailed, valuable content.

IMPORTANT: Generate NEW, UNIQUE sections that add value - do NOT repeat existing content.
Focus on practical tips, insider information, comparisons, or detailed guides.

Return JSON only:
{
  "additionalSections": [
    {"heading": "H2 Section Title", "body": "Detailed paragraph content 250-400 words..."}
  ],
  "additionalFaqs": [
    {"q": "Relevant question?", "a": "Detailed answer 80-120 words..."}
  ]
}`;

        try {
          const expansionResponse = await openai.chat.completions.create({
            model: model,
            messages: [
              { role: "system", content: "You are an expert Dubai travel content writer. Generate high-quality expansion content to meet word count requirements." },
              { role: "user", content: expansionPrompt },
            ],
            ...(provider === "openai" ? { response_format: { type: "json_object" } } : {}),
            max_tokens: 4000,
          });

          const expansion = safeParseJson(expansionResponse.choices[0].message.content || "{}", {});
          
          if (expansion.additionalSections && generatedArticle.article?.sections) {
            generatedArticle.article.sections = [
              ...generatedArticle.article.sections,
              ...expansion.additionalSections
            ];
          }
          if (expansion.additionalFaqs && generatedArticle.article?.faq) {
            generatedArticle.article.faq = [
              ...generatedArticle.article.faq,
              ...expansion.additionalFaqs
            ];
          }

          wordCount = getArticleWordCount(generatedArticle);
          addSystemLog("info", "ai", `After expansion ${attempts}: ${wordCount} words`);
        } catch (expansionError) {
          console.error("Expansion attempt failed:", expansionError);
          break;
        }
      }

      if (wordCount < MIN_WORD_TARGET) {
        addSystemLog("warning", "ai", `Article generated with only ${wordCount} words (minimum: ${MIN_WORD_TARGET})`, { title: articleTitle });
      } else {
        addSystemLog("info", "ai", `Article meets word count requirement: ${wordCount} words`, { title: articleTitle });
      }
      
      generatedArticle._generationStats = {
        wordCount,
        meetsMinimum: wordCount >= MIN_WORD_TARGET,
        expansionAttempts: attempts,
        sectionsCount: generatedArticle.article?.sections?.length || 0,
        faqCount: generatedArticle.article?.faq?.length || 0
      };
      
      let heroImage = null;
      try {
        const keywords = generatedArticle.meta?.keywords || [];
        const category = generatedArticle.analysis?.category?.charAt(0) || "F";
        const categoryMap: Record<string, string> = {
          "A": "attractions",
          "B": "hotels", 
          "C": "food",
          "D": "transport",
          "E": "events",
          "F": "tips",
          "G": "news",
          "H": "shopping",
        };
        const mappedCategory = categoryMap[category] || "general";
        
        console.log(`[AI Article] Fetching image for: "${articleTitle}", category: ${mappedCategory}`);
        
        const imageResult = await findOrCreateArticleImage(articleTitle, keywords, mappedCategory);
        if (imageResult) {
          heroImage = {
            url: imageResult.url,
            alt: imageResult.altText,
            source: imageResult.source,
            imageId: imageResult.imageId
          };
          console.log(`[AI Article] Found image from ${imageResult.source}: ${imageResult.url}`);
        } else {
          console.log(`[AI Article] No image found for article`);
        }
      } catch (imageError) {
        console.error("[AI Article] Error fetching image:", imageError);
      }
      
      const enforcedArticle = enforceArticleSEO(generatedArticle);
      
      res.json({
        ...enforcedArticle,
        heroImage
      });
    } catch (error) {
      console.error("Error generating AI article:", error);
      res.status(500).json({ error: "Failed to generate article" });
    }
  });

  router.post("/generate-seo-schema", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({ error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi." });
      }
      const { client: openai, provider } = aiClient;

      const { type, title, description, data } = req.body;

      let schemaType = "WebPage";
      if (type === "attraction") schemaType = "TouristAttraction";
      else if (type === "hotel") schemaType = "Hotel";
      else if (type === "article") schemaType = "Article";

      const response = await openai.chat.completions.create({
        model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
        messages: [
          {
            role: "system",
            content: "You are an SEO expert. Generate valid JSON-LD structured data for the given content.",
          },
          {
            role: "user",
            content: `Generate JSON-LD schema for a ${schemaType}:
Title: ${title}
Description: ${description}
Additional data: ${JSON.stringify(data)}

Return valid JSON-LD that can be embedded in a webpage.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const schema = safeParseJson(response.choices[0].message.content || "{}", {});
      res.json(schema);
    } catch (error) {
      console.error("Error generating SEO schema:", error);
      res.status(500).json({ error: "Failed to generate SEO schema" });
    }
  });

  router.post("/generate-hotel", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const { name, keywords } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Hotel name is required" });
      }

      const { aiWritersContentGenerator } = await import("../ai/writers/content-generator");
      const result = await aiWritersContentGenerator.generate({
        contentType: 'hotel',
        topic: name.trim(),
        keywords: keywords || [name.trim()],
        length: 'long',
      });

      const enforced = enforceWriterEngineSEO(result);
      res.json({ ...enforced, _system: 'ai-writers' });
    } catch (error) {
      console.error("Error generating hotel content:", error);
      const message = error instanceof Error ? error.message : "Failed to generate hotel content";
      res.status(500).json({ error: message });
    }
  });

  router.post("/generate-attraction", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const { name, primaryKeyword, keywords } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Attraction name is required" });
      }

      const { aiWritersContentGenerator } = await import("../ai/writers/content-generator");
      const result = await aiWritersContentGenerator.generate({
        contentType: 'attraction',
        topic: name.trim(),
        keywords: keywords || [primaryKeyword?.trim() || name.trim()],
        length: 'long',
      });

      const enforced = enforceWriterEngineSEO(result);
      res.json({ ...enforced, _system: 'ai-writers' });
    } catch (error) {
      console.error("Error generating attraction content:", error);
      const message = error instanceof Error ? error.message : "Failed to generate attraction content";
      res.status(500).json({ error: message });
    }
  });

  router.post("/generate-section", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({ error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi." });
      }
      const { client: openai, provider } = aiClient;

      const { sectionType, title, existingContent, contentType } = req.body;

      if (!sectionType || !title) {
        return res.status(400).json({ error: "Section type and title are required" });
      }

      const validSections = ["faq", "tips", "highlights"];
      if (!validSections.includes(sectionType)) {
        return res.status(400).json({ error: "Invalid section type. Must be: faq, tips, or highlights" });
      }

      let prompt = "";
      const systemPrompt = `You are a Dubai travel content expert. Generate high-quality, SEO-optimized content for the "${title}" page.
Based on the existing content context, generate ONLY the requested section. Output valid JSON.`;

      const contextInfo = existingContent ? `\n\nExisting content context:\n${existingContent.substring(0, 3000)}` : "";

      if (sectionType === "faq") {
        prompt = `Generate 8 frequently asked questions with detailed answers for "${title}" (${contentType || "attraction"}).
${contextInfo}

Generate practical, helpful FAQs that visitors would actually ask.
Each answer should be 100-150 words with specific, actionable information.

Output format:
{
  "faqs": [
    {"question": "What are the opening hours of ${title}?", "answer": "Detailed 100-150 word answer..."},
    {"question": "How much do tickets cost?", "answer": "Detailed answer with prices..."},
    ...8 total FAQs
  ]
}`;
      } else if (sectionType === "tips") {
        prompt = `Generate 7-8 insider tips for visiting "${title}" (${contentType || "attraction"}).
${contextInfo}

Tips should be practical, specific, and actionable - not generic advice.
Each tip should be 30-50 words.

Output format:
{
  "tips": [
    "Book tickets online at least 2 days in advance to skip the queue and save 15% on entry fees.",
    "Visit during weekday mornings (9-11 AM) for smaller crowds and better photo opportunities.",
    ...7-8 total tips
  ]
}`;
      } else if (sectionType === "highlights") {
        prompt = `Generate 6 key highlights/experiences for "${title}" (${contentType || "attraction"}).
${contextInfo}

Each highlight should describe a specific experience or feature that visitors can enjoy.
Include the highlight title and a 50-80 word description.

Output format:
{
  "highlights": [
    {"title": "Observation Deck Experience", "description": "50-80 word detailed description of this highlight..."},
    {"title": "Interactive Exhibits", "description": "Description..."},
    ...6 total highlights
  ]
}`;
      }

      const response = await openai.chat.completions.create({
        model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      const result = safeParseJson(response.choices[0].message.content || "{}", {});
      console.log(`[AI Section] Generated ${sectionType} for "${title}" using ${provider}`);
      res.json(result);
    } catch (error) {
      console.error("Error generating section content:", error);
      const message = error instanceof Error ? error.message : "Failed to generate section content";
      res.status(500).json({ error: message });
    }
  });

  router.post("/generate-dining", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const { name, keywords } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Restaurant name is required" });
      }

      const { aiWritersContentGenerator } = await import("../ai/writers/content-generator");
      const result = await aiWritersContentGenerator.generate({
        contentType: 'dining',
        topic: name.trim(),
        keywords: keywords || [name.trim()],
        length: 'long',
      });

      const enforced = enforceWriterEngineSEO(result);
      res.json({ ...enforced, _system: 'ai-writers' });
    } catch (error) {
      console.error("Error generating dining content:", error);
      const message = error instanceof Error ? error.message : "Failed to generate dining content";
      res.status(500).json({ error: message });
    }
  });

  router.post("/generate-district", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const { name, keywords } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "District name is required" });
      }

      const { aiWritersContentGenerator } = await import("../ai/writers/content-generator");
      const result = await aiWritersContentGenerator.generate({
        contentType: 'district',
        topic: name.trim(),
        keywords: keywords || [name.trim()],
        length: 'long',
      });

      const enforced = enforceWriterEngineSEO(result);
      res.json({ ...enforced, _system: 'ai-writers' });
    } catch (error) {
      console.error("Error generating district content:", error);
      const message = error instanceof Error ? error.message : "Failed to generate district content";
      res.status(500).json({ error: message });
    }
  });

  router.post("/generate-field", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const providers = getAllUnifiedProviders();
      
      const sortedProviders = [...providers].sort((a, b) => {
        if (a.name === 'gemini') return -1;
        if (b.name === 'gemini') return 1;
        return 0;
      });

      if (sortedProviders.length === 0) {
        return res.status(503).json({ error: "No AI providers available" });
      }

      const { fieldType, currentValue, title, contentType, primaryKeyword, maxLength } = req.body;
      
      if (!fieldType || !title || !contentType) {
        return res.status(400).json({ error: "fieldType, title, and contentType are required" });
      }

      const fieldPrompts: Record<string, string> = {
        metaTitle: `Generate 3 SEO-optimized meta titles (50-60 chars each) for a ${contentType} page about "${title}". 
Include the primary keyword "${primaryKeyword || title}" naturally. Make them compelling and click-worthy.
Format: Return ONLY a JSON array of 3 strings, like: ["Title 1", "Title 2", "Title 3"]`,

        metaDescription: `Generate 3 meta descriptions (150-160 chars each) for "${title}" (${contentType}). 
Include keyword "${primaryKeyword || title}" and a clear call-to-action. Make them engaging for search results.
Format: Return ONLY a JSON array of 3 strings.`,

        keyword: `Suggest 3 primary keywords for a ${contentType} page about "${title}". 
Consider Dubai context, search intent, and SEO best practices. Format them as exact keywords (2-4 words each).
Format: Return ONLY a JSON array of 3 strings.`,

        intro: `Write 3 different intro paragraphs (60 words, 3 sentences each) for "${title}" (${contentType}). 
Make them compelling, conversational, and engaging. Include keyword "${primaryKeyword || title}" naturally.
Format: Return ONLY a JSON array of 3 strings.`,

        expandedIntro: `Write 3 expanded introduction texts (150-200 words each) for "${title}" (${contentType}). 
Provide rich context, highlight key aspects, and engage readers. Use natural keyword "${primaryKeyword || title}" integration.
Format: Return ONLY a JSON array of 3 strings.`,

        tips: `Generate 3 sets of visitor/traveler tips for "${title}" (${contentType}). 
Each set should have 5-7 practical, actionable tips. Focus on insider knowledge and value.
Format: Return ONLY a JSON array where each element is a string with tips separated by newlines.`,

        highlights: `Generate 3 sets of key highlights for "${title}" (${contentType}). 
Each set should have 5-6 highlights that showcase the best features or experiences. Be specific and compelling.
Format: Return ONLY a JSON array where each element is a string with highlights separated by newlines.`,

        quickInfo: `Generate 3 sets of quick info items for "${title}" (${contentType}). 
Each set should include 6-8 key facts (location, hours, price, duration, etc.) in "Label: Value" format.
Format: Return ONLY a JSON array where each element is a string with info items separated by newlines.`,

        altText: `Generate 3 SEO-friendly alt text options for the hero image of "${title}" (${contentType}). 
Each should be 125-150 chars, descriptive, include keyword "${primaryKeyword || title}", and describe visual elements.
Format: Return ONLY a JSON array of 3 strings.`,

        secondaryKeywords: `Based on the primary keyword "${primaryKeyword || title}" for a ${contentType} page about "${title}", 
generate 3 sets of 5-8 secondary/LSI keywords each. Focus on Dubai travel context, related search terms, and long-tail variations.
Each set should cover different semantic aspects: synonyms, related topics, question-based keywords, and location variations.
Format: Return ONLY a JSON array of 3 strings, where each string contains comma-separated keywords.`,

        internalLinks: `For a ${contentType} page about "${title}" with primary keyword "${primaryKeyword || title}", 
suggest 5-8 internal linking opportunities. Consider related Dubai travel topics like:
- Nearby attractions, districts, hotels
- Related activities, dining, transport
- Complementary content (if beach -> water sports, if hotel -> nearby restaurants)
Format: Return ONLY a JSON array of 3 different sets of suggestions. Each element is a string with link suggestions in format "Anchor Text | Target Topic" separated by newlines.`,

        externalLinks: `For a ${contentType} page about "${title}" with keyword "${primaryKeyword || title}",
suggest 5-6 authoritative external sources to link to. Focus on:
- Official tourism websites (Visit Dubai, DTCM)
- Government resources (Dubai.ae, UAE official sites)
- Reputable travel guides (Lonely Planet, TripAdvisor, Time Out Dubai)
- Official venue/brand websites
Format: Return ONLY a JSON array of 3 different sets. Each element is a string with suggestions in format "Anchor Text | URL or Domain" separated by newlines.`,
      };

      const prompt = fieldPrompts[fieldType as keyof typeof fieldPrompts];
      if (!prompt) {
        return res.status(400).json({ error: `Invalid fieldType: ${fieldType}` });
      }

      let content = "[]";
      let lastError: Error | null = null;
      
      for (const provider of sortedProviders) {
        try {
          console.log(`[AI Field] Trying provider: ${provider.name}`);
          const result = await provider.generateCompletion({
            messages: [
              {
                role: "system",
                content: "You are an expert SEO content writer specializing in Dubai travel content. Generate high-quality, optimized suggestions. Always return valid JSON arrays of strings."
              },
              {
                role: "user",
                content: prompt
              }
            ],
            temperature: 0.8,
            maxTokens: 1024,
          });
          content = result.content;
          markProviderSuccess(provider.name);
          console.log(`[AI Field] Success with provider: ${provider.name}`);
          break;
        } catch (providerError: any) {
          console.error(`[AI Field] Provider ${provider.name} failed:`, providerError);
          lastError = providerError instanceof Error ? providerError : new Error(String(providerError));
          const isCreditsError = providerError?.status === 402 ||
                                 providerError?.message?.includes('credits') ||
                                 providerError?.message?.includes('Insufficient Balance');
          markProviderFailed(provider.name, isCreditsError ? "no_credits" : "rate_limited");
        }
      }

      if (content === "[]" && lastError) {
        throw lastError;
      }
      
      let suggestions: string[];
      try {
        suggestions = JSON.parse(content);
        if (!Array.isArray(suggestions)) {
          throw new Error("Response is not an array");
        }
      } catch (parseError) {
        suggestions = content.split('\n').filter(s => s.trim().length > 0).slice(0, 3);
      }

      if (maxLength) {
        suggestions = suggestions.map(s => s.length > maxLength ? s.substring(0, maxLength - 3) + '...' : s);
      }

      res.json({ suggestions });
    } catch (error) {
      console.error("Error generating field suggestions:", error);
      const message = error instanceof Error ? error.message : "Failed to generate field suggestions";
      res.status(500).json({ error: message });
    }
  });

  router.post("/generate-article-simple", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const { topic, category, keywords } = req.body;
      if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
        return res.status(400).json({ error: "Article topic is required" });
      }

      const { aiWritersContentGenerator } = await import("../ai/writers/content-generator");
      const result = await aiWritersContentGenerator.generate({
        contentType: 'article',
        topic: topic.trim(),
        keywords: keywords || [topic.trim()],
        length: 'long',
        additionalContext: category ? `Category: ${category}` : undefined,
      });

      const enforced = enforceWriterEngineSEO(result);
      res.json({ ...enforced, _system: 'ai-writers' });
    } catch (error) {
      console.error("Error generating article content:", error);
      const message = error instanceof Error ? error.message : "Failed to generate article content";
      res.status(500).json({ error: message });
    }
  });

  router.post("/generate-images", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      addSystemLog("warning", "images", "AI image generation blocked - safe mode enabled");
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const { contentType, title, description, location, generateHero, generateContentImages: genContentImages, contentImageCount } = req.body;

      if (!contentType || !title) {
        addSystemLog("warning", "images", "AI image generation failed - missing content type or title");
        return res.status(400).json({ error: "Content type and title are required" });
      }

      const validContentTypes = ['hotel', 'attraction', 'article', 'dining', 'district', 'transport', 'event', 'itinerary'];
      if (!validContentTypes.includes(contentType)) {
        addSystemLog("warning", "images", `AI image generation failed - invalid content type: ${contentType}`);
        return res.status(400).json({ error: "Invalid content type" });
      }

      const hasOpenAI = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
      const hasReplicate = !!process.env.REPLICATE_API_KEY;
      const hasFreepik = !!process.env.FREEPIK_API_KEY;

      if (!hasOpenAI && !hasReplicate) {
        addSystemLog("info", "images", `No AI image API configured, using ${hasFreepik ? 'Freepik' : 'Unsplash'} fallback`);

        const searchQuery = encodeURIComponent(`${title} ${contentType} dubai travel`.substring(0, 50));
        const fallbackImages: GeneratedImage[] = [];

        if (generateHero !== false) {
          const heroUrl = `https://source.unsplash.com/1200x800/?${searchQuery}`;
          fallbackImages.push({
            url: heroUrl,
            filename: `hero-${Date.now()}.jpg`,
            type: "hero",
            alt: `${title} - Dubai Travel`,
            caption: `${title} - Dubai Travel Guide`,
          });
        }

        addSystemLog("info", "images", `Generated ${fallbackImages.length} fallback images for "${title}"`);
        return res.json({
          images: fallbackImages,
          source: hasFreepik ? "freepik" : "unsplash",
          message: "Using stock images (AI image generation not configured)"
        });
      }

      addSystemLog("info", "images", `Starting AI image generation for: "${title}"`, { contentType, generateHero, hasOpenAI, hasReplicate });

      const options: ImageGenerationOptions = {
        contentType,
        title: title.trim(),
        description: description?.trim(),
        location: location?.trim(),
        generateHero: generateHero !== false,
        generateContentImages: genContentImages === true,
        contentImageCount: Math.min(contentImageCount || 0, 5),
      };

      console.log(`[AI Images] Starting generation for ${contentType}: "${title}" (OpenAI: ${hasOpenAI}, Replicate: ${hasReplicate})`);
      let images: GeneratedImage[] = [];

      try {
        images = await generateContentImages(options);
      } catch (genError) {
        addSystemLog("error", "images", `AI image generation error: ${genError instanceof Error ? genError.message : "Unknown error"}`);
        const searchQuery = encodeURIComponent(`${title} ${contentType} dubai travel`.substring(0, 50));
        images = [{
          url: `https://source.unsplash.com/1200x800/?${searchQuery}`,
          filename: `hero-${Date.now()}.jpg`,
          type: "hero",
          alt: `${title} - Dubai Travel`,
          caption: `${title} - Dubai Travel Guide`,
        }];
      }

      if (images.length === 0) {
        addSystemLog("warning", "images", `No images generated for "${title}", using fallback`);
        const searchQuery = encodeURIComponent(`${title} ${contentType} dubai travel`.substring(0, 50));
        images = [{
          url: `https://source.unsplash.com/1200x800/?${searchQuery}`,
          filename: `hero-${Date.now()}.jpg`,
          type: "hero",
          alt: `${title} - Dubai Travel`,
          caption: `${title} - Dubai Travel Guide`,
        }];
      }

      const storedImages: GeneratedImage[] = [];

      console.log(`[AI Images] Processing ${images.length} generated images...`);
      for (const image of images) {
        try {
          console.log(`[AI Images] Downloading and storing: ${image.filename}`);

          const result = await uploadImageFromUrl(image.url, image.filename, {
            source: "ai",
            altText: image.alt,
            metadata: { type: image.type, originalUrl: image.url },
          });

          if (result.success) {
            storedImages.push({
              ...image,
              url: result.image.url,
            });
            console.log(`[AI Images] Stored: ${result.image.url}`);
          } else {
            console.error(`[AI Images] Failed to store ${image.filename}:`, result.error);
          }
        } catch (imgError) {
          console.error(`[AI Images] Error storing image ${image.filename}:`, imgError);
        }
      }

      console.log(`Generated and stored ${storedImages.length} images for ${title}`);
      res.json({ images: storedImages, count: storedImages.length });
    } catch (error) {
      console.error("Error generating images:", error);
      const message = error instanceof Error ? error.message : "Failed to generate images";
      res.status(500).json({ error: message });
    }
  });

  router.post("/generate-single-image", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const { prompt, size, quality, style, filename } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const validSizes = ['1024x1024', '1792x1024', '1024x1792'];
      const imageSize = validSizes.includes(size) ? size : '1792x1024';

      console.log(`Generating single image with custom prompt`);
      const imageUrl = await generateImage(prompt, {
        size: imageSize as '1024x1024' | '1792x1024' | '1024x1792',
        quality: quality === 'standard' ? 'standard' : 'hd',
        style: style === 'vivid' ? 'vivid' : 'natural',
      });

      if (!imageUrl) {
        return res.status(500).json({ error: "Failed to generate image" });
      }

      const finalFilename = filename || `ai-image-${Date.now()}.jpg`;
      const result = await uploadImageFromUrl(imageUrl, finalFilename, {
        source: "ai",
        metadata: { prompt, size: imageSize, quality, style },
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to store generated image" });
      }

      res.json({ url: result.image.url, filename: result.image.filename });
    } catch (error) {
      console.error("Error generating single image:", error);
      const message = error instanceof Error ? error.message : "Failed to generate image";
      res.status(500).json({ error: message });
    }
  });

  router.post("/block-action", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({ error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi." });
      }
      const { client: openai, provider } = aiClient;

      const { action, content, context, targetLanguage } = req.body;

      if (!action || !content) {
        return res.status(400).json({ error: "Action and content are required" });
      }

      const validActions = ["rewrite", "expand", "shorten", "translate", "seo_optimize", "improve_grammar", "add_examples"];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: "Invalid action" });
      }

      let systemPrompt = "You are a professional content editor for a Dubai travel website.";
      let userPrompt = "";

      switch (action) {
        case "rewrite":
          userPrompt = `Rewrite the following text in a fresh, engaging way while keeping the same meaning and key information:\n\n${content}`;
          break;
        case "expand":
          userPrompt = `Expand the following text with more details, examples, and engaging information. Make it at least 50% longer while maintaining quality:\n\n${content}`;
          break;
        case "shorten":
          userPrompt = `Condense the following text to be more concise while keeping all important information. Aim for about half the length:\n\n${content}`;
          break;
        case "translate":
          const lang = targetLanguage || "Arabic";
          userPrompt = `Translate the following text to ${lang}. Maintain the tone and style:\n\n${content}`;
          break;
        case "seo_optimize":
          systemPrompt = "You are an SEO expert and content writer for a Dubai travel website.";
          userPrompt = `Optimize the following text for SEO. Improve keyword usage, add relevant terms naturally, and make it more search-engine friendly while keeping it readable and engaging:\n\n${content}${context ? `\n\nContext/Keywords to target: ${context}` : ""}`;
          break;
        case "improve_grammar":
          userPrompt = `Fix any grammar, spelling, or punctuation errors in the following text. Also improve sentence flow where needed:\n\n${content}`;
          break;
        case "add_examples":
          userPrompt = `Enhance the following text by adding relevant examples, specific details, or practical tips that would help travelers:\n\n${content}`;
          break;
      }

      const response = await openai.chat.completions.create({
        model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      });

      const result = response.choices[0].message.content || "";
      res.json({ result, action });
    } catch (error) {
      console.error("Error in AI block action:", error);
      res.status(500).json({ error: "Failed to process AI action" });
    }
  });

  router.post("/assistant", requirePermission("canCreate"), rateLimiters.ai, checkAiUsageLimit, async (req, res) => {
    if (safeMode.aiDisabled) {
      return res.status(503).json({ error: "AI features are temporarily disabled", code: "AI_DISABLED" });
    }
    try {
      const aiClient = getAIClient();
      if (!aiClient) {
        return res.status(503).json({ error: "AI service not configured. Please add OPENAI_API_KEY, GEMINI, or openrouterapi." });
      }
      const { client: openai, provider } = aiClient;

      const { prompt } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const response = await openai.chat.completions.create({
        model: provider === "openai" ? "gpt-4o" : getModelForProvider(provider),
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant for a Dubai travel content management system called "Travi CMS". 
You help content creators with:
- Generating topic ideas for articles about Dubai tourism
- Creating content outlines and structures
- Suggesting SEO keywords and optimization strategies
- Writing tips for engaging travel content
- General guidance on content management best practices

Keep responses concise but helpful. Use bullet points and formatting when appropriate.
Focus on Dubai travel, tourism, hotels, attractions, dining, and related topics.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const result = response.choices[0].message.content || "";
      res.json({ response: result });
    } catch (error) {
      console.error("Error in AI assistant:", error);
      res.status(500).json({ error: "Failed to process assistant request" });
    }
  });

  router.post("/score-content/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentScorer } = await import("../ai/content-scorer");
      const { contentId } = req.params;
      const result = await contentScorer.scoreContent(contentId);
      if (result) {
        res.json(result);
      } else {
        res.status(500).json({ error: "Failed to score content" });
      }
    } catch (error) {
      console.error("Error scoring content:", error);
      res.status(500).json({ error: "Failed to score content" });
    }
  });

  router.get("/content-score/:contentId", requireAuth, async (req, res) => {
    try {
      const { contentScorer } = await import("../ai/content-scorer");
      const { contentId } = req.params;
      const result = await contentScorer.getContentScore(contentId);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "No score found" });
      }
    } catch (error) {
      console.error("Error getting content score:", error);
      res.status(500).json({ error: "Failed to get content score" });
    }
  });

  router.post("/check-plagiarism/:contentId", requireAuth, async (req, res) => {
    try {
      const { plagiarismDetector } = await import("../ai/plagiarism-detector");
      const { contentId } = req.params;
      const { threshold } = req.body;
      const result = await plagiarismDetector.checkPlagiarism(contentId, threshold);
      res.json(result);
    } catch (error) {
      console.error("Error checking plagiarism:", error);
      res.status(500).json({ error: "Failed to check plagiarism" });
    }
  });

  router.post("/compare-texts", requireAuth, async (req, res) => {
    try {
      const { plagiarismDetector } = await import("../ai/plagiarism-detector");
      const { text1, text2 } = req.body;
      const similarity = await plagiarismDetector.compareTexts(text1, text2);
      res.json({ similarity });
    } catch (error) {
      console.error("Error comparing texts:", error);
      res.status(500).json({ error: "Failed to compare texts" });
    }
  });

  router.post("/visual-search", async (req, res) => {
    try {
      const { visualSearch } = await import("../ai/visual-search");
      const { imageUrl, limit } = req.body;
      const results = await visualSearch.searchByImage(imageUrl, limit);
      res.json({ results });
    } catch (error) {
      console.error("Error in visual search:", error);
      res.status(500).json({ error: "Failed to perform visual search" });
    }
  });

  router.post("/analyze-image", async (req, res) => {
    try {
      const { visualSearch } = await import("../ai/visual-search");
      const { imageUrl } = req.body;
      const analysis = await visualSearch.analyzeImage(imageUrl);
      if (analysis) {
        res.json(analysis);
      } else {
        res.status(500).json({ error: "Failed to analyze image" });
      }
    } catch (error) {
      console.error("Error analyzing image:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  app.use("/api/ai", router);

  app.get("/api/ai-images/:filename", async (req: Request, res: Response) => {
    const filename = req.params.filename;

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).send('Invalid filename');
      return;
    }

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      res.status(400).send('Invalid file type');
      return;
    }

    try {
      const objectPath = `public/ai-generated/${filename}`;
      const storageManager = getStorageManager();
      const buffer = await storageManager.download(objectPath);

      if (!buffer) {
        res.status(404).send('Image not found');
        return;
      }

      const contentTypes: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif',
      };

      res.set('Content-Type', contentTypes[ext || 'jpg'] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
    } catch (error) {
      console.error(`Error serving AI image ${filename}:`, error);
      res.status(404).send('Image not found');
    }
  });
}
