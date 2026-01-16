/**
 * AEO (Answer Engine Optimization) Configuration
 * Configuration for optimizing content for AI platforms like ChatGPT, Perplexity, and Google AI Overviews
 */

// AI Crawler User-Agent patterns for identification
export const AI_CRAWLERS = {
  GPTBot: {
    name: 'GPTBot',
    platform: 'chatgpt' as const,
    userAgentPattern: /GPTBot/i,
    priority: 1,
    description: 'OpenAI ChatGPT crawler',
  },
  PerplexityBot: {
    name: 'PerplexityBot',
    platform: 'perplexity' as const,
    userAgentPattern: /PerplexityBot/i,
    priority: 1,
    description: 'Perplexity AI crawler',
  },
  GoogleExtended: {
    name: 'Google-Extended',
    platform: 'google_aio' as const,
    userAgentPattern: /Google-Extended/i,
    priority: 1,
    description: 'Google AI Overviews crawler',
  },
  ClaudeBot: {
    name: 'ClaudeBot',
    platform: 'claude' as const,
    userAgentPattern: /ClaudeBot|anthropic-ai/i,
    priority: 2,
    description: 'Anthropic Claude crawler',
  },
  BingChat: {
    name: 'BingBot',
    platform: 'bing_chat' as const,
    userAgentPattern: /bingbot.*chat|Copilot/i,
    priority: 2,
    description: 'Microsoft Bing Chat/Copilot crawler',
  },
  Gemini: {
    name: 'Googlebot',
    platform: 'gemini' as const,
    userAgentPattern: /Gemini|Google-InternalSearch/i,
    priority: 2,
    description: 'Google Gemini crawler',
  },
} as const;

// AI referrer patterns for traffic attribution
export const AI_REFERRERS = {
  chatgpt: {
    patterns: [/chatgpt\.com/i, /chat\.openai\.com/i],
    platform: 'chatgpt' as const,
  },
  perplexity: {
    patterns: [/perplexity\.ai/i],
    platform: 'perplexity' as const,
  },
  google_aio: {
    patterns: [/google\.com.*ai_overview/i, /google\.com.*sgeo/i],
    platform: 'google_aio' as const,
  },
  claude: {
    patterns: [/claude\.ai/i, /anthropic\.com/i],
    platform: 'claude' as const,
  },
  bing_chat: {
    patterns: [/bing\.com\/chat/i, /copilot\.microsoft\.com/i],
    platform: 'bing_chat' as const,
  },
  gemini: {
    patterns: [/gemini\.google\.com/i, /bard\.google\.com/i],
    platform: 'gemini' as const,
  },
} as const;

// Answer capsule configuration
export const ANSWER_CAPSULE_CONFIG = {
  // Word count limits for the capsule
  minWords: 40,
  maxWords: 60,

  // Quick answer limits (ultra-short version)
  quickAnswerMinWords: 15,
  quickAnswerMaxWords: 20,

  // Quality score thresholds
  qualityThresholds: {
    excellent: 90,
    good: 75,
    acceptable: 60,
    needsWork: 0,
  },

  // Structure requirements
  structure: {
    requiresDirectAnswer: true,
    requiresKeyFact: true,
    requiresDifferentiator: true,
    maxKeyFacts: 5,
  },

  // Tone and style
  tone: 'factual' as const,
  avoidMarkdown: true,
  avoidEmojis: true,

  // Position requirement (first paragraph after H1)
  placement: 'first_paragraph' as const,
} as const;

// Platform-specific content preferences
export const PLATFORM_PREFERENCES = {
  chatgpt: {
    prefersFAQSchema: true,
    prefersStructuredHeadings: true,
    prefersClearHierarchy: true,
    citationTriggers: ['authoritative', 'factual', 'sourced'],
    contentTypes: ['faq', 'guide', 'comparison'],
  },
  perplexity: {
    prefersDirectAnswers: true,
    prefersComparisonContent: true,
    prefersRealTimeData: true,
    citationTriggers: ['unique_data', 'expert_insights', 'structured_comparisons'],
    contentTypes: ['comparison', 'cost_guide', 'how_to'],
  },
  google_aio: {
    prefersSchemaMarkup: true,
    prefersEEATSignals: true,
    prefersComprehensiveCoverage: true,
    citationTriggers: ['authoritative_domain', 'structured_data', 'expertise'],
    contentTypes: ['complete_guide', 'faq_hub', 'best_time'],
  },
  claude: {
    prefersWellStructuredContent: true,
    prefersAccurateInformation: true,
    prefersCitations: true,
    citationTriggers: ['accurate', 'well_sourced', 'comprehensive'],
    contentTypes: ['guide', 'comparison', 'how_to'],
  },
  bing_chat: {
    prefersWebResults: true,
    prefersRecentContent: true,
    prefersTrustSignals: true,
    citationTriggers: ['recent', 'trustworthy', 'relevant'],
    contentTypes: ['guide', 'faq', 'top_list'],
  },
  gemini: {
    prefersGoogleSchemas: true,
    prefersMultimodalContent: true,
    prefersVerifiedFacts: true,
    citationTriggers: ['verified', 'multimedia', 'comprehensive'],
    contentTypes: ['complete_guide', 'gallery', 'video'],
  },
} as const;

// Schema types required for AEO
export const AEO_SCHEMA_TYPES = {
  FAQPage: {
    priority: 1,
    description: 'FAQ schema for Q&A content',
    applicableTo: ['article', 'attraction', 'hotel', 'dining', 'district'],
  },
  HowTo: {
    priority: 2,
    description: 'Step-by-step instructions',
    applicableTo: ['article', 'transport', 'itinerary'],
  },
  TouristAttraction: {
    priority: 1,
    description: 'Tourist attraction schema',
    applicableTo: ['attraction'],
  },
  Hotel: {
    priority: 1,
    description: 'Hotel/lodging schema',
    applicableTo: ['hotel'],
  },
  Restaurant: {
    priority: 1,
    description: 'Restaurant schema',
    applicableTo: ['dining'],
  },
  Event: {
    priority: 1,
    description: 'Event schema',
    applicableTo: ['event'],
  },
  Article: {
    priority: 2,
    description: 'Article schema with author',
    applicableTo: ['article'],
  },
  BreadcrumbList: {
    priority: 1,
    description: 'Navigation breadcrumbs',
    applicableTo: ['all'],
  },
  ItemList: {
    priority: 2,
    description: 'List of items (top 10, etc.)',
    applicableTo: ['article', 'landing_page'],
  },
  TravelAction: {
    priority: 3,
    description: 'Travel booking action',
    applicableTo: ['hotel', 'attraction', 'itinerary'],
  },
} as const;

// Content priority matrix for AEO optimization
export const CONTENT_PRIORITY = {
  tier1: {
    types: ['comparison', 'best_time', 'cost_guide', 'faq_hub'],
    priority: 'high',
    aiValue: 'Maximum',
    targetPages: 100,
  },
  tier2: {
    types: ['top_list', 'how_to', 'complete_guide'],
    priority: 'medium',
    aiValue: 'High',
    targetPages: 200,
  },
  tier3: {
    types: ['vs_guide', 'review', 'news'],
    priority: 'normal',
    aiValue: 'Medium',
    targetPages: 300,
  },
} as const;

// Programmatic content templates
export const PROGRAMMATIC_TEMPLATES = {
  comparison: {
    pattern: '{locationA} vs {locationB} for {travelerType}',
    variables: {
      locationA: ['Downtown Dubai', 'Dubai Marina', 'Palm Jumeirah', 'JBR'],
      locationB: ['Downtown Dubai', 'Dubai Marina', 'Palm Jumeirah', 'JBR'],
      travelerType: ['families', 'couples', 'solo travelers', 'business travelers'],
    },
    description: 'Compare two locations for specific traveler types',
  },
  bestTime: {
    pattern: 'Best Time to Visit {destination} for {activity}',
    variables: {
      destination: ['Dubai', 'Abu Dhabi', 'Barcelona', 'Santorini'],
      activity: ['beach', 'shopping', 'sightseeing', 'nightlife', 'budget travel'],
    },
    description: 'Optimal timing guides for activities',
  },
  costGuide: {
    pattern: 'How Much Does {experience} Cost in {destination}',
    variables: {
      experience: ['a day at the beach', 'fine dining', 'desert safari', 'Burj Khalifa visit'],
      destination: ['Dubai', 'Abu Dhabi'],
    },
    description: 'Cost breakdown guides',
  },
  faqHub: {
    pattern: '{destination} Travel FAQ: Everything You Need to Know',
    variables: {
      destination: ['Dubai', 'Abu Dhabi', 'Barcelona', 'Santorini', 'Athens'],
    },
    description: 'Comprehensive FAQ pages',
  },
  topList: {
    pattern: 'Top {count} {category} in {destination}',
    variables: {
      count: ['5', '10', '15'],
      category: ['attractions', 'restaurants', 'hotels', 'beaches', 'nightclubs'],
      destination: ['Dubai', 'Abu Dhabi'],
    },
    description: 'Ranked lists of top items',
  },
} as const;

// Traveler personas for targeted content (from TRAVI's 8 personas)
export const TRAVELER_PERSONAS = {
  luxurySeeker: {
    id: 'luxury_seeker',
    name: 'Luxury Seeker',
    keywords: ['luxury', 'premium', 'exclusive', '5-star', 'VIP'],
    priceRange: 'high',
    interests: ['fine dining', 'spa', 'private experiences'],
  },
  familyTraveler: {
    id: 'family_traveler',
    name: 'Family Traveler',
    keywords: ['family-friendly', 'kids', 'children', 'safe', 'educational'],
    priceRange: 'medium',
    interests: ['theme parks', 'beaches', 'resorts'],
  },
  budgetExplorer: {
    id: 'budget_explorer',
    name: 'Budget Explorer',
    keywords: ['budget', 'affordable', 'cheap', 'free', 'value'],
    priceRange: 'low',
    interests: ['street food', 'public transport', 'hostels'],
  },
  adventureSeeker: {
    id: 'adventure_seeker',
    name: 'Adventure Seeker',
    keywords: ['adventure', 'extreme', 'outdoor', 'thrill', 'sports'],
    priceRange: 'medium-high',
    interests: ['desert safari', 'skydiving', 'water sports'],
  },
  cultureEnthusiast: {
    id: 'culture_enthusiast',
    name: 'Culture Enthusiast',
    keywords: ['culture', 'history', 'heritage', 'museum', 'art'],
    priceRange: 'medium',
    interests: ['museums', 'old town', 'local markets'],
  },
  businessTraveler: {
    id: 'business_traveler',
    name: 'Business Traveler',
    keywords: ['business', 'conference', 'meeting', 'MICE', 'corporate'],
    priceRange: 'high',
    interests: ['business hotels', 'quick dining', 'transport'],
  },
  soloExplorer: {
    id: 'solo_explorer',
    name: 'Solo Explorer',
    keywords: ['solo', 'alone', 'single', 'independent'],
    priceRange: 'medium',
    interests: ['social experiences', 'safety', 'local tips'],
  },
  honeymoonCouple: {
    id: 'honeymoon_couple',
    name: 'Honeymoon Couple',
    keywords: ['romantic', 'honeymoon', 'couples', 'intimate'],
    priceRange: 'high',
    interests: ['romantic dining', 'spa', 'sunset experiences'],
  },
} as const;

// Locale priorities for AEO (from PRD: Arabic is 30% of Dubai visitors)
export const AEO_LOCALE_PRIORITY = {
  tier1: ['en', 'ar'], // Primary markets
  tier2: ['hi', 'zh', 'ru'], // Secondary markets
  tier3: ['de', 'fr', 'es'], // Tertiary markets
} as const;

// Success metrics configuration
export const AEO_METRICS = {
  targets: {
    year1: {
      aiTrafficShare: { min: 5, max: 10 }, // 5-10% of total traffic
      citationsPerMonth: 100,
      clickThroughRate: 4.4, // 4.4x higher than traditional
      incrementalBookings: { min: 800, max: 1500 },
    },
  },
  tracking: {
    ga4: {
      sourceFilter: ['chatgpt.com', 'perplexity.ai', 'bing.com/chat', 'claude.ai'],
      customDimension: 'ai_platform',
      customEvent: 'ai_referral_landing',
      conversionEvent: 'booking_initiated',
    },
  },
} as const;

// Export type utilities
export type AIPlatform = keyof typeof AI_CRAWLERS | 'unknown';
export type AEOSchemaType = keyof typeof AEO_SCHEMA_TYPES;
export type ContentFormat = keyof typeof PROGRAMMATIC_TEMPLATES;
export type TravelerPersona = keyof typeof TRAVELER_PERSONAS;
