/**
 * Rollback Manager
 *
 * Handles rollback of executed changes.
 */

import type {
  ExecutionPlan,
  ExecutionItem,
  RollbackPlan,
  RollbackStep,
  ExecutionAuditEntry,
} from './types';
import { getExecutionPlanner, ExecutionPlanner } from './planner';

// ============================================================================
// ROLLBACK MANAGER CLASS
// ============================================================================

export class RollbackManager {
  private planner: ExecutionPlanner;
  private rollbackPlans: Map<string, RollbackPlan>;

  constructor(planner?: ExecutionPlanner) {
    this.planner = planner || getExecutionPlanner();
    this.rollbackPlans = new Map();
  }

  /**
   * Create rollback plan for an executed item
   */
  createRollbackPlan(item: ExecutionItem): RollbackPlan {
    const steps: RollbackStep[] = [];

    // Reverse order of changes
    const reversedChanges = [...item.changes].reverse();

    for (let i = 0; i < reversedChanges.length; i++) {
      const change = reversedChanges[i];

      if (!change.isReversible) {
        continue;
      }

      steps.push({
        order: i + 1,
        action: `revert_${change.type}`,
        target: change.target,
        data: {
          field: change.field,
          restoreValue: change.currentValue,
          currentValue: change.newValue,
        },
        isAtomic: true,
      });
    }

    const risks: string[] = [];

    // Assess rollback risks
    if (item.changes.some((c) => !c.isReversible)) {
      risks.push('Some changes cannot be rolled back automatically');
    }

    if (steps.length > 5) {
      risks.push('Large number of steps increases rollback complexity');
    }

    const plan: RollbackPlan = {
      itemId: item.id,
      steps,
      estimatedDuration: steps.length * 500, // 500ms per step estimate
      risks,
    };

    this.rollbackPlans.set(item.id, plan);
    return plan;
  }

  /**
   * Execute rollback for an item
   */
  async executeRollback(
    itemId: string,
    auditCallback?: (entry: Partial<ExecutionAuditEntry>) => void
  ): Promise<{ success: boolean; error?: string }> {
    const plan = this.rollbackPlans.get(itemId);

    if (!plan) {
      return { success: false, error: 'Rollback plan not found' };
    }

    if (plan.steps.length === 0) {
      return { success: false, error: 'No reversible changes to rollback' };
    }

    try {
      for (const step of plan.steps) {
        await this.executeRollbackStep(step);

        if (auditCallback) {
          auditCallback({
            action: 'item_rolled_back',
            details: {
              step: step.order,
              action: step.action,
              target: step.target,
            },
            result: 'success',
          });
        }
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (auditCallback) {
        auditCallback({
          action: 'item_rolled_back',
          details: { error: errorMessage },
          result: 'failure',
        });
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute a single rollback step
   */
  private async executeRollbackStep(step: RollbackStep): Promise<void> {
    // Simulate rollback execution
    await new Promise((resolve) => setTimeout(resolve, 50));

    // In a real implementation, this would:
    // 1. Connect to the appropriate system
    // 2. Restore the original value
    // 3. Verify the rollback was successful
  }

  /**
   * Rollback an entire plan
   */
  async rollbackPlan(planId: string): Promise<{
    success: boolean;
    rolledBack: number;
    failed: number;
    errors: string[];
  }> {
    const plan = this.planner.getPlan(planId);

    if (!plan) {
      return { success: false, rolledBack: 0, failed: 0, errors: ['Plan not found'] };
    }

    const completedItems = plan.proposals.filter((p) => p.status === 'completed');
    let rolledBack = 0;
    let failed = 0;
    const errors: string[] = [];

    // Rollback in reverse order
    const reversedItems = [...completedItems].reverse();

    for (const item of reversedItems) {
      // Create rollback plan if not exists
      if (!this.rollbackPlans.has(item.id)) {
        this.createRollbackPlan(item);
      }

      const result = await this.executeRollback(item.id);

      if (result.success) {
        item.status = 'rolled_back';
        rolledBack++;
      } else {
        failed++;
        errors.push(`Failed to rollback ${item.id}: ${result.error}`);
      }
    }

    // Update plan status
    if (failed === 0 && rolledBack > 0) {
      this.planner.updatePlanStatus(planId, 'rolled_back');
    }

    return {
      success: failed === 0,
      rolledBack,
      failed,
      errors,
    };
  }

  /**
   * Get rollback plan for an item
   */
  getRollbackPlan(itemId: string): RollbackPlan | undefined {
    return this.rollbackPlans.get(itemId);
  }

  /**
   * Check if item can be rolled back
   */
  canRollback(itemId: string): { canRollback: boolean; reason?: string } {
    const plan = this.rollbackPlans.get(itemId);

    if (!plan) {
      return { canRollback: false, reason: 'No rollback plan available' };
    }

    if (plan.steps.length === 0) {
      return { canRollback: false, reason: 'No reversible changes' };
    }

    return { canRollback: true };
  }

  /**
   * Clear rollback plans
   */
  clear(): void {
    this.rollbackPlans.clear();
  }
}

// Singleton instance
let rollbackInstance: RollbackManager | null = null;

export function getRollbackManager(): RollbackManager {
  if (!rollbackInstance) {
    rollbackInstance = new RollbackManager();
  }
  return rollbackInstance;
}

export function resetRollbackManager(): void {
  if (rollbackInstance) {
    rollbackInstance.clear();
  }
  rollbackInstance = null;
}
