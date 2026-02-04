/**
 * AI Cost Tracking and Governance Schema
 *
 * This module contains tables for:
 * - AI cost tracking and forecasting
 * - Content decay and repair tracking
 * - Search analytics (zero results)
 * - Content confidence scoring
 * - AI audit logging
 * - Content lifecycle timeline
 * - Growth recommendations
 * - Enterprise governance (roles, permissions, policies)
 * - Autonomy budgets and decision logging
 * - Change management system (PCMS V2)
 * - Approval workflows
 */

import { sql, relations } from "drizzle-orm";
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
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  contentRepairStatusEnum,
  governanceRoleEnum,
  changePlanStatusEnum,
  changePlanScopeEnum,
  changeItemTypeEnum,
  changeExecutionKindEnum,
  changeExecutionStatusEnum,
  budgetPeriodEnum,
  policyDecisionEnum,
  helpArticleStatusEnum,
} from "./enums";
import { ContentBlock } from "./types";

// =====================================================
// FORWARD REFERENCES (for circular dependencies)
// These are placeholders for tables defined in main schema.ts
// In production, import these from the main schema
// =====================================================

// Placeholder type for users table reference
declare const users: {
  id: ReturnType<typeof varchar>;
};

// Placeholder type for contents table reference
declare const contents: {
  id: ReturnType<typeof varchar>;
};

// Placeholder for helpCategories table (defined in help-webhooks.ts)
// This allows helpArticles to reference helpCategories without circular imports
declare const _helpCategories: {
  id: any;
};
const helpCategories = _helpCategories;

// =====================================================
// AI COST TRACKING (for forecasting)
// =====================================================

export const aiCostRecords = pgTable(
  "ai_cost_records",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    subsystem: varchar("subsystem", { length: 50 }).notNull(),
    model: varchar("model", { length: 100 }),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    contentId: varchar("content_id"),
    jobId: varchar("job_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_ai_cost_subsystem").on(table.subsystem),
    index("IDX_ai_cost_created").on(table.createdAt),
  ]
);

export const insertAiCostRecordSchema = createInsertSchema(aiCostRecords);
export type AiCostRecord = typeof aiCostRecords.$inferSelect;
export type InsertAiCostRecord = z.infer<typeof insertAiCostRecordSchema>;

// =====================================================
// CONTENT DECAY TRACKING
// =====================================================

export const contentDecayScores = pgTable(
  "content_decay_scores",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull(),
    // In production: .references(() => contents.id, { onDelete: "cascade" }),
    decayScore: integer("decay_score").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("stable"),
    trafficDelta: integer("traffic_delta"),
    impressionsDelta: integer("impressions_delta"),
    freshnessScore: integer("freshness_score"),
    iceScoreDelta: integer("ice_score_delta"),
    calculatedAt: timestamp("calculated_at").defaultNow(),
  },
  table => [
    index("IDX_decay_content").on(table.contentId),
    index("IDX_decay_status").on(table.status),
    index("IDX_decay_score").on(table.decayScore),
  ]
);

export const insertContentDecayScoreSchema = createInsertSchema(contentDecayScores);
export type ContentDecayScore = typeof contentDecayScores.$inferSelect;
export type InsertContentDecayScore = z.infer<typeof insertContentDecayScoreSchema>;

// =====================================================
// CONTENT REPAIR JOBS
// =====================================================

export const contentRepairJobs = pgTable(
  "content_repair_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull(),
    // In production: .references(() => contents.id, { onDelete: "cascade" }),
    repairType: varchar("repair_type", { length: 50 }).notNull(),
    status: contentRepairStatusEnum("status").notNull().default("pending"),
    isDryRun: boolean("is_dry_run").notNull().default(true),
    simulationResult: jsonb("simulation_result"),
    executionResult: jsonb("execution_result"),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  table => [
    index("IDX_repair_content").on(table.contentId),
    index("IDX_repair_status").on(table.status),
  ]
);

export const insertContentRepairJobSchema = createInsertSchema(contentRepairJobs);
export type ContentRepairJob = typeof contentRepairJobs.$inferSelect;
export type InsertContentRepairJob = z.infer<typeof insertContentRepairJobSchema>;

// =====================================================
// SEARCH ZERO RESULTS TRACKING
// =====================================================

export const searchZeroResults = pgTable(
  "search_zero_results",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    query: text("query").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    clusterId: varchar("cluster_id"),
    count: integer("count").notNull().default(1),
    intent: varchar("intent", { length: 50 }),
    lastSeenAt: timestamp("last_seen_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_zero_cluster").on(table.clusterId),
    index("IDX_zero_count").on(table.count),
    uniqueIndex("IDX_zero_normalized").on(table.normalizedQuery),
  ]
);

export const insertSearchZeroResultSchema = createInsertSchema(searchZeroResults);
export type SearchZeroResult = typeof searchZeroResults.$inferSelect;
export type InsertSearchZeroResult = z.infer<typeof insertSearchZeroResultSchema>;

// =====================================================
// CONTENT CONFIDENCE SCORES
// =====================================================

export const contentConfidenceScores = pgTable(
  "content_confidence_scores",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull(),
    // In production: .references(() => contents.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(50),
    label: varchar("label", { length: 20 }).notNull().default("medium"),
    entityVerificationScore: integer("entity_verification_score"),
    factConsistencyScore: integer("fact_consistency_score"),
    sourceFreshnessScore: integer("source_freshness_score"),
    hallucinationRiskScore: integer("hallucination_risk_score"),
    calculatedAt: timestamp("calculated_at").defaultNow(),
  },
  table => [
    index("IDX_confidence_content").on(table.contentId),
    index("IDX_confidence_label").on(table.label),
  ]
);

export const insertContentConfidenceScoreSchema = createInsertSchema(contentConfidenceScores);
export type ContentConfidenceScore = typeof contentConfidenceScores.$inferSelect;
export type InsertContentConfidenceScore = z.infer<typeof insertContentConfidenceScoreSchema>;

// =====================================================
// AI OUTPUT AUDIT LOG
// =====================================================

export const aiAuditLogs = pgTable(
  "ai_audit_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  table => [
    index("IDX_ai_audit_content").on(table.contentId),
    index("IDX_ai_audit_subsystem").on(table.subsystem),
    index("IDX_ai_audit_created").on(table.createdAt),
    index("IDX_ai_audit_expires").on(table.expiresAt),
  ]
);

export const insertAiAuditLogSchema = createInsertSchema(aiAuditLogs);
export type AiAuditLog = typeof aiAuditLogs.$inferSelect;
export type InsertAiAuditLog = z.infer<typeof insertAiAuditLogSchema>;

// =====================================================
// CONTENT LIFECYCLE TIMELINE
// =====================================================

export const contentTimelineEvents = pgTable(
  "content_timeline_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    contentId: varchar("content_id").notNull(),
    // In production: .references(() => contents.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    eventData: jsonb("event_data"),
    actorId: varchar("actor_id"),
    actorType: varchar("actor_type", { length: 20 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_timeline_content").on(table.contentId),
    index("IDX_timeline_type").on(table.eventType),
    index("IDX_timeline_created").on(table.createdAt),
  ]
);

export const insertContentTimelineEventSchema = createInsertSchema(contentTimelineEvents);
export type ContentTimelineEvent = typeof contentTimelineEvents.$inferSelect;
export type InsertContentTimelineEvent = z.infer<typeof insertContentTimelineEventSchema>;

// =====================================================
// GROWTH RECOMMENDATIONS
// =====================================================

export const growthRecommendations = pgTable(
  "growth_recommendations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  table => [
    index("IDX_growth_rec_week").on(table.weekOf),
    index("IDX_growth_rec_priority").on(table.priority),
    index("IDX_growth_rec_status").on(table.status),
  ]
);

export const insertGrowthRecommendationSchema = createInsertSchema(growthRecommendations);
export type GrowthRecommendation = typeof growthRecommendations.$inferSelect;
export type InsertGrowthRecommendation = z.infer<typeof insertGrowthRecommendationSchema>;

// =====================================================
// ENTERPRISE GOVERNANCE PLATFORM
// =====================================================

// Governance Roles
export const governanceRoles = pgTable(
  "governance_roles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 50 }).notNull().unique(),
    displayName: varchar("display_name", { length: 100 }).notNull(),
    description: text("description"),
    priority: integer("priority").notNull().default(0),
    isSystem: boolean("is_system").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_gov_roles_name").on(table.name),
    index("IDX_gov_roles_priority").on(table.priority),
    index("IDX_gov_roles_active").on(table.isActive),
  ]
);

export const insertGovernanceRoleSchema = createInsertSchema(governanceRoles);
export type GovernanceRole = typeof governanceRoles.$inferSelect;
export type InsertGovernanceRole = z.infer<typeof insertGovernanceRoleSchema>;

// ============================================================================
// PRODUCTION CHANGE MANAGEMENT SYSTEM (PCMS) V2
// ============================================================================

// Change Plans - main table for change proposals
export const changePlans = pgTable(
  "change_plans",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  table => [
    index("IDX_change_plans_status").on(table.status),
    index("IDX_change_plans_created_by").on(table.createdByUserId),
    index("IDX_change_plans_created_at").on(table.createdAt),
    uniqueIndex("IDX_change_plans_idempotency").on(table.idempotencyKey),
  ]
);

export const insertChangePlanSchema = createInsertSchema(changePlans);
export type ChangePlan = typeof changePlans.$inferSelect;
export type InsertChangePlan = z.infer<typeof insertChangePlanSchema>;

// =====================================================
// HELP CENTER SUPPORT TABLES
// =====================================================

// Help Articles - individual help content
// Note: helpCategories is defined in help-webhooks.ts
export const helpArticles = pgTable(
  "help_articles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    categoryId: varchar("category_id")
      .notNull()
      .references(() => helpCategories.id, { onDelete: "cascade" }),
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
    authorId: varchar("author_id"),
    // In production: .references(() => users.id),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_help_articles_category").on(table.categoryId),
    index("IDX_help_articles_status").on(table.status),
    index("IDX_help_articles_locale").on(table.locale),
    index("IDX_help_articles_order").on(table.order),
    uniqueIndex("IDX_help_articles_slug_locale").on(table.slug, table.locale),
  ]
);

export const insertHelpArticleSchema = createInsertSchema(helpArticles);
export type HelpArticle = typeof helpArticles.$inferSelect;
export type InsertHelpArticle = z.infer<typeof insertHelpArticleSchema>;

// Note: helpCategoriesRelations is defined in help-webhooks.ts where helpCategories is actually defined

export const helpArticlesRelations = relations(helpArticles, ({ one }) => ({
  category: one(helpCategories as any, {
    fields: [helpArticles.categoryId],
    references: [(helpCategories as any).id],
  }),
}));

// ============================================
// AUTONOMY POLICY & RISK BUDGETS SYSTEM
// ============================================

// Autonomy budget counters - tracks resource usage per target
export const autonomyBudgets = pgTable(
  "autonomy_budgets",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  table => [
    index("IDX_autonomy_budgets_target").on(table.targetKey),
    index("IDX_autonomy_budgets_period").on(table.period),
    index("IDX_autonomy_budgets_period_start").on(table.periodStart),
    uniqueIndex("IDX_autonomy_budgets_unique").on(table.targetKey, table.period, table.periodStart),
  ]
);

export const insertAutonomyBudgetSchema = createInsertSchema(autonomyBudgets);
export type AutonomyBudget = typeof autonomyBudgets.$inferSelect;
export type InsertAutonomyBudget = z.infer<typeof insertAutonomyBudgetSchema>;

// Autonomy decision logs - records policy decisions for auditing
export const autonomyDecisionLogs = pgTable(
  "autonomy_decision_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    targetKey: varchar("target_key").notNull(),
    actionType: varchar("action_type").notNull(),
    decision: policyDecisionEnum("decision").notNull(),
    reasons: jsonb("reasons")
      .$type<Array<{ code: string; message: string; severity: string }>>()
      .notNull()
      .default([]),
    matchedPolicyId: varchar("matched_policy_id"),
    requesterId: varchar("requester_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  table => [
    index("IDX_autonomy_decisions_target").on(table.targetKey),
    index("IDX_autonomy_decisions_action").on(table.actionType),
    index("IDX_autonomy_decisions_decision").on(table.decision),
    index("IDX_autonomy_decisions_created").on(table.createdAt),
  ]
);

export const insertAutonomyDecisionLogSchema = createInsertSchema(autonomyDecisionLogs);
export type AutonomyDecisionLog = typeof autonomyDecisionLogs.$inferSelect;
export type InsertAutonomyDecisionLog = z.infer<typeof insertAutonomyDecisionLogSchema>;

// Stored policies - persisted policy configurations
export const autonomyPolicies = pgTable(
  "autonomy_policies",
  {
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
  },
  table => [
    index("IDX_autonomy_policies_target").on(table.targetType),
    index("IDX_autonomy_policies_enabled").on(table.enabled),
    index("IDX_autonomy_policies_priority").on(table.priority),
  ]
);

export const insertAutonomyPolicySchema = createInsertSchema(autonomyPolicies);
export type AutonomyPolicy = typeof autonomyPolicies.$inferSelect;
export type InsertAutonomyPolicy = z.infer<typeof insertAutonomyPolicySchema>;

// Governance Permissions
export const governancePermissions = pgTable(
  "governance_permissions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roleId: varchar("role_id")
      .notNull()
      .references(() => governanceRoles.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 50 }).notNull(),
    resource: varchar("resource", { length: 50 }).notNull(),
    scope: varchar("scope", { length: 50 }).notNull().default("global"),
    scopeValue: varchar("scope_value", { length: 255 }),
    isAllowed: boolean("is_allowed").notNull().default(true),
    conditions: jsonb("conditions").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_gov_perms_role").on(table.roleId),
    index("IDX_gov_perms_action").on(table.action, table.resource),
    uniqueIndex("IDX_gov_perms_unique").on(
      table.roleId,
      table.action,
      table.resource,
      table.scope,
      table.scopeValue
    ),
  ]
);

export const insertGovernancePermissionSchema = createInsertSchema(governancePermissions);
export type GovernancePermission = typeof governancePermissions.$inferSelect;
export type InsertGovernancePermission = z.infer<typeof insertGovernancePermissionSchema>;

// User Role Assignments
export const userRoleAssignments = pgTable(
  "user_role_assignments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    // In production: .references(() => users.id, { onDelete: "cascade" }),
    roleId: varchar("role_id")
      .notNull()
      .references(() => governanceRoles.id, { onDelete: "cascade" }),
    scope: varchar("scope", { length: 50 }).notNull().default("global"),
    scopeValue: varchar("scope_value", { length: 255 }),
    grantedBy: varchar("granted_by"),
    // In production: .references(() => users.id),
    grantedAt: timestamp("granted_at").defaultNow(),
    expiresAt: timestamp("expires_at"),
    isActive: boolean("is_active").notNull().default(true),
  },
  table => [
    index("IDX_user_role_user").on(table.userId),
    index("IDX_user_role_role").on(table.roleId),
    uniqueIndex("IDX_user_role_unique").on(
      table.userId,
      table.roleId,
      table.scope,
      table.scopeValue
    ),
  ]
);

export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments);
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;

// Governance Policies
export const governancePolicies = pgTable(
  "governance_policies",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
    createdBy: varchar("created_by"),
    // In production: .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_gov_policies_type").on(table.policyType),
    index("IDX_gov_policies_active").on(table.isActive),
    index("IDX_gov_policies_priority").on(table.priority),
  ]
);

export const insertGovernancePolicySchema = createInsertSchema(governancePolicies);
export type GovernancePolicy = typeof governancePolicies.$inferSelect;
export type InsertGovernancePolicy = z.infer<typeof insertGovernancePolicySchema>;

// Governance Audit Logs (immutable)
export const governanceAuditLogs = pgTable(
  "governance_audit_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id"),
    // In production: .references(() => users.id),
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
  },
  table => [
    index("IDX_gov_audit_user").on(table.userId),
    index("IDX_gov_audit_action").on(table.action),
    index("IDX_gov_audit_resource").on(table.resource, table.resourceId),
    index("IDX_gov_audit_created").on(table.createdAt),
    index("IDX_gov_audit_source").on(table.source),
  ]
);

export const insertGovernanceAuditLogSchema = createInsertSchema(governanceAuditLogs);
export type GovernanceAuditLog = typeof governanceAuditLogs.$inferSelect;
export type InsertGovernanceAuditLog = z.infer<typeof insertGovernanceAuditLogSchema>;

// Approval Requests
export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requestType: varchar("request_type", { length: 50 }).notNull(),
    resourceType: varchar("resource_type", { length: 50 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }).notNull(),
    requesterId: varchar("requester_id").notNull(),
    // In production: .references(() => users.id),
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
  },
  table => [
    index("IDX_approval_req_resource").on(table.resourceType, table.resourceId),
    index("IDX_approval_req_requester").on(table.requesterId),
    index("IDX_approval_req_status").on(table.status),
    index("IDX_approval_req_created").on(table.createdAt),
  ]
);

export const insertApprovalRequestSchema = createInsertSchema(approvalRequests);
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;

// Approval Steps
export const approvalSteps = pgTable(
  "approval_steps",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requestId: varchar("request_id")
      .notNull()
      .references(() => approvalRequests.id, { onDelete: "cascade" }),
    stepNumber: integer("step_number").notNull(),
    approverType: varchar("approver_type", { length: 20 }).notNull(),
    approverId: varchar("approver_id"),
    approverRole: varchar("approver_role", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    decision: varchar("decision", { length: 20 }),
    decisionReason: text("decision_reason"),
    decidedBy: varchar("decided_by"),
    // In production: .references(() => users.id),
    decidedAt: timestamp("decided_at"),
    autoApproveAt: timestamp("auto_approve_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_approval_steps_request").on(table.requestId),
    index("IDX_approval_steps_approver").on(table.approverType, table.approverId),
    index("IDX_approval_steps_status").on(table.status),
  ]
);

export const insertApprovalStepSchema = createInsertSchema(approvalSteps);
export type ApprovalStep = typeof approvalSteps.$inferSelect;
export type InsertApprovalStep = z.infer<typeof insertApprovalStepSchema>;

// Policy Evaluations (for analytics)
export const policyEvaluations = pgTable(
  "policy_evaluations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    policyId: varchar("policy_id").references(() => governancePolicies.id),
    policyName: varchar("policy_name", { length: 100 }).notNull(),
    userId: varchar("user_id"),
    // In production: .references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    resource: varchar("resource", { length: 100 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }),
    result: varchar("result", { length: 20 }).notNull(),
    reason: text("reason"),
    evaluatedAt: timestamp("evaluated_at").defaultNow(),
  },
  table => [
    index("IDX_policy_eval_policy").on(table.policyId),
    index("IDX_policy_eval_user").on(table.userId),
    index("IDX_policy_eval_result").on(table.result),
    index("IDX_policy_eval_time").on(table.evaluatedAt),
  ]
);

export const insertPolicyEvaluationSchema = createInsertSchema(policyEvaluations);
export type PolicyEvaluation = typeof policyEvaluations.$inferSelect;
export type InsertPolicyEvaluation = z.infer<typeof insertPolicyEvaluationSchema>;

// Change Plan Items - individual changes within a plan
export const changePlanItems = pgTable(
  "change_plan_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    planId: varchar("plan_id")
      .notNull()
      .references(() => changePlans.id, { onDelete: "cascade" }),
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
  },
  table => [
    index("IDX_change_plan_items_plan").on(table.planId),
    index("IDX_change_plan_items_target").on(table.targetType, table.targetId),
    index("IDX_change_plan_items_status").on(table.status),
  ]
);

export const insertChangePlanItemSchema = createInsertSchema(changePlanItems);
export type ChangePlanItem = typeof changePlanItems.$inferSelect;
export type InsertChangePlanItem = z.infer<typeof insertChangePlanItemSchema>;

// Change Executions - tracks each run (dry-run, apply, rollback)
export const changeExecutions = pgTable(
  "change_executions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    planId: varchar("plan_id")
      .notNull()
      .references(() => changePlans.id, { onDelete: "cascade" }),
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
  },
  table => [
    index("IDX_change_executions_plan").on(table.planId),
    index("IDX_change_executions_status").on(table.status),
    index("IDX_change_executions_kind").on(table.kind),
    uniqueIndex("IDX_change_executions_idempotency").on(table.idempotencyKey),
  ]
);

export const insertChangeExecutionSchema = createInsertSchema(changeExecutions);
export type ChangeExecution = typeof changeExecutions.$inferSelect;
export type InsertChangeExecution = z.infer<typeof insertChangeExecutionSchema>;

// Change Execution Logs - detailed logs for each execution
export const changeExecutionLogs = pgTable(
  "change_execution_logs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    executionId: varchar("execution_id")
      .notNull()
      .references(() => changeExecutions.id, { onDelete: "cascade" }),
    level: varchar("level", { length: 20 }).notNull().default("info"),
    message: text("message").notNull(),
    data: jsonb("data"),
    itemId: varchar("item_id"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_change_execution_logs_execution").on(table.executionId),
    index("IDX_change_execution_logs_level").on(table.level),
    index("IDX_change_execution_logs_created").on(table.createdAt),
  ]
);

export const insertChangeExecutionLogSchema = createInsertSchema(changeExecutionLogs);
export type ChangeExecutionLog = typeof changeExecutionLogs.$inferSelect;
export type InsertChangeExecutionLog = z.infer<typeof insertChangeExecutionLogSchema>;

// Change Execution Results - summary and diff storage
export const changeExecutionResults = pgTable(
  "change_execution_results",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    executionId: varchar("execution_id")
      .notNull()
      .references(() => changeExecutions.id, { onDelete: "cascade" }),
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
  },
  table => [index("IDX_change_execution_results_execution").on(table.executionId)]
);

export const insertChangeExecutionResultSchema = createInsertSchema(changeExecutionResults);
export type ChangeExecutionResult = typeof changeExecutionResults.$inferSelect;
export type InsertChangeExecutionResult = z.infer<typeof insertChangeExecutionResultSchema>;

// Change Locks - prevent concurrent mutations
export const changeLocks = pgTable(
  "change_locks",
  {
    targetKey: varchar("target_key", { length: 255 }).primaryKey(),
    executionId: varchar("execution_id")
      .notNull()
      .references(() => changeExecutions.id, { onDelete: "cascade" }),
    lockedUntil: timestamp("locked_until").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_change_locks_execution").on(table.executionId),
    index("IDX_change_locks_until").on(table.lockedUntil),
  ]
);

export const insertChangeLockSchema = createInsertSchema(changeLocks);
export type ChangeLock = typeof changeLocks.$inferSelect;
export type InsertChangeLock = z.infer<typeof insertChangeLockSchema>;
