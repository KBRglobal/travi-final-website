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
export * from "./types";

// Decision Engine
export {
  DecisionEngine,
  decisionEngine,
  BindingsRegistry,
  bindingsRegistry,
  type MetricData,
  type DecisionResult,
} from "./engine";

// Confidence & Trust
export {
  ConfidenceEngine,
  confidenceEngine,
  DataTrustScorer,
  dataTrustScorer,
  type MetricHistory,
  type MetricDataPoint,
} from "./confidence";

// Autonomous Loop
export { AutonomousLoop, autonomousLoop } from "./loop";

// System Health
export {
  SystemHealthMonitor,
  systemHealthMonitor,
  DataDriftDetector,
  dataDriftDetector,
} from "./health";

// Local imports for internal use
import { decisionEngine as _decisionEngine, type MetricData as _MetricData } from "./engine";
import { type MetricHistory as _MetricHistory } from "./confidence";
import { autonomousLoop as _autonomousLoop } from "./loop";
import { systemHealthMonitor as _systemHealthMonitor } from "./health";

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
} from "./governance";

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
} from "./adapters";

// Conflicts
export {
  CollisionResolver,
  collisionResolver,
  type DecisionCollision,
  type CollisionType,
  type CollisionResolution,
} from "./conflicts";

// Explainability
export {
  ExecutiveExplainer,
  executiveExplainer,
  type ExecutiveExplanation,
} from "./explainability";

// API Routes
export { default as dataDecisionRoutes } from "./routes";

// =============================================================================
// INITIALIZATION HELPER
// =============================================================================

interface DataDecisionSystemConfig {
  autopilotMode?: "off" | "supervised" | "full";
  startLoop?: boolean;
  startHealthMonitor?: boolean;
  metricsProvider?: () => Promise<_MetricData[]>;
  historyProvider?: (metricId: string) => Promise<_MetricHistory | null>;
}

/**
 * Initialize the Data Decision System
 *
 * IMPORTANT: Default mode is OFF. No autonomous loop runs without explicit enable.
 */
export function initializeDataDecisionSystem(config: DataDecisionSystemConfig = {}): void {
  const {
    autopilotMode = "off", // DEFAULT IS OFF - explicit enable required
    startLoop = false, // DEFAULT IS FALSE - explicit enable required
    startHealthMonitor = true,
    metricsProvider,
    historyProvider,
  } = config;

  // Set autopilot mode (defaults to 'off')
  (_decisionEngine as any).setAutopilotMode(autopilotMode);

  // Configure loop providers
  if (metricsProvider) {
    (_autonomousLoop as any).setMetricsProvider(metricsProvider);
  }

  if (historyProvider) {
    (_autonomousLoop as any).setHistoryProvider(historyProvider);
  }

  // Start health monitor
  if (startHealthMonitor) {
    (_systemHealthMonitor as any).start();
  }

  // Start autonomous loop
  if (startLoop) {
    (_autonomousLoop as any).start();
  }
}

/**
 * Shutdown the Data Decision System
 */
export function shutdownDataDecisionSystem(): void {
  (_autonomousLoop as any).stop();
  (_systemHealthMonitor as any).stop();
}
