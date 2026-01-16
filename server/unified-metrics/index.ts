/**
 * Unified Metrics System
 *
 * Central hub for all metrics, analytics, and recommendations.
 * Transforms data into decisions.
 *
 * Components:
 * - Registry: Central source of truth for all metrics
 * - Models: Content performance scoring
 * - Funnel: Traffic → Conversion tracking
 * - Opportunities: AI-powered growth recommendations
 * - Anomaly: Automatic pattern detection
 * - Snapshots: Historical data and trends
 * - Explainability: Transparent reasoning
 * - Dashboards: Role-based views
 */

import { log } from '../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[UnifiedMetrics] ${msg}`, data),
};

// =====================================================
// FEATURE FLAG
// =====================================================

export function isUnifiedMetricsEnabled(): boolean {
  return process.env.ENABLE_UNIFIED_METRICS === 'true';
}

// =====================================================
// RE-EXPORTS
// =====================================================

// Registry - Central metrics definitions and storage
export {
  getMetricsRegistry,
  recordMetric,
  getMetric,
  ALL_METRICS,
  METRICS_MAP,
  getMetricDefinition,
  getMetricsByCategory,
  getMetricsForDashboard,
} from './registry';

export type {
  MetricDefinition,
  MetricValue,
  MetricQuery,
  MetricResult,
  MetricSnapshot,
  MetricCategory,
  MetricType,
  MetricEntityType,
  TimeGranularity,
  DashboardRole,
  MetricSignal,
  ActionRecommendation,
} from './registry/types';

// Content Performance Model
export {
  getContentPerformanceModel,
  calculateContentPerformance,
  createEmptySignals,
} from './models/content-performance';

export type {
  ContentSignals,
  PerformanceScore,
  ContentPerformanceResult,
  PerformanceIssue,
  PerformanceOpportunity,
} from './models/content-performance';

// Funnel System
export {
  getFunnelSystem,
  recordFunnelEvent,
  analyzeFunnel,
  PREDEFINED_FUNNELS,
} from './funnel';

export type {
  FunnelAnalysis,
  FunnelEvent,
  FunnelStageData,
  FunnelInsight,
  FunnelComparison,
} from './funnel';

// Opportunities Engine
export {
  getOpportunitiesEngine,
  detectOpportunities,
  getTopOpportunities,
  getOpportunitySummary,
} from './opportunities';

export type {
  GrowthOpportunity,
  OpportunityCategory,
  OpportunityStatus,
  OpportunitySummary,
} from './opportunities';

// Anomaly Detection
export {
  getAnomalyDetector,
  detectAnomalies,
  ingestMetricValue,
  getAnomalies,
  getCriticalAnomalies,
} from './anomaly';

export type {
  Anomaly,
  AnomalyType,
  AnomalyConfig,
  DetectionResult,
} from './anomaly';

// Historical Snapshots
export {
  getSnapshotStore,
  createSnapshot,
  createDailySnapshot,
  analyzeTrend,
  compareWeekOverWeek,
} from './snapshots';

export type {
  HistoricalSnapshot,
  TrendAnalysis,
  ComparisonReport,
  MetricSnapshotData,
} from './snapshots';

// Explainability
export {
  getExplainabilityService,
  explainPerformance,
  explainOpportunity,
  explainAnomaly,
  explainFunnel,
} from './explainability';

export type {
  DetailedExplanation,
  DataEvidence,
  WhyExplanation,
} from './explainability';

// Dashboards
export {
  getDashboardService,
  getDashboardConfig,
  generateDashboard,
  PM_DASHBOARD,
  SEO_DASHBOARD,
  OPS_DASHBOARD,
} from './dashboards';

export type {
  DashboardData,
  KPIData,
  ChartData,
  AlertData,
  DashboardSummary,
} from './dashboards';

// =====================================================
// UNIFIED METRICS SERVICE
// =====================================================

import { getMetricsRegistry, MetricsRegistry } from './registry';
import { getContentPerformanceModel, ContentPerformanceModel } from './models/content-performance';
import { getFunnelSystem, FunnelSystem } from './funnel';
import { getOpportunitiesEngine, OpportunitiesEngine } from './opportunities';
import { getAnomalyDetector, AnomalyDetector } from './anomaly';
import { getSnapshotStore, SnapshotStore } from './snapshots';
import { getExplainabilityService, ExplainabilityService } from './explainability';
import { getDashboardService, DashboardService } from './dashboards';

export interface UnifiedMetricsStatus {
  enabled: boolean;
  components: {
    registry: boolean;
    performanceModel: boolean;
    funnelSystem: boolean;
    opportunitiesEngine: boolean;
    anomalyDetector: boolean;
    snapshotStore: boolean;
    explainability: boolean;
    dashboards: boolean;
  };
  stats: {
    totalMetrics: number;
    activeFunnels: number;
    activeOpportunities: number;
    activeAnomalies: number;
    snapshotCount: number;
  };
  lastUpdated: Date;
}

/**
 * Initialize all unified metrics components
 */
export function initializeUnifiedMetrics(): void {
  if (!isUnifiedMetricsEnabled()) {
    logger.info('Unified Metrics disabled (set ENABLE_UNIFIED_METRICS=true to enable)');
    return;
  }

  // Initialize all components
  getMetricsRegistry();
  getContentPerformanceModel();
  getFunnelSystem();
  getOpportunitiesEngine();
  getAnomalyDetector();
  getSnapshotStore();
  getExplainabilityService();
  getDashboardService();

  // Start auto snapshots
  getSnapshotStore().startAutoSnapshots(24);

  logger.info('Unified Metrics System initialized', {
    totalMetrics: getMetricsRegistry().getAllDefinitions().length,
    funnels: getFunnelSystem().getAllFunnels().length,
  });
}

/**
 * Get system status
 */
export function getUnifiedMetricsStatus(): UnifiedMetricsStatus {
  const enabled = isUnifiedMetricsEnabled();

  if (!enabled) {
    return {
      enabled: false,
      components: {
        registry: false,
        performanceModel: false,
        funnelSystem: false,
        opportunitiesEngine: false,
        anomalyDetector: false,
        snapshotStore: false,
        explainability: false,
        dashboards: false,
      },
      stats: {
        totalMetrics: 0,
        activeFunnels: 0,
        activeOpportunities: 0,
        activeAnomalies: 0,
        snapshotCount: 0,
      },
      lastUpdated: new Date(),
    };
  }

  return {
    enabled: true,
    components: {
      registry: true,
      performanceModel: true,
      funnelSystem: true,
      opportunitiesEngine: true,
      anomalyDetector: true,
      snapshotStore: true,
      explainability: true,
      dashboards: true,
    },
    stats: {
      totalMetrics: getMetricsRegistry().getAllDefinitions().length,
      activeFunnels: getFunnelSystem().getAllFunnels().length,
      activeOpportunities: getOpportunitiesEngine().getAllOpportunities().length,
      activeAnomalies: getAnomalyDetector().getAllAnomalies().length,
      snapshotCount: getSnapshotStore().getAllSnapshots().length,
    },
    lastUpdated: new Date(),
  };
}

/**
 * Run full metrics analysis cycle
 */
export async function runMetricsAnalysisCycle(): Promise<{
  anomaliesDetected: number;
  opportunitiesFound: number;
  snapshotCreated: boolean;
  duration: number;
}> {
  const startTime = Date.now();

  // Detect anomalies
  const anomalyResult = getAnomalyDetector().detectAll();

  // Generate opportunities from anomalies
  const opportunitiesFromAnomalies = getOpportunitiesEngine()
    .detectFromSignals(anomalyResult.anomalies.map(a => getAnomalyDetector().toSignal(a)));

  // Create daily snapshot
  const snapshot = getSnapshotStore().createDailySnapshot();

  // Clean expired data
  getOpportunitiesEngine().cleanExpired();
  getAnomalyDetector().cleanOld(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  logger.info('Metrics analysis cycle complete', {
    anomalies: anomalyResult.anomalies.length,
    opportunities: opportunitiesFromAnomalies.length,
    duration: Date.now() - startTime,
  });

  return {
    anomaliesDetected: anomalyResult.anomalies.length,
    opportunitiesFound: opportunitiesFromAnomalies.length,
    snapshotCreated: true,
    duration: Date.now() - startTime,
  };
}

/**
 * Reset all components (for testing)
 */
export function resetUnifiedMetrics(): void {
  MetricsRegistry.reset();
  FunnelSystem.reset();
  OpportunitiesEngine.reset();
  AnomalyDetector.reset();
  SnapshotStore.reset();
  ExplainabilityService.reset();
  DashboardService.reset();
  logger.info('Unified Metrics System reset');
}
