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
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { abTestStatusEnum, abTestTypeEnum, qaCheckStatusEnum, qaRunStatusEnum } from "./enums";
import { users } from "./auth";

// ============================================================================
// A/B TESTING TABLES
// ============================================================================

// A/B Tests table for content testing
export const abTests = pgTable(
  "ab_tests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull(),
    testType: abTestTypeEnum("test_type").notNull(),
    variants: jsonb("variants")
      .$type<
        Array<{
          id: string;
          value: string;
          impressions: number;
          clicks: number;
          ctr: number;
        }>
      >()
      .notNull()
      .default([]),
    status: abTestStatusEnum("status").notNull().default("running"),
    winner: varchar("winner"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    endsAt: timestamp("ends_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_ab_tests_content").on(table.contentId),
    index("IDX_ab_tests_status").on(table.status),
  ]
);

export type ABTest = typeof abTests.$inferSelect;
export type InsertABTest = typeof abTests.$inferInsert;

// ============================================================================
// A/B TESTING EXTENDED TABLES
// ============================================================================

export const abTestVariants = pgTable(
  "ab_test_variants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    testId: varchar("test_id").references(() => abTests.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    config: jsonb("config").$type<Record<string, unknown>>().notNull(),
    isControl: boolean("is_control").notNull().default(false),
    weight: integer("weight").notNull().default(50),
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),
    conversions: integer("conversions").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [index("IDX_ab_test_variants_test").on(table.testId)]
);

export const abTestEvents = pgTable(
  "ab_test_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    testId: varchar("test_id").references(() => abTests.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id").references(() => abTestVariants.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    userId: varchar("user_id"),
    sessionId: varchar("session_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_ab_test_events_test").on(table.testId),
    index("IDX_ab_test_events_variant").on(table.variantId),
    index("IDX_ab_test_events_created").on(table.createdAt),
  ]
);

export const insertAbTestVariantSchema = createInsertSchema(abTestVariants);

export const insertAbTestEventSchema = createInsertSchema(abTestEvents);

export type AbTestVariant = typeof abTestVariants.$inferSelect;
export type InsertAbTestVariant = z.infer<typeof insertAbTestVariantSchema>;
export type AbTestEvent = typeof abTestEvents.$inferSelect;
export type InsertAbTestEvent = z.infer<typeof insertAbTestEventSchema>;

// ============================================================================
// QA CHECKLIST TABLES
// ============================================================================

// QA Checklist Categories - stores the category definitions
export const qaCategories = pgTable(
  "qa_categories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: varchar("key").notNull().unique(), // e.g., "inter_component_communication"
    name: varchar("name").notNull(), // Display name
    nameHe: varchar("name_he"), // Hebrew name
    icon: varchar("icon"), // Icon identifier
    description: text("description"),
    descriptionHe: text("description_he"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_qa_categories_key").on(table.key),
    index("IDX_qa_categories_order").on(table.sortOrder),
  ]
);

export type QaCategory = typeof qaCategories.$inferSelect;
export type InsertQaCategory = typeof qaCategories.$inferInsert;

// QA Checklist Items - stores individual check items
export const qaChecklistItems = pgTable(
  "qa_checklist_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    categoryId: varchar("category_id")
      .notNull()
      .references(() => qaCategories.id, { onDelete: "cascade" }),
    key: varchar("key").notNull(), // Unique within category
    name: varchar("name").notNull(),
    nameHe: varchar("name_he"),
    description: text("description"),
    descriptionHe: text("description_he"),
    checkGuidelines: text("check_guidelines"), // How to verify this item
    checkGuidelinesHe: text("check_guidelines_he"),
    severity: varchar("severity").notNull().default("medium"), // critical, high, medium, low
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    tags: jsonb("tags").$type<string[]>().default([]),
    automatedCheck: boolean("automated_check").notNull().default(false), // Can be auto-verified
    automatedCheckEndpoint: varchar("automated_check_endpoint"), // API endpoint for auto-check
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_qa_items_category").on(table.categoryId),
    index("IDX_qa_items_severity").on(table.severity),
    uniqueIndex("IDX_qa_items_category_key").on(table.categoryId, table.key),
  ]
);

export type QaChecklistItem = typeof qaChecklistItems.$inferSelect;
export type InsertQaChecklistItem = typeof qaChecklistItems.$inferInsert;

// QA Runs - represents a single QA session/run
export const qaRuns = pgTable(
  "qa_runs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: text("description"),
    status: qaRunStatusEnum("status").notNull().default("in_progress"),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    environment: varchar("environment").notNull().default("development"), // development, staging, production
    version: varchar("version"), // App version being tested
    branch: varchar("branch"), // Git branch
    totalItems: integer("total_items").notNull().default(0),
    passedItems: integer("passed_items").notNull().default(0),
    failedItems: integer("failed_items").notNull().default(0),
    skippedItems: integer("skipped_items").notNull().default(0),
    score: integer("score").default(0), // Overall score percentage
    notes: text("notes"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_qa_runs_user").on(table.userId),
    index("IDX_qa_runs_status").on(table.status),
    index("IDX_qa_runs_environment").on(table.environment),
    index("IDX_qa_runs_started").on(table.startedAt),
  ]
);

export type QaRun = typeof qaRuns.$inferSelect;
export type InsertQaRun = typeof qaRuns.$inferInsert;

// QA Check Results - stores individual check results for each run
export const qaCheckResults = pgTable(
  "qa_check_results",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    runId: varchar("run_id")
      .notNull()
      .references(() => qaRuns.id, { onDelete: "cascade" }),
    itemId: varchar("item_id")
      .notNull()
      .references(() => qaChecklistItems.id, { onDelete: "cascade" }),
    status: qaCheckStatusEnum("status").notNull().default("not_checked"),
    notes: text("notes"),
    evidence: text("evidence"), // Screenshot URL, log snippet, etc.
    checkedBy: varchar("checked_by").references(() => users.id),
    checkedAt: timestamp("checked_at"),
    autoCheckResult: jsonb("auto_check_result").$type<{
      passed: boolean;
      message: string;
      details?: Record<string, unknown>;
    }>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_qa_results_run").on(table.runId),
    index("IDX_qa_results_item").on(table.itemId),
    index("IDX_qa_results_status").on(table.status),
    uniqueIndex("IDX_qa_results_run_item").on(table.runId, table.itemId),
  ]
);

export type QaCheckResult = typeof qaCheckResults.$inferSelect;
export type InsertQaCheckResult = typeof qaCheckResults.$inferInsert;

// QA Templates - pre-configured sets of checks for specific scenarios
export const qaTemplates = pgTable(
  "qa_templates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    nameHe: varchar("name_he"),
    description: text("description"),
    descriptionHe: text("description_he"),
    categoryIds: jsonb("category_ids").$type<string[]>().notNull().default([]),
    itemIds: jsonb("item_ids").$type<string[]>().default([]), // Specific items if not using full categories
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_qa_templates_default").on(table.isDefault)]
);

export type QaTemplate = typeof qaTemplates.$inferSelect;
export type InsertQaTemplate = typeof qaTemplates.$inferInsert;

// QA Issues - issues found during QA runs
export const qaIssues = pgTable(
  "qa_issues",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    runId: varchar("run_id")
      .notNull()
      .references(() => qaRuns.id, { onDelete: "cascade" }),
    checkResultId: varchar("check_result_id").references(() => qaCheckResults.id, {
      onDelete: "set null",
    }),
    title: varchar("title").notNull(),
    description: text("description"),
    severity: varchar("severity").notNull().default("medium"), // critical, high, medium, low
    status: varchar("status").notNull().default("open"), // open, in_progress, resolved, wont_fix
    assignedTo: varchar("assigned_to").references(() => users.id),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    resolution: text("resolution"),
    externalTicketUrl: varchar("external_ticket_url"), // Link to Jira, GitHub issue, etc.
    screenshots: jsonb("screenshots").$type<string[]>().default([]),
    createdBy: varchar("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_qa_issues_run").on(table.runId),
    index("IDX_qa_issues_status").on(table.status),
    index("IDX_qa_issues_severity").on(table.severity),
    index("IDX_qa_issues_assigned").on(table.assignedTo),
  ]
);

export type QaIssue = typeof qaIssues.$inferSelect;
export type InsertQaIssue = typeof qaIssues.$inferInsert;

// ============================================================================
// RELATIONS FOR QA SYSTEM
// ============================================================================

export const qaCategoriesRelations = relations(qaCategories, ({ many }) => ({
  items: many(qaChecklistItems),
}));

export const qaChecklistItemsRelations = relations(qaChecklistItems, ({ one, many }) => ({
  category: one(qaCategories, {
    fields: [qaChecklistItems.categoryId],
    references: [qaCategories.id],
  }),
  results: many(qaCheckResults),
}));

export const qaRunsRelations = relations(qaRuns, ({ one, many }) => ({
  user: one(users, { fields: [qaRuns.userId], references: [users.id] }),
  results: many(qaCheckResults),
  issues: many(qaIssues),
}));

export const qaCheckResultsRelations = relations(qaCheckResults, ({ one }) => ({
  run: one(qaRuns, { fields: [qaCheckResults.runId], references: [qaRuns.id] }),
  item: one(qaChecklistItems, {
    fields: [qaCheckResults.itemId],
    references: [qaChecklistItems.id],
  }),
  checker: one(users, { fields: [qaCheckResults.checkedBy], references: [users.id] }),
}));

export const qaIssuesRelations = relations(qaIssues, ({ one }) => ({
  run: one(qaRuns, { fields: [qaIssues.runId], references: [qaRuns.id] }),
  checkResult: one(qaCheckResults, {
    fields: [qaIssues.checkResultId],
    references: [qaCheckResults.id],
  }),
  assignee: one(users, { fields: [qaIssues.assignedTo], references: [users.id] }),
  resolver: one(users, { fields: [qaIssues.resolvedBy], references: [users.id] }),
  creator: one(users, { fields: [qaIssues.createdBy], references: [users.id] }),
}));
