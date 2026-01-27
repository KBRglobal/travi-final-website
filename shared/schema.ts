import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, pgEnum, index, uniqueIndex, serial, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const contentTypeEnum = pgEnum("content_type", ["attraction", "hotel", "article", "dining", "restaurant", "district", "transport", "event", "itinerary", "landing_page", "case_study", "off_plan"]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "in_review", "reviewed", "approved", "scheduled", "published", "archived"]);
export const articleCategoryEnum = pgEnum("article_category", ["attractions", "hotels", "food", "transport", "events", "tips", "news", "shopping"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "editor", "author", "contributor", "viewer"]);
export const viralPotentialEnum = pgEnum("viral_potential", ["1", "2", "3", "4", "5"]);
export const topicTypeEnum = pgEnum("topic_type", ["trending", "evergreen", "seasonal"]);
export const topicFormatEnum = pgEnum("topic_format", ["video_tour", "photo_gallery", "pov_video", "cost_breakdown", "lifestyle_vlog", "documentary", "explainer", "comparison", "walking_tour", "food_tour", "interview", "tutorial", "asmr", "drone_footage", "night_photography", "infographic", "reaction_video", "challenge", "list_video", "guide", "review"]);

// Content intent enum for SEO classification
export const contentIntentEnum = pgEnum("content_intent", ["informational", "commercial", "transactional", "navigational"]);
export const topicCategoryEnum = pgEnum("topic_category", ["luxury_lifestyle", "food_dining", "bizarre_unique", "experiences_activities", "money_cost", "expat_living", "dark_side", "myth_busting", "comparisons", "records_superlatives", "future_development", "seasonal_events", "practical_tips"]);

// Role-based permissions
export const ROLE_PERMISSIONS = {
  admin: {
    canCreate: true,
    canEdit: true,
    canEditOwn: true,
    canDelete: true,
    canPublish: true,
    canSubmitForReview: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewAnalytics: true,
    canViewAuditLogs: true,
    canAccessMediaLibrary: true,
    canAccessAffiliates: true,
    canViewAll: true,
    canEditPageSeo: true, // Dedicated permission for page SEO management (Field Ownership enforcement)
  },
  editor: {
    canCreate: true,
    canEdit: true,
    canEditOwn: true,
    canDelete: false,
    canPublish: true,
    canSubmitForReview: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewAnalytics: true,
    canViewAuditLogs: false,
    canAccessMediaLibrary: true,
    canAccessAffiliates: true,
    canViewAll: true,
    canEditPageSeo: true, // Editors can manage page SEO
  },
  author: {
    canCreate: true,
    canEdit: false,
    canEditOwn: true,
    canDelete: false,
    canPublish: false,
    canSubmitForReview: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewAnalytics: false,
    canViewAuditLogs: false,
    canAccessMediaLibrary: false,
    canAccessAffiliates: false,
    canViewAll: false,
    canEditPageSeo: false, // Authors cannot manage page SEO
  },
  contributor: {
    canCreate: true,
    canEdit: false,
    canEditOwn: true,
    canDelete: false,
    canPublish: false,
    canSubmitForReview: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewAnalytics: false,
    canViewAuditLogs: false,
    canAccessMediaLibrary: false,
    canAccessAffiliates: false,
    canViewAll: false,
    canEditPageSeo: false, // Contributors cannot manage page SEO
  },
  viewer: {
    canCreate: false,
    canEdit: false,
    canEditOwn: false,
    canDelete: false,
    canPublish: false,
    canSubmitForReview: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewAnalytics: false,
    canViewAuditLogs: false,
    canAccessMediaLibrary: false,
    canAccessAffiliates: false,
    canViewAll: true,
    canEditPageSeo: false, // Viewers cannot manage page SEO
  },
} as const;

export type UserRole = "admin" | "editor" | "author" | "contributor" | "viewer";
export type RolePermissions = typeof ROLE_PERMISSIONS[UserRole];

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// OTP codes table for passwordless email login
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes);

export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;

// Pre-auth tokens table for MFA flow (persisted to survive server restarts)
export const preAuthTokens = pgTable("pre_auth_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenHash: varchar("token_hash").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  username: varchar("username").notNull(),
  nonce: varchar("nonce").notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  riskScore: integer("risk_score"),
  deviceFingerprint: text("device_fingerprint"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_pre_auth_token_hash").on(table.tokenHash),
  index("IDX_pre_auth_expires").on(table.expiresAt),
]);

export const insertPreAuthTokenSchema = createInsertSchema(preAuthTokens);
export type InsertPreAuthToken = z.infer<typeof insertPreAuthTokenSchema>;
export type PreAuthToken = typeof preAuthTokens.$inferSelect;

// Users table - with username/password auth and role-based permissions
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Content table - base table for all content types
export const contents = pgTable("contents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: contentTypeEnum("type").notNull(),
  status: contentStatusEnum("status").notNull().default("draft"),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  primaryKeyword: text("primary_keyword"),
  secondaryKeywords: jsonb("secondary_keywords").$type<string[]>().default([]),
  lsiKeywords: jsonb("lsi_keywords").$type<string[]>().default([]),
  // CMS Contract: Hero image (hero section ONLY)
  heroImage: text("hero_image"),
  heroImageAlt: text("hero_image_alt"),
  // CMS Contract: Card image (grids/listings ONLY, never reuse hero)
  cardImage: text("card_image"),
  cardImageAlt: text("card_image_alt"),
  // CMS Contract: Summary for card preview (200 chars max for Items)
  summary: text("summary"),
  blocks: jsonb("blocks").$type<ContentBlock[]>().default([]),
  seoSchema: jsonb("seo_schema").$type<Record<string, unknown>>(),
  seoScore: integer("seo_score"),
  // AEO (Answer Engine Optimization) fields
  answerCapsule: text("answer_capsule"), // 40-60 word summary for AI extraction
  aeoScore: integer("aeo_score"), // AEO optimization score 0-100
  wordCount: integer("word_count").default(0),
  viewCount: integer("view_count").default(0),
  authorId: varchar("author_id").references(() => users.id),
  writerId: varchar("writer_id").references(() => aiWriters.id),
  generatedByAI: boolean("generated_by_ai").default(false),
  writerVoiceScore: integer("writer_voice_score"),
  // SEO hierarchy and intent fields
  intent: contentIntentEnum("intent"),
  parentId: varchar("parent_id"),
  canonicalContentId: varchar("canonical_content_id"),
  // Octopus integration
  octopusJobId: varchar("octopus_job_id"),
  sourceHash: varchar("source_hash"),
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  scheduledAt: timestamp("scheduled_at"),
  publishedAt: timestamp("published_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_contents_status").on(table.status),
  index("IDX_contents_type").on(table.type),
  index("IDX_contents_type_status").on(table.type, table.status),
  index("IDX_contents_author").on(table.authorId),
  index("IDX_contents_published_at").on(table.publishedAt),
  index("IDX_contents_writer").on(table.writerId),
  index("IDX_contents_parent").on(table.parentId),
  index("IDX_contents_octopus_job").on(table.octopusJobId),
]);

// Attractions specific data
export const attractions = pgTable("attractions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  destinationId: varchar("destination_id"),
  location: text("location"),
  category: text("category"),
  priceFrom: text("price_from"),
  duration: text("duration"),
  targetAudience: jsonb("target_audience").$type<string[]>().default([]),
  primaryCta: text("primary_cta"),
  introText: text("intro_text"),
  expandedIntroText: text("expanded_intro_text"),
  quickInfoBar: jsonb("quick_info_bar").$type<QuickInfoItem[]>().default([]),
  highlights: jsonb("highlights").$type<HighlightItem[]>().default([]),
  ticketInfo: jsonb("ticket_info").$type<TicketInfoItem[]>().default([]),
  essentialInfo: jsonb("essential_info").$type<EssentialInfoItem[]>().default([]),
  visitorTips: jsonb("visitor_tips").$type<string[]>().default([]),
  gallery: jsonb("gallery").$type<GalleryImage[]>().default([]),
  experienceSteps: jsonb("experience_steps").$type<ExperienceItem[]>().default([]),
  insiderTips: jsonb("insider_tips").$type<string[]>().default([]),
  faq: jsonb("faq").$type<FaqItem[]>().default([]),
  relatedAttractions: jsonb("related_attractions").$type<RelatedItem[]>().default([]),
  trustSignals: jsonb("trust_signals").$type<string[]>().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Hotels specific data
export const hotels = pgTable("hotels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  destinationId: varchar("destination_id"),
  location: text("location"),
  starRating: integer("star_rating"),
  numberOfRooms: integer("number_of_rooms"),
  amenities: jsonb("amenities").$type<string[]>().default([]),
  targetAudience: jsonb("target_audience").$type<string[]>().default([]),
  primaryCta: text("primary_cta"),
  quickInfoBar: jsonb("quick_info_bar").$type<QuickInfoItem[]>().default([]),
  highlights: jsonb("highlights").$type<HighlightItem[]>().default([]),
  roomTypes: jsonb("room_types").$type<RoomTypeItem[]>().default([]),
  essentialInfo: jsonb("essential_info").$type<EssentialInfoItem[]>().default([]),
  diningPreview: jsonb("dining_preview").$type<DiningItem[]>().default([]),
  activities: jsonb("activities").$type<string[]>().default([]),
  travelerTips: jsonb("traveler_tips").$type<string[]>().default([]),
  faq: jsonb("faq").$type<FaqItem[]>().default([]),
  locationNearby: jsonb("location_nearby").$type<NearbyItem[]>().default([]),
  relatedHotels: jsonb("related_hotels").$type<RelatedItem[]>().default([]),
  photoGallery: jsonb("photo_gallery").$type<GalleryImage[]>().default([]),
  trustSignals: jsonb("trust_signals").$type<string[]>().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Articles specific data
// CMS Contract: News Article - editorial content, no CTAs
export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  category: articleCategoryEnum("category"),
  urgencyLevel: text("urgency_level"),
  targetAudience: jsonb("target_audience").$type<string[]>().default([]),
  personality: text("personality"),
  tone: text("tone"),
  // CMS Contract: Featured image (editorial style, NOT hero style)
  featuredImage: text("featured_image"),
  featuredImageAlt: text("featured_image_alt"),
  // CMS Contract: Excerpt for preview/card text (200 chars max)
  excerpt: text("excerpt"),
  // CMS Contract: Publish date for display and sort
  publishDate: timestamp("publish_date"),
  sourceRssFeedId: varchar("source_rss_feed_id"),
  sourceUrl: text("source_url"),
  quickFacts: jsonb("quick_facts").$type<string[]>().default([]),
  proTips: jsonb("pro_tips").$type<string[]>().default([]),
  warnings: jsonb("warnings").$type<string[]>().default([]),
  faq: jsonb("faq").$type<FaqItem[]>().default([]),
  // CMS Contract: Related destinations for tagging
  relatedDestinationIds: jsonb("related_destination_ids").$type<string[]>().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dining specific data
export const dining = pgTable("dining", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  destinationId: varchar("destination_id"),
  location: text("location"),
  cuisineType: text("cuisine_type"),
  priceRange: text("price_range"),
  targetAudience: jsonb("target_audience").$type<string[]>().default([]),
  primaryCta: text("primary_cta"),
  quickInfoBar: jsonb("quick_info_bar").$type<QuickInfoItem[]>().default([]),
  highlights: jsonb("highlights").$type<HighlightItem[]>().default([]),
  menuHighlights: jsonb("menu_highlights").$type<MenuHighlightItem[]>().default([]),
  essentialInfo: jsonb("essential_info").$type<EssentialInfoItem[]>().default([]),
  diningTips: jsonb("dining_tips").$type<string[]>().default([]),
  faq: jsonb("faq").$type<FaqItem[]>().default([]),
  relatedDining: jsonb("related_dining").$type<RelatedItem[]>().default([]),
  photoGallery: jsonb("photo_gallery").$type<GalleryImage[]>().default([]),
  trustSignals: jsonb("trust_signals").$type<string[]>().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Districts specific data
export const districts = pgTable("districts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  destinationId: varchar("destination_id"),
  location: text("location"),
  neighborhood: text("neighborhood"),
  subcategory: text("subcategory"),
  targetAudience: jsonb("target_audience").$type<string[]>().default([]),
  primaryCta: text("primary_cta"),
  introText: text("intro_text"),
  expandedIntroText: text("expanded_intro_text"),
  quickInfoBar: jsonb("quick_info_bar").$type<QuickInfoItem[]>().default([]),
  highlights: jsonb("highlights").$type<HighlightItem[]>().default([]),
  thingsToDo: jsonb("things_to_do").$type<ThingsToDoItem[]>().default([]),
  attractionsGrid: jsonb("attractions_grid").$type<DistrictAttractionItem[]>().default([]),
  diningHighlights: jsonb("dining_highlights").$type<DiningHighlightItem[]>().default([]),
  realEstateInfo: jsonb("real_estate_info").$type<RealEstateInfoItem>(),
  essentialInfo: jsonb("essential_info").$type<EssentialInfoItem[]>().default([]),
  localTips: jsonb("local_tips").$type<string[]>().default([]),
  faq: jsonb("faq").$type<FaqItem[]>().default([]),
  relatedDistricts: jsonb("related_districts").$type<RelatedItem[]>().default([]),
  photoGallery: jsonb("photo_gallery").$type<GalleryImage[]>().default([]),
  trustSignals: jsonb("trust_signals").$type<string[]>().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transport specific data
export const transports = pgTable("transports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  transitMode: text("transit_mode"),
  routeInfo: text("route_info"),
  targetAudience: jsonb("target_audience").$type<string[]>().default([]),
  primaryCta: text("primary_cta"),
  quickInfoBar: jsonb("quick_info_bar").$type<QuickInfoItem[]>().default([]),
  highlights: jsonb("highlights").$type<HighlightItem[]>().default([]),
  fareInfo: jsonb("fare_info").$type<FareInfoItem[]>().default([]),
  essentialInfo: jsonb("essential_info").$type<EssentialInfoItem[]>().default([]),
  travelTips: jsonb("travel_tips").$type<string[]>().default([]),
  faq: jsonb("faq").$type<FaqItem[]>().default([]),
  relatedTransport: jsonb("related_transport").$type<RelatedItem[]>().default([]),
  trustSignals: jsonb("trust_signals").$type<string[]>().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Events specific data
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  eventDate: timestamp("event_date"),
  endDate: timestamp("end_date"),
  venue: text("venue"),
  venueAddress: text("venue_address"),
  ticketUrl: text("ticket_url"),
  ticketPrice: text("ticket_price"),
  isFeatured: boolean("is_featured").default(false),
  isRecurring: boolean("is_recurring").default(false),
  recurrencePattern: text("recurrence_pattern"),
  targetAudience: jsonb("target_audience").$type<string[]>().default([]),
  organizer: text("organizer"),
  contactEmail: text("contact_email"),
  faq: jsonb("faq").$type<FaqItem[]>().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Itineraries/Packages specific data
export const itineraries = pgTable("itineraries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  duration: text("duration"),
  totalPrice: text("total_price"),
  difficultyLevel: text("difficulty_level"),
  targetAudience: jsonb("target_audience").$type<string[]>().default([]),
  highlights: jsonb("highlights").$type<string[]>().default([]),
  includedItems: jsonb("included_items").$type<string[]>().default([]),
  excludedItems: jsonb("excluded_items").$type<string[]>().default([]),
  dayPlan: jsonb("day_plan").$type<ItineraryDay[]>().default([]),
  primaryCta: text("primary_cta"),
  faq: jsonb("faq").$type<FaqItem[]>().default([]),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// RSS Feeds table
export const rssFeeds = pgTable("rss_feeds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  category: articleCategoryEnum("category"),
  destinationId: varchar("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  language: text("language").default("en"),
  region: text("region"),
  isActive: boolean("is_active").default(true),
  lastFetchedAt: timestamp("last_fetched_at"),
  fetchIntervalMinutes: integer("fetch_interval_minutes").default(60),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliate Links table
export const affiliateLinks = pgTable("affiliate_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  productId: text("product_id"),
  anchor: text("anchor").notNull(),
  url: text("url").notNull(),
  placement: text("placement"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Media Library table
export const mediaFiles = pgTable("media_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Page Layouts - Live Edit System
export const pageLayoutStatusEnum = pgEnum("page_layout_status", ["draft", "published"]);

export const pageLayouts = pgTable("page_layouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(), // e.g., "public-attractions", "district-downtown"
  title: text("title"),
  // Published components (what visitors see)
  components: jsonb("components").$type<Array<{
    id: string;
    type: string;
    order: number;
    parentId?: string;
    props: Record<string, any>;
  }>>().default([]),
  // Draft components (what editors are working on)
  draftComponents: jsonb("draft_components").$type<Array<{
    id: string;
    type: string;
    order: number;
    parentId?: string;
    props: Record<string, any>;
  }>>(),
  status: pageLayoutStatusEnum("status").default("draft"),
  publishedAt: timestamp("published_at"),
  draftUpdatedAt: timestamp("draft_updated_at"),
  createdBy: integer("created_by").references(() => users.id),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPageLayoutSchema = createInsertSchema(pageLayouts);

// Image Engine - AI Generated Images Library
export const imageSourceEnum = pgEnum("image_source", ["gemini", "openai", "freepik", "stock", "upload"]);
export const imageRatingEnum = pgEnum("image_rating", ["like", "dislike", "skip"]);

export const aiGeneratedImages = pgTable("ai_generated_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_ai_images_topic").on(table.topic),
  index("IDX_ai_images_category").on(table.category),
  index("IDX_ai_images_approved").on(table.isApproved),
  index("IDX_ai_images_usage").on(table.usageCount),
  index("IDX_ai_images_source").on(table.source),
]);

export const insertAiGeneratedImageSchema = createInsertSchema(aiGeneratedImages);

export type InsertAiGeneratedImage = z.infer<typeof insertAiGeneratedImageSchema>;
export type AiGeneratedImage = typeof aiGeneratedImages.$inferSelect;

// Image Collections
export const imageCollections = pgTable("image_collections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
export const assetSourceEnum = pgEnum("asset_source", ["upload", "ai_generated", "attached", "external"]);

export const mediaAssets = pgTable("media_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_media_assets_content_id").on(table.contentId),
  index("IDX_media_assets_checksum").on(table.checksum),
  index("IDX_media_assets_path").on(table.path),
  index("IDX_media_assets_is_orphan").on(table.isOrphan),
  index("IDX_media_assets_source").on(table.source),
]);

export const insertMediaAssetSchema = createInsertSchema(mediaAssets);

export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;

// ============================================================================
// MEDIA INTELLIGENCE - Recommendations & Optimization Tracking
// ============================================================================
export const recommendationStatusEnum = pgEnum("recommendation_status", [
  "pending",
  "approved",
  "rejected",
  "applied",
  "failed"
]);

export const recommendationTypeEnum = pgEnum("recommendation_type", [
  "convert_format",
  "resize",
  "compress",
  "add_missing_image",
  "add_alt_text",
  "improve_alt_text",
  "remove_duplicate",
  "replace_stock",
  "add_gallery_images",
  "optimize_dimensions"
]);

export const mediaRecommendations = pgTable("media_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_media_recommendations_asset").on(table.assetId),
  index("IDX_media_recommendations_content").on(table.contentId),
  index("IDX_media_recommendations_status").on(table.status),
  index("IDX_media_recommendations_type").on(table.type),
  index("IDX_media_recommendations_priority").on(table.priority),
]);

export const insertMediaRecommendationSchema = createInsertSchema(mediaRecommendations);

export type InsertMediaRecommendation = z.infer<typeof insertMediaRecommendationSchema>;
export type MediaRecommendationRecord = typeof mediaRecommendations.$inferSelect;

// Internal Links table
export const internalLinks = pgTable("internal_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceContentId: varchar("source_content_id").references(() => contents.id, { onDelete: "cascade" }),
  targetContentId: varchar("target_content_id").references(() => contents.id, { onDelete: "cascade" }),
  anchorText: text("anchor_text"),
  isAutoSuggested: boolean("is_auto_suggested").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Topic Bank table - for auto-generating articles when RSS lacks content
export const topicBank = pgTable("topic_bank", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  headlineAngle: text("headline_angle"), // The hook/headline for viral content
  category: articleCategoryEnum("category"),
  mainCategory: topicCategoryEnum("main_category"), // Main topic category (luxury, food, etc.)
  viralPotential: viralPotentialEnum("viral_potential").default("3"), // 1-5 stars
  format: topicFormatEnum("format"), // video_tour, photo_gallery, etc.
  topicType: topicTypeEnum("topic_type").default("evergreen"), // trending, evergreen, seasonal
  keywords: jsonb("keywords").$type<string[]>().default([]),
  outline: text("outline"),
  priority: integer("priority").default(0),
  lastUsed: timestamp("last_used"),
  timesUsed: integer("times_used").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Keyword Repository table - SEO Bible for the system
export const keywordRepository = pgTable("keyword_repository", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyword: text("keyword").notNull().unique(),
  type: text("type").notNull(),
  category: text("category"),
  searchVolume: text("search_volume"),
  competition: text("competition"),
  relatedKeywords: jsonb("related_keywords").$type<string[]>().default([]),
  usageCount: integer("usage_count").default(0),
  priority: integer("priority").default(0),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content Versions table - for tracking content history
export const contentVersions = pgTable("content_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
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

// Supported locales enum - Dubai/UAE focused languages (17 languages)
export const localeEnum = pgEnum("locale", [
  // 🔴 TIER 1 - Core Markets (Must Have)
  "en",  // English - primary business language
  "ar",  // Arabic - official language, 20% untapped potential
  "hi",  // Hindi - 38% of population (Indians)

  // 🟡 TIER 2 - High ROI Markets
  "zh",  // Chinese Simplified - growing investors
  "ru",  // Russian - wealthy investors
  "ur",  // Urdu - Pakistanis (12% of population)
  "fr",  // French - tourists & investors

  // 🟢 TIER 3 - Growing Markets
  "de",  // German - European tourists
  "fa",  // Farsi/Persian - Iranian business community
  "bn",  // Bengali - large expat community
  "fil", // Filipino - large expat community

  // ⚪ TIER 4 - Niche Markets
  "es",  // Spanish
  "tr",  // Turkish
  "it",  // Italian
  "ja",  // Japanese - luxury market
  "ko",  // Korean - growing tourism
  "he",  // Hebrew - Israeli investors
]);

export const translationStatusEnum = pgEnum("translation_status", ["pending", "in_progress", "completed", "needs_review"]);

// Translation Job status enum - for Phase 6 localization automation
export const translationJobStatusEnum = pgEnum("translation_job_status", [
  "pending",      // Awaiting processing
  "in_progress",  // Currently being translated
  "completed",    // Successfully completed
  "failed",       // Failed after retries
  "needs_review", // Requires human review
]);

// Translation Job Fields enum - what fields to translate
export const translationJobFieldsType = z.enum([
  "title",
  "metaTitle", 
  "metaDescription",
  "blocks",
  "answerCapsule",
  "faq",
  "highlights",
  "tags",
]);
export type TranslationJobField = z.infer<typeof translationJobFieldsType>;

// Topic Cluster status enum - for RSS aggregation
export const topicClusterStatusEnum = pgEnum("topic_cluster_status", ["pending", "merged", "dismissed"]);

// Topic Clusters table - for aggregating similar articles from multiple sources
export const topicClusters = pgTable("topic_clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topic: text("topic").notNull(), // AI-identified topic
  status: topicClusterStatusEnum("status").notNull().default("pending"),
  mergedContentId: varchar("merged_content_id").references(() => contents.id, { onDelete: "set null" }),
  similarityScore: integer("similarity_score"), // 0-100 confidence score
  articleCount: integer("article_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Topic Cluster Items - articles belonging to a cluster
export const topicClusterItems = pgTable("topic_cluster_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clusterId: varchar("cluster_id").notNull().references(() => topicClusters.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "cascade" }),
  rssFeedId: varchar("rss_feed_id").references(() => rssFeeds.id, { onDelete: "set null" }),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title").notNull(),
  sourceDescription: text("source_description"),
  pubDate: timestamp("pub_date"),
  isUsedInMerge: boolean("is_used_in_merge").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTopicClusterSchema = createInsertSchema(topicClusters);
export type InsertTopicCluster = z.infer<typeof insertTopicClusterSchema>;
export type TopicCluster = typeof topicClusters.$inferSelect;

export const insertTopicClusterItemSchema = createInsertSchema(topicClusterItems);
export type InsertTopicClusterItem = z.infer<typeof insertTopicClusterItemSchema>;
export type TopicClusterItem = typeof topicClusterItems.$inferSelect;

// Content Fingerprints table - for RSS deduplication
export const contentFingerprints = pgTable("content_fingerprints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "cascade" }),
  fingerprint: text("fingerprint").notNull().unique(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title"),
  rssFeedId: varchar("rss_feed_id").references(() => rssFeeds.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Translations table - for multi-language content
export const translations = pgTable("translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  locale: localeEnum("locale").notNull(),
  status: translationStatusEnum("status").notNull().default("pending"),
  title: text("title"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  blocks: jsonb("blocks").$type<ContentBlock[]>().default([]),
  answerCapsule: text("answer_capsule"), // AEO: Localized answer capsule for AI extraction
  translatedBy: varchar("translated_by"),
  reviewedBy: varchar("reviewed_by"),
  sourceHash: varchar("source_hash"),
  isManualOverride: boolean("is_manual_override").default(false),
  translationProvider: varchar("translation_provider"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_translations_content_locale").on(table.contentId, table.locale),
  index("IDX_translations_locale").on(table.locale),
  index("IDX_translations_status").on(table.status),
]);

// UI Translations table - for static interface strings
export const uiTranslations = pgTable("ui_translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull(), // e.g., "nav.home", "common.loading"
  locale: localeEnum("locale").notNull(),
  value: text("value").notNull(),
  namespace: varchar("namespace").default("common"), // "common", "admin", "public"
  isManualOverride: boolean("is_manual_override").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueKeyLocale: sql`UNIQUE (${table.key}, ${table.locale})`,
}));

export const insertUiTranslationSchema = createInsertSchema(uiTranslations);
export type InsertUiTranslation = z.infer<typeof insertUiTranslationSchema>;
export type UiTranslation = typeof uiTranslations.$inferSelect;

// ============================================================================
// LOCALIZED ASSETS - Per-locale media (hero, card, gallery, OG images)
// ============================================================================
// Entity types that can have localized assets
export const localizedAssetEntityTypeEnum = pgEnum("localized_asset_entity_type", [
  "content", "destination", "attraction", "hotel", "article", "guide", "page"
]);

// Asset usage types
export const localizedAssetUsageEnum = pgEnum("localized_asset_usage", [
  "hero", "card", "gallery", "og", "thumbnail", "banner", "logo"
]);

export const localizedAssets = pgTable("localized_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: localizedAssetEntityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  locale: localeEnum("locale").notNull(),
  usage: localizedAssetUsageEnum("usage").notNull(),
  src: text("src").notNull(), // URL or path to the image
  filename: text("filename"), // Localized filename for downloads/SEO
  alt: text("alt"), // Localized alt text
  title: text("title"), // Localized title attribute
  caption: text("caption"), // Localized caption
  width: integer("width"), // Image dimensions
  height: integer("height"),
  mimeType: varchar("mime_type"), // e.g., "image/webp"
  fileSize: integer("file_size"), // Bytes
  isOgImage: boolean("is_og_image").default(false), // Flag for OG image sitemap
  sortOrder: integer("sort_order").default(0), // For gallery ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_localized_assets_entity_locale_usage").on(
    table.entityType, table.entityId, table.locale, table.usage
  ),
  index("IDX_localized_assets_entity").on(table.entityType, table.entityId),
  index("IDX_localized_assets_locale").on(table.locale),
  index("IDX_localized_assets_og").on(table.isOgImage),
]);

// Zod enum validators derived from Drizzle pgEnum values
export const localizedAssetEntityTypes = ["content", "destination", "attraction", "hotel", "article", "guide", "page"] as const;
export const localizedAssetUsages = ["hero", "card", "gallery", "og", "thumbnail", "banner", "logo"] as const;
// All 30 supported locales for Zod validation - matches SUPPORTED_LOCALES array
export const supportedLocales = [
  // Tier 1 - Core
  "en", "ar", "hi",
  // Tier 2 - High ROI
  "zh", "ru", "ur", "fr", "id",
  // Tier 3 - Growing (Southeast Asia focus)
  "de", "fa", "bn", "fil", "th", "vi", "ms",
  // Tier 4 - Niche
  "es", "tr", "it", "ja", "ko", "he", "pt",
  // Tier 5 - European Expansion
  "nl", "pl", "sv", "el", "cs", "ro", "uk", "hu"
] as const;

export const insertLocalizedAssetSchema = z.object({
  entityType: z.enum(localizedAssetEntityTypes),
  entityId: z.string(),
  locale: z.enum(supportedLocales),
  usage: z.enum(localizedAssetUsages),
  src: z.string(),
  filename: z.string().nullable().optional(),
  alt: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  mimeType: z.string().nullable().optional(),
  fileSize: z.number().nullable().optional(),
  isOgImage: z.boolean().optional(),
  sortOrder: z.number().optional(),
});
export type InsertLocalizedAsset = z.infer<typeof insertLocalizedAssetSchema>;
export type LocalizedAsset = typeof localizedAssets.$inferSelect;

// ============================================================================
// PILOT: Localized Content Table (Isolated for Octypo × Localization pilot)
// ============================================================================
// This is a TEMPORARY table for the localization pilot.
// Constraints:
// - en + ar locales ONLY
// - Attraction entity type ONLY
// - No i18next/t() fallbacks - pure locale content
// - LocalePurity ≥98% hard gate
// - Atomic write (all validators pass or nothing written)
// ============================================================================

export const pilotLocaleStatusEnum = pgEnum("pilot_locale_status", [
  "generating",  // Content generation in progress
  "validating",  // Running validators
  "validated",   // All validators passed
  "failed",      // Validation failed - no content written
  "published"    // Content ready for rendering
]);

export const pilotLocalizedContent = pgTable("pilot_localized_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Entity reference (attraction only for pilot)
  entityType: varchar("entity_type", { length: 50 }).notNull().default("attraction"),
  entityId: varchar("entity_id", { length: 100 }).notNull(),
  
  // Locale (en or ar only for pilot)
  locale: varchar("locale", { length: 10 }).notNull(),
  
  // Destination (required, no fallback)
  destination: varchar("destination", { length: 100 }).notNull(),
  
  // Content sections (all generated natively in locale, NOT translated)
  introduction: text("introduction"),
  whatToExpect: text("what_to_expect"),
  visitorTips: text("visitor_tips"),
  howToGetThere: text("how_to_get_there"),
  faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>(),
  answerCapsule: text("answer_capsule"),
  
  // SEO meta (locale-specific)
  metaTitle: varchar("meta_title", { length: 100 }),
  metaDescription: text("meta_description"),
  
  // Image metadata (locale-specific)
  imageAlt: text("image_alt"),
  imageCaption: text("image_caption"),
  
  // Validation results (stored for audit)
  localePurityScore: real("locale_purity_score"), // 0.0 - 1.0, must be ≥0.98
  validationResults: jsonb("validation_results").$type<{
    completeness: { passed: boolean; missingSections: string[] };
    localePurity: { passed: boolean; score: number; threshold: number };
    blueprint: { passed: boolean; issues: string[] };
    seoAeo: { passed: boolean; issues: string[] };
  }>(),
  
  // Status
  status: pilotLocaleStatusEnum("status").notNull().default("generating"),
  failureReason: text("failure_reason"),
  
  // Octypo generation metadata
  writerAgent: varchar("writer_agent", { length: 100 }),
  engineUsed: varchar("engine_used", { length: 100 }),
  tokensUsed: integer("tokens_used"),
  generationTimeMs: integer("generation_time_ms"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint: one content per entity+locale
  uniqueIndex("IDX_pilot_localized_content_entity_locale").on(
    table.entityType, table.entityId, table.locale
  ),
  index("IDX_pilot_localized_content_status").on(table.status),
  index("IDX_pilot_localized_content_locale").on(table.locale),
]);

// Zod schemas for pilot
export const pilotLocales = ["en", "ar", "fr"] as const;
export const pilotEntityTypes = ["attraction"] as const;

export const insertPilotLocalizedContentSchema = z.object({
  entityType: z.enum(pilotEntityTypes),
  entityId: z.string(),
  locale: z.enum(pilotLocales),
  destination: z.string().min(1, "Destination is required - no fallback allowed"),
  introduction: z.string().nullable().optional(),
  whatToExpect: z.string().nullable().optional(),
  visitorTips: z.string().nullable().optional(),
  howToGetThere: z.string().nullable().optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).nullable().optional(),
  answerCapsule: z.string().nullable().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  imageAlt: z.string().nullable().optional(),
  imageCaption: z.string().nullable().optional(),
  localePurityScore: z.number().nullable().optional(),
  validationResults: z.any().nullable().optional(),
  status: z.string().optional(),
  failureReason: z.string().nullable().optional(),
  writerAgent: z.string().nullable().optional(),
  engineUsed: z.string().nullable().optional(),
  tokensUsed: z.number().nullable().optional(),
  generationTimeMs: z.number().nullable().optional(),
});

export type InsertPilotLocalizedContent = z.infer<typeof insertPilotLocalizedContentSchema>;
export type PilotLocalizedContent = typeof pilotLocalizedContent.$inferSelect;

// ============================================================================
// PILOT: Localized Guides Table
// ============================================================================
// Parallel to pilot_localized_content but for guides (travel guides, city guides, etc.)
// Uses same atomic write pattern and locale purity validation

export const pilotLocalizedGuides = pgTable("pilot_localized_guides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Guide reference
  guideSlug: varchar("guide_slug", { length: 255 }).notNull(),
  
  // Locale (en or ar only for pilot)
  locale: varchar("locale", { length: 10 }).notNull(),
  
  // Destination (from guide data, required - no fallback)
  destination: varchar("destination", { length: 100 }).notNull(),
  
  // Content sections (natively written, NOT translated)
  introduction: text("introduction"),            // Answer-first, 40-60 words
  whatToExpect: text("what_to_expect"),          // What visitors will experience
  highlights: jsonb("highlights").$type<string[]>(), // Key points / itinerary items
  tips: text("tips"),                            // Practical visitor tips
  faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>(), // 5-10 AEO-ready FAQs
  answerCapsule: text("answer_capsule"),         // Featured snippet target
  
  // SEO meta (locale-specific)
  metaTitle: varchar("meta_title", { length: 100 }),
  metaDescription: text("meta_description"),
  
  // Original guide reference (source content ID)
  sourceGuideId: integer("source_guide_id"),
  
  // Validation results (stored for audit)
  localePurityScore: real("locale_purity_score"), // 0.0 - 1.0, must be ≥0.98
  validationResults: jsonb("validation_results").$type<{
    completeness: { passed: boolean; missingSections: string[] };
    localePurity: { passed: boolean; score: number; threshold: number };
    blueprint: { passed: boolean; issues: string[] };
    seoAeo: { passed: boolean; issues: string[] };
    rtl?: { passed: boolean; issues: string[] };
  }>(),
  
  // Status
  status: pilotLocaleStatusEnum("status").notNull().default("generating"),
  failureReason: text("failure_reason"),
  
  // Generation metadata
  writerAgent: varchar("writer_agent", { length: 100 }),
  engineUsed: varchar("engine_used", { length: 100 }),
  tokensUsed: integer("tokens_used"),
  generationTimeMs: integer("generation_time_ms"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  // Unique constraint: one content per guide+locale
  uniqueIndex("IDX_pilot_localized_guides_slug_locale").on(table.guideSlug, table.locale),
  index("IDX_pilot_localized_guides_status").on(table.status),
  index("IDX_pilot_localized_guides_locale").on(table.locale),
]);

// Zod schemas for pilot guides
export const insertPilotLocalizedGuideSchema = z.object({
  guideSlug: z.string(),
  locale: z.enum(pilotLocales),
  destination: z.string().min(1, "Destination is required - no fallback allowed"),
  title: z.string(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  heroImageAlt: z.string().nullable().optional(),
  content: z.any().nullable().optional(),
  status: z.string().optional(),
  localePurity: z.number().nullable().optional(),
  writerAgent: z.string().nullable().optional(),
  engineUsed: z.string().nullable().optional(),
  quality108Score: z.number().nullable().optional(),
  validationErrors: z.any().nullable().optional(),
  generationTimeMs: z.number().nullable().optional(),
});

export type InsertPilotLocalizedGuide = z.infer<typeof insertPilotLocalizedGuideSchema>;
export type PilotLocalizedGuide = typeof pilotLocalizedGuides.$inferSelect;

// Homepage Promotions table - for curating homepage sections
export const homepageSectionEnum = pgEnum("homepage_section", ["featured", "attractions", "hotels", "articles", "trending", "dining", "events"]);

export const homepagePromotions = pgTable("homepage_promotions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  section: homepageSectionEnum("section").notNull(),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "cascade" }),
  position: integer("position").default(0),
  isActive: boolean("is_active").default(true),
  customTitle: text("custom_title"),
  customImage: text("custom_image"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Content Views table - for analytics tracking
export const contentViews = pgTable("content_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow(),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  sessionId: varchar("session_id"),
  country: varchar("country"),
  city: varchar("city"),
});

// Audit action type enum
export const auditActionTypeEnum = pgEnum("audit_action_type", [
  "create", "update", "delete", "publish", "unpublish",
  "submit_for_review", "approve", "reject", "login", "logout",
  "user_create", "user_update", "user_delete", "role_change",
  "settings_change", "media_upload", "media_delete", "restore"
]);

// Audit entity type enum
export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "content", "user", "media", "settings", "rss_feed",
  "affiliate_link", "translation", "session", "tag", "cluster",
  "campaign", "newsletter_subscriber", "auth"
]);

// Audit Logs table - immutable append-only logging
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_audit_logs_timestamp").on(table.timestamp),
  index("IDX_audit_logs_user_id").on(table.userId),
  index("IDX_audit_logs_entity").on(table.entityType, table.entityId),
]);

// Audit log insert schema and types
export const insertAuditLogSchema = createInsertSchema(auditLogs);

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Rate Limits table - for persistent rate limiting (especially AI usage)
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),  // e.g., "ai_daily:user123"
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_rate_limits_key").on(table.key),
  index("IDX_rate_limits_reset").on(table.resetAt),
]);

export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = typeof rateLimits.$inferInsert;

// Analytics event type enum
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "page_view", "click", "scroll", "form_start", "form_submit", "form_abandon",
  "cta_click", "outbound_link", "search", "filter", "share", "video_play",
  "video_complete", "download", "copy", "print", "add_to_favorites",
  "exit_intent", "conversion", "engagement"
]);

// Analytics Events table - for customer journey tracking
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_analytics_session").on(table.sessionId),
  index("IDX_analytics_visitor").on(table.visitorId),
  index("IDX_analytics_timestamp").on(table.timestamp),
  index("IDX_analytics_event_type").on(table.eventType),
  index("IDX_analytics_page_path").on(table.pagePath),
]);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEvents.$inferInsert;

// Two-Factor Authentication Secrets table
export const twoFactorSecrets = pgTable("two_factor_secrets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  secret: varchar("secret").notNull(),
  backupCodes: jsonb("backup_codes").$type<string[]>().notNull().default([]),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_2fa_user").on(table.userId),
]);

export type TwoFactorSecret = typeof twoFactorSecrets.$inferSelect;
export type InsertTwoFactorSecret = typeof twoFactorSecrets.$inferInsert;

// A/B Test status enum
export const abTestStatusEnum = pgEnum("ab_test_status", ["running", "completed", "paused"]);

// A/B Test type enum
export const abTestTypeEnum = pgEnum("ab_test_type", ["title", "heroImage", "metaDescription"]);

// A/B Tests table for content testing
export const abTests = pgTable("ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  testType: abTestTypeEnum("test_type").notNull(),
  variants: jsonb("variants").$type<Array<{
    id: string;
    value: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>>().notNull().default([]),
  status: abTestStatusEnum("status").notNull().default("running"),
  winner: varchar("winner"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_ab_tests_content").on(table.contentId),
  index("IDX_ab_tests_status").on(table.status),
]);

export type ABTest = typeof abTests.$inferSelect;
export type InsertABTest = typeof abTests.$inferInsert;

// ============================================================================
// MONETIZATION TABLES
// ============================================================================

// Premium content access type enum
export const premiumAccessTypeEnum = pgEnum("premium_access_type", ["one-time", "subscription"]);

// Premium Content table
export const premiumContent = pgTable("premium_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().unique(),
  isPremium: boolean("is_premium").notNull().default(true),
  previewPercentage: integer("preview_percentage").notNull().default(20),
  price: integer("price").notNull(), // In cents
  currency: varchar("currency").notNull().default("USD"),
  accessType: premiumAccessTypeEnum("access_type").notNull().default("one-time"),
  subscriptionTier: varchar("subscription_tier"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_premium_content_id").on(table.contentId),
]);

export type PremiumContentRow = typeof premiumContent.$inferSelect;
export type InsertPremiumContent = typeof premiumContent.$inferInsert;

// Purchase status enum
export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "completed", "refunded"]);

// Content Purchases table
export const contentPurchases = pgTable("content_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  contentId: varchar("content_id").notNull(),
  amount: integer("amount").notNull(),
  currency: varchar("currency").notNull().default("USD"),
  paymentMethod: varchar("payment_method").notNull(),
  paymentId: varchar("payment_id"),
  status: purchaseStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("IDX_purchases_user").on(table.userId),
  index("IDX_purchases_content").on(table.contentId),
]);

export type ContentPurchase = typeof contentPurchases.$inferSelect;
export type InsertContentPurchase = typeof contentPurchases.$inferInsert;

// Business type enum
export const businessTypeEnum = pgEnum("business_type", ["restaurant", "hotel", "tour", "shop", "service"]);

// Business tier enum
export const businessTierEnum = pgEnum("business_tier", ["basic", "premium", "enterprise"]);

// Business status enum
export const businessStatusEnum = pgEnum("business_status", ["active", "pending", "expired", "cancelled"]);

// Business Listings table
export const businessListings = pgTable("business_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  settings: jsonb("settings").$type<{
    showPhone: boolean;
    showEmail: boolean;
    enableLeadForm: boolean;
    enableBookingWidget: boolean;
    featuredPlacement: boolean;
  }>().notNull().default({
    showPhone: true,
    showEmail: true,
    enableLeadForm: true,
    enableBookingWidget: false,
    featuredPlacement: false,
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_business_status").on(table.status),
  index("IDX_business_type").on(table.businessType),
]);

export type BusinessListing = typeof businessListings.$inferSelect;
export type InsertBusinessListing = typeof businessListings.$inferInsert;

// Lead type enum
export const leadTypeEnum = pgEnum("lead_type", ["inquiry", "booking_request", "quote_request", "contact"]);

// Lead status enum
export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "converted", "lost"]);

// Leads table
export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businessListings.id, { onDelete: "cascade" }),
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
}, (table) => [
  index("IDX_leads_business").on(table.businessId),
  index("IDX_leads_status").on(table.status),
]);

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// Subscriber status enum for newsletter
export const subscriberStatusEnum = pgEnum("subscriber_status", [
  "pending_confirmation",
  "subscribed", 
  "unsubscribed",
  "bounced",
  "complained"
]);

// Consent log entry type
export interface ConsentLogEntry {
  action: "subscribe" | "confirm" | "unsubscribe" | "resubscribe" | "bounce" | "complaint";
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  source?: string;
}

// Newsletter Subscribers table - for coming soon page signups
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
  preferences: jsonb("preferences").$type<{ frequency: string; categories: string[] }>().default({ frequency: "weekly", categories: [] }),
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
export type SubscriberStatus = "pending_confirmation" | "subscribed" | "unsubscribed" | "bounced" | "complained";

// Lead status enum for property inquiries
export const propertyLeadStatusEnum = pgEnum("property_lead_status", [
  "new",
  "contacted",
  "qualified",
  "negotiating",
  "won",
  "lost"
]);

// Property Leads table - for off-plan property inquiries
export const propertyLeads = pgTable("property_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Campaign status enum
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed"
]);

// Email event type enum
export const emailEventTypeEnum = pgEnum("email_event_type", [
  "sent",
  "delivered",
  "opened",
  "clicked",
  "bounced",
  "complained",
  "unsubscribed"
]);

// Newsletter Campaigns table
export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

// Campaign Events table (for tracking opens, clicks, bounces, etc.)
export const campaignEvents = pgTable("campaign_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => newsletterCampaigns.id, { onDelete: "cascade" }),
  subscriberId: varchar("subscriber_id").references(() => newsletterSubscribers.id, { onDelete: "set null" }),
  eventType: emailEventTypeEnum("event_type").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCampaignEventSchema = createInsertSchema(campaignEvents);

export type InsertCampaignEvent = z.infer<typeof insertCampaignEventSchema>;
export type CampaignEvent = typeof campaignEvents.$inferSelect;
export type EmailEventType = "sent" | "delivered" | "opened" | "clicked" | "bounced" | "complained" | "unsubscribed";

// Sequence trigger enum
export const sequenceTriggerEnum = pgEnum("sequence_trigger", [
  "signup",
  "tag_added",
  "inactivity",
  "custom"
]);

// Sequence email structure type
export interface SequenceEmail {
  delayDays: number;
  subject: string;
  subjectHe: string;
  contentHtml: string;
  contentHtmlHe: string;
}

// Automated Sequences table
export const automatedSequences = pgTable("automated_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Job status enum
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "processing",
  "completed",
  "failed"
]);

// Job type enum
export const jobTypeEnum = pgEnum("job_type", [
  "translate",
  "ai_generate",
  "email",
  "image_process",
  "cleanup"
]);

// Background Jobs table
export const backgroundJobs = pgTable("background_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: jobTypeEnum("type").notNull(),
  status: jobStatusEnum("status").notNull().default("pending"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  result: jsonb("result").$type<Record<string, unknown>>(),
  error: text("error"),
  retries: integer("retries").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_jobs_status").on(table.status),
  index("IDX_jobs_type").on(table.type),
  index("IDX_jobs_priority").on(table.priority),
]);

export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = typeof backgroundJobs.$inferInsert;

// Push Subscriptions table for PWA notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpoint: text("endpoint").notNull().unique(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  locale: varchar("locale").notNull().default("en"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_push_user").on(table.userId),
  index("IDX_push_locale").on(table.locale),
]);

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// Search Queries table for analytics
export const searchQueries = pgTable("search_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: varchar("query").notNull(),
  resultsCount: integer("results_count").notNull().default(0),
  clickedResultId: varchar("clicked_result_id"),
  locale: varchar("locale").notNull().default("en"),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_search_query").on(table.query),
  index("IDX_search_created").on(table.createdAt),
  index("IDX_search_results").on(table.resultsCount),
]);

export type SearchQuery = typeof searchQueries.$inferSelect;
export type InsertSearchQuery = typeof searchQueries.$inferInsert;

// Search Index table for full-text and semantic search
export const searchIndex = pgTable("search_index", {
  contentId: varchar("content_id").primaryKey(),
  title: varchar("title").notNull(),
  contentType: varchar("content_type").notNull(),
  metaDescription: text("meta_description"),
  searchableText: text("searchable_text"),
  url: varchar("url").notNull(),
  image: varchar("image"),
  locale: varchar("locale").notNull().default("en"),
  tags: text("tags"),
  // Vector embedding for semantic search (1536 dimensions for text-embedding-3-small)
  embedding: text("embedding"), // Will be stored as vector type in PostgreSQL
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_search_content_type").on(table.contentType),
  index("IDX_search_locale").on(table.locale),
  index("IDX_search_updated").on(table.updatedAt),
]);

export type SearchIndex = typeof searchIndex.$inferSelect;
export type InsertSearchIndex = typeof searchIndex.$inferInsert;

// Translation batch jobs table
export const translationBatchJobs = pgTable("translation_batch_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: varchar("status").notNull().default("pending"),
  batchId: varchar("batch_id"), // OpenAI batch ID
  requests: jsonb("requests").$type<Array<{
    customId: string;
    text: string;
    sourceLocale: string;
    targetLocale: string;
    contentType: "title" | "description" | "body" | "meta";
  }>>().notNull().default([]),
  results: jsonb("results").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_batch_status").on(table.status),
  index("IDX_batch_created").on(table.createdAt),
]);

export type TranslationBatchJob = typeof translationBatchJobs.$inferSelect;
export type InsertTranslationBatchJob = typeof translationBatchJobs.$inferInsert;

// ============================================================================
// Phase 6: Translation Jobs Queue (Localization Automation)
// ============================================================================
// Persistent, resumable translation job queue following Octopus queue pattern.
// Survives server restarts, supports concurrency limits and exponential backoff.

export const translationJobs = pgTable("translation_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  sourceLocale: varchar("source_locale").notNull().default("en"),
  targetLocale: varchar("target_locale").notNull(), // One of 17 supported locales
  status: translationJobStatusEnum("status").notNull().default("pending"),
  priority: integer("priority").notNull().default(0), // Higher = more urgent
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  nextRunAt: timestamp("next_run_at"), // For exponential backoff scheduling
  error: text("error"), // Last error message
  fields: jsonb("fields").$type<TranslationJobField[]>().default([
    "title", "metaTitle", "metaDescription", "blocks", "answerCapsule", "faq", "highlights", "tags"
  ]),
  sourceHash: varchar("source_hash"), // SHA-256 of source content - skip if unchanged
  translationProvider: varchar("translation_provider"), // deepl, openai, anthropic, etc.
  processingStartedAt: timestamp("processing_started_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_translation_jobs_content").on(table.contentId),
  index("IDX_translation_jobs_status").on(table.status),
  index("IDX_translation_jobs_target_locale").on(table.targetLocale),
  index("IDX_translation_jobs_next_run").on(table.nextRunAt),
  index("IDX_translation_jobs_priority").on(table.priority),
  uniqueIndex("IDX_translation_jobs_unique").on(table.contentId, table.targetLocale),
]);

export const insertTranslationJobSchema = createInsertSchema(translationJobs);

export type TranslationJob = typeof translationJobs.$inferSelect;
export type InsertTranslationJob = z.infer<typeof insertTranslationJobSchema>;

// Relations
export const contentsRelations = relations(contents, ({ one, many }) => ({
  author: one(users, {
    fields: [contents.authorId],
    references: [users.id],
  }),
  attraction: one(attractions, {
    fields: [contents.id],
    references: [attractions.contentId],
  }),
  hotel: one(hotels, {
    fields: [contents.id],
    references: [hotels.contentId],
  }),
  article: one(articles, {
    fields: [contents.id],
    references: [articles.contentId],
  }),
  diningData: one(dining, {
    fields: [contents.id],
    references: [dining.contentId],
  }),
  district: one(districts, {
    fields: [contents.id],
    references: [districts.contentId],
  }),
  transport: one(transports, {
    fields: [contents.id],
    references: [transports.contentId],
  }),
  event: one(events, {
    fields: [contents.id],
    references: [events.contentId],
  }),
  itinerary: one(itineraries, {
    fields: [contents.id],
    references: [itineraries.contentId],
  }),
  affiliateLinks: many(affiliateLinks),
  sourceInternalLinks: many(internalLinks, { relationName: "sourceLinks" }),
  targetInternalLinks: many(internalLinks, { relationName: "targetLinks" }),
  views: many(contentViews),
}));

export const contentViewsRelations = relations(contentViews, ({ one }) => ({
  content: one(contents, {
    fields: [contentViews.contentId],
    references: [contents.id],
  }),
}));

export const affiliateLinksRelations = relations(affiliateLinks, ({ one }) => ({
  content: one(contents, {
    fields: [affiliateLinks.contentId],
    references: [contents.id],
  }),
}));

export const internalLinksRelations = relations(internalLinks, ({ one }) => ({
  sourceContent: one(contents, {
    fields: [internalLinks.sourceContentId],
    references: [contents.id],
    relationName: "sourceLinks",
  }),
  targetContent: one(contents, {
    fields: [internalLinks.targetContentId],
    references: [contents.id],
    relationName: "targetLinks",
  }),
}));

// Types for JSONB fields
export interface ContentBlock {
  id?: string;
  type: string;
  data: Record<string, unknown>;
  order?: number;
}

export interface QuickInfoItem {
  icon: string;
  label: string;
  value: string;
}

export interface HighlightItem {
  image: string;
  title: string;
  description: string;
}

export interface TicketInfoItem {
  type: string;
  description: string;
  price?: string;
  affiliateLinkId?: string;
  label?: string;
  value?: string;
}

export interface EssentialInfoItem {
  icon: string;
  label: string;
  value: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface RelatedItem {
  name: string;
  price?: string;
  link: string;
  image?: string;
}

export interface RoomTypeItem {
  image: string;
  title: string;
  features: string[];
  price: string;
  ctaText?: string;
  affiliateLinkId?: string;
}

export interface DiningItem {
  name: string;
  cuisine: string;
  description: string;
}

export interface NearbyItem {
  name: string;
  distance: string;
  type: string;
}

export interface GalleryImage {
  image: string;
  alt: string;
  // SEO enhancements
  title?: string;
  caption?: string;
  // Multilingual support
  altHe?: string;
  altAr?: string;
  captionHe?: string;
  captionAr?: string;
  // Technical specs
  width?: number;
  height?: number;
  // Schema metadata
  keywords?: string[];
  datePublished?: string;
  contentLocation?: {
    name: string;
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
    latitude?: string;
    longitude?: string;
  };
}

export interface MenuHighlightItem {
  name: string;
  description: string;
  price?: string;
}

export interface ThingsToDoItem {
  name: string;
  description: string;
  type: string;
}

export interface FareInfoItem {
  type: string;
  price: string;
  description?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
  activities: { time: string; activity: string; location?: string }[];
}

export interface ExperienceItem {
  icon: string;
  title: string;
  description: string;
}

export interface DistrictAttractionItem {
  name: string;
  description: string;
  image?: string;
  type: string;
  isNew?: boolean;
}

export interface DiningHighlightItem {
  name: string;
  cuisine: string;
  description: string;
  image?: string;
  priceRange?: string;
}

export interface RealEstateInfoItem {
  overview: string;
  priceRange?: string;
  highlights: string[];
  targetBuyers?: string[];
}

// Insert schemas
export const insertUserSchema = createInsertSchema(users);

export const insertContentSchema = createInsertSchema(contents);

export const insertAttractionSchema = createInsertSchema(attractions);

export const insertHotelSchema = createInsertSchema(hotels);

export const insertArticleSchema = createInsertSchema(articles);

export const insertDiningSchema = createInsertSchema(dining);

export const insertDistrictSchema = createInsertSchema(districts);

export const insertTransportSchema = createInsertSchema(transports);

export const insertEventSchema = createInsertSchema(events);

export const insertItinerarySchema = createInsertSchema(itineraries);

export const insertRssFeedSchema = createInsertSchema(rssFeeds);

export const insertAffiliateLinkSchema = createInsertSchema(affiliateLinks);

export const insertMediaFileSchema = createInsertSchema(mediaFiles);

export const insertInternalLinkSchema = createInsertSchema(internalLinks);

export const insertTopicBankSchema = createInsertSchema(topicBank);

export const insertKeywordRepositorySchema = createInsertSchema(keywordRepository);

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof contents.$inferSelect;
export type InsertAttraction = z.infer<typeof insertAttractionSchema>;
export type Attraction = typeof attractions.$inferSelect;
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type Hotel = typeof hotels.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertDining = z.infer<typeof insertDiningSchema>;
export type Dining = typeof dining.$inferSelect;
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districts.$inferSelect;
export type InsertTransport = z.infer<typeof insertTransportSchema>;
export type Transport = typeof transports.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;
export type Itinerary = typeof itineraries.$inferSelect;
export type InsertRssFeed = z.infer<typeof insertRssFeedSchema>;
export type RssFeed = typeof rssFeeds.$inferSelect;
export type InsertAffiliateLink = z.infer<typeof insertAffiliateLinkSchema>;
export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type InsertMediaFile = z.infer<typeof insertMediaFileSchema>;
export type MediaFile = typeof mediaFiles.$inferSelect;
export type InsertInternalLink = z.infer<typeof insertInternalLinkSchema>;
export type InternalLink = typeof internalLinks.$inferSelect;
export type InsertTopicBank = z.infer<typeof insertTopicBankSchema>;
export type TopicBank = typeof topicBank.$inferSelect;
export type InsertKeywordRepository = z.infer<typeof insertKeywordRepositorySchema>;
export type KeywordRepository = typeof keywordRepository.$inferSelect;

export const insertContentVersionSchema = createInsertSchema(contentVersions);
export type InsertContentVersion = z.infer<typeof insertContentVersionSchema>;
export type ContentVersion = typeof contentVersions.$inferSelect;

export const insertContentFingerprintSchema = createInsertSchema(contentFingerprints);
export type InsertContentFingerprint = z.infer<typeof insertContentFingerprintSchema>;
export type ContentFingerprint = typeof contentFingerprints.$inferSelect;

export const insertTranslationSchema = createInsertSchema(translations);
export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;

export const insertHomepagePromotionSchema = createInsertSchema(homepagePromotions);
export type InsertHomepagePromotion = z.infer<typeof insertHomepagePromotionSchema>;
export type HomepagePromotion = typeof homepagePromotions.$inferSelect;
export type HomepageSection = "featured" | "attractions" | "hotels" | "articles" | "trending" | "dining" | "events";

export const insertContentViewSchema = createInsertSchema(contentViews);
export type InsertContentView = z.infer<typeof insertContentViewSchema>;
export type ContentView = typeof contentViews.$inferSelect;

// Global languages (30 languages for maximum SEO reach)
export type Locale =
  | "en" | "ar" | "hi"                              // Tier 1 - Core
  | "zh" | "ru" | "ur" | "fr" | "id"                // Tier 2 - High ROI
  | "de" | "fa" | "bn" | "fil" | "th" | "vi" | "ms" // Tier 3 - Growing (Southeast Asia focus)
  | "es" | "tr" | "it" | "ja" | "ko" | "he" | "pt"  // Tier 4 - Niche
  | "nl" | "pl" | "sv" | "el" | "cs" | "ro" | "uk" | "hu" | "da" | "no"; // Tier 5 - European expansion

export type TranslationStatus = "pending" | "in_progress" | "completed" | "needs_review";

// RTL languages (right-to-left)
export const RTL_LOCALES: Locale[] = ["ar", "fa", "ur", "he"];

// 30 Supported Languages for Global Travel Market
export const SUPPORTED_LOCALES: { code: Locale; name: string; nativeName: string; region: string; tier: number }[] = [
  // 🔴 TIER 1 - Core Markets (Must Have)
  { code: "en", name: "English", nativeName: "English", region: "Global", tier: 1 },
  { code: "ar", name: "Arabic", nativeName: "العربية", region: "Middle East", tier: 1 },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", region: "South Asia", tier: 1 },

  // 🟡 TIER 2 - High ROI Markets
  { code: "zh", name: "Chinese", nativeName: "简体中文", region: "East Asia", tier: 2 },
  { code: "ru", name: "Russian", nativeName: "Русский", region: "CIS", tier: 2 },
  { code: "ur", name: "Urdu", nativeName: "اردو", region: "South Asia", tier: 2 },
  { code: "fr", name: "French", nativeName: "Français", region: "Europe", tier: 2 },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", region: "Southeast Asia", tier: 2 },

  // 🟢 TIER 3 - Growing Markets (Southeast Asia focus)
  { code: "de", name: "German", nativeName: "Deutsch", region: "Europe", tier: 3 },
  { code: "fa", name: "Persian", nativeName: "فارسی", region: "Middle East", tier: 3 },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", region: "South Asia", tier: 3 },
  { code: "fil", name: "Filipino", nativeName: "Filipino", region: "Southeast Asia", tier: 3 },
  { code: "th", name: "Thai", nativeName: "ไทย", region: "Southeast Asia", tier: 3 },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", region: "Southeast Asia", tier: 3 },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", region: "Southeast Asia", tier: 3 },

  // ⚪ TIER 4 - Niche Markets
  { code: "es", name: "Spanish", nativeName: "Español", region: "Americas", tier: 4 },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", region: "Middle East", tier: 4 },
  { code: "it", name: "Italian", nativeName: "Italiano", region: "Europe", tier: 4 },
  { code: "ja", name: "Japanese", nativeName: "日本語", region: "East Asia", tier: 4 },
  { code: "ko", name: "Korean", nativeName: "한국어", region: "East Asia", tier: 4 },
  { code: "he", name: "Hebrew", nativeName: "עברית", region: "Middle East", tier: 4 },
  { code: "pt", name: "Portuguese", nativeName: "Português", region: "Europe/Brazil", tier: 4 },

  // 🔵 TIER 5 - European Expansion
  { code: "nl", name: "Dutch", nativeName: "Nederlands", region: "Europe", tier: 5 },
  { code: "pl", name: "Polish", nativeName: "Polski", region: "Europe", tier: 5 },
  { code: "sv", name: "Swedish", nativeName: "Svenska", region: "Europe", tier: 5 },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", region: "Europe", tier: 5 },
  { code: "cs", name: "Czech", nativeName: "Čeština", region: "Europe", tier: 5 },
  { code: "ro", name: "Romanian", nativeName: "Română", region: "Europe", tier: 5 },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", region: "CIS", tier: 5 },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", region: "Europe", tier: 5 },
];

// Content Tags table - for smart tagging system
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Content-Tag junction table
export const contentTags = pgTable("content_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_content_tags_content").on(table.contentId),
  index("IDX_content_tags_tag").on(table.tagId),
]);

export const insertContentTagSchema = createInsertSchema(contentTags);
export type InsertContentTag = z.infer<typeof insertContentTagSchema>;
export type ContentTag = typeof contentTags.$inferSelect;

// Content Clusters table - for pillar page structure
export const contentClusters = pgTable("content_clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  pillarContentId: varchar("pillar_content_id").references(() => contents.id, { onDelete: "set null" }),
  primaryKeyword: text("primary_keyword"),
  color: varchar("color"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentClusterSchema = createInsertSchema(contentClusters);
export type InsertContentCluster = z.infer<typeof insertContentClusterSchema>;
export type ContentCluster = typeof contentClusters.$inferSelect;

// Cluster Members - linking content to clusters
export const clusterMembers = pgTable("cluster_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clusterId: varchar("cluster_id").notNull().references(() => contentClusters.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  position: integer("position").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_cluster_members_cluster").on(table.clusterId),
  index("IDX_cluster_members_content").on(table.contentId),
]);

export const insertClusterMemberSchema = createInsertSchema(clusterMembers);
export type InsertClusterMember = z.infer<typeof insertClusterMemberSchema>;
export type ClusterMember = typeof clusterMembers.$inferSelect;

// Content Templates table - for reusable content structures
export const contentTemplates = pgTable("content_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Site Settings table - for global configuration
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// SEO Analysis Results table - cached analysis for content
export const seoAnalysisResults = pgTable("seo_analysis_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score").notNull(),
  titleScore: integer("title_score"),
  metaDescriptionScore: integer("meta_description_score"),
  keywordScore: integer("keyword_score"),
  contentScore: integer("content_score"),
  readabilityScore: integer("readability_score"),
  technicalScore: integer("technical_score"),
  issues: jsonb("issues").$type<SeoIssue[]>().default([]),
  suggestions: jsonb("suggestions").$type<SeoSuggestion[]>().default([]),
  analyzedAt: timestamp("analyzed_at").defaultNow(),
}, (table) => [
  index("IDX_seo_analysis_content").on(table.contentId),
]);

// SEO Issue and Suggestion types
export interface SeoIssue {
  type: "error" | "warning" | "info";
  category: string;
  message: string;
  field?: string;
  impact: "high" | "medium" | "low";
}

export interface SeoSuggestion {
  category: string;
  suggestion: string;
  priority: "high" | "medium" | "low";
  estimatedImpact?: string;
}

export const insertSeoAnalysisResultSchema = createInsertSchema(seoAnalysisResults);
export type InsertSeoAnalysisResult = z.infer<typeof insertSeoAnalysisResultSchema>;
export type SeoAnalysisResult = typeof seoAnalysisResults.$inferSelect;

// SEO Audit Logs table - tracks SEO actions and changes
export const seoAuditLogs = pgTable("seo_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(),
  reason: text("reason"),
  triggeredBy: varchar("triggered_by").notNull().default("automatic"),
  status: varchar("status").notNull().default("pending"),
  priority: varchar("priority").default("medium"),
  data: text("data"),
  createdAt: timestamp("created_at").defaultNow(),
  executedAt: timestamp("executed_at"),
}, (table) => [
  index("IDX_seo_audit_content").on(table.contentId),
  index("IDX_seo_audit_created").on(table.createdAt),
]);

export const insertSeoAuditLogSchema = createInsertSchema(seoAuditLogs);
export type InsertSeoAuditLog = z.infer<typeof insertSeoAuditLogSchema>;
export type SeoAuditLog = typeof seoAuditLogs.$inferSelect;

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

// ============================================================================
// ENTERPRISE FEATURES - Teams, Workflows, Notifications, etc.
// ============================================================================

// Teams / Departments
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  parentId: varchar("parent_id").references((): any => teams.id),
  color: varchar("color", { length: 7 }), // hex color
  icon: varchar("icon", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_teams_parent").on(table.parentId),
  index("IDX_teams_slug").on(table.slug),
]);

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 50 }).default("member"), // lead, member
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_team_members_unique").on(table.teamId, table.userId),
  index("IDX_team_members_user").on(table.userId),
]);

export const insertTeamSchema = createInsertSchema(teams);
export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;

// Content Workflows
export const workflowStatusEnum = pgEnum("workflow_status", ["pending", "in_progress", "approved", "rejected", "cancelled"]);

export const workflowTemplates = pgTable("workflow_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  contentTypes: jsonb("content_types").$type<string[]>().default([]), // which content types use this workflow
  steps: jsonb("steps").$type<WorkflowStep[]>().default([]),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface WorkflowStep {
  order: number;
  name: string;
  description?: string;
  approverType: "user" | "role" | "team";
  approverId?: string; // user id, role name, or team id
  autoApproveAfter?: number; // hours
  notifyOnPending: boolean;
}

export const workflowInstances = pgTable("workflow_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => workflowTemplates.id),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  status: workflowStatusEnum("status").default("pending"),
  currentStep: integer("current_step").default(0),
  submittedBy: varchar("submitted_by").references(() => users.id),
  submittedAt: timestamp("submitted_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
}, (table) => [
  index("IDX_workflow_instances_content").on(table.contentId),
  index("IDX_workflow_instances_status").on(table.status),
]);

export const workflowApprovals = pgTable("workflow_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceId: varchar("instance_id").notNull().references(() => workflowInstances.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  approverId: varchar("approver_id").references(() => users.id),
  status: workflowStatusEnum("status").default("pending"),
  comment: text("comment"),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_workflow_approvals_instance").on(table.instanceId),
  index("IDX_workflow_approvals_approver").on(table.approverId),
]);

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates);
export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances);
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type WorkflowApproval = typeof workflowApprovals.$inferSelect;

// Activity Feed
export const activityTypeEnum = pgEnum("activity_type", [
  "content_created", "content_updated", "content_published", "content_deleted",
  "comment_added", "workflow_submitted", "workflow_approved", "workflow_rejected",
  "user_joined", "user_updated", "team_created", "translation_completed",
  "media_uploaded", "settings_changed", "login", "logout"
]);

export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: activityTypeEnum("type").notNull(),
  actorId: varchar("actor_id").references(() => users.id),
  targetType: varchar("target_type", { length: 50 }), // content, user, team, etc.
  targetId: varchar("target_id"),
  targetTitle: text("target_title"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  teamId: varchar("team_id").references(() => teams.id), // for team-scoped activities
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_activities_actor").on(table.actorId),
  index("IDX_activities_target").on(table.targetType, table.targetId),
  index("IDX_activities_team").on(table.teamId),
  index("IDX_activities_created").on(table.createdAt),
]);

export const insertActivitySchema = createInsertSchema(activities);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Content Locking
export const contentLocks = pgTable("content_locks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lockedAt: timestamp("locked_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
}, (table) => [
  uniqueIndex("IDX_content_locks_active").on(table.contentId).where(sql`is_active = true`),
  index("IDX_content_locks_user").on(table.userId),
  index("IDX_content_locks_expires").on(table.expiresAt),
]);

export const insertContentLockSchema = createInsertSchema(contentLocks);
export type InsertContentLock = z.infer<typeof insertContentLockSchema>;
export type ContentLock = typeof contentLocks.$inferSelect;

// Notifications
export const notificationTypeEnum = pgEnum("notification_type", [
  "info", "success", "warning", "error",
  "workflow_pending", "workflow_approved", "workflow_rejected",
  "comment_mention", "comment_reply", "content_assigned",
  "system"
]);

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").default("info"),
  title: text("title").notNull(),
  message: text("message"),
  link: text("link"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_notifications_user").on(table.userId),
  index("IDX_notifications_unread").on(table.userId, table.isRead),
  index("IDX_notifications_created").on(table.createdAt),
]);

export const insertNotificationSchema = createInsertSchema(notifications);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Webhooks
export const webhookEventEnum = pgEnum("webhook_event", [
  "content.created", "content.updated", "content.published", "content.deleted",
  "user.created", "user.updated", "translation.completed",
  "workflow.submitted", "workflow.approved", "workflow.rejected",
  "comment.created", "media.uploaded"
]);

export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret"), // for signature verification
  events: jsonb("events").$type<string[]>().default([]),
  headers: jsonb("headers").$type<Record<string, string>>(),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_webhooks_active").on(table.isActive),
]);

export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  payload: jsonb("payload"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  error: text("error"),
  duration: integer("duration"), // ms
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_webhook_logs_webhook").on(table.webhookId),
  index("IDX_webhook_logs_created").on(table.createdAt),
]);

export const insertWebhookSchema = createInsertSchema(webhooks);
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;
export type WebhookLog = typeof webhookLogs.$inferSelect;

// Comments / Collaboration
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id").references((): any => comments.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),
  mentions: jsonb("mentions").$type<string[]>().default([]), // user ids mentioned
  isResolved: boolean("is_resolved").default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_comments_content").on(table.contentId),
  index("IDX_comments_parent").on(table.parentId),
  index("IDX_comments_author").on(table.authorId),
]);

export const insertCommentSchema = createInsertSchema(comments);
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Scheduled Tasks
export const scheduledTasks = pgTable("scheduled_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 50 }).notNull(), // publish, unpublish, translate, etc.
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id").notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, completed, failed, cancelled
  error: text("error"),
  createdBy: varchar("created_by").references(() => users.id),
  executedAt: timestamp("executed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_scheduled_tasks_pending").on(table.scheduledFor).where(sql`status = 'pending'`),
  index("IDX_scheduled_tasks_target").on(table.targetType, table.targetId),
]);

export const insertScheduledTaskSchema = createInsertSchema(scheduledTasks);
export type InsertScheduledTask = z.infer<typeof insertScheduledTaskSchema>;
export type ScheduledTask = typeof scheduledTasks.$inferSelect;

// ============================================================================
// TELEGRAM BOT TABLES - ARCHIVED (see ARCHIVED_CODE_v1.0.md)
// Tables exist in database but code integration removed for optimization
// ============================================================================

// ============================================================================
// CONTENT RULES - Strict rules for AI content generation (cannot be bypassed)
// ============================================================================

export const contentRules = pgTable("content_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),

  // Word count rules (STRICT - cannot be bypassed)
  minWords: integer("min_words").default(1800).notNull(),
  maxWords: integer("max_words").default(3500).notNull(),
  optimalMinWords: integer("optimal_min_words").default(2000).notNull(),
  optimalMaxWords: integer("optimal_max_words").default(2500).notNull(),

  // Structure rules
  introMinWords: integer("intro_min_words").default(150).notNull(),
  introMaxWords: integer("intro_max_words").default(200).notNull(),

  quickFactsMin: integer("quick_facts_min").default(5).notNull(),
  quickFactsMax: integer("quick_facts_max").default(8).notNull(),
  quickFactsWordsMin: integer("quick_facts_words_min").default(80).notNull(),
  quickFactsWordsMax: integer("quick_facts_words_max").default(120).notNull(),

  mainSectionsMin: integer("main_sections_min").default(4).notNull(),
  mainSectionsMax: integer("main_sections_max").default(6).notNull(),
  mainSectionWordsMin: integer("main_section_words_min").default(200).notNull(),
  mainSectionWordsMax: integer("main_section_words_max").default(300).notNull(),

  faqsMin: integer("faqs_min").default(6).notNull(),
  faqsMax: integer("faqs_max").default(10).notNull(),
  faqAnswerWordsMin: integer("faq_answer_words_min").default(50).notNull(),
  faqAnswerWordsMax: integer("faq_answer_words_max").default(100).notNull(),

  proTipsMin: integer("pro_tips_min").default(5).notNull(),
  proTipsMax: integer("pro_tips_max").default(8).notNull(),
  proTipWordsMin: integer("pro_tip_words_min").default(20).notNull(),
  proTipWordsMax: integer("pro_tip_words_max").default(35).notNull(),

  conclusionMinWords: integer("conclusion_min_words").default(100).notNull(),
  conclusionMaxWords: integer("conclusion_max_words").default(150).notNull(),

  // Internal linking rules
  internalLinksMin: integer("internal_links_min").default(5).notNull(),
  internalLinksMax: integer("internal_links_max").default(10).notNull(),

  // SEO rules
  keywordDensityMin: integer("keyword_density_min").default(1).notNull(), // percentage * 10
  keywordDensityMax: integer("keyword_density_max").default(3).notNull(), // percentage * 10
  dubaiMentionsMin: integer("dubai_mentions_min").default(5).notNull(),

  // Retry rules
  maxRetries: integer("max_retries").default(3).notNull(),

  // Content type this rule applies to (null = all types)
  contentType: contentTypeEnum("content_type"),

  // Metadata
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentRulesSchema = createInsertSchema(contentRules);
export type InsertContentRules = z.infer<typeof insertContentRulesSchema>;
export type ContentRules = typeof contentRules.$inferSelect;

// Default rules that will be seeded
/**
 * @deprecated Use the AI Writers system instead (server/ai/writers/content-generator.ts)
 * This legacy content rules system is maintained for backward compatibility only.
 * New content generation should use writer-specific prompts and personalities.
 */
export const DEFAULT_CONTENT_RULES = {
  name: "dubai-seo-standard",
  description: "Standard SEO rules for Dubai tourism content - STRICT enforcement",
  isActive: true,
  minWords: 1800,
  maxWords: 3500,
  optimalMinWords: 2000,
  optimalMaxWords: 2500,
  introMinWords: 150,
  introMaxWords: 200,
  quickFactsMin: 5,
  quickFactsMax: 8,
  quickFactsWordsMin: 80,
  quickFactsWordsMax: 120,
  mainSectionsMin: 4,
  mainSectionsMax: 6,
  mainSectionWordsMin: 200,
  mainSectionWordsMax: 300,
  faqsMin: 6,
  faqsMax: 10,
  faqAnswerWordsMin: 50,
  faqAnswerWordsMax: 100,
  proTipsMin: 5,
  proTipsMax: 8,
  proTipWordsMin: 20,
  proTipWordsMax: 35,
  conclusionMinWords: 100,
  conclusionMaxWords: 150,
  internalLinksMin: 5,
  internalLinksMax: 10,
  keywordDensityMin: 10, // 1.0%
  keywordDensityMax: 30, // 3.0%
  dubaiMentionsMin: 5,
  maxRetries: 3,
  contentType: null,
};

// ============================================================================
// AGENT B - NEWSLETTER, ANALYTICS & INTEGRATIONS TABLES
// ============================================================================

// ============================================================================
// NEWSLETTER PRO TABLES
// ============================================================================

// Email Templates - for newsletter template builder
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_email_templates_category").on(table.category),
]);

// Email Template Blocks - building blocks for templates
export const emailTemplateBlocks = pgTable("email_template_blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => emailTemplates.id, { onDelete: "cascade" }),
  type: varchar("type").notNull(), // header, text, image, button, divider, footer
  order: integer("order").notNull().default(0),
  content: jsonb("content").$type<Record<string, any>>().default({}),
  styles: jsonb("styles").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_email_template_blocks_template").on(table.templateId),
  index("IDX_email_template_blocks_order").on(table.templateId, table.order),
]);

// Subscriber Segments - for segmentation
export const subscriberSegments = pgTable("subscriber_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  isDynamic: boolean("is_dynamic").default(true), // auto-update vs static
  subscriberCount: integer("subscriber_count").default(0),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Segment Conditions - rules for segments
export const segmentConditions = pgTable("segment_conditions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  segmentId: varchar("segment_id").notNull().references(() => subscriberSegments.id, { onDelete: "cascade" }),
  field: varchar("field").notNull(), // subscription_date, engagement, location, preferences
  operator: varchar("operator").notNull(), // equals, contains, greater_than, less_than
  value: jsonb("value").$type<any>().notNull(),
  logicOperator: varchar("logic_operator").default("AND"), // AND, OR
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_segment_conditions_segment").on(table.segmentId),
]);

// Newsletter A/B Tests - for testing subject lines, content, send times
export const newsletterAbTests = pgTable("newsletter_ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  campaignId: varchar("campaign_id").references(() => newsletterCampaigns.id),
  testType: varchar("test_type").notNull(), // subject_line, content, send_time
  variantA: jsonb("variant_a").$type<{ subject?: string; content?: string; sendTime?: string }>().notNull(),
  variantB: jsonb("variant_b").$type<{ subject?: string; content?: string; sendTime?: string }>().notNull(),
  splitPercentage: integer("split_percentage").default(50), // % for variant A
  testDurationHours: integer("test_duration_hours").default(24),
  autoSelectWinner: boolean("auto_select_winner").default(true),
  winnerMetric: varchar("winner_metric").default("open_rate"), // open_rate, click_rate
  status: varchar("status").default("running"), // draft, running, completed, paused
  winnerId: varchar("winner_id"), // "a" or "b"
  statsA: jsonb("stats_a").$type<{ sent: number; opened: number; clicked: number; bounced: number }>().default({ sent: 0, opened: 0, clicked: 0, bounced: 0 }),
  statsB: jsonb("stats_b").$type<{ sent: number; opened: number; clicked: number; bounced: number }>().default({ sent: 0, opened: 0, clicked: 0, bounced: 0 }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_newsletter_ab_tests_status").on(table.status),
  index("IDX_newsletter_ab_tests_campaign").on(table.campaignId),
]);

// Drip Campaigns - multi-step email sequences
export const dripCampaigns = pgTable("drip_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Drip Campaign Steps - individual emails in a sequence
export const dripCampaignSteps = pgTable("drip_campaign_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => dripCampaigns.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  delayAmount: integer("delay_amount").notNull(), // number of hours/days/weeks
  delayUnit: varchar("delay_unit").notNull().default("days"), // hours, days, weeks
  subject: varchar("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  plainTextContent: text("plain_text_content"),
  skipConditions: jsonb("skip_conditions").$type<any[]>().default([]),
  exitConditions: jsonb("exit_conditions").$type<any[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_drip_campaign_steps_campaign").on(table.campaignId),
  index("IDX_drip_campaign_steps_order").on(table.campaignId, table.stepNumber),
]);

// Drip Campaign Enrollments - track user progress through campaigns
export const dripCampaignEnrollments = pgTable("drip_campaign_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id").notNull().references(() => dripCampaigns.id, { onDelete: "cascade" }),
  subscriberId: varchar("subscriber_id").notNull().references(() => newsletterSubscribers.id, { onDelete: "cascade" }),
  currentStep: integer("current_step").default(0),
  status: varchar("status").default("active"), // active, completed, exited, paused
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  nextEmailAt: timestamp("next_email_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
}, (table) => [
  index("IDX_drip_enrollments_campaign").on(table.campaignId),
  index("IDX_drip_enrollments_subscriber").on(table.subscriberId),
  index("IDX_drip_enrollments_next_email").on(table.nextEmailAt),
  uniqueIndex("IDX_drip_enrollments_unique").on(table.campaignId, table.subscriberId),
]);

// Behavioral Triggers - event-based email automation
export const behavioralTriggers = pgTable("behavioral_triggers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_behavioral_triggers_event_type").on(table.eventType),
  index("IDX_behavioral_triggers_active").on(table.isActive),
]);

// Integration Connections - for external service integrations
export const integrationConnections = pgTable("integration_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_integration_connections_provider").on(table.provider),
  index("IDX_integration_connections_status").on(table.status),
]);

// ============================================================================
// AUTOMATION & INTEGRATIONS TABLES
// ============================================================================

// Scheduled Reports - automated report generation
export const scheduledReports = pgTable("scheduled_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  reportType: varchar("report_type").notNull(), // content_performance, newsletter_stats, revenue
  schedule: varchar("schedule").notNull(), // daily, weekly, monthly
  scheduleConfig: jsonb("schedule_config").$type<{ dayOfWeek?: number; dayOfMonth?: number; hour: number }>().notNull(),
  recipients: jsonb("recipients").$type<string[]>().notNull().default([]),
  format: varchar("format").default("pdf"), // pdf, csv, html
  filters: jsonb("filters").$type<Record<string, any>>().default({}),
  isActive: boolean("is_active").default(true),
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_scheduled_reports_next_run").on(table.nextRunAt),
  index("IDX_scheduled_reports_active").on(table.isActive),
]);

// Content Calendar Items - AI-powered content scheduling
export const contentCalendarItems = pgTable("content_calendar_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "set null" }),
  title: varchar("title").notNull(),
  contentType: varchar("content_type").notNull(),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: varchar("status").default("scheduled"), // scheduled, published, cancelled
  aiSuggestion: boolean("ai_suggestion").default(false),
  aiReason: text("ai_reason"), // why AI suggested this date/time
  priority: integer("priority").default(5), // 1-10
  tags: jsonb("tags").$type<string[]>().default([]),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_content_calendar_date").on(table.scheduledDate),
  index("IDX_content_calendar_status").on(table.status),
]);

// ============================================================================
// ANALYTICS PRO TABLES
// ============================================================================

// Realtime Sessions - active visitor tracking
export const realtimeSessions = pgTable("realtime_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_realtime_sessions_active").on(table.isActive),
  index("IDX_realtime_sessions_visitor").on(table.visitorId),
  index("IDX_realtime_sessions_last_activity").on(table.lastActivityAt),
]);

// User Journeys - session-based path tracking
export const userJourneys = pgTable("user_journeys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_user_journeys_visitor").on(table.visitorId),
  index("IDX_user_journeys_started_at").on(table.startedAt),
  index("IDX_user_journeys_converted").on(table.converted),
]);

// Journey Touchpoints - individual steps in a journey
export const journeyTouchpoints = pgTable("journey_touchpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  journeyId: varchar("journey_id").notNull().references(() => userJourneys.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  pageUrl: varchar("page_url").notNull(),
  pageTitle: varchar("page_title"),
  eventType: varchar("event_type"), // page_view, click, scroll, form_submit
  timeOnPage: integer("time_on_page"), // seconds
  scrollDepth: integer("scroll_depth"), // percentage
  interactionData: jsonb("interaction_data").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("IDX_journey_touchpoints_journey").on(table.journeyId),
  index("IDX_journey_touchpoints_step").on(table.journeyId, table.stepNumber),
]);

// Conversion Funnels - define and track conversion funnels
export const conversionFunnels = pgTable("conversion_funnels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Funnel Steps - steps in a conversion funnel
export const funnelSteps = pgTable("funnel_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull().references(() => conversionFunnels.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  name: varchar("name").notNull(),
  matchType: varchar("match_type").default("url"), // url, event, custom
  matchValue: varchar("match_value").notNull(),
  entryCount: integer("entry_count").default(0),
  exitCount: integer("exit_count").default(0),
  conversionCount: integer("conversion_count").default(0),
  dropoffRate: integer("dropoff_rate").default(0), // percentage * 100
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_funnel_steps_funnel").on(table.funnelId),
  index("IDX_funnel_steps_order").on(table.funnelId, table.stepNumber),
]);

// Funnel Events - track individual funnel progression events
export const funnelEvents = pgTable("funnel_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  funnelId: varchar("funnel_id").notNull().references(() => conversionFunnels.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull(),
  visitorId: varchar("visitor_id").notNull(),
  currentStep: integer("current_step").notNull(),
  completed: boolean("completed").default(false),
  droppedAtStep: integer("dropped_at_step"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
}, (table) => [
  index("IDX_funnel_events_funnel").on(table.funnelId),
  index("IDX_funnel_events_session").on(table.sessionId),
  index("IDX_funnel_events_visitor").on(table.visitorId),
]);

// Cohorts - user grouping for cohort analysis
export const cohorts = pgTable("cohorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

// Custom Reports - saved report configurations
export const customReports = pgTable("custom_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  reportType: varchar("report_type").notNull(), // table, chart, metric
  metrics: jsonb("metrics").$type<string[]>().notNull().default([]),
  dimensions: jsonb("dimensions").$type<string[]>().notNull().default([]),
  filters: jsonb("filters").$type<Record<string, any>>().default({}),
  dateRange: jsonb("date_range").$type<{ type: string; start?: string; end?: string }>().notNull(),
  visualization: jsonb("visualization").$type<{ type: string; config: Record<string, any> }>().notNull(),
  isPublic: boolean("is_public").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Data Exports - export configurations for data warehouses
export const dataExports = pgTable("data_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_data_exports_next_export").on(table.nextExportAt),
  index("IDX_data_exports_active").on(table.isActive),
]);

// Insert schemas and types for new tables
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);
export const insertEmailTemplateBlockSchema = createInsertSchema(emailTemplateBlocks);
export const insertSubscriberSegmentSchema = createInsertSchema(subscriberSegments);
export const insertSegmentConditionSchema = createInsertSchema(segmentConditions);
export const insertNewsletterAbTestSchema = createInsertSchema(newsletterAbTests);
export const insertDripCampaignSchema = createInsertSchema(dripCampaigns);
export const insertDripCampaignStepSchema = createInsertSchema(dripCampaignSteps);
export const insertDripCampaignEnrollmentSchema = createInsertSchema(dripCampaignEnrollments);
export const insertBehavioralTriggerSchema = createInsertSchema(behavioralTriggers);
export const insertIntegrationConnectionSchema = createInsertSchema(integrationConnections);
export const insertScheduledReportSchema = createInsertSchema(scheduledReports);
export const insertContentCalendarItemSchema = createInsertSchema(contentCalendarItems);
export const insertRealtimeSessionSchema = createInsertSchema(realtimeSessions);
export const insertUserJourneySchema = createInsertSchema(userJourneys);
export const insertJourneyTouchpointSchema = createInsertSchema(journeyTouchpoints);
export const insertConversionFunnelSchema = createInsertSchema(conversionFunnels);
export const insertFunnelStepSchema = createInsertSchema(funnelSteps);
export const insertFunnelEventSchema = createInsertSchema(funnelEvents);
export const insertCohortSchema = createInsertSchema(cohorts);
export const insertCustomReportSchema = createInsertSchema(customReports);
export const insertDataExportSchema = createInsertSchema(dataExports);

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplateBlock = typeof emailTemplateBlocks.$inferSelect;
export type InsertEmailTemplateBlock = z.infer<typeof insertEmailTemplateBlockSchema>;
export type SubscriberSegment = typeof subscriberSegments.$inferSelect;
export type InsertSubscriberSegment = z.infer<typeof insertSubscriberSegmentSchema>;
export type SegmentCondition = typeof segmentConditions.$inferSelect;
export type InsertSegmentCondition = z.infer<typeof insertSegmentConditionSchema>;
export type NewsletterAbTest = typeof newsletterAbTests.$inferSelect;
export type InsertNewsletterAbTest = z.infer<typeof insertNewsletterAbTestSchema>;
export type DripCampaign = typeof dripCampaigns.$inferSelect;
export type InsertDripCampaign = z.infer<typeof insertDripCampaignSchema>;
export type DripCampaignStep = typeof dripCampaignSteps.$inferSelect;
export type InsertDripCampaignStep = z.infer<typeof insertDripCampaignStepSchema>;
export type DripCampaignEnrollment = typeof dripCampaignEnrollments.$inferSelect;
export type InsertDripCampaignEnrollment = z.infer<typeof insertDripCampaignEnrollmentSchema>;
export type BehavioralTrigger = typeof behavioralTriggers.$inferSelect;
export type InsertBehavioralTrigger = z.infer<typeof insertBehavioralTriggerSchema>;
export type IntegrationConnection = typeof integrationConnections.$inferSelect;
export type InsertIntegrationConnection = z.infer<typeof insertIntegrationConnectionSchema>;
export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type InsertScheduledReport = z.infer<typeof insertScheduledReportSchema>;
export type ContentCalendarItem = typeof contentCalendarItems.$inferSelect;
export type InsertContentCalendarItem = z.infer<typeof insertContentCalendarItemSchema>;
export type RealtimeSession = typeof realtimeSessions.$inferSelect;
export type InsertRealtimeSession = z.infer<typeof insertRealtimeSessionSchema>;
export type UserJourney = typeof userJourneys.$inferSelect;
export type InsertUserJourney = z.infer<typeof insertUserJourneySchema>;
export type JourneyTouchpoint = typeof journeyTouchpoints.$inferSelect;
export type InsertJourneyTouchpoint = z.infer<typeof insertJourneyTouchpointSchema>;
export type ConversionFunnel = typeof conversionFunnels.$inferSelect;
export type InsertConversionFunnel = z.infer<typeof insertConversionFunnelSchema>;
export type FunnelStep = typeof funnelSteps.$inferSelect;
export type InsertFunnelStep = z.infer<typeof insertFunnelStepSchema>;
export type FunnelEvent = typeof funnelEvents.$inferSelect;
export type InsertFunnelEvent = z.infer<typeof insertFunnelEventSchema>;
export type Cohort = typeof cohorts.$inferSelect;
export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type CustomReport = typeof customReports.$inferSelect;
export type InsertCustomReport = z.infer<typeof insertCustomReportSchema>;
export type DataExport = typeof dataExports.$inferSelect;
export type InsertDataExport = z.infer<typeof insertDataExportSchema>;

// ============================================================================
// AI WRITERS TABLES
// ============================================================================

// Writer assignment status enum
export const writerAssignmentStatusEnum = pgEnum("writer_assignment_status", ["pending", "in_progress", "review", "completed", "published"]);

// Writer assignment priority enum
export const writerAssignmentPriorityEnum = pgEnum("writer_assignment_priority", ["low", "normal", "high", "urgent"]);

// AI Writers table
export const aiWriters = pgTable("ai_writers", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  avatar: text("avatar"),
  nationality: text("nationality"),
  age: integer("age"),
  expertise: text("expertise").array(),
  personality: text("personality"),
  writingStyle: text("writing_style"),
  voiceCharacteristics: jsonb("voice_characteristics").$type<string[]>().default([]),
  samplePhrases: text("sample_phrases").array(),
  bio: text("bio"),
  shortBio: text("short_bio"),
  socialMedia: jsonb("social_media").$type<{
    platform?: string;
    style?: string;
    hashtags?: string[];
  }>(),
  contentTypes: text("content_types").array(),
  languages: text("languages").array(),
  isActive: boolean("is_active").default(true),
  articleCount: integer("article_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_ai_writers_slug").on(table.slug),
  index("IDX_ai_writers_active").on(table.isActive),
]);

// Writer Assignments table
export const writerAssignments = pgTable("writer_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  writerId: varchar("writer_id").references(() => aiWriters.id),
  contentId: varchar("content_id").references(() => contents.id),
  contentType: text("content_type"),
  topic: text("topic"),
  status: writerAssignmentStatusEnum("status").default("pending"),
  matchScore: integer("match_score"),
  priority: writerAssignmentPriorityEnum("priority").default("normal"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_writer_assignments_writer").on(table.writerId),
  index("IDX_writer_assignments_content").on(table.contentId),
  index("IDX_writer_assignments_status").on(table.status),
]);

// Writer Performance table
export const writerPerformance = pgTable("writer_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  writerId: varchar("writer_id").references(() => aiWriters.id),
  period: varchar("period"), // "2025-01", "2025-W52"
  articlesWritten: integer("articles_written").default(0),
  totalViews: integer("total_views").default(0),
  avgEngagement: integer("avg_engagement"),
  avgSeoScore: integer("avg_seo_score"),
  avgVoiceScore: integer("avg_voice_score"),
  topPerformingArticle: varchar("top_performing_article"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_writer_performance_writer").on(table.writerId),
  index("IDX_writer_performance_period").on(table.period),
]);

// Define schema validators
export const insertAiWriterSchema = createInsertSchema(aiWriters);

export const insertWriterAssignmentSchema = createInsertSchema(writerAssignments);

export const insertWriterPerformanceSchema = createInsertSchema(writerPerformance);

// Define types
export type AIWriter = typeof aiWriters.$inferSelect;
export type InsertAIWriter = z.infer<typeof insertAiWriterSchema>;
export type WriterAssignment = typeof writerAssignments.$inferSelect;
export type InsertWriterAssignment = z.infer<typeof insertWriterAssignmentSchema>;
export type WriterPerformance = typeof writerPerformance.$inferSelect;
export type InsertWriterPerformance = z.infer<typeof insertWriterPerformanceSchema>;

// ============================================================================
// MAGIC LINK AUTHENTICATION TABLES
// ============================================================================

export const magicLinkTokens = pgTable("magic_link_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_magic_link_tokens_email").on(table.email),
  index("IDX_magic_link_tokens_token").on(table.token),
]);

export const insertMagicLinkTokenSchema = createInsertSchema(magicLinkTokens);

export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type InsertMagicLinkToken = z.infer<typeof insertMagicLinkTokenSchema>;

// ============================================================================
// EMAIL OTP AUTHENTICATION TABLES
// ============================================================================

export const emailOtpCodes = pgTable("email_otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  codeHash: varchar("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_email_otp_codes_email").on(table.email),
]);

export const insertEmailOtpCodeSchema = createInsertSchema(emailOtpCodes);

export type EmailOtpCode = typeof emailOtpCodes.$inferSelect;
export type InsertEmailOtpCode = z.infer<typeof insertEmailOtpCodeSchema>;

// ============================================================================
// AI CONTENT SCORING TABLES
// ============================================================================

export const contentScores = pgTable("content_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "cascade" }),
  overallScore: integer("overall_score"),
  readabilityScore: integer("readability_score"),
  seoScore: integer("seo_score"),
  engagementScore: integer("engagement_score"),
  originalityScore: integer("originality_score"),
  structureScore: integer("structure_score"),
  feedback: jsonb("feedback").$type<string[]>().default([]),
  suggestions: jsonb("suggestions").$type<string[]>().default([]),
  analysis: jsonb("analysis").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_content_scores_content").on(table.contentId),
]);

export const insertContentScoreSchema = createInsertSchema(contentScores);

export type ContentScore = typeof contentScores.$inferSelect;
export type InsertContentScore = z.infer<typeof insertContentScoreSchema>;

// ============================================================================
// WORKFLOW TABLES
// ============================================================================

export const automationStatusEnum = pgEnum("automation_status", ["active", "inactive", "draft"]);
export const workflowExecutionStatusEnum = pgEnum("workflow_execution_status", ["pending", "running", "completed", "failed"]);

export const workflows = pgTable("workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  trigger: jsonb("trigger").$type<{
    type: string;
    conditions: Record<string, unknown>;
  }>().notNull(),
  actions: jsonb("actions").$type<Array<{
    type: string;
    config: Record<string, unknown>;
  }>>().notNull(),
  status: automationStatusEnum("status").notNull().default("draft"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_workflows_status").on(table.status),
]);

export const workflowExecutions = pgTable("workflow_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").references(() => workflows.id, { onDelete: "cascade" }),
  status: workflowExecutionStatusEnum("status").notNull().default("pending"),
  triggerData: jsonb("trigger_data"),
  result: jsonb("result"),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_workflow_executions_workflow").on(table.workflowId),
  index("IDX_workflow_executions_status").on(table.status),
]);

export const insertWorkflowSchema = createInsertSchema(workflows);

export const insertWorkflowExecutionSchema = createInsertSchema(workflowExecutions);

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type InsertWorkflowExecution = z.infer<typeof insertWorkflowExecutionSchema>;

// ============================================================================
// MONETIZATION - PARTNER & AFFILIATE TABLES
// ============================================================================

export const partnerStatusEnum = pgEnum("partner_status", ["active", "pending", "suspended", "inactive"]);
export const payoutStatusEnum = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);

export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_partners_status").on(table.status),
  index("IDX_partners_tracking").on(table.trackingCode),
]);

export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_payouts_partner").on(table.partnerId),
  index("IDX_payouts_status").on(table.status),
]);

export const insertPartnerSchema = createInsertSchema(partners);

export const insertPayoutSchema = createInsertSchema(payouts);

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;

// ============================================================================
// A/B TESTING EXTENDED TABLES
// ============================================================================

export const abTestVariants = pgTable("ab_test_variants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => abTests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  config: jsonb("config").$type<Record<string, unknown>>().notNull(),
  isControl: boolean("is_control").notNull().default(false),
  weight: integer("weight").notNull().default(50),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_ab_test_variants_test").on(table.testId),
]);

export const abTestEvents = pgTable("ab_test_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").references(() => abTests.id, { onDelete: "cascade" }),
  variantId: varchar("variant_id").references(() => abTestVariants.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  userId: varchar("user_id"),
  sessionId: varchar("session_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_ab_test_events_test").on(table.testId),
  index("IDX_ab_test_events_variant").on(table.variantId),
  index("IDX_ab_test_events_created").on(table.createdAt),
]);

export const insertAbTestVariantSchema = createInsertSchema(abTestVariants);

export const insertAbTestEventSchema = createInsertSchema(abTestEvents);

export type AbTestVariant = typeof abTestVariants.$inferSelect;
export type InsertAbTestVariant = z.infer<typeof insertAbTestVariantSchema>;
export type AbTestEvent = typeof abTestEvents.$inferSelect;
export type InsertAbTestEvent = z.infer<typeof insertAbTestEventSchema>;

// Export ContentType for use in AI Writers system
export type ContentType = typeof contents.$inferSelect.type;

// ============================================================================
// REAL ESTATE PAGES - CMS EDITABLE CONTENT FOR STATIC PAGES
// ============================================================================

export const realEstatePageCategoryEnum = pgEnum("real_estate_page_category", [
  "guide",
  "calculator",
  "comparison",
  "case_study",
  "location",
  "developer",
  "pillar"
]);

export const realEstatePages = pgTable("real_estate_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageKey: varchar("page_key").notNull().unique(),
  category: realEstatePageCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  introText: text("intro_text"),
  sections: jsonb("sections").$type<Array<{
    id: string;
    type: string;
    title?: string;
    content?: string;
    data?: unknown;
  }>>().default([]),
  faqs: jsonb("faqs").$type<Array<{
    question: string;
    answer: string;
  }>>().default([]),
  relatedLinks: jsonb("related_links").$type<Array<{
    title: string;
    path: string;
    description?: string;
  }>>().default([]),
  isActive: boolean("is_active").notNull().default(true),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_real_estate_pages_category").on(table.category),
  index("IDX_real_estate_pages_active").on(table.isActive),
]);

export const insertRealEstatePageSchema = createInsertSchema(realEstatePages);

export type RealEstatePage = typeof realEstatePages.$inferSelect;
export type InsertRealEstatePage = z.infer<typeof insertRealEstatePageSchema>;


// ============================================================================
// SITE CONFIGURATION - FULLY EDITABLE CMS NAVIGATION & FOOTER
// ============================================================================

// Navigation Menus
export const navigationMenus = pgTable("navigation_menus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: varchar("slug").notNull().unique(),
  location: text("location").notNull().default("header"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNavigationMenuSchema = createInsertSchema(navigationMenus);

export type NavigationMenu = typeof navigationMenus.$inferSelect;
export type InsertNavigationMenu = z.infer<typeof insertNavigationMenuSchema>;

// Navigation Menu Items
export const navigationMenuItems = pgTable("navigation_menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menuId: varchar("menu_id").references(() => navigationMenus.id, { onDelete: "cascade" }).notNull(),
  parentId: varchar("parent_id"),
  label: text("label").notNull(),
  labelHe: text("label_he"),
  href: text("href").notNull(),
  icon: text("icon"),
  openInNewTab: boolean("open_in_new_tab").default(false),
  isHighlighted: boolean("is_highlighted").default(false),
  highlightStyle: text("highlight_style"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_nav_menu_items_menu").on(table.menuId),
  index("IDX_nav_menu_items_parent").on(table.parentId),
  index("IDX_nav_menu_items_order").on(table.sortOrder),
]);

export const insertNavigationMenuItemSchema = createInsertSchema(navigationMenuItems);

export type NavigationMenuItem = typeof navigationMenuItems.$inferSelect;
export type InsertNavigationMenuItem = z.infer<typeof insertNavigationMenuItemSchema>;

// Footer Sections
export const footerSections = pgTable("footer_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  titleHe: text("title_he"),
  slug: varchar("slug").notNull().unique(),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_footer_sections_order").on(table.sortOrder),
]);

export const insertFooterSectionSchema = createInsertSchema(footerSections);

export type FooterSection = typeof footerSections.$inferSelect;
export type InsertFooterSection = z.infer<typeof insertFooterSectionSchema>;

// Footer Links
export const footerLinks = pgTable("footer_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").references(() => footerSections.id, { onDelete: "cascade" }).notNull(),
  label: text("label").notNull(),
  labelHe: text("label_he"),
  href: text("href").notNull(),
  icon: text("icon"),
  openInNewTab: boolean("open_in_new_tab").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_footer_links_section").on(table.sectionId),
  index("IDX_footer_links_order").on(table.sortOrder),
]);

export const insertFooterLinkSchema = createInsertSchema(footerLinks);

export type FooterLink = typeof footerLinks.$inferSelect;
export type InsertFooterLink = z.infer<typeof insertFooterLinkSchema>;

// Static Page Translation structure for multi-language support
export interface StaticPageTranslation {
  title?: string;
  metaTitle?: string;
  metaDescription?: string;
  blocks?: Array<{ id: string; type: string; data: unknown }>;
  sourceHash?: string;
  translatedAt?: string;
}

// Static Pages (Terms, Privacy, About, Contact, etc.)
export const staticPages = pgTable("static_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  title: text("title").notNull(),
  titleHe: text("title_he"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  content: text("content"),
  contentHe: text("content_he"),
  blocks: jsonb("blocks").$type<Array<{
    id: string;
    type: string;
    data: unknown;
  }>>().default([]),
  translations: jsonb("translations").$type<Record<string, StaticPageTranslation>>().default({}),
  isActive: boolean("is_active").default(true),
  showInFooter: boolean("show_in_footer").default(false),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_static_pages_slug").on(table.slug),
  index("IDX_static_pages_active").on(table.isActive),
]);

export const insertStaticPageSchema = createInsertSchema(staticPages);

export type StaticPage = typeof staticPages.$inferSelect;
export type InsertStaticPage = z.infer<typeof insertStaticPageSchema>;

// Homepage Sections - controls structure, order, visibility of homepage sections
export const homepageSections = pgTable("homepage_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionKey: varchar("section_key", { length: 50 }).notNull().unique(), // immutable identifier
  title: text("title"),
  titleHe: text("title_he"),
  subtitle: text("subtitle"),
  subtitleHe: text("subtitle_he"),
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_homepage_sections_key").on(table.sectionKey),
  index("IDX_homepage_sections_order").on(table.sortOrder),
]);

export const insertHomepageSectionSchema = createInsertSchema(homepageSections);

export type HomepageSectionEntry = typeof homepageSections.$inferSelect;
export type InsertHomepageSectionEntry = z.infer<typeof insertHomepageSectionSchema>;

// Homepage Category Cards - Quick navigation tiles (editable from admin)
export const homepageCards = pgTable("homepage_cards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sectionId: varchar("section_id"),
  icon: varchar("icon", { length: 50 }), // lucide icon name
  title: varchar("title", { length: 255 }),
  titleHe: text("title_he"),
  subtitle: varchar("subtitle", { length: 255 }),
  subtitleHe: text("subtitle_he"),
  linkUrl: varchar("link_url", { length: 255 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_homepage_cards_section").on(table.sectionId),
  index("IDX_homepage_cards_order").on(table.sortOrder),
]);

export const insertHomepageCardSchema = createInsertSchema(homepageCards);

export type HomepageCard = typeof homepageCards.$inferSelect;
export type InsertHomepageCard = z.infer<typeof insertHomepageCardSchema>;

// Experience Categories - Travel style categories (Luxury, Adventure, etc.)
export const experienceCategories = pgTable("experience_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }),
  nameHe: text("name_he"),
  description: text("description"),
  descriptionHe: text("description_he"),
  slug: varchar("slug", { length: 255 }),
  image: text("image"),
  imageAlt: text("image_alt"),
  icon: varchar("icon", { length: 50 }),
  href: varchar("href", { length: 255 }), // link URL for the category
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_experience_categories_order").on(table.sortOrder),
]);

export const insertExperienceCategorySchema = createInsertSchema(experienceCategories);

export type ExperienceCategory = typeof experienceCategories.$inferSelect;
export type InsertExperienceCategory = z.infer<typeof insertExperienceCategorySchema>;

// Region Links - Quick links grid for SEO (pre-footer)
export const regionLinks = pgTable("region_links", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  regionName: varchar("region_name", { length: 255 }).notNull(),
  name: text("name"),
  nameHe: text("name_he"),
  icon: varchar("icon", { length: 50 }),
  linkUrl: text("link_url"),
  links: jsonb("links").$type<Array<{ name: string; slug: string }>>().default([]),
  destinations: jsonb("destinations").$type<Array<{ name: string; slug: string }>>().default([]),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_region_links_order").on(table.sortOrder),
]);

export const insertRegionLinkSchema = createInsertSchema(regionLinks);

export type RegionLink = typeof regionLinks.$inferSelect;
export type InsertRegionLink = z.infer<typeof insertRegionLinkSchema>;

// Hero Slides - Homepage carousel images
export const heroSlides = pgTable("hero_slides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  imageAlt: text("image_alt"),
  headline: text("headline"),
  headlineHe: text("headline_he"),
  subheadline: text("subheadline"),
  subheadlineHe: text("subheadline_he"),
  ctaText: text("cta_text"),
  ctaTextHe: text("cta_text_he"),
  ctaLink: text("cta_link"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_hero_slides_order").on(table.sortOrder),
  index("IDX_hero_slides_active").on(table.isActive),
]);

export const insertHeroSlideSchema = createInsertSchema(heroSlides);

export type HeroSlide = typeof heroSlides.$inferSelect;
export type InsertHeroSlide = z.infer<typeof insertHeroSlideSchema>;

// Homepage CTA - Newsletter/CTA zone configuration with glassmorphism design
export const homepageCta = pgTable("homepage_cta", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eyebrow: text("eyebrow"),
  eyebrowHe: text("eyebrow_he"),
  headline: text("headline").notNull(),
  headlineHe: text("headline_he"),
  subheadline: text("subheadline"),
  subheadlineHe: text("subheadline_he"),
  inputPlaceholder: text("input_placeholder"),
  inputPlaceholderHe: text("input_placeholder_he"),
  buttonText: text("button_text"),
  buttonTextHe: text("button_text_he"),
  helperText: text("helper_text"),
  helperTextHe: text("helper_text_he"),
  backgroundImage: text("background_image"),
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHomepageCtaSchema = createInsertSchema(homepageCta);

export type HomepageCta = typeof homepageCta.$inferSelect;
export type InsertHomepageCta = z.infer<typeof insertHomepageCtaSchema>;

// Homepage SEO Meta - SEO configuration for homepage only
export const homepageSeoMeta = pgTable("homepage_seo_meta", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metaTitle: text("meta_title"),
  metaTitleHe: text("meta_title_he"),
  metaDescription: text("meta_description"),
  metaDescriptionHe: text("meta_description_he"),
  metaKeywords: text("meta_keywords"),
  ogTitle: text("og_title"),
  ogTitleHe: text("og_title_he"),
  ogDescription: text("og_description"),
  ogDescriptionHe: text("og_description_he"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  robotsMeta: text("robots_meta").default("index, follow"),
  schemaEnabled: boolean("schema_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHomepageSeoMetaSchema = createInsertSchema(homepageSeoMeta);

export type HomepageSeoMeta = typeof homepageSeoMeta.$inferSelect;
export type InsertHomepageSeoMeta = z.infer<typeof insertHomepageSeoMetaSchema>;

// ============================================
// Page SEO - Generic SEO configuration for any page path
// ============================================
export const pageSeo = pgTable("page_seo", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pagePath: varchar("page_path", { length: 255 }).notNull().unique(), // e.g. "/destinations", "/hotels", "/guides"
  pageLabel: varchar("page_label", { length: 255 }), // Human-readable label for admin UI
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  canonicalUrl: text("canonical_url"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  robotsMeta: text("robots_meta").default("index, follow"),
  jsonLdSchema: jsonb("json_ld_schema"), // Editable JSON-LD structured data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPageSeoSchema = createInsertSchema(pageSeo);

export type PageSeo = typeof pageSeo.$inferSelect;
export type InsertPageSeo = z.infer<typeof insertPageSeoSchema>;

// ============================================
// Destinations Index Config - Hero carousel for /destinations page
// ============================================

// Hero carousel slide type for destinations index
export interface DestinationsIndexHeroSlide {
  id: string;
  destinationId: string;      // Reference to destination in destinations table
  filename: string;           // Image filename in object storage
  alt: string;                // Alt text for SEO (required)
  order: number;              // Display order in carousel
  isActive: boolean;          // Whether to show in carousel
  cityType?: string;          // E.g. "Global Travel Hub"
  travelStyle?: string;       // E.g. "Luxury & Modern City"
  secondaryBadge?: string;    // E.g. "Nov–Mar"
}

export const destinationsIndexConfig = pgTable("destinations_index_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Hero carousel slides (ordered list)
  heroSlides: jsonb("hero_slides").$type<DestinationsIndexHeroSlide[]>().default([]),
  // Hero section content (DB-driven, no fallbacks)
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  heroDescription: text("hero_description"),
  heroCTAText: varchar("hero_cta_text"),
  heroCTALink: varchar("hero_cta_link"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDestinationsIndexConfigSchema = createInsertSchema(destinationsIndexConfig);

export type DestinationsIndexConfig = typeof destinationsIndexConfig.$inferSelect;
export type InsertDestinationsIndexConfig = z.infer<typeof insertDestinationsIndexConfigSchema>;

// ============================================
// CMS Translations System - Language-agnostic localization
// ============================================

// CMS Entity type enum for type safety
export const cmsEntityTypeEnum = pgEnum("cms_entity_type", [
  "homepage_section",
  "homepage_card", 
  "experience_category",
  "region_link",
  "hero_slide",
  "homepage_cta",
  "homepage_seo_meta",
  "destination"
]);

// CMS Translations table - stores localized text for CMS entities (not content)
export const cmsTranslations = pgTable("cms_translations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  entityType: cmsEntityTypeEnum("entity_type").notNull(),
  entityId: varchar("entity_id", { length: 255 }).notNull(), // can be uuid or integer as string
  locale: varchar("locale", { length: 10 }).notNull(), // en, he, fr, es, etc.
  field: varchar("field", { length: 100 }).notNull(), // title, subtitle, description, etc.
  value: text("value"), // the translated text
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_cms_translations_unique").on(table.entityType, table.entityId, table.locale, table.field),
  index("IDX_cms_translations_entity").on(table.entityType, table.entityId),
  index("IDX_cms_translations_locale").on(table.locale),
]);

export const insertCmsTranslationSchema = createInsertSchema(cmsTranslations);

export type CmsTranslation = typeof cmsTranslations.$inferSelect;
export type InsertCmsTranslation = z.infer<typeof insertCmsTranslationSchema>;

// ============================================
// Page Builder System - Universal Section Editor
// ============================================

// Section type enum for type safety
export const sectionTypeEnum = pgEnum("section_type", [
  "hero",
  "intro_text", 
  "highlight_grid",
  "filter_bar",
  "content_grid",
  "cta",
  "faq",
  "testimonial",
  "gallery",
  "stats",
  "features",
  "text_image",
  "video",
  "newsletter",
  "custom"
]);

// Editable Pages - defines which pages can be edited via page builder
export const editablePages = pgTable("editable_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  pageType: varchar("page_type", { length: 50 }).notNull(), // home, category, static, landing
  title: text("title").notNull(),
  titleHe: text("title_he"),
  metaTitle: text("meta_title"),
  metaTitleHe: text("meta_title_he"),
  metaDescription: text("meta_description"),
  metaDescriptionHe: text("meta_description_he"),
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
}, (table) => [
  uniqueIndex("IDX_editable_pages_slug").on(table.slug),
  index("IDX_editable_pages_type").on(table.pageType),
]);

export const insertEditablePageSchema = createInsertSchema(editablePages);

export type EditablePage = typeof editablePages.$inferSelect;
export type InsertEditablePage = z.infer<typeof insertEditablePageSchema>;

// Page Sections - stores all editable sections for any page
export const pageSections = pgTable("page_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pageId: varchar("page_id").notNull().references(() => editablePages.id, { onDelete: "cascade" }),
  sectionType: text("section_type").notNull(),
  sectionKey: varchar("section_key", { length: 100 }), // unique key within page for easy reference
  
  // Content - English
  title: text("title"),
  subtitle: text("subtitle"),
  description: text("description"),
  buttonText: text("button_text"),
  buttonLink: text("button_link"),
  
  // Content - Hebrew  
  titleHe: text("title_he"),
  subtitleHe: text("subtitle_he"),
  descriptionHe: text("description_he"),
  buttonTextHe: text("button_text_he"),
  
  // Media
  backgroundImage: text("background_image"),
  backgroundVideo: text("background_video"),
  images: jsonb("images").$type<string[]>().default([]),
  
  // Flexible data for complex sections
  data: jsonb("data").$type<Record<string, unknown>>().default({}),
  dataHe: jsonb("data_he").$type<Record<string, unknown>>().default({}),
  
  // Styling
  backgroundColor: varchar("background_color", { length: 50 }),
  textColor: varchar("text_color", { length: 50 }),
  customCss: text("custom_css"),
  animation: varchar("animation", { length: 50 }),
  
  // Layout
  sortOrder: integer("sort_order").default(0),
  isVisible: boolean("is_visible").default(true),
  showOnMobile: boolean("show_on_mobile").default(true),
  showOnDesktop: boolean("show_on_desktop").default(true),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastEditedBy: varchar("last_edited_by").references(() => users.id),
}, (table) => [
  index("IDX_page_sections_page").on(table.pageId),
  index("IDX_page_sections_order").on(table.pageId, table.sortOrder),
  index("IDX_page_sections_key").on(table.pageId, table.sectionKey),
]);

export const insertPageSectionSchema = createInsertSchema(pageSections);

export type PageSection = typeof pageSections.$inferSelect;
export type InsertPageSection = z.infer<typeof insertPageSectionSchema>;

// Section Versions - version history for undo/redo
export const sectionVersions = pgTable("section_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => pageSections.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  changedBy: varchar("changed_by").references(() => users.id),
  changeDescription: text("change_description"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_section_versions_section").on(table.sectionId),
  index("IDX_section_versions_number").on(table.sectionId, table.versionNumber),
]);

export const insertSectionVersionSchema = createInsertSchema(sectionVersions);

export type SectionVersion = typeof sectionVersions.$inferSelect;
export type InsertSectionVersion = z.infer<typeof insertSectionVersionSchema>;

// Relations
export const editablePagesRelations = relations(editablePages, ({ many, one }) => ({
  sections: many(pageSections),
  lastEditor: one(users, { fields: [editablePages.lastEditedBy], references: [users.id] }),
}));

export const pageSectionsRelations = relations(pageSections, ({ one, many }) => ({
  page: one(editablePages, { fields: [pageSections.pageId], references: [editablePages.id] }),
  versions: many(sectionVersions),
  lastEditor: one(users, { fields: [pageSections.lastEditedBy], references: [users.id] }),
}));

export const sectionVersionsRelations = relations(sectionVersions, ({ one }) => ({
  section: one(pageSections, { fields: [sectionVersions.sectionId], references: [pageSections.id] }),
  editor: one(users, { fields: [sectionVersions.changedBy], references: [users.id] }),
}));

// ============================================================================
// DESTINATION INTELLIGENCE TABLES
// ============================================================================

// Destination status enum
export const destinationStatusEnum = pgEnum("destination_status", ["complete", "partial", "empty"]);

// Destination level enum (CMS Contract: Country → City → Area hierarchy)
export const destinationLevelEnum = pgEnum("destination_level", ["country", "city", "area"]);

// Destination image type for jsonb array
export interface DestinationImage {
  url: string;
  alt: string;
  caption?: string;
  section?: string;
  generatedAt?: string;
  provider?: string;
  cost?: number;
}

// Hero image type for carousel (CMS-driven)
export interface DestinationHeroImage {
  filename: string;      // Actual filename in destinations-hero/{slug}/
  order: number;         // Display order in carousel
  alt?: string;          // Optional override (auto-generated if empty)
  isActive: boolean;     // Whether to show in carousel
}

// CMS Contract: Image-led sections - every section must have visuals
// "No image = No section" rule enforced on frontend

export interface FeaturedAttraction {
  id: string;
  title: string;
  image: string;          // Required - path to attraction image
  imageAlt: string;       // Required - SEO alt text
  slug?: string;          // Link to attraction page if exists
  shortDescription?: string; // Optional teaser (max 120 chars)
  order: number;
  isActive: boolean;
}

export interface FeaturedArea {
  id: string;
  name: string;           // e.g., "Downtown Dubai", "Marina"
  image: string;          // Required - vibe image of the area
  imageAlt: string;       // Required - SEO alt text
  vibe: string;           // e.g., "luxury", "budget-friendly", "beach"
  priceLevel?: string;    // e.g., "$$$", "$$", "$"
  shortDescription?: string; // What it's like to stay there
  order: number;
  isActive: boolean;
}

export interface FeaturedHighlight {
  id: string;
  title: string;
  image: string;          // Required - stunning visual
  imageAlt: string;       // Required - SEO alt text
  caption?: string;       // Short caption (max 80 chars)
  linkUrl?: string;       // Optional CTA link
  order: number;
  isActive: boolean;
}

// Zod schemas for featured sections validation
export const featuredAttractionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  image: z.string().min(1, "Image URL is required"),
  imageAlt: z.string().min(1, "Image alt text is required"),
  slug: z.string().optional(),
  shortDescription: z.string().max(120, "Description must be 120 characters or less").optional(),
  order: z.number(),
  isActive: z.boolean()
});

export const featuredAreaSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  image: z.string().min(1, "Image URL is required"),
  imageAlt: z.string().min(1, "Image alt text is required"),
  vibe: z.string().min(1, "Vibe is required"),
  priceLevel: z.string().optional(),
  shortDescription: z.string().optional(),
  order: z.number(),
  isActive: z.boolean()
});

export const featuredHighlightSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  image: z.string().min(1, "Image URL is required"),
  imageAlt: z.string().min(1, "Image alt text is required"),
  caption: z.string().max(80, "Caption must be 80 characters or less").optional(),
  linkUrl: z.string().optional(),
  order: z.number(),
  isActive: z.boolean()
});

export const featuredSectionsUpdateSchema = z.object({
  featuredAttractions: z.array(featuredAttractionSchema).optional(),
  featuredAreas: z.array(featuredAreaSchema).optional(),
  featuredHighlights: z.array(featuredHighlightSchema).optional()
});

export type FeaturedSectionsUpdate = z.infer<typeof featuredSectionsUpdateSchema>;

// Destinations table - stores all travel destinations with content health metrics
// CMS Contract: Enforces Country → City → Area hierarchy with separate image slots
export const destinations = pgTable("destinations", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  country: varchar("country").notNull(),
  slug: varchar("slug").notNull(),
  // Normalized name for indexed lookup (lowercase, punctuation-stripped)
  normalizedName: varchar("normalized_name"),
  // CMS Contract: Hierarchy fields
  destinationLevel: destinationLevelEnum("destination_level").notNull().default("city"),
  parentDestinationId: varchar("parent_destination_id"),
  // CMS Contract: Summary for card preview (300 chars max)
  summary: text("summary"),
  // CMS Contract: Brand color (optional accent, NOT for CTAs)
  brandColor: varchar("brand_color"),
  isActive: boolean("is_active").notNull().default(false),
  status: destinationStatusEnum("status").notNull().default("empty"),
  hasPage: boolean("has_page").notNull().default(false),
  seoScore: integer("seo_score").notNull().default(0),
  wordCount: integer("word_count").notNull().default(0),
  internalLinks: integer("internal_links").notNull().default(0),
  externalLinks: integer("external_links").notNull().default(0),
  h2Count: integer("h2_count").notNull().default(0),
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  primaryKeyword: varchar("primary_keyword"),
  secondaryKeywords: text("secondary_keywords").array(),
  // CMS Contract: Hero image (hero section ONLY) - legacy single image
  heroImage: text("hero_image"),
  heroImageAlt: text("hero_image_alt"),
  // CMS Contract: Hero carousel images (ordered list for carousel)
  heroImages: jsonb("hero_images").$type<DestinationHeroImage[]>().default([]),
  // CMS Contract: Hero content (editable from Admin)
  heroTitle: text("hero_title"),
  heroSubtitle: text("hero_subtitle"),
  heroCTAText: varchar("hero_cta_text"),
  heroCTALink: varchar("hero_cta_link"),
  // CMS Contract: Destination mood/vibe for visual theming
  moodVibe: varchar("mood_vibe"), // luxury, cultural, adventure, romantic, tropical, modern
  moodTagline: varchar("mood_tagline"),
  moodPrimaryColor: varchar("mood_primary_color"),
  moodGradientFrom: varchar("mood_gradient_from"),
  moodGradientTo: varchar("mood_gradient_to"),
  // CMS Contract: Open Graph fields
  ogTitle: varchar("og_title"),
  ogDescription: text("og_description"),
  ogImage: varchar("og_image"), // Selected from hero images
  canonicalUrl: varchar("canonical_url"),
  // CMS Contract: Card image (grids/listings ONLY, never reuse hero)
  cardImage: text("card_image"),
  cardImageAlt: text("card_image_alt"),
  images: jsonb("images").$type<DestinationImage[]>().default([]),
  // CMS Contract: Image-led sections (No image = No section)
  featuredAttractions: jsonb("featured_attractions").$type<FeaturedAttraction[]>().default([]),
  featuredAreas: jsonb("featured_areas").$type<FeaturedArea[]>().default([]),
  featuredHighlights: jsonb("featured_highlights").$type<FeaturedHighlight[]>().default([]),
  translations: jsonb("translations").$type<Record<string, { title: string; metaTitle: string; metaDescription: string; translatedAt: string }>>().default({}),
  lastGenerated: timestamp("last_generated"),
  lastPublished: timestamp("last_published"),
  lastImageGenerated: timestamp("last_image_generated"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_destinations_normalized_name").on(table.normalizedName),
  index("IDX_destinations_slug").on(table.slug),
]);

export const insertDestinationSchema = createInsertSchema(destinations);

export type Destination = typeof destinations.$inferSelect;
export type InsertDestination = z.infer<typeof insertDestinationSchema>;

// Destination generated content table - stores AI-generated content for destinations
export const destinationContent = pgTable("destination_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id),
  contentType: varchar("content_type").notNull(), // hero, attractions, districts, hotels, restaurants, tips, events
  content: jsonb("content").notNull(),
  seoValidation: jsonb("seo_validation"),
  qualityScore: integer("quality_score").default(0),
  qualityTier: varchar("quality_tier"), // rejected, draft, review, publish, auto_approve
  generatedBy: varchar("generated_by"), // AI provider name
  generatedModel: varchar("generated_model"), // AI model used
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDestinationContentSchema = createInsertSchema(destinationContent);

export type DestinationContent = typeof destinationContent.$inferSelect;
export type InsertDestinationContent = z.infer<typeof insertDestinationContentSchema>;

// ============================================================================
// CATEGORY PAGES (CMS Contract)
// ============================================================================

// Category Pages table - thematic content groupings within destinations
// CMS Contract: Browse surface, no Primary CTAs allowed
export const categoryPages = pgTable("category_pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 40 }).notNull(),
  slug: varchar("slug").notNull(),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id),
  metaTitle: varchar("meta_title", { length: 60 }),
  metaDescription: text("meta_description"),
  // CMS Contract: Optional decorative image (NOT hero)
  headerImage: text("header_image"),
  headerImageAlt: text("header_image_alt"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_category_pages_destination").on(table.destinationId),
  index("IDX_category_pages_slug").on(table.slug),
]);

export const insertCategoryPageSchema = createInsertSchema(categoryPages);

export type CategoryPage = typeof categoryPages.$inferSelect;
export type InsertCategoryPage = z.infer<typeof insertCategoryPageSchema>;

// AI generation logs - tracks all AI content generation attempts
export const aiGenerationLogs = pgTable("ai_generation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetType: varchar("target_type").notNull(), // destination, article, hotel, attraction
  targetId: varchar("target_id").notNull(),
  provider: varchar("provider").notNull(),
  model: varchar("model").notNull(),
  prompt: text("prompt"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  success: boolean("success").notNull(),
  error: text("error"),
  seoScore: integer("seo_score"),
  qualityTier: varchar("quality_tier"),
  duration: integer("duration"), // in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiGenerationLogSchema = createInsertSchema(aiGenerationLogs);

export type AiGenerationLog = typeof aiGenerationLogs.$inferSelect;
export type InsertAiGenerationLog = z.infer<typeof insertAiGenerationLogSchema>;

// Research Upload Status
export const researchStatusEnum = pgEnum("research_status", ["pending", "analyzing", "analyzed", "generating", "completed", "failed"]);
export const suggestionStatusEnum = pgEnum("suggestion_status", ["pending", "approved", "rejected", "generating", "generated", "published"]);

// Research Uploads - stores deep research documents for "octopus" content extraction
export const researchUploads = pgTable("research_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  sourceType: varchar("source_type").notNull().default("paste"), // paste, file, url
  content: text("content").notNull(),
  status: researchStatusEnum("status").notNull().default("pending"),
  metadata: jsonb("metadata"), // { wordCount, topics, language, sourceUrl }
  analyzedAt: timestamp("analyzed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertResearchUploadSchema = createInsertSchema(researchUploads);

export type ResearchUpload = typeof researchUploads.$inferSelect;
export type InsertResearchUpload = z.infer<typeof insertResearchUploadSchema>;

// Content Suggestions - AI-extracted content ideas from research
export const contentSuggestions = pgTable("content_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  researchId: varchar("research_id").notNull().references(() => researchUploads.id, { onDelete: "cascade" }),
  suggestedTitle: varchar("suggested_title").notNull(),
  suggestedSlug: varchar("suggested_slug"),
  contentType: contentTypeEnum("content_type").notNull(),
  category: varchar("category"), // subcategory within type
  destinationCity: varchar("destination_city"), // Target city (e.g., "Dubai", "Abu Dhabi")
  destinationId: varchar("destination_id"), // Links to destinations table if applicable
  summary: text("summary"), // Brief description of the content
  keyPoints: jsonb("key_points"), // Array of main points to cover
  keywords: jsonb("keywords"), // Suggested SEO keywords
  sourceExcerpt: text("source_excerpt"), // Relevant excerpt from research
  priority: integer("priority").default(50), // 1-100, higher = more important
  confidence: integer("confidence").default(80), // AI confidence in suggestion 1-100
  isDuplicate: boolean("is_duplicate").default(false), // Flagged as potential duplicate
  duplicateOfId: varchar("duplicate_of_id"), // If duplicate, links to existing content
  status: suggestionStatusEnum("status").notNull().default("pending"),
  generatedContentId: varchar("generated_content_id"), // Links to created content
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContentSuggestionSchema = createInsertSchema(contentSuggestions);

export type ContentSuggestion = typeof contentSuggestions.$inferSelect;
export type InsertContentSuggestion = z.infer<typeof insertContentSuggestionSchema>;

// Relations for research system
export const researchUploadsRelations = relations(researchUploads, ({ many, one }) => ({
  suggestions: many(contentSuggestions),
  createdByUser: one(users, { fields: [researchUploads.createdBy], references: [users.id] }),
}));

export const contentSuggestionsRelations = relations(contentSuggestions, ({ one }) => ({
  research: one(researchUploads, { fields: [contentSuggestions.researchId], references: [researchUploads.id] }),
}));

// Destination relations
export const destinationsRelations = relations(destinations, ({ many }) => ({
  content: many(destinationContent),
}));

export const destinationContentRelations = relations(destinationContent, ({ one }) => ({
  destination: one(destinations, { fields: [destinationContent.destinationId], references: [destinations.id] }),
}));

// Section type definitions for TypeScript
export const SECTION_TYPES = {
  hero: {
    name: "Hero",
    nameHe: "באנר ראשי",
    description: "Large banner with title, subtitle, background image",
    fields: ["title", "subtitle", "buttonText", "buttonLink", "backgroundImage"],
  },
  intro_text: {
    name: "Introduction",
    nameHe: "טקסט פתיחה",
    description: "Introductory text block with optional image",
    fields: ["title", "description", "images"],
  },
  highlight_grid: {
    name: "Highlight Grid",
    nameHe: "גריד הדגשות",
    description: "Grid of highlighted items/features",
    fields: ["title", "data"],
  },
  filter_bar: {
    name: "Filter Bar",
    nameHe: "סרגל סינון",
    description: "Category filter buttons",
    fields: ["data"],
  },
  content_grid: {
    name: "Content Grid",
    nameHe: "גריד תוכן",
    description: "Grid of content cards",
    fields: ["title", "subtitle", "data"],
  },
  cta: {
    name: "Call to Action",
    nameHe: "קריאה לפעולה",
    description: "Call to action block",
    fields: ["title", "subtitle", "buttonText", "buttonLink", "backgroundImage"],
  },
  faq: {
    name: "FAQ",
    nameHe: "שאלות ותשובות",
    description: "Frequently asked questions accordion",
    fields: ["title", "data"],
  },
  testimonial: {
    name: "Testimonials",
    nameHe: "המלצות",
    description: "Customer testimonials/reviews",
    fields: ["title", "data"],
  },
  gallery: {
    name: "Image Gallery",
    nameHe: "גלריית תמונות",
    description: "Image gallery or carousel",
    fields: ["title", "images"],
  },
  stats: {
    name: "Statistics",
    nameHe: "סטטיסטיקות",
    description: "Key numbers/statistics display",
    fields: ["data"],
  },
  features: {
    name: "Features",
    nameHe: "תכונות",
    description: "Feature list with icons",
    fields: ["title", "data"],
  },
  text_image: {
    name: "Text + Image",
    nameHe: "טקסט + תמונה",
    description: "Two-column text and image layout",
    fields: ["title", "description", "images", "data"],
  },
  video: {
    name: "Video",
    nameHe: "וידאו",
    description: "Embedded video section",
    fields: ["title", "data"],
  },
  newsletter: {
    name: "Newsletter",
    nameHe: "ניוזלטר",
    description: "Newsletter signup form",
    fields: ["title", "subtitle", "buttonText"],
  },
  custom: {
    name: "Custom HTML",
    nameHe: "HTML מותאם",
    description: "Custom HTML/code block",
    fields: ["data"],
  },
} as const;

export type SectionTypeName = keyof typeof SECTION_TYPES;

// ============================================
// AEO (Answer Engine Optimization) Tables
// ============================================

// AEO Platform enum for tracking AI assistant platforms
export const aeoPlatformEnum = pgEnum("aeo_platform", ["chatgpt", "perplexity", "google_aio", "claude", "bing_chat", "gemini"]);

// AEO Citation type enum
export const aeoCitationTypeEnum = pgEnum("aeo_citation_type", ["direct", "paraphrase", "reference", "recommendation"]);

// AEO Content format enum for programmatic templates
export const aeoContentFormatEnum = pgEnum("aeo_content_format", [
  "comparison",        // "[District A] vs [District B] for [Traveler Type]"
  "best_time",         // "Best Time to Visit [Destination] for [Activity]"
  "cost_guide",        // "How Much Does [Experience] Cost in [Destination]"
  "faq_hub",           // "[Destination] Travel FAQ: Everything You Need to Know"
  "top_list",          // "Top 10 [Category] in [Destination]"
  "how_to",            // "How to [Action] in [Destination]"
  "vs_guide",          // "[Option A] vs [Option B]: Which is Better?"
  "complete_guide"     // "Complete Guide to [Topic]"
]);

// Answer Capsules - AI-optimized summaries for each content piece
export const aeoAnswerCapsules = pgTable("aeo_answer_capsules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  locale: localeEnum("locale").notNull().default("en"),
  capsuleText: text("capsule_text").notNull(), // 40-60 word summary
  capsuleHtml: text("capsule_html"), // Optional HTML version with schema markup
  keyFacts: jsonb("key_facts").$type<string[]>().default([]), // Key facts for AI extraction
  quickAnswer: text("quick_answer"), // Ultra-short 15-20 word answer
  differentiator: text("differentiator"), // Unique value proposition
  lastQuery: text("last_query"), // Last query this capsule answered
  qualityScore: integer("quality_score"), // AI evaluation score 0-100
  citationCount: integer("citation_count").default(0), // Times cited by AI platforms
  generatedByAI: boolean("generated_by_ai").default(true),
  isApproved: boolean("is_approved").default(false),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  generatedAt: timestamp("generated_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_aeo_capsules_content_locale").on(table.contentId, table.locale),
  index("IDX_aeo_capsules_quality").on(table.qualityScore),
  index("IDX_aeo_capsules_citations").on(table.citationCount),
]);

export const insertAeoAnswerCapsuleSchema = createInsertSchema(aeoAnswerCapsules);
export type InsertAeoAnswerCapsule = z.infer<typeof insertAeoAnswerCapsuleSchema>;
export type AeoAnswerCapsule = typeof aeoAnswerCapsules.$inferSelect;

// AEO Citations - Track when AI platforms cite our content
export const aeoCitations = pgTable("aeo_citations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  platform: aeoPlatformEnum("platform").notNull(),
  query: text("query").notNull(), // User query that triggered the citation
  citationType: aeoCitationTypeEnum("citation_type").notNull(),
  citedText: text("cited_text"), // Actual text that was cited
  responseContext: text("response_context"), // Surrounding context in AI response
  url: text("url"), // URL of the AI response if available
  position: integer("position"), // Position in AI response (1st, 2nd, etc.)
  competitorsCited: jsonb("competitors_cited").$type<string[]>().default([]), // Other sources cited
  sessionId: varchar("session_id"), // To group citations from same session
  userAgent: text("user_agent"),
  ipCountry: varchar("ip_country", { length: 2 }),
  detectedAt: timestamp("detected_at").defaultNow(),
}, (table) => [
  index("IDX_aeo_citations_content").on(table.contentId),
  index("IDX_aeo_citations_platform").on(table.platform),
  index("IDX_aeo_citations_detected").on(table.detectedAt),
  index("IDX_aeo_citations_platform_date").on(table.platform, table.detectedAt),
]);

export const insertAeoCitationSchema = createInsertSchema(aeoCitations);
export type InsertAeoCitation = z.infer<typeof insertAeoCitationSchema>;
export type AeoCitation = typeof aeoCitations.$inferSelect;

// AEO Performance Metrics - Aggregate daily metrics per platform
export const aeoPerformanceMetrics = pgTable("aeo_performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  platform: aeoPlatformEnum("platform").notNull(),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "set null" }), // null for aggregate
  contentType: contentTypeEnum("content_type"),
  impressions: integer("impressions").default(0), // Estimated AI query appearances
  citations: integer("citations").default(0), // Confirmed citations
  clickThroughs: integer("click_throughs").default(0), // Clicks from AI to our site
  conversions: integer("conversions").default(0), // Bookings from AI traffic
  revenue: integer("revenue").default(0), // Revenue from AI traffic in cents
  avgPosition: integer("avg_position"), // Average position in AI responses (x100 for precision)
  topQueries: jsonb("top_queries").$type<Array<{ query: string; count: number }>>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_aeo_metrics_date_platform_content").on(table.date, table.platform, table.contentId),
  index("IDX_aeo_metrics_date").on(table.date),
  index("IDX_aeo_metrics_platform").on(table.platform),
  index("IDX_aeo_metrics_content").on(table.contentId),
]);

export const insertAeoPerformanceMetricSchema = createInsertSchema(aeoPerformanceMetrics);
export type InsertAeoPerformanceMetric = z.infer<typeof insertAeoPerformanceMetricSchema>;
export type AeoPerformanceMetric = typeof aeoPerformanceMetrics.$inferSelect;

// AEO Crawler Logs - Track AI crawler visits
export const aeoCrawlerLogs = pgTable("aeo_crawler_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  crawler: varchar("crawler").notNull(), // GPTBot, PerplexityBot, Google-Extended, ClaudeBot
  userAgent: text("user_agent").notNull(),
  requestPath: text("request_path").notNull(),
  contentId: varchar("content_id").references(() => contents.id, { onDelete: "set null" }),
  statusCode: integer("status_code").notNull(),
  responseTime: integer("response_time"), // in milliseconds
  bytesServed: integer("bytes_served"),
  ipAddress: varchar("ip_address"),
  referer: text("referer"),
  crawledAt: timestamp("crawled_at").defaultNow(),
}, (table) => [
  index("IDX_aeo_crawler_crawler").on(table.crawler),
  index("IDX_aeo_crawler_date").on(table.crawledAt),
  index("IDX_aeo_crawler_path").on(table.requestPath),
]);

export const insertAeoCrawlerLogSchema = createInsertSchema(aeoCrawlerLogs);
export type InsertAeoCrawlerLog = z.infer<typeof insertAeoCrawlerLogSchema>;
export type AeoCrawlerLog = typeof aeoCrawlerLogs.$inferSelect;

// AEO Programmatic Content - Templates for scalable content generation
export const aeoProgrammaticContent = pgTable("aeo_programmatic_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  format: aeoContentFormatEnum("format").notNull(),
  templateName: varchar("template_name").notNull(),
  templatePattern: text("template_pattern").notNull(), // e.g., "{districtA} vs {districtB} for {travelerType}"
  variables: jsonb("variables").$type<Record<string, string[]>>().default({}), // Available values per variable
  generatedContentIds: jsonb("generated_content_ids").$type<string[]>().default([]),
  targetCount: integer("target_count").default(0), // How many pages to generate
  generatedCount: integer("generated_count").default(0),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0), // Higher = generate first
  lastGeneratedAt: timestamp("last_generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAeoProgrammaticContentSchema = createInsertSchema(aeoProgrammaticContent);
export type InsertAeoProgrammaticContent = z.infer<typeof insertAeoProgrammaticContentSchema>;
export type AeoProgrammaticContent = typeof aeoProgrammaticContent.$inferSelect;

// =====================================================
// Social Media Marketing Module (inspired by ALwrity)
// =====================================================

// Social platform enum
export const socialPlatformEnum = pgEnum("social_platform", ["linkedin", "twitter", "facebook", "instagram"]);

// Social post status enum
export const socialPostStatusEnum = pgEnum("social_post_status", ["draft", "scheduled", "published", "failed"]);

// Social campaigns table
export const socialCampaigns = pgTable("social_campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

export const insertSocialCampaignSchema = createInsertSchema(socialCampaigns);
export type InsertSocialCampaign = z.infer<typeof insertSocialCampaignSchema>;
export type SocialCampaign = typeof socialCampaigns.$inferSelect;

// Social posts table
export const socialPosts = pgTable("social_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("idx_social_posts_status").on(table.status),
  index("idx_social_posts_scheduled").on(table.scheduledAt),
  index("idx_social_posts_platform").on(table.platform),
]);

export const insertSocialPostSchema = createInsertSchema(socialPosts);
export type InsertSocialPost = z.infer<typeof insertSocialPostSchema>;
export type SocialPost = typeof socialPosts.$inferSelect;

// Social analytics table
export const socialAnalytics = pgTable("social_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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

export const insertSocialAnalyticsSchema = createInsertSchema(socialAnalytics);
export type InsertSocialAnalytics = z.infer<typeof insertSocialAnalyticsSchema>;
export type SocialAnalytics = typeof socialAnalytics.$inferSelect;

// LinkedIn OAuth credentials table
export const socialCredentials = pgTable("social_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  uniqueIndex("idx_social_credentials_user_platform").on(table.userId, table.platform),
]);

export const insertSocialCredentialSchema = createInsertSchema(socialCredentials);
export type InsertSocialCredential = z.infer<typeof insertSocialCredentialSchema>;
export type SocialCredential = typeof socialCredentials.$inferSelect;

// Relations for social tables
export const socialCampaignsRelations = relations(socialCampaigns, ({ many }) => ({
  posts: many(socialPosts),
  analytics: many(socialAnalytics),
}));

export const socialPostsRelations = relations(socialPosts, ({ one, many }) => ({
  campaign: one(socialCampaigns, { fields: [socialPosts.campaignId], references: [socialCampaigns.id] }),
  analytics: many(socialAnalytics),
}));

export const socialAnalyticsRelations = relations(socialAnalytics, ({ one }) => ({
  post: one(socialPosts, { fields: [socialAnalytics.postId], references: [socialPosts.id] }),
  campaign: one(socialCampaigns, { fields: [socialAnalytics.campaignId], references: [socialCampaigns.id] }),
}));

// ============================================
// LIVE CHAT SUPPORT SYSTEM
// ============================================

// Chat status enum
export const liveChatStatusEnum = pgEnum("live_chat_status", ["open", "closed", "archived"]);

// Live chat conversations table
export const liveChatConversations = pgTable("live_chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").notNull(), // Browser fingerprint or session ID
  visitorName: varchar("visitor_name"),
  visitorEmail: varchar("visitor_email"),
  status: liveChatStatusEnum("status").notNull().default("open"),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: integer("unread_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_live_chat_status").on(table.status),
  index("idx_live_chat_visitor").on(table.visitorId),
  index("idx_live_chat_last_message").on(table.lastMessageAt),
]);

export const insertLiveChatConversationSchema = createInsertSchema(liveChatConversations);
export type InsertLiveChatConversation = z.infer<typeof insertLiveChatConversationSchema>;
export type LiveChatConversation = typeof liveChatConversations.$inferSelect;

// Live chat messages table
export const liveChatMessages = pgTable("live_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => liveChatConversations.id, { onDelete: "cascade" }),
  senderType: varchar("sender_type", { length: 20 }).notNull(), // 'visitor' or 'admin'
  senderId: varchar("sender_id"), // User ID if admin, null if visitor
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_live_chat_messages_conversation").on(table.conversationId),
  index("idx_live_chat_messages_created").on(table.createdAt),
]);

export const insertLiveChatMessageSchema = createInsertSchema(liveChatMessages);
export type InsertLiveChatMessage = z.infer<typeof insertLiveChatMessageSchema>;
export type LiveChatMessage = typeof liveChatMessages.$inferSelect;

// Relations for live chat
export const liveChatConversationsRelations = relations(liveChatConversations, ({ one, many }) => ({
  assignedTo: one(users, { fields: [liveChatConversations.assignedToId], references: [users.id] }),
  messages: many(liveChatMessages),
}));

export const liveChatMessagesRelations = relations(liveChatMessages, ({ one }) => ({
  conversation: one(liveChatConversations, { fields: [liveChatMessages.conversationId], references: [liveChatConversations.id] }),
}));

// ============================================
// SURVEY BUILDER SYSTEM
// ============================================

// Survey status enum
export const surveyStatusEnum = pgEnum("survey_status", ["draft", "active", "closed", "archived"]);

// Question types
export const questionTypeEnum = pgEnum("question_type", ["text", "textarea", "radio", "checkbox", "rating", "dropdown"]);

// Survey question type for JSON schema
export interface SurveyQuestion {
  id: string;
  type: "text" | "textarea" | "radio" | "checkbox" | "rating" | "dropdown";
  title: string;
  description?: string;
  required: boolean;
  order: number;
  options?: string[]; // For radio, checkbox, dropdown
  minRating?: number; // For rating (default 1)
  maxRating?: number; // For rating (default 5)
  conditionalLogic?: {
    enabled: boolean;
    questionId: string; // The question this depends on
    operator: "equals" | "not_equals" | "contains" | "not_contains";
    value: string | string[];
  };
  placeholder?: string; // For text/textarea
  maxLength?: number; // For text/textarea
}

// Survey definition (JSON schema stored in database)
export interface SurveyDefinition {
  questions: SurveyQuestion[];
  settings?: {
    showProgressBar?: boolean;
    allowBackNavigation?: boolean;
    randomizeQuestions?: boolean;
    thankYouMessage?: string;
    redirectUrl?: string;
  };
}

// Surveys table
export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  slug: text("slug").notNull().unique(),
  status: surveyStatusEnum("status").notNull().default("draft"),
  definition: jsonb("definition").$type<SurveyDefinition>().notNull().default({ questions: [] }),
  authorId: varchar("author_id").references(() => users.id),
  responseCount: integer("response_count").default(0),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_surveys_status").on(table.status),
  index("idx_surveys_slug").on(table.slug),
  index("idx_surveys_author").on(table.authorId),
]);

export const insertSurveySchema = createInsertSchema(surveys);
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;

// Survey responses table
export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").notNull().references(() => surveys.id, { onDelete: "cascade" }),
  respondentId: varchar("respondent_id"), // Optional: if user is logged in
  respondentEmail: varchar("respondent_email"),
  respondentName: varchar("respondent_name"),
  answers: jsonb("answers").$type<Record<string, string | string[]>>().notNull(), // questionId -> answer(s)
  metadata: jsonb("metadata").$type<{
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    completedAt?: string;
    timeSpentSeconds?: number;
  }>(),
  isComplete: boolean("is_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_survey_responses_survey").on(table.surveyId),
  index("idx_survey_responses_respondent").on(table.respondentId),
  index("idx_survey_responses_created").on(table.createdAt),
]);

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses);
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

// AEO A/B Tests - Test different answer capsule formats
export const aeoAbTests = pgTable("aeo_ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  variants: jsonb("variants").$type<Array<{
    id: string;
    name: string;
    capsuleText: string;
    weight: number; // 0-100 percentage
  }>>().default([]),
  winningVariantId: varchar("winning_variant_id"),
  status: varchar("status").notNull().default("draft"), // draft, running, completed, archived
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  minSampleSize: integer("min_sample_size").default(100),
  confidenceLevel: integer("confidence_level").default(95), // 95% confidence
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAeoAbTestSchema = createInsertSchema(aeoAbTests);
export type InsertAeoAbTest = z.infer<typeof insertAeoAbTestSchema>;
export type AeoAbTest = typeof aeoAbTests.$inferSelect;

// AEO Schema Enhancements - Store enhanced schema.org data for AI consumption
export const aeoSchemaEnhancements = pgTable("aeo_schema_enhancements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  schemaType: varchar("schema_type").notNull(), // FAQPage, HowTo, TouristAttraction, etc.
  schemaData: jsonb("schema_data").$type<Record<string, unknown>>().notNull(),
  isActive: boolean("is_active").default(true),
  validationStatus: varchar("validation_status").default("pending"), // pending, valid, invalid
  validationErrors: jsonb("validation_errors").$type<string[]>().default([]),
  lastValidatedAt: timestamp("last_validated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_aeo_schema_content").on(table.contentId),
  index("IDX_aeo_schema_type").on(table.schemaType),
]);

export const insertAeoSchemaEnhancementSchema = createInsertSchema(aeoSchemaEnhancements);
export type InsertAeoSchemaEnhancement = z.infer<typeof insertAeoSchemaEnhancementSchema>;
export type AeoSchemaEnhancement = typeof aeoSchemaEnhancements.$inferSelect;

// AEO Relations
export const aeoAnswerCapsulesRelations = relations(aeoAnswerCapsules, ({ one }) => ({
  content: one(contents, { fields: [aeoAnswerCapsules.contentId], references: [contents.id] }),
  approver: one(users, { fields: [aeoAnswerCapsules.approvedBy], references: [users.id] }),
}));

export const aeoCitationsRelations = relations(aeoCitations, ({ one }) => ({
  content: one(contents, { fields: [aeoCitations.contentId], references: [contents.id] }),
}));

export const aeoPerformanceMetricsRelations = relations(aeoPerformanceMetrics, ({ one }) => ({
  content: one(contents, { fields: [aeoPerformanceMetrics.contentId], references: [contents.id] }),
}));

export const aeoCrawlerLogsRelations = relations(aeoCrawlerLogs, ({ one }) => ({
  content: one(contents, { fields: [aeoCrawlerLogs.contentId], references: [contents.id] }),
}));

export const aeoSchemaEnhancementsRelations = relations(aeoSchemaEnhancements, ({ one }) => ({
  content: one(contents, { fields: [aeoSchemaEnhancements.contentId], references: [contents.id] }),
}));

export const aeoAbTestsRelations = relations(aeoAbTests, ({ one }) => ({
  content: one(contents, { fields: [aeoAbTests.contentId], references: [contents.id] }),
}));

// Relations for surveys
export const surveysRelations = relations(surveys, ({ one, many }) => ({
  author: one(users, { fields: [surveys.authorId], references: [users.id] }),
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(surveys, { fields: [surveyResponses.surveyId], references: [surveys.id] }),
}));

// ============================================
// REFERRAL/AFFILIATE PROGRAM SYSTEM
// ============================================

// Referral status enum
export const referralStatusEnum = pgEnum("referral_status", ["pending", "converted", "expired"]);

// Commission status enum
export const commissionStatusEnum = pgEnum("commission_status", ["pending", "approved", "paid", "cancelled"]);

// Referral codes table - unique codes for partners/users
export const referralCodes = pgTable("referral_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("idx_referral_codes_user").on(table.userId),
  index("idx_referral_codes_code").on(table.code),
  index("idx_referral_codes_active").on(table.isActive),
]);

export const insertReferralCodeSchema = createInsertSchema(referralCodes);
export type InsertReferralCode = z.infer<typeof insertReferralCodeSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;

// Referral clicks - tracks when referral links are clicked
export const referralClicks = pgTable("referral_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referralCodeId: varchar("referral_code_id").notNull().references(() => referralCodes.id, { onDelete: "cascade" }),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  referer: text("referer"),
  landingPage: text("landing_page"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_referral_clicks_code").on(table.referralCodeId),
  index("idx_referral_clicks_created").on(table.createdAt),
]);

export type ReferralClick = typeof referralClicks.$inferSelect;

// Referrals table - tracks signups from referral codes
export const referrals = pgTable("referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referralCodeId: varchar("referral_code_id").notNull().references(() => referralCodes.id, { onDelete: "cascade" }),
  subscriberId: varchar("subscriber_id").references(() => newsletterSubscribers.id, { onDelete: "set null" }),
  email: varchar("email"),
  status: referralStatusEnum("status").notNull().default("pending"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  convertedAt: timestamp("converted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_referrals_code").on(table.referralCodeId),
  index("idx_referrals_subscriber").on(table.subscriberId),
  index("idx_referrals_status").on(table.status),
  index("idx_referrals_created").on(table.createdAt),
]);

export const insertReferralSchema = createInsertSchema(referrals);
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// Referral commissions - tracks commission calculations
export const referralCommissions = pgTable("referral_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referralCodeId: varchar("referral_code_id").notNull().references(() => referralCodes.id, { onDelete: "cascade" }),
  referralId: varchar("referral_id").references(() => referrals.id, { onDelete: "set null" }),
  amount: integer("amount").notNull(), // In cents
  description: text("description"),
  status: commissionStatusEnum("status").notNull().default("pending"),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_commissions_code").on(table.referralCodeId),
  index("idx_commissions_referral").on(table.referralId),
  index("idx_commissions_status").on(table.status),
]);

export const insertReferralCommissionSchema = createInsertSchema(referralCommissions);
export type InsertReferralCommission = z.infer<typeof insertReferralCommissionSchema>;
export type ReferralCommission = typeof referralCommissions.$inferSelect;

// Relations for referral system
export const referralCodesRelations = relations(referralCodes, ({ one, many }) => ({
  user: one(users, { fields: [referralCodes.userId], references: [users.id] }),
  referrals: many(referrals),
  clicks: many(referralClicks),
  commissions: many(referralCommissions),
}));

export const referralClicksRelations = relations(referralClicks, ({ one }) => ({
  referralCode: one(referralCodes, { fields: [referralClicks.referralCodeId], references: [referralCodes.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referralCode: one(referralCodes, { fields: [referrals.referralCodeId], references: [referralCodes.id] }),
  subscriber: one(newsletterSubscribers, { fields: [referrals.subscriberId], references: [newsletterSubscribers.id] }),
}));

export const referralCommissionsRelations = relations(referralCommissions, ({ one }) => ({
  referralCode: one(referralCodes, { fields: [referralCommissions.referralCodeId], references: [referralCodes.id] }),
  referral: one(referrals, { fields: [referralCommissions.referralId], references: [referrals.id] }),
}));

// ============================================================================
// QA CHECKLIST SYSTEM
// ============================================================================

// QA Check status enum
export const qaCheckStatusEnum = pgEnum("qa_check_status", ["not_checked", "passed", "failed", "not_applicable", "needs_review"]);

// QA Run status enum
export const qaRunStatusEnum = pgEnum("qa_run_status", ["in_progress", "completed", "abandoned"]);

// QA Checklist Categories - stores the category definitions
export const qaCategories = pgTable("qa_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(), // e.g., "inter_component_communication"
  name: varchar("name").notNull(), // Display name
  nameHe: varchar("name_he"), // Hebrew name
  icon: varchar("icon"), // Icon identifier
  description: text("description"),
  descriptionHe: text("description_he"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_qa_categories_key").on(table.key),
  index("IDX_qa_categories_order").on(table.sortOrder),
]);

export type QaCategory = typeof qaCategories.$inferSelect;
export type InsertQaCategory = typeof qaCategories.$inferInsert;

// QA Checklist Items - stores individual check items
export const qaChecklistItems = pgTable("qa_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => qaCategories.id, { onDelete: "cascade" }),
  key: varchar("key").notNull(), // Unique within category
  name: varchar("name").notNull(),
  nameHe: varchar("name_he"),
  description: text("description"),
  descriptionHe: text("description_he"),
  checkGuidelines: text("check_guidelines"), // How to verify this item
  checkGuidelinesHe: text("check_guidelines_he"),
  severity: varchar("severity").notNull().default("medium"), // critical, high, medium, low
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  tags: jsonb("tags").$type<string[]>().default([]),
  automatedCheck: boolean("automated_check").notNull().default(false), // Can be auto-verified
  automatedCheckEndpoint: varchar("automated_check_endpoint"), // API endpoint for auto-check
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_qa_items_category").on(table.categoryId),
  index("IDX_qa_items_severity").on(table.severity),
  uniqueIndex("IDX_qa_items_category_key").on(table.categoryId, table.key),
]);

export type QaChecklistItem = typeof qaChecklistItems.$inferSelect;
export type InsertQaChecklistItem = typeof qaChecklistItems.$inferInsert;

// QA Runs - represents a single QA session/run
export const qaRuns = pgTable("qa_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  status: qaRunStatusEnum("status").notNull().default("in_progress"),
  userId: varchar("user_id").notNull().references(() => users.id),
  environment: varchar("environment").notNull().default("development"), // development, staging, production
  version: varchar("version"), // App version being tested
  branch: varchar("branch"), // Git branch
  totalItems: integer("total_items").notNull().default(0),
  passedItems: integer("passed_items").notNull().default(0),
  failedItems: integer("failed_items").notNull().default(0),
  skippedItems: integer("skipped_items").notNull().default(0),
  score: integer("score").default(0), // Overall score percentage
  notes: text("notes"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_qa_runs_user").on(table.userId),
  index("IDX_qa_runs_status").on(table.status),
  index("IDX_qa_runs_environment").on(table.environment),
  index("IDX_qa_runs_started").on(table.startedAt),
]);

export type QaRun = typeof qaRuns.$inferSelect;
export type InsertQaRun = typeof qaRuns.$inferInsert;

// QA Check Results - stores individual check results for each run
export const qaCheckResults = pgTable("qa_check_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").notNull().references(() => qaRuns.id, { onDelete: "cascade" }),
  itemId: varchar("item_id").notNull().references(() => qaChecklistItems.id, { onDelete: "cascade" }),
  status: qaCheckStatusEnum("status").notNull().default("not_checked"),
  notes: text("notes"),
  evidence: text("evidence"), // Screenshot URL, log snippet, etc.
  checkedBy: varchar("checked_by").references(() => users.id),
  checkedAt: timestamp("checked_at"),
  autoCheckResult: jsonb("auto_check_result").$type<{
    passed: boolean;
    message: string;
    details?: Record<string, unknown>;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_qa_results_run").on(table.runId),
  index("IDX_qa_results_item").on(table.itemId),
  index("IDX_qa_results_status").on(table.status),
  uniqueIndex("IDX_qa_results_run_item").on(table.runId, table.itemId),
]);

export type QaCheckResult = typeof qaCheckResults.$inferSelect;
export type InsertQaCheckResult = typeof qaCheckResults.$inferInsert;

// QA Templates - pre-configured sets of checks for specific scenarios
export const qaTemplates = pgTable("qa_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  nameHe: varchar("name_he"),
  description: text("description"),
  descriptionHe: text("description_he"),
  categoryIds: jsonb("category_ids").$type<string[]>().notNull().default([]),
  itemIds: jsonb("item_ids").$type<string[]>().default([]), // Specific items if not using full categories
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_qa_templates_default").on(table.isDefault),
]);

export type QaTemplate = typeof qaTemplates.$inferSelect;
export type InsertQaTemplate = typeof qaTemplates.$inferInsert;

// QA Issues - issues found during QA runs
export const qaIssues = pgTable("qa_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").notNull().references(() => qaRuns.id, { onDelete: "cascade" }),
  checkResultId: varchar("check_result_id").references(() => qaCheckResults.id, { onDelete: "set null" }),
  title: varchar("title").notNull(),
  description: text("description"),
  severity: varchar("severity").notNull().default("medium"), // critical, high, medium, low
  status: varchar("status").notNull().default("open"), // open, in_progress, resolved, wont_fix
  assignedTo: varchar("assigned_to").references(() => users.id),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  externalTicketUrl: varchar("external_ticket_url"), // Link to Jira, GitHub issue, etc.
  screenshots: jsonb("screenshots").$type<string[]>().default([]),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_qa_issues_run").on(table.runId),
  index("IDX_qa_issues_status").on(table.status),
  index("IDX_qa_issues_severity").on(table.severity),
  index("IDX_qa_issues_assigned").on(table.assignedTo),
]);

export type QaIssue = typeof qaIssues.$inferSelect;
export type InsertQaIssue = typeof qaIssues.$inferInsert;

// Relations for QA system
export const qaCategoriesRelations = relations(qaCategories, ({ many }) => ({
  items: many(qaChecklistItems),
}));

export const qaChecklistItemsRelations = relations(qaChecklistItems, ({ one, many }) => ({
  category: one(qaCategories, { fields: [qaChecklistItems.categoryId], references: [qaCategories.id] }),
  results: many(qaCheckResults),
}));

export const qaRunsRelations = relations(qaRuns, ({ one, many }) => ({
  user: one(users, { fields: [qaRuns.userId], references: [users.id] }),
  results: many(qaCheckResults),
  issues: many(qaIssues),
}));

export const qaCheckResultsRelations = relations(qaCheckResults, ({ one }) => ({
  run: one(qaRuns, { fields: [qaCheckResults.runId], references: [qaRuns.id] }),
  item: one(qaChecklistItems, { fields: [qaCheckResults.itemId], references: [qaChecklistItems.id] }),
  checker: one(users, { fields: [qaCheckResults.checkedBy], references: [users.id] }),
}));

export const qaIssuesRelations = relations(qaIssues, ({ one }) => ({
  run: one(qaRuns, { fields: [qaIssues.runId], references: [qaRuns.id] }),
  checkResult: one(qaCheckResults, { fields: [qaIssues.checkResultId], references: [qaCheckResults.id] }),
  assignee: one(users, { fields: [qaIssues.assignedTo], references: [users.id] }),
  resolver: one(users, { fields: [qaIssues.resolvedBy], references: [users.id] }),
  creator: one(users, { fields: [qaIssues.createdBy], references: [users.id] }),
}));

// ============================================================================
// OCTOPUS V2 - CONTENT GENERATION ENGINE
// ============================================================================

// Octopus job status enum
export const octopusJobStatusEnum = pgEnum("octopus_job_status", [
  "pending",
  "parsing",
  "extracting",
  "enriching",
  "graph_resolution",
  "entity_upsert",
  "generating",
  "quality_check",
  "fact_check",
  "publish_queue",
  "completed",
  "failed",
  "paused"
]);

// Octopus artifact action enum
export const octopusArtifactActionEnum = pgEnum("octopus_artifact_action", [
  "created",
  "updated",
  "skipped",
  "deprecated"
]);

// Content publish status enum (for workflow)
export const publishStatusEnum = pgEnum("publish_status", [
  "draft",
  "review",
  "approved",
  "published",
  "archived"
]);

// Octopus Jobs - persistent job tracking
export const octopusJobs = pgTable("octopus_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inputHash: varchar("input_hash").notNull(),
  filename: varchar("filename").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  destinationHint: varchar("destination_hint"),
  destinationId: varchar("destination_id").references(() => destinations.id),
  locale: varchar("locale").notNull().default("en"),
  status: octopusJobStatusEnum("status").notNull().default("pending"),
  progressPct: integer("progress_pct").notNull().default(0),
  currentStage: varchar("current_stage"),
  options: jsonb("options").$type<Record<string, unknown>>().default({}),
  error: text("error"),
  pausedAt: timestamp("paused_at"),
  pauseReason: varchar("pause_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").references(() => users.id),
}, (table) => [
  index("IDX_octopus_jobs_status").on(table.status),
  index("IDX_octopus_jobs_destination").on(table.destinationId),
  index("IDX_octopus_jobs_input_hash").on(table.inputHash),
]);

export const insertOctopusJobSchema = createInsertSchema(octopusJobs);

export type OctopusJobRecord = typeof octopusJobs.$inferSelect;
export type InsertOctopusJob = z.infer<typeof insertOctopusJobSchema>;

// Octopus Job Runs - per-stage audit trail
export const octopusJobRuns = pgTable("octopus_job_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => octopusJobs.id, { onDelete: "cascade" }),
  stage: varchar("stage").notNull(),
  status: varchar("status").notNull().default("pending"),
  priority: integer("priority").notNull().default(0),
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at"),
  inputData: jsonb("input_data").$type<Record<string, unknown>>(),
  outputData: jsonb("output_data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  stats: jsonb("stats").$type<Record<string, unknown>>().default({}),
  error: text("error"),
}, (table) => [
  index("IDX_octopus_job_runs_job").on(table.jobId),
  index("IDX_octopus_job_runs_stage").on(table.stage),
  index("IDX_octopus_job_runs_status_retry").on(table.status, table.nextRetryAt),
]);

export type OctopusJobRun = typeof octopusJobRuns.$inferSelect;
export type InsertOctopusJobRun = typeof octopusJobRuns.$inferInsert;

// Octopus Job Artifacts - entity tracking per job
export const octopusJobArtifacts = pgTable("octopus_job_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => octopusJobs.id, { onDelete: "cascade" }),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  contentId: varchar("content_id").references(() => contents.id),
  normalizedName: varchar("normalized_name").notNull(),
  sourceHash: varchar("source_hash"),
  action: octopusArtifactActionEnum("action").notNull().default("created"),
  diffSummary: jsonb("diff_summary").$type<{ fieldsUpdated?: string[]; fieldsAdded?: string[]; previousHash?: string }>().default({}),
  confidence: integer("confidence"),
  rawExtraction: jsonb("raw_extraction").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_octopus_artifacts_job").on(table.jobId),
  index("IDX_octopus_artifacts_entity_type").on(table.entityType),
  index("IDX_octopus_artifacts_normalized_name").on(table.normalizedName),
]);

export type OctopusJobArtifact = typeof octopusJobArtifacts.$inferSelect;
export type InsertOctopusJobArtifact = typeof octopusJobArtifacts.$inferInsert;

// Hotel-District Junction Table (many-to-many)
export const hotelDistricts = pgTable("hotel_districts", {
  hotelId: varchar("hotel_id").notNull().references(() => hotels.id, { onDelete: "cascade" }),
  districtId: varchar("district_id").notNull().references(() => districts.id, { onDelete: "cascade" }),
  confidence: integer("confidence"),
  source: varchar("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_hotel_districts_hotel").on(table.hotelId),
  index("IDX_hotel_districts_district").on(table.districtId),
]);

export type HotelDistrict = typeof hotelDistricts.$inferSelect;
export type InsertHotelDistrict = typeof hotelDistricts.$inferInsert;

// Attraction-District Junction Table (many-to-many)
export const attractionDistricts = pgTable("attraction_districts", {
  attractionId: varchar("attraction_id").notNull().references(() => attractions.id, { onDelete: "cascade" }),
  districtId: varchar("district_id").notNull().references(() => districts.id, { onDelete: "cascade" }),
  confidence: integer("confidence"),
  source: varchar("source").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_attraction_districts_attraction").on(table.attractionId),
  index("IDX_attraction_districts_district").on(table.districtId),
]);

export type AttractionDistrict = typeof attractionDistricts.$inferSelect;
export type InsertAttractionDistrict = typeof attractionDistricts.$inferInsert;

// Content Highlights - translatable, reusable highlights
export const contentHighlights = pgTable("content_highlights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  highlightKey: varchar("highlight_key").notNull(),
  textEn: text("text_en").notNull(),
  icon: varchar("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_content_highlights_content").on(table.contentId),
  uniqueIndex("IDX_content_highlights_unique").on(table.contentId, table.highlightKey),
]);

export type ContentHighlight = typeof contentHighlights.$inferSelect;
export type InsertContentHighlight = typeof contentHighlights.$inferInsert;

// Content Highlight Translations
export const contentHighlightTranslations = pgTable("content_highlight_translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  highlightId: varchar("highlight_id").notNull().references(() => contentHighlights.id, { onDelete: "cascade" }),
  locale: varchar("locale").notNull(),
  text: text("text").notNull(),
  translatedAt: timestamp("translated_at"),
  translationProvider: varchar("translation_provider"),
}, (table) => [
  index("IDX_highlight_translations_highlight").on(table.highlightId),
  uniqueIndex("IDX_highlight_translations_unique").on(table.highlightId, table.locale),
]);

export type ContentHighlightTranslation = typeof contentHighlightTranslations.$inferSelect;
export type InsertContentHighlightTranslation = typeof contentHighlightTranslations.$inferInsert;

// Octopus Relations
export const octopusJobsRelations = relations(octopusJobs, ({ one, many }) => ({
  destination: one(destinations, { fields: [octopusJobs.destinationId], references: [destinations.id] }),
  creator: one(users, { fields: [octopusJobs.createdBy], references: [users.id] }),
  runs: many(octopusJobRuns),
  artifacts: many(octopusJobArtifacts),
}));

export const octopusJobRunsRelations = relations(octopusJobRuns, ({ one }) => ({
  job: one(octopusJobs, { fields: [octopusJobRuns.jobId], references: [octopusJobs.id] }),
}));

export const octopusJobArtifactsRelations = relations(octopusJobArtifacts, ({ one }) => ({
  job: one(octopusJobs, { fields: [octopusJobArtifacts.jobId], references: [octopusJobs.id] }),
  content: one(contents, { fields: [octopusJobArtifacts.contentId], references: [contents.id] }),
}));

export const contentHighlightsRelations = relations(contentHighlights, ({ one, many }) => ({
  content: one(contents, { fields: [contentHighlights.contentId], references: [contents.id] }),
  translations: many(contentHighlightTranslations),
}));

export const contentHighlightTranslationsRelations = relations(contentHighlightTranslations, ({ one }) => ({
  highlight: one(contentHighlights, { fields: [contentHighlightTranslations.highlightId], references: [contentHighlights.id] }),
}));

export const hotelDistrictsRelations = relations(hotelDistricts, ({ one }) => ({
  hotel: one(hotels, { fields: [hotelDistricts.hotelId], references: [hotels.id] }),
  district: one(districts, { fields: [hotelDistricts.districtId], references: [districts.id] }),
}));

export const attractionDistrictsRelations = relations(attractionDistricts, ({ one }) => ({
  attraction: one(attractions, { fields: [attractionDistricts.attractionId], references: [attractions.id] }),
  district: one(districts, { fields: [attractionDistricts.districtId], references: [districts.id] }),
}));

// =====================================================
// OCTOPUS V2 PHASE 5 - TAGGING & PLACEMENT INTELLIGENCE
// =====================================================

// Tag category enum
export const tagCategoryEnum = pgEnum("tag_category", [
  "destination",
  "district", 
  "hotel_type",
  "audience",
  "experience",
  "commercial"
]);

// Tag source enum (how the tag was applied)
export const tagSourceEnum = pgEnum("tag_source", ["ai", "manual", "rule"]);

// Placement surface enum
export const placementSurfaceEnum = pgEnum("placement_surface", [
  "destination_homepage",
  "district_page",
  "category_seo",
  "comparison",
  "featured",
  "newsletter",
  "social"
]);

// Tag Definitions - Single Source of Truth for all tags
export const tagDefinitions = pgTable("tag_definitions", {
  id: varchar("id").primaryKey(), // Stable, human-readable slug (e.g., "luxury", "beach")
  category: tagCategoryEnum("category").notNull(),
  label: text("label").notNull(), // English display label
  labelTranslations: jsonb("label_translations").$type<Record<string, string>>(), // { "he": "יוקרה", "ar": "فاخر" }
  parentId: varchar("parent_id").references((): any => tagDefinitions.id, { onDelete: "set null" }), // Hierarchy support
  destinationId: varchar("destination_id"), // For destination-scoped tags (districts)
  description: text("description"), // Optional description
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_tag_definitions_category").on(table.category),
  index("IDX_tag_definitions_parent").on(table.parentId),
  index("IDX_tag_definitions_destination").on(table.destinationId),
]);

export const insertTagDefinitionSchema = createInsertSchema(tagDefinitions);
export type TagDefinition = typeof tagDefinitions.$inferSelect;
export type InsertTagDefinition = z.infer<typeof insertTagDefinitionSchema>;

// Entity Tags - Junction table linking entities to tags
export const entityTags = pgTable("entity_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // "hotel", "attraction", "district", "article"
  entityId: varchar("entity_id").notNull(), // FK to contents.id or specific entity table
  tagId: varchar("tag_id").notNull().references(() => tagDefinitions.id, { onDelete: "cascade" }),
  confidence: integer("confidence").default(100), // 0-100 (AI confidence percentage)
  source: tagSourceEnum("source").notNull().default("manual"),
  reasoning: text("reasoning"), // AI explanation for the tag
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_entity_tags_entity").on(table.entityType, table.entityId),
  index("IDX_entity_tags_tag").on(table.tagId),
  uniqueIndex("IDX_entity_tags_unique").on(table.entityType, table.entityId, table.tagId),
]);

export const insertEntityTagSchema = createInsertSchema(entityTags);
export type EntityTag = typeof entityTags.$inferSelect;
export type InsertEntityTag = z.infer<typeof insertEntityTagSchema>;

// Entity Placements - Controls where entities appear on the site
export const entityPlacements = pgTable("entity_placements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // "hotel", "attraction", "district", "article"
  entityId: varchar("entity_id").notNull(),
  surface: placementSurfaceEnum("surface").notNull(),
  destinationId: varchar("destination_id"), // Nullable, for destination-scoped placements
  districtId: varchar("district_id"), // Nullable, for district-scoped placements
  priority: integer("priority").default(0), // Higher = more prominent
  isActive: boolean("is_active").default(true),
  reason: text("reason"), // AI/rule explanation for placement
  expiresAt: timestamp("expires_at"), // For seasonal/time-limited placements
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_entity_placements_surface").on(table.surface, table.destinationId, table.isActive),
  index("IDX_entity_placements_entity").on(table.entityType, table.entityId),
  // Note: Unique constraint with nullable columns is enforced at application level
  // to avoid PostgreSQL NULL handling issues in unique indexes
]);

export const insertEntityPlacementSchema = createInsertSchema(entityPlacements);
export type EntityPlacement = typeof entityPlacements.$inferSelect;
export type InsertEntityPlacement = z.infer<typeof insertEntityPlacementSchema>;

// Placement Rule Conditions - Enhanced for deterministic rule evaluation
export interface PlacementRuleConditions {
  // Threshold conditions
  thresholds?: Array<{
    field: "starRating" | "confidence" | "reviewCount" | "priceLevel";
    operator: ">=" | "<=" | "=" | ">" | "<";
    value: number;
  }>;
  // Tag requirements (AND logic - all must match)
  requiredTags?: string[];
  // Tag options (OR logic - at least one must match)
  anyOfTags?: string[];
  // Excluded tags (entity must NOT have these)
  excludedTags?: string[];
  // Exclusion conditions (entities matching these are NEVER shown)
  exclusions?: {
    unpublished?: boolean; // Exclude unpublished entities
    minConfidence?: number; // Exclude if confidence below this (0.60 default)
    expiredOnly?: boolean; // Exclude if expiresAt is in the past
  };
  // Count limits
  maxItems?: number;
  // Diversity requirements (ensure variety in results)
  diversity?: {
    tagCategory: string; // e.g., "hotel_type" or "audience"
    minPerTag?: number; // At least N items per tag in category
    maxPerTag?: number; // At most N items per tag in category
  };
  // Destination/District scope
  scopeToDestination?: boolean; // Only entities matching destination
  scopeToDistrict?: boolean; // Only entities matching district
}

// Placement Rules - Data-driven rules for automatic placement
export const placementRules = pgTable("placement_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  surface: placementSurfaceEnum("surface").notNull(),
  entityType: varchar("entity_type").notNull(),
  conditions: jsonb("conditions").$type<PlacementRuleConditions>().notNull(),
  priority: integer("priority").default(0), // Lower = evaluated first
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_placement_rules_surface").on(table.surface, table.isActive),
]);

export type PlacementRule = typeof placementRules.$inferSelect;
export type InsertPlacementRule = typeof placementRules.$inferInsert;

// Relations for tagging system
export const tagDefinitionsRelations = relations(tagDefinitions, ({ one, many }) => ({
  parent: one(tagDefinitions, { fields: [tagDefinitions.parentId], references: [tagDefinitions.id] }),
  entityTags: many(entityTags),
}));

export const entityTagsRelations = relations(entityTags, ({ one }) => ({
  tag: one(tagDefinitions, { fields: [entityTags.tagId], references: [tagDefinitions.id] }),
}));

// =====================================================
// OCTOPUS V2 - IMAGE USAGE ORCHESTRATION LAYER
// =====================================================

// Image usage decision enum
export const imageUsageDecisionEnum = pgEnum("image_usage_decision", [
  "approved",
  "rejected",
  "pending",
  "reuse",
  "generate"
]);

// Image role enum (what role the image plays on a page)
export const imageRoleEnum = pgEnum("image_role", [
  "hero",
  "card",
  "thumbnail",
  "gallery",
  "background",
  "inline",
  "og_image",
  "logo"
]);

// Intelligence Snapshot structure
export interface IntelligenceSnapshot {
  relevanceScore?: number;      // 0-100 relevance to entity
  usageScore?: number;          // 0-100 suitability for role
  qualityScore?: number;        // 0-100 technical quality
  confidenceLevel?: number;     // 0-1 AI confidence
  tags?: string[];              // Detected tags
  subjects?: string[];          // Detected subjects
  mood?: string;                // Detected mood/atmosphere
  colorPalette?: string[];      // Dominant colors
  composition?: string;         // Composition type
  fetchedAt?: string;           // ISO timestamp when intelligence was fetched
  provider?: string;            // Intelligence provider used
}

// ImageUsage table - tracks how images are used per page + image
export const imageUsage = pgTable("image_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull(),           // Reference to image asset
  entityId: varchar("entity_id"),                   // Entity this image is associated with
  entityType: varchar("entity_type"),               // "hotel", "attraction", "destination", etc.
  pageId: varchar("page_id"),                       // Page where image is used
  pageType: varchar("page_type"),                   // "destination", "district", "attraction", etc.
  requestedRole: imageRoleEnum("requested_role"),   // Role originally requested
  finalRole: imageRoleEnum("final_role"),           // Role after decision engine
  intelligenceSnapshot: jsonb("intelligence_snapshot").$type<IntelligenceSnapshot>(),
  decision: imageUsageDecisionEnum("decision").notNull().default("pending"),
  decisionReason: text("decision_reason"),          // Human-readable explanation
  decisionRuleId: varchar("decision_rule_id"),      // Which rule triggered the decision
  approvedBy: varchar("approved_by"),               // User who approved (if manual)
  approvedAt: timestamp("approved_at"),             // When approved
  reusedFromId: varchar("reused_from_id"),          // If reused, reference to original usage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_image_usage_asset").on(table.assetId),
  index("IDX_image_usage_entity").on(table.entityType, table.entityId),
  index("IDX_image_usage_page").on(table.pageType, table.pageId),
  index("IDX_image_usage_decision").on(table.decision),
  uniqueIndex("IDX_image_usage_unique").on(table.assetId, table.pageId, table.requestedRole),
]);

export const insertImageUsageSchema = createInsertSchema(imageUsage);
export type ImageUsage = typeof imageUsage.$inferSelect;
export type InsertImageUsage = z.infer<typeof insertImageUsageSchema>;

// ImageUsage Relations
export const imageUsageRelations = relations(imageUsage, ({ one }) => ({
  reusedFrom: one(imageUsage, {
    fields: [imageUsage.reusedFromId],
    references: [imageUsage.id],
    relationName: "reuse_chain"
  }),
}));

 
// =====================================================
// HELP CENTER - Knowledge Base System
// =====================================================

// Help article status enum
export const helpArticleStatusEnum = pgEnum("help_article_status", ["draft", "published"]);

// Help Categories - organize help articles
export const helpCategories = pgTable("help_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(),
  title: varchar("title").notNull(),
  description: text("description"),
  icon: varchar("icon"), // Optional icon identifier
  locale: varchar("locale").notNull().default("en"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_help_categories_locale").on(table.locale),
  index("IDX_help_categories_order").on(table.order),
  index("IDX_help_categories_active").on(table.isActive),
  uniqueIndex("IDX_help_categories_slug_locale").on(table.slug, table.locale),
]);

export const insertHelpCategorySchema = createInsertSchema(helpCategories);
export type HelpCategory = typeof helpCategories.$inferSelect;
export type InsertHelpCategory = z.infer<typeof insertHelpCategorySchema>;

// =====================================================
// RELIABLE WEBHOOK DELIVERY (Outbox Pattern)
// =====================================================

// Webhook outbox status enum
export const webhookOutboxStatusEnum = pgEnum("webhook_outbox_status", [
  "pending",
  "sending",
  "succeeded",
  "failed"
]);

// Webhook Outbox - stores pending webhook deliveries
export const webhookOutbox = pgTable("webhook_outbox", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpointId: varchar("endpoint_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 64 }), // SHA256 hash for dedup
  status: webhookOutboxStatusEnum("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(12),
  nextAttemptAt: timestamp("next_attempt_at").defaultNow(),
  lastError: text("last_error"),
  lastStatusCode: integer("last_status_code"),
  lockedUntil: timestamp("locked_until"), // Row-level lock for concurrency
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_webhook_outbox_status_next").on(table.status, table.nextAttemptAt),
  index("IDX_webhook_outbox_endpoint").on(table.endpointId),
  uniqueIndex("IDX_webhook_outbox_idempotency").on(table.idempotencyKey),
  index("IDX_webhook_outbox_locked").on(table.lockedUntil),
]);

export const insertWebhookOutboxSchema = createInsertSchema(webhookOutbox);
export type InsertWebhookOutbox = z.infer<typeof insertWebhookOutboxSchema>;
export type WebhookOutbox = typeof webhookOutbox.$inferSelect;

// Webhook Deliveries - detailed delivery attempt log
export const webhookDeliveries = pgTable("webhook_deliveries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  outboxId: varchar("outbox_id").notNull().references(() => webhookOutbox.id, { onDelete: "cascade" }),
  attemptNo: integer("attempt_no").notNull(),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  durationMs: integer("duration_ms"),
  statusCode: integer("status_code"),
  error: text("error"),
  responseBody: text("response_body"),
}, (table) => [
  index("IDX_webhook_deliveries_outbox").on(table.outboxId),
  index("IDX_webhook_deliveries_sent").on(table.sentAt),
]);

export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries);
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;

// Webhook Outbox Relations
export const webhookOutboxRelations = relations(webhookOutbox, ({ one, many }) => ({
  endpoint: one(webhooks, { fields: [webhookOutbox.endpointId], references: [webhooks.id] }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  outbox: one(webhookOutbox, { fields: [webhookDeliveries.outboxId], references: [webhookOutbox.id] }),
}));

// =====================================================
// CONTENT DEPENDENCY GRAPH
// =====================================================

export const contentDependencies = pgTable("content_dependencies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  targetId: varchar("target_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  dependencyType: varchar("dependency_type", { length: 50 }).notNull().default("references"),
  weight: integer("weight").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_content_deps_source").on(table.sourceId),
  index("IDX_content_deps_target").on(table.targetId),
  uniqueIndex("IDX_content_deps_unique").on(table.sourceId, table.targetId),
]);

export type ContentDependency = typeof contentDependencies.$inferSelect;

// =====================================================
// AI COST TRACKING (for forecasting)
// =====================================================

export const aiCostRecords = pgTable("ai_cost_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subsystem: varchar("subsystem", { length: 50 }).notNull(),
  model: varchar("model", { length: 100 }),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costCents: integer("cost_cents").notNull().default(0),
  contentId: varchar("content_id"),
  jobId: varchar("job_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_ai_cost_subsystem").on(table.subsystem),
  index("IDX_ai_cost_created").on(table.createdAt),
]);

export type AiCostRecord = typeof aiCostRecords.$inferSelect;

// =====================================================
// CONTENT DECAY TRACKING
// =====================================================

export const contentDecayScores = pgTable("content_decay_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  decayScore: integer("decay_score").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("stable"),
  trafficDelta: integer("traffic_delta"),
  impressionsDelta: integer("impressions_delta"),
  freshnessScore: integer("freshness_score"),
  iceScoreDelta: integer("ice_score_delta"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => [
  index("IDX_decay_content").on(table.contentId),
  index("IDX_decay_status").on(table.status),
  index("IDX_decay_score").on(table.decayScore),
]);

export type ContentDecayScore = typeof contentDecayScores.$inferSelect;

// =====================================================
// CONTENT REPAIR JOBS
// =====================================================

export const contentRepairStatusEnum = pgEnum("content_repair_status", [
  "pending", "simulated", "running", "completed", "failed"
]);

export const contentRepairJobs = pgTable("content_repair_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  repairType: varchar("repair_type", { length: 50 }).notNull(),
  status: contentRepairStatusEnum("status").notNull().default("pending"),
  isDryRun: boolean("is_dry_run").notNull().default(true),
  simulationResult: jsonb("simulation_result"),
  executionResult: jsonb("execution_result"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_repair_content").on(table.contentId),
  index("IDX_repair_status").on(table.status),
]);

export type ContentRepairJob = typeof contentRepairJobs.$inferSelect;

// =====================================================
// SEARCH ZERO RESULTS TRACKING
// =====================================================

export const searchZeroResults = pgTable("search_zero_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  normalizedQuery: text("normalized_query").notNull(),
  clusterId: varchar("cluster_id"),
  count: integer("count").notNull().default(1),
  intent: varchar("intent", { length: 50 }),
  lastSeenAt: timestamp("last_seen_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_zero_cluster").on(table.clusterId),
  index("IDX_zero_count").on(table.count),
  uniqueIndex("IDX_zero_normalized").on(table.normalizedQuery),
]);

export type SearchZeroResult = typeof searchZeroResults.$inferSelect;

// =====================================================
// CONTENT CONFIDENCE SCORES
// =====================================================

export const contentConfidenceScores = pgTable("content_confidence_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(50),
  label: varchar("label", { length: 20 }).notNull().default("medium"),
  entityVerificationScore: integer("entity_verification_score"),
  factConsistencyScore: integer("fact_consistency_score"),
  sourceFreshnessScore: integer("source_freshness_score"),
  hallucinationRiskScore: integer("hallucination_risk_score"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => [
  index("IDX_confidence_content").on(table.contentId),
  index("IDX_confidence_label").on(table.label),
]);

export type ContentConfidenceScore = typeof contentConfidenceScores.$inferSelect;

// =====================================================
// AI OUTPUT AUDIT LOG
// =====================================================

export const aiAuditLogs = pgTable("ai_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  promptHash: varchar("prompt_hash", { length: 64 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  temperature: integer("temperature"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  contentId: varchar("content_id"),
  jobId: varchar("job_id"),
  subsystem: varchar("subsystem", { length: 50 }),
  prompt: text("prompt"),
  output: text("output"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("IDX_ai_audit_content").on(table.contentId),
  index("IDX_ai_audit_subsystem").on(table.subsystem),
  index("IDX_ai_audit_created").on(table.createdAt),
  index("IDX_ai_audit_expires").on(table.expiresAt),
]);

export type AiAuditLog = typeof aiAuditLogs.$inferSelect;

// =====================================================
// CONTENT LIFECYCLE TIMELINE
// =====================================================

export const contentTimelineEvents = pgTable("content_timeline_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull().references(() => contents.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data"),
  actorId: varchar("actor_id"),
  actorType: varchar("actor_type", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_timeline_content").on(table.contentId),
  index("IDX_timeline_type").on(table.eventType),
  index("IDX_timeline_created").on(table.createdAt),
]);

export type ContentTimelineEvent = typeof contentTimelineEvents.$inferSelect;

// =====================================================
// GROWTH RECOMMENDATIONS
// =====================================================

export const growthRecommendations = pgTable("growth_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recommendationType: varchar("recommendation_type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: integer("priority").notNull().default(50),
  effortScore: integer("effort_score"),
  impactScore: integer("impact_score"),
  sourceData: jsonb("source_data"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  contentId: varchar("content_id"),
  weekOf: timestamp("week_of").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_growth_rec_week").on(table.weekOf),
  index("IDX_growth_rec_priority").on(table.priority),
  index("IDX_growth_rec_status").on(table.status),
]);

// =====================================================
// ENTERPRISE GOVERNANCE PLATFORM
// =====================================================

// Governance Role Enum
export const governanceRoleEnum = pgEnum("governance_role", [
  "super_admin",
  "admin",
  "editor",
  "analyst",
  "ops",
  "viewer"
]);

// Governance Roles
export const governanceRoles = pgTable("governance_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  priority: integer("priority").notNull().default(0),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_gov_roles_name").on(table.name),
  index("IDX_gov_roles_priority").on(table.priority),
  index("IDX_gov_roles_active").on(table.isActive),
]);

// ============================================================================
// PRODUCTION CHANGE MANAGEMENT SYSTEM (PCMS) V2
// ============================================================================

export const changePlanStatusEnum = pgEnum("change_plan_status", [
  "draft",
  "submitted",
  "approved",
  "applying",
  "completed",
  "failed",
  "rolled_back",
  "cancelled"
]);

export const changePlanScopeEnum = pgEnum("change_plan_scope", [
  "content",
  "entity",
  "seo",
  "aeo",
  "canonical",
  "links",
  "monetization",
  "global"
]);

export const changeItemTypeEnum = pgEnum("change_item_type", [
  "content_update",
  "content_publish",
  "content_unpublish",
  "entity_merge",
  "entity_update",
  "canonical_set",
  "canonical_remove",
  "link_add",
  "link_remove",
  "aeo_regenerate",
  "seo_update",
  "experiment_start",
  "experiment_stop",
  "monetization_update"
]);

export const changeExecutionKindEnum = pgEnum("change_execution_kind", [
  "dry_run",
  "apply",
  "rollback"
]);

export const changeExecutionStatusEnum = pgEnum("change_execution_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled"
]);

// Change Plans - main table for change proposals
export const changePlans = pgTable("change_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  scope: changePlanScopeEnum("scope").notNull().default("content"),
  status: changePlanStatusEnum("status").notNull().default("draft"),
  riskLevel: varchar("risk_level", { length: 20 }).default("low"),
  createdByUserId: varchar("created_by_user_id"),
  submittedByUserId: varchar("submitted_by_user_id"),
  submittedAt: timestamp("submitted_at"),
  approvedByUserId: varchar("approved_by_user_id"),
  approvedAt: timestamp("approved_at"),
  approvalNotes: text("approval_notes"),
  impactSummary: jsonb("impact_summary").$type<{
    contentAffected: number;
    entitiesAffected: number;
    linksAffected: number;
    estimatedDurationMs: number;
    warnings: string[];
  }>(),
  idempotencyKey: varchar("idempotency_key", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_change_plans_status").on(table.status),
  index("IDX_change_plans_created_by").on(table.createdByUserId),
  index("IDX_change_plans_created_at").on(table.createdAt),
  uniqueIndex("IDX_change_plans_idempotency").on(table.idempotencyKey),
]);

export const insertChangePlanSchema = createInsertSchema(changePlans);
 
// Help Articles - individual help content
export const helpArticles = pgTable("help_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").notNull().references(() => helpCategories.id, { onDelete: "cascade" }),
  slug: varchar("slug").notNull(),
  title: varchar("title").notNull(),
  summary: text("summary"),
  blocks: jsonb("blocks").$type<ContentBlock[]>().default([]),
  metaTitle: varchar("meta_title"),
  metaDescription: text("meta_description"),
  locale: varchar("locale").notNull().default("en"),
  status: helpArticleStatusEnum("status").notNull().default("draft"),
  order: integer("order").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  authorId: varchar("author_id").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_help_articles_category").on(table.categoryId),
  index("IDX_help_articles_status").on(table.status),
  index("IDX_help_articles_locale").on(table.locale),
  index("IDX_help_articles_order").on(table.order),
  uniqueIndex("IDX_help_articles_slug_locale").on(table.slug, table.locale),
]);

export const insertHelpArticleSchema = createInsertSchema(helpArticles);
export type HelpArticle = typeof helpArticles.$inferSelect;
export type InsertHelpArticle = z.infer<typeof insertHelpArticleSchema>;

// Help Center Relations
export const helpCategoriesRelations = relations(helpCategories, ({ many }) => ({
  articles: many(helpArticles),
}));

export const helpArticlesRelations = relations(helpArticles, ({ one }) => ({
  category: one(helpCategories, {
    fields: [helpArticles.categoryId],
    references: [helpCategories.id],
  }),
  author: one(users, {
    fields: [helpArticles.authorId],
    references: [users.id],
  }),
}));

// ============================================
// AUTONOMY POLICY & RISK BUDGETS SYSTEM
// ============================================

// Budget period enum
export const budgetPeriodEnum = pgEnum("budget_period", ["hourly", "daily", "weekly", "monthly"]);

// Autonomy budget counters - tracks resource usage per target
export const autonomyBudgets = pgTable("autonomy_budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetKey: varchar("target_key").notNull(), // e.g., "global", "feature:octopus", "entity:hotel"
  period: budgetPeriodEnum("period").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),

  // Counters
  actionsExecuted: integer("actions_executed").notNull().default(0),
  actionsProposed: integer("actions_proposed").notNull().default(0),
  tokensEstimated: integer("tokens_estimated").notNull().default(0),
  tokensActual: integer("tokens_actual").notNull().default(0),
  writesCount: integer("writes_count").notNull().default(0),
  failuresCount: integer("failures_count").notNull().default(0),
  contentMutations: integer("content_mutations").notNull().default(0),
  aiSpendCents: integer("ai_spend_cents").notNull().default(0),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_autonomy_budgets_target").on(table.targetKey),
  index("IDX_autonomy_budgets_period").on(table.period),
  index("IDX_autonomy_budgets_period_start").on(table.periodStart),
  uniqueIndex("IDX_autonomy_budgets_unique").on(table.targetKey, table.period, table.periodStart),
]);

export const insertAutonomyBudgetSchema = createInsertSchema(autonomyBudgets);
export type AutonomyBudget = typeof autonomyBudgets.$inferSelect;
export type InsertAutonomyBudget = z.infer<typeof insertAutonomyBudgetSchema>;

// Policy decision enum
export const policyDecisionEnum = pgEnum("policy_decision", ["ALLOW", "WARN", "BLOCK"]);

// Autonomy decision logs - records policy decisions for auditing
export const autonomyDecisionLogs = pgTable("autonomy_decision_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  targetKey: varchar("target_key").notNull(),
  actionType: varchar("action_type").notNull(),
  decision: policyDecisionEnum("decision").notNull(),
  reasons: jsonb("reasons").$type<Array<{ code: string; message: string; severity: string }>>().notNull().default([]),
  matchedPolicyId: varchar("matched_policy_id"),
  requesterId: varchar("requester_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_autonomy_decisions_target").on(table.targetKey),
  index("IDX_autonomy_decisions_action").on(table.actionType),
  index("IDX_autonomy_decisions_decision").on(table.decision),
  index("IDX_autonomy_decisions_created").on(table.createdAt),
]);

export const insertAutonomyDecisionLogSchema = createInsertSchema(autonomyDecisionLogs);
export type AutonomyDecisionLog = typeof autonomyDecisionLogs.$inferSelect;
export type InsertAutonomyDecisionLog = z.infer<typeof insertAutonomyDecisionLogSchema>;

// Stored policies - persisted policy configurations
export const autonomyPolicies = pgTable("autonomy_policies", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  targetType: varchar("target_type").notNull(), // global, feature, entity, locale
  targetFeature: varchar("target_feature"),
  targetEntity: varchar("target_entity"),
  targetLocale: varchar("target_locale"),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  config: jsonb("config").$type<Record<string, unknown>>().notNull(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("IDX_autonomy_policies_target").on(table.targetType),
  index("IDX_autonomy_policies_enabled").on(table.enabled),
  index("IDX_autonomy_policies_priority").on(table.priority),
]);

export const insertAutonomyPolicySchema = createInsertSchema(autonomyPolicies);
export type AutonomyPolicy = typeof autonomyPolicies.$inferSelect;
export type InsertAutonomyPolicy = z.infer<typeof insertAutonomyPolicySchema>;

export type GovernanceRole = typeof governanceRoles.$inferSelect;

// Governance Permissions
export const governancePermissions = pgTable("governance_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").notNull().references(() => governanceRoles.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  resource: varchar("resource", { length: 50 }).notNull(),
  scope: varchar("scope", { length: 50 }).notNull().default("global"),
  scopeValue: varchar("scope_value", { length: 255 }),
  isAllowed: boolean("is_allowed").notNull().default(true),
  conditions: jsonb("conditions").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_gov_perms_role").on(table.roleId),
  index("IDX_gov_perms_action").on(table.action, table.resource),
  uniqueIndex("IDX_gov_perms_unique").on(table.roleId, table.action, table.resource, table.scope, table.scopeValue),
]);

export type GovernancePermission = typeof governancePermissions.$inferSelect;

// User Role Assignments
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").notNull().references(() => governanceRoles.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 50 }).notNull().default("global"),
  scopeValue: varchar("scope_value", { length: 255 }),
  grantedBy: varchar("granted_by").references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
}, (table) => [
  index("IDX_user_role_user").on(table.userId),
  index("IDX_user_role_role").on(table.roleId),
  uniqueIndex("IDX_user_role_unique").on(table.userId, table.roleId, table.scope, table.scopeValue),
]);

export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;

// Governance Policies
export const governancePolicies = pgTable("governance_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  policyType: varchar("policy_type", { length: 50 }).notNull(),
  effect: varchar("effect", { length: 10 }).notNull().default("block"),
  priority: integer("priority").notNull().default(100),
  conditions: jsonb("conditions").$type<Record<string, unknown>>().notNull(),
  actions: jsonb("actions").$type<string[]>().default([]),
  resources: jsonb("resources").$type<string[]>().default([]),
  roles: jsonb("roles").$type<string[]>().default([]),
  message: text("message"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_gov_policies_type").on(table.policyType),
  index("IDX_gov_policies_active").on(table.isActive),
  index("IDX_gov_policies_priority").on(table.priority),
]);

export type GovernancePolicy = typeof governancePolicies.$inferSelect;

// Governance Audit Logs (immutable)
export const governanceAuditLogs = pgTable("governance_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  userRole: varchar("user_role", { length: 50 }),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  beforeSnapshot: text("before_snapshot"),
  afterSnapshot: text("after_snapshot"),
  snapshotHash: varchar("snapshot_hash", { length: 64 }),
  source: varchar("source", { length: 50 }).notNull().default("api"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("IDX_gov_audit_user").on(table.userId),
  index("IDX_gov_audit_action").on(table.action),
  index("IDX_gov_audit_resource").on(table.resource, table.resourceId),
  index("IDX_gov_audit_created").on(table.createdAt),
  index("IDX_gov_audit_source").on(table.source),
]);

export type GovernanceAuditLog = typeof governanceAuditLogs.$inferSelect;

// Approval Requests
export const approvalRequests = pgTable("approval_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestType: varchar("request_type", { length: 50 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }).notNull(),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  currentStep: integer("current_step").notNull().default(0),
  totalSteps: integer("total_steps").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  reason: text("reason"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  escalatedAt: timestamp("escalated_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_approval_req_resource").on(table.resourceType, table.resourceId),
  index("IDX_approval_req_requester").on(table.requesterId),
  index("IDX_approval_req_status").on(table.status),
  index("IDX_approval_req_created").on(table.createdAt),
]);

export type ApprovalRequest = typeof approvalRequests.$inferSelect;

// Approval Steps
export const approvalSteps = pgTable("approval_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => approvalRequests.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  approverType: varchar("approver_type", { length: 20 }).notNull(),
  approverId: varchar("approver_id"),
  approverRole: varchar("approver_role", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  decision: varchar("decision", { length: 20 }),
  decisionReason: text("decision_reason"),
  decidedBy: varchar("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at"),
  autoApproveAt: timestamp("auto_approve_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_approval_steps_request").on(table.requestId),
  index("IDX_approval_steps_approver").on(table.approverType, table.approverId),
  index("IDX_approval_steps_status").on(table.status),
]);

export type ApprovalStep = typeof approvalSteps.$inferSelect;

// Policy Evaluations (for analytics)
export const policyEvaluations = pgTable("policy_evaluations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => governancePolicies.id),
  policyName: varchar("policy_name", { length: 100 }).notNull(),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  result: varchar("result", { length: 20 }).notNull(),
  reason: text("reason"),
  evaluatedAt: timestamp("evaluated_at").defaultNow(),
}, (table) => [
  index("IDX_policy_eval_policy").on(table.policyId),
  index("IDX_policy_eval_user").on(table.userId),
  index("IDX_policy_eval_result").on(table.result),
  index("IDX_policy_eval_time").on(table.evaluatedAt),
]);

export type ChangePlan = typeof changePlans.$inferSelect;
export type InsertChangePlan = z.infer<typeof insertChangePlanSchema>;

// Change Plan Items - individual changes within a plan
export const changePlanItems = pgTable("change_plan_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => changePlans.id, { onDelete: "cascade" }),
  type: changeItemTypeEnum("type").notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id", { length: 255 }).notNull(),
  targetTitle: varchar("target_title", { length: 500 }),
  field: varchar("field", { length: 100 }),
  beforeValue: jsonb("before_value"),
  afterValue: jsonb("after_value"),
  status: varchar("status", { length: 20 }).default("pending"),
  appliedAt: timestamp("applied_at"),
  rollbackData: jsonb("rollback_data"),
  errorMessage: text("error_message"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_change_plan_items_plan").on(table.planId),
  index("IDX_change_plan_items_target").on(table.targetType, table.targetId),
  index("IDX_change_plan_items_status").on(table.status),
]);

export const insertChangePlanItemSchema = createInsertSchema(changePlanItems);
export type ChangePlanItem = typeof changePlanItems.$inferSelect;
export type InsertChangePlanItem = z.infer<typeof insertChangePlanItemSchema>;

// Change Executions - tracks each run (dry-run, apply, rollback)
export const changeExecutions = pgTable("change_executions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").notNull().references(() => changePlans.id, { onDelete: "cascade" }),
  kind: changeExecutionKindEnum("kind").notNull(),
  status: changeExecutionStatusEnum("status").notNull().default("queued"),
  createdByUserId: varchar("created_by_user_id"),
  batchSize: integer("batch_size").default(20),
  lastProcessedIndex: integer("last_processed_index").default(0),
  totalItems: integer("total_items").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  skipCount: integer("skip_count").default(0),
  errorSummary: jsonb("error_summary"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  idempotencyKey: varchar("idempotency_key", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_change_executions_plan").on(table.planId),
  index("IDX_change_executions_status").on(table.status),
  index("IDX_change_executions_kind").on(table.kind),
  uniqueIndex("IDX_change_executions_idempotency").on(table.idempotencyKey),
]);

export const insertChangeExecutionSchema = createInsertSchema(changeExecutions);
export type ChangeExecution = typeof changeExecutions.$inferSelect;
export type InsertChangeExecution = z.infer<typeof insertChangeExecutionSchema>;

// Change Execution Logs - detailed logs for each execution
export const changeExecutionLogs = pgTable("change_execution_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executionId: varchar("execution_id").notNull().references(() => changeExecutions.id, { onDelete: "cascade" }),
  level: varchar("level", { length: 20 }).notNull().default("info"),
  message: text("message").notNull(),
  data: jsonb("data"),
  itemId: varchar("item_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_change_execution_logs_execution").on(table.executionId),
  index("IDX_change_execution_logs_level").on(table.level),
  index("IDX_change_execution_logs_created").on(table.createdAt),
]);

export type ChangeExecutionLog = typeof changeExecutionLogs.$inferSelect;

// Change Execution Results - summary and diff storage
export const changeExecutionResults = pgTable("change_execution_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  executionId: varchar("execution_id").notNull().references(() => changeExecutions.id, { onDelete: "cascade" }),
  summary: jsonb("summary").$type<{
    total: number;
    applied: number;
    failed: number;
    skipped: number;
    durationMs: number;
  }>(),
  impacts: jsonb("impacts").$type<{
    contentAffected: number;
    entitiesAffected: number;
    linksAffected: number;
    pagesReindexNeeded: number;
    warnings: string[];
  }>(),
  diffs: jsonb("diffs"),
  guardResults: jsonb("guard_results"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_change_execution_results_execution").on(table.executionId),
]);

export type ChangeExecutionResult = typeof changeExecutionResults.$inferSelect;

// Change Locks - prevent concurrent mutations
export const changeLocks = pgTable("change_locks", {
  targetKey: varchar("target_key", { length: 255 }).primaryKey(),
  executionId: varchar("execution_id").notNull().references(() => changeExecutions.id, { onDelete: "cascade" }),
  lockedUntil: timestamp("locked_until").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_change_locks_execution").on(table.executionId),
  index("IDX_change_locks_until").on(table.lockedUntil),
]);

export type ChangeLock = typeof changeLocks.$inferSelect;

// Relations for PCMS
export const changePlansRelations = relations(changePlans, ({ many }) => ({
  items: many(changePlanItems),
  executions: many(changeExecutions),
}));

export const changePlanItemsRelations = relations(changePlanItems, ({ one }) => ({
  plan: one(changePlans, {
    fields: [changePlanItems.planId],
    references: [changePlans.id],
  }),
}));

export const changeExecutionsRelations = relations(changeExecutions, ({ one, many }) => ({
  plan: one(changePlans, {
    fields: [changeExecutions.planId],
    references: [changePlans.id],
  }),
  logs: many(changeExecutionLogs),
  results: many(changeExecutionResults),
  locks: many(changeLocks),
}));

export const changeExecutionLogsRelations = relations(changeExecutionLogs, ({ one }) => ({
  execution: one(changeExecutions, {
    fields: [changeExecutionLogs.executionId],
    references: [changeExecutions.id],
  }),
}));

export const changeExecutionResultsRelations = relations(changeExecutionResults, ({ one }) => ({
  execution: one(changeExecutions, {
    fields: [changeExecutionResults.executionId],
    references: [changeExecutions.id],
  }),
}));

export const changeLocksRelations = relations(changeLocks, ({ one }) => ({
  execution: one(changeExecutions, {
    fields: [changeLocks.executionId],
    references: [changeExecutions.id],
  }),
}));

// ============================================
// UNIFIED METRICS SYSTEM
// Feature flag: ENABLE_UNIFIED_METRICS=true
// ============================================

// Metric Snapshots - Historical point-in-time captures
export const metricSnapshotsStatusEnum = pgEnum("metric_snapshot_status", ["pending", "completed", "failed"]);

export const metricSnapshots = pgTable("metric_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  snapshotType: varchar("snapshot_type").notNull(), // point, aggregated, comparative
  granularity: varchar("granularity").notNull(), // realtime, minute, hour, day, week, month
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  status: metricSnapshotsStatusEnum("status").notNull().default("completed"),
  description: text("description"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metrics: jsonb("metrics").$type<Array<{
    metricId: string;
    entityType: string;
    entityId?: string;
    value: number;
    previousValue?: number;
    trend: 'up' | 'down' | 'stable';
    changePercent?: number;
    status: 'good' | 'warning' | 'critical' | 'neutral';
    stats?: {
      min: number;
      max: number;
      avg: number;
      sum: number;
      count: number;
    };
  }>>().default([]),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_metric_snapshots_type").on(table.snapshotType),
  index("IDX_metric_snapshots_granularity").on(table.granularity),
  index("IDX_metric_snapshots_created").on(table.createdAt),
  index("IDX_metric_snapshots_period").on(table.periodStart, table.periodEnd),
]);

export const insertMetricSnapshotSchema = createInsertSchema(metricSnapshots);
export type InsertMetricSnapshot = z.infer<typeof insertMetricSnapshotSchema>;
export type MetricSnapshot = typeof metricSnapshots.$inferSelect;

// Growth Opportunities - AI-detected improvement opportunities
export const opportunityCategoryEnum = pgEnum("opportunity_category", [
  "quick_win", "strategic", "technical", "content", "seo", "aeo", "revenue"
]);
export const opportunityStatusEnum = pgEnum("opportunity_status", [
  "new", "acknowledged", "in_progress", "completed", "dismissed"
]);

export const growthOpportunities = pgTable("growth_opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: opportunityCategoryEnum("category").notNull(),
  priority: varchar("priority").notNull(), // low, medium, high, critical
  status: opportunityStatusEnum("status").notNull().default("new"),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  rationale: text("rationale").notNull(),
  estimatedImpact: jsonb("estimated_impact").$type<{
    metric: string;
    currentValue: number;
    projectedValue: number;
    confidence: number;
  }>(),
  effort: varchar("effort").notNull(), // quick, moderate, significant
  estimatedHours: integer("estimated_hours"),
  suggestedActions: jsonb("suggested_actions").$type<string[]>().default([]),
  automatable: boolean("automatable").default(false),
  automationId: varchar("automation_id"),
  affectedEntities: jsonb("affected_entities").$type<Array<{
    type: string;
    id?: string;
    name?: string;
  }>>().default([]),
  relatedMetrics: jsonb("related_metrics").$type<string[]>().default([]),
  score: integer("score").notNull().default(0), // 0-100 priority score
  expiresAt: timestamp("expires_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_growth_opportunities_category").on(table.category),
  index("IDX_growth_opportunities_status").on(table.status),
  index("IDX_growth_opportunities_priority").on(table.priority),
  index("IDX_growth_opportunities_score").on(table.score),
  index("IDX_growth_opportunities_created").on(table.createdAt),
]);

export const insertGrowthOpportunitySchema = createInsertSchema(growthOpportunities);
export type InsertGrowthOpportunity = z.infer<typeof insertGrowthOpportunitySchema>;
export type GrowthOpportunity = typeof growthOpportunities.$inferSelect;

// Detected Anomalies - Statistical anomalies in metrics
export const anomalySeverityEnum = pgEnum("anomaly_severity", ["info", "warning", "critical"]);
export const anomalyTypeEnum = pgEnum("anomaly_type", [
  "spike", "drop", "trend_break", "outlier", "threshold", "missing", "pattern_break"
]);

export const detectedAnomalies = pgTable("detected_anomalies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricId: varchar("metric_id").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  anomalyType: anomalyTypeEnum("anomaly_type").notNull(),
  detectionMethod: varchar("detection_method").notNull(), // zscore, iqr, trend, threshold
  severity: anomalySeverityEnum("severity").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  currentValue: integer("current_value").notNull(),
  expectedValue: integer("expected_value").notNull(),
  deviation: integer("deviation").notNull(), // Stored as percentage * 100
  zscore: integer("zscore"), // Stored as zscore * 100
  stats: jsonb("stats").$type<{
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    count: number;
  }>(),
  recommendation: text("recommendation"),
  windowStart: timestamp("window_start").notNull(),
  windowEnd: timestamp("window_end").notNull(),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  detectedAt: timestamp("detected_at").defaultNow(),
}, (table) => [
  index("IDX_detected_anomalies_metric").on(table.metricId),
  index("IDX_detected_anomalies_severity").on(table.severity),
  index("IDX_detected_anomalies_type").on(table.anomalyType),
  index("IDX_detected_anomalies_detected").on(table.detectedAt),
  index("IDX_detected_anomalies_entity").on(table.entityType, table.entityId),
]);

export const insertDetectedAnomalySchema = createInsertSchema(detectedAnomalies);
export type InsertDetectedAnomaly = z.infer<typeof insertDetectedAnomalySchema>;
export type DetectedAnomaly = typeof detectedAnomalies.$inferSelect;

// Recommendation Explanations - Explainability for AI recommendations
export const recommendationExplanations = pgTable("recommendation_explanations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceType: varchar("source_type").notNull(), // performance, funnel, opportunity, anomaly
  sourceId: varchar("source_id").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  title: varchar("title").notNull(),
  summary: text("summary").notNull(),
  primaryReason: text("primary_reason").notNull(),
  supportingReasons: jsonb("supporting_reasons").$type<string[]>().default([]),
  dataEvidence: jsonb("data_evidence").$type<Array<{
    metric: string;
    metricName: string;
    value: number;
    benchmark?: number;
    comparison: string;
    significance: string;
    explanation: string;
  }>>().default([]),
  confidence: integer("confidence").notNull(), // 0-100
  confidenceFactors: jsonb("confidence_factors").$type<Array<{
    factor: string;
    impact: 'increases' | 'decreases';
    weight: number;
  }>>().default([]),
  methodology: text("methodology"),
  limitations: jsonb("limitations").$type<string[]>().default([]),
  assumptions: jsonb("assumptions").$type<string[]>().default([]),
  metricsAnalyzed: jsonb("metrics_analyzed").$type<string[]>().default([]),
  timeRangeStart: timestamp("time_range_start"),
  timeRangeEnd: timestamp("time_range_end"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_explanations_source").on(table.sourceType, table.sourceId),
  index("IDX_explanations_entity").on(table.entityType, table.entityId),
  index("IDX_explanations_created").on(table.createdAt),
]);

export const insertRecommendationExplanationSchema = createInsertSchema(recommendationExplanations);
export type InsertRecommendationExplanation = z.infer<typeof insertRecommendationExplanationSchema>;
export type RecommendationExplanation = typeof recommendationExplanations.$inferSelect;

// Metric Time Series - Granular metric data over time
export const metricTimeSeries = pgTable("metric_time_series", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricId: varchar("metric_id").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  granularity: varchar("granularity").notNull(), // minute, hour, day
  value: integer("value").notNull(), // Stored as value * 100 for precision
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  timestamp: timestamp("timestamp").notNull(),
}, (table) => [
  index("IDX_metric_ts_metric").on(table.metricId),
  index("IDX_metric_ts_entity").on(table.entityType, table.entityId),
  index("IDX_metric_ts_timestamp").on(table.timestamp),
  index("IDX_metric_ts_metric_time").on(table.metricId, table.timestamp),
  index("IDX_metric_ts_granularity").on(table.granularity),
]);

export type MetricTimeSeries = typeof metricTimeSeries.$inferSelect;
export type InsertMetricTimeSeries = typeof metricTimeSeries.$inferInsert;

// Dashboard Configurations - Custom user dashboard settings
export const dashboardConfigurations = pgTable("dashboard_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  role: varchar("role").notNull(), // pm, seo, ops, custom
  name: varchar("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  widgets: jsonb("widgets").$type<Array<{
    id: string;
    type: string;
    title: string;
    metricIds: string[];
    size: string;
    position: { row: number; col: number };
    config: Record<string, unknown>;
  }>>().default([]),
  refreshInterval: integer("refresh_interval").default(300), // seconds
  defaultDateRange: varchar("default_date_range").default("7d"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_dashboard_configs_user").on(table.userId),
  index("IDX_dashboard_configs_role").on(table.role),
]);

export const insertDashboardConfigurationSchema = createInsertSchema(dashboardConfigurations);
export type InsertDashboardConfiguration = z.infer<typeof insertDashboardConfigurationSchema>;
export type DashboardConfiguration = typeof dashboardConfigurations.$inferSelect;

// ============================================================================
// TRAVI CONTENT GENERATION SYSTEM
// ============================================================================

// Location category enum
export const traviLocationCategoryEnum = pgEnum("travi_location_category", ["attraction", "restaurant", "hotel"]);

// Location processing status enum
export const traviLocationStatusEnum = pgEnum("travi_location_status", [
  "discovered",   // Found from Wikipedia/OSM
  "enriching",    // Google Places enrichment in progress
  "generating",   // AI content generation in progress
  "ready",        // Ready for review/export
  "error",        // Processing error occurred
  "exported"      // Exported to JSON/CSV
]);

// AI model enum for content generation
export const traviAiModelEnum = pgEnum("travi_ai_model", ["gemini-2.0-flash-exp", "gpt-4o-mini", "claude-haiku-4-5-20251001"]);

// Districts/Zones for hierarchical organization
export const traviDistricts = pgTable("travi_districts", {
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
}, (table) => [
  index("IDX_travi_districts_city").on(table.city),
  uniqueIndex("IDX_travi_districts_city_slug").on(table.city, table.slug),
]);

export const insertTraviDistrictSchema = createInsertSchema(traviDistricts);
export type InsertTraviDistrict = z.infer<typeof insertTraviDistrictSchema>;
export type TraviDistrict = typeof traviDistricts.$inferSelect;

// ============================================================================
// TIQETS INTEGRATION SYSTEM
// ============================================================================

// Tiqets Cities - target cities for attraction import
export const tiqetsCities = pgTable("tiqets_cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tiqetsCityId: varchar("tiqets_city_id").unique(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  countryName: varchar("country_name", { length: 100 }),
  isActive: boolean("is_active").default(true),
  attractionCount: integer("attraction_count").default(0),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_tiqets_cities_name").on(table.name),
  index("IDX_tiqets_cities_active").on(table.isActive),
]);

export const insertTiqetsCitySchema = createInsertSchema(tiqetsCities);
export type InsertTiqetsCity = z.infer<typeof insertTiqetsCitySchema>;
export type TiqetsCity = typeof tiqetsCities.$inferSelect;

// Tiqets Attractions - imported from Tiqets API
export const tiqetsAttractionStatusEnum = pgEnum("tiqets_attraction_status", [
  "imported",      // Just imported from Tiqets
  "processing",    // AI content generation in progress
  "ready",         // Content generated, ready for review
  "published",     // Published to website
  "archived"       // Archived/disabled
]);

export const tiqetsAttractions = pgTable("tiqets_attractions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
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
  contentGenerationStatus: varchar("content_generation_status", { length: 20 }).default("pending"), // pending, in_progress, completed, failed
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
  tiqetsImages: jsonb("tiqets_images").$type<Array<{
    small?: string;
    medium?: string;
    large?: string;
    extra_large?: string;
    alt_text?: string;
  }>>(),
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
  images: jsonb("images").$type<Array<{
    url: string;
    alt: string;
    isHero?: boolean;
  }>>(),
  
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
}, (table) => [
  index("IDX_tiqets_attractions_city").on(table.cityName),
  index("IDX_tiqets_attractions_status").on(table.status),
  index("IDX_tiqets_attractions_tiqets_id").on(table.tiqetsId),
  index("IDX_tiqets_attractions_district").on(table.districtId),
  index("IDX_tiqets_attractions_seo_slug").on(table.seoSlug),
]);

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
  faqs: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).nullable().optional(),
  primaryCategory: z.string().max(100).nullable().optional(),
  secondaryCategories: z.array(z.string()).nullable().optional(),
  ratingLabel: z.string().max(50).nullable().optional(),
  status: z.enum(["imported", "ready", "published"]).optional(),
  // SEO slug and AI content fields
  seoSlug: z.string().max(200).nullable().optional(),
  aiContent: z.object({
    introduction: z.string(),
    whyVisit: z.string(),
    proTip: z.string(),
    whatToExpect: z.array(z.object({ title: z.string(), description: z.string(), icon: z.string() })),
    visitorTips: z.array(z.object({ title: z.string(), description: z.string(), icon: z.string() })),
    howToGetThere: z.object({
      description: z.string(),
      transport: z.array(z.object({ mode: z.string(), details: z.string() })),
    }),
    answerCapsule: z.string(),
    schemaPayload: z.record(z.unknown()),
  }).nullable().optional(),
  contentGenerationStatus: z.enum(["pending", "generating", "ready", "failed"]).optional(),
});
export type UpdateTiqetsAttraction = z.infer<typeof updateTiqetsAttractionSchema>;

// Relations for Tiqets tables
export const tiqetsAttractionsRelations = relations(tiqetsAttractions, ({ one }) => ({
  district: one(traviDistricts, { fields: [tiqetsAttractions.districtId], references: [traviDistricts.id] }),
}));

// Processing job status enum
export const traviJobStatusEnum = pgEnum("travi_job_status", [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "budget_exceeded"
]);

// Processing job type enum  
export const traviJobTypeEnum = pgEnum("travi_job_type", [
  "discover_locations",
  "enrich_locations",
  "generate_content",
  "collect_images",
  "export_data"
]);

// Travel Processing Jobs - tracks processing progress with checkpoints
export const traviProcessingJobs = pgTable("travi_processing_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_travi_processing_jobs_status").on(table.status),
  index("IDX_travi_processing_jobs_type").on(table.jobType),
]);

export const insertTraviProcessingJobSchema = createInsertSchema(traviProcessingJobs);
export type InsertTraviProcessingJob = z.infer<typeof insertTraviProcessingJobSchema>;
export type TraviProcessingJob = typeof traviProcessingJobs.$inferSelect;

// API service type enum
export const traviApiServiceEnum = pgEnum("travi_api_service", [
  "gemini",
  "gpt",
  "claude",
  "google_places",
  "freepik",
  "tripadvisor",
  "wikipedia",
  "osm"
]);

// Travel API Usage - daily usage tracking and cost calculation
export const traviApiUsage = pgTable("travi_api_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  uniqueIndex("IDX_travi_api_usage_date_service").on(table.date, table.service),
  index("IDX_travi_api_usage_date").on(table.date),
]);

export const insertTraviApiUsageSchema = createInsertSchema(traviApiUsage);
export type InsertTraviApiUsage = z.infer<typeof insertTraviApiUsageSchema>;
export type TraviApiUsage = typeof traviApiUsage.$inferSelect;

// Travel System Alerts - budget and rate limit alerts
export const traviAlertSeverityEnum = pgEnum("travi_alert_severity", ["info", "warning", "critical", "budget_stop"]);

export const traviSystemAlerts = pgTable("travi_system_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
}, (table) => [
  index("IDX_travi_system_alerts_severity").on(table.severity),
  index("IDX_travi_system_alerts_created").on(table.createdAt),
]);

export const insertTraviSystemAlertSchema = createInsertSchema(traviSystemAlerts);
export type InsertTraviSystemAlert = z.infer<typeof insertTraviSystemAlertSchema>;
export type TraviSystemAlert = typeof traviSystemAlerts.$inferSelect;

// TRAVI Configuration - stores destination enabled states and other settings
export const traviConfig = pgTable("travi_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configKey: varchar("config_key", { length: 100 }).notNull().unique(),
  configValue: jsonb("config_value").$type<{
    enabled?: boolean;
    destinationId?: string;
    value?: string | number | boolean;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("IDX_travi_config_key").on(table.configKey),
]);

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

// Travel Advisory enums
export const advisoryTypeEnum = pgEnum("advisory_type", ["visa", "passport", "vaccination", "transit", "entry_requirements"]);
export const advisoryStatusEnum = pgEnum("advisory_status", ["active", "expired", "pending"]);
export const advisorySeverityEnum = pgEnum("advisory_severity", ["info", "warning", "critical"]);

// Health Alert enums
export const healthAlertTypeEnum = pgEnum("health_alert_type", ["disease_outbreak", "vaccination_required", "travel_restriction", "general_health"]);
export const healthAlertStatusEnum = pgEnum("health_alert_status", ["active", "resolved", "monitoring"]);
export const healthAlertSeverityEnum = pgEnum("health_alert_severity", ["low", "medium", "high", "critical"]);

// Destination Event enums
export const destinationEventTypeEnum = pgEnum("destination_event_type", ["festival", "sports", "conference", "concert", "exhibition", "cultural", "holiday"]);
export const destinationEventStatusEnum = pgEnum("destination_event_status", ["upcoming", "ongoing", "completed", "cancelled"]);

// Travel Advisories - visa, passport, vaccination requirements by destination
export const travelAdvisories = pgTable("travel_advisories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  advisoryType: advisoryTypeEnum("advisory_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  requirements: jsonb("requirements").$type<Record<string, unknown>>().default({}),
  translations: jsonb("translations").$type<Record<string, { title?: string; description?: string }>>().default({}),
  sourceUrl: text("source_url"),
  effectiveDate: timestamp("effective_date"),
  expiryDate: timestamp("expiry_date"),
  status: advisoryStatusEnum("status").notNull().default("active"),
  severity: advisorySeverityEnum("severity").notNull().default("info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_travel_advisories_destination").on(table.destinationId),
  index("IDX_travel_advisories_type").on(table.advisoryType),
  index("IDX_travel_advisories_status").on(table.status),
  index("IDX_travel_advisories_severity").on(table.severity),
]);

export const insertTravelAdvisorySchema = createInsertSchema(travelAdvisories);
export type InsertTravelAdvisory = z.infer<typeof insertTravelAdvisorySchema>;
export type TravelAdvisory = typeof travelAdvisories.$inferSelect;

// Health Alerts - disease outbreaks, vaccination requirements, travel restrictions
export const healthAlerts = pgTable("health_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  alertType: healthAlertTypeEnum("alert_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  translations: jsonb("translations").$type<Record<string, { title?: string; description?: string }>>().default({}),
  source: text("source"),
  sourceUrl: text("source_url"),
  issuedDate: timestamp("issued_date"),
  expiryDate: timestamp("expiry_date"),
  status: healthAlertStatusEnum("status").notNull().default("active"),
  severity: healthAlertSeverityEnum("severity").notNull().default("low"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_health_alerts_destination").on(table.destinationId),
  index("IDX_health_alerts_type").on(table.alertType),
  index("IDX_health_alerts_status").on(table.status),
  index("IDX_health_alerts_severity").on(table.severity),
  index("IDX_health_alerts_issued_date").on(table.issuedDate),
]);

export const insertHealthAlertSchema = createInsertSchema(healthAlerts);
export type InsertHealthAlert = z.infer<typeof insertHealthAlertSchema>;
export type HealthAlert = typeof healthAlerts.$inferSelect;

// Destination Events - festivals, sports, conferences, concerts, etc.
export const destinationEvents = pgTable("destination_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  translations: jsonb("translations").$type<Record<string, { name?: string; description?: string }>>().default({}),
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
}, (table) => [
  index("IDX_destination_events_destination").on(table.destinationId),
  index("IDX_destination_events_type").on(table.eventType),
  index("IDX_destination_events_status").on(table.status),
  index("IDX_destination_events_start_date").on(table.startDate),
  index("IDX_destination_events_featured").on(table.featured),
]);

export const insertDestinationEventSchema = createInsertSchema(destinationEvents);
export type InsertDestinationEvent = z.infer<typeof insertDestinationEventSchema>;
export type DestinationEvent = typeof destinationEvents.$inferSelect;

// Relations for Travel Intelligence tables
export const travelAdvisoriesRelations = relations(travelAdvisories, ({ one }) => ({
  destination: one(destinations, { fields: [travelAdvisories.destinationId], references: [destinations.id] }),
}));

export const healthAlertsRelations = relations(healthAlerts, ({ one }) => ({
  destination: one(destinations, { fields: [healthAlerts.destinationId], references: [destinations.id] }),
}));

export const destinationEventsRelations = relations(destinationEvents, ({ one }) => ({
  destination: one(destinations, { fields: [destinationEvents.destinationId], references: [destinations.id] }),
}));

// Visa Requirements - passport to destination visa requirements from Passport Index
export const visaRequirements = pgTable("visa_requirements", {
  id: serial("id").primaryKey(),
  passportCountryCode: varchar("passport_country_code", { length: 2 }).notNull(),
  destinationCountryCode: varchar("destination_country_code", { length: 2 }).notNull(),
  visaCategory: varchar("visa_category", { length: 20 }).notNull(),
  stayDuration: integer("stay_duration"),
  notes: text("notes"),
  sourceUrl: varchar("source_url"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_visa_requirements_passport").on(table.passportCountryCode),
  index("IDX_visa_requirements_destination").on(table.destinationCountryCode),
  uniqueIndex("IDX_visa_requirements_passport_destination").on(table.passportCountryCode, table.destinationCountryCode),
]);

export const insertVisaRequirementSchema = createInsertSchema(visaRequirements);
export type InsertVisaRequirement = z.infer<typeof insertVisaRequirementSchema>;
export type VisaRequirement = typeof visaRequirements.$inferSelect;

// =========================================
// UPDATE 9987 - External Data Integration
// =========================================

// Countries table - from dr5hn/countries-states-cities
export const update9987Countries = pgTable("update_9987_countries", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  iso2: varchar("iso2", { length: 2 }).notNull().unique(),
  iso3: varchar("iso3", { length: 3 }),
  numericCode: varchar("numeric_code", { length: 3 }),
  phoneCode: varchar("phone_code", { length: 20 }),
  capital: varchar("capital", { length: 255 }),
  currency: varchar("currency", { length: 10 }),
  currencyName: varchar("currency_name", { length: 100 }),
  currencySymbol: varchar("currency_symbol", { length: 10 }),
  tld: varchar("tld", { length: 10 }),
  native: varchar("native", { length: 255 }),
  region: varchar("region", { length: 100 }),
  subregion: varchar("sub_region", { length: 100 }),
  timezones: jsonb("timezones"),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  emoji: varchar("emoji", { length: 10 }),
  emojiU: varchar("emoji_u", { length: 50 }),
  sourceId: varchar("source_id", { length: 50 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// States/Regions table
export const update9987States = pgTable("update_9987_states", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  countryId: integer("country_id").references(() => update9987Countries.id),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  stateCode: varchar("state_code", { length: 10 }),
  type: varchar("type", { length: 50 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  sourceId: varchar("source_id", { length: 50 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cities table
export const update9987Cities = pgTable("update_9987_cities", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  stateId: integer("state_id").references(() => update9987States.id),
  stateCode: varchar("state_code", { length: 10 }),
  countryId: integer("country_id").references(() => update9987Countries.id),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  wikiDataId: varchar("wiki_data_id", { length: 50 }),
  sourceId: varchar("source_id", { length: 50 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_update9987_cities_country").on(table.countryCode),
  index("idx_update9987_cities_name").on(table.name),
]);

// External POI table - from OpenTripMap
export const update9987Pois = pgTable("update_9987_pois", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 100 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  kinds: text("kinds"),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  cityId: integer("city_id").references(() => update9987Cities.id),
  countryCode: varchar("country_code", { length: 2 }),
  description: text("description"),
  wikipediaUrl: varchar("wikipedia_url", { length: 500 }),
  image: varchar("image", { length: 500 }),
  rating: varchar("rating", { length: 10 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_update9987_pois_source").on(table.source),
  index("idx_update9987_pois_country").on(table.countryCode),
  uniqueIndex("idx_update9987_pois_external").on(table.externalId, table.source),
]);

// Wikivoyage Guides table
export const update9987Guides = pgTable("update_9987_guides", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 500 }).notNull().unique(),
  destinationType: varchar("destination_type", { length: 50 }),
  countryCode: varchar("country_code", { length: 2 }),
  cityId: integer("city_id").references(() => update9987Cities.id),
  originalContent: text("original_content"),
  rewrittenContent: text("rewritten_content"),
  rewriteModel: varchar("rewrite_model", { length: 50 }),
  rewriteCost: varchar("rewrite_cost", { length: 20 }),
  sections: jsonb("sections"),
  status: varchar("status", { length: 20 }).default("pending"),
  publishedAt: timestamp("published_at"),
  rawData: jsonb("raw_data"),
  // SEO/AEO fields
  metaTitle: varchar("meta_title", { length: 70 }),
  metaDescription: varchar("meta_description", { length: 170 }),
  focusKeyword: varchar("focus_keyword", { length: 100 }),
  secondaryKeywords: jsonb("secondary_keywords"), // string[]
  seoScore: integer("seo_score"),
  schemaMarkup: jsonb("schema_markup"), // JSON-LD schemas
  ogTags: jsonb("og_tags"), // Open Graph metadata
  images: jsonb("images"), // Unsplash images with alt text
  faqs: jsonb("faqs"), // FAQ schema data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ingestion runs tracking
export const update9987IngestionRuns = pgTable("update_9987_ingestion_runs", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("running"),
  recordsProcessed: integer("records_processed").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsErrored: integer("records_errored").default(0),
  errors: jsonb("errors"),
  metadata: jsonb("metadata"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Overture Maps POIs (64M+ from Meta/Microsoft/Amazon)
export const update9987OverturePois = pgTable("update_9987_overture_pois", {
  id: serial("id").primaryKey(),
  overtureId: varchar("overture_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  confidence: varchar("confidence", { length: 10 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  h3Index: varchar("h3_index", { length: 20 }),
  address: jsonb("address"),
  phones: jsonb("phones"),
  websites: jsonb("websites"),
  brands: jsonb("brands"),
  countryCode: varchar("country_code", { length: 2 }),
  cityName: varchar("city_name", { length: 255 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_update9987_overture_category").on(table.category),
  index("idx_update9987_overture_country").on(table.countryCode),
  index("idx_update9987_overture_h3").on(table.h3Index),
  index("idx_update9987_overture_city").on(table.cityName),
]);

// TourPedia POIs (500K from Facebook/Foursquare/Google/Booking)
export const update9987TourpediaPois = pgTable("update_9987_tourpedia_pois", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 100 }),
  source: varchar("source", { length: 50 }),
  name: varchar("name", { length: 500 }).notNull(),
  category: varchar("category", { length: 50 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  h3Index: varchar("h3_index", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  countryCode: varchar("country_code", { length: 2 }),
  externalLinks: jsonb("external_links"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_update9987_tourpedia_city").on(table.city),
  index("idx_update9987_tourpedia_category").on(table.category),
  uniqueIndex("idx_update9987_tourpedia_unique").on(table.externalId, table.source),
]);

// Wikivoyage POIs (313K with addresses, phones, hours)
export const update9987WikivoyagePois = pgTable("update_9987_wikivoyage_pois", {
  id: serial("id").primaryKey(),
  articleName: varchar("article_name", { length: 500 }),
  listingType: varchar("listing_type", { length: 50 }),
  name: varchar("name", { length: 500 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 100 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 500 }),
  hours: text("hours"),
  price: text("price"),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  h3Index: varchar("h3_index", { length: 20 }),
  description: text("description"),
  countryCode: varchar("country_code", { length: 2 }),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_update9987_wikivoyage_article").on(table.articleName),
  index("idx_update9987_wikivoyage_type").on(table.listingType),
  index("idx_update9987_wikivoyage_h3").on(table.h3Index),
]);

// GeoNames locations (11M+ geographic features)
export const update9987Geonames = pgTable("update_9987_geonames", {
  id: serial("id").primaryKey(),
  geonameId: integer("geoname_id").notNull().unique(),
  name: varchar("name", { length: 500 }).notNull(),
  asciiName: varchar("ascii_name", { length: 500 }),
  alternateNames: text("alternate_names"),
  featureClass: varchar("feature_class", { length: 5 }),
  featureCode: varchar("feature_code", { length: 20 }),
  countryCode: varchar("country_code", { length: 2 }),
  adminCode1: varchar("admin_code1", { length: 20 }),
  adminCode2: varchar("admin_code2", { length: 80 }),
  population: integer("population"),
  elevation: integer("elevation"),
  timezone: varchar("timezone", { length: 50 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  h3Index: varchar("h3_index", { length: 20 }),
  modificationDate: varchar("modification_date", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_update9987_geonames_country").on(table.countryCode),
  index("idx_update9987_geonames_feature").on(table.featureClass, table.featureCode),
  index("idx_update9987_geonames_h3").on(table.h3Index),
  index("idx_update9987_geonames_name").on(table.name),
]);

// Content embeddings for semantic search (pgvector)
export const update9987Embeddings = pgTable("update_9987_embeddings", {
  id: serial("id").primaryKey(),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  contentId: varchar("content_id", { length: 100 }).notNull(),
  chunkIndex: integer("chunk_index").default(0),
  text: text("text").notNull(),
  model: varchar("model", { length: 50 }),
  dimensions: integer("dimensions"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_update9987_embeddings_content").on(table.contentType, table.contentId),
]);

// SLIPO OSM POIs - 18.5M+ POIs from OpenStreetMap in CSV format
// Source: https://download.slipo.eu/results/osm-to-csv/
export const update9987SlipoPois = pgTable("update_9987_slipo_pois", {
  id: serial("id").primaryKey(),
  osmId: varchar("osm_id", { length: 50 }).notNull(),
  osmType: varchar("osm_type", { length: 20 }), // node, way, relation
  name: varchar("name", { length: 500 }),
  category: varchar("category", { length: 200 }),
  subcategory: varchar("subcategory", { length: 200 }),
  street: varchar("street", { length: 500 }),
  houseNumber: varchar("house_number", { length: 50 }),
  city: varchar("city", { length: 200 }),
  postcode: varchar("postcode", { length: 20 }),
  countryCode: varchar("country_code", { length: 5 }),
  phone: varchar("phone", { length: 100 }),
  website: varchar("website", { length: 500 }),
  email: varchar("email", { length: 200 }),
  openingHours: text("opening_hours"),
  cuisine: varchar("cuisine", { length: 200 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  h3Index: varchar("h3_index", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_update9987_slipo_country").on(table.countryCode),
  index("idx_update9987_slipo_category").on(table.category),
  index("idx_update9987_slipo_city").on(table.city),
  index("idx_update9987_slipo_h3").on(table.h3Index),
  uniqueIndex("idx_update9987_slipo_osm").on(table.osmId, table.osmType),
]);

// Foursquare OS Places - 100M+ global POIs with Apache 2.0 license
// Source: https://opensource.foursquare.com/os-places
export const update9987FoursquarePois = pgTable("update_9987_foursquare_pois", {
  id: serial("id").primaryKey(),
  fsqId: varchar("fsq_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 500 }),
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  address: varchar("address", { length: 500 }),
  locality: varchar("locality", { length: 200 }),
  region: varchar("region", { length: 200 }),
  postcode: varchar("postcode", { length: 20 }),
  countryCode: varchar("country_code", { length: 5 }),
  categoryId: varchar("category_id", { length: 100 }),
  categoryName: varchar("category_name", { length: 200 }),
  chainId: varchar("chain_id", { length: 100 }),
  chainName: varchar("chain_name", { length: 200 }),
  dateCreated: varchar("date_created", { length: 30 }),
  dateRefreshed: varchar("date_refreshed", { length: 30 }),
  h3Index: varchar("h3_index", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_update9987_fsq_country").on(table.countryCode),
  index("idx_update9987_fsq_category").on(table.categoryId),
  index("idx_update9987_fsq_locality").on(table.locality),
  index("idx_update9987_fsq_h3").on(table.h3Index),
]);

// Public Holidays table - from Nager.Date API (100+ countries, free)
// Source: https://date.nager.at/api/v3/publicholidays/{year}/{countryCode}
export const update9987PublicHolidays = pgTable("update_9987_public_holidays", {
  id: serial("id").primaryKey(),
  countryCode: varchar("country_code", { length: 5 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  year: integer("year").notNull(),
  localName: varchar("local_name", { length: 255 }),
  name: varchar("name", { length: 255 }).notNull(),
  fixed: boolean("fixed").default(false),
  global: boolean("global").default(true),
  counties: jsonb("counties"), // Array of regions where holiday applies
  launchYear: integer("launch_year"),
  types: jsonb("types"), // Array: Public, Bank, School, Authorities, Optional, Observance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_update9987_holidays_country").on(table.countryCode),
  index("idx_update9987_holidays_date").on(table.date),
  index("idx_update9987_holidays_year").on(table.year),
  uniqueIndex("idx_update9987_holidays_unique").on(table.countryCode, table.date, table.name),
]);

// Insert schemas
export const insertUpdate9987CountrySchema = createInsertSchema(update9987Countries);
export const insertUpdate9987StateSchema = createInsertSchema(update9987States);
export const insertUpdate9987CitySchema = createInsertSchema(update9987Cities);
export const insertUpdate9987PoiSchema = createInsertSchema(update9987Pois);
export const insertUpdate9987GuideSchema = createInsertSchema(update9987Guides);
export const insertUpdate9987OverturePoiSchema = createInsertSchema(update9987OverturePois);
export const insertUpdate9987TourpediaPoiSchema = createInsertSchema(update9987TourpediaPois);
export const insertUpdate9987WikivoyagePoiSchema = createInsertSchema(update9987WikivoyagePois);
export const insertUpdate9987GeonameSchema = createInsertSchema(update9987Geonames);
export const insertUpdate9987EmbeddingSchema = createInsertSchema(update9987Embeddings);
export const insertUpdate9987SlipoPoiSchema = createInsertSchema(update9987SlipoPois);
export const insertUpdate9987FoursquarePoiSchema = createInsertSchema(update9987FoursquarePois);
export const insertUpdate9987PublicHolidaySchema = createInsertSchema(update9987PublicHolidays);

// Types
export type Update9987Country = typeof update9987Countries.$inferSelect;
export type InsertUpdate9987Country = z.infer<typeof insertUpdate9987CountrySchema>;
export type Update9987State = typeof update9987States.$inferSelect;
export type InsertUpdate9987State = z.infer<typeof insertUpdate9987StateSchema>;
export type Update9987City = typeof update9987Cities.$inferSelect;
export type InsertUpdate9987City = z.infer<typeof insertUpdate9987CitySchema>;
export type Update9987Poi = typeof update9987Pois.$inferSelect;
export type InsertUpdate9987Poi = z.infer<typeof insertUpdate9987PoiSchema>;
export type Update9987Guide = typeof update9987Guides.$inferSelect;
export type InsertUpdate9987Guide = z.infer<typeof insertUpdate9987GuideSchema>;
export type Update9987OverturePoi = typeof update9987OverturePois.$inferSelect;
export type InsertUpdate9987OverturePoi = z.infer<typeof insertUpdate9987OverturePoiSchema>;
export type Update9987TourpediaPoi = typeof update9987TourpediaPois.$inferSelect;
export type InsertUpdate9987TourpediaPoi = z.infer<typeof insertUpdate9987TourpediaPoiSchema>;
export type Update9987WikivoyagePoi = typeof update9987WikivoyagePois.$inferSelect;
export type InsertUpdate9987WikivoyagePoi = z.infer<typeof insertUpdate9987WikivoyagePoiSchema>;
export type Update9987Geoname = typeof update9987Geonames.$inferSelect;
export type InsertUpdate9987Geoname = z.infer<typeof insertUpdate9987GeonameSchema>;
export type Update9987Embedding = typeof update9987Embeddings.$inferSelect;
export type InsertUpdate9987Embedding = z.infer<typeof insertUpdate9987EmbeddingSchema>;
export type Update9987SlipoPoi = typeof update9987SlipoPois.$inferSelect;
export type InsertUpdate9987SlipoPoi = z.infer<typeof insertUpdate9987SlipoPoiSchema>;
export type Update9987FoursquarePoi = typeof update9987FoursquarePois.$inferSelect;
export type InsertUpdate9987FoursquarePoi = z.infer<typeof insertUpdate9987FoursquarePoiSchema>;
export type Update9987PublicHoliday = typeof update9987PublicHolidays.$inferSelect;
export type InsertUpdate9987PublicHoliday = z.infer<typeof insertUpdate9987PublicHolidaySchema>;
