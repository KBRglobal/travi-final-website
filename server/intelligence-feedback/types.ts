/**
 * System Intelligence Feedback Loop - Types
 * Learn from outcomes and adjust priorities
 */

export interface FeedbackEvent {
  id: string;
  type: FeedbackEventType;
  taskId: string;
  taskType: string;
  targetId: string;
  beforeMetrics: MetricSnapshot;
  afterMetrics: MetricSnapshot | null;
  outcome: TaskOutcome;
  improvement: number;
  createdAt: Date;
  measuredAt: Date | null;
}

export type FeedbackEventType =
  | 'task_completed'
  | 'task_failed'
  | 'task_skipped'
  | 'manual_adjustment';

export type TaskOutcome = 'success' | 'failure' | 'neutral' | 'pending';

export interface MetricSnapshot {
  timestamp: Date;
  healthScore?: number;
  revenueScore?: number;
  linkScore?: number;
  searchScore?: number;
  priorityScore?: number;
  custom?: Record<string, number>;
}

export interface WeightAdjustment {
  id: string;
  source: string;
  previousWeight: number;
  newWeight: number;
  reason: string;
  confidence: number;
  appliedAt: Date;
}

export interface ConfidenceScore {
  taskType: string;
  successRate: number;
  averageImprovement: number;
  sampleSize: number;
  confidence: number;
  lastUpdated: Date;
}

export interface FeedbackSummary {
  totalEvents: number;
  successfulTasks: number;
  failedTasks: number;
  averageImprovement: number;
  confidenceScores: ConfidenceScore[];
  weightAdjustments: WeightAdjustment[];
  generatedAt: Date;
}

export interface LearningModel {
  version: number;
  taskTypeWeights: Record<string, number>;
  signalWeights: Record<string, number>;
  confidenceThreshold: number;
  minSampleSize: number;
  lastTrainedAt: Date;
}

export interface FeedbackConfig {
  enabled: boolean;
  measurementDelayMinutes: number;
  minEventsForAdjustment: number;
  maxWeightAdjustment: number;
  confidenceThreshold: number;
  retentionDays: number;
}

export const DEFAULT_FEEDBACK_CONFIG: FeedbackConfig = {
  enabled: false,
  measurementDelayMinutes: 60,
  minEventsForAdjustment: 10,
  maxWeightAdjustment: 0.2,
  confidenceThreshold: 0.7,
  retentionDays: 30,
};

export const DEFAULT_LEARNING_MODEL: LearningModel = {
  version: 1,
  taskTypeWeights: {
    create_content: 1.0,
    enrich_entity: 1.0,
    add_internal_links: 1.0,
    improve_aeo: 1.0,
    update_stale_content: 1.0,
    optimize_conversion: 1.0,
    fill_content_gap: 1.0,
    rescue_orphan: 1.0,
  },
  signalWeights: {
    content_health: 0.25,
    revenue_intel: 0.30,
    link_graph: 0.15,
    search_intel: 0.20,
    recency: 0.10,
  },
  confidenceThreshold: 0.7,
  minSampleSize: 10,
  lastTrainedAt: new Date(),
};
