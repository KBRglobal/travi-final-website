/**
 * Executive Growth Command Center Module
 *
 * Single API that answers: "What should we do next to grow fastest with lowest risk?"
 *
 * Feature flags:
 * - ENABLE_GROWTH_COMMAND_CENTER=false
 */

export * from './types';
export {
  GrowthAggregator,
  getGrowthAggregator,
  resetGrowthAggregator,
} from './aggregator';
export {
  GrowthScorer,
  getGrowthScorer,
  resetGrowthScorer,
} from './scorer';
export {
  GrowthPrioritizer,
  getGrowthPrioritizer,
  resetGrowthPrioritizer,
} from './prioritizer';
export { createGrowthCommandRouter } from './routes';

const ENABLE_GROWTH_COMMAND_CENTER = process.env.ENABLE_GROWTH_COMMAND_CENTER === 'true';

/**
 * Initialize the Growth Command Center
 */
export function initGrowthCommandCenter(): void {
  if (!ENABLE_GROWTH_COMMAND_CENTER) {
    console.log('[GrowthCommandCenter] Disabled (ENABLE_GROWTH_COMMAND_CENTER=false)');
    return;
  }

  console.log('[GrowthCommandCenter] Initializing...');

  // Pre-initialize singletons
  const { getGrowthAggregator } = require('./aggregator');
  const { getGrowthScorer } = require('./scorer');
  const { getGrowthPrioritizer } = require('./prioritizer');

  getGrowthAggregator();
  getGrowthScorer();
  getGrowthPrioritizer();

  console.log('[GrowthCommandCenter] Initialized');
}
