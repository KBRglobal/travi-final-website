/**
 * Unified Metrics Registry - Type Definitions
 *
 * Central type system for all metrics in the platform.
 * NO metric should be defined outside this registry.
 *
 * Feature flag: ENABLE_UNIFIED_METRICS=true
 */

export function isUnifiedMetricsEnabled(): boolean {
  return process.env.ENABLE_UNIFIED_METRICS === 'true';
}

// =====================================================
// METRIC CATEGORIES
// =====================================================

export type MetricCategory =
  | 'engagement'      // User interaction metrics
  | 'traffic'         // Visit and pageview metrics
  | 'conversion'      // Funnel and conversion metrics
  | 'content'         // Content quality metrics
  | 'seo'             // Search engine optimization metrics
  | 'aeo'             // Answer engine optimization metrics
  | 'revenue'         // Revenue and monetization metrics
  | 'cost'            // Operational cost metrics
  | 'health'          // System health metrics
  | 'growth';         // Growth loop metrics

// =====================================================
// METRIC TYPES
// =====================================================

export type MetricType =
  | 'counter'         // Cumulative count (only goes up)
  | 'gauge'           // Point-in-time value (can go up/down)
  | 'rate'            // Ratio or percentage
  | 'duration'        // Time-based metric (seconds/ms)
  | 'score'           // Normalized score (0-100)
  | 'currency';       // Monetary value (in cents)

// =====================================================
// AGGREGATION METHODS
// =====================================================

export type AggregationMethod =
  | 'sum'             // Total sum
  | 'avg'             // Average
  | 'min'             // Minimum value
  | 'max'             // Maximum value
  | 'count'           // Count of occurrences
  | 'rate'            // Rate calculation
  | 'percentile'      // Percentile (p50, p95, p99)
  | 'last';           // Most recent value

// =====================================================
// TIME GRANULARITY
// =====================================================

export type TimeGranularity =
  | 'realtime'        // Live, instant updates
  | 'minute'          // Per-minute aggregation
  | 'hour'            // Hourly aggregation
  | 'day'             // Daily aggregation
  | 'week'            // Weekly aggregation
  | 'month';          // Monthly aggregation

// =====================================================
// ENTITY TYPES (what we measure)
// =====================================================

export type MetricEntityType =
  | 'content'         // Individual content piece
  | 'destination'     // Destination/location
  | 'user'            // User/session
  | 'campaign'        // Marketing campaign
  | 'channel'         // Traffic channel
  | 'platform'        // External platform (AI, social)
  | 'system'          // System-wide
  | 'writer'          // AI writer
  | 'cluster';        // Content cluster

// =====================================================
// METRIC DEFINITION
// =====================================================

export interface MetricDefinition {
  id: string;                     // Unique identifier: category.name
  name: string;                   // Human-readable name
  description: string;            // What this metric measures
  category: MetricCategory;
  type: MetricType;
  unit: string;                   // e.g., 'count', 'seconds', '%', 'cents'
  aggregation: AggregationMethod;
  granularity: TimeGranularity[];
  entityTypes: MetricEntityType[];

  // Thresholds for alerting
  thresholds?: {
    warning?: number;
    critical?: number;
    direction: 'above' | 'below' | 'both';
  };

  // Display formatting
  format?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };

  // Dependencies
  dependsOn?: string[];           // Other metrics this one depends on

  // Calculation formula (for derived metrics)
  formula?: string;

  // Data source
  source: 'database' | 'realtime' | 'calculated' | 'external';

  // Visibility
  dashboards: ('pm' | 'seo' | 'ops' | 'all')[];

  // Freshness
  ttlSeconds?: number;            // Cache TTL
}

// =====================================================
// METRIC VALUE
// =====================================================

export interface MetricValue {
  metricId: string;
  value: number;
  entityType: MetricEntityType;
  entityId?: string;
  timestamp: Date;
  granularity: TimeGranularity;
  metadata?: Record<string, unknown>;
}

// =====================================================
// METRIC SNAPSHOT
// =====================================================

export interface MetricSnapshot {
  metricId: string;
  entityType: MetricEntityType;
  entityId?: string;
  timestamp: Date;

  // Current values
  current: number;
  previous?: number;              // Previous period value

  // Trend analysis
  trend: 'up' | 'down' | 'stable';
  changePercent?: number;
  changeAbsolute?: number;

  // Statistical context
  percentile?: number;            // Where this value falls in distribution
  average?: number;               // Average for this metric
  stdDev?: number;                // Standard deviation

  // Alert status
  alertLevel?: 'normal' | 'warning' | 'critical';
}

// =====================================================
// METRIC QUERY
// =====================================================

export interface MetricQuery {
  metricIds: string[];
  entityTypes?: MetricEntityType[];
  entityIds?: string[];
  startDate: Date;
  endDate: Date;
  granularity: TimeGranularity;
  aggregation?: AggregationMethod;
  limit?: number;
  offset?: number;
  includeMetadata?: boolean;
}

// =====================================================
// METRIC RESULT
// =====================================================

export interface MetricResult {
  metricId: string;
  definition: MetricDefinition;
  values: MetricValue[];
  summary: {
    total: number;
    average: number;
    min: number;
    max: number;
    count: number;
    trend: 'up' | 'down' | 'stable';
    changePercent?: number;
  };
  timeRange: {
    start: Date;
    end: Date;
    granularity: TimeGranularity;
  };
}

// =====================================================
// DASHBOARD CONFIGURATION
// =====================================================

export type DashboardRole = 'pm' | 'seo' | 'ops';

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'funnel' | 'heatmap' | 'alert';
  title: string;
  metricIds: string[];
  size: 'small' | 'medium' | 'large' | 'full';
  position: { row: number; col: number };
  config: Record<string, unknown>;
}

export interface DashboardConfig {
  id: string;
  role: DashboardRole;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  refreshInterval: number;        // Seconds
  defaultDateRange: 'today' | '7d' | '30d' | '90d';
}

// =====================================================
// SIGNAL FOR DECISIONS
// =====================================================

export interface MetricSignal {
  metricId: string;
  entityType: MetricEntityType;
  entityId?: string;
  signalType: 'anomaly' | 'threshold' | 'trend' | 'correlation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  currentValue: number;
  expectedValue?: number;
  deviation?: number;
  recommendation?: string;
  timestamp: Date;
  expiresAt?: Date;
}

// =====================================================
// ACTION RECOMMENDATION
// =====================================================

export type ActionType =
  | 'investigate'     // Look into this metric
  | 'optimize'        // Optimize content/system
  | 'alert'           // Alert team
  | 'automate'        // Trigger automation
  | 'report'          // Generate report
  | 'none';           // No action needed

export interface ActionRecommendation {
  id: string;
  signalId: string;
  actionType: ActionType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rationale: string;              // Why this action is recommended
  expectedImpact: string;
  estimatedEffort: 'quick' | 'moderate' | 'significant';
  automatable: boolean;
  suggestedSteps: string[];
  relatedMetrics: string[];
  createdAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
}

// =====================================================
// FUNNEL STAGE DEFINITION
// =====================================================

export interface FunnelStage {
  id: string;
  name: string;
  description: string;
  metricId: string;               // Metric that tracks this stage
  order: number;
  expectedConversionRate?: number;
  benchmarkValue?: number;
}

export interface FunnelDefinition {
  id: string;
  name: string;
  description: string;
  category: 'traffic' | 'content' | 'conversion' | 'engagement';
  stages: FunnelStage[];
  targetConversionRate?: number;
}

// =====================================================
// EXPLAINABILITY
// =====================================================

export interface ExplainabilityFactor {
  factorName: string;
  factorValue: number;
  contribution: number;           // % contribution to recommendation
  direction: 'positive' | 'negative';
  explanation: string;
}

export interface RecommendationExplanation {
  recommendationId: string;
  summary: string;
  confidence: number;             // 0-100
  factors: ExplainabilityFactor[];
  alternativeActions: ActionRecommendation[];
  dataPointsUsed: number;
  methodology: string;
  limitations: string[];
}
