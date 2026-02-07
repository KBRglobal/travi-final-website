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

import { contentTypeEnum } from "./enums";
import type { ContentBlock } from "./types";

import { users } from "./auth";
import { contents } from "./content-base";

// ============================================================================
// TAGS TABLE
// ============================================================================

export const tags = pgTable("tags", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  color: varchar("color"),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTagSchema = createInsertSchema(tags);
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

// ============================================================================
// CONTENT-TAG JUNCTION TABLE
// ============================================================================

export const contentTags = pgTable(
  "content_tags",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_content_tags_content").on(table.contentId),
    index("IDX_content_tags_tag").on(table.tagId),
  ]
);

export const insertContentTagSchema = createInsertSchema(contentTags);
export type InsertContentTag = z.infer<typeof insertContentTagSchema>;
export type ContentTag = typeof contentTags.$inferSelect;

// ============================================================================
// CONTENT CLUSTERS TABLE - for pillar page structure
// ============================================================================

export const contentClusters = pgTable("content_clusters", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  pillarContentId: varchar("pillar_content_id").references(() => contents.id, {
    onDelete: "set null",
  }),
  primaryKeyword: text("primary_keyword"),
  color: varchar("color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentClusterSchema = createInsertSchema(contentClusters);
export type InsertContentCluster = z.infer<typeof insertContentClusterSchema>;
export type ContentCluster = typeof contentClusters.$inferSelect;

// ============================================================================
// CLUSTER MEMBERS - linking content to clusters
// ============================================================================

export const clusterMembers = pgTable(
  "cluster_members",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clusterId: varchar("cluster_id")
      .notNull()
      .references(() => contentClusters.id, { onDelete: "cascade" }),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    position: integer("position").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_cluster_members_cluster").on(table.clusterId),
    index("IDX_cluster_members_content").on(table.contentId),
  ]
);

export const insertClusterMemberSchema = createInsertSchema(clusterMembers);
export type InsertClusterMember = z.infer<typeof insertClusterMemberSchema>;
export type ClusterMember = typeof clusterMembers.$inferSelect;

// ============================================================================
// CONTENT TEMPLATES - for reusable content structures
// ============================================================================

export const contentTemplates = pgTable("content_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  contentType: contentTypeEnum("content_type").notNull(),
  blocks: jsonb("blocks").$type<ContentBlock[]>().default([]),
  extensionDefaults: jsonb("extension_defaults").$type<Record<string, unknown>>(),
  seoDefaults: jsonb("seo_defaults").$type<Record<string, unknown>>(),
  isPublic: boolean("is_public").default(false),
  usageCount: integer("usage_count").default(0),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentTemplateSchema = createInsertSchema(contentTemplates);
export type InsertContentTemplate = z.infer<typeof insertContentTemplateSchema>;
export type ContentTemplate = typeof contentTemplates.$inferSelect;

// ============================================================================
// SITE SETTINGS - for global configuration
// ============================================================================

export const siteSettings = pgTable("site_settings", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value").$type<unknown>(),
  category: varchar("category").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSiteSettingSchema = createInsertSchema(siteSettings);
export type InsertSiteSetting = z.infer<typeof insertSiteSettingSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;

// ============================================================================
// CONTENT WITH RELATIONS TYPE
// ============================================================================

// Import types needed for ContentWithRelations
import type { Content } from "./content-base";
import type { User } from "./auth";
import type {
  Attraction,
  Hotel,
  Article,
  Dining,
  District,
  Transport,
  Event,
  Itinerary,
} from "./content-types";
import type { AffiliateLink, ContentVersion } from "./content-support";
import type { Translation } from "./localization";
import type { ContentView } from "./analytics";
import type { SeoAnalysisResult } from "./seo";

// Full content types with relations
export type ContentWithRelations = Content & {
  author?: User;
  attraction?: Attraction;
  hotel?: Hotel;
  article?: Article;
  dining?: Dining;
  district?: District;
  transport?: Transport;
  event?: Event;
  itinerary?: Itinerary;
  affiliateLinks?: (AffiliateLink & { label?: string; price?: string })[];
  translations?: Translation[];
  views?: ContentView[];
  tags?: Tag[];
  cluster?: ContentCluster;
  versions?: ContentVersion[];
  seoAnalysis?: SeoAnalysisResult;
};
