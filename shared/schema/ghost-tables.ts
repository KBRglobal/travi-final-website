/**
 * Ghost Tables Schema
 *
 * Tables that exist in the database but were missing from the Drizzle schema.
 * Added to ensure full schema parity between DB and ORM.
 *
 * Tables:
 * - content_localizations (51 rows)
 * - guides (17 rows)
 * - news (12 rows)
 * - restaurants (0 rows)
 * - rss_feed_items (648 rows)
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  serial,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// CONTENT LOCALIZATIONS TABLE
// ============================================================================

export const contentLocalizations = pgTable("content_localizations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  locale: varchar("locale").notNull(),
  title: text("title").notNull(),
  slug: varchar("slug").notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  contentSections: jsonb("content_sections").default(sql`'{}'::jsonb`),
  faq: jsonb("faq").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertContentLocalizationSchema = createInsertSchema(contentLocalizations);
export type InsertContentLocalization = z.infer<typeof insertContentLocalizationSchema>;
export type ContentLocalization = typeof contentLocalizations.$inferSelect;

// ============================================================================
// GUIDES TABLE
// ============================================================================

export const guides = pgTable("guides", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  slug: varchar("slug").notNull(),
  excerpt: text("excerpt"),
  content: text("content"),
  image: varchar("image"),
  author: varchar("author"),
  avatar: varchar("avatar"),
  date: varchar("date"),
  readTime: varchar("read_time"),
  views: varchar("views"),
  category: varchar("category"),
  destinationId: varchar("destination_id"),
  featured: boolean("featured").default(false),
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  focusKeyword: varchar("focus_keyword"),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGuideSchema = createInsertSchema(guides);
export type InsertGuide = z.infer<typeof insertGuideSchema>;
export type Guide = typeof guides.$inferSelect;

// ============================================================================
// NEWS TABLE
// ============================================================================

export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  slug: varchar("slug").notNull(),
  subtitle: text("subtitle"),
  excerpt: text("excerpt"),
  content: text("content"),
  image: varchar("image"),
  category: varchar("category"),
  destination: varchar("destination"),
  author: varchar("author"),
  date: varchar("date"),
  readingTime: integer("reading_time").default(5),
  views: varchar("views"),
  featured: boolean("featured").default(false),
  breaking: boolean("breaking").default(false),
  trending: boolean("trending").default(false),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNewsSchema = createInsertSchema(news);
export type InsertNews = z.infer<typeof insertNewsSchema>;
export type News = typeof news.$inferSelect;

// ============================================================================
// RESTAURANTS TABLE
// ============================================================================

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  destinationId: integer("destination_id"),
  cuisine: varchar("cuisine"),
  location: varchar("location"),
  image: varchar("image"),
  price: varchar("price"),
  rating: numeric("rating", { precision: 2, scale: 1 }).default("4.5"),
  description: text("description"),
  features: text("features").array(),
  michelinStars: integer("michelin_stars").default(0),
  status: varchar("status").default("published"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

export const insertRestaurantSchema = createInsertSchema(restaurants);
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

// ============================================================================
// RSS FEED ITEMS TABLE
// ============================================================================

export const rssFeedItems = pgTable("rss_feed_items", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  feedId: varchar("feed_id").notNull(),
  title: varchar("title").notNull(),
  url: varchar("url").notNull(),
  summary: text("summary"),
  publishedDate: timestamp("published_date", { withTimezone: true }),
  source: varchar("source"),
  category: varchar("category"),
  processed: boolean("processed").default(false),
  contentId: varchar("content_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  gate1Score: integer("gate1_score"),
  gate1SeoScore: integer("gate1_seo_score"),
  gate1AeoScore: integer("gate1_aeo_score"),
  gate1ViralityScore: integer("gate1_virality_score"),
  gate1Decision: varchar("gate1_decision"),
  gate1Tier: varchar("gate1_tier"),
  gate1Value: varchar("gate1_value"),
  gate1Cost: varchar("gate1_cost"),
  gate1Reasoning: text("gate1_reasoning"),
  gate1WriterId: varchar("gate1_writer_id"),
  gate1WriterName: varchar("gate1_writer_name"),
  gate1Keywords: text("gate1_keywords"),
  humanOverride: boolean("human_override").default(false),
  humanOverrideReason: text("human_override_reason"),
  humanOverrideAt: timestamp("human_override_at", { withTimezone: true }),
  status: varchar("status").default("pending"),
});

export const insertRssFeedItemSchema = createInsertSchema(rssFeedItems);
export type InsertRssFeedItem = z.infer<typeof insertRssFeedItemSchema>;
export type RssFeedItem = typeof rssFeedItems.$inferSelect;
