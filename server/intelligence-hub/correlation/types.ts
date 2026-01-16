/**
 * Enterprise Intelligence Hub - Correlation Types
 *
 * Types for detecting and explaining signal correlations.
 */

export type CorrelationType =
  | 'causal'           // A causes B
  | 'associated'       // A and B happen together
  | 'temporal'         // A happens before B
  | 'inverse'          // A increases when B decreases
  | 'unknown';

export type PatternId =
  | 'revenue_entity_loss'
  | 'search_zero_decay'
  | 'cost_spike_regeneration'
  | 'provider_cascade'
  | 'quality_drop_traffic'
  | 'custom';

/**
 * A correlation between two signal types
 */
export interface Correlation {
  id: string;
  type: CorrelationType;
  patternId: PatternId;
  signalA: {
    source: string;
    entityId?: string;
    avgScore: number;
  };
  signalB: {
    source: string;
    entityId?: string;
    avgScore: number;
  };
  strength: number;       // 0-100, how strong the correlation
  confidence: number;     // 0-100, how confident we are
  direction: 'positive' | 'negative' | 'neutral';
  explanation: string;
  detectedAt: Date;
  sampleSize: number;
}

/**
 * Known correlation pattern
 */
export interface CorrelationPattern {
  id: PatternId;
  name: string;
  description: string;
  signalSourceA: string;
  signalSourceB: string;
  expectedType: CorrelationType;
  expectedDirection: 'positive' | 'negative';
  minStrength: number;
}

/**
 * Anomaly - unexpected signal behavior
 */
export interface Anomaly {
  id: string;
  signalSource: string;
  entityId?: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;      // Standard deviations from expected
  severity: 'minor' | 'moderate' | 'major' | 'extreme';
  explanation: string;
  detectedAt: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

/**
 * Correlation query
 */
export interface CorrelationQuery {
  patternIds?: PatternId[];
  types?: CorrelationType[];
  minStrength?: number;
  minConfidence?: number;
  since?: Date;
  limit?: number;
}

/**
 * Anomaly query
 */
export interface AnomalyQuery {
  signalSources?: string[];
  minDeviation?: number;
  severities?: Anomaly['severity'][];
  resolved?: boolean;
  since?: Date;
  limit?: number;
}
