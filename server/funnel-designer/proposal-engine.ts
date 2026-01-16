/**
 * Funnel Proposal Engine
 *
 * Generates concrete, reversible proposals for funnel optimization.
 * Never mutates content directly — proposals only.
 */

import type {
  Funnel,
  FunnelStep,
  FunnelBottleneck,
  FunnelChange,
  FunnelProposal,
  FunnelProposalType,
  SimulationResult,
  FunnelAnalysis,
  FrictionPoint,
  LeakagePoint,
  FunnelOpportunity,
} from './types';
import { getFunnelSimulator, FunnelSimulator } from './simulator';

// ============================================================================
// PROPOSAL GENERATION RULES
// ============================================================================

interface ProposalRule {
  type: FunnelProposalType;
  condition: (funnel: Funnel, analysis: FunnelAnalysis) => boolean;
  generateChanges: (funnel: Funnel, analysis: FunnelAnalysis) => FunnelChange[];
  riskLevel: FunnelProposal['riskLevel'];
  isReversible: boolean;
}

const PROPOSAL_RULES: ProposalRule[] = [
  {
    type: 'remove_friction',
    condition: (funnel, analysis) =>
      analysis.friction.some((f) => f.severity > 0.5),
    generateChanges: (funnel, analysis) => {
      const highFriction = analysis.friction.filter((f) => f.severity > 0.5);
      return highFriction.map((f) => ({
        type: 'modify_content' as const,
        targetStepId: f.stepId,
        rationale: `Reduce ${f.type} friction: ${f.description}`,
      }));
    },
    riskLevel: 'low',
    isReversible: true,
  },

  {
    type: 'optimize_step',
    condition: (funnel) =>
      funnel.bottlenecks.some((b) => b.severity === 'critical' || b.severity === 'high'),
    generateChanges: (funnel) => {
      const criticalBottlenecks = funnel.bottlenecks.filter(
        (b) => b.severity === 'critical' || b.severity === 'high'
      );
      return criticalBottlenecks.slice(0, 2).map((b) => ({
        type: 'modify_content' as const,
        targetStepId: b.stepId,
        rationale: `Optimize bottleneck step with ${(b.dropOffRate * 100).toFixed(1)}% drop-off`,
      }));
    },
    riskLevel: 'medium',
    isReversible: true,
  },

  {
    type: 'merge_steps',
    condition: (funnel) =>
      funnel.steps.length > 5 &&
      funnel.steps.some((s, i, arr) =>
        i > 0 && s.dropOffRate < 0.1 && arr[i - 1].dropOffRate < 0.1
      ),
    generateChanges: (funnel) => {
      // Find consecutive low drop-off steps that could be merged
      for (let i = 1; i < funnel.steps.length; i++) {
        if (funnel.steps[i].dropOffRate < 0.1 && funnel.steps[i - 1].dropOffRate < 0.1) {
          return [{
            type: 'remove_step' as const,
            targetStepId: funnel.steps[i].id,
            rationale: `Merge with "${funnel.steps[i - 1].name}" to reduce funnel length`,
          }];
        }
      }
      return [];
    },
    riskLevel: 'medium',
    isReversible: true,
  },

  {
    type: 'split_step',
    condition: (funnel) =>
      funnel.steps.some((s) => s.dropOffRate > 0.4 && s.contentIds.length > 2),
    generateChanges: (funnel) => {
      const overloadedStep = funnel.steps.find(
        (s) => s.dropOffRate > 0.4 && s.contentIds.length > 2
      );
      if (!overloadedStep) return [];

      return [{
        type: 'add_step' as const,
        targetStepId: overloadedStep.id,
        newStepData: {
          name: `${overloadedStep.name} - Part 2`,
          stage: overloadedStep.stage,
          contentIds: overloadedStep.contentIds.slice(Math.floor(overloadedStep.contentIds.length / 2)),
        },
        rationale: `Split overloaded step to reduce cognitive load`,
      }];
    },
    riskLevel: 'high',
    isReversible: true,
  },

  {
    type: 'add_touchpoint',
    condition: (funnel, analysis) =>
      analysis.leakage.some((l) => l.leakRate > 0.2 && l.isRecoverable),
    generateChanges: (funnel, analysis) => {
      const recoverableLeakage = analysis.leakage.find(
        (l) => l.leakRate > 0.2 && l.isRecoverable
      );
      if (!recoverableLeakage) return [];

      return [{
        type: 'add_content' as const,
        targetStepId: recoverableLeakage.stepId,
        contentId: `recovery-${recoverableLeakage.stepId}`,
        rationale: `Add recovery touchpoint for ${(recoverableLeakage.leakRate * 100).toFixed(1)}% leakage`,
      }];
    },
    riskLevel: 'low',
    isReversible: true,
  },

  {
    type: 'restructure',
    condition: (funnel) =>
      funnel.healthScore < 40 && funnel.bottlenecks.length > 2,
    generateChanges: (funnel) => {
      const changes: FunnelChange[] = [];

      // Reorder to put high-conversion steps earlier
      const sortedSteps = [...funnel.steps].sort(
        (a, b) => b.conversionRate - a.conversionRate
      );

      if (sortedSteps[0].id !== funnel.steps[0].id) {
        changes.push({
          type: 'reorder_steps',
          targetStepId: sortedSteps[0].id,
          newPosition: 0,
          rationale: 'Move highest-converting step earlier in funnel',
        });
      }

      // Remove worst performing step if many steps
      if (funnel.steps.length > 4) {
        const worstStep = funnel.steps.reduce(
          (worst, step) => (step.dropOffRate > worst.dropOffRate ? step : worst),
          funnel.steps[0]
        );

        changes.push({
          type: 'remove_step',
          targetStepId: worstStep.id,
          rationale: `Remove step with ${(worstStep.dropOffRate * 100).toFixed(1)}% drop-off`,
        });
      }

      return changes;
    },
    riskLevel: 'high',
    isReversible: true,
  },

  {
    type: 'reorder_content',
    condition: (funnel) =>
      funnel.steps.some((s) => s.contentIds.length > 1 && s.dropOffRate > 0.25),
    generateChanges: (funnel) => {
      const step = funnel.steps.find(
        (s) => s.contentIds.length > 1 && s.dropOffRate > 0.25
      );
      if (!step) return [];

      return [{
        type: 'modify_content' as const,
        targetStepId: step.id,
        rationale: 'Reorder content within step to improve engagement flow',
      }];
    },
    riskLevel: 'low',
    isReversible: true,
  },
];

// ============================================================================
// FUNNEL PROPOSAL ENGINE CLASS
// ============================================================================

export class FunnelProposalEngine {
  private simulator: FunnelSimulator;
  private proposals: Map<string, FunnelProposal>;
  private analyses: Map<string, FunnelAnalysis>;

  constructor(simulator?: FunnelSimulator) {
    this.simulator = simulator || getFunnelSimulator();
    this.proposals = new Map();
    this.analyses = new Map();
  }

  /**
   * Analyze a funnel for opportunities
   */
  analyzeFunnel(funnel: Funnel): FunnelAnalysis {
    const friction = this.detectFriction(funnel);
    const leakage = this.detectLeakage(funnel);
    const opportunities = this.identifyOpportunities(funnel, friction, leakage);

    // Calculate health score
    const avgDropOff = funnel.steps.reduce((sum, s) => sum + s.dropOffRate, 0) / funnel.steps.length;
    const healthScore = Math.round((1 - avgDropOff) * 100);

    // Calculate efficiency (conversion / steps)
    const efficiency = funnel.overallConversionRate / funnel.steps.length;

    // Value per entry
    const valuePerEntry = funnel.totalValue / Math.max(funnel.totalEntries, 1);

    const analysis: FunnelAnalysis = {
      funnelId: funnel.id,
      analyzedAt: new Date(),
      healthScore,
      efficiency,
      valuePerEntry,
      bottlenecks: funnel.bottlenecks,
      friction,
      leakage,
      opportunities,
      quickWins: opportunities.filter((o) => o.effort === 'low' && o.expectedLift > 0.1),
    };

    this.analyses.set(funnel.id, analysis);
    return analysis;
  }

  /**
   * Detect friction points
   */
  private detectFriction(funnel: Funnel): FrictionPoint[] {
    const friction: FrictionPoint[] = [];

    for (const step of funnel.steps) {
      // Cognitive friction: too many options
      if (step.contentIds.length > 3) {
        friction.push({
          stepId: step.id,
          type: 'cognitive',
          severity: Math.min(1, (step.contentIds.length - 3) * 0.2),
          description: 'Too many content options may cause decision paralysis',
        });
      }

      // Technical friction: long time in step
      if (step.avgTimeInStep > 120) {
        friction.push({
          stepId: step.id,
          type: 'technical',
          severity: Math.min(1, (step.avgTimeInStep - 120) / 180),
          description: 'Long time in step may indicate technical issues',
        });
      }

      // Trust friction: high drop-off in action stage
      if (step.stage === 'action' && step.dropOffRate > 0.3) {
        friction.push({
          stepId: step.id,
          type: 'trust',
          severity: step.dropOffRate,
          description: 'High drop-off at action stage may indicate trust issues',
        });
      }

      // Motivation friction: low conversion in decision stage
      if (step.stage === 'decision' && step.conversionRate < 0.5) {
        friction.push({
          stepId: step.id,
          type: 'motivation',
          severity: 1 - step.conversionRate,
          description: 'Low motivation to proceed at decision stage',
        });
      }
    }

    return friction.sort((a, b) => b.severity - a.severity);
  }

  /**
   * Detect leakage points
   */
  private detectLeakage(funnel: Funnel): LeakagePoint[] {
    return funnel.steps
      .filter((s) => s.dropOffRate > 0.15)
      .map((s) => ({
        stepId: s.id,
        leakRate: s.dropOffRate,
        destination: s.dropOffRate > 0.3 ? 'exit' : 'alternative_path',
        isRecoverable: s.dropOffRate < 0.4 && s.stage !== 'action',
      }))
      .sort((a, b) => b.leakRate - a.leakRate);
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(
    funnel: Funnel,
    friction: FrictionPoint[],
    leakage: LeakagePoint[]
  ): FunnelOpportunity[] {
    const opportunities: FunnelOpportunity[] = [];
    let priorityCounter = 1;

    // Friction reduction opportunities
    for (const f of friction.slice(0, 3)) {
      opportunities.push({
        id: `opp-friction-${f.stepId}`,
        type: 'optimization',
        description: `Reduce ${f.type} friction at step`,
        expectedLift: f.severity * 0.15,
        effort: f.type === 'cognitive' ? 'low' : 'medium',
        priority: priorityCounter++,
      });
    }

    // Leakage recovery opportunities
    for (const l of leakage.filter((l) => l.isRecoverable).slice(0, 2)) {
      opportunities.push({
        id: `opp-leakage-${l.stepId}`,
        type: 'expansion',
        description: 'Add recovery mechanism for dropping users',
        expectedLift: l.leakRate * 0.3,
        effort: 'medium',
        priority: priorityCounter++,
      });
    }

    // Simplification opportunities
    if (funnel.steps.length > 5) {
      opportunities.push({
        id: 'opp-simplify',
        type: 'simplification',
        description: 'Reduce funnel length by merging steps',
        expectedLift: (funnel.steps.length - 4) * 0.05,
        effort: 'high',
        priority: priorityCounter++,
      });
    }

    return opportunities.sort((a, b) => {
      // Sort by expected lift / effort
      const effortMap = { low: 1, medium: 2, high: 3 };
      const scoreA = a.expectedLift / effortMap[a.effort];
      const scoreB = b.expectedLift / effortMap[b.effort];
      return scoreB - scoreA;
    });
  }

  /**
   * Generate proposals for a funnel
   */
  generateProposals(funnel: Funnel): FunnelProposal[] {
    const analysis = this.analyzeFunnel(funnel);
    const newProposals: FunnelProposal[] = [];

    for (const rule of PROPOSAL_RULES) {
      if (rule.condition(funnel, analysis)) {
        const changes = rule.generateChanges(funnel, analysis);
        if (changes.length === 0) continue;

        // Run simulation
        const simulation = this.simulator.quickSimulate(funnel, changes);

        // Calculate expected lift
        const expectedLift =
          simulation.expectedLift.conversionRate * 50 +
          simulation.expectedLift.value * 30 +
          simulation.confidence * 20;

        const proposal: FunnelProposal = {
          id: `proposal-${Date.now().toString(36)}-${rule.type}`,
          funnelId: funnel.id,
          type: rule.type,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          changes,
          simulation,
          expectedLift: Math.round(expectedLift * 100) / 100,
          riskLevel: rule.riskLevel,
          isReversible: rule.isReversible,
        };

        this.proposals.set(proposal.id, proposal);
        newProposals.push(proposal);
      }
    }

    return newProposals.sort((a, b) => b.expectedLift - a.expectedLift);
  }

  // ==========================================================================
  // PROPOSAL LIFECYCLE
  // ==========================================================================

  /**
   * Approve a proposal
   */
  approveProposal(id: string, approvedBy: string): FunnelProposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal || proposal.status !== 'pending') return undefined;

    proposal.status = 'approved';
    proposal.approvedBy = approvedBy;
    proposal.approvedAt = new Date();
    proposal.updatedAt = new Date();

    return proposal;
  }

  /**
   * Reject a proposal
   */
  rejectProposal(id: string, rejectedBy: string, reason: string): FunnelProposal | undefined {
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
  markImplemented(id: string): FunnelProposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal || proposal.status !== 'approved') return undefined;

    proposal.status = 'implemented';
    proposal.updatedAt = new Date();

    return proposal;
  }

  /**
   * Roll back proposal
   */
  rollback(id: string): FunnelProposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal || proposal.status !== 'implemented' || !proposal.isReversible) {
      return undefined;
    }

    proposal.status = 'rolled_back';
    proposal.updatedAt = new Date();

    return proposal;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get proposal by ID
   */
  getProposal(id: string): FunnelProposal | undefined {
    return this.proposals.get(id);
  }

  /**
   * Get all proposals
   */
  getAllProposals(): FunnelProposal[] {
    return Array.from(this.proposals.values());
  }

  /**
   * Get proposals by status
   */
  getProposalsByStatus(status: FunnelProposal['status']): FunnelProposal[] {
    return this.getAllProposals().filter((p) => p.status === status);
  }

  /**
   * Get proposals for funnel
   */
  getProposalsForFunnel(funnelId: string): FunnelProposal[] {
    return this.getAllProposals().filter((p) => p.funnelId === funnelId);
  }

  /**
   * Get analysis for funnel
   */
  getAnalysis(funnelId: string): FunnelAnalysis | undefined {
    return this.analyses.get(funnelId);
  }

  /**
   * Get summary
   */
  getSummary(): {
    total: number;
    pending: number;
    approved: number;
    implemented: number;
    rejected: number;
    avgExpectedLift: number;
  } {
    const proposals = this.getAllProposals();
    const avgLift = proposals.length > 0
      ? proposals.reduce((sum, p) => sum + p.expectedLift, 0) / proposals.length
      : 0;

    return {
      total: proposals.length,
      pending: proposals.filter((p) => p.status === 'pending').length,
      approved: proposals.filter((p) => p.status === 'approved').length,
      implemented: proposals.filter((p) => p.status === 'implemented').length,
      rejected: proposals.filter((p) => p.status === 'rejected').length,
      avgExpectedLift: Math.round(avgLift * 100) / 100,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.proposals.clear();
    this.analyses.clear();
  }
}

// Singleton instance
let engineInstance: FunnelProposalEngine | null = null;

export function getFunnelProposalEngine(): FunnelProposalEngine {
  if (!engineInstance) {
    engineInstance = new FunnelProposalEngine();
  }
  return engineInstance;
}

export function resetFunnelProposalEngine(): void {
  if (engineInstance) {
    engineInstance.clear();
  }
  engineInstance = null;
}
