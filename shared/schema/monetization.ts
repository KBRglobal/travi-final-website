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
  premiumAccessTypeEnum,
  purchaseStatusEnum,
  businessTypeEnum,
  businessTierEnum,
  businessStatusEnum,
  leadTypeEnum,
  leadStatusEnum,
  propertyLeadStatusEnum,
  partnerStatusEnum,
  payoutStatusEnum,
} from "./enums";

// ============================================================================
// PREMIUM CONTENT TABLE
// ============================================================================

export const premiumContent = pgTable(
  "premium_content",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull().unique(),
    isPremium: boolean("is_premium").notNull().default(true),
    previewPercentage: integer("preview_percentage").notNull().default(20),
    price: integer("price").notNull(), // In cents
    currency: varchar("currency").notNull().default("USD"),
    accessType: premiumAccessTypeEnum("access_type").notNull().default("one-time"),
    subscriptionTier: varchar("subscription_tier"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_premium_content_id").on(table.contentId)]
);

export const insertPremiumContentSchema = createInsertSchema(premiumContent);

export type PremiumContentRow = typeof premiumContent.$inferSelect;
export type InsertPremiumContent = typeof premiumContent.$inferInsert;

// ============================================================================
// CONTENT PURCHASES TABLE
// ============================================================================

export const contentPurchases = pgTable(
  "content_purchases",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    contentId: varchar("content_id").notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency").notNull().default("USD"),
    paymentMethod: varchar("payment_method").notNull(),
    paymentId: varchar("payment_id"),
    status: purchaseStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
  },
  table => [
    index("IDX_purchases_user").on(table.userId),
    index("IDX_purchases_content").on(table.contentId),
  ]
);

export const insertContentPurchaseSchema = createInsertSchema(contentPurchases);

export type ContentPurchase = typeof contentPurchases.$inferSelect;
export type InsertContentPurchase = typeof contentPurchases.$inferInsert;

// ============================================================================
// BUSINESS LISTINGS TABLE
// ============================================================================

export const businessListings = pgTable(
  "business_listings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    businessName: varchar("business_name").notNull(),
    businessType: businessTypeEnum("business_type").notNull(),
    contactEmail: varchar("contact_email").notNull(),
    contactPhone: varchar("contact_phone"),
    website: varchar("website"),
    contentIds: jsonb("content_ids").$type<string[]>().notNull().default([]),
    tier: businessTierEnum("tier").notNull().default("basic"),
    status: businessStatusEnum("status").notNull().default("pending"),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    monthlyPrice: integer("monthly_price").notNull().default(0),
    startDate: timestamp("start_date").notNull().defaultNow(),
    endDate: timestamp("end_date"),
    impressions: integer("impressions").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    leads: integer("leads").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    settings: jsonb("settings")
      .$type<{
        showPhone: boolean;
        showEmail: boolean;
        enableLeadForm: boolean;
        enableBookingWidget: boolean;
        featuredPlacement: boolean;
      }>()
      .notNull()
      .default({
        showPhone: true,
        showEmail: true,
        enableLeadForm: true,
        enableBookingWidget: false,
        featuredPlacement: false,
      }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_business_status").on(table.status),
    index("IDX_business_type").on(table.businessType),
  ]
);

export const insertBusinessListingSchema = createInsertSchema(businessListings);

export type BusinessListing = typeof businessListings.$inferSelect;
export type InsertBusinessListing = typeof businessListings.$inferInsert;

// ============================================================================
// LEADS TABLE
// ============================================================================

export const leads = pgTable(
  "leads",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    businessId: varchar("business_id")
      .notNull()
      .references(() => businessListings.id, { onDelete: "cascade" }),
    contentId: varchar("content_id").notNull(),
    type: leadTypeEnum("type").notNull(),
    name: varchar("name").notNull(),
    email: varchar("email").notNull(),
    phone: varchar("phone"),
    message: text("message"),
    checkIn: timestamp("check_in"),
    checkOut: timestamp("check_out"),
    guests: integer("guests"),
    budget: varchar("budget"),
    source: varchar("source").notNull(),
    status: leadStatusEnum("status").notNull().default("new"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_leads_business").on(table.businessId),
    index("IDX_leads_status").on(table.status),
  ]
);

export const insertLeadSchema = createInsertSchema(leads);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ============================================================================
// PROPERTY LEADS TABLE
// ============================================================================

export const propertyLeads = pgTable("property_leads", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  name: varchar("name").notNull(),
  phone: varchar("phone"),
  propertyType: varchar("property_type"),
  budget: varchar("budget"),
  paymentMethod: varchar("payment_method"),
  preferredAreas: text("preferred_areas").array(),
  timeline: varchar("timeline"),
  message: text("message"),
  source: varchar("source").default("off-plan-form"),
  status: propertyLeadStatusEnum("status").notNull().default("new"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  consentGiven: boolean("consent_given").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  notes: text("notes"),
});

export const insertPropertyLeadSchema = createInsertSchema(propertyLeads);

export type InsertPropertyLead = z.infer<typeof insertPropertyLeadSchema>;
export type PropertyLead = typeof propertyLeads.$inferSelect;

// ============================================================================
// PARTNERS TABLE
// ============================================================================

export const partners = pgTable(
  "partners",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: varchar("email").notNull().unique(),
    companyName: text("company_name"),
    website: text("website"),
    commissionRate: integer("commission_rate").notNull(),
    status: partnerStatusEnum("status").notNull().default("pending"),
    trackingCode: varchar("tracking_code").notNull().unique(),
    paymentDetails: jsonb("payment_details").$type<Record<string, unknown>>(),
    totalEarnings: integer("total_earnings").default(0),
    totalClicks: integer("total_clicks").default(0),
    totalConversions: integer("total_conversions").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_partners_status").on(table.status),
    index("IDX_partners_tracking").on(table.trackingCode),
  ]
);

export const insertPartnerSchema = createInsertSchema(partners);

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;

// ============================================================================
// PAYOUTS TABLE
// ============================================================================

export const payouts = pgTable(
  "payouts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    partnerId: varchar("partner_id").references(() => partners.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    currency: varchar("currency").notNull().default("USD"),
    status: payoutStatusEnum("status").notNull().default("pending"),
    method: text("method"),
    referenceId: text("reference_id"),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_payouts_partner").on(table.partnerId),
    index("IDX_payouts_status").on(table.status),
  ]
);

export const insertPayoutSchema = createInsertSchema(payouts);

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
