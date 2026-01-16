/**
 * Autonomy Policy Engine - Types
 * Defines allowed actions, budgets, and policy decisions
 */

import { z } from 'zod';

// Policy decision outcomes
export type PolicyDecision = 'ALLOW' | 'WARN' | 'BLOCK';

// Policy target scopes
export type PolicyTargetType = 'global' | 'feature' | 'entity' | 'locale';

// Features that can have policies
export type FeatureType = 'octopus' | 'search' | 'aeo' | 'chat' | 'content' | 'automation';

// Entity types that can have policies
export type EntityType = 'hotel' | 'attraction' | 'dining' | 'content' | 'article' | 'event';

// Approval levels
export type ApprovalLevel = 'none' | 'auto' | 'review' | 'manual';

// Action types the system can take
export type ActionType =
  | 'content_create'
  | 'content_update'
  | 'content_delete'
  | 'content_publish'
  | 'ai_generate'
  | 'ai_enrich'
  | 'db_write'
  | 'db_delete'
  | 'external_api'
  | 'notification'
  | 'bulk_operation';

// Budget period types
export type BudgetPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly';

// Policy target specification
export interface PolicyTarget {
  type: PolicyTargetType;
  feature?: FeatureType;
  entity?: EntityType;
  locale?: string;
}

// Time window for allowed operations
export interface TimeWindow {
  startHour: number; // 0-23
  endHour: number;   // 0-23
  daysOfWeek: number[]; // 0-6 (Sun-Sat)
  timezone: string;
}

// Individual budget limit
export interface BudgetLimit {
  period: BudgetPeriod;
  maxActions: number;
  maxAiSpend: number; // in cents
  maxDbWrites: number;
  maxContentMutations: number;
}

// Policy definition
export interface PolicyDefinition {
  id: string;
  name: string;
  description?: string;
  target: PolicyTarget;
  enabled: boolean;
  priority: number; // Higher = more specific, evaluated first

  // Action controls
  allowedActions: ActionType[];
  blockedActions: ActionType[];

  // Budget limits
  budgetLimits: BudgetLimit[];

  // Time restrictions
  allowedHours?: TimeWindow;

  // Approval requirements
  approvalLevel: ApprovalLevel;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Decision result with reasons
export interface PolicyEvaluationResult {
  decision: PolicyDecision;
  reasons: PolicyReason[];
  matchedPolicy?: string;
  budgetStatus?: BudgetStatus;
  evaluatedAt: Date;
}

export interface PolicyReason {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

// Current budget status
export interface BudgetStatus {
  targetKey: string;
  period: BudgetPeriod;
  periodStart: Date;
  periodEnd: Date;

  actionsExecuted: number;
  actionsLimit: number;
  actionsRemaining: number;

  aiSpendActual: number;
  aiSpendLimit: number;
  aiSpendRemaining: number;

  dbWritesCount: number;
  dbWritesLimit: number;
  dbWritesRemaining: number;

  contentMutationsCount: number;
  contentMutationsLimit: number;
  contentMutationsRemaining: number;

  failuresCount: number;
}

// Budget counter record (for DB)
export interface BudgetCounter {
  id: string;
  targetKey: string;
  period: BudgetPeriod;
  periodStart: Date;
  periodEnd: Date;

  actionsExecuted: number;
  actionsProposed: number;
  tokensEstimated: number;
  tokensActual: number;
  writesCount: number;
  failuresCount: number;
  contentMutations: number;
  aiSpendCents: number;

  createdAt: Date;
  updatedAt: Date;
}

// Decision log entry
export interface DecisionLogEntry {
  id: string;
  timestamp: Date;
  targetKey: string;
  actionType: ActionType;
  decision: PolicyDecision;
  reasons: PolicyReason[];
  matchedPolicyId?: string;
  requesterId?: string;
  metadata?: Record<string, unknown>;
}

// Zod schemas for validation
export const policyTargetSchema = z.object({
  type: z.enum(['global', 'feature', 'entity', 'locale']),
  feature: z.enum(['octopus', 'search', 'aeo', 'chat', 'content', 'automation']).optional(),
  entity: z.enum(['hotel', 'attraction', 'dining', 'content', 'article', 'event']).optional(),
  locale: z.string().max(10).optional(),
});

export const timeWindowSchema = z.object({
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  daysOfWeek: z.array(z.number().int().min(0).max(6)),
  timezone: z.string().max(50),
});

export const budgetLimitSchema = z.object({
  period: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  maxActions: z.number().int().min(0).max(100000),
  maxAiSpend: z.number().int().min(0).max(10000000), // max $100k
  maxDbWrites: z.number().int().min(0).max(100000),
  maxContentMutations: z.number().int().min(0).max(10000),
});

export const policyDefinitionSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  target: policyTargetSchema,
  enabled: z.boolean(),
  priority: z.number().int().min(0).max(1000),
  allowedActions: z.array(z.enum([
    'content_create', 'content_update', 'content_delete', 'content_publish',
    'ai_generate', 'ai_enrich', 'db_write', 'db_delete', 'external_api',
    'notification', 'bulk_operation'
  ])),
  blockedActions: z.array(z.enum([
    'content_create', 'content_update', 'content_delete', 'content_publish',
    'ai_generate', 'ai_enrich', 'db_write', 'db_delete', 'external_api',
    'notification', 'bulk_operation'
  ])),
  budgetLimits: z.array(budgetLimitSchema),
  allowedHours: timeWindowSchema.optional(),
  approvalLevel: z.enum(['none', 'auto', 'review', 'manual']),
});

export const policyUpdateSchema = policyDefinitionSchema.partial().required({ id: true });
