/**
 * Experimentation / A-B Test Engine - Core Engine
 * Feature Flag: ENABLE_EXPERIMENTS=true
 */

import { createLogger } from '../lib/logger';
import { isExperimentationEnabled, EXPERIMENTATION_CONFIG } from './config';
import type {
  Experiment,
  ExperimentVariant,
  ExperimentStatus,
  ExperimentAssignment,
  AssignmentContext,
  MetricEvent,
  ExperimentResults,
  VariantMetricResult,
  AudienceFilter,
  ExperimentationStatus,
} from './types';

const logger = createLogger('experimentation-engine');

// ============================================================================
// In-Memory Storage (would be DB in production)
// ============================================================================

const experiments = new Map<string, Experiment>();
const assignments = new Map<string, ExperimentAssignment>(); // key: `${experimentId}:${userId}`
const metricEvents: MetricEvent[] = [];
const maxEvents = EXPERIMENTATION_CONFIG.eventBufferSize;

// ============================================================================
// Hash-Based Deterministic Assignment
// ============================================================================

/**
 * FNV-1a hash implementation for deterministic assignment
 */
function fnv1aHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash;
}

/**
 * Generate deterministic assignment based on user ID and experiment ID
 * This ensures the same user always gets the same variant for an experiment
 */
export function computeAssignmentHash(
  userId: string,
  experimentId: string,
  seed: string = EXPERIMENTATION_CONFIG.hashSeed
): number {
  const input = `${seed}:${experimentId}:${userId}`;
  const hash = fnv1aHash(input);
  return (hash % 100) + 1; // Returns 1-100
}

/**
 * Select variant based on hash value and variant weights
 */
export function selectVariant(
  hashValue: number,
  variants: ExperimentVariant[]
): ExperimentVariant | null {
  if (variants.length === 0) return null;

  // Sort variants by weight descending for consistent ordering
  const sortedVariants = [...variants].sort((a, b) => b.weight - a.weight);

  let cumulativeWeight = 0;
  for (const variant of sortedVariants) {
    cumulativeWeight += variant.weight;
    if (hashValue <= cumulativeWeight) {
      return variant;
    }
  }

  // Fallback to last variant
  return sortedVariants[sortedVariants.length - 1];
}

// ============================================================================
// Audience Targeting
// ============================================================================

export function evaluateAudienceFilter(
  filter: AudienceFilter | undefined,
  context: AssignmentContext
): boolean {
  if (!filter || filter.conditions.length === 0) {
    return true; // No filter means everyone is included
  }

  const attributes = context.attributes || {};

  const results = filter.conditions.map((condition) => {
    const value = attributes[condition.attribute];
    if (value === undefined) return false;

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'not_contains':
        return !String(value).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value as never);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(value as never);
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  });

  return filter.matchType === 'all'
    ? results.every(Boolean)
    : results.some(Boolean);
}

// ============================================================================
// Experiment Management
// ============================================================================

export function createExperiment(
  data: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>
): Experiment {
  const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date();

  const experiment: Experiment = {
    ...data,
    id,
    createdAt: now,
    updatedAt: now,
  };

  // Validate variant weights sum to 100
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight !== 100) {
    throw new Error(`Variant weights must sum to 100, got ${totalWeight}`);
  }

  // Ensure exactly one control variant
  const controls = experiment.variants.filter((v) => v.isControl);
  if (controls.length !== 1) {
    throw new Error(`Experiment must have exactly one control variant, got ${controls.length}`);
  }

  experiments.set(id, experiment);
  logger.info({ experimentId: id, name: experiment.name }, 'Experiment created');

  return experiment;
}

export function getExperiment(experimentId: string): Experiment | null {
  return experiments.get(experimentId) || null;
}

export function updateExperimentStatus(
  experimentId: string,
  status: ExperimentStatus
): Experiment | null {
  const experiment = experiments.get(experimentId);
  if (!experiment) return null;

  const updated = {
    ...experiment,
    status,
    updatedAt: new Date(),
    ...(status === 'running' && !experiment.startDate ? { startDate: new Date() } : {}),
    ...(status === 'completed' ? { endDate: new Date() } : {}),
  };

  experiments.set(experimentId, updated);
  logger.info({ experimentId, status }, 'Experiment status updated');

  return updated;
}

export function listExperiments(status?: ExperimentStatus): Experiment[] {
  const all = Array.from(experiments.values());
  if (status) {
    return all.filter((e) => e.status === status);
  }
  return all;
}

export function getActiveExperiments(): Experiment[] {
  return listExperiments('running');
}

// ============================================================================
// Assignment
// ============================================================================

export function getAssignment(
  experimentId: string,
  context: AssignmentContext
): ExperimentAssignment | null {
  if (!isExperimentationEnabled()) {
    return null;
  }

  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== 'running') {
    return null;
  }

  // Check audience targeting
  if (!evaluateAudienceFilter(experiment.targetAudience, context)) {
    return null;
  }

  const key = `${experimentId}:${context.userId}`;

  // Check for existing assignment
  const existing = assignments.get(key);
  if (existing) {
    return existing;
  }

  // Compute new assignment
  const hashValue = computeAssignmentHash(context.userId, experimentId);
  const variant = selectVariant(hashValue, experiment.variants);

  if (!variant) {
    return null;
  }

  const assignment: ExperimentAssignment = {
    experimentId,
    variantId: variant.id,
    userId: context.userId,
    assignedAt: new Date(),
    context: context.attributes,
  };

  assignments.set(key, assignment);
  logger.debug({ experimentId, userId: context.userId, variantId: variant.id }, 'User assigned to variant');

  return assignment;
}

export function getAssignmentForUser(
  userId: string,
  experimentIds?: string[]
): ExperimentAssignment[] {
  const result: ExperimentAssignment[] = [];
  const targetExperiments = experimentIds || Array.from(experiments.keys());

  for (const experimentId of targetExperiments) {
    const key = `${experimentId}:${userId}`;
    const assignment = assignments.get(key);
    if (assignment) {
      result.push(assignment);
    }
  }

  return result;
}

// ============================================================================
// Metric Collection
// ============================================================================

export function recordMetricEvent(event: Omit<MetricEvent, 'timestamp'>): void {
  if (!isExperimentationEnabled()) {
    return;
  }

  const fullEvent: MetricEvent = {
    ...event,
    timestamp: new Date(),
  };

  // Ring buffer behavior
  if (metricEvents.length >= maxEvents) {
    metricEvents.shift();
  }
  metricEvents.push(fullEvent);

  logger.debug(
    { experimentId: event.experimentId, metricId: event.metricId },
    'Metric event recorded'
  );
}

export function getMetricEvents(
  experimentId: string,
  metricId?: string
): MetricEvent[] {
  return metricEvents.filter(
    (e) =>
      e.experimentId === experimentId &&
      (!metricId || e.metricId === metricId)
  );
}

// ============================================================================
// Results Calculation
// ============================================================================

export function calculateExperimentResults(experimentId: string): ExperimentResults | null {
  const experiment = experiments.get(experimentId);
  if (!experiment) {
    return null;
  }

  const experimentEvents = getMetricEvents(experimentId);
  const experimentAssignments = Array.from(assignments.values()).filter(
    (a) => a.experimentId === experimentId
  );

  const variantParticipants = new Map<string, Set<string>>();
  for (const assignment of experimentAssignments) {
    if (!variantParticipants.has(assignment.variantId)) {
      variantParticipants.set(assignment.variantId, new Set());
    }
    variantParticipants.get(assignment.variantId)!.add(assignment.userId);
  }

  const metricsResults = experiment.metrics.map((metric) => {
    const metricEvents = experimentEvents.filter((e) => e.metricId === metric.id);

    const variantResults: VariantMetricResult[] = experiment.variants.map((variant) => {
      const variantEvents = metricEvents.filter((e) => e.variantId === variant.id);
      const participants = variantParticipants.get(variant.id) || new Set();
      const uniqueConverters = new Set(variantEvents.map((e) => e.userId));

      const sampleSize = participants.size;
      const conversions = uniqueConverters.size;
      const totalValue = variantEvents.reduce((sum, e) => sum + e.value, 0);

      return {
        variantId: variant.id,
        variantName: variant.name,
        sampleSize,
        conversions,
        conversionRate: sampleSize > 0 ? conversions / sampleSize : 0,
        totalValue,
        averageValue: conversions > 0 ? totalValue / conversions : 0,
      };
    });

    // Determine winner (highest conversion rate among non-control with enough sample)
    const minSample = EXPERIMENTATION_CONFIG.defaultSampleSize;
    const eligibleVariants = variantResults.filter((v) => v.sampleSize >= minSample);
    const control = experiment.variants.find((v) => v.isControl);
    const controlResult = variantResults.find((v) => v.variantId === control?.id);

    let winner: string | undefined;
    if (controlResult && eligibleVariants.length > 1) {
      const best = eligibleVariants
        .filter((v) => v.variantId !== control?.id)
        .sort((a, b) => b.conversionRate - a.conversionRate)[0];

      if (best && best.conversionRate > controlResult.conversionRate) {
        winner = best.variantId;
      }
    }

    return {
      metricId: metric.id,
      metricName: metric.name,
      metricType: metric.type,
      isPrimary: metric.isPrimary,
      variants: variantResults,
      winner,
    };
  });

  return {
    experimentId,
    experimentName: experiment.name,
    status: experiment.status,
    startDate: experiment.startDate,
    endDate: experiment.endDate,
    totalParticipants: experimentAssignments.length,
    metrics: metricsResults,
    analyzedAt: new Date(),
  };
}

// ============================================================================
// Engine Status
// ============================================================================

export function getExperimentationStatus(): ExperimentationStatus {
  return {
    enabled: isExperimentationEnabled(),
    activeExperiments: getActiveExperiments().length,
    totalAssignments: assignments.size,
    totalEvents: metricEvents.length,
    config: {
      maxActiveExperiments: EXPERIMENTATION_CONFIG.maxActiveExperiments,
      defaultSampleSize: EXPERIMENTATION_CONFIG.defaultSampleSize,
      significanceThreshold: EXPERIMENTATION_CONFIG.significanceThreshold,
    },
  };
}

// ============================================================================
// Clear (for testing)
// ============================================================================

export function clearExperimentationData(): void {
  experiments.clear();
  assignments.clear();
  metricEvents.length = 0;
  logger.info('Experimentation data cleared');
}
