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
import { workflowStatusEnum, activityTypeEnum, notificationTypeEnum } from "./enums";
import { users } from "./auth";
import { contents } from "./content-base";
import type { WorkflowStep } from "./types";

// ============================================================================
// ENTERPRISE FEATURES - Teams, Workflows, Notifications, etc.
// ============================================================================

// Teams / Departments
export const teams = pgTable(
  "teams",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    parentId: varchar("parent_id").references((): any => teams.id),
    color: varchar("color", { length: 7 }), // hex color
    icon: varchar("icon", { length: 50 }),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [index("IDX_teams_parent").on(table.parentId), index("IDX_teams_slug").on(table.slug)]
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    teamId: varchar("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 50 }).default("member"), // lead, member
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  table => [
    uniqueIndex("IDX_team_members_unique").on(table.teamId, table.userId),
    index("IDX_team_members_user").on(table.userId),
  ]
);

export const insertTeamSchema = createInsertSchema(teams);
export const insertTeamMemberSchema = createInsertSchema(teamMembers);
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Team = typeof teams.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;

// Content Workflows
export const workflowTemplates = pgTable("workflow_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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

export const workflowInstances = pgTable(
  "workflow_instances",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    templateId: varchar("template_id").references(() => workflowTemplates.id),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    status: workflowStatusEnum("status").default("pending"),
    currentStep: integer("current_step").default(0),
    submittedBy: varchar("submitted_by").references(() => users.id),
    submittedAt: timestamp("submitted_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  table => [
    index("IDX_workflow_instances_content").on(table.contentId),
    index("IDX_workflow_instances_status").on(table.status),
  ]
);

export const workflowApprovals = pgTable(
  "workflow_approvals",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    instanceId: varchar("instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    approverId: varchar("approver_id").references(() => users.id),
    status: workflowStatusEnum("status").default("pending"),
    comment: text("comment"),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_workflow_approvals_instance").on(table.instanceId),
    index("IDX_workflow_approvals_approver").on(table.approverId),
  ]
);

export const insertWorkflowTemplateSchema = createInsertSchema(workflowTemplates);
export const insertWorkflowInstanceSchema = createInsertSchema(workflowInstances);
export const insertWorkflowApprovalSchema = createInsertSchema(workflowApprovals);
export type InsertWorkflowTemplate = z.infer<typeof insertWorkflowTemplateSchema>;
export type InsertWorkflowInstance = z.infer<typeof insertWorkflowInstanceSchema>;
export type InsertWorkflowApproval = z.infer<typeof insertWorkflowApprovalSchema>;
export type WorkflowTemplate = typeof workflowTemplates.$inferSelect;
export type WorkflowInstance = typeof workflowInstances.$inferSelect;
export type WorkflowApproval = typeof workflowApprovals.$inferSelect;

// Activity Feed
export const activities = pgTable(
  "activities",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: activityTypeEnum("type").notNull(),
    actorId: varchar("actor_id").references(() => users.id),
    targetType: varchar("target_type", { length: 50 }), // content, user, team, etc.
    targetId: varchar("target_id"),
    targetTitle: text("target_title"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    teamId: varchar("team_id").references(() => teams.id), // for team-scoped activities
    isPublic: boolean("is_public").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_activities_actor").on(table.actorId),
    index("IDX_activities_target").on(table.targetType, table.targetId),
    index("IDX_activities_team").on(table.teamId),
    index("IDX_activities_created").on(table.createdAt),
  ]
);

export const insertActivitySchema = createInsertSchema(activities);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Content Locking
export const contentLocks = pgTable(
  "content_locks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lockedAt: timestamp("locked_at").defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    isActive: boolean("is_active").default(true),
  },
  table => [
    uniqueIndex("IDX_content_locks_active")
      .on(table.contentId)
      .where(sql`is_active = true`),
    index("IDX_content_locks_user").on(table.userId),
    index("IDX_content_locks_expires").on(table.expiresAt),
  ]
);

export const insertContentLockSchema = createInsertSchema(contentLocks);
export type InsertContentLock = z.infer<typeof insertContentLockSchema>;
export type ContentLock = typeof contentLocks.$inferSelect;

// Notifications
export const notifications = pgTable(
  "notifications",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").default("info"),
    title: text("title").notNull(),
    message: text("message"),
    link: text("link"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_notifications_user").on(table.userId),
    index("IDX_notifications_unread").on(table.userId, table.isRead),
    index("IDX_notifications_created").on(table.createdAt),
  ]
);

export const insertNotificationSchema = createInsertSchema(notifications);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Comments / Collaboration
export const comments = pgTable(
  "comments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id")
      .notNull()
      .references(() => contents.id, { onDelete: "cascade" }),
    parentId: varchar("parent_id").references((): any => comments.id, { onDelete: "cascade" }),
    authorId: varchar("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    mentions: jsonb("mentions").$type<string[]>().default([]), // user ids mentioned
    isResolved: boolean("is_resolved").default(false),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    editedAt: timestamp("edited_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_comments_content").on(table.contentId),
    index("IDX_comments_parent").on(table.parentId),
    index("IDX_comments_author").on(table.authorId),
  ]
);

export const insertCommentSchema = createInsertSchema(comments);
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
