import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { socialPlatformEnum, socialPostStatusEnum } from "./enums";
import { users } from "./auth";

// ============================================================================
// INTEGRATION CONNECTIONS TABLE
// ============================================================================

// Integration Connections - for external service integrations
export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: varchar("provider").notNull(), // mailchimp, klaviyo, zapier, ga4, mixpanel, bigquery, snowflake
    name: varchar("name").notNull(),
    config: jsonb("config").$type<Record<string, any>>().notNull().default({}), // API keys, credentials
    status: varchar("status").default("active"), // active, inactive, error
    lastSyncAt: timestamp("last_sync_at"),
    syncFrequency: varchar("sync_frequency").default("manual"), // manual, hourly, daily, weekly
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_integration_connections_provider").on(table.provider),
    index("IDX_integration_connections_status").on(table.status),
  ]
);

// ============================================================================
// DATA EXPORTS TABLE
// ============================================================================

// Data Exports - export configurations for data warehouses
export const dataExports = pgTable(
  "data_exports",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    destination: varchar("destination").notNull(), // bigquery, snowflake
    connectionId: varchar("connection_id").references(() => integrationConnections.id),
    dataSource: varchar("data_source").notNull(), // analytics_events, content, subscribers
    schedule: varchar("schedule").notNull(), // hourly, daily, weekly
    scheduleConfig: jsonb("schedule_config").$type<Record<string, any>>().default({}),
    schemaMapping: jsonb("schema_mapping").$type<Record<string, string>>().notNull().default({}),
    isIncremental: boolean("is_incremental").default(true),
    lastExportAt: timestamp("last_export_at"),
    nextExportAt: timestamp("next_export_at").notNull(),
    lastExportStatus: varchar("last_export_status"), // success, failed, partial
    lastExportError: text("last_export_error"),
    exportCount: integer("export_count").default(0),
    recordsExported: integer("records_exported").default(0),
    isActive: boolean("is_active").default(true),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_data_exports_next_export").on(table.nextExportAt),
    index("IDX_data_exports_active").on(table.isActive),
  ]
);

// ============================================================================
// SOCIAL MEDIA TABLES
// ============================================================================

// Social campaigns table
export const socialCampaigns = pgTable("social_campaigns", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status").notNull().default("active"), // active, paused, completed
  targetPlatforms: jsonb("target_platforms").$type<string[]>().default([]),
  goals: jsonb("goals").$type<{ impressions?: number; clicks?: number; engagement?: number }>(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Social posts table
export const socialPosts = pgTable(
  "social_posts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: varchar("campaign_id").references(() => socialCampaigns.id),
    contentId: varchar("content_id"), // Optional link to CMS content
    platform: socialPlatformEnum("platform").notNull(),
    status: socialPostStatusEnum("status").notNull().default("draft"),

    // Post content
    text: text("text").notNull(),
    textHe: text("text_he"), // Hebrew version
    mediaUrls: jsonb("media_urls").$type<string[]>().default([]),
    linkUrl: varchar("link_url"),
    hashtags: jsonb("hashtags").$type<string[]>().default([]),

    // Scheduling
    scheduledAt: timestamp("scheduled_at"),
    publishedAt: timestamp("published_at"),

    // Platform-specific data
    platformPostId: varchar("platform_post_id"), // ID returned from platform after posting
    platformData: jsonb("platform_data").$type<Record<string, any>>(), // Platform-specific metadata

    // AI generation metadata
    generatedByAi: boolean("generated_by_ai").default(false),
    sourcePrompt: text("source_prompt"),

    // Error tracking
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),

    createdBy: varchar("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_social_posts_status").on(table.status),
    index("idx_social_posts_scheduled").on(table.scheduledAt),
    index("idx_social_posts_platform").on(table.platform),
  ]
);

// Social analytics table
export const socialAnalytics = pgTable("social_analytics", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => socialPosts.id),
  campaignId: varchar("campaign_id").references(() => socialCampaigns.id),
  platform: socialPlatformEnum("platform").notNull(),

  // Metrics
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  clicks: integer("clicks").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  saves: integer("saves").default(0),
  engagementRate: varchar("engagement_rate"), // Stored as string for precision

  // LinkedIn specific
  linkedinReactions: jsonb("linkedin_reactions").$type<Record<string, number>>(), // like, celebrate, support, etc.

  // Time tracking
  fetchedAt: timestamp("fetched_at").defaultNow(),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
});

// LinkedIn OAuth credentials table
export const socialCredentials = pgTable(
  "social_credentials",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    platform: socialPlatformEnum("platform").notNull(),

    // OAuth tokens (encrypted in practice)
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),

    // Profile info
    platformUserId: varchar("platform_user_id"),
    platformUsername: varchar("platform_username"),
    profileUrl: varchar("profile_url"),

    // Status
    isActive: boolean("is_active").default(true),
    lastSyncAt: timestamp("last_sync_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [uniqueIndex("idx_social_credentials_user_platform").on(table.userId, table.platform)]
);

// ============================================================================
// RELATIONS
// ============================================================================

// Relations for social tables
export const socialCampaignsRelations = relations(socialCampaigns, ({ many }) => ({
  posts: many(socialPosts),
  analytics: many(socialAnalytics),
}));

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  campaign: one(socialCampaigns, {
    fields: [socialPosts.campaignId],
    references: [socialCampaigns.id],
  }),
  analytics: many(socialAnalytics),
}));

export const socialAnalyticsRelations = relations(socialAnalytics, ({ one }) => ({
  post: one(socialPosts, { fields: [socialAnalytics.postId], references: [socialPosts.id] }),
  campaign: one(socialCampaigns, {
    fields: [socialAnalytics.campaignId],
    references: [socialCampaigns.id],
  }),
}));

// ============================================================================
// INSERT SCHEMAS
// ============================================================================

export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnections);
export const insertDataExportSchema = createInsertSchema(dataExports);
export const insertSocialCampaignSchema = createInsertSchema(socialCampaigns);
export const insertSocialPostSchema = createInsertSchema(socialPosts);
export const insertSocialAnalyticsSchema = createInsertSchema(socialAnalytics);
export const insertSocialCredentialSchema = createInsertSchema(socialCredentials);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;
export type DataExport = typeof dataExports.$inferSelect;
export type InsertDataExport = z.infer<typeof insertDataExportSchema>;
export type SocialCampaign = typeof socialCampaigns.$inferSelect;
export type InsertSocialCampaign = z.infer<typeof insertSocialCampaignSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialAnalytics = typeof socialAnalytics.$inferSelect;
export type InsertSocialAnalytics = z.infer<typeof insertSocialAnalyticsSchema>;
export type SocialCredential = typeof socialCredentials.$inferSelect;
export type InsertSocialCredential = z.infer<typeof insertSocialCredentialSchema>;
