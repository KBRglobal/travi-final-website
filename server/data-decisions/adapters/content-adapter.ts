/**
 * Content Adapter
 * Executes content-related decisions by triggering rewrite/block/publish gates
 */

import type { Decision, DecisionType } from "../types";
import { BaseAdapter } from "./base-adapter";
import type { AdapterConfig, ContentActionPayload } from "./types";

// =============================================================================
// CONTENT ADAPTER
// =============================================================================

export class ContentAdapter extends BaseAdapter {
  readonly id = "content-adapter";
  readonly name = "Content Adapter";
  readonly supportedActions: DecisionType[] = [
    "BLOCK_PUBLISH",
    "TRIGGER_CONTENT_REVIEW",
    "TRIGGER_CONTENT_REFRESH",
    "TRIGGER_AEO_AUDIT",
    "TRIGGER_ENGAGEMENT_OPTIMIZATION",
  ];

  private baseUrl: string;

  constructor(baseUrl: string = "/api/content", config: Partial<AdapterConfig> = {}) {
    super(config);
    this.baseUrl = baseUrl;
  }

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================

  protected async performHealthCheck(): Promise<boolean> {
    try {
      // In production, this would call the actual health endpoint
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

    // In production, make actual API calls
    return this.simulateExecution(decision, payload);
  }

  protected async executeDryRun(decision: Decision): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    const payload = this.buildPayload(decision);

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

  private buildPayload(decision: Decision): ContentActionPayload {
    const contentId = decision.impactedEntities.find(e => e.type === "content")?.id || "unknown";

    const base: ContentActionPayload = {
      contentId,
      action: decision.type,
      reason: this.formatReason(decision),
      metadata: {
        decisionId: decision.id,
        bindingId: decision.bindingId,
        confidence: decision.confidence,
        triggeredBy: decision.signal.metricId,
      },
    };

    switch (decision.type) {
      case "BLOCK_PUBLISH":
        return {
          ...base,
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h to resolve
          metadata: {
            ...base.metadata,
            blockType: "quality_gate",
            thresholdViolation: {
              metric: decision.signal.metricId,
              value: decision.signal.value,
              threshold: decision.signal.threshold,
            },
          },
        };

      case "TRIGGER_CONTENT_REVIEW":
        return {
          ...base,
          deadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
          metadata: {
            ...base.metadata,
            reviewType: "data_triggered",
            priority: decision.authority === "blocking" ? "high" : "normal",
          },
        };

      case "TRIGGER_CONTENT_REFRESH":
        return {
          ...base,
          metadata: {
            ...base.metadata,
            refreshReason: "freshness_score_low",
            currentScore: decision.signal.value,
          },
        };

      case "TRIGGER_AEO_AUDIT":
        return {
          ...base,
          metadata: {
            ...base.metadata,
            auditType: "full",
            focusAreas: ["citations", "entity_coverage", "question_answers"],
          },
        };

      case "TRIGGER_ENGAGEMENT_OPTIMIZATION":
        return {
          ...base,
          metadata: {
            ...base.metadata,
            targetMetrics: ["bounce_rate", "time_on_page", "scroll_depth"],
            currentPerformance: decision.signal.value,
          },
        };

      default:
        return base;
    }
  }

  private formatReason(decision: Decision): string {
    const { metricId, value, threshold, condition } = decision.signal;
    return `${metricId} ${condition} (current: ${value}, threshold: ${threshold})`;
  }

  private getEndpoint(actionType: DecisionType): string {
    const endpoints: Partial<Record<DecisionType, string>> = {
      BLOCK_PUBLISH: "/gates/block",
      TRIGGER_CONTENT_REVIEW: "/tasks/review",
      TRIGGER_CONTENT_REFRESH: "/tasks/refresh",
      TRIGGER_AEO_AUDIT: "/tasks/aeo-audit",
      TRIGGER_ENGAGEMENT_OPTIMIZATION: "/tasks/optimize-engagement",
    };

    return endpoints[actionType] || "/tasks/generic";
  }

  // =========================================================================
  // SIMULATION
  // =========================================================================

  private async simulateExecution(
    decision: Decision,
    payload: ContentActionPayload
  ): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    await this.delay(100);

    const success = Math.random() > 0.05;

    return {
      success,
      affectedResources: this.getAffectedResources(decision),
      changes: success
        ? {
            action: decision.type,
            executedAt: new Date().toISOString(),
            payload,
            result: this.getSimulatedResult(decision.type, payload),
          }
        : undefined,
    };
  }

  private getAffectedResources(decision: Decision): string[] {
    return decision.impactedEntities.map(e => `${e.type}:${e.id}`);
  }

  private getSimulatedResult(
    actionType: DecisionType,
    payload: ContentActionPayload
  ): Record<string, unknown> {
    switch (actionType) {
      case "BLOCK_PUBLISH":
        return {
          blocked: true,
          blockId: `block-${Date.now()}`,
          contentId: payload.contentId,
          expiresAt: payload.deadline,
        };
      case "TRIGGER_CONTENT_REVIEW":
        return {
          taskCreated: true,
          taskId: `task-${Date.now()}`,
          assignedTo: "content-queue",
        };
      case "TRIGGER_CONTENT_REFRESH":
        return {
          taskQueued: true,
          position: 1,
          estimatedStart: "1h",
        };
      case "TRIGGER_AEO_AUDIT":
        return {
          auditQueued: true,
          auditId: `audit-${Date.now()}`,
        };
      default:
        return { executed: true };
    }
  }
}

// Singleton instance
export const contentAdapter = new ContentAdapter();
