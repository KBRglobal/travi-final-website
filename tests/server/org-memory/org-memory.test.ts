/**
 * Unit Tests - Organizational Memory & RCA Engine
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

describe('Memory Repository', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ORG_MEMORY = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_ORG_MEMORY;
  });

  it('should initialize with enabled flag', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );

    resetMemoryRepository();
    const repo = getMemoryRepository();
    expect(repo.isEnabled()).toBe(true);
  });

  it('should record events', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );

    resetMemoryRepository();
    const repo = getMemoryRepository();

    const event = repo.record({
      type: 'incident',
      title: 'Test Incident',
      description: 'A test incident',
      occurredAt: new Date(),
      severity: 'high',
      affectedSystems: ['infrastructure'],
      signals: [],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    expect(event.id).toBeDefined();
    expect(event.title).toBe('Test Incident');
  });

  it('should get event by ID', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );

    resetMemoryRepository();
    const repo = getMemoryRepository();

    const event = repo.record({
      type: 'incident',
      title: 'Test Event',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'medium',
      affectedSystems: ['content'],
      signals: [],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    const retrieved = repo.get(event.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(event.id);
  });

  it('should resolve event', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );

    resetMemoryRepository();
    const repo = getMemoryRepository();

    const event = repo.record({
      type: 'incident',
      title: 'To Resolve',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'low',
      affectedSystems: ['search'],
      signals: [],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    const resolved = repo.resolve(event.id);

    expect(resolved).toBeDefined();
    expect(resolved?.resolvedAt).toBeDefined();
    expect(resolved?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should query events', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );

    resetMemoryRepository();
    const repo = getMemoryRepository();

    repo.record({
      type: 'incident',
      title: 'High Severity',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'high',
      affectedSystems: ['infrastructure'],
      signals: [],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    repo.record({
      type: 'rollback',
      title: 'Low Severity',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'low',
      affectedSystems: ['publishing'],
      signals: [],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    const highSeverity = repo.query({ severity: ['high'] });
    expect(highSeverity.length).toBe(1);

    const incidents = repo.query({ types: ['incident'] });
    expect(incidents.length).toBe(1);
  });

  it('should get unresolved events', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );

    resetMemoryRepository();
    const repo = getMemoryRepository();

    repo.record({
      type: 'incident',
      title: 'Unresolved',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'medium',
      affectedSystems: ['content'],
      signals: [],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    const unresolved = repo.getUnresolved();
    expect(unresolved.length).toBe(1);
    expect(unresolved[0].resolvedAt).toBeUndefined();
  });

  it('should get events needing RCA', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );

    resetMemoryRepository();
    const repo = getMemoryRepository();

    const event = repo.record({
      type: 'incident',
      title: 'Needs RCA',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'critical',
      affectedSystems: ['infrastructure'],
      signals: [],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    repo.resolve(event.id);

    const needingRCA = repo.getNeedingRCA();
    expect(needingRCA.length).toBe(1);
  });

  it('should get stats', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );

    resetMemoryRepository();
    const repo = getMemoryRepository();

    const stats = repo.getStats();

    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byType');
    expect(stats).toHaveProperty('bySeverity');
    expect(stats).toHaveProperty('unresolved');
  });
});

describe('RCA Engine', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ORG_MEMORY = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_ORG_MEMORY;
  });

  it('should run RCA on event', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );
    const { runRCA, clearRCAs } = await import(
      '../../../server/org-memory/rca-engine'
    );

    resetMemoryRepository();
    clearRCAs();

    const repo = getMemoryRepository();
    const event = repo.record({
      type: 'incident',
      title: 'Test RCA',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'high',
      affectedSystems: ['infrastructure'],
      signals: ['signal-1'],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    repo.resolve(event.id);

    const rca = runRCA(event.id);

    expect(rca).toBeDefined();
    expect(rca?.eventId).toBe(event.id);
    expect(rca?.primaryCause).toBeDefined();
    expect(rca?.preventabilityScore).toBeGreaterThanOrEqual(0);
    expect(rca?.preventabilityScore).toBeLessThanOrEqual(100);
  });

  it('should return null for non-existent event', async () => {
    const { runRCA, clearRCAs } = await import(
      '../../../server/org-memory/rca-engine'
    );

    clearRCAs();

    const result = runRCA('non-existent');
    expect(result).toBeNull();
  });

  it('should detect missed warnings', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );
    const { runRCA, clearRCAs } = await import(
      '../../../server/org-memory/rca-engine'
    );

    resetMemoryRepository();
    clearRCAs();

    const repo = getMemoryRepository();
    const event = repo.record({
      type: 'incident',
      title: 'Critical Incident',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'critical',
      affectedSystems: ['infrastructure'],
      signals: ['signal-1', 'signal-2'],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    repo.resolve(event.id);

    const rca = runRCA(event.id);

    expect(rca?.missedWarnings.length).toBeGreaterThan(0);
  });

  it('should calculate scores', async () => {
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );
    const { runRCA, clearRCAs } = await import(
      '../../../server/org-memory/rca-engine'
    );

    resetMemoryRepository();
    clearRCAs();

    const repo = getMemoryRepository();
    const event = repo.record({
      type: 'incident',
      title: 'Score Test',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'medium',
      affectedSystems: ['content'],
      signals: [],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });

    repo.resolve(event.id);

    const rca = runRCA(event.id);

    expect(rca?.preventabilityScore).toBeDefined();
    expect(rca?.detectabilityScore).toBeDefined();
    expect(rca?.responseScore).toBeDefined();
  });

  it('should get RCA stats', async () => {
    const { getRCAStats } = await import(
      '../../../server/org-memory/rca-engine'
    );

    const stats = getRCAStats();

    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('avgPreventability');
    expect(stats).toHaveProperty('avgDetectability');
  });
});

describe('Pattern Detection', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ORG_MEMORY = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_ORG_MEMORY;
  });

  it('should detect patterns', async () => {
    const { detectPatterns, clearPatterns } = await import(
      '../../../server/org-memory/patterns'
    );

    clearPatterns();

    const detected = detectPatterns();
    expect(Array.isArray(detected)).toBe(true);
  });

  it('should query patterns', async () => {
    const { queryPatterns, clearPatterns } = await import(
      '../../../server/org-memory/patterns'
    );

    clearPatterns();

    const results = queryPatterns({ limit: 10 });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should get active patterns', async () => {
    const { getActivePatterns, clearPatterns } = await import(
      '../../../server/org-memory/patterns'
    );

    clearPatterns();

    const active = getActivePatterns();
    expect(Array.isArray(active)).toBe(true);
  });

  it('should get pattern stats', async () => {
    const { getPatternStats, clearPatterns } = await import(
      '../../../server/org-memory/patterns'
    );

    clearPatterns();

    const stats = getPatternStats();

    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byType');
    expect(stats).toHaveProperty('bySeverity');
  });
});

describe('Learnings', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ORG_MEMORY = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_ORG_MEMORY;
  });

  it('should generate learnings', async () => {
    const { generateLearnings, clearLearnings } = await import(
      '../../../server/org-memory/learnings'
    );

    clearLearnings();

    const generated = generateLearnings();
    expect(Array.isArray(generated)).toBe(true);
  });

  it('should query learnings', async () => {
    const { queryLearnings, clearLearnings } = await import(
      '../../../server/org-memory/learnings'
    );

    clearLearnings();

    const results = queryLearnings({ limit: 10 });
    expect(Array.isArray(results)).toBe(true);
  });

  it('should get top learnings', async () => {
    const { getTopLearnings, clearLearnings } = await import(
      '../../../server/org-memory/learnings'
    );

    clearLearnings();

    const top = getTopLearnings(5);
    expect(Array.isArray(top)).toBe(true);
    expect(top.length).toBeLessThanOrEqual(5);
  });

  it('should update learning status', async () => {
    const { generateLearnings, updateLearningStatus, getLearning, clearLearnings } = await import(
      '../../../server/org-memory/learnings'
    );
    const { getMemoryRepository, resetMemoryRepository } = await import(
      '../../../server/org-memory/repository'
    );
    const { runRCA, clearRCAs } = await import(
      '../../../server/org-memory/rca-engine'
    );

    resetMemoryRepository();
    clearRCAs();
    clearLearnings();

    // Create an event to generate learnings from
    const repo = getMemoryRepository();
    const event = repo.record({
      type: 'incident',
      title: 'Learning Source',
      description: 'Test',
      occurredAt: new Date(),
      severity: 'critical',
      affectedSystems: ['infrastructure'],
      signals: ['sig-1'],
      decisions: [],
      metadata: {},
      rcaComplete: false,
    });
    repo.resolve(event.id);
    runRCA(event.id);

    const generated = generateLearnings();

    if (generated.length > 0) {
      const learning = generated[0];
      const updated = updateLearningStatus(learning.id, 'accepted');

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('accepted');
    }
  });

  it('should get learning stats', async () => {
    const { getLearningStats, clearLearnings } = await import(
      '../../../server/org-memory/learnings'
    );

    clearLearnings();

    const stats = getLearningStats();

    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('byCategory');
    expect(stats).toHaveProperty('byStatus');
  });
});
