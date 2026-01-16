/**
 * Unit Tests - Enterprise Policy Compliance Engine
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

describe('Policy Manager', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_COMPLIANCE_ENGINE = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_COMPLIANCE_ENGINE;
  });

  it('should initialize with enabled flag', async () => {
    const { getPolicyManager, resetPolicyManager } = await import(
      '../../../server/compliance/policies'
    );

    resetPolicyManager();
    const manager = getPolicyManager();
    expect(manager.isEnabled()).toBe(true);
  });

  it('should have built-in policies', async () => {
    const { getPolicyManager, BUILT_IN_POLICIES } = await import(
      '../../../server/compliance/policies'
    );

    const manager = getPolicyManager();
    const all = manager.getAll();

    expect(all.length).toBeGreaterThanOrEqual(BUILT_IN_POLICIES.length);
  });

  it('should get policy by ID', async () => {
    const { getPolicyManager, resetPolicyManager } = await import(
      '../../../server/compliance/policies'
    );

    resetPolicyManager();
    const manager = getPolicyManager();

    const policy = manager.get('data-retention-logs');
    expect(policy).toBeDefined();
    expect(policy?.name).toBe('Log Retention Policy');
  });

  it('should get policies by category', async () => {
    const { getPolicyManager, resetPolicyManager } = await import(
      '../../../server/compliance/policies'
    );

    resetPolicyManager();
    const manager = getPolicyManager();

    const securityPolicies = manager.getByCategory('security');
    expect(securityPolicies.length).toBeGreaterThan(0);
    expect(securityPolicies.every(p => p.category === 'security')).toBe(true);
  });

  it('should get enabled policies', async () => {
    const { getPolicyManager, resetPolicyManager } = await import(
      '../../../server/compliance/policies'
    );

    resetPolicyManager();
    const manager = getPolicyManager();

    const enabled = manager.getEnabled();
    expect(enabled.every(p => p.enabled)).toBe(true);
  });

  it('should add custom policy', async () => {
    const { getPolicyManager, resetPolicyManager } = await import(
      '../../../server/compliance/policies'
    );

    resetPolicyManager();
    const manager = getPolicyManager();

    const customPolicy = {
      id: 'custom-test-policy',
      name: 'Custom Test Policy',
      description: 'A test policy',
      category: 'security' as const,
      scope: 'system' as const,
      enabled: true,
      check: {
        type: 'config' as const,
        target: 'test.value',
        operator: 'equals' as const,
        expectedValue: true,
      },
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    manager.add(customPolicy);

    const retrieved = manager.get('custom-test-policy');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Custom Test Policy');
  });

  it('should not override built-in policies', async () => {
    const { getPolicyManager, resetPolicyManager } = await import(
      '../../../server/compliance/policies'
    );

    resetPolicyManager();
    const manager = getPolicyManager();

    const duplicate = {
      id: 'data-retention-logs', // Built-in ID
      name: 'Fake Policy',
      description: 'Trying to override',
      category: 'security' as const,
      scope: 'system' as const,
      enabled: true,
      check: {
        type: 'config' as const,
        target: 'fake',
        operator: 'equals' as const,
        expectedValue: true,
      },
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(() => manager.add(duplicate)).toThrow('Cannot override built-in policy');
  });

  it('should count policies', async () => {
    const { getPolicyManager, resetPolicyManager, BUILT_IN_POLICIES } = await import(
      '../../../server/compliance/policies'
    );

    resetPolicyManager();
    const manager = getPolicyManager();

    const count = manager.count();
    expect(count.builtIn).toBe(BUILT_IN_POLICIES.length);
    expect(count.total).toBe(count.builtIn + count.custom);
  });
});

describe('Compliance Scanner', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_COMPLIANCE_ENGINE = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_COMPLIANCE_ENGINE;
  });

  it('should run full scan', async () => {
    const { runScan } = await import('../../../server/compliance/scanner');

    const result = runScan();

    expect(result.id).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.results).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.overallStatus).toBeDefined();
    expect(['compliant', 'warning', 'violation']).toContain(result.overallStatus);
  });

  it('should filter scan by category', async () => {
    const { runScan } = await import('../../../server/compliance/scanner');

    const result = runScan({ categories: ['security'] });

    expect(result.results.every(r => r.category === 'security')).toBe(true);
  });

  it('should filter scan by scope', async () => {
    const { runScan } = await import('../../../server/compliance/scanner');

    const result = runScan({ scopes: ['system'] });

    expect(result.results.every(r => r.scope === 'system')).toBe(true);
  });

  it('should check specific policy', async () => {
    const { checkPolicy } = await import('../../../server/compliance/scanner');

    const result = checkPolicy('data-retention-logs');

    expect(result).toBeDefined();
    expect(result?.policyId).toBe('data-retention-logs');
    expect(['compliant', 'warning', 'violation']).toContain(result?.status);
  });

  it('should return null for non-existent policy', async () => {
    const { checkPolicy } = await import('../../../server/compliance/scanner');

    const result = checkPolicy('non-existent-policy');

    expect(result).toBeNull();
  });

  it('should check overall compliance', async () => {
    const { isCompliant } = await import('../../../server/compliance/scanner');

    const result = isCompliant();

    expect(typeof result).toBe('boolean');
  });

  it('should get violations only', async () => {
    const { getViolations } = await import('../../../server/compliance/scanner');

    const violations = getViolations();

    expect(Array.isArray(violations)).toBe(true);
    expect(violations.every(v => v.status === 'violation')).toBe(true);
  });

  it('should get all issues', async () => {
    const { getIssues } = await import('../../../server/compliance/scanner');

    const issues = getIssues();

    expect(Array.isArray(issues)).toBe(true);
    expect(issues.every(i => i.status !== 'compliant')).toBe(true);
  });
});

describe('Violation Repository', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_COMPLIANCE_ENGINE = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_COMPLIANCE_ENGINE;
  });

  it('should record violation from result', async () => {
    const { getViolationRepository, resetViolationRepository } = await import(
      '../../../server/compliance/violations'
    );

    resetViolationRepository();
    const repo = getViolationRepository();

    const result = {
      policyId: 'test-policy',
      policyName: 'Test Policy',
      category: 'security' as const,
      scope: 'system' as const,
      status: 'violation' as const,
      severity: 'high' as const,
      actualValue: 50,
      expectedValue: 100,
      message: 'Test violation',
      checkedAt: new Date(),
    };

    const violation = repo.recordFromResult(result);

    expect(violation).toBeDefined();
    expect(violation?.status).toBe('open');
    expect(violation?.policyId).toBe('test-policy');
  });

  it('should not record compliant results', async () => {
    const { getViolationRepository, resetViolationRepository } = await import(
      '../../../server/compliance/violations'
    );

    resetViolationRepository();
    const repo = getViolationRepository();

    const result = {
      policyId: 'test-policy',
      policyName: 'Test Policy',
      category: 'security' as const,
      scope: 'system' as const,
      status: 'compliant' as const,
      severity: 'info' as const,
      actualValue: 100,
      expectedValue: 100,
      message: 'Compliant',
      checkedAt: new Date(),
    };

    const violation = repo.recordFromResult(result);

    expect(violation).toBeNull();
  });

  it('should acknowledge violation', async () => {
    const { getViolationRepository, resetViolationRepository } = await import(
      '../../../server/compliance/violations'
    );

    resetViolationRepository();
    const repo = getViolationRepository();

    const result = {
      policyId: 'test-policy',
      policyName: 'Test Policy',
      category: 'security' as const,
      scope: 'system' as const,
      status: 'violation' as const,
      severity: 'high' as const,
      actualValue: 50,
      expectedValue: 100,
      message: 'Test violation',
      checkedAt: new Date(),
    };

    const violation = repo.recordFromResult(result);
    const acknowledged = repo.acknowledge(violation!.id);

    expect(acknowledged).toBe(true);

    const retrieved = repo.get(violation!.id);
    expect(retrieved?.status).toBe('acknowledged');
  });

  it('should resolve violation', async () => {
    const { getViolationRepository, resetViolationRepository } = await import(
      '../../../server/compliance/violations'
    );

    resetViolationRepository();
    const repo = getViolationRepository();

    const result = {
      policyId: 'test-policy',
      policyName: 'Test Policy',
      category: 'security' as const,
      scope: 'system' as const,
      status: 'violation' as const,
      severity: 'medium' as const,
      actualValue: 50,
      expectedValue: 100,
      message: 'Test violation',
      checkedAt: new Date(),
    };

    const violation = repo.recordFromResult(result);
    const resolved = repo.resolve(violation!.id);

    expect(resolved).toBe(true);

    const retrieved = repo.get(violation!.id);
    expect(retrieved?.status).toBe('resolved');
  });

  it('should waive violation', async () => {
    const { getViolationRepository, resetViolationRepository } = await import(
      '../../../server/compliance/violations'
    );

    resetViolationRepository();
    const repo = getViolationRepository();

    const result = {
      policyId: 'test-policy',
      policyName: 'Test Policy',
      category: 'security' as const,
      scope: 'system' as const,
      status: 'violation' as const,
      severity: 'low' as const,
      actualValue: 50,
      expectedValue: 100,
      message: 'Test violation',
      checkedAt: new Date(),
    };

    const violation = repo.recordFromResult(result);
    const waived = repo.waive(violation!.id, 'admin', 'Approved exception');

    expect(waived).toBe(true);

    const retrieved = repo.get(violation!.id);
    expect(retrieved?.status).toBe('waived');
    expect(retrieved?.waivedBy).toBe('admin');
    expect(retrieved?.waiverReason).toBe('Approved exception');
  });

  it('should query violations', async () => {
    const { getViolationRepository, resetViolationRepository } = await import(
      '../../../server/compliance/violations'
    );

    resetViolationRepository();
    const repo = getViolationRepository();

    // Add test violations
    repo.recordFromResult({
      policyId: 'test-1',
      policyName: 'Test 1',
      category: 'security' as const,
      scope: 'system' as const,
      status: 'violation' as const,
      severity: 'high' as const,
      actualValue: 50,
      expectedValue: 100,
      message: 'High severity',
      checkedAt: new Date(),
    });

    repo.recordFromResult({
      policyId: 'test-2',
      policyName: 'Test 2',
      category: 'data-retention' as const,
      scope: 'system' as const,
      status: 'violation' as const,
      severity: 'low' as const,
      actualValue: 50,
      expectedValue: 100,
      message: 'Low severity',
      checkedAt: new Date(),
    });

    const highSeverity = repo.query({ severity: 'high' });
    expect(highSeverity.length).toBe(1);

    const securityCategory = repo.query({ category: 'security' });
    expect(securityCategory.length).toBe(1);
  });

  it('should get stats', async () => {
    const { getViolationRepository, resetViolationRepository } = await import(
      '../../../server/compliance/violations'
    );

    resetViolationRepository();
    const repo = getViolationRepository();

    const stats = repo.getStats();

    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('open');
    expect(stats).toHaveProperty('bySeverity');
    expect(stats).toHaveProperty('byCategory');
  });
});
