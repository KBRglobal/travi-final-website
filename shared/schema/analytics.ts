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
import { auditActionTypeEnum, auditEntityTypeEnum, analyticsEventTypeEnum } from "./enums";
import { users } from "./auth";
import { contents } from "./content-base";

// ============================================================================
// CONTENT VIEWS TABLE
// ============================================================================

// Content Views table - for analytics tracking
export const contentViews = pgTable("content_views", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id")
    .notNull()
    .references(() => contents.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow(),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  sessionId: varchar("session_id"),
  country: varchar("country"),
  city: varchar("city"),
});

export const insertContentViewSchema = createInsertSchema(contentViews);
export type InsertContentView = z.infer<typeof insertContentViewSchema>;
export type ContentView = typeof contentViews.$inferSelect;

// ============================================================================
// AUDIT LOGS TABLE
// ============================================================================

// Audit Logs table - immutable append-only logging
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    userName: text("user_name"),
    userRole: text("user_role"),
    actionType: auditActionTypeEnum("action_type").notNull(),
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: varchar("entity_id"),
    description: text("description").notNull(),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
  },
  table => [
    index("IDX_audit_logs_timestamp").on(table.timestamp),
    index("IDX_audit_logs_user_id").on(table.userId),
    index("IDX_audit_logs_entity").on(table.entityType, table.entityId),
  ]
);

// Audit log insert schema and types
export const insertAuditLogSchema = createInsertSchema(auditLogs);
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ============================================================================
// RATE LIMITS TABLE
// ============================================================================

// Rate Limits table - for persistent rate limiting (especially AI usage)
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    key: varchar("key").notNull().unique(), // e.g., "ai_daily:user123"
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_rate_limits_key").on(table.key),
    index("IDX_rate_limits_reset").on(table.resetAt),
  ]
);

export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = typeof rateLimits.$inferInsert;

// ============================================================================
// ANALYTICS EVENTS TABLE
// ============================================================================

// Analytics Events table - for customer journey tracking
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull(),
    visitorId: varchar("visitor_id").notNull(),
    eventType: analyticsEventTypeEnum("event_type").notNull(),
    eventName: varchar("event_name"),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    pageUrl: text("page_url"),
    pagePath: varchar("page_path"),
    pageTitle: varchar("page_title"),
    referrer: text("referrer"),
    // Element details
    elementId: varchar("element_id"),
    elementClass: varchar("element_class"),
    elementText: text("element_text"),
    elementHref: text("element_href"),
    // Position data
    scrollDepth: integer("scroll_depth"),
    viewportWidth: integer("viewport_width"),
    viewportHeight: integer("viewport_height"),
    clickX: integer("click_x"),
    clickY: integer("click_y"),
    // Session data
    timeOnPage: integer("time_on_page"),
    pageLoadTime: integer("page_load_time"),
    isNewSession: boolean("is_new_session"),
    isNewVisitor: boolean("is_new_visitor"),
    // User context
    userAgent: text("user_agent"),
    deviceType: varchar("device_type"),
    browser: varchar("browser"),
    os: varchar("os"),
    language: varchar("language"),
    country: varchar("country"),
    city: varchar("city"),
    // Content context
    contentId: varchar("content_id"),
    contentType: varchar("content_type"),
    contentTitle: varchar("content_title"),
    // UTM parameters
    utmSource: varchar("utm_source"),
    utmMedium: varchar("utm_medium"),
    utmCampaign: varchar("utm_campaign"),
    utmTerm: varchar("utm_term"),
    utmContent: varchar("utm_content"),
    // Custom data
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  table => [
    index("IDX_analytics_session").on(table.sessionId),
    index("IDX_analytics_visitor").on(table.visitorId),
    index("IDX_analytics_timestamp").on(table.timestamp),
    index("IDX_analytics_event_type").on(table.eventType),
    index("IDX_analytics_page_path").on(table.pagePath),
  ]
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// ============================================================================
// REALTIME SESSIONS TABLE
// ============================================================================

// Realtime Sessions - active visitor tracking
export const realtimeSessions = pgTable(
  "realtime_sessions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull().unique(),
    visitorId: varchar("visitor_id").notNull(),
    currentPage: varchar("current_page"),
    currentPageTitle: varchar("current_page_title"),
    referrer: text("referrer"),
    deviceType: varchar("device_type"),
    browser: varchar("browser"),
    os: varchar("os"),
    country: varchar("country"),
    city: varchar("city"),
    isActive: boolean("is_active").default(true),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    startedAt: timestamp("started_at").defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  },
  table => [
    index("IDX_realtime_sessions_active").on(table.isActive),
    index("IDX_realtime_sessions_visitor").on(table.visitorId),
    index("IDX_realtime_sessions_last_activity").on(table.lastActivityAt),
  ]
);

export type RealtimeSession = typeof realtimeSessions.$inferSelect;
export type InsertRealtimeSession = typeof realtimeSessions.$inferInsert;

// ============================================================================
// USER JOURNEYS TABLE
// ============================================================================

// User Journeys - session-based path tracking
export const userJourneys = pgTable(
  "user_journeys",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sessionId: varchar("session_id").notNull().unique(),
    visitorId: varchar("visitor_id").notNull(),
    startPage: varchar("start_page").notNull(),
    endPage: varchar("end_page"),
    touchpointCount: integer("touchpoint_count").default(0),
    durationSeconds: integer("duration_seconds").default(0),
    converted: boolean("converted").default(false),
    conversionType: varchar("conversion_type"),
    conversionValue: integer("conversion_value"),
    utmSource: varchar("utm_source"),
    utmMedium: varchar("utm_medium"),
    utmCampaign: varchar("utm_campaign"),
    deviceType: varchar("device_type"),
    startedAt: timestamp("started_at").defaultNow(),
    endedAt: timestamp("ended_at"),
  },
  table => [
    index("IDX_user_journeys_visitor").on(table.visitorId),
    index("IDX_user_journeys_started_at").on(table.startedAt),
    index("IDX_user_journeys_converted").on(table.converted),
  ]
);

export type UserJourney = typeof userJourneys.$inferSelect;
export type InsertUserJourney = typeof userJourneys.$inferInsert;

// ============================================================================
// JOURNEY TOUCHPOINTS TABLE
// ============================================================================

// Journey Touchpoints - individual steps in a journey
export const journeyTouchpoints = pgTable(
  "journey_touchpoints",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    journeyId: varchar("journey_id")
      .notNull()
      .references(() => userJourneys.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    pageUrl: varchar("page_url").notNull(),
    pageTitle: varchar("page_title"),
    eventType: varchar("event_type"), // page_view, click, scroll, form_submit
    timeOnPage: integer("time_on_page"), // seconds
    scrollDepth: integer("scroll_depth"), // percentage
    interactionData: jsonb("interaction_data").$type<Record<string, any>>().default({}),
    timestamp: timestamp("timestamp").defaultNow(),
  },
  table => [
    index("IDX_journey_touchpoints_journey").on(table.journeyId),
    index("IDX_journey_touchpoints_step").on(table.journeyId, table.stepNumber),
  ]
);

export type JourneyTouchpoint = typeof journeyTouchpoints.$inferSelect;
export type InsertJourneyTouchpoint = typeof journeyTouchpoints.$inferInsert;

// ============================================================================
// CONVERSION FUNNELS TABLE
// ============================================================================

// Conversion Funnels - define and track conversion funnels
export const conversionFunnels = pgTable("conversion_funnels", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  totalEntries: integer("total_entries").default(0),
  totalConversions: integer("total_conversions").default(0),
  conversionRate: integer("conversion_rate").default(0), // percentage * 100
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ConversionFunnel = typeof conversionFunnels.$inferSelect;
export type InsertConversionFunnel = typeof conversionFunnels.$inferInsert;

// ============================================================================
// FUNNEL STEPS TABLE
// ============================================================================

// Funnel Steps - steps in a conversion funnel
export const funnelSteps = pgTable(
  "funnel_steps",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    funnelId: varchar("funnel_id")
      .notNull()
      .references(() => conversionFunnels.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    name: varchar("name").notNull(),
    matchType: varchar("match_type").default("url"), // url, event, custom
    matchValue: varchar("match_value").notNull(),
    entryCount: integer("entry_count").default(0),
    exitCount: integer("exit_count").default(0),
    conversionCount: integer("conversion_count").default(0),
    dropoffRate: integer("dropoff_rate").default(0), // percentage * 100
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_funnel_steps_funnel").on(table.funnelId),
    index("IDX_funnel_steps_order").on(table.funnelId, table.stepNumber),
  ]
);

export type FunnelStep = typeof funnelSteps.$inferSelect;
export type InsertFunnelStep = typeof funnelSteps.$inferInsert;

// ============================================================================
// FUNNEL EVENTS TABLE
// ============================================================================

// Funnel Events - track individual funnel progression events
export const funnelEvents = pgTable(
  "funnel_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    funnelId: varchar("funnel_id")
      .notNull()
      .references(() => conversionFunnels.id, { onDelete: "cascade" }),
    sessionId: varchar("session_id").notNull(),
    visitorId: varchar("visitor_id").notNull(),
    currentStep: integer("current_step").notNull(),
    completed: boolean("completed").default(false),
    droppedAtStep: integer("dropped_at_step"),
    startedAt: timestamp("started_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  },
  table => [
    index("IDX_funnel_events_funnel").on(table.funnelId),
    index("IDX_funnel_events_session").on(table.sessionId),
    index("IDX_funnel_events_visitor").on(table.visitorId),
  ]
);

export type FunnelEvent = typeof funnelEvents.$inferSelect;
export type InsertFunnelEvent = typeof funnelEvents.$inferInsert;

// ============================================================================
// COHORTS TABLE
// ============================================================================

// Cohorts - user grouping for cohort analysis
export const cohorts = pgTable("cohorts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  cohortType: varchar("cohort_type").notNull(), // signup_date, first_purchase, behavior
  dateRange: jsonb("date_range").$type<{ start: string; end: string }>().notNull(),
  criteria: jsonb("criteria").$type<Record<string, any>>().default({}),
  userCount: integer("user_count").default(0),
  retentionData: jsonb("retention_data").$type<Record<string, any>>().default({}),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = typeof cohorts.$inferInsert;
