/**
 * Intent Classifier
 * 
 * Understands what the user is looking for
 * Multi-language support: English, Hebrew, Arabic
 */

import { db } from '../db';
import { destinations, districts, contents } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export type IntentType = 
  | "hotel_search"
  | "restaurant_search"
  | "attraction_search"
  | "activity_search"
  | "guide_search"
  | "price_comparison"
  | "location_based"
  | "general";

export interface ExtractedEntities {
  locations?: string[];
  priceRange?: { min?: number; max?: number; currency?: string };
  dates?: { start?: string; end?: string };
  amenities?: string[];
  cuisineTypes?: string[];
  rating?: number;
  groupSize?: number;
  occasion?: string; // "romantic", "business", "family"
}

export interface Intent {
  primary: IntentType;
  confidence: number;
  entities: ExtractedEntities;
  suggestedFilters: {
    contentTypes?: string[];
    priceRange?: [number, number];
    rating?: number;
    location?: string;
  };
}

// Multi-language intent patterns
const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  hotel_search: [
    /\b(hotel|hotels|stay|accommodation|resort|hostel|lodge|inn)\b/i,
    /(מלון|מלונות|לינה|אכסניה)/i,
    /(فندق|فنادق|إقامة|منتجع)/i,
    /where.*(stay|sleep)|איפה.*(לישון|ללון)|أين.*(أقيم|أنام)/i,
  ],
  restaurant_search: [
    /\b(restaurant|restaurants|food|dining|eat|cuisine|cafe|bistro|dinner|lunch|breakfast|brunch)\b/i,
    /(מסעדה|מסעדות|אוכל|לאכול|בית קפה)/i,
    /(مطعم|مطاعم|طعام|أكل|مقهى)/i,
    /where.*(eat|dine)|איפה.*לאכול|أين.*آكل/i,
  ],
  attraction_search: [
    /\b(attraction|attractions|visit|see|tour|museum|park|landmark)\b/i,
    /(אטרקציה|אטרקציות|לבקר|מוזיאון|פארק)/i,
    /(معلم|معالم|زيارة|متحف|حديقة)/i,
    /things.*(do|see)|מה.*(לעשות|לראות)|ماذا.*(أفعل|أرى)/i,
  ],
  activity_search: [
    /\b(activity|activities|adventure|experience|safari|cruise|tour)\b/i,
    /(פעילות|פעילויות|הרפתקה|ספארי|שייט)/i,
    /(نشاط|أنشطة|مغامرة|سفاري|رحلة)/i,
  ],
  guide_search: [
    /\b(guide|guides|tips|advice|how.to|itinerary|plan)\b/i,
    /(מדריך|טיפים|עצות|איך|תכנון)/i,
    /(دليل|نصائح|كيف|تخطيط)/i,
  ],
  price_comparison: [
    /\b(cheap|cheapest|budget|affordable|price|cost|compare|deal)\b/i,
    /(זול|זולים|תקציב|מחיר|עלות|השוואה)/i,
    /(رخيص|ميزانية|سعر|تكلفة|مقارنة)/i,
    /best.*(value|deal)|שווה.*כסף|أفضل.*قيمة/i,
  ],
  location_based: [
    /\b(near|nearby|around|close.to|in|at|area|district|neighborhood)\b/i,
    /(ליד|קרוב|באזור|בשכונה)/i,
    /(قريب|بالقرب|في منطقة|في حي)/i,
  ],
  general: [],
};

// Fallback locations in case DB is unavailable
const FALLBACK_LOCATIONS = [
  "dubai marina", "palm jumeirah", "downtown dubai", "burj khalifa",
  "jbr", "jumeirah beach", "deira", "bur dubai", "business bay", "difc",
  "jumeirah", "al barsha", "dubai mall", "dubai creek", "festival city",
  "silicon oasis", "motor city", "sports city", "arabian ranches",
  "dubai hills", "city walk", "la mer", "bluewaters", "ain dubai",
  // Hebrew
  "דובאי מרינה", "פאלם ג'ומיירה", "בורג' חליפה",
  // Arabic  
  "دبي مارينا", "نخلة جميرا", "برج خليفة",
];

// Cache for dynamic locations
let cachedLocations: string[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get locations dynamically from database with caching
 */
async function getDynamicLocations(): Promise<string[]> {
  const now = Date.now();
  if (cachedLocations.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLocations;
  }

  try {
    // Get destination names
    const destRows = await db.select({ name: destinations.name }).from(destinations);
    const destNames = destRows.map(d => d.name.toLowerCase());

    // Get district location/neighborhood from districts table
    const districtRows = await db.select({ 
      location: districts.location,
      neighborhood: districts.neighborhood 
    }).from(districts);
    const districtLocations = districtRows
      .flatMap(d => [d.location, d.neighborhood])
      .filter((loc): loc is string => loc !== null && loc !== undefined)
      .map(loc => loc.toLowerCase());

    // Also get district titles from contents table for district content types
    const districtContentsRows = await db.select({ title: contents.title })
      .from(contents)
      .where(eq(contents.type, 'district'));
    const districtTitles = districtContentsRows.map(c => c.title.toLowerCase());

    // Combine and deduplicate
    const allLocations = [...new Set([
      ...destNames,
      ...districtLocations,
      ...districtTitles,
      ...FALLBACK_LOCATIONS // Include fallback for multi-language support
    ])];

    cachedLocations = allLocations;
    cacheTimestamp = now;
    
    console.log(`[IntentClassifier] Loaded ${cachedLocations.length} locations from DB`);
    return cachedLocations;
  } catch (error) {
    console.error('[IntentClassifier] Failed to load locations from DB, using fallback:', error);
    return FALLBACK_LOCATIONS;
  }
}

// Occasion patterns
const OCCASION_PATTERNS: Record<string, RegExp> = {
  romantic: /(romantic|רומנטי|رومانسي|date.night|anniversary|honeymoon)/i,
  family: /(family|families|kids|children|משפחה|משפחתי|ילדים|عائلة|عائلي|أطفال)/i,
  business: /(business|corporate|meeting|conference|עסקי|פגישה|تجاري|اجتماع)/i,
  luxury: /(luxury|luxurious|premium|vip|exclusive|יוקרה|יוקרתי|فاخر|حصري)/i,
  budget: /(budget|cheap|affordable|backpacker|תקציבי|זול|ميزانية|رخيص)/i,
};

export const intentClassifier = {
  /**
   * Classify query intent with entity extraction
   */
  async classify(query: string, locale?: string): Promise<Intent> {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Find best matching intent
    let bestIntent: IntentType = "general";
    let bestConfidence = 0.4; // Base confidence for general

    for (const [intentName, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (intentName === "general") continue;
      
      for (const pattern of patterns) {
        if (pattern.test(normalizedQuery)) {
          const confidence = 0.75 + (patterns.indexOf(pattern) === 0 ? 0.15 : 0.05);
          if (confidence > bestConfidence) {
            bestIntent = intentName as IntentType;
            bestConfidence = confidence;
          }
        }
      }
    }

    // Extract entities (now async)
    const entities = await this.extractEntities(normalizedQuery);

    // If entities found, boost confidence
    if (Object.keys(entities).length > 0) {
      bestConfidence = Math.min(bestConfidence + 0.1, 1);
    }

    // Suggest filters based on intent
    const suggestedFilters = this.buildFilters(bestIntent, entities);

    return {
      primary: bestIntent,
      confidence: bestConfidence,
      entities,
      suggestedFilters,
    };
  },

  /**
   * Extract entities from query
   */
  async extractEntities(query: string): Promise<ExtractedEntities> {
    const entities: ExtractedEntities = {};

    // Get locations from database with caching
    const locations = await getDynamicLocations();

    // Extract locations
    const foundLocations = locations.filter(loc => 
      query.toLowerCase().includes(loc.toLowerCase())
    );
    if (foundLocations.length > 0) {
      entities.locations = foundLocations;
    }

    // Extract price indicators
    const priceMatch = query.match(/(?:under|below|less than|up to|עד|أقل من|حتى)\s*(?:AED|aed|₪|\$|درهم)?\s*(\d+)/i);
    if (priceMatch) {
      entities.priceRange = { max: parseInt(priceMatch[1]), currency: "AED" };
    }
    const priceFromMatch = query.match(/(?:from|starting|minimum|מ-|من)\s*(?:AED|aed|₪|\$|درهم)?\s*(\d+)/i);
    if (priceFromMatch) {
      entities.priceRange = { ...entities.priceRange, min: parseInt(priceFromMatch[1]) };
    }

    // Extract rating
    const ratingMatch = query.match(/(\d+(?:\.\d+)?)\s*(?:star|stars|כוכבים|نجوم|\+)/i);
    if (ratingMatch) {
      entities.rating = parseFloat(ratingMatch[1]);
    }

    // Extract occasion
    for (const [occasion, pattern] of Object.entries(OCCASION_PATTERNS)) {
      if (pattern.test(query)) {
        entities.occasion = occasion;
        break;
      }
    }

    // Extract group size
    const groupMatch = query.match(/(?:for|ל|لـ)\s*(\d+)\s*(?:people|persons|guests|אנשים|أشخاص)/i);
    if (groupMatch) {
      entities.groupSize = parseInt(groupMatch[1]);
    }

    return entities;
  },

  /**
   * Build filter suggestions from intent and entities
   */
  buildFilters(intent: IntentType, entities: ExtractedEntities): Intent["suggestedFilters"] {
    const filters: Intent["suggestedFilters"] = {};

    // Map intent to content types
    const typeMap: Record<IntentType, string[] | undefined> = {
      hotel_search: ["hotel"],
      restaurant_search: ["dining", "restaurant"],
      attraction_search: ["attraction"],
      activity_search: ["attraction", "event"],
      guide_search: ["article", "itinerary"],
      price_comparison: undefined,
      location_based: undefined,
      general: undefined,
    };

    filters.contentTypes = typeMap[intent];

    if (entities.priceRange) {
      filters.priceRange = [
        entities.priceRange.min || 0,
        entities.priceRange.max || 10000,
      ];
    }

    if (entities.rating) {
      filters.rating = entities.rating;
    }

    if (entities.locations?.[0]) {
      filters.location = entities.locations[0];
    }

    return filters;
  },
};
