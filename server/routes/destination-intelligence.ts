/**
 * Destination Intelligence Routes
 * API endpoints for managing destination content health and AI generation
 * Uses database storage with Drizzle ORM
 */

import { Express, Request, Response } from "express";
import { requirePermission } from "../security";
import { createLogger } from "../lib/logger";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  destinations,
  destinationContent,
  aiGenerationLogs,
  type Destination,
  type DestinationContent,
  type InsertDestination,
  type InsertDestinationContent,
  type InsertAiGenerationLog,
  featuredSectionsUpdateSchema,
} from "@shared/schema";
import { generateContent, type GenerationOptions } from "../ai/content-generator";
import { validateThroughGateway, type ContentForValidation, type QualityGateResult } from "../lib/content-quality-gateway";
import { insertInternalLinks, type LinkingResult } from "../ai/internal-linking-engine";
import { getAllUnifiedProviders, markProviderFailed } from "../ai/providers";
import {
  autoImageGenerator,
  findDestinationsNeedingImages,
  generateDestinationImages,
  runDailyImageGeneration,
  getImageGenerationStats,
} from "../ai/auto-image-generator";

const logger = createLogger("destination-intelligence");

// Destination data configuration - seed data for the database
interface DestinationConfig {
  id: string;
  name: string;
  country: string;
  isActive: boolean;
}

/**
 * DEFAULT DESTINATIONS - SEED DATA
 * ========================================
 * These destinations are used to seed the database on first startup only.
 * Admin panel can create additional destinations via the destinations management page.
 * All destinations are stored in Railway PostgreSQL as the single source of truth.
 * Use is_active field to control visibility of destinations.
 */

const DESTINATIONS: DestinationConfig[] = [
  { id: "dubai", name: "Dubai", country: "UAE", isActive: true },
  { id: "paris", name: "Paris", country: "France", isActive: true },
  { id: "bangkok", name: "Bangkok", country: "Thailand", isActive: true },
  { id: "istanbul", name: "Istanbul", country: "Turkey", isActive: true },
  { id: "london", name: "London", country: "United Kingdom", isActive: true },
  { id: "new-york", name: "New York", country: "USA", isActive: true },
  { id: "singapore", name: "Singapore", country: "Singapore", isActive: true },
  { id: "tokyo", name: "Tokyo", country: "Japan", isActive: true },
  { id: "barcelona", name: "Barcelona", country: "Spain", isActive: true },
  { id: "rome", name: "Rome", country: "Italy", isActive: true },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", isActive: true },
  { id: "hong-kong", name: "Hong Kong", country: "China", isActive: true },
  { id: "las-vegas", name: "Las Vegas", country: "USA", isActive: true },
  { id: "abu-dhabi", name: "Abu Dhabi", country: "UAE", isActive: true },
  { id: "ras-al-khaimah", name: "Ras Al Khaimah", country: "UAE", isActive: true },
  { id: "los-angeles", name: "Los Angeles", country: "USA", isActive: true },
  { id: "miami", name: "Miami", country: "USA", isActive: true },
];

// Generated destination content structure
interface GeneratedDestinationContent {
  hero: {
    title: string;
    tagline: string;
    description: string;
  };
  trust: {
    visitors: string;
    hotels: string;
    attractions: string;
    restaurants: string;
  };
  attractions: Array<{
    name: string;
    description: string;
    category: string;
    imageHint: string;
  }>;
  districts: Array<{
    name: string;
    description: string;
    highlights: string[];
  }>;
  hotels: Array<{
    name: string;
    description: string;
    category: string;
    priceRange: string;
  }>;
  restaurants: Array<{
    name: string;
    description: string;
    cuisine: string;
    priceRange: string;
  }>;
  travelTips: Array<{
    title: string;
    tip: string;
    icon: string;
  }>;
  events: Array<{
    name: string;
    description: string;
    timing: string;
    type: string;
  }>;
}

/**
 * Seed the database with destinations if empty.
 * 
 * IMPORTANT: This function only seeds DEFAULT destinations on first startup.
 * Admin panel can create additional destinations at any time.
 * Railway PostgreSQL is the single source of truth - no purging of user-created destinations.
 */
async function seedDestinations() {
  try {
    // Only seed if database is empty
    const existing = await db.select().from(destinations).limit(1);
    
    if (existing.length === 0) {
      logger.info("Seeding destinations table with initial data");
      
      for (const dest of DESTINATIONS) {
        const normalizedName = dest.name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
        await db.insert(destinations).values({
          id: dest.id,
          name: dest.name,
          normalizedName,
          country: dest.country,
          slug: `/destinations/${dest.id}`,
          isActive: dest.isActive,
          status: dest.isActive ? "partial" : "empty",
          hasPage: dest.isActive,
          seoScore: 0,
          wordCount: 0,
          internalLinks: 0,
          externalLinks: 0,
          h2Count: 0,
        } as any).onConflictDoNothing();
      }
      
      logger.info(`Seeded ${DESTINATIONS.length} destinations`);
    } else {
      logger.info("Destinations table already has data, skipping seed");
    }
  } catch (error) {
    logger.error({ error: String(error) }, "Failed to seed destinations");
  }
}

// Build AI prompt for destination content generation
function buildDestinationPrompt(destination: Destination): string {
  return `Generate comprehensive travel content for ${destination.name}, ${destination.country} in JSON format.

The response must be valid JSON with this exact structure:
{
  "hero": {
    "title": "string - compelling headline for the destination",
    "tagline": "string - short catchy phrase",
    "description": "string - 2-3 sentences about the destination"
  },
  "trust": {
    "visitors": "string - annual visitor count (e.g., '16M+')",
    "hotels": "string - number of hotels (e.g., '800+')",
    "attractions": "string - number of attractions (e.g., '200+')",
    "restaurants": "string - number of restaurants (e.g., '12,000+')"
  },
  "attractions": [
    {
      "name": "string - attraction name",
      "description": "string - 1-2 sentence description",
      "category": "string - e.g., Landmark, Museum, Park",
      "imageHint": "string - image search term"
    }
  ],
  "districts": [
    {
      "name": "string - district name",
      "description": "string - 1-2 sentence description",
      "highlights": ["string", "string", "string"]
    }
  ],
  "hotels": [
    {
      "name": "string - hotel name",
      "description": "string - 1-2 sentence description",
      "category": "string - e.g., Luxury, Mid-Range, Budget",
      "priceRange": "string - e.g., $$$$, $$$, $$"
    }
  ],
  "restaurants": [
    {
      "name": "string - restaurant name",
      "description": "string - 1-2 sentence description",
      "cuisine": "string - type of cuisine",
      "priceRange": "string - e.g., $$$$, $$$, $$, $"
    }
  ],
  "travelTips": [
    {
      "title": "string - tip title",
      "tip": "string - practical travel tip",
      "icon": "string - suggested lucide icon name"
    }
  ],
  "events": [
    {
      "name": "string - event or festival name",
      "description": "string - 1-2 sentence description",
      "timing": "string - when it occurs",
      "type": "string - e.g., Festival, Cultural, Sports"
    }
  ]
}

Requirements:
- Include exactly 4 items in each array (attractions, districts, hotels, restaurants, travelTips, events)
- Use real, accurate information about ${destination.name}
- Focus on the most popular and notable places
- Keep descriptions concise but informative
- Include a mix of price ranges for hotels and restaurants
- Travel tips should be practical and useful for first-time visitors

Respond ONLY with the JSON object, no additional text.`;
}

// Generate content using AI providers with fallback and logging
async function generateDestinationContent(
  destination: Destination
): Promise<{ content: GeneratedDestinationContent; provider: string; model: string; duration: number }> {
  const providers = getAllUnifiedProviders();
  const startTime = Date.now();

  if (providers.length === 0) {
    throw new Error("No AI providers available");
  }

  const prompt = buildDestinationPrompt(destination);

  for (const provider of providers) {
    const attemptStart = Date.now();
    try {
      logger.info(`Generating content for ${destination.name} using ${provider.name}`);

      const result = await provider.generateCompletion({
        messages: [
          {
            role: "system",
            content:
              "You are a travel content expert. Generate accurate, engaging travel content in valid JSON format only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 4000,
        responseFormat: { type: "json_object" },
      });

      // Parse the JSON response
      let content: GeneratedDestinationContent;
      try {
        let jsonStr = result.content.trim();
        if (jsonStr.startsWith("```json")) {
          jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
        } else if (jsonStr.startsWith("```")) {
          jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
        }
        content = JSON.parse(jsonStr);
      } catch (parseError) {
        logger.warn({ error: String(parseError) }, `Failed to parse JSON from ${provider.name}`);
        throw new Error("Invalid JSON response from AI");
      }

      const duration = Date.now() - attemptStart;
      logger.info(`Successfully generated content for ${destination.name} using ${provider.name} in ${duration}ms`);
      
      return {
        content,
        provider: provider.name,
        model: provider.model || "unknown",
        duration,
      };
    } catch (error) {
      const duration = Date.now() - attemptStart;
      logger.warn({ error: String(error) }, `Provider ${provider.name} failed for ${destination.name}`);
      
      // Log the failed attempt
      await db.insert(aiGenerationLogs).values({
        targetType: "destination",
        targetId: destination.id,
        provider: provider.name,
        model: provider.model || "unknown",
        prompt: prompt.substring(0, 1000),
        success: false,
        error: String(error),
        duration,
      } as any);
      
      markProviderFailed(provider.name);
      continue;
    }
  }

  throw new Error("All AI providers failed to generate content");
}

// Calculate SEO metrics from generated content
function calculateSeoMetrics(content: GeneratedDestinationContent): {
  wordCount: number;
  h2Count: number;
  seoScore: number;
} {
  let wordCount = 0;
  let h2Count = 0;

  // Count words in hero
  wordCount += (content.hero.title + content.hero.tagline + content.hero.description).split(/\s+/).length;
  
  // Count sections and words
  const sections = ['attractions', 'districts', 'hotels', 'restaurants', 'travelTips', 'events'];
  h2Count = sections.length;

  for (const section of sections) {
    const items = content[section as keyof GeneratedDestinationContent];
    if (Array.isArray(items)) {
      for (const item of items) {
        wordCount += JSON.stringify(item).split(/\s+/).length;
      }
    }
  }

  // Calculate SEO score (simplified)
  let seoScore = 50; // Base score
  
  if (wordCount >= 1000) seoScore += 15;
  else if (wordCount >= 500) seoScore += 10;
  
  if (h2Count >= 4) seoScore += 15;
  else if (h2Count >= 2) seoScore += 10;
  
  if (content.hero.title && content.hero.description) seoScore += 10;
  if (content.attractions.length >= 4) seoScore += 5;
  if (content.hotels.length >= 4) seoScore += 5;

  return {
    wordCount,
    h2Count,
    seoScore: Math.min(100, seoScore),
  };
}

// Apply internal links to text content
function applyInternalLinks(
  content: GeneratedDestinationContent,
  destination: Destination
): { content: GeneratedDestinationContent; linksAdded: number } {
  let totalLinksAdded = 0;
  const processedContent = { ...content };

  // Process hero description - main text content
  if (processedContent.hero.description) {
    const heroResult = insertInternalLinks(processedContent.hero.description, {
      contentType: "destination",
      currentDestination: destination.name,
      currentId: destination.id,
      minLinks: 2,
      maxLinks: 4,
    });
    processedContent.hero.description = heroResult.content;
    totalLinksAdded += heroResult.linksAdded;
  }

  // Process attraction descriptions
  processedContent.attractions = content.attractions.map(attraction => {
    if (attraction.description && attraction.description.length > 50) {
      const result = insertInternalLinks(attraction.description, {
        contentType: "destination",
        currentDestination: destination.name,
        currentId: destination.id,
        minLinks: 0,
        maxLinks: 1,
      });
      totalLinksAdded += result.linksAdded;
      return { ...attraction, description: result.content };
    }
    return attraction;
  });

  // Process district descriptions
  processedContent.districts = content.districts.map(district => {
    if (district.description && district.description.length > 50) {
      const result = insertInternalLinks(district.description, {
        contentType: "destination",
        currentDestination: destination.name,
        currentId: destination.id,
        minLinks: 0,
        maxLinks: 1,
      });
      totalLinksAdded += result.linksAdded;
      return { ...district, description: result.content };
    }
    return district;
  });

  logger.info(`Applied ${totalLinksAdded} internal links to ${destination.name} content`);

  return {
    content: processedContent,
    linksAdded: totalLinksAdded,
  };
}

// Get all destination content merged together
async function getDestinationGeneratedContent(destinationId: string): Promise<GeneratedDestinationContent | null> {
  const contentRecords = await db
    .select()
    .from(destinationContent)
    .where(and(
      eq(destinationContent.destinationId, destinationId),
      eq(destinationContent.isActive, true)
    ))
    .orderBy(desc(destinationContent.createdAt));

  if (contentRecords.length === 0) {
    return null;
  }

  // Merge all content types into one object
  const merged: Partial<GeneratedDestinationContent> = {};
  
  for (const record of contentRecords) {
    const contentType = record.contentType as keyof GeneratedDestinationContent;
    if (record.content && !merged[contentType]) {
      merged[contentType] = record.content as any;
    }
  }

  // If we have the main hero content, return the full object
  if (merged.hero) {
    return merged as GeneratedDestinationContent;
  }

  return null;
}

export function registerDestinationIntelligenceRoutes(app: Express) {
  // Seed destinations on startup
  seedDestinations();

  /**
   * GET /api/destination-intelligence/status
   * Returns the status of all destinations with content health metrics
   */
  app.get(
    "/api/destination-intelligence/status",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        logger.info("Fetching destination intelligence status from database");

        // Get all destinations from database
        const allDestinations = await db.select().from(destinations);

        let completeCount = 0;
        let partialCount = 0;
        let emptyCount = 0;

        const destinationStatuses = allDestinations.map((dest) => {
          if (dest.status === "complete") completeCount++;
          else if (dest.status === "partial") partialCount++;
          else emptyCount++;

          // Calculate quality tier from SEO score
          const qualityTier = dest.seoScore !== null && dest.seoScore !== undefined
            ? dest.seoScore >= 90 ? "auto_approve"
              : dest.seoScore >= 80 ? "publish"
              : dest.seoScore >= 70 ? "review"
              : "draft"
            : undefined;

          return {
            id: dest.id,
            name: dest.name,
            country: dest.country,
            status: dest.status,
            hasPage: dest.hasPage,
            seoScore: dest.seoScore,
            wordCount: dest.wordCount,
            h2Count: dest.h2Count,
            internalLinks: dest.internalLinks,
            qualityTier,
            lastUpdated: dest.lastGenerated?.toISOString() || null,
          };
        });

        const activeDestinations = allDestinations.filter((d) => d.hasPage).length;
        const missingContent = allDestinations.filter(
          (d) => d.status === "empty" || d.status === "partial"
        ).length;

        // Calculate health score based on SEO scores and completeness
        const totalScore = allDestinations.reduce((sum, d) => sum + (d.seoScore || 0), 0);
        const healthScore = allDestinations.length > 0 
          ? Math.round(totalScore / allDestinations.length) 
          : 0;

        res.json({
          totalDestinations: allDestinations.length,
          activeDestinations,
          missingContent,
          healthScore,
          destinations: destinationStatuses,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to fetch destination status");
        res.status(500).json({ error: "Failed to fetch destination status" });
      }
    }
  );

  /**
   * POST /api/destination-intelligence/generate
   * Generates content for a single destination using AI and saves to database
   */
  app.post(
    "/api/destination-intelligence/generate",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { destinationId } = req.body;

        if (!destinationId) {
          return res.status(400).json({ error: "destinationId is required" });
        }

        // Get destination from database
        const [destination] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, destinationId));

        if (!destination) {
          return res.status(404).json({ error: "Destination not found" });
        }

        logger.info(`Starting content generation for ${destination.name}`);
        const startTime = Date.now();

        // Generate content
        const { content: generatedContent, provider, model, duration } = await generateDestinationContent(destination);

        // Apply internal links to the generated content
        const { content: linkedContent, linksAdded } = applyInternalLinks(generatedContent, destination);

        // Calculate SEO metrics (on linked content)
        const metrics = calculateSeoMetrics(linkedContent);

        // Validate through quality gateway
        const contentForValidation: ContentForValidation = {
          title: linkedContent.hero.title,
          metaTitle: `${destination.name} Travel Guide 2025 | Travi`,
          metaDescription: linkedContent.hero.description.substring(0, 160),
          content: JSON.stringify(linkedContent),
          contentType: "landing_page",
        };
        
        const validationResult = validateThroughGateway(contentForValidation);

        // Store content in database - save as separate content types
        const contentTypes: Array<{ type: string; data: any }> = [
          { type: "hero", data: linkedContent.hero },
          { type: "trust", data: linkedContent.trust },
          { type: "attractions", data: linkedContent.attractions },
          { type: "districts", data: linkedContent.districts },
          { type: "hotels", data: linkedContent.hotels },
          { type: "restaurants", data: linkedContent.restaurants },
          { type: "travelTips", data: linkedContent.travelTips },
          { type: "events", data: linkedContent.events },
        ];

        // Deactivate old content
        await db
          .update(destinationContent)
          .set({ isActive: false, updatedAt: new Date() } as any)
          .where(eq(destinationContent.destinationId, destinationId));

        // Insert new content records
        for (const ct of contentTypes) {
          await db.insert(destinationContent).values({
            destinationId: destinationId,
            contentType: ct.type,
            content: ct.data,
            seoValidation: validationResult.validation as any,
            qualityScore: validationResult.score,
            qualityTier: validationResult.tier,
            generatedBy: provider,
            generatedModel: model,
            version: 1,
            isActive: true,
          } as any);
        }

        // Update destination record with metrics
        await db
          .update(destinations)
          .set({
            status: "complete",
            hasPage: true,
            seoScore: validationResult.score,
            wordCount: metrics.wordCount,
            h2Count: metrics.h2Count,
            internalLinks: linksAdded,
            metaTitle: `${destination.name} Travel Guide 2025 | Travi`,
            metaDescription: linkedContent.hero.description.substring(0, 160),
            lastGenerated: new Date(),
            updatedAt: new Date(),
          } as any)
          .where(eq(destinations.id, destinationId));

        // Log successful generation
        await db.insert(aiGenerationLogs).values({
          targetType: "destination",
          targetId: destinationId,
          provider,
          model,
          prompt: buildDestinationPrompt(destination).substring(0, 1000),
          success: true,
          seoScore: validationResult.score,
          qualityTier: validationResult.tier,
          duration,
        } as any);

        logger.info(`Successfully generated and saved content for ${destination.name} with ${linksAdded} internal links`);

        res.json({
          success: true,
          message: `Content generated for ${destination.name}`,
          generatedContent: linkedContent,
          validation: {
            passed: validationResult.passed,
            score: validationResult.score,
            tier: validationResult.tier,
          },
          metrics: {
            wordCount: metrics.wordCount,
            h2Count: metrics.h2Count,
            internalLinks: linksAdded,
            seoScore: validationResult.score,
          },
          provider,
          model,
          duration,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Content generation failed");
        res.status(500).json({
          success: false,
          message: `Failed to generate content: ${String(error)}`,
        });
      }
    }
  );

  /**
   * POST /api/destination-intelligence/generate-all
   * Generates content for all destinations with missing content
   */
  app.post(
    "/api/destination-intelligence/generate-all",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        logger.info("Starting bulk content generation");

        const results: Array<{
          destinationId: string;
          name: string;
          success: boolean;
          error?: string;
          seoScore?: number;
        }> = [];

        let generated = 0;
        let failed = 0;

        // Get destinations that need content
        const destinationsToGenerate = await db
          .select()
          .from(destinations)
          .where(sql`${destinations.status} != 'complete'`);

        for (const destination of destinationsToGenerate) {
          try {
            const { content: generatedContent, provider, model, duration } = await generateDestinationContent(destination);
            
            // Apply internal links
            const { content: linkedContent, linksAdded } = applyInternalLinks(generatedContent, destination);
            const metrics = calculateSeoMetrics(linkedContent);

            // Validate through quality gateway
            const contentForValidation: ContentForValidation = {
              title: linkedContent.hero.title,
              metaTitle: `${destination.name} Travel Guide 2025 | Travi`,
              metaDescription: linkedContent.hero.description.substring(0, 160),
              content: JSON.stringify(linkedContent),
              contentType: "landing_page",
            };
            
            const validationResult = validateThroughGateway(contentForValidation);

            // Store content - deactivate old, insert new
            await db
              .update(destinationContent)
              .set({ isActive: false, updatedAt: new Date() } as any)
              .where(eq(destinationContent.destinationId, destination.id));

            const contentTypes = [
              { type: "hero", data: linkedContent.hero },
              { type: "trust", data: linkedContent.trust },
              { type: "attractions", data: linkedContent.attractions },
              { type: "districts", data: linkedContent.districts },
              { type: "hotels", data: linkedContent.hotels },
              { type: "restaurants", data: linkedContent.restaurants },
              { type: "travelTips", data: linkedContent.travelTips },
              { type: "events", data: linkedContent.events },
            ];

            for (const ct of contentTypes) {
              await db.insert(destinationContent).values({
                destinationId: destination.id,
                contentType: ct.type,
                content: ct.data,
                seoValidation: validationResult.validation as any,
                qualityScore: validationResult.score,
                qualityTier: validationResult.tier,
                generatedBy: provider,
                generatedModel: model,
                version: 1,
                isActive: true,
              } as any);
            }

            // Update destination
            await db
              .update(destinations)
              .set({
                status: "complete",
                hasPage: true,
                seoScore: validationResult.score,
                wordCount: metrics.wordCount,
                h2Count: metrics.h2Count,
                internalLinks: linksAdded,
                metaTitle: `${destination.name} Travel Guide 2025 | Travi`,
                metaDescription: linkedContent.hero.description.substring(0, 160),
                lastGenerated: new Date(),
                updatedAt: new Date(),
              } as any)
              .where(eq(destinations.id, destination.id));

            // Log success
            await db.insert(aiGenerationLogs).values({
              targetType: "destination",
              targetId: destination.id,
              provider,
              model,
              success: true,
              seoScore: validationResult.score,
              qualityTier: validationResult.tier,
              duration,
            } as any);

            results.push({
              destinationId: destination.id,
              name: destination.name,
              success: true,
              seoScore: validationResult.score,
            });
            generated++;

            logger.info(`Generated content for ${destination.name}`);
          } catch (error) {
            results.push({
              destinationId: destination.id,
              name: destination.name,
              success: false,
              error: String(error),
            });
            failed++;

            logger.warn({ error: String(error) }, `Failed to generate content for ${destination.name}`);
          }

          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        logger.info(`Bulk generation complete: ${generated} succeeded, ${failed} failed`);

        res.json({
          success: failed === 0,
          generated,
          failed,
          results,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Bulk generation failed");
        res.status(500).json({
          success: false,
          generated: 0,
          failed: 0,
          results: [],
          error: String(error),
        });
      }
    }
  );

  /**
   * POST /api/destination-intelligence/validate
   * Validates content through the quality gateway
   */
  app.post(
    "/api/destination-intelligence/validate",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { destinationId, content } = req.body;

        if (!destinationId && !content) {
          return res.status(400).json({ error: "Either destinationId or content is required" });
        }

        let contentToValidate: GeneratedDestinationContent | null = null;
        let destination: Destination | null = null;

        if (destinationId) {
          // Get destination and its content from database
          const [dest] = await db
            .select()
            .from(destinations)
            .where(eq(destinations.id, destinationId));

          if (!dest) {
            return res.status(404).json({ error: "Destination not found" });
          }

          destination = dest;
          contentToValidate = await getDestinationGeneratedContent(destinationId);

          if (!contentToValidate) {
            return res.status(404).json({ error: "No content found for this destination" });
          }
        } else {
          contentToValidate = content;
        }

        // Ensure we have content to validate
        if (!contentToValidate) {
          return res.status(400).json({ error: "No content provided for validation" });
        }

        // Validate through quality gateway
        const contentForValidation: ContentForValidation = {
          title: contentToValidate.hero?.title || "Untitled",
          metaTitle: destination 
            ? `${destination.name} Travel Guide 2025 | Travi`
            : "Travel Guide 2025 | Travi",
          metaDescription: contentToValidate.hero?.description?.substring(0, 160) || "",
          content: JSON.stringify(contentToValidate),
          contentType: "landing_page",
        };

        const validationResult = validateThroughGateway(contentForValidation);

        res.json({
          passed: validationResult.passed,
          score: validationResult.score,
          tier: validationResult.tier,
          blockingIssues: validationResult.blockingIssues,
          recommendations: validationResult.recommendations,
          metrics: validationResult.metrics,
          validation: validationResult.validation,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Validation failed");
        res.status(500).json({
          error: "Validation failed",
          message: String(error),
        });
      }
    }
  );

  /**
   * POST /api/destination-intelligence/scan
   * Scans all destinations and refreshes their content status
   */
  app.post(
    "/api/destination-intelligence/scan",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        logger.info("Starting destination scan");

        // Ensure all destinations from config are in database
        for (const dest of DESTINATIONS) {
          const [existing] = await db
            .select()
            .from(destinations)
            .where(eq(destinations.id, dest.id));

          if (!existing) {
            const normalizedName = dest.name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
            await db.insert(destinations).values({
              id: dest.id,
              name: dest.name,
              normalizedName,
              country: dest.country,
              slug: `/destinations/${dest.id}`,
              isActive: dest.isActive,
              status: "empty",
              hasPage: false,
              seoScore: 0,
              wordCount: 0,
              internalLinks: 0,
              externalLinks: 0,
              h2Count: 0,
            } as any);
          }
        }

        // Update status based on content existence
        const allDestinations = await db.select().from(destinations);

        for (const dest of allDestinations) {
          const content = await getDestinationGeneratedContent(dest.id);
          
          if (content) {
            const metrics = calculateSeoMetrics(content);
            await db
              .update(destinations)
              .set({
                status: "complete",
                hasPage: true,
                wordCount: metrics.wordCount,
                h2Count: metrics.h2Count,
                updatedAt: new Date(),
              } as any)
              .where(eq(destinations.id, dest.id));
          } else if (dest.isActive) {
            await db
              .update(destinations)
              .set({
                status: "partial",
                hasPage: true,
                updatedAt: new Date(),
              } as any)
              .where(eq(destinations.id, dest.id));
          }
        }

        const scannedAt = new Date().toISOString();
        logger.info(`Scan complete at ${scannedAt}`);

        res.json({
          success: true,
          scannedAt,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Scan failed");
        res.status(500).json({
          success: false,
          error: String(error),
        });
      }
    }
  );

  /**
   * GET /api/destination-intelligence/content/:id
   * Get generated content for a specific destination
   */
  app.get(
    "/api/destination-intelligence/content/:id",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const [destination] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, id));

        if (!destination) {
          return res.status(404).json({ error: "Destination not found" });
        }

        const generatedContent = await getDestinationGeneratedContent(id);

        res.json({
          destination: {
            id: destination.id,
            name: destination.name,
            country: destination.country,
          },
          hasContent: generatedContent !== null,
          content: generatedContent,
          status: destination.status,
          lastUpdated: destination.lastGenerated?.toISOString() || null,
          metrics: {
            seoScore: destination.seoScore,
            wordCount: destination.wordCount,
            h2Count: destination.h2Count,
            internalLinks: destination.internalLinks,
          },
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to fetch destination content");
        res.status(500).json({ error: "Failed to fetch destination content" });
      }
    }
  );

  /**
   * GET /api/destination-intelligence/logs/:id
   * Get AI generation logs for a specific destination
   */
  app.get(
    "/api/destination-intelligence/logs/:id",
    requirePermission("canViewAnalytics"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const logs = await db
          .select()
          .from(aiGenerationLogs)
          .where(and(
            eq(aiGenerationLogs.targetType, "destination"),
            eq(aiGenerationLogs.targetId, id)
          ))
          .orderBy(desc(aiGenerationLogs.createdAt))
          .limit(50);

        res.json({ logs });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to fetch generation logs");
        res.status(500).json({ error: "Failed to fetch generation logs" });
      }
    }
  );

  /**
   * GET /api/destination-intelligence/images/status
   * Get image generation statistics for all destinations
   */
  app.get(
    "/api/destination-intelligence/images/status",
    requirePermission("canViewAnalytics"),
    async (req: Request, res: Response) => {
      try {
        logger.info("Fetching image generation status");
        
        const stats = await getImageGenerationStats();
        const destinationsNeedingImages = await findDestinationsNeedingImages();

        res.json({
          stats,
          destinationsNeedingImages: destinationsNeedingImages.map(d => ({
            id: d.id,
            name: d.name,
            country: d.country,
            hasHeroImage: !!d.heroImage,
            sectionImageCount: (d.images || []).length,
          })),
          costs: autoImageGenerator.IMAGE_COSTS,
          config: autoImageGenerator.defaultConfig,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to fetch image generation status");
        res.status(500).json({ error: "Failed to fetch image generation status" });
      }
    }
  );

  /**
   * POST /api/destination-intelligence/images/generate
   * Manually trigger image generation for a specific destination
   */
  app.post(
    "/api/destination-intelligence/images/generate",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { destinationId } = req.body;

        if (!destinationId) {
          return res.status(400).json({ error: "destinationId is required" });
        }

        logger.info({ destinationId }, "Manual image generation triggered");

        const result = await generateDestinationImages(destinationId);

        res.json({
          success: !result.error,
          message: result.error || `Generated images for ${result.destinationName}`,
          result: {
            destinationId: result.destinationId,
            destinationName: result.destinationName,
            heroGenerated: result.heroGenerated,
            heroUrl: result.heroUrl,
            sectionImagesGenerated: result.sectionImagesGenerated,
            sectionImages: result.sectionImages,
            totalCost: result.totalCost,
            provider: result.provider,
            duration: result.duration,
          },
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Manual image generation failed");
        res.status(500).json({
          success: false,
          message: `Failed to generate images: ${String(error)}`,
        });
      }
    }
  );

  /**
   * POST /api/destination-intelligence/images/generate-daily
   * Manually trigger daily image generation for all eligible destinations
   */
  app.post(
    "/api/destination-intelligence/images/generate-daily",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        logger.info("Manual daily image generation triggered");

        const config = {
          ...autoImageGenerator.defaultConfig,
          ...req.body.config,
        };

        const result = await runDailyImageGeneration(config);

        res.json({
          success: result.errors.length === 0,
          message: `Processed ${result.destinationsProcessed} destinations, generated ${result.totalImagesGenerated} images`,
          result: {
            date: result.date,
            destinationsProcessed: result.destinationsProcessed,
            totalImagesGenerated: result.totalImagesGenerated,
            totalCost: result.totalCost,
            results: result.results,
            errors: result.errors,
          },
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Daily image generation failed");
        res.status(500).json({
          success: false,
          message: `Failed to run daily image generation: ${String(error)}`,
        });
      }
    }
  );

  /**
   * GET /api/destination-intelligence/hero-images/:slug
   * Lists all hero images available in the destinations-hero/{slug}/ folder
   * Returns filenames that can be used to populate hero carousel
   */
  app.get(
    "/api/destination-intelligence/hero-images/:slug",
    async (req: Request, res: Response) => {
      try {
        const { slug } = req.params;
        const fs = await import("fs/promises");
        const path = await import("path");
        
        // Normalize slug to match folder naming (remove hyphens)
        const normalizedSlug = slug.replace(/-/g, "").toLowerCase();
        
        // Check multiple possible folder names
        const baseDir = path.join(process.cwd(), "client/public/destinations-hero");
        const possibleFolders = [
          slug,
          normalizedSlug,
          slug.charAt(0).toUpperCase() + slug.slice(1),
        ];
        
        let folderPath: string | null = null;
        let folderName: string | null = null;
        
        // Find the matching folder
        try {
          const folders = await fs.readdir(baseDir);
          for (const folder of folders) {
            const lowerFolder = folder.toLowerCase().trim();
            if (
              lowerFolder === slug.toLowerCase() ||
              lowerFolder === normalizedSlug ||
              lowerFolder.replace(/\s+/g, "") === normalizedSlug
            ) {
              folderPath = path.join(baseDir, folder);
              folderName = folder;
              break;
            }
          }
        } catch (e) {
          logger.error({ error: String(e) }, "Failed to read destinations-hero directory");
        }
        
        if (!folderPath) {
          return res.json({ 
            images: [], 
            message: `No hero images folder found for ${slug}`,
            availableSlugs: [] 
          });
        }
        
        // Read all files in the folder
        const files = await fs.readdir(folderPath);
        const webpFiles = files
          .filter(f => f.endsWith(".webp"))
          .map((filename, index) => {
            // Auto-generate alt text from filename
            // Remove destination prefix, replace hyphens with spaces, capitalize
            const altText = generateAltFromFilename(filename, slug);
            
            return {
              filename,
              url: `/destinations-hero/${folderName}/${filename}`,
              alt: altText,
              order: index,
            };
          });
        
        res.json({ 
          slug,
          folder: folderName,
          images: webpFiles,
          count: webpFiles.length 
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to list hero images");
        res.status(500).json({ error: "Failed to list hero images" });
      }
    }
  );

  /**
   * GET /api/destination-intelligence/:id/hero
   * Get hero data for a destination (CMS-driven)
   */
  app.get(
    "/api/destination-intelligence/:id/hero",
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        
        const [destination] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, id));
        
        if (!destination) {
          return res.status(404).json({ error: "Destination not found" });
        }
        
        // Return hero-specific fields
        res.json({
          id: destination.id,
          name: destination.name,
          slug: destination.slug,
          heroTitle: destination.heroTitle,
          heroSubtitle: destination.heroSubtitle,
          heroImages: destination.heroImages || [],
          heroCTAText: destination.heroCTAText,
          heroCTALink: destination.heroCTALink,
          moodVibe: destination.moodVibe,
          moodTagline: destination.moodTagline,
          moodPrimaryColor: destination.moodPrimaryColor,
          moodGradientFrom: destination.moodGradientFrom,
          moodGradientTo: destination.moodGradientTo,
          metaTitle: destination.metaTitle,
          metaDescription: destination.metaDescription,
          ogTitle: destination.ogTitle,
          ogDescription: destination.ogDescription,
          ogImage: destination.ogImage,
          canonicalUrl: destination.canonicalUrl,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to get hero data");
        res.status(500).json({ error: "Failed to get hero data" });
      }
    }
  );

  /**
   * PATCH /api/destination-intelligence/:id/hero
   * Update hero data for a destination (CMS-driven)
   */
  app.patch(
    "/api/destination-intelligence/:id/hero",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const {
          heroTitle,
          heroSubtitle,
          heroImages,
          heroCTAText,
          heroCTALink,
          moodVibe,
          moodTagline,
          moodPrimaryColor,
          moodGradientFrom,
          moodGradientTo,
          metaTitle,
          metaDescription,
          ogTitle,
          ogDescription,
          ogImage,
          canonicalUrl,
        } = req.body;
        
        // Check destination exists
        const [existing] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, id));
        
        if (!existing) {
          return res.status(404).json({ error: "Destination not found" });
        }
        
        // Update destination with hero data
        const [updated] = await db
          .update(destinations)
          .set({
            heroTitle,
            heroSubtitle,
            heroImages,
            heroCTAText,
            heroCTALink,
            moodVibe,
            moodTagline,
            moodPrimaryColor,
            moodGradientFrom,
            moodGradientTo,
            metaTitle,
            metaDescription,
            ogTitle,
            ogDescription,
            ogImage,
            canonicalUrl,
            updatedAt: new Date(),
          } as any)
          .where(eq(destinations.id, id))
          .returning();
        
        logger.info(`Updated hero data for destination ${id}`);
        
        res.json({
          success: true,
          message: `Hero data updated for ${existing.name}`,
          destination: updated,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to update hero data");
        res.status(500).json({ error: "Failed to update hero data" });
      }
    }
  );

  /**
   * GET /api/destination-intelligence/:id/featured-sections
   * Get all featured sections (attractions, areas, highlights) for a destination
   */
  app.get(
    "/api/destination-intelligence/:id/featured-sections",
    requirePermission("canEdit"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        
        const [destination] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, id))
          .limit(1);
        
        if (!destination) {
          res.status(404).json({ error: "Destination not found" });
          return;
        }
        
        res.json({
          featuredAttractions: destination.featuredAttractions || [],
          featuredAreas: destination.featuredAreas || [],
          featuredHighlights: destination.featuredHighlights || [],
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to get featured sections");
        res.status(500).json({ error: "Failed to get featured sections" });
      }
    }
  );

  /**
   * PATCH /api/destination-intelligence/:id/featured-sections
   * Update featured sections for a destination
   * CMS Contract: "No image = No section" - frontend hides sections without images
   */
  app.patch(
    "/api/destination-intelligence/:id/featured-sections",
    requirePermission("canEdit"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        
        // Validate request body using Zod schema
        const validation = featuredSectionsUpdateSchema.safeParse(req.body);
        if (!validation.success) {
          res.status(400).json({ 
            error: "Validation failed", 
            details: validation.error.errors 
          });
          return;
        }
        
        const { featuredAttractions, featuredAreas, featuredHighlights } = validation.data;
        
        const [existing] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, id))
          .limit(1);
        
        if (!existing) {
          res.status(404).json({ error: "Destination not found" });
          return;
        }
        
        // Build update object with only provided fields
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        
        if (featuredAttractions !== undefined) {
          updateData.featuredAttractions = featuredAttractions;
        }
        if (featuredAreas !== undefined) {
          updateData.featuredAreas = featuredAreas;
        }
        if (featuredHighlights !== undefined) {
          updateData.featuredHighlights = featuredHighlights;
        }
        
        const [updated] = await db
          .update(destinations)
          .set(updateData)
          .where(eq(destinations.id, id))
          .returning();
        
        logger.info(`Updated featured sections for destination ${id}`);
        
        res.json({
          success: true,
          message: `Featured sections updated for ${existing.name}`,
          featuredAttractions: updated.featuredAttractions || [],
          featuredAreas: updated.featuredAreas || [],
          featuredHighlights: updated.featuredHighlights || [],
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to update featured sections");
        res.status(500).json({ error: "Failed to update featured sections" });
      }
    }
  );

  // ============================================================================
  // ADMIN DESTINATIONS API - For new destination-centric admin architecture
  // ============================================================================

  /**
   * GET /api/admin/destinations
   * Returns all destinations for admin management (including inactive)
   */
  app.get(
    "/api/admin/destinations",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        // Return ALL destinations sorted alphabetically by name
        const allDestinations = await db
          .select({
            id: destinations.id,
            name: destinations.name,
            country: destinations.country,
            slug: destinations.slug,
            destinationLevel: destinations.destinationLevel,
            cardImage: destinations.cardImage,
            cardImageAlt: destinations.cardImageAlt,
            heroImage: destinations.heroImage,
            heroTitle: destinations.heroTitle,
            heroSubtitle: destinations.heroSubtitle,
            summary: destinations.summary,
            isActive: destinations.isActive,
          })
          .from(destinations)
          .orderBy(destinations.name);
        
        res.json(allDestinations);
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to fetch admin destinations");
        res.status(500).json({ error: "Failed to fetch destinations" });
      }
    }
  );

  /**
   * GET /api/admin/destinations/:slug
   * Returns detailed destination data for the admin hub
   */
  app.get(
    "/api/admin/destinations/:slug",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { slug } = req.params;
        
        const [destination] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, slug));
        
        if (!destination) {
          return res.status(404).json({ error: "Destination not found" });
        }
        
        res.json({
          id: destination.id,
          name: destination.name,
          country: destination.country,
          slug: destination.slug,
          destinationLevel: destination.destinationLevel || "city",
          cardImage: destination.cardImage,
          heroTitle: destination.heroTitle,
          heroSubtitle: destination.heroSubtitle,
          summary: destination.summary,
          isActive: destination.hasPage ?? false,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to fetch destination");
        res.status(500).json({ error: "Failed to fetch destination" });
      }
    }
  );

  /**
   * GET /api/admin/destinations/:slug/sections
   * Returns content sections for a destination
   */
  app.get(
    "/api/admin/destinations/:slug/sections",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { slug } = req.params;
        
        const [destination] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, slug));
        
        if (!destination) {
          return res.status(404).json({ error: "Destination not found" });
        }
        
        // Return section configuration based on destination data
        const sections = [
          {
            id: "featured_attractions",
            type: "featured_attractions" as const,
            title: "Top Attractions",
            isVisible: true,
            itemCount: destination.featuredAttractions?.length || 0,
          },
          {
            id: "featured_areas",
            type: "featured_areas" as const,
            title: "Where to Stay",
            isVisible: true,
            itemCount: destination.featuredAreas?.length || 0,
          },
          {
            id: "featured_highlights",
            type: "featured_highlights" as const,
            title: "Visual Highlights",
            isVisible: true,
            itemCount: destination.featuredHighlights?.length || 0,
          },
        ];
        
        res.json(sections);
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to fetch destination sections");
        res.status(500).json({ error: "Failed to fetch destination sections" });
      }
    }
  );

  /**
   * GET /api/admin/destinations/:slug/seo
   * Returns SEO data for a destination
   */
  app.get(
    "/api/admin/destinations/:slug/seo",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { slug } = req.params;
        
        const [destination] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, slug));
        
        if (!destination) {
          return res.status(404).json({ error: "Destination not found" });
        }
        
        res.json({
          metaTitle: destination.metaTitle,
          metaDescription: destination.metaDescription,
          ogTitle: null,
          ogDescription: null,
          ogImage: destination.cardImage,
          canonicalUrl: `https://travi.world/destinations/${slug}`,
          keywords: null,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to fetch destination SEO");
        res.status(500).json({ error: "Failed to fetch destination SEO" });
      }
    }
  );

  /**
   * PATCH /api/admin/destinations/:slug/seo
   * Update SEO data for a destination
   */
  app.patch(
    "/api/admin/destinations/:slug/seo",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { slug } = req.params;
        const { metaTitle, metaDescription } = req.body;
        
        const [existing] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, slug));
        
        if (!existing) {
          return res.status(404).json({ error: "Destination not found" });
        }
        
        const updateData: Partial<typeof destinations.$inferInsert> = {};
        if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
        if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
        updateData.updatedAt = new Date();
        
        const [updated] = await db
          .update(destinations)
          .set(updateData)
          .where(eq(destinations.id, slug))
          .returning();
        
        logger.info(`Updated SEO for destination ${slug}`);
        
        res.json({
          success: true,
          metaTitle: updated.metaTitle,
          metaDescription: updated.metaDescription,
        });
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to update destination SEO");
        res.status(500).json({ error: "Failed to update destination SEO" });
      }
    }
  );

  /**
   * POST /api/admin/destinations
   * Create a new destination
   */
  app.post(
    "/api/admin/destinations",
    requirePermission("canEdit"),
    async (req: Request, res: Response) => {
      try {
        const { name, country, destinationLevel = "city" } = req.body;
        
        if (!name || !country) {
          return res.status(400).json({ error: "Name and country are required" });
        }
        
        // Generate slug from name
        const slug = name.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        
        // Check for duplicates
        const [existing] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, slug));
        
        if (existing) {
          return res.status(409).json({ error: "A destination with this name already exists" });
        }
        
        const [newDestination] = await db
          .insert(destinations)
          .values({
            id: slug,
            name,
            country,
            slug,
            destinationLevel,
            isActive: false,
            status: "empty",
            hasPage: false,
            seoScore: 0,
            wordCount: 0,
            internalLinks: 0,
            externalLinks: 0,
            h2Count: 0,
          })
          .returning();
        
        logger.info(`Created new destination: ${name} (${slug})`);
        
        res.status(201).json(newDestination);
      } catch (error) {
        logger.error({ error: String(error) }, "Failed to create destination");
        res.status(500).json({ error: "Failed to create destination" });
      }
    }
  );

  console.log(
    "[DestinationIntelligence] Registered destination intelligence endpoints at /api/destination-intelligence/*"
  );
  console.log(
    "[AdminDestinations] Registered admin destinations endpoints at /api/admin/destinations/*"
  );
}

// Helper to generate alt text from filename
function generateAltFromFilename(filename: string, destinationSlug: string): string {
  // Remove file extension
  let name = filename.replace(/\.webp\.webp$/i, "").replace(/\.webp$/i, "");
  
  // Remove destination prefix (e.g., "tokyo-hero-" or "dubai-")
  const slugNormalized = destinationSlug.replace(/-/g, "");
  name = name.replace(new RegExp(`^${slugNormalized}-hero-`, "i"), "");
  name = name.replace(new RegExp(`^${slugNormalized}-`, "i"), "");
  name = name.replace(/^hero-/i, "");
  
  // Replace hyphens with spaces and capitalize words
  const words = name.split("-").map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  
  // Add destination name at the end
  const destName = destinationSlug.split("-").map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");
  
  return `${words.join(" ")} in ${destName}`;
}

// Export helper functions for use by auto-pilot system
export {
  generateDestinationContent,
  applyInternalLinks,
  calculateSeoMetrics,
  buildDestinationPrompt,
  type GeneratedDestinationContent,
};
