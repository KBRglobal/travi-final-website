import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { helpArticleStatusEnum, webhookOutboxStatusEnum } from "./enums";
import { webhooks } from "./jobs";
import { contents } from "./content-base";

// =====================================================
// HELP CENTER SCHEMA
// =====================================================

// Help Categories - organize help articles
export const helpCategories = pgTable(
  "help_categories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    slug: varchar("slug").notNull().unique(),
    title: varchar("title").notNull(),
    description: text("description"),
    icon: varchar("icon"), // Optional icon identifier
    locale: varchar("locale").notNull().default("en"),
    order: integer("order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_help_categories_locale").on(table.locale),
    index("IDX_help_categories_order").on(table.order),
    index("IDX_help_categories_active").on(table.isActive),
    uniqueIndex("IDX_help_categories_slug_locale").on(table.slug, table.locale),
  ]
);

export const insertHelpCategorySchema = createInsertSchema(helpCategories);
export type HelpCategory = typeof helpCategories.$inferSelect;
export type InsertHelpCategory = z.infer<typeof insertHelpCategorySchema>;

// =====================================================
// RELIABLE WEBHOOK DELIVERY (Outbox Pattern)
// =====================================================

// Webhook Outbox - stores pending webhook deliveries
export const webhookOutbox = pgTable(
  "webhook_outbox",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    endpointId: varchar("endpoint_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    payloadJson: jsonb("payload_json").notNull(),
    idempotencyKey: varchar("idempotency_key", { length: 64 }), // SHA256 hash for dedup
    status: webhookOutboxStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(12),
    nextAttemptAt: timestamp("next_attempt_at").defaultNow(),
    lastError: text("last_error"),
    lastStatusCode: integer("last_status_code"),
    lockedUntil: timestamp("locked_until"), // Row-level lock for concurrency
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_webhook_outbox_status_next").on(table.status, table.nextAttemptAt),
    index("IDX_webhook_outbox_endpoint").on(table.endpointId),
    uniqueIndex("IDX_webhook_outbox_idempotency").on(table.idempotencyKey),
    index("IDX_webhook_outbox_locked").on(table.lockedUntil),
  ]
);

export const insertWebhookOutboxSchema = createInsertSchema(webhookOutbox);
export type InsertWebhookOutbox = z.infer<typeof insertWebhookOutboxSchema>;
export type WebhookOutbox = typeof webhookOutbox.$inferSelect;

// Webhook Deliveries - detailed delivery attempt log
export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    outboxId: varchar("outbox_id")
      .notNull()
      .references(() => webhookOutbox.id, { onDelete: "cascade" }),
    attemptNo: integer("attempt_no").notNull(),
    sentAt: timestamp("sent_at").notNull().defaultNow(),
    durationMs: integer("duration_ms"),
    statusCode: integer("status_code"),
    error: text("error"),
    responseBody: text("response_body"),
  },
  table => [
    index("IDX_webhook_deliveries_outbox").on(table.outboxId),
    index("IDX_webhook_deliveries_sent").on(table.sentAt),
  ]
);

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries);
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

// Webhook Outbox Relations
export const webhookOutboxRelations = relations(webhookOutbox, ({ one, many }) => ({
  endpoint: one(webhooks as any, {
    fields: [webhookOutbox.endpointId],
    references: [(webhooks as any).id],
  }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  outbox: one(webhookOutbox, {
    fields: [webhookDeliveries.outboxId],
    references: [webhookOutbox.id],
  }),
}));

// =====================================================
// CONTENT DEPENDENCY GRAPH
// =====================================================

export const contentDependencies = pgTable(
  "content_dependencies",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceId: varchar("source_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    targetId: varchar("target_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    dependencyType: varchar("dependency_type", { length: 50 }).notNull().default("references"),
    weight: integer("weight").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_content_deps_source").on(table.sourceId),
    index("IDX_content_deps_target").on(table.targetId),
    uniqueIndex("IDX_content_deps_unique").on(table.sourceId, table.targetId),
  ]
);

export const insertContentDependencySchema = createInsertSchema(contentDependencies);
export type ContentDependency = typeof contentDependencies.$inferSelect;
export type InsertContentDependency = z.infer<typeof insertContentDependencySchema>;
