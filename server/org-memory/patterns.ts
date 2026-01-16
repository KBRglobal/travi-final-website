/**
 * Organizational Memory & RCA Engine - Pattern Detection
 *
 * Detects repeated failures, slow-burn issues, and escalation chains.
 */

import { log } from '../lib/logger';
import { getMemoryRepository } from './repository';
import type { Pattern, PatternType, PatternQuery, MemoryEvent } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[PatternDetector] ${msg}`, data),
};

// Bounded storage
const MAX_PATTERNS = 200;

/**
 * Generate unique pattern ID
 */
function generatePatternId(): string {
  return `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Pattern storage
const patterns: Map<string, Pattern> = new Map();

/**
 * Pattern detection thresholds
 */
const THRESHOLDS = {
  repeatedFailure: {
    minOccurrences: 3,
    windowMs: 7 * 24 * 3600000, // 7 days
  },
  slowBurn: {
    minOccurrences: 5,
    windowMs: 30 * 24 * 3600000, // 30 days
    gradualIncrease: true,
  },
  escalationChain: {
    severityProgression: ['low', 'medium', 'high', 'critical'],
    windowMs: 24 * 3600000, // 24 hours
  },
};

/**
 * Detect repeated failures
 */
function detectRepeatedFailures(events: MemoryEvent[]): Pattern[] {
  const detected: Pattern[] = [];
  const windowMs = THRESHOLDS.repeatedFailure.windowMs;
  const minOccurrences = THRESHOLDS.repeatedFailure.minOccurrences;
  const now = Date.now();

  // Group by type and affected systems
  const groups = new Map<string, MemoryEvent[]>();

  for (const event of events) {
    if (now - event.occurredAt.getTime() > windowMs) continue;

    const key = `${event.type}:${event.affectedSystems.sort().join(',')}`;
    const existing = groups.get(key) || [];
    existing.push(event);
    groups.set(key, existing);
  }

  // Check for patterns
  for (const [key, groupEvents] of groups.entries()) {
    if (groupEvents.length >= minOccurrences) {
      const [type, systems] = key.split(':');

      detected.push({
        id: generatePatternId(),
        type: 'repeated_failure',
        name: `Repeated ${type.replace('_', ' ')}`,
        description: `${groupEvents.length} occurrences of ${type} affecting ${systems} in the last 7 days`,
        firstDetected: groupEvents[groupEvents.length - 1].occurredAt,
        lastOccurrence: groupEvents[0].occurredAt,
        occurrenceCount: groupEvents.length,
        eventIds: groupEvents.map(e => e.id),
        severity: groupEvents.some(e => e.severity === 'critical') ? 'critical' :
                  groupEvents.some(e => e.severity === 'high') ? 'high' : 'medium',
        trend: 'worsening',
        affectedSystems: systems.split(','),
        commonCauses: [type],
      });
    }
  }

  return detected;
}

/**
 * Detect slow-burn issues
 */
function detectSlowBurnIssues(events: MemoryEvent[]): Pattern[] {
  const detected: Pattern[] = [];
  const windowMs = THRESHOLDS.slowBurn.windowMs;
  const minOccurrences = THRESHOLDS.slowBurn.minOccurrences;
  const now = Date.now();

  // Look for gradually increasing frequency
  const relevantEvents = events.filter(
    e => now - e.occurredAt.getTime() <= windowMs
  );

  if (relevantEvents.length < minOccurrences) {
    return detected;
  }

  // Group by affected system
  const bySystem = new Map<string, MemoryEvent[]>();
  for (const event of relevantEvents) {
    for (const system of event.affectedSystems) {
      const existing = bySystem.get(system) || [];
      existing.push(event);
      bySystem.set(system, existing);
    }
  }

  // Check for increasing frequency
  for (const [system, systemEvents] of bySystem.entries()) {
    if (systemEvents.length < minOccurrences) continue;

    // Check if events are getting more frequent
    const sorted = systemEvents.sort(
      (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()
    );

    let increasingFrequency = false;
    if (sorted.length >= 4) {
      const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
      const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

      const firstGap = (firstHalf[firstHalf.length - 1].occurredAt.getTime() -
                        firstHalf[0].occurredAt.getTime()) / firstHalf.length;
      const secondGap = (secondHalf[secondHalf.length - 1].occurredAt.getTime() -
                         secondHalf[0].occurredAt.getTime()) / secondHalf.length;

      increasingFrequency = secondGap < firstGap * 0.8;
    }

    if (increasingFrequency) {
      detected.push({
        id: generatePatternId(),
        type: 'slow_burn',
        name: `Slow-burn issue in ${system}`,
        description: `Gradually increasing issues in ${system} over the last 30 days`,
        firstDetected: sorted[0].occurredAt,
        lastOccurrence: sorted[sorted.length - 1].occurredAt,
        occurrenceCount: systemEvents.length,
        eventIds: systemEvents.map(e => e.id),
        severity: 'high',
        trend: 'worsening',
        affectedSystems: [system],
        commonCauses: ['resource_degradation', 'technical_debt'],
      });
    }
  }

  return detected;
}

/**
 * Detect escalation chains
 */
function detectEscalationChains(events: MemoryEvent[]): Pattern[] {
  const detected: Pattern[] = [];
  const windowMs = THRESHOLDS.escalationChain.windowMs;
  const severityOrder = THRESHOLDS.escalationChain.severityProgression;
  const now = Date.now();

  // Group events by time windows
  const recentEvents = events.filter(
    e => now - e.occurredAt.getTime() <= windowMs
  ).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  if (recentEvents.length < 2) {
    return detected;
  }

  // Look for severity escalation
  for (let i = 0; i < recentEvents.length - 1; i++) {
    const current = recentEvents[i];
    const chain: MemoryEvent[] = [current];

    for (let j = i + 1; j < recentEvents.length; j++) {
      const next = recentEvents[j];
      const currentSeverityIndex = severityOrder.indexOf(current.severity);
      const nextSeverityIndex = severityOrder.indexOf(next.severity);

      // Check if same system and escalating severity
      const sameSystem = current.affectedSystems.some(
        s => next.affectedSystems.includes(s)
      );

      if (sameSystem && nextSeverityIndex > currentSeverityIndex) {
        chain.push(next);
      }
    }

    if (chain.length >= 3) {
      const systems = [...new Set(chain.flatMap(e => e.affectedSystems))];

      detected.push({
        id: generatePatternId(),
        type: 'escalation_chain',
        name: 'Severity escalation detected',
        description: `Issues escalated from ${chain[0].severity} to ${chain[chain.length - 1].severity} in 24 hours`,
        firstDetected: chain[0].occurredAt,
        lastOccurrence: chain[chain.length - 1].occurredAt,
        occurrenceCount: chain.length,
        eventIds: chain.map(e => e.id),
        severity: 'critical',
        trend: 'worsening',
        affectedSystems: systems,
        commonCauses: ['cascade_failure', 'insufficient_response'],
      });
      break; // Only detect one escalation chain per run
    }
  }

  return detected;
}

/**
 * Run pattern detection
 */
export function detectPatterns(): Pattern[] {
  const repo = getMemoryRepository();
  const events = repo.query({ limit: 500 });

  const detected: Pattern[] = [
    ...detectRepeatedFailures(events),
    ...detectSlowBurnIssues(events),
    ...detectEscalationChains(events),
  ];

  // Store detected patterns
  for (const pattern of detected) {
    // Check if similar pattern exists
    const existing = Array.from(patterns.values()).find(
      p => p.type === pattern.type &&
           p.affectedSystems.every(s => pattern.affectedSystems.includes(s))
    );

    if (existing) {
      // Update existing pattern
      existing.lastOccurrence = pattern.lastOccurrence;
      existing.occurrenceCount = pattern.occurrenceCount;
      existing.eventIds = [...new Set([...existing.eventIds, ...pattern.eventIds])];
    } else {
      patterns.set(pattern.id, pattern);
    }
  }

  // Enforce limit
  if (patterns.size > MAX_PATTERNS) {
    const oldest = Array.from(patterns.entries())
      .sort((a, b) => a[1].lastOccurrence.getTime() - b[1].lastOccurrence.getTime())
      .slice(0, MAX_PATTERNS / 4);

    for (const [id] of oldest) {
      patterns.delete(id);
    }
  }

  logger.info('Pattern detection completed', { detected: detected.length });

  return detected;
}

/**
 * Get pattern by ID
 */
export function getPattern(id: string): Pattern | undefined {
  return patterns.get(id);
}

/**
 * Query patterns
 */
export function queryPatterns(query: PatternQuery = {}): Pattern[] {
  let results = Array.from(patterns.values());

  if (query.types?.length) {
    results = results.filter(p => query.types!.includes(p.type));
  }

  if (query.severity?.length) {
    results = results.filter(p => query.severity!.includes(p.severity));
  }

  if (query.affectedSystem) {
    results = results.filter(p => p.affectedSystems.includes(query.affectedSystem!));
  }

  if (query.minOccurrences) {
    results = results.filter(p => p.occurrenceCount >= query.minOccurrences!);
  }

  // Sort by last occurrence descending
  results.sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime());

  if (query.limit) {
    results = results.slice(0, query.limit);
  }

  return results;
}

/**
 * Get active patterns (worsening trend)
 */
export function getActivePatterns(): Pattern[] {
  return queryPatterns({ severity: ['high', 'critical'] }).filter(
    p => p.trend === 'worsening'
  );
}

/**
 * Get pattern stats
 */
export function getPatternStats() {
  const all = Array.from(patterns.values());

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const p of all) {
    byType[p.type] = (byType[p.type] || 0) + 1;
    bySeverity[p.severity] = (bySeverity[p.severity] || 0) + 1;
  }

  return {
    total: all.length,
    byType,
    bySeverity,
    worsening: all.filter(p => p.trend === 'worsening').length,
  };
}

/**
 * Clear all patterns
 */
export function clearPatterns(): void {
  patterns.clear();
}
