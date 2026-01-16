/**
 * Enterprise Intelligence Hub (EIH)
 *
 * A top-level intelligence system that:
 * - Unifies all signals into a common format
 * - Explains WHY the system behaves as it does
 * - Enables human decision-making with full context
 * - Prevents black-box AI behavior
 *
 * Feature flags:
 * - ENABLE_INTELLIGENCE_HUB: Master switch
 * - ENABLE_DECISION_EXPLAINABILITY: Decision trace engine
 * - ENABLE_SIGNAL_CORRELATION: Correlation detection
 * - ENABLE_EXECUTIVE_SUMMARY: Executive summaries
 *
 * Zero coupling to internal systems — uses adapter pattern for all data access.
 */

// Signals
export * from './signals';

// Decisions
export * from './decisions';

// Correlation
export * from './correlation';

// Executive
export * from './executive';

// Routes
export { default as intelligenceRoutes } from './routes';

import { getSignalRegistry, refreshAllSignals } from './signals/registry';
import { getDecisionRepository } from './decisions/repository';
import { runCorrelationAnalysis, getActiveAnomalies } from './correlation';
import { createSummary, getSystemStatus } from './executive';

/**
 * Initialize the Intelligence Hub
 */
export async function initializeIntelligenceHub(): Promise<void> {
  if (process.env.ENABLE_INTELLIGENCE_HUB !== 'true') {
    return;
  }

  // Initialize signal adapters
  const registry = getSignalRegistry();

  // Initial signal refresh
  if (registry.isEnabled()) {
    await refreshAllSignals();
  }
}

/**
 * Get hub status
 */
export function getHubStatus() {
  const registry = getSignalRegistry();

  return {
    enabled: process.env.ENABLE_INTELLIGENCE_HUB === 'true',
    subsystems: {
      signals: registry.isEnabled(),
      decisions: process.env.ENABLE_DECISION_EXPLAINABILITY === 'true',
      correlation: process.env.ENABLE_SIGNAL_CORRELATION === 'true',
      executive: process.env.ENABLE_EXECUTIVE_SUMMARY === 'true',
    },
    signalCount: registry.isEnabled() ? registry.getStats().totalSignals : 0,
    adapterCount: registry.isEnabled() ? registry.listAdapters().length : 0,
  };
}

/**
 * Run full intelligence cycle
 */
export async function runIntelligenceCycle(): Promise<{
  signalsRefreshed: number;
  correlationsFound: number;
  anomaliesDetected: number;
}> {
  // Refresh signals
  const refreshResult = await refreshAllSignals();

  // Run correlation analysis
  const { correlations, anomalies } = await runCorrelationAnalysis();

  return {
    signalsRefreshed: refreshResult.signalsCollected,
    correlationsFound: correlations.length,
    anomaliesDetected: anomalies.length,
  };
}

/**
 * Quick health check
 */
export function getQuickStatus() {
  return getSystemStatus();
}

/**
 * Generate executive summary
 */
export async function generateExecutiveSummary(lookbackDays = 7) {
  return createSummary(lookbackDays);
}
