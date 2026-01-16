/**
 * Autonomous Platform Governor - Rules Definition
 * Default rules for platform self-governance
 */

import { GOVERNOR_CONFIG } from './config';
import type { GovernorRule } from './types';

// ============================================================================
// Default Rules
// ============================================================================

export const DEFAULT_RULES: GovernorRule[] = [
  // AI Cost Control
  {
    id: 'ai_cost_exceeded',
    name: 'AI Cost Budget Exceeded',
    description: 'Throttle AI operations when daily cost exceeds budget',
    enabled: true,
    priority: 100,
    conditions: [
      {
        type: 'ai_cost_exceeded',
        operator: 'gte',
        value: 1, // 100% of budget
        field: 'aiCostRatio',
      },
    ],
    conditionLogic: 'all',
    actions: [
      { type: 'throttle_ai', params: { factor: 0.1 } },
      { type: 'disable_regeneration' },
    ],
    cooldownMs: 300000, // 5 min
  },

  // AI Cost Warning
  {
    id: 'ai_cost_warning',
    name: 'AI Cost Approaching Limit',
    description: 'Alert when AI cost reaches 80% of budget',
    enabled: true,
    priority: 90,
    conditions: [
      {
        type: 'ai_cost_exceeded',
        operator: 'gte',
        value: 0.8, // 80% of budget
        field: 'aiCostRatio',
      },
    ],
    conditionLogic: 'all',
    actions: [
      { type: 'alert_only' },
    ],
    cooldownMs: 600000, // 10 min
  },

  // Error Rate Spike
  {
    id: 'error_rate_spike',
    name: 'Error Rate Spike',
    description: 'Force read-only mode when error rate spikes',
    enabled: true,
    priority: 95,
    conditions: [
      {
        type: 'error_rate_spike',
        operator: 'gte',
        value: GOVERNOR_CONFIG.thresholds.errorRateSpike,
        field: 'errorRate',
      },
    ],
    conditionLogic: 'all',
    actions: [
      { type: 'force_read_only', duration: 300000 }, // 5 min
      { type: 'require_admin_override' },
    ],
    cooldownMs: 60000,
  },

  // Critical Incident
  {
    id: 'critical_incident',
    name: 'Critical Incident Active',
    description: 'Restrict operations during critical incidents',
    enabled: true,
    priority: 100,
    conditions: [
      {
        type: 'incident_severity_high',
        operator: 'eq',
        value: 'critical',
        field: 'incidentSeverity',
      },
    ],
    conditionLogic: 'all',
    actions: [
      { type: 'disable_experiments' },
      { type: 'disable_regeneration' },
      { type: 'require_admin_override' },
    ],
    cooldownMs: 60000,
  },

  // High Incident
  {
    id: 'high_incident',
    name: 'High Severity Incident',
    description: 'Throttle non-essential operations during high-severity incidents',
    enabled: true,
    priority: 85,
    conditions: [
      {
        type: 'incident_severity_high',
        operator: 'eq',
        value: 'high',
        field: 'incidentSeverity',
      },
    ],
    conditionLogic: 'all',
    actions: [
      { type: 'disable_experiments' },
      { type: 'reduce_concurrency', params: { factor: 0.5 } },
    ],
    cooldownMs: 120000,
  },

  // Queue Backlog
  {
    id: 'queue_backlog',
    name: 'Queue Backlog Too Large',
    description: 'Reduce concurrency when queue backlog is excessive',
    enabled: true,
    priority: 80,
    conditions: [
      {
        type: 'queue_backlog_large',
        operator: 'gte',
        value: GOVERNOR_CONFIG.thresholds.queueBacklogMax,
        field: 'queueBacklog',
      },
    ],
    conditionLogic: 'all',
    actions: [
      { type: 'reduce_concurrency', params: { factor: 0.5 } },
      { type: 'disable_octopus' },
    ],
    cooldownMs: 180000,
  },

  // Memory Pressure
  {
    id: 'memory_pressure',
    name: 'Memory Pressure Detected',
    description: 'Reduce load when memory usage is high',
    enabled: true,
    priority: 90,
    conditions: [
      {
        type: 'memory_pressure',
        operator: 'gte',
        value: GOVERNOR_CONFIG.thresholds.memoryPressurePercent,
        field: 'memoryUsagePercent',
      },
    ],
    conditionLogic: 'all',
    actions: [
      { type: 'reduce_concurrency', params: { factor: 0.25 } },
      { type: 'disable_octopus' },
      { type: 'disable_regeneration' },
    ],
    cooldownMs: 60000,
  },

  // External API Instability
  {
    id: 'external_api_down',
    name: 'External API Down',
    description: 'Disable dependent features when external APIs are down',
    enabled: true,
    priority: 75,
    conditions: [
      {
        type: 'external_api_unstable',
        operator: 'eq',
        value: 'down',
        field: 'externalApiStatus.openai',
      },
    ],
    conditionLogic: 'any',
    actions: [
      { type: 'disable_regeneration' },
      { type: 'disable_octopus' },
    ],
    cooldownMs: 300000,
  },
];

// ============================================================================
// Rule Management
// ============================================================================

const customRules: GovernorRule[] = [];

export function getAllRules(): GovernorRule[] {
  return [...DEFAULT_RULES, ...customRules].sort((a, b) => b.priority - a.priority);
}

export function getEnabledRules(): GovernorRule[] {
  return getAllRules().filter(r => r.enabled);
}

export function getRuleById(id: string): GovernorRule | undefined {
  return getAllRules().find(r => r.id === id);
}

export function addCustomRule(rule: GovernorRule): void {
  customRules.push(rule);
}

export function removeCustomRule(id: string): boolean {
  const index = customRules.findIndex(r => r.id === id);
  if (index >= 0) {
    customRules.splice(index, 1);
    return true;
  }
  return false;
}

export function clearCustomRules(): void {
  customRules.length = 0;
}
