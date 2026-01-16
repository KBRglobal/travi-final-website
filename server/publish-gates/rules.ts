/**
 * Publish Gates - Rules Engine
 * Defines and manages publishing gate rules
 */

import {
  PublishGateRule,
  GateRuleType,
  GateRuleConfig,
  DEFAULT_GATE_CONFIG
} from './types';

const defaultRules: PublishGateRule[] = [
  {
    id: 'min-entity-count',
    name: 'Minimum Entity Count',
    description: 'Content must have at least N extracted entities',
    type: 'min_entity_count',
    enabled: true,
    priority: 100,
    config: {
      threshold: DEFAULT_GATE_CONFIG.defaultThresholds.minEntityCount,
      contentTypes: ['article', 'hotel', 'restaurant', 'attraction'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'search-indexed',
    name: 'Search Index Required',
    description: 'Content must be indexed in internal search',
    type: 'search_indexed',
    enabled: true,
    priority: 90,
    config: {
      contentTypes: ['article', 'hotel', 'restaurant', 'attraction', 'event'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'aeo-capsule-required',
    name: 'AEO Capsule Required',
    description: 'Content must have an approved answer capsule',
    type: 'aeo_capsule_required',
    enabled: true,
    priority: 80,
    config: {
      contentTypes: ['article', 'hotel', 'restaurant', 'attraction'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'intelligence-score',
    name: 'Intelligence Coverage Score',
    description: 'Content must meet minimum intelligence score',
    type: 'intelligence_score',
    enabled: true,
    priority: 70,
    config: {
      threshold: DEFAULT_GATE_CONFIG.defaultThresholds.minIntelligenceScore,
      contentTypes: ['article', 'hotel', 'restaurant', 'attraction'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'internal-links',
    name: 'Internal Links Required',
    description: 'Content must have minimum internal links',
    type: 'internal_links',
    enabled: true,
    priority: 60,
    config: {
      threshold: DEFAULT_GATE_CONFIG.defaultThresholds.minInternalLinks,
      contentTypes: ['article', 'hotel', 'restaurant', 'attraction'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'min-word-count',
    name: 'Minimum Word Count',
    description: 'Content must meet minimum word count',
    type: 'word_count',
    enabled: true,
    priority: 50,
    config: {
      minValue: DEFAULT_GATE_CONFIG.defaultThresholds.minWordCount,
      contentTypes: ['article'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'schema-markup',
    name: 'Schema Markup Required',
    description: 'Content must have valid schema.org markup',
    type: 'schema_markup',
    enabled: false,
    priority: 40,
    config: {
      contentTypes: ['hotel', 'restaurant', 'attraction', 'event'],
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

class RulesRegistry {
  private rules: Map<string, PublishGateRule> = new Map();
  private initialized = false;

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    if (this.initialized) return;

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }
    this.initialized = true;
  }

  getRule(id: string): PublishGateRule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): PublishGateRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  getEnabledRules(): PublishGateRule[] {
    return this.getAllRules().filter(r => r.enabled);
  }

  getRulesForContentType(contentType: string): PublishGateRule[] {
    return this.getEnabledRules().filter(rule => {
      const types = rule.config.contentTypes;
      return !types || types.length === 0 || types.includes(contentType);
    });
  }

  updateRule(id: string, updates: Partial<PublishGateRule>): PublishGateRule | null {
    const existing = this.rules.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      updatedAt: new Date(),
    };
    this.rules.set(id, updated);
    return updated;
  }

  enableRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    rule.enabled = true;
    rule.updatedAt = new Date();
    return true;
  }

  disableRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    rule.enabled = false;
    rule.updatedAt = new Date();
    return true;
  }

  addCustomRule(rule: Omit<PublishGateRule, 'createdAt' | 'updatedAt'>): PublishGateRule {
    const newRule: PublishGateRule = {
      ...rule,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rules.set(rule.id, newRule);
    return newRule;
  }

  removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  setRuleThreshold(id: string, threshold: number): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;
    rule.config.threshold = threshold;
    rule.updatedAt = new Date();
    return true;
  }
}

export const rulesRegistry = new RulesRegistry();

export function getRulesForContent(contentType: string): PublishGateRule[] {
  return rulesRegistry.getRulesForContentType(contentType);
}

export function isRuleEnabled(ruleId: string): boolean {
  const rule = rulesRegistry.getRule(ruleId);
  return rule?.enabled ?? false;
}
