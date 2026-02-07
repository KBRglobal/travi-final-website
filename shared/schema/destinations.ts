import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  serial,
  boolean,
  timestamp,
  jsonb,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import enums from ./enums
import {
  destinationLevelEnum,
  researchStatusEnum,
  suggestionStatusEnum,
  contentTypeEnum,
} from "./enums";

// Import types from ./types
import type {
  DestinationImage,
  DestinationHeroImage,
  FeaturedAttraction,
  FeaturedArea,
  FeaturedHighlight,
  DestinationsIndexHeroSlide,
} from "./types";

// Re-export types for convenience
export type {
  DestinationImage,
  DestinationHeroImage,
  FeaturedAttraction,
  FeaturedArea,
  FeaturedHighlight,
  DestinationsIndexHeroSlide,
} from "./types";

// Import users table for foreign key references
import { users } from "./auth";

// ============================================================================
// ZOD VALIDATION SCHEMAS FOR FEATURED SECTIONS
// ============================================================================

export const featuredAttractionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  image: z.string().min(1, "Image URL is required"),
  imageAlt: z.string().min(1, "Image alt text is required"),
  slug: z.string().optional(),
  shortDescription: z.string().max(120, "Description must be 120 characters or less").optional(),
  order: z.number(),
  isActive: z.boolean(),
});

export const featuredAreaSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  image: z.string().min(1, "Image URL is required"),
  imageAlt: z.string().min(1, "Image alt text is required"),
  vibe: z.string().min(1, "Vibe is required"),
  priceLevel: z.string().optional(),
  shortDescription: z.string().optional(),
  order: z.number(),
  isActive: z.boolean(),
});

export const featuredHighlightSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  image: z.string().min(1, "Image URL is required"),
  imageAlt: z.string().min(1, "Image alt text is required"),
  caption: z.string().max(80, "Caption must be 80 characters or less").optional(),
  linkUrl: z.string().optional(),
  order: z.number(),
  isActive: z.boolean(),
});

export const featuredSectionsUpdateSchema = z.object({
  featuredAttractions: z.array(featuredAttractionSchema).optional(),
  featuredAreas: z.array(featuredAreaSchema).optional(),
  featuredHighlights: z.array(featuredHighlightSchema).optional(),
});

export type FeaturedSectionsUpdate = z.infer<typeof featuredSectionsUpdateSchema>;

// ============================================================================
// DESTINATION INTELLIGENCE TABLES
// ============================================================================

// Destinations table - stores all travel destinations with content health metrics
// CMS Contract: Enforces Country -> City -> Area hierarchy with separate image slots
// NOTE: id is serial (integer) in the live DB — do NOT change to varchar
export const destinations = pgTable(
  "destinations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull(),
    country: varchar("country").notNull(),
    slug: varchar("slug"),
    // Legacy columns that exist in live DB
    continent: varchar("continent"),
    image: varchar("image"),
    rating: numeric("rating").default("4.5"),
    reviews: integer("reviews").default(0),
    trending: boolean("trending").default(false),
    description: text("description"),
    countrySlug: varchar("country_slug"),
    // Normalized name for indexed lookup (lowercase, punctuation-stripped)
    normalizedName: varchar("normalized_name"),
    // CMS Contract: Hierarchy fields
    destinationLevel: destinationLevelEnum("destination_level").default("city"),
    parentDestinationId: varchar("parent_destination_id"),
    // CMS Contract: Summary for card preview (300 chars max)
    summary: text("summary"),
    // CMS Contract: Brand color (optional accent, NOT for CTAs)
    brandColor: varchar("brand_color"),
    isActive: boolean("is_active").default(false),
    // status is varchar in live DB (values like 'published'), not an enum
    status: varchar("status").default("published"),
    hasPage: boolean("has_page").default(false),
    seoScore: integer("seo_score").default(0),
    wordCount: integer("word_count").default(0),
    internalLinks: integer("internal_links").default(0),
    externalLinks: integer("external_links").default(0),
    h2Count: integer("h2_count").default(0),
    metaTitle: varchar("meta_title"),
    metaDescription: text("meta_description"),
    primaryKeyword: varchar("primary_keyword"),
    secondaryKeywords: text("secondary_keywords").array(),
    // CMS Contract: Hero image (hero section ONLY) - legacy single image
    heroImage: text("hero_image"),
    heroImageAlt: text("hero_image_alt"),
    // CMS Contract: Hero carousel images (ordered list for carousel)
    heroImages: jsonb("hero_images").$type<DestinationHeroImage[]>().default([]),
    // CMS Contract: Hero content (editable from Admin)
    heroTitle: text("hero_title"),
    heroSubtitle: text("hero_subtitle"),
    heroCTAText: varchar("hero_cta_text"),
    heroCTALink: varchar("hero_cta_link"),
    // CMS Contract: Destination mood/vibe for visual theming
    moodVibe: varchar("mood_vibe"),
    moodTagline: varchar("mood_tagline"),
    moodPrimaryColor: varchar("mood_primary_color"),
    moodGradientFrom: varchar("mood_gradient_from"),
    moodGradientTo: varchar("mood_gradient_to"),
    // CMS Contract: Open Graph fields
    ogTitle: varchar("og_title"),
    ogDescription: text("og_description"),
    ogImage: varchar("og_image"),
    canonicalUrl: varchar("canonical_url"),
    // CMS Contract: Card image (grids/listings ONLY, never reuse hero)
    cardImage: text("card_image"),
    cardImageAlt: text("card_image_alt"),
    images: jsonb("images").$type<DestinationImage[]>().default([]),
    // CMS Contract: Image-led sections (No image = No section)
    featuredAttractions: jsonb("featured_attractions").$type<FeaturedAttraction[]>().default([]),
    featuredAreas: jsonb("featured_areas").$type<FeaturedArea[]>().default([]),
    featuredHighlights: jsonb("featured_highlights").$type<FeaturedHighlight[]>().default([]),
    translations: jsonb("translations")
      .$type<
        Record<
          string,
          { title: string; metaTitle: string; metaDescription: string; translatedAt: string }
        >
      >()
      .default({}),
    lastGenerated: timestamp("last_generated"),
    lastPublished: timestamp("last_published"),
    lastImageGenerated: timestamp("last_image_generated"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_destinations_normalized_name").on(table.normalizedName),
    index("IDX_destinations_slug").on(table.slug),
  ]
);

export const insertDestinationSchema = createInsertSchema(destinations);

export type Destination = typeof destinations.$inferSelect;
export type InsertDestination = z.infer<typeof insertDestinationSchema>;

// ============================================================================
// DESTINATION CONTENT TABLE
// ============================================================================

// Destination generated content table - stores AI-generated content for destinations
export const destinationContent = pgTable("destination_content", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull(),
  contentType: varchar("content_type").notNull(), // hero, attractions, districts, hotels, restaurants, tips, events
  content: jsonb("content").notNull(),
  seoValidation: jsonb("seo_validation"),
  qualityScore: integer("quality_score").default(0),
  qualityTier: varchar("quality_tier"), // rejected, draft, review, publish, auto_approve
  generatedBy: varchar("generated_by"), // AI provider name
  generatedModel: varchar("generated_model"), // AI model used
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDestinationContentSchema = createInsertSchema(destinationContent);

export type DestinationContent = typeof destinationContent.$inferSelect;
export type InsertDestinationContent = z.infer<typeof insertDestinationContentSchema>;

// ============================================================================
// CATEGORY PAGES (CMS Contract)
// ============================================================================

// Category Pages table - thematic content groupings within destinations
// CMS Contract: Browse surface, no Primary CTAs allowed
export const categoryPages = pgTable(
  "category_pages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 40 }).notNull(),
    slug: varchar("slug").notNull(),
    destinationId: varchar("destination_id").notNull(),
    metaTitle: varchar("meta_title", { length: 60 }),
    metaDescription: text("meta_description"),
    // CMS Contract: Optional decorative image (NOT hero)
    headerImage: text("header_image"),
    headerImageAlt: text("header_image_alt"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_category_pages_destination").on(table.destinationId),
    index("IDX_category_pages_slug").on(table.slug),
  ]
);

export const insertCategoryPageSchema = createInsertSchema(categoryPages);

export type CategoryPage = typeof categoryPages.$inferSelect;
export type InsertCategoryPage = z.infer<typeof insertCategoryPageSchema>;

// ============================================================================
// AI GENERATION LOGS
// ============================================================================

// AI generation logs - tracks all AI content generation attempts
export const aiGenerationLogs = pgTable("ai_generation_logs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  targetType: varchar("target_type").notNull(), // destination, article, hotel, attraction
  targetId: varchar("target_id").notNull(),
  provider: varchar("provider").notNull(),
  model: varchar("model").notNull(),
  prompt: text("prompt"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  success: boolean("success").notNull(),
  error: text("error"),
  seoScore: integer("seo_score"),
  qualityTier: varchar("quality_tier"),
  duration: integer("duration"), // in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiGenerationLogSchema = createInsertSchema(aiGenerationLogs);

export type AiGenerationLog = typeof aiGenerationLogs.$inferSelect;
export type InsertAiGenerationLog = z.infer<typeof insertAiGenerationLogSchema>;

// ============================================================================
// RESEARCH UPLOADS
// ============================================================================

// Research Uploads - stores deep research documents for "octopus" content extraction
export const researchUploads = pgTable("research_uploads", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  sourceType: varchar("source_type").notNull().default("paste"), // paste, file, url
  content: text("content").notNull(),
  status: researchStatusEnum("status").notNull().default("pending"),
  metadata: jsonb("metadata"),
  analyzedAt: timestamp("analyzed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResearchUploadSchema = createInsertSchema(researchUploads);

export type ResearchUpload = typeof researchUploads.$inferSelect;
export type InsertResearchUpload = z.infer<typeof insertResearchUploadSchema>;

// ============================================================================
// CONTENT SUGGESTIONS
// ============================================================================

// Content Suggestions - AI-extracted content ideas from research
export const contentSuggestions = pgTable("content_suggestions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  researchId: varchar("research_id")
    .notNull()
    .references(() => researchUploads.id, { onDelete: "cascade" }),
  suggestedTitle: varchar("suggested_title").notNull(),
  suggestedSlug: varchar("suggested_slug"),
  contentType: contentTypeEnum("content_type").notNull(),
  category: varchar("category"), // subcategory within type
  destinationCity: varchar("destination_city"), // Target city (e.g., "Dubai", "Abu Dhabi")
  destinationId: varchar("destination_id"), // Links to destinations table if applicable
  summary: text("summary"), // Brief description of the content
  keyPoints: jsonb("key_points"), // Array of main points to cover
  keywords: jsonb("keywords"), // Suggested SEO keywords
  sourceExcerpt: text("source_excerpt"), // Relevant excerpt from research
  priority: integer("priority").default(50), // 1-100, higher = more important
  confidence: integer("confidence").default(80), // AI confidence in suggestion 1-100
  isDuplicate: boolean("is_duplicate").default(false), // Flagged as potential duplicate
  duplicateOfId: varchar("duplicate_of_id"), // If duplicate, links to existing content
  status: suggestionStatusEnum("status").notNull().default("pending"),
  generatedContentId: varchar("generated_content_id"), // Links to created content
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentSuggestionSchema = createInsertSchema(contentSuggestions);

export type ContentSuggestion = typeof contentSuggestions.$inferSelect;
export type InsertContentSuggestion = z.infer<typeof insertContentSuggestionSchema>;

// ============================================================================
// DESTINATIONS INDEX CONFIG
// ============================================================================

// Destinations Index Config - Hero carousel for /destinations page
export const destinationsIndexConfig = pgTable("destinations_index_config", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  // Hero carousel slides (ordered list)
  heroSlides: jsonb("hero_slides").$type<DestinationsIndexHeroSlide[]>().default([]),
  // Hero section content (DB-driven, no fallbacks)
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  heroDescription: text("hero_description"),
  heroCTAText: varchar("hero_cta_text"),
  heroCTALink: varchar("hero_cta_link"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDestinationsIndexConfigSchema = createInsertSchema(destinationsIndexConfig);

export type DestinationsIndexConfig = typeof destinationsIndexConfig.$inferSelect;
export type InsertDestinationsIndexConfig = z.infer<typeof insertDestinationsIndexConfigSchema>;

// ============================================================================
// RELATIONS
// ============================================================================

// Relations for research system
export const researchUploadsRelations = relations(researchUploads, ({ many, one }) => ({
  suggestions: many(contentSuggestions),
  createdByUser: one(users, { fields: [researchUploads.createdBy], references: [users.id] }),
}));

export const contentSuggestionsRelations = relations(contentSuggestions, ({ one }) => ({
  research: one(researchUploads, {
    fields: [contentSuggestions.researchId],
    references: [researchUploads.id],
  }),
}));

// Destination relations
export const destinationsRelations = relations(destinations, ({ many }) => ({
  content: many(destinationContent),
}));

export const destinationContentRelations = relations(destinationContent, ({ one }) => ({
  destination: one(destinations, {
    fields: [destinationContent.destinationId],
    references: [destinations.id],
  }),
}));
