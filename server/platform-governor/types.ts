/**
 * Autonomous Platform Governor - Type Definitions
 * Feature Flag: ENABLE_PLATFORM_GOVERNOR=false
 */

// ============================================================================
// Conditions & Actions
// ============================================================================

export type ConditionType =
  | 'ai_cost_exceeded'
  | 'error_rate_spike'
  | 'incident_severity_high'
  | 'queue_backlog_large'
  | 'memory_pressure'
  | 'external_api_unstable'
  | 'rate_limit_exceeded'
  | 'database_slow'
  | 'custom';

export type ActionType =
  | 'disable_octopus'
  | 'disable_regeneration'
  | 'disable_experiments'
  | 'throttle_ai'
  | 'force_read_only'
  | 'require_admin_override'
  | 'reduce_concurrency'
  | 'disable_webhooks'
  | 'alert_only'
  | 'custom';

export type Decision = 'ALLOW' | 'THROTTLE' | 'BLOCK';

// ============================================================================
// Rules
// ============================================================================

export interface RuleCondition {
  type: ConditionType;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains';
  value: number | string | boolean;
  field?: string;
}

export interface RuleAction {
  type: ActionType;
  params?: Record<string, unknown>;
  duration?: number; // ms, 0 = until reset
}

export interface GovernorRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // Higher = evaluated first
  conditions: RuleCondition[];
  conditionLogic: 'all' | 'any';
  actions: RuleAction[];
  cooldownMs: number; // Min time between triggers
}

// ============================================================================
// Decisions & Audit
// ============================================================================

export interface GovernorDecision {
  id: string;
  ruleId: string;
  ruleName: string;
  decision: Decision;
  reason: string;
  actions: RuleAction[];
  affectedSystems: string[];
  triggeredAt: Date;
  expiresAt?: Date;
  overriddenBy?: string;
  overriddenAt?: Date;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  ruleId: string;
  ruleName: string;
  decision: Decision;
  reason: string;
  actions: ActionType[];
  affectedSystems: string[];
  duration: number;
  overridden: boolean;
}

// ============================================================================
// Context for Evaluation
// ============================================================================

export interface GovernorContext {
  aiCostToday: number;
  aiCostBudget: number;
  errorRate: number;
  errorRateThreshold: number;
  incidentSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  queueBacklog: number;
  queueBacklogThreshold: number;
  memoryUsagePercent: number;
  memoryThreshold: number;
  externalApiStatus: Record<string, 'healthy' | 'degraded' | 'down'>;
  customMetrics?: Record<string, number | string | boolean>;
}

// ============================================================================
// System Status
// ============================================================================

export interface SystemRestriction {
  system: string;
  restriction: ActionType;
  reason: string;
  appliedAt: Date;
  expiresAt?: Date;
  ruleId: string;
}

export interface GovernorStatus {
  enabled: boolean;
  activeRestrictions: SystemRestriction[];
  recentDecisions: GovernorDecision[];
  rulesCount: number;
  enabledRulesCount: number;
  lastEvaluationAt?: Date;
}

export interface GovernorFeatureStatus {
  enabled: boolean;
  config: {
    evaluationIntervalMs: number;
    maxDecisionsStored: number;
    defaultCooldownMs: number;
  };
}
