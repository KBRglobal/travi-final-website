/**
 * AI Image Helpers
 *
 * Utilities for AI-generated image management: searching the image library,
 * fetching from Freepik, creating fallback images, and storing generated images.
 */

import { db } from "../../db";
import { eq, like, or, desc, and } from "drizzle-orm";
import { generateContentImages, type GeneratedImage } from "../../ai";
import { getStorageManager } from "../../services/storage-adapter";
import { uploadImageFromUrl } from "../../services/image-service";
import { sanitizeAIPrompt } from "../../lib/sanitize-ai-output";
import { addSystemLog } from "./ai-logging";

/** Result of finding or creating an article image */
export interface ArticleImageResult {
  url: string;
  altText: string;
  imageId: string;
  source: "library" | "freepik";
}

/** Response shape when falling back to stock images */
export interface FallbackImageResponse {
  images: GeneratedImage[];
  source: string;
  message: string;
}

// Drizzle table and SQL condition types are deeply generic; using `typeof` import
// to get the exact table type without coupling to Drizzle's internal type machinery
type AiGeneratedImagesTable = Awaited<typeof import("@shared/schema")>["aiGeneratedImages"];
type AiGeneratedImageRow = AiGeneratedImagesTable["$inferSelect"];
type AiGeneratedImageInsert = AiGeneratedImagesTable["$inferInsert"];
type DrizzleSQLCondition = ReturnType<typeof or>;

/** Valid content types for AI image generation */
export const VALID_IMAGE_CONTENT_TYPES = new Set([
  "hotel",
  "attraction",
  "article",
  "dining",
  "district",
  "transport",
  "event",
  "itinerary",
]);

/**
 * Validate an image generation request's required fields.
 *
 * @param contentType - The content type to validate
 * @param title       - The title to validate
 * @returns An error message string, or null if valid
 */
export function validateImageGenRequest(contentType: string, title: string): string | null {
  if (!contentType || !title) {
    addSystemLog("warning", "images", "AI image generation failed - missing content type or title");
    return "Content type and title are required";
  }
  if (!VALID_IMAGE_CONTENT_TYPES.has(contentType)) {
    addSystemLog(
      "warning",
      "images",
      `AI image generation failed - invalid content type: ${contentType}`
    );
    return "Invalid content type";
  }
  return null;
}

/**
 * Create a fallback image using Unsplash when AI generation is unavailable.
 *
 * @param title       - Content title for search query
 * @param contentType - Content type for search query context
 */
export function createFallbackImage(title: string, contentType: string): GeneratedImage {
  const searchQuery = encodeURIComponent(`${title} ${contentType} dubai travel`.substring(0, 50));
  return {
    url: `https://source.unsplash.com/1200x800/?${searchQuery}`,
    filename: `hero-${Date.now()}.jpg`,
    type: "hero",
    alt: `${title} - Dubai Travel`,
    caption: `${title} - Dubai Travel Guide`,
  };
}

/**
 * Build a complete fallback response when AI image generation is not configured.
 *
 * @param title        - Content title
 * @param contentType  - Content type
 * @param generateHero - Whether to generate a hero image
 * @param hasFreepik   - Whether Freepik API is available
 */
export function buildFallbackResponse(
  title: string,
  contentType: string,
  generateHero: boolean | undefined,
  hasFreepik: boolean
): FallbackImageResponse {
  const source = hasFreepik ? "freepik" : "unsplash";
  addSystemLog("info", "images", `No AI image API configured, using ${source} fallback`);
  const fallbackImages = generateHero === false ? [] : [createFallbackImage(title, contentType)];
  addSystemLog(
    "info",
    "images",
    `Generated ${fallbackImages.length} fallback images for "${title}"`
  );
  return {
    images: fallbackImages,
    source,
    message: "Using stock images (AI image generation not configured)",
  };
}

/**
 * Search the database for an existing image matching the given conditions,
 * falling back to category-level search if no direct matches are found.
 *
 * @param aiGeneratedImages - Drizzle table reference
 * @param searchConditions  - Array of OR conditions to match
 * @param category          - Fallback category to search
 */
export async function findImageBySearchConditions(
  aiGeneratedImages: AiGeneratedImagesTable,
  searchConditions: DrizzleSQLCondition[],
  category: string
): Promise<AiGeneratedImageRow | null> {
  if (searchConditions.length > 0) {
    const approvedImages = await db
      .select()
      .from(aiGeneratedImages)
      .where(and(eq(aiGeneratedImages.isApproved, true), or(...searchConditions)))
      .orderBy(desc(aiGeneratedImages.usageCount))
      .limit(1);
    if (approvedImages.length > 0) return approvedImages[0];

    const anyImages = await db
      .select()
      .from(aiGeneratedImages)
      .where(or(...searchConditions))
      .orderBy(desc(aiGeneratedImages.createdAt))
      .limit(1);
    if (anyImages.length > 0) return anyImages[0];
  }

  const categoryImages = await db
    .select()
    .from(aiGeneratedImages)
    .where(eq(aiGeneratedImages.category, category))
    .orderBy(desc(aiGeneratedImages.isApproved), desc(aiGeneratedImages.createdAt))
    .limit(1);
  return categoryImages[0] || null;
}

/**
 * Find an existing image in the library or create one via Freepik / AI generation.
 *
 * @param topic    - Image topic / search term
 * @param keywords - Related keywords for searching
 * @param category - Image category
 */
export async function findOrCreateArticleImage(
  topic: string,
  keywords: string[],
  category: string
): Promise<ArticleImageResult | null> {
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

    const foundImage = await findImageBySearchConditions(
      aiGeneratedImages,
      searchConditions,
      category
    );

    if (foundImage) {
      await db
        .update(aiGeneratedImages)
        // Drizzle ORM update types may not align with runtime column shapes; cast required
        .set({
          usageCount: (foundImage.usageCount || 0) + 1,
          updatedAt: new Date(),
        } as Partial<AiGeneratedImageInsert>)
        .where(eq(aiGeneratedImages.id, foundImage.id));

      return {
        url: foundImage.url,
        altText: foundImage.altText || `${topic} - Dubai Travel`,
        imageId: foundImage.id,
        source: "library",
      };
    }

    const freepikApiKey = process.env.FREEPIK_API_KEY;
    if (!freepikApiKey) {
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
        Accept: "application/json",
        "x-freepik-api-key": freepikApiKey,
      },
    });

    if (!freepikResponse.ok) {
      return null;
    }

    const freepikData = await freepikResponse.json();
    const results = freepikData.data || [];

    if (results.length === 0) {
      try {
        const safeTopic = sanitizeAIPrompt(topic);
        const aiImages: GeneratedImage[] = await generateContentImages({
          contentType: "article",
          title: safeTopic,
          description: `Dubai travel article about ${safeTopic}`,
          style: "photorealistic",
          generateHero: true,
          generateContentImages: false,
        });

        if (Array.isArray(aiImages) && aiImages.length > 0) {
          const aiImage = aiImages[0];

          const [savedImage] = await db
            .insert(aiGeneratedImages)
            // Drizzle insert schema may differ from runtime columns; cast to partial row type
            .values({
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
            } as AiGeneratedImageInsert)
            .returning();

          return {
            url: aiImage.url,
            altText: aiImage.alt || `${topic} - Dubai Travel`,
            imageId: savedImage.id,
            source: "library" as const,
          };
        }
      } catch (aiError) {
        console.error(aiError);
      }

      return null;
    }

    const bestResult = results[0];
    const imageUrl =
      bestResult.image?.source?.url || bestResult.preview?.url || bestResult.thumbnail?.url;

    if (!imageUrl) {
      return null;
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return null;
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const filename = `freepik-${Date.now()}.jpg`;

    const storageManager = getStorageManager();
    const storagePath = `public/images/${filename}`;
    const result = await storageManager.upload(storagePath, Buffer.from(imageBuffer));
    const persistedUrl = result.url;

    const altText = bestResult.title || `${topic} - Dubai Travel`;

    const [savedImage] = await db
      .insert(aiGeneratedImages)
      // Drizzle insert schema may differ from runtime columns; cast to partial row type
      .values({
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
      } as AiGeneratedImageInsert)
      .returning();

    return {
      url: persistedUrl,
      altText: altText,
      imageId: savedImage.id,
      source: "freepik",
    };
  } catch {
    return null;
  }
}

/**
 * Store generated images by uploading them to the configured storage provider.
 *
 * @param images - Array of generated images to upload
 * @returns Array of images with updated URLs after storage
 */
export async function storeGeneratedImages(images: GeneratedImage[]): Promise<GeneratedImage[]> {
  const stored: GeneratedImage[] = [];
  for (const image of images) {
    try {
      const result = await uploadImageFromUrl(image.url, image.filename, {
        source: "ai",
        altText: image.alt,
        metadata: { type: image.type, originalUrl: image.url },
      });
      if (result.success) {
        stored.push({ ...image, url: result.image.url });
      }
    } catch (imgError) {
      console.error(imgError);
    }
  }
  return stored;
}
