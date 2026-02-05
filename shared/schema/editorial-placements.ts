/**
 * Editorial Placements Schema
 * Controls where content appears on the site - like a real news editor deciding
 * what's headline, featured, secondary, etc.
 */

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
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import {
  editorialZoneEnum,
  placementPriorityEnum,
  placementStatusEnum,
  placementSourceEnum,
} from "./enums";

// ============================================================================
// EDITORIAL PLACEMENTS - WHERE CONTENT APPEARS ON THE SITE
// ============================================================================

/**
 * Editorial Placements Table
 * Each row represents a content piece placed in a specific zone
 * The AI PlacementAgent or manual editors create these records
 */
export const editorialPlacements = pgTable(
  "editorial_placements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // What content is being placed
    contentId: varchar("content_id").notNull(),

    // Where it's placed
    zone: editorialZoneEnum("zone").notNull(),

    // For destination/category-specific placements
    destinationId: varchar("destination_id"),
    categorySlug: varchar("category_slug"),

    // Placement priority (breaking > headline > featured > standard > filler)
    priority: placementPriorityEnum("priority").default("standard"),

    // Position within the zone (1 = top)
    position: integer("position").default(1),

    // Status tracking
    status: placementStatusEnum("status").default("scheduled"),

    // How was this placement created?
    source: placementSourceEnum("source").default("ai_agent"),

    // Who/what created it (user ID or agent name)
    createdBy: varchar("created_by"),

    // Custom headline/image overrides (like a real editor would do)
    customHeadline: text("custom_headline"),
    customHeadlineHe: text("custom_headline_he"),
    customImage: text("custom_image"),
    customExcerpt: text("custom_excerpt"),
    customExcerptHe: text("custom_excerpt_he"),

    // Editorial flags
    isBreaking: boolean("is_breaking").default(false),
    isFeatured: boolean("is_featured").default(false),
    isPinned: boolean("is_pinned").default(false), // Won't auto-rotate

    // Scheduling
    startsAt: timestamp("starts_at").defaultNow(),
    expiresAt: timestamp("expires_at"),

    // Rotation tracking
    rotatedOutAt: timestamp("rotated_out_at"),
    rotatedOutReason: text("rotated_out_reason"),

    // Performance tracking
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),

    // AI agent decision metadata
    aiDecisionData: jsonb("ai_decision_data").$type<{
      agentName?: string;
      confidence?: number;
      reasons?: string[];
      contentScore?: number;
      freshnessScore?: number;
      relevanceScore?: number;
      predictedCtr?: number;
    }>(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_editorial_placements_zone").on(table.zone),
    index("IDX_editorial_placements_content").on(table.contentId),
    index("IDX_editorial_placements_destination").on(table.destinationId),
    index("IDX_editorial_placements_status").on(table.status),
    index("IDX_editorial_placements_priority").on(table.priority),
    index("IDX_editorial_placements_starts").on(table.startsAt),
    index("IDX_editorial_placements_expires").on(table.expiresAt),
    // Unique constraint: only one active placement per content per zone
    uniqueIndex("IDX_editorial_placements_unique_active").on(
      table.contentId,
      table.zone,
      table.destinationId
    ),
  ]
);

export const insertEditorialPlacementSchema = createInsertSchema(editorialPlacements);

export type EditorialPlacement = typeof editorialPlacements.$inferSelect;
export type InsertEditorialPlacement = z.infer<typeof insertEditorialPlacementSchema>;

// ============================================================================
// EDITORIAL ROTATION HISTORY - TRACK ALL CHANGES
// ============================================================================

/**
 * Rotation History - keeps track of all placement changes
 * Useful for analytics and debugging
 */
export const editorialRotationHistory = pgTable(
  "editorial_rotation_history",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // The placement that was affected
    placementId: varchar("placement_id").notNull(),

    // What content was removed/added
    contentIdRemoved: varchar("content_id_removed"),
    contentIdAdded: varchar("content_id_added"),

    // Which zone
    zone: editorialZoneEnum("zone").notNull(),

    // Reason for the rotation
    rotationReason: text("rotation_reason"),

    // Who/what triggered it
    triggeredBy: varchar("triggered_by"), // user ID or "system" or agent name

    // Metrics at time of rotation
    metricsSnapshot: jsonb("metrics_snapshot").$type<{
      impressions?: number;
      clicks?: number;
      ctr?: number;
      timeInZone?: number; // minutes
    }>(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_editorial_rotation_placement").on(table.placementId),
    index("IDX_editorial_rotation_zone").on(table.zone),
    index("IDX_editorial_rotation_created").on(table.createdAt),
  ]
);

export const insertEditorialRotationHistorySchema = createInsertSchema(editorialRotationHistory);

export type EditorialRotationHistory = typeof editorialRotationHistory.$inferSelect;
export type InsertEditorialRotationHistory = z.infer<typeof insertEditorialRotationHistorySchema>;

// ============================================================================
// EDITORIAL ZONE CONFIG - CONFIGURE EACH ZONE'S BEHAVIOR
// ============================================================================

/**
 * Zone Configuration - how each zone behaves
 */
export const editorialZoneConfig = pgTable(
  "editorial_zone_config",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Which zone
    zone: editorialZoneEnum("zone").notNull().unique(),

    // Display settings
    displayName: text("display_name").notNull(),
    displayNameHe: text("display_name_he"),
    description: text("description"),

    // Capacity
    maxItems: integer("max_items").default(5),
    minItems: integer("min_items").default(1),

    // Rotation settings
    autoRotate: boolean("auto_rotate").default(true),
    rotationIntervalMinutes: integer("rotation_interval_minutes").default(240), // 4 hours
    maxAgeHours: integer("max_age_hours").default(48), // content older than this gets lower priority

    // Content type filters
    allowedContentTypes: jsonb("allowed_content_types").$type<string[]>().default(["article"]),
    allowedCategories: jsonb("allowed_categories").$type<string[]>(),

    // Priority weights for AI scoring
    freshnessWeight: integer("freshness_weight").default(30),
    relevanceWeight: integer("relevance_weight").default(30),
    performanceWeight: integer("performance_weight").default(20),
    qualityWeight: integer("quality_weight").default(20),

    // Status
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_editorial_zone_config_active").on(table.isActive)]
);

export const insertEditorialZoneConfigSchema = createInsertSchema(editorialZoneConfig);

export type EditorialZoneConfig = typeof editorialZoneConfig.$inferSelect;
export type InsertEditorialZoneConfig = z.infer<typeof insertEditorialZoneConfigSchema>;

// ============================================================================
// EDITORIAL SCHEDULE - PRE-SCHEDULED PLACEMENTS
// ============================================================================

/**
 * Editorial Schedule - for pre-planning content placement
 * Like a real news editor's content calendar
 */
export const editorialSchedule = pgTable(
  "editorial_schedule",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // What content
    contentId: varchar("content_id").notNull(),

    // Target zone
    zone: editorialZoneEnum("zone").notNull(),

    // For destination-specific
    destinationId: varchar("destination_id"),

    // When to place
    scheduledAt: timestamp("scheduled_at").notNull(),

    // Duration
    durationMinutes: integer("duration_minutes").default(240), // 4 hours

    // Priority
    priority: placementPriorityEnum("priority").default("featured"),

    // Custom overrides
    customHeadline: text("custom_headline"),
    customImage: text("custom_image"),

    // Status
    isExecuted: boolean("is_executed").default(false),
    executedAt: timestamp("executed_at"),
    placementId: varchar("placement_id"), // Link to created placement

    // Who scheduled it
    scheduledBy: varchar("scheduled_by"),

    // Notes
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_editorial_schedule_scheduled").on(table.scheduledAt),
    index("IDX_editorial_schedule_executed").on(table.isExecuted),
    index("IDX_editorial_schedule_zone").on(table.zone),
  ]
);

export const insertEditorialScheduleSchema = createInsertSchema(editorialSchedule);

export type EditorialSchedule = typeof editorialSchedule.$inferSelect;
export type InsertEditorialSchedule = z.infer<typeof insertEditorialScheduleSchema>;

// ============================================================================
// TYPE EXPORTS FOR ENUMS
// ============================================================================

export type EditorialZone = (typeof editorialZoneEnum.enumValues)[number];
export type PlacementPriority = (typeof placementPriorityEnum.enumValues)[number];
export type PlacementStatus = (typeof placementStatusEnum.enumValues)[number];
export type PlacementSource = (typeof placementSourceEnum.enumValues)[number];

// ============================================================================
// RELATIONS
// ============================================================================

export const editorialPlacementsRelations = relations(editorialPlacements, ({ many }) => ({
  rotationHistory: many(editorialRotationHistory),
}));

export const editorialRotationHistoryRelations = relations(editorialRotationHistory, ({ one }) => ({
  placement: one(editorialPlacements, {
    fields: [editorialRotationHistory.placementId],
    references: [editorialPlacements.id],
  }),
}));
