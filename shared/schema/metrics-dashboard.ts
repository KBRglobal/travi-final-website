import { sql } from "drizzle-orm";
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
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  metricSnapshotsStatusEnum,
  opportunityCategoryEnum,
  opportunityStatusEnum,
  anomalySeverityEnum,
  anomalyTypeEnum,
} from "./enums";

// Forward reference placeholder for users table (circular dependency)
// This will be replaced with the actual reference when imported
declare const _users: { id: any };
const users = _users;

// ============================================================================
// METRIC SNAPSHOTS - Historical point-in-time captures
// ============================================================================

export const metricSnapshots = pgTable(
  "metric_snapshots",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    snapshotType: varchar("snapshot_type").notNull(), // point, aggregated, comparative
    granularity: varchar("granularity").notNull(), // realtime, minute, hour, day, week, month
    periodStart: timestamp("period_start"),
    periodEnd: timestamp("period_end"),
    status: metricSnapshotsStatusEnum("status").notNull().default("completed"),
    description: text("description"),
    tags: jsonb("tags").$type<string[]>().default([]),
    metrics: jsonb("metrics")
      .$type<
        Array<{
          metricId: string;
          entityType: string;
          entityId?: string;
          value: number;
          previousValue?: number;
          trend: "up" | "down" | "stable";
          changePercent?: number;
          status: "good" | "warning" | "critical" | "neutral";
          stats?: {
            min: number;
            max: number;
            avg: number;
            sum: number;
            count: number;
          };
        }>
      >()
      .default([]),
    createdBy: varchar("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_metric_snapshots_type").on(table.snapshotType),
    index("IDX_metric_snapshots_granularity").on(table.granularity),
    index("IDX_metric_snapshots_created").on(table.createdAt),
    index("IDX_metric_snapshots_period").on(table.periodStart, table.periodEnd),
  ]
);

export const insertMetricSnapshotSchema = createInsertSchema(metricSnapshots);
export type InsertMetricSnapshot = z.infer<typeof insertMetricSnapshotSchema>;
export type MetricSnapshot = typeof metricSnapshots.$inferSelect;

// ============================================================================
// GROWTH OPPORTUNITIES - AI-detected improvement opportunities
// ============================================================================

export const growthOpportunities = pgTable(
  "growth_opportunities",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
    affectedEntities: jsonb("affected_entities")
      .$type<
        Array<{
          type: string;
          id?: string;
          name?: string;
        }>
      >()
      .default([]),
    relatedMetrics: jsonb("related_metrics").$type<string[]>().default([]),
    score: integer("score").notNull().default(0), // 0-100 priority score
    expiresAt: timestamp("expires_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_growth_opportunities_category").on(table.category),
    index("IDX_growth_opportunities_status").on(table.status),
    index("IDX_growth_opportunities_priority").on(table.priority),
    index("IDX_growth_opportunities_score").on(table.score),
    index("IDX_growth_opportunities_created").on(table.createdAt),
  ]
);

export const insertGrowthOpportunitySchema = createInsertSchema(growthOpportunities);
export type InsertGrowthOpportunity = z.infer<typeof insertGrowthOpportunitySchema>;
export type GrowthOpportunity = typeof growthOpportunities.$inferSelect;

// ============================================================================
// DETECTED ANOMALIES - Statistical anomalies in metrics
// ============================================================================

export const detectedAnomalies = pgTable(
  "detected_anomalies",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
  },
  table => [
    index("IDX_detected_anomalies_metric").on(table.metricId),
    index("IDX_detected_anomalies_severity").on(table.severity),
    index("IDX_detected_anomalies_type").on(table.anomalyType),
    index("IDX_detected_anomalies_detected").on(table.detectedAt),
    index("IDX_detected_anomalies_entity").on(table.entityType, table.entityId),
  ]
);

export const insertDetectedAnomalySchema = createInsertSchema(detectedAnomalies);
export type InsertDetectedAnomaly = z.infer<typeof insertDetectedAnomalySchema>;
export type DetectedAnomaly = typeof detectedAnomalies.$inferSelect;

// ============================================================================
// RECOMMENDATION EXPLANATIONS - Explainability for AI recommendations
// ============================================================================

export const recommendationExplanations = pgTable(
  "recommendation_explanations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceType: varchar("source_type").notNull(), // performance, funnel, opportunity, anomaly
    sourceId: varchar("source_id").notNull(),
    entityType: varchar("entity_type").notNull(),
    entityId: varchar("entity_id"),
    title: varchar("title").notNull(),
    summary: text("summary").notNull(),
    primaryReason: text("primary_reason").notNull(),
    supportingReasons: jsonb("supporting_reasons").$type<string[]>().default([]),
    dataEvidence: jsonb("data_evidence")
      .$type<
        Array<{
          metric: string;
          metricName: string;
          value: number;
          benchmark?: number;
          comparison: string;
          significance: string;
          explanation: string;
        }>
      >()
      .default([]),
    confidence: integer("confidence").notNull(), // 0-100
    confidenceFactors: jsonb("confidence_factors")
      .$type<
        Array<{
          factor: string;
          impact: "increases" | "decreases";
          weight: number;
        }>
      >()
      .default([]),
    methodology: text("methodology"),
    limitations: jsonb("limitations").$type<string[]>().default([]),
    assumptions: jsonb("assumptions").$type<string[]>().default([]),
    metricsAnalyzed: jsonb("metrics_analyzed").$type<string[]>().default([]),
    timeRangeStart: timestamp("time_range_start"),
    timeRangeEnd: timestamp("time_range_end"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => [
    index("IDX_explanations_source").on(table.sourceType, table.sourceId),
    index("IDX_explanations_entity").on(table.entityType, table.entityId),
    index("IDX_explanations_created").on(table.createdAt),
  ]
);

export const insertRecommendationExplanationSchema = createInsertSchema(recommendationExplanations);
export type InsertRecommendationExplanation = z.infer<typeof insertRecommendationExplanationSchema>;
export type RecommendationExplanation = typeof recommendationExplanations.$inferSelect;

// ============================================================================
// METRIC TIME SERIES - Granular metric data over time
// ============================================================================

export const metricTimeSeries = pgTable(
  "metric_time_series",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    metricId: varchar("metric_id").notNull(),
    entityType: varchar("entity_type").notNull(),
    entityId: varchar("entity_id"),
    granularity: varchar("granularity").notNull(), // minute, hour, day
    value: integer("value").notNull(), // Stored as value * 100 for precision
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    timestamp: timestamp("timestamp").notNull(),
  },
  table => [
    index("IDX_metric_ts_metric").on(table.metricId),
    index("IDX_metric_ts_entity").on(table.entityType, table.entityId),
    index("IDX_metric_ts_timestamp").on(table.timestamp),
    index("IDX_metric_ts_metric_time").on(table.metricId, table.timestamp),
    index("IDX_metric_ts_granularity").on(table.granularity),
  ]
);

export type MetricTimeSeries = typeof metricTimeSeries.$inferSelect;
export type InsertMetricTimeSeries = typeof metricTimeSeries.$inferInsert;

// ============================================================================
// DASHBOARD CONFIGURATIONS - Custom user dashboard settings
// ============================================================================

export const dashboardConfigurations = pgTable(
  "dashboard_configurations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role").notNull(), // pm, seo, ops, custom
    name: varchar("name").notNull(),
    description: text("description"),
    isDefault: boolean("is_default").default(false),
    widgets: jsonb("widgets")
      .$type<
        Array<{
          id: string;
          type: string;
          title: string;
          metricIds: string[];
          size: string;
          position: { row: number; col: number };
          config: Record<string, unknown>;
        }>
      >()
      .default([]),
    refreshInterval: integer("refresh_interval").default(300), // seconds
    defaultDateRange: varchar("default_date_range").default("7d"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  table => [
    index("IDX_dashboard_configs_user").on(table.userId),
    index("IDX_dashboard_configs_role").on(table.role),
  ]
);

export const insertDashboardConfigurationSchema = createInsertSchema(dashboardConfigurations);
export type InsertDashboardConfiguration = z.infer<typeof insertDashboardConfigurationSchema>;
export type DashboardConfiguration = typeof dashboardConfigurations.$inferSelect;
