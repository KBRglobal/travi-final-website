import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  real,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  entityTypeEnum,
  explodedArticleTypeEnum,
  explosionJobStatusEnum,
  autopilotModeEnum,
  autopilotTaskTypeEnum,
  autopilotTaskStatusEnum,
} from "./enums";

// Note: Contents references are commented out to avoid circular dependencies.
// Foreign key constraints exist at the database level.

// ============================================
// CONTENT EXPLODER TABLES
// ============================================

// Extracted entities from content for explosion
export const contentEntities = pgTable(
  "content_entities",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceContentId: varchar("source_content_id").notNull(),
    // Note: Foreign key reference to contents table should be added when integrating
    // .references(() => contents.id, { onDelete: "cascade" })
    entityType: entityTypeEnum("entity_type").notNull(),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(), // For deduplication
    description: text("description"),
    location: text("location"),
    destinationId: varchar("destination_id"),
    attributes: jsonb("attributes").$type<Record<string, unknown>>().default({}),
    confidence: real("confidence").default(0.8), // AI extraction confidence
    verified: boolean("verified").default(false),
    mergedIntoId: varchar("merged_into_id"), // For deduplication
    articleCount: integer("article_count").default(0), // How many articles generated
    lastExplodedAt: timestamp("last_exploded_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_content_entities_source").on(table.sourceContentId),
    index("idx_content_entities_type").on(table.entityType),
    index("idx_content_entities_destination").on(table.destinationId),
    index("idx_content_entities_normalized").on(table.normalizedName),
  ]
);

// Track explosion task progress
export const explosionJobs = pgTable(
  "explosion_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceContentId: varchar("source_content_id").notNull(),
    // Note: Foreign key reference to contents table should be added when integrating
    // .references(() => contents.id, { onDelete: "cascade" })
    status: explosionJobStatusEnum("status").notNull().default("pending"),
    entitiesExtracted: integer("entities_extracted").default(0),
    ideasGenerated: integer("ideas_generated").default(0),
    articlesGenerated: integer("articles_generated").default(0),
    articlesTarget: integer("articles_target").default(10),
    config: jsonb("config")
      .$type<{
        articleTypes?: string[];
        maxArticles?: number;
        locale?: string;
        priority?: number;
      }>()
      .default({}),
    error: text("error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("idx_explosion_jobs_source").on(table.sourceContentId),
    index("idx_explosion_jobs_status").on(table.status),
  ]
);

// Link generated articles to source entities
export const explodedArticles = pgTable(
  "exploded_articles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    explosionJobId: varchar("explosion_job_id")
      .notNull()
      .references(() => explosionJobs.id, { onDelete: "cascade" }),
    entityId: varchar("entity_id").references(() => contentEntities.id, {
      onDelete: "set null",
    }),
    generatedContentId: varchar("generated_content_id"),
    // Note: Foreign key reference to contents table should be added when integrating
    // .references(() => contents.id, { onDelete: "cascade" })
    articleType: explodedArticleTypeEnum("article_type").notNull(),
    ideaTitle: text("idea_title").notNull(),
    ideaDescription: text("idea_description"),
    targetKeywords: jsonb("target_keywords").$type<string[]>().default([]),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, generating, generated, published, failed
    generationAttempts: integer("generation_attempts").default(0),
    quality108Score: integer("quality_108_score"),
    createdAt: timestamp("created_at").defaultNow(),
    generatedAt: timestamp("generated_at"),
    publishedAt: timestamp("published_at"),
  },
  table => [
    index("idx_exploded_articles_job").on(table.explosionJobId),
    index("idx_exploded_articles_entity").on(table.entityId),
    index("idx_exploded_articles_content").on(table.generatedContentId),
    index("idx_exploded_articles_status").on(table.status),
  ]
);

// ============================================
// AUTOPILOT TABLES
// ============================================

// Autopilot state and configuration
export const autopilotState = pgTable("autopilot_state", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  mode: autopilotModeEnum("mode").notNull().default("off"),
  config: jsonb("config")
    .$type<{
      dailyContentLimit?: number;
      qualityThreshold?: number;
      autoPublishMinScore?: number;
      enabledTaskTypes?: string[];
      blacklistedDestinations?: string[];
      priorityDestinations?: string[];
      workingHoursStart?: number; // 0-23
      workingHoursEnd?: number;
      timezone?: string;
    }>()
    .default({}),
  stats: jsonb("stats")
    .$type<{
      totalTasksCreated?: number;
      totalTasksCompleted?: number;
      totalContentGenerated?: number;
      lastActivityAt?: string;
    }>()
    .default({}),
  lastModeChangeBy: varchar("last_mode_change_by"),
  lastModeChangeAt: timestamp("last_mode_change_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task queue with approval workflow
export const autopilotTasks = pgTable(
  "autopilot_tasks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    taskType: autopilotTaskTypeEnum("task_type").notNull(),
    status: autopilotTaskStatusEnum("status").notNull().default("pending"),
    priority: integer("priority").default(5), // 1-10, higher = more urgent
    title: text("title").notNull(),
    description: text("description"),
    targetContentId: varchar("target_content_id"),
    targetEntityId: varchar("target_entity_id"),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    result: jsonb("result").$type<{
      success?: boolean;
      contentIds?: string[];
      changes?: Record<string, unknown>;
      error?: string;
    }>(),
    approvedBy: varchar("approved_by"),
    approvedAt: timestamp("approved_at"),
    rejectedBy: varchar("rejected_by"),
    rejectedAt: timestamp("rejected_at"),
    rejectionReason: text("rejection_reason"),
    executionStartedAt: timestamp("execution_started_at"),
    executionCompletedAt: timestamp("execution_completed_at"),
    scheduledFor: timestamp("scheduled_for"),
    expiresAt: timestamp("expires_at"),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_autopilot_tasks_type").on(table.taskType),
    index("idx_autopilot_tasks_status").on(table.status),
    index("idx_autopilot_tasks_priority").on(table.priority),
    index("idx_autopilot_tasks_scheduled").on(table.scheduledFor),
    index("idx_autopilot_tasks_content").on(table.targetContentId),
  ]
);

// Cron-based scheduling for autopilot
export const autopilotSchedules = pgTable(
  "autopilot_schedules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(),
    taskType: autopilotTaskTypeEnum("task_type").notNull(),
    cronExpression: varchar("cron_expression", { length: 100 }).notNull(),
    timezone: varchar("timezone", { length: 50 }).default("UTC"),
    enabled: boolean("enabled").default(true),
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at"),
    runCount: integer("run_count").default(0),
    failCount: integer("fail_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_autopilot_schedules_enabled").on(table.enabled),
    index("idx_autopilot_schedules_next_run").on(table.nextRunAt),
  ]
);

// ============================================
// INSERT SCHEMAS (using drizzle-zod)
// ============================================

export const insertContentEntitySchema = createInsertSchema(contentEntities);
export const insertExplosionJobSchema = createInsertSchema(explosionJobs);
export const insertExplodedArticleSchema = createInsertSchema(explodedArticles);
export const insertAutopilotStateSchema = createInsertSchema(autopilotState);
export const insertAutopilotTaskSchema = createInsertSchema(autopilotTasks);
export const insertAutopilotScheduleSchema = createInsertSchema(autopilotSchedules);

// ============================================
// TYPE EXPORTS
// ============================================

// Content Exploder Types
export type ContentEntity = typeof contentEntities.$inferSelect;
export type InsertContentEntity = z.infer<typeof insertContentEntitySchema>;

export type ExplosionJob = typeof explosionJobs.$inferSelect;
export type InsertExplosionJob = z.infer<typeof insertExplosionJobSchema>;

export type ExplodedArticle = typeof explodedArticles.$inferSelect;
export type InsertExplodedArticle = z.infer<typeof insertExplodedArticleSchema>;

// Autopilot Types
export type AutopilotState = typeof autopilotState.$inferSelect;
export type InsertAutopilotState = z.infer<typeof insertAutopilotStateSchema>;

export type AutopilotTask = typeof autopilotTasks.$inferSelect;
export type InsertAutopilotTask = z.infer<typeof insertAutopilotTaskSchema>;

export type AutopilotSchedule = typeof autopilotSchedules.$inferSelect;
export type InsertAutopilotSchedule = z.infer<typeof insertAutopilotScheduleSchema>;

// Enum Types
export type EntityType = (typeof entityTypeEnum.enumValues)[number];
export type ExplodedArticleType = (typeof explodedArticleTypeEnum.enumValues)[number];
export type ExplosionJobStatus = (typeof explosionJobStatusEnum.enumValues)[number];
export type AutopilotMode = (typeof autopilotModeEnum.enumValues)[number];
export type AutopilotTaskType = (typeof autopilotTaskTypeEnum.enumValues)[number];
export type AutopilotTaskStatus = (typeof autopilotTaskStatusEnum.enumValues)[number];
