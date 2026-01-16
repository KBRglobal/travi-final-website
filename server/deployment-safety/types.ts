/**
 * Deployment Safety & Monitoring - Type Definitions
 *
 * Comprehensive types for the deployment safety system including:
 * - Release Gates
 * - Rollback Management
 * - Environment Parity
 * - Health Probes
 * - Incident Lifecycle
 */

// ============================================================================
// Environment Types
// ============================================================================

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  name: Environment;
  baseUrl: string;
  databaseUrl: string;
  replicaCount: number;
  memoryMB: number;
  cpuCores: number;
  featureFlags: Record<string, boolean>;
  secrets: string[];
  version?: string;
  lastDeployedAt?: Date;
}

// ============================================================================
// Release Gate Types
// ============================================================================

export type GateStatus = 'pending' | 'passed' | 'failed' | 'skipped' | 'timeout';
export type GateType =
  | 'health_check'
  | 'smoke_test'
  | 'integration_test'
  | 'performance_check'
  | 'security_scan'
  | 'database_migration'
  | 'dependency_check'
  | 'manual_approval'
  | 'canary_check'
  | 'rollback_ready';

export interface ReleaseGate {
  id: string;
  type: GateType;
  name: string;
  description: string;
  required: boolean;
  status: GateStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  error?: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
}

export interface ReleaseGateResult {
  gate: ReleaseGate;
  passed: boolean;
  blocksRelease: boolean;
  message: string;
}

export interface ReleaseValidation {
  id: string;
  version: string;
  environment: Environment;
  startedAt: Date;
  completedAt?: Date;
  gates: ReleaseGate[];
  overallStatus: GateStatus;
  canProceed: boolean;
  failedGates: string[];
  passedGates: string[];
  pendingGates: string[];
}

// ============================================================================
// Canary Deployment Types
// ============================================================================

export type CanaryStatus =
  | 'not_started'
  | 'initializing'
  | 'running'
  | 'evaluating'
  | 'success'
  | 'failed'
  | 'rolled_back'
  | 'promoted';

export interface CanaryMetrics {
  errorRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyP99Ms: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  saturationPercent: number;
}

export interface CanaryConfig {
  initialPercentage: number;
  incrementPercentage: number;
  intervalMs: number;
  maxPercentage: number;
  successThreshold: number;
  errorRateThreshold: number;
  latencyThresholdMs: number;
  minimumRequests: number;
  autoPromote: boolean;
  autoRollback: boolean;
}

export interface CanaryDeployment {
  id: string;
  version: string;
  baselineVersion: string;
  environment: Environment;
  status: CanaryStatus;
  currentPercentage: number;
  config: CanaryConfig;
  startedAt: Date;
  lastEvaluatedAt?: Date;
  completedAt?: Date;
  canaryMetrics: CanaryMetrics;
  baselineMetrics: CanaryMetrics;
  evaluations: CanaryEvaluation[];
  decision?: CanaryDecision;
}

export interface CanaryEvaluation {
  timestamp: Date;
  percentage: number;
  canaryMetrics: CanaryMetrics;
  baselineMetrics: CanaryMetrics;
  passed: boolean;
  reasons: string[];
}

export interface CanaryDecision {
  action: 'promote' | 'rollback' | 'continue';
  reason: string;
  timestamp: Date;
  automatic: boolean;
  actor?: string;
}

// ============================================================================
// Rollback Types
// ============================================================================

export type RollbackTrigger =
  | 'manual'
  | 'error_rate'
  | 'latency'
  | 'health_check'
  | 'canary_failure'
  | 'incident'
  | 'budget_exceeded'
  | 'timeout';

export type RollbackStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface RollbackPlan {
  id: string;
  fromVersion: string;
  toVersion: string;
  environment: Environment;
  trigger: RollbackTrigger;
  status: RollbackStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  steps: RollbackStep[];
  currentStep: number;
  error?: string;
  actor?: string;
  automatic: boolean;
}

export interface RollbackStep {
  id: string;
  name: string;
  description: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  rollbackable: boolean;
}

export interface RollbackHistory {
  id: string;
  environment: Environment;
  rollbacks: RollbackPlan[];
  lastRollbackAt?: Date;
  rollbackCount: number;
  avgDurationMs: number;
  successRate: number;
}

// ============================================================================
// Health Probe Types
// ============================================================================

export type ProbeType =
  | 'liveness'
  | 'readiness'
  | 'startup'
  | 'dependency'
  | 'database'
  | 'cache'
  | 'external_api'
  | 'queue'
  | 'storage'
  | 'memory'
  | 'disk'
  | 'custom';

export type ProbeStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthProbe {
  id: string;
  type: ProbeType;
  name: string;
  description: string;
  endpoint?: string;
  intervalMs: number;
  timeoutMs: number;
  successThreshold: number;
  failureThreshold: number;
  lastChecked?: Date;
  lastStatus: ProbeStatus;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  latencyMs?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface ProbeResult {
  probe: HealthProbe;
  status: ProbeStatus;
  latencyMs: number;
  timestamp: Date;
  error?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealth {
  overall: ProbeStatus;
  probes: HealthProbe[];
  timestamp: Date;
  environment: Environment;
  version: string;
  uptime: number;
  degradedProbes: string[];
  unhealthyProbes: string[];
}

// ============================================================================
// Incident Lifecycle Types (Extended)
// ============================================================================

export type IncidentPhase =
  | 'detection'
  | 'triage'
  | 'investigation'
  | 'mitigation'
  | 'resolution'
  | 'postmortem'
  | 'closed';

export type EscalationLevel = 1 | 2 | 3 | 4;

export interface EscalationPolicy {
  level: EscalationLevel;
  afterMinutes: number;
  notifyChannels: string[];
  requiresAcknowledgement: boolean;
  autoEscalate: boolean;
}

export interface IncidentTimeline {
  timestamp: Date;
  phase: IncidentPhase;
  actor: string;
  action: string;
  notes?: string;
  automatic: boolean;
}

export interface IncidentMetrics {
  timeToDetectionMs: number;
  timeToAcknowledgeMs: number;
  timeToMitigateMs: number;
  timeToResolveMs: number;
  totalDurationMs: number;
  escalationCount: number;
  updateCount: number;
  affectedUsers?: number;
  affectedRequests?: number;
}

export interface Postmortem {
  incidentId: string;
  createdAt: Date;
  completedAt?: Date;
  summary: string;
  rootCause: string;
  contributingFactors: string[];
  timeline: IncidentTimeline[];
  impactAssessment: string;
  lessonsLearned: string[];
  actionItems: PostmortemActionItem[];
  authors: string[];
  reviewers: string[];
  approved: boolean;
}

export interface PostmortemActionItem {
  id: string;
  description: string;
  owner: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: Date;
}

// ============================================================================
// Cost Anomaly Types
// ============================================================================

export interface CostAnomaly {
  id: string;
  feature: string;
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'spike' | 'sustained_increase' | 'unusual_pattern';
  expectedCost: number;
  actualCost: number;
  deviationPercent: number;
  description: string;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface CostForecast {
  feature: string;
  currentDailyRate: number;
  projectedDailyCost: number;
  projectedMonthlyCost: number;
  confidence: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  alerts: CostAlert[];
}

export interface CostAlert {
  type: 'approaching_limit' | 'exceeded_limit' | 'anomaly' | 'forecast_warning';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  threshold: number;
  currentValue: number;
  timestamp: Date;
}

// ============================================================================
// Environment Parity Types
// ============================================================================

export interface ParityCheck {
  id: string;
  category: 'config' | 'schema' | 'secrets' | 'features' | 'resources' | 'dependencies';
  name: string;
  description: string;
  environments: Environment[];
  status: 'in_sync' | 'drift' | 'unknown' | 'error';
  differences: ParityDifference[];
  lastChecked: Date;
  severity: 'info' | 'warning' | 'critical';
}

export interface ParityDifference {
  key: string;
  category: string;
  environments: Array<{
    environment: Environment;
    value: unknown;
    present: boolean;
  }>;
  expectedValue?: unknown;
  recommendation?: string;
}

export interface ParityReport {
  id: string;
  generatedAt: Date;
  environments: Environment[];
  checks: ParityCheck[];
  overallStatus: 'in_sync' | 'drift' | 'critical_drift';
  driftCount: number;
  criticalDriftCount: number;
  recommendations: string[];
}

// ============================================================================
// Load Shedding Types
// ============================================================================

export type SheddingStrategy = 'random' | 'fifo' | 'priority' | 'adaptive';

export interface LoadSheddingConfig {
  enabled: boolean;
  strategy: SheddingStrategy;
  thresholds: {
    warning: number;
    critical: number;
    emergency: number;
  };
  priorities: Record<string, number>;
  exemptEndpoints: string[];
  retryAfterSeconds: number;
  gracefulDegradation: boolean;
}

export interface LoadSheddingState {
  active: boolean;
  level: 'none' | 'warning' | 'critical' | 'emergency';
  activatedAt?: Date;
  sheddingPercent: number;
  rejectedRequests: number;
  acceptedRequests: number;
  lastDecision: Date;
  reason?: string;
}

// ============================================================================
// Deployment Orchestration Types
// ============================================================================

export interface DeploymentPlan {
  id: string;
  version: string;
  targetEnvironment: Environment;
  strategy: 'rolling' | 'blue_green' | 'canary' | 'recreate';
  createdAt: Date;
  scheduledFor?: Date;
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  phases: DeploymentPhase[];
  currentPhase: number;
  rollbackPlan: RollbackPlan;
  approvals: DeploymentApproval[];
  notifications: NotificationConfig[];
}

export interface DeploymentPhase {
  id: string;
  name: string;
  order: number;
  type: 'pre_deploy' | 'deploy' | 'verify' | 'post_deploy';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  gates: ReleaseGate[];
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface DeploymentApproval {
  phase: string;
  requiredApprovers: string[];
  approvedBy: string[];
  approved: boolean;
  approvedAt?: Date;
  expiresAt?: Date;
}

export interface NotificationConfig {
  event: 'start' | 'phase_complete' | 'gate_failed' | 'success' | 'failure' | 'rollback';
  channels: string[];
  template: string;
}

// ============================================================================
// Aggregate Status Types
// ============================================================================

export interface DeploymentSafetyStatus {
  timestamp: Date;
  environment: Environment;
  version: string;
  health: SystemHealth;
  releaseValidation?: ReleaseValidation;
  canary?: CanaryDeployment;
  activeRollback?: RollbackPlan;
  incidentCount: number;
  criticalIncidents: number;
  costStatus: {
    withinBudget: boolean;
    anomalies: number;
  };
  parityStatus: {
    inSync: boolean;
    driftCount: number;
  };
  backpressure: {
    level: 'none' | 'light' | 'heavy';
    active: boolean;
  };
  loadShedding: LoadSheddingState;
  readyForDeploy: boolean;
  blockers: string[];
}
