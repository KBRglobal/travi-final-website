/**
 * Image Intelligence Service
 * Automatic image processing with:
 * - AI-powered image analysis and alt text generation
 * - Multi-language alt text (30 supported languages)
 * - SEO-friendly filename generation
 * - Optimal format selection (WebP/JPEG/PNG)
 * - Smart compression based on usage context
 */

import OpenAI from "openai";
import sharp from "sharp";
import { SUPPORTED_LOCALES, type Locale } from "@shared/schema";
import { getAllUnifiedProviders, getValidOpenAIKey } from "../ai/providers";
import { log } from "../lib/logger";
import {
  processImage,
  generateThumbnail,
  getImageMetadata,
  type ProcessedImage,
  type ImageMetadata,
} from "../services/image-processing";

// ============================================================================
// Types
// ============================================================================

export interface ImageContext {
  /** Type of content: hero, thumbnail, gallery, inline, icon */
  usage: "hero" | "thumbnail" | "gallery" | "inline" | "icon" | "og-image";
  /** Content type: destination, attraction, hotel, guide, article */
  contentType?: string;
  /** Destination/location name for context */
  destination?: string;
  /** Entity name (attraction name, hotel name, etc.) */
  entityName?: string;
  /** Additional context for AI */
  additionalContext?: string;
}

export interface ImageAnalysis {
  /** Primary description of image content */
  description: string;
  /** Detected objects/subjects */
  subjects: string[];
  /** Detected scene type */
  scene: string;
  /** Mood/atmosphere */
  mood: string;
  /** Suggested keywords for SEO */
  keywords: string[];
  /** Whether image contains text */
  hasText: boolean;
  /** Detected colors (hex) */
  dominantColors: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

export interface LocalizedAltText {
  locale: Locale;
  altText: string;
  title?: string;
  caption?: string;
}

export interface ProcessedImageResult {
  /** Main processed image */
  main: ProcessedImage;
  /** WebP version */
  webp?: ProcessedImage;
  /** Thumbnail version */
  thumbnail?: ProcessedImage;
  /** OG image version (1200x630) */
  ogImage?: ProcessedImage;
  /** Generated filename (SEO-friendly) */
  filename: string;
  /** Original analysis */
  analysis: ImageAnalysis;
  /** Alt texts for all requested locales */
  altTexts: LocalizedAltText[];
  /** Metadata */
  metadata: {
    originalSize: number;
    processedSize: number;
    compressionRatio: number;
    format: string;
    width: number;
    height: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const SIZE_TARGETS = {
  hero: { maxWidth: 1920, maxHeight: 1080, maxSize: 300 * 1024, quality: 85 },
  thumbnail: { maxWidth: 400, maxHeight: 300, maxSize: 50 * 1024, quality: 80 },
  gallery: { maxWidth: 1200, maxHeight: 800, maxSize: 200 * 1024, quality: 85 },
  inline: { maxWidth: 800, maxHeight: 600, maxSize: 150 * 1024, quality: 80 },
  icon: { maxWidth: 128, maxHeight: 128, maxSize: 20 * 1024, quality: 75 },
  "og-image": { maxWidth: 1200, maxHeight: 630, maxSize: 200 * 1024, quality: 90 },
} as const;

// Language-specific alt text templates
const ALT_TEXT_TEMPLATES: Record<string, { prefix: string; suffix: string }> = {
  en: { prefix: "", suffix: "" },
  ar: { prefix: "", suffix: "" }, // RTL - same structure
  he: { prefix: "", suffix: "" }, // RTL - same structure
  fa: { prefix: "", suffix: "" }, // RTL - same structure
  ur: { prefix: "", suffix: "" }, // RTL - same structure
  zh: { prefix: "", suffix: "" },
  ja: { prefix: "", suffix: "" },
  ko: { prefix: "", suffix: "" },
  hi: { prefix: "", suffix: "" },
  th: { prefix: "", suffix: "" },
  vi: { prefix: "", suffix: "" },
  // European languages follow English structure
  fr: { prefix: "", suffix: "" },
  de: { prefix: "", suffix: "" },
  es: { prefix: "", suffix: "" },
  it: { prefix: "", suffix: "" },
  pt: { prefix: "", suffix: "" },
  nl: { prefix: "", suffix: "" },
  pl: { prefix: "", suffix: "" },
  sv: { prefix: "", suffix: "" },
  el: { prefix: "", suffix: "" },
  cs: { prefix: "", suffix: "" },
  ro: { prefix: "", suffix: "" },
  uk: { prefix: "", suffix: "" },
  hu: { prefix: "", suffix: "" },
  tr: { prefix: "", suffix: "" },
  ru: { prefix: "", suffix: "" },
  id: { prefix: "", suffix: "" },
  ms: { prefix: "", suffix: "" },
  fil: { prefix: "", suffix: "" },
  bn: { prefix: "", suffix: "" },
};

// ============================================================================
// AI Image Analysis
// ============================================================================

/**
 * Analyze image content using OpenAI Vision API
 */
export async function analyzeImage(
  imageBuffer: Buffer,
  context: ImageContext
): Promise<ImageAnalysis> {
  const apiKey = getValidOpenAIKey();

  if (!apiKey) {
    // Fallback to basic analysis without AI
    return analyzeImageBasic(imageBuffer, context);
  }

  const client = new OpenAI({ apiKey });

  // Convert buffer to base64
  const base64Image = imageBuffer.toString("base64");
  const metadata = await getImageMetadata(imageBuffer);
  const mimeType = getMimeTypeFromFormat(metadata.format);

  const systemPrompt = `You are an expert image analyst for a travel website. Analyze images and provide detailed, SEO-friendly descriptions.

Context:
- Usage: ${context.usage}
- Content type: ${context.contentType || "general"}
- Destination: ${context.destination || "unknown"}
- Entity: ${context.entityName || "unknown"}
${context.additionalContext ? `- Additional context: ${context.additionalContext}` : ""}

Provide analysis in JSON format with these fields:
- description: A detailed, SEO-friendly description (50-150 characters)
- subjects: Array of detected objects/subjects (max 5)
- scene: Scene type (e.g., "beach", "cityscape", "hotel room", "restaurant")
- mood: Atmosphere/mood (e.g., "vibrant", "serene", "luxurious", "adventurous")
- keywords: SEO keywords (max 8)
- hasText: Boolean - whether image contains readable text
- dominantColors: Array of hex color codes (max 3)
- confidence: Your confidence in the analysis (0-1)`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "low", // Use low detail to reduce costs
              },
            },
            {
              type: "text",
              text: "Analyze this image and provide the JSON response.",
            },
          ],
        },
      ],
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return analyzeImageBasic(imageBuffer, context);
    }

    const analysis = JSON.parse(content) as ImageAnalysis;
    return analysis;
  } catch (error) {
    log.error("[ImageIntelligence] AI analysis failed:", error);
    return analyzeImageBasic(imageBuffer, context);
  }
}

/**
 * Basic image analysis without AI (fallback)
 */
async function analyzeImageBasic(
  imageBuffer: Buffer,
  context: ImageContext
): Promise<ImageAnalysis> {
  const metadata = await getImageMetadata(imageBuffer);

  // Extract dominant colors using sharp
  const { dominant } = await sharp(imageBuffer).resize(100, 100, { fit: "cover" }).stats();

  const dominantColor = `#${[dominant.r, dominant.g, dominant.b]
    .map(c => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;

  // Generate basic description from context
  const subjects: string[] = [];
  const keywords: string[] = [];

  if (context.destination) {
    subjects.push(context.destination);
    keywords.push(context.destination.toLowerCase());
  }
  if (context.entityName) {
    subjects.push(context.entityName);
    keywords.push(context.entityName.toLowerCase());
  }
  if (context.contentType) {
    keywords.push(context.contentType);
  }

  const description = buildBasicDescription(context);

  return {
    description,
    subjects,
    scene: context.contentType || "travel",
    mood: "inviting",
    keywords,
    hasText: false,
    dominantColors: [dominantColor],
    confidence: 0.4,
  };
}

function buildBasicDescription(context: ImageContext): string {
  const parts: string[] = [];

  if (context.entityName) {
    parts.push(context.entityName);
  }
  if (context.destination) {
    parts.push(`in ${context.destination}`);
  }
  if (context.contentType) {
    parts.push(`- ${context.contentType}`);
  }

  return parts.join(" ") || "Travel image";
}

// ============================================================================
// Multi-Language Alt Text Generation
// ============================================================================

/**
 * Generate alt text for all 30 supported languages
 */
export async function generateMultiLanguageAltText(
  analysis: ImageAnalysis,
  context: ImageContext,
  locales: Locale[] = SUPPORTED_LOCALES.map(l => l.code)
): Promise<LocalizedAltText[]> {
  const results: LocalizedAltText[] = [];

  // Generate English alt text first (base)
  const englishAlt = generateAltTextForLocale(analysis, context, "en");
  results.push(englishAlt);

  // Get AI provider for translation
  const providers = getAllUnifiedProviders();
  if (providers.length === 0) {
    // No AI available - return only English
    return results;
  }

  const provider = providers[0];

  // Batch translate for efficiency
  const otherLocales = locales.filter(l => l !== "en");

  if (otherLocales.length === 0) {
    return results;
  }

  // Group locales by batch (10 per batch to stay within token limits)
  const BATCH_SIZE = 10;
  const batches: Locale[][] = [];

  for (let i = 0; i < otherLocales.length; i += BATCH_SIZE) {
    batches.push(otherLocales.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const translations = await translateAltTextBatch(
        englishAlt.altText,
        englishAlt.title || "",
        batch,
        provider
      );

      results.push(...translations);
    } catch (error) {
      log.error("[ImageIntelligence] Translation batch failed:", error);
      // Add fallback English for failed locales
      for (const locale of batch) {
        results.push({
          locale,
          altText: englishAlt.altText,
          title: englishAlt.title,
        });
      }
    }
  }

  return results;
}

/**
 * Generate alt text for a specific locale
 */
function generateAltTextForLocale(
  analysis: ImageAnalysis,
  context: ImageContext,
  locale: Locale
): LocalizedAltText {
  // Build SEO-friendly alt text
  const parts: string[] = [];

  // Add primary subject
  if (analysis.subjects.length > 0) {
    parts.push(analysis.subjects[0]);
  }

  // Add scene if relevant
  if (analysis.scene && analysis.scene !== "general") {
    parts.push(analysis.scene);
  }

  // Add location context
  if (context.destination) {
    parts.push(`in ${context.destination}`);
  }

  // Add mood if it adds value
  if (analysis.mood && !["general", "neutral"].includes(analysis.mood)) {
    parts.push(`- ${analysis.mood} atmosphere`);
  }

  const altText = parts.join(" ").slice(0, 125); // Max 125 chars for alt
  const title = context.entityName || analysis.subjects[0] || "Travel image";

  return {
    locale,
    altText,
    title,
    caption: analysis.description,
  };
}

/**
 * Batch translate alt text to multiple locales
 */
async function translateAltTextBatch(
  altText: string,
  title: string,
  locales: Locale[],
  provider: { generateCompletion: (opts: any) => Promise<any> }
): Promise<LocalizedAltText[]> {
  const localeNames = locales
    .map(code => {
      const info = SUPPORTED_LOCALES.find(l => l.code === code);
      return info ? `${code}: ${info.name}` : code;
    })
    .join(", ");

  const systemPrompt = `You are a professional translator specializing in travel content and SEO.
Translate the following image alt text and title into multiple languages.
Keep translations:
- Natural and fluent in each language
- SEO-friendly
- Under 125 characters for alt text
- Culturally appropriate

Respond in JSON format:
{
  "translations": [
    { "locale": "ar", "altText": "...", "title": "..." },
    ...
  ]
}`;

  const userPrompt = `Translate to: ${localeNames}

Alt text: "${altText}"
Title: "${title}"`;

  const result = await provider.generateCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 2000,
    responseFormat: { type: "json_object" },
  });

  const parsed = JSON.parse(result.content);
  return parsed.translations.map((t: any) => ({
    locale: t.locale as Locale,
    altText: t.altText || altText,
    title: t.title || title,
  }));
}

// ============================================================================
// SEO-Friendly Filename Generation
// ============================================================================

/**
 * Generate SEO-friendly filename from analysis and context
 */
export function generateSeoFilename(
  analysis: ImageAnalysis,
  context: ImageContext,
  extension: string = "webp"
): string {
  const parts: string[] = [];

  // Add destination
  if (context.destination) {
    parts.push(slugify(context.destination));
  }

  // Add entity name
  if (context.entityName) {
    parts.push(slugify(context.entityName));
  }

  // Add scene type
  if (analysis.scene && analysis.scene !== "general") {
    parts.push(slugify(analysis.scene));
  }

  // Add usage suffix
  if (context.usage !== "gallery") {
    parts.push(context.usage);
  }

  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);
  parts.push(timestamp);

  // Build filename
  const filename = parts.filter(Boolean).join("-").slice(0, 100);
  return `${filename}.${extension}`;
}

/**
 * Slugify text for filename
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// ============================================================================
// Smart Compression
// ============================================================================

/**
 * Compress image to target size based on usage
 */
export async function compressToTarget(
  imageBuffer: Buffer,
  usage: ImageContext["usage"]
): Promise<{ buffer: Buffer; quality: number; iterations: number }> {
  const target = SIZE_TARGETS[usage];
  let quality: number = target.quality;
  let buffer = imageBuffer;
  let iterations = 0;
  const maxIterations = 5;

  // First resize to max dimensions
  buffer = await sharp(buffer)
    .resize(target.maxWidth, target.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  // Then compress until target size is reached
  while (buffer.length > target.maxSize && iterations < maxIterations) {
    quality = Math.max(quality - 10, 40); // Don't go below 40 quality
    buffer = await sharp(buffer).webp({ quality }).toBuffer();
    iterations++;
  }

  return { buffer, quality, iterations };
}

/**
 * Determine optimal format based on image characteristics
 */
export async function determineOptimalFormat(
  imageBuffer: Buffer
): Promise<"webp" | "jpeg" | "png"> {
  const metadata = await getImageMetadata(imageBuffer);

  // PNG for images with transparency
  if (metadata.hasAlpha) {
    return "png";
  }

  // WebP for most cases (best compression)
  return "webp";
}

// ============================================================================
// Main Processing Pipeline
// ============================================================================

/**
 * Full image processing pipeline
 */
export async function processImageIntelligent(
  imageBuffer: Buffer,
  context: ImageContext,
  options: {
    locales?: Locale[];
    generateAllFormats?: boolean;
    generateThumbnail?: boolean;
    generateOgImage?: boolean;
  } = {}
): Promise<ProcessedImageResult> {
  const {
    locales = ["en", "ar", "hi", "zh", "fr"], // Default to top 5 locales
    generateAllFormats = false,
    generateThumbnail: genThumb = true,
    generateOgImage = false,
  } = options;

  // Step 1: Analyze image
  const analysis = await analyzeImage(imageBuffer, context);

  // Step 2: Determine optimal format
  const format = await determineOptimalFormat(imageBuffer);

  // Step 3: Generate SEO filename
  const filename = generateSeoFilename(analysis, context, format);

  // Step 4: Compress main image
  const { buffer: compressedBuffer, quality } = await compressToTarget(imageBuffer, context.usage);

  // Step 5: Process main image
  const mainImage = await processImage(compressedBuffer, filename, {
    format,
    quality,
  });

  // Step 6: Generate additional formats
  let webpImage: ProcessedImage | undefined;
  let thumbnailImage: ProcessedImage | undefined;
  let ogImageResult: ProcessedImage | undefined;

  if (generateAllFormats && format !== "webp") {
    const webpBuffer = await sharp(compressedBuffer).webp({ quality }).toBuffer();
    const webpMeta = await getImageMetadata(webpBuffer);
    webpImage = {
      buffer: webpBuffer,
      metadata: webpMeta,
      filename: filename.replace(/\.[^.]+$/, ".webp"),
    };
  }

  if (genThumb) {
    const thumbBuffer = await generateThumbnail(imageBuffer, 400);
    const thumbMeta = await getImageMetadata(thumbBuffer);
    thumbnailImage = {
      buffer: thumbBuffer,
      metadata: thumbMeta,
      filename: `thumb-${filename.replace(/\.[^.]+$/, ".webp")}`,
    };
  }

  if (generateOgImage) {
    const ogTarget = SIZE_TARGETS["og-image"];
    const ogBuffer = await sharp(imageBuffer)
      .resize(ogTarget.maxWidth, ogTarget.maxHeight, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: ogTarget.quality })
      .toBuffer();
    const ogMeta = await getImageMetadata(ogBuffer);
    ogImageResult = {
      buffer: ogBuffer,
      metadata: ogMeta,
      filename: `og-${filename.replace(/\.[^.]+$/, ".webp")}`,
    };
  }

  // Step 7: Generate multi-language alt texts
  const altTexts = await generateMultiLanguageAltText(analysis, context, locales);

  // Step 8: Build result
  const originalSize = imageBuffer.length;
  const processedSize = mainImage.buffer.length;

  return {
    main: mainImage,
    webp: webpImage,
    thumbnail: thumbnailImage,
    ogImage: ogImageResult,
    filename,
    analysis,
    altTexts,
    metadata: {
      originalSize,
      processedSize,
      compressionRatio: Math.round((1 - processedSize / originalSize) * 100),
      format,
      width: mainImage.metadata.width,
      height: mainImage.metadata.height,
    },
  };
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Process multiple images in parallel
 */
export async function processImagesBatch(
  images: Array<{ buffer: Buffer; context: ImageContext }>,
  options: {
    locales?: Locale[];
    concurrency?: number;
  } = {}
): Promise<Array<ProcessedImageResult | { error: string }>> {
  const { concurrency = 3 } = options;
  const results: Array<ProcessedImageResult | { error: string }> = [];

  // Process in batches
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(({ buffer, context }) => processImageIntelligent(buffer, context, options))
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({ error: result.reason?.message || "Processing failed" });
      }
    }
  }

  return results;
}

// ============================================================================
// Helpers
// ============================================================================

function getMimeTypeFromFormat(format: string): string {
  const mimeTypes: Record<string, string> = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return mimeTypes[format.toLowerCase()] || "image/jpeg";
}

// ============================================================================
// Export singleton
// ============================================================================

export const imageIntelligence = {
  analyzeImage,
  generateMultiLanguageAltText,
  generateSeoFilename,
  compressToTarget,
  determineOptimalFormat,
  processImageIntelligent,
  processImagesBatch,
};
