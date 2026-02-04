/**
 * Task Governance (Stub)
 */

export interface CategoryLimits {
  requestsPerHour: number;
  maxTokensPerRequest: number;
  enabled: boolean;
}

export interface CategoryUsage {
  requestsThisHour: number;
  tokensThisHour: number;
  totalRequests: number;
  totalTokens: number;
  rejections: number;
  fallbacks: number;
}

export interface CategoryData {
  limits: CategoryLimits;
  usage: CategoryUsage;
}

export interface FallbackRecord {
  taskId: string;
  category: string;
  reason: string;
  originalProvider: string;
  fallbackProvider: string;
  timestamp: Date;
}

export interface TaskGovernanceMetrics {
  timestamp: string;
  totalRejections: number;
  totalFallbacks: number;
  categories: Record<string, CategoryData>;
  recentFallbacks: FallbackRecord[];
}

export interface TaskGovernance {
  canExecute: () => boolean;
  getPriority: () => number;
  getMetrics: () => TaskGovernanceMetrics;
}

export function getTaskGovernance(): TaskGovernance {
  return {
    canExecute: () => true,
    getPriority: () => 1,
    getMetrics: () => ({
      timestamp: new Date().toISOString(),
      totalRejections: 0,
      totalFallbacks: 0,
      categories: {},
      recentFallbacks: [],
    }),
  };
}
