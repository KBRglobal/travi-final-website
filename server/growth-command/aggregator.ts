/**
 * Growth Opportunity Aggregator
 *
 * Collects and normalizes growth opportunities from all source systems.
 */

import type {
  GrowthOpportunity,
  OpportunitySource,
  AggregatedSignal,
  AggregationResult,
  RiskLevel,
  ImpactLevel,
  EffortLevel,
  ExecutionReadiness,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface AggregatorConfig {
  maxOpportunitiesPerSource: number;
  signalRetentionMs: number;
  deduplicationThreshold: number;
}

const DEFAULT_CONFIG: AggregatorConfig = {
  maxOpportunitiesPerSource: 100,
  signalRetentionMs: 24 * 60 * 60 * 1000, // 24 hours
  deduplicationThreshold: 0.8,
};

// ============================================================================
// AGGREGATOR CLASS
// ============================================================================

export class GrowthAggregator {
  private config: AggregatorConfig;
  private opportunities: Map<string, GrowthOpportunity>;
  private signals: AggregatedSignal[];

  constructor(config?: Partial<AggregatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.opportunities = new Map();
    this.signals = [];
  }

  /**
   * Aggregate opportunities from all sources
   */
  aggregate(): AggregationResult {
    // Collect from TCOE
    const tcoeOpportunities = this.collectFromTCOE();

    // Collect from Intent Graph
    const intentOpportunities = this.collectFromIntentGraph();

    // Collect from Funnel Designer
    const funnelOpportunities = this.collectFromFunnelDesigner();

    // Combine and deduplicate
    const allOpportunities = [
      ...tcoeOpportunities,
      ...intentOpportunities,
      ...funnelOpportunities,
    ];

    const deduplicated = this.deduplicateOpportunities(allOpportunities);

    // Store opportunities
    for (const opp of deduplicated) {
      this.opportunities.set(opp.id, opp);
    }

    // Count by source
    const sourceCounts: Record<OpportunitySource, number> = {
      tcoe: tcoeOpportunities.length,
      intent_graph: intentOpportunities.length,
      funnel_designer: funnelOpportunities.length,
      seo_analysis: 0,
      aeo_analysis: 0,
      manual: 0,
    };

    return {
      opportunities: deduplicated,
      signals: this.signals,
      totalFound: deduplicated.length,
      sourceCounts,
      lastUpdated: new Date(),
    };
  }

  /**
   * Collect opportunities from TCOE
   */
  private collectFromTCOE(): GrowthOpportunity[] {
    const opportunities: GrowthOpportunity[] = [];

    try {
      // Try to get TCOE bottlenecks
      const { getBottleneckDetector } = require('../tcoe/bottleneck-detector');
      const detector = getBottleneckDetector();
      const bottlenecks = detector.getAllBottlenecks();

      for (const bottleneck of bottlenecks.slice(0, this.config.maxOpportunitiesPerSource)) {
        opportunities.push(this.convertTCOEBottleneck(bottleneck));
      }
    } catch {
      // TCOE not available
      this.addSignal('tcoe', 'module_unavailable', { reason: 'Module not loaded' });
    }

    return opportunities;
  }

  /**
   * Convert TCOE bottleneck to opportunity
   */
  private convertTCOEBottleneck(bottleneck: any): GrowthOpportunity {
    const severityToRisk: Record<string, RiskLevel> = {
      critical: 'high',
      high: 'medium',
      medium: 'low',
      low: 'minimal',
    };

    const severityToImpact: Record<string, ImpactLevel> = {
      critical: 'high',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };

    return {
      id: `tcoe-${bottleneck.id}`,
      source: 'tcoe',
      sourceId: bottleneck.id,
      status: 'identified',
      title: `Fix ${bottleneck.type} bottleneck: ${bottleneck.location}`,
      description: bottleneck.description || `Conversion bottleneck detected at ${bottleneck.location}`,
      category: 'conversion_optimization',
      subcategory: bottleneck.type,
      impactScore: Math.round(bottleneck.impact * 100) || 50,
      impactLevel: severityToImpact[bottleneck.severity] || 'medium',
      expectedROI: this.estimateROI(bottleneck),
      confidenceLevel: bottleneck.confidence || 0.7,
      revenueImpact: {
        lowEstimate: bottleneck.estimatedRevenueLift?.low || 0,
        midEstimate: bottleneck.estimatedRevenueLift?.mid || 0,
        highEstimate: bottleneck.estimatedRevenueLift?.high || 0,
        timeframeDays: 30,
      },
      riskScore: this.getRiskScore(severityToRisk[bottleneck.severity] || 'low'),
      riskLevel: severityToRisk[bottleneck.severity] || 'low',
      risks: bottleneck.risks || [],
      effortScore: this.estimateEffortScore(bottleneck),
      effortLevel: this.estimateEffortLevel(bottleneck),
      dependencies: [],
      requiredApprovals: this.determineApprovals(bottleneck),
      blockers: [],
      executionReadiness: this.assessReadiness(bottleneck),
      createdAt: new Date(bottleneck.detectedAt) || new Date(),
      updatedAt: new Date(),
      tags: ['tcoe', bottleneck.type, bottleneck.severity],
    };
  }

  /**
   * Collect opportunities from Intent Graph
   */
  private collectFromIntentGraph(): GrowthOpportunity[] {
    const opportunities: GrowthOpportunity[] = [];

    try {
      const { getIntentQueryEngine } = require('../intent-graph/query-engine');
      const queryEngine = getIntentQueryEngine();

      // Get failing intents
      const failingIntents = queryEngine.executeQuery({ type: 'failing_intents', limit: 20 });
      for (const result of failingIntents.results) {
        opportunities.push(this.convertIntentGraphResult(result, 'failing_intent'));
      }

      // Get drop-off points
      const dropOffs = queryEngine.executeQuery({ type: 'drop_off_points', limit: 20 });
      for (const result of dropOffs.results) {
        opportunities.push(this.convertIntentGraphResult(result, 'drop_off'));
      }
    } catch {
      // Intent Graph not available
      this.addSignal('intent_graph', 'module_unavailable', { reason: 'Module not loaded' });
    }

    return opportunities;
  }

  /**
   * Convert Intent Graph result to opportunity
   */
  private convertIntentGraphResult(result: any, type: string): GrowthOpportunity {
    const impactScore = Math.round((1 - (result.score || 0.5)) * 100);

    return {
      id: `intent-${result.nodeId || result.id || Date.now().toString(36)}`,
      source: 'intent_graph',
      sourceId: result.nodeId || result.id,
      status: 'identified',
      title: type === 'failing_intent'
        ? `Improve failing intent: ${result.label || 'Unknown'}`
        : `Fix drop-off at: ${result.label || 'Unknown'}`,
      description: result.explanation || `User intent analysis identified opportunity`,
      category: 'user_experience',
      subcategory: type,
      impactScore,
      impactLevel: impactScore > 70 ? 'high' : impactScore > 40 ? 'medium' : 'low',
      expectedROI: impactScore * 2,
      confidenceLevel: result.confidence || 0.6,
      revenueImpact: {
        lowEstimate: 0,
        midEstimate: 0,
        highEstimate: 0,
        timeframeDays: 30,
      },
      riskScore: 0.2,
      riskLevel: 'low',
      risks: [],
      effortScore: 40,
      effortLevel: 'medium',
      dependencies: [],
      requiredApprovals: [{ type: 'manual', role: 'content_owner', reason: 'Content change', status: 'pending' }],
      blockers: [],
      executionReadiness: { isReady: true, score: 80, blockers: [], warnings: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['intent_graph', type],
    };
  }

  /**
   * Collect opportunities from Funnel Designer
   */
  private collectFromFunnelDesigner(): GrowthOpportunity[] {
    const opportunities: GrowthOpportunity[] = [];

    try {
      const { getProposalEngine } = require('../funnel-designer/proposal-engine');
      const proposalEngine = getProposalEngine();
      const proposals = proposalEngine.getAllProposals();

      for (const proposal of proposals.slice(0, this.config.maxOpportunitiesPerSource)) {
        opportunities.push(this.convertFunnelProposal(proposal));
      }
    } catch {
      // Funnel Designer not available
      this.addSignal('funnel_designer', 'module_unavailable', { reason: 'Module not loaded' });
    }

    return opportunities;
  }

  /**
   * Convert Funnel Designer proposal to opportunity
   */
  private convertFunnelProposal(proposal: any): GrowthOpportunity {
    return {
      id: `funnel-${proposal.id}`,
      source: 'funnel_designer',
      sourceId: proposal.id,
      status: 'identified',
      title: proposal.title || `Funnel optimization: ${proposal.type}`,
      description: proposal.description || 'Funnel optimization opportunity',
      category: 'funnel_optimization',
      subcategory: proposal.type,
      impactScore: proposal.expectedLift ? Math.min(100, proposal.expectedLift * 100) : 50,
      impactLevel: proposal.expectedLift > 0.2 ? 'high' : proposal.expectedLift > 0.1 ? 'medium' : 'low',
      expectedROI: (proposal.expectedLift || 0.1) * 100,
      confidenceLevel: proposal.confidence || 0.65,
      revenueImpact: {
        lowEstimate: proposal.revenueImpact?.low || 0,
        midEstimate: proposal.revenueImpact?.mid || 0,
        highEstimate: proposal.revenueImpact?.high || 0,
        timeframeDays: 30,
      },
      riskScore: proposal.riskScore || 0.3,
      riskLevel: proposal.riskLevel || 'low',
      risks: proposal.risks || [],
      effortScore: proposal.effortScore || 50,
      effortLevel: proposal.effortLevel || 'medium',
      dependencies: proposal.dependencies || [],
      requiredApprovals: proposal.requiredApprovals || [],
      blockers: proposal.blockers || [],
      executionReadiness: proposal.executionReadiness || { isReady: true, score: 70, blockers: [], warnings: [] },
      createdAt: new Date(proposal.createdAt) || new Date(),
      updatedAt: new Date(),
      tags: ['funnel_designer', proposal.type],
    };
  }

  /**
   * Add aggregated signal
   */
  private addSignal(source: OpportunitySource, type: string, data: Record<string, any>): void {
    this.signals.push({
      source,
      signalType: type,
      data,
      timestamp: new Date(),
      relevanceScore: 1,
    });
  }

  /**
   * Deduplicate opportunities
   */
  private deduplicateOpportunities(opportunities: GrowthOpportunity[]): GrowthOpportunity[] {
    const seen = new Map<string, GrowthOpportunity>();

    for (const opp of opportunities) {
      const key = `${opp.category}:${opp.subcategory || ''}:${opp.title.toLowerCase().substring(0, 50)}`;
      const existing = seen.get(key);

      if (!existing || opp.impactScore > existing.impactScore) {
        seen.set(key, opp);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Estimate ROI from bottleneck
   */
  private estimateROI(bottleneck: any): number {
    const baseROI = 50;
    const severityMultiplier: Record<string, number> = {
      critical: 3,
      high: 2,
      medium: 1.5,
      low: 1,
    };

    return baseROI * (severityMultiplier[bottleneck.severity] || 1);
  }

  /**
   * Get risk score from level
   */
  private getRiskScore(level: RiskLevel): number {
    const scores: Record<RiskLevel, number> = {
      minimal: 0.1,
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      critical: 0.9,
    };
    return scores[level];
  }

  /**
   * Estimate effort score
   */
  private estimateEffortScore(bottleneck: any): number {
    const typeEffort: Record<string, number> = {
      friction: 30,
      leakage: 40,
      drop_off: 50,
      form_abandonment: 35,
      slow_load: 25,
    };
    return typeEffort[bottleneck.type] || 50;
  }

  /**
   * Estimate effort level
   */
  private estimateEffortLevel(bottleneck: any): EffortLevel {
    const score = this.estimateEffortScore(bottleneck);
    if (score < 20) return 'trivial';
    if (score < 40) return 'low';
    if (score < 60) return 'medium';
    if (score < 80) return 'high';
    return 'major';
  }

  /**
   * Determine required approvals
   */
  private determineApprovals(bottleneck: any): GrowthOpportunity['requiredApprovals'] {
    const approvals: GrowthOpportunity['requiredApprovals'] = [];

    if (bottleneck.severity === 'critical' || bottleneck.severity === 'high') {
      approvals.push({
        type: 'manual',
        role: 'engineering_lead',
        reason: 'High-impact change',
        status: 'pending',
      });
    }

    if (bottleneck.type === 'form_abandonment') {
      approvals.push({
        type: 'manual',
        role: 'product_owner',
        reason: 'Form modification',
        status: 'pending',
      });
    }

    return approvals;
  }

  /**
   * Assess execution readiness
   */
  private assessReadiness(bottleneck: any): ExecutionReadiness {
    const blockers: string[] = [];
    const warnings: string[] = [];

    if (bottleneck.severity === 'critical') {
      warnings.push('Critical severity - recommend staged rollout');
    }

    return {
      isReady: blockers.length === 0,
      score: Math.max(0, 100 - blockers.length * 30 - warnings.length * 10),
      blockers,
      warnings,
    };
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get all opportunities
   */
  getAllOpportunities(): GrowthOpportunity[] {
    return Array.from(this.opportunities.values());
  }

  /**
   * Get opportunity by ID
   */
  getOpportunity(id: string): GrowthOpportunity | undefined {
    return this.opportunities.get(id);
  }

  /**
   * Get opportunities by source
   */
  getOpportunitiesBySource(source: OpportunitySource): GrowthOpportunity[] {
    return Array.from(this.opportunities.values()).filter((o) => o.source === source);
  }

  /**
   * Update opportunity status
   */
  updateOpportunityStatus(id: string, status: GrowthOpportunity['status']): GrowthOpportunity | undefined {
    const opp = this.opportunities.get(id);
    if (opp) {
      opp.status = status;
      opp.updatedAt = new Date();
    }
    return opp;
  }

  /**
   * Add manual opportunity
   */
  addManualOpportunity(data: Omit<GrowthOpportunity, 'id' | 'source' | 'createdAt' | 'updatedAt'>): GrowthOpportunity {
    const opportunity: GrowthOpportunity = {
      ...data,
      id: `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      source: 'manual',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.opportunities.set(opportunity.id, opportunity);
    return opportunity;
  }

  /**
   * Get recent signals
   */
  getRecentSignals(limit: number = 50): AggregatedSignal[] {
    return this.signals.slice(-limit);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.opportunities.clear();
    this.signals = [];
  }
}

// Singleton instance
let aggregatorInstance: GrowthAggregator | null = null;

export function getGrowthAggregator(): GrowthAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new GrowthAggregator();
  }
  return aggregatorInstance;
}

export function resetGrowthAggregator(): void {
  if (aggregatorInstance) {
    aggregatorInstance.clear();
  }
  aggregatorInstance = null;
}
