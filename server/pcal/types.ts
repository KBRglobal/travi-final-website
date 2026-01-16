/**
 * Platform Command & Accountability Layer (PCAL) - Type Definitions
 * Feature Flag: ENABLE_PCAL=false
 *
 * Unified decision tracking, authority chains, and accountability.
 */

// ============================================================================
// PHASE 1: Decision Unification
// ============================================================================

export type DecisionScope = 'platform' | 'feature' | 'content' | 'entity' | 'locale' | 'segment';
export type DecisionAuthority = 'system' | 'admin' | 'automation' | 'policy' | 'human';
export type DecisionOutcome = 'approved' | 'denied' | 'blocked' | 'warning' | 'escalated' | 'overridden';
export type DecisionSource =
  | 'glcp'
  | 'cutover'
  | 'autonomy'
  | 'publish-gate'
  | 'governor'
  | 'incident'
  | 'rollout'
  | 'override'
  | 'manual';

export interface DecisionRecord {
  id: string;
  timestamp: Date;
  source: DecisionSource;
  sourceId?: string;
  scope: DecisionScope;
  scopeId?: string;
  authority: DecisionAuthority;
  outcome: DecisionOutcome;
  confidence: number; // 0-100
  reversible: boolean;
  ttlMs?: number;
  reason: string;
  signals: DecisionSignal[];
  actor?: string;
  overrideOf?: string;
  signature: string;
}

export interface DecisionSignal {
  name: string;
  value: unknown;
  weight: number;
  source: string;
}

// ============================================================================
// PHASE 2: Authority & Accountability Chain
// ============================================================================

export interface AuthorityNode {
  type: 'system' | 'policy' | 'human' | 'automation';
  id: string;
  name: string;
  timestamp: Date;
  action: 'allowed' | 'approved' | 'delegated' | 'overridden' | 'bypassed';
  reason?: string;
}

export interface AuthorityChain {
  decisionId: string;
  nodes: AuthorityNode[];
  finalAuthority: AuthorityNode;
  humanApproval?: AuthorityNode;
  overrides: OverrideRecord[];
  bypassedPolicies: string[];
  signalsAtDecisionTime: DecisionSignal[];
}

export interface OverrideRecord {
  id: string;
  overriddenDecisionId: string;
  overriddenBy: string;
  reason: string;
  justification: string;
  ttlMs: number;
  expiresAt: Date;
  createdAt: Date;
  stillActive: boolean;
}

export interface ApprovalLineage {
  decisionId: string;
  approvals: ApprovalRecord[];
  systemApprovals: string[];
  humanApprovals: string[];
  escalationPath: string[];
}

export interface ApprovalRecord {
  id: string;
  approvedBy: string;
  type: 'human' | 'system' | 'policy';
  timestamp: Date;
  scope: string;
  reason?: string;
}

// ============================================================================
// PHASE 3: Platform Memory
// ============================================================================

export interface FailurePattern {
  id: string;
  name: string;
  description: string;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedSystems: string[];
  linkedDecisions: string[];
  linkedIncidents: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'worsening';
}

export interface IncidentDecisionLink {
  incidentId: string;
  decisionId: string;
  linkType: 'caused_by' | 'followed' | 'related' | 'resolved_by';
  confidence: number;
  detectedAt: Date;
}

export interface SubsystemHealth {
  subsystem: string;
  mttrMs: number;
  mttrTrend: 'improving' | 'stable' | 'worsening';
  failureRate: number;
  lastIncident?: Date;
  silentRegressions: SilentRegression[];
}

export interface SilentRegression {
  id: string;
  subsystem: string;
  metric: string;
  previousValue: number;
  currentValue: number;
  degradationPercent: number;
  detectedAt: Date;
  description: string;
}

export interface PlatformMemorySnapshot {
  id: string;
  capturedAt: Date;
  patterns: FailurePattern[];
  subsystemHealth: SubsystemHealth[];
  silentRegressions: SilentRegression[];
  repeatedMistakes: RepeatedMistake[];
}

export interface RepeatedMistake {
  id: string;
  description: string;
  occurrenceCount: number;
  decisions: string[];
  incidents: string[];
  lastOccurred: Date;
  recommendation: string;
}

// ============================================================================
// PHASE 4: Executive Narrative
// ============================================================================

export type NarrativeQuery =
  | 'why_rollout_failed'
  | 'why_feature_blocked'
  | 'riskiest_area'
  | 'safety_trend'
  | 'custom';

export interface NarrativeRequest {
  query: NarrativeQuery;
  context?: Record<string, string>;
  timeRange?: { start: Date; end: Date };
}

export interface ExecutiveNarrative {
  id: string;
  query: NarrativeQuery;
  generatedAt: Date;
  headline: string;
  summary: string;
  timeline: TimelineEvent[];
  rootCauses: string[];
  contributingFactors: string[];
  recommendations: string[];
}

export interface TimelineEvent {
  timestamp: Date;
  event: string;
  significance: 'high' | 'medium' | 'low';
  relatedDecisions: string[];
}

export interface SystemicRisk {
  id: string;
  area: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  likelihood: number;
  impact: string;
  mitigations: string[];
  trend: 'improving' | 'stable' | 'worsening';
}

export interface ImprovementOpportunity {
  id: string;
  area: string;
  description: string;
  expectedImpact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface PlatformRiskReport {
  id: string;
  generatedAt: Date;
  topRisks: SystemicRisk[];
  topOpportunities: ImprovementOpportunity[];
  safetyTrend: 'safer' | 'same' | 'riskier';
  safetyScore: number;
  comparisonPeriod: string;
}

// ============================================================================
// PHASE 5: Enforcement Feedback Loop
// ============================================================================

export type FeedbackAction =
  | 'lower_automation_confidence'
  | 'increase_approval_level'
  | 'shorten_override_ttl'
  | 'recommend_policy_tightening'
  | 'flag_for_review';

export interface FeedbackSignal {
  id: string;
  type: 'repeated_override' | 'post_approval_incident' | 'readiness_flapping' | 'wrong_approval';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: Date;
  context: Record<string, unknown>;
  affectedArea: string;
}

export interface FeedbackRecommendation {
  id: string;
  signal: FeedbackSignal;
  action: FeedbackAction;
  target: string;
  reason: string;
  suggestedValue?: unknown;
  autoApply: false; // Never auto-apply
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
}

export interface FeedbackLoopState {
  automationConfidence: Record<string, number>;
  approvalLevelOverrides: Record<string, number>;
  overrideTtlMultipliers: Record<string, number>;
  pendingRecommendations: FeedbackRecommendation[];
  appliedRecommendations: FeedbackRecommendation[];
}

// ============================================================================
// PCAL Status
// ============================================================================

export interface PCALStatus {
  enabled: boolean;
  decisionsTracked: number;
  authorityChainsResolved: number;
  patternsDetected: number;
  narrativesGenerated: number;
  feedbackSignals: number;
  oldestDecision?: Date;
  newestDecision?: Date;
}
