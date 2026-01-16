/**
 * Optimization Proposal Engine
 *
 * Generates concrete, reversible proposals based on detected bottlenecks.
 * All proposals are analysis-only until approved.
 */

import type {
  Bottleneck,
  BottleneckType,
  OptimizationProposal,
  ProposalType,
  ProposalStatus,
  ProposalChange,
  RiskLevel,
  ExperimentConfig,
} from '../types';

// ============================================================================
// PROPOSAL GENERATION RULES
// ============================================================================

interface ProposalTemplate {
  type: ProposalType;
  riskLevel: RiskLevel;
  isReversible: boolean;
  dependencies: string[];
  shouldExperiment: boolean;
  experimentThreshold: number; // Traffic threshold for recommending experiment
  generateChanges: (bottleneck: Bottleneck, context: ProposalContext) => ProposalChange[];
  estimateImpact: (bottleneck: Bottleneck) => {
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidenceInterval: { low: number; high: number };
  }[];
}

interface ProposalContext {
  contentId: string;
  contentSlug?: string;
  contentTitle?: string;
  currentMetrics: Record<string, number>;
}

// Map bottleneck types to proposal templates
const BOTTLENECK_PROPOSALS: Record<BottleneckType, ProposalTemplate[]> = {
  high_impressions_low_engagement: [
    {
      type: 'rewrite_title',
      riskLevel: 'low',
      isReversible: true,
      dependencies: [],
      shouldExperiment: true,
      experimentThreshold: 500,
      generateChanges: (bn, ctx) => [{
        field: 'title',
        currentValue: ctx.contentTitle,
        proposedValue: `[AI-Suggested] Improved title for: ${ctx.contentTitle}`,
        rationale: 'Title optimization can improve engagement by 15-30%',
      }],
      estimateImpact: (bn) => [{
        metric: 'engagementScore',
        currentValue: bn.metrics.current.engagementScore || 0,
        predictedValue: Math.min(100, (bn.metrics.current.engagementScore || 0) * 1.25),
        confidenceInterval: { low: 0.15, high: 0.35 },
      }],
    },
    {
      type: 'restructure_content',
      riskLevel: 'medium',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 1000,
      generateChanges: () => [{
        field: 'contentStructure',
        proposedValue: 'Recommended structure: Hook → Key Points → Details → CTA',
        rationale: 'Better structure improves time on page and reduces bounce',
      }],
      estimateImpact: (bn) => [{
        metric: 'avgTimeOnPage',
        currentValue: bn.metrics.current.avgTimeOnPage || 0,
        predictedValue: (bn.metrics.current.avgTimeOnPage || 60) * 1.4,
        confidenceInterval: { low: 0.2, high: 0.6 },
      }],
    },
  ],

  high_impressions_low_ctr: [
    {
      type: 'rewrite_title',
      riskLevel: 'low',
      isReversible: true,
      dependencies: [],
      shouldExperiment: true,
      experimentThreshold: 300,
      generateChanges: (bn, ctx) => [{
        field: 'title',
        currentValue: ctx.contentTitle,
        proposedValue: `[Optimize for CTR] ${ctx.contentTitle}`,
        rationale: 'Title directly impacts CTR in search results',
      }],
      estimateImpact: (bn) => [{
        metric: 'ctr',
        currentValue: bn.metrics.current.ctr || 0,
        predictedValue: Math.min(0.1, (bn.metrics.current.ctr || 0.02) * 1.5),
        confidenceInterval: { low: 0.2, high: 0.8 },
      }],
    },
    {
      type: 'rewrite_meta_description',
      riskLevel: 'minimal',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 0,
      generateChanges: () => [{
        field: 'metaDescription',
        proposedValue: 'Compelling meta description with clear value proposition and CTA',
        rationale: 'Meta descriptions influence CTR in search results',
      }],
      estimateImpact: (bn) => [{
        metric: 'ctr',
        currentValue: bn.metrics.current.ctr || 0,
        predictedValue: (bn.metrics.current.ctr || 0.02) * 1.2,
        confidenceInterval: { low: 0.1, high: 0.3 },
      }],
    },
    {
      type: 'add_schema_markup',
      riskLevel: 'minimal',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 0,
      generateChanges: () => [{
        field: 'seoSchema',
        proposedValue: { '@type': 'Article', headline: '', description: '' },
        rationale: 'Rich snippets can increase CTR by 10-30%',
      }],
      estimateImpact: (bn) => [{
        metric: 'ctr',
        currentValue: bn.metrics.current.ctr || 0,
        predictedValue: (bn.metrics.current.ctr || 0.02) * 1.15,
        confidenceInterval: { low: 0.05, high: 0.25 },
      }],
    },
  ],

  high_ctr_low_dwell: [
    {
      type: 'restructure_content',
      riskLevel: 'medium',
      isReversible: true,
      dependencies: [],
      shouldExperiment: true,
      experimentThreshold: 200,
      generateChanges: () => [{
        field: 'contentStructure',
        proposedValue: 'Add engaging intro, improve readability, add multimedia',
        rationale: 'Content may not match user expectations set by title/meta',
      }],
      estimateImpact: (bn) => [{
        metric: 'avgTimeOnPage',
        currentValue: bn.metrics.current.avgTimeOnPage || 0,
        predictedValue: (bn.metrics.current.avgTimeOnPage || 30) * 2,
        confidenceInterval: { low: 0.5, high: 1.5 },
      }],
    },
    {
      type: 'add_faq_section',
      riskLevel: 'low',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 0,
      generateChanges: () => [{
        field: 'faqSection',
        proposedValue: 'Add FAQ section addressing common questions',
        rationale: 'FAQs increase engagement and dwell time',
      }],
      estimateImpact: (bn) => [{
        metric: 'avgTimeOnPage',
        currentValue: bn.metrics.current.avgTimeOnPage || 0,
        predictedValue: (bn.metrics.current.avgTimeOnPage || 30) * 1.5,
        confidenceInterval: { low: 0.3, high: 0.7 },
      }],
    },
  ],

  weak_content_landing: [
    {
      type: 'restructure_content',
      riskLevel: 'high',
      isReversible: true,
      dependencies: ['content_backup'],
      shouldExperiment: true,
      experimentThreshold: 100,
      generateChanges: () => [{
        field: 'content',
        proposedValue: 'Major content revision recommended',
        rationale: 'Content quality is below standards for traffic volume',
      }],
      estimateImpact: () => [{
        metric: 'engagementScore',
        currentValue: 20,
        predictedValue: 50,
        confidenceInterval: { low: 0.3, high: 0.7 },
      }],
    },
  ],

  ai_traffic_non_aeo: [
    {
      type: 'add_aeo_capsule',
      riskLevel: 'low',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 0,
      generateChanges: (bn, ctx) => [{
        field: 'answerCapsule',
        proposedValue: `[Generate 40-60 word factual summary for: ${ctx.contentTitle}]`,
        rationale: 'AEO capsules improve AI platform visibility and citation rates',
      }],
      estimateImpact: (bn) => [{
        metric: 'aiVisibilityScore',
        currentValue: bn.metrics.current.aiVisibilityScore || 0,
        predictedValue: Math.min(100, (bn.metrics.current.aiVisibilityScore || 20) + 30),
        confidenceInterval: { low: 15, high: 45 },
      }],
    },
    {
      type: 'add_schema_markup',
      riskLevel: 'minimal',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 0,
      generateChanges: () => [{
        field: 'seoSchema',
        proposedValue: { '@type': 'FAQPage', mainEntity: [] },
        rationale: 'FAQ schema helps AI platforms extract structured answers',
      }],
      estimateImpact: () => [{
        metric: 'aiVisibilityScore',
        currentValue: 0,
        predictedValue: 15,
        confidenceInterval: { low: 5, high: 25 },
      }],
    },
  ],

  high_bounce_rate: [
    {
      type: 'improve_cta',
      riskLevel: 'low',
      isReversible: true,
      dependencies: [],
      shouldExperiment: true,
      experimentThreshold: 300,
      generateChanges: () => [{
        field: 'cta',
        proposedValue: 'Add prominent CTA above fold with clear value proposition',
        rationale: 'Clear CTAs reduce bounce by guiding user action',
      }],
      estimateImpact: (bn) => [{
        metric: 'bounceRate',
        currentValue: bn.metrics.current.bounceRate || 0.7,
        predictedValue: (bn.metrics.current.bounceRate || 0.7) * 0.85,
        confidenceInterval: { low: 0.1, high: 0.25 },
      }],
    },
    {
      type: 'insert_internal_links',
      riskLevel: 'minimal',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 0,
      generateChanges: () => [{
        field: 'internalLinks',
        proposedValue: 'Add 3-5 relevant internal links',
        rationale: 'Internal links reduce bounce and improve site navigation',
      }],
      estimateImpact: (bn) => [{
        metric: 'bounceRate',
        currentValue: bn.metrics.current.bounceRate || 0.7,
        predictedValue: (bn.metrics.current.bounceRate || 0.7) * 0.9,
        confidenceInterval: { low: 0.05, high: 0.15 },
      }],
    },
  ],

  low_conversion: [
    {
      type: 'improve_cta',
      riskLevel: 'low',
      isReversible: true,
      dependencies: [],
      shouldExperiment: true,
      experimentThreshold: 200,
      generateChanges: () => [{
        field: 'cta',
        proposedValue: 'Optimize CTA placement, copy, and design',
        rationale: 'CTA optimization directly impacts conversion rate',
      }],
      estimateImpact: (bn) => [{
        metric: 'conversionRate',
        currentValue: bn.metrics.current.conversionRate || 0.005,
        predictedValue: (bn.metrics.current.conversionRate || 0.005) * 1.5,
        confidenceInterval: { low: 0.2, high: 0.8 },
      }],
    },
    {
      type: 'add_monetization',
      riskLevel: 'medium',
      isReversible: true,
      dependencies: ['traffic_threshold'],
      shouldExperiment: true,
      experimentThreshold: 500,
      generateChanges: () => [{
        field: 'monetization',
        proposedValue: 'Add contextual affiliate links or product recommendations',
        rationale: 'Strategic monetization can improve conversion without hurting UX',
      }],
      estimateImpact: (bn) => [{
        metric: 'conversionRate',
        currentValue: bn.metrics.current.conversionRate || 0.005,
        predictedValue: (bn.metrics.current.conversionRate || 0.005) * 1.3,
        confidenceInterval: { low: 0.1, high: 0.5 },
      }],
    },
  ],

  missed_internal_links: [
    {
      type: 'insert_internal_links',
      riskLevel: 'minimal',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 0,
      generateChanges: () => [{
        field: 'internalLinks',
        proposedValue: 'Add contextually relevant internal links',
        rationale: 'Internal linking improves SEO and user navigation',
      }],
      estimateImpact: () => [{
        metric: 'pageViewsPerSession',
        currentValue: 1.2,
        predictedValue: 1.5,
        confidenceInterval: { low: 0.15, high: 0.4 },
      }],
    },
  ],

  poor_mobile_experience: [
    {
      type: 'improve_mobile_layout',
      riskLevel: 'medium',
      isReversible: true,
      dependencies: ['design_review'],
      shouldExperiment: true,
      experimentThreshold: 200,
      generateChanges: () => [{
        field: 'mobileLayout',
        proposedValue: 'Optimize mobile layout, tap targets, and content flow',
        rationale: 'Mobile optimization reduces bounce and improves engagement',
      }],
      estimateImpact: (bn) => [{
        metric: 'mobileBounceRate',
        currentValue: bn.metrics.current.bounceRate || 0.7,
        predictedValue: (bn.metrics.current.bounceRate || 0.7) * 0.75,
        confidenceInterval: { low: 0.15, high: 0.35 },
      }],
    },
  ],

  content_freshness_decay: [
    {
      type: 'restructure_content',
      riskLevel: 'low',
      isReversible: true,
      dependencies: [],
      shouldExperiment: false,
      experimentThreshold: 0,
      generateChanges: (bn) => [{
        field: 'content',
        proposedValue: 'Update content with recent information and verify accuracy',
        rationale: `Content is ${bn.metrics.current.daysSinceUpdate} days old`,
      }],
      estimateImpact: () => [{
        metric: 'searchRankings',
        currentValue: 0,
        predictedValue: 10,
        confidenceInterval: { low: 5, high: 20 },
      }],
    },
  ],
};

// ============================================================================
// PROPOSAL ENGINE CLASS
// ============================================================================

export class ProposalEngine {
  private proposals: Map<string, OptimizationProposal>;
  private proposalCounter: number;

  constructor() {
    this.proposals = new Map();
    this.proposalCounter = 0;
  }

  /**
   * Generate proposal ID
   */
  private generateProposalId(): string {
    this.proposalCounter++;
    return `prop-${Date.now().toString(36)}-${this.proposalCounter.toString(36)}`;
  }

  /**
   * Generate proposals from bottleneck
   */
  generateFromBottleneck(
    bottleneck: Bottleneck,
    context: ProposalContext
  ): OptimizationProposal[] {
    const templates = BOTTLENECK_PROPOSALS[bottleneck.type] || [];
    const proposals: OptimizationProposal[] = [];

    for (const template of templates) {
      const changes = template.generateChanges(bottleneck, context);
      const impacts = template.estimateImpact(bottleneck);

      // Determine if experiment is recommended
      const shouldExperiment =
        template.shouldExperiment &&
        (context.currentMetrics.visits || 0) >= template.experimentThreshold;

      const proposal: OptimizationProposal = {
        id: this.generateProposalId(),
        type: template.type,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days

        contentId: context.contentId,
        contentSlug: context.contentSlug,
        contentTitle: context.contentTitle,

        triggeredBy: {
          bottleneckId: bottleneck.id,
          automatedAnalysis: true,
        },

        changes,
        expectedImpact: impacts,

        riskLevel: template.riskLevel,
        isReversible: template.isReversible,
        rollbackProcedure: template.isReversible
          ? 'Revert to previous version stored in content history'
          : undefined,
        dependencies: template.dependencies,

        shouldExperiment,
        experimentConfig: shouldExperiment
          ? this.generateExperimentConfig(template, changes, context)
          : undefined,
      };

      this.proposals.set(proposal.id, proposal);
      proposals.push(proposal);
    }

    return proposals;
  }

  /**
   * Generate experiment config for proposal
   */
  private generateExperimentConfig(
    template: ProposalTemplate,
    changes: ProposalChange[],
    context: ProposalContext
  ): ExperimentConfig {
    return {
      type: 'ab_test',
      name: `${template.type} test for ${context.contentSlug || context.contentId}`,
      description: `A/B test for ${template.type} optimization`,
      hypothesis: `Implementing ${template.type} will improve the target metric`,
      variants: [
        {
          id: 'control',
          name: 'Control',
          weight: 50,
          changes: [],
        },
        {
          id: 'variant',
          name: 'Optimized',
          weight: 50,
          changes,
        },
      ],
      primaryMetric: changes[0]?.field || 'engagementScore',
      secondaryMetrics: ['bounceRate', 'conversionRate'],
      minimumSampleSize: Math.max(100, template.experimentThreshold * 2),
      durationDays: 14,
      confidenceThreshold: 0.95,
    };
  }

  /**
   * Get proposal by ID
   */
  getProposal(id: string): OptimizationProposal | undefined {
    return this.proposals.get(id);
  }

  /**
   * Get all proposals
   */
  getAllProposals(): OptimizationProposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get proposals by status
   */
  getProposalsByStatus(status: ProposalStatus): OptimizationProposal[] {
    return Array.from(this.proposals.values()).filter((p) => p.status === status);
  }

  /**
   * Get proposals for content
   */
  getProposalsForContent(contentId: string): OptimizationProposal[] {
    return Array.from(this.proposals.values()).filter((p) => p.contentId === contentId);
  }

  /**
   * Approve proposal
   */
  approveProposal(id: string, approvedBy: string): OptimizationProposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal || proposal.status !== 'pending') return undefined;

    proposal.status = 'approved';
    proposal.approvedBy = approvedBy;
    proposal.approvedAt = new Date();
    proposal.updatedAt = new Date();

    return proposal;
  }

  /**
   * Reject proposal
   */
  rejectProposal(id: string, rejectedBy: string, reason: string): OptimizationProposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal || proposal.status !== 'pending') return undefined;

    proposal.status = 'rejected';
    proposal.rejectedBy = rejectedBy;
    proposal.rejectedAt = new Date();
    proposal.rejectionReason = reason;
    proposal.updatedAt = new Date();

    return proposal;
  }

  /**
   * Mark proposal as implemented
   */
  markImplemented(id: string): OptimizationProposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal || proposal.status !== 'approved') return undefined;

    proposal.status = 'implemented';
    proposal.implementedAt = new Date();
    proposal.updatedAt = new Date();

    return proposal;
  }

  /**
   * Roll back proposal
   */
  rollback(id: string, reason: string): OptimizationProposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal || proposal.status !== 'implemented' || !proposal.isReversible) {
      return undefined;
    }

    proposal.status = 'rolled_back';
    proposal.rolledBackAt = new Date();
    proposal.rollbackReason = reason;
    proposal.updatedAt = new Date();

    return proposal;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    pending: number;
    approved: number;
    implemented: number;
    rejected: number;
    rolledBack: number;
  } {
    const proposals = Array.from(this.proposals.values());
    return {
      total: proposals.length,
      pending: proposals.filter((p) => p.status === 'pending').length,
      approved: proposals.filter((p) => p.status === 'approved').length,
      implemented: proposals.filter((p) => p.status === 'implemented').length,
      rejected: proposals.filter((p) => p.status === 'rejected').length,
      rolledBack: proposals.filter((p) => p.status === 'rolled_back').length,
    };
  }

  /**
   * Clear all proposals
   */
  clear(): void {
    this.proposals.clear();
    this.proposalCounter = 0;
  }
}

// Singleton instance
let engineInstance: ProposalEngine | null = null;

export function getProposalEngine(): ProposalEngine {
  if (!engineInstance) {
    engineInstance = new ProposalEngine();
  }
  return engineInstance;
}

export function resetProposalEngine(): void {
  if (engineInstance) {
    engineInstance.clear();
  }
  engineInstance = null;
}
