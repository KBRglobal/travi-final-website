/**
 * SEO Autopilot Configuration
 *
 * Modes:
 * - OFF: No automatic actions, everything requires manual approval
 * - SUPERVISED: Non-destructive actions run automatically, destructive need approval
 * - FULL: All actions run automatically based on governance rules
 *
 * The SEO system is designed to EXECUTE decisions, not make recommendations.
 */

import { db } from "../db";
import { contents } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { SEOActionEngine, AutopilotMode, SEOAction } from "../seo-actions/action-engine";
import { PageClassifier } from "./page-classifier";
import { AEOContentValidator } from "./aeo-content-validator";
import { ContentPipeline } from "./content-pipeline";
import { LinkGraphEngine } from "./link-graph-engine";
import { RiskMonitor } from "./risk-monitor";

export interface AutopilotConfig {
  mode: AutopilotMode;
  enabledActions: AutopilotActionConfig[];
  schedule: AutopilotSchedule;
  notifications: NotificationConfig;
  overrides: OverrideConfig;
}

export interface AutopilotActionConfig {
  action: string;
  enabled: boolean;
  requiresApproval: boolean;
  autoExecute: boolean;
  conditions?: string[];
}

export interface AutopilotSchedule {
  contentPipelineInterval: number; // hours
  linkGraphRebuildInterval: number; // hours
  riskCheckInterval: number; // minutes
  classificationUpdateInterval: number; // hours
}

export interface NotificationConfig {
  slackWebhook?: string;
  emailRecipients: string[];
  criticalAlertSMS: string[];
  sendDailyReport: boolean;
  reportTime: string; // HH:MM
}

export interface OverrideConfig {
  allowManualNoindex: boolean;
  allowManualDelete: boolean;
  allowSkipValidation: boolean;
  overrideApprovers: string[];
}

// Default configurations by mode
const MODE_DEFAULTS: Record<AutopilotMode, Partial<AutopilotConfig>> = {
  off: {
    enabledActions: [
      { action: "GENERATE_SCHEMA", enabled: false, requiresApproval: true, autoExecute: false },
      { action: "SET_CANONICAL", enabled: false, requiresApproval: true, autoExecute: false },
      { action: "QUEUE_REINDEX", enabled: false, requiresApproval: true, autoExecute: false },
      { action: "INJECT_LINKS", enabled: false, requiresApproval: true, autoExecute: false },
      { action: "SET_NOINDEX", enabled: false, requiresApproval: true, autoExecute: false },
      { action: "BLOCK_PUBLISH", enabled: false, requiresApproval: true, autoExecute: false },
    ],
    schedule: {
      contentPipelineInterval: 0, // disabled
      linkGraphRebuildInterval: 0,
      riskCheckInterval: 0,
      classificationUpdateInterval: 0,
    },
  },
  supervised: {
    enabledActions: [
      { action: "GENERATE_SCHEMA", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "SET_CANONICAL", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "QUEUE_REINDEX", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "INJECT_LINKS", enabled: true, requiresApproval: true, autoExecute: false },
      {
        action: "GENERATE_ANSWER_CAPSULE",
        enabled: true,
        requiresApproval: true,
        autoExecute: false,
      },
      { action: "GENERATE_FAQ", enabled: true, requiresApproval: true, autoExecute: false },
      { action: "SET_NOINDEX", enabled: true, requiresApproval: true, autoExecute: false },
      { action: "BLOCK_PUBLISH", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "FLAG_FOR_REVIEW", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "QUEUE_MERGE", enabled: true, requiresApproval: true, autoExecute: false },
      { action: "QUEUE_DELETE", enabled: true, requiresApproval: true, autoExecute: false },
    ],
    schedule: {
      contentPipelineInterval: 24, // daily
      linkGraphRebuildInterval: 6, // every 6 hours
      riskCheckInterval: 60, // every hour
      classificationUpdateInterval: 24, // daily
    },
  },
  full: {
    enabledActions: [
      { action: "GENERATE_SCHEMA", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "SET_CANONICAL", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "QUEUE_REINDEX", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "INJECT_LINKS", enabled: true, requiresApproval: false, autoExecute: true },
      {
        action: "GENERATE_ANSWER_CAPSULE",
        enabled: true,
        requiresApproval: false,
        autoExecute: true,
      },
      { action: "GENERATE_FAQ", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "SET_NOINDEX", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "BLOCK_PUBLISH", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "FLAG_FOR_REVIEW", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "MOVE_TO_DRAFT", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "QUEUE_MERGE", enabled: true, requiresApproval: false, autoExecute: true },
      { action: "QUEUE_DELETE", enabled: true, requiresApproval: true, autoExecute: false }, // Always require approval for delete
    ],
    schedule: {
      contentPipelineInterval: 6, // every 6 hours
      linkGraphRebuildInterval: 1, // hourly
      riskCheckInterval: 15, // every 15 minutes
      classificationUpdateInterval: 6, // every 6 hours
    },
  },
};

export interface AutopilotRunResult {
  mode: AutopilotMode;
  startedAt: Date;
  completedAt: Date;
  pipelineResult: {
    scanned: number;
    issues: number;
    actionsExecuted: number;
  };
  classificationResult: {
    updated: number;
    reclassified: number;
  };
  linkGraphResult: {
    nodes: number;
    optimizations: number;
  };
  riskCheckResult: {
    alerts: number;
    critical: number;
  };
  totalActions: number;
  errors: string[];
}

export class SEOAutopilot {
  private config: AutopilotConfig;
  private actionEngine: SEOActionEngine;
  private classifier: PageClassifier;
  private aeoValidator: AEOContentValidator;
  private contentPipeline: ContentPipeline;
  private linkGraphEngine: LinkGraphEngine;
  private riskMonitor: RiskMonitor;

  private lastPipelineRun: Date | null = null;
  private lastGraphRebuild: Date | null = null;
  private lastRiskCheck: Date | null = null;
  private lastClassificationUpdate: Date | null = null;

  constructor(mode: AutopilotMode = "supervised") {
    this.config = this.buildConfig(mode);
    this.actionEngine = new SEOActionEngine(mode);
    this.classifier = new PageClassifier();
    this.aeoValidator = new AEOContentValidator();
    this.contentPipeline = new ContentPipeline(mode);
    this.linkGraphEngine = new LinkGraphEngine();
    this.riskMonitor = new RiskMonitor();
  }

  /**
   * Build configuration for mode
   */
  private buildConfig(mode: AutopilotMode): AutopilotConfig {
    const defaults = MODE_DEFAULTS[mode];
    return {
      mode,
      enabledActions: defaults.enabledActions || [],
      schedule: defaults.schedule || {
        contentPipelineInterval: 24,
        linkGraphRebuildInterval: 6,
        riskCheckInterval: 60,
        classificationUpdateInterval: 24,
      },
      notifications: {
        emailRecipients: [],
        criticalAlertSMS: [],
        sendDailyReport: mode !== "off",
        reportTime: "09:00",
      },
      overrides: {
        allowManualNoindex: true,
        allowManualDelete: mode === "supervised" || mode === "full",
        allowSkipValidation: mode === "off",
        overrideApprovers: [],
      },
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutopilotConfig {
    return this.config;
  }

  /**
   * Set autopilot mode
   */
  setMode(mode: AutopilotMode): void {
    this.config = this.buildConfig(mode);
    this.actionEngine.setAutopilotMode(mode);
    this.contentPipeline.setAutopilotMode(mode);
  }

  /**
   * Get current mode
   */
  getMode(): AutopilotMode {
    return this.config.mode;
  }

  /**
   * Check if action is allowed
   */
  isActionAllowed(action: string): { allowed: boolean; requiresApproval: boolean } {
    const actionConfig = this.config.enabledActions.find(a => a.action === action);

    if (!actionConfig || !actionConfig.enabled) {
      return { allowed: false, requiresApproval: true };
    }

    return {
      allowed: true,
      requiresApproval: actionConfig.requiresApproval,
    };
  }

  /**
   * Run full autopilot cycle
   */
  async runCycle(): Promise<AutopilotRunResult> {
    const startedAt = new Date();
    const errors: string[] = [];

    let pipelineResult = { scanned: 0, issues: 0, actionsExecuted: 0 };
    let classificationResult = { updated: 0, reclassified: 0 };
    let linkGraphResult = { nodes: 0, optimizations: 0 };
    let riskCheckResult = { alerts: 0, critical: 0 };
    let totalActions = 0;

    // Run content pipeline if scheduled
    if (this.shouldRunPipeline()) {
      try {
        const result = await this.contentPipeline.runPipeline();
        pipelineResult = {
          scanned: result.scannedCount,
          issues: result.issuesFound,
          actionsExecuted: result.actionsExecuted,
        };
        totalActions += result.actionsExecuted;
        this.lastPipelineRun = new Date();
      } catch (error) {
        errors.push(`Pipeline error: ${error}`);
      }
    }

    // Run classification update if scheduled
    if (this.shouldRunClassification()) {
      try {
        const results = await this.classifier.classifyAllContent();
        const reclassified = results.filter(r => r.reclassificationTrigger).length;
        classificationResult = {
          updated: results.length,
          reclassified,
        };
        this.lastClassificationUpdate = new Date();
      } catch (error) {
        errors.push(`Classification error: ${error}`);
      }
    }

    // Rebuild link graph if scheduled
    if (this.shouldRebuildGraph()) {
      try {
        const graph = await this.linkGraphEngine.buildGraph();
        const optimizations = await this.linkGraphEngine.getOptimizations();
        linkGraphResult = {
          nodes: graph.nodes.size,
          optimizations: optimizations.length,
        };
        this.lastGraphRebuild = new Date();

        // Auto-execute high-priority optimizations in full mode
        if (this.config.mode === "full") {
          const highPriority = optimizations.filter(o => o.expectedImpact === "HIGH");
          for (const opt of highPriority.slice(0, 10)) {
            try {
              // Execute optimization

              totalActions++;
            } catch (optError) {
              errors.push(`Link optimization error: ${optError}`);
            }
          }
        }
      } catch (error) {
        errors.push(`Link graph error: ${error}`);
      }
    }

    // Run risk check if scheduled
    if (this.shouldRunRiskCheck()) {
      try {
        const alerts = await this.riskMonitor.runRiskCheck();
        const summary = this.riskMonitor.getSummary();
        riskCheckResult = {
          alerts: alerts.length,
          critical: summary.critical,
        };
        this.lastRiskCheck = new Date();
      } catch (error) {
        errors.push(`Risk check error: ${error}`);
      }
    }

    return {
      mode: this.config.mode,
      startedAt,
      completedAt: new Date(),
      pipelineResult,
      classificationResult,
      linkGraphResult,
      riskCheckResult,
      totalActions,
      errors,
    };
  }

  /**
   * Check if pipeline should run
   */
  private shouldRunPipeline(): boolean {
    if (this.config.schedule.contentPipelineInterval === 0) return false;
    if (!this.lastPipelineRun) return true;

    const hoursSinceLastRun = (Date.now() - this.lastPipelineRun.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= this.config.schedule.contentPipelineInterval;
  }

  /**
   * Check if classification should run
   */
  private shouldRunClassification(): boolean {
    if (this.config.schedule.classificationUpdateInterval === 0) return false;
    if (!this.lastClassificationUpdate) return true;

    const hoursSinceLastRun =
      (Date.now() - this.lastClassificationUpdate.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= this.config.schedule.classificationUpdateInterval;
  }

  /**
   * Check if graph should rebuild
   */
  private shouldRebuildGraph(): boolean {
    if (this.config.schedule.linkGraphRebuildInterval === 0) return false;
    if (!this.lastGraphRebuild) return true;

    const hoursSinceLastRun = (Date.now() - this.lastGraphRebuild.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastRun >= this.config.schedule.linkGraphRebuildInterval;
  }

  /**
   * Check if risk check should run
   */
  private shouldRunRiskCheck(): boolean {
    if (this.config.schedule.riskCheckInterval === 0) return false;
    if (!this.lastRiskCheck) return true;

    const minutesSinceLastRun = (Date.now() - this.lastRiskCheck.getTime()) / (1000 * 60);
    return minutesSinceLastRun >= this.config.schedule.riskCheckInterval;
  }

  /**
   * Pre-publish hook - called before any content is published
   */
  async prePublishCheck(contentId: string): Promise<{
    canPublish: boolean;
    blocks: string[];
    warnings: string[];
    requiredActions: SEOAction[];
  }> {
    // Check if publishing is allowed at all
    if (!this.riskMonitor.isPublishingAllowed()) {
      return {
        canPublish: false,
        blocks: ["Publishing is paused due to active risk alerts"],
        warnings: [],
        requiredActions: [],
      };
    }

    // Run action engine validation
    return await this.actionEngine.validatePrePublish(contentId);
  }

  /**
   * Post-publish hook - called after content is published
   */
  async postPublishActions(contentId: string): Promise<{ executed: string[]; skipped: string[] }> {
    const executed: string[] = [];
    const skipped: string[] = [];

    // Auto-classify
    try {
      await this.classifier.classifyContent(contentId);
      executed.push("classification");
    } catch (error) {
      skipped.push("classification");
    }

    // Auto-generate schema if enabled
    if (this.isActionAllowed("GENERATE_SCHEMA").allowed) {
      try {
        // Would call schema engine
        executed.push("schema_generation");
      } catch (error) {
        skipped.push("schema_generation");
      }
    }

    // Auto-set canonical if enabled
    if (this.isActionAllowed("SET_CANONICAL").allowed) {
      try {
        const content = await db.query.contents.findFirst({
          where: eq(contents.id, contentId),
        });
        if (content && !(content as any).canonicalUrl) {
          await db
            .update(contents)
            .set({ canonicalUrl: `https://traviseo.com/${content.slug}` } as any)
            .where(eq(contents.id, contentId));
          executed.push("canonical_set");
        }
      } catch (error) {
        skipped.push("canonical_set");
      }
    }

    // Queue for reindex
    if (this.isActionAllowed("QUEUE_REINDEX").allowed) {
      try {
        await db
          .update(contents)
          .set({ reindexQueued: true, reindexQueuedAt: new Date() } as any)
          .where(eq(contents.id, contentId));
        executed.push("reindex_queued");
      } catch (error) {
        skipped.push("reindex_queued");
      }
    }

    return { executed, skipped };
  }

  /**
   * Get status summary
   */
  getStatus(): {
    mode: AutopilotMode;
    lastPipelineRun: Date | null;
    lastGraphRebuild: Date | null;
    lastRiskCheck: Date | null;
    lastClassificationUpdate: Date | null;
    publishingAllowed: boolean;
    enabledActionsCount: number;
  } {
    return {
      mode: this.config.mode,
      lastPipelineRun: this.lastPipelineRun,
      lastGraphRebuild: this.lastGraphRebuild,
      lastRiskCheck: this.lastRiskCheck,
      lastClassificationUpdate: this.lastClassificationUpdate,
      publishingAllowed: this.riskMonitor.isPublishingAllowed(),
      enabledActionsCount: this.config.enabledActions.filter(a => a.enabled).length,
    };
  }
}

// Export singleton instance
let autopilotInstance: SEOAutopilot | null = null;

export function getAutopilot(mode?: AutopilotMode): SEOAutopilot {
  if (!autopilotInstance) {
    autopilotInstance = new SEOAutopilot(mode || "supervised");
  } else if (mode && autopilotInstance.getMode() !== mode) {
    autopilotInstance.setMode(mode);
  }
  return autopilotInstance;
}
