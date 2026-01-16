/**
 * Blast Radius & Impact Simulator - Type Definitions
 * Feature Flag: ENABLE_BLAST_RADIUS=false
 */

export type ImpactScope = 'feature' | 'entity' | 'locale' | 'segment' | 'all';
export type ImpactSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface ImpactTarget {
  type: ImpactScope;
  id: string;
  name?: string;
}

export interface ImpactMetrics {
  usersAffected: number;
  usersAffectedPercent: number;
  contentAffected: number;
  contentAffectedPercent: number;
  revenueAtRisk: number;
  revenueAtRiskPercent: number;
  transactionsAtRisk: number;
}

export interface ImpactBreakdown {
  byLocale: Record<string, ImpactMetrics>;
  bySegment: Record<string, ImpactMetrics>;
  byFeature: Record<string, ImpactMetrics>;
}

export interface BlastRadiusResult {
  id: string;
  target: ImpactTarget;
  severity: ImpactSeverity;
  metrics: ImpactMetrics;
  breakdown: ImpactBreakdown;
  dependencies: DependencyNode[];
  recommendations: string[];
  simulatedAt: Date;
  durationMs: number;
}

export interface DependencyNode {
  id: string;
  type: string;
  name: string;
  impactLevel: 'direct' | 'indirect' | 'cascading';
  metrics: Partial<ImpactMetrics>;
}

export interface SimulationScenario {
  id: string;
  name: string;
  description: string;
  targets: ImpactTarget[];
  assumptions: Record<string, number>;
}

export interface SimulationHistory {
  id: string;
  scenario?: string;
  target: ImpactTarget;
  result: BlastRadiusResult;
  requestedBy?: string;
  simulatedAt: Date;
}

export interface BlastRadiusStatus {
  enabled: boolean;
  simulationsRun: number;
  lastSimulatedAt?: Date;
  cachedResults: number;
}
