/**
 * Content Type-Specific Tables
 * Extension tables for different content types that reference the main contents table
 * Extracted from /Users/admin/travi-final-website/shared/schema.ts
 */

import { pgTable, varchar, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

import { articleCategoryEnum } from "./enums";
import type {
  QuickInfoItem,
  HighlightItem,
  TicketInfoItem,
  EssentialInfoItem,
  FaqItem,
  RelatedItem,
  GalleryImage,
  ExperienceItem,
  RoomTypeItem,
  DiningItem,
  NearbyItem,
  MenuHighlightItem,
  ThingsToDoItem,
  DistrictAttractionItem,
  DiningHighlightItem,
  RealEstateInfoItem,
  FareInfoItem,
  ItineraryDay,
} from "./types";

// ============================================================================
// ATTRACTIONS TABLE
// ============================================================================

/**
 * Attractions specific data
 * Links to contents via contentId (forward reference to avoid circular imports)
 */
export const attractions = pgTable("attractions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
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

export const insertAttractionSchema = createInsertSchema(attractions);
export type InsertAttraction = z.infer<typeof insertAttractionSchema>;
export type Attraction = typeof attractions.$inferSelect;

// ============================================================================
// HOTELS TABLE
// ============================================================================

/**
 * Hotels specific data
 * Links to contents via contentId (forward reference to avoid circular imports)
 */
export const hotels = pgTable("hotels", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
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

export const insertHotelSchema = createInsertSchema(hotels);
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type Hotel = typeof hotels.$inferSelect;

// ============================================================================
// ARTICLES TABLE
// ============================================================================

/**
 * Articles specific data
 * CMS Contract: News Article - editorial content, no CTAs
 * Links to contents via contentId (forward reference to avoid circular imports)
 */
export const articles = pgTable("articles", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
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

export const insertArticleSchema = createInsertSchema(articles);
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

// ============================================================================
// DINING TABLE
// ============================================================================

/**
 * Dining specific data
 * Links to contents via contentId (forward reference to avoid circular imports)
 */
export const dining = pgTable("dining", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
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

export const insertDiningSchema = createInsertSchema(dining);
export type InsertDining = z.infer<typeof insertDiningSchema>;
export type Dining = typeof dining.$inferSelect;

// ============================================================================
// DISTRICTS TABLE
// ============================================================================

/**
 * Districts specific data
 * Links to contents via contentId (forward reference to avoid circular imports)
 */
export const districts = pgTable("districts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
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

export const insertDistrictSchema = createInsertSchema(districts);
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districts.$inferSelect;

// ============================================================================
// TRANSPORTS TABLE
// ============================================================================

/**
 * Transport specific data
 * Links to contents via contentId (forward reference to avoid circular imports)
 */
export const transports = pgTable("transports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
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

export const insertTransportSchema = createInsertSchema(transports);
export type InsertTransport = z.infer<typeof insertTransportSchema>;
export type Transport = typeof transports.$inferSelect;

// ============================================================================
// EVENTS TABLE
// ============================================================================

/**
 * Events specific data
 * Links to contents via contentId (forward reference to avoid circular imports)
 */
export const events = pgTable("events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
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

export const insertEventSchema = createInsertSchema(events);
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// ============================================================================
// ITINERARIES TABLE
// ============================================================================

/**
 * Itineraries/Packages specific data
 * Links to contents via contentId (forward reference to avoid circular imports)
 */
export const itineraries = pgTable("itineraries", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
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

export const insertItinerarySchema = createInsertSchema(itineraries);
export type InsertItinerary = z.infer<typeof insertItinerarySchema>;
export type Itinerary = typeof itineraries.$inferSelect;
