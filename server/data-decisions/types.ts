/**
 * Data-Decisions Type Definitions
 * Core types for the Decision Operating System
 */

// =============================================================================
// AUTHORITY LEVELS
// =============================================================================

export type AuthorityLevel = 'blocking' | 'triggering' | 'escalating' | 'advisory';

export type AutopilotMode = 'off' | 'supervised' | 'full';

export type DecisionCategory = 'auto_execute' | 'supervised' | 'escalation_only' | 'forbidden';

// =============================================================================
// DECISION TYPES
// =============================================================================

export type DecisionType =
  // Blocking decisions
  | 'BLOCK_ALL_DEPLOYMENTS'
  | 'FREEZE_AUTOMATION'
  | 'THROTTLE_AI'
  | 'BLOCK_PUBLISH'

  // Triggering decisions
  | 'TRIGGER_CONTENT_REVIEW'
  | 'TRIGGER_META_OPTIMIZATION'
  | 'TRIGGER_AEO_AUDIT'
  | 'TRIGGER_CONTENT_REFRESH'
  | 'TRIGGER_CRO_ANALYSIS'
  | 'TRIGGER_INTERLINKING_TASK'
  | 'TRIGGER_SEO_REWRITE'
  | 'TRIGGER_MONETIZATION_REVIEW'
  | 'TRIGGER_CTR_OPTIMIZATION'
  | 'TRIGGER_ENGAGEMENT_OPTIMIZATION'
  | 'TRIGGER_CTA_OPTIMIZATION'
  | 'TRIGGER_INVESTIGATION'

  // Automation decisions
  | 'AUTO_OPTIMIZE_CACHE'
  | 'AUTO_SCALE_WORKERS'
  | 'INCREASE_CRAWL_PRIORITY'
  | 'DISABLE_FEATURE'
  | 'REDUCE_TRAFFIC'

  // Escalation decisions
  | 'ESCALATE_TO_HUMAN'
  | 'LOG_AND_MONITOR'
  | 'EXECUTE_IMMEDIATE_ACTION'

  // Safety decisions
  | 'ROLLBACK_CHANGES'
  | 'DISABLE_SYSTEM';

// =============================================================================
// SIGNAL DEFINITIONS
// =============================================================================

export interface SignalCondition {
  metric?: string;
  condition: string;
  duration?: string;
  context?: string;
  additionalCondition?: string;
  minDataPoints?: number;
  funnel?: string;
  stage?: string;
  dropoff?: string;
  type?: 'metric' | 'anomaly' | 'funnel';
  anomalyType?: 'spike' | 'drop' | 'trend_break' | 'threshold';
  severity?: 'warning' | 'critical' | 'any';
}

export interface EvaluatedSignal {
  bindingId: string;
  metricId: string;
  currentValue: number;
  threshold: number;
  condition: string;
  triggered: boolean;
  confidence: number;
  dataPoints: number;
  freshness: number; // hours since last update
}

// =============================================================================
// BINDING DEFINITIONS
// =============================================================================

export interface EscalationConfig {
  primary: string;
  secondary?: string;
  tertiary?: string;
  channel: 'urgent' | 'high' | 'normal';
  sla: string;
}

export interface TaskConfig {
  type: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  automatable?: boolean;
}

export interface DataActionBinding {
  id: string;
  signal: SignalCondition;
  action: DecisionType;
  authority: AuthorityLevel;
  autopilot: AutopilotMode;
  cooldown: number; // seconds
  maxExecutions: number | 'unlimited';
  escalation?: EscalationConfig;
  task?: TaskConfig;
  enabled: boolean;
  lastTriggered?: Date;
  executionCount: number;
}

// =============================================================================
// DECISION DEFINITIONS
// =============================================================================

export type DecisionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'executed'
  | 'failed'
  | 'expired'
  | 'cancelled';

export interface Decision {
  id: string;
  bindingId: string;
  type: DecisionType;
  category: DecisionCategory;
  authority: AuthorityLevel;

  // Triggering context
  signal: {
    metricId: string;
    value: number;
    threshold: number;
    condition: string;
  };

  // Confidence & trust
  confidence: number;
  dataSufficiency: number;
  freshness: number;

  // Status
  status: DecisionStatus;
  autopilotMode: AutopilotMode;

  // Timestamps
  createdAt: Date;
  expiresAt?: Date;
  executedAt?: Date;

  // Execution
  executedBy?: 'system' | string;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;

  // Task reference (if decision creates a task)
  taskId?: string;
  taskConfig?: TaskConfig;

  // Escalation
  escalation?: EscalationConfig;
  escalatedTo?: string[];

  // Outcome
  outcome?: 'success' | 'failure' | 'partial';
  outcomeDetails?: Record<string, unknown>;

  // Impact tracking
  impactedEntities: Array<{
    type: string;
    id: string;
  }>;
}

// =============================================================================
// CONFLICT DEFINITIONS
// =============================================================================

export type ConflictType =
  | 'inverse_correlation'
  | 'velocity_mismatch'
  | 'goal_conflict'
  | 'temporal_conflict';

export type ConflictSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface MetricConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  metrics: Array<{
    id: string;
    trend: 'up' | 'down' | 'stable';
    value: number;
    change: number;
  }>;
  resolution: {
    decision: string;
    action: DecisionType | 'escalate_to_human';
    rationale: string;
    decidedBy: 'automated' | string;
  };
  detectedAt: Date;
  resolvedAt?: Date;
  outcome?: {
    measuredAt: Date;
    result: string;
    sideEffects: string[];
  };
}

// =============================================================================
// CONFIDENCE & TRUST
// =============================================================================

export interface DataTrustScore {
  metricId: string;
  overallTrust: number; // 0-100
  components: {
    freshness: number;
    completeness: number;
    consistency: number;
    accuracy: number;
  };
  dataPoints: number;
  timeRange: {
    start: Date;
    end: Date;
  };
  lastUpdated: Date;
  issues: string[];
}

export interface ConfidenceScore {
  decisionId: string;
  overall: number; // 0-100
  components: {
    dataTrust: number;
    signalStrength: number;
    historicalAccuracy: number;
    modelConfidence: number;
  };
  meetsThreshold: boolean;
  minimumRequired: number;
}

// =============================================================================
// AUTONOMOUS LOOP
// =============================================================================

export type LoopPhase = 'measure' | 'decide' | 'act' | 'observe' | 'adjust';

export interface LoopState {
  currentPhase: LoopPhase;
  cycleId: string;
  cycleNumber: number;
  startedAt: Date;
  metrics: {
    collected: number;
    anomaliesDetected: number;
    conflictsFound: number;
  };
  decisions: {
    generated: number;
    autoExecuted: number;
    pendingApproval: number;
    escalated: number;
  };
  actions: {
    executed: number;
    successful: number;
    failed: number;
  };
  observations: {
    outcomes: number;
    improvements: number;
    regressions: number;
  };
  adjustments: {
    thresholdChanges: number;
    bindingUpdates: number;
    modelRetraining: number;
  };
}

export interface LoopCycle {
  id: string;
  number: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  phases: {
    measure: PhaseResult;
    decide: PhaseResult;
    act: PhaseResult;
    observe: PhaseResult;
    adjust: PhaseResult;
  };
  summary: {
    totalDecisions: number;
    executedActions: number;
    successRate: number;
    anomaliesHandled: number;
  };
}

export interface PhaseResult {
  startedAt: Date;
  completedAt: Date;
  duration: number;
  success: boolean;
  output: Record<string, unknown>;
  errors: string[];
}

// =============================================================================
// SYSTEM HEALTH
// =============================================================================

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  components: {
    metricsCollection: ComponentHealth;
    decisionEngine: ComponentHealth;
    actionExecution: ComponentHealth;
    dataFreshness: ComponentHealth;
    circuitBreaker: ComponentHealth;
  };
  alerts: SystemAlert[];
  uptime: number;
  lastCycleAt: Date;
  cyclesLast24h: number;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  lastCheck: Date;
  latency?: number;
  errorRate?: number;
  details?: string;
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  component: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

// =============================================================================
// DATA DRIFT
// =============================================================================

export interface DataDriftStatus {
  detected: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'severe';
  metrics: DriftingMetric[];
  detectedAt?: Date;
  recommendation: string;
}

export interface DriftingMetric {
  metricId: string;
  driftType: 'distribution' | 'trend' | 'seasonality' | 'outlier';
  magnitude: number;
  baselinePeriod: string;
  currentPeriod: string;
  details: string;
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreaker {
  state: CircuitBreakerState;
  openedAt?: Date;
  reason?: string;
  failureCount: number;
  successCount: number;
  lastFailureAt?: Date;
  lastSuccessAt?: Date;
  cooldownEndsAt?: Date;
  autoRecovery: boolean;
}

// =============================================================================
// GOVERNANCE & AUDIT
// =============================================================================

export interface DecisionAuditLog {
  decisionId: string;
  timestamp: Date;

  // Triggering
  triggerType: 'metric' | 'anomaly' | 'funnel' | 'manual';
  triggerId: string;
  triggerValue: number;
  threshold: number;

  // Confidence
  confidence: number;
  dataSufficiency: number;
  freshness: number;

  // Decision
  decisionType: DecisionType;
  category: DecisionCategory;
  autopilotMode: AutopilotMode;

  // Execution
  executed: boolean;
  executedAt?: Date;
  executedBy: 'system' | string;

  // Approval
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;

  // Outcome
  outcome?: 'success' | 'failure' | 'partial';
  outcomeDetails?: Record<string, unknown>;

  // Impact
  impactedEntities: Array<{
    type: string;
    id: string;
  }>;
}

export interface OverrideLog {
  id: string;
  overrideType: 'temporary' | 'extended' | 'permanent';
  scope: 'decision' | 'category' | 'all';
  targetId?: string;
  reason: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  expired: boolean;
  reviewScheduled?: Date;
}

// =============================================================================
// RATE LIMITING
// =============================================================================

export interface RateLimitStatus {
  bindingId: string;
  windowStart: Date;
  windowEnd: Date;
  executionsInWindow: number;
  maxExecutions: number;
  isLimited: boolean;
  resetsAt: Date;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface DecisionQueueResponse {
  pending: Decision[];
  totalCount: number;
  byCategory: Record<DecisionCategory, number>;
  oldestDecision?: Date;
  nextExpiring?: Decision;
}

export interface ExecutiveDecisionView {
  criticalDecisions: Decision[];
  escalations: Decision[];
  recentExecutions: Decision[];
  systemHealth: SystemHealthStatus;
  conflicts: MetricConflict[];
  autopilotMode: AutopilotMode;
  circuitBreaker: CircuitBreaker;
}

export interface DomainDecisionView {
  domain: string;
  pendingDecisions: Decision[];
  recentDecisions: Decision[];
  metrics: {
    decisionsToday: number;
    autoExecuted: number;
    pendingApproval: number;
    successRate: number;
  };
  alerts: SystemAlert[];
}
