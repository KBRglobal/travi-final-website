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
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  subscriberStatusEnum,
  campaignStatusEnum,
  emailEventTypeEnum,
  sequenceTriggerEnum,
} from "./enums";
import { users } from "./auth";
import { ConsentLogEntry, SequenceEmail } from "./types";

// ============================================================================
// TYPE RE-EXPORTS (from ./types for backwards compatibility)
// ============================================================================
export type { ConsentLogEntry, SequenceEmail };

// Status types
export type SubscriberStatus =
  | "pending_confirmation"
  | "subscribed"
  | "unsubscribed"
  | "bounced"
  | "complained";

export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

export type EmailEventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed";

// ============================================================================
// NEWSLETTER SUBSCRIBERS TABLE
// ============================================================================

// Newsletter Subscribers table - for coming soon page signups
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  locale: varchar("locale").default("en"),
  languagePreference: varchar("language_preference").default("en"),
  source: varchar("source").default("coming_soon"),
  status: subscriberStatusEnum("status").notNull().default("pending_confirmation"),
  ipAddress: varchar("ip_address"),
  confirmToken: varchar("confirm_token"),
  tags: jsonb("tags").$type<string[]>().default([]),
  interestTags: jsonb("interest_tags").$type<string[]>().default([]),
  preferences: jsonb("preferences")
    .$type<{ frequency: string; categories: string[] }>()
    .default({ frequency: "weekly", categories: [] }),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  lastEmailAt: timestamp("last_email_at"),
  emailsReceived: integer("emails_received").default(0),
  emailsOpened: integer("emails_opened").default(0),
  emailsClicked: integer("emails_clicked").default(0),
  emailsBounced: integer("emails_bounced").default(0),
  bounceReason: text("bounce_reason"),
  lastBounceAt: timestamp("last_bounce_at"),
  consentLog: jsonb("consent_log").$type<ConsentLogEntry[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers);

export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

// ============================================================================
// NEWSLETTER CAMPAIGNS TABLE
// ============================================================================

// Newsletter Campaigns table
export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  subjectHe: varchar("subject_he"),
  previewText: varchar("preview_text"),
  previewTextHe: varchar("preview_text_he"),
  htmlContent: text("html_content").notNull(),
  htmlContentHe: text("html_content_he"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  targetTags: jsonb("target_tags").$type<string[]>(),
  targetLocales: jsonb("target_locales").$type<string[]>(),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  totalRecipients: integer("total_recipients").default(0),
  totalSent: integer("total_sent").default(0),
  totalOpened: integer("total_opened").default(0),
  totalClicked: integer("total_clicked").default(0),
  totalBounced: integer("total_bounced").default(0),
  totalUnsubscribed: integer("total_unsubscribed").default(0),
});

export const insertCampaignSchema = createInsertSchema(newsletterCampaigns);

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type NewsletterCampaign = typeof newsletterCampaigns.$inferSelect;

// ============================================================================
// CAMPAIGN EVENTS TABLE
// ============================================================================

// Campaign Events table (for tracking opens, clicks, bounces, etc.)
export const campaignEvents = pgTable("campaign_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id")
    .notNull()
    .references(() => newsletterCampaigns.id, { onDelete: "cascade" }),
  subscriberId: varchar("subscriber_id").references(() => newsletterSubscribers.id, {
    onDelete: "set null",
  }),
  eventType: emailEventTypeEnum("event_type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignEventSchema = createInsertSchema(campaignEvents);

export type InsertCampaignEvent = z.infer<typeof insertCampaignEventSchema>;
export type CampaignEvent = typeof campaignEvents.$inferSelect;

// ============================================================================
// AUTOMATED SEQUENCES TABLE
// ============================================================================

// Automated Sequences table
export const automatedSequences = pgTable("automated_sequences", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  trigger: sequenceTriggerEnum("trigger").notNull(),
  triggerValue: varchar("trigger_value"),
  emails: jsonb("emails").$type<SequenceEmail[]>().notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type AutomatedSequence = typeof automatedSequences.$inferSelect;
export type InsertAutomatedSequence = typeof automatedSequences.$inferInsert;

// ============================================================================
// EMAIL TEMPLATES TABLE
// ============================================================================

// Email Templates - for newsletter template builder
export const emailTemplates = pgTable(
  "email_templates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: text("description"),
    subject: varchar("subject"),
    htmlContent: text("html_content"),
    plainTextContent: text("plain_text_content"),
    category: varchar("category").default("general"), // welcome, promotional, digest, announcement
    thumbnailUrl: text("thumbnail_url"),
    variables: jsonb("variables").$type<string[]>().default([]),
    isPrebuilt: boolean("is_prebuilt").default(false),
    usageCount: integer("usage_count").default(0),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_email_templates_category").on(table.category)]
);

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// ============================================================================
// EMAIL TEMPLATE BLOCKS TABLE
// ============================================================================

// Email Template Blocks - building blocks for templates
export const emailTemplateBlocks = pgTable(
  "email_template_blocks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    templateId: varchar("template_id")
      .notNull()
      .references(() => emailTemplates.id, { onDelete: "cascade" }),
    type: varchar("type").notNull(), // header, text, image, button, divider, footer
    order: integer("order").notNull().default(0),
    content: jsonb("content").$type<Record<string, any>>().default({}),
    styles: jsonb("styles").$type<Record<string, any>>().default({}),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_email_template_blocks_template").on(table.templateId),
    index("IDX_email_template_blocks_order").on(table.templateId, table.order),
  ]
);

export const insertEmailTemplateBlockSchema = createInsertSchema(emailTemplateBlocks);

export type InsertEmailTemplateBlock = z.infer<typeof insertEmailTemplateBlockSchema>;
export type EmailTemplateBlock = typeof emailTemplateBlocks.$inferSelect;

// ============================================================================
// SUBSCRIBER SEGMENTS TABLE
// ============================================================================

// Subscriber Segments - for segmentation
export const subscriberSegments = pgTable("subscriber_segments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  isDynamic: boolean("is_dynamic").default(true), // auto-update vs static
  subscriberCount: integer("subscriber_count").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriberSegmentSchema = createInsertSchema(subscriberSegments);

export type InsertSubscriberSegment = z.infer<typeof insertSubscriberSegmentSchema>;
export type SubscriberSegment = typeof subscriberSegments.$inferSelect;

// ============================================================================
// SEGMENT CONDITIONS TABLE
// ============================================================================

// Segment Conditions - rules for segments
export const segmentConditions = pgTable(
  "segment_conditions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    segmentId: varchar("segment_id")
      .notNull()
      .references(() => subscriberSegments.id, { onDelete: "cascade" }),
    field: varchar("field").notNull(), // subscription_date, engagement, location, preferences
    operator: varchar("operator").notNull(), // equals, contains, greater_than, less_than
    value: jsonb("value").$type<any>().notNull(),
    logicOperator: varchar("logic_operator").default("AND"), // AND, OR
    order: integer("order").default(0),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [index("IDX_segment_conditions_segment").on(table.segmentId)]
);

export const insertSegmentConditionSchema = createInsertSchema(segmentConditions);

export type InsertSegmentCondition = z.infer<typeof insertSegmentConditionSchema>;
export type SegmentCondition = typeof segmentConditions.$inferSelect;

// ============================================================================
// NEWSLETTER A/B TESTS TABLE
// ============================================================================

// Newsletter A/B Tests - for testing subject lines, content, send times
export const newsletterAbTests = pgTable(
  "newsletter_ab_tests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    campaignId: varchar("campaign_id").references(() => newsletterCampaigns.id),
    testType: varchar("test_type").notNull(), // subject_line, content, send_time
    variantA: jsonb("variant_a")
      .$type<{ subject?: string; content?: string; sendTime?: string }>()
      .notNull(),
    variantB: jsonb("variant_b")
      .$type<{ subject?: string; content?: string; sendTime?: string }>()
      .notNull(),
    splitPercentage: integer("split_percentage").default(50), // % for variant A
    testDurationHours: integer("test_duration_hours").default(24),
    autoSelectWinner: boolean("auto_select_winner").default(true),
    winnerMetric: varchar("winner_metric").default("open_rate"), // open_rate, click_rate
    status: varchar("status").default("running"), // draft, running, completed, paused
    winnerId: varchar("winner_id"), // "a" or "b"
    statsA: jsonb("stats_a")
      .$type<{ sent: number; opened: number; clicked: number; bounced: number }>()
      .default({ sent: 0, opened: 0, clicked: 0, bounced: 0 }),
    statsB: jsonb("stats_b")
      .$type<{ sent: number; opened: number; clicked: number; bounced: number }>()
      .default({ sent: 0, opened: 0, clicked: 0, bounced: 0 }),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_newsletter_ab_tests_status").on(table.status),
    index("IDX_newsletter_ab_tests_campaign").on(table.campaignId),
  ]
);

export const insertNewsletterAbTestSchema = createInsertSchema(newsletterAbTests);

export type InsertNewsletterAbTest = z.infer<typeof insertNewsletterAbTestSchema>;
export type NewsletterAbTest = typeof newsletterAbTests.$inferSelect;

// ============================================================================
// DRIP CAMPAIGNS TABLE
// ============================================================================

// Drip Campaigns - multi-step email sequences
export const dripCampaigns = pgTable("drip_campaigns", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  triggerType: varchar("trigger_type").notNull(), // signup, action, date
  triggerValue: varchar("trigger_value"), // specific action or date
  isActive: boolean("is_active").default(true),
  enrollmentCount: integer("enrollment_count").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDripCampaignSchema = createInsertSchema(dripCampaigns);

export type InsertDripCampaign = z.infer<typeof insertDripCampaignSchema>;
export type DripCampaign = typeof dripCampaigns.$inferSelect;

// ============================================================================
// DRIP CAMPAIGN STEPS TABLE
// ============================================================================

// Drip Campaign Steps - individual emails in a sequence
export const dripCampaignSteps = pgTable(
  "drip_campaign_steps",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: varchar("campaign_id")
      .notNull()
      .references(() => dripCampaigns.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    delayAmount: integer("delay_amount").notNull(), // number of hours/days/weeks
    delayUnit: varchar("delay_unit").notNull().default("days"), // hours, days, weeks
    subject: varchar("subject").notNull(),
    htmlContent: text("html_content").notNull(),
    plainTextContent: text("plain_text_content"),
    skipConditions: jsonb("skip_conditions").$type<any[]>().default([]),
    exitConditions: jsonb("exit_conditions").$type<any[]>().default([]),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_drip_campaign_steps_campaign").on(table.campaignId),
    index("IDX_drip_campaign_steps_order").on(table.campaignId, table.stepNumber),
  ]
);

export const insertDripCampaignStepSchema = createInsertSchema(dripCampaignSteps);

export type InsertDripCampaignStep = z.infer<typeof insertDripCampaignStepSchema>;
export type DripCampaignStep = typeof dripCampaignSteps.$inferSelect;

// ============================================================================
// DRIP CAMPAIGN ENROLLMENTS TABLE
// ============================================================================

// Drip Campaign Enrollments - track user progress through campaigns
export const dripCampaignEnrollments = pgTable(
  "drip_campaign_enrollments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    campaignId: varchar("campaign_id")
      .notNull()
      .references(() => dripCampaigns.id, { onDelete: "cascade" }),
    subscriberId: varchar("subscriber_id")
      .notNull()
      .references(() => newsletterSubscribers.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").default(0),
    status: varchar("status").default("active"), // active, completed, exited, paused
    enrolledAt: timestamp("enrolled_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    nextEmailAt: timestamp("next_email_at"),
    metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  },
  table => [
    index("IDX_drip_enrollments_campaign").on(table.campaignId),
    index("IDX_drip_enrollments_subscriber").on(table.subscriberId),
    index("IDX_drip_enrollments_next_email").on(table.nextEmailAt),
    uniqueIndex("IDX_drip_enrollments_unique").on(table.campaignId, table.subscriberId),
  ]
);

export const insertDripCampaignEnrollmentSchema = createInsertSchema(dripCampaignEnrollments);

export type InsertDripCampaignEnrollment = z.infer<typeof insertDripCampaignEnrollmentSchema>;
export type DripCampaignEnrollment = typeof dripCampaignEnrollments.$inferSelect;

// ============================================================================
// BEHAVIORAL TRIGGERS TABLE
// ============================================================================

// Behavioral Triggers - event-based email automation
export const behavioralTriggers = pgTable(
  "behavioral_triggers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: text("description"),
    eventType: varchar("event_type").notNull(), // page_view, content_read, search, cart_abandon, inactivity
    eventConditions: jsonb("event_conditions").$type<Record<string, any>>().default({}),
    emailTemplateId: varchar("email_template_id").references(() => emailTemplates.id),
    emailSubject: varchar("email_subject").notNull(),
    emailContent: text("email_content").notNull(),
    cooldownHours: integer("cooldown_hours").default(24), // prevent spam
    isActive: boolean("is_active").default(true),
    triggerCount: integer("trigger_count").default(0),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_behavioral_triggers_event_type").on(table.eventType),
    index("IDX_behavioral_triggers_active").on(table.isActive),
  ]
);

export const insertBehavioralTriggerSchema = createInsertSchema(behavioralTriggers);

export type InsertBehavioralTrigger = z.infer<typeof insertBehavioralTriggerSchema>;
export type BehavioralTrigger = typeof behavioralTriggers.$inferSelect;
