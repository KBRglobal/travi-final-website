/**
 * AI Hotel Description Generator
 * Generates engaging, SEO-optimized hotel descriptions using gpt-4o-mini
 * Uses in-memory caching with proper TTL eviction
 */

import { getAllUnifiedProviders } from "./providers";
import type { AIMessage } from "./providers";

function getUnifiedProvider() {
  const providers = getAllUnifiedProviders();
  return providers.length > 0 ? providers[0] : null;
}

interface HotelData {
  id: string;
  name: string;
  stars: number;
  location: {
    name?: string;
    city: string;
    country?: string;
  };
  amenities: string[];
  facilities?: string[];
  rating?: number | null;
  reviews?: number;
}

export interface GeneratedDescription {
  description: string;
  highlights: string[];
  seoTitle: string;
  seoDescription: string;
  generatedAt: number;
}

const descriptionCache = new Map<string, GeneratedDescription>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function isExpired(entry: GeneratedDescription): boolean {
  return Date.now() - entry.generatedAt > CACHE_TTL;
}

function evictExpiredEntries(): void {
  const keysToDelete: string[] = [];
  descriptionCache.forEach((entry, key) => {
    if (isExpired(entry)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => descriptionCache.delete(key));
  if (keysToDelete.length > 0) {
    console.log(`[HotelAI] Evicted ${keysToDelete.length} expired cache entries`);
  }
}

export async function generateHotelDescription(
  hotel: HotelData,
  lang: string = "en"
): Promise<GeneratedDescription | null> {
  const cacheKey = `${hotel.id}-${lang}`;
  
  evictExpiredEntries();
  
  const cached = descriptionCache.get(cacheKey);
  if (cached && !isExpired(cached)) {
    console.log(`[HotelAI] Cache hit for ${hotel.name}`);
    return cached;
  }
  
  if (cached && isExpired(cached)) {
    descriptionCache.delete(cacheKey);
  }

  const provider = getUnifiedProvider();
  if (!provider) {
    console.warn("[HotelAI] No AI provider available");
    return null;
  }

  const luxuryTier = hotel.stars >= 5 ? "ultra-luxury" : hotel.stars >= 4 ? "luxury" : "premium";
  const amenitiesList = [...(hotel.amenities || []), ...(hotel.facilities || [])].filter(Boolean).join(", ");
  const locationStr = [hotel.location.name, hotel.location.city, hotel.location.country].filter(Boolean).join(", ");

  const systemPrompt = `You are an expert travel copywriter specializing in luxury hotel marketing. 
Write engaging, SEO-optimized content that appeals to discerning travelers.
Always be factual - never invent amenities or features not provided.
Use a sophisticated but approachable tone.
Response MUST be valid JSON only.`;

  const userPrompt = `Generate marketing content for this ${luxuryTier} hotel:

Hotel Name: ${hotel.name}
Star Rating: ${hotel.stars} stars
Location: ${locationStr}
Available Amenities: ${amenitiesList || "Standard luxury amenities"}
${hotel.rating ? `Guest Rating: ${hotel.rating}/10 from ${hotel.reviews || 0} reviews` : ""}

Generate content in ${lang === "en" ? "English" : lang} language.

Return JSON with these exact fields:
{
  "description": "2-3 paragraph engaging description (200-300 words) highlighting the hotel's luxury features, location advantages, and guest experience. Include specific amenities mentioned.",
  "highlights": ["Array of 5-6 short bullet points about key features"],
  "seoTitle": "SEO optimized title: [Hotel Name] | [Star Rating]-Star ${luxuryTier.charAt(0).toUpperCase() + luxuryTier.slice(1)} Hotel in [City] | TRAVI",
  "seoDescription": "150-160 character meta description for SEO, mentioning key selling points"
}`;

  const messages: AIMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  try {
    // Don't override model - let provider use its own default model
    // Each provider has appropriate model configured (claude for Anthropic, gpt-4o-mini for OpenAI, etc.)
    const result = await provider.generateCompletion({
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      responseFormat: { type: "json_object" }
    });

    let parsed: any;
    try {
      // Strip markdown code fences if present (some models wrap JSON in ```json ... ```)
      let jsonContent = result.content.trim();
      if (jsonContent.startsWith("```")) {
        // Remove opening fence (```json or ```)
        jsonContent = jsonContent.replace(/^```(?:json)?\s*\n?/, "");
        // Remove closing fence
        jsonContent = jsonContent.replace(/\n?```\s*$/, "");
      }
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("[HotelAI] JSON parse error:", parseError);
      console.error("[HotelAI] Raw content:", result.content);
      return null;
    }
    
    if (!parsed.description || typeof parsed.description !== "string") {
      console.error("[HotelAI] Invalid response structure - missing description");
      return null;
    }
    
    const generated: GeneratedDescription = {
      description: parsed.description,
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.filter((h: any) => typeof h === "string") : [],
      seoTitle: parsed.seoTitle || `${hotel.name} | ${hotel.stars}-Star Hotel | TRAVI`,
      seoDescription: parsed.seoDescription || `Book ${hotel.name}, a ${hotel.stars}-star hotel in ${hotel.location.city}. Experience luxury amenities and exceptional service.`,
      generatedAt: Date.now()
    };

    descriptionCache.set(cacheKey, generated);
    console.log(`[HotelAI] Generated description for ${hotel.name} (${provider.name}/${provider.model})`);
    
    return generated;
  } catch (error) {
    console.error("[HotelAI] Generation error:", error);
    return null;
  }
}

export function clearDescriptionCache(hotelId?: string): void {
  if (hotelId) {
    const keysToDelete: string[] = [];
    descriptionCache.forEach((_, key) => {
      if (key.startsWith(`${hotelId}-`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => descriptionCache.delete(key));
    console.log(`[HotelAI] Cleared cache for hotel ${hotelId}: ${keysToDelete.length} entries`);
  } else {
    const size = descriptionCache.size;
    descriptionCache.clear();
    console.log(`[HotelAI] Cleared entire cache: ${size} entries`);
  }
}

export function getCacheStats(): { size: number; keys: string[]; expired: number } {
  let expired = 0;
  const keys: string[] = [];
  descriptionCache.forEach((entry, key) => {
    keys.push(key);
    if (isExpired(entry)) expired++;
  });
  return {
    size: descriptionCache.size,
    keys,
    expired
  };
}
