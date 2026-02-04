/**
 * Real Autopilot Types
 * Type definitions for the 4-mode autopilot system
 */

// Autopilot modes
export type AutopilotMode = "off" | "monitor" | "semi_auto" | "full_auto";

// Task types
export type AutopilotTaskType =
  | "content_generation"
  | "quality_improvement"
  | "freshness_update"
  | "internal_linking"
  | "image_optimization"
  | "entity_extraction"
  | "content_explosion";

// Task status
export type AutopilotTaskStatus =
  | "pending"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "completed"
  | "failed"
  | "rejected"
  | "cancelled";

// Mode behavior matrix
export const MODE_BEHAVIORS: Record<
  AutopilotMode,
  {
    rssFetch: boolean;
    contentGeneration: boolean;
    autoPublish: boolean;
    requiresApproval: boolean;
  }
> = {
  off: {
    rssFetch: false,
    contentGeneration: false,
    autoPublish: false,
    requiresApproval: true,
  },
  monitor: {
    rssFetch: true,
    contentGeneration: false, // Queue only
    autoPublish: false,
    requiresApproval: true,
  },
  semi_auto: {
    rssFetch: true,
    contentGeneration: true,
    autoPublish: false, // After approval
    requiresApproval: true,
  },
  full_auto: {
    rssFetch: true,
    contentGeneration: true,
    autoPublish: true,
    requiresApproval: false,
  },
};

// Autopilot configuration
export interface AutopilotConfig {
  dailyContentLimit?: number;
  qualityThreshold?: number;
  autoPublishMinScore?: number;
  enabledTaskTypes?: AutopilotTaskType[];
  blacklistedDestinations?: string[];
  priorityDestinations?: string[];
  workingHoursStart?: number; // 0-23
  workingHoursEnd?: number;
  timezone?: string;
}

// Default configuration
export const DEFAULT_AUTOPILOT_CONFIG: AutopilotConfig = {
  dailyContentLimit: 50,
  qualityThreshold: 75,
  autoPublishMinScore: 85,
  enabledTaskTypes: [
    "content_generation",
    "quality_improvement",
    "freshness_update",
    "internal_linking",
    "image_optimization",
  ],
  blacklistedDestinations: [],
  priorityDestinations: [],
  workingHoursStart: 0,
  workingHoursEnd: 24,
  timezone: "UTC",
};

// Autopilot statistics
export interface AutopilotStats {
  totalTasksCreated: number;
  totalTasksCompleted: number;
  totalContentGenerated: number;
  lastActivityAt?: Date;
}

// Task configuration for different types
export interface TaskConfig {
  // Content generation
  contentId?: string;
  feedId?: string;
  locale?: string;

  // Quality improvement
  targetScore?: number;
  improvementAreas?: string[];

  // Freshness update
  maxAge?: number; // Days

  // Internal linking
  maxLinks?: number;
  minRelevance?: number;

  // Image optimization
  optimizationLevel?: "low" | "medium" | "high";

  // Entity extraction / Content explosion
  maxEntities?: number;
  maxArticles?: number;
  articleTypes?: string[];
}

// Task result
export interface TaskResult {
  success: boolean;
  contentIds?: string[];
  changes?: Record<string, unknown>;
  error?: string;
  metrics?: {
    itemsProcessed?: number;
    itemsSucceeded?: number;
    itemsFailed?: number;
    processingTimeMs?: number;
  };
}

// Task executor interface
export interface TaskExecutor {
  taskType: AutopilotTaskType;
  execute(taskId: string, config: TaskConfig): Promise<TaskResult>;
  canExecute(config: TaskConfig): boolean;
  estimateTime(config: TaskConfig): number; // Estimated ms
}

// Schedule configuration
export interface ScheduleConfig {
  contentGeneration?: {
    enabled: boolean;
    cronExpression: string;
    maxPerRun: number;
  };
  qualityImprovement?: {
    enabled: boolean;
    cronExpression: string;
    targetContentAge: number; // Days since last update
  };
  freshnessUpdate?: {
    enabled: boolean;
    cronExpression: string;
    maxAge: number; // Days
  };
  internalLinking?: {
    enabled: boolean;
    cronExpression: string;
    batchSize: number;
  };
  imageOptimization?: {
    enabled: boolean;
    cronExpression: string;
    batchSize: number;
  };
}

// Default schedules
export const DEFAULT_SCHEDULES: ScheduleConfig = {
  contentGeneration: {
    enabled: true,
    cronExpression: "0 */4 * * *", // Every 4 hours
    maxPerRun: 10,
  },
  qualityImprovement: {
    enabled: true,
    cronExpression: "0 3 * * *", // Daily at 3 AM
    targetContentAge: 30,
  },
  freshnessUpdate: {
    enabled: true,
    cronExpression: "0 4 * * *", // Daily at 4 AM
    maxAge: 90,
  },
  internalLinking: {
    enabled: true,
    cronExpression: "0 5 * * 0", // Weekly on Sunday at 5 AM
    batchSize: 100,
  },
  imageOptimization: {
    enabled: true,
    cronExpression: "0 2 * * *", // Daily at 2 AM
    batchSize: 50,
  },
};

// Autopilot state
export interface AutopilotStateData {
  mode: AutopilotMode;
  config: AutopilotConfig;
  stats: AutopilotStats;
  lastModeChangeBy?: string;
  lastModeChangeAt?: Date;
}

// Task summary for dashboard
export interface TaskSummary {
  pending: number;
  awaitingApproval: number;
  executing: number;
  completedToday: number;
  failedToday: number;
  byType: Record<AutopilotTaskType, number>;
}

// Approval action
export interface ApprovalAction {
  taskId: string;
  action: "approve" | "reject";
  reason?: string;
  approvedBy: string;
}
