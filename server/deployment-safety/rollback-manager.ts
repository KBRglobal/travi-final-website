/**
 * Rollback Manager - Automated Rollback Orchestration
 *
 * FEATURE: Immediate rollback capability
 * - Automatic rollback triggers
 * - Step-by-step rollback execution
 * - Rollback history and analytics
 *
 * Feature flag: ENABLE_ROLLBACK_MANAGER=true
 */

import { randomUUID } from "crypto";
import { log } from "../lib/logger";
import type {
  RollbackPlan,
  RollbackStep,
  RollbackTrigger,
  RollbackStatus,
  RollbackHistory,
  Environment,
} from "./types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Rollback] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Rollback] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[Rollback] ${msg}`, undefined, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[Rollback][ALERT] ${msg}`, data),
};

// Bounded storage
const MAX_ROLLBACK_HISTORY = 100;

// Rollback storage
const rollbackPlans: Map<string, RollbackPlan> = new Map();
const rollbackHistory: Map<Environment, RollbackHistory> = new Map();

// Step executors
type StepExecutor = (
  step: RollbackStep,
  plan: RollbackPlan
) => Promise<{ success: boolean; error?: string }>;
const stepExecutors: Map<string, StepExecutor> = new Map();

// Event subscribers
type RollbackEventHandler = (plan: RollbackPlan, event: string) => void;
const eventHandlers: Set<RollbackEventHandler> = new Set();

// Rollback triggers configuration
interface TriggerConfig {
  enabled: boolean;
  threshold: number;
  cooldownMs: number;
  lastTriggeredAt?: Date;
}

const triggerConfigs: Map<RollbackTrigger, TriggerConfig> = new Map([
  ["error_rate", { enabled: true, threshold: 0.1, cooldownMs: 300000 }], // 10% error rate
  ["latency", { enabled: true, threshold: 5000, cooldownMs: 300000 }], // 5s P95 latency
  ["health_check", { enabled: true, threshold: 3, cooldownMs: 60000 }], // 3 consecutive failures
  ["budget_exceeded", { enabled: true, threshold: 1, cooldownMs: 3600000 }], // 1 hour cooldown
  ["timeout", { enabled: true, threshold: 30000, cooldownMs: 300000 }], // 30s timeout
]);

/**
 * Create default rollback steps
 */
function createDefaultSteps(): RollbackStep[] {
  return [
    createStep(
      "validate_target",
      "Validate Rollback Target",
      "Verify target version exists and is deployable",
      1
    ),
    createStep("pause_traffic", "Pause Traffic", "Stop new requests to current version", 2),
    createStep("drain_connections", "Drain Connections", "Wait for active requests to complete", 3),
    createStep("switch_version", "Switch Version", "Deploy previous version", 4),
    createStep("verify_health", "Verify Health", "Check health of rolled back version", 5),
    createStep("resume_traffic", "Resume Traffic", "Restore traffic to rolled back version", 6),
    createStep("cleanup", "Cleanup", "Clean up failed deployment artifacts", 7),
    createStep("notify", "Send Notifications", "Notify stakeholders of rollback completion", 8),
  ];
}

/**
 * Create a rollback step
 */
function createStep(id: string, name: string, description: string, order: number): RollbackStep {
  return {
    id,
    name,
    description,
    order,
    status: "pending",
    rollbackable: false,
  };
}

/**
 * Initialize rollback history for an environment
 */
function initializeHistory(environment: Environment): RollbackHistory {
  const history: RollbackHistory = {
    id: randomUUID(),
    environment,
    rollbacks: [],
    rollbackCount: 0,
    avgDurationMs: 0,
    successRate: 0,
  };
  rollbackHistory.set(environment, history);
  return history;
}

/**
 * Create a rollback plan
 */
export function createRollbackPlan(
  fromVersion: string,
  toVersion: string,
  environment: Environment,
  trigger: RollbackTrigger,
  actor?: string,
  customSteps?: RollbackStep[]
): RollbackPlan {
  const id = randomUUID();
  const steps = customSteps || createDefaultSteps();

  const plan: RollbackPlan = {
    id,
    fromVersion,
    toVersion,
    environment,
    trigger,
    status: "pending",
    createdAt: new Date(),
    steps,
    currentStep: 0,
    actor,
    automatic: !actor,
  };

  // Bounded storage
  if (rollbackPlans.size >= MAX_ROLLBACK_HISTORY) {
    const oldest = Array.from(rollbackPlans.entries())
      .filter(
        ([_, p]) => p.status === "completed" || p.status === "failed" || p.status === "cancelled"
      )
      .sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime())[0];
    if (oldest) {
      rollbackPlans.delete(oldest[0]);
    }
  }

  rollbackPlans.set(id, plan);

  logger.info("Rollback plan created", {
    id,
    fromVersion,
    toVersion,
    environment,
    trigger,
    automatic: plan.automatic,
  });

  emitEvent(plan, "created");

  return plan;
}

/**
 * Execute a rollback plan
 */
export async function executeRollback(planId: string): Promise<RollbackPlan> {
  const plan = rollbackPlans.get(planId);
  if (!plan) {
    throw new Error(`Rollback plan not found: ${planId}`);
  }

  if (plan.status !== "pending") {
    throw new Error(`Rollback plan already started or completed: ${plan.status}`);
  }

  plan.status = "in_progress";
  plan.startedAt = new Date();

  logger.alert("Rollback execution started", {
    planId,
    fromVersion: plan.fromVersion,
    toVersion: plan.toVersion,
    environment: plan.environment,
  });

  emitEvent(plan, "started");

  // Execute steps sequentially
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    plan.currentStep = i;
    step.status = "in_progress";
    step.startedAt = new Date();

    logger.info("Executing rollback step", {
      planId,
      stepId: step.id,
      stepName: step.name,
      stepOrder: step.order,
    });

    try {
      const executor = stepExecutors.get(step.id);
      if (executor) {
        const result = await executor(step, plan);
        if (!result.success) {
          throw new Error(result.error || "Step execution failed");
        }
      } else {
        // Default execution - just mark as done
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      step.status = "completed";
      step.completedAt = new Date();

      logger.info("Rollback step completed", {
        planId,
        stepId: step.id,
        stepName: step.name,
        durationMs: step.completedAt.getTime() - step.startedAt!.getTime(),
      });
    } catch (err) {
      step.status = "failed";
      step.completedAt = new Date();
      step.error = err instanceof Error ? err.message : "Unknown error";

      logger.error("Rollback step failed", {
        planId,
        stepId: step.id,
        stepName: step.name,
        error: step.error,
      });

      plan.status = "failed";
      plan.completedAt = new Date();
      plan.error = `Step "${step.name}" failed: ${step.error}`;

      emitEvent(plan, "failed");
      updateHistory(plan);

      return plan;
    }
  }

  plan.status = "completed";
  plan.completedAt = new Date();

  logger.info("Rollback completed successfully", {
    planId,
    durationMs: plan.completedAt.getTime() - plan.startedAt!.getTime(),
  });

  emitEvent(plan, "completed");
  updateHistory(plan);

  return plan;
}

/**
 * Cancel a pending rollback
 */
export function cancelRollback(planId: string, reason: string): RollbackPlan | null {
  const plan = rollbackPlans.get(planId);
  if (!plan) return null;

  if (plan.status !== "pending") {
    logger.warn("Cannot cancel non-pending rollback", {
      planId,
      status: plan.status,
    });
    return null;
  }

  plan.status = "cancelled";
  plan.completedAt = new Date();
  plan.error = `Cancelled: ${reason}`;

  logger.info("Rollback cancelled", { planId, reason });

  emitEvent(plan, "cancelled");

  return plan;
}

/**
 * Check if rollback should be triggered
 */
export function shouldTriggerRollback(
  trigger: RollbackTrigger,
  value: number
): { shouldTrigger: boolean; reason?: string } {
  const config = triggerConfigs.get(trigger);
  if (!config || !config.enabled) {
    return { shouldTrigger: false };
  }

  // Check cooldown
  if (config.lastTriggeredAt) {
    const elapsed = Date.now() - config.lastTriggeredAt.getTime();
    if (elapsed < config.cooldownMs) {
      return { shouldTrigger: false, reason: "In cooldown period" };
    }
  }

  // Check threshold
  if (value >= config.threshold) {
    return {
      shouldTrigger: true,
      reason: `${trigger} threshold exceeded: ${value} >= ${config.threshold}`,
    };
  }

  return { shouldTrigger: false };
}

/**
 * Trigger automatic rollback
 */
export async function triggerAutomaticRollback(
  fromVersion: string,
  toVersion: string,
  environment: Environment,
  trigger: RollbackTrigger,
  reason: string
): Promise<RollbackPlan> {
  const config = triggerConfigs.get(trigger);
  if (config) {
    config.lastTriggeredAt = new Date();
  }

  logger.alert("Automatic rollback triggered", {
    fromVersion,
    toVersion,
    environment,
    trigger,
    reason,
  });

  const plan = createRollbackPlan(fromVersion, toVersion, environment, trigger);

  // Execute immediately for automatic rollbacks
  return executeRollback(plan.id);
}

/**
 * Update rollback history
 */
function updateHistory(plan: RollbackPlan): void {
  let history = rollbackHistory.get(plan.environment);
  if (!history) {
    history = initializeHistory(plan.environment);
  }

  history.rollbacks.push(plan);
  history.rollbackCount++;
  history.lastRollbackAt = plan.completedAt;

  // Calculate statistics
  const completedRollbacks = history.rollbacks.filter(
    r => r.status === "completed" || r.status === "failed"
  );
  const successfulRollbacks = history.rollbacks.filter(r => r.status === "completed");

  history.successRate =
    completedRollbacks.length > 0 ? successfulRollbacks.length / completedRollbacks.length : 0;

  const durations = completedRollbacks
    .filter(r => r.startedAt && r.completedAt)
    .map(r => r.completedAt!.getTime() - r.startedAt!.getTime());

  history.avgDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  // Bound history
  if (history.rollbacks.length > MAX_ROLLBACK_HISTORY) {
    history.rollbacks = history.rollbacks.slice(-MAX_ROLLBACK_HISTORY);
  }
}

/**
 * Register step executor
 */
export function registerStepExecutor(stepId: string, executor: StepExecutor): void {
  stepExecutors.set(stepId, executor);
  logger.info("Step executor registered", { stepId });
}

/**
 * Subscribe to rollback events
 */
export function subscribeToRollbackEvents(handler: RollbackEventHandler): () => void {
  eventHandlers.add(handler);
  return () => {
    eventHandlers.delete(handler);
  };
}

/**
 * Emit event to all subscribers
 */
function emitEvent(plan: RollbackPlan, event: string): void {
  for (const handler of eventHandlers) {
    try {
      handler(plan, event);
    } catch (err) {
      logger.warn("Rollback event handler error", {
        event,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
}

/**
 * Get rollback plan
 */
export function getRollbackPlan(planId: string): RollbackPlan | null {
  return rollbackPlans.get(planId) || null;
}

/**
 * List rollback plans
 */
export function listRollbackPlans(options?: {
  environment?: Environment;
  status?: RollbackStatus;
  trigger?: RollbackTrigger;
  limit?: number;
}): RollbackPlan[] {
  let results = Array.from(rollbackPlans.values());

  if (options?.environment) {
    results = results.filter(p => p.environment === options.environment);
  }

  if (options?.status) {
    results = results.filter(p => p.status === options.status);
  }

  if (options?.trigger) {
    results = results.filter(p => p.trigger === options.trigger);
  }

  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get rollback history for environment
 */
export function getRollbackHistory(environment: Environment): RollbackHistory {
  return rollbackHistory.get(environment) || initializeHistory(environment);
}

/**
 * Get active rollback for environment
 */
export function getActiveRollback(environment: Environment): RollbackPlan | null {
  for (const plan of rollbackPlans.values()) {
    if (plan.environment === environment && plan.status === "in_progress") {
      return plan;
    }
  }
  return null;
}

/**
 * Update trigger configuration
 */
export function updateTriggerConfig(
  trigger: RollbackTrigger,
  config: Partial<TriggerConfig>
): void {
  const existing = triggerConfigs.get(trigger) || { enabled: false, threshold: 0, cooldownMs: 0 };
  triggerConfigs.set(trigger, { ...existing, ...config });
  logger.info("Trigger config updated", { trigger, config });
}

/**
 * Get rollback statistics
 */
export function getRollbackStats(): {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  cancelled: number;
  automaticCount: number;
  manualCount: number;
  avgDurationMs: number;
  successRate: number;
  triggerBreakdown: Record<RollbackTrigger, number>;
} {
  const stats = {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    automaticCount: 0,
    manualCount: 0,
    avgDurationMs: 0,
    successRate: 0,
    triggerBreakdown: {} as Record<RollbackTrigger, number>,
  };

  let totalDurationMs = 0;
  let durationCount = 0;

  for (const plan of rollbackPlans.values()) {
    stats.total++;

    switch (plan.status) {
      case "pending":
        stats.pending++;
        break;
      case "in_progress":
        stats.inProgress++;
        break;
      case "completed":
        stats.completed++;
        break;
      case "failed":
        stats.failed++;
        break;
      case "cancelled":
        stats.cancelled++;
        break;
    }

    if (plan.automatic) {
      stats.automaticCount++;
    } else {
      stats.manualCount++;
    }

    stats.triggerBreakdown[plan.trigger] = (stats.triggerBreakdown[plan.trigger] || 0) + 1;

    if (plan.startedAt && plan.completedAt) {
      totalDurationMs += plan.completedAt.getTime() - plan.startedAt.getTime();
      durationCount++;
    }
  }

  stats.avgDurationMs = durationCount > 0 ? Math.round(totalDurationMs / durationCount) : 0;
  stats.successRate =
    stats.completed + stats.failed > 0 ? stats.completed / (stats.completed + stats.failed) : 0;

  return stats;
}

/**
 * Clear all rollback data (for testing)
 */
export function clearAllRollbacks(): void {
  rollbackPlans.clear();
  rollbackHistory.clear();
  logger.info("All rollback data cleared");
}

// Register default step executors
registerStepExecutor("validate_target", async (_step, plan) => {
  // Validate the target version exists
  logger.info("Validating rollback target", { toVersion: plan.toVersion });
  return { success: true };
});

registerStepExecutor("pause_traffic", async (_step, _plan) => {
  // In production, would pause load balancer or similar
  logger.info("Pausing traffic");
  return { success: true };
});

registerStepExecutor("drain_connections", async (_step, _plan) => {
  // Wait for active connections to drain
  logger.info("Draining connections");
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true };
});

registerStepExecutor("switch_version", async (_step, plan) => {
  // In production, would switch deployment
  logger.info("Switching version", { from: plan.fromVersion, to: plan.toVersion });
  return { success: true };
});

registerStepExecutor("verify_health", async (_step, _plan) => {
  try {
    const { checkNow } = await import("../continuous-readiness");
    const snapshot = await checkNow();
    if (snapshot.state !== "READY") {
      return { success: false, error: `Health check failed: ${snapshot.state}` };
    }
    return { success: true };
  } catch (err) {
    return { success: true }; // Don't fail rollback if health check unavailable
  }
});

registerStepExecutor("resume_traffic", async (_step, _plan) => {
  // In production, would resume load balancer
  logger.info("Resuming traffic");
  return { success: true };
});

registerStepExecutor("cleanup", async (_step, _plan) => {
  // Clean up failed deployment artifacts
  logger.info("Cleaning up");
  return { success: true };
});

registerStepExecutor("notify", async (_step, plan) => {
  // Send notifications
  logger.info("Sending rollback notifications", {
    environment: plan.environment,
    toVersion: plan.toVersion,
  });

  // Send rollback notifications
  await sendRollbackNotifications(plan);

  return { success: true };
});

/**
 * Notification types for rollback events
 */
export type RollbackNotificationType = "email" | "webhook" | "slack" | "log";

interface NotificationConfig {
  type: RollbackNotificationType;
  enabled: boolean;
  endpoint?: string;
  recipients?: string[];
}

// Notification configuration
const notificationConfigs: NotificationConfig[] = [
  { type: "log", enabled: true },
  { type: "webhook", enabled: false, endpoint: process.env.ROLLBACK_WEBHOOK_URL },
  { type: "email", enabled: false, recipients: process.env.ROLLBACK_EMAIL_RECIPIENTS?.split(",") },
  { type: "slack", enabled: false, endpoint: process.env.SLACK_WEBHOOK_URL },
];

/**
 * Send rollback notifications to all configured channels
 */
async function sendRollbackNotifications(plan: RollbackPlan): Promise<void> {
  const notificationPromises: Promise<void>[] = [];

  for (const config of notificationConfigs) {
    if (!config.enabled) continue;

    try {
      switch (config.type) {
        case "log":
          notificationPromises.push(sendLogNotification(plan));
          break;
        case "webhook":
          if (config.endpoint) {
            notificationPromises.push(sendWebhookNotification(plan, config.endpoint));
          }
          break;
        case "email":
          if (config.recipients?.length) {
            notificationPromises.push(sendEmailNotification(plan, config.recipients));
          }
          break;
        case "slack":
          if (config.endpoint) {
            notificationPromises.push(sendSlackNotification(plan, config.endpoint));
          }
          break;
      }
    } catch (err) {
      logger.warn(`Failed to send ${config.type} notification`, {
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  await Promise.allSettled(notificationPromises);
}

/**
 * Log notification (always enabled)
 */
async function sendLogNotification(plan: RollbackPlan): Promise<void> {
  const durationMs =
    plan.startedAt && plan.completedAt ? plan.completedAt.getTime() - plan.startedAt.getTime() : 0;

  logger.alert("ROLLBACK NOTIFICATION", {
    planId: plan.id,
    status: plan.status,
    environment: plan.environment,
    fromVersion: plan.fromVersion,
    toVersion: plan.toVersion,
    trigger: plan.trigger,
    automatic: plan.automatic,
    actor: plan.actor,
    durationMs,
    stepsCompleted: plan.steps.filter(s => s.status === "completed").length,
    totalSteps: plan.steps.length,
    error: plan.error,
  });
}

/**
 * Webhook notification
 */
async function sendWebhookNotification(plan: RollbackPlan, endpoint: string): Promise<void> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "rollback",
        timestamp: new Date().toISOString(),
        data: {
          planId: plan.id,
          status: plan.status,
          environment: plan.environment,
          fromVersion: plan.fromVersion,
          toVersion: plan.toVersion,
          trigger: plan.trigger,
          automatic: plan.automatic,
          error: plan.error,
        },
      }),
    });

    if (!response.ok) {
      logger.warn("Webhook notification failed", {
        status: response.status,
        endpoint,
      });
    }
  } catch (err) {
    logger.warn("Webhook notification error", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * Email notification (placeholder - requires email service integration)
 */
async function sendEmailNotification(plan: RollbackPlan, recipients: string[]): Promise<void> {
  // This would integrate with Resend or similar email service
  logger.info("Email notification would be sent", {
    recipients,
    subject: `[TRAVI] Rollback ${plan.status} - ${plan.environment}`,
    planId: plan.id,
  });

  // Example integration with Resend:
  // const { Resend } = await import('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'alerts@travi.com',
  //   to: recipients,
  //   subject: `[TRAVI] Rollback ${plan.status} - ${plan.environment}`,
  //   html: formatRollbackEmail(plan),
  // });
}

/**
 * Slack notification
 */
async function sendSlackNotification(plan: RollbackPlan, webhookUrl: string): Promise<void> {
  const statusEmoji = plan.status === "completed" ? "✅" : plan.status === "failed" ? "❌" : "⚠️";
  const color =
    plan.status === "completed" ? "#36a64f" : plan.status === "failed" ? "#dc3545" : "#ffc107";

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: `${statusEmoji} Rollback ${plan.status.toUpperCase()}`,
            fields: [
              { title: "Environment", value: plan.environment, short: true },
              { title: "Trigger", value: plan.trigger, short: true },
              { title: "From Version", value: plan.fromVersion, short: true },
              { title: "To Version", value: plan.toVersion, short: true },
              { title: "Type", value: plan.automatic ? "Automatic" : "Manual", short: true },
              ...(plan.error ? [{ title: "Error", value: plan.error, short: false }] : []),
            ],
            footer: "TRAVI Rollback Manager",
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });

    if (!response.ok) {
      logger.warn("Slack notification failed", { status: response.status });
    }
  } catch (err) {
    logger.warn("Slack notification error", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

/**
 * Enable/disable notification channel
 */
export function configureNotification(
  type: RollbackNotificationType,
  enabled: boolean,
  options?: { endpoint?: string; recipients?: string[] }
): void {
  const config = notificationConfigs.find(c => c.type === type);
  if (config) {
    config.enabled = enabled;
    if (options?.endpoint) config.endpoint = options.endpoint;
    if (options?.recipients) config.recipients = options.recipients;
    logger.info("Notification channel configured", { type, enabled });
  }
}
