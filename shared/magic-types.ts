/**
 * Magic System Types
 *
 * Comprehensive TypeScript types for the AI-powered content generation system.
 * The Magic system generates content fields automatically based on minimal user input.
 *
 * @module magic-types
 */

// ============================================
// FIELD TYPES
// ============================================

/**
 * All possible field types that the Magic system can generate.
 * Organized by category for clarity.
 */
export type MagicFieldType =
  // Text content - Core content fields
  | "title"
  | "headline"
  | "subtitle"
  | "description"
  | "summary"
  | "tldr"
  | "body_content"
  // SEO - Search engine optimization fields
  | "meta_title"
  | "meta_description"
  | "slug"
  | "keywords"
  | "alt_text"
  // Tourism specific - Location and service information
  | "coordinates"
  | "address"
  | "price_range"
  | "opening_hours"
  | "amenities"
  | "highlights"
  | "tips"
  | "transport_info"
  // Social - Social media and marketing content
  | "social_facebook"
  | "social_twitter"
  | "social_instagram"
  | "push_notification"
  | "newsletter_subject"
  // Complex - Structured data fields
  | "faqs"
  | "sections"
  | "gallery_images"
  | "related_items";

/**
 * Category groupings for field types
 */
export type MagicFieldCategory = "text_content" | "seo" | "tourism" | "social" | "complex";

/**
 * Mapping of field types to their categories
 */
export const MAGIC_FIELD_CATEGORIES: Record<MagicFieldType, MagicFieldCategory> = {
  // Text content
  title: "text_content",
  headline: "text_content",
  subtitle: "text_content",
  description: "text_content",
  summary: "text_content",
  tldr: "text_content",
  body_content: "text_content",
  // SEO
  meta_title: "seo",
  meta_description: "seo",
  slug: "seo",
  keywords: "seo",
  alt_text: "seo",
  // Tourism
  coordinates: "tourism",
  address: "tourism",
  price_range: "tourism",
  opening_hours: "tourism",
  amenities: "tourism",
  highlights: "tourism",
  tips: "tourism",
  transport_info: "tourism",
  // Social
  social_facebook: "social",
  social_twitter: "social",
  social_instagram: "social",
  push_notification: "social",
  newsletter_subject: "social",
  // Complex
  faqs: "complex",
  sections: "complex",
  gallery_images: "complex",
  related_items: "complex",
};

// ============================================
// CONTENT TYPES
// ============================================

/**
 * Content types that the Magic system can generate for.
 * These map to the main entity types in the CMS.
 */
export type MagicContentType =
  | "destination"
  | "hotel"
  | "attraction"
  | "restaurant"
  | "article"
  | "news"
  | "event"
  | "page";

/**
 * Human-readable labels for content types
 */
export const MAGIC_CONTENT_TYPE_LABELS: Record<MagicContentType, string> = {
  destination: "Destination",
  hotel: "Hotel",
  attraction: "Attraction",
  restaurant: "Restaurant",
  article: "Article",
  news: "News",
  event: "Event",
  page: "Page",
};

// ============================================
// GENERATION MODES
// ============================================

/**
 * Generation modes control the depth and quality of generated content.
 *
 * - quick: Fast generation with basic fields, lower token usage
 * - full: Complete generation with all applicable fields
 * - premium: Enhanced generation with research, fact-checking, and higher quality
 */
export type MagicMode = "quick" | "full" | "premium";

/**
 * Configuration for each generation mode
 */
export interface MagicModeConfig {
  name: string;
  description: string;
  maxTokens: number;
  includeResearch: boolean;
  includeFactCheck: boolean;
  includeAlternatives: boolean;
  fieldDepth: "basic" | "standard" | "comprehensive";
}

/**
 * Default configurations for each mode
 */
export const MAGIC_MODE_CONFIGS: Record<MagicMode, MagicModeConfig> = {
  quick: {
    name: "Quick",
    description: "Fast generation with essential fields only",
    maxTokens: 2000,
    includeResearch: false,
    includeFactCheck: false,
    includeAlternatives: false,
    fieldDepth: "basic",
  },
  full: {
    name: "Full",
    description: "Complete generation with all applicable fields",
    maxTokens: 8000,
    includeResearch: true,
    includeFactCheck: false,
    includeAlternatives: true,
    fieldDepth: "standard",
  },
  premium: {
    name: "Premium",
    description: "Enhanced generation with research and fact-checking",
    maxTokens: 16000,
    includeResearch: true,
    includeFactCheck: true,
    includeAlternatives: true,
    fieldDepth: "comprehensive",
  },
};

// ============================================
// CONTEXT AND REQUESTS
// ============================================

/**
 * Context passed to the Magic engine for generation.
 * Provides all necessary information about the content being created.
 */
export interface MagicContext {
  /** The type of content being generated */
  contentType: MagicContentType;
  /** Name of the entity (e.g., hotel name, attraction name) */
  entityName?: string;
  /** Parent destination for hierarchical content */
  parentDestination?: string;
  /** Fields that already exist and can be used as context */
  existingFields: Record<string, any>;
  /** Target locale for generation (defaults to 'en') */
  locale?: string;
  /** Optional tone/style preferences */
  tone?: "formal" | "casual" | "professional" | "friendly";
  /** Target audience for content */
  targetAudience?: string;
  /** Additional custom context */
  customContext?: Record<string, any>;
}

/**
 * Request to generate a single field
 */
export interface MagicFieldRequest {
  /** The type of field to generate */
  fieldType: MagicFieldType;
  /** Context for generation */
  context: MagicContext;
  /** Override for maximum length (if applicable) */
  maxLength?: number;
  /** Specific instructions for this generation */
  instructions?: string;
}

/**
 * Response from generating a single field
 */
export interface MagicFieldResponse {
  /** Whether generation was successful */
  success: boolean;
  /** The generated value */
  value: any;
  /** Confidence score from 0 to 1 */
  confidence: number;
  /** Alternative generated values (if available) */
  alternatives?: any[];
  /** Number of tokens used for generation */
  tokensUsed: number;
  /** Time taken to generate in milliseconds */
  processingTimeMs: number;
  /** Error message if generation failed */
  error?: string;
  /** Warnings or notes about the generation */
  warnings?: string[];
  /** Sources used for generation (if research was performed) */
  sources?: string[];
}

/**
 * Request to generate all applicable fields for a content type
 */
export interface MagicAllRequest {
  /** The type of content to generate for */
  contentType: MagicContentType;
  /** User-provided input (usually just the name) */
  input: string;
  /** Generation mode */
  mode: MagicMode;
  /** Fields to exclude from generation */
  excludeFields?: MagicFieldType[];
  /** Fields to specifically include (overrides default selection) */
  includeFields?: MagicFieldType[];
  /** Target locale */
  locale?: string;
  /** Additional context */
  additionalContext?: Record<string, any>;
}

/**
 * Response from generating all fields
 */
export interface MagicAllResponse {
  /** Whether generation was successful */
  success: boolean;
  /** Generated fields as key-value pairs */
  fields: Partial<Record<MagicFieldType, any>>;
  /** Metadata about the generation */
  metadata: MagicGenerationMetadata;
  /** Error message if generation failed */
  error?: string;
  /** Per-field errors (partial success scenario) */
  fieldErrors?: Partial<Record<MagicFieldType, string>>;
}

/**
 * Metadata about a generation operation
 */
export interface MagicGenerationMetadata {
  /** Sources used for research */
  sources: string[];
  /** Overall confidence score */
  confidence: number;
  /** Total tokens used */
  tokensUsed: number;
  /** Total processing time in milliseconds */
  processingTimeMs: number;
  /** Generation mode used */
  mode: MagicMode;
  /** Number of fields generated */
  fieldsGenerated: number;
  /** Number of fields that failed */
  fieldsFailed: number;
  /** Model used for generation */
  model?: string;
  /** Timestamp of generation */
  generatedAt: string;
}

// ============================================
// FIELD CONFIGURATION
// ============================================

/**
 * Output types for generated fields
 */
export type MagicOutputType = "string" | "number" | "boolean" | "array" | "object";

/**
 * Validation function type
 */
export type MagicValidationFn = (value: any) => boolean;

/**
 * Configuration for how a specific field should be generated
 */
export interface MagicFieldConfig {
  /** The type of field */
  fieldType: MagicFieldType;
  /** Human-readable label */
  label: string;
  /** Description of what this field is for */
  description: string;
  /** Fields that must exist before this can be generated */
  requiredContext: string[];
  /** Fields that improve generation but aren't required */
  optionalContext: string[];
  /** The type of output this field produces */
  outputType: MagicOutputType;
  /** Maximum length for string fields */
  maxLength?: number;
  /** Minimum length for string fields */
  minLength?: number;
  /** Validation function */
  validation?: MagicValidationFn;
  /** Default value if generation fails */
  defaultValue?: any;
  /** Whether this field supports alternatives */
  supportsAlternatives: boolean;
  /** Priority for generation order (lower = earlier) */
  priority: number;
  /** Estimated token cost for generation */
  estimatedTokens: number;
}

/**
 * Configuration for a content type's Magic generation
 */
export interface MagicContentConfig {
  /** The content type */
  contentType: MagicContentType;
  /** Human-readable label */
  label: string;
  /** Description of this content type */
  description: string;
  /** All fields that can be generated for this type */
  fields: MagicFieldConfig[];
  /** What the user must provide as input */
  requiredInput: string;
  /** Placeholder text for input field */
  inputPlaceholder: string;
  /** Example inputs */
  inputExamples: string[];
  /** Fields generated in quick mode */
  quickModeFields: MagicFieldType[];
  /** Fields generated in full mode */
  fullModeFields: MagicFieldType[];
  /** Fields generated in premium mode (usually all) */
  premiumModeFields: MagicFieldType[];
}

// ============================================
// FIELD CONFIGURATIONS
// ============================================

/**
 * Common field configurations used across content types
 */
export const COMMON_FIELD_CONFIGS: Record<string, Omit<MagicFieldConfig, "fieldType">> = {
  title: {
    label: "Title",
    description: "Main title for the content",
    requiredContext: [],
    optionalContext: ["description"],
    outputType: "string",
    maxLength: 100,
    minLength: 10,
    supportsAlternatives: true,
    priority: 1,
    estimatedTokens: 50,
  },
  headline: {
    label: "Headline",
    description: "Attention-grabbing headline",
    requiredContext: ["title"],
    optionalContext: ["description", "highlights"],
    outputType: "string",
    maxLength: 120,
    minLength: 20,
    supportsAlternatives: true,
    priority: 2,
    estimatedTokens: 75,
  },
  subtitle: {
    label: "Subtitle",
    description: "Supporting subtitle text",
    requiredContext: ["title"],
    optionalContext: ["description"],
    outputType: "string",
    maxLength: 200,
    supportsAlternatives: true,
    priority: 3,
    estimatedTokens: 100,
  },
  description: {
    label: "Description",
    description: "Main descriptive content",
    requiredContext: ["title"],
    optionalContext: ["highlights", "amenities"],
    outputType: "string",
    maxLength: 500,
    minLength: 100,
    supportsAlternatives: true,
    priority: 4,
    estimatedTokens: 300,
  },
  summary: {
    label: "Summary",
    description: "Brief summary of the content",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights"],
    outputType: "string",
    maxLength: 300,
    minLength: 50,
    supportsAlternatives: true,
    priority: 5,
    estimatedTokens: 150,
  },
  tldr: {
    label: "TL;DR",
    description: "Ultra-brief summary",
    requiredContext: ["description"],
    optionalContext: ["title", "highlights"],
    outputType: "string",
    maxLength: 150,
    minLength: 30,
    supportsAlternatives: true,
    priority: 6,
    estimatedTokens: 75,
  },
  body_content: {
    label: "Body Content",
    description: "Full article or content body",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights", "sections", "faqs"],
    outputType: "string",
    maxLength: 10000,
    minLength: 500,
    supportsAlternatives: false,
    priority: 10,
    estimatedTokens: 2000,
  },
  meta_title: {
    label: "Meta Title",
    description: "SEO title for search engines",
    requiredContext: ["title"],
    optionalContext: ["keywords"],
    outputType: "string",
    maxLength: 60,
    minLength: 30,
    supportsAlternatives: true,
    priority: 7,
    estimatedTokens: 50,
  },
  meta_description: {
    label: "Meta Description",
    description: "SEO description for search engines",
    requiredContext: ["title", "description"],
    optionalContext: ["keywords", "highlights"],
    outputType: "string",
    maxLength: 160,
    minLength: 70,
    supportsAlternatives: true,
    priority: 8,
    estimatedTokens: 100,
  },
  slug: {
    label: "URL Slug",
    description: "URL-friendly identifier",
    requiredContext: ["title"],
    optionalContext: [],
    outputType: "string",
    maxLength: 80,
    supportsAlternatives: true,
    priority: 2,
    estimatedTokens: 25,
  },
  keywords: {
    label: "Keywords",
    description: "SEO keywords and phrases",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights", "amenities"],
    outputType: "array",
    supportsAlternatives: false,
    priority: 9,
    estimatedTokens: 150,
  },
  alt_text: {
    label: "Alt Text",
    description: "Image alt text for accessibility",
    requiredContext: ["title"],
    optionalContext: ["description"],
    outputType: "string",
    maxLength: 125,
    supportsAlternatives: true,
    priority: 11,
    estimatedTokens: 50,
  },
  coordinates: {
    label: "Coordinates",
    description: "Geographic coordinates (lat, lng)",
    requiredContext: ["address"],
    optionalContext: ["title"],
    outputType: "object",
    supportsAlternatives: false,
    priority: 12,
    estimatedTokens: 100,
  },
  address: {
    label: "Address",
    description: "Physical address",
    requiredContext: ["title"],
    optionalContext: ["coordinates"],
    outputType: "string",
    maxLength: 200,
    supportsAlternatives: false,
    priority: 11,
    estimatedTokens: 100,
  },
  price_range: {
    label: "Price Range",
    description: "Price category or range",
    requiredContext: ["title"],
    optionalContext: ["description", "amenities"],
    outputType: "string",
    supportsAlternatives: false,
    priority: 13,
    estimatedTokens: 50,
  },
  opening_hours: {
    label: "Opening Hours",
    description: "Operating hours",
    requiredContext: ["title"],
    optionalContext: [],
    outputType: "object",
    supportsAlternatives: false,
    priority: 14,
    estimatedTokens: 150,
  },
  amenities: {
    label: "Amenities",
    description: "List of amenities or features",
    requiredContext: ["title"],
    optionalContext: ["description", "price_range"],
    outputType: "array",
    supportsAlternatives: false,
    priority: 15,
    estimatedTokens: 200,
  },
  highlights: {
    label: "Highlights",
    description: "Key highlights or selling points",
    requiredContext: ["title"],
    optionalContext: ["description", "amenities"],
    outputType: "array",
    supportsAlternatives: true,
    priority: 5,
    estimatedTokens: 200,
  },
  tips: {
    label: "Tips",
    description: "Useful tips for visitors",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights", "opening_hours", "price_range"],
    outputType: "array",
    supportsAlternatives: false,
    priority: 16,
    estimatedTokens: 250,
  },
  transport_info: {
    label: "Transport Info",
    description: "How to get there",
    requiredContext: ["title", "address"],
    optionalContext: ["coordinates"],
    outputType: "object",
    supportsAlternatives: false,
    priority: 17,
    estimatedTokens: 200,
  },
  social_facebook: {
    label: "Facebook Post",
    description: "Social media post for Facebook",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights"],
    outputType: "string",
    maxLength: 500,
    supportsAlternatives: true,
    priority: 20,
    estimatedTokens: 150,
  },
  social_twitter: {
    label: "Twitter/X Post",
    description: "Social media post for Twitter/X",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights"],
    outputType: "string",
    maxLength: 280,
    supportsAlternatives: true,
    priority: 21,
    estimatedTokens: 100,
  },
  social_instagram: {
    label: "Instagram Caption",
    description: "Caption for Instagram post",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights"],
    outputType: "string",
    maxLength: 2200,
    supportsAlternatives: true,
    priority: 22,
    estimatedTokens: 200,
  },
  push_notification: {
    label: "Push Notification",
    description: "Mobile push notification text",
    requiredContext: ["title"],
    optionalContext: ["description", "highlights"],
    outputType: "string",
    maxLength: 100,
    supportsAlternatives: true,
    priority: 23,
    estimatedTokens: 50,
  },
  newsletter_subject: {
    label: "Newsletter Subject",
    description: "Email subject line",
    requiredContext: ["title"],
    optionalContext: ["description", "highlights"],
    outputType: "string",
    maxLength: 60,
    supportsAlternatives: true,
    priority: 24,
    estimatedTokens: 50,
  },
  faqs: {
    label: "FAQs",
    description: "Frequently asked questions",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights", "tips", "opening_hours", "price_range"],
    outputType: "array",
    supportsAlternatives: false,
    priority: 18,
    estimatedTokens: 500,
  },
  sections: {
    label: "Content Sections",
    description: "Structured content sections",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights", "amenities"],
    outputType: "array",
    supportsAlternatives: false,
    priority: 9,
    estimatedTokens: 1000,
  },
  gallery_images: {
    label: "Gallery Images",
    description: "Suggested images with descriptions",
    requiredContext: ["title", "description"],
    optionalContext: ["highlights"],
    outputType: "array",
    supportsAlternatives: false,
    priority: 25,
    estimatedTokens: 300,
  },
  related_items: {
    label: "Related Items",
    description: "Suggestions for related content",
    requiredContext: ["title", "description"],
    optionalContext: ["keywords", "highlights"],
    outputType: "array",
    supportsAlternatives: false,
    priority: 26,
    estimatedTokens: 200,
  },
};

// ============================================
// CONTENT TYPE CONFIGURATIONS
// ============================================

/**
 * Helper to create a field config from common configs
 */
function createFieldConfig(fieldType: MagicFieldType): MagicFieldConfig {
  const common = COMMON_FIELD_CONFIGS[fieldType];
  if (!common) {
    throw new Error(`Unknown field type: ${fieldType}`);
  }
  return {
    fieldType,
    ...common,
  };
}

/**
 * Destination content type configuration
 */
export const DESTINATION_MAGIC_CONFIG: MagicContentConfig = {
  contentType: "destination",
  label: "Destination",
  description: "Travel destination (city, region, country)",
  requiredInput: "name",
  inputPlaceholder: 'Enter destination name (e.g., "Dubai Marina")',
  inputExamples: ["Dubai Marina", "Palm Jumeirah", "Downtown Dubai"],
  fields: [
    createFieldConfig("title"),
    createFieldConfig("headline"),
    createFieldConfig("subtitle"),
    createFieldConfig("description"),
    createFieldConfig("summary"),
    createFieldConfig("tldr"),
    createFieldConfig("meta_title"),
    createFieldConfig("meta_description"),
    createFieldConfig("slug"),
    createFieldConfig("keywords"),
    createFieldConfig("coordinates"),
    createFieldConfig("highlights"),
    createFieldConfig("tips"),
    createFieldConfig("transport_info"),
    createFieldConfig("faqs"),
    createFieldConfig("sections"),
    createFieldConfig("social_facebook"),
    createFieldConfig("social_twitter"),
    createFieldConfig("social_instagram"),
    createFieldConfig("related_items"),
  ],
  quickModeFields: ["title", "description", "slug", "meta_title", "meta_description"],
  fullModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "coordinates",
    "highlights",
    "tips",
    "faqs",
  ],
  premiumModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "tldr",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "coordinates",
    "highlights",
    "tips",
    "transport_info",
    "faqs",
    "sections",
    "social_facebook",
    "social_twitter",
    "social_instagram",
    "related_items",
  ],
};

/**
 * Hotel content type configuration
 */
export const HOTEL_MAGIC_CONFIG: MagicContentConfig = {
  contentType: "hotel",
  label: "Hotel",
  description: "Hotel, resort, or accommodation",
  requiredInput: "name",
  inputPlaceholder: 'Enter hotel name (e.g., "Burj Al Arab")',
  inputExamples: ["Burj Al Arab", "Atlantis The Palm", "Armani Hotel Dubai"],
  fields: [
    createFieldConfig("title"),
    createFieldConfig("headline"),
    createFieldConfig("subtitle"),
    createFieldConfig("description"),
    createFieldConfig("summary"),
    createFieldConfig("tldr"),
    createFieldConfig("meta_title"),
    createFieldConfig("meta_description"),
    createFieldConfig("slug"),
    createFieldConfig("keywords"),
    createFieldConfig("address"),
    createFieldConfig("coordinates"),
    createFieldConfig("price_range"),
    createFieldConfig("amenities"),
    createFieldConfig("highlights"),
    createFieldConfig("tips"),
    createFieldConfig("faqs"),
    createFieldConfig("sections"),
    createFieldConfig("social_facebook"),
    createFieldConfig("social_twitter"),
    createFieldConfig("social_instagram"),
    createFieldConfig("gallery_images"),
    createFieldConfig("related_items"),
  ],
  quickModeFields: [
    "title",
    "description",
    "slug",
    "meta_title",
    "meta_description",
    "price_range",
  ],
  fullModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "address",
    "coordinates",
    "price_range",
    "amenities",
    "highlights",
    "tips",
    "faqs",
  ],
  premiumModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "tldr",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "address",
    "coordinates",
    "price_range",
    "amenities",
    "highlights",
    "tips",
    "faqs",
    "sections",
    "social_facebook",
    "social_twitter",
    "social_instagram",
    "gallery_images",
    "related_items",
  ],
};

/**
 * Attraction content type configuration
 */
export const ATTRACTION_MAGIC_CONFIG: MagicContentConfig = {
  contentType: "attraction",
  label: "Attraction",
  description: "Tourist attraction, landmark, or point of interest",
  requiredInput: "name",
  inputPlaceholder: 'Enter attraction name (e.g., "Dubai Frame")',
  inputExamples: ["Dubai Frame", "Burj Khalifa", "Dubai Miracle Garden"],
  fields: [
    createFieldConfig("title"),
    createFieldConfig("headline"),
    createFieldConfig("subtitle"),
    createFieldConfig("description"),
    createFieldConfig("summary"),
    createFieldConfig("tldr"),
    createFieldConfig("meta_title"),
    createFieldConfig("meta_description"),
    createFieldConfig("slug"),
    createFieldConfig("keywords"),
    createFieldConfig("address"),
    createFieldConfig("coordinates"),
    createFieldConfig("price_range"),
    createFieldConfig("opening_hours"),
    createFieldConfig("highlights"),
    createFieldConfig("tips"),
    createFieldConfig("transport_info"),
    createFieldConfig("faqs"),
    createFieldConfig("sections"),
    createFieldConfig("social_facebook"),
    createFieldConfig("social_twitter"),
    createFieldConfig("social_instagram"),
    createFieldConfig("gallery_images"),
    createFieldConfig("related_items"),
  ],
  quickModeFields: [
    "title",
    "description",
    "slug",
    "meta_title",
    "meta_description",
    "price_range",
    "opening_hours",
  ],
  fullModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "address",
    "coordinates",
    "price_range",
    "opening_hours",
    "highlights",
    "tips",
    "transport_info",
    "faqs",
  ],
  premiumModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "tldr",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "address",
    "coordinates",
    "price_range",
    "opening_hours",
    "highlights",
    "tips",
    "transport_info",
    "faqs",
    "sections",
    "social_facebook",
    "social_twitter",
    "social_instagram",
    "gallery_images",
    "related_items",
  ],
};

/**
 * Restaurant content type configuration
 */
export const RESTAURANT_MAGIC_CONFIG: MagicContentConfig = {
  contentType: "restaurant",
  label: "Restaurant",
  description: "Restaurant, cafe, or dining establishment",
  requiredInput: "name",
  inputPlaceholder: 'Enter restaurant name (e.g., "At.mosphere")',
  inputExamples: ["At.mosphere", "Pierchic", "Nobu Dubai"],
  fields: [
    createFieldConfig("title"),
    createFieldConfig("headline"),
    createFieldConfig("subtitle"),
    createFieldConfig("description"),
    createFieldConfig("summary"),
    createFieldConfig("tldr"),
    createFieldConfig("meta_title"),
    createFieldConfig("meta_description"),
    createFieldConfig("slug"),
    createFieldConfig("keywords"),
    createFieldConfig("address"),
    createFieldConfig("coordinates"),
    createFieldConfig("price_range"),
    createFieldConfig("opening_hours"),
    createFieldConfig("amenities"), // cuisine types, dining features
    createFieldConfig("highlights"),
    createFieldConfig("tips"),
    createFieldConfig("faqs"),
    createFieldConfig("social_facebook"),
    createFieldConfig("social_twitter"),
    createFieldConfig("social_instagram"),
    createFieldConfig("gallery_images"),
    createFieldConfig("related_items"),
  ],
  quickModeFields: [
    "title",
    "description",
    "slug",
    "meta_title",
    "meta_description",
    "price_range",
    "opening_hours",
  ],
  fullModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "address",
    "coordinates",
    "price_range",
    "opening_hours",
    "amenities",
    "highlights",
    "tips",
    "faqs",
  ],
  premiumModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "tldr",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "address",
    "coordinates",
    "price_range",
    "opening_hours",
    "amenities",
    "highlights",
    "tips",
    "faqs",
    "social_facebook",
    "social_twitter",
    "social_instagram",
    "gallery_images",
    "related_items",
  ],
};

/**
 * Article content type configuration
 */
export const ARTICLE_MAGIC_CONFIG: MagicContentConfig = {
  contentType: "article",
  label: "Article",
  description: "Blog post, guide, or editorial content",
  requiredInput: "topic",
  inputPlaceholder: 'Enter article topic (e.g., "Best beaches in Dubai")',
  inputExamples: [
    "Best beaches in Dubai",
    "Dubai shopping guide",
    "Things to do in Dubai with kids",
  ],
  fields: [
    createFieldConfig("title"),
    createFieldConfig("headline"),
    createFieldConfig("subtitle"),
    createFieldConfig("description"),
    createFieldConfig("summary"),
    createFieldConfig("tldr"),
    createFieldConfig("body_content"),
    createFieldConfig("meta_title"),
    createFieldConfig("meta_description"),
    createFieldConfig("slug"),
    createFieldConfig("keywords"),
    createFieldConfig("highlights"),
    createFieldConfig("faqs"),
    createFieldConfig("sections"),
    createFieldConfig("social_facebook"),
    createFieldConfig("social_twitter"),
    createFieldConfig("social_instagram"),
    createFieldConfig("push_notification"),
    createFieldConfig("newsletter_subject"),
    createFieldConfig("related_items"),
  ],
  quickModeFields: ["title", "description", "slug", "meta_title", "meta_description"],
  fullModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "highlights",
    "faqs",
    "sections",
  ],
  premiumModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "tldr",
    "body_content",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "highlights",
    "faqs",
    "sections",
    "social_facebook",
    "social_twitter",
    "social_instagram",
    "push_notification",
    "newsletter_subject",
    "related_items",
  ],
};

/**
 * News content type configuration
 */
export const NEWS_MAGIC_CONFIG: MagicContentConfig = {
  contentType: "news",
  label: "News",
  description: "News article or press release",
  requiredInput: "headline",
  inputPlaceholder: 'Enter news headline (e.g., "New hotel opens in Dubai")',
  inputExamples: [
    "New hotel opens in Dubai",
    "Dubai tourism hits record numbers",
    "Major event announced for Dubai",
  ],
  fields: [
    createFieldConfig("title"),
    createFieldConfig("headline"),
    createFieldConfig("subtitle"),
    createFieldConfig("description"),
    createFieldConfig("summary"),
    createFieldConfig("tldr"),
    createFieldConfig("body_content"),
    createFieldConfig("meta_title"),
    createFieldConfig("meta_description"),
    createFieldConfig("slug"),
    createFieldConfig("keywords"),
    createFieldConfig("social_facebook"),
    createFieldConfig("social_twitter"),
    createFieldConfig("social_instagram"),
    createFieldConfig("push_notification"),
    createFieldConfig("newsletter_subject"),
  ],
  quickModeFields: ["title", "description", "slug", "meta_title", "meta_description"],
  fullModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
  ],
  premiumModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "tldr",
    "body_content",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "social_facebook",
    "social_twitter",
    "social_instagram",
    "push_notification",
    "newsletter_subject",
  ],
};

/**
 * Event content type configuration
 */
export const EVENT_MAGIC_CONFIG: MagicContentConfig = {
  contentType: "event",
  label: "Event",
  description: "Event, festival, or happening",
  requiredInput: "name",
  inputPlaceholder: 'Enter event name (e.g., "Dubai Shopping Festival")',
  inputExamples: ["Dubai Shopping Festival", "Dubai Food Festival", "New Year Fireworks Dubai"],
  fields: [
    createFieldConfig("title"),
    createFieldConfig("headline"),
    createFieldConfig("subtitle"),
    createFieldConfig("description"),
    createFieldConfig("summary"),
    createFieldConfig("tldr"),
    createFieldConfig("meta_title"),
    createFieldConfig("meta_description"),
    createFieldConfig("slug"),
    createFieldConfig("keywords"),
    createFieldConfig("address"),
    createFieldConfig("coordinates"),
    createFieldConfig("price_range"),
    createFieldConfig("highlights"),
    createFieldConfig("tips"),
    createFieldConfig("transport_info"),
    createFieldConfig("faqs"),
    createFieldConfig("social_facebook"),
    createFieldConfig("social_twitter"),
    createFieldConfig("social_instagram"),
    createFieldConfig("push_notification"),
    createFieldConfig("newsletter_subject"),
    createFieldConfig("related_items"),
  ],
  quickModeFields: ["title", "description", "slug", "meta_title", "meta_description"],
  fullModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "address",
    "coordinates",
    "price_range",
    "highlights",
    "tips",
    "faqs",
  ],
  premiumModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "tldr",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "address",
    "coordinates",
    "price_range",
    "highlights",
    "tips",
    "transport_info",
    "faqs",
    "social_facebook",
    "social_twitter",
    "social_instagram",
    "push_notification",
    "newsletter_subject",
    "related_items",
  ],
};

/**
 * Generic page content type configuration
 */
export const PAGE_MAGIC_CONFIG: MagicContentConfig = {
  contentType: "page",
  label: "Page",
  description: "Generic web page",
  requiredInput: "title",
  inputPlaceholder: 'Enter page title (e.g., "About Us")',
  inputExamples: ["About Us", "Contact", "Terms and Conditions"],
  fields: [
    createFieldConfig("title"),
    createFieldConfig("headline"),
    createFieldConfig("subtitle"),
    createFieldConfig("description"),
    createFieldConfig("summary"),
    createFieldConfig("body_content"),
    createFieldConfig("meta_title"),
    createFieldConfig("meta_description"),
    createFieldConfig("slug"),
    createFieldConfig("keywords"),
    createFieldConfig("sections"),
    createFieldConfig("faqs"),
  ],
  quickModeFields: ["title", "description", "slug", "meta_title", "meta_description"],
  fullModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "sections",
  ],
  premiumModeFields: [
    "title",
    "headline",
    "subtitle",
    "description",
    "summary",
    "body_content",
    "meta_title",
    "meta_description",
    "slug",
    "keywords",
    "sections",
    "faqs",
  ],
};

/**
 * Map of all content type configurations
 */
export const MAGIC_CONTENT_CONFIGS: Record<MagicContentType, MagicContentConfig> = {
  destination: DESTINATION_MAGIC_CONFIG,
  hotel: HOTEL_MAGIC_CONFIG,
  attraction: ATTRACTION_MAGIC_CONFIG,
  restaurant: RESTAURANT_MAGIC_CONFIG,
  article: ARTICLE_MAGIC_CONFIG,
  news: NEWS_MAGIC_CONFIG,
  event: EVENT_MAGIC_CONFIG,
  page: PAGE_MAGIC_CONFIG,
};

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Get the configuration for a content type
 */
export function getMagicContentConfig(contentType: MagicContentType): MagicContentConfig {
  const config = MAGIC_CONTENT_CONFIGS[contentType];
  if (!config) {
    throw new Error(`Unknown content type: ${contentType}`);
  }
  return config;
}

/**
 * Get fields for a specific mode
 */
export function getMagicFieldsForMode(
  contentType: MagicContentType,
  mode: MagicMode
): MagicFieldType[] {
  const config = getMagicContentConfig(contentType);
  switch (mode) {
    case "quick":
      return config.quickModeFields;
    case "full":
      return config.fullModeFields;
    case "premium":
      return config.premiumModeFields;
    default:
      return config.quickModeFields;
  }
}

/**
 * Check if a field is valid for a content type
 */
export function isValidFieldForContentType(
  fieldType: MagicFieldType,
  contentType: MagicContentType
): boolean {
  const config = getMagicContentConfig(contentType);
  return config.fields.some(f => f.fieldType === fieldType);
}

/**
 * Get field configuration
 */
export function getMagicFieldConfig(
  fieldType: MagicFieldType,
  contentType: MagicContentType
): MagicFieldConfig | undefined {
  const config = getMagicContentConfig(contentType);
  return config.fields.find(f => f.fieldType === fieldType);
}

/**
 * Estimate token usage for a set of fields
 */
export function estimateTokenUsage(
  fieldTypes: MagicFieldType[],
  contentType: MagicContentType
): number {
  const config = getMagicContentConfig(contentType);
  return fieldTypes.reduce((total, fieldType) => {
    const fieldConfig = config.fields.find(f => f.fieldType === fieldType);
    return total + (fieldConfig?.estimatedTokens ?? 100);
  }, 0);
}

/**
 * Sort fields by generation priority
 */
export function sortFieldsByPriority(
  fieldTypes: MagicFieldType[],
  contentType: MagicContentType
): MagicFieldType[] {
  const config = getMagicContentConfig(contentType);
  return [...fieldTypes].sort((a, b) => {
    const aConfig = config.fields.find(f => f.fieldType === a);
    const bConfig = config.fields.find(f => f.fieldType === b);
    return (aConfig?.priority ?? 999) - (bConfig?.priority ?? 999);
  });
}

/**
 * Check if all required context fields exist
 */
export function hasRequiredContext(
  fieldType: MagicFieldType,
  contentType: MagicContentType,
  existingFields: Record<string, any>
): boolean {
  const fieldConfig = getMagicFieldConfig(fieldType, contentType);
  if (!fieldConfig) return false;

  return fieldConfig.requiredContext.every(
    ctx => ctx in existingFields && existingFields[ctx] !== undefined && existingFields[ctx] !== ""
  );
}

// ============================================
// STRUCTURED OUTPUT TYPES
// ============================================

/**
 * Structured type for coordinates
 */
export interface MagicCoordinates {
  lat: number;
  lng: number;
  accuracy?: "exact" | "approximate" | "area";
}

/**
 * Structured type for opening hours
 */
export interface MagicOpeningHours {
  monday?: { open: string; close: string } | "closed";
  tuesday?: { open: string; close: string } | "closed";
  wednesday?: { open: string; close: string } | "closed";
  thursday?: { open: string; close: string } | "closed";
  friday?: { open: string; close: string } | "closed";
  saturday?: { open: string; close: string } | "closed";
  sunday?: { open: string; close: string } | "closed";
  notes?: string;
  timezone?: string;
}

/**
 * Structured type for transport info
 */
export interface MagicTransportInfo {
  metro?: {
    station: string;
    line?: string;
    walkingTime?: string;
  };
  bus?: {
    routes: string[];
    nearestStop?: string;
  };
  taxi?: string;
  parking?: string;
  notes?: string;
}

/**
 * Structured type for FAQ item
 */
export interface MagicFaqItem {
  question: string;
  answer: string;
  category?: string;
}

/**
 * Structured type for content section
 */
export interface MagicSection {
  title: string;
  content: string;
  type?: "intro" | "body" | "highlight" | "tips" | "conclusion";
  order: number;
}

/**
 * Structured type for gallery image suggestion
 */
export interface MagicGalleryImage {
  description: string;
  altText: string;
  suggestedKeywords: string[];
  importance: "hero" | "featured" | "supporting";
}

/**
 * Structured type for related item
 */
export interface MagicRelatedItem {
  title: string;
  type: MagicContentType;
  reason: string;
  relevanceScore: number;
}

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate coordinates
 */
export function isValidCoordinates(value: any): value is MagicCoordinates {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.lat === "number" &&
    typeof value.lng === "number" &&
    value.lat >= -90 &&
    value.lat <= 90 &&
    value.lng >= -180 &&
    value.lng <= 180
  );
}

/**
 * Validate opening hours
 */
export function isValidOpeningHours(value: any): value is MagicOpeningHours {
  if (typeof value !== "object" || value === null) return false;

  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  for (const day of days) {
    if (day in value) {
      const hours = value[day];
      if (hours !== "closed") {
        if (
          typeof hours !== "object" ||
          typeof hours.open !== "string" ||
          typeof hours.close !== "string"
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Validate FAQ array
 */
export function isValidFaqArray(value: any): value is MagicFaqItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        typeof item === "object" &&
        item !== null &&
        typeof item.question === "string" &&
        typeof item.answer === "string"
    )
  );
}

/**
 * Validate sections array
 */
export function isValidSectionsArray(value: any): value is MagicSection[] {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        typeof item === "object" &&
        item !== null &&
        typeof item.title === "string" &&
        typeof item.content === "string" &&
        typeof item.order === "number"
    )
  );
}
