/**
 * Traffic Spike Simulator
 * 
 * TASK 9: Simulation Mode - "What if" analysis
 * 
 * Simulates traffic spikes to predict:
 * - Load tier changes (green -> yellow -> red)
 * - Queue depths under load
 * - Deferred tasks count
 * 
 * HARD CONSTRAINTS:
 * - Read-only, no actual traffic generated
 * - No production side effects
 * - Admin access only (enforced at route level)
 */

import { log } from '../lib/logger';
import { getDiagnosticsSnapshot } from '../ai-orchestrator';
import { 
  getLoadTierManager, 
  type LoadTier, 
  type LoadTierConfig 
} from '../system/load-tiers';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[TrafficSimulator] ${msg}`, data),
};

export interface TrafficSimulationResult {
  success: boolean;
  simulation: {
    type: 'traffic-spike';
    multiplier: number;
    timestamp: string;
  };
  currentState: {
    capacity: number;
    tier: LoadTier;
    queueDepth: number;
    providers: {
      provider: string;
      load: number;
      available: boolean;
    }[];
  };
  projectedState: {
    capacity: number;
    tier: LoadTier;
    queueDepth: number;
    providers: {
      provider: string;
      projectedLoad: number;
      wouldBeAvailable: boolean;
      overloadRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
    }[];
  };
  predictions: {
    tierChange: {
      from: LoadTier;
      to: LoadTier;
      wouldChange: boolean;
    };
    deferredTaskEstimate: number;
    queueBacklogMinutes: number;
    recoveryTimeMinutes: number;
    criticalCategories: string[];
    deferredCategories: string[];
  };
  recommendations: string[];
  readOnlyMode: true;
}

const NON_CRITICAL_CATEGORIES = ['enrichment', 'seo', 'internal', 'research'];
const CRITICAL_CATEGORIES = ['content', 'translation', 'news', 'evergreen', 'localization'];

const DEFAULT_THRESHOLDS: LoadTierConfig = {
  greenThreshold: 50,
  yellowThreshold: 80,
};

function calculateTier(capacity: number, config: LoadTierConfig = DEFAULT_THRESHOLDS): LoadTier {
  if (capacity < config.greenThreshold) return 'green';
  if (capacity < config.yellowThreshold) return 'yellow';
  return 'red';
}

function assessOverloadRisk(projectedLoad: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (projectedLoad < 50) return 'none';
  if (projectedLoad < 70) return 'low';
  if (projectedLoad < 85) return 'medium';
  if (projectedLoad < 95) return 'high';
  return 'critical';
}

export function simulateTrafficSpike(multiplier: number): TrafficSimulationResult {
  if (multiplier < 1) {
    multiplier = 1;
  }
  if (multiplier > 100) {
    multiplier = 100;
  }

  logger.info('Running traffic spike simulation', { multiplier });

  const diagnostics = getDiagnosticsSnapshot();
  const loadTierManager = getLoadTierManager();
  const currentMetrics = loadTierManager.getMetrics();

  const currentCapacity = currentMetrics.capacity;
  const currentTier = currentMetrics.tier;
  const currentQueueDepth = diagnostics.queueDepth;

  const projectedCapacity = Math.min(100, currentCapacity * multiplier);
  const projectedQueueDepth = Math.ceil(currentQueueDepth * multiplier);
  const projectedTier = calculateTier(projectedCapacity, currentMetrics.thresholds);

  const currentProviders = diagnostics.providers.map(p => ({
    provider: p.provider,
    load: p.currentLoad,
    available: p.available,
  }));

  const projectedProviders = diagnostics.providers.map(p => {
    const projectedLoad = Math.min(100, p.currentLoad * multiplier);
    return {
      provider: p.provider,
      projectedLoad,
      wouldBeAvailable: projectedLoad < 95,
      overloadRisk: assessOverloadRisk(projectedLoad),
    };
  });

  let deferredTaskEstimate = 0;
  let deferredCategories: string[] = [];
  let criticalCategories = CRITICAL_CATEGORIES;

  if (projectedTier === 'yellow') {
    deferredCategories = NON_CRITICAL_CATEGORIES;
    deferredTaskEstimate = Math.ceil(projectedQueueDepth * 0.3);
  } else if (projectedTier === 'red') {
    deferredCategories = [...NON_CRITICAL_CATEGORIES];
    deferredTaskEstimate = Math.ceil(projectedQueueDepth * 0.7);
  }

  const avgProcessingTimePerTask = 2;
  const queueBacklogMinutes = Math.ceil((projectedQueueDepth * avgProcessingTimePerTask) / 60);

  const recoveryFactor = Math.max(1, (multiplier - 1) * 0.5);
  const recoveryTimeMinutes = Math.ceil(queueBacklogMinutes * recoveryFactor);

  const recommendations: string[] = [];

  if (projectedTier !== currentTier) {
    recommendations.push(
      `Traffic spike would escalate load tier from ${currentTier.toUpperCase()} to ${projectedTier.toUpperCase()}`
    );
  }

  if (projectedTier === 'red') {
    recommendations.push('Consider pre-scaling resources before anticipated traffic surge');
    recommendations.push('Ensure CDN caching is optimized for static content');
    recommendations.push('Queue non-critical background jobs for off-peak hours');
  } else if (projectedTier === 'yellow') {
    recommendations.push('Monitor queue depths closely during traffic surge');
    recommendations.push('Some non-critical AI tasks will be deferred');
  }

  const criticalProviders = projectedProviders.filter(p => p.overloadRisk === 'critical');
  if (criticalProviders.length > 0) {
    recommendations.push(
      `Providers at critical risk: ${criticalProviders.map(p => p.provider).join(', ')}`
    );
  }

  if (recoveryTimeMinutes > 10) {
    recommendations.push(
      `Estimated recovery time after spike: ${recoveryTimeMinutes} minutes`
    );
  }

  return {
    success: true,
    simulation: {
      type: 'traffic-spike',
      multiplier,
      timestamp: new Date().toISOString(),
    },
    currentState: {
      capacity: Math.round(currentCapacity),
      tier: currentTier,
      queueDepth: currentQueueDepth,
      providers: currentProviders,
    },
    projectedState: {
      capacity: Math.round(projectedCapacity),
      tier: projectedTier,
      queueDepth: projectedQueueDepth,
      providers: projectedProviders,
    },
    predictions: {
      tierChange: {
        from: currentTier,
        to: projectedTier,
        wouldChange: currentTier !== projectedTier,
      },
      deferredTaskEstimate,
      queueBacklogMinutes,
      recoveryTimeMinutes,
      criticalCategories,
      deferredCategories,
    },
    recommendations,
    readOnlyMode: true,
  };
}
