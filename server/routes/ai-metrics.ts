/**
 * AI Metrics API Routes
 * 
 * PHASE 5 + 7: Expose AI orchestrator metrics
 * PHASE 4 EXTENSION: AI Cost & Value Analytics
 * TASK 7: Load Tiers - Graceful degradation under traffic spikes
 * 
 * Endpoints:
 * - GET /api/ai/metrics/providers - Provider health & credit status
 * - GET /api/ai/metrics/tasks - Per-category usage, rejections, fallbacks
 * - GET /api/ai/metrics/value - Cost tracking and ROI metrics
 * - GET /api/system/load - System-wide load metrics + load tier status
 */

import { Router, type Request, type Response } from 'express';
import { getHealthTracker } from '../ai-orchestrator/health-tracker';
import { getCreditGuard } from '../ai-orchestrator/credit-guard';
import { getTaskGovernance } from '../ai-orchestrator/task-governance';
import { getCostAnalytics } from '../ai-orchestrator/cost-analytics';
import { getDiagnosticsSnapshot, getCreditCounters } from '../ai-orchestrator';
import { 
  getLoadTierManager, 
  initLoadTierManager,
  type LoadTier,
  type LoadTierMetrics 
} from '../system/load-tiers';
import {
  checkAlertConditions,
  formatAlertForHumans,
  getAlertMetrics,
  getActiveAlerts,
  getAlertHistory,
} from '../system/alerts';
import { log } from '../lib/logger';

const router = Router();

/**
 * Initialize Load Tier Manager with system capacity provider
 * 
 * TASK 7: Connect load tier system to actual diagnostics
 * Capacity is calculated as average load across all available providers
 */
function calculateSystemCapacity(): number {
  try {
    const diagnostics = getDiagnosticsSnapshot();
    const availableProviders = diagnostics.providers.filter(p => p.available);
    
    if (availableProviders.length === 0) {
      return 100;
    }

    const avgProviderLoad = availableProviders.reduce(
      (sum, p) => sum + p.currentLoad, 0
    ) / availableProviders.length;

    const queueFactor = Math.min(diagnostics.queueDepth * 2, 30);
    
    const backpressureFactor = diagnostics.backpressure.isActive ? 20 : 0;

    const capacity = avgProviderLoad + queueFactor + backpressureFactor;
    return Math.min(100, Math.max(0, capacity));
  } catch (error) {
    log.warn('[LoadTiers] Failed to calculate capacity, defaulting to 0', { error });
    return 0;
  }
}

const loadTierManager = initLoadTierManager(
  { greenThreshold: 50, yellowThreshold: 80 },
  calculateSystemCapacity
);

/**
 * GET /api/ai/metrics/providers
 * 
 * Returns health and credit status for all AI providers
 * Read-only endpoint for monitoring
 */
router.get('/providers', (_req: Request, res: Response) => {
  try {
    const healthTracker = getHealthTracker();
    const creditGuard = getCreditGuard();

    const health = healthTracker.getMetricsSnapshot();
    const credits = creditGuard.getUsageSummary();

    res.json({
      timestamp: new Date().toISOString(),
      providers: Object.keys(health).map(provider => ({
        provider,
        health: health[provider as keyof typeof health],
        credits: credits[provider as keyof typeof credits],
      })),
      observeOnlyMode: creditGuard.isObserveOnly(),
    });
  } catch (error) {
    log.error('[AI Metrics] Failed to get provider metrics', error);
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * GET /api/system/load
 * 
 * Returns system-wide load metrics
 * PHASE 7: Telemetry expansion
 * TASK 7: Load Tiers - Graceful degradation status
 */
router.get('/load', (_req: Request, res: Response) => {
  try {
    const diagnostics = getDiagnosticsSnapshot();
    const creditCounters = getCreditCounters();
    const loadTierMetrics = loadTierManager.getMetrics();

    res.json({
      timestamp: new Date().toISOString(),
      healthy: diagnostics.healthy,
      queueDepth: diagnostics.queueDepth,
      loadTier: {
        tier: loadTierMetrics.tier,
        capacity: loadTierMetrics.capacity,
        thresholds: loadTierMetrics.thresholds,
        behaviors: loadTierMetrics.behaviors,
        state: {
          transitionCount: loadTierMetrics.state.transitionCount,
          deferredTaskCount: loadTierMetrics.state.deferredTaskCount,
          lastTransitionAt: loadTierMetrics.state.lastTransitionAt.toISOString(),
        },
        recentTransitions: loadTierMetrics.recentTransitions.slice(-5).map(t => ({
          fromTier: t.fromTier,
          toTier: t.toTier,
          capacity: t.capacity,
          timestamp: t.timestamp.toISOString(),
        })),
        recentDeferrals: loadTierMetrics.recentDeferrals.slice(-10).map(d => ({
          category: d.category,
          tier: d.tier,
          reason: d.reason,
          taskId: d.taskId,
          timestamp: d.timestamp.toISOString(),
        })),
      },
      backpressure: {
        active: diagnostics.backpressure.isActive,
        reason: diagnostics.backpressure.reason,
        affectedProviders: diagnostics.backpressure.affectedProviders,
      },
      providers: diagnostics.providers.map(p => ({
        provider: p.provider,
        available: p.available,
        load: Math.round(p.currentLoad),
        creditUsage: {
          dailyPercent: Math.round(p.percentDailyUsed),
          monthlyPercent: Math.round(p.percentMonthlyUsed),
        },
      })),
      totals: {
        requests: diagnostics.metrics.totalRequests,
        successes: diagnostics.metrics.successfulRequests,
        failures: diagnostics.metrics.failedRequests,
        creditsUsed: diagnostics.metrics.totalCreditsUsed,
        avgLatencyMs: Math.round(diagnostics.metrics.averageLatencyMs),
      },
      creditCounters: {
        totalDailyUsed: creditCounters.totalDailyUsed,
        totalMonthlyUsed: creditCounters.totalMonthlyUsed,
      },
      warnings: diagnostics.warnings,
    });
  } catch (error) {
    log.error('[System Load] Failed to get load metrics', error);
    res.status(500).json({ error: 'Failed to retrieve load metrics' });
  }
});

/**
 * GET /api/ai/metrics/tasks
 * 
 * PHASE 4: Task governance metrics
 * Returns per-category usage, rejections, and fallbacks
 */
router.get('/tasks', (_req: Request, res: Response) => {
  try {
    const taskGovernance = getTaskGovernance();
    const metrics = taskGovernance.getMetrics();

    res.json({
      timestamp: metrics.timestamp,
      summary: {
        totalRejections: metrics.totalRejections,
        totalFallbacks: metrics.totalFallbacks,
      },
      categories: Object.entries(metrics.categories).map(([category, data]) => ({
        category,
        limits: {
          requestsPerHour: data.limits.requestsPerHour,
          maxTokensPerRequest: data.limits.maxTokensPerRequest,
          enabled: data.limits.enabled,
        },
        usage: {
          requestsThisHour: data.usage.requestsThisHour,
          tokensThisHour: data.usage.tokensThisHour,
          totalRequests: data.usage.totalRequests,
          totalTokens: data.usage.totalTokens,
          rejections: data.usage.rejections,
          fallbacks: data.usage.fallbacks,
        },
        percentUsed: data.limits.requestsPerHour > 0
          ? Math.round((data.usage.requestsThisHour / data.limits.requestsPerHour) * 100)
          : 0,
      })),
      recentFallbacks: metrics.recentFallbacks.map(fb => ({
        taskId: fb.taskId,
        category: fb.category,
        reason: fb.reason,
        originalProvider: fb.originalProvider,
        fallbackProvider: fb.fallbackProvider,
        timestamp: fb.timestamp.toISOString(),
      })),
    });
  } catch (error) {
    log.error('[AI Metrics] Failed to get task governance metrics', error);
    res.status(500).json({ error: 'Failed to retrieve task governance metrics' });
  }
});

/**
 * GET /api/ai/metrics/value
 * 
 * PHASE 4 EXTENSION: AI Cost & Value Analytics
 * Returns cost tracking and ROI metrics for AI usage
 * 
 * Includes:
 * - costByCategory: Cost breakdown by task category
 * - valueByCategory: Cost aggregated by value tier (high/medium/low)
 * - expensiveLowValueTasks: Expensive tasks with low value (bad ROI)
 * - cheapHighImpactTasks: Cheap tasks with high value (good ROI)
 */
router.get('/value', (_req: Request, res: Response) => {
  try {
    const costAnalytics = getCostAnalytics();
    const metrics = costAnalytics.getValueMetrics();

    res.json({
      timestamp: metrics.timestamp,
      totalCost24h: metrics.totalCost24h,
      totalCostAllTime: metrics.totalCostAllTime,
      costByCategory: metrics.costByCategory.map(c => ({
        category: c.category,
        totalCost: c.totalCost,
        taskCount: c.taskCount,
        totalTokens: c.totalTokens,
        avgCostPerTask: c.avgCostPerTask,
      })),
      costByProvider: metrics.costByProvider.map(p => ({
        provider: p.provider,
        totalCost: p.totalCost,
        taskCount: p.taskCount,
        totalTokens: p.totalTokens,
        avgCostPerTask: p.avgCostPerTask,
      })),
      valueByCategory: metrics.valueByCategory.map(v => ({
        value: v.value,
        categories: v.categories,
        totalCost: v.totalCost,
        taskCount: v.taskCount,
        totalTokens: v.totalTokens,
        avgCostPerTask: v.avgCostPerTask,
      })),
      expensiveTasks: metrics.expensiveTasks.slice(0, 20).map(t => ({
        taskId: t.taskId,
        category: t.category,
        provider: t.provider,
        tokensUsed: t.tokensUsed,
        estimatedCost: t.estimatedCost,
        timestamp: t.timestamp.toISOString(),
        articleId: t.articleId,
        locale: t.locale,
      })),
      cheapTasks: metrics.cheapTasks.slice(0, 20).map(t => ({
        taskId: t.taskId,
        category: t.category,
        provider: t.provider,
        tokensUsed: t.tokensUsed,
        estimatedCost: t.estimatedCost,
        timestamp: t.timestamp.toISOString(),
      })),
      expensiveLowValueTasks: metrics.expensiveLowValueTasks.slice(0, 20).map(t => ({
        taskId: t.taskId,
        category: t.category,
        provider: t.provider,
        tokensUsed: t.tokensUsed,
        estimatedCost: t.estimatedCost,
        timestamp: t.timestamp.toISOString(),
        articleId: t.articleId,
        locale: t.locale,
        roiWarning: 'High cost, low business value - review for optimization',
      })),
      cheapHighImpactTasks: metrics.cheapHighImpactTasks.slice(0, 20).map(t => ({
        taskId: t.taskId,
        category: t.category,
        provider: t.provider,
        tokensUsed: t.tokensUsed,
        estimatedCost: t.estimatedCost,
        timestamp: t.timestamp.toISOString(),
        articleId: t.articleId,
        roiNote: 'Low cost, high business value - efficient spending',
      })),
      aggregations: {
        articleCosts: metrics.articleCosts.slice(0, 20).map(a => ({
          articleId: a.articleId,
          totalCost: a.totalCost,
          taskCount: a.taskCount,
          categoryBreakdown: a.categories,
          lastUpdated: a.lastUpdated.toISOString(),
        })),
        localeCosts: metrics.localeCosts.map(l => ({
          locale: l.locale,
          totalCost: l.totalCost,
          translationTaskCount: l.translationTaskCount,
          lastUpdated: l.lastUpdated.toISOString(),
        })),
        seoCost: metrics.seoCost,
        chatSessionCosts: metrics.chatSessionCosts.slice(0, 20).map(s => ({
          sessionId: s.sessionId,
          totalCost: s.totalCost,
          messageCount: s.messageCount,
          totalTokens: s.totalTokens,
          lastUpdated: s.lastUpdated.toISOString(),
        })),
      },
      recommendations: metrics.recommendations.map(r => ({
        type: r.type,
        priority: r.priority,
        category: r.category,
        message: r.message,
        potentialSavings: r.potentialSavings,
        action: r.action,
      })),
      summary: {
        totalTasks: metrics.summary.totalTasks,
        expensiveTaskCount: metrics.summary.expensiveTaskCount,
        cheapTaskCount: metrics.summary.cheapTaskCount,
        expensiveLowValueCount: metrics.summary.expensiveLowValueCount,
        cheapHighImpactCount: metrics.summary.cheapHighImpactCount,
        avgCostPerTask: metrics.summary.avgCostPerTask,
        roiIndicator: metrics.summary.roiIndicator,
      },
    });
  } catch (error) {
    log.error('[AI Metrics] Failed to get value metrics', error);
    res.status(500).json({ error: 'Failed to retrieve value metrics' });
  }
});

/**
 * GET /api/system/alerts
 * 
 * TASK 7: Operational Alerting (Human-Safe)
 * Returns active alerts and triggers alert condition checks
 * 
 * Read-only endpoint for monitoring when humans must intervene:
 * - runaway_cost: AI costs > 2x daily average
 * - degraded_search: Search fallback rate > 30%
 * - ai_fallback_overuse: AI fallback rate > 50%
 * - system_overload: Load tier RED > 5 minutes
 * 
 * Includes 15-minute cooldown per alert type to prevent spam
 */
router.get('/alerts', (_req: Request, res: Response) => {
  try {
    const newAlerts = checkAlertConditions();
    const metrics = getAlertMetrics();
    
    const formattedAlerts = metrics.activeAlerts.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      unit: alert.unit,
      triggeredAt: alert.triggeredAt.toISOString(),
      humanReadable: formatAlertForHumans(alert),
      context: alert.context,
    }));

    const historyFormatted = metrics.recentHistory.map(alert => ({
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      triggeredAt: alert.triggeredAt.toISOString(),
    }));

    res.json({
      timestamp: metrics.timestamp,
      alertCount: formattedAlerts.length,
      hasActiveAlerts: formattedAlerts.length > 0,
      activeAlerts: formattedAlerts,
      newAlertsTriggered: newAlerts.length,
      recentHistory: historyFormatted,
      cooldownStatus: metrics.cooldownStatus,
      thresholds: Object.entries(metrics.thresholds).map(([type, config]) => ({
        type,
        threshold: config.threshold,
        unit: config.unit,
        description: config.description,
        severity: config.severity,
      })),
      settings: metrics.settings,
    });
  } catch (error) {
    log.error('[System Alerts] Failed to check alert conditions', error);
    res.status(500).json({ error: 'Failed to retrieve alert status' });
  }
});

export default router;
