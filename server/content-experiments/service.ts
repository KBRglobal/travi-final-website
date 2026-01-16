/**
 * Content Experiments / A-B Testing Service
 */

import {
  type Experiment,
  type ExperimentVariant,
  type ExperimentStatus,
  type ExperimentResult,
  type VariantType,
  type ExperimentStats,
} from "./types";

const experiments: Map<string, Experiment> = new Map();

function generateId(): string {
  return `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createExperiment(
  name: string,
  contentId: string,
  createdBy: string,
  options: {
    description?: string;
    trafficSplit?: number;
    minimumSampleSize?: number;
    confidenceLevel?: number;
  } = {}
): Experiment {
  const id = generateId();
  const experiment: Experiment = {
    id,
    name,
    description: options.description || '',
    contentId,
    status: 'draft',
    trafficSplit: options.trafficSplit || 50,
    variants: [
      { id: `${id}-control`, experimentId: id, type: 'control', name: 'Control', contentSnapshot: {}, impressions: 0, conversions: 0, bounceRate: 0, avgTimeOnPage: 0 },
      { id: `${id}-treatment`, experimentId: id, type: 'treatment', name: 'Treatment', contentSnapshot: {}, impressions: 0, conversions: 0, bounceRate: 0, avgTimeOnPage: 0 },
    ],
    metrics: [{ name: 'Conversion Rate', type: 'conversion' }],
    createdAt: new Date(),
    createdBy,
    minimumSampleSize: options.minimumSampleSize || 1000,
    confidenceLevel: options.confidenceLevel || 0.95,
  };

  experiments.set(id, experiment);
  return experiment;
}

export function getExperiment(experimentId: string): Experiment | undefined {
  return experiments.get(experimentId);
}

export function startExperiment(experimentId: string): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== 'draft') return false;
  experiment.status = 'running';
  experiment.startedAt = new Date();
  return true;
}

export function pauseExperiment(experimentId: string): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== 'running') return false;
  experiment.status = 'paused';
  return true;
}

export function resumeExperiment(experimentId: string): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== 'paused') return false;
  experiment.status = 'running';
  return true;
}

export function endExperiment(experimentId: string): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment) return false;
  experiment.status = 'completed';
  experiment.endedAt = new Date();
  return true;
}

export function recordImpression(experimentId: string, variantType: VariantType): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== 'running') return false;
  const variant = experiment.variants.find(v => v.type === variantType);
  if (!variant) return false;
  variant.impressions++;
  return true;
}

export function recordConversion(experimentId: string, variantType: VariantType): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== 'running') return false;
  const variant = experiment.variants.find(v => v.type === variantType);
  if (!variant) return false;
  variant.conversions++;
  return true;
}

export function assignVariant(experimentId: string, userId: string): VariantType {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== 'running') return 'control';

  // Simple hash-based assignment for consistency
  const hash = userId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const percentage = Math.abs(hash % 100);
  return percentage < experiment.trafficSplit ? 'treatment' : 'control';
}

export function calculateResults(experimentId: string): ExperimentResult | null {
  const experiment = experiments.get(experimentId);
  if (!experiment) return null;

  const control = experiment.variants.find(v => v.type === 'control')!;
  const treatment = experiment.variants.find(v => v.type === 'treatment')!;

  const controlRate = control.impressions > 0 ? control.conversions / control.impressions : 0;
  const treatmentRate = treatment.impressions > 0 ? treatment.conversions / treatment.impressions : 0;

  const uplift = controlRate > 0 ? ((treatmentRate - controlRate) / controlRate) * 100 : 0;
  const sampleSize = control.impressions + treatment.impressions;

  // Simplified significance calculation
  const confidence = sampleSize >= experiment.minimumSampleSize ? 0.95 : sampleSize / experiment.minimumSampleSize;

  let winner: VariantType | 'inconclusive' = 'inconclusive';
  if (confidence >= experiment.confidenceLevel) {
    winner = treatmentRate > controlRate ? 'treatment' : 'control';
  }

  return {
    experimentId,
    winner,
    confidence: Math.round(confidence * 100) / 100,
    uplift: Math.round(uplift * 100) / 100,
    sampleSize,
    controlMetrics: {
      impressions: control.impressions,
      conversions: control.conversions,
      conversionRate: Math.round(controlRate * 10000) / 100,
      bounceRate: control.bounceRate,
      avgTimeOnPage: control.avgTimeOnPage,
    },
    treatmentMetrics: {
      impressions: treatment.impressions,
      conversions: treatment.conversions,
      conversionRate: Math.round(treatmentRate * 10000) / 100,
      bounceRate: treatment.bounceRate,
      avgTimeOnPage: treatment.avgTimeOnPage,
    },
    calculatedAt: new Date(),
  };
}

export function getAllExperiments(): Experiment[] {
  return Array.from(experiments.values());
}

export function getContentExperiments(contentId: string): Experiment[] {
  return Array.from(experiments.values()).filter(e => e.contentId === contentId);
}

export function getRunningExperiments(): Experiment[] {
  return Array.from(experiments.values()).filter(e => e.status === 'running');
}

export function getExperimentStats(): ExperimentStats {
  const all = Array.from(experiments.values());
  const completed = all.filter(e => e.status === 'completed');

  let totalUplift = 0;
  for (const exp of completed) {
    const result = calculateResults(exp.id);
    if (result) totalUplift += Math.abs(result.uplift);
  }

  return {
    total: all.length,
    running: all.filter(e => e.status === 'running').length,
    completed: completed.length,
    avgUplift: completed.length > 0 ? Math.round(totalUplift / completed.length * 100) / 100 : 0,
  };
}
