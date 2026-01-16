/**
 * Integration Tests
 * Tests the full flow: signal → decision → approval → execution
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Decision, DecisionType } from '../types';
import { DecisionEngine } from '../engine/decision-engine';
import { BindingsRegistry } from '../engine/bindings-registry';
import { AdapterRegistry } from '../adapters/adapter-registry';
import { CollisionResolver } from '../conflicts/collision-resolver';
import { UnifiedAutopilotGate } from '../governance/unified-autopilot';
import type { MetricData } from '../engine';

// =============================================================================
// INTEGRATION TEST SUITE
// =============================================================================

describe('Data Decisions Integration', () => {
  let decisionEngine: DecisionEngine;
  let bindingsRegistry: BindingsRegistry;
  let adapterRegistry: AdapterRegistry;
  let collisionResolver: CollisionResolver;
  let autopilotGate: UnifiedAutopilotGate;

  beforeEach(() => {
    decisionEngine = new DecisionEngine({ autopilotMode: 'supervised' });
    bindingsRegistry = new BindingsRegistry();
    adapterRegistry = new AdapterRegistry();
    collisionResolver = new CollisionResolver();
    autopilotGate = new UnifiedAutopilotGate();
  });

  describe('Full Decision Flow', () => {
    it('should process signal → generate decision → queue for approval', () => {
      // 1. Create metric data that triggers a binding
      const metrics: MetricData[] = [
        {
          metricId: 'health.error_rate',
          currentValue: 0.08, // 8% - above 5% threshold
          dataPoints: 100,
          lastUpdated: new Date(),
          confidence: 90,
        },
      ];

      // 2. Process metrics
      const results = decisionEngine.processMetrics(metrics);

      // 3. Verify decision was generated
      expect(results.length).toBeGreaterThan(0);
      const decision = results[0].decision;
      expect(decision.type).toBe('BLOCK_ALL_DEPLOYMENTS');
      expect(decision.authority).toBe('blocking');
    });

    it('should execute approved decision through adapter', async () => {
      // 1. Create a decision
      const decision: Decision = {
        id: 'test-decision-flow',
        bindingId: 'BND-TRIG-002',
        type: 'TRIGGER_META_OPTIMIZATION',
        category: 'auto_execute',
        authority: 'triggering',
        signal: {
          metricId: 'seo.ctr',
          value: 0.005, // 0.5%
          threshold: 0.01,
          condition: '< 1%',
        },
        confidence: 85,
        dataSufficiency: 100,
        freshness: 1,
        status: 'approved',
        autopilotMode: 'supervised',
        createdAt: new Date(),
        impactedEntities: [{ type: 'content', id: 'test-content' }],
      };

      // 2. Check for collisions
      const canExecute = collisionResolver.canExecute(decision, []);
      expect(canExecute.canExecute).toBe(true);

      // 3. Execute through adapter registry
      const results = await adapterRegistry.executeDecision(decision, true);

      // 4. Verify execution
      expect(results.length).toBeGreaterThan(0);
      const result = results[0];
      expect('blocked' in result).toBe(false);
      if (!('blocked' in result)) {
        expect(result.status).toBe('dry_run');
        expect(result.adapter).toBe('seo-adapter');
      }
    });

    it('should block conflicting decisions', () => {
      const decision1: Decision = {
        id: 'decision-1',
        bindingId: 'test-1',
        type: 'BLOCK_PUBLISH',
        category: 'auto_execute',
        authority: 'blocking',
        signal: {
          metricId: 'content.quality_score',
          value: 20,
          threshold: 30,
          condition: '< 30',
        },
        confidence: 90,
        dataSufficiency: 100,
        freshness: 1,
        status: 'executed',
        autopilotMode: 'supervised',
        createdAt: new Date(),
        impactedEntities: [{ type: 'content', id: 'content-123' }],
      };

      const decision2: Decision = {
        id: 'decision-2',
        bindingId: 'test-2',
        type: 'TRIGGER_SEO_REWRITE',
        category: 'supervised',
        authority: 'triggering',
        signal: {
          metricId: 'seo.average_position',
          value: 25,
          threshold: 10,
          condition: '> 10',
        },
        confidence: 85,
        dataSufficiency: 100,
        freshness: 1,
        status: 'pending',
        autopilotMode: 'supervised',
        createdAt: new Date(),
        impactedEntities: [{ type: 'content', id: 'content-123' }],
      };

      // Decision 2 should be blocked because content-123 has a BLOCK_PUBLISH active
      const canExecute = collisionResolver.canExecute(decision2, [decision1]);
      expect(canExecute.canExecute).toBe(false);
      expect(canExecute.blockedBy?.id).toBe('decision-1');
    });
  });

  describe('Autopilot Gate Integration', () => {
    it('should block all execution when global autopilot is off', () => {
      // Global autopilot starts OFF by default
      const result = autopilotGate.checkGate('seo');
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toBe('global_disabled');
    });

    it('should allow execution when global and domain are enabled', () => {
      // Enable global autopilot
      autopilotGate.enableGlobal('supervised', 'test', 'integration test');

      // Enable domain
      autopilotGate.setDomainState('seo', 'supervised', true, 'test', 'integration test');

      const result = autopilotGate.checkGate('seo');
      expect(result.allowed).toBe(true);
      expect(result.effectiveMode).toBe('supervised');
    });

    it('should block all execution on emergency stop', () => {
      // Enable first
      autopilotGate.enableGlobal('full', 'test', 'test');

      // Trigger emergency stop
      autopilotGate.emergencyStop('test', 'critical error');

      const result = autopilotGate.checkGate('seo');
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toBe('emergency_stop');
    });
  });

  describe('Binding Registration', () => {
    it('should find bindings for metric', () => {
      const bindings = bindingsRegistry.getByMetric('health.error_rate');
      expect(bindings.length).toBeGreaterThan(0);
    });

    it('should filter by authority level', () => {
      const blockingBindings = bindingsRegistry.getBlocking();
      expect(blockingBindings.every(b => b.authority === 'blocking')).toBe(true);
    });

    it('should track cooldowns', () => {
      const binding = bindingsRegistry.getAll()[0];
      const originalId = binding.id;

      // Record execution
      bindingsRegistry.recordExecution(originalId);

      // Check cooldown for bindings with non-zero cooldown
      if (binding.cooldown > 0) {
        expect(bindingsRegistry.isOnCooldown(originalId)).toBe(true);
      }
    });
  });
});
