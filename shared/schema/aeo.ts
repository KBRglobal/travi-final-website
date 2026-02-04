/**
 * AEO (Answer Engine Optimization) Tables
 * Tables for optimizing content for AI assistants like ChatGPT, Perplexity, Claude, etc.
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
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import {
  aeoPlatformEnum,
  aeoCitationTypeEnum,
  aeoContentFormatEnum,
  localeEnum,
  contentTypeEnum,
} from "./enums";
import { contents } from "./content-base";
import { users } from "./auth";

// ============================================
// AEO (Answer Engine Optimization) Tables
// ============================================

// Answer Capsules - AI-optimized summaries for each content piece
export const aeoAnswerCapsules = pgTable(
  "aeo_answer_capsules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    locale: localeEnum("locale").notNull().default("en"),
    capsuleText: text("capsule_text").notNull(), // 40-60 word summary
    capsuleHtml: text("capsule_html"), // Optional HTML version with schema markup
    keyFacts: jsonb("key_facts").$type<string[]>().default([]), // Key facts for AI extraction
    quickAnswer: text("quick_answer"), // Ultra-short 15-20 word answer
    differentiator: text("differentiator"), // Unique value proposition
    lastQuery: text("last_query"), // Last query this capsule answered
    qualityScore: integer("quality_score"), // AI evaluation score 0-100
    citationCount: integer("citation_count").default(0), // Times cited by AI platforms
    generatedByAI: boolean("generated_by_ai").default(true),
    isApproved: boolean("is_approved").default(false),
    approvedBy: varchar("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    generatedAt: timestamp("generated_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    uniqueIndex("IDX_aeo_capsules_content_locale").on(table.contentId, table.locale),
    index("IDX_aeo_capsules_quality").on(table.qualityScore),
    index("IDX_aeo_capsules_citations").on(table.citationCount),
  ]
);

export const insertAeoAnswerCapsuleSchema = createInsertSchema(aeoAnswerCapsules);
export type InsertAeoAnswerCapsule = z.infer<typeof insertAeoAnswerCapsuleSchema>;
export type AeoAnswerCapsule = typeof aeoAnswerCapsules.$inferSelect;

// AEO Citations - Track when AI platforms cite our content
export const aeoCitations = pgTable(
  "aeo_citations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    platform: aeoPlatformEnum("platform").notNull(),
    query: text("query").notNull(), // User query that triggered the citation
    citationType: aeoCitationTypeEnum("citation_type").notNull(),
    citedText: text("cited_text"), // Actual text that was cited
    responseContext: text("response_context"), // Surrounding context in AI response
    url: text("url"), // URL of the AI response if available
    position: integer("position"), // Position in AI response (1st, 2nd, etc.)
    competitorsCited: jsonb("competitors_cited").$type<string[]>().default([]), // Other sources cited
    sessionId: varchar("session_id"), // To group citations from same session
    userAgent: text("user_agent"),
    ipCountry: varchar("ip_country", { length: 2 }),
    detectedAt: timestamp("detected_at").defaultNow(),
  },
  table => [
    index("IDX_aeo_citations_content").on(table.contentId),
    index("IDX_aeo_citations_platform").on(table.platform),
    index("IDX_aeo_citations_detected").on(table.detectedAt),
    index("IDX_aeo_citations_platform_date").on(table.platform, table.detectedAt),
  ]
);

export const insertAeoCitationSchema = createInsertSchema(aeoCitations);
export type InsertAeoCitation = z.infer<typeof insertAeoCitationSchema>;
export type AeoCitation = typeof aeoCitations.$inferSelect;

// AEO Performance Metrics - Aggregate daily metrics per platform
export const aeoPerformanceMetrics = pgTable(
  "aeo_performance_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    date: timestamp("date").notNull(),
    platform: aeoPlatformEnum("platform").notNull(),
    contentId: varchar("content_id").references(() => contents.id, { onDelete: "set null" }), // null for aggregate
    contentType: contentTypeEnum("content_type"),
    impressions: integer("impressions").default(0), // Estimated AI query appearances
    citations: integer("citations").default(0), // Confirmed citations
    clickThroughs: integer("click_throughs").default(0), // Clicks from AI to our site
    conversions: integer("conversions").default(0), // Bookings from AI traffic
    revenue: integer("revenue").default(0), // Revenue from AI traffic in cents
    avgPosition: integer("avg_position"), // Average position in AI responses (x100 for precision)
    topQueries: jsonb("top_queries").$type<Array<{ query: string; count: number }>>().default([]),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    uniqueIndex("IDX_aeo_metrics_date_platform_content").on(
      table.date,
      table.platform,
      table.contentId
    ),
    index("IDX_aeo_metrics_date").on(table.date),
    index("IDX_aeo_metrics_platform").on(table.platform),
    index("IDX_aeo_metrics_content").on(table.contentId),
  ]
);

export const insertAeoPerformanceMetricSchema = createInsertSchema(aeoPerformanceMetrics);
export type InsertAeoPerformanceMetric = z.infer<typeof insertAeoPerformanceMetricSchema>;
export type AeoPerformanceMetric = typeof aeoPerformanceMetrics.$inferSelect;

// AEO Crawler Logs - Track AI crawler visits
export const aeoCrawlerLogs = pgTable(
  "aeo_crawler_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    crawler: varchar("crawler").notNull(), // GPTBot, PerplexityBot, Google-Extended, ClaudeBot
    userAgent: text("user_agent").notNull(),
    requestPath: text("request_path").notNull(),
    contentId: varchar("content_id").references(() => contents.id, { onDelete: "set null" }),
    statusCode: integer("status_code").notNull(),
    responseTime: integer("response_time"), // in milliseconds
    bytesServed: integer("bytes_served"),
    ipAddress: varchar("ip_address"),
    referer: text("referer"),
    crawledAt: timestamp("crawled_at").defaultNow(),
  },
  table => [
    index("IDX_aeo_crawler_crawler").on(table.crawler),
    index("IDX_aeo_crawler_date").on(table.crawledAt),
    index("IDX_aeo_crawler_path").on(table.requestPath),
  ]
);

export const insertAeoCrawlerLogSchema = createInsertSchema(aeoCrawlerLogs);
export type InsertAeoCrawlerLog = z.infer<typeof insertAeoCrawlerLogSchema>;
export type AeoCrawlerLog = typeof aeoCrawlerLogs.$inferSelect;

// AEO Programmatic Content - Templates for scalable content generation
export const aeoProgrammaticContent = pgTable("aeo_programmatic_content", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  format: aeoContentFormatEnum("format").notNull(),
  templateName: varchar("template_name").notNull(),
  templatePattern: text("template_pattern").notNull(), // e.g., "{districtA} vs {districtB} for {travelerType}"
  variables: jsonb("variables").$type<Record<string, string[]>>().default({}), // Available values per variable
  generatedContentIds: jsonb("generated_content_ids").$type<string[]>().default([]),
  targetCount: integer("target_count").default(0), // How many pages to generate
  generatedCount: integer("generated_count").default(0),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // Higher = generate first
  lastGeneratedAt: timestamp("last_generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAeoProgrammaticContentSchema = createInsertSchema(aeoProgrammaticContent);
export type InsertAeoProgrammaticContent = z.infer<typeof insertAeoProgrammaticContentSchema>;
export type AeoProgrammaticContent = typeof aeoProgrammaticContent.$inferSelect;

// AEO A/B Tests - Test different answer capsule formats
export const aeoAbTests = pgTable("aeo_ab_tests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  contentId: varchar("content_id")
    .notNull()
    .references(() => contents.id, { onDelete: "cascade" }),
  variants: jsonb("variants")
    .$type<
      Array<{
        id: string;
        name: string;
        capsuleText: string;
        weight: number; // 0-100 percentage
      }>
    >()
    .default([]),
  winningVariantId: varchar("winning_variant_id"),
  status: varchar("status").notNull().default("draft"), // draft, running, completed, archived
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  minSampleSize: integer("min_sample_size").default(100),
  confidenceLevel: integer("confidence_level").default(95), // 95% confidence
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAeoAbTestSchema = createInsertSchema(aeoAbTests);
export type InsertAeoAbTest = z.infer<typeof insertAeoAbTestSchema>;
export type AeoAbTest = typeof aeoAbTests.$inferSelect;

// AEO Schema Enhancements - Store enhanced schema.org data for AI consumption
export const aeoSchemaEnhancements = pgTable(
  "aeo_schema_enhancements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    schemaType: varchar("schema_type").notNull(), // FAQPage, HowTo, TouristAttraction, etc.
    schemaData: jsonb("schema_data").$type<Record<string, unknown>>().notNull(),
    isActive: boolean("is_active").default(true),
    validationStatus: varchar("validation_status").default("pending"), // pending, valid, invalid
    validationErrors: jsonb("validation_errors").$type<string[]>().default([]),
    lastValidatedAt: timestamp("last_validated_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_aeo_schema_content").on(table.contentId),
    index("IDX_aeo_schema_type").on(table.schemaType),
  ]
);

export const insertAeoSchemaEnhancementSchema = createInsertSchema(aeoSchemaEnhancements);
export type InsertAeoSchemaEnhancement = z.infer<typeof insertAeoSchemaEnhancementSchema>;
export type AeoSchemaEnhancement = typeof aeoSchemaEnhancements.$inferSelect;

// ============================================
// AEO Relations
// ============================================

export const aeoAnswerCapsulesRelations = relations(aeoAnswerCapsules, ({ one }) => ({
  content: one(contents, { fields: [aeoAnswerCapsules.contentId], references: [contents.id] }),
  approver: one(users, { fields: [aeoAnswerCapsules.approvedBy], references: [users.id] }),
}));

export const aeoCitationsRelations = relations(aeoCitations, ({ one }) => ({
  content: one(contents, { fields: [aeoCitations.contentId], references: [contents.id] }),
}));

export const aeoPerformanceMetricsRelations = relations(aeoPerformanceMetrics, ({ one }) => ({
  content: one(contents, { fields: [aeoPerformanceMetrics.contentId], references: [contents.id] }),
}));

export const aeoCrawlerLogsRelations = relations(aeoCrawlerLogs, ({ one }) => ({
  content: one(contents, { fields: [aeoCrawlerLogs.contentId], references: [contents.id] }),
}));

export const aeoSchemaEnhancementsRelations = relations(aeoSchemaEnhancements, ({ one }) => ({
  content: one(contents, { fields: [aeoSchemaEnhancements.contentId], references: [contents.id] }),
}));

export const aeoAbTestsRelations = relations(aeoAbTests, ({ one }) => ({
  content: one(contents, { fields: [aeoAbTests.contentId], references: [contents.id] }),
}));
