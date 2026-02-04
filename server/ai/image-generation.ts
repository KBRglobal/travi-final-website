/**
 * AI Image Generation Module
 * Multi-provider image generation with cost optimization
 *
 * Providers:
 * - Flux 1.1 Pro via Replicate: ~$0.03/image (67% cheaper) - Great for photorealistic
 * - DALL-E 3: $0.080/image (HD) - Best for complex scenes
 */

import { getAIClient, getOpenAIClientForImages, getModelForProvider } from "./providers";
import { generateSlug } from "./utils";
import type { GeneratedImage, ImageGenerationOptions, ImageProvider } from "./types";

// ============================================================================
// Image Generation Master Prompt
// ============================================================================

export const IMAGE_MASTER_PROMPT = `You are an Image Content Strategist for travel articles. Analyze articles and recommend strategically chosen images with complete SEO optimization.

ARTICLE ANALYSIS (Mandatory):
1. Identify content type: New attraction, Hotel, Restaurant, Activity, Event, Practical guide, Comparison, Transportation, Shopping
2. Target audience: Families, Couples, Backpackers, Luxury, Business travelers
3. Article tone: Exciting, Luxurious, Practical, Romantic, Professional
4. Keywords: Extract primary, secondary, and LSI keywords from content

IMAGE STRATEGY BY CONTENT TYPE:
- New Attraction: Iconic exterior → Main interior → Activity in progress → Practical element → Unique feature
- Hotel: Exterior/pool → Guest room → Bathroom/amenity → Dining/social → Location context
- Restaurant: Exterior/interior → Signature dish → Dining atmosphere → Design feature → Second dish/chef
- Activity: Action shot → Equipment/setup → Participants enjoying → Results/view → Logistics
- Event: Main scene at peak → Performance → Venue overview → Details/exhibits → Practical info
- Guide: Overview → Infographic/map → Step-by-step → Example/comparison → Practical detail

IMAGE SELECTION CRITERIA:
✅ CHOOSE images that:
- Show what words cannot describe (scale, design, atmosphere)
- Answer visual questions (crowding, space, dress code)
- Match article tone perfectly
- Support SEO (recognizable subjects, iconic landmarks)
- Drive engagement (inspiring, practical, shareable)
- Provide value (scale indicators, accessibility, helpful signage)

❌ AVOID images that:
- Are generic or stock-looking
- Confuse or mislead readers
- Have technical quality issues
- Raise legal/ethical concerns
- Are culturally inappropriate
- Undermine article goals

SEO OPTIMIZATION REQUIREMENTS:
Filename: [primary-keyword]-[descriptor]-[location]-[detail].jpg (under 60 chars, keyword first)
ALT Text: 125-150 chars, descriptive with location, keyword naturally integrated
Title Tag: [Keyword] - [Location] - [Detail] (under 60 chars)
Caption: 1-2 sentences, informative + useful context
Schema: Complete ImageObject with contentUrl, width, height, caption, description

TECHNICAL SPECIFICATIONS:
- Hero Image: 1200x630px or 1920x800px, under 200KB, JPG/WebP
- Content Images: 1024x768px or 800x600px, under 150KB
- Quality: High resolution, sharp focus, proper exposure, natural colors
- Format: JPG for photos, never PNG

OUTPUT FORMAT for each image:
{
  "title": "Descriptive internal name",
  "purpose": "Strategic purpose",
  "placement": "After H2 section or paragraph number",
  "priority": "Critical/High/Medium",
  "description": "4-6 sentences: composition, elements, lighting, perspective",
  "why": "Why this specific image works",
  "visualRequirements": {
    "composition": "Wide/Medium/Close-up | Horizontal/Vertical",
    "timeOfDay": "Golden hour/Blue hour/Day/Night",
    "weather": "Clear/Sunset/Dramatic",
    "angle": "Eye level/Low/High/Aerial",
    "depthOfField": "Deep/Shallow/Medium",
    "position": "Center/Rule of thirds"
  },
  "mustInclude": ["element 1", "element 2", "element 3"],
  "mustAvoid": ["what not to show"],
  "mood": ["3-5 descriptive words"],
  "seo": {
    "filename": "keyword-rich-name.jpg",
    "alt": "125-150 char description",
    "title": "Title tag",
    "caption": "1-2 sentence caption"
  },
  "technical": {
    "dimensions": "1200x630px",
    "format": "JPG",
    "targetSize": "under 200KB"
  }
}

DESTINATION-SPECIFIC ELEMENTS:
- Adapt to the destination's iconic landmarks and locations
- Cultural: Local heritage sites, traditional markets, cultural attractions
- Modern: Contemporary architecture, shopping areas, transportation
- Nature: Natural landscapes, beaches, parks, outdoor spaces
- Hospitality: Hotels, restaurants, spas, entertainment venues

Always recommend 3-5 images total, balanced between inspiration and practical value.`;

// ============================================================================
// Image Prompt Generation
// ============================================================================

/**
 * Generate an AI image prompt based on content options
 */
export async function generateImagePrompt(options: ImageGenerationOptions): Promise<string | null> {
  const aiClient = getAIClient();
  if (!aiClient) return null;
  const { client: openai, provider } = aiClient;

  try {
    const response = await openai.chat.completions.create({
      model: getModelForProvider(provider, "standard"),
      messages: [
        {
          role: "system",
          content: IMAGE_MASTER_PROMPT,
        },
        {
          role: "user",
          content: `Create a detailed DALL-E prompt for a ${options.generateHero ? "hero banner" : "content"} image for this travel content:

CONTENT TYPE: ${options.contentType}
TITLE: ${options.title}
${options.description ? `DESCRIPTION: ${options.description}` : ""}
${options.location ? `LOCATION: ${options.location}` : ""}
STYLE: ${options.style || "photorealistic"}

Generate a single, detailed prompt (150-200 words) that will create a stunning, professional travel image. The prompt should:
1. Describe the specific scene, composition, and main subject
2. Include lighting, atmosphere, and mood details
3. Specify camera angle and perspective
4. Mention colors and textures
5. Be specific to the location and content type

Return ONLY the prompt text, no additional explanation.`,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content?.trim() || null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// Flux Image Generation (via Replicate)
// ============================================================================

/**
 * Generate image using Flux 1.1 Pro via Replicate
 * ~$0.03/image - 67% cheaper than DALL-E
 */
async function generateWithFlux(
  prompt: string,
  aspectRatio: "16:9" | "1:1" | "9:16" = "16:9"
): Promise<string | null> {
  const replicateApiKey = process.env.REPLICATE_API_KEY;
  if (!replicateApiKey) {
    return null;
  }

  try {
    // Using Replicate's HTTP API for Flux 1.1 Pro
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${replicateApiKey}`,
        "Content-Type": "application/json",
        Prefer: "wait", // Wait for result synchronously
      },
      body: JSON.stringify({
        version: "black-forest-labs/flux-1.1-pro",
        input: {
          prompt: prompt,
          aspect_ratio: aspectRatio,
          output_format: "jpg",
          output_quality: 90,
          safety_tolerance: 2,
          prompt_upsampling: true,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();

    // If using 'wait' header, output should be ready
    if (result.output) {
      return Array.isArray(result.output) ? result.output[0] : result.output;
    }

    // If not ready, poll for result (max 60 seconds)
    if (result.urls?.get) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollResponse = await fetch(result.urls.get, {
          headers: { Authorization: `Bearer ${replicateApiKey}` },
        });
        const pollResult = await pollResponse.json();

        if (pollResult.status === "succeeded" && pollResult.output) {
          return Array.isArray(pollResult.output) ? pollResult.output[0] : pollResult.output;
        }
        if (pollResult.status === "failed") {
          return null;
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// DALL-E Image Generation
// ============================================================================

/**
 * Generate image using DALL-E 3 with fallback to DALL-E 2
 */
async function generateWithDalle(
  prompt: string,
  options: {
    size?: "1024x1024" | "1792x1024" | "1024x1792";
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
  } = {}
): Promise<string | null> {
  // Use dedicated image client (direct API, no proxy)
  const openai = getOpenAIClientForImages();
  if (!openai) return null;

  // Try DALL-E 3 first
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: options.size || "1792x1024",
      quality: options.quality || "hd",
      style: options.style || "natural",
    });

    return response.data?.[0]?.url || null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // If DALL-E 3 fails (unknown model, etc.), try DALL-E 2

    try {
      // DALL-E 2 only supports 256x256, 512x512, 1024x1024
      // Truncate prompt to 1000 chars (DALL-E 2 limit)
      const truncatedPrompt = prompt.length > 1000 ? prompt.substring(0, 997) + "..." : prompt;

      const response = await openai.images.generate({
        model: "dall-e-2",
        prompt: truncatedPrompt,
        n: 1,
        size: "1024x1024", // DALL-E 2 max size
      });

      return response.data?.[0]?.url || null;
    } catch (error2: unknown) {
      const error2Message = error2 instanceof Error ? error2.message : String(error2);

      return null;
    }
  }
}

// ============================================================================
// Main Image Generation API
// ============================================================================

/**
 * Main image generation with provider selection
 * Auto-selects provider based on image type for cost optimization:
 * - Hero images: Flux (67% cheaper, excellent for photorealistic travel scenes)
 * - Content images: DALL-E (better for specific detailed scenes)
 */
export async function generateImage(
  prompt: string,
  options: {
    size?: "1024x1024" | "1792x1024" | "1024x1792";
    quality?: "standard" | "hd";
    style?: "vivid" | "natural";
    provider?: ImageProvider;
    imageType?: "hero" | "content";
  } = {}
): Promise<string | null> {
  // Auto-select provider based on image type for cost optimization
  const provider = options.provider || (options.imageType === "hero" ? "flux" : "dalle3");

  if (provider === "flux" || provider === "auto") {
    // Map size to aspect ratio for Flux
    const aspectRatio =
      options.size === "1792x1024" ? "16:9" : options.size === "1024x1792" ? "9:16" : "1:1";

    const fluxResult = await generateWithFlux(prompt, aspectRatio);
    if (fluxResult) return fluxResult;

    // Always fallback to DALL-E if Flux fails (regardless of provider setting)

    return generateWithDalle(prompt, options);
  }

  return generateWithDalle(prompt, options);
}

/**
 * Generate all images for content (hero + optional content images)
 */
export async function generateContentImages(
  options: ImageGenerationOptions
): Promise<GeneratedImage[]> {
  const images: GeneratedImage[] = [];
  const slug = generateSlug(options.title);
  const timestamp = Date.now();

  // Generate hero image
  if (options.generateHero !== false) {
    const heroPrompt = await generateImagePrompt({
      ...options,
      generateHero: true,
    });

    if (heroPrompt) {
      const heroUrl = await generateImage(heroPrompt, {
        size: "1792x1024",
        quality: "hd",
        style: "natural",
        imageType: "hero", // Uses Flux for 67% cost savings
      });

      if (heroUrl) {
        images.push({
          url: heroUrl,
          filename: `${slug}-hero-${timestamp}.jpg`,
          alt: `${options.title} - Travel Guide`,
          caption: `Explore ${options.title}`,
          type: "hero",
        });
      } else {
      }
    } else {
    }
  }

  // Generate additional content images
  if (options.generateContentImages && options.contentImageCount && options.contentImageCount > 0) {
    const contentPromises = Array.from({ length: options.contentImageCount }, async (_, index) => {
      const contentPrompt = await generateImagePrompt({
        ...options,
        generateHero: false,
        description: `${options.description || options.title} - angle ${index + 1}`,
      });

      if (contentPrompt) {
        const contentUrl = await generateImage(contentPrompt, {
          size: "1024x1024",
          quality: "standard",
          style: "natural",
          imageType: "content", // Uses DALL-E for detailed scenes
        });

        if (contentUrl) {
          return {
            url: contentUrl,
            filename: `${slug}-content-${index + 1}-${timestamp}.jpg`,
            alt: `${options.title} - View ${index + 1}`,
            caption: `Discover more about ${options.title}`,
            type: "content" as const,
          };
        }
      }
      return null;
    });

    const contentResults = await Promise.all(contentPromises);
    images.push(
      ...(contentResults.filter(
        (img): img is NonNullable<typeof img> => img !== null
      ) as GeneratedImage[])
    );
  }

  return images;
}
