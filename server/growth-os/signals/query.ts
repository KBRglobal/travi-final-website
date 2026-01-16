/**
 * Signal Query Engine
 *
 * Provides querying and filtering capabilities for signals.
 */

import type {
  NormalizedSignal,
  SignalQuery,
  SignalAggregation,
  EntitySignalSummary,
  SignalCategory,
  SignalPriority,
} from './types';
import { signalRegistry } from './registry';
import { isSignalsEnabled } from '../config';

/**
 * Query signals with filters
 */
export function querySignals(query: SignalQuery): NormalizedSignal[] {
  if (!isSignalsEnabled()) return [];

  let signals = signalRegistry.getAllSignals();

  // Apply filters
  if (query.sources && query.sources.length > 0) {
    signals = signals.filter(s => query.sources!.includes(s.source));
  }

  if (query.categories && query.categories.length > 0) {
    signals = signals.filter(s => query.categories!.includes(s.category));
  }

  if (query.priorities && query.priorities.length > 0) {
    signals = signals.filter(s => query.priorities!.includes(s.priority));
  }

  if (query.entityType) {
    signals = signals.filter(s => s.entityType === query.entityType);
  }

  if (query.entityId) {
    signals = signals.filter(s => s.entityId === query.entityId);
  }

  if (query.contentId) {
    signals = signals.filter(s => s.contentIds.includes(query.contentId!));
  }

  if (query.trafficSegment) {
    signals = signals.filter(s => s.trafficSegments.includes(query.trafficSegment!));
  }

  if (query.minSeverity !== undefined) {
    signals = signals.filter(s => s.severity >= query.minSeverity!);
  }

  if (query.minImpact !== undefined) {
    signals = signals.filter(s => s.impact >= query.minImpact!);
  }

  if (query.minFreshness !== undefined) {
    signals = signals.filter(s => s.freshness >= query.minFreshness!);
  }

  if (!query.includeAcknowledged) {
    signals = signals.filter(s => !s.acknowledged);
  }

  // Sort
  const sortBy = query.sortBy || 'severity';
  const sortOrder = query.sortOrder || 'desc';
  const multiplier = sortOrder === 'desc' ? -1 : 1;

  signals.sort((a, b) => {
    switch (sortBy) {
      case 'severity':
        return (a.severity - b.severity) * multiplier;
      case 'impact':
        return (a.impact - b.impact) * multiplier;
      case 'freshness':
        return (a.freshness - b.freshness) * multiplier;
      case 'createdAt':
        return (a.createdAt.getTime() - b.createdAt.getTime()) * multiplier;
      default:
        return 0;
    }
  });

  // Pagination
  const offset = query.offset || 0;
  const limit = query.limit || 100;

  return signals.slice(offset, offset + limit);
}

/**
 * Get top priority signals
 */
export function getTopSignals(limit = 10): NormalizedSignal[] {
  return querySignals({
    minFreshness: 20,
    sortBy: 'severity',
    sortOrder: 'desc',
    limit,
  });
}

/**
 * Get critical signals
 */
export function getCriticalSignals(): NormalizedSignal[] {
  return querySignals({
    priorities: ['critical'],
    minFreshness: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
}

/**
 * Get high-impact signals
 */
export function getHighImpactSignals(minImpact = 70): NormalizedSignal[] {
  return querySignals({
    minImpact,
    minFreshness: 20,
    sortBy: 'impact',
    sortOrder: 'desc',
  });
}

/**
 * Aggregate signals by category
 */
export function aggregateByCategory(): SignalAggregation[] {
  if (!isSignalsEnabled()) return [];

  const categories: SignalCategory[] = [
    'traffic', 'content', 'media', 'revenue', 'seo', 'aeo', 'ux', 'ops', 'governance', 'risk'
  ];

  const aggregations: SignalAggregation[] = [];

  for (const category of categories) {
    const signals = signalRegistry.getSignalsByCategory(category);

    if (signals.length === 0) continue;

    let totalSeverity = 0;
    let totalImpact = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const signal of signals) {
      totalSeverity += signal.severity;
      totalImpact += signal.impact;

      switch (signal.priority) {
        case 'critical': criticalCount++; break;
        case 'high': highCount++; break;
        case 'medium': mediumCount++; break;
        case 'low': lowCount++; break;
      }
    }

    aggregations.push({
      category,
      count: signals.length,
      avgSeverity: Math.round(totalSeverity / signals.length),
      avgImpact: Math.round(totalImpact / signals.length),
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    });
  }

  // Sort by count descending
  return aggregations.sort((a, b) => b.count - a.count);
}

/**
 * Get signal summary for an entity
 */
export function getEntitySummary(entityType: string, entityId: string): EntitySignalSummary | null {
  if (!isSignalsEnabled()) return null;

  const signals = signalRegistry.getSignalsByEntity(entityType, entityId);

  if (signals.length === 0) return null;

  let totalSeverity = 0;
  let totalImpact = 0;
  let totalRevenueImpact = 0;
  let topPriority: SignalPriority = 'info';

  const priorityOrder: SignalPriority[] = ['critical', 'high', 'medium', 'low', 'info'];

  for (const signal of signals) {
    totalSeverity += signal.severity;
    totalImpact += signal.impact;

    if (signal.revenueImpact !== null) {
      totalRevenueImpact += signal.revenueImpact;
    }

    // Track highest priority
    const signalIdx = priorityOrder.indexOf(signal.priority);
    const currentIdx = priorityOrder.indexOf(topPriority);
    if (signalIdx < currentIdx) {
      topPriority = signal.priority;
    }
  }

  return {
    entityType,
    entityId,
    totalSignals: signals.length,
    topPriority,
    avgSeverity: Math.round(totalSeverity / signals.length),
    avgImpact: Math.round(totalImpact / signals.length),
    estimatedRevenueImpact: totalRevenueImpact,
    signals,
  };
}

/**
 * Get content signal summary
 */
export function getContentSummary(contentId: string): EntitySignalSummary | null {
  if (!isSignalsEnabled()) return null;

  const signals = signalRegistry.getSignalsByContent(contentId);

  if (signals.length === 0) return null;

  let totalSeverity = 0;
  let totalImpact = 0;
  let totalRevenueImpact = 0;
  let topPriority: SignalPriority = 'info';

  const priorityOrder: SignalPriority[] = ['critical', 'high', 'medium', 'low', 'info'];

  for (const signal of signals) {
    totalSeverity += signal.severity;
    totalImpact += signal.impact;

    if (signal.revenueImpact !== null) {
      totalRevenueImpact += signal.revenueImpact;
    }

    const signalIdx = priorityOrder.indexOf(signal.priority);
    const currentIdx = priorityOrder.indexOf(topPriority);
    if (signalIdx < currentIdx) {
      topPriority = signal.priority;
    }
  }

  return {
    entityType: 'content',
    entityId: contentId,
    totalSignals: signals.length,
    topPriority,
    avgSeverity: Math.round(totalSeverity / signals.length),
    avgImpact: Math.round(totalImpact / signals.length),
    estimatedRevenueImpact: totalRevenueImpact,
    signals,
  };
}

/**
 * Search signals by text
 */
export function searchSignals(searchText: string, limit = 50): NormalizedSignal[] {
  if (!isSignalsEnabled()) return [];

  const lowerSearch = searchText.toLowerCase();
  const allSignals = signalRegistry.getAllSignals();

  const matches = allSignals.filter(signal => {
    return (
      signal.title.toLowerCase().includes(lowerSearch) ||
      signal.description.toLowerCase().includes(lowerSearch) ||
      signal.type.toLowerCase().includes(lowerSearch)
    );
  });

  // Sort by relevance (title matches first, then severity)
  matches.sort((a, b) => {
    const aInTitle = a.title.toLowerCase().includes(lowerSearch);
    const bInTitle = b.title.toLowerCase().includes(lowerSearch);

    if (aInTitle && !bInTitle) return -1;
    if (!aInTitle && bInTitle) return 1;
    return b.severity - a.severity;
  });

  return matches.slice(0, limit);
}

/**
 * Get signals requiring attention (fresh, high severity, unacknowledged)
 */
export function getAttentionRequired(): NormalizedSignal[] {
  return querySignals({
    priorities: ['critical', 'high'],
    minFreshness: 40,
    includeAcknowledged: false,
    sortBy: 'severity',
    sortOrder: 'desc',
    limit: 20,
  });
}

/**
 * Get signals with revenue impact
 */
export function getRevenueImpactSignals(): NormalizedSignal[] {
  if (!isSignalsEnabled()) return [];

  const allSignals = signalRegistry.getAllSignals();

  return allSignals
    .filter(s => s.revenueImpact !== null && s.revenueImpact !== 0)
    .sort((a, b) => Math.abs(b.revenueImpact!) - Math.abs(a.revenueImpact!));
}

/**
 * Get related signals for a given signal
 */
export function getRelatedSignals(signalId: string): NormalizedSignal[] {
  const signal = signalRegistry.getSignal(signalId);
  if (!signal) return [];

  const related: NormalizedSignal[] = [];

  // Get explicitly linked signals
  for (const relatedId of signal.relatedSignalIds) {
    const relatedSignal = signalRegistry.getSignal(relatedId);
    if (relatedSignal) {
      related.push(relatedSignal);
    }
  }

  // Get signals for same entity
  if (signal.entityId) {
    const entitySignals = signalRegistry.getSignalsByEntity(signal.entityType, signal.entityId);
    for (const s of entitySignals) {
      if (s.id !== signalId && !related.find(r => r.id === s.id)) {
        related.push(s);
      }
    }
  }

  // Get signals for same content
  for (const contentId of signal.contentIds) {
    const contentSignals = signalRegistry.getSignalsByContent(contentId);
    for (const s of contentSignals) {
      if (s.id !== signalId && !related.find(r => r.id === s.id)) {
        related.push(s);
      }
    }
  }

  return related;
}
