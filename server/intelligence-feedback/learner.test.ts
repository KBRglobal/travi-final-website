/**
 * System Intelligence Feedback Loop - Learner Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateTaskTypeConfidence,
  shouldAdjustWeight,
  calculateWeightAdjustment,
  getModel,
  resetModel,
} from './learner';
import {
  calculateImprovement,
  determineOutcome,
} from './tracker';
import { ConfidenceScore, MetricSnapshot } from './types';

describe('Intelligence Feedback Learner', () => {
  beforeEach(() => {
    resetModel();
  });

  describe('calculateImprovement', () => {
    it('should calculate positive improvement', () => {
      const before: MetricSnapshot = {
        timestamp: new Date(),
        healthScore: 50,
        revenueScore: 40,
      };

      const after: MetricSnapshot = {
        timestamp: new Date(),
        healthScore: 70,
        revenueScore: 60,
      };

      const improvement = calculateImprovement(before, after);
      expect(improvement).toBeGreaterThan(0);
    });

    it('should calculate negative improvement', () => {
      const before: MetricSnapshot = {
        timestamp: new Date(),
        healthScore: 70,
        revenueScore: 60,
      };

      const after: MetricSnapshot = {
        timestamp: new Date(),
        healthScore: 50,
        revenueScore: 40,
      };

      const improvement = calculateImprovement(before, after);
      expect(improvement).toBeLessThan(0);
    });

    it('should handle missing metrics gracefully', () => {
      const before: MetricSnapshot = {
        timestamp: new Date(),
        healthScore: 50,
      };

      const after: MetricSnapshot = {
        timestamp: new Date(),
        revenueScore: 60, // Different metric
      };

      const improvement = calculateImprovement(before, after);
      expect(improvement).toBe(0);
    });

    it('should be deterministic', () => {
      const before: MetricSnapshot = {
        timestamp: new Date(),
        healthScore: 50,
        linkScore: 40,
      };

      const after: MetricSnapshot = {
        timestamp: new Date(),
        healthScore: 60,
        linkScore: 55,
      };

      const improvement1 = calculateImprovement(before, after);
      const improvement2 = calculateImprovement(before, after);
      expect(improvement1).toBe(improvement2);
    });
  });

  describe('determineOutcome', () => {
    it('should classify positive improvement as success', () => {
      expect(determineOutcome(10)).toBe('success');
      expect(determineOutcome(15)).toBe('success');
    });

    it('should classify negative improvement as failure', () => {
      expect(determineOutcome(-10)).toBe('failure');
      expect(determineOutcome(-15)).toBe('failure');
    });

    it('should classify small changes as neutral', () => {
      expect(determineOutcome(3)).toBe('neutral');
      expect(determineOutcome(-3)).toBe('neutral');
      expect(determineOutcome(0)).toBe('neutral');
    });
  });

  describe('calculateTaskTypeConfidence', () => {
    it('should return zero confidence for unknown task types', () => {
      const confidence = calculateTaskTypeConfidence('non_existent_type');

      expect(confidence.sampleSize).toBe(0);
      expect(confidence.confidence).toBe(0);
      expect(confidence.successRate).toBe(0.5);
    });

    it('should return valid confidence structure', () => {
      const confidence = calculateTaskTypeConfidence('create_content');

      expect(confidence).toHaveProperty('taskType');
      expect(confidence).toHaveProperty('successRate');
      expect(confidence).toHaveProperty('averageImprovement');
      expect(confidence).toHaveProperty('sampleSize');
      expect(confidence).toHaveProperty('confidence');
      expect(confidence).toHaveProperty('lastUpdated');
    });
  });

  describe('shouldAdjustWeight', () => {
    it('should not adjust with low sample size', () => {
      const confidence: ConfidenceScore = {
        taskType: 'test',
        successRate: 0.9,
        averageImprovement: 15,
        sampleSize: 3, // Too low
        confidence: 0.8,
        lastUpdated: new Date(),
      };

      expect(shouldAdjustWeight(confidence)).toBe(false);
    });

    it('should not adjust with low confidence', () => {
      const confidence: ConfidenceScore = {
        taskType: 'test',
        successRate: 0.9,
        averageImprovement: 15,
        sampleSize: 20,
        confidence: 0.5, // Too low
        lastUpdated: new Date(),
      };

      expect(shouldAdjustWeight(confidence)).toBe(false);
    });

    it('should adjust with sufficient data and confidence', () => {
      const confidence: ConfidenceScore = {
        taskType: 'test',
        successRate: 0.9,
        averageImprovement: 15,
        sampleSize: 20,
        confidence: 0.8,
        lastUpdated: new Date(),
      };

      expect(shouldAdjustWeight(confidence)).toBe(true);
    });
  });

  describe('calculateWeightAdjustment', () => {
    it('should increase weight for high success rate', () => {
      const confidence: ConfidenceScore = {
        taskType: 'test',
        successRate: 0.85,
        averageImprovement: 10,
        sampleSize: 20,
        confidence: 0.8,
        lastUpdated: new Date(),
      };

      const newWeight = calculateWeightAdjustment(1.0, confidence);
      expect(newWeight).toBeGreaterThan(1.0);
    });

    it('should decrease weight for low success rate', () => {
      const confidence: ConfidenceScore = {
        taskType: 'test',
        successRate: 0.2,
        averageImprovement: -10,
        sampleSize: 20,
        confidence: 0.8,
        lastUpdated: new Date(),
      };

      const newWeight = calculateWeightAdjustment(1.0, confidence);
      expect(newWeight).toBeLessThan(1.0);
    });

    it('should not exceed maximum weight', () => {
      const confidence: ConfidenceScore = {
        taskType: 'test',
        successRate: 0.99,
        averageImprovement: 50,
        sampleSize: 100,
        confidence: 1.0,
        lastUpdated: new Date(),
      };

      const newWeight = calculateWeightAdjustment(1.8, confidence);
      expect(newWeight).toBeLessThanOrEqual(2.0);
    });

    it('should not go below minimum weight', () => {
      const confidence: ConfidenceScore = {
        taskType: 'test',
        successRate: 0.01,
        averageImprovement: -50,
        sampleSize: 100,
        confidence: 1.0,
        lastUpdated: new Date(),
      };

      const newWeight = calculateWeightAdjustment(0.2, confidence);
      expect(newWeight).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('getModel and resetModel', () => {
    it('should return current model state', () => {
      const model = getModel();

      expect(model).toHaveProperty('version');
      expect(model).toHaveProperty('taskTypeWeights');
      expect(model).toHaveProperty('signalWeights');
      expect(model).toHaveProperty('lastTrainedAt');
    });

    it('should reset model to defaults', () => {
      // Get initial state
      const initial = getModel();

      // Reset
      resetModel();
      const reset = getModel();

      expect(reset.version).toBe(1);
      expect(Object.values(reset.taskTypeWeights).every(w => w === 1.0)).toBe(true);
    });
  });
});
