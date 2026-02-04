import { pgTable, text, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { referralStatusEnum, commissionStatusEnum } from "./enums";
import { users } from "./auth";
import { newsletterSubscribers } from "./newsletter";

// ============================================================================
// REFERRAL/AFFILIATE PROGRAM SYSTEM
// ============================================================================

// ============================================================================
// REFERRAL CODES TABLE
// ============================================================================

// Referral codes table - unique codes for partners/users
export const referralCodes = pgTable(
  "referral_codes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: varchar("code").notNull().unique(),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    name: varchar("name"),
    description: text("description"),
    commissionRate: integer("commission_rate").notNull().default(10), // Percentage (e.g., 10 = 10%)
    isActive: boolean("is_active").notNull().default(true),
    totalClicks: integer("total_clicks").default(0),
    totalSignups: integer("total_signups").default(0),
    totalConversions: integer("total_conversions").default(0),
    totalCommission: integer("total_commission").default(0), // In cents
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_referral_codes_user").on(table.userId),
    index("idx_referral_codes_code").on(table.code),
    index("idx_referral_codes_active").on(table.isActive),
  ]
);

export const insertReferralCodeSchema = createInsertSchema(referralCodes);
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;

// ============================================================================
// REFERRAL CLICKS TABLE
// ============================================================================

// Referral clicks - tracks when referral links are clicked
export const referralClicks = pgTable(
  "referral_clicks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    referralCodeId: varchar("referral_code_id")
      .notNull()
      .references(() => referralCodes.id, { onDelete: "cascade" }),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    referer: text("referer"),
    landingPage: text("landing_page"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("idx_referral_clicks_code").on(table.referralCodeId),
    index("idx_referral_clicks_created").on(table.createdAt),
  ]
);

export type ReferralClick = typeof referralClicks.$inferSelect;

// ============================================================================
// REFERRALS TABLE
// ============================================================================

// Referrals table - tracks signups from referral codes
export const referrals = pgTable(
  "referrals",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    referralCodeId: varchar("referral_code_id")
      .notNull()
      .references(() => referralCodes.id, { onDelete: "cascade" }),
    subscriberId: varchar("subscriber_id").references(() => newsletterSubscribers.id, {
      onDelete: "set null",
    }),
    email: varchar("email"),
    status: referralStatusEnum("status").notNull().default("pending"),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    convertedAt: timestamp("converted_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_referrals_code").on(table.referralCodeId),
    index("idx_referrals_subscriber").on(table.subscriberId),
    index("idx_referrals_status").on(table.status),
    index("idx_referrals_created").on(table.createdAt),
  ]
);

export const insertReferralSchema = createInsertSchema(referrals);
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// ============================================================================
// REFERRAL COMMISSIONS TABLE
// ============================================================================

// Referral commissions - tracks commission calculations
export const referralCommissions = pgTable(
  "referral_commissions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    referralCodeId: varchar("referral_code_id")
      .notNull()
      .references(() => referralCodes.id, { onDelete: "cascade" }),
    referralId: varchar("referral_id").references(() => referrals.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(), // In cents
    description: text("description"),
    status: commissionStatusEnum("status").notNull().default("pending"),
    approvedAt: timestamp("approved_at"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_commissions_code").on(table.referralCodeId),
    index("idx_commissions_referral").on(table.referralId),
    index("idx_commissions_status").on(table.status),
  ]
);

export const insertReferralCommissionSchema = createInsertSchema(referralCommissions);
export type InsertReferralCommission = z.infer<typeof insertReferralCommissionSchema>;
export type ReferralCommission = typeof referralCommissions.$inferSelect;

// ============================================================================
// RELATIONS
// ============================================================================

// Relations for referral system
export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  user: one(users, { fields: [referralCodes.userId], references: [users.id] }),
  referrals: many(referrals),
  clicks: many(referralClicks),
  commissions: many(referralCommissions),
}));

export const referralClicksRelations = relations(referralClicks, ({ one }) => ({
  referralCode: one(referralCodes, {
    fields: [referralClicks.referralCodeId],
    references: [referralCodes.id],
  }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referralCode: one(referralCodes, {
    fields: [referrals.referralCodeId],
    references: [referralCodes.id],
  }),
  subscriber: one(newsletterSubscribers, {
    fields: [referrals.subscriberId],
    references: [newsletterSubscribers.id],
  }),
}));

export const referralCommissionsRelations = relations(referralCommissions, ({ one }) => ({
  referralCode: one(referralCodes, {
    fields: [referralCommissions.referralCodeId],
    references: [referralCodes.id],
  }),
  referral: one(referrals, {
    fields: [referralCommissions.referralId],
    references: [referrals.id],
  }),
}));
