/**
 * Adapter Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Decision, DecisionType } from '../types';
import { SEOAdapter } from '../adapters/seo-adapter';
import { ContentAdapter } from '../adapters/content-adapter';
import { OpsAdapter } from '../adapters/ops-adapter';
import { NotificationAdapter } from '../adapters/notification-adapter';
import { AdapterRegistry } from '../adapters/adapter-registry';

// =============================================================================
// TEST HELPERS
// =============================================================================

function createMockDecision(overrides: Partial<Decision> = {}): Decision {
  return {
    id: 'test-decision-001',
    bindingId: 'test-binding-001',
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
// SEO ADAPTER TESTS
// =============================================================================

describe('SEOAdapter', () => {
  let adapter: SEOAdapter;

  beforeEach(() => {
    adapter = new SEOAdapter('/api/seo', { dryRunByDefault: true });
  });

  describe('canExecute', () => {
    it('should return true for supported actions', () => {
      const decision = createMockDecision({ type: 'TRIGGER_SEO_REWRITE' });
      expect(adapter.canExecute(decision)).toBe(true);
    });

    it('should return false for unsupported actions', () => {
      const decision = createMockDecision({ type: 'TRIGGER_CONTENT_REVIEW' });
      expect(adapter.canExecute(decision)).toBe(false);
    });

    it('should return false when adapter is disabled', () => {
      adapter.config.enabled = false;
      const decision = createMockDecision({ type: 'TRIGGER_SEO_REWRITE' });
      expect(adapter.canExecute(decision)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute dry run successfully', async () => {
      const decision = createMockDecision({ type: 'TRIGGER_SEO_REWRITE' });
      const result = await adapter.execute(decision, true);

      expect('blocked' in result).toBe(false);
      if (!('blocked' in result)) {
        expect(result.status).toBe('dry_run');
        expect(result.dryRun).toBe(true);
        expect(result.adapter).toBe('seo-adapter');
      }
    });

    it('should execute BLOCK_PUBLISH action', async () => {
      const decision = createMockDecision({ type: 'BLOCK_PUBLISH' });
      const result = await adapter.execute(decision, true);

      expect('blocked' in result).toBe(false);
      if (!('blocked' in result)) {
        expect(result.status).toBe('dry_run');
        expect(result.changes).toBeDefined();
      }
    });

    it('should execute INCREASE_CRAWL_PRIORITY action', async () => {
      const decision = createMockDecision({ type: 'INCREASE_CRAWL_PRIORITY' });
      const result = await adapter.execute(decision, true);

      expect('blocked' in result).toBe(false);
    });
  });

  describe('health', () => {
    it('should report healthy status', async () => {
      const health = await adapter.checkHealth();
      expect(health.status).toBe('healthy');
    });
  });
});

// =============================================================================
// CONTENT ADAPTER TESTS
// =============================================================================

describe('ContentAdapter', () => {
  let adapter: ContentAdapter;

  beforeEach(() => {
    adapter = new ContentAdapter('/api/content', { dryRunByDefault: true });
  });

  describe('canExecute', () => {
    it('should return true for BLOCK_PUBLISH', () => {
      const decision = createMockDecision({ type: 'BLOCK_PUBLISH' });
      expect(adapter.canExecute(decision)).toBe(true);
    });

    it('should return true for TRIGGER_CONTENT_REVIEW', () => {
      const decision = createMockDecision({ type: 'TRIGGER_CONTENT_REVIEW' });
      expect(adapter.canExecute(decision)).toBe(true);
    });

    it('should return false for SEO-only actions', () => {
      const decision = createMockDecision({ type: 'TRIGGER_SEO_REWRITE' });
      expect(adapter.canExecute(decision)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute TRIGGER_CONTENT_REFRESH', async () => {
      const decision = createMockDecision({ type: 'TRIGGER_CONTENT_REFRESH' });
      const result = await adapter.execute(decision, true);

      expect('blocked' in result).toBe(false);
      if (!('blocked' in result)) {
        expect(result.status).toBe('dry_run');
      }
    });
  });
});

// =============================================================================
// OPS ADAPTER TESTS
// =============================================================================

describe('OpsAdapter', () => {
  let adapter: OpsAdapter;

  beforeEach(() => {
    adapter = new OpsAdapter('/api/ops', { dryRunByDefault: true });
  });

  describe('canExecute', () => {
    it('should return true for BLOCK_ALL_DEPLOYMENTS', () => {
      const decision = createMockDecision({ type: 'BLOCK_ALL_DEPLOYMENTS' });
      expect(adapter.canExecute(decision)).toBe(true);
    });

    it('should return true for ROLLBACK_CHANGES', () => {
      const decision = createMockDecision({ type: 'ROLLBACK_CHANGES' });
      expect(adapter.canExecute(decision)).toBe(true);
    });

    it('should return true for AUTO_SCALE_WORKERS', () => {
      const decision = createMockDecision({ type: 'AUTO_SCALE_WORKERS' });
      expect(adapter.canExecute(decision)).toBe(true);
    });
  });

  describe('execute', () => {
    it('should execute FREEZE_AUTOMATION in dry run', async () => {
      const decision = createMockDecision({ type: 'FREEZE_AUTOMATION' });
      const result = await adapter.execute(decision, true);

      expect('blocked' in result).toBe(false);
      if (!('blocked' in result)) {
        expect(result.status).toBe('dry_run');
        expect(result.changes?.impact).toBeDefined();
      }
    });

    it('should assess impact of DISABLE_SYSTEM', async () => {
      const decision = createMockDecision({ type: 'DISABLE_SYSTEM' });
      const result = await adapter.execute(decision, true);

      expect('blocked' in result).toBe(false);
      if (!('blocked' in result)) {
        expect(result.changes?.impact).toBeDefined();
      }
    });
  });
});

// =============================================================================
// NOTIFICATION ADAPTER TESTS
// =============================================================================

describe('NotificationAdapter', () => {
  let adapter: NotificationAdapter;

  beforeEach(() => {
    adapter = new NotificationAdapter({ logOnly: true });
  });

  describe('canExecute', () => {
    it('should return true for ESCALATE_TO_HUMAN', () => {
      const decision = createMockDecision({ type: 'ESCALATE_TO_HUMAN' });
      expect(adapter.canExecute(decision)).toBe(true);
    });

    it('should return true for LOG_AND_MONITOR', () => {
      const decision = createMockDecision({ type: 'LOG_AND_MONITOR' });
      expect(adapter.canExecute(decision)).toBe(true);
    });
  });

  describe('execute', () => {
    it('should log notification in log-only mode', async () => {
      const decision = createMockDecision({
        type: 'ESCALATE_TO_HUMAN',
        escalation: {
          primary: 'seo-lead',
          channel: 'high',
          sla: '4h',
        },
      });
      const result = await adapter.execute(decision, false);

      expect('blocked' in result).toBe(false);
      if (!('blocked' in result)) {
        expect(result.status).toBe('success');
        expect(result.changes?.logged).toBe(true);
      }
    });

    it('should record notification in log', async () => {
      const decision = createMockDecision({ type: 'ESCALATE_TO_HUMAN' });
      await adapter.execute(decision, false);

      const log = adapter.getNotificationLog();
      expect(log.length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// ADAPTER REGISTRY TESTS
// =============================================================================

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry;

  beforeEach(() => {
    registry = new AdapterRegistry();
  });

  describe('getForAction', () => {
    it('should return SEO adapter for SEO actions', () => {
      const adapters = registry.getForAction('TRIGGER_SEO_REWRITE');
      expect(adapters.length).toBeGreaterThan(0);
      expect(adapters[0].id).toBe('seo-adapter');
    });

    it('should return Content adapter for content actions', () => {
      const adapters = registry.getForAction('TRIGGER_CONTENT_REVIEW');
      expect(adapters.length).toBeGreaterThan(0);
      expect(adapters[0].id).toBe('content-adapter');
    });

    it('should return multiple adapters for BLOCK_PUBLISH', () => {
      const adapters = registry.getForAction('BLOCK_PUBLISH');
      expect(adapters.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('executeDecision', () => {
    it('should execute decision through appropriate adapter', async () => {
      const decision = createMockDecision({ type: 'TRIGGER_SEO_REWRITE' });
      const results = await registry.executeDecision(decision, true);

      expect(results.length).toBeGreaterThan(0);
      expect('blocked' in results[0]).toBe(false);
    });

    it('should return empty for unsupported actions', async () => {
      const decision = createMockDecision({
        type: 'SOME_UNKNOWN_ACTION' as DecisionType,
      });
      const results = await registry.executeDecision(decision, true);

      expect(results.length).toBe(0);
    });
  });

  describe('health', () => {
    it('should check health of all adapters', async () => {
      const health = await registry.checkAllHealth();
      expect(health.size).toBeGreaterThan(0);
    });

    it('should provide health summary', () => {
      const summary = registry.getHealthSummary();
      expect(summary.total).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    it('should track execution statistics', async () => {
      const decision = createMockDecision({ type: 'TRIGGER_SEO_REWRITE' });
      await registry.executeDecision(decision, true);

      const stats = registry.getStatistics();
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });
  });
});
