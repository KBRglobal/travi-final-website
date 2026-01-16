/**
 * Unit Tests - Signal Correlation Engine
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

describe('Correlation Patterns', () => {
  it('should export known patterns', async () => {
    const { KNOWN_PATTERNS } = await import(
      '../../../server/intelligence-hub/correlation/patterns'
    );

    expect(KNOWN_PATTERNS).toBeDefined();
    expect(KNOWN_PATTERNS.length).toBeGreaterThan(0);
  });

  it('should get pattern by ID', async () => {
    const { getPattern } = await import(
      '../../../server/intelligence-hub/correlation/patterns'
    );

    const pattern = getPattern('revenue_entity_loss');
    expect(pattern).toBeDefined();
    expect(pattern?.id).toBe('revenue_entity_loss');
    expect(pattern?.expectedType).toBe('causal');
  });

  it('should get patterns for source', async () => {
    const { getPatternsForSource } = await import(
      '../../../server/intelligence-hub/correlation/patterns'
    );

    const patterns = getPatternsForSource('revenue');
    expect(patterns.length).toBeGreaterThan(0);
    expect(
      patterns.some(p => p.signalSourceA === 'revenue' || p.signalSourceB === 'revenue')
    ).toBe(true);
  });

  it('should check for known pattern between sources', async () => {
    const { hasKnownPattern } = await import(
      '../../../server/intelligence-hub/correlation/patterns'
    );

    const pattern = hasKnownPattern('revenue', 'data-integrity');
    expect(pattern).toBeDefined();
    expect(pattern?.id).toBe('revenue_entity_loss');

    // Order shouldn't matter
    const patternReversed = hasKnownPattern('data-integrity', 'revenue');
    expect(patternReversed).toBeDefined();
    expect(patternReversed?.id).toBe('revenue_entity_loss');

    // Unknown combination
    const noPattern = hasKnownPattern('unknown', 'other');
    expect(noPattern).toBeUndefined();
  });
});

describe('Anomaly Detector', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_SIGNAL_CORRELATION = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_SIGNAL_CORRELATION;
  });

  it('should initialize with enabled flag', async () => {
    const { getAnomalyDetector, resetAnomalyDetector } = await import(
      '../../../server/intelligence-hub/correlation/anomaly-detector'
    );

    resetAnomalyDetector();
    const detector = getAnomalyDetector();
    expect(detector.isEnabled()).toBe(true);
  });

  it('should be disabled when flag is not set', async () => {
    delete process.env.ENABLE_SIGNAL_CORRELATION;
    vi.resetModules();

    const { getAnomalyDetector, resetAnomalyDetector } = await import(
      '../../../server/intelligence-hub/correlation/anomaly-detector'
    );

    resetAnomalyDetector();
    const detector = getAnomalyDetector();
    expect(detector.isEnabled()).toBe(false);
  });

  it('should query anomalies with filters', async () => {
    const { getAnomalyDetector, resetAnomalyDetector } = await import(
      '../../../server/intelligence-hub/correlation/anomaly-detector'
    );

    resetAnomalyDetector();
    const detector = getAnomalyDetector();

    // Query by severity
    const severe = detector.query({ severities: ['major', 'extreme'] });
    expect(Array.isArray(severe)).toBe(true);

    // Query by deviation
    const highDeviation = detector.query({ minDeviation: 3 });
    expect(Array.isArray(highDeviation)).toBe(true);

    // Query unresolved
    const active = detector.query({ resolved: false });
    expect(Array.isArray(active)).toBe(true);
  });

  it('should resolve anomalies', async () => {
    const { getAnomalyDetector, resetAnomalyDetector, AnomalyDetector } = await import(
      '../../../server/intelligence-hub/correlation/anomaly-detector'
    );

    resetAnomalyDetector();
    const detector = getAnomalyDetector();

    // Try to resolve non-existent
    const result = detector.resolve('non-existent');
    expect(result).toBe(false);
  });

  it('should get active anomalies', async () => {
    const { getAnomalyDetector, resetAnomalyDetector } = await import(
      '../../../server/intelligence-hub/correlation/anomaly-detector'
    );

    resetAnomalyDetector();
    const detector = getAnomalyDetector();

    const active = detector.getActive();
    expect(Array.isArray(active)).toBe(true);
  });

  it('should get severe anomalies', async () => {
    const { getAnomalyDetector, resetAnomalyDetector } = await import(
      '../../../server/intelligence-hub/correlation/anomaly-detector'
    );

    resetAnomalyDetector();
    const detector = getAnomalyDetector();

    const severe = detector.getSevere();
    expect(Array.isArray(severe)).toBe(true);
  });
});

describe('Signal Correlator', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_SIGNAL_CORRELATION = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_SIGNAL_CORRELATION;
  });

  it('should initialize with enabled flag', async () => {
    const { getSignalCorrelator, resetSignalCorrelator } = await import(
      '../../../server/intelligence-hub/correlation/correlator'
    );

    resetSignalCorrelator();
    const correlator = getSignalCorrelator();
    expect(correlator.isEnabled()).toBe(true);
  });

  it('should be disabled when flag is not set', async () => {
    delete process.env.ENABLE_SIGNAL_CORRELATION;
    vi.resetModules();

    const { getSignalCorrelator, resetSignalCorrelator } = await import(
      '../../../server/intelligence-hub/correlation/correlator'
    );

    resetSignalCorrelator();
    const correlator = getSignalCorrelator();
    expect(correlator.isEnabled()).toBe(false);
  });

  it('should query correlations with filters', async () => {
    const { getSignalCorrelator, resetSignalCorrelator } = await import(
      '../../../server/intelligence-hub/correlation/correlator'
    );

    resetSignalCorrelator();
    const correlator = getSignalCorrelator();

    // Query by strength
    const strong = correlator.query({ minStrength: 70 });
    expect(Array.isArray(strong)).toBe(true);

    // Query by confidence
    const confident = correlator.query({ minConfidence: 60 });
    expect(Array.isArray(confident)).toBe(true);

    // Query by pattern
    const patterned = correlator.query({ patternIds: ['revenue_entity_loss'] });
    expect(Array.isArray(patterned)).toBe(true);
  });

  it('should get strong correlations', async () => {
    const { getSignalCorrelator, resetSignalCorrelator } = await import(
      '../../../server/intelligence-hub/correlation/correlator'
    );

    resetSignalCorrelator();
    const correlator = getSignalCorrelator();

    const strong = correlator.getStrongCorrelations(80);
    expect(Array.isArray(strong)).toBe(true);
  });

  it('should return empty when disabled', async () => {
    delete process.env.ENABLE_SIGNAL_CORRELATION;
    vi.resetModules();

    const { getSignalCorrelator, resetSignalCorrelator } = await import(
      '../../../server/intelligence-hub/correlation/correlator'
    );

    resetSignalCorrelator();
    const correlator = getSignalCorrelator();

    const correlations = await correlator.detectCorrelations();
    expect(correlations).toEqual([]);
  });
});

describe('Correlation Analysis', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_SIGNAL_CORRELATION = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_SIGNAL_CORRELATION;
  });

  it('should run full correlation analysis', async () => {
    const { runCorrelationAnalysis } = await import(
      '../../../server/intelligence-hub/correlation'
    );

    const result = await runCorrelationAnalysis(3600000);

    expect(result).toHaveProperty('correlations');
    expect(result).toHaveProperty('anomalies');
    expect(Array.isArray(result.correlations)).toBe(true);
    expect(Array.isArray(result.anomalies)).toBe(true);
  });

  it('should get active anomalies', async () => {
    const { getActiveAnomalies } = await import(
      '../../../server/intelligence-hub/correlation'
    );

    const anomalies = getActiveAnomalies();
    expect(Array.isArray(anomalies)).toBe(true);
  });

  it('should get strong correlations', async () => {
    const { getStrongCorrelations } = await import(
      '../../../server/intelligence-hub/correlation'
    );

    const correlations = getStrongCorrelations(70);
    expect(Array.isArray(correlations)).toBe(true);
  });
});
