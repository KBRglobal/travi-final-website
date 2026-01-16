/**
 * Collision Resolver Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Decision, DecisionType } from '../types';
import { CollisionResolver } from '../conflicts/collision-resolver';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: `decision-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    bindingId: 'test-binding',
    type: 'TRIGGER_SEO_REWRITE' as DecisionType,
    category: 'supervised',
    authority: 'triggering',
    signal: {
      metricId: 'seo.average_position',
      value: 25,
      threshold: 10,
      condition: '> 10',
    },
    confidence: 85,
    dataSufficiency: 95,
    freshness: 2,
    status: 'pending',
    autopilotMode: 'supervised',
    createdAt: new Date(),
    impactedEntities: [{ type: 'content', id: 'content-123' }],
    ...overrides,
  };
}

// =============================================================================
// COLLISION DETECTION TESTS
// =============================================================================

describe('CollisionResolver', () => {
  let resolver: CollisionResolver;

  beforeEach(() => {
    resolver = new CollisionResolver();
  });

  describe('detectCollisions', () => {
    it('should detect same resource collision', () => {
      const decision1 = createMockDecision({
        id: 'decision-1',
        impactedEntities: [{ type: 'content', id: 'content-123' }],
      });

      const decision2 = createMockDecision({
        id: 'decision-2',
        impactedEntities: [{ type: 'content', id: 'content-123' }],
      });

      const collisions = resolver.detectCollisions(decision1, [decision2]);
      expect(collisions.length).toBe(1);
      expect(collisions[0].type).toBe('same_resource');
    });

    it('should detect opposite action collision', () => {
      const decision1 = createMockDecision({
        id: 'decision-1',
        type: 'FREEZE_AUTOMATION',
        impactedEntities: [{ type: 'system', id: 'system-1' }],
      });

      const decision2 = createMockDecision({
        id: 'decision-2',
        type: 'AUTO_SCALE_WORKERS',
        impactedEntities: [{ type: 'system', id: 'system-2' }],
      });

      const collisions = resolver.detectCollisions(decision1, [decision2]);
      expect(collisions.length).toBe(1);
      expect(collisions[0].type).toBe('opposite_actions');
    });

    it('should not detect collision for different resources', () => {
      const decision1 = createMockDecision({
        id: 'decision-1',
        impactedEntities: [{ type: 'content', id: 'content-123' }],
      });

      const decision2 = createMockDecision({
        id: 'decision-2',
        impactedEntities: [{ type: 'content', id: 'content-456' }],
      });

      const collisions = resolver.detectCollisions(decision1, [decision2]);
      expect(collisions.length).toBe(0);
    });
  });

  describe('resolveCollision', () => {
    it('should resolve by authority - blocking wins over triggering', () => {
      const blocking = createMockDecision({
        id: 'blocking-decision',
        authority: 'blocking',
        type: 'BLOCK_PUBLISH',
      });

      const triggering = createMockDecision({
        id: 'triggering-decision',
        authority: 'triggering',
        type: 'TRIGGER_SEO_REWRITE',
      });

      const collision = {
        id: 'col-1',
        type: 'same_resource' as const,
        decisions: [blocking, triggering],
        detectedAt: new Date(),
      };

      const resolution = resolver.resolveCollision(collision);
      expect(resolution.winner.id).toBe('blocking-decision');
      expect(resolution.rule).toBe('AUTHORITY_HIERARCHY');
    });

    it('should resolve by confidence when same authority', () => {
      const highConfidence = createMockDecision({
        id: 'high-confidence',
        authority: 'triggering',
        confidence: 95,
      });

      const lowConfidence = createMockDecision({
        id: 'low-confidence',
        authority: 'triggering',
        confidence: 70,
      });

      const collision = {
        id: 'col-2',
        type: 'same_resource' as const,
        decisions: [highConfidence, lowConfidence],
        detectedAt: new Date(),
      };

      const resolution = resolver.resolveCollision(collision);
      expect(resolution.winner.id).toBe('high-confidence');
      expect(resolution.rule).toBe('CONFIDENCE_WINS');
    });

    it('should prefer blocking action over non-blocking', () => {
      const blockAction = createMockDecision({
        id: 'block-action',
        authority: 'triggering',
        type: 'BLOCK_PUBLISH',
        confidence: 80,
      });

      const triggerAction = createMockDecision({
        id: 'trigger-action',
        authority: 'triggering',
        type: 'TRIGGER_SEO_REWRITE',
        confidence: 80,
      });

      const collision = {
        id: 'col-3',
        type: 'opposite_actions' as const,
        decisions: [blockAction, triggerAction],
        detectedAt: new Date(),
      };

      const resolution = resolver.resolveCollision(collision);
      expect(resolution.winner.id).toBe('block-action');
      expect(resolution.rule).toBe('BLOCKING_WINS');
    });
  });

  describe('resolveAll', () => {
    it('should resolve multiple decisions correctly', () => {
      const blocking = createMockDecision({
        id: 'decision-blocking',
        authority: 'blocking',
        impactedEntities: [{ type: 'content', id: 'content-1' }],
      });

      const triggering1 = createMockDecision({
        id: 'decision-triggering-1',
        authority: 'triggering',
        impactedEntities: [{ type: 'content', id: 'content-1' }],
      });

      const triggering2 = createMockDecision({
        id: 'decision-triggering-2',
        authority: 'triggering',
        impactedEntities: [{ type: 'content', id: 'content-2' }],
      });

      const result = resolver.resolveAll([blocking, triggering1, triggering2]);

      expect(result.executable).toContain(blocking);
      expect(result.executable).toContain(triggering2);
      expect(result.deferred).toContain(triggering1);
    });

    it('should prioritize by authority then confidence', () => {
      const decisions = [
        createMockDecision({
          id: 'low-auth-high-conf',
          authority: 'advisory',
          confidence: 99,
        }),
        createMockDecision({
          id: 'high-auth-low-conf',
          authority: 'blocking',
          confidence: 60,
        }),
      ];

      const result = resolver.resolveAll(decisions);

      // Blocking authority should come first even with lower confidence
      expect(result.executable[0].id).toBe('high-auth-low-conf');
    });
  });

  describe('canExecute', () => {
    it('should return true when no collisions', () => {
      const decision = createMockDecision({
        impactedEntities: [{ type: 'content', id: 'unique-content' }],
      });

      const result = resolver.canExecute(decision, []);
      expect(result.canExecute).toBe(true);
    });

    it('should return false when blocked by higher authority', () => {
      const newDecision = createMockDecision({
        id: 'new-decision',
        authority: 'triggering',
        impactedEntities: [{ type: 'content', id: 'content-1' }],
      });

      const existingDecision = createMockDecision({
        id: 'existing-decision',
        authority: 'blocking',
        impactedEntities: [{ type: 'content', id: 'content-1' }],
      });

      const result = resolver.canExecute(newDecision, [existingDecision]);
      expect(result.canExecute).toBe(false);
      expect(result.blockedBy?.id).toBe('existing-decision');
    });

    it('should return true when new decision has higher authority', () => {
      const newDecision = createMockDecision({
        id: 'new-decision',
        authority: 'blocking',
        impactedEntities: [{ type: 'content', id: 'content-1' }],
      });

      const existingDecision = createMockDecision({
        id: 'existing-decision',
        authority: 'triggering',
        impactedEntities: [{ type: 'content', id: 'content-1' }],
      });

      const result = resolver.canExecute(newDecision, [existingDecision]);
      expect(result.canExecute).toBe(true);
    });
  });

  describe('conflict analysis', () => {
    it('should track collision history', () => {
      const decision1 = createMockDecision({ id: 'd1' });
      const decision2 = createMockDecision({ id: 'd2' });

      const collision = {
        id: 'col-1',
        type: 'same_resource' as const,
        decisions: [decision1, decision2],
        detectedAt: new Date(),
      };

      resolver.resolveCollision(collision);

      const history = resolver.getCollisionHistory();
      expect(history.length).toBe(1);
    });

    it('should analyze conflict patterns', () => {
      // Add some collisions
      for (let i = 0; i < 5; i++) {
        const collision = {
          id: `col-${i}`,
          type: 'same_resource' as const,
          decisions: [
            createMockDecision({ id: `d${i}a` }),
            createMockDecision({ id: `d${i}b` }),
          ],
          detectedAt: new Date(),
        };
        resolver.resolveCollision(collision);
      }

      const analysis = resolver.analyzeConflictPatterns();
      expect(analysis.totalCollisions).toBe(5);
      expect(analysis.autoResolvedRate).toBe(100);
    });
  });
});
