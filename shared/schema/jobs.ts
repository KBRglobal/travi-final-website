import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { jobStatusEnum, jobTypeEnum, webhookEventEnum } from "./enums";

// Forward reference placeholders to avoid circular dependencies
// Actual foreign key constraints exist at database level
declare const users: { id: any };
declare const contents: { id: any };

// ============================================================================
// BACKGROUND JOBS TABLE
// ============================================================================

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: jobTypeEnum("type").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    result: jsonb("result").$type<Record<string, unknown>>(),
    error: text("error"),
    retries: integer("retries").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
  },
  table => [
    index("IDX_jobs_status").on(table.status),
    index("IDX_jobs_type").on(table.type),
    index("IDX_jobs_priority").on(table.priority),
  ]
);

export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = typeof backgroundJobs.$inferInsert;

// ============================================================================
// PUSH SUBSCRIPTIONS TABLE - PWA notifications
// ============================================================================

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    endpoint: text("endpoint").notNull().unique(),
    p256dhKey: text("p256dh_key").notNull(),
    authKey: text("auth_key").notNull(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
    locale: varchar("locale").notNull().default("en"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_push_user").on(table.userId), index("IDX_push_locale").on(table.locale)]
);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// ============================================================================
// WEBHOOKS TABLE
// ============================================================================

export const webhooks = pgTable(
  "webhooks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    url: text("url").notNull(),
    secret: text("secret"), // for signature verification
    events: jsonb("events").$type<string[]>().default([]),
    headers: jsonb("headers").$type<Record<string, string>>(),
    isActive: boolean("is_active").default(true),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_webhooks_active").on(table.isActive)]
);

export const insertWebhookSchema = createInsertSchema(webhooks);
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// ============================================================================
// WEBHOOK LOGS TABLE
// ============================================================================

export const webhookLogs = pgTable(
  "webhook_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    webhookId: varchar("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: jsonb("payload"),
    responseStatus: integer("response_status"),
    responseBody: text("response_body"),
    error: text("error"),
    duration: integer("duration"), // ms
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_webhook_logs_webhook").on(table.webhookId),
    index("IDX_webhook_logs_created").on(table.createdAt),
  ]
);

export type WebhookLog = typeof webhookLogs.$inferSelect;

// ============================================================================
// SCHEDULED TASKS TABLE
// ============================================================================

export const scheduledTasks = pgTable(
  "scheduled_tasks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: varchar("type", { length: 50 }).notNull(), // publish, unpublish, translate, etc.
    targetType: varchar("target_type", { length: 50 }).notNull(),
    targetId: varchar("target_id").notNull(),
    scheduledFor: timestamp("scheduled_for").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    status: varchar("status", { length: 20 }).default("pending"), // pending, completed, failed, cancelled
    error: text("error"),
    createdBy: varchar("created_by").references(() => users.id),
    executedAt: timestamp("executed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_scheduled_tasks_pending")
      .on(table.scheduledFor)
      .where(sql`status = 'pending'`),
    index("IDX_scheduled_tasks_target").on(table.targetType, table.targetId),
  ]
);

export const insertScheduledTaskSchema = createInsertSchema(scheduledTasks);
export type InsertScheduledTask = z.infer<typeof insertScheduledTaskSchema>;
export type ScheduledTask = typeof scheduledTasks.$inferSelect;

// ============================================================================
// SCHEDULED REPORTS TABLE - Automated report generation
// ============================================================================

export const scheduledReports = pgTable(
  "scheduled_reports",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    reportType: varchar("report_type").notNull(), // content_performance, newsletter_stats, revenue
    schedule: varchar("schedule").notNull(), // daily, weekly, monthly
    scheduleConfig: jsonb("schedule_config")
      .$type<{ dayOfWeek?: number; dayOfMonth?: number; hour: number }>()
      .notNull(),
    recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
    format: varchar("format").default("pdf"), // pdf, csv, html
    filters: jsonb("filters").$type<Record<string, any>>().default({}),
    isActive: boolean("is_active").default(true),
    lastRunAt: timestamp("last_run_at"),
    nextRunAt: timestamp("next_run_at").notNull(),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_scheduled_reports_next_run").on(table.nextRunAt),
    index("IDX_scheduled_reports_active").on(table.isActive),
  ]
);

export const insertScheduledReportSchema = createInsertSchema(scheduledReports);
export type InsertScheduledReport = z.infer<typeof insertScheduledReportSchema>;
export type ScheduledReport = typeof scheduledReports.$inferSelect;

// ============================================================================
// CONTENT CALENDAR ITEMS TABLE - AI-powered content scheduling
// ============================================================================

export const contentCalendarItems = pgTable(
  "content_calendar_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").references(() => contents.id, { onDelete: "set null" }),
    title: varchar("title").notNull(),
    contentType: varchar("content_type").notNull(),
    scheduledDate: timestamp("scheduled_date").notNull(),
    status: varchar("status").default("scheduled"), // scheduled, published, cancelled
    aiSuggestion: boolean("ai_suggestion").default(false),
    aiReason: text("ai_reason"), // why AI suggested this date/time
    priority: integer("priority").default(5), // 1-10
    tags: jsonb("tags").$type<string[]>().default([]),
    notes: text("notes"),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_content_calendar_date").on(table.scheduledDate),
    index("IDX_content_calendar_status").on(table.status),
  ]
);

export const insertContentCalendarItemSchema = createInsertSchema(contentCalendarItems);
export type InsertContentCalendarItem = z.infer<typeof insertContentCalendarItemSchema>;
export type ContentCalendarItem = typeof contentCalendarItems.$inferSelect;
