/**
 * Unit Tests - Executive Intelligence Summary
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

// Mock correlation
vi.mock('../../../server/intelligence-hub/correlation', () => ({
  runCorrelationAnalysis: vi.fn().mockResolvedValue({ correlations: [], anomalies: [] }),
  getActiveAnomalies: vi.fn().mockReturnValue([]),
  getStrongCorrelations: vi.fn().mockReturnValue([]),
}));

describe('Risk Scoring', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should score risks from signals', async () => {
    const { scoreRisks } = await import(
      '../../../server/intelligence-hub/executive/risk-scoring'
    );

    const risks = scoreRisks();
    expect(Array.isArray(risks)).toBe(true);
  });

  it('should get top risks', async () => {
    const { getTopRisks } = await import(
      '../../../server/intelligence-hub/executive/risk-scoring'
    );

    const topRisks = getTopRisks(5);
    expect(Array.isArray(topRisks)).toBe(true);
    expect(topRisks.length).toBeLessThanOrEqual(5);
  });

  it('should sort risks by score descending', async () => {
    const { scoreRisks } = await import(
      '../../../server/intelligence-hub/executive/risk-scoring'
    );

    const risks = scoreRisks();

    for (let i = 1; i < risks.length; i++) {
      expect(risks[i - 1].score).toBeGreaterThanOrEqual(risks[i].score);
    }
  });
});

describe('Opportunity Detection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should detect opportunities from signals', async () => {
    const { detectOpportunities } = await import(
      '../../../server/intelligence-hub/executive/opportunities'
    );

    const opportunities = detectOpportunities();
    expect(Array.isArray(opportunities)).toBe(true);
  });

  it('should get top opportunities', async () => {
    const { getTopOpportunities } = await import(
      '../../../server/intelligence-hub/executive/opportunities'
    );

    const topOpportunities = getTopOpportunities(5);
    expect(Array.isArray(topOpportunities)).toBe(true);
    expect(topOpportunities.length).toBeLessThanOrEqual(5);
  });

  it('should get quick wins', async () => {
    const { getQuickWins } = await import(
      '../../../server/intelligence-hub/executive/opportunities'
    );

    const quickWins = getQuickWins();
    expect(Array.isArray(quickWins)).toBe(true);

    // Quick wins should be low effort
    for (const opp of quickWins) {
      expect(opp.effort).toBe('low');
    }
  });

  it('should sort opportunities by value descending', async () => {
    const { detectOpportunities } = await import(
      '../../../server/intelligence-hub/executive/opportunities'
    );

    const opportunities = detectOpportunities();

    for (let i = 1; i < opportunities.length; i++) {
      expect(opportunities[i - 1].potentialValue).toBeGreaterThanOrEqual(
        opportunities[i].potentialValue
      );
    }
  });
});

describe('Summary Repository', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_EXECUTIVE_SUMMARY = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_EXECUTIVE_SUMMARY;
  });

  it('should store and retrieve summaries', async () => {
    const { getSummaryRepository, resetSummaryRepository } = await import(
      '../../../server/intelligence-hub/executive/repository'
    );

    resetSummaryRepository();
    const repo = getSummaryRepository();

    const summary = {
      id: 'summary-1',
      generatedAt: new Date(),
      periodStart: new Date(Date.now() - 7 * 24 * 3600000),
      periodEnd: new Date(),
      healthScore: {
        overall: 85,
        components: {
          content: 80,
          infrastructure: 90,
          cost: 85,
          quality: 80,
          revenue: 90,
        },
        trend: 'stable' as const,
        lastUpdated: new Date(),
      },
      topRisks: [],
      topOpportunities: [],
      weeklyActions: [],
      signalsAnalyzed: 100,
      anomaliesDetected: 2,
      correlationsFound: 5,
    };

    repo.store(summary);

    const retrieved = repo.get('summary-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('summary-1');
  });

  it('should get latest summary', async () => {
    const { getSummaryRepository, resetSummaryRepository } = await import(
      '../../../server/intelligence-hub/executive/repository'
    );

    resetSummaryRepository();
    const repo = getSummaryRepository();

    const now = new Date();
    const earlier = new Date(Date.now() - 1000);

    repo.store({
      id: 'summary-old',
      generatedAt: earlier,
      periodStart: new Date(),
      periodEnd: new Date(),
      healthScore: {
        overall: 80,
        components: { content: 80, infrastructure: 80, cost: 80, quality: 80, revenue: 80 },
        trend: 'stable',
        lastUpdated: earlier,
      },
      topRisks: [],
      topOpportunities: [],
      weeklyActions: [],
      signalsAnalyzed: 50,
      anomaliesDetected: 1,
      correlationsFound: 2,
    });

    repo.store({
      id: 'summary-new',
      generatedAt: now,
      periodStart: new Date(),
      periodEnd: new Date(),
      healthScore: {
        overall: 90,
        components: { content: 90, infrastructure: 90, cost: 90, quality: 90, revenue: 90 },
        trend: 'improving',
        lastUpdated: now,
      },
      topRisks: [],
      topOpportunities: [],
      weeklyActions: [],
      signalsAnalyzed: 100,
      anomaliesDetected: 0,
      correlationsFound: 3,
    });

    const latest = repo.getLatest();
    expect(latest?.id).toBe('summary-new');
  });

  it('should get health trend', async () => {
    const { getSummaryRepository, resetSummaryRepository } = await import(
      '../../../server/intelligence-hub/executive/repository'
    );

    resetSummaryRepository();
    const repo = getSummaryRepository();

    // Store multiple summaries
    for (let i = 0; i < 5; i++) {
      repo.store({
        id: `summary-${i}`,
        generatedAt: new Date(Date.now() - i * 3600000),
        periodStart: new Date(),
        periodEnd: new Date(),
        healthScore: {
          overall: 80 + i,
          components: { content: 80, infrastructure: 80, cost: 80, quality: 80, revenue: 80 },
          trend: 'stable',
          lastUpdated: new Date(),
        },
        topRisks: [],
        topOpportunities: [],
        weeklyActions: [],
        signalsAnalyzed: 100,
        anomaliesDetected: 0,
        correlationsFound: 0,
      });
    }

    const trend = repo.getHealthTrend(5);
    expect(trend.length).toBe(5);
    expect(trend[0]).toHaveProperty('date');
    expect(trend[0]).toHaveProperty('score');
  });

  it('should query summaries', async () => {
    const { getSummaryRepository, resetSummaryRepository } = await import(
      '../../../server/intelligence-hub/executive/repository'
    );

    resetSummaryRepository();
    const repo = getSummaryRepository();

    const now = new Date();

    repo.store({
      id: 'summary-1',
      generatedAt: now,
      periodStart: new Date(),
      periodEnd: new Date(),
      healthScore: {
        overall: 85,
        components: { content: 85, infrastructure: 85, cost: 85, quality: 85, revenue: 85 },
        trend: 'stable',
        lastUpdated: now,
      },
      topRisks: [],
      topOpportunities: [],
      weeklyActions: [],
      signalsAnalyzed: 100,
      anomaliesDetected: 1,
      correlationsFound: 3,
    });

    const results = repo.query({ limit: 10 });
    expect(results.length).toBe(1);

    const empty = repo.query({ since: new Date(Date.now() + 1000) });
    expect(empty.length).toBe(0);
  });

  it('should enforce storage limits', async () => {
    const { getSummaryRepository, resetSummaryRepository } = await import(
      '../../../server/intelligence-hub/executive/repository'
    );

    resetSummaryRepository();
    const repo = getSummaryRepository();

    // Store many summaries
    for (let i = 0; i < 150; i++) {
      repo.store({
        id: `summary-${i}`,
        generatedAt: new Date(Date.now() - i * 1000),
        periodStart: new Date(),
        periodEnd: new Date(),
        healthScore: {
          overall: 80,
          components: { content: 80, infrastructure: 80, cost: 80, quality: 80, revenue: 80 },
          trend: 'stable',
          lastUpdated: new Date(),
        },
        topRisks: [],
        topOpportunities: [],
        weeklyActions: [],
        signalsAnalyzed: 50,
        anomaliesDetected: 0,
        correlationsFound: 0,
      });
    }

    expect(repo.count()).toBeLessThanOrEqual(100); // MAX_SUMMARIES
  });
});

describe('Executive Summarizer', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_EXECUTIVE_SUMMARY = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_EXECUTIVE_SUMMARY;
  });

  it('should generate summary', async () => {
    const { generateSummary } = await import(
      '../../../server/intelligence-hub/executive/summarizer'
    );

    const summary = await generateSummary();

    expect(summary).toHaveProperty('id');
    expect(summary).toHaveProperty('generatedAt');
    expect(summary).toHaveProperty('healthScore');
    expect(summary).toHaveProperty('topRisks');
    expect(summary).toHaveProperty('topOpportunities');
    expect(summary).toHaveProperty('weeklyActions');
    expect(summary).toHaveProperty('signalsAnalyzed');
  });

  it('should get quick health', async () => {
    const { getQuickHealth } = await import(
      '../../../server/intelligence-hub/executive/summarizer'
    );

    const health = getQuickHealth();

    expect(health).toHaveProperty('overall');
    expect(health).toHaveProperty('components');
    expect(health).toHaveProperty('trend');
    expect(health.overall).toBeGreaterThanOrEqual(0);
    expect(health.overall).toBeLessThanOrEqual(100);
  });

  it('should calculate health trend', async () => {
    const { generateSummary } = await import(
      '../../../server/intelligence-hub/executive/summarizer'
    );

    const previousHealth = {
      overall: 70,
      components: { content: 70, infrastructure: 70, cost: 70, quality: 70, revenue: 70 },
      trend: 'stable' as const,
      lastUpdated: new Date(),
    };

    const summary = await generateSummary({}, previousHealth);

    expect(['improving', 'stable', 'declining']).toContain(summary.healthScore.trend);
  });

  it('should respect options', async () => {
    const { generateSummary } = await import(
      '../../../server/intelligence-hub/executive/summarizer'
    );

    const summary = await generateSummary({
      maxRisks: 3,
      maxOpportunities: 3,
      maxActions: 5,
    });

    expect(summary.topRisks.length).toBeLessThanOrEqual(3);
    expect(summary.topOpportunities.length).toBeLessThanOrEqual(3);
    expect(summary.weeklyActions.length).toBeLessThanOrEqual(5);
  });
});
