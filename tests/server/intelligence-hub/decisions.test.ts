/**
 * Unit Tests - Decision Trace Engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the logger
vi.mock('../../../server/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock signal registry
vi.mock('../../../server/intelligence-hub/signals/registry', () => ({
  getSignalRegistry: () => ({
    querySignals: vi.fn().mockReturnValue([]),
    isEnabled: () => true,
  }),
}));

describe('Causal Chain Builder', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_DECISION_EXPLAINABILITY = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_DECISION_EXPLAINABILITY;
  });

  it('should build causal chain from signals', async () => {
    const { buildCausalChain } = await import(
      '../../../server/intelligence-hub/decisions/causal-chain'
    );

    const signals = [
      {
        id: 'sig-1',
        source: 'content-confidence',
        category: 'quality',
        entityType: 'content',
        entityId: 'test-entity',
        severity: 'high',
        score: 85,
        reason: 'High quality content',
        details: {},
        timestamp: new Date(),
      },
    ];

    const chain = buildCausalChain(signals as any);

    expect(chain.causes).toHaveLength(1);
    expect(chain.causes[0].signalId).toBe('sig-1');
    expect(chain.totalConfidence).toBeGreaterThan(0);
    expect(chain.totalConfidence).toBeLessThanOrEqual(100);
  });

  it('should add additional causes', async () => {
    const { buildCausalChain } = await import(
      '../../../server/intelligence-hub/decisions/causal-chain'
    );

    const signals: any[] = [];
    const additionalCauses = [
      {
        type: 'rule' as const,
        source: 'business-rule',
        description: 'Manual override applied',
        weight: 80,
      },
    ];

    const chain = buildCausalChain(signals, additionalCauses);

    expect(chain.causes).toHaveLength(1);
    expect(chain.causes[0].source).toBe('business-rule');
  });

  it('should calculate weighted confidence', async () => {
    const { buildCausalChain } = await import(
      '../../../server/intelligence-hub/decisions/causal-chain'
    );

    const signals = [
      {
        id: 'sig-1',
        source: 'content-confidence',
        category: 'quality',
        entityType: 'content',
        entityId: 'test',
        severity: 'high',
        score: 90,
        reason: 'High score',
        details: {},
        timestamp: new Date(),
      },
      {
        id: 'sig-2',
        source: 'data-integrity',
        category: 'health',
        entityType: 'content',
        entityId: 'test',
        severity: 'low',
        score: 30,
        reason: 'Low score',
        details: {},
        timestamp: new Date(),
      },
    ];

    const chain = buildCausalChain(signals as any);

    expect(chain.causes).toHaveLength(2);
    expect(chain.totalConfidence).toBeGreaterThan(0);
  });

  it('should generate human-readable summary', async () => {
    const { generateChainSummary } = await import(
      '../../../server/intelligence-hub/decisions/causal-chain'
    );

    const chain = {
      causes: [
        {
          type: 'signal' as const,
          signalId: 'sig-1',
          source: 'content-confidence',
          description: 'High quality score',
          weight: 80,
        },
      ],
      totalConfidence: 80,
    };

    const summary = generateChainSummary(chain);

    expect(summary).toContain('content-confidence');
  });
});

describe('Decision Repository', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_DECISION_EXPLAINABILITY = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_DECISION_EXPLAINABILITY;
  });

  it('should store and retrieve decisions', async () => {
    const { getDecisionRepository, resetDecisionRepository } = await import(
      '../../../server/intelligence-hub/decisions/repository'
    );

    resetDecisionRepository();
    const repo = getDecisionRepository();

    const trace = {
      id: 'trace-1',
      decision: {
        type: 'content_regenerated' as const,
        outcome: 'success' as const,
        entityId: 'entity-1',
        entityType: 'content' as const,
        timestamp: new Date(),
        context: {},
      },
      causalChain: {
        causes: [],
        totalConfidence: 50,
      },
      relatedSignals: [],
      summary: 'Content was regenerated',
      recommendations: [],
      confidence: 50,
    };

    repo.store(trace);

    const retrieved = repo.get('trace-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('trace-1');
  });

  it('should query decisions with filters', async () => {
    const { getDecisionRepository, resetDecisionRepository } = await import(
      '../../../server/intelligence-hub/decisions/repository'
    );

    resetDecisionRepository();
    const repo = getDecisionRepository();

    repo.store({
      id: 'trace-1',
      decision: {
        type: 'publish_blocked',
        outcome: 'blocked',
        entityId: 'entity-1',
        entityType: 'content',
        timestamp: new Date(),
        context: {},
      },
      causalChain: { causes: [], totalConfidence: 70 },
      relatedSignals: [],
      summary: 'Publish blocked',
      recommendations: [],
      confidence: 70,
    });

    repo.store({
      id: 'trace-2',
      decision: {
        type: 'content_regenerated',
        outcome: 'success',
        entityId: 'entity-2',
        entityType: 'content',
        timestamp: new Date(),
        context: {},
      },
      causalChain: { causes: [], totalConfidence: 50 },
      relatedSignals: [],
      summary: 'Content regenerated',
      recommendations: [],
      confidence: 50,
    });

    const blocked = repo.query({ types: ['publish_blocked'] });
    expect(blocked).toHaveLength(1);
    expect(blocked[0].decision.type).toBe('publish_blocked');

    const highConfidence = repo.query({ minConfidence: 60 });
    expect(highConfidence).toHaveLength(1);
  });

  it('should get decisions by entity', async () => {
    const { getDecisionRepository, resetDecisionRepository } = await import(
      '../../../server/intelligence-hub/decisions/repository'
    );

    resetDecisionRepository();
    const repo = getDecisionRepository();

    repo.store({
      id: 'trace-1',
      decision: {
        type: 'publish_blocked',
        outcome: 'blocked',
        entityId: 'entity-A',
        entityType: 'content',
        timestamp: new Date(),
        context: {},
      },
      causalChain: { causes: [], totalConfidence: 70 },
      relatedSignals: [],
      summary: 'Blocked',
      recommendations: [],
      confidence: 70,
    });

    const decisions = repo.getByEntity('entity-A');
    expect(decisions).toHaveLength(1);

    const noDecisions = repo.getByEntity('entity-B');
    expect(noDecisions).toHaveLength(0);
  });

  it('should enforce storage limits', async () => {
    const { getDecisionRepository, resetDecisionRepository } = await import(
      '../../../server/intelligence-hub/decisions/repository'
    );

    resetDecisionRepository();
    const repo = getDecisionRepository();

    // Store many decisions
    for (let i = 0; i < 100; i++) {
      repo.store({
        id: `trace-${i}`,
        decision: {
          type: 'content_regenerated',
          outcome: 'success',
          entityId: `entity-${i}`,
          entityType: 'content',
          timestamp: new Date(),
          context: {},
        },
        causalChain: { causes: [], totalConfidence: 50 },
        relatedSignals: [],
        summary: `Decision ${i}`,
        recommendations: [],
        confidence: 50,
      });
    }

    const stats = repo.getStats();
    expect(stats.totalTraces).toBeLessThanOrEqual(1000); // MAX_TRACES
  });
});
