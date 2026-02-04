import { sql } from "drizzle-orm";
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
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import {
  traviLocationCategoryEnum,
  tiqetsAttractionStatusEnum,
  traviJobStatusEnum,
  traviJobTypeEnum,
  traviApiServiceEnum,
  traviAlertSeverityEnum,
  advisoryTypeEnum,
  advisoryStatusEnum,
  advisorySeverityEnum,
  healthAlertTypeEnum,
  healthAlertStatusEnum,
  healthAlertSeverityEnum,
  destinationEventTypeEnum,
  destinationEventStatusEnum,
} from "./enums";

// ============================================================================
// FORWARD REFERENCES - Placeholders for circular dependencies
// ============================================================================

// Forward reference placeholder for destinations table (defined in main schema.ts)
// This allows us to reference destinations without creating circular imports
declare const _destinations: ReturnType<typeof pgTable> & { id: any };
const destinations = _destinations;

// ============================================================================
// TRAVI LOCATION CATEGORY ENUM (imported from ./enums)
// ============================================================================

// ============================================================================
// TRAVI DISTRICTS
// ============================================================================

// Districts/Zones for hierarchical organization
export const traviDistricts = pgTable(
  "travi_districts",
  {
    id: serial("id").primaryKey(),
    city: varchar("city", { length: 100 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description"),
    latitude: varchar("latitude", { length: 20 }),
    longitude: varchar("longitude", { length: 20 }),
    displayOrder: integer("display_order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_travi_districts_city").on(table.city),
    uniqueIndex("IDX_travi_districts_city_slug").on(table.city, table.slug),
  ]
);

export const insertTraviDistrictSchema = createInsertSchema(traviDistricts);
export type InsertTraviDistrict = z.infer<typeof insertTraviDistrictSchema>;
export type TraviDistrict = typeof traviDistricts.$inferSelect;

// ============================================================================
// TIQETS INTEGRATION SYSTEM
// ============================================================================

// Tiqets Cities - target cities for attraction import
export const tiqetsCities = pgTable(
  "tiqets_cities",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tiqetsCityId: varchar("tiqets_city_id").unique(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    countryName: varchar("country_name", { length: 100 }),
    isActive: boolean("is_active").default(true),
    attractionCount: integer("attraction_count").default(0),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_tiqets_cities_name").on(table.name),
    index("IDX_tiqets_cities_active").on(table.isActive),
  ]
);

export const insertTiqetsCitySchema = createInsertSchema(tiqetsCities);
export type InsertTiqetsCity = z.infer<typeof insertTiqetsCitySchema>;
export type TiqetsCity = typeof tiqetsCities.$inferSelect;

// Tiqets Attractions - imported from Tiqets API
export const tiqetsAttractions = pgTable(
  "tiqets_attractions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Tiqets IDs
    tiqetsId: varchar("tiqets_id").unique().notNull(),
    productSlug: varchar("product_slug"),
    cityId: varchar("city_id"),
    cityName: varchar("city_name", { length: 100 }).notNull(),

    // Basic info
    title: varchar("title", { length: 300 }).notNull(),
    slug: varchar("slug", { length: 300 }).unique().notNull(),

    // SEO-optimized slug (clean, short, human-readable)
    seoSlug: varchar("seo_slug", { length: 200 }),

    // AI Content Generation
    aiContent: jsonb("ai_content").$type<{
      introduction: string;
      whyVisit: string;
      proTip: string;
      whatToExpect: Array<{ title: string; description: string; icon: string }>;
      visitorTips: Array<{ title: string; description: string; icon: string }>;
      howToGetThere: { description: string; transport: Array<{ mode: string; details: string }> };
      answerCapsule: string; // AEO - direct answer for featured snippets
      schemaPayload: Record<string, unknown>; // Pre-built JSON-LD
    }>(),
    contentGenerationStatus: varchar("content_generation_status", { length: 20 }).default(
      "pending"
    ), // pending, in_progress, completed, failed
    contentGenerationLockedBy: varchar("content_generation_locked_by", { length: 50 }), // Provider name holding the lock
    contentGenerationLockedAt: timestamp("content_generation_locked_at"), // When lock was acquired
    contentGenerationAttempts: integer("content_generation_attempts").default(0), // Number of retry attempts
    contentGenerationLastError: text("content_generation_last_error"), // Last error message
    contentGenerationProvider: varchar("content_generation_provider", { length: 50 }), // Provider that completed generation
    contentGenerationCompletedAt: timestamp("content_generation_completed_at"), // When generation finished

    // Legacy field mappings
    name: varchar("name", { length: 300 }), // Alias for title

    venueName: varchar("venue_name", { length: 200 }),
    venueAddress: varchar("venue_address", { length: 500 }),

    // Geolocation
    latitude: varchar("latitude", { length: 20 }),
    longitude: varchar("longitude", { length: 20 }),

    // Technical details from Tiqets
    duration: varchar("duration", { length: 100 }),
    languages: jsonb("languages").$type<string[]>().default([]),
    wheelchairAccess: boolean("wheelchair_access"),
    smartphoneTicket: boolean("smartphone_ticket"),
    instantTicketDelivery: boolean("instant_ticket_delivery"),
    cancellationPolicy: text("cancellation_policy"),

    // Raw Tiqets data (reference only)
    tiqetsHighlights: jsonb("tiqets_highlights").$type<string[]>(),
    tiqetsWhatsIncluded: text("tiqets_whats_included"),
    tiqetsWhatsExcluded: text("tiqets_whats_excluded"),
    tiqetsDescription: text("tiqets_description"),
    tiqetsSummary: text("tiqets_summary"),
    tiqetsImages: jsonb("tiqets_images").$type<
      Array<{
        small?: string;
        medium?: string;
        large?: string;
        extra_large?: string;
        alt_text?: string;
      }>
    >(),
    tiqetsRating: varchar("tiqets_rating", { length: 10 }),
    tiqetsReviewCount: integer("tiqets_review_count"),

    // Price (internal only - for sorting/filtering, never display)
    priceUsd: varchar("price_usd", { length: 20 }),
    prediscountPriceUsd: varchar("prediscount_price_usd", { length: 20 }),
    discountPercentage: integer("discount_percentage"),

    // Our content (empty until AI processing)
    ratingLabel: varchar("rating_label", { length: 50 }),
    highlights: jsonb("highlights").$type<string[]>(),
    whatsIncluded: jsonb("whats_included").$type<string[]>(),
    whatsExcluded: jsonb("whats_excluded").$type<string[]>(),
    description: text("description"),
    h1Title: varchar("h1_title", { length: 200 }),
    metaTitle: varchar("meta_title", { length: 60 }),
    metaDescription: varchar("meta_description", { length: 160 }),
    faqs: jsonb("faqs").$type<Array<{ question: string; answer: string }>>(),
    images: jsonb("images").$type<
      Array<{
        url: string;
        alt: string;
        isHero?: boolean;
      }>
    >(),

    // Categorization
    primaryCategory: varchar("primary_category", { length: 100 }),
    secondaryCategories: jsonb("secondary_categories").$type<string[]>(),
    districtId: integer("district_id").references(() => traviDistricts.id),

    // Affiliate
    productUrl: varchar("product_url", { length: 500 }).notNull(),

    // Quality Scores (V2 content generation)
    qualityScore: integer("quality_score"), // Overall quality 0-100
    seoScore: integer("seo_score"), // SEO compliance 0-100
    aeoScore: integer("aeo_score"), // AEO optimization 0-100
    factCheckScore: integer("fact_check_score"), // Fact verification 0-100
    contentVersion: integer("content_version").default(1), // 1=legacy, 2=v2
    lastContentUpdate: timestamp("last_content_update"),

    // Status
    status: tiqetsAttractionStatusEnum("status").default("imported"),
    contentGeneratedAt: timestamp("content_generated_at"),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_tiqets_attractions_city").on(table.cityName),
    index("IDX_tiqets_attractions_status").on(table.status),
    index("IDX_tiqets_attractions_tiqets_id").on(table.tiqetsId),
    index("IDX_tiqets_attractions_district").on(table.districtId),
    index("IDX_tiqets_attractions_seo_slug").on(table.seoSlug),
  ]
);

export const insertTiqetsAttractionSchema = createInsertSchema(tiqetsAttractions);
export type InsertTiqetsAttraction = z.infer<typeof insertTiqetsAttractionSchema>;
export type TiqetsAttraction = typeof tiqetsAttractions.$inferSelect;

// Affiliate Click Tracking Table
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  attractionId: varchar("attraction_id").references(() => tiqetsAttractions.id),
  destination: varchar("destination", { length: 100 }),
  clickedAt: timestamp("clicked_at").defaultNow(),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  sessionId: varchar("session_id", { length: 100 }),
});

export type AffiliateClick = typeof affiliateClicks.$inferSelect;

// Update schema for SEO/AEO editable fields only
export const updateTiqetsAttractionSchema = z.object({
  h1Title: z.string().max(200).nullable().optional(),
  metaTitle: z.string().max(60).nullable().optional(),
  metaDescription: z.string().max(160).nullable().optional(),
  description: z.string().nullable().optional(),
  highlights: z.array(z.string()).nullable().optional(),
  whatsIncluded: z.array(z.string()).nullable().optional(),
  whatsExcluded: z.array(z.string()).nullable().optional(),
  faqs: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    )
    .nullable()
    .optional(),
  primaryCategory: z.string().max(100).nullable().optional(),
  secondaryCategories: z.array(z.string()).nullable().optional(),
  ratingLabel: z.string().max(50).nullable().optional(),
  status: z.enum(["imported", "ready", "published"]).optional(),
  // SEO slug and AI content fields
  seoSlug: z.string().max(200).nullable().optional(),
  aiContent: z
    .object({
      introduction: z.string(),
      whyVisit: z.string(),
      proTip: z.string(),
      whatToExpect: z.array(
        z.object({ title: z.string(), description: z.string(), icon: z.string() })
      ),
      visitorTips: z.array(
        z.object({ title: z.string(), description: z.string(), icon: z.string() })
      ),
      howToGetThere: z.object({
        description: z.string(),
        transport: z.array(z.object({ mode: z.string(), details: z.string() })),
      }),
      answerCapsule: z.string(),
      schemaPayload: z.record(z.unknown()),
    })
    .nullable()
    .optional(),
  contentGenerationStatus: z.enum(["pending", "generating", "ready", "failed"]).optional(),
});
export type UpdateTiqetsAttraction = z.infer<typeof updateTiqetsAttractionSchema>;

// Relations for Tiqets tables
export const tiqetsAttractionsRelations = relations(tiqetsAttractions, ({ one }) => ({
  district: one(traviDistricts, {
    fields: [tiqetsAttractions.districtId],
    references: [traviDistricts.id],
  }),
}));

// ============================================================================
// TRAVI PROCESSING JOBS
// ============================================================================

// Travel Processing Jobs - tracks processing progress with checkpoints
export const traviProcessingJobs = pgTable(
  "travi_processing_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    jobType: traviJobTypeEnum("job_type").notNull(),
    status: traviJobStatusEnum("status").notNull().default("pending"),

    // Scope
    destinationId: varchar("destination_id").references(() => destinations.id),
    category: traviLocationCategoryEnum("category"),

    // Progress tracking
    totalItems: integer("total_items").default(0),
    processedItems: integer("processed_items").default(0),
    successCount: integer("success_count").default(0),
    failedCount: integer("failed_count").default(0),

    // Checkpoint data
    lastProcessedId: varchar("last_processed_id"),
    checkpointData: jsonb("checkpoint_data").$type<{
      currentPhase?: string;
      currentCity?: string;
      locationsProcessed?: number;
      costsIncurred?: number;
    }>(),

    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    lastCheckpointAt: timestamp("last_checkpoint_at"),

    // Error tracking
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_travi_processing_jobs_status").on(table.status),
    index("IDX_travi_processing_jobs_type").on(table.jobType),
  ]
);

export const insertTraviProcessingJobSchema = createInsertSchema(traviProcessingJobs);
export type InsertTraviProcessingJob = z.infer<typeof insertTraviProcessingJobSchema>;
export type TraviProcessingJob = typeof traviProcessingJobs.$inferSelect;

// ============================================================================
// TRAVI API USAGE TRACKING
// ============================================================================

// Travel API Usage - daily usage tracking and cost calculation
export const traviApiUsage = pgTable(
  "travi_api_usage",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
    service: traviApiServiceEnum("service").notNull(),

    // Request counts
    requestCount: integer("request_count").default(0),
    successCount: integer("success_count").default(0),
    failedCount: integer("failed_count").default(0),

    // Token usage (for AI services)
    promptTokens: integer("prompt_tokens").default(0),
    completionTokens: integer("completion_tokens").default(0),
    totalTokens: integer("total_tokens").default(0),

    // Cost tracking
    estimatedCost: varchar("estimated_cost").default("0"), // Stored as string for precision

    // Rate limit tracking
    rateLimitHits: integer("rate_limit_hits").default(0),
    lastRateLimitAt: timestamp("last_rate_limit_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    uniqueIndex("IDX_travi_api_usage_date_service").on(table.date, table.service),
    index("IDX_travi_api_usage_date").on(table.date),
  ]
);

export const insertTraviApiUsageSchema = createInsertSchema(traviApiUsage);
export type InsertTraviApiUsage = z.infer<typeof insertTraviApiUsageSchema>;
export type TraviApiUsage = typeof traviApiUsage.$inferSelect;

// ============================================================================
// TRAVI SYSTEM ALERTS
// ============================================================================

// Travel System Alerts - budget and rate limit alerts
export const traviSystemAlerts = pgTable(
  "travi_system_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    severity: traviAlertSeverityEnum("severity").notNull(),
    service: traviApiServiceEnum("service"),
    message: text("message").notNull(),

    // Context
    totalCost: varchar("total_cost"),
    budgetThreshold: varchar("budget_threshold"),
    dailyUsage: integer("daily_usage"),
    dailyLimit: integer("daily_limit"),

    // Status
    acknowledged: boolean("acknowledged").default(false),
    acknowledgedBy: varchar("acknowledged_by"),
    acknowledgedAt: timestamp("acknowledged_at"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_travi_system_alerts_severity").on(table.severity),
    index("IDX_travi_system_alerts_created").on(table.createdAt),
  ]
);

export const insertTraviSystemAlertSchema = createInsertSchema(traviSystemAlerts);
export type InsertTraviSystemAlert = z.infer<typeof insertTraviSystemAlertSchema>;
export type TraviSystemAlert = typeof traviSystemAlerts.$inferSelect;

// ============================================================================
// TRAVI CONFIGURATION
// ============================================================================

// TRAVI Configuration - stores destination enabled states and other settings
export const traviConfig = pgTable(
  "travi_config",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    configKey: varchar("config_key", { length: 100 }).notNull().unique(),
    configValue: jsonb("config_value").$type<{
      enabled?: boolean;
      destinationId?: string;
      value?: string | number | boolean;
    }>(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [uniqueIndex("IDX_travi_config_key").on(table.configKey)]
);

export const insertTraviConfigSchema = createInsertSchema(traviConfig);
export type InsertTraviConfig = z.infer<typeof insertTraviConfigSchema>;
export type TraviConfig = typeof traviConfig.$inferSelect;

// Relations for TRAVI tables
export const traviDistrictsRelations = relations(traviDistricts, ({ many }) => ({
  attractions: many(tiqetsAttractions),
}));

// ============================================================================
// TRAVEL INTELLIGENCE SYSTEM - Advisories, Health Alerts, Events
// ============================================================================

// Travel Advisories - visa, passport, vaccination requirements by destination
export const travelAdvisories = pgTable(
  "travel_advisories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    destinationId: varchar("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    advisoryType: advisoryTypeEnum("advisory_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    requirements: jsonb("requirements").$type<Record<string, unknown>>().default({}),
    translations: jsonb("translations")
      .$type<Record<string, { title?: string; description?: string }>>()
      .default({}),
    sourceUrl: text("source_url"),
    effectiveDate: timestamp("effective_date"),
    expiryDate: timestamp("expiry_date"),
    status: advisoryStatusEnum("status").notNull().default("active"),
    severity: advisorySeverityEnum("severity").notNull().default("info"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_travel_advisories_destination").on(table.destinationId),
    index("IDX_travel_advisories_type").on(table.advisoryType),
    index("IDX_travel_advisories_status").on(table.status),
    index("IDX_travel_advisories_severity").on(table.severity),
  ]
);

export const insertTravelAdvisorySchema = createInsertSchema(travelAdvisories);
export type InsertTravelAdvisory = z.infer<typeof insertTravelAdvisorySchema>;
export type TravelAdvisory = typeof travelAdvisories.$inferSelect;

// Health Alerts - disease outbreaks, vaccination requirements, travel restrictions
export const healthAlerts = pgTable(
  "health_alerts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    destinationId: varchar("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    alertType: healthAlertTypeEnum("alert_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    translations: jsonb("translations")
      .$type<Record<string, { title?: string; description?: string }>>()
      .default({}),
    source: text("source"),
    sourceUrl: text("source_url"),
    issuedDate: timestamp("issued_date"),
    expiryDate: timestamp("expiry_date"),
    status: healthAlertStatusEnum("status").notNull().default("active"),
    severity: healthAlertSeverityEnum("severity").notNull().default("low"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_health_alerts_destination").on(table.destinationId),
    index("IDX_health_alerts_type").on(table.alertType),
    index("IDX_health_alerts_status").on(table.status),
    index("IDX_health_alerts_severity").on(table.severity),
    index("IDX_health_alerts_issued_date").on(table.issuedDate),
  ]
);

export const insertHealthAlertSchema = createInsertSchema(healthAlerts);
export type InsertHealthAlert = z.infer<typeof insertHealthAlertSchema>;
export type HealthAlert = typeof healthAlerts.$inferSelect;

// Destination Events - festivals, sports, conferences, concerts, etc.
export const destinationEvents = pgTable(
  "destination_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    destinationId: varchar("destination_id")
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    translations: jsonb("translations")
      .$type<Record<string, { name?: string; description?: string }>>()
      .default({}),
    eventType: destinationEventTypeEnum("event_type").notNull(),
    venue: text("venue"),
    venueAddress: text("venue_address"),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date"),
    ticketUrl: text("ticket_url"),
    imageUrl: text("image_url"),
    priceRange: jsonb("price_range").$type<{ min?: number; max?: number; currency?: string }>(),
    tags: text("tags").array(),
    status: destinationEventStatusEnum("status").notNull().default("upcoming"),
    featured: boolean("featured").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_destination_events_destination").on(table.destinationId),
    index("IDX_destination_events_type").on(table.eventType),
    index("IDX_destination_events_status").on(table.status),
    index("IDX_destination_events_start_date").on(table.startDate),
    index("IDX_destination_events_featured").on(table.featured),
  ]
);

export const insertDestinationEventSchema = createInsertSchema(destinationEvents);
export type InsertDestinationEvent = z.infer<typeof insertDestinationEventSchema>;
export type DestinationEvent = typeof destinationEvents.$inferSelect;

// Note: Relations for travelAdvisories, healthAlerts, and destinationEvents
// to destinations table should be defined in the main schema.ts where
// the destinations table is actually defined, to avoid circular dependencies.

// ============================================================================
// VISA REQUIREMENTS
// ============================================================================

// Visa Requirements - passport to destination visa requirements from Passport Index
export const visaRequirements = pgTable(
  "visa_requirements",
  {
    id: serial("id").primaryKey(),
    passportCountryCode: varchar("passport_country_code", { length: 2 }).notNull(),
    destinationCountryCode: varchar("destination_country_code", { length: 2 }).notNull(),
    visaCategory: varchar("visa_category", { length: 20 }).notNull(),
    stayDuration: integer("stay_duration"),
    notes: text("notes"),
    sourceUrl: varchar("source_url"),
    lastUpdated: timestamp("last_updated").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_visa_requirements_passport").on(table.passportCountryCode),
    index("IDX_visa_requirements_destination").on(table.destinationCountryCode),
    uniqueIndex("IDX_visa_requirements_passport_destination").on(
      table.passportCountryCode,
      table.destinationCountryCode
    ),
  ]
);

export const insertVisaRequirementSchema = createInsertSchema(visaRequirements);
export type InsertVisaRequirement = z.infer<typeof insertVisaRequirementSchema>;
export type VisaRequirement = typeof visaRequirements.$inferSelect;
