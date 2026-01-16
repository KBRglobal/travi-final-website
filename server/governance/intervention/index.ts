/**
 * Governance Intervention Engine Module
 * Recommends adjustments but NEVER hard-blocks
 */

export * from './types';
export {
  evaluateRules,
  getActiveInterventions,
  getIntervention,
  acceptIntervention,
  rejectIntervention,
  recordInterventionOutcome,
  applyAutoAdjustments,
  revertAutoAdjustment,
  getAutoAdjustments,
  getInterventionRules,
  setRuleEnabled,
  addInterventionRule,
  getInterventionStats,
  clearInterventionData,
} from './engine';
