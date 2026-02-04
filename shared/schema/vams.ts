/**
 * VAMS (Visual Asset Management System) Schema
 *
 * Extracted from the main schema.ts for modularity.
 * Contains tables for managing visual assets, variants, content relationships,
 * search caching, and SEO metadata.
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
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { vamsProviderEnum, vamsAssetStatusEnum, vamsVariantTypeEnum } from "./enums";

// ============================================
// FORWARD REFERENCE PLACEHOLDER
// ============================================

/**
 * Forward reference for the contents table.
 * This is used to avoid circular dependencies when the contents table
 * is defined in the main schema.ts file.
 *
 * The actual foreign key references will be resolved at runtime by Drizzle.
 */
declare const _contents: ReturnType<typeof pgTable> & { id: any };
const contents = _contents;

// ============================================
// VAMS (Visual Asset Management) TABLES
// ============================================

// Central image registry
export const vamsAssets = pgTable(
  "vams_assets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: vamsProviderEnum("provider").notNull(),
    providerId: varchar("provider_id", { length: 255 }), // External ID from provider
    status: vamsAssetStatusEnum("status").notNull().default("pending"),
    originalUrl: text("original_url"),
    storedUrl: text("stored_url"), // Our CDN URL after ingestion
    thumbnailUrl: text("thumbnail_url"),
    filename: varchar("filename", { length: 255 }),
    mimeType: varchar("mime_type", { length: 100 }),
    width: integer("width"),
    height: integer("height"),
    fileSize: integer("file_size"), // bytes
    // Metadata
    title: text("title"),
    description: text("description"),
    altText: text("alt_text"),
    altTextLocales: jsonb("alt_text_locales").$type<Record<string, string>>().default({}),
    photographer: varchar("photographer", { length: 255 }),
    photographerUrl: text("photographer_url"),
    license: varchar("license", { length: 100 }),
    licenseUrl: text("license_url"),
    // Search and organization
    tags: jsonb("tags").$type<string[]>().default([]),
    categories: jsonb("categories").$type<string[]>().default([]),
    colors: jsonb("colors").$type<string[]>().default([]), // Dominant colors
    aiLabels: jsonb("ai_labels").$type<string[]>().default([]), // AI-detected labels
    searchVector: text("search_vector"), // For full-text search
    // AI Generation metadata
    aiPrompt: text("ai_prompt"),
    aiModel: varchar("ai_model", { length: 100 }),
    aiSeed: varchar("ai_seed", { length: 100 }),
    // Stats
    usageCount: integer("usage_count").default(0),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_vams_assets_provider").on(table.provider),
    index("idx_vams_assets_status").on(table.status),
    index("idx_vams_assets_provider_id").on(table.providerId),
    uniqueIndex("idx_vams_assets_provider_unique").on(table.provider, table.providerId),
  ]
);

// Responsive image variants
export const vamsAssetVariants = pgTable(
  "vams_asset_variants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    assetId: varchar("asset_id")
      .notNull()
      .references(() => vamsAssets.id, { onDelete: "cascade" }),
    variantType: vamsVariantTypeEnum("variant_type").notNull(),
    url: text("url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    fileSize: integer("file_size"),
    format: varchar("format", { length: 20 }), // webp, avif, jpg
    quality: integer("quality"), // compression quality 1-100
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("idx_vams_variants_asset").on(table.assetId),
    uniqueIndex("idx_vams_variants_unique").on(table.assetId, table.variantType, table.format),
  ]
);

// Content-image relationships
export const vamsContentAssets = pgTable(
  "vams_content_assets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    assetId: varchar("asset_id")
      .notNull()
      .references(() => vamsAssets.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).notNull(), // hero, card, gallery, inline
    position: integer("position").default(0), // For ordering in galleries
    caption: text("caption"),
    altTextOverride: text("alt_text_override"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("idx_vams_content_assets_content").on(table.contentId),
    index("idx_vams_content_assets_asset").on(table.assetId),
    uniqueIndex("idx_vams_content_assets_unique").on(table.contentId, table.assetId, table.role),
  ]
);

// Stock search caching
export const vamsSearchCache = pgTable(
  "vams_search_cache",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: vamsProviderEnum("provider").notNull(),
    query: text("query").notNull(),
    queryHash: varchar("query_hash", { length: 64 }).notNull(), // SHA256 of normalized query
    results: jsonb("results")
      .$type<{
        items: Array<{
          providerId: string;
          url: string;
          thumbnailUrl?: string;
          title?: string;
          photographer?: string;
          width?: number;
          height?: number;
        }>;
        totalResults?: number;
        page?: number;
      }>()
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    hitCount: integer("hit_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("idx_vams_search_cache_provider").on(table.provider),
    index("idx_vams_search_cache_hash").on(table.queryHash),
    index("idx_vams_search_cache_expires").on(table.expiresAt),
    uniqueIndex("idx_vams_search_cache_unique").on(table.provider, table.queryHash),
  ]
);

// ============================================
// SEO ENHANCEMENT TABLES
// ============================================

// SEO metadata and Quality 108 scores
export const seoMetadata = pgTable(
  "seo_metadata",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .unique()
      .references(() => contents.id, { onDelete: "cascade" }),
    // Quality 108 scores (12 categories)
    quality108Total: integer("quality_108_total"),
    quality108Breakdown: jsonb("quality_108_breakdown")
      .$type<{
        travi_authenticity?: number;
        humanization?: number;
        sensory_immersion?: number;
        quotes_sources?: number;
        cultural_depth?: number;
        engagement?: number;
        voice_tone?: number;
        technical_seo?: number;
        aeo?: number;
        paa?: number;
        completeness?: number;
        internal_linking?: number; // New category!
      }>()
      .default({}),
    quality108Grade: varchar("quality_108_grade", { length: 5 }),
    quality108Passed: boolean("quality_108_passed").default(false),
    // AEO readiness
    aeoScore: integer("aeo_score"),
    hasAnswerCapsule: boolean("has_answer_capsule").default(false),
    hasFaqSchema: boolean("has_faq_schema").default(false),
    faqCount: integer("faq_count").default(0),
    hasSpeakableMarkup: boolean("has_speakable_markup").default(false),
    featuredSnippetOptimized: boolean("featured_snippet_optimized").default(false),
    // Internal linking metrics
    internalLinksOut: integer("internal_links_out").default(0),
    internalLinksIn: integer("internal_links_in").default(0),
    isOrphan: boolean("is_orphan").default(false), // No internal links pointing to it
    orphanSince: timestamp("orphan_since"),
    // Freshness
    contentAge: integer("content_age_days"),
    lastRefreshedAt: timestamp("last_refreshed_at"),
    needsRefresh: boolean("needs_refresh").default(false),
    // Audit timestamps
    lastAuditAt: timestamp("last_audit_at"),
    nextAuditAt: timestamp("next_audit_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_seo_metadata_content").on(table.contentId),
    index("idx_seo_metadata_quality").on(table.quality108Total),
    index("idx_seo_metadata_orphan").on(table.isOrphan),
    index("idx_seo_metadata_refresh").on(table.needsRefresh),
  ]
);

// ============================================
// INSERT SCHEMAS
// ============================================

// VAMS
export const insertVamsAssetSchema = createInsertSchema(vamsAssets);
export const insertVamsAssetVariantSchema = createInsertSchema(vamsAssetVariants);
export const insertVamsContentAssetSchema = createInsertSchema(vamsContentAssets);
export const insertVamsSearchCacheSchema = createInsertSchema(vamsSearchCache);

// SEO Enhancement
export const insertSeoMetadataSchema = createInsertSchema(seoMetadata);

// ============================================
// TYPE EXPORTS
// ============================================

// VAMS Types
export type VamsAsset = typeof vamsAssets.$inferSelect;
export type InsertVamsAsset = z.infer<typeof insertVamsAssetSchema>;
export type VamsAssetVariant = typeof vamsAssetVariants.$inferSelect;
export type InsertVamsAssetVariant = z.infer<typeof insertVamsAssetVariantSchema>;
export type VamsContentAsset = typeof vamsContentAssets.$inferSelect;
export type InsertVamsContentAsset = z.infer<typeof insertVamsContentAssetSchema>;
export type VamsSearchCache = typeof vamsSearchCache.$inferSelect;
export type InsertVamsSearchCache = z.infer<typeof insertVamsSearchCacheSchema>;

// SEO Types
export type SeoMetadata = typeof seoMetadata.$inferSelect;
export type InsertSeoMetadata = z.infer<typeof insertSeoMetadataSchema>;

// Enum value types
export type VamsProvider = (typeof vamsProviderEnum.enumValues)[number];
export type VamsAssetStatus = (typeof vamsAssetStatusEnum.enumValues)[number];
export type VamsVariantType = (typeof vamsVariantTypeEnum.enumValues)[number];
