/**
 * Unit Tests - Signal Registry & Normalization Layer
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

describe('Signal Normalizer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('normalizeScore', () => {
    it('should clamp scores to 0-100 range', async () => {
      const { normalizeScore } = await import(
        '../../../server/intelligence-hub/signals/normalizer'
      );

      expect(normalizeScore(-10, 'test')).toBe(0);
      expect(normalizeScore(150, 'test')).toBe(100);
      expect(normalizeScore(50, 'test')).toBe(50);
    });

    it('should apply source-specific scaling', async () => {
      const { normalizeScore } = await import(
        '../../../server/intelligence-hub/signals/normalizer'
      );

      // Incidents: severity 1-5 scaled to 0-100
      const incidentScore = normalizeScore(3, 'incidents');
      expect(incidentScore).toBeGreaterThan(0);
      expect(incidentScore).toBeLessThanOrEqual(100);
    });
  });

  describe('normalizeSeverity', () => {
    it('should map severity strings correctly', async () => {
      const { normalizeSeverity } = await import(
        '../../../server/intelligence-hub/signals/normalizer'
      );

      expect(normalizeSeverity('critical')).toBe('critical');
      expect(normalizeSeverity('CRITICAL')).toBe('critical');
      expect(normalizeSeverity('high')).toBe('high');
      expect(normalizeSeverity('warning')).toBe('medium');
      expect(normalizeSeverity('unknown')).toBe('low');
    });

    it('should infer severity from score when not provided', async () => {
      const { normalizeSeverity } = await import(
        '../../../server/intelligence-hub/signals/normalizer'
      );

      expect(normalizeSeverity(undefined, 95)).toBe('critical');
      expect(normalizeSeverity(undefined, 75)).toBe('high');
      expect(normalizeSeverity(undefined, 55)).toBe('medium');
      expect(normalizeSeverity(undefined, 30)).toBe('low');
    });
  });

  describe('inferCategory', () => {
    it('should infer category from source', async () => {
      const { inferCategory } = await import(
        '../../../server/intelligence-hub/signals/normalizer'
      );

      expect(inferCategory('incidents')).toBe('health');
      expect(inferCategory('cost-guards')).toBe('cost');
      expect(inferCategory('content-confidence')).toBe('quality');
      expect(inferCategory('revenue')).toBe('revenue');
      expect(inferCategory('unknown-source')).toBe('health');
    });
  });
});

describe('Signal Registry', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_INTELLIGENCE_HUB = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_INTELLIGENCE_HUB;
  });

  it('should initialize with enabled flag', async () => {
    const { getSignalRegistry, resetSignalRegistry } = await import(
      '../../../server/intelligence-hub/signals/registry'
    );

    resetSignalRegistry();
    const registry = getSignalRegistry();
    expect(registry.isEnabled()).toBe(true);
  });

  it('should be disabled when flag is not set', async () => {
    delete process.env.ENABLE_INTELLIGENCE_HUB;
    vi.resetModules();

    const { getSignalRegistry, resetSignalRegistry } = await import(
      '../../../server/intelligence-hub/signals/registry'
    );

    resetSignalRegistry();
    const registry = getSignalRegistry();
    expect(registry.isEnabled()).toBe(false);
  });

  it('should store and retrieve signals', async () => {
    const { getSignalRegistry, resetSignalRegistry } = await import(
      '../../../server/intelligence-hub/signals/registry'
    );
    const { createSignal } = await import(
      '../../../server/intelligence-hub/signals/normalizer'
    );

    resetSignalRegistry();
    const registry = getSignalRegistry();

    const signal = createSignal({
      source: 'incidents',
      severity: 'high',
      score: 80,
      reason: 'Test incident',
    });

    registry.ingestSignal(signal);

    const retrieved = registry.getSignal(signal.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(signal.id);
    expect(retrieved?.source).toBe('incidents');
  });

  it('should query signals with filters', async () => {
    const { getSignalRegistry, resetSignalRegistry } = await import(
      '../../../server/intelligence-hub/signals/registry'
    );
    const { createSignal } = await import(
      '../../../server/intelligence-hub/signals/normalizer'
    );

    resetSignalRegistry();
    const registry = getSignalRegistry();

    registry.ingestSignal(
      createSignal({
        source: 'incidents',
        severity: 'high',
        score: 80,
        reason: 'High severity',
      })
    );

    registry.ingestSignal(
      createSignal({
        source: 'cost-guards',
        severity: 'low',
        score: 30,
        reason: 'Low severity',
      })
    );

    const highSeverity = registry.querySignals({ severities: ['high'] });
    expect(highSeverity.length).toBe(1);
    expect(highSeverity[0].severity).toBe('high');

    const costSignals = registry.querySignals({ sources: ['cost-guards'] });
    expect(costSignals.length).toBe(1);
    expect(costSignals[0].source).toBe('cost-guards');
  });

  it('should enforce storage limits', async () => {
    const { getSignalRegistry, resetSignalRegistry } = await import(
      '../../../server/intelligence-hub/signals/registry'
    );
    const { createSignal } = await import(
      '../../../server/intelligence-hub/signals/normalizer'
    );

    resetSignalRegistry();
    const registry = getSignalRegistry();

    // Add many signals
    for (let i = 0; i < 100; i++) {
      registry.ingestSignal(
        createSignal({
          source: 'incidents',
          severity: 'medium',
          score: 50,
          reason: `Signal ${i}`,
        })
      );
    }

    const stats = registry.getStats();
    expect(stats.totalSignals).toBeLessThanOrEqual(10000); // MAX_SIGNALS
  });

  it('should batch ingest signals', async () => {
    const { getSignalRegistry, resetSignalRegistry } = await import(
      '../../../server/intelligence-hub/signals/registry'
    );
    const { createSignal } = await import(
      '../../../server/intelligence-hub/signals/normalizer'
    );

    resetSignalRegistry();
    const registry = getSignalRegistry();

    const signals = [
      createSignal({ source: 'incidents', severity: 'high', score: 80, reason: 'One' }),
      createSignal({ source: 'incidents', severity: 'medium', score: 50, reason: 'Two' }),
    ];

    registry.ingestBatch(signals, 'test-adapter');

    const all = registry.querySignals({});
    expect(all.length).toBe(2);
  });
});
