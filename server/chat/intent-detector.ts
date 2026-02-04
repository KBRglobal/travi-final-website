/**
 * Intent Detector - Keyword-based intent detection for chat messages
 *
 * Detects user intent WITHOUT using AI - pure keyword/pattern matching.
 * This keeps chat responses fast and avoids extra API calls.
 *
 * Intent Types:
 * - browse: User wants to explore/see destinations, hotels, attractions
 * - compare: User wants to compare two or more options
 * - plan: User wants help planning a trip
 * - learn: User wants information/knowledge about something
 * - general: Fallback for general conversation
 */

/**
 * Intent type enum (per requirements: browse, compare, plan, learn)
 */
export type Intent = "browse" | "compare" | "plan" | "learn";

/**
 * Intent detection result with numeric confidence (0-1) and extracted entities
 */
export interface IntentResult {
  intent: Intent;
  confidence: number;
  extractedEntities: {
    destinations?: string[];
    contentTypes?: ("hotel" | "attraction" | "article" | "restaurant")[];
    comparisonTerms?: string[];
  };
}

/**
 * Keyword patterns for each intent
 */
const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  browse: [
    /show\s+(me\s+)?/i,
    /find\s+(me\s+)?/i,
    /search\s+(for\s+)?/i,
    /looking\s+for/i,
    /explore/i,
    /discover/i,
    /see\s+(the\s+)?/i,
    /view\s+(the\s+)?/i,
    /list\s+(of\s+)?/i,
    /what\s+(are|is)\s+the\s+best/i,
    /what('s|s)?\s+in/i,
    /top\s+\d*\s*(hotels?|attractions?|restaurants?|places?|things?)/i,
    /best\s+(hotels?|attractions?|restaurants?|places?|things?)/i,
    /recommend\s+(me\s+)?/i,
    /suggest\s+(some\s+)?/i,
    /where\s+can\s+i/i,
    /where\s+should\s+i/i,
    /hotels?\s+in/i,
    /attractions?\s+in/i,
    /restaurants?\s+in/i,
    /things?\s+to\s+do/i,
    /places?\s+to\s+(visit|go|see|eat|stay)/i,
  ],

  compare: [
    /compare/i,
    /vs\.?/i,
    /versus/i,
    /difference\s+between/i,
    /which\s+(is|one|city|destination)\s+(better|best)/i,
    /(\w+)\s+or\s+(\w+)/i,
    /better\s+(than|choice)/i,
    /pros?\s+and\s+cons?/i,
    /should\s+i\s+(go\s+to|visit|choose)/i,
    /what('s|\s+is)\s+the\s+difference/i,
  ],

  plan: [
    /plan\s+(a\s+|my\s+)?trip/i,
    /planning\s+(a\s+|my\s+)?/i,
    /itinerary/i,
    /\d+\s+days?\s+in/i,
    /\d+\s+nights?\s+in/i,
    /weekend\s+(in|trip|getaway)/i,
    /vacation\s+(to|in|plan)/i,
    /holiday\s+(to|in|plan)/i,
    /how\s+many\s+days/i,
    /schedule/i,
    /travel\s+plan/i,
    /trip\s+to/i,
    /visiting\s+for\s+\d+/i,
    /first\s+time\s+(in|visiting)/i,
    /help\s+me\s+plan/i,
    /organize\s+(a\s+|my\s+)?trip/i,
  ],

  learn: [
    /what\s+(is|are|was|were)/i,
    /who\s+(is|are|was|were)/i,
    /when\s+(is|was|did|do)/i,
    /why\s+(is|are|do|did)/i,
    /how\s+(do|does|did|is|are|can|to)/i,
    /tell\s+me\s+(about|more)/i,
    /explain/i,
    /describe/i,
    /information\s+(about|on)/i,
    /learn\s+(about|more)/i,
    /history\s+of/i,
    /culture\s+of/i,
    /weather\s+in/i,
    /best\s+time\s+to\s+visit/i,
    /currency\s+in/i,
    /language\s+in/i,
    /visa\s+(for|to|requirement)/i,
    /do\s+i\s+need\s+(a\s+)?visa/i,
    /safety\s+in/i,
    /is\s+it\s+safe/i,
    /cost\s+of\s+living/i,
    /how\s+expensive/i,
  ],
};

/**
 * Keywords that indicate specific content types
 */
const CONTENT_TYPE_KEYWORDS: Record<string, "hotel" | "attraction" | "article" | "restaurant"> = {
  hotel: "hotel",
  hotels: "hotel",
  accommodation: "hotel",
  stay: "hotel",
  resort: "hotel",
  hostel: "hotel",
  airbnb: "hotel",
  lodging: "hotel",

  attraction: "attraction",
  attractions: "attraction",
  landmark: "attraction",
  landmarks: "attraction",
  sight: "attraction",
  sights: "attraction",
  sightseeing: "attraction",
  museum: "attraction",
  museums: "attraction",
  monument: "attraction",
  monuments: "attraction",

  restaurant: "restaurant",
  restaurants: "restaurant",
  food: "restaurant",
  dining: "restaurant",
  eat: "restaurant",
  eating: "restaurant",
  cuisine: "restaurant",
  cafe: "restaurant",
  cafes: "restaurant",

  article: "article",
  articles: "article",
  guide: "article",
  guides: "article",
  blog: "article",
  post: "article",
  read: "article",
  tip: "article",
  tips: "article",
};

/**
 * Common destination names for extraction
 */
// Destinations with actual content in our database
// Kept in sync with DESTINATIONS_WITH_GUIDES in guide-insights.tsx
const KNOWN_DESTINATIONS = [
  // UAE
  "dubai",
  "abu dhabi",
  "abudhabi",
  "abu-dhabi",
  "ras al khaimah",
  "ras-al-khaimah",
  // Europe
  "paris",
  "london",
  "barcelona",
  "rome",
  "amsterdam",
  "istanbul",
  // Asia
  "tokyo",
  "singapore",
  "bangkok",
  "hong kong",
  "hongkong",
  // USA
  "new york",
  "nyc",
  "newyork",
  "las vegas",
  "lasvegas",
  "los angeles",
  "losangeles",
  "la",
  "miami",
];

/**
 * Detect intent from a chat message using keyword matching
 *
 * @param message - The user's chat message
 * @returns IntentResult with detected intent, confidence, and extracted entities
 */
export function detectIntent(message: string): IntentResult {
  const normalizedMessage = message.toLowerCase().trim();

  // Default to 'browse' if intent is unclear (per requirements)
  const result: IntentResult = {
    intent: "browse",
    confidence: 0.3,
    extractedEntities: {},
  };

  // Extract content types mentioned
  const contentTypes = new Set<"hotel" | "attraction" | "article" | "restaurant">();
  for (const [keyword, type] of Object.entries(CONTENT_TYPE_KEYWORDS)) {
    if (normalizedMessage.includes(keyword)) {
      contentTypes.add(type);
    }
  }
  if (contentTypes.size > 0) {
    result.extractedEntities.contentTypes = Array.from(contentTypes);
  }

  // Extract destinations mentioned
  const destinations: string[] = [];
  for (const dest of KNOWN_DESTINATIONS) {
    if (normalizedMessage.includes(dest)) {
      // Normalize the destination name
      const normalized = dest
        .replace(/\s+/g, "-")
        .replace("abudhabi", "abu-dhabi")
        .replace("newyork", "new-york")
        .replace("hongkong", "hong-kong")
        .replace("lasvegas", "las-vegas")
        .replace("losangeles", "los-angeles");

      if (!destinations.includes(normalized)) {
        destinations.push(normalized);
      }
    }
  }
  if (destinations.length > 0) {
    result.extractedEntities.destinations = destinations;
  }

  // Check for comparison intent first (higher priority due to specific pattern)
  const comparisonMatch = normalizedMessage.match(/(\w+)\s+(vs\.?|versus|or)\s+(\w+)/i);
  if (comparisonMatch) {
    result.extractedEntities.comparisonTerms = [comparisonMatch[1], comparisonMatch[3]];
  }

  // Score each intent based on pattern matches
  const scores: Record<Intent, number> = {
    browse: 0,
    compare: 0,
    plan: 0,
    learn: 0,
  };

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [Intent, RegExp[]][]) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedMessage)) {
        scores[intent]++;
      }
    }
  }

  // Find the highest scoring intent (default to 'browse' if unclear)
  let maxScore = 0;
  let detectedIntent: Intent = "browse";

  for (const [intent, score] of Object.entries(scores) as [Intent, number][]) {
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent;
    }
  }

  result.intent = detectedIntent;

  // Set confidence based on score (numeric 0-1 scale)
  // Max possible patterns per intent is around 20, normalize to 0-1
  const maxPossiblePatterns = 5; // Use a reasonable threshold for high confidence
  if (maxScore >= maxPossiblePatterns) {
    result.confidence = 1.0;
  } else if (maxScore >= 3) {
    result.confidence = 0.9;
  } else if (maxScore >= 2) {
    result.confidence = 0.7;
  } else if (maxScore >= 1) {
    result.confidence = 0.5;
  } else {
    result.confidence = 0.3;
  }

  // Boost compare intent if comparison terms were found
  if (
    result.extractedEntities.comparisonTerms &&
    result.extractedEntities.comparisonTerms.length >= 2
  ) {
    if (result.intent !== "compare" && scores.compare > 0) {
      result.intent = "compare";
      result.confidence = 0.95;
    }
  }

  return result;
}

/**
 * Get a description of what the intent means for logging/debugging
 */
export function describeIntent(intentResult: IntentResult): string {
  const { intent, confidence, extractedEntities } = intentResult;

  const confidenceLabel = confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";
  let description = `Intent: ${intent} (${confidenceLabel}, ${(confidence * 100).toFixed(0)}%)`;

  if (extractedEntities.destinations?.length) {
    description += ` | Destinations: ${extractedEntities.destinations.join(", ")}`;
  }

  if (extractedEntities.contentTypes?.length) {
    description += ` | Content: ${extractedEntities.contentTypes.join(", ")}`;
  }

  if (extractedEntities.comparisonTerms?.length) {
    description += ` | Comparing: ${extractedEntities.comparisonTerms.join(" vs ")}`;
  }

  return description;
}
