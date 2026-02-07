/**
 * Octopus V2 - Content Generation Engine Tables
 * Extracted from /Users/admin/travi-final-website/shared/schema.ts
 */

import { sql } from "drizzle-orm";
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
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import enums from ./enums
import { octopusJobStatusEnum, octopusArtifactActionEnum, publishStatusEnum } from "./enums";

import { destinations } from "./destinations";
import { users } from "./auth";
import { contents } from "./content-base";
import { attractions, hotels, districts } from "./content-types";

// ============================================================================
// OCTOPUS V2 - CONTENT GENERATION ENGINE
// ============================================================================

// Octopus Jobs - persistent job tracking
export const octopusJobs = pgTable(
  "octopus_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    inputHash: varchar("input_hash").notNull(),
    filename: varchar("filename").notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type"),
    destinationHint: varchar("destination_hint"),
    destinationId: varchar("destination_id"),
    locale: varchar("locale").notNull().default("en"),
    status: octopusJobStatusEnum("status").notNull().default("pending"),
    progressPct: integer("progress_pct").notNull().default(0),
    currentStage: varchar("current_stage"),
    options: jsonb("options").$type<Record<string, unknown>>().default({}),
    error: text("error"),
    pausedAt: timestamp("paused_at"),
    pauseReason: varchar("pause_reason"),
    createdAt: timestamp("created_at").defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdBy: varchar("created_by").references(() => users.id),
  },
  table => [
    index("IDX_octopus_jobs_status").on(table.status),
    index("IDX_octopus_jobs_destination").on(table.destinationId),
    index("IDX_octopus_jobs_input_hash").on(table.inputHash),
  ]
);

export const insertOctopusJobSchema = createInsertSchema(octopusJobs);

export type OctopusJobRecord = typeof octopusJobs.$inferSelect;
export type InsertOctopusJob = z.infer<typeof insertOctopusJobSchema>;

// Octopus Job Runs - per-stage audit trail
export const octopusJobRuns = pgTable(
  "octopus_job_runs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: varchar("job_id")
      .notNull()
      .references(() => octopusJobs.id, { onDelete: "cascade" }),
    stage: varchar("stage").notNull(),
    status: varchar("status").notNull().default("pending"),
    priority: integer("priority").notNull().default(0),
    retryCount: integer("retry_count").notNull().default(0),
    nextRetryAt: timestamp("next_retry_at"),
    inputData: jsonb("input_data").$type<Record<string, unknown>>(),
    outputData: jsonb("output_data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    finishedAt: timestamp("finished_at"),
    durationMs: integer("duration_ms"),
    stats: jsonb("stats").$type<Record<string, unknown>>().default({}),
    error: text("error"),
  },
  table => [
    index("IDX_octopus_job_runs_job").on(table.jobId),
    index("IDX_octopus_job_runs_stage").on(table.stage),
    index("IDX_octopus_job_runs_status_retry").on(table.status, table.nextRetryAt),
  ]
);

export type OctopusJobRun = typeof octopusJobRuns.$inferSelect;
export type InsertOctopusJobRun = typeof octopusJobRuns.$inferInsert;

// Octopus Job Artifacts - entity tracking per job
export const octopusJobArtifacts = pgTable(
  "octopus_job_artifacts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobId: varchar("job_id")
      .notNull()
      .references(() => octopusJobs.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type").notNull(),
    entityId: varchar("entity_id"),
    contentId: varchar("content_id").references(() => contents.id),
    normalizedName: varchar("normalized_name").notNull(),
    sourceHash: varchar("source_hash"),
    action: octopusArtifactActionEnum("action").notNull().default("created"),
    diffSummary: jsonb("diff_summary")
      .$type<{ fieldsUpdated?: string[]; fieldsAdded?: string[]; previousHash?: string }>()
      .default({}),
    confidence: integer("confidence"),
    rawExtraction: jsonb("raw_extraction").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_octopus_artifacts_job").on(table.jobId),
    index("IDX_octopus_artifacts_entity_type").on(table.entityType),
    index("IDX_octopus_artifacts_normalized_name").on(table.normalizedName),
  ]
);

export type OctopusJobArtifact = typeof octopusJobArtifacts.$inferSelect;
export type InsertOctopusJobArtifact = typeof octopusJobArtifacts.$inferInsert;

// ============================================================================
// JUNCTION TABLES
// ============================================================================

// Hotel-District Junction Table (many-to-many)
export const hotelDistricts = pgTable(
  "hotel_districts",
  {
    hotelId: varchar("hotel_id")
      .notNull()
      .references(() => hotels.id, { onDelete: "cascade" }),
    districtId: varchar("district_id")
      .notNull()
      .references(() => districts.id, { onDelete: "cascade" }),
    confidence: integer("confidence"),
    source: varchar("source").notNull().default("manual"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_hotel_districts_hotel").on(table.hotelId),
    index("IDX_hotel_districts_district").on(table.districtId),
  ]
);

export type HotelDistrict = typeof hotelDistricts.$inferSelect;
export type InsertHotelDistrict = typeof hotelDistricts.$inferInsert;

// Attraction-District Junction Table (many-to-many)
export const attractionDistricts = pgTable(
  "attraction_districts",
  {
    attractionId: varchar("attraction_id")
      .notNull()
      .references(() => attractions.id, { onDelete: "cascade" }),
    districtId: varchar("district_id")
      .notNull()
      .references(() => districts.id, { onDelete: "cascade" }),
    confidence: integer("confidence"),
    source: varchar("source").notNull().default("manual"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_attraction_districts_attraction").on(table.attractionId),
    index("IDX_attraction_districts_district").on(table.districtId),
  ]
);

export type AttractionDistrict = typeof attractionDistricts.$inferSelect;
export type InsertAttractionDistrict = typeof attractionDistricts.$inferInsert;

// ============================================================================
// CONTENT HIGHLIGHTS
// ============================================================================

// Content Highlights - translatable, reusable highlights
export const contentHighlights = pgTable(
  "content_highlights",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    highlightKey: varchar("highlight_key").notNull(),
    textEn: text("text_en").notNull(),
    icon: varchar("icon"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_content_highlights_content").on(table.contentId),
    uniqueIndex("IDX_content_highlights_unique").on(table.contentId, table.highlightKey),
  ]
);

export type ContentHighlight = typeof contentHighlights.$inferSelect;
export type InsertContentHighlight = typeof contentHighlights.$inferInsert;

// Content Highlight Translations
export const contentHighlightTranslations = pgTable(
  "content_highlight_translations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    highlightId: varchar("highlight_id")
      .notNull()
      .references(() => contentHighlights.id, { onDelete: "cascade" }),
    locale: varchar("locale").notNull(),
    text: text("text").notNull(),
    translatedAt: timestamp("translated_at"),
    translationProvider: varchar("translation_provider"),
  },
  table => [
    index("IDX_highlight_translations_highlight").on(table.highlightId),
    uniqueIndex("IDX_highlight_translations_unique").on(table.highlightId, table.locale),
  ]
);

export type ContentHighlightTranslation = typeof contentHighlightTranslations.$inferSelect;
export type InsertContentHighlightTranslation = typeof contentHighlightTranslations.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================
// NOTE: Relations are defined in a separate relations file to avoid circular
// dependencies with external tables (users, destinations, contents, hotels,
// districts, attractions). The placeholder forward references above are only
// used for foreign key constraints at the table definition level.
//
// The following relations should be defined in the central relations file:
// - octopusJobsRelations
// - octopusJobRunsRelations
// - octopusJobArtifactsRelations
// - contentHighlightsRelations
// - contentHighlightTranslationsRelations
// - hotelDistrictsRelations
// - attractionDistrictsRelations
