/**
 * Localization and Translation Schema Tables
 * Extracted from /Users/admin/travi-final-website/shared/schema.ts
 *
 * Contains:
 * - Content translations
 * - UI translations
 * - Localized assets
 * - Pilot localized content
 * - Pilot localized guides
 * - Native 30-language content
 * - Topic clusters for RSS aggregation
 * - Translation jobs queue
 * - CMS translations
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import enums from the enums module
import {
  localeEnum,
  translationStatusEnum,
  translationJobStatusEnum,
  topicClusterStatusEnum,
  localizedAssetEntityTypeEnum,
  localizedAssetUsageEnum,
  pilotLocaleStatusEnum,
  nativeEntityTypeEnum,
  cmsEntityTypeEnum,
} from "./enums";

// Import types from the types module
import type { ContentBlock } from "./types";

// Import locale constants from the locales module
import { supportedLocales, nativeLocales, pilotLocales } from "./locales";

// ============================================================================
// Translation Job Fields Zod Type
// ============================================================================

export const translationJobFieldsType = z.enum([
  "title",
  "metaTitle",
  "metaDescription",
  "blocks",
  "answerCapsule",
  "faq",
  "highlights",
  "tags",
]);
export type TranslationJobField = z.infer<typeof translationJobFieldsType>;

// ============================================================================
// Zod Enum Validators - Derived from Drizzle pgEnum values
// ============================================================================

export const localizedAssetEntityTypes = [
  "content",
  "destination",
  "attraction",
  "hotel",
  "article",
  "guide",
  "page",
] as const;

export const localizedAssetUsages = [
  "hero",
  "card",
  "gallery",
  "og",
  "thumbnail",
  "banner",
  "logo",
] as const;

export const nativeEntityTypes = ["attraction", "guide", "destination", "district"] as const;

export const pilotEntityTypes = ["attraction"] as const;

// ============================================================================
// Topic Clusters - For RSS aggregation of similar articles
// ============================================================================

// Forward declaration for contents reference (will be imported from content-base)
declare const contents: {
  id: ReturnType<typeof varchar>;
};

// Forward declaration for rssFeeds reference
declare const rssFeeds: {
  id: ReturnType<typeof varchar>;
};

export const topicClusters = pgTable("topic_clusters", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  topic: text("topic").notNull(), // AI-identified topic
  status: topicClusterStatusEnum("status").notNull().default("pending"),
  mergedContentId: varchar("merged_content_id"), // References contents.id
  similarityScore: integer("similarity_score"), // 0-100 confidence score
  articleCount: integer("article_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const topicClusterItems = pgTable("topic_cluster_items", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  clusterId: varchar("cluster_id")
    .notNull()
    .references(() => topicClusters.id, { onDelete: "cascade" }),
  contentId: varchar("content_id"), // References contents.id
  rssFeedId: varchar("rss_feed_id"), // References rssFeeds.id
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title").notNull(),
  sourceDescription: text("source_description"),
  pubDate: timestamp("pub_date"),
  isUsedInMerge: boolean("is_used_in_merge").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTopicClusterSchema = createInsertSchema(topicClusters);
export type InsertTopicCluster = z.infer<typeof insertTopicClusterSchema>;
export type TopicCluster = typeof topicClusters.$inferSelect;

export const insertTopicClusterItemSchema = createInsertSchema(topicClusterItems);
export type InsertTopicClusterItem = z.infer<typeof insertTopicClusterItemSchema>;
export type TopicClusterItem = typeof topicClusterItems.$inferSelect;

// ============================================================================
// Translations - Multi-language content translations
// ============================================================================

export const translations = pgTable(
  "translations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull(), // References contents.id
    locale: localeEnum("locale").notNull(),
    status: translationStatusEnum("status").notNull().default("pending"),
    title: text("title"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    blocks: jsonb("blocks").$type<ContentBlock[]>().default([]),
    answerCapsule: text("answer_capsule"), // AEO: Localized answer capsule for AI extraction
    translatedBy: varchar("translated_by"),
    reviewedBy: varchar("reviewed_by"),
    sourceHash: varchar("source_hash"),
    isManualOverride: boolean("is_manual_override").default(false),
    translationProvider: varchar("translation_provider"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    uniqueIndex("IDX_translations_content_locale").on(table.contentId, table.locale),
    index("IDX_translations_locale").on(table.locale),
    index("IDX_translations_status").on(table.status),
  ]
);

export const insertTranslationSchema = createInsertSchema(translations);
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;

// ============================================================================
// UI Translations - Static interface strings
// ============================================================================

export const uiTranslations = pgTable(
  "ui_translations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: text("key").notNull(), // e.g., "nav.home", "common.loading"
    locale: localeEnum("locale").notNull(),
    value: text("value").notNull(),
    namespace: varchar("namespace").default("common"), // "common", "admin", "public"
    isManualOverride: boolean("is_manual_override").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => ({
    uniqueKeyLocale: sql`UNIQUE (${table.key}, ${table.locale})`,
  })
);

export const insertUiTranslationSchema = createInsertSchema(uiTranslations);
export type InsertUiTranslation = z.infer<typeof insertUiTranslationSchema>;
export type UiTranslation = typeof uiTranslations.$inferSelect;

// ============================================================================
// Localized Assets - Per-locale media (hero, card, gallery, OG images)
// ============================================================================

export const localizedAssets = pgTable(
  "localized_assets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    entityType: localizedAssetEntityTypeEnum("entity_type").notNull(),
    entityId: varchar("entity_id").notNull(),
    locale: localeEnum("locale").notNull(),
    usage: localizedAssetUsageEnum("usage").notNull(),
    src: text("src").notNull(), // URL or path to the image
    filename: text("filename"), // Localized filename for downloads/SEO
    alt: text("alt"), // Localized alt text
    title: text("title"), // Localized title attribute
    caption: text("caption"), // Localized caption
    width: integer("width"), // Image dimensions
    height: integer("height"),
    mimeType: varchar("mime_type"), // e.g., "image/webp"
    fileSize: integer("file_size"), // Bytes
    isOgImage: boolean("is_og_image").default(false), // Flag for OG image sitemap
    sortOrder: integer("sort_order").default(0), // For gallery ordering
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    uniqueIndex("IDX_localized_assets_entity_locale_usage").on(
      table.entityType,
      table.entityId,
      table.locale,
      table.usage
    ),
    index("IDX_localized_assets_entity").on(table.entityType, table.entityId),
    index("IDX_localized_assets_locale").on(table.locale),
    index("IDX_localized_assets_og").on(table.isOgImage),
  ]
);

export const insertLocalizedAssetSchema = z.object({
  entityType: z.enum(localizedAssetEntityTypes),
  entityId: z.string(),
  locale: z.enum(supportedLocales),
  usage: z.enum(localizedAssetUsages),
  src: z.string(),
  filename: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  isOgImage: z.boolean().optional(),
  sortOrder: z.number().optional(),
});
export type InsertLocalizedAsset = z.infer<typeof insertLocalizedAssetSchema>;
export type LocalizedAsset = typeof localizedAssets.$inferSelect;

// ============================================================================
// PILOT: Localized Content Table (Isolated for Octypo x Localization pilot)
// ============================================================================
// This is a TEMPORARY table for the localization pilot.
// Constraints:
// - en + ar + fr locales ONLY
// - Attraction entity type ONLY
// - No i18next/t() fallbacks - pure locale content
// - LocalePurity >= 98% hard gate
// - Atomic write (all validators pass or nothing written)

export const pilotLocalizedContent = pgTable(
  "pilot_localized_content",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Entity reference (attraction only for pilot)
    entityType: varchar("entity_type", { length: 50 }).notNull().default("attraction"),
    entityId: varchar("entity_id", { length: 100 }).notNull(),

    // Locale (en or ar only for pilot)
    locale: varchar("locale", { length: 10 }).notNull(),

    // Destination (required, no fallback)
    destination: varchar("destination", { length: 100 }).notNull(),

    // Content sections (all generated natively in locale, NOT translated)
    introduction: text("introduction"),
    whatToExpect: text("what_to_expect"),
    visitorTips: text("visitor_tips"),
    howToGetThere: text("how_to_get_there"),
    faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>(),
    answerCapsule: text("answer_capsule"),

    // SEO meta (locale-specific)
    metaTitle: varchar("meta_title", { length: 100 }),
    metaDescription: text("meta_description"),

    // Image metadata (locale-specific)
    imageAlt: text("image_alt"),
    imageCaption: text("image_caption"),

    // Validation results (stored for audit)
    localePurityScore: real("locale_purity_score"), // 0.0 - 1.0, must be >= 0.98
    validationResults: jsonb("validation_results").$type<{
      completeness: { passed: boolean; missingSections: string[] };
      localePurity: { passed: boolean; score: number; threshold: number };
      blueprint: { passed: boolean; issues: string[] };
      seoAeo: { passed: boolean; issues: string[] };
    }>(),

    // Status
    status: pilotLocaleStatusEnum("status").notNull().default("generating"),
    failureReason: text("failure_reason"),

    // Octypo generation metadata
    writerAgent: varchar("writer_agent", { length: 100 }),
    engineUsed: varchar("engine_used", { length: 100 }),
    tokensUsed: integer("tokens_used"),
    generationTimeMs: integer("generation_time_ms"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    // Unique constraint: one content per entity+locale
    uniqueIndex("IDX_pilot_localized_content_entity_locale").on(
      table.entityType,
      table.entityId,
      table.locale
    ),
    index("IDX_pilot_localized_content_status").on(table.status),
    index("IDX_pilot_localized_content_locale").on(table.locale),
  ]
);

export const insertPilotLocalizedContentSchema = z.object({
  entityType: z.enum(pilotEntityTypes),
  entityId: z.string(),
  locale: z.enum(pilotLocales),
  destination: z.string().min(1, "Destination is required - no fallback allowed"),
  introduction: z.string().nullable().optional(),
  whatToExpect: z.string().nullable().optional(),
  visitorTips: z.string().nullable().optional(),
  howToGetThere: z.string().nullable().optional(),
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .nullable()
    .optional(),
  answerCapsule: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  imageAlt: z.string().nullable().optional(),
  imageCaption: z.string().nullable().optional(),
  localePurityScore: z.number().nullable().optional(),
  validationResults: z.any().nullable().optional(),
  status: z.string().optional(),
  failureReason: z.string().nullable().optional(),
  writerAgent: z.string().nullable().optional(),
  engineUsed: z.string().nullable().optional(),
  tokensUsed: z.number().nullable().optional(),
  generationTimeMs: z.number().nullable().optional(),
});

export type InsertPilotLocalizedContent = z.infer<typeof insertPilotLocalizedContentSchema>;
export type PilotLocalizedContent = typeof pilotLocalizedContent.$inferSelect;

// ============================================================================
// PILOT: Localized Guides Table
// ============================================================================
// Parallel to pilot_localized_content but for guides (travel guides, city guides, etc.)
// Uses same atomic write pattern and locale purity validation

export const pilotLocalizedGuides = pgTable(
  "pilot_localized_guides",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Guide reference
    guideSlug: varchar("guide_slug", { length: 255 }).notNull(),

    // Locale (en or ar only for pilot)
    locale: varchar("locale", { length: 10 }).notNull(),

    // Destination (from guide data, required - no fallback)
    destination: varchar("destination", { length: 100 }).notNull(),

    // Content sections (natively written, NOT translated)
    introduction: text("introduction"), // Answer-first, 40-60 words
    whatToExpect: text("what_to_expect"), // What visitors will experience
    highlights: jsonb("highlights").$type<string[]>(), // Key points / itinerary items
    tips: text("tips"), // Practical visitor tips
    faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>(), // 5-10 AEO-ready FAQs
    answerCapsule: text("answer_capsule"), // Featured snippet target

    // SEO meta (locale-specific)
    metaTitle: varchar("meta_title", { length: 100 }),
    metaDescription: text("meta_description"),

    // Original guide reference (source content ID)
    sourceGuideId: integer("source_guide_id"),

    // Validation results (stored for audit)
    localePurityScore: real("locale_purity_score"), // 0.0 - 1.0, must be >= 0.98
    validationResults: jsonb("validation_results").$type<{
      completeness: { passed: boolean; missingSections: string[] };
      localePurity: { passed: boolean; score: number; threshold: number };
      blueprint: { passed: boolean; issues: string[] };
      seoAeo: { passed: boolean; issues: string[] };
      rtl?: { passed: boolean; issues: string[] };
    }>(),

    // Status
    status: pilotLocaleStatusEnum("status").notNull().default("generating"),
    failureReason: text("failure_reason"),

    // Generation metadata
    writerAgent: varchar("writer_agent", { length: 100 }),
    engineUsed: varchar("engine_used", { length: 100 }),
    tokensUsed: integer("tokens_used"),
    generationTimeMs: integer("generation_time_ms"),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  table => [
    // Unique constraint: one content per guide+locale
    uniqueIndex("IDX_pilot_localized_guides_slug_locale").on(table.guideSlug, table.locale),
    index("IDX_pilot_localized_guides_status").on(table.status),
    index("IDX_pilot_localized_guides_locale").on(table.locale),
  ]
);

export const insertPilotLocalizedGuideSchema = z.object({
  guideSlug: z.string(),
  locale: z.enum(pilotLocales),
  destination: z.string().min(1, "Destination is required - no fallback allowed"),
  title: z.string(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  heroImageAlt: z.string().nullable().optional(),
  content: z.any().nullable().optional(),
  status: z.string().optional(),
  localePurity: z.number().nullable().optional(),
  writerAgent: z.string().nullable().optional(),
  engineUsed: z.string().nullable().optional(),
  quality108Score: z.number().nullable().optional(),
  validationErrors: z.any().nullable().optional(),
});

export type InsertPilotLocalizedGuide = z.infer<typeof insertPilotLocalizedGuideSchema>;
export type PilotLocalizedGuide = typeof pilotLocalizedGuides.$inferSelect;

// ============================================================================
// Native Localized Content - Supports all 30 locales
// ============================================================================
// Native content generation (not translation) with locale purity validation

export const nativeLocalizedContent = pgTable(
  "native_localized_content",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Entity reference
    entityType: nativeEntityTypeEnum("entity_type").notNull(),
    entityId: varchar("entity_id", { length: 100 }).notNull(),
    destination: varchar("destination", { length: 100 }).notNull(),

    // Locale (all 30 supported)
    locale: varchar("locale", { length: 10 }).notNull(),
    tier: integer("tier").notNull().default(5), // Locale tier 1-5 for prioritization

    // Content sections
    title: text("title"),
    introduction: text("introduction"),
    whatToExpect: text("what_to_expect"),
    visitorTips: text("visitor_tips"),
    howToGetThere: text("how_to_get_there"),
    highlights: jsonb("highlights").$type<string[]>(),
    faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>(),
    answerCapsule: text("answer_capsule"),

    // SEO meta
    metaTitle: varchar("meta_title", { length: 100 }),
    metaDescription: text("meta_description"),

    // Validation
    localePurityScore: real("locale_purity_score"),
    validationResults: jsonb("validation_results").$type<{
      completeness: { passed: boolean; missingSections: string[] };
      localePurity: { passed: boolean; score: number; threshold: number };
      blueprint: { passed: boolean; issues: string[] };
      seoAeo: { passed: boolean; issues: string[] };
      rtl?: { passed: boolean; issues: string[] };
      culturalContext?: { passed: boolean; issues: string[] };
    }>(),

    // Status (reuse pilot enum)
    status: pilotLocaleStatusEnum("status").notNull().default("generating"),
    failureReason: text("failure_reason"),

    // Source hash for idempotency (skip regeneration if source unchanged)
    sourceHash: varchar("source_hash", { length: 64 }),

    // Generation metadata
    writerAgent: varchar("writer_agent", { length: 100 }),
    engineUsed: varchar("engine_used", { length: 100 }),
    tokensUsed: integer("tokens_used"),
    generationTimeMs: integer("generation_time_ms"),
    culturalContextVersion: varchar("cultural_context_version", { length: 50 }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    publishedAt: timestamp("published_at"),
  },
  table => [
    uniqueIndex("uq_native_content_entity_locale").on(
      table.entityType,
      table.entityId,
      table.locale
    ),
    index("idx_native_content_status").on(table.status),
    index("idx_native_content_locale").on(table.locale),
    index("idx_native_content_destination").on(table.destination),
    index("idx_native_content_tier").on(table.tier),
  ]
);

export const insertNativeLocalizedContentSchema = z.object({
  entityType: z.enum(nativeEntityTypes),
  entityId: z.string(),
  destination: z.string().min(1, "Destination is required"),
  locale: z.enum(nativeLocales),
  tier: z.number().min(1).max(5).optional(),
  title: z.string().nullable().optional(),
  introduction: z.string().nullable().optional(),
  whatToExpect: z.string().nullable().optional(),
  visitorTips: z.string().nullable().optional(),
  howToGetThere: z.string().nullable().optional(),
  highlights: z.array(z.string()).nullable().optional(),
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .nullable()
    .optional(),
  answerCapsule: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  localePurityScore: z.number().nullable().optional(),
  validationResults: z.any().nullable().optional(),
  status: z.string().optional(),
  failureReason: z.string().nullable().optional(),
  sourceHash: z.string().nullable().optional(),
  writerAgent: z.string().nullable().optional(),
  engineUsed: z.string().nullable().optional(),
  tokensUsed: z.number().nullable().optional(),
  generationTimeMs: z.number().nullable().optional(),
  culturalContextVersion: z.string().nullable().optional(),
});

export type InsertNativeLocalizedContent = z.infer<typeof insertNativeLocalizedContentSchema>;
export type NativeLocalizedContent = typeof nativeLocalizedContent.$inferSelect;

// ============================================================================
// Translation Batch Jobs - OpenAI Batch API integration
// ============================================================================

export const translationBatchJobs = pgTable(
  "translation_batch_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    status: varchar("status").notNull().default("pending"),
    batchId: varchar("batch_id"), // OpenAI batch ID
    requests: jsonb("requests")
      .$type<
        Array<{
          customId: string;
          text: string;
          sourceLocale: string;
          targetLocale: string;
          contentType: "title" | "description" | "body" | "meta";
        }>
      >()
      .notNull()
      .default([]),
    results: jsonb("results").$type<Record<string, string>>().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  table => [
    index("IDX_batch_status").on(table.status),
    index("IDX_batch_created").on(table.createdAt),
  ]
);

export type TranslationBatchJob = typeof translationBatchJobs.$inferSelect;
export type InsertTranslationBatchJob = typeof translationBatchJobs.$inferInsert;

// ============================================================================
// Translation Jobs Queue - Persistent, resumable translation job queue
// ============================================================================
// Follows Octopus queue pattern. Survives server restarts, supports
// concurrency limits and exponential backoff.

export const translationJobs = pgTable(
  "translation_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull(), // References contents.id
    sourceLocale: varchar("source_locale").notNull().default("en"),
    targetLocale: varchar("target_locale").notNull(), // One of 17 supported locales
    status: translationJobStatusEnum("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(0), // Higher = more urgent
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    nextRunAt: timestamp("next_run_at"), // For exponential backoff scheduling
    error: text("error"), // Last error message
    fields: jsonb("fields")
      .$type<TranslationJobField[]>()
      .default([
        "title",
        "metaTitle",
        "metaDescription",
        "blocks",
        "answerCapsule",
        "faq",
        "highlights",
        "tags",
      ]),
    sourceHash: varchar("source_hash"), // SHA-256 of source content - skip if unchanged
    translationProvider: varchar("translation_provider"), // deepl, openai, anthropic, etc.
    processingStartedAt: timestamp("processing_started_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  table => [
    index("IDX_translation_jobs_content").on(table.contentId),
    index("IDX_translation_jobs_status").on(table.status),
    index("IDX_translation_jobs_target_locale").on(table.targetLocale),
    index("IDX_translation_jobs_next_run").on(table.nextRunAt),
    index("IDX_translation_jobs_priority").on(table.priority),
    uniqueIndex("IDX_translation_jobs_unique").on(table.contentId, table.targetLocale),
  ]
);

export const insertTranslationJobSchema = createInsertSchema(translationJobs);

export type TranslationJob = typeof translationJobs.$inferSelect;
export type InsertTranslationJob = z.infer<typeof insertTranslationJobSchema>;

// ============================================================================
// CMS Translations - Localized text for CMS entities (not content)
// ============================================================================

export const cmsTranslations = pgTable(
  "cms_translations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    entityType: cmsEntityTypeEnum("entity_type").notNull(),
    entityId: varchar("entity_id", { length: 255 }).notNull(), // can be uuid or integer as string
    locale: varchar("locale", { length: 10 }).notNull(), // en, he, fr, es, etc.
    field: varchar("field", { length: 100 }).notNull(), // title, subtitle, description, etc.
    value: text("value"), // the translated text
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    uniqueIndex("IDX_cms_translations_unique").on(
      table.entityType,
      table.entityId,
      table.locale,
      table.field
    ),
    index("IDX_cms_translations_entity").on(table.entityType, table.entityId),
    index("IDX_cms_translations_locale").on(table.locale),
  ]
);

export const insertCmsTranslationSchema = createInsertSchema(cmsTranslations);

export type CmsTranslation = typeof cmsTranslations.$inferSelect;
export type InsertCmsTranslation = z.infer<typeof insertCmsTranslationSchema>;
