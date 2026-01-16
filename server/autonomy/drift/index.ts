/**
 * Policy Drift Detector Module
 * Detects when policies are misaligned with operational reality
 */

export * from './types';
export {
  analyzeFeatureForDrift,
  runDriftDetection,
  getSignals,
  updateSignalStatus,
  getDetectionResults,
  getLatestDetectionResult,
  clearDriftData,
} from './detector';
