/**
 * Organizational Memory & RCA Engine - Actionable Learnings
 *
 * Generates prevention suggestions and recommendations.
 */

import { log } from '../lib/logger';
import { getAllRCAs } from './rca-engine';
import { queryPatterns } from './patterns';
import type { Learning, LearningCategory, LearningQuery, RCAResult, Pattern } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Learnings] ${msg}`, data),
};

// Bounded storage
const MAX_LEARNINGS = 300;

/**
 * Generate unique learning ID
 */
function generateLearningId(): string {
  return `learning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Learning storage
const learnings: Map<string, Learning> = new Map();

/**
 * Learning templates by cause category
 */
const LEARNING_TEMPLATES: Record<string, Partial<Learning>[]> = {
  infrastructure: [
    {
      category: 'prevention',
      title: 'Implement resource monitoring',
      recommendation: 'Add proactive monitoring for resource utilization',
      effort: 'medium',
      impact: 'high',
    },
    {
      category: 'detection',
      title: 'Configure alerting thresholds',
      recommendation: 'Set up alerts before resources reach critical levels',
      effort: 'low',
      impact: 'high',
    },
  ],
  configuration: [
    {
      category: 'prevention',
      title: 'Validate configuration changes',
      recommendation: 'Implement configuration validation in CI/CD',
      effort: 'medium',
      impact: 'high',
    },
    {
      category: 'policy',
      title: 'Require config review',
      recommendation: 'Add mandatory review for configuration changes',
      effort: 'low',
      impact: 'medium',
    },
  ],
  code: [
    {
      category: 'prevention',
      title: 'Enhance test coverage',
      recommendation: 'Add tests for edge cases that caused this issue',
      effort: 'medium',
      impact: 'high',
    },
    {
      category: 'detection',
      title: 'Add runtime checks',
      recommendation: 'Implement runtime assertions for critical paths',
      effort: 'medium',
      impact: 'medium',
    },
  ],
  dependency: [
    {
      category: 'architecture',
      title: 'Add failover handling',
      recommendation: 'Implement circuit breakers for external dependencies',
      effort: 'high',
      impact: 'high',
    },
    {
      category: 'monitoring',
      title: 'Monitor dependency health',
      recommendation: 'Add health checks for external dependencies',
      effort: 'low',
      impact: 'medium',
    },
  ],
  quality: [
    {
      category: 'prevention',
      title: 'Strengthen quality gates',
      recommendation: 'Increase thresholds for automated quality checks',
      effort: 'low',
      impact: 'medium',
    },
  ],
  content: [
    {
      category: 'prevention',
      title: 'Improve content validation',
      recommendation: 'Add additional content validation rules',
      effort: 'medium',
      impact: 'medium',
    },
  ],
};

/**
 * Pattern-based learning templates
 */
const PATTERN_LEARNING_TEMPLATES: Record<string, Partial<Learning>[]> = {
  repeated_failure: [
    {
      category: 'prevention',
      title: 'Address recurring issue root cause',
      recommendation: 'Investigate and fix the underlying issue causing repeated failures',
      effort: 'high',
      impact: 'high',
    },
    {
      category: 'monitoring',
      title: 'Add specific monitoring',
      recommendation: 'Create targeted monitoring for this failure pattern',
      effort: 'medium',
      impact: 'high',
    },
  ],
  slow_burn: [
    {
      category: 'architecture',
      title: 'Address technical debt',
      recommendation: 'Schedule technical debt reduction in affected area',
      effort: 'high',
      impact: 'high',
    },
    {
      category: 'monitoring',
      title: 'Trend monitoring',
      recommendation: 'Implement trend analysis to detect slow degradation',
      effort: 'medium',
      impact: 'medium',
    },
  ],
  escalation_chain: [
    {
      category: 'response',
      title: 'Improve incident response',
      recommendation: 'Review and enhance incident response procedures',
      effort: 'medium',
      impact: 'high',
    },
    {
      category: 'prevention',
      title: 'Add circuit breakers',
      recommendation: 'Implement circuit breakers to prevent cascade failures',
      effort: 'high',
      impact: 'high',
    },
  ],
};

/**
 * Generate learnings from RCA results
 */
function generateFromRCAs(rcas: RCAResult[]): Learning[] {
  const generated: Learning[] = [];

  for (const rca of rcas) {
    // Generate from primary cause
    const templates = LEARNING_TEMPLATES[rca.primaryCause.category] || [];
    for (const template of templates) {
      generated.push({
        id: generateLearningId(),
        category: template.category || 'prevention',
        title: template.title || 'Address root cause',
        description: `Based on ${rca.event.type}: ${rca.primaryCause.description}`,
        sourceEventIds: [rca.eventId],
        sourcePatternIds: [],
        recommendation: template.recommendation || 'Review and address root cause',
        effort: template.effort || 'medium',
        impact: template.impact || 'medium',
        priority: rca.event.severity === 'critical' ? 9 :
                  rca.event.severity === 'high' ? 7 : 5,
        status: 'proposed',
        createdAt: new Date(),
      });
    }

    // Generate from missed warnings
    if (rca.missedWarnings.length > 0) {
      generated.push({
        id: generateLearningId(),
        category: 'detection',
        title: 'Address monitoring gaps',
        description: `${rca.missedWarnings.length} warning(s) were missed before this incident`,
        sourceEventIds: [rca.eventId],
        sourcePatternIds: [],
        recommendation: 'Review and configure alerting for early warning signals',
        effort: 'medium',
        impact: 'high',
        priority: 8,
        status: 'proposed',
        createdAt: new Date(),
      });
    }

    // Generate from low detectability
    if (rca.detectabilityScore < 50) {
      generated.push({
        id: generateLearningId(),
        category: 'monitoring',
        title: 'Improve detection capabilities',
        description: `Detectability score was ${rca.detectabilityScore}/100`,
        sourceEventIds: [rca.eventId],
        sourcePatternIds: [],
        recommendation: 'Add monitoring and alerting to detect similar issues earlier',
        effort: 'medium',
        impact: 'high',
        priority: 7,
        status: 'proposed',
        createdAt: new Date(),
      });
    }
  }

  return generated;
}

/**
 * Generate learnings from patterns
 */
function generateFromPatterns(patterns: Pattern[]): Learning[] {
  const generated: Learning[] = [];

  for (const pattern of patterns) {
    const templates = PATTERN_LEARNING_TEMPLATES[pattern.type] || [];

    for (const template of templates) {
      generated.push({
        id: generateLearningId(),
        category: template.category || 'prevention',
        title: `${template.title} (${pattern.name})`,
        description: pattern.description,
        sourceEventIds: pattern.eventIds.slice(0, 5),
        sourcePatternIds: [pattern.id],
        recommendation: template.recommendation || 'Address pattern root cause',
        effort: template.effort || 'high',
        impact: template.impact || 'high',
        priority: pattern.severity === 'critical' ? 10 :
                  pattern.severity === 'high' ? 8 : 6,
        status: 'proposed',
        createdAt: new Date(),
      });
    }
  }

  return generated;
}

/**
 * Generate all learnings
 */
export function generateLearnings(): Learning[] {
  const rcas = getAllRCAs(20);
  const patterns = queryPatterns({ severity: ['high', 'critical'], limit: 10 });

  const rcaLearnings = generateFromRCAs(rcas);
  const patternLearnings = generateFromPatterns(patterns);

  const allNew = [...rcaLearnings, ...patternLearnings];

  // Deduplicate by title similarity
  const unique: Learning[] = [];
  for (const learning of allNew) {
    const similar = unique.find(
      l => l.title === learning.title || l.category === learning.category &&
           l.sourceEventIds.some(id => learning.sourceEventIds.includes(id))
    );

    if (!similar) {
      unique.push(learning);
      learnings.set(learning.id, learning);
    }
  }

  // Enforce limit
  if (learnings.size > MAX_LEARNINGS) {
    const implemented = Array.from(learnings.entries())
      .filter(([_, l]) => l.status === 'implemented')
      .sort((a, b) => (a[1].implementedAt?.getTime() || 0) - (b[1].implementedAt?.getTime() || 0))
      .slice(0, MAX_LEARNINGS / 4);

    for (const [id] of implemented) {
      learnings.delete(id);
    }
  }

  logger.info('Learnings generated', { new: unique.length, total: learnings.size });

  return unique;
}

/**
 * Get learning by ID
 */
export function getLearning(id: string): Learning | undefined {
  return learnings.get(id);
}

/**
 * Query learnings
 */
export function queryLearnings(query: LearningQuery = {}): Learning[] {
  let results = Array.from(learnings.values());

  if (query.categories?.length) {
    results = results.filter(l => query.categories!.includes(l.category));
  }

  if (query.status?.length) {
    results = results.filter(l => query.status!.includes(l.status));
  }

  if (query.minPriority) {
    results = results.filter(l => l.priority >= query.minPriority!);
  }

  // Sort by priority descending
  results.sort((a, b) => b.priority - a.priority);

  if (query.limit) {
    results = results.slice(0, query.limit);
  }

  return results;
}

/**
 * Get top priority learnings
 */
export function getTopLearnings(limit = 10): Learning[] {
  return queryLearnings({ status: ['proposed', 'accepted'], limit });
}

/**
 * Update learning status
 */
export function updateLearningStatus(
  id: string,
  status: Learning['status']
): Learning | undefined {
  const learning = learnings.get(id);
  if (!learning) return undefined;

  learning.status = status;
  if (status === 'implemented') {
    learning.implementedAt = new Date();
  }

  return learning;
}

/**
 * Get learning stats
 */
export function getLearningStats() {
  const all = Array.from(learnings.values());

  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const l of all) {
    byCategory[l.category] = (byCategory[l.category] || 0) + 1;
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
  }

  return {
    total: all.length,
    byCategory,
    byStatus,
    avgPriority: all.length > 0
      ? Math.round(all.reduce((sum, l) => sum + l.priority, 0) / all.length)
      : 0,
  };
}

/**
 * Clear all learnings
 */
export function clearLearnings(): void {
  learnings.clear();
}
