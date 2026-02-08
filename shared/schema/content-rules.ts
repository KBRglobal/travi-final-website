import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { contentTypeEnum, automationStatusEnum, workflowExecutionStatusEnum } from "./enums";

// Note: Users/contents references removed to avoid circular dependencies.
// Foreign key constraints exist at the database level.

// ============================================================================
// CONTENT RULES TABLE
// ============================================================================

export const contentRules = pgTable("content_rules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),

  // Word count rules (STRICT - cannot be bypassed)
  minWords: integer("min_words").default(1800).notNull(),
  maxWords: integer("max_words").default(3500).notNull(),
  optimalMinWords: integer("optimal_min_words").default(2000).notNull(),
  optimalMaxWords: integer("optimal_max_words").default(2500).notNull(),

  // Structure rules
  introMinWords: integer("intro_min_words").default(150).notNull(),
  introMaxWords: integer("intro_max_words").default(200).notNull(),

  quickFactsMin: integer("quick_facts_min").default(5).notNull(),
  quickFactsMax: integer("quick_facts_max").default(8).notNull(),
  quickFactsWordsMin: integer("quick_facts_words_min").default(80).notNull(),
  quickFactsWordsMax: integer("quick_facts_words_max").default(120).notNull(),

  mainSectionsMin: integer("main_sections_min").default(4).notNull(),
  mainSectionsMax: integer("main_sections_max").default(6).notNull(),
  mainSectionWordsMin: integer("main_section_words_min").default(200).notNull(),
  mainSectionWordsMax: integer("main_section_words_max").default(300).notNull(),

  faqsMin: integer("faqs_min").default(6).notNull(),
  faqsMax: integer("faqs_max").default(10).notNull(),
  faqAnswerWordsMin: integer("faq_answer_words_min").default(50).notNull(),
  faqAnswerWordsMax: integer("faq_answer_words_max").default(100).notNull(),

  proTipsMin: integer("pro_tips_min").default(5).notNull(),
  proTipsMax: integer("pro_tips_max").default(8).notNull(),
  proTipWordsMin: integer("pro_tip_words_min").default(20).notNull(),
  proTipWordsMax: integer("pro_tip_words_max").default(35).notNull(),

  conclusionMinWords: integer("conclusion_min_words").default(100).notNull(),
  conclusionMaxWords: integer("conclusion_max_words").default(150).notNull(),

  // Internal linking rules
  internalLinksMin: integer("internal_links_min").default(5).notNull(),
  internalLinksMax: integer("internal_links_max").default(10).notNull(),

  // SEO rules
  keywordDensityMin: integer("keyword_density_min").default(1).notNull(), // percentage * 10
  keywordDensityMax: integer("keyword_density_max").default(3).notNull(), // percentage * 10
  dubaiMentionsMin: integer("dubai_mentions_min").default(5).notNull(),

  // Retry rules
  maxRetries: integer("max_retries").default(3).notNull(),

  // Content type this rule applies to (null = all types)
  contentType: contentTypeEnum("content_type"),

  // Metadata
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentRulesSchema = createInsertSchema(contentRules);
export type InsertContentRules = z.infer<typeof insertContentRulesSchema>;
export type ContentRules = typeof contentRules.$inferSelect;

// Default rules that will be seeded
/**
 * Legacy content rules used as fallback when no custom rules exist.
 * Prefer the AI Writers system (server/ai/writers/content-generator.ts) for new content.
 */
export const DEFAULT_CONTENT_RULES = {
  name: "dubai-seo-standard",
  description: "Standard SEO rules for Dubai tourism content - STRICT enforcement",
  isActive: true,
  minWords: 1800,
  maxWords: 3500,
  optimalMinWords: 2000,
  optimalMaxWords: 2500,
  introMinWords: 150,
  introMaxWords: 200,
  quickFactsMin: 5,
  quickFactsMax: 8,
  quickFactsWordsMin: 80,
  quickFactsWordsMax: 120,
  mainSectionsMin: 4,
  mainSectionsMax: 6,
  mainSectionWordsMin: 200,
  mainSectionWordsMax: 300,
  faqsMin: 6,
  faqsMax: 10,
  faqAnswerWordsMin: 50,
  faqAnswerWordsMax: 100,
  proTipsMin: 5,
  proTipsMax: 8,
  proTipWordsMin: 20,
  proTipWordsMax: 35,
  conclusionMinWords: 100,
  conclusionMaxWords: 150,
  internalLinksMin: 5,
  internalLinksMax: 10,
  keywordDensityMin: 10, // 1.0%
  keywordDensityMax: 30, // 3.0%
  dubaiMentionsMin: 5,
  maxRetries: 3,
  contentType: null,
};

// ============================================================================
// CONTENT SCORES TABLE
// ============================================================================

export const contentScores = pgTable(
  "content_scores",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id"),
    overallScore: integer("overall_score"),
    readabilityScore: integer("readability_score"),
    seoScore: integer("seo_score"),
    engagementScore: integer("engagement_score"),
    originalityScore: integer("originality_score"),
    structureScore: integer("structure_score"),
    feedback: jsonb("feedback").$type<string[]>().default([]),
    suggestions: jsonb("suggestions").$type<string[]>().default([]),
    analysis: jsonb("analysis").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [index("IDX_content_scores_content").on(table.contentId)]
);

export const insertContentScoreSchema = createInsertSchema(contentScores);
export type ContentScore = typeof contentScores.$inferSelect;
export type InsertContentScore = z.infer<typeof insertContentScoreSchema>;

// ============================================================================
// WORKFLOW TABLES
// ============================================================================

export const workflows = pgTable(
  "workflows",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    trigger: jsonb("trigger")
      .$type<{
        type: string;
        conditions: Record<string, unknown>;
      }>()
      .notNull(),
    actions: jsonb("actions")
      .$type<
        Array<{
          type: string;
          config: Record<string, unknown>;
        }>
      >()
      .notNull(),
    status: automationStatusEnum("status").notNull().default("draft"),
    createdBy: varchar("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_workflows_status").on(table.status)]
);

export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    workflowId: varchar("workflow_id"),
    status: workflowExecutionStatusEnum("status").notNull().default("pending"),
    triggerData: jsonb("trigger_data"),
    result: jsonb("result"),
    error: text("error"),
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  table => [
    index("IDX_workflow_executions_workflow").on(table.workflowId),
    index("IDX_workflow_executions_status").on(table.status),
  ]
);

export const insertWorkflowSchema = createInsertSchema(workflows);
export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions);

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

// ============================================================================
// HOMEPAGE SECTION TYPE
// ============================================================================

export type HomepageSection =
  | "featured"
  | "attractions"
  | "hotels"
  | "articles"
  | "trending"
  | "dining"
  | "events";

// ============================================================================
// CUSTOM REPORTS TABLE
// ============================================================================

export const customReports = pgTable("custom_reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull(),
  schedule: varchar("schedule"), // cron expression
  recipients: jsonb("recipients").$type<string[]>().default([]),
  lastRunAt: timestamp("last_run_at"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCustomReportSchema = createInsertSchema(customReports);
export type CustomReport = typeof customReports.$inferSelect;
export type InsertCustomReport = z.infer<typeof insertCustomReportSchema>;
