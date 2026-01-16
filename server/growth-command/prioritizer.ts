/**
 * Growth Opportunity Prioritizer
 *
 * Creates prioritized lists of opportunities based on criteria and weights.
 */

import type {
  GrowthOpportunity,
  OpportunityScore,
  PrioritizationCriteria,
  PrioritizedList,
  ScoringWeights,
  RiskLevel,
  GrowthQuery,
  QueryResult,
} from './types';
import { GrowthAggregator, getGrowthAggregator } from './aggregator';
import { GrowthScorer, getGrowthScorer } from './scorer';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface PrioritizerConfig {
  defaultListValidityMs: number;
  maxListSize: number;
}

const DEFAULT_CONFIG: PrioritizerConfig = {
  defaultListValidityMs: 60 * 60 * 1000, // 1 hour
  maxListSize: 100,
};

// ============================================================================
// PRIORITIZER CLASS
// ============================================================================

export class GrowthPrioritizer {
  private config: PrioritizerConfig;
  private aggregator: GrowthAggregator;
  private scorer: GrowthScorer;
  private lists: Map<string, PrioritizedList>;

  constructor(
    config?: Partial<PrioritizerConfig>,
    aggregator?: GrowthAggregator,
    scorer?: GrowthScorer
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.aggregator = aggregator || getGrowthAggregator();
    this.scorer = scorer || getGrowthScorer();
    this.lists = new Map();
  }

  /**
   * Create prioritized list with criteria
   */
  createPrioritizedList(
    name: string,
    criteria: PrioritizationCriteria = {},
    weights?: Partial<ScoringWeights>
  ): PrioritizedList {
    // Aggregate opportunities
    this.aggregator.aggregate();
    let opportunities = this.aggregator.getAllOpportunities();

    // Apply filters
    opportunities = this.applyFilters(opportunities, criteria);

    // Update scorer weights if provided
    if (weights) {
      this.scorer.updateWeights(weights);
    }

    // Score and rank
    const scores = this.scorer.scoreAll(opportunities);

    const list: PrioritizedList = {
      id: `list-${Date.now().toString(36)}`,
      name,
      criteria,
      weights: this.scorer.getWeights(),
      opportunities: scores.slice(0, this.config.maxListSize),
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + this.config.defaultListValidityMs),
    };

    this.lists.set(list.id, list);
    return list;
  }

  /**
   * Apply filter criteria to opportunities
   */
  private applyFilters(
    opportunities: GrowthOpportunity[],
    criteria: PrioritizationCriteria
  ): GrowthOpportunity[] {
    return opportunities.filter((opp) => {
      // Min impact score
      if (criteria.minImpactScore !== undefined && opp.impactScore < criteria.minImpactScore) {
        return false;
      }

      // Max risk level
      if (criteria.maxRiskLevel !== undefined) {
        const riskOrder: RiskLevel[] = ['minimal', 'low', 'medium', 'high', 'critical'];
        const oppRiskIndex = riskOrder.indexOf(opp.riskLevel);
        const maxRiskIndex = riskOrder.indexOf(criteria.maxRiskLevel);
        if (oppRiskIndex > maxRiskIndex) {
          return false;
        }
      }

      // Max effort level
      if (criteria.maxEffortLevel !== undefined) {
        const effortOrder = ['trivial', 'low', 'medium', 'high', 'major'];
        const oppEffortIndex = effortOrder.indexOf(opp.effortLevel);
        const maxEffortIndex = effortOrder.indexOf(criteria.maxEffortLevel);
        if (oppEffortIndex > maxEffortIndex) {
          return false;
        }
      }

      // Required categories
      if (criteria.requiredCategories && criteria.requiredCategories.length > 0) {
        if (!criteria.requiredCategories.includes(opp.category)) {
          return false;
        }
      }

      // Excluded categories
      if (criteria.excludedCategories && criteria.excludedCategories.length > 0) {
        if (criteria.excludedCategories.includes(opp.category)) {
          return false;
        }
      }

      // Min ROI
      if (criteria.minROI !== undefined && opp.expectedROI < criteria.minROI) {
        return false;
      }

      // Sources filter
      if (criteria.sources && criteria.sources.length > 0) {
        if (!criteria.sources.includes(opp.source)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Execute a growth query
   */
  executeQuery(query: GrowthQuery): QueryResult {
    const startTime = Date.now();
    this.aggregator.aggregate();

    let opportunities: GrowthOpportunity[] = [];
    const limit = query.limit || 10;

    switch (query.type) {
      case 'top_opportunities':
        opportunities = this.getTopOpportunities(limit);
        break;

      case 'ready_to_execute':
        opportunities = this.getReadyToExecute(limit);
        break;

      case 'high_roi':
        opportunities = this.getHighROI(limit, query.params?.minROI);
        break;

      case 'low_risk':
        opportunities = this.getLowRisk(limit);
        break;

      case 'quick_wins':
        opportunities = this.getQuickWins(limit);
        break;

      case 'strategic':
        opportunities = this.getStrategic(limit);
        break;

      case 'by_category':
        opportunities = this.getByCategory(query.params?.category, limit);
        break;

      case 'by_source':
        opportunities = this.getBySource(query.params?.source, limit);
        break;
    }

    const scores = opportunities.map((o) => this.scorer.scoreOpportunity(o));

    return {
      query,
      opportunities,
      scores,
      executedAt: new Date(),
      processingTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get top opportunities overall
   */
  private getTopOpportunities(limit: number): GrowthOpportunity[] {
    const opportunities = this.aggregator.getAllOpportunities();
    this.scorer.scoreAll(opportunities);
    const topScores = this.scorer.getTopOpportunities(limit);

    return topScores
      .map((s) => this.aggregator.getOpportunity(s.opportunityId))
      .filter((o): o is GrowthOpportunity => o !== undefined);
  }

  /**
   * Get ready-to-execute opportunities
   */
  private getReadyToExecute(limit: number): GrowthOpportunity[] {
    return this.aggregator
      .getAllOpportunities()
      .filter((o) => o.executionReadiness.isReady && o.executionReadiness.score >= 80)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, limit);
  }

  /**
   * Get high ROI opportunities
   */
  private getHighROI(limit: number, minROI: number = 100): GrowthOpportunity[] {
    return this.aggregator
      .getAllOpportunities()
      .filter((o) => o.expectedROI >= minROI)
      .sort((a, b) => b.expectedROI - a.expectedROI)
      .slice(0, limit);
  }

  /**
   * Get low risk opportunities
   */
  private getLowRisk(limit: number): GrowthOpportunity[] {
    return this.aggregator
      .getAllOpportunities()
      .filter((o) => o.riskLevel === 'minimal' || o.riskLevel === 'low')
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, limit);
  }

  /**
   * Get quick wins (low effort, good impact)
   */
  private getQuickWins(limit: number): GrowthOpportunity[] {
    return this.aggregator
      .getAllOpportunities()
      .filter((o) =>
        (o.effortLevel === 'trivial' || o.effortLevel === 'low') &&
        o.impactScore >= 40
      )
      .sort((a, b) => {
        // Sort by impact/effort ratio
        const ratioA = a.impactScore / (a.effortScore || 1);
        const ratioB = b.impactScore / (b.effortScore || 1);
        return ratioB - ratioA;
      })
      .slice(0, limit);
  }

  /**
   * Get strategic opportunities (high impact, aligned)
   */
  private getStrategic(limit: number): GrowthOpportunity[] {
    const strategicCategories = ['conversion_optimization', 'funnel_optimization', 'revenue_optimization'];

    return this.aggregator
      .getAllOpportunities()
      .filter((o) =>
        strategicCategories.includes(o.category) &&
        o.impactScore >= 60 &&
        o.confidenceLevel >= 0.6
      )
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, limit);
  }

  /**
   * Get opportunities by category
   */
  private getByCategory(category: string | undefined, limit: number): GrowthOpportunity[] {
    if (!category) return [];

    return this.aggregator
      .getAllOpportunities()
      .filter((o) => o.category === category)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, limit);
  }

  /**
   * Get opportunities by source
   */
  private getBySource(source: string | undefined, limit: number): GrowthOpportunity[] {
    if (!source) return [];

    return this.aggregator
      .getOpportunitiesBySource(source as any)
      .sort((a, b) => b.impactScore - a.impactScore)
      .slice(0, limit);
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get prioritized list by ID
   */
  getList(id: string): PrioritizedList | undefined {
    return this.lists.get(id);
  }

  /**
   * Get all lists
   */
  getAllLists(): PrioritizedList[] {
    return Array.from(this.lists.values());
  }

  /**
   * Check if list is still valid
   */
  isListValid(id: string): boolean {
    const list = this.lists.get(id);
    return list ? list.validUntil > new Date() : false;
  }

  /**
   * Refresh a list
   */
  refreshList(id: string): PrioritizedList | undefined {
    const list = this.lists.get(id);
    if (!list) return undefined;

    return this.createPrioritizedList(list.name, list.criteria, list.weights);
  }

  /**
   * Delete a list
   */
  deleteList(id: string): boolean {
    return this.lists.delete(id);
  }

  /**
   * Get what to do next (main recommendation)
   */
  getNextAction(): {
    opportunity: GrowthOpportunity | null;
    score: OpportunityScore | null;
    reasoning: string[];
  } {
    this.aggregator.aggregate();
    const opportunities = this.aggregator.getAllOpportunities();

    if (opportunities.length === 0) {
      return {
        opportunity: null,
        score: null,
        reasoning: ['No opportunities currently identified', 'Run data collection to find opportunities'],
      };
    }

    // Score all
    const scores = this.scorer.scoreAll(opportunities);

    // Get top execute_now recommendation
    const executeNow = scores.find((s) => s.recommendation === 'execute_now');
    if (executeNow) {
      const opportunity = this.aggregator.getOpportunity(executeNow.opportunityId);
      return {
        opportunity: opportunity || null,
        score: executeNow,
        reasoning: [
          `Top-ranked opportunity with score ${executeNow.totalScore}`,
          `Expected ROI: ${opportunity?.expectedROI}%`,
          `Risk level: ${opportunity?.riskLevel}`,
          `Ready for immediate execution`,
        ],
      };
    }

    // Get top queued
    const queued = scores.find((s) => s.recommendation === 'queue');
    if (queued) {
      const opportunity = this.aggregator.getOpportunity(queued.opportunityId);
      return {
        opportunity: opportunity || null,
        score: queued,
        reasoning: [
          `Best opportunity for queue with score ${queued.totalScore}`,
          `Expected ROI: ${opportunity?.expectedROI}%`,
          `Requires preparation before execution`,
        ],
      };
    }

    // Return top overall
    const top = scores[0];
    const opportunity = this.aggregator.getOpportunity(top.opportunityId);
    return {
      opportunity: opportunity || null,
      score: top,
      reasoning: [
        `Current best opportunity with score ${top.totalScore}`,
        `Recommendation: ${top.recommendation}`,
      ],
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.lists.clear();
    this.scorer.clear();
  }
}

// Singleton instance
let prioritizerInstance: GrowthPrioritizer | null = null;

export function getGrowthPrioritizer(): GrowthPrioritizer {
  if (!prioritizerInstance) {
    prioritizerInstance = new GrowthPrioritizer();
  }
  return prioritizerInstance;
}

export function resetGrowthPrioritizer(): void {
  if (prioritizerInstance) {
    prioritizerInstance.clear();
  }
  prioritizerInstance = null;
}
