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

// ============================================
// GEOGRAPHIC AND POI DATA TABLES
// ============================================

// Countries table
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
export const update9987Cities = pgTable(
  "update_9987_cities",
  {
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
  },
  table => [
    index("idx_update9987_cities_country").on(table.countryCode),
    index("idx_update9987_cities_name").on(table.name),
  ]
);

// External POI table - from OpenTripMap
export const update9987Pois = pgTable(
  "update_9987_pois",
  {
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
  },
  table => [
    index("idx_update9987_pois_source").on(table.source),
    index("idx_update9987_pois_country").on(table.countryCode),
    uniqueIndex("idx_update9987_pois_external").on(table.externalId, table.source),
  ]
);

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
export const update9987OverturePois = pgTable(
  "update_9987_overture_pois",
  {
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
  },
  table => [
    index("idx_update9987_overture_category").on(table.category),
    index("idx_update9987_overture_country").on(table.countryCode),
    index("idx_update9987_overture_h3").on(table.h3Index),
    index("idx_update9987_overture_city").on(table.cityName),
  ]
);

// TourPedia POIs (500K from Facebook/Foursquare/Google/Booking)
export const update9987TourpediaPois = pgTable(
  "update_9987_tourpedia_pois",
  {
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
  },
  table => [
    index("idx_update9987_tourpedia_city").on(table.city),
    index("idx_update9987_tourpedia_category").on(table.category),
    uniqueIndex("idx_update9987_tourpedia_unique").on(table.externalId, table.source),
  ]
);

// Wikivoyage POIs (313K with addresses, phones, hours)
export const update9987WikivoyagePois = pgTable(
  "update_9987_wikivoyage_pois",
  {
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
  },
  table => [
    index("idx_update9987_wikivoyage_article").on(table.articleName),
    index("idx_update9987_wikivoyage_type").on(table.listingType),
    index("idx_update9987_wikivoyage_h3").on(table.h3Index),
  ]
);

// GeoNames locations (11M+ geographic features)
export const update9987Geonames = pgTable(
  "update_9987_geonames",
  {
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
  },
  table => [
    index("idx_update9987_geonames_country").on(table.countryCode),
    index("idx_update9987_geonames_feature").on(table.featureClass, table.featureCode),
    index("idx_update9987_geonames_h3").on(table.h3Index),
    index("idx_update9987_geonames_name").on(table.name),
  ]
);

// Content embeddings for semantic search (pgvector)
export const update9987Embeddings = pgTable(
  "update_9987_embeddings",
  {
    id: serial("id").primaryKey(),
    contentType: varchar("content_type", { length: 50 }).notNull(),
    contentId: varchar("content_id", { length: 100 }).notNull(),
    chunkIndex: integer("chunk_index").default(0),
    text: text("text").notNull(),
    model: varchar("model", { length: 50 }),
    dimensions: integer("dimensions"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [index("idx_update9987_embeddings_content").on(table.contentType, table.contentId)]
);

// SLIPO OSM POIs - 18.5M+ POIs from OpenStreetMap in CSV format
// Source: https://download.slipo.eu/results/osm-to-csv/
export const update9987SlipoPois = pgTable(
  "update_9987_slipo_pois",
  {
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
  },
  table => [
    index("idx_update9987_slipo_country").on(table.countryCode),
    index("idx_update9987_slipo_category").on(table.category),
    index("idx_update9987_slipo_city").on(table.city),
    index("idx_update9987_slipo_h3").on(table.h3Index),
    uniqueIndex("idx_update9987_slipo_osm").on(table.osmId, table.osmType),
  ]
);

// Foursquare OS Places - 100M+ global POIs with Apache 2.0 license
// Source: https://opensource.foursquare.com/os-places
export const update9987FoursquarePois = pgTable(
  "update_9987_foursquare_pois",
  {
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
  },
  table => [
    index("idx_update9987_fsq_country").on(table.countryCode),
    index("idx_update9987_fsq_category").on(table.categoryId),
    index("idx_update9987_fsq_locality").on(table.locality),
    index("idx_update9987_fsq_h3").on(table.h3Index),
  ]
);

// Public Holidays table - from Nager.Date API (100+ countries, free)
// Source: https://date.nager.at/api/v3/publicholidays/{year}/{countryCode}
export const update9987PublicHolidays = pgTable(
  "update_9987_public_holidays",
  {
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
  },
  table => [
    index("idx_update9987_holidays_country").on(table.countryCode),
    index("idx_update9987_holidays_date").on(table.date),
    index("idx_update9987_holidays_year").on(table.year),
    uniqueIndex("idx_update9987_holidays_unique").on(table.countryCode, table.date, table.name),
  ]
);

// ============================================
// INSERT SCHEMAS
// ============================================

export const insertUpdate9987CountrySchema = createInsertSchema(update9987Countries);
export const insertUpdate9987StateSchema = createInsertSchema(update9987States);
export const insertUpdate9987CitySchema = createInsertSchema(update9987Cities);
export const insertUpdate9987PoiSchema = createInsertSchema(update9987Pois);
export const insertUpdate9987GuideSchema = createInsertSchema(update9987Guides);
export const insertUpdate9987IngestionRunSchema = createInsertSchema(update9987IngestionRuns);
export const insertUpdate9987OverturePoiSchema = createInsertSchema(update9987OverturePois);
export const insertUpdate9987TourpediaPoiSchema = createInsertSchema(update9987TourpediaPois);
export const insertUpdate9987WikivoyagePoiSchema = createInsertSchema(update9987WikivoyagePois);
export const insertUpdate9987GeonameSchema = createInsertSchema(update9987Geonames);
export const insertUpdate9987EmbeddingSchema = createInsertSchema(update9987Embeddings);
export const insertUpdate9987SlipoPoiSchema = createInsertSchema(update9987SlipoPois);
export const insertUpdate9987FoursquarePoiSchema = createInsertSchema(update9987FoursquarePois);
export const insertUpdate9987PublicHolidaySchema = createInsertSchema(update9987PublicHolidays);

// ============================================
// TYPE EXPORTS
// ============================================

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

export type Update9987IngestionRun = typeof update9987IngestionRuns.$inferSelect;
export type InsertUpdate9987IngestionRun = z.infer<typeof insertUpdate9987IngestionRunSchema>;

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
