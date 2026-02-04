/**
 * Content Exploder Types
 * Types for entity extraction and content explosion system
 */

// Entity types that can be extracted from content
export type EntityType =
  | "hotel"
  | "restaurant"
  | "attraction"
  | "district"
  | "landmark"
  | "beach"
  | "museum"
  | "park"
  | "mall"
  | "market"
  | "cafe"
  | "bar"
  | "club"
  | "spa"
  | "activity";

// Article types for explosion
export type ExplodedArticleType =
  | "guide"
  | "best-of"
  | "comparison"
  | "seasonal"
  | "budget"
  | "luxury"
  | "family"
  | "romantic"
  | "first-time"
  | "insider"
  | "nearby"
  | "history"
  | "food-scene"
  | "nightlife"
  | "day-trip";

// Extracted entity from content
export interface ExtractedEntity {
  name: string;
  type: EntityType;
  description?: string;
  location?: string;
  attributes?: Record<string, unknown>;
  confidence: number;
  mentionCount: number;
  context: string[]; // Surrounding sentences where entity was found
}

// Entity extraction result
export interface EntityExtractionResult {
  success: boolean;
  entities: ExtractedEntity[];
  sourceContentId: string;
  extractionTimeMs: number;
  error?: string;
}

// Article idea generated from entities
export interface ArticleIdea {
  title: string;
  description: string;
  articleType: ExplodedArticleType;
  targetKeywords: string[];
  targetEntities: string[]; // Entity names to include
  estimatedWordCount: number;
  searchIntent: "informational" | "commercial" | "transactional" | "navigational";
  seasonality?: "evergreen" | "seasonal" | "trending";
  audienceSegment?: string;
  priorityScore: number; // 1-100, based on SEO potential
}

// Ideation result
export interface IdeationResult {
  success: boolean;
  ideas: ArticleIdea[];
  sourceEntities: string[];
  ideationTimeMs: number;
  error?: string;
}

// Explosion job configuration
export interface ExplosionConfig {
  articleTypes?: ExplodedArticleType[];
  maxArticles?: number;
  locale?: string;
  priority?: number;
  minConfidence?: number; // Minimum entity confidence to use
  targetDestination?: string;
  excludeEntityTypes?: EntityType[];
  includeEntityTypes?: EntityType[];
}

// Explosion job status
export type ExplosionJobStatus =
  | "pending"
  | "extracting"
  | "ideating"
  | "generating"
  | "completed"
  | "failed"
  | "cancelled";

// Explosion job progress
export interface ExplosionJobProgress {
  status: ExplosionJobStatus;
  entitiesExtracted: number;
  ideasGenerated: number;
  articlesGenerated: number;
  articlesTarget: number;
  currentStep?: string;
  error?: string;
}

// Full explosion result
export interface ExplosionResult {
  success: boolean;
  jobId: string;
  sourceContentId: string;
  entities: ExtractedEntity[];
  ideas: ArticleIdea[];
  generatedContentIds: string[];
  stats: {
    entitiesExtracted: number;
    ideasGenerated: number;
    articlesGenerated: number;
    articlesPublished: number;
    totalTimeMs: number;
  };
  error?: string;
}

// Article type metadata for generation
export const ARTICLE_TYPE_METADATA: Record<
  ExplodedArticleType,
  {
    titlePattern: string;
    minWords: number;
    maxWords: number;
    requiredSections: string[];
    seoFocus: string;
    audienceHint: string;
  }
> = {
  guide: {
    titlePattern: "Complete Guide to {entity} ({year})",
    minWords: 1500,
    maxWords: 3000,
    requiredSections: ["introduction", "overview", "tips", "faq"],
    seoFocus: "informational long-tail",
    audienceHint: "first-time visitors seeking comprehensive info",
  },
  "best-of": {
    titlePattern: "Best {category} Near {location} - Top {count} Picks",
    minWords: 1200,
    maxWords: 2500,
    requiredSections: ["introduction", "list", "comparison", "conclusion"],
    seoFocus: "commercial listicle",
    audienceHint: "decision-makers comparing options",
  },
  comparison: {
    titlePattern: "{entity1} vs {entity2}: Which is Better?",
    minWords: 1000,
    maxWords: 2000,
    requiredSections: ["introduction", "comparison-table", "pros-cons", "verdict"],
    seoFocus: "commercial comparison",
    audienceHint: "people deciding between two options",
  },
  seasonal: {
    titlePattern: "{entity} in {season} {year}: What to Expect",
    minWords: 800,
    maxWords: 1800,
    requiredSections: ["introduction", "weather", "events", "tips", "packing"],
    seoFocus: "seasonal informational",
    audienceHint: "travelers planning specific season trips",
  },
  budget: {
    titlePattern: "{entity} on a Budget: Save Money in {year}",
    minWords: 1000,
    maxWords: 2000,
    requiredSections: ["introduction", "costs", "free-activities", "budget-tips"],
    seoFocus: "budget traveler commercial",
    audienceHint: "budget-conscious travelers",
  },
  luxury: {
    titlePattern: "Luxury Guide to {entity}: VIP Experiences",
    minWords: 1200,
    maxWords: 2500,
    requiredSections: ["introduction", "premium-options", "exclusive-access", "concierge-tips"],
    seoFocus: "luxury commercial",
    audienceHint: "affluent travelers seeking premium experiences",
  },
  family: {
    titlePattern: "{entity} with Kids: Family-Friendly Guide",
    minWords: 1200,
    maxWords: 2500,
    requiredSections: ["introduction", "kid-friendly", "logistics", "safety", "tips"],
    seoFocus: "family travel informational",
    audienceHint: "parents traveling with children",
  },
  romantic: {
    titlePattern: "Romantic {entity}: Couples Guide {year}",
    minWords: 1000,
    maxWords: 2000,
    requiredSections: ["introduction", "romantic-spots", "dining", "activities"],
    seoFocus: "couples commercial",
    audienceHint: "couples planning romantic trips",
  },
  "first-time": {
    titlePattern: "First Time at {entity}? Essential Guide",
    minWords: 1500,
    maxWords: 3000,
    requiredSections: ["introduction", "essentials", "mistakes-to-avoid", "itinerary", "faq"],
    seoFocus: "beginner informational",
    audienceHint: "first-time visitors needing guidance",
  },
  insider: {
    titlePattern: "{entity} Insider Tips: Secrets Locals Know",
    minWords: 1000,
    maxWords: 2000,
    requiredSections: ["introduction", "hidden-gems", "local-tips", "off-beaten-path"],
    seoFocus: "insider informational",
    audienceHint: "experienced travelers seeking authentic experiences",
  },
  nearby: {
    titlePattern: "Things to Do Near {entity}: {count} Must-See Spots",
    minWords: 1200,
    maxWords: 2500,
    requiredSections: ["introduction", "nearby-attractions", "distances", "itinerary"],
    seoFocus: "local discovery commercial",
    audienceHint: "visitors wanting to explore the area",
  },
  history: {
    titlePattern: "History of {entity}: From Past to Present",
    minWords: 1200,
    maxWords: 2500,
    requiredSections: ["introduction", "timeline", "significance", "preservation"],
    seoFocus: "educational informational",
    audienceHint: "history enthusiasts and culture seekers",
  },
  "food-scene": {
    titlePattern: "Where to Eat at {entity}: Food Guide",
    minWords: 1000,
    maxWords: 2000,
    requiredSections: ["introduction", "restaurants", "local-dishes", "food-tips"],
    seoFocus: "food commercial",
    audienceHint: "foodies and culinary travelers",
  },
  nightlife: {
    titlePattern: "{entity} After Dark: Nightlife Guide",
    minWords: 800,
    maxWords: 1800,
    requiredSections: ["introduction", "bars-clubs", "safety", "dress-code"],
    seoFocus: "nightlife commercial",
    audienceHint: "nightlife seekers",
  },
  "day-trip": {
    titlePattern: "Day Trip to {entity}: Complete Itinerary",
    minWords: 1000,
    maxWords: 2000,
    requiredSections: ["introduction", "itinerary", "transport", "costs", "tips"],
    seoFocus: "day-trip planning",
    audienceHint: "travelers with limited time",
  },
};
