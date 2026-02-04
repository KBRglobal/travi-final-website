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
import { sql, relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { liveChatStatusEnum, surveyStatusEnum, questionTypeEnum } from "./enums";
import { SurveyQuestion, SurveyDefinition } from "./types";
import { users } from "./auth";

// ============================================================================
// LIVE CHAT SUPPORT SYSTEM
// ============================================================================

// Live chat conversations table
export const liveChatConversations = pgTable(
  "live_chat_conversations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    visitorId: varchar("visitor_id").notNull(), // Browser fingerprint or session ID
    visitorName: varchar("visitor_name"),
    visitorEmail: varchar("visitor_email"),
    status: liveChatStatusEnum("status").notNull().default("open"),
    assignedToId: varchar("assigned_to_id").references(() => users.id),
    lastMessageAt: timestamp("last_message_at"),
    unreadCount: integer("unread_count").default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("idx_live_chat_status").on(table.status),
    index("idx_live_chat_visitor").on(table.visitorId),
    index("idx_live_chat_last_message").on(table.lastMessageAt),
  ]
);

export const insertLiveChatConversationSchema = createInsertSchema(liveChatConversations);
export type InsertLiveChatConversation = z.infer<typeof insertLiveChatConversationSchema>;
export type LiveChatConversation = typeof liveChatConversations.$inferSelect;

// Live chat messages table
export const liveChatMessages = pgTable(
  "live_chat_messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => liveChatConversations.id, { onDelete: "cascade" }),
    senderType: varchar("sender_type", { length: 20 }).notNull(), // 'visitor' or 'admin'
    senderId: varchar("sender_id"), // User ID if admin, null if visitor
    content: text("content").notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("idx_live_chat_messages_conversation").on(table.conversationId),
    index("idx_live_chat_messages_created").on(table.createdAt),
  ]
);

export const insertLiveChatMessageSchema = createInsertSchema(liveChatMessages);
export type InsertLiveChatMessage = z.infer<typeof insertLiveChatMessageSchema>;
export type LiveChatMessage = typeof liveChatMessages.$inferSelect;

// Relations for live chat
export const liveChatConversationsRelations = relations(liveChatConversations, ({ one, many }) => ({
  assignedTo: one(users, { fields: [liveChatConversations.assignedToId], references: [users.id] }),
  messages: many(liveChatMessages),
}));

export const liveChatMessagesRelations = relations(liveChatMessages, ({ one }) => ({
  conversation: one(liveChatConversations, {
    fields: [liveChatMessages.conversationId],
    references: [liveChatConversations.id],
  }),
}));

// ============================================================================
// SURVEY BUILDER SYSTEM
// ============================================================================

// Surveys table
export const surveys = pgTable(
  "surveys",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  table => [
    index("idx_surveys_status").on(table.status),
    index("idx_surveys_slug").on(table.slug),
    index("idx_surveys_author").on(table.authorId),
  ]
);

export const insertSurveySchema = createInsertSchema(surveys);
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type Survey = typeof surveys.$inferSelect;

// Survey responses table
export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    surveyId: varchar("survey_id")
      .notNull()
      .references(() => surveys.id, { onDelete: "cascade" }),
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
  },
  table => [
    index("idx_survey_responses_survey").on(table.surveyId),
    index("idx_survey_responses_respondent").on(table.respondentId),
    index("idx_survey_responses_created").on(table.createdAt),
  ]
);

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses);
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type SurveyResponse = typeof surveyResponses.$inferSelect;

// Relations for surveys
export const surveysRelations = relations(surveys, ({ one, many }) => ({
  author: one(users, { fields: [surveys.authorId], references: [users.id] }),
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(surveys, { fields: [surveyResponses.surveyId], references: [surveys.id] }),
}));
