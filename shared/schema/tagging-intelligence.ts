import {
  pgTable,
  varchar,
  text,
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
import {
  tagCategoryEnum,
  tagSourceEnum,
  placementSurfaceEnum,
  imageUsageDecisionEnum,
  imageRoleEnum,
} from "./enums";

// =====================================================
// OCTOPUS V2 PHASE 5 - TAGGING & PLACEMENT INTELLIGENCE
// =====================================================

// Tag Definitions - Single Source of Truth for all tags
export const tagDefinitions = pgTable(
  "tag_definitions",
  {
    id: varchar("id").primaryKey(), // Stable, human-readable slug (e.g., "luxury", "beach")
    category: tagCategoryEnum("category").notNull(),
    label: text("label").notNull(), // English display label
    labelTranslations: jsonb("label_translations").$type<Record<string, string>>(), // Translations by locale code (e.g. { "fr": "luxe", "es": "lujo" })
    parentId: varchar("parent_id").references((): any => tagDefinitions.id, {
      onDelete: "set null",
    }), // Hierarchy support
    destinationId: varchar("destination_id"), // For destination-scoped tags (districts)
    description: text("description"), // Optional description
    sortOrder: integer("sort_order").default(0),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_tag_definitions_category").on(table.category),
    index("IDX_tag_definitions_parent").on(table.parentId),
    index("IDX_tag_definitions_destination").on(table.destinationId),
  ]
);

export const insertTagDefinitionSchema = createInsertSchema(tagDefinitions);
export type TagDefinition = typeof tagDefinitions.$inferSelect;
export type InsertTagDefinition = z.infer<typeof insertTagDefinitionSchema>;

// Entity Tags - Junction table linking entities to tags
export const entityTags = pgTable(
  "entity_tags",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    entityType: varchar("entity_type").notNull(), // "hotel", "attraction", "district", "article"
    entityId: varchar("entity_id").notNull(), // FK to contents.id or specific entity table
    tagId: varchar("tag_id")
      .notNull()
      .references(() => tagDefinitions.id, { onDelete: "cascade" }),
    confidence: integer("confidence").default(100), // 0-100 (AI confidence percentage)
    source: tagSourceEnum("source").notNull().default("manual"),
    reasoning: text("reasoning"), // AI explanation for the tag
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_entity_tags_entity").on(table.entityType, table.entityId),
    index("IDX_entity_tags_tag").on(table.tagId),
    uniqueIndex("IDX_entity_tags_unique").on(table.entityType, table.entityId, table.tagId),
  ]
);

export const insertEntityTagSchema = createInsertSchema(entityTags);
export type EntityTag = typeof entityTags.$inferSelect;
export type InsertEntityTag = z.infer<typeof insertEntityTagSchema>;

// Entity Placements - Controls where entities appear on the site
export const entityPlacements = pgTable(
  "entity_placements",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  table => [
    index("IDX_entity_placements_surface").on(table.surface, table.destinationId, table.isActive),
    index("IDX_entity_placements_entity").on(table.entityType, table.entityId),
    // Note: Unique constraint with nullable columns is enforced at application level
    // to avoid PostgreSQL NULL handling issues in unique indexes
  ]
);

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
export const placementRules = pgTable(
  "placement_rules",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name").notNull(),
    description: text("description"),
    surface: placementSurfaceEnum("surface").notNull(),
    entityType: varchar("entity_type").notNull(),
    conditions: jsonb("conditions").$type<PlacementRuleConditions>().notNull(),
    priority: integer("priority").default(0), // Lower = evaluated first
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [index("IDX_placement_rules_surface").on(table.surface, table.isActive)]
);

export type PlacementRule = typeof placementRules.$inferSelect;
export type InsertPlacementRule = typeof placementRules.$inferInsert;

// Relations for tagging system
export const tagDefinitionsRelations = relations(tagDefinitions, ({ one, many }) => ({
  parent: one(tagDefinitions, {
    fields: [tagDefinitions.parentId],
    references: [tagDefinitions.id],
  }),
  entityTags: many(entityTags),
}));

export const entityTagsRelations = relations(entityTags, ({ one }) => ({
  tag: one(tagDefinitions, { fields: [entityTags.tagId], references: [tagDefinitions.id] }),
}));

// =====================================================
// OCTOPUS V2 - IMAGE USAGE ORCHESTRATION LAYER
// =====================================================

// Intelligence Snapshot structure
export interface IntelligenceSnapshot {
  relevanceScore?: number; // 0-100 relevance to entity
  usageScore?: number; // 0-100 suitability for role
  qualityScore?: number; // 0-100 technical quality
  confidenceLevel?: number; // 0-1 AI confidence
  tags?: string[]; // Detected tags
  subjects?: string[]; // Detected subjects
  mood?: string; // Detected mood/atmosphere
  colorPalette?: string[]; // Dominant colors
  composition?: string; // Composition type
  fetchedAt?: string; // ISO timestamp when intelligence was fetched
  provider?: string; // Intelligence provider used
}

// ImageUsage table - tracks how images are used per page + image
export const imageUsage = pgTable(
  "image_usage",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    assetId: varchar("asset_id").notNull(), // Reference to image asset
    entityId: varchar("entity_id"), // Entity this image is associated with
    entityType: varchar("entity_type"), // "hotel", "attraction", "destination", etc.
    pageId: varchar("page_id"), // Page where image is used
    pageType: varchar("page_type"), // "destination", "district", "attraction", etc.
    requestedRole: imageRoleEnum("requested_role"), // Role originally requested
    finalRole: imageRoleEnum("final_role"), // Role after decision engine
    intelligenceSnapshot: jsonb("intelligence_snapshot").$type<IntelligenceSnapshot>(),
    decision: imageUsageDecisionEnum("decision").notNull().default("pending"),
    decisionReason: text("decision_reason"), // Human-readable explanation
    decisionRuleId: varchar("decision_rule_id"), // Which rule triggered the decision
    approvedBy: varchar("approved_by"), // User who approved (if manual)
    approvedAt: timestamp("approved_at"), // When approved
    reusedFromId: varchar("reused_from_id"), // If reused, reference to original usage
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_image_usage_asset").on(table.assetId),
    index("IDX_image_usage_entity").on(table.entityType, table.entityId),
    index("IDX_image_usage_page").on(table.pageType, table.pageId),
    index("IDX_image_usage_decision").on(table.decision),
    uniqueIndex("IDX_image_usage_unique").on(table.assetId, table.pageId, table.requestedRole),
  ]
);

export const insertImageUsageSchema = createInsertSchema(imageUsage);
export type ImageUsage = typeof imageUsage.$inferSelect;
export type InsertImageUsage = z.infer<typeof insertImageUsageSchema>;

// ImageUsage Relations
export const imageUsageRelations = relations(imageUsage, ({ one }) => ({
  reusedFrom: one(imageUsage, {
    fields: [imageUsage.reusedFromId],
    references: [imageUsage.id],
    relationName: "reuse_chain",
  }),
}));
