/**
 * Platform Command & Accountability Layer (PCAL)
 * Feature Flag: ENABLE_PCAL=false
 *
 * The final layer that makes the platform auditable, governable, and explainable:
 * - Who decided what
 * - Why it was allowed
 * - Who approved it
 * - What happened after
 * - How do we learn from it
 */

// Configuration
export { isPCALEnabled, PCAL_CONFIG } from './config';

// Phase 1: Decision Stream
export {
  ingestDecision,
  ingestManualDecision,
  ingestOverride,
  ingestFromGLCP,
  ingestFromCutover,
  ingestFromGovernor,
  ingestFromIncidents,
  getDecision,
  getRecentDecisions,
  getDecisionsBySource,
  getDecisionsByScope,
  getDecisionsByOutcome,
  getDecisionsInTimeRange,
  getOverrides,
  getIrreversibleDecisions,
  getHighRiskDecisions,
  getDecisionStats,
  exportDecisions,
  clearAll as clearDecisions,
} from './decision-stream';

// Phase 2: Authority Chain
export {
  resolveAuthorityChain,
  answerAccountability,
  recordApproval,
  recordOverride,
  expireOverride,
  getRecentApprovals,
  getApprovalsByActor,
  getActiveOverrides,
  getOverridesForDecision,
  getApprovalLineage,
  getAuthorityStats,
  clearAll as clearAuthority,
} from './authority-chain';

// Phase 3: Platform Memory
export {
  detectPatterns,
  getPatterns,
  getPatternById,
  linkIncidentToDecision,
  autoLinkIncidents,
  getLinksForIncident,
  getLinksForDecision,
  recordMTTR,
  getSubsystemHealth,
  getAllSubsystemHealth,
  recordMetric,
  getSilentRegressions,
  detectRepeatedMistakes,
  getRepeatedMistakes,
  captureMemorySnapshot,
  clearAll as clearMemory,
} from './platform-memory';

// Phase 4: Narrative Generation
export {
  generateNarrative,
  generateRiskReport,
  getNarrativeHistory,
  getRiskReportHistory,
  clearAll as clearNarratives,
} from './narrative';

// Phase 5: Feedback Loop
export {
  detectFeedbackSignals,
  generateRecommendations,
  runFeedbackCycle,
  acknowledgeRecommendation,
  getPendingRecommendations,
  getAppliedRecommendations,
  getConfidenceAdjustment,
  getApprovalLevelAdjustment,
  getOverrideTtlMultiplier,
  applyConfidenceAdjustment,
  applyApprovalLevelAdjustment,
  applyOverrideTtlMultiplier,
  pushFeedbackToSystems,
  getFeedbackStats,
  getState as getFeedbackState,
  clearAll as clearFeedback,
} from './feedback-loop';

// Types
export type {
  DecisionScope,
  DecisionAuthority,
  DecisionOutcome,
  DecisionSource,
  DecisionRecord,
  DecisionSignal,
  AuthorityChain,
  AuthorityNode,
  ApprovalLineage,
  ApprovalRecord,
  OverrideRecord,
  FailurePattern,
  IncidentDecisionLink,
  SubsystemHealth,
  SilentRegression,
  PlatformMemorySnapshot,
  RepeatedMistake,
  NarrativeQuery,
  NarrativeRequest,
  ExecutiveNarrative,
  TimelineEvent,
  SystemicRisk,
  ImprovementOpportunity,
  PlatformRiskReport,
  FeedbackSignal,
  FeedbackRecommendation,
  FeedbackAction,
  FeedbackLoopState,
  PCALStatus,
} from './types';

// Routes
export { default as pcalRoutes } from './routes';
