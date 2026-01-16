/**
 * Autonomous Growth Tasks - Types
 * Self-generating tasks to grow traffic and revenue
 */

export interface GrowthTask {
  id: string;
  type: GrowthTaskType;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  detectedBy: DetectorType;
  targetEntity?: string;
  targetContentId?: string;
  estimatedImpact: ImpactEstimate;
  metadata: Record<string, unknown>;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  assignedTo: string | null;
  result: TaskResult | null;
}

export type GrowthTaskType =
  | 'create_content'
  | 'enrich_entity'
  | 'add_internal_links'
  | 'improve_aeo'
  | 'update_stale_content'
  | 'optimize_conversion'
  | 'fill_content_gap'
  | 'rescue_orphan';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export type DetectorType =
  | 'missing_content'
  | 'entity_without_aeo'
  | 'high_value_no_links'
  | 'zero_result_queries'
  | 'orphan_content'
  | 'stale_content'
  | 'low_conversion'
  | 'content_gap';

export interface ImpactEstimate {
  trafficPotential: 'high' | 'medium' | 'low';
  revenuePotential: 'high' | 'medium' | 'low';
  effortLevel: 'high' | 'medium' | 'low';
  confidenceScore: number;
}

export interface TaskResult {
  success: boolean;
  message: string;
  outputs?: Record<string, unknown>;
  metrics?: TaskMetrics;
}

export interface TaskMetrics {
  beforeState: Record<string, number>;
  afterState: Record<string, number>;
  improvement: number;
}

export interface Detection {
  type: DetectorType;
  confidence: number;
  data: Record<string, unknown>;
  suggestedTask: GrowthTaskType;
  detectedAt: Date;
}

export interface GrowthTaskConfig {
  enabled: boolean;
  autoExecute: boolean;
  maxPendingTasks: number;
  maxTasksPerHour: number;
  priorityThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  detectorIntervalMinutes: number;
  enabledDetectors: DetectorType[];
}

export const DEFAULT_GROWTH_CONFIG: GrowthTaskConfig = {
  enabled: true,
  autoExecute: false,
  maxPendingTasks: 100,
  maxTasksPerHour: 10,
  priorityThresholds: {
    critical: 90,
    high: 70,
    medium: 50,
  },
  detectorIntervalMinutes: 60,
  enabledDetectors: [
    'missing_content',
    'entity_without_aeo',
    'high_value_no_links',
    'zero_result_queries',
    'orphan_content',
    'stale_content',
    'low_conversion',
    'content_gap',
  ],
};

export interface GrowthMetrics {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  tasksCompletedToday: number;
  estimatedTrafficGain: number;
  estimatedRevenueGain: number;
  topOpportunities: GrowthTask[];
}
