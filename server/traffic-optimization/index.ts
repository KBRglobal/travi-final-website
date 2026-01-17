/**
 * Traffic → Conversion Optimization Engine (TCOE)
 *
 * Transforms traffic intelligence data into concrete,
 * testable, reversible conversion optimizations.
 *
 * Feature Flags:
 * - ENABLE_TRAFFIC_OPTIMIZATION (main toggle, default: false)
 * - ENABLE_TRAFFIC_OPTIMIZATION_PROPOSALS (proposal generation, default: true when main enabled)
 * - ENABLE_TRAFFIC_OPTIMIZATION_EXPERIMENTS (experiment recommendations, default: true when main enabled)
 */

// Types
export type {
  TrafficSourceType,
  UserIntent,
  DeviceType,
  TrafficSegment,
  SegmentMetrics,
  SegmentPerformance,
  SegmentPerformanceReport,
  Bottleneck,
  BottleneckType,
  BottleneckSeverity,
  BottleneckReport,
  ProposalType,
  ProposalStatus,
  RiskLevel,
  ProposalChange,
  OptimizationProposal,
  ExperimentType,
  ExperimentConfig,
  ExperimentRecommendation,
  OptimizationSummary,
  ContentOptimizationView,
} from './types';

// Segments
export {
  TrafficSegmentAnalyzer,
  getSegmentAnalyzer,
  resetSegmentAnalyzer,
  generateSegmentId,
  parseSegmentId,
  inferIntent,
  inferDevice,
  calculateEngagementScore,
  analyzeSegmentPerformance,
} from './segments';

// Bottlenecks
export {
  BottleneckDetector,
  getBottleneckDetector,
  resetBottleneckDetector,
} from './bottlenecks';

// Proposals
export {
  ProposalEngine,
  getProposalEngine,
  resetProposalEngine,
} from './proposals';

// Experiments
export {
  ExperimentRecommender,
  getExperimentRecommender,
  resetExperimentRecommender,
} from './experiments';

// Import reset functions for internal use
import { resetSegmentAnalyzer as _resetSegmentAnalyzer } from './segments';
import { resetBottleneckDetector as _resetBottleneckDetector } from './bottlenecks';
import { resetProposalEngine as _resetProposalEngine } from './proposals';
import { resetExperimentRecommender as _resetExperimentRecommender } from './experiments';

// Routes
export { createTrafficOptimizationRouter } from './routes';

/**
 * Check if feature is enabled
 */
export function isTrafficOptimizationEnabled(): boolean {
  return process.env.ENABLE_TRAFFIC_OPTIMIZATION === 'true';
}

/**
 * Initialize the traffic optimization engine
 */
export function initTrafficOptimization(): void {
  if (!isTrafficOptimizationEnabled()) {
    console.log('[TrafficOptimization] Feature disabled (ENABLE_TRAFFIC_OPTIMIZATION != true)');
    return;
  }

  console.log('[TrafficOptimization] Traffic optimization engine initialized');

  const proposalsEnabled = process.env.ENABLE_TRAFFIC_OPTIMIZATION_PROPOSALS !== 'false';
  const experimentsEnabled = process.env.ENABLE_TRAFFIC_OPTIMIZATION_EXPERIMENTS !== 'false';

  console.log(`[TrafficOptimization] Proposals: ${proposalsEnabled ? 'enabled' : 'disabled'}`);
  console.log(`[TrafficOptimization] Experiments: ${experimentsEnabled ? 'enabled' : 'disabled'}`);
}

/**
 * Shutdown the traffic optimization engine
 */
export function shutdownTrafficOptimization(): void {
  (_resetSegmentAnalyzer as any)();
  (_resetBottleneckDetector as any)();
  (_resetProposalEngine as any)();
  (_resetExperimentRecommender as any)();
  console.log('[TrafficOptimization] Traffic optimization engine shutdown');
}
