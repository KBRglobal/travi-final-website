/**
 * SEO Adapter
 * Executes SEO-related decisions by calling SEO Engine endpoints
 */

import type { Decision, DecisionType } from "../types";
import { BaseAdapter } from "./base-adapter";
import type { AdapterConfig, SEOActionPayload } from "./types";

// =============================================================================
// SEO ADAPTER
// =============================================================================

export class SEOAdapter extends BaseAdapter {
  readonly id = "seo-adapter";
  readonly name = "SEO Adapter";
  readonly supportedActions: DecisionType[] = [
    "BLOCK_PUBLISH",
    "TRIGGER_META_OPTIMIZATION",
    "TRIGGER_SEO_REWRITE",
    "TRIGGER_INTERLINKING_TASK",
    "TRIGGER_CTR_OPTIMIZATION",
    "INCREASE_CRAWL_PRIORITY",
    "REDUCE_TRAFFIC",
  ];

  private baseUrl: string;

  constructor(baseUrl: string = "/api/seo", config: Partial<AdapterConfig> = {}) {
    super(config);
    this.baseUrl = baseUrl;
  }

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // In production, this would call the actual health endpoint
      // const response = await fetch(`${this.baseUrl}/health`);
      // return response.ok;

      // For now, simulate health check
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

    // In production, this would make actual API calls
    // const response = await fetch(`${this.baseUrl}${endpoint}`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload),
    // });

    // Simulate execution
    return this.simulateExecution(decision, payload);
  }

  protected async executeDryRun(decision: Decision): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    const payload = this.buildPayload(decision);

    // Simulate what would happen
    return {
      success: true,
      affectedResources: this.getAffectedResources(decision),
      changes: {
        action: decision.type,
        wouldExecute: true,
        payload,
      },
    };
  }

  // =========================================================================
  // PAYLOAD BUILDING
  // =========================================================================

  private buildPayload(decision: Decision): SEOActionPayload {
    const contentId = decision.impactedEntities.find(e => e.type === "content")?.id;

    const base: SEOActionPayload = {
      contentId,
      action: decision.type,
      priority: this.mapPriority(decision.authority),
      metadata: {
        decisionId: decision.id,
        bindingId: decision.bindingId,
        confidence: decision.confidence,
        triggeredBy: decision.signal.metricId,
      },
    };

    // Action-specific payload additions
    switch (decision.type) {
      case "BLOCK_PUBLISH":
        return {
          ...base,
          metadata: {
            ...base.metadata,
            reason: `Metric ${decision.signal.metricId} = ${decision.signal.value} (threshold: ${decision.signal.threshold})`,
            blockType: "data-decision",
          },
        };

      case "TRIGGER_META_OPTIMIZATION":
        return {
          ...base,
          metadata: {
            ...base.metadata,
            targetMetric: "ctr",
            currentValue: decision.signal.value,
          },
        };

      case "TRIGGER_SEO_REWRITE":
        return {
          ...base,
          priority: "high",
          metadata: {
            ...base.metadata,
            rewriteReason: "position_drop",
            positionChange: decision.signal.value,
          },
        };

      case "INCREASE_CRAWL_PRIORITY":
        return {
          ...base,
          metadata: {
            ...base.metadata,
            crawlerActivity: decision.signal.value,
          },
        };

      case "REDUCE_TRAFFIC":
        return {
          ...base,
          metadata: {
            ...base.metadata,
            reductionReason: decision.signal.condition,
            applyNoindex: false, // Configurable
          },
        };

      default:
        return base;
    }
  }

  private getEndpoint(actionType: DecisionType): string {
    const endpoints: Partial<Record<DecisionType, string>> = {
      BLOCK_PUBLISH: "/actions/block-publish",
      TRIGGER_META_OPTIMIZATION: "/actions/optimize-meta",
      TRIGGER_SEO_REWRITE: "/actions/queue-rewrite",
      TRIGGER_INTERLINKING_TASK: "/actions/queue-interlinking",
      TRIGGER_CTR_OPTIMIZATION: "/actions/optimize-ctr",
      INCREASE_CRAWL_PRIORITY: "/actions/update-crawl-priority",
      REDUCE_TRAFFIC: "/actions/reduce-traffic",
    };

    return endpoints[actionType] || "/actions/generic";
  }

  private mapPriority(authority: Decision["authority"]): "low" | "medium" | "high" | "critical" {
    switch (authority) {
      case "blocking":
        return "critical";
      case "escalating":
        return "high";
      case "triggering":
        return "medium";
      default:
        return "low";
    }
  }

  // =========================================================================
  // SIMULATION (Replace with real implementation)
  // =========================================================================

  private async simulateExecution(
    decision: Decision,
    payload: SEOActionPayload
  ): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    // Simulate network delay
    await this.delay(100);

    // Simulate success for most actions
    const success = Math.random() > 0.05; // 95% success rate

    return {
      success,
      affectedResources: this.getAffectedResources(decision),
      changes: success
        ? {
            action: decision.type,
            executedAt: new Date().toISOString(),
            payload,
            result: this.getSimulatedResult(decision.type),
          }
        : undefined,
    };
  }

  private getAffectedResources(decision: Decision): string[] {
    const resources: string[] = [];

    for (const entity of decision.impactedEntities) {
      resources.push(`${entity.type}:${entity.id}`);
    }

    if (resources.length === 0) {
      resources.push(`metric:${decision.signal.metricId}`);
    }

    return resources;
  }

  private getSimulatedResult(actionType: DecisionType): Record<string, unknown> {
    switch (actionType) {
      case "BLOCK_PUBLISH":
        return { blocked: true, blockId: `block-${Date.now()}` };
      case "TRIGGER_META_OPTIMIZATION":
        return { taskQueued: true, estimatedCompletion: "5m" };
      case "TRIGGER_SEO_REWRITE":
        return { taskQueued: true, priority: "high" };
      case "INCREASE_CRAWL_PRIORITY":
        return { priorityUpdated: true, newPriority: 0.9 };
      default:
        return { executed: true };
    }
  }
}

// Singleton instance
export const seoAdapter = new SEOAdapter();
