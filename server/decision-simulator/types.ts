/**
 * Platform Decision Simulator - Types
 *
 * Represents hypothetical changes and their predicted impacts.
 */

export type ScenarioType =
  | 'feature_flag_change'
  | 'traffic_spike'
  | 'cost_increase'
  | 'content_surge'
  | 'incident_injection'
  | 'search_degradation'
  | 'provider_outage'
  | 'load_increase';

export type ImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export type SubsystemId =
  | 'publishing'
  | 'search'
  | 'revenue'
  | 'content'
  | 'infrastructure'
  | 'cost'
  | 'compliance'
  | 'intelligence';

/**
 * A single hypothetical change
 */
export interface ScenarioChange {
  type: ScenarioType;
  target: string;           // Feature flag name, subsystem, etc.
  value: unknown;           // New value or magnitude
  duration?: number;        // Duration in ms (for spikes)
  description: string;
}

/**
 * Complete scenario for simulation
 */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  changes: ScenarioChange[];
  createdAt: Date;
  tags?: string[];
}

/**
 * Predicted impact on a subsystem
 */
export interface SubsystemImpact {
  subsystemId: SubsystemId;
  currentState: number;     // 0-100
  predictedState: number;   // 0-100
  delta: number;            // Change
  level: ImpactLevel;
  reasons: string[];
}

/**
 * Overall risk assessment
 */
export interface RiskAssessment {
  overallLevel: ImpactLevel;
  readinessImpact: number;  // Delta
  stabilityImpact: number;  // Delta
  costImpact: number;       // Estimated $ change
  revenueImpact: number;    // Estimated $ change
  complianceRisk: boolean;
  recommendations: string[];
}

/**
 * Simulation result
 */
export interface SimulationResult {
  id: string;
  scenarioId: string;
  scenario: Scenario;
  timestamp: Date;

  // Impacts
  subsystemImpacts: SubsystemImpact[];
  riskAssessment: RiskAssessment;

  // Confidence
  confidence: number;       // 0-100
  confidenceFactors: string[];

  // Affected systems
  affectedSubsystems: SubsystemId[];
  cascadeEffects: CascadeEffect[];

  // Metadata
  simulationDurationMs: number;
  signalsAnalyzed: number;
}

/**
 * Cascade effect from one system to another
 */
export interface CascadeEffect {
  source: SubsystemId;
  target: SubsystemId;
  probability: number;      // 0-100
  impact: ImpactLevel;
  pathway: string;
}

/**
 * Simulation request
 */
export interface SimulationRequest {
  scenario?: Scenario;
  scenarioId?: string;
  options?: SimulationOptions;
}

/**
 * Simulation options
 */
export interface SimulationOptions {
  includeCascades?: boolean;
  maxCascadeDepth?: number;
  includeRecommendations?: boolean;
}

/**
 * Scenario query
 */
export interface ScenarioQuery {
  tags?: string[];
  type?: ScenarioType;
  limit?: number;
}
