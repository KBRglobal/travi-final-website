/**
 * Systemic Risk Accumulation Module
 * Tracks latent risks and risk debt across the platform
 */

export * from './types';
export {
  recordRiskEvent,
  recordMitigation,
  applyDecay,
  computeSystemicRisk,
  getTopHiddenRisks,
  getTopContributors,
  getSystemicRiskSummary,
  getAccumulation,
  mitigateLatentRisk,
  clearRiskData,
  getRiskEventCount,
  getLatentRiskCount,
} from './ledger';
