/**
 * Executor
 *
 * Executes plans with rate limiting, sequencing, and monitoring.
 */

import type {
  ExecutionPlan,
  ExecutionItem,
  ExecutionProgress,
  ExecutionReport,
  ExecutionAuditEntry,
  AuditAction,
  RateLimitState,
  ExecutionBudget,
} from './types';
import { getExecutionPlanner, ExecutionPlanner } from './planner';

// ============================================================================
// EXECUTOR CLASS
// ============================================================================

export class Executor {
  private planner: ExecutionPlanner;
  private auditLog: ExecutionAuditEntry[];
  private rateLimitState: RateLimitState;
  private isRunning: boolean;
  private currentPlanId: string | null;

  constructor(planner?: ExecutionPlanner) {
    this.planner = planner || getExecutionPlanner();
    this.auditLog = [];
    this.isRunning = false;
    this.currentPlanId = null;
    this.rateLimitState = this.initRateLimitState();
  }

  /**
   * Initialize rate limit state
   */
  private initRateLimitState(): RateLimitState {
    const now = new Date();
    const hourReset = new Date(now);
    hourReset.setHours(hourReset.getHours() + 1, 0, 0, 0);

    const dayReset = new Date(now);
    dayReset.setDate(dayReset.getDate() + 1);
    dayReset.setHours(0, 0, 0, 0);

    return {
      itemsThisHour: 0,
      itemsThisDay: 0,
      lastItemTime: now,
      hourlyBudget: {
        id: 'hourly',
        period: 'hour',
        limit: 10,
        used: 0,
        resetAt: hourReset,
      },
      dailyBudget: {
        id: 'daily',
        period: 'day',
        limit: 50,
        used: 0,
        resetAt: dayReset,
      },
    };
  }

  /**
   * Check and update rate limits
   */
  private checkRateLimits(config: ExecutionPlan['config']): { allowed: boolean; reason?: string } {
    const now = new Date();

    // Reset hourly budget if needed
    if (now >= this.rateLimitState.hourlyBudget.resetAt) {
      this.rateLimitState.itemsThisHour = 0;
      this.rateLimitState.hourlyBudget.used = 0;
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      this.rateLimitState.hourlyBudget.resetAt = nextHour;
    }

    // Reset daily budget if needed
    if (now >= this.rateLimitState.dailyBudget.resetAt) {
      this.rateLimitState.itemsThisDay = 0;
      this.rateLimitState.dailyBudget.used = 0;
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      this.rateLimitState.dailyBudget.resetAt = tomorrow;
    }

    // Check limits
    if (this.rateLimitState.itemsThisHour >= config.itemsPerHour) {
      return { allowed: false, reason: 'Hourly rate limit reached' };
    }

    if (this.rateLimitState.itemsThisDay >= config.itemsPerDay) {
      return { allowed: false, reason: 'Daily rate limit reached' };
    }

    return { allowed: true };
  }

  /**
   * Record rate limit usage
   */
  private recordUsage(): void {
    this.rateLimitState.itemsThisHour++;
    this.rateLimitState.itemsThisDay++;
    this.rateLimitState.hourlyBudget.used++;
    this.rateLimitState.dailyBudget.used++;
    this.rateLimitState.lastItemTime = new Date();
  }

  /**
   * Add audit entry
   */
  private audit(
    planId: string,
    action: AuditAction,
    details: Record<string, unknown>,
    result: 'success' | 'failure' | 'warning',
    itemId?: string
  ): void {
    this.auditLog.push({
      id: `audit-${Date.now().toString(36)}`,
      timestamp: new Date(),
      planId,
      itemId,
      action,
      actor: 'system',
      details,
      result,
    });

    // Keep audit log bounded
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  /**
   * Execute a plan
   */
  async execute(planId: string): Promise<{ success: boolean; completed: number; failed: number; error?: string }> {
    const plan = this.planner.getPlan(planId);
    if (!plan) {
      return { success: false, completed: 0, failed: 0, error: 'Plan not found' };
    }

    // Validate plan first
    const validation = this.planner.validatePlan(planId);
    if (!validation.isValid) {
      return { success: false, completed: 0, failed: 0, error: `Validation failed: ${validation.errors.join(', ')}` };
    }

    if (this.isRunning) {
      return { success: false, completed: 0, failed: 0, error: 'Another execution is in progress' };
    }

    this.isRunning = true;
    this.currentPlanId = planId;

    // Start execution
    this.planner.updatePlanStatus(planId, 'in_progress');
    this.audit(planId, 'plan_started', { mode: plan.mode }, 'success');

    const startTime = Date.now();
    const baselineMetrics = await this.captureMetrics();
    const report: ExecutionReport = {
      planId,
      generatedAt: new Date(),
      duration: 0,
      summary: {
        totalItems: plan.proposals.length,
        successful: 0,
        failed: 0,
        rolledBack: 0,
        skipped: 0,
      },
      metrics: {
        before: baselineMetrics,
        after: {},
        delta: {},
      },
      issues: [],
      recommendations: [],
    };

    try {
      // Execute items in order
      for (const itemId of plan.order) {
        const item = plan.proposals.find((p) => p.id === itemId);
        if (!item) continue;

        // Check rate limits
        const rateCheck = this.checkRateLimits(plan.config);
        if (!rateCheck.allowed) {
          this.audit(planId, 'item_failed', { reason: rateCheck.reason }, 'warning', itemId);
          item.status = 'paused';
          report.summary.skipped++;
          continue;
        }

        // Check dependencies
        if (!this.checkDependencies(plan, itemId)) {
          item.status = 'pending';
          report.summary.skipped++;
          continue;
        }

        // Execute item
        const itemResult = await this.executeItem(plan, item);

        if (itemResult.success) {
          item.status = 'completed';
          report.summary.successful++;
          this.recordUsage();
        } else {
          item.status = 'failed';
          item.error = itemResult.error;
          report.summary.failed++;
          report.issues.push({
            itemId: item.id,
            error: itemResult.error || 'Unknown error',
            resolution: itemResult.resolution || 'Manual review required',
          });

          // Check if we should halt
          const errorRate = report.summary.failed / (report.summary.successful + report.summary.failed);
          if (errorRate >= plan.config.rollbackOnErrorRate) {
            this.audit(planId, 'plan_failed', { reason: 'Error rate exceeded' }, 'failure');
            break;
          }
        }
      }

      // Capture final metrics
      report.metrics.after = await this.captureMetrics();
      report.metrics.delta = this.calculateDelta(report.metrics.before, report.metrics.after);

      // Check for metric drops
      for (const [key, delta] of Object.entries(report.metrics.delta)) {
        if (delta < -plan.config.rollbackOnMetricDrop * 100) {
          report.recommendations.push(`Significant drop in ${key} detected`);
        }
      }

      // Determine final status
      const allCompleted = plan.proposals.every((p) => p.status === 'completed');
      const anyFailed = plan.proposals.some((p) => p.status === 'failed');

      if (allCompleted) {
        this.planner.updatePlanStatus(planId, 'completed');
        this.audit(planId, 'plan_completed', { successful: report.summary.successful }, 'success');
      } else if (anyFailed) {
        this.planner.updatePlanStatus(planId, 'failed');
        this.audit(planId, 'plan_failed', { failed: report.summary.failed }, 'failure');
      } else {
        this.planner.updatePlanStatus(planId, 'paused');
      }
    } catch (error) {
      this.planner.updatePlanStatus(planId, 'failed');
      plan.error = error instanceof Error ? error.message : 'Unknown error';
      this.audit(planId, 'plan_failed', { error: plan.error }, 'failure');
      return {
        success: false,
        completed: report.summary.successful,
        failed: report.summary.failed,
        error: plan.error,
      };
    } finally {
      this.isRunning = false;
      this.currentPlanId = null;
      report.duration = Date.now() - startTime;
      report.generatedAt = new Date();
    }

    return {
      success: report.summary.failed === 0,
      completed: report.summary.successful,
      failed: report.summary.failed,
    };
  }

  /**
   * Execute a single item
   */
  private async executeItem(
    plan: ExecutionPlan,
    item: ExecutionItem
  ): Promise<{ success: boolean; error?: string; resolution?: string }> {
    item.status = 'in_progress';
    item.startedAt = new Date();
    this.audit(plan.id, 'item_started', { proposalId: item.proposalId }, 'success', item.id);

    try {
      // In dry-run mode, simulate execution
      if (plan.mode === 'dry_run') {
        await this.simulateDelay(100);
        item.completedAt = new Date();
        this.audit(plan.id, 'item_completed', { mode: 'dry_run' }, 'success', item.id);
        return { success: true };
      }

      // Store rollback data
      item.rollbackData = await this.captureRollbackData(item);

      // Execute changes
      for (const change of item.changes) {
        await this.applyChange(change, plan.mode);
      }

      item.completedAt = new Date();
      this.audit(plan.id, 'item_completed', { changesApplied: item.changes.length }, 'success', item.id);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.audit(plan.id, 'item_failed', { error: errorMessage }, 'failure', item.id);

      return {
        success: false,
        error: errorMessage,
        resolution: 'Review and retry manually',
      };
    }
  }

  /**
   * Apply a single change
   */
  private async applyChange(change: ExecutionChange, mode: ExecutionPlan['mode']): Promise<void> {
    // Simulate change application
    await this.simulateDelay(50);

    // In progressive rollout, apply to subset
    if (mode === 'progressive_rollout') {
      // Would implement gradual rollout logic here
    }

    // For now, we just simulate success
    // Real implementation would interact with content systems
  }

  /**
   * Capture rollback data for an item
   */
  private async captureRollbackData(item: ExecutionItem): Promise<unknown> {
    // Store current values for potential rollback
    return {
      capturedAt: new Date(),
      changes: item.changes.map((c) => ({
        target: c.target,
        field: c.field,
        originalValue: c.currentValue,
      })),
    };
  }

  /**
   * Check if dependencies are satisfied
   */
  private checkDependencies(plan: ExecutionPlan, itemId: string): boolean {
    const dep = plan.dependencies.find((d) => d.itemId === itemId);
    if (!dep) return true;

    for (const prereqId of dep.dependsOn) {
      const prereq = plan.proposals.find((p) => p.id === prereqId);
      if (!prereq || prereq.status !== 'completed') {
        return false;
      }
    }

    return true;
  }

  /**
   * Capture current metrics
   */
  private async captureMetrics(): Promise<Record<string, number>> {
    // Simulated metrics capture
    return {
      traffic: 1000 + Math.random() * 100,
      conversion: 3 + Math.random() * 0.5,
      revenue: 10000 + Math.random() * 500,
    };
  }

  /**
   * Calculate delta between metric sets
   */
  private calculateDelta(
    before: Record<string, number>,
    after: Record<string, number>
  ): Record<string, number> {
    const delta: Record<string, number> = {};

    for (const key of Object.keys(before)) {
      if (after[key] !== undefined) {
        delta[key] = ((after[key] - before[key]) / before[key]) * 100;
      }
    }

    return delta;
  }

  /**
   * Simulate async delay
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get execution progress
   */
  getProgress(planId: string): { planId: string; total: number; completed: number; failed: number; pending: number; status: string } | undefined {
    const plan = this.planner.getPlan(planId);
    if (!plan) return undefined;

    const completed = plan.proposals.filter((p) => p.status === 'completed').length;
    const failed = plan.proposals.filter((p) => p.status === 'failed').length;
    const pending = plan.proposals.filter((p) =>
      ['pending', 'queued'].includes(p.status)
    ).length;

    return {
      planId,
      total: plan.proposals.length,
      completed,
      failed,
      pending,
      status: plan.status,
    };
  }

  /**
   * Get audit log
   */
  getAuditLog(planId?: string, limit: number = 100): ExecutionAuditEntry[] {
    let log = this.auditLog;

    if (planId) {
      log = log.filter((e) => e.planId === planId);
    }

    return log.slice(-limit);
  }

  /**
   * Get rate limit state
   */
  getRateLimitState(): RateLimitState {
    return { ...this.rateLimitState };
  }

  /**
   * Check if executor is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}

// Singleton instance
let executorInstance: Executor | null = null;

export function getExecutor(): Executor {
  if (!executorInstance) {
    executorInstance = new Executor();
  }
  return executorInstance;
}

export function resetExecutor(): void {
  if (executorInstance) {
    executorInstance.clearAuditLog();
  }
  executorInstance = null;
}
