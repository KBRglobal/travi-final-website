/**
 * Cost Analytics - AI Usage Cost & Value Tracking
 * 
 * PHASE 4 EXTENSION: AI Cost & Value Analytics
 * 
 * Tracks and estimates costs for all AI operations:
 * - Per-provider rate estimation based on token usage
 * - Per-category cost aggregation
 * - Per-article, per-locale, per-SEO, per-chat cost tracking
 * - Expensive/cheap task flagging
 * - Value indicator correlation
 * 
 * HARD INVARIANTS:
 * - In-memory aggregation only (no schema changes)
 * - Simple rate estimation (not exact billing)
 * - Integrates with task-governance.ts telemetry
 */

import { log } from '../lib/logger';
import type { AIProvider, TaskCategory } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[CostAnalytics] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[CostAnalytics] ${msg}`, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[CostAnalytics][AUDIT] ${msg}`, data),
};

/**
 * Provider rate configuration ($ per 1M tokens -> converted to per 1K tokens)
 * Simple estimation rates - not exact billing
 * 
 * PHASE 4 UPDATE: Rates aligned with task specification
 * - GPT-4: $30/1M tokens = $0.03/1K tokens
 * - Claude: $15/1M tokens = $0.015/1K tokens
 * - Others proportionally scaled
 */
export const PROVIDER_RATES: Record<AIProvider, number> = {
  openai: 0.03,        // GPT-4: $30/1M tokens = $0.03/1K tokens
  anthropic: 0.015,    // Claude: $15/1M tokens = $0.015/1K tokens
  gemini: 0.0075,      // Gemini: ~$7.5/1M tokens (cost-effective)
  deepseek: 0.002,     // DeepSeek: ~$2/1M tokens (very cost-effective)
  openrouter: 0.02,    // Varies by model, average estimate
  'replit-ai': 0.01,   // Replit hosted: ~$10/1M tokens
  freepik: 0.05,       // Image generation (per request, not tokens)
};

/**
 * Task Value Categories
 * 
 * PHASE 4: Value scoring for ROI analysis
 * - High-value: Direct revenue/engagement impact
 * - Medium-value: Quality/reach improvements
 * - Low-value: Support/infrastructure tasks
 */
export type TaskValue = 'high' | 'medium' | 'low';

export const CATEGORY_VALUE_MAP: Record<TaskCategory, TaskValue> = {
  content: 'high',       // Content generation - direct value
  seo: 'high',           // SEO optimization - visibility & traffic
  evergreen: 'high',     // Guides/destination content - long-term value
  news: 'medium',        // News content - time-sensitive value
  translation: 'medium', // Translation - reach expansion
  enrichment: 'medium',  // Content enrichment - quality improvement
  localization: 'medium', // Localization - market expansion
  image: 'medium',       // Image generation - visual appeal
  research: 'low',       // Research tasks - internal support
  internal: 'low',       // Internal operations - infrastructure
};

/**
 * Get the value classification for a task category
 */
export function getTaskValue(category: TaskCategory): TaskValue {
  return CATEGORY_VALUE_MAP[category] || 'low';
}

/**
 * Task Value Ratio result
 * 
 * PHASE 4: Per-category ROI analysis
 */
export interface TaskValueRatioResult {
  cost: number;          // Total cost for this category
  value: number;         // Value score (high=3, medium=2, low=1)
  ratio: number;         // Value per dollar spent (higher = better ROI)
  taskCount: number;     // Number of tasks in this category
  avgCostPerTask: number;// Average cost per task
  recommendation: string;// Actionable recommendation
}

/**
 * Cost thresholds for flagging tasks
 */
export const COST_THRESHOLDS = {
  expensive: 0.10,  // Tasks > $0.10 are flagged as expensive
  cheap: 0.01,      // Tasks < $0.01 are flagged as cheap
};

/**
 * Cost entry for a single task
 */
export interface CostEntry {
  taskId: string;
  category: TaskCategory;
  provider: AIProvider;
  tokensUsed: number;
  estimatedCost: number;
  timestamp: Date;
  articleId?: string;
  locale?: string;
  sessionId?: string;
  flag?: 'expensive' | 'cheap';
}

/**
 * Aggregated cost by category
 */
export interface CategoryCost {
  category: TaskCategory;
  totalCost: number;
  taskCount: number;
  totalTokens: number;
  avgCostPerTask: number;
}

/**
 * Aggregated cost by provider
 */
export interface ProviderCost {
  provider: AIProvider;
  totalCost: number;
  taskCount: number;
  totalTokens: number;
  avgCostPerTask: number;
}

/**
 * Article cost tracking
 */
export interface ArticleCost {
  articleId: string;
  totalCost: number;
  taskCount: number;
  categories: Record<TaskCategory, number>;
  lastUpdated: Date;
}

/**
 * Locale cost tracking
 */
export interface LocaleCost {
  locale: string;
  totalCost: number;
  translationTaskCount: number;
  lastUpdated: Date;
}

/**
 * Chat session cost tracking
 */
export interface SessionCost {
  sessionId: string;
  totalCost: number;
  messageCount: number;
  totalTokens: number;
  lastUpdated: Date;
}

/**
 * Value by category aggregation (for ROI analysis)
 */
export interface ValueCategoryCost {
  value: TaskValue;
  categories: TaskCategory[];
  totalCost: number;
  taskCount: number;
  totalTokens: number;
  avgCostPerTask: number;
}

/**
 * Cost optimization recommendation
 */
export interface CostRecommendation {
  type: 'cost_reduction' | 'value_improvement' | 'efficiency' | 'warning';
  priority: 'high' | 'medium' | 'low';
  category?: TaskCategory;
  message: string;
  potentialSavings?: number;
  action: string;
}

/**
 * Value metrics response
 */
export interface ValueMetrics {
  timestamp: string;
  totalCost24h: number;
  totalCostAllTime: number;
  costByCategory: CategoryCost[];
  costByProvider: ProviderCost[];
  valueByCategory: ValueCategoryCost[];
  expensiveTasks: CostEntry[];
  cheapTasks: CostEntry[];
  expensiveLowValueTasks: CostEntry[];
  cheapHighImpactTasks: CostEntry[];
  articleCosts: ArticleCost[];
  localeCosts: LocaleCost[];
  seoCost: {
    totalCost: number;
    taskCount: number;
    avgCostPerTask: number;
  };
  chatSessionCosts: SessionCost[];
  recommendations: CostRecommendation[];
  summary: {
    totalTasks: number;
    expensiveTaskCount: number;
    cheapTaskCount: number;
    expensiveLowValueCount: number;
    cheapHighImpactCount: number;
    avgCostPerTask: number;
    roiIndicator: 'good' | 'moderate' | 'poor';
  };
}

/**
 * Cost Analytics - Main Class
 */
export class CostAnalytics {
  private costEntries: CostEntry[] = [];
  private articleCosts: Map<string, ArticleCost> = new Map();
  private localeCosts: Map<string, LocaleCost> = new Map();
  private sessionCosts: Map<string, SessionCost> = new Map();
  private maxEntryHistory: number = 10000;
  private maxFlaggedHistory: number = 100;

  constructor() {
    logger.info('Cost Analytics initialized');
  }

  /**
   * Calculate estimated cost based on tokens and provider
   */
  calculateCost(provider: AIProvider, tokensUsed: number): number {
    const rate = PROVIDER_RATES[provider] || 0.002;
    return (tokensUsed / 1000) * rate;
  }

  /**
   * Flag a task as expensive or cheap based on cost
   */
  private flagTask(cost: number): 'expensive' | 'cheap' | undefined {
    if (cost > COST_THRESHOLDS.expensive) return 'expensive';
    if (cost < COST_THRESHOLDS.cheap) return 'cheap';
    return undefined;
  }

  /**
   * Record a cost event for a task
   */
  recordCost(params: {
    taskId: string;
    category: TaskCategory;
    provider: AIProvider;
    tokensUsed: number;
    articleId?: string;
    locale?: string;
    sessionId?: string;
  }): CostEntry {
    const estimatedCost = this.calculateCost(params.provider, params.tokensUsed);
    const flag = this.flagTask(estimatedCost);

    const entry: CostEntry = {
      taskId: params.taskId,
      category: params.category,
      provider: params.provider,
      tokensUsed: params.tokensUsed,
      estimatedCost,
      timestamp: new Date(),
      articleId: params.articleId,
      locale: params.locale,
      sessionId: params.sessionId,
      flag,
    };

    this.costEntries.push(entry);
    if (this.costEntries.length > this.maxEntryHistory) {
      this.costEntries.shift();
    }

    if (params.articleId) {
      this.updateArticleCost(params.articleId, params.category, estimatedCost);
    }

    if (params.locale && params.category === 'translation') {
      this.updateLocaleCost(params.locale, estimatedCost);
    }

    if (params.sessionId) {
      this.updateSessionCost(params.sessionId, params.tokensUsed, estimatedCost);
    }

    if (flag === 'expensive') {
      logger.warn('Expensive task recorded', {
        taskId: params.taskId,
        category: params.category,
        cost: estimatedCost,
        tokens: params.tokensUsed,
      });
    }

    logger.audit('Cost recorded', {
      taskId: params.taskId,
      category: params.category,
      provider: params.provider,
      cost: estimatedCost,
      flag,
    });

    return entry;
  }

  /**
   * Update article cost aggregation
   */
  private updateArticleCost(
    articleId: string,
    category: TaskCategory,
    cost: number
  ): void {
    let articleCost = this.articleCosts.get(articleId);
    if (!articleCost) {
      articleCost = {
        articleId,
        totalCost: 0,
        taskCount: 0,
        categories: {} as Record<TaskCategory, number>,
        lastUpdated: new Date(),
      };
      this.articleCosts.set(articleId, articleCost);
    }

    articleCost.totalCost += cost;
    articleCost.taskCount++;
    articleCost.categories[category] = (articleCost.categories[category] || 0) + cost;
    articleCost.lastUpdated = new Date();
  }

  /**
   * Update locale cost aggregation
   */
  private updateLocaleCost(locale: string, cost: number): void {
    let localeCost = this.localeCosts.get(locale);
    if (!localeCost) {
      localeCost = {
        locale,
        totalCost: 0,
        translationTaskCount: 0,
        lastUpdated: new Date(),
      };
      this.localeCosts.set(locale, localeCost);
    }

    localeCost.totalCost += cost;
    localeCost.translationTaskCount++;
    localeCost.lastUpdated = new Date();
  }

  /**
   * Update session cost aggregation
   */
  private updateSessionCost(
    sessionId: string,
    tokens: number,
    cost: number
  ): void {
    let sessionCost = this.sessionCosts.get(sessionId);
    if (!sessionCost) {
      sessionCost = {
        sessionId,
        totalCost: 0,
        messageCount: 0,
        totalTokens: 0,
        lastUpdated: new Date(),
      };
      this.sessionCosts.set(sessionId, sessionCost);
    }

    sessionCost.totalCost += cost;
    sessionCost.messageCount++;
    sessionCost.totalTokens += tokens;
    sessionCost.lastUpdated = new Date();
  }

  /**
   * Get entries from the last 24 hours
   */
  private getEntriesLast24h(): CostEntry[] {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.costEntries.filter(e => e.timestamp >= cutoff);
  }

  /**
   * Get cost aggregated by category
   */
  getCostByCategory(entries: CostEntry[] = this.costEntries): CategoryCost[] {
    const categoryMap = new Map<TaskCategory, { cost: number; count: number; tokens: number }>();

    for (const entry of entries) {
      const existing = categoryMap.get(entry.category) || { cost: 0, count: 0, tokens: 0 };
      categoryMap.set(entry.category, {
        cost: existing.cost + entry.estimatedCost,
        count: existing.count + 1,
        tokens: existing.tokens + entry.tokensUsed,
      });
    }

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      totalCost: Math.round(data.cost * 10000) / 10000,
      taskCount: data.count,
      totalTokens: data.tokens,
      avgCostPerTask: data.count > 0 ? Math.round((data.cost / data.count) * 10000) / 10000 : 0,
    }));
  }

  /**
   * Get cost aggregated by provider
   */
  getCostByProvider(entries: CostEntry[] = this.costEntries): ProviderCost[] {
    const providerMap = new Map<AIProvider, { cost: number; count: number; tokens: number }>();

    for (const entry of entries) {
      const existing = providerMap.get(entry.provider) || { cost: 0, count: 0, tokens: 0 };
      providerMap.set(entry.provider, {
        cost: existing.cost + entry.estimatedCost,
        count: existing.count + 1,
        tokens: existing.tokens + entry.tokensUsed,
      });
    }

    return Array.from(providerMap.entries()).map(([provider, data]) => ({
      provider,
      totalCost: Math.round(data.cost * 10000) / 10000,
      taskCount: data.count,
      totalTokens: data.tokens,
      avgCostPerTask: data.count > 0 ? Math.round((data.cost / data.count) * 10000) / 10000 : 0,
    }));
  }

  /**
   * Get expensive tasks
   */
  getExpensiveTasks(limit: number = 50): CostEntry[] {
    return this.costEntries
      .filter(e => e.flag === 'expensive')
      .sort((a, b) => b.estimatedCost - a.estimatedCost)
      .slice(0, limit);
  }

  /**
   * Get cheap tasks (for efficiency analysis)
   */
  getCheapTasks(limit: number = 50): CostEntry[] {
    return this.costEntries
      .filter(e => e.flag === 'cheap')
      .sort((a, b) => a.estimatedCost - b.estimatedCost)
      .slice(0, limit);
  }

  /**
   * Get cost aggregated by value tier (high/medium/low)
   * 
   * PHASE 4: Value-based ROI analysis
   */
  getCostByValue(entries: CostEntry[] = this.costEntries): ValueCategoryCost[] {
    const valueMap = new Map<TaskValue, { 
      cost: number; 
      count: number; 
      tokens: number;
      categories: Set<TaskCategory>;
    }>();

    for (const entry of entries) {
      const value = getTaskValue(entry.category);
      const existing = valueMap.get(value) || { 
        cost: 0, 
        count: 0, 
        tokens: 0, 
        categories: new Set<TaskCategory>() 
      };
      existing.cost += entry.estimatedCost;
      existing.count++;
      existing.tokens += entry.tokensUsed;
      existing.categories.add(entry.category);
      valueMap.set(value, existing);
    }

    const values: TaskValue[] = ['high', 'medium', 'low'];
    return values.map(value => {
      const data = valueMap.get(value) || { cost: 0, count: 0, tokens: 0, categories: new Set() };
      return {
        value,
        categories: Array.from(data.categories),
        totalCost: Math.round(data.cost * 10000) / 10000,
        taskCount: data.count,
        totalTokens: data.tokens,
        avgCostPerTask: data.count > 0 ? Math.round((data.cost / data.count) * 10000) / 10000 : 0,
      };
    });
  }

  /**
   * Get expensive tasks that are low value (bad ROI)
   * 
   * PHASE 4: Identify wasteful spending
   */
  getExpensiveLowValueTasks(limit: number = 50): CostEntry[] {
    return this.costEntries
      .filter(e => {
        const value = getTaskValue(e.category);
        return e.flag === 'expensive' && value === 'low';
      })
      .sort((a, b) => b.estimatedCost - a.estimatedCost)
      .slice(0, limit);
  }

  /**
   * Get cheap tasks that are high value (good ROI)
   * 
   * PHASE 4: Identify efficient spending patterns
   */
  getCheapHighImpactTasks(limit: number = 50): CostEntry[] {
    return this.costEntries
      .filter(e => {
        const value = getTaskValue(e.category);
        return e.flag === 'cheap' && value === 'high';
      })
      .sort((a, b) => a.estimatedCost - b.estimatedCost)
      .slice(0, limit);
  }

  /**
   * Calculate ROI indicator based on value vs cost distribution
   * 
   * PHASE 4: Overall spending health indicator
   */
  private calculateRoiIndicator(): 'good' | 'moderate' | 'poor' {
    const expensiveLowValue = this.getExpensiveLowValueTasks().length;
    const cheapHighImpact = this.getCheapHighImpactTasks().length;
    const totalTasks = this.costEntries.length;

    if (totalTasks === 0) return 'moderate';

    const badRatio = expensiveLowValue / totalTasks;
    const goodRatio = cheapHighImpact / totalTasks;

    if (badRatio > 0.2) return 'poor';
    if (goodRatio > 0.3) return 'good';
    return 'moderate';
  }

  /**
   * Get SEO cost summary
   */
  getSeoCost(): { totalCost: number; taskCount: number; avgCostPerTask: number } {
    const seoEntries = this.costEntries.filter(e => e.category === 'seo');
    const totalCost = seoEntries.reduce((sum, e) => sum + e.estimatedCost, 0);
    return {
      totalCost: Math.round(totalCost * 10000) / 10000,
      taskCount: seoEntries.length,
      avgCostPerTask: seoEntries.length > 0 
        ? Math.round((totalCost / seoEntries.length) * 10000) / 10000 
        : 0,
    };
  }

  /**
   * Get task value ratio for a specific category
   * 
   * PHASE 4: Required function per specification
   * Returns cost, value, and ratio for ROI analysis
   */
  getTaskValueRatio(category: TaskCategory): TaskValueRatioResult {
    const categoryEntries = this.costEntries.filter(e => e.category === category);
    const totalCost = categoryEntries.reduce((sum, e) => sum + e.estimatedCost, 0);
    const taskCount = categoryEntries.length;
    const avgCostPerTask = taskCount > 0 ? totalCost / taskCount : 0;
    
    const valueLabel = getTaskValue(category);
    const valueScore = valueLabel === 'high' ? 3 : valueLabel === 'medium' ? 2 : 1;
    
    const ratio = totalCost > 0 ? (valueScore * taskCount) / totalCost : 0;
    
    let recommendation: string;
    if (taskCount === 0) {
      recommendation = `No ${category} tasks recorded yet`;
    } else if (valueLabel === 'low' && avgCostPerTask > COST_THRESHOLDS.expensive) {
      recommendation = `Consider reducing ${category} task complexity or switching to cheaper provider`;
    } else if (valueLabel === 'high' && avgCostPerTask < COST_THRESHOLDS.cheap) {
      recommendation = `Excellent ROI - ${category} tasks are cost-effective with high business value`;
    } else if (ratio < 10) {
      recommendation = `ROI for ${category} is below optimal - review task necessity`;
    } else if (ratio > 100) {
      recommendation = `Great efficiency - ${category} provides strong value for cost`;
    } else {
      recommendation = `${category} tasks are within normal cost/value range`;
    }

    return {
      cost: Math.round(totalCost * 10000) / 10000,
      value: valueScore,
      ratio: Math.round(ratio * 100) / 100,
      taskCount,
      avgCostPerTask: Math.round(avgCostPerTask * 10000) / 10000,
      recommendation,
    };
  }

  /**
   * Generate cost optimization recommendations
   * 
   * PHASE 4: Actionable insights for cost management
   */
  generateRecommendations(): CostRecommendation[] {
    const recommendations: CostRecommendation[] = [];
    const expensiveLowValue = this.getExpensiveLowValueTasks();
    const costByCategory = this.getCostByCategory();
    const costByProvider = this.getCostByProvider();
    const totalCost = this.costEntries.reduce((sum, e) => sum + e.estimatedCost, 0);

    if (expensiveLowValue.length > 5) {
      const potentialSavings = expensiveLowValue
        .slice(0, 5)
        .reduce((sum, e) => sum + e.estimatedCost, 0);
      recommendations.push({
        type: 'warning',
        priority: 'high',
        message: `${expensiveLowValue.length} expensive low-value tasks detected`,
        potentialSavings,
        action: 'Review internal/research tasks for optimization or removal',
      });
    }

    for (const categoryData of costByCategory) {
      const valueRatio = this.getTaskValueRatio(categoryData.category);
      
      if (valueRatio.value === 1 && categoryData.totalCost > totalCost * 0.3) {
        recommendations.push({
          type: 'cost_reduction',
          priority: 'high',
          category: categoryData.category,
          message: `Low-value category "${categoryData.category}" consuming ${Math.round((categoryData.totalCost / totalCost) * 100)}% of budget`,
          potentialSavings: categoryData.totalCost * 0.5,
          action: `Reduce ${categoryData.category} task frequency or switch to cheaper provider`,
        });
      }
      
      if (valueRatio.ratio > 100 && valueRatio.value === 3) {
        recommendations.push({
          type: 'efficiency',
          priority: 'low',
          category: categoryData.category,
          message: `Excellent ROI for "${categoryData.category}" - high value, low cost`,
          action: 'Consider scaling up this category for better overall efficiency',
        });
      }
    }

    for (const providerData of costByProvider) {
      const expensiveRate = PROVIDER_RATES[providerData.provider];
      const cheaperProviders = Object.entries(PROVIDER_RATES)
        .filter(([p, rate]) => rate < expensiveRate * 0.7 && p !== providerData.provider)
        .map(([p]) => p);
      
      if (cheaperProviders.length > 0 && providerData.totalCost > totalCost * 0.4) {
        recommendations.push({
          type: 'cost_reduction',
          priority: 'medium',
          message: `${providerData.provider} consuming ${Math.round((providerData.totalCost / totalCost) * 100)}% of budget`,
          potentialSavings: providerData.totalCost * 0.3,
          action: `Consider routing some tasks to cheaper providers: ${cheaperProviders.join(', ')}`,
        });
      }
    }

    const roiIndicator = this.calculateRoiIndicator();
    if (roiIndicator === 'good' && recommendations.filter(r => r.priority === 'high').length === 0) {
      recommendations.push({
        type: 'efficiency',
        priority: 'low',
        message: 'AI spending is well-optimized with good ROI',
        action: 'Continue current spending patterns',
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Get all article costs
   */
  getArticleCosts(): ArticleCost[] {
    return Array.from(this.articleCosts.values())
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get all locale costs
   */
  getLocaleCosts(): LocaleCost[] {
    return Array.from(this.localeCosts.values())
      .sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get chat session costs
   */
  getSessionCosts(limit: number = 50): SessionCost[] {
    return Array.from(this.sessionCosts.values())
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, limit);
  }

  /**
   * Get complete value metrics
   * 
   * PHASE 4: Enhanced with value-based ROI analysis and recommendations
   */
  getValueMetrics(): ValueMetrics {
    const entries24h = this.getEntriesLast24h();
    const allEntries = this.costEntries;

    const totalCost24h = entries24h.reduce((sum, e) => sum + e.estimatedCost, 0);
    const totalCostAllTime = allEntries.reduce((sum, e) => sum + e.estimatedCost, 0);

    const expensiveTasks = this.getExpensiveTasks(this.maxFlaggedHistory);
    const cheapTasks = this.getCheapTasks(this.maxFlaggedHistory);
    const expensiveLowValueTasks = this.getExpensiveLowValueTasks(this.maxFlaggedHistory);
    const cheapHighImpactTasks = this.getCheapHighImpactTasks(this.maxFlaggedHistory);

    return {
      timestamp: new Date().toISOString(),
      totalCost24h: Math.round(totalCost24h * 10000) / 10000,
      totalCostAllTime: Math.round(totalCostAllTime * 10000) / 10000,
      costByCategory: this.getCostByCategory(),
      costByProvider: this.getCostByProvider(),
      valueByCategory: this.getCostByValue(),
      expensiveTasks,
      cheapTasks,
      expensiveLowValueTasks,
      cheapHighImpactTasks,
      articleCosts: this.getArticleCosts().slice(0, 50),
      localeCosts: this.getLocaleCosts(),
      seoCost: this.getSeoCost(),
      chatSessionCosts: this.getSessionCosts(),
      recommendations: this.generateRecommendations(),
      summary: {
        totalTasks: allEntries.length,
        expensiveTaskCount: expensiveTasks.length,
        cheapTaskCount: cheapTasks.length,
        expensiveLowValueCount: expensiveLowValueTasks.length,
        cheapHighImpactCount: cheapHighImpactTasks.length,
        avgCostPerTask: allEntries.length > 0 
          ? Math.round((totalCostAllTime / allEntries.length) * 10000) / 10000 
          : 0,
        roiIndicator: this.calculateRoiIndicator(),
      },
    };
  }

  /**
   * Get cost for a specific article
   */
  getArticleCost(articleId: string): ArticleCost | undefined {
    return this.articleCosts.get(articleId);
  }

  /**
   * Get cost for a specific locale
   */
  getLocaleCost(locale: string): LocaleCost | undefined {
    return this.localeCosts.get(locale);
  }

  /**
   * Get cost for a specific session
   */
  getSessionCost(sessionId: string): SessionCost | undefined {
    return this.sessionCosts.get(sessionId);
  }

  /**
   * Clear old entries (maintenance)
   */
  pruneOldEntries(maxAgeDays: number = 30): number {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
    const originalLength = this.costEntries.length;
    this.costEntries = this.costEntries.filter(e => e.timestamp >= cutoff);
    const pruned = originalLength - this.costEntries.length;
    
    if (pruned > 0) {
      logger.info('Pruned old cost entries', { pruned, remaining: this.costEntries.length });
    }
    
    return pruned;
  }
}

let costAnalyticsInstance: CostAnalytics | null = null;

export function getCostAnalytics(): CostAnalytics {
  if (!costAnalyticsInstance) {
    costAnalyticsInstance = new CostAnalytics();
  }
  return costAnalyticsInstance;
}

export function resetCostAnalytics(): void {
  costAnalyticsInstance = null;
}
