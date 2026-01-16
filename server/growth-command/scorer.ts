/**
 * Growth Opportunity Scorer
 *
 * Scores and ranks opportunities based on configurable criteria.
 */

import type {
  GrowthOpportunity,
  OpportunityScore,
  ScoringWeights,
  RiskLevel,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_WEIGHTS: ScoringWeights = {
  impact: 0.25,
  roi: 0.25,
  effort: 0.15,
  risk: 0.15,
  urgency: 0.1,
  strategicAlignment: 0.1,
};

// ============================================================================
// SCORER CLASS
// ============================================================================

export class GrowthScorer {
  private weights: ScoringWeights;
  private scores: Map<string, OpportunityScore>;

  constructor(weights?: Partial<ScoringWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.scores = new Map();
  }

  /**
   * Score a single opportunity
   */
  scoreOpportunity(opportunity: GrowthOpportunity): OpportunityScore {
    const components = {
      impactScore: this.calculateImpactScore(opportunity),
      roiScore: this.calculateROIScore(opportunity),
      effortScore: this.calculateEffortScore(opportunity),
      riskScore: this.calculateRiskScore(opportunity),
      urgencyScore: this.calculateUrgencyScore(opportunity),
      alignmentScore: this.calculateAlignmentScore(opportunity),
    };

    const totalScore =
      components.impactScore * this.weights.impact +
      components.roiScore * this.weights.roi +
      components.effortScore * this.weights.effort +
      components.riskScore * this.weights.risk +
      components.urgencyScore * this.weights.urgency +
      components.alignmentScore * this.weights.strategicAlignment;

    const score: OpportunityScore = {
      opportunityId: opportunity.id,
      totalScore: Math.round(totalScore * 100) / 100,
      components,
      rank: 0, // Will be set during ranking
      tier: this.determineTier(totalScore),
      recommendation: this.determineRecommendation(totalScore, opportunity),
    };

    this.scores.set(opportunity.id, score);
    return score;
  }

  /**
   * Score multiple opportunities
   */
  scoreAll(opportunities: GrowthOpportunity[]): OpportunityScore[] {
    const scores = opportunities.map((o) => this.scoreOpportunity(o));

    // Sort by total score descending
    scores.sort((a, b) => b.totalScore - a.totalScore);

    // Assign ranks
    for (let i = 0; i < scores.length; i++) {
      scores[i].rank = i + 1;
      this.scores.set(scores[i].opportunityId, scores[i]);
    }

    return scores;
  }

  /**
   * Calculate impact score (0-100)
   */
  private calculateImpactScore(opportunity: GrowthOpportunity): number {
    // Base score from opportunity's impact score
    let score = opportunity.impactScore;

    // Boost for revenue impact
    const midEstimate = opportunity.revenueImpact.midEstimate;
    if (midEstimate > 10000) score += 10;
    else if (midEstimate > 5000) score += 5;

    // Boost for high confidence
    if (opportunity.confidenceLevel > 0.8) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate ROI score (0-100)
   */
  private calculateROIScore(opportunity: GrowthOpportunity): number {
    const roi = opportunity.expectedROI;

    // Map ROI percentage to score
    if (roi >= 500) return 100;
    if (roi >= 300) return 90;
    if (roi >= 200) return 80;
    if (roi >= 100) return 70;
    if (roi >= 50) return 60;
    if (roi >= 25) return 50;
    if (roi >= 10) return 40;
    if (roi >= 0) return 30;
    return 20; // Negative ROI
  }

  /**
   * Calculate effort score (0-100, higher = less effort = better)
   */
  private calculateEffortScore(opportunity: GrowthOpportunity): number {
    // Invert effort score - lower effort is better
    const effortScore = 100 - opportunity.effortScore;

    // Boost for no blockers
    if (opportunity.blockers.length === 0) {
      return Math.min(100, effortScore + 10);
    }

    // Penalty for blockers
    return Math.max(0, effortScore - opportunity.blockers.length * 10);
  }

  /**
   * Calculate risk score (0-100, higher = lower risk = better)
   */
  private calculateRiskScore(opportunity: GrowthOpportunity): number {
    const riskLevelScores: Record<RiskLevel, number> = {
      minimal: 100,
      low: 85,
      medium: 60,
      high: 35,
      critical: 10,
    };

    let score = riskLevelScores[opportunity.riskLevel];

    // Penalty for number of risks
    score -= opportunity.risks.length * 5;

    // Penalty for pending approvals
    const pendingApprovals = opportunity.requiredApprovals.filter(
      (a) => a.status === 'pending'
    ).length;
    score -= pendingApprovals * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate urgency score (0-100)
   */
  private calculateUrgencyScore(opportunity: GrowthOpportunity): number {
    let score = 50; // Base score

    // Boost for expiring opportunities
    if (opportunity.expiresAt) {
      const daysUntilExpiry = (opportunity.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry < 7) score += 30;
      else if (daysUntilExpiry < 14) score += 20;
      else if (daysUntilExpiry < 30) score += 10;
    }

    // Boost for high-impact categories
    if (opportunity.category === 'conversion_optimization') score += 10;
    if (opportunity.category === 'revenue_optimization') score += 15;

    // Boost for execution-ready opportunities
    if (opportunity.executionReadiness.isReady) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate strategic alignment score (0-100)
   */
  private calculateAlignmentScore(opportunity: GrowthOpportunity): number {
    let score = 50; // Base score

    // Higher score for core growth categories
    const strategicCategories = ['conversion_optimization', 'funnel_optimization', 'revenue_optimization'];
    if (strategicCategories.includes(opportunity.category)) {
      score += 20;
    }

    // Higher score for high-confidence opportunities
    if (opportunity.confidenceLevel > 0.8) score += 15;
    else if (opportunity.confidenceLevel > 0.6) score += 10;

    // Higher score for low-risk opportunities
    if (opportunity.riskLevel === 'minimal' || opportunity.riskLevel === 'low') {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Determine tier based on score
   */
  private determineTier(score: number): OpportunityScore['tier'] {
    if (score >= 80) return 'top';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Determine recommendation based on score and opportunity
   */
  private determineRecommendation(
    score: number,
    opportunity: GrowthOpportunity
  ): OpportunityScore['recommendation'] {
    // Reject high-risk, low-impact opportunities
    if (opportunity.riskLevel === 'critical' && opportunity.impactScore < 50) {
      return 'reject';
    }

    // Defer if not ready
    if (!opportunity.executionReadiness.isReady) {
      return 'defer';
    }

    // Execute now for top tier
    if (score >= 75 && opportunity.executionReadiness.isReady) {
      return 'execute_now';
    }

    // Queue high tier
    if (score >= 55) {
      return 'queue';
    }

    // Review medium tier
    if (score >= 35) {
      return 'review';
    }

    // Defer low tier
    return 'defer';
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get score by opportunity ID
   */
  getScore(opportunityId: string): OpportunityScore | undefined {
    return this.scores.get(opportunityId);
  }

  /**
   * Get all scores
   */
  getAllScores(): OpportunityScore[] {
    return Array.from(this.scores.values()).sort((a, b) => a.rank - b.rank);
  }

  /**
   * Get top opportunities
   */
  getTopOpportunities(limit: number = 10): OpportunityScore[] {
    return this.getAllScores().slice(0, limit);
  }

  /**
   * Get opportunities by tier
   */
  getByTier(tier: OpportunityScore['tier']): OpportunityScore[] {
    return this.getAllScores().filter((s) => s.tier === tier);
  }

  /**
   * Get opportunities by recommendation
   */
  getByRecommendation(recommendation: OpportunityScore['recommendation']): OpportunityScore[] {
    return this.getAllScores().filter((s) => s.recommendation === recommendation);
  }

  /**
   * Update scoring weights
   */
  updateWeights(weights: Partial<ScoringWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Get current weights
   */
  getWeights(): ScoringWeights {
    return { ...this.weights };
  }

  /**
   * Clear all scores
   */
  clear(): void {
    this.scores.clear();
  }
}

// Singleton instance
let scorerInstance: GrowthScorer | null = null;

export function getGrowthScorer(): GrowthScorer {
  if (!scorerInstance) {
    scorerInstance = new GrowthScorer();
  }
  return scorerInstance;
}

export function resetGrowthScorer(): void {
  if (scorerInstance) {
    scorerInstance.clear();
  }
  scorerInstance = null;
}
