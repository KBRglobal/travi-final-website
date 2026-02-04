/**
 * Cost Analytics (Stub)
 */

export interface ArticleCost {
  articleId: string;
  totalCost: number;
  providerCosts: Record<string, number>;
  lastUpdated: Date;
  taskCount: number;
  categories: Record<string, number>;
}

export interface CostByCategory {
  category: string;
  totalCost: number;
  taskCount: number;
  totalTokens: number;
  avgCostPerTask: number;
}

export interface CostByProvider {
  provider: string;
  totalCost: number;
  taskCount: number;
  totalTokens: number;
  avgCostPerTask: number;
}

export interface ValueByCategory {
  value: string;
  categories: string[];
  totalCost: number;
  taskCount: number;
  totalTokens: number;
  avgCostPerTask: number;
}

export interface TaskCostRecord {
  taskId: string;
  category: string;
  provider: string;
  tokensUsed: number;
  estimatedCost: number;
  timestamp: Date;
  articleId?: string;
  locale?: string;
}

export interface LocaleCost {
  locale: string;
  totalCost: number;
  translationTaskCount: number;
  lastUpdated: Date;
}

export interface ChatSessionCost {
  sessionId: string;
  totalCost: number;
  messageCount: number;
  totalTokens: number;
  lastUpdated: Date;
}

export interface CostRecommendation {
  type: string;
  priority: string;
  category: string;
  message: string;
  potentialSavings: number;
  action: string;
}

export interface ValueMetricsSummary {
  totalTasks: number;
  expensiveTaskCount: number;
  cheapTaskCount: number;
  expensiveLowValueCount: number;
  cheapHighImpactCount: number;
  avgCostPerTask: number;
  roiIndicator: string;
}

export interface ValueMetrics {
  timestamp: string;
  totalCost24h: number;
  totalCostAllTime: number;
  costByCategory: CostByCategory[];
  costByProvider: CostByProvider[];
  valueByCategory: ValueByCategory[];
  expensiveTasks: TaskCostRecord[];
  cheapTasks: TaskCostRecord[];
  expensiveLowValueTasks: TaskCostRecord[];
  cheapHighImpactTasks: TaskCostRecord[];
  articleCosts: ArticleCost[];
  localeCosts: LocaleCost[];
  seoCost: number;
  chatSessionCosts: ChatSessionCost[];
  recommendations: CostRecommendation[];
  summary: ValueMetricsSummary;
}

export interface CostAnalytics {
  getTotalCost: () => number;
  getCostByProvider: () => Record<string, number>;
  getArticleCost: (entityId: string) => ArticleCost | null;
  getArticleCosts: () => ArticleCost[];
  getValueMetrics: () => ValueMetrics;
}

export function getCostAnalytics(): CostAnalytics {
  return {
    getTotalCost: () => 0,
    getCostByProvider: () => ({}),
    getArticleCost: () => null,
    getArticleCosts: () => [],
    getValueMetrics: () => ({
      timestamp: new Date().toISOString(),
      totalCost24h: 0,
      totalCostAllTime: 0,
      costByCategory: [],
      costByProvider: [],
      valueByCategory: [],
      expensiveTasks: [],
      cheapTasks: [],
      expensiveLowValueTasks: [],
      cheapHighImpactTasks: [],
      articleCosts: [],
      localeCosts: [],
      seoCost: 0,
      chatSessionCosts: [],
      recommendations: [],
      summary: {
        totalTasks: 0,
        expensiveTaskCount: 0,
        cheapTaskCount: 0,
        expensiveLowValueCount: 0,
        cheapHighImpactCount: 0,
        avgCostPerTask: 0,
        roiIndicator: "neutral",
      },
    }),
  };
}
