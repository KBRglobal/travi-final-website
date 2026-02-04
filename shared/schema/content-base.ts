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

import { contentTypeEnum, contentStatusEnum, contentIntentEnum } from "./enums";
import type { ContentBlock } from "./types";

// Forward reference placeholder for users table (use varchar without actual reference)
// This avoids circular dependency - actual foreign key constraint exists at database level
declare const users: { id: any };

// Forward reference placeholder for aiWriters table
// This avoids circular dependency - actual foreign key constraint exists at database level
declare const aiWriters: { id: any };

// Content table - base table for all content types
export const contents = pgTable(
  "contents",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: contentTypeEnum("type").notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    primaryKeyword: text("primary_keyword"),
    secondaryKeywords: jsonb("secondary_keywords").$type<string[]>().default([]),
    lsiKeywords: jsonb("lsi_keywords").$type<string[]>().default([]),
    // CMS Contract: Hero image (hero section ONLY)
    heroImage: text("hero_image"),
    heroImageAlt: text("hero_image_alt"),
    // CMS Contract: Card image (grids/listings ONLY, never reuse hero)
    cardImage: text("card_image"),
    cardImageAlt: text("card_image_alt"),
    // CMS Contract: Summary for card preview (200 chars max for Items)
    summary: text("summary"),
    blocks: jsonb("blocks").$type<ContentBlock[]>().default([]),
    seoSchema: jsonb("seo_schema").$type<Record<string, unknown>>(),
    seoScore: integer("seo_score"),
    // AEO (Answer Engine Optimization) fields
    answerCapsule: text("answer_capsule"), // 40-60 word summary for AI extraction
    aeoScore: integer("aeo_score"), // AEO optimization score 0-100
    wordCount: integer("word_count").default(0),
    viewCount: integer("view_count").default(0),
    // Forward references without actual .references() to avoid circular deps
    authorId: varchar("author_id"),
    writerId: varchar("writer_id"),
    generatedByAI: boolean("generated_by_ai").default(false),
    writerVoiceScore: integer("writer_voice_score"),
    // SEO hierarchy and intent fields
    intent: contentIntentEnum("intent"),
    parentId: varchar("parent_id"),
    canonicalContentId: varchar("canonical_content_id"),
    // Octopus integration
    octopusJobId: varchar("octopus_job_id"),
    sourceHash: varchar("source_hash"),
    approvedBy: varchar("approved_by"),
    approvedAt: timestamp("approved_at"),
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_contents_status").on(table.status),
    index("IDX_contents_type").on(table.type),
    index("IDX_contents_type_status").on(table.type, table.status),
    index("IDX_contents_author").on(table.authorId),
    index("IDX_contents_published_at").on(table.publishedAt),
    index("IDX_contents_writer").on(table.writerId),
    index("IDX_contents_parent").on(table.parentId),
    index("IDX_contents_octopus_job").on(table.octopusJobId),
  ]
);

// Insert schema for content validation
export const insertContentSchema = createInsertSchema(contents);

// Types
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof contents.$inferSelect;
