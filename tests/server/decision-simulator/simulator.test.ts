/**
 * Unit Tests - Platform Decision Simulator
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

describe('Scenario Manager', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_DECISION_SIMULATOR = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_DECISION_SIMULATOR;
  });

  it('should initialize with enabled flag', async () => {
    const { getScenarioManager, resetScenarioManager } = await import(
      '../../../server/decision-simulator/scenarios'
    );

    resetScenarioManager();
    const manager = getScenarioManager();
    expect(manager.isEnabled()).toBe(true);
  });

  it('should list predefined templates', async () => {
    const { getScenarioManager, PREDEFINED_SCENARIOS } = await import(
      '../../../server/decision-simulator/scenarios'
    );

    const manager = getScenarioManager();
    const templates = manager.listTemplates();

    expect(templates.length).toBe(PREDEFINED_SCENARIOS.length);
    expect(templates.length).toBeGreaterThan(0);
  });

  it('should get scenario by ID', async () => {
    const { getScenarioManager, resetScenarioManager } = await import(
      '../../../server/decision-simulator/scenarios'
    );

    resetScenarioManager();
    const manager = getScenarioManager();

    const scenario = manager.get('template-traffic-2x');
    expect(scenario).toBeDefined();
    expect(scenario?.name).toBe('Traffic Spike 2x');
  });

  it('should create custom scenario', async () => {
    const { getScenarioManager, resetScenarioManager } = await import(
      '../../../server/decision-simulator/scenarios'
    );

    resetScenarioManager();
    const manager = getScenarioManager();

    const scenario = manager.create(
      'Test Scenario',
      'A test scenario',
      [{ type: 'traffic_spike', target: 'global', value: 3.0, description: 'Test' }],
      ['test']
    );

    expect(scenario.id).toBeDefined();
    expect(scenario.name).toBe('Test Scenario');

    const retrieved = manager.get(scenario.id);
    expect(retrieved).toBeDefined();
  });

  it('should query scenarios by tags', async () => {
    const { getScenarioManager, resetScenarioManager } = await import(
      '../../../server/decision-simulator/scenarios'
    );

    resetScenarioManager();
    const manager = getScenarioManager();

    const results = manager.query({ tags: ['traffic'] });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(s => s.tags?.includes('traffic'))).toBe(true);
  });

  it('should delete custom scenario', async () => {
    const { getScenarioManager, resetScenarioManager } = await import(
      '../../../server/decision-simulator/scenarios'
    );

    resetScenarioManager();
    const manager = getScenarioManager();

    const scenario = manager.create(
      'To Delete',
      'Will be deleted',
      [{ type: 'traffic_spike', target: 'global', value: 2.0, description: 'Test' }]
    );

    expect(manager.get(scenario.id)).toBeDefined();

    const deleted = manager.delete(scenario.id);
    expect(deleted).toBe(true);
    expect(manager.get(scenario.id)).toBeUndefined();
  });
});

describe('Impact Engine', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_DECISION_SIMULATOR = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_DECISION_SIMULATOR;
  });

  it('should run simulation', async () => {
    const { runSimulation } = await import(
      '../../../server/decision-simulator/impact-engine'
    );

    const scenario = {
      id: 'test-1',
      name: 'Test',
      description: 'Test scenario',
      changes: [
        { type: 'traffic_spike' as const, target: 'global', value: 2.0, description: 'Double traffic' },
      ],
      createdAt: new Date(),
    };

    const result = runSimulation(scenario);

    expect(result.id).toBeDefined();
    expect(result.scenarioId).toBe('test-1');
    expect(result.subsystemImpacts.length).toBeGreaterThan(0);
    expect(result.riskAssessment).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should calculate subsystem impacts', async () => {
    const { runSimulation } = await import(
      '../../../server/decision-simulator/impact-engine'
    );

    const scenario = {
      id: 'test-2',
      name: 'Test',
      description: 'Test scenario',
      changes: [
        { type: 'incident_injection' as const, target: 'infrastructure', value: { severity: 'critical' }, description: 'Critical incident' },
      ],
      createdAt: new Date(),
    };

    const result = runSimulation(scenario);

    // Should have impacts for all subsystems
    expect(result.subsystemImpacts.length).toBe(8);

    // Infrastructure should be heavily impacted
    const infraImpact = result.subsystemImpacts.find(i => i.subsystemId === 'infrastructure');
    expect(infraImpact).toBeDefined();
    expect(infraImpact!.delta).toBeLessThan(0);
  });

  it('should detect cascade effects', async () => {
    const { runSimulation } = await import(
      '../../../server/decision-simulator/impact-engine'
    );

    const scenario = {
      id: 'test-3',
      name: 'Test',
      description: 'Test scenario',
      changes: [
        { type: 'provider_outage' as const, target: 'openai', value: true, description: 'Provider down' },
      ],
      createdAt: new Date(),
    };

    const result = runSimulation(scenario, { includeCascades: true });

    expect(result.cascadeEffects).toBeDefined();
    // May or may not have cascades depending on impact levels
  });

  it('should provide recommendations for high-risk scenarios', async () => {
    const { runSimulation } = await import(
      '../../../server/decision-simulator/impact-engine'
    );

    const scenario = {
      id: 'test-4',
      name: 'Test',
      description: 'Test scenario',
      changes: [
        { type: 'traffic_spike' as const, target: 'global', value: 10.0, description: '10x traffic' },
        { type: 'incident_injection' as const, target: 'infrastructure', value: { severity: 'critical' }, description: 'Critical incident' },
      ],
      createdAt: new Date(),
    };

    const result = runSimulation(scenario);

    expect(result.riskAssessment.recommendations.length).toBeGreaterThan(0);
  });

  it('should perform quick impact check', async () => {
    const { quickImpactCheck } = await import(
      '../../../server/decision-simulator/impact-engine'
    );

    const changes = [
      { type: 'traffic_spike' as const, target: 'global', value: 5.0, description: '5x traffic' },
    ];

    const result = quickImpactCheck(changes);

    expect(result.level).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(['none', 'low', 'medium', 'high', 'critical']).toContain(result.level);
  });

  it('should produce deterministic results', async () => {
    const { runSimulation } = await import(
      '../../../server/decision-simulator/impact-engine'
    );

    const scenario = {
      id: 'test-deterministic',
      name: 'Deterministic Test',
      description: 'Test scenario',
      changes: [
        { type: 'traffic_spike' as const, target: 'global', value: 3.0, description: 'Triple traffic' },
      ],
      createdAt: new Date(),
    };

    const result1 = runSimulation(scenario);
    const result2 = runSimulation(scenario);

    // Same input should produce same outputs (except IDs and timestamps)
    expect(result1.subsystemImpacts.map(i => i.delta))
      .toEqual(result2.subsystemImpacts.map(i => i.delta));
    expect(result1.riskAssessment.overallLevel)
      .toBe(result2.riskAssessment.overallLevel);
    expect(result1.confidence).toBe(result2.confidence);
  });
});

describe('Simulator Repository', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ENABLE_DECISION_SIMULATOR = 'true';
  });

  afterEach(() => {
    delete process.env.ENABLE_DECISION_SIMULATOR;
  });

  it('should store and retrieve results', async () => {
    const { getSimulatorRepository, resetSimulatorRepository } = await import(
      '../../../server/decision-simulator/repository'
    );
    const { runSimulation } = await import(
      '../../../server/decision-simulator/impact-engine'
    );

    resetSimulatorRepository();
    const repo = getSimulatorRepository();

    const scenario = {
      id: 'test-store',
      name: 'Test',
      description: 'Test',
      changes: [{ type: 'traffic_spike' as const, target: 'global', value: 2.0, description: 'Test' }],
      createdAt: new Date(),
    };

    const result = runSimulation(scenario);
    repo.store(result);

    const retrieved = repo.get(result.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(result.id);
  });

  it('should query results', async () => {
    const { getSimulatorRepository, resetSimulatorRepository } = await import(
      '../../../server/decision-simulator/repository'
    );
    const { runSimulation } = await import(
      '../../../server/decision-simulator/impact-engine'
    );

    resetSimulatorRepository();
    const repo = getSimulatorRepository();

    const scenario = {
      id: 'test-query',
      name: 'Test',
      description: 'Test',
      changes: [{ type: 'traffic_spike' as const, target: 'global', value: 2.0, description: 'Test' }],
      createdAt: new Date(),
    };

    const result = runSimulation(scenario);
    repo.store(result);

    const results = repo.query({ scenarioId: 'test-query' });
    expect(results.length).toBe(1);
  });

  it('should get stats', async () => {
    const { getSimulatorRepository, resetSimulatorRepository } = await import(
      '../../../server/decision-simulator/repository'
    );

    resetSimulatorRepository();
    const repo = getSimulatorRepository();

    const stats = repo.getStats();
    expect(stats).toHaveProperty('totalResults');
    expect(stats).toHaveProperty('byRiskLevel');
    expect(stats).toHaveProperty('avgConfidence');
  });
});
