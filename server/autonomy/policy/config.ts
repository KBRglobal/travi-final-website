/**
 * Autonomy Policy Engine - Configuration
 * Default policies and configuration constants
 */

import {
  PolicyDefinition,
  BudgetLimit,
  PolicyTarget,
} from './types';

export interface AutonomyConfig {
  enabled: boolean;
  defaultApprovalLevel: 'none' | 'auto' | 'review' | 'manual';
  maxDecisionLogEntries: number;
  budgetCheckTimeoutMs: number;
  policyEvaluationTimeoutMs: number;
  defaultTimezone: string;
}

export const DEFAULT_AUTONOMY_CONFIG: AutonomyConfig = {
  enabled: false,
  defaultApprovalLevel: 'auto',
  maxDecisionLogEntries: 10000,
  budgetCheckTimeoutMs: 5000,
  policyEvaluationTimeoutMs: 3000,
  defaultTimezone: 'UTC',
};

// Default budget limits per period
export const DEFAULT_HOURLY_BUDGET: BudgetLimit = {
  period: 'hourly',
  maxActions: 100,
  maxAiSpend: 1000, // $10
  maxDbWrites: 500,
  maxContentMutations: 20,
};

export const DEFAULT_DAILY_BUDGET: BudgetLimit = {
  period: 'daily',
  maxActions: 1000,
  maxAiSpend: 10000, // $100
  maxDbWrites: 5000,
  maxContentMutations: 100,
};

// Default global policy
export const DEFAULT_GLOBAL_POLICY: PolicyDefinition = {
  id: 'default-global',
  name: 'Default Global Policy',
  description: 'Base policy applied to all autonomous operations',
  target: { type: 'global' },
  enabled: true,
  priority: 0,
  allowedActions: [
    'content_update',
    'ai_generate',
    'ai_enrich',
    'db_write',
    'notification',
  ],
  blockedActions: [
    'content_delete',
    'db_delete',
    'bulk_operation',
  ],
  budgetLimits: [DEFAULT_HOURLY_BUDGET, DEFAULT_DAILY_BUDGET],
  approvalLevel: 'auto',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Feature-specific default policies
export const FEATURE_POLICIES: PolicyDefinition[] = [
  {
    id: 'policy-octopus',
    name: 'Octopus Feature Policy',
    description: 'Policy for Octopus enrichment operations',
    target: { type: 'feature', feature: 'octopus' },
    enabled: true,
    priority: 10,
    allowedActions: ['ai_enrich', 'db_write', 'external_api'],
    blockedActions: ['content_delete', 'bulk_operation'],
    budgetLimits: [
      { period: 'hourly', maxActions: 50, maxAiSpend: 500, maxDbWrites: 200, maxContentMutations: 10 },
      { period: 'daily', maxActions: 500, maxAiSpend: 5000, maxDbWrites: 2000, maxContentMutations: 50 },
    ],
    approvalLevel: 'auto',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'policy-aeo',
    name: 'AEO Feature Policy',
    description: 'Policy for Answer Engine Optimization',
    target: { type: 'feature', feature: 'aeo' },
    enabled: true,
    priority: 10,
    allowedActions: ['ai_generate', 'content_update', 'db_write'],
    blockedActions: ['content_delete', 'bulk_operation'],
    budgetLimits: [
      { period: 'hourly', maxActions: 30, maxAiSpend: 300, maxDbWrites: 100, maxContentMutations: 15 },
      { period: 'daily', maxActions: 300, maxAiSpend: 3000, maxDbWrites: 1000, maxContentMutations: 100 },
    ],
    approvalLevel: 'auto',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'policy-chat',
    name: 'Chat Feature Policy',
    description: 'Policy for chat/AI assistant operations',
    target: { type: 'feature', feature: 'chat' },
    enabled: true,
    priority: 10,
    allowedActions: ['ai_generate', 'db_write', 'notification'],
    blockedActions: ['content_delete', 'content_publish', 'bulk_operation'],
    budgetLimits: [
      { period: 'hourly', maxActions: 200, maxAiSpend: 2000, maxDbWrites: 50, maxContentMutations: 0 },
      { period: 'daily', maxActions: 2000, maxAiSpend: 20000, maxDbWrites: 500, maxContentMutations: 0 },
    ],
    approvalLevel: 'none',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Generate target key for budget tracking
export function generateTargetKey(target: PolicyTarget): string {
  const parts = [target.type];
  if (target.feature) parts.push(target.feature);
  if (target.entity) parts.push(target.entity);
  if (target.locale) parts.push(target.locale);
  return parts.join(':');
}

// Check if currently within allowed time window
export function isWithinTimeWindow(
  window: { startHour: number; endHour: number; daysOfWeek: number[]; timezone: string } | undefined
): boolean {
  if (!window) return true; // No restriction

  const now = new Date();
  // Simple UTC-based check (production would use proper timezone library)
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay();

  if (!window.daysOfWeek.includes(currentDay)) {
    return false;
  }

  if (window.startHour <= window.endHour) {
    return currentHour >= window.startHour && currentHour < window.endHour;
  } else {
    // Wraps around midnight
    return currentHour >= window.startHour || currentHour < window.endHour;
  }
}

// Get period boundaries
export function getPeriodBoundaries(period: 'hourly' | 'daily' | 'weekly' | 'monthly'): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'hourly':
      start.setMinutes(0, 0, 0);
      end.setMinutes(59, 59, 999);
      break;
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'monthly':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}
