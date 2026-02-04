import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Search Queries table for analytics
export const searchQueries = pgTable(
  "search_queries",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    query: varchar("query").notNull(),
    resultsCount: integer("results_count").notNull().default(0),
    clickedResultId: varchar("clicked_result_id"),
    locale: varchar("locale").notNull().default("en"),
    sessionId: varchar("session_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  table => [
    index("IDX_search_query").on(table.query),
    index("IDX_search_created").on(table.createdAt),
    index("IDX_search_results").on(table.resultsCount),
  ]
);

export const insertSearchQuerySchema = createInsertSchema(searchQueries);
export type SearchQuery = typeof searchQueries.$inferSelect;
export type InsertSearchQuery = typeof searchQueries.$inferInsert;

// Search Index table for full-text and semantic search
export const searchIndex = pgTable(
  "search_index",
  {
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
  },
  table => [
    index("IDX_search_content_type").on(table.contentType),
    index("IDX_search_locale").on(table.locale),
    index("IDX_search_updated").on(table.updatedAt),
  ]
);

export const insertSearchIndexSchema = createInsertSchema(searchIndex);
export type SearchIndex = typeof searchIndex.$inferSelect;
export type InsertSearchIndex = typeof searchIndex.$inferInsert;
