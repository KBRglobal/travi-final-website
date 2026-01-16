/**
 * Simulation Engine - Main Entry Point
 * 
 * TASK 9: Simulation Mode - "What if" Analysis System
 * 
 * Provides a unified interface for running simulations:
 * - Function: runSimulation(scenario, params): SimulationResult
 * - READ-ONLY mode: no actual database writes
 * - Returns: estimated impact, bottlenecks, recommendations
 * 
 * SAFETY GUARANTEES:
 * - Flag: isSimulationMode = true during simulation
 * - All writes blocked in simulation mode
 * - No production side effects
 * 
 * HARD CONSTRAINTS:
 * - Strictly read-only
 * - No production side effects
 * - In-memory calculations only
 */

import { log } from '../lib/logger';
import { simulateTrafficSpike, type TrafficSimulationResult } from './traffic-simulator';
import { simulateProviderOutage, type ProviderOutageSimulationResult } from './provider-outage';
import { simulateContentExplosion, type ContentExplosionSimulationResult } from './content-explosion';
import {
  type SimulationScenario,
  type ScenarioType,
  getScenarioById,
  getAllScenarios,
  PREDEFINED_SCENARIOS,
} from './scenarios';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Simulator] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[Simulator] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[Simulator] ${msg}`, undefined, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[Simulator][AUDIT] ${msg}`, data),
};

let _isSimulationMode = false;
let _activeSimulationId: string | null = null;
let _simulationStartTime: Date | null = null;

export function isSimulationMode(): boolean {
  return _isSimulationMode;
}

export function getActiveSimulationId(): string | null {
  return _activeSimulationId;
}

export function getSimulationStartTime(): Date | null {
  return _simulationStartTime;
}

function enterSimulationMode(simulationId: string): void {
  _isSimulationMode = true;
  _activeSimulationId = simulationId;
  _simulationStartTime = new Date();
  
  logger.audit('SIMULATION_MODE_ENTERED', {
    simulationId,
    timestamp: _simulationStartTime.toISOString(),
  });
}

function exitSimulationMode(): void {
  const duration = _simulationStartTime 
    ? Date.now() - _simulationStartTime.getTime() 
    : 0;

  logger.audit('SIMULATION_MODE_EXITED', {
    simulationId: _activeSimulationId,
    durationMs: duration,
    timestamp: new Date().toISOString(),
  });

  _isSimulationMode = false;
  _activeSimulationId = null;
  _simulationStartTime = null;
}

export function assertNotSimulationMode(operation: string): void {
  if (_isSimulationMode) {
    const errorMessage = `WRITE_BLOCKED: Operation "${operation}" blocked during simulation mode. ` +
      `Simulation ID: ${_activeSimulationId}. All writes are blocked to ensure read-only analysis.`;
    
    logger.warn('Write operation blocked in simulation mode', {
      operation,
      simulationId: _activeSimulationId,
    });
    
    throw new Error(errorMessage);
  }
}

export interface SimulationParams {
  multiplier?: number;
  provider?: string;
  contentCount?: number;
}

export interface BaseSimulationResult {
  success: boolean;
  readOnlyMode: true;
  simulation: {
    id: string;
    scenarioId: string;
    scenarioName: string;
    type: ScenarioType;
    timestamp: string;
    durationMs: number;
  };
  safetyGuarantees: {
    isSimulationMode: boolean;
    writesBlocked: boolean;
    productionSideEffects: false;
    inMemoryOnly: true;
  };
}

export interface UnifiedSimulationResult extends BaseSimulationResult {
  estimatedImpact: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedSystems: string[];
    tierChange: {
      from: string;
      to: string;
      wouldChange: boolean;
    } | null;
    capacityImpact: number;
    queueImpact: number;
  };
  bottlenecks: {
    resource: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }[];
  recommendations: string[];
  rawResult: TrafficSimulationResult | ProviderOutageSimulationResult | ContentExplosionSimulationResult;
}

function generateSimulationId(): string {
  return `sim_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export function runSimulation(
  scenarioOrId: string | SimulationScenario,
  overrideParams?: SimulationParams
): UnifiedSimulationResult {
  const simulationId = generateSimulationId();
  const startTime = Date.now();

  let scenario: SimulationScenario;
  
  if (typeof scenarioOrId === 'string') {
    const foundScenario = getScenarioById(scenarioOrId);
    if (!foundScenario) {
      throw new Error(`Unknown scenario ID: ${scenarioOrId}. Available: ${Object.keys(PREDEFINED_SCENARIOS).join(', ')}`);
    }
    scenario = foundScenario;
  } else {
    scenario = scenarioOrId;
  }

  logger.info('Starting simulation', {
    simulationId,
    scenarioId: scenario.id,
    scenarioType: scenario.type,
    severity: scenario.severity,
  });

  enterSimulationMode(simulationId);

  try {
    let rawResult: TrafficSimulationResult | ProviderOutageSimulationResult | ContentExplosionSimulationResult;
    let estimatedImpact: UnifiedSimulationResult['estimatedImpact'];
    let bottlenecks: UnifiedSimulationResult['bottlenecks'];
    let recommendations: string[];

    switch (scenario.type) {
      case 'traffic-spike': {
        const multiplier = overrideParams?.multiplier ?? scenario.params.multiplier;
        const result = simulateTrafficSpike(multiplier);
        rawResult = result;

        estimatedImpact = {
          severity: scenario.severity,
          affectedSystems: ['ai-orchestrator', 'queue', 'rate-limiter'],
          tierChange: {
            from: result.predictions.tierChange.from,
            to: result.predictions.tierChange.to,
            wouldChange: result.predictions.tierChange.wouldChange,
          },
          capacityImpact: result.projectedState.capacity - result.currentState.capacity,
          queueImpact: result.projectedState.queueDepth - result.currentState.queueDepth,
        };

        bottlenecks = result.projectedState.providers
          .filter(p => p.overloadRisk === 'high' || p.overloadRisk === 'critical')
          .map(p => ({
            resource: `Provider: ${p.provider}`,
            severity: p.overloadRisk as 'high' | 'critical',
            description: `Would reach ${Math.round(p.projectedLoad)}% load`,
          }));

        recommendations = result.recommendations;
        break;
      }

      case 'provider-outage': {
        const provider = overrideParams?.provider ?? scenario.params.provider;
        const result = simulateProviderOutage(provider);
        rawResult = result;

        estimatedImpact = {
          severity: scenario.severity,
          affectedSystems: ['ai-orchestrator', 'content-generation', 'fallback-chain'],
          tierChange: null,
          capacityImpact: -result.projectedImpact.estimatedCapacityLoss,
          queueImpact: result.predictions.estimatedQueueBacklog,
        };

        bottlenecks = [];
        if (!result.projectedImpact.wouldHaveFallback) {
          bottlenecks.push({
            resource: `Provider: ${provider}`,
            severity: 'critical',
            description: 'No fallback provider available',
          });
        }
        if (result.costAnalysis.costIncreasePercent > 20) {
          bottlenecks.push({
            resource: 'Cost',
            severity: result.costAnalysis.costIncreasePercent > 50 ? 'high' : 'medium',
            description: `${result.costAnalysis.costIncreasePercent}% cost increase expected`,
          });
        }

        recommendations = result.recommendations;
        break;
      }

      case 'content-explosion': {
        const contentCount = overrideParams?.contentCount ?? scenario.params.contentCount;
        const result = simulateContentExplosion(contentCount);
        rawResult = result;

        estimatedImpact = {
          severity: scenario.severity,
          affectedSystems: ['ai-orchestrator', 'storage', 'database', 'search-index'],
          tierChange: result.currentState.tier !== result.processingImpact.projectedTier
            ? {
                from: result.currentState.tier,
                to: result.processingImpact.projectedTier,
                wouldChange: true,
              }
            : null,
          capacityImpact: result.processingImpact.projectedQueueDepth - result.currentState.queueDepth,
          queueImpact: result.processingImpact.projectedQueueDepth,
        };

        bottlenecks = result.bottlenecks;
        recommendations = result.recommendations;
        break;
      }

      default:
        throw new Error(`Unknown scenario type: ${(scenario as SimulationScenario).type}`);
    }

    const durationMs = Date.now() - startTime;

    const unifiedResult: UnifiedSimulationResult = {
      success: true,
      readOnlyMode: true,
      simulation: {
        id: simulationId,
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        type: scenario.type,
        timestamp: new Date().toISOString(),
        durationMs,
      },
      safetyGuarantees: {
        isSimulationMode: true,
        writesBlocked: true,
        productionSideEffects: false,
        inMemoryOnly: true,
      },
      estimatedImpact,
      bottlenecks,
      recommendations,
      rawResult,
    };

    logger.info('Simulation completed', {
      simulationId,
      scenarioId: scenario.id,
      durationMs,
      severity: estimatedImpact.severity,
      bottleneckCount: bottlenecks.length,
    });

    return unifiedResult;

  } finally {
    exitSimulationMode();
  }
}

export function runQuickSimulation(
  type: ScenarioType,
  params: SimulationParams
): UnifiedSimulationResult {
  let scenarioId: string;

  switch (type) {
    case 'traffic-spike':
      scenarioId = params.multiplier && params.multiplier >= 10 ? 'traffic-10x' 
        : params.multiplier && params.multiplier >= 5 ? 'traffic-5x'
        : 'traffic-2x';
      break;
    case 'provider-outage':
      scenarioId = `outage-${params.provider || 'anthropic'}`;
      break;
    case 'content-explosion':
      scenarioId = params.contentCount && params.contentCount >= 1000 ? 'content-10x'
        : params.contentCount && params.contentCount >= 500 ? 'content-500'
        : 'content-100';
      break;
    default:
      throw new Error(`Unknown simulation type: ${type}`);
  }

  return runSimulation(scenarioId, params);
}

export interface SimulationComparison {
  scenarios: {
    id: string;
    name: string;
    severity: string;
    capacityImpact: number;
    bottleneckCount: number;
  }[];
  worstCase: string;
  bestCase: string;
  recommendations: string[];
}

export function compareScenarios(scenarioIds: string[]): SimulationComparison {
  const results: UnifiedSimulationResult[] = [];

  for (const id of scenarioIds) {
    try {
      results.push(runSimulation(id));
    } catch (error) {
      logger.warn('Failed to run scenario in comparison', { scenarioId: id, error: String(error) });
    }
  }

  if (results.length === 0) {
    throw new Error('No scenarios could be simulated');
  }

  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };

  const sortedBySeverity = [...results].sort(
    (a, b) => severityOrder[b.estimatedImpact.severity] - severityOrder[a.estimatedImpact.severity]
  );

  const worstCase = sortedBySeverity[0].simulation.scenarioId;
  const bestCase = sortedBySeverity[sortedBySeverity.length - 1].simulation.scenarioId;

  const allRecommendations = new Set<string>();
  for (const result of results) {
    for (const rec of result.recommendations) {
      allRecommendations.add(rec);
    }
  }

  return {
    scenarios: results.map(r => ({
      id: r.simulation.scenarioId,
      name: r.simulation.scenarioName,
      severity: r.estimatedImpact.severity,
      capacityImpact: r.estimatedImpact.capacityImpact,
      bottleneckCount: r.bottlenecks.length,
    })),
    worstCase,
    bestCase,
    recommendations: Array.from(allRecommendations).slice(0, 10),
  };
}

export function getSimulationStatus(): {
  isActive: boolean;
  simulationId: string | null;
  startTime: string | null;
  elapsedMs: number | null;
} {
  return {
    isActive: _isSimulationMode,
    simulationId: _activeSimulationId,
    startTime: _simulationStartTime?.toISOString() ?? null,
    elapsedMs: _simulationStartTime ? Date.now() - _simulationStartTime.getTime() : null,
  };
}

export function listAvailableScenarios(): {
  id: string;
  name: string;
  type: ScenarioType;
  severity: string;
  description: string;
}[] {
  return getAllScenarios().map(s => ({
    id: s.id,
    name: s.name,
    type: s.type,
    severity: s.severity,
    description: s.description,
  }));
}
