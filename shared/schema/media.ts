import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  imageSourceEnum,
  imageRatingEnum,
  assetSourceEnum,
  recommendationStatusEnum,
  recommendationTypeEnum,
} from "./enums";
import { contents } from "./content-base";

// ============================================================================
// AI GENERATED IMAGES LIBRARY
// ============================================================================

export const aiGeneratedImages = pgTable(
  "ai_generated_images",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    filename: text("filename").notNull(),
    url: text("url").notNull(),
    topic: text("topic").notNull(),
    category: text("category"),
    imageType: text("image_type"),
    source: imageSourceEnum("source").default("openai"),
    prompt: text("prompt"),
    keywords: jsonb("keywords").$type<string[]>().default([]),
    altText: text("alt_text"),
    altTextHe: text("alt_text_he"),
    caption: text("caption"),
    captionHe: text("caption_he"),
    aiQualityScore: integer("ai_quality_score"),
    userRating: imageRatingEnum("user_rating"),
    width: integer("width"),
    height: integer("height"),
    size: integer("size"),
    isApproved: boolean("is_approved").default(false),
    usageCount: integer("usage_count").default(0),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_ai_images_topic").on(table.topic),
    index("IDX_ai_images_category").on(table.category),
    index("IDX_ai_images_approved").on(table.isApproved),
    index("IDX_ai_images_usage").on(table.usageCount),
    index("IDX_ai_images_source").on(table.source),
  ]
);

export const insertAiGeneratedImageSchema = createInsertSchema(aiGeneratedImages);

export type InsertAiGeneratedImage = z.infer<typeof insertAiGeneratedImageSchema>;
export type AiGeneratedImage = typeof aiGeneratedImages.$inferSelect;

// ============================================================================
// IMAGE COLLECTIONS
// ============================================================================

export const imageCollections = pgTable("image_collections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  coverImageId: varchar("cover_image_id"),
  imageIds: jsonb("image_ids").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertImageCollectionSchema = createInsertSchema(imageCollections);

export type InsertImageCollection = z.infer<typeof insertImageCollectionSchema>;
export type ImageCollection = typeof imageCollections.$inferSelect;

// ============================================================================
// MEDIA LIBRARY - Asset Indexing & Orphan Detection
// ============================================================================

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // File information
    path: text("path").notNull(), // Relative path from project root (e.g., uploads/image.jpg)
    url: text("url").notNull(), // Public URL for serving
    filename: text("filename").notNull(), // Original filename
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(), // File size in bytes
    checksum: varchar("checksum", { length: 64 }), // SHA-256 hash for deduplication
    // Metadata
    width: integer("width"),
    height: integer("height"),
    // Reference tracking
    contentId: varchar("content_id").references(() => contents.id, { onDelete: "set null" }),
    source: assetSourceEnum("source").default("upload"),
    // Lifecycle
    lastScannedAt: timestamp("last_scanned_at"),
    isOrphan: boolean("is_orphan").default(false),
    orphanedAt: timestamp("orphaned_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_media_assets_content_id").on(table.contentId),
    index("IDX_media_assets_checksum").on(table.checksum),
    index("IDX_media_assets_path").on(table.path),
    index("IDX_media_assets_is_orphan").on(table.isOrphan),
    index("IDX_media_assets_source").on(table.source),
  ]
);

export const insertMediaAssetSchema = createInsertSchema(mediaAssets);

export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;

// ============================================================================
// MEDIA INTELLIGENCE - Recommendations & Optimization Tracking
// ============================================================================

export const mediaRecommendations = pgTable(
  "media_recommendations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    // Target references
    assetId: varchar("asset_id").references(() => mediaAssets.id, { onDelete: "cascade" }),
    contentId: varchar("content_id").references(() => contents.id, { onDelete: "cascade" }),
    // Recommendation details
    type: recommendationTypeEnum("type").notNull(),
    priority: text("priority").notNull(), // critical, high, medium, low, info
    title: text("title").notNull(),
    description: text("description").notNull(),
    // Impact estimation
    performanceGain: integer("performance_gain"), // 0-100
    seoImpact: text("seo_impact"), // positive, neutral, negative
    aeoImpact: text("aeo_impact"), // positive, neutral, negative
    estimatedSavingsBytes: integer("estimated_savings_bytes"),
    // Action details
    actionType: text("action_type").notNull(),
    actionParams: jsonb("action_params").$type<Record<string, unknown>>().default({}),
    reversible: boolean("reversible").default(true),
    riskLevel: text("risk_level").default("low"), // none, low, medium, high
    // Proposal data
    currentValue: jsonb("current_value"),
    proposedValue: jsonb("proposed_value"),
    // Status tracking
    status: recommendationStatusEnum("status").default("pending"),
    // Audit trail
    approvedBy: varchar("approved_by"),
    approvedAt: timestamp("approved_at"),
    rejectedBy: varchar("rejected_by"),
    rejectedAt: timestamp("rejected_at"),
    rejectionReason: text("rejection_reason"),
    appliedAt: timestamp("applied_at"),
    failedAt: timestamp("failed_at"),
    failureReason: text("failure_reason"),
    // Timestamps
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_media_recommendations_asset").on(table.assetId),
    index("IDX_media_recommendations_content").on(table.contentId),
    index("IDX_media_recommendations_status").on(table.status),
    index("IDX_media_recommendations_type").on(table.type),
    index("IDX_media_recommendations_priority").on(table.priority),
  ]
);

export const insertMediaRecommendationSchema = createInsertSchema(mediaRecommendations);

export type InsertMediaRecommendation = z.infer<typeof insertMediaRecommendationSchema>;
export type MediaRecommendationRecord = typeof mediaRecommendations.$inferSelect;
