/**
 * Tests for Experimentation / A-B Test Engine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock environment before imports
vi.stubEnv('ENABLE_EXPERIMENTS', 'true');

import {
  computeAssignmentHash,
  selectVariant,
  evaluateAudienceFilter,
  createExperiment,
  getExperiment,
  updateExperimentStatus,
  listExperiments,
  getActiveExperiments,
  getAssignment,
  recordMetricEvent,
  getMetricEvents,
  calculateExperimentResults,
  getExperimentationStatus,
  clearExperimentationData,
} from '../../../server/experimentation/engine';
import { isExperimentationEnabled, EXPERIMENTATION_CONFIG } from '../../../server/experimentation/config';
import type { ExperimentVariant, AudienceFilter } from '../../../server/experimentation/types';

describe('Experimentation Engine', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_EXPERIMENTS', 'true');
    clearExperimentationData();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearExperimentationData();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is set to true', () => {
      vi.stubEnv('ENABLE_EXPERIMENTS', 'true');
      expect(isExperimentationEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_EXPERIMENTS', '');
      expect(isExperimentationEnabled()).toBe(false);
    });

    it('should be disabled when env is set to false', () => {
      vi.stubEnv('ENABLE_EXPERIMENTS', 'false');
      expect(isExperimentationEnabled()).toBe(false);
    });
  });

  describe('computeAssignmentHash', () => {
    it('should return deterministic hash for same inputs', () => {
      const hash1 = computeAssignmentHash('user-123', 'exp-abc');
      const hash2 = computeAssignmentHash('user-123', 'exp-abc');
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different users', () => {
      const hash1 = computeAssignmentHash('user-123', 'exp-abc');
      const hash2 = computeAssignmentHash('user-456', 'exp-abc');
      expect(hash1).not.toBe(hash2);
    });

    it('should return different hashes for different experiments', () => {
      const hash1 = computeAssignmentHash('user-123', 'exp-abc');
      const hash2 = computeAssignmentHash('user-123', 'exp-xyz');
      expect(hash1).not.toBe(hash2);
    });

    it('should return value between 1 and 100', () => {
      for (let i = 0; i < 100; i++) {
        const hash = computeAssignmentHash(`user-${i}`, 'test-exp');
        expect(hash).toBeGreaterThanOrEqual(1);
        expect(hash).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('selectVariant', () => {
    const variants: ExperimentVariant[] = [
      { id: 'control', name: 'Control', weight: 50, isControl: true, config: {} },
      { id: 'variant-a', name: 'Variant A', weight: 30, isControl: false, config: {} },
      { id: 'variant-b', name: 'Variant B', weight: 20, isControl: false, config: {} },
    ];

    it('should return null for empty variants', () => {
      expect(selectVariant(50, [])).toBeNull();
    });

    it('should select variant based on hash value', () => {
      // Hash 1-50 should be control (weight 50)
      const v1 = selectVariant(25, variants);
      expect(v1?.id).toBe('control');

      // Hash 51-80 should be variant-a (weight 30)
      const v2 = selectVariant(65, variants);
      expect(v2?.id).toBe('variant-a');

      // Hash 81-100 should be variant-b (weight 20)
      const v3 = selectVariant(95, variants);
      expect(v3?.id).toBe('variant-b');
    });

    it('should handle edge cases at boundaries', () => {
      const v1 = selectVariant(1, variants);
      expect(v1).not.toBeNull();

      const v2 = selectVariant(100, variants);
      expect(v2).not.toBeNull();
    });
  });

  describe('evaluateAudienceFilter', () => {
    it('should return true for no filter', () => {
      expect(evaluateAudienceFilter(undefined, { userId: 'test' })).toBe(true);
    });

    it('should return true for empty conditions', () => {
      const filter: AudienceFilter = { conditions: [], matchType: 'all' };
      expect(evaluateAudienceFilter(filter, { userId: 'test' })).toBe(true);
    });

    it('should evaluate equals operator', () => {
      const filter: AudienceFilter = {
        conditions: [{ attribute: 'country', operator: 'equals', value: 'US' }],
        matchType: 'all',
      };

      expect(evaluateAudienceFilter(filter, {
        userId: 'test',
        attributes: { country: 'US' },
      })).toBe(true);

      expect(evaluateAudienceFilter(filter, {
        userId: 'test',
        attributes: { country: 'UK' },
      })).toBe(false);
    });

    it('should evaluate in operator', () => {
      const filter: AudienceFilter = {
        conditions: [{ attribute: 'tier', operator: 'in', value: ['gold', 'platinum'] }],
        matchType: 'all',
      };

      expect(evaluateAudienceFilter(filter, {
        userId: 'test',
        attributes: { tier: 'gold' },
      })).toBe(true);

      expect(evaluateAudienceFilter(filter, {
        userId: 'test',
        attributes: { tier: 'silver' },
      })).toBe(false);
    });

    it('should handle matchType all', () => {
      const filter: AudienceFilter = {
        conditions: [
          { attribute: 'country', operator: 'equals', value: 'US' },
          { attribute: 'tier', operator: 'equals', value: 'gold' },
        ],
        matchType: 'all',
      };

      expect(evaluateAudienceFilter(filter, {
        userId: 'test',
        attributes: { country: 'US', tier: 'gold' },
      })).toBe(true);

      expect(evaluateAudienceFilter(filter, {
        userId: 'test',
        attributes: { country: 'US', tier: 'silver' },
      })).toBe(false);
    });

    it('should handle matchType any', () => {
      const filter: AudienceFilter = {
        conditions: [
          { attribute: 'country', operator: 'equals', value: 'US' },
          { attribute: 'tier', operator: 'equals', value: 'gold' },
        ],
        matchType: 'any',
      };

      expect(evaluateAudienceFilter(filter, {
        userId: 'test',
        attributes: { country: 'UK', tier: 'gold' },
      })).toBe(true);
    });
  });

  describe('Experiment Management', () => {
    const validExperiment = {
      name: 'Test Experiment',
      description: 'A test experiment',
      status: 'draft' as const,
      variants: [
        { id: 'control', name: 'Control', weight: 50, isControl: true, config: {} },
        { id: 'variant', name: 'Variant', weight: 50, isControl: false, config: {} },
      ],
      metrics: [
        { id: 'conv', name: 'Conversion', type: 'conversion' as const, eventName: 'convert', aggregation: 'count' as const, isPrimary: true },
      ],
    };

    it('should create an experiment', () => {
      const experiment = createExperiment(validExperiment);
      expect(experiment.id).toBeDefined();
      expect(experiment.name).toBe('Test Experiment');
      expect(experiment.status).toBe('draft');
      expect(experiment.createdAt).toBeInstanceOf(Date);
    });

    it('should reject experiments with invalid weights', () => {
      expect(() => createExperiment({
        ...validExperiment,
        variants: [
          { id: 'control', name: 'Control', weight: 30, isControl: true, config: {} },
          { id: 'variant', name: 'Variant', weight: 50, isControl: false, config: {} },
        ],
      })).toThrow('Variant weights must sum to 100');
    });

    it('should reject experiments without control', () => {
      expect(() => createExperiment({
        ...validExperiment,
        variants: [
          { id: 'a', name: 'A', weight: 50, isControl: false, config: {} },
          { id: 'b', name: 'B', weight: 50, isControl: false, config: {} },
        ],
      })).toThrow('Experiment must have exactly one control variant');
    });

    it('should get an experiment by id', () => {
      const created = createExperiment(validExperiment);
      const retrieved = getExperiment(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should update experiment status', () => {
      const created = createExperiment(validExperiment);
      const updated = updateExperimentStatus(created.id, 'running');
      expect(updated?.status).toBe('running');
      expect(updated?.startDate).toBeInstanceOf(Date);
    });

    it('should list experiments', () => {
      createExperiment(validExperiment);
      createExperiment({ ...validExperiment, name: 'Second Experiment' });

      const all = listExperiments();
      expect(all.length).toBe(2);
    });

    it('should filter experiments by status', () => {
      const exp1 = createExperiment(validExperiment);
      createExperiment({ ...validExperiment, name: 'Second' });
      updateExperimentStatus(exp1.id, 'running');

      const running = listExperiments('running');
      expect(running.length).toBe(1);

      const draft = listExperiments('draft');
      expect(draft.length).toBe(1);
    });
  });

  describe('Assignment', () => {
    it('should assign user to running experiment', () => {
      const experiment = createExperiment({
        name: 'Assignment Test',
        status: 'draft',
        variants: [
          { id: 'control', name: 'Control', weight: 50, isControl: true, config: {} },
          { id: 'variant', name: 'Variant', weight: 50, isControl: false, config: {} },
        ],
        metrics: [
          { id: 'm1', name: 'Metric', type: 'conversion', eventName: 'conv', aggregation: 'count', isPrimary: true },
        ],
      });
      updateExperimentStatus(experiment.id, 'running');

      const assignment = getAssignment(experiment.id, { userId: 'user-123' });
      expect(assignment).not.toBeNull();
      expect(assignment?.userId).toBe('user-123');
      expect(assignment?.experimentId).toBe(experiment.id);
    });

    it('should return same assignment for same user', () => {
      const experiment = createExperiment({
        name: 'Consistent Assignment Test',
        status: 'draft',
        variants: [
          { id: 'control', name: 'Control', weight: 50, isControl: true, config: {} },
          { id: 'variant', name: 'Variant', weight: 50, isControl: false, config: {} },
        ],
        metrics: [
          { id: 'm1', name: 'Metric', type: 'conversion', eventName: 'conv', aggregation: 'count', isPrimary: true },
        ],
      });
      updateExperimentStatus(experiment.id, 'running');

      const a1 = getAssignment(experiment.id, { userId: 'user-123' });
      const a2 = getAssignment(experiment.id, { userId: 'user-123' });
      expect(a1?.variantId).toBe(a2?.variantId);
    });

    it('should not assign to non-running experiment', () => {
      const experiment = createExperiment({
        name: 'Draft Experiment',
        status: 'draft',
        variants: [
          { id: 'control', name: 'Control', weight: 50, isControl: true, config: {} },
          { id: 'variant', name: 'Variant', weight: 50, isControl: false, config: {} },
        ],
        metrics: [
          { id: 'm1', name: 'Metric', type: 'conversion', eventName: 'conv', aggregation: 'count', isPrimary: true },
        ],
      });

      const assignment = getAssignment(experiment.id, { userId: 'user-123' });
      expect(assignment).toBeNull();
    });
  });

  describe('Metrics', () => {
    it('should record metric events', () => {
      recordMetricEvent({
        experimentId: 'exp-1',
        variantId: 'control',
        userId: 'user-1',
        metricId: 'conv',
        value: 1,
      });

      const events = getMetricEvents('exp-1');
      expect(events.length).toBe(1);
      expect(events[0].value).toBe(1);
    });

    it('should filter metric events by metricId', () => {
      recordMetricEvent({
        experimentId: 'exp-1',
        variantId: 'control',
        userId: 'user-1',
        metricId: 'conv',
        value: 1,
      });
      recordMetricEvent({
        experimentId: 'exp-1',
        variantId: 'control',
        userId: 'user-1',
        metricId: 'click',
        value: 1,
      });

      const convEvents = getMetricEvents('exp-1', 'conv');
      expect(convEvents.length).toBe(1);

      const allEvents = getMetricEvents('exp-1');
      expect(allEvents.length).toBe(2);
    });
  });

  describe('Results', () => {
    it('should calculate experiment results', () => {
      const experiment = createExperiment({
        name: 'Results Test',
        status: 'draft',
        variants: [
          { id: 'control', name: 'Control', weight: 50, isControl: true, config: {} },
          { id: 'variant', name: 'Variant', weight: 50, isControl: false, config: {} },
        ],
        metrics: [
          { id: 'conv', name: 'Conversion', type: 'conversion', eventName: 'conv', aggregation: 'count', isPrimary: true },
        ],
      });
      updateExperimentStatus(experiment.id, 'running');

      // Assign users
      getAssignment(experiment.id, { userId: 'user-1' });
      getAssignment(experiment.id, { userId: 'user-2' });

      const results = calculateExperimentResults(experiment.id);
      expect(results).not.toBeNull();
      expect(results?.experimentId).toBe(experiment.id);
      expect(results?.totalParticipants).toBe(2);
    });

    it('should return null for non-existent experiment', () => {
      const results = calculateExperimentResults('non-existent');
      expect(results).toBeNull();
    });
  });

  describe('Status', () => {
    it('should return experimentation status', () => {
      const status = getExperimentationStatus();
      expect(status.enabled).toBe(true);
      expect(status.config.maxActiveExperiments).toBe(EXPERIMENTATION_CONFIG.maxActiveExperiments);
    });

    it('should track active experiments count', () => {
      const exp = createExperiment({
        name: 'Active Test',
        status: 'draft',
        variants: [
          { id: 'control', name: 'Control', weight: 50, isControl: true, config: {} },
          { id: 'variant', name: 'Variant', weight: 50, isControl: false, config: {} },
        ],
        metrics: [
          { id: 'm1', name: 'Metric', type: 'conversion', eventName: 'conv', aggregation: 'count', isPrimary: true },
        ],
      });

      expect(getExperimentationStatus().activeExperiments).toBe(0);

      updateExperimentStatus(exp.id, 'running');
      expect(getExperimentationStatus().activeExperiments).toBe(1);
    });
  });
});
