/**
 * Multi-Locale Content Governance
 * Feature Flag: ENABLE_LOCALIZATION_GOVERNANCE=true
 *
 * Tracks translation status across locales, identifies stale translations,
 * and provides governance insights for multi-locale content management.
 */

export * from './types';
export * from './config';
export {
  calculateTranslationStatus,
  calculateVersionBehind,
  getIssueSeverity,
  analyzeContentLocalization,
  getContentTranslationStatus,
  getLocalizationSummary,
  getLocalizationGovernanceStatus,
  clearLocalizationCache,
} from './engine';
export { default as localizationGovernanceRoutes } from './routes';
