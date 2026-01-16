/**
 * Enterprise Policy Compliance Engine - Policy Definitions
 */

import { log } from '../lib/logger';
import type { Policy, PolicyCategory } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Policies] ${msg}`, data),
};

/**
 * Built-in policy definitions
 */
export const BUILT_IN_POLICIES: Policy[] = [
  // Data Retention Policies
  {
    id: 'data-retention-logs',
    name: 'Log Retention Policy',
    description: 'Logs must be retained for minimum 90 days',
    category: 'data-retention',
    scope: 'system',
    enabled: true,
    check: {
      type: 'config',
      target: 'log.retentionDays',
      operator: 'greater_than',
      expectedValue: 90,
      warningValue: 120,
    },
    thresholds: { warningAt: 120, violationAt: 90, unit: 'days' },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'data-retention-audit',
    name: 'Audit Log Retention',
    description: 'Audit logs must be retained for minimum 365 days',
    category: 'audit-retention',
    scope: 'system',
    enabled: true,
    check: {
      type: 'config',
      target: 'audit.retentionDays',
      operator: 'greater_than',
      expectedValue: 365,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // AI Usage Policies
  {
    id: 'ai-usage-rate-limit',
    name: 'AI Provider Rate Limit',
    description: 'AI usage must not exceed configured rate limits',
    category: 'ai-usage',
    scope: 'system',
    enabled: true,
    check: {
      type: 'runtime',
      target: 'ai.currentUsagePercent',
      operator: 'less_than',
      expectedValue: 100,
      warningValue: 80,
    },
    thresholds: { warningAt: 80, violationAt: 100, unit: '%' },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'ai-usage-cost-limit',
    name: 'AI Daily Cost Limit',
    description: 'AI costs must stay within daily budget',
    category: 'ai-usage',
    scope: 'system',
    enabled: true,
    check: {
      type: 'runtime',
      target: 'ai.dailyCostPercent',
      operator: 'less_than',
      expectedValue: 100,
      warningValue: 75,
    },
    thresholds: { warningAt: 75, violationAt: 100, unit: '%' },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'ai-usage-fallback',
    name: 'AI Fallback Configuration',
    description: 'AI fallback providers must be configured',
    category: 'ai-usage',
    scope: 'system',
    enabled: true,
    check: {
      type: 'config',
      target: 'ai.fallbackProviders',
      operator: 'exists',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Content Ownership Policies
  {
    id: 'content-ownership-attribution',
    name: 'Content Attribution Required',
    description: 'All content must have ownership attribution',
    category: 'content-ownership',
    scope: 'content',
    enabled: true,
    check: {
      type: 'state',
      target: 'content.hasOwnership',
      operator: 'equals',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'content-ownership-license',
    name: 'Content License Required',
    description: 'Published content must have valid license',
    category: 'content-ownership',
    scope: 'content',
    enabled: true,
    check: {
      type: 'state',
      target: 'content.hasLicense',
      operator: 'equals',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Localization Policies
  {
    id: 'localization-default-locale',
    name: 'Default Locale Required',
    description: 'System must have a default locale configured',
    category: 'localization',
    scope: 'system',
    enabled: true,
    check: {
      type: 'config',
      target: 'i18n.defaultLocale',
      operator: 'exists',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'localization-fallback',
    name: 'Locale Fallback Chain',
    description: 'Locale fallback chain must be defined',
    category: 'localization',
    scope: 'system',
    enabled: true,
    check: {
      type: 'config',
      target: 'i18n.fallbackChain',
      operator: 'exists',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Publishing Standards
  {
    id: 'publishing-quality-threshold',
    name: 'Content Quality Threshold',
    description: 'Content must meet minimum quality score',
    category: 'publishing-standards',
    scope: 'content',
    enabled: true,
    check: {
      type: 'state',
      target: 'content.qualityScore',
      operator: 'greater_than',
      expectedValue: 60,
      warningValue: 70,
    },
    thresholds: { warningAt: 70, violationAt: 60, unit: 'score' },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'publishing-review-required',
    name: 'Publishing Review Required',
    description: 'Content must be reviewed before publishing',
    category: 'publishing-standards',
    scope: 'feature',
    enabled: true,
    check: {
      type: 'flag',
      target: 'ENABLE_PUBLISH_REVIEW',
      operator: 'equals',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Kill Switch Policies
  {
    id: 'kill-switch-configured',
    name: 'Kill Switch Configuration',
    description: 'Kill switches must be configured for critical systems',
    category: 'kill-switch',
    scope: 'system',
    enabled: true,
    check: {
      type: 'flag',
      target: 'ENABLE_KILL_SWITCHES',
      operator: 'equals',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'kill-switch-active-count',
    name: 'Active Kill Switches',
    description: 'Number of active kill switches should be minimal',
    category: 'kill-switch',
    scope: 'system',
    enabled: true,
    check: {
      type: 'runtime',
      target: 'killSwitch.activeCount',
      operator: 'less_than',
      expectedValue: 5,
      warningValue: 2,
    },
    thresholds: { warningAt: 2, violationAt: 5, unit: 'switches' },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Security Policies
  {
    id: 'security-auth-enabled',
    name: 'Authentication Enabled',
    description: 'Authentication must be enabled for admin endpoints',
    category: 'security',
    scope: 'system',
    enabled: true,
    check: {
      type: 'config',
      target: 'auth.enabled',
      operator: 'equals',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'security-rate-limiting',
    name: 'Rate Limiting Enabled',
    description: 'Rate limiting must be configured for public APIs',
    category: 'security',
    scope: 'system',
    enabled: true,
    check: {
      type: 'config',
      target: 'rateLimit.enabled',
      operator: 'equals',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Privacy Policies
  {
    id: 'privacy-data-encryption',
    name: 'Data Encryption at Rest',
    description: 'Sensitive data must be encrypted at rest',
    category: 'privacy',
    scope: 'system',
    enabled: true,
    check: {
      type: 'config',
      target: 'encryption.atRest',
      operator: 'equals',
      expectedValue: true,
    },
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Bounded storage for custom policies
const MAX_CUSTOM_POLICIES = 100;

class PolicyManager {
  private customPolicies: Map<string, Policy> = new Map();
  private enabled = false;

  constructor() {
    this.enabled = process.env.ENABLE_COMPLIANCE_ENGINE === 'true';
    if (this.enabled) {
      logger.info('Policy Manager initialized', {
        builtInCount: BUILT_IN_POLICIES.length,
      });
    }
  }

  /**
   * Get a policy by ID
   */
  get(id: string): Policy | undefined {
    const builtIn = BUILT_IN_POLICIES.find(p => p.id === id);
    if (builtIn) return builtIn;
    return this.customPolicies.get(id);
  }

  /**
   * Get all policies
   */
  getAll(): Policy[] {
    return [...BUILT_IN_POLICIES, ...Array.from(this.customPolicies.values())];
  }

  /**
   * Get policies by category
   */
  getByCategory(category: PolicyCategory): Policy[] {
    return this.getAll().filter(p => p.category === category && p.enabled);
  }

  /**
   * Get enabled policies
   */
  getEnabled(): Policy[] {
    return this.getAll().filter(p => p.enabled);
  }

  /**
   * Add custom policy
   */
  add(policy: Policy): void {
    if (BUILT_IN_POLICIES.some(p => p.id === policy.id)) {
      throw new Error(`Cannot override built-in policy: ${policy.id}`);
    }

    this.customPolicies.set(policy.id, policy);

    // Enforce bounds
    if (this.customPolicies.size > MAX_CUSTOM_POLICIES) {
      const first = this.customPolicies.keys().next().value;
      if (first) this.customPolicies.delete(first);
    }
  }

  /**
   * Remove custom policy
   */
  remove(id: string): boolean {
    return this.customPolicies.delete(id);
  }

  /**
   * Count policies
   */
  count(): { builtIn: number; custom: number; total: number } {
    return {
      builtIn: BUILT_IN_POLICIES.length,
      custom: this.customPolicies.size,
      total: BUILT_IN_POLICIES.length + this.customPolicies.size,
    };
  }

  /**
   * Clear custom policies
   */
  clear(): void {
    this.customPolicies.clear();
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton
let instance: PolicyManager | null = null;

export function getPolicyManager(): PolicyManager {
  if (!instance) {
    instance = new PolicyManager();
  }
  return instance;
}

export function resetPolicyManager(): void {
  if (instance) {
    instance.clear();
  }
  instance = null;
}

export { PolicyManager };
