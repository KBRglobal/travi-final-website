/**
 * Revenue & Impact Forecasting Engine - Type Definitions
 *
 * Predict impact of any proposal BEFORE execution.
 */

// ============================================================================
// FORECAST DIMENSIONS
// ============================================================================

export type ForecastDimension =
  | 'traffic'
  | 'conversion'
  | 'revenue'
  | 'seo_risk'
  | 'aeo_risk'
  | 'cannibalization';

export type RiskLevel = 'minimal' | 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// INPUT TYPES
// ============================================================================

export type ProposalSource = 'content_change' | 'funnel_change' | 'experiment' | 'traffic_optimization';

export interface ForecastInput {
  id: string;
  source: ProposalSource;
  proposalId: string;
  proposalType: string;
  changes: ChangeDescription[];
  context: ForecastContext;
  createdAt: Date;
}

export interface ChangeDescription {
  type: string;
  target: string;
  field?: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  rationale: string;
}

export interface ForecastContext {
  contentId?: string;
  funnelId?: string;
  experimentId?: string;

  // Current state metrics
  currentTraffic?: number;
  currentConversion?: number;
  currentRevenue?: number;
  currentSeoScore?: number;
  currentAeoScore?: number;

  // Historical data
  trafficTrend?: 'increasing' | 'stable' | 'decreasing';
  seasonality?: 'low' | 'normal' | 'peak';

  // Related content
  relatedContentIds?: string[];
}

// ============================================================================
// FORECAST OUTPUT
// ============================================================================

export interface Forecast {
  id: string;
  inputId: string;
  generatedAt: Date;

  // Dimension forecasts
  traffic: DimensionForecast;
  conversion: DimensionForecast;
  revenue: DimensionForecast;
  seoRisk: RiskForecast;
  aeoRisk: RiskForecast;
  cannibalization: CannibalizationForecast;

  // Summary
  netImpactScore: number;
  overallRisk: RiskLevel;
  confidence: number;

  // Explainability
  explanation: ForecastExplanation;
  assumptions: string[];
  caveats: string[];
}

export interface DimensionForecast {
  dimension: ForecastDimension;
  currentValue: number;
  predictedValue: number;
  delta: number;
  deltaPercent: number;
  confidence: ConfidenceInterval;
  factors: ForecastFactor[];
}

export interface RiskForecast {
  dimension: 'seo_risk' | 'aeo_risk';
  level: RiskLevel;
  score: number;
  factors: RiskFactor[];
  mitigations: string[];
}

export interface CannibalizationForecast {
  hasRisk: boolean;
  riskLevel: RiskLevel;
  affectedContent: {
    contentId: string;
    expectedTrafficLoss: number;
    expectedRevenueLoss: number;
  }[];
  netEffect: number;
  recommendations: string[];
}

// ============================================================================
// CONFIDENCE & FACTORS
// ============================================================================

export interface ConfidenceInterval {
  level: number;
  low: number;
  high: number;
}

export interface ForecastFactor {
  name: string;
  impact: number;
  direction: 'positive' | 'negative' | 'neutral';
  weight: number;
  explanation: string;
}

export interface RiskFactor {
  name: string;
  severity: number;
  likelihood: number;
  description: string;
  mitigation?: string;
}

// ============================================================================
// EXPLAINABILITY
// ============================================================================

export interface ForecastExplanation {
  summary: string;
  methodology: string;
  keyDrivers: {
    driver: string;
    contribution: number;
    explanation: string;
  }[];
  sensitivityAnalysis: {
    variable: string;
    baseCase: number;
    optimistic: number;
    pessimistic: number;
  }[];
  comparisons: {
    scenario: string;
    outcome: number;
  }[];
}

// ============================================================================
// MODEL TYPES
// ============================================================================

export interface ForecastModel {
  id: string;
  name: string;
  dimension: ForecastDimension;
  version: string;
  accuracy: number;
  lastCalibrated: Date;

  predict: (input: ForecastInput, context: ModelContext) => DimensionForecast | RiskForecast;
}

export interface ModelContext {
  historicalData?: HistoricalDataPoint[];
  benchmarks?: Record<string, number>;
  seasonalFactors?: Record<string, number>;
}

export interface HistoricalDataPoint {
  date: Date;
  metric: string;
  value: number;
}

// ============================================================================
// REPORT TYPES
// ============================================================================

export interface ForecastReport {
  generatedAt: Date;
  forecasts: Forecast[];
  summary: {
    totalProposals: number;
    avgConfidence: number;
    expectedNetRevenueDelta: number;
    highRiskCount: number;
  };
  recommendations: string[];
}

export interface ForecastComparison {
  forecastIds: string[];
  bestOption: string;
  criteria: string;
  analysis: {
    forecastId: string;
    score: number;
    pros: string[];
    cons: string[];
  }[];
}
