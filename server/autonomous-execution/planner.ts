/**
 * Execution Planner
 *
 * Consumes approved proposals and creates execution plans
 * with proper ordering and dependency management.
 */

import type {
  ExecutionPlan,
  ExecutionItem,
  ExecutionDependency,
  ExecutionConfig,
  ExecutionChange,
  ExecutionMode,
  ProposalType,
  ApprovedProposal,
} from './types';

// Re-export for backwards compatibility
export type { ApprovedProposal } from './types';

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ExecutionConfig = {
  maxConcurrent: 3,
  timeoutMs: 30000,
  retryCount: 2,
  retryDelayMs: 5000,
  itemsPerHour: 10,
  itemsPerDay: 50,
  maxRiskScore: 0.7,
  maxAffectedContent: 100,
  rollbackOnErrorRate: 0.3,
  rollbackOnMetricDrop: 0.2,
  requireApprovalAboveRisk: 'high',
  notifyOnStart: true,
  notifyOnComplete: true,
};

// ============================================================================
// EXECUTION PLANNER CLASS
// ============================================================================

export class ExecutionPlanner {
  private plans: Map<string, ExecutionPlan>;

  constructor() {
    this.plans = new Map();
  }

  /**
   * Create an execution plan from approved proposals
   */
  createPlan(
    name: string,
    proposals: ApprovedProposal[],
    mode: ExecutionMode = 'staged',
    config?: Partial<ExecutionConfig>
  ): ExecutionPlan {
    const planConfig = { ...DEFAULT_CONFIG, ...config };

    // Convert proposals to execution items
    const items = proposals.map((p) => this.proposalToItem(p));

    // Build dependency graph
    const dependencies = this.buildDependencies(proposals);

    // Determine execution order (topological sort)
    const order = this.computeExecutionOrder(items, dependencies);

    const plan: ExecutionPlan = {
      id: `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      proposals: items,
      dependencies,
      order,
      mode,
      status: 'pending',
      config: planConfig,
    };

    this.plans.set(plan.id, plan);
    return plan;
  }

  /**
   * Convert proposal to execution item
   */
  private proposalToItem(proposal: ApprovedProposal): ExecutionItem {
    const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return {
      id: `item-${proposal.id}`,
      proposalId: proposal.id,
      proposalType: proposal.type,
      priority: proposal.priority,
      sequence: 0, // Will be set during ordering
      status: 'pending',
      changes: proposal.changes.map((c) => ({
        type: c.type,
        target: c.target,
        field: c.field,
        currentValue: c.currentValue,
        newValue: c.newValue,
        isReversible: c.isReversible,
      })),
      dependencies: proposal.dependsOn || [],
      forecast: proposal.forecast,
    };
  }

  /**
   * Build dependency graph
   */
  private buildDependencies(proposals: ApprovedProposal[]): ExecutionDependency[] {
    const dependencies: ExecutionDependency[] = [];

    for (const proposal of proposals) {
      if (proposal.dependsOn && proposal.dependsOn.length > 0) {
        dependencies.push({
          itemId: `item-${proposal.id}`,
          dependsOn: proposal.dependsOn.map((d) => `item-${d}`),
          condition: 'all_success',
        });
      }
    }

    // Add implicit dependencies based on target overlap
    const targetMap = new Map<string, string[]>();
    for (const proposal of proposals) {
      for (const change of proposal.changes) {
        const targets = targetMap.get(change.target) || [];
        targets.push(`item-${proposal.id}`);
        targetMap.set(change.target, targets);
      }
    }

    // Items targeting same content should run sequentially
    for (const [, itemIds] of targetMap) {
      if (itemIds.length > 1) {
        for (let i = 1; i < itemIds.length; i++) {
          const existing = dependencies.find((d) => d.itemId === itemIds[i]);
          if (existing) {
            if (!existing.dependsOn.includes(itemIds[i - 1])) {
              existing.dependsOn.push(itemIds[i - 1]);
            }
          } else {
            dependencies.push({
              itemId: itemIds[i],
              dependsOn: [itemIds[i - 1]],
              condition: 'all_success',
            });
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Compute execution order using topological sort
   */
  private computeExecutionOrder(
    items: ExecutionItem[],
    dependencies: ExecutionDependency[]
  ): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    for (const item of items) {
      graph.set(item.id, []);
      inDegree.set(item.id, 0);
    }

    // Build adjacency list
    for (const dep of dependencies) {
      for (const prereq of dep.dependsOn) {
        const neighbors = graph.get(prereq) || [];
        neighbors.push(dep.itemId);
        graph.set(prereq, neighbors);

        inDegree.set(dep.itemId, (inDegree.get(dep.itemId) || 0) + 1);
      }
    }

    // Kahn's algorithm with priority ordering
    const queue: { id: string; priority: number }[] = [];

    for (const item of items) {
      if ((inDegree.get(item.id) || 0) === 0) {
        queue.push({ id: item.id, priority: item.priority });
      }
    }

    // Sort by priority (higher first)
    queue.sort((a, b) => b.priority - a.priority);

    const order: string[] = [];

    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current.id);

      const neighbors = graph.get(current.id) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 1) - 1;
        inDegree.set(neighbor, newDegree);

        if (newDegree === 0) {
          const item = items.find((i) => i.id === neighbor);
          queue.push({ id: neighbor, priority: item?.priority || 0 });
          queue.sort((a, b) => b.priority - a.priority);
        }
      }
    }

    // Add any items not in the order (cycle detection)
    for (const item of items) {
      if (!order.includes(item.id)) {
        console.warn(`[ExecutionPlanner] Circular dependency detected for ${item.id}`);
        order.push(item.id);
      }
    }

    return order;
  }

  /**
   * Validate a plan before execution
   */
  validatePlan(planId: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const plan = this.plans.get(planId);
    if (!plan) {
      return { isValid: false, errors: ['Plan not found'], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for empty plan
    if (plan.proposals.length === 0) {
      errors.push('Plan has no proposals');
    }

    // Check for circular dependencies
    const hasCycle = this.detectCycle(plan);
    if (hasCycle) {
      errors.push('Circular dependency detected in plan');
    }

    // Check risk thresholds
    for (const item of plan.proposals) {
      if (item.forecast) {
        if (item.forecast.riskLevel === 'critical') {
          errors.push(`Item ${item.id} has critical risk level`);
        } else if (item.forecast.riskLevel === 'high') {
          warnings.push(`Item ${item.id} has high risk level`);
        }
      }
    }

    // Check budget constraints
    if (plan.proposals.length > plan.config.itemsPerDay) {
      warnings.push(`Plan exceeds daily item limit (${plan.proposals.length} > ${plan.config.itemsPerDay})`);
    }

    // Check for non-reversible changes
    const nonReversibleCount = plan.proposals.reduce(
      (count, p) => count + p.changes.filter((c) => !c.isReversible).length,
      0
    );
    if (nonReversibleCount > 0) {
      warnings.push(`Plan contains ${nonReversibleCount} non-reversible changes`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detect cycles in the dependency graph
   */
  private detectCycle(plan: ExecutionPlan): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (itemId: string): boolean => {
      if (recStack.has(itemId)) return true;
      if (visited.has(itemId)) return false;

      visited.add(itemId);
      recStack.add(itemId);

      const dep = plan.dependencies.find((d) => d.itemId === itemId);
      if (dep) {
        for (const depId of dep.dependsOn) {
          if (dfs(depId)) return true;
        }
      }

      recStack.delete(itemId);
      return false;
    };

    for (const item of plan.proposals) {
      if (dfs(item.id)) return true;
    }

    return false;
  }

  /**
   * Get execution plan by ID
   */
  getPlan(id: string): ExecutionPlan | undefined {
    return this.plans.get(id);
  }

  /**
   * Get all plans
   */
  getAllPlans(): ExecutionPlan[] {
    return Array.from(this.plans.values());
  }

  /**
   * Update plan status
   */
  updatePlanStatus(planId: string, status: ExecutionPlan['status']): ExecutionPlan | undefined {
    const plan = this.plans.get(planId);
    if (!plan) return undefined;

    plan.status = status;
    plan.updatedAt = new Date();

    if (status === 'in_progress' && !plan.startedAt) {
      plan.startedAt = new Date();
    }

    if (['completed', 'failed', 'cancelled'].includes(status) && !plan.completedAt) {
      plan.completedAt = new Date();
    }

    return plan;
  }

  /**
   * Cancel a plan
   */
  cancelPlan(planId: string): ExecutionPlan | undefined {
    return this.updatePlanStatus(planId, 'cancelled');
  }

  /**
   * Clear all plans
   */
  clear(): void {
    this.plans.clear();
  }
}

// Singleton instance
let plannerInstance: ExecutionPlanner | null = null;

export function getExecutionPlanner(): ExecutionPlanner {
  if (!plannerInstance) {
    plannerInstance = new ExecutionPlanner();
  }
  return plannerInstance;
}

export function resetExecutionPlanner(): void {
  if (plannerInstance) {
    plannerInstance.clear();
  }
  plannerInstance = null;
}
