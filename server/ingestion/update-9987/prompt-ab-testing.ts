/**
 * Prompt A/B Testing Framework
 * 
 * Update 9987 Phase 2.2: Experiment tracking for prompt optimization
 * 
 * Inspired by: Pezzo, PromptLayer, Langfuse
 * 
 * Features:
 * - Experiment definition with control/treatment variants
 * - Traffic allocation with deterministic hashing
 * - Metric collection (quality, cost, latency)
 * - Statistical significance calculation
 * - Winner determination with confidence intervals
 * - Rollout controls (gradual increase)
 */

import { log } from '../../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[PromptAB] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[PromptAB] ${msg}`, data),
};

export interface PromptVariant {
  id: string;
  name: string;
  promptTemplate: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  isControl: boolean;
  trafficWeight: number;
}

export interface ExperimentMetrics {
  variantId: string;
  impressions: number;
  
  qualityScores: number[];
  qualityMean: number;
  qualityStdDev: number;
  
  latencies: number[];
  latencyMean: number;
  latencyP95: number;
  
  costs: number[];
  costTotal: number;
  costPerRequest: number;
  
  acceptRate: number;
  rejectRate: number;
  
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

export interface Experiment {
  id: string;
  name: string;
  description: string;
  
  promptType: string;
  entityType?: string;
  
  variants: PromptVariant[];
  
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  
  startDate?: Date;
  endDate?: Date;
  
  targetSampleSize: number;
  currentSampleSize: number;
  
  confidenceLevel: number;
  minimumDetectableEffect: number;
  
  winner?: string;
  winnerConfidence?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  
  contentId: string;
  contentType: string;
  
  promptUsed: string;
  responseGenerated: string;
  
  qualityScore?: number;
  latencyMs: number;
  tokensUsed: number;
  estimatedCost: number;
  
  decision?: 'accept' | 'reject';
  
  timestamp: Date;
}

export interface ExperimentSummary {
  experiment: Experiment;
  metrics: Map<string, ExperimentMetrics>;
  
  controlId: string;
  bestPerformerId: string;
  
  improvement: number;
  isSignificant: boolean;
  pValue: number;
  
  recommendation: 'continue' | 'stop_winner' | 'stop_no_winner' | 'needs_more_data';
  recommendationReason: string;
}

export class PromptABTesting {
  private experiments: Map<string, Experiment> = new Map();
  private results: Map<string, ExperimentResult[]> = new Map();
  private variantAssignments: Map<string, string> = new Map();
  
  /**
   * Create a new experiment
   */
  createExperiment(config: {
    name: string;
    description: string;
    promptType: string;
    entityType?: string;
    variants: Omit<PromptVariant, 'id'>[];
    targetSampleSize?: number;
    confidenceLevel?: number;
  }): Experiment {
    const id = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    
    const variants: PromptVariant[] = config.variants.map((v, idx) => ({
      ...v,
      id: `var_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    }));
    
    const totalWeight = variants.reduce((sum, v) => sum + v.trafficWeight, 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      logger.warn('Variant weights do not sum to 100', { totalWeight });
    }
    
    const experiment: Experiment = {
      id,
      name: config.name,
      description: config.description,
      promptType: config.promptType,
      entityType: config.entityType,
      variants,
      status: 'draft',
      targetSampleSize: config.targetSampleSize || 1000,
      currentSampleSize: 0,
      confidenceLevel: config.confidenceLevel || 0.95,
      minimumDetectableEffect: 0.05,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.experiments.set(id, experiment);
    this.results.set(id, []);
    
    logger.info('Experiment created', {
      id,
      name: config.name,
      variantCount: variants.length,
    });
    
    return experiment;
  }
  
  /**
   * Start an experiment
   */
  startExperiment(experimentId: string): Experiment {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }
    
    if (experiment.status === 'running') {
      return experiment;
    }
    
    experiment.status = 'running';
    experiment.startDate = new Date();
    experiment.updatedAt = new Date();
    
    logger.info('Experiment started', { id: experimentId });
    
    return experiment;
  }
  
  /**
   * Get assigned variant for a content ID (deterministic)
   */
  getVariant(experimentId: string, contentId: string): PromptVariant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return null;
    }
    
    const assignmentKey = `${experimentId}:${contentId}`;
    let variantId = this.variantAssignments.get(assignmentKey);
    
    if (!variantId) {
      variantId = this.assignVariant(experiment, contentId);
      this.variantAssignments.set(assignmentKey, variantId);
    }
    
    return experiment.variants.find(v => v.id === variantId) || null;
  }
  
  /**
   * Deterministically assign variant based on content ID hash
   */
  private assignVariant(experiment: Experiment, contentId: string): string {
    const hash = this.hashString(`${experiment.id}:${contentId}`);
    const bucket = hash % 100;
    
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.trafficWeight;
      if (bucket < cumulative) {
        return variant.id;
      }
    }
    
    return experiment.variants[0].id;
  }
  
  /**
   * Simple string hash
   */
  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  }
  
  /**
   * Record experiment result
   */
  recordResult(result: Omit<ExperimentResult, 'timestamp'>): void {
    const experiment = this.experiments.get(result.experimentId);
    if (!experiment) {
      logger.warn('Recording result for unknown experiment', { 
        experimentId: result.experimentId 
      });
      return;
    }
    
    const fullResult: ExperimentResult = {
      ...result,
      timestamp: new Date(),
    };
    
    const results = this.results.get(result.experimentId) || [];
    results.push(fullResult);
    this.results.set(result.experimentId, results);
    
    experiment.currentSampleSize++;
    experiment.updatedAt = new Date();
    
    if (experiment.currentSampleSize >= experiment.targetSampleSize) {
      this.checkForCompletion(experiment.id);
    }
  }
  
  /**
   * Get experiment summary with statistics
   */
  getSummary(experimentId: string): ExperimentSummary | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;
    
    const results = this.results.get(experimentId) || [];
    const metrics = this.calculateMetrics(experiment, results);
    
    const controlVariant = experiment.variants.find(v => v.isControl);
    const controlId = controlVariant?.id || experiment.variants[0].id;
    
    const controlMetrics = metrics.get(controlId);
    
    let bestPerformerId = controlId;
    let bestImprovement = 0;
    
    for (const [variantId, variantMetrics] of metrics) {
      if (variantId === controlId) continue;
      
      if (controlMetrics && controlMetrics.qualityMean > 0) {
        const improvement = (variantMetrics.qualityMean - controlMetrics.qualityMean) 
          / controlMetrics.qualityMean;
        if (improvement > bestImprovement) {
          bestImprovement = improvement;
          bestPerformerId = variantId;
        }
      }
    }
    
    const bestMetrics = metrics.get(bestPerformerId);
    const { isSignificant, pValue } = this.calculateSignificance(
      controlMetrics,
      bestMetrics,
      experiment.confidenceLevel
    );
    
    const recommendation = this.getRecommendation(
      experiment,
      isSignificant,
      bestImprovement,
      pValue
    );
    
    return {
      experiment,
      metrics,
      controlId,
      bestPerformerId,
      improvement: bestImprovement * 100,
      isSignificant,
      pValue,
      recommendation: recommendation.action,
      recommendationReason: recommendation.reason,
    };
  }
  
  /**
   * Calculate metrics for each variant
   */
  private calculateMetrics(
    experiment: Experiment,
    results: ExperimentResult[]
  ): Map<string, ExperimentMetrics> {
    const metrics = new Map<string, ExperimentMetrics>();
    
    for (const variant of experiment.variants) {
      const variantResults = results.filter(r => r.variantId === variant.id);
      
      const qualityScores = variantResults
        .filter(r => r.qualityScore !== undefined)
        .map(r => r.qualityScore!);
      
      const latencies = variantResults.map(r => r.latencyMs);
      const costs = variantResults.map(r => r.estimatedCost);
      
      const accepts = variantResults.filter(r => r.decision === 'accept').length;
      const rejects = variantResults.filter(r => r.decision === 'reject').length;
      const totalDecisions = accepts + rejects;
      
      const inputTokens = variantResults.reduce((sum, r) => sum + r.tokensUsed * 0.3, 0);
      const outputTokens = variantResults.reduce((sum, r) => sum + r.tokensUsed * 0.7, 0);
      
      metrics.set(variant.id, {
        variantId: variant.id,
        impressions: variantResults.length,
        
        qualityScores,
        qualityMean: this.mean(qualityScores),
        qualityStdDev: this.stdDev(qualityScores),
        
        latencies,
        latencyMean: this.mean(latencies),
        latencyP95: this.percentile(latencies, 95),
        
        costs,
        costTotal: costs.reduce((sum, c) => sum + c, 0),
        costPerRequest: variantResults.length > 0 
          ? costs.reduce((sum, c) => sum + c, 0) / variantResults.length 
          : 0,
        
        acceptRate: totalDecisions > 0 ? (accepts / totalDecisions) * 100 : 0,
        rejectRate: totalDecisions > 0 ? (rejects / totalDecisions) * 100 : 0,
        
        tokenUsage: {
          input: Math.round(inputTokens),
          output: Math.round(outputTokens),
          total: Math.round(inputTokens + outputTokens),
        },
      });
    }
    
    return metrics;
  }
  
  /**
   * Calculate statistical significance (simplified t-test)
   */
  private calculateSignificance(
    control?: ExperimentMetrics,
    treatment?: ExperimentMetrics,
    confidenceLevel: number = 0.95
  ): { isSignificant: boolean; pValue: number } {
    if (!control || !treatment) {
      return { isSignificant: false, pValue: 1 };
    }
    
    if (control.qualityScores.length < 30 || treatment.qualityScores.length < 30) {
      return { isSignificant: false, pValue: 1 };
    }
    
    const n1 = control.qualityScores.length;
    const n2 = treatment.qualityScores.length;
    const mean1 = control.qualityMean;
    const mean2 = treatment.qualityMean;
    const std1 = control.qualityStdDev;
    const std2 = treatment.qualityStdDev;
    
    const pooledStdError = Math.sqrt(
      (std1 * std1) / n1 + (std2 * std2) / n2
    );
    
    if (pooledStdError === 0) {
      return { isSignificant: mean1 !== mean2, pValue: mean1 === mean2 ? 1 : 0 };
    }
    
    const tStatistic = (mean2 - mean1) / pooledStdError;
    
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStatistic)));
    const alpha = 1 - confidenceLevel;
    
    return {
      isSignificant: pValue < alpha,
      pValue: Math.round(pValue * 1000) / 1000,
    };
  }
  
  /**
   * Approximate normal CDF
   */
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }
  
  /**
   * Get recommendation based on results
   */
  private getRecommendation(
    experiment: Experiment,
    isSignificant: boolean,
    improvement: number,
    pValue: number
  ): { action: ExperimentSummary['recommendation']; reason: string } {
    const progress = experiment.currentSampleSize / experiment.targetSampleSize;
    
    if (progress < 0.3) {
      return {
        action: 'needs_more_data',
        reason: `Only ${Math.round(progress * 100)}% of target sample collected. Need at least 30% for reliable results.`,
      };
    }
    
    if (isSignificant && improvement >= experiment.minimumDetectableEffect) {
      return {
        action: 'stop_winner',
        reason: `Treatment shows ${(improvement * 100).toFixed(1)}% improvement with p=${pValue}. Recommend deploying winner.`,
      };
    }
    
    if (progress >= 1.0) {
      if (isSignificant) {
        return {
          action: 'stop_winner',
          reason: `Target sample reached. Treatment shows significant difference (p=${pValue}).`,
        };
      }
      return {
        action: 'stop_no_winner',
        reason: 'Target sample reached with no significant difference. Consider keeping control.',
      };
    }
    
    if (pValue > 0.5 && progress > 0.7) {
      return {
        action: 'stop_no_winner',
        reason: 'High p-value suggests no meaningful difference will emerge. Consider stopping early.',
      };
    }
    
    return {
      action: 'continue',
      reason: `${Math.round(progress * 100)}% complete. Current p-value: ${pValue}. Continue collecting data.`,
    };
  }
  
  /**
   * Complete experiment and declare winner
   */
  private checkForCompletion(experimentId: string): void {
    const summary = this.getSummary(experimentId);
    if (!summary) return;
    
    const experiment = summary.experiment;
    
    if (summary.recommendation === 'stop_winner' || 
        summary.recommendation === 'stop_no_winner') {
      experiment.status = 'completed';
      experiment.endDate = new Date();
      
      if (summary.isSignificant && summary.improvement > 0) {
        experiment.winner = summary.bestPerformerId;
        experiment.winnerConfidence = 1 - summary.pValue;
      }
      
      logger.info('Experiment completed', {
        id: experimentId,
        winner: experiment.winner,
        improvement: summary.improvement,
      });
    }
  }
  
  /**
   * Get all experiments
   */
  listExperiments(status?: Experiment['status']): Experiment[] {
    const all = Array.from(this.experiments.values());
    if (status) {
      return all.filter(e => e.status === status);
    }
    return all;
  }
  
  /**
   * Get running experiment for a prompt type
   */
  getActiveExperiment(promptType: string, entityType?: string): Experiment | null {
    for (const experiment of this.experiments.values()) {
      if (experiment.status !== 'running') continue;
      if (experiment.promptType !== promptType) continue;
      if (entityType && experiment.entityType && experiment.entityType !== entityType) continue;
      return experiment;
    }
    return null;
  }
  
  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
  
  private stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }
  
  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
  
  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.experiments.clear();
    this.results.clear();
    this.variantAssignments.clear();
  }
}

export const promptABTesting = new PromptABTesting();

export function createExperiment(config: {
  name: string;
  description: string;
  promptType: string;
  entityType?: string;
  variants: Omit<PromptVariant, 'id'>[];
  targetSampleSize?: number;
  confidenceLevel?: number;
}): Experiment {
  return promptABTesting.createExperiment(config);
}

export function getVariantForContent(
  experimentId: string,
  contentId: string
): PromptVariant | null {
  return promptABTesting.getVariant(experimentId, contentId);
}

export function recordExperimentResult(
  result: Omit<ExperimentResult, 'timestamp'>
): void {
  promptABTesting.recordResult(result);
}

export function getExperimentSummary(experimentId: string): ExperimentSummary | null {
  return promptABTesting.getSummary(experimentId);
}
