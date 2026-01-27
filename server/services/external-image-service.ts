/**
 * External Image Service
 * Handles integration with external image providers (DALL-E, Freepik)
 */

import OpenAI from "openai";
import { getImageService, ImageUploadResponse } from "./image-service";
import { fetchWithTimeout } from "../lib/fetch-with-timeout";

const REPLICATE_TIMEOUT_MS = 30000;
const FREEPIK_TIMEOUT_MS = 15000;

// ============================================================================
// TYPES
// ============================================================================

export type AIProvider = "dalle3" | "dalle2" | "flux" | "auto";

export interface AIGenerationOptions {
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
  provider?: AIProvider;
}

export interface AIGenerationResult {
  success: true;
  url: string;
  provider: string;
  revisedPrompt?: string;
}

export interface AIGenerationError {
  success: false;
  error: string;
  code?: string;
}

export type AIGenerationResponse = AIGenerationResult | AIGenerationError;

export interface FreepikSearchResult {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  author: string;
  premium: boolean;
}

export interface FreepikSearchOptions {
  limit?: number;
  page?: number;
  orientation?: "horizontal" | "vertical" | "square";
  premium?: boolean;
}

// ============================================================================
// OPENAI CLIENT
// ============================================================================

let openaiClient: OpenAI | null = null;

// Helper to get a valid API key (skips dummy keys from Replit)
function getValidOpenAIKey(): string | null {
  // Check OPENAI_API_KEY first (user's direct key)
  const directKey = process.env.OPENAI_API_KEY;
  if (directKey && !directKey.includes("DUMMY")) {
    return directKey;
  }

  // Fallback to AI integrations key
  const integrationsKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (integrationsKey && !integrationsKey.includes("DUMMY")) {
    return integrationsKey;
  }

  return null;
}

function getOpenAIClient(): OpenAI | null {
  const apiKey = getValidOpenAIKey();

  if (!apiKey) {
    return null;
  }

  if (!openaiClient) {
    // IMPORTANT: Do NOT use BASE_URL for image generation
    // Replit AI integrations proxy doesn't support DALL-E models
    openaiClient = new OpenAI({
      apiKey,
      // Intentionally not using baseURL - DALL-E requires direct OpenAI API
    });
  }

  return openaiClient;
}

// ============================================================================
// DALL-E GENERATION
// ============================================================================

/**
 * Generate image with DALL-E 3 (with fallback to DALL-E 2)
 */
async function generateWithDalle(
  prompt: string,
  options: AIGenerationOptions = {}
): Promise<AIGenerationResponse> {
  const openai = getOpenAIClient();
  if (!openai) {
    return { success: false, error: "OpenAI not configured", code: "NOT_CONFIGURED" };
  }

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

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    return {
      success: true,
      url: imageUrl,
      provider: "dalle3",
      revisedPrompt: response.data?.[0]?.revised_prompt,
    };
  } catch (error: any) {
    // Fallback to DALL-E 2
    return generateWithDalle2(prompt);
  }
}

/**
 * Generate image with DALL-E 2
 */
async function generateWithDalle2(prompt: string): Promise<AIGenerationResponse> {
  const openai = getOpenAIClient();
  if (!openai) {
    return { success: false, error: "OpenAI not configured", code: "NOT_CONFIGURED" };
  }

  try {
    // DALL-E 2 constraints
    const truncatedPrompt = prompt.length > 1000 ? prompt.substring(0, 997) + "..." : prompt;

    const response = await openai.images.generate({
      model: "dall-e-2",
      prompt: truncatedPrompt,
      n: 1,
      size: "1024x1024", // DALL-E 2 max size
    });

    const imageUrl = response.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    return {
      success: true,
      url: imageUrl,
      provider: "dalle2",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "DALL-E generation failed",
      code: "GENERATION_FAILED",
    };
  }
}

// ============================================================================
// FLUX GENERATION (via Replicate)
// ============================================================================

/**
 * Generate image with Flux
 */
async function generateWithFlux(
  prompt: string,
  aspectRatio: string = "16:9"
): Promise<AIGenerationResponse> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return { success: false, error: "Replicate not configured", code: "NOT_CONFIGURED" };
  }

  try {
    const response = await fetchWithTimeout("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "black-forest-labs/flux-schnell",
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          num_outputs: 1,
        },
      }),
      timeoutMs: REPLICATE_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Replicate API error: ${response.status}`);
    }

    const prediction = await response.json();

    // Poll for completion
    let result = prediction;
    while (result.status !== "succeeded" && result.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetchWithTimeout(
        `https://api.replicate.com/v1/predictions/${result.id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          },
          timeoutMs: REPLICATE_TIMEOUT_MS,
        }
      );
      result = await pollResponse.json();
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Flux generation failed");
    }

    const imageUrl = result.output?.[0];
    if (!imageUrl) {
      throw new Error("No image URL in response");
    }

    return {
      success: true,
      url: imageUrl,
      provider: "flux",
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Flux generation failed",
      code: "GENERATION_FAILED",
    };
  }
}

// ============================================================================
// FREEPIK SEARCH
// ============================================================================

/**
 * Search Freepik for images
 */
export async function searchFreepik(
  query: string,
  options: FreepikSearchOptions = {}
): Promise<{ success: true; results: FreepikSearchResult[] } | { success: false; error: string }> {
  const apiKey = process.env.FREEPIK_API_KEY;
  if (!apiKey) {
    return { success: false, error: "Freepik API key not configured" };
  }

  try {
    const params = new URLSearchParams({
      term: query,
      limit: String(options.limit || 20),
      page: String(options.page || 1),
      ...(options.orientation && { orientation: options.orientation }),
      filters: JSON.stringify({
        content_type: ["photo"],
        ...(options.premium !== undefined && { premium: options.premium }),
      }),
    });

    const response = await fetchWithTimeout(`https://api.freepik.com/v1/resources?${params}`, {
      headers: {
        Accept: "application/json",
        "x-freepik-api-key": apiKey,
      },
      timeoutMs: FREEPIK_TIMEOUT_MS,
    });

    if (!response.ok) {
      throw new Error(`Freepik API error: ${response.status}`);
    }

    const data = await response.json();
    const results: FreepikSearchResult[] = (data.data || []).map((item: any) => ({
      id: String(item.id),
      title: item.title || "",
      url: item.image?.source?.url || item.url,
      thumbnailUrl: item.thumbnails?.[0]?.url || item.image?.source?.url,
      author: item.author?.name || "Unknown",
      premium: item.premium || false,
    }));

    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error?.message || "Freepik search failed" };
  }
}

/**
 * Download image from Freepik and store locally
 */
export async function downloadFromFreepik(
  freepikUrl: string,
  filename: string,
  options?: { altText?: string; contentId?: number }
): Promise<ImageUploadResponse> {
  const imageService = getImageService();
  return imageService.uploadFromUrl(freepikUrl, filename, {
    source: "freepik",
    altText: options?.altText,
    contentId: options?.contentId,
  });
}

// ============================================================================
// EXTERNAL IMAGE SERVICE CLASS
// ============================================================================

export class ExternalImageService {
  /**
   * Generate AI image (auto-selects best provider)
   */
  async generateAIImage(
    prompt: string,
    options: AIGenerationOptions = {}
  ): Promise<AIGenerationResponse> {
    const provider = options.provider || "auto";

    // Try Flux first for hero images (cheaper and good quality)
    if (provider === "flux" || provider === "auto") {
      const aspectRatio =
        options.size === "1792x1024" ? "16:9" : options.size === "1024x1792" ? "9:16" : "1:1";

      const fluxResult = await generateWithFlux(prompt, aspectRatio);
      if (fluxResult.success) return fluxResult;

      // If auto, fallback to DALL-E
      if (provider === "auto") {
        return generateWithDalle(prompt, options);
      }

      return fluxResult;
    }

    // DALL-E 3 (with automatic DALL-E 2 fallback)
    if (provider === "dalle3") {
      return generateWithDalle(prompt, options);
    }

    // DALL-E 2 only
    if (provider === "dalle2") {
      return generateWithDalle2(prompt);
    }

    return { success: false, error: "Unknown provider", code: "INVALID_PROVIDER" };
  }

  /**
   * Generate AI image and store it
   */
  async generateAndStoreAIImage(
    prompt: string,
    filename: string,
    options?: AIGenerationOptions & { altText?: string; contentId?: number }
  ): Promise<ImageUploadResponse> {
    // Generate the image
    const generation = await this.generateAIImage(prompt, options);
    if (!generation.success) {
      const err = generation as AIGenerationError;
      return { success: false, error: err.error, code: err.code };
    }

    // Store the generated image
    const imageService = getImageService();
    return imageService.uploadFromUrl(generation.url, filename, {
      source: "ai",
      altText: options?.altText,
      contentId: options?.contentId,
      metadata: {
        prompt,
        provider: generation.provider,
        revisedPrompt: generation.revisedPrompt,
      },
    });
  }

  /**
   * Search Freepik
   */
  async searchFreepik(
    query: string,
    options?: FreepikSearchOptions
  ): Promise<
    { success: true; results: FreepikSearchResult[] } | { success: false; error: string }
  > {
    return searchFreepik(query, options);
  }

  /**
   * Download from Freepik and store
   */
  async downloadFromFreepik(
    freepikUrl: string,
    filename: string,
    options?: { altText?: string; contentId?: number }
  ): Promise<ImageUploadResponse> {
    return downloadFromFreepik(freepikUrl, filename, options);
  }

  /**
   * Download from any external URL and store
   */
  async downloadFromUrl(
    url: string,
    filename: string,
    options?: { altText?: string; contentId?: number }
  ): Promise<ImageUploadResponse> {
    const imageService = getImageService();
    return imageService.uploadFromUrl(url, filename, {
      source: "external",
      altText: options?.altText,
      contentId: options?.contentId,
    });
  }
}

// Singleton
let externalImageServiceInstance: ExternalImageService | null = null;

export function getExternalImageService(): ExternalImageService {
  if (!externalImageServiceInstance) {
    externalImageServiceInstance = new ExternalImageService();
  }
  return externalImageServiceInstance;
}
