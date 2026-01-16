/**
 * Ops Adapter
 * Executes operations-related decisions (rollback, scaling, incidents)
 */

import type { Decision, DecisionType } from '../types';
import { BaseAdapter } from './base-adapter';
import type { AdapterConfig, OpsActionPayload } from './types';

// =============================================================================
// OPS ADAPTER
// =============================================================================

export class OpsAdapter extends BaseAdapter {
  readonly id = 'ops-adapter';
  readonly name = 'Ops Adapter';
  readonly supportedActions: DecisionType[] = [
    'BLOCK_ALL_DEPLOYMENTS',
    'FREEZE_AUTOMATION',
    'THROTTLE_AI',
    'ROLLBACK_CHANGES',
    'DISABLE_FEATURE',
    'DISABLE_SYSTEM',
    'AUTO_SCALE_WORKERS',
    'AUTO_OPTIMIZE_CACHE',
  ];

  private baseUrl: string;

  constructor(baseUrl: string = '/api/ops', config: Partial<AdapterConfig> = {}) {
    super({
      ...config,
      dryRunByDefault: true, // Ops actions are dangerous, always dry run by default
      timeout: 60000, // 60 seconds for ops actions
    });
    this.baseUrl = baseUrl;
  }

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================

  protected async performHealthCheck(): Promise<boolean> {
    try {
      return true;
    } catch {
      return false;
    }
  }

  // =========================================================================
  // EXECUTION
  // =========================================================================

  protected async executeAction(decision: Decision): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    const payload = this.buildPayload(decision);
    const endpoint = this.getEndpoint(decision.type);

    console.log(`[Ops Adapter] Executing ${decision.type}:`, payload);

    // CRITICAL: Ops actions have real consequences
    // In production, this would call actual infrastructure APIs
    return this.simulateExecution(decision, payload);
  }

  protected async executeDryRun(decision: Decision): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    const payload = this.buildPayload(decision);

    console.log(`[Ops Adapter] Dry run ${decision.type}:`, payload);

    return {
      success: true,
      affectedResources: this.getAffectedResources(decision),
      changes: {
        action: decision.type,
        wouldExecute: true,
        payload,
        impact: this.assessImpact(decision.type),
      },
    };
  }

  // =========================================================================
  // PAYLOAD BUILDING
  // =========================================================================

  private buildPayload(decision: Decision): OpsActionPayload {
    const base: OpsActionPayload = {
      action: decision.type,
      severity: this.mapSeverity(decision),
      metadata: {
        decisionId: decision.id,
        bindingId: decision.bindingId,
        confidence: decision.confidence,
        triggeredBy: decision.signal.metricId,
        triggerValue: decision.signal.value,
        triggerThreshold: decision.signal.threshold,
      },
    };

    switch (decision.type) {
      case 'BLOCK_ALL_DEPLOYMENTS':
        return {
          ...base,
          target: 'deployment-pipeline',
          metadata: {
            ...base.metadata,
            blockReason: 'error_rate_exceeded',
            affectedPipelines: ['production', 'staging'],
          },
        };

      case 'FREEZE_AUTOMATION':
        return {
          ...base,
          target: 'automation-engine',
          metadata: {
            ...base.metadata,
            freezeScope: 'all',
            resumeCondition: 'manual_approval',
          },
        };

      case 'THROTTLE_AI':
        return {
          ...base,
          target: 'ai-api',
          metadata: {
            ...base.metadata,
            throttlePercent: 50,
            reason: 'cost_exceeded',
          },
        };

      case 'ROLLBACK_CHANGES':
        return {
          ...base,
          rollbackTarget: this.getRollbackTarget(decision),
          metadata: {
            ...base.metadata,
            rollbackType: 'immediate',
          },
        };

      case 'DISABLE_FEATURE':
        return {
          ...base,
          target: this.getFeatureTarget(decision),
          metadata: {
            ...base.metadata,
            disableReason: 'error_threshold',
          },
        };

      case 'DISABLE_SYSTEM':
        return {
          ...base,
          severity: 'critical',
          target: 'system-wide',
          metadata: {
            ...base.metadata,
            emergencyStop: true,
          },
        };

      case 'AUTO_SCALE_WORKERS':
        return {
          ...base,
          target: 'worker-pool',
          metadata: {
            ...base.metadata,
            scaleDirection: decision.signal.value > decision.signal.threshold ? 'up' : 'down',
            targetWorkers: this.calculateTargetWorkers(decision),
          },
        };

      case 'AUTO_OPTIMIZE_CACHE':
        return {
          ...base,
          target: 'cache-layer',
          metadata: {
            ...base.metadata,
            optimizationType: 'adaptive',
            currentHitRate: decision.signal.value,
          },
        };

      default:
        return base;
    }
  }

  private mapSeverity(decision: Decision): 'info' | 'warning' | 'critical' {
    if (decision.authority === 'blocking') return 'critical';
    if (decision.authority === 'escalating') return 'warning';
    return 'info';
  }

  private getEndpoint(actionType: DecisionType): string {
    const endpoints: Partial<Record<DecisionType, string>> = {
      BLOCK_ALL_DEPLOYMENTS: '/deployments/block',
      FREEZE_AUTOMATION: '/automation/freeze',
      THROTTLE_AI: '/ai/throttle',
      ROLLBACK_CHANGES: '/deployments/rollback',
      DISABLE_FEATURE: '/features/disable',
      DISABLE_SYSTEM: '/emergency/stop',
      AUTO_SCALE_WORKERS: '/workers/scale',
      AUTO_OPTIMIZE_CACHE: '/cache/optimize',
    };

    return endpoints[actionType] || '/actions/generic';
  }

  private getRollbackTarget(decision: Decision): string {
    const target = decision.impactedEntities.find(e => e.type === 'deployment');
    return target?.id || 'latest';
  }

  private getFeatureTarget(decision: Decision): string {
    const target = decision.impactedEntities.find(e => e.type === 'feature');
    return target?.id || 'unknown';
  }

  private calculateTargetWorkers(decision: Decision): number {
    // Simple scaling logic
    const queueLength = decision.signal.value;
    const baseWorkers = 5;
    const workersPerHundred = 2;

    return Math.min(50, baseWorkers + Math.ceil(queueLength / 100) * workersPerHundred);
  }

  private assessImpact(actionType: DecisionType): {
    level: string;
    affectedSystems: string[];
    estimatedDuration: string;
  } {
    const impacts: Record<string, { level: string; affectedSystems: string[]; estimatedDuration: string }> = {
      BLOCK_ALL_DEPLOYMENTS: {
        level: 'high',
        affectedSystems: ['CI/CD', 'Release Pipeline'],
        estimatedDuration: 'Until manually cleared',
      },
      FREEZE_AUTOMATION: {
        level: 'high',
        affectedSystems: ['Content Pipeline', 'SEO Engine', 'Growth'],
        estimatedDuration: 'Until manually cleared',
      },
      THROTTLE_AI: {
        level: 'medium',
        affectedSystems: ['AI Content Generation', 'Recommendations'],
        estimatedDuration: '1 hour or until budget reset',
      },
      ROLLBACK_CHANGES: {
        level: 'critical',
        affectedSystems: ['Production', 'All Services'],
        estimatedDuration: '5-15 minutes',
      },
      DISABLE_FEATURE: {
        level: 'medium',
        affectedSystems: ['Specific Feature'],
        estimatedDuration: 'Until re-enabled',
      },
      DISABLE_SYSTEM: {
        level: 'critical',
        affectedSystems: ['ALL'],
        estimatedDuration: 'Until manual restart',
      },
      AUTO_SCALE_WORKERS: {
        level: 'low',
        affectedSystems: ['Worker Pool'],
        estimatedDuration: '2-5 minutes',
      },
      AUTO_OPTIMIZE_CACHE: {
        level: 'low',
        affectedSystems: ['Cache Layer'],
        estimatedDuration: '1-2 minutes',
      },
    };

    return impacts[actionType] || {
      level: 'unknown',
      affectedSystems: ['Unknown'],
      estimatedDuration: 'Unknown',
    };
  }

  // =========================================================================
  // SIMULATION
  // =========================================================================

  private async simulateExecution(
    decision: Decision,
    payload: OpsActionPayload
  ): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    await this.delay(200); // Ops actions take longer

    const success = Math.random() > 0.02; // 98% success rate for ops

    return {
      success,
      affectedResources: this.getAffectedResources(decision),
      changes: success
        ? {
            action: decision.type,
            executedAt: new Date().toISOString(),
            payload,
            result: this.getSimulatedResult(decision.type, payload),
            impact: this.assessImpact(decision.type),
          }
        : undefined,
    };
  }

  private getAffectedResources(decision: Decision): string[] {
    const resources = decision.impactedEntities.map(e => `${e.type}:${e.id}`);

    // Add implicit resources based on action type
    switch (decision.type) {
      case 'BLOCK_ALL_DEPLOYMENTS':
        resources.push('system:deployment-pipeline');
        break;
      case 'FREEZE_AUTOMATION':
        resources.push('system:automation-engine');
        break;
      case 'DISABLE_SYSTEM':
        resources.push('system:all');
        break;
    }

    return resources;
  }

  private getSimulatedResult(
    actionType: DecisionType,
    payload: OpsActionPayload
  ): Record<string, unknown> {
    switch (actionType) {
      case 'BLOCK_ALL_DEPLOYMENTS':
        return {
          blocked: true,
          blockId: `deploy-block-${Date.now()}`,
          affectedPipelines: 2,
        };
      case 'FREEZE_AUTOMATION':
        return {
          frozen: true,
          frozenAt: new Date().toISOString(),
          affectedAutomations: 5,
        };
      case 'ROLLBACK_CHANGES':
        return {
          rolledBack: true,
          previousVersion: 'v1.2.3',
          currentVersion: 'v1.2.2',
          duration: '3m 24s',
        };
      case 'AUTO_SCALE_WORKERS':
        return {
          scaled: true,
          previousWorkers: 5,
          currentWorkers: payload.metadata?.targetWorkers || 10,
        };
      default:
        return { executed: true };
    }
  }
}

// Singleton instance
export const opsAdapter = new OpsAdapter();
