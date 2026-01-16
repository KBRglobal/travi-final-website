/**
 * Safety Guards
 *
 * Pre-execution, during-execution, and post-execution safety checks.
 */

import type {
  SafetyCheck,
  SafetyContext,
  SafetyResult,
  ExecutionPlan,
  ExecutionItem,
} from './types';

// ============================================================================
// BUILT-IN SAFETY CHECKS
// ============================================================================

const PRE_EXECUTION_CHECKS: SafetyCheck[] = [
  {
    id: 'check_risk_threshold',
    name: 'Risk Threshold Check',
    type: 'pre_execution',
    check: (ctx) => {
      const riskLevel = ctx.item.forecast?.riskLevel || 'low';
      const maxRisk = ctx.plan.config.maxRiskScore;

      const riskScores: Record<string, number> = {
        minimal: 0.1,
        low: 0.3,
        medium: 0.5,
        high: 0.7,
        critical: 0.9,
      };

      const score = riskScores[riskLevel] || 0.5;

      if (score > maxRisk) {
        return {
          passed: false,
          message: `Risk level (${riskLevel}) exceeds threshold`,
          severity: 'error',
          shouldHalt: true,
          shouldRollback: false,
        };
      }

      return {
        passed: true,
        message: `Risk level (${riskLevel}) is acceptable`,
        severity: 'info',
        shouldHalt: false,
        shouldRollback: false,
      };
    },
  },
  {
    id: 'check_reversibility',
    name: 'Reversibility Check',
    type: 'pre_execution',
    check: (ctx) => {
      const nonReversible = ctx.item.changes.filter((c) => !c.isReversible);

      if (nonReversible.length > 0) {
        return {
          passed: true, // Warning only
          message: `${nonReversible.length} non-reversible changes detected`,
          severity: 'warning',
          shouldHalt: false,
          shouldRollback: false,
        };
      }

      return {
        passed: true,
        message: 'All changes are reversible',
        severity: 'info',
        shouldHalt: false,
        shouldRollback: false,
      };
    },
  },
  {
    id: 'check_affected_scope',
    name: 'Affected Scope Check',
    type: 'pre_execution',
    check: (ctx) => {
      const affectedTargets = new Set(ctx.item.changes.map((c) => c.target));

      if (affectedTargets.size > ctx.plan.config.maxAffectedContent) {
        return {
          passed: false,
          message: `Too many affected targets (${affectedTargets.size} > ${ctx.plan.config.maxAffectedContent})`,
          severity: 'error',
          shouldHalt: true,
          shouldRollback: false,
        };
      }

      return {
        passed: true,
        message: `Scope is within limits (${affectedTargets.size} targets)`,
        severity: 'info',
        shouldHalt: false,
        shouldRollback: false,
      };
    },
  },
];

const DURING_EXECUTION_CHECKS: SafetyCheck[] = [
  {
    id: 'check_error_rate',
    name: 'Error Rate Check',
    type: 'during_execution',
    check: (ctx) => {
      const completedItems = ctx.plan.proposals.filter((p) => p.status === 'completed');
      const failedItems = ctx.plan.proposals.filter((p) => p.status === 'failed');

      if (completedItems.length + failedItems.length === 0) {
        return {
          passed: true,
          message: 'No items processed yet',
          severity: 'info',
          shouldHalt: false,
          shouldRollback: false,
        };
      }

      const errorRate = failedItems.length / (completedItems.length + failedItems.length);

      if (errorRate >= ctx.plan.config.rollbackOnErrorRate) {
        return {
          passed: false,
          message: `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold`,
          severity: 'critical',
          shouldHalt: true,
          shouldRollback: true,
        };
      }

      return {
        passed: true,
        message: `Error rate (${(errorRate * 100).toFixed(1)}%) is acceptable`,
        severity: 'info',
        shouldHalt: false,
        shouldRollback: false,
      };
    },
  },
  {
    id: 'check_timeout',
    name: 'Timeout Check',
    type: 'during_execution',
    check: (ctx) => {
      if (!ctx.plan.startedAt) {
        return {
          passed: true,
          message: 'Execution not started',
          severity: 'info',
          shouldHalt: false,
          shouldRollback: false,
        };
      }

      const elapsed = Date.now() - ctx.plan.startedAt.getTime();
      const maxDuration = ctx.plan.config.timeoutMs * ctx.plan.proposals.length;

      if (elapsed > maxDuration) {
        return {
          passed: false,
          message: `Execution timeout (${Math.round(elapsed / 1000)}s > ${Math.round(maxDuration / 1000)}s)`,
          severity: 'error',
          shouldHalt: true,
          shouldRollback: false,
        };
      }

      return {
        passed: true,
        message: `Within time limits (${Math.round(elapsed / 1000)}s)`,
        severity: 'info',
        shouldHalt: false,
        shouldRollback: false,
      };
    },
  },
];

const POST_EXECUTION_CHECKS: SafetyCheck[] = [
  {
    id: 'check_metric_drop',
    name: 'Metric Drop Check',
    type: 'post_execution',
    check: (ctx) => {
      if (!ctx.baselineMetrics || !ctx.currentMetrics) {
        return {
          passed: true,
          message: 'No metrics to compare',
          severity: 'info',
          shouldHalt: false,
          shouldRollback: false,
        };
      }

      const threshold = ctx.plan.config.rollbackOnMetricDrop;
      const drops: string[] = [];

      for (const [key, baseline] of Object.entries(ctx.baselineMetrics)) {
        const current = ctx.currentMetrics[key];
        if (current !== undefined && baseline > 0) {
          const dropPercent = (baseline - current) / baseline;
          if (dropPercent > threshold) {
            drops.push(`${key}: -${(dropPercent * 100).toFixed(1)}%`);
          }
        }
      }

      if (drops.length > 0) {
        return {
          passed: false,
          message: `Significant metric drops detected: ${drops.join(', ')}`,
          severity: 'critical',
          shouldHalt: false,
          shouldRollback: true,
        };
      }

      return {
        passed: true,
        message: 'Metrics within acceptable ranges',
        severity: 'info',
        shouldHalt: false,
        shouldRollback: false,
      };
    },
  },
];

// ============================================================================
// SAFETY GUARDS CLASS
// ============================================================================

export class SafetyGuards {
  private checks: SafetyCheck[];

  constructor() {
    this.checks = [
      ...PRE_EXECUTION_CHECKS,
      ...DURING_EXECUTION_CHECKS,
      ...POST_EXECUTION_CHECKS,
    ];
  }

  /**
   * Run pre-execution checks
   */
  runPreExecutionChecks(plan: ExecutionPlan, item: ExecutionItem): SafetyResult[] {
    const ctx: SafetyContext = {
      item,
      plan,
      currentMetrics: {},
      baselineMetrics: {},
    };

    return this.checks
      .filter((c) => c.type === 'pre_execution')
      .map((c) => ({
        ...c.check(ctx),
        checkId: c.id,
        checkName: c.name,
      }));
  }

  /**
   * Run during-execution checks
   */
  runDuringExecutionChecks(plan: ExecutionPlan, item: ExecutionItem): SafetyResult[] {
    const ctx: SafetyContext = {
      item,
      plan,
      currentMetrics: {},
      baselineMetrics: {},
    };

    return this.checks
      .filter((c) => c.type === 'during_execution')
      .map((c) => ({
        ...c.check(ctx),
        checkId: c.id,
        checkName: c.name,
      }));
  }

  /**
   * Run post-execution checks
   */
  runPostExecutionChecks(
    plan: ExecutionPlan,
    item: ExecutionItem,
    baselineMetrics: Record<string, number>,
    currentMetrics: Record<string, number>
  ): SafetyResult[] {
    const ctx: SafetyContext = {
      item,
      plan,
      currentMetrics,
      baselineMetrics,
    };

    return this.checks
      .filter((c) => c.type === 'post_execution')
      .map((c) => ({
        ...c.check(ctx),
        checkId: c.id,
        checkName: c.name,
      }));
  }

  /**
   * Run all checks for a specific type
   */
  runChecks(
    type: SafetyCheck['type'],
    plan: ExecutionPlan,
    item: ExecutionItem,
    metrics?: { baseline: Record<string, number>; current: Record<string, number> }
  ): {
    passed: boolean;
    results: SafetyResult[];
    shouldHalt: boolean;
    shouldRollback: boolean;
  } {
    const ctx: SafetyContext = {
      item,
      plan,
      currentMetrics: metrics?.current || {},
      baselineMetrics: metrics?.baseline || {},
    };

    const results = this.checks
      .filter((c) => c.type === type)
      .map((c) => c.check(ctx));

    const passed = results.every((r) => r.passed);
    const shouldHalt = results.some((r) => r.shouldHalt);
    const shouldRollback = results.some((r) => r.shouldRollback);

    return { passed, results, shouldHalt, shouldRollback };
  }

  /**
   * Add custom safety check
   */
  addCheck(check: SafetyCheck): void {
    this.checks.push(check);
  }

  /**
   * Get all checks
   */
  getAllChecks(): SafetyCheck[] {
    return [...this.checks];
  }

  /**
   * Get checks by type
   */
  getChecksByType(type: SafetyCheck['type']): SafetyCheck[] {
    return this.checks.filter((c) => c.type === type);
  }
}

// Singleton instance
let guardsInstance: SafetyGuards | null = null;

export function getSafetyGuards(): SafetyGuards {
  if (!guardsInstance) {
    guardsInstance = new SafetyGuards();
  }
  return guardsInstance;
}

export function resetSafetyGuards(): void {
  guardsInstance = null;
}
