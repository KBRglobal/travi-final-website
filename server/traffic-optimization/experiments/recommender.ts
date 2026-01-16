/**
 * Experiment Recommendation Layer
 *
 * Decides when optimizations should be:
 * - Direct changes (low risk, high confidence)
 * - A/B experiments (higher risk, need validation)
 *
 * Manages experiment conflicts and generates configs.
 */

import type {
  OptimizationProposal,
  ExperimentConfig,
  ExperimentRecommendation,
  RiskLevel,
  ProposalType,
} from '../types';

// ============================================================================
// EXPERIMENT DECISION CRITERIA
// ============================================================================

interface ExperimentCriteria {
  minTrafficForTest: number;
  riskThresholdForTest: RiskLevel[];
  alwaysTestTypes: ProposalType[];
  neverTestTypes: ProposalType[];
  minConfidenceForDirectChange: number;
}

const DEFAULT_CRITERIA: ExperimentCriteria = {
  minTrafficForTest: 100,
  riskThresholdForTest: ['medium', 'high'],
  alwaysTestTypes: ['rewrite_title', 'improve_cta', 'restructure_content'],
  neverTestTypes: ['add_schema_markup', 'insert_internal_links'],
  minConfidenceForDirectChange: 0.9,
};

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

interface ActiveExperiment {
  id: string;
  contentId: string;
  type: ProposalType;
  targetFields: string[];
  startedAt: Date;
  endsAt: Date;
}

/**
 * Check if two experiments conflict
 */
function experimentsConflict(exp1: ActiveExperiment, exp2: {
  contentId: string;
  type: ProposalType;
  targetFields: string[];
}): boolean {
  // Same content
  if (exp1.contentId !== exp2.contentId) return false;

  // Check field overlap
  const fieldsOverlap = exp1.targetFields.some((f) => exp2.targetFields.includes(f));
  if (fieldsOverlap) return true;

  // Same type of change
  if (exp1.type === exp2.type) return true;

  return false;
}

// ============================================================================
// EXPERIMENT RECOMMENDER CLASS
// ============================================================================

export class ExperimentRecommender {
  private criteria: ExperimentCriteria;
  private activeExperiments: Map<string, ActiveExperiment>;
  private experimentHistory: Array<{
    id: string;
    contentId: string;
    type: ProposalType;
    outcome: 'positive' | 'negative' | 'neutral' | 'inconclusive';
    endedAt: Date;
  }>;

  constructor(criteria?: Partial<ExperimentCriteria>) {
    this.criteria = { ...DEFAULT_CRITERIA, ...criteria };
    this.activeExperiments = new Map();
    this.experimentHistory = [];
  }

  /**
   * Register an active experiment
   */
  registerExperiment(experiment: ActiveExperiment): void {
    this.activeExperiments.set(experiment.id, experiment);
  }

  /**
   * Complete an experiment
   */
  completeExperiment(
    id: string,
    outcome: 'positive' | 'negative' | 'neutral' | 'inconclusive'
  ): void {
    const experiment = this.activeExperiments.get(id);
    if (experiment) {
      this.experimentHistory.push({
        id: experiment.id,
        contentId: experiment.contentId,
        type: experiment.type,
        outcome,
        endedAt: new Date(),
      });
      this.activeExperiments.delete(id);
    }
  }

  /**
   * Evaluate if proposal should be an experiment
   */
  evaluate(
    proposal: OptimizationProposal,
    currentTraffic: number
  ): ExperimentRecommendation {
    const targetFields = proposal.changes.map((c) => c.field);

    // Check for conflicts with active experiments
    const conflicts: string[] = [];
    for (const [id, exp] of this.activeExperiments) {
      if (experimentsConflict(exp, {
        contentId: proposal.contentId,
        type: proposal.type,
        targetFields,
      })) {
        conflicts.push(id);
      }
    }

    // If conflicts exist, cannot run experiment
    if (conflicts.length > 0) {
      return {
        proposalId: proposal.id,
        shouldExperiment: false,
        reason: `Conflicts with ${conflicts.length} active experiment(s)`,
        conflictsWith: conflicts,
        riskIfSkipped: proposal.riskLevel,
      };
    }

    // Check if type should never be tested
    if (this.criteria.neverTestTypes.includes(proposal.type)) {
      return {
        proposalId: proposal.id,
        shouldExperiment: false,
        reason: `${proposal.type} changes are low-risk and don't require testing`,
        conflictsWith: [],
        riskIfSkipped: 'minimal',
      };
    }

    // Check if type should always be tested
    if (this.criteria.alwaysTestTypes.includes(proposal.type)) {
      if (currentTraffic >= this.criteria.minTrafficForTest) {
        return {
          proposalId: proposal.id,
          shouldExperiment: true,
          reason: `${proposal.type} changes should always be tested for optimal results`,
          conflictsWith: [],
          riskIfSkipped: proposal.riskLevel,
          config: proposal.experimentConfig || this.generateConfig(proposal),
        };
      } else {
        return {
          proposalId: proposal.id,
          shouldExperiment: false,
          reason: `Insufficient traffic (${currentTraffic} < ${this.criteria.minTrafficForTest}) for reliable test`,
          conflictsWith: [],
          riskIfSkipped: proposal.riskLevel,
        };
      }
    }

    // Check risk level
    if (this.criteria.riskThresholdForTest.includes(proposal.riskLevel)) {
      if (currentTraffic >= this.criteria.minTrafficForTest) {
        return {
          proposalId: proposal.id,
          shouldExperiment: true,
          reason: `${proposal.riskLevel} risk changes should be validated with A/B test`,
          conflictsWith: [],
          riskIfSkipped: proposal.riskLevel,
          config: proposal.experimentConfig || this.generateConfig(proposal),
        };
      }
    }

    // Check historical performance for this type
    const typeHistory = this.experimentHistory.filter((h) => h.type === proposal.type);
    const positiveRate = typeHistory.length > 0
      ? typeHistory.filter((h) => h.outcome === 'positive').length / typeHistory.length
      : 0.5;

    if (positiveRate < 0.6 && currentTraffic >= this.criteria.minTrafficForTest) {
      return {
        proposalId: proposal.id,
        shouldExperiment: true,
        reason: `Historical success rate for ${proposal.type} is ${(positiveRate * 100).toFixed(0)}%, testing recommended`,
        conflictsWith: [],
        riskIfSkipped: proposal.riskLevel,
        config: proposal.experimentConfig || this.generateConfig(proposal),
      };
    }

    // Default: direct change if low risk and high confidence
    return {
      proposalId: proposal.id,
      shouldExperiment: false,
      reason: 'Low risk change with sufficient confidence for direct implementation',
      conflictsWith: [],
      riskIfSkipped: 'minimal',
    };
  }

  /**
   * Generate experiment config for proposal
   */
  generateConfig(proposal: OptimizationProposal): ExperimentConfig {
    const primaryMetric = this.inferPrimaryMetric(proposal);

    return {
      type: 'ab_test',
      name: `${proposal.type} optimization for ${proposal.contentSlug || proposal.contentId}`,
      description: `Testing ${proposal.type} changes to improve ${primaryMetric}`,
      hypothesis: `Implementing the proposed ${proposal.type} changes will improve ${primaryMetric} by the predicted amount`,
      variants: [
        {
          id: 'control',
          name: 'Original',
          weight: 50,
          changes: [],
        },
        {
          id: 'treatment',
          name: 'Optimized',
          weight: 50,
          changes: proposal.changes,
        },
      ],
      primaryMetric,
      secondaryMetrics: this.inferSecondaryMetrics(proposal, primaryMetric),
      minimumSampleSize: this.calculateMinSampleSize(proposal),
      durationDays: this.calculateDuration(proposal),
      confidenceThreshold: 0.95,
    };
  }

  /**
   * Infer primary metric from proposal type
   */
  private inferPrimaryMetric(proposal: OptimizationProposal): string {
    const typeMetrics: Record<ProposalType, string> = {
      rewrite_title: 'ctr',
      rewrite_meta_description: 'ctr',
      add_aeo_capsule: 'aiVisibilityScore',
      update_aeo_capsule: 'aiVisibilityScore',
      insert_internal_links: 'bounceRate',
      restructure_content: 'avgTimeOnPage',
      add_schema_markup: 'ctr',
      improve_cta: 'conversionRate',
      add_monetization: 'revenue',
      optimize_images: 'pageLoadTime',
      improve_mobile_layout: 'mobileBounceRate',
      add_faq_section: 'avgTimeOnPage',
      recommend_ab_test: 'engagementScore',
    };

    return typeMetrics[proposal.type] || 'engagementScore';
  }

  /**
   * Infer secondary metrics
   */
  private inferSecondaryMetrics(proposal: OptimizationProposal, primaryMetric: string): string[] {
    const allMetrics = ['ctr', 'bounceRate', 'avgTimeOnPage', 'conversionRate', 'engagementScore'];
    return allMetrics.filter((m) => m !== primaryMetric).slice(0, 3);
  }

  /**
   * Calculate minimum sample size
   */
  private calculateMinSampleSize(proposal: OptimizationProposal): number {
    // Base on expected effect size
    const expectedEffect = proposal.expectedImpact[0]?.confidenceInterval?.low || 0.1;

    // Larger effect = smaller sample needed
    if (expectedEffect > 0.3) return 200;
    if (expectedEffect > 0.2) return 500;
    if (expectedEffect > 0.1) return 1000;
    return 2000;
  }

  /**
   * Calculate experiment duration
   */
  private calculateDuration(proposal: OptimizationProposal): number {
    // Base on risk level
    switch (proposal.riskLevel) {
      case 'minimal': return 7;
      case 'low': return 14;
      case 'medium': return 21;
      case 'high': return 28;
      default: return 14;
    }
  }

  /**
   * Get all active experiments
   */
  getActiveExperiments(): ActiveExperiment[] {
    return Array.from(this.activeExperiments.values());
  }

  /**
   * Get experiments for content
   */
  getExperimentsForContent(contentId: string): ActiveExperiment[] {
    return Array.from(this.activeExperiments.values()).filter(
      (e) => e.contentId === contentId
    );
  }

  /**
   * Check if content has active experiments
   */
  hasActiveExperiments(contentId: string): boolean {
    return Array.from(this.activeExperiments.values()).some(
      (e) => e.contentId === contentId
    );
  }

  /**
   * Get experiment history for content
   */
  getHistoryForContent(contentId: string): typeof this.experimentHistory {
    return this.experimentHistory.filter((h) => h.contentId === contentId);
  }

  /**
   * Get success rate for proposal type
   */
  getSuccessRate(type: ProposalType): number {
    const typeHistory = this.experimentHistory.filter((h) => h.type === type);
    if (typeHistory.length === 0) return 0.5;

    return typeHistory.filter((h) => h.outcome === 'positive').length / typeHistory.length;
  }

  /**
   * Clear expired experiments
   */
  cleanupExpired(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [id, exp] of this.activeExperiments) {
      if (exp.endsAt < now) {
        this.completeExperiment(id, 'inconclusive');
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    activeCount: number;
    completedCount: number;
    positiveRate: number;
    negativeRate: number;
  } {
    const completed = this.experimentHistory.length;
    const positive = this.experimentHistory.filter((h) => h.outcome === 'positive').length;
    const negative = this.experimentHistory.filter((h) => h.outcome === 'negative').length;

    return {
      activeCount: this.activeExperiments.size,
      completedCount: completed,
      positiveRate: completed > 0 ? positive / completed : 0,
      negativeRate: completed > 0 ? negative / completed : 0,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.activeExperiments.clear();
    this.experimentHistory = [];
  }
}

// Singleton instance
let recommenderInstance: ExperimentRecommender | null = null;

export function getExperimentRecommender(): ExperimentRecommender {
  if (!recommenderInstance) {
    recommenderInstance = new ExperimentRecommender();
  }
  return recommenderInstance;
}

export function resetExperimentRecommender(): void {
  if (recommenderInstance) {
    recommenderInstance.clear();
  }
  recommenderInstance = null;
}
