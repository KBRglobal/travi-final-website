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
import { userRoleEnum } from "./enums";

// ============================================================================
// USERS TABLE
// ============================================================================

// Users table - with username/password auth and role-based permissions
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"),
  email: varchar("email").unique(),
  name: varchar("name"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("editor"),
  isActive: boolean("is_active").notNull().default(true),
  totpSecret: varchar("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  totpRecoveryCodes: jsonb("totp_recovery_codes").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// UpsertUser type for Replit Auth
export type UpsertUser = typeof users.$inferInsert;

export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ============================================================================
// SESSION STORAGE TABLE
// ============================================================================

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  table => [index("IDX_session_expire").on(table.expire)]
);

export const insertSessionSchema = createInsertSchema(sessions);
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// ============================================================================
// OTP CODES TABLE
// ============================================================================

// OTP codes table for passwordless email login
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes);
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;

// ============================================================================
// PRE-AUTH TOKENS TABLE
// ============================================================================

// Pre-auth tokens table for MFA flow (persisted to survive server restarts)
export const preAuthTokens = pgTable(
  "pre_auth_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    tokenHash: varchar("token_hash").notNull().unique(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    username: varchar("username").notNull(),
    nonce: varchar("nonce").notNull(),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    riskScore: integer("risk_score"),
    deviceFingerprint: text("device_fingerprint"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_pre_auth_token_hash").on(table.tokenHash),
    index("IDX_pre_auth_expires").on(table.expiresAt),
  ]
);

export const insertPreAuthTokenSchema = createInsertSchema(preAuthTokens);
export type InsertPreAuthToken = z.infer<typeof insertPreAuthTokenSchema>;
export type PreAuthToken = typeof preAuthTokens.$inferSelect;

// ============================================================================
// TWO-FACTOR AUTHENTICATION SECRETS TABLE
// ============================================================================

export const twoFactorSecrets = pgTable(
  "two_factor_secrets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    secret: varchar("secret").notNull(),
    backupCodes: jsonb("backup_codes").$type<string[]>().notNull().default([]),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_2fa_user").on(table.userId)]
);

export type TwoFactorSecret = typeof twoFactorSecrets.$inferSelect;
export type InsertTwoFactorSecret = typeof twoFactorSecrets.$inferInsert;

// ============================================================================
// MAGIC LINK AUTHENTICATION TABLE
// ============================================================================

export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: varchar("email").notNull(),
    token: varchar("token").notNull().unique(),
    used: boolean("used").notNull().default(false),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_magic_link_tokens_email").on(table.email),
    index("IDX_magic_link_tokens_token").on(table.token),
  ]
);

export const insertMagicLinkTokenSchema = createInsertSchema(magicLinkTokens);
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = z.infer<typeof insertMagicLinkTokenSchema>;

// ============================================================================
// EMAIL OTP AUTHENTICATION TABLE
// ============================================================================

export const emailOtpCodes = pgTable(
  "email_otp_codes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: varchar("email").notNull(),
    codeHash: varchar("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [index("IDX_email_otp_codes_email").on(table.email)]
);

export const insertEmailOtpCodeSchema = createInsertSchema(emailOtpCodes);
export type EmailOtpCode = typeof emailOtpCodes.$inferSelect;
export type InsertEmailOtpCode = z.infer<typeof insertEmailOtpCodeSchema>;
