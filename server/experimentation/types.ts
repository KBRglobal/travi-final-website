/**
 * Experimentation / A-B Test Engine - Type Definitions
 * Feature Flag: ENABLE_EXPERIMENTS=true
 */

// ============================================================================
// Experiment Types
// ============================================================================

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived';

export type MetricType = 'conversion' | 'click' | 'engagement' | 'revenue' | 'custom';

export type VariantWeight = number; // 0-100, represents percentage

export interface ExperimentVariant {
  id: string;
  name: string;
  description?: string;
  weight: VariantWeight;
  isControl: boolean;
  config: Record<string, unknown>;
}

export interface ExperimentMetric {
  id: string;
  name: string;
  type: MetricType;
  eventName: string;
  aggregation: 'sum' | 'count' | 'average' | 'min' | 'max';
  isPrimary: boolean;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  metrics: ExperimentMetric[];
  targetAudience?: AudienceFilter;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ============================================================================
// Audience Targeting
// ============================================================================

export type AudienceFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than';

export interface AudienceFilterCondition {
  attribute: string;
  operator: AudienceFilterOperator;
  value: string | number | string[] | number[];
}

export interface AudienceFilter {
  conditions: AudienceFilterCondition[];
  matchType: 'all' | 'any';
}

// ============================================================================
// Assignment
// ============================================================================

export interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  userId: string;
  assignedAt: Date;
  context?: Record<string, unknown>;
}

export interface AssignmentContext {
  userId: string;
  sessionId?: string;
  attributes?: Record<string, string | number | boolean>;
}

// ============================================================================
// Metrics & Results
// ============================================================================

export interface MetricEvent {
  experimentId: string;
  variantId: string;
  userId: string;
  metricId: string;
  value: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface VariantMetricResult {
  variantId: string;
  variantName: string;
  sampleSize: number;
  conversions: number;
  conversionRate: number;
  totalValue: number;
  averageValue: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
}

export interface ExperimentResults {
  experimentId: string;
  experimentName: string;
  status: ExperimentStatus;
  startDate?: Date;
  endDate?: Date;
  totalParticipants: number;
  metrics: Array<{
    metricId: string;
    metricName: string;
    metricType: MetricType;
    isPrimary: boolean;
    variants: VariantMetricResult[];
    winner?: string;
    statisticalSignificance?: number;
  }>;
  analyzedAt: Date;
}

// ============================================================================
// Engine Status
// ============================================================================

export interface ExperimentationStatus {
  enabled: boolean;
  activeExperiments: number;
  totalAssignments: number;
  totalEvents: number;
  config: {
    maxActiveExperiments: number;
    defaultSampleSize: number;
    significanceThreshold: number;
  };
}
