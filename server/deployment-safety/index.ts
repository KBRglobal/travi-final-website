/**
 * Deployment Safety & Monitoring System
 *
 * Comprehensive deployment safety with:
 * - Release Gates with canary deployment
 * - Automated rollback
 * - Health probes
 * - Environment parity
 * - Incident lifecycle management
 * - Load shedding
 * - Cost anomaly detection
 *
 * Zero surprises. Everything controlled.
 */

// Export types
export * from "./types";

// Release Gates
export {
  startValidation,
  runGates,
  skipGate,
  getValidation,
  listValidations,
  canRelease,
  addManualApproval,
  clearOldValidations,
  getGateStats,
  createGate,
  createDefaultGates,
  registerGateExecutor,
} from "./release-gates";

// Canary Deployment
export {
  startCanary,
  setCanaryPercentage,
  updateCanaryMetrics,
  evaluateCanary,
  rollbackCanary,
  promoteCanary,
  getCanary,
  getActiveCanary,
  listCanaryDeployments,
  subscribeToCanaryEvents,
  startEvaluationLoop,
  stopEvaluationLoop,
  getCanaryStats,
  collectMetricsFromMonitoring,
  defaultCanaryConfig,
} from "./canary-deployment";

// Rollback Manager
export {
  createRollbackPlan,
  executeRollback,
  cancelRollback,
  shouldTriggerRollback,
  triggerAutomaticRollback,
  getRollbackPlan,
  listRollbackPlans,
  getRollbackHistory,
  getActiveRollback,
  updateTriggerConfig,
  getRollbackStats,
  registerStepExecutor,
  subscribeToRollbackEvents,
} from "./rollback-manager";

// Health Probes
export {
  createProbe,
  registerProbeExecutor,
  registerTypeExecutor,
  runAllProbes,
  runProbe,
  getSystemHealth,
  getProbe,
  getProbesByType,
  getAllProbes,
  getProbeHistory,
  subscribeToProbeEvents,
  startMonitoring,
  stopMonitoring,
  removeProbe,
  clearAllProbes,
  initializeDefaultProbes,
  getProbeStats,
} from "./health-probes";

// Environment Parity
export {
  registerEnvironment,
  getCurrentEnvironment,
  buildCurrentEnvironmentConfig,
  runParityCheck,
  getParityReport,
  getLatestParityReport,
  listParityReports,
  isEnvironmentReady,
  getEnvironmentConfig,
  compareEnvironments,
  getParityStats,
} from "./environment-parity";

// Incident Lifecycle
export {
  createIncident,
  transitionPhase,
  acknowledgeIncident,
  addIncidentUpdate,
  setMitigationSteps,
  setRootCause,
  escalateIncident,
  createPostmortem,
  updatePostmortem,
  addActionItem,
  completeActionItem,
  approvePostmortem,
  startEscalationMonitoring,
  stopEscalationMonitoring,
  subscribeToIncidentEvents,
  setNotificationHandler,
  getIncident,
  listIncidents,
  getPostmortem,
  getIncidentStats,
  getMetricsTrends,
  createIncidentFromMonitor,
} from "./incident-lifecycle";

// Load Shedding
export {
  updateConfig as updateLoadSheddingConfig,
  getConfig as getLoadSheddingConfig,
  getState as getLoadSheddingState,
  updateMetrics,
  collectSystemMetrics,
  shouldAcceptRequest,
  getMetricsHistory,
  getDecisionHistory,
  getStats as getLoadSheddingStats,
  resetStats as resetLoadSheddingStats,
  forceLevel,
  clearForcedLevel,
  startMetricCollection,
  stopMetricCollection,
} from "./load-shedding";

// Cost Anomaly
export {
  recordCost,
  runAnomalyDetection,
  generateForecast,
  acknowledgeAnomaly,
  resolveAnomaly,
  getAnomaly,
  listAnomalies,
  getRecentAlerts,
  subscribeToAnomalies,
  subscribeToAlerts,
  updateConfig as updateAnomalyConfig,
  startDetection as startAnomalyDetection,
  stopDetection as stopAnomalyDetection,
  getAnomalyStats,
} from "./cost-anomaly";

// Security Gate Adapter
export {
  getSecurityState,
  setSecurityMode,
  setThreatLevel,
  createOverride,
  hasValidOverride,
  revokeOverride,
  listOverrides,
  checkSecurityGate,
  secureStartCanary,
  secureCreateRollback,
  secureActivateLoadShedding,
  secureEscalateIncident,
  getSecurityGateStatus,
  initSecurityGateListeners,
  type SecurityMode,
  type ThreatLevel,
  type OpsAction,
  type SecurityCheckResult,
} from "./security-gate-adapter";

// Import for initialization
import { initializeDefaultProbes, startMonitoring } from "./health-probes";
import { startEvaluationLoop } from "./canary-deployment";
import { startEscalationMonitoring } from "./incident-lifecycle";
import { startMetricCollection } from "./load-shedding";
import { startDetection } from "./cost-anomaly";
import { initSecurityGateListeners } from "./security-gate-adapter";
import { log } from "../lib/logger";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[DeploySafety] ${msg}`, data),
};

/**
 * Initialize the deployment safety system
 */
export function initializeDeploymentSafety(options?: {
  enableHealthProbes?: boolean;
  enableCanaryEvaluation?: boolean;
  enableEscalationMonitoring?: boolean;
  enableLoadSheddingMetrics?: boolean;
  enableCostAnomalyDetection?: boolean;
  healthProbeInterval?: number;
  loadSheddingInterval?: number;
  anomalyDetectionInterval?: number;
}): void {
  const opts = {
    enableHealthProbes: process.env.ENABLE_HEALTH_PROBES === "true",
    enableCanaryEvaluation: process.env.ENABLE_CANARY_DEPLOYMENT === "true",
    enableEscalationMonitoring: process.env.ENABLE_INCIDENT_LIFECYCLE === "true",
    enableLoadSheddingMetrics: process.env.ENABLE_LOAD_SHEDDING === "true",
    enableCostAnomalyDetection: process.env.ENABLE_COST_ANOMALY === "true",
    healthProbeInterval: 30000,
    loadSheddingInterval: 5000,
    anomalyDetectionInterval: 60000,
    ...options,
  };

  logger.info("Initializing deployment safety system", opts);

  if (opts.enableHealthProbes) {
    initializeDefaultProbes();
    startMonitoring(opts.healthProbeInterval);
  }

  if (opts.enableCanaryEvaluation) {
    startEvaluationLoop(opts.healthProbeInterval);
  }

  if (opts.enableEscalationMonitoring) {
    startEscalationMonitoring();
  }

  if (opts.enableLoadSheddingMetrics) {
    startMetricCollection(opts.loadSheddingInterval);
  }

  if (opts.enableCostAnomalyDetection) {
    startDetection(opts.anomalyDetectionInterval);
  }

  // Always initialize security gate listeners to respond to incidents
  initSecurityGateListeners().catch(err => {
    logger.info("Security gate listeners init warning", { error: String(err) });
  });

  logger.info("Deployment safety system initialized");
}

/**
 * Get overall deployment safety status
 */
export async function getDeploymentSafetyStatus(): Promise<{
  healthy: boolean;
  readyForDeploy: boolean;
  blockers: string[];
  summary: {
    healthProbes: { total: number; healthy: number; unhealthy: number };
    activeIncidents: number;
    criticalIncidents: number;
    costAnomalies: number;
    loadSheddingActive: boolean;
    environmentParity: "in_sync" | "drift" | "critical_drift" | "unknown";
    canaryActive: boolean;
    rollbackActive: boolean;
  };
}> {
  const { getProbeStats } = await import("./health-probes");
  const { getIncidentStats } = await import("./incident-lifecycle");
  const { getAnomalyStats } = await import("./cost-anomaly");
  const { getState: getLoadSheddingState } = await import("./load-shedding");
  const { getLatestParityReport } = await import("./environment-parity");
  const { getActiveCanary } = await import("./canary-deployment");
  const { getActiveRollback } = await import("./rollback-manager");
  const { getCurrentEnvironment } = await import("./environment-parity");

  const probeStats = getProbeStats();
  const incidentStats = getIncidentStats();
  const anomalyStats = getAnomalyStats();
  const loadState = getLoadSheddingState();
  const parityReport = getLatestParityReport();
  const env = getCurrentEnvironment();
  const activeCanary = getActiveCanary(env);
  const activeRollback = getActiveRollback(env);

  const blockers: string[] = [];

  // Check health probes
  if (probeStats.unhealthy > 0) {
    blockers.push(`${probeStats.unhealthy} unhealthy probe(s)`);
  }

  // Check incidents
  if (incidentStats.bySeverity.critical > 0) {
    blockers.push(`${incidentStats.bySeverity.critical} critical incident(s)`);
  }

  // Check environment parity
  if (parityReport?.overallStatus === "critical_drift") {
    blockers.push("Critical environment drift detected");
  }

  // Check active rollback
  if (activeRollback) {
    blockers.push("Rollback in progress");
  }

  // Check load shedding
  if (loadState.level === "emergency") {
    blockers.push("Emergency load shedding active");
  }

  const healthy = probeStats.unhealthy === 0 && incidentStats.bySeverity.critical === 0;
  const readyForDeploy = blockers.length === 0;

  return {
    healthy,
    readyForDeploy,
    blockers,
    summary: {
      healthProbes: {
        total: probeStats.total,
        healthy: probeStats.healthy,
        unhealthy: probeStats.unhealthy,
      },
      activeIncidents: incidentStats.open + incidentStats.acknowledged,
      criticalIncidents: incidentStats.bySeverity.critical || 0,
      costAnomalies: anomalyStats.unresolved,
      loadSheddingActive: loadState.active,
      environmentParity: parityReport?.overallStatus || "unknown",
      canaryActive: !!activeCanary,
      rollbackActive: !!activeRollback,
    },
  };
}

// Export routes
export { default as deploymentSafetyRoutes } from "./routes";
