/**
 * Platform Decision Simulator - Scenario Management
 *
 * Predefined and custom scenario handling.
 */

import { log } from '../lib/logger';
import type { Scenario, ScenarioChange, ScenarioQuery, ScenarioType } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Scenarios] ${msg}`, data),
};

// Bounded storage
const MAX_SCENARIOS = 200;

/**
 * Generate unique scenario ID
 */
function generateScenarioId(): string {
  return `scenario-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Predefined scenario templates
 */
export const PREDEFINED_SCENARIOS: Scenario[] = [
  {
    id: 'template-traffic-2x',
    name: 'Traffic Spike 2x',
    description: 'Simulate 2x normal traffic load',
    changes: [
      {
        type: 'traffic_spike',
        target: 'global',
        value: 2.0,
        duration: 3600000,
        description: 'Double traffic for 1 hour',
      },
    ],
    createdAt: new Date(),
    tags: ['traffic', 'load', 'template'],
  },
  {
    id: 'template-traffic-10x',
    name: 'Traffic Spike 10x',
    description: 'Simulate 10x traffic surge (viral event)',
    changes: [
      {
        type: 'traffic_spike',
        target: 'global',
        value: 10.0,
        duration: 1800000,
        description: '10x traffic for 30 minutes',
      },
    ],
    createdAt: new Date(),
    tags: ['traffic', 'load', 'stress', 'template'],
  },
  {
    id: 'template-ai-cost-increase',
    name: 'AI Cost Increase 50%',
    description: 'Simulate 50% increase in AI provider costs',
    changes: [
      {
        type: 'cost_increase',
        target: 'ai-providers',
        value: 1.5,
        description: 'AI costs increase by 50%',
      },
    ],
    createdAt: new Date(),
    tags: ['cost', 'ai', 'template'],
  },
  {
    id: 'template-provider-outage',
    name: 'Primary AI Provider Outage',
    description: 'Simulate primary AI provider becoming unavailable',
    changes: [
      {
        type: 'provider_outage',
        target: 'openai',
        value: true,
        duration: 3600000,
        description: 'OpenAI unavailable for 1 hour',
      },
    ],
    createdAt: new Date(),
    tags: ['outage', 'ai', 'template'],
  },
  {
    id: 'template-content-surge',
    name: 'Content Publishing Surge',
    description: 'Simulate 5x content publishing rate',
    changes: [
      {
        type: 'content_surge',
        target: 'publishing',
        value: 5.0,
        duration: 7200000,
        description: '5x publish rate for 2 hours',
      },
    ],
    createdAt: new Date(),
    tags: ['content', 'publishing', 'template'],
  },
  {
    id: 'template-search-degradation',
    name: 'Search Index Degradation',
    description: 'Simulate search index becoming stale',
    changes: [
      {
        type: 'search_degradation',
        target: 'search-index',
        value: 0.5,
        description: 'Search relevance drops 50%',
      },
    ],
    createdAt: new Date(),
    tags: ['search', 'degradation', 'template'],
  },
  {
    id: 'template-incident-critical',
    name: 'Critical Incident Injection',
    description: 'Simulate a critical incident occurring',
    changes: [
      {
        type: 'incident_injection',
        target: 'infrastructure',
        value: { severity: 'critical', type: 'service_outage' },
        description: 'Critical infrastructure incident',
      },
    ],
    createdAt: new Date(),
    tags: ['incident', 'critical', 'template'],
  },
  {
    id: 'template-feature-enable',
    name: 'Enable All Features',
    description: 'Simulate enabling all optional features',
    changes: [
      {
        type: 'feature_flag_change',
        target: 'all_optional',
        value: true,
        description: 'Enable all optional features',
      },
    ],
    createdAt: new Date(),
    tags: ['features', 'template'],
  },
];

class ScenarioManager {
  private customScenarios: Map<string, Scenario> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_DECISION_SIMULATOR === 'true';
    if (this.enabled) {
      logger.info('Scenario Manager initialized');
    }
  }

  /**
   * Get a scenario by ID
   */
  get(id: string): Scenario | undefined {
    // Check predefined first
    const predefined = PREDEFINED_SCENARIOS.find(s => s.id === id);
    if (predefined) return predefined;

    return this.customScenarios.get(id);
  }

  /**
   * Create a custom scenario
   */
  create(
    name: string,
    description: string,
    changes: ScenarioChange[],
    tags?: string[]
  ): Scenario {
    const scenario: Scenario = {
      id: generateScenarioId(),
      name,
      description,
      changes,
      createdAt: new Date(),
      tags,
    };

    this.customScenarios.set(scenario.id, scenario);

    // Enforce bounds
    if (this.customScenarios.size > MAX_SCENARIOS) {
      const sorted = Array.from(this.customScenarios.entries())
        .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

      for (const [id] of sorted.slice(0, MAX_SCENARIOS / 4)) {
        this.customScenarios.delete(id);
      }
    }

    logger.info('Custom scenario created', { id: scenario.id, name });
    return scenario;
  }

  /**
   * Query scenarios
   */
  query(query: ScenarioQuery = {}): Scenario[] {
    const all = [...PREDEFINED_SCENARIOS, ...Array.from(this.customScenarios.values())];
    let results = all;

    if (query.tags?.length) {
      results = results.filter(s =>
        s.tags?.some(t => query.tags!.includes(t))
      );
    }

    if (query.type) {
      results = results.filter(s =>
        s.changes.some(c => c.type === query.type)
      );
    }

    // Sort by creation date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * List all scenario templates
   */
  listTemplates(): Scenario[] {
    return PREDEFINED_SCENARIOS;
  }

  /**
   * Delete a custom scenario
   */
  delete(id: string): boolean {
    return this.customScenarios.delete(id);
  }

  /**
   * Clear all custom scenarios
   */
  clear(): void {
    this.customScenarios.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: ScenarioManager | null = null;

export function getScenarioManager(): ScenarioManager {
  if (!instance) {
    instance = new ScenarioManager();
  }
  return instance;
}

export function resetScenarioManager(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { ScenarioManager };
