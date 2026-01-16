/**
 * Data Intelligence & Decision Operating System
 *
 * This module transforms the Unified Metrics System into a Data-Driven Decision Layer.
 * Metrics are LAW. Decisions are made by the system.
 *
 * Core Principles:
 * - Every metric has AUTHORITY LEVEL (blocking > triggering > escalating > advisory)
 * - Every signal has BINDING that determines actions
 * - Decisions are executed, not recommended
 * - Closed-loop: Measure → Decide → Act → Observe → Adjust
 *
 * @see /docs/data/METRICS_SOURCE_OF_TRUTH.md
 * @see /docs/data/DATA_ACTION_BINDINGS.md
 * @see /docs/data/METRIC_CONFLICT_RULES.md
 * @see /docs/data/DATA_GOVERNANCE_RULES.md
 */

// Types
export * from './types';

// Decision Engine
export {
  DecisionEngine,
  decisionEngine,
  BindingsRegistry,
  bindingsRegistry,
  type MetricData,
  type DecisionResult,
} from './engine';

// Confidence & Trust
export {
  ConfidenceEngine,
  confidenceEngine,
  DataTrustScorer,
  dataTrustScorer,
  type MetricHistory,
  type MetricDataPoint,
} from './confidence';

// Autonomous Loop
export { AutonomousLoop, autonomousLoop } from './loop';

// System Health
export {
  SystemHealthMonitor,
  systemHealthMonitor,
  DataDriftDetector,
  dataDriftDetector,
} from './health';

// Governance
export {
  AutopilotController,
  autopilotController,
  UnifiedAutopilotGate,
  unifiedAutopilotGate,
  type ModeTransitionRequest,
  type ModeTransitionResult,
  type GlobalAutopilotState,
  type DomainAutopilotState,
  type AutopilotGateResult,
} from './governance';

// Adapters
export {
  BaseAdapter,
  SEOAdapter,
  seoAdapter,
  ContentAdapter,
  contentAdapter,
  OpsAdapter,
  opsAdapter,
  NotificationAdapter,
  notificationAdapter,
  AdapterRegistry,
  adapterRegistry,
} from './adapters';

// Conflicts
export {
  CollisionResolver,
  collisionResolver,
  type DecisionCollision,
  type CollisionType,
  type CollisionResolution,
} from './conflicts';

// Explainability
export {
  ExecutiveExplainer,
  executiveExplainer,
  type ExecutiveExplanation,
} from './explainability';

// API Routes
export { default as dataDecisionRoutes } from './routes';

// =============================================================================
// INITIALIZATION HELPER
// =============================================================================

interface DataDecisionSystemConfig {
  autopilotMode?: 'off' | 'supervised' | 'full';
  startLoop?: boolean;
  startHealthMonitor?: boolean;
  metricsProvider?: () => Promise<MetricData[]>;
  historyProvider?: (metricId: string) => Promise<MetricHistory | null>;
}

/**
 * Initialize the Data Decision System
 *
 * IMPORTANT: Default mode is OFF. No autonomous loop runs without explicit enable.
 */
export function initializeDataDecisionSystem(config: DataDecisionSystemConfig = {}): void {
  const {
    autopilotMode = 'off', // DEFAULT IS OFF - explicit enable required
    startLoop = false, // DEFAULT IS FALSE - explicit enable required
    startHealthMonitor = true,
    metricsProvider,
    historyProvider,
  } = config;

  // Set autopilot mode (defaults to 'off')
  decisionEngine.setAutopilotMode(autopilotMode);

  // Configure loop providers
  if (metricsProvider) {
    autonomousLoop.setMetricsProvider(metricsProvider);
  }

  if (historyProvider) {
    autonomousLoop.setHistoryProvider(historyProvider);
  }

  // Start health monitor
  if (startHealthMonitor) {
    systemHealthMonitor.start();
  }

  // Start autonomous loop
  if (startLoop) {
    autonomousLoop.start();
  }

  console.log(`[DataDecisions] System initialized - Mode: ${autopilotMode}`);
}

/**
 * Shutdown the Data Decision System
 */
export function shutdownDataDecisionSystem(): void {
  autonomousLoop.stop();
  systemHealthMonitor.stop();
  console.log('[DataDecisions] System shutdown complete');
}
