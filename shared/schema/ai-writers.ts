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

import { writerAssignmentStatusEnum, writerAssignmentPriorityEnum } from "./enums";
import { contents } from "./content-base";

// ============================================================================
// AI WRITERS TABLES
// ============================================================================

// AI Writers table
export const aiWriters = pgTable(
  "ai_writers",
  {
    id: varchar("id").primaryKey(),
    name: text("name").notNull(),
    slug: varchar("slug").unique().notNull(),
    avatar: text("avatar"),
    nationality: text("nationality"),
    age: integer("age"),
    expertise: text("expertise").array(),
    personality: text("personality"),
    writingStyle: text("writing_style"),
    voiceCharacteristics: jsonb("voice_characteristics").$type<string[]>().default([]),
    samplePhrases: text("sample_phrases").array(),
    bio: text("bio"),
    shortBio: text("short_bio"),
    socialMedia: jsonb("social_media").$type<{
      platform?: string;
      style?: string;
      hashtags?: string[];
    }>(),
    contentTypes: text("content_types").array(),
    languages: text("languages").array(),
    isActive: boolean("is_active").default(true),
    articleCount: integer("article_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_ai_writers_slug").on(table.slug),
    index("IDX_ai_writers_active").on(table.isActive),
  ]
);

// Writer Assignments table
export const writerAssignments = pgTable(
  "writer_assignments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    writerId: varchar("writer_id").references(() => aiWriters.id),
    contentId: varchar("content_id").references(() => contents.id),
    contentType: text("content_type"),
    topic: text("topic"),
    status: writerAssignmentStatusEnum("status").default("pending"),
    matchScore: integer("match_score"),
    priority: writerAssignmentPriorityEnum("priority").default("normal"),
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_writer_assignments_writer").on(table.writerId),
    index("IDX_writer_assignments_content").on(table.contentId),
    index("IDX_writer_assignments_status").on(table.status),
  ]
);

// Writer Performance table
export const writerPerformance = pgTable(
  "writer_performance",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    writerId: varchar("writer_id").references(() => aiWriters.id),
    period: varchar("period"), // "2025-01", "2025-W52"
    articlesWritten: integer("articles_written").default(0),
    totalViews: integer("total_views").default(0),
    avgEngagement: integer("avg_engagement"),
    avgSeoScore: integer("avg_seo_score"),
    avgVoiceScore: integer("avg_voice_score"),
    topPerformingArticle: varchar("top_performing_article"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_writer_performance_writer").on(table.writerId),
    index("IDX_writer_performance_period").on(table.period),
  ]
);

// Define schema validators
export const insertAiWriterSchema = createInsertSchema(aiWriters);

export const insertWriterAssignmentSchema = createInsertSchema(writerAssignments);

export const insertWriterPerformanceSchema = createInsertSchema(writerPerformance);

// Define types
export type AIWriter = typeof aiWriters.$inferSelect;
export type InsertAIWriter = z.infer<typeof insertAiWriterSchema>;
export type WriterAssignment = typeof writerAssignments.$inferSelect;
export type InsertWriterAssignment = z.infer<typeof insertWriterAssignmentSchema>;
export type WriterPerformance = typeof writerPerformance.$inferSelect;
export type InsertWriterPerformance = z.infer<typeof insertWriterPerformanceSchema>;
