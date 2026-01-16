/**
 * Content Experiments / A-B Testing Types
 */

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
export type VariantType = 'control' | 'treatment';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  contentId: string;
  status: ExperimentStatus;
  trafficSplit: number; // percentage for treatment (0-100)
  variants: ExperimentVariant[];
  metrics: ExperimentMetric[];
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  createdBy: string;
  minimumSampleSize: number;
  confidenceLevel: number;
}

export interface ExperimentVariant {
  id: string;
  experimentId: string;
  type: VariantType;
  name: string;
  contentSnapshot: Record<string, unknown>;
  impressions: number;
  conversions: number;
  bounceRate: number;
  avgTimeOnPage: number;
}

export interface ExperimentMetric {
  name: string;
  type: 'conversion' | 'engagement' | 'custom';
  targetSelector?: string;
  eventName?: string;
}

export interface ExperimentResult {
  experimentId: string;
  winner: VariantType | 'inconclusive';
  confidence: number;
  uplift: number;
  sampleSize: number;
  controlMetrics: VariantMetrics;
  treatmentMetrics: VariantMetrics;
  calculatedAt: Date;
}

export interface VariantMetrics {
  impressions: number;
  conversions: number;
  conversionRate: number;
  bounceRate: number;
  avgTimeOnPage: number;
}

export interface ExperimentStats {
  total: number;
  running: number;
  completed: number;
  avgUplift: number;
}

export function isExperimentsEnabled(): boolean {
  return process.env.ENABLE_CONTENT_EXPERIMENTS === 'true';
}
