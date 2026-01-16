/**
 * Platform Convergence Tests
 * Tests for platform-status, execution-gate, contradiction-detector, and feature-contract
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Platform Status Tests
describe('Platform Status', () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset environment
    delete process.env.ENABLE_ENTERPRISE_GOVERNANCE;
    delete process.env.ENABLE_POLICY_ENFORCEMENT;
    delete process.env.ENABLE_RBAC;
    delete process.env.ENABLE_AUTONOMY_MATRIX;
    delete process.env.ENABLE_PLATFORM_STATUS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generatePlatformSnapshot', () => {
    it('should generate a complete snapshot', async () => {
      const { generatePlatformSnapshot } = await import('../../server/platform-status');
      const snapshot = await generatePlatformSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.version).toBe('1.0.0');
      expect(snapshot.governance).toBeDefined();
      expect(snapshot.readiness).toBeDefined();
      expect(snapshot.autonomy).toBeDefined();
      expect(snapshot.incidents).toBeDefined();
      expect(snapshot.risks).toBeDefined();
      expect(snapshot.features).toBeDefined();
      expect(typeof snapshot.healthy).toBe('boolean');
      expect(snapshot.summary).toBeDefined();
    });

    it('should include governance status', async () => {
      const { generatePlatformSnapshot } = await import('../../server/platform-status');
      const snapshot = await generatePlatformSnapshot();

      expect(snapshot.governance).toHaveProperty('totalRoles');
      expect(snapshot.governance).toHaveProperty('activeRoles');
      expect(snapshot.governance).toHaveProperty('pendingApprovals');
      expect(snapshot.governance).toHaveProperty('activeOverrides');
    });

    it('should include readiness status', async () => {
      const { generatePlatformSnapshot } = await import('../../server/platform-status');
      const snapshot = await generatePlatformSnapshot();

      expect(snapshot.readiness).toHaveProperty('level');
      expect(snapshot.readiness).toHaveProperty('blockers');
      expect(snapshot.readiness).toHaveProperty('checksCompleted');
      expect(snapshot.readiness).toHaveProperty('checksFailed');
      expect(['GO_LIVE', 'CUTOVER', 'STAGING', 'BLOCKED']).toContain(snapshot.readiness.level);
    });

    it('should include autonomy status', async () => {
      const { generatePlatformSnapshot } = await import('../../server/platform-status');
      const snapshot = await generatePlatformSnapshot();

      expect(snapshot.autonomy).toHaveProperty('mode');
      expect(snapshot.autonomy).toHaveProperty('restrictions');
      expect(snapshot.autonomy).toHaveProperty('confidenceLevel');
      expect(['ALLOWED', 'DEGRADED', 'BLOCKED']).toContain(snapshot.autonomy.mode);
    });

    it('should include incident status', async () => {
      const { generatePlatformSnapshot } = await import('../../server/platform-status');
      const snapshot = await generatePlatformSnapshot();

      expect(snapshot.incidents).toHaveProperty('open');
      expect(snapshot.incidents).toHaveProperty('bySeverity');
      expect(snapshot.incidents.bySeverity).toHaveProperty('critical');
      expect(snapshot.incidents.bySeverity).toHaveProperty('high');
      expect(snapshot.incidents.bySeverity).toHaveProperty('medium');
      expect(snapshot.incidents.bySeverity).toHaveProperty('low');
    });

    it('should include risk summary', async () => {
      const { generatePlatformSnapshot } = await import('../../server/platform-status');
      const snapshot = await generatePlatformSnapshot();

      expect(snapshot.risks).toHaveProperty('overallScore');
      expect(snapshot.risks).toHaveProperty('topRisks');
      expect(snapshot.risks.overallScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.risks.overallScore).toBeLessThanOrEqual(100);
    });

    it('should include feature availability', async () => {
      const { generatePlatformSnapshot } = await import('../../server/platform-status');
      const snapshot = await generatePlatformSnapshot();

      expect(snapshot.features).toBeDefined();
      expect(typeof snapshot.features).toBe('object');
    });

    it('should cache snapshots within TTL', async () => {
      const { generatePlatformSnapshot, clearSnapshotCache } = await import('../../server/platform-status');
      clearSnapshotCache();

      const snapshot1 = await generatePlatformSnapshot();
      const snapshot2 = await generatePlatformSnapshot();

      expect(snapshot1.timestamp).toBe(snapshot2.timestamp);
    });

    it('should respond to feature flags', async () => {
      process.env.ENABLE_ENTERPRISE_GOVERNANCE = 'true';
      const { generatePlatformSnapshot, clearSnapshotCache } = await import('../../server/platform-status');
      clearSnapshotCache();

      const snapshot = await generatePlatformSnapshot();
      // Feature may be ON or LIMITED depending on dependencies
      expect(['ON', 'LIMITED']).toContain(snapshot.features.governance?.state);
    });
  });
});

// Execution Gate Tests
describe('Execution Gate', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ENABLE_ENTERPRISE_GOVERNANCE;
    delete process.env.ENABLE_POLICY_ENFORCEMENT;
  });

  describe('checkExecution', () => {
    it('should return a decision for valid requests', async () => {
      const { checkExecution } = await import('../../server/execution-gate');
      const result = await checkExecution({
        action: 'publish',
        actor: { userId: 'test', role: 'admin' },
        scope: {},
      });

      expect(result).toBeDefined();
      expect(['ALLOW', 'WARN', 'BLOCK']).toContain(result.decision);
      expect(result.reason).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.requestId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should block or warn non-admin users from deploy', async () => {
      process.env.ENABLE_ENTERPRISE_GOVERNANCE = 'true';
      const { checkExecution } = await import('../../server/execution-gate');
      const result = await checkExecution({
        action: 'deploy',
        actor: { userId: 'test', role: 'viewer' },
        scope: {},
      });

      // Should block or warn - non-admin cannot deploy directly
      expect(['BLOCK', 'WARN']).toContain(result.decision);
      // BLOCK decisions have required approvals, WARN may not
      if (result.decision === 'BLOCK') {
        expect(result.requiredApprovals.length).toBeGreaterThan(0);
      }
    });

    it('should allow admin users to deploy', async () => {
      process.env.ENABLE_ENTERPRISE_GOVERNANCE = 'true';
      process.env.ENABLE_POLICY_ENFORCEMENT = 'true';
      const { checkExecution } = await import('../../server/execution-gate');
      const result = await checkExecution({
        action: 'deploy',
        actor: { userId: 'test', role: 'admin' },
        scope: {},
      });

      expect(result.decision).not.toBe('BLOCK');
    });

    it('should include sources in response', async () => {
      const { checkExecution } = await import('../../server/execution-gate');
      const result = await checkExecution({
        action: 'publish',
        actor: { userId: 'test', role: 'editor' },
        scope: {},
      });

      expect(result.sources).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    it('should handle feature enable action', async () => {
      const { checkExecution } = await import('../../server/execution-gate');
      const result = await checkExecution({
        action: 'enable_feature',
        actor: { userId: 'test', role: 'admin' },
        scope: { feature: 'governance' },
      });

      expect(result).toBeDefined();
      expect(['ALLOW', 'WARN', 'BLOCK']).toContain(result.decision);
    });

    it('should block feature enable without feature name', async () => {
      const { checkExecution } = await import('../../server/execution-gate');
      const result = await checkExecution({
        action: 'enable_feature',
        actor: { userId: 'test', role: 'admin' },
        scope: {},
      });

      expect(result.decision).toBe('BLOCK');
    });
  });
});

// Feature Contract Tests
describe('Feature Contract', () => {
  describe('getFeatureContract', () => {
    it('should return contract for registered features', async () => {
      const { getFeatureContract } = await import('../../server/feature-contract');

      const contract = getFeatureContract('governance');
      expect(contract).toBeDefined();
      expect(contract?.name).toBe('governance');
      expect(contract?.featureFlag).toBe('ENABLE_ENTERPRISE_GOVERNANCE');
    });

    it('should return undefined for unknown features', async () => {
      const { getFeatureContract } = await import('../../server/feature-contract');

      const contract = getFeatureContract('unknown_feature');
      expect(contract).toBeUndefined();
    });
  });

  describe('getAllFeatureContracts', () => {
    it('should return all registered contracts', async () => {
      const { getAllFeatureContracts } = await import('../../server/feature-contract');

      const contracts = getAllFeatureContracts();
      expect(contracts.length).toBeGreaterThan(0);
      expect(contracts.some(c => c.name === 'governance')).toBe(true);
      expect(contracts.some(c => c.name === 'rbac')).toBe(true);
    });
  });

  describe('validateFeatureContract', () => {
    it('should validate feature with met requirements', async () => {
      const { validateFeatureContract } = await import('../../server/feature-contract');

      const result = validateFeatureContract(
        'governance',
        'STAGING',
        [],
        ['admin']
      );

      expect(result).toBeDefined();
      expect(result.valid).toBe(true);
      expect(result.missingDependencies).toHaveLength(0);
      expect(result.pendingApprovals).toHaveLength(0);
    });

    it('should detect missing dependencies', async () => {
      const { validateFeatureContract } = await import('../../server/feature-contract');

      const result = validateFeatureContract(
        'policy_enforcement',
        'CUTOVER',
        [], // No features enabled
        ['admin', 'security_team']
      );

      expect(result.valid).toBe(false);
      expect(result.missingDependencies).toContain('governance');
      expect(result.missingDependencies).toContain('rbac');
    });

    it('should detect insufficient readiness level', async () => {
      const { validateFeatureContract } = await import('../../server/feature-contract');

      const result = validateFeatureContract(
        'policy_enforcement',
        'STAGING', // Requires CUTOVER
        ['governance', 'rbac'],
        ['admin', 'security_team']
      );

      expect(result.readinessGap.met).toBe(false);
      expect(result.readinessGap.required).toBe('CUTOVER');
    });

    it('should detect pending approvals', async () => {
      const { validateFeatureContract } = await import('../../server/feature-contract');

      const result = validateFeatureContract(
        'governance',
        'STAGING',
        [],
        [] // No approvals
      );

      expect(result.pendingApprovals).toContain('admin');
    });

    it('should return invalid for unknown features', async () => {
      const { validateFeatureContract } = await import('../../server/feature-contract');

      const result = validateFeatureContract(
        'unknown_feature',
        'GO_LIVE',
        [],
        []
      );

      expect(result.valid).toBe(false);
      expect(result.pendingApprovals).toContain('contract_definition');
    });
  });

  describe('registerFeatureContract', () => {
    it('should allow registering new contracts', async () => {
      const { registerFeatureContract, getFeatureContract } = await import('../../server/feature-contract');

      registerFeatureContract({
        name: 'test_feature',
        displayName: 'Test Feature',
        description: 'A test feature',
        dependencies: [],
        risks: [],
        requiredReadinessLevel: 'STAGING',
        approvalRequirements: [],
        allowedDegradedModes: ['none'],
        featureFlag: 'ENABLE_TEST_FEATURE',
        version: '1.0.0',
      });

      const contract = getFeatureContract('test_feature');
      expect(contract).toBeDefined();
      expect(contract?.name).toBe('test_feature');
    });
  });
});

// Contradiction Detector Tests
describe('Contradiction Detector', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ENABLE_ENTERPRISE_GOVERNANCE;
    delete process.env.ENABLE_POLICY_ENFORCEMENT;
  });

  describe('detectContradictions', () => {
    it('should return a contradiction report', async () => {
      const { detectContradictions } = await import('../../server/contradiction-detector');
      const report = await detectContradictions();

      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.contradictions).toBeDefined();
      expect(Array.isArray(report.contradictions)).toBe(true);
      expect(report.totalCount).toBeDefined();
      expect(report.bySeverity).toBeDefined();
      expect(typeof report.healthy).toBe('boolean');
      expect(report.summary).toBeDefined();
    });

    it('should count contradictions by severity', async () => {
      const { detectContradictions } = await import('../../server/contradiction-detector');
      const report = await detectContradictions();

      expect(report.bySeverity).toHaveProperty('critical');
      expect(report.bySeverity).toHaveProperty('high');
      expect(report.bySeverity).toHaveProperty('medium');
      expect(report.bySeverity).toHaveProperty('low');
    });

    it('should determine health based on severity', async () => {
      const { detectContradictions } = await import('../../server/contradiction-detector');
      const report = await detectContradictions();

      // Healthy if no critical or high severity contradictions
      const expectedHealthy = report.bySeverity.critical === 0 && report.bySeverity.high === 0;
      expect(report.healthy).toBe(expectedHealthy);
    });

    it('should include suggested resolutions', async () => {
      const { detectContradictions } = await import('../../server/contradiction-detector');
      const report = await detectContradictions();

      for (const contradiction of report.contradictions) {
        expect(contradiction.suggestedResolution).toBeDefined();
        expect(contradiction.suggestedResolution.length).toBeGreaterThan(0);
      }
    });

    it('should include contradiction types', async () => {
      const { detectContradictions } = await import('../../server/contradiction-detector');
      const report = await detectContradictions();

      for (const contradiction of report.contradictions) {
        expect(['conflict', 'drift', 'inconsistency']).toContain(contradiction.type);
      }
    });
  });

  describe('registerDetector', () => {
    it('should allow custom detectors', async () => {
      const { registerDetector, detectContradictions } = await import('../../server/contradiction-detector');

      registerDetector(() => [{
        id: 'CUSTOM-001',
        type: 'conflict',
        severity: 'low',
        source1: { subsystem: 'test', state: 'a', value: 1 },
        source2: { subsystem: 'test', state: 'b', value: 2 },
        description: 'Custom test contradiction',
        suggestedResolution: 'Fix it',
        detectedAt: new Date().toISOString(),
      }]);

      const report = await detectContradictions();
      expect(report.contradictions.some(c => c.id === 'CUSTOM-001')).toBe(true);
    });
  });
});

// Integration Tests
describe('Platform Convergence Integration', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_ENTERPRISE_GOVERNANCE = 'true';
    process.env.ENABLE_POLICY_ENFORCEMENT = 'true';
    process.env.ENABLE_RBAC = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_ENTERPRISE_GOVERNANCE;
    delete process.env.ENABLE_POLICY_ENFORCEMENT;
    delete process.env.ENABLE_RBAC;
  });

  it('should integrate platform status with execution gate', async () => {
    const { generatePlatformSnapshot, clearSnapshotCache } = await import('../../server/platform-status');
    const { checkExecution } = await import('../../server/execution-gate');

    clearSnapshotCache();
    const snapshot = await generatePlatformSnapshot();
    const result = await checkExecution({
      action: 'publish',
      actor: { userId: 'test', role: 'admin' },
      scope: {},
    });

    // Execution gate should use platform status
    expect(result.sources.length).toBeGreaterThan(0);
  });

  it('should integrate platform status with contradiction detector', async () => {
    const { generatePlatformSnapshot, clearSnapshotCache } = await import('../../server/platform-status');
    const { detectContradictions } = await import('../../server/contradiction-detector');

    clearSnapshotCache();
    await generatePlatformSnapshot();
    const report = await detectContradictions();

    expect(report).toBeDefined();
    expect(report.timestamp).toBeDefined();
  });

  it('should validate feature contracts against platform status', async () => {
    const { generatePlatformSnapshot, clearSnapshotCache } = await import('../../server/platform-status');
    const { validateFeatureContract } = await import('../../server/feature-contract');

    clearSnapshotCache();
    const snapshot = await generatePlatformSnapshot();
    const enabledFeatures = Object.entries(snapshot.features)
      .filter(([_, f]) => f.state === 'ON')
      .map(([name]) => name);

    const result = validateFeatureContract(
      'governance',
      snapshot.readiness.level,
      enabledFeatures,
      ['admin']
    );

    expect(result).toBeDefined();
  });
});
