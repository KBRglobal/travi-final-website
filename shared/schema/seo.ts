/**
 * SEO-related tables for the Travi platform
 * Includes topic bank, keyword repository, SEO analysis, and audit tracking
 */

import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import {
  articleCategoryEnum,
  topicCategoryEnum,
  viralPotentialEnum,
  topicFormatEnum,
  topicTypeEnum,
  contentIntentEnum,
  seoKeywordTypeEnum,
} from "./enums";
import type { SeoIssue, SeoSuggestion } from "./types";
import { nativeLocales } from "./locales";
import { contents } from "./content-base";

// ============================================================================
// TOPIC BANK - For auto-generating articles when RSS lacks content
// ============================================================================

export const topicBank = pgTable("topic_bank", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  headlineAngle: text("headline_angle"), // The hook/headline for viral content
  category: articleCategoryEnum("category"),
  mainCategory: topicCategoryEnum("main_category"), // Main topic category (luxury, food, etc.)
  viralPotential: viralPotentialEnum("viral_potential").default("3"), // 1-5 stars
  format: topicFormatEnum("format"), // video_tour, photo_gallery, etc.
  topicType: topicTypeEnum("topic_type").default("evergreen"), // trending, evergreen, seasonal
  keywords: jsonb("keywords").$type<string[]>().default([]),
  outline: text("outline"),
  priority: integer("priority").default(0),
  lastUsed: timestamp("last_used"),
  timesUsed: integer("times_used").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTopicBankSchema = createInsertSchema(topicBank);
export type InsertTopicBank = z.infer<typeof insertTopicBankSchema>;
export type TopicBank = typeof topicBank.$inferSelect;

// ============================================================================
// KEYWORD REPOSITORY - SEO Bible for the system
// ============================================================================

export const keywordRepository = pgTable("keyword_repository", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  keyword: text("keyword").notNull().unique(),
  type: text("type").notNull(),
  category: text("category"),
  searchVolume: text("search_volume"),
  competition: text("competition"),
  relatedKeywords: jsonb("related_keywords").$type<string[]>().default([]),
  usageCount: integer("usage_count").default(0),
  priority: integer("priority").default(0),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertKeywordRepositorySchema = createInsertSchema(keywordRepository);
export type InsertKeywordRepository = z.infer<typeof insertKeywordRepositorySchema>;
export type KeywordRepository = typeof keywordRepository.$inferSelect;

// ============================================================================
// SEO ANALYSIS RESULTS - Cached analysis for content
// ============================================================================

export const seoAnalysisResults = pgTable(
  "seo_analysis_results",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    overallScore: integer("overall_score").notNull(),
    titleScore: integer("title_score"),
    metaDescriptionScore: integer("meta_description_score"),
    keywordScore: integer("keyword_score"),
    contentScore: integer("content_score"),
    readabilityScore: integer("readability_score"),
    technicalScore: integer("technical_score"),
    issues: jsonb("issues").$type<SeoIssue[]>().default([]),
    suggestions: jsonb("suggestions").$type<SeoSuggestion[]>().default([]),
    analyzedAt: timestamp("analyzed_at").defaultNow(),
  },
  table => [index("IDX_seo_analysis_content").on(table.contentId)]
);

export const insertSeoAnalysisResultSchema = createInsertSchema(seoAnalysisResults);
export type InsertSeoAnalysisResult = z.infer<typeof insertSeoAnalysisResultSchema>;
export type SeoAnalysisResult = typeof seoAnalysisResults.$inferSelect;

// ============================================================================
// SEO AUDIT LOGS - Tracks SEO actions and changes
// ============================================================================

export const seoAuditLogs = pgTable(
  "seo_audit_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").references(() => contents.id, { onDelete: "cascade" }),
    action: varchar("action").notNull(),
    reason: text("reason"),
    triggeredBy: varchar("triggered_by").notNull().default("automatic"),
    status: varchar("status").notNull().default("pending"),
    priority: varchar("priority").default("medium"),
    data: text("data"),
    createdAt: timestamp("created_at").defaultNow(),
    executedAt: timestamp("executed_at"),
  },
  table => [
    index("IDX_seo_audit_content").on(table.contentId),
    index("IDX_seo_audit_created").on(table.createdAt),
  ]
);

export const insertSeoAuditLogSchema = createInsertSchema(seoAuditLogs);
export type InsertSeoAuditLog = z.infer<typeof insertSeoAuditLogSchema>;
export type SeoAuditLog = typeof seoAuditLogs.$inferSelect;

// ============================================================================
// PAGE SEO - Generic SEO configuration for any page path
// ============================================================================

export const pageSeo = pgTable("page_seo", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  pagePath: varchar("page_path", { length: 255 }).notNull().unique(), // e.g. "/destinations", "/hotels", "/guides"
  pageLabel: varchar("page_label", { length: 255 }), // Human-readable label for admin UI
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  canonicalUrl: text("canonical_url"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  robotsMeta: text("robots_meta").default("index, follow"),
  jsonLdSchema: jsonb("json_ld_schema"), // Editable JSON-LD structured data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPageSeoSchema = createInsertSchema(pageSeo);
export type InsertPageSeo = z.infer<typeof insertPageSeoSchema>;
export type PageSeo = typeof pageSeo.$inferSelect;

// ============================================================================
// LOCALE SEO KEYWORDS - Locale-specific SEO keywords
// ============================================================================

export const localeSeoKeywords = pgTable(
  "locale_seo_keywords",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    locale: varchar("locale", { length: 10 }).notNull(),
    destination: varchar("destination", { length: 100 }).notNull(),
    keywordType: seoKeywordTypeEnum("keyword_type").notNull(),
    keyword: text("keyword").notNull(),
    searchVolume: integer("search_volume"),
    difficulty: integer("difficulty"), // 0-100 SEO difficulty
    intent: contentIntentEnum("intent"), // informational, commercial, transactional
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    uniqueIndex("uq_seo_keyword").on(table.locale, table.destination, table.keyword),
    index("idx_seo_keywords_locale").on(table.locale),
    index("idx_seo_keywords_destination").on(table.destination),
    index("idx_seo_keywords_type").on(table.keywordType),
  ]
);

export const insertLocaleSeoKeywordSchema = z.object({
  locale: z.enum(nativeLocales),
  destination: z.string().min(1),
  keywordType: z.enum(["primary", "secondary", "long_tail", "question", "local"]),
  keyword: z.string().min(1),
  searchVolume: z.number().nullable().optional(),
  difficulty: z.number().min(0).max(100).nullable().optional(),
  intent: z
    .enum(["informational", "commercial", "transactional", "navigational"])
    .nullable()
    .optional(),
});

export type InsertLocaleSeoKeyword = z.infer<typeof insertLocaleSeoKeywordSchema>;
export type LocaleSeoKeyword = typeof localeSeoKeywords.$inferSelect;
