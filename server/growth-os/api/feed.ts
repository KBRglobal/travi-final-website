/**
 * Feed Generator
 *
 * Generates the executive growth feed from signals, actions, and insights.
 */

import { randomUUID } from 'crypto';
import type {
  FeedItem,
  FeedItemType,
  FeedPriority,
  FeedFilter,
  FeedResponse,
  FeedCTA,
  FeedMetrics,
  DashboardSummary,
  QueueItem,
  QueueResponse,
} from './types';
import type { NormalizedSignal, SignalCategory, SignalPriority } from '../signals/types';
import type { ActionPlan } from '../actions/types';
import { signalRegistry, getTopSignals, getAttentionRequired, aggregateByCategory } from '../signals';
import { planRegistry, getPendingApproval } from '../actions';
import { checkReadiness, getReadyForExecution, getBlockedPlans } from '../safety';
import { isApiEnabled, getGrowthOSConfig } from '../config';
import { log } from '../../lib/logger';

/**
 * Convert signal priority to feed priority
 */
function toFeedPriority(priority: SignalPriority): FeedPriority {
  switch (priority) {
    case 'critical': return 'urgent';
    case 'high': return 'high';
    case 'medium': return 'normal';
    default: return 'low';
  }
}

/**
 * Create feed item from signal
 */
function signalToFeedItem(signal: NormalizedSignal): FeedItem {
  return {
    id: randomUUID(),
    type: 'signal',
    priority: toFeedPriority(signal.priority),
    title: signal.title,
    summary: signal.description,
    category: signal.category,
    entityType: signal.entityType,
    entityId: signal.entityId,
    cta: {
      label: 'Investigate',
      action: 'investigate',
      targetId: signal.id,
      targetType: 'signal',
    },
    metrics: {
      impact: signal.impact,
      revenueImpact: signal.revenueImpact,
      risk: signal.severity,
      confidence: signal.confidence,
      custom: {},
    },
    timestamp: signal.createdAt,
    expiresAt: signal.expiresAt,
    read: signal.acknowledged,
    dismissed: false,
    sourceId: signal.id,
    sourceType: 'signal',
  };
}

/**
 * Create feed item from action plan
 */
function planToFeedItem(plan: ActionPlan): FeedItem {
  const readiness = checkReadiness(plan);

  let cta: FeedCTA;
  if (plan.requiresApproval && !plan.approved) {
    cta = { label: 'Approve', action: 'approve', targetId: plan.id, targetType: 'plan' };
  } else if (readiness.status === 'ready') {
    cta = { label: 'Execute', action: 'execute', targetId: plan.id, targetType: 'plan' };
  } else {
    cta = { label: 'View Details', action: 'view', targetId: plan.id, targetType: 'plan' };
  }

  const candidate = plan.metadata.sourceCandidate as any;
  const priority: FeedPriority = candidate?.priorityScore > 70 ? 'high' :
    candidate?.priorityScore > 40 ? 'normal' : 'low';

  return {
    id: randomUUID(),
    type: 'action',
    priority,
    title: plan.title,
    summary: plan.description,
    category: candidate?.categories?.[0] || 'content',
    entityType: plan.entityType,
    entityId: plan.entityId,
    cta,
    metrics: {
      impact: candidate?.dimensions?.revenueLift || null,
      revenueImpact: candidate?.estimatedRevenueImpact || null,
      risk: candidate?.dimensions?.risk || null,
      confidence: candidate?.dimensions?.confidence || null,
      custom: {
        estimatedEffort: candidate?.estimatedEffortHours || 0,
      },
    },
    timestamp: plan.createdAt,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    read: false,
    dismissed: false,
    sourceId: plan.id,
    sourceType: 'plan',
  };
}

/**
 * Create alert feed item
 */
function createAlert(
  title: string,
  summary: string,
  category: SignalCategory,
  priority: FeedPriority = 'high'
): FeedItem {
  return {
    id: randomUUID(),
    type: 'alert',
    priority,
    title,
    summary,
    category,
    entityType: null,
    entityId: null,
    cta: null,
    metrics: null,
    timestamp: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    read: false,
    dismissed: false,
    sourceId: randomUUID(),
    sourceType: 'system',
  };
}

/**
 * In-memory feed item storage
 */
const feedItems = new Map<string, FeedItem>();
const maxFeedItems = 500;

/**
 * Add item to feed
 */
function addToFeed(item: FeedItem): void {
  // Evict oldest if at capacity
  if (feedItems.size >= maxFeedItems) {
    const oldest = [...feedItems.values()].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    )[0];
    if (oldest) {
      feedItems.delete(oldest.id);
    }
  }

  feedItems.set(item.id, item);
}

/**
 * Generate feed items from current state
 */
export function generateFeed(): void {
  if (!isApiEnabled()) return;

  const startTime = Date.now();

  // Add attention-required signals
  const urgentSignals = getAttentionRequired();
  for (const signal of urgentSignals) {
    const existing = [...feedItems.values()].find(
      item => item.sourceId === signal.id && item.sourceType === 'signal'
    );
    if (!existing) {
      addToFeed(signalToFeedItem(signal));
    }
  }

  // Add pending approval plans
  const pendingApproval = getPendingApproval();
  for (const plan of pendingApproval) {
    const existing = [...feedItems.values()].find(
      item => item.sourceId === plan.id && item.sourceType === 'plan'
    );
    if (!existing) {
      addToFeed(planToFeedItem(plan));
    }
  }

  // Add ready plans
  const readyPlans = getReadyForExecution();
  for (const plan of readyPlans) {
    const existing = [...feedItems.values()].find(
      item => item.sourceId === plan.id && item.sourceType === 'plan'
    );
    if (!existing) {
      addToFeed(planToFeedItem(plan));
    }
  }

  // Generate alerts for blocked plans
  const blocked = getBlockedPlans();
  if (blocked.length > 3) {
    const existing = [...feedItems.values()].find(
      item => item.type === 'alert' && item.title.includes('plans blocked')
    );
    if (!existing) {
      addToFeed(createAlert(
        `${blocked.length} plans blocked`,
        'Multiple action plans are blocked by policies. Review and resolve.',
        'governance',
        'high'
      ));
    }
  }

  log.debug(`[GrowthOS] Feed generated: ${feedItems.size} items in ${Date.now() - startTime}ms`);
}

/**
 * Get feed with filtering
 */
export function getFeed(filter: FeedFilter = {}): FeedResponse {
  if (!isApiEnabled()) {
    return {
      items: [],
      total: 0,
      unreadCount: 0,
      hasMore: false,
      generatedAt: new Date(),
    };
  }

  // Refresh feed
  generateFeed();

  let items = [...feedItems.values()];

  // Apply filters
  if (filter.types && filter.types.length > 0) {
    items = items.filter(item => filter.types!.includes(item.type));
  }

  if (filter.priorities && filter.priorities.length > 0) {
    items = items.filter(item => filter.priorities!.includes(item.priority));
  }

  if (filter.categories && filter.categories.length > 0) {
    items = items.filter(item => filter.categories!.includes(item.category));
  }

  if (!filter.includeRead) {
    items = items.filter(item => !item.read);
  }

  if (!filter.includeDismissed) {
    items = items.filter(item => !item.dismissed);
  }

  if (filter.since) {
    items = items.filter(item => item.timestamp >= filter.since!);
  }

  if (filter.until) {
    items = items.filter(item => item.timestamp <= filter.until!);
  }

  // Sort by priority then timestamp
  const priorityOrder: Record<FeedPriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  items.sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const total = items.length;
  const unreadCount = items.filter(item => !item.read).length;

  // Pagination
  const offset = filter.offset || 0;
  const limit = filter.limit || 50;
  items = items.slice(offset, offset + limit);

  return {
    items,
    total,
    unreadCount,
    hasMore: offset + limit < total,
    generatedAt: new Date(),
  };
}

/**
 * Mark item as read
 */
export function markRead(itemId: string): boolean {
  const item = feedItems.get(itemId);
  if (!item) return false;
  item.read = true;
  return true;
}

/**
 * Mark item as dismissed
 */
export function dismissItem(itemId: string): boolean {
  const item = feedItems.get(itemId);
  if (!item) return false;
  item.dismissed = true;
  return true;
}

/**
 * Get dashboard summary
 */
export function getDashboardSummary(): DashboardSummary {
  const stats = signalRegistry.getStats();
  const aggregations = aggregateByCategory();
  const topSignals = getTopSignals(5);
  const blocked = getBlockedPlans();
  const ready = getReadyForExecution();
  const executing = planRegistry.getActive();
  const allPlans = planRegistry.getAll();

  // Calculate health score
  const criticalCount = stats.byPriority['critical'] || 0;
  const highCount = stats.byPriority['high'] || 0;
  const blockedCount = blocked.length;

  let healthScore = 100;
  healthScore -= criticalCount * 15;
  healthScore -= highCount * 5;
  healthScore -= blockedCount * 3;
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Calculate revenue opportunity
  let revenueOpportunity = 0;
  for (const signal of signalRegistry.getAllSignals()) {
    if (signal.revenueImpact && signal.revenueImpact > 0) {
      revenueOpportunity += signal.revenueImpact;
    }
  }

  // Get top risks
  const topRisks = topSignals
    .filter(s => s.severity >= 60)
    .slice(0, 3)
    .map(s => ({ title: s.title, risk: s.severity, id: s.id }));

  // Count completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = allPlans.filter(
    p => p.status === 'completed' && p.completedAt && p.completedAt >= today
  ).length;

  // Count quick wins (simple, high score)
  const quickWins = allPlans.filter(p => {
    const candidate = p.metadata.sourceCandidate as any;
    return (
      p.status === 'draft' &&
      candidate?.complexity === 'simple' &&
      candidate?.priorityScore > 60
    );
  }).length;

  return {
    healthScore: Math.round(healthScore),
    signalsByCategory: stats.byCategory as Record<SignalCategory, number>,
    signalsByPriority: stats.byPriority as Record<SignalPriority, number>,
    pendingActions: allPlans.filter(p => p.status === 'draft').length,
    readyActions: ready.length,
    blockedActions: blockedCount,
    executingActions: executing.length,
    completedToday,
    revenueOpportunity: Math.round(revenueOpportunity),
    topRisks,
    quickWins,
    updatedAt: new Date(),
  };
}

/**
 * Get action queue
 */
export function getActionQueue(): QueueResponse {
  const allPlans = planRegistry.getAll();
  const items: QueueItem[] = [];

  let totalPending = 0;
  let totalReady = 0;
  let totalBlocked = 0;
  let estimatedTotalDuration = 0;

  for (const plan of allPlans) {
    if (plan.status === 'completed' || plan.status === 'cancelled' || plan.status === 'rolled_back') {
      continue;
    }

    const readiness = checkReadiness(plan);
    const candidate = plan.metadata.sourceCandidate as any;

    items.push({
      planId: plan.id,
      title: plan.title,
      actionType: plan.actionType,
      status: plan.status,
      readiness: readiness.status,
      priorityScore: candidate?.priorityScore || 50,
      estimatedDuration: plan.estimatedDurationSeconds,
      requiresApproval: plan.requiresApproval,
      approved: plan.approved,
      createdAt: plan.createdAt,
    });

    if (plan.status === 'draft') {
      if (readiness.status === 'blocked') {
        totalBlocked++;
      } else if (readiness.status === 'ready') {
        totalReady++;
        estimatedTotalDuration += plan.estimatedDurationSeconds;
      } else {
        totalPending++;
      }
    } else if (plan.status === 'ready') {
      totalReady++;
      estimatedTotalDuration += plan.estimatedDurationSeconds;
    }
  }

  // Sort by priority score
  items.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    items,
    totalPending,
    totalReady,
    totalBlocked,
    estimatedTotalDuration,
    generatedAt: new Date(),
  };
}

/**
 * Clear feed
 */
export function clearFeed(): void {
  feedItems.clear();
}
