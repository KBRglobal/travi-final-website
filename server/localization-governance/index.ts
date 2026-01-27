/**
 * Multi-Locale Content Governance
 * Feature Flag: ENABLE_LOCALIZATION_GOVERNANCE=true
 *
 * Tracks translation status across locales, identifies stale translations,
 * and provides governance insights for multi-locale content management.
 */

import { isLocalizationGovernanceEnabled } from './config';
import { log } from '../lib/logger';

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

/**
 * Initialize localization governance
 * Called by background-services.ts during startup
 */
export async function initializeGovernance(): Promise<void> {
  if (!isLocalizationGovernanceEnabled()) {
    log.info('[LocalizationGovernance] DISABLED - set ENABLE_LOCALIZATION_GOVERNANCE=true to enable');
    return;
  }

  log.info('[LocalizationGovernance] Initializing governance module');

  // Clear any stale cache on startup
  const { clearLocalizationCache: clearCache } = await import('./engine');
  clearCache();

  log.info('[LocalizationGovernance] Governance module initialized');
}
