import { pgTable, varchar, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { articleCategoryEnum } from "./enums";
import type { ContentBlock } from "./types";

// ============================================================================
// RSS FEEDS TABLE
// ============================================================================

export const rssFeeds = pgTable("rss_feeds", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  category: articleCategoryEnum("category"),
  destinationId: varchar("destination_id"), // Forward reference to destinations.id
  language: text("language").default("en"),
  region: text("region"),
  isActive: boolean("is_active").default(true),
  lastFetchedAt: timestamp("last_fetched_at"),
  fetchIntervalMinutes: integer("fetch_interval_minutes").default(60),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRssFeedSchema = createInsertSchema(rssFeeds);
export type InsertRssFeed = z.infer<typeof insertRssFeedSchema>;
export type RssFeed = typeof rssFeeds.$inferSelect;

// ============================================================================
// AFFILIATE LINKS TABLE
// ============================================================================

export const affiliateLinks = pgTable("affiliate_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id"), // Forward reference to contents.id
  provider: text("provider").notNull(),
  productId: text("product_id"),
  anchor: text("anchor").notNull(),
  url: text("url").notNull(),
  placement: text("placement"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAffiliateLinkSchema = createInsertSchema(affiliateLinks);
export type InsertAffiliateLink = z.infer<typeof insertAffiliateLinkSchema>;
export type AffiliateLink = typeof affiliateLinks.$inferSelect;

// ============================================================================
// MEDIA FILES TABLE
// ============================================================================

export const mediaFiles = pgTable("media_files", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  altText: text("alt_text"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMediaFileSchema = createInsertSchema(mediaFiles);
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;
export type MediaFile = typeof mediaFiles.$inferSelect;

// ============================================================================
// INTERNAL LINKS TABLE
// ============================================================================

export const internalLinks = pgTable("internal_links", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  sourceContentId: varchar("source_content_id"), // Forward reference to contents.id
  targetContentId: varchar("target_content_id"), // Forward reference to contents.id
  anchorText: text("anchor_text"),
  isAutoSuggested: boolean("is_auto_suggested").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInternalLinkSchema = createInsertSchema(internalLinks);
export type InsertInternalLink = z.infer<typeof insertInternalLinkSchema>;
export type InternalLink = typeof internalLinks.$inferSelect;

// ============================================================================
// CONTENT VERSIONS TABLE
// ============================================================================

export const contentVersions = pgTable("content_versions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(), // Forward reference to contents.id
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  slug: text("slug"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  primaryKeyword: text("primary_keyword"),
  heroImage: text("hero_image"),
  heroImageAlt: text("hero_image_alt"),
  blocks: jsonb("blocks").$type<ContentBlock[]>().default([]),
  changedBy: varchar("changed_by"),
  changeNote: text("change_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContentVersionSchema = createInsertSchema(contentVersions);
export type InsertContentVersion = z.infer<typeof insertContentVersionSchema>;
export type ContentVersion = typeof contentVersions.$inferSelect;

// ============================================================================
// CONTENT FINGERPRINTS TABLE
// ============================================================================

export const contentFingerprints = pgTable("content_fingerprints", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id"), // Forward reference to contents.id
  fingerprint: text("fingerprint").notNull().unique(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  rssFeedId: varchar("rss_feed_id"), // Forward reference to rssFeeds.id
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertContentFingerprintSchema = createInsertSchema(contentFingerprints);
export type InsertContentFingerprint = z.infer<typeof insertContentFingerprintSchema>;
export type ContentFingerprint = typeof contentFingerprints.$inferSelect;
