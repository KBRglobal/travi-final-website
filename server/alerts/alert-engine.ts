import { alertRules } from "./alert-rules";
import * as repository from "./alert-repository";
import { dispatchAlert, dispatchResolution } from "./alert-dispatcher";
import type { AlertStats } from "./types";

let lastDetectionRun: Date | null = null;
let isRunning = false;
let detectionInterval: NodeJS.Timeout | null = null;

const DETECTION_INTERVAL_MS = 60000;

export function isAlertingEnabled(): boolean {
  return process.env.ENABLE_ALERTING_SYSTEM === "true";
}

async function handleTriggeredRule(
  rule: (typeof alertRules)[number],
  message: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const existingAlert = await repository.findActiveAlertByType(rule.type);
  if (existingAlert) return;

  const newAlert = await repository.createAlert(rule.type, rule.severity, message, metadata);
  if (newAlert) {
    dispatchAlert(newAlert);
  }
}

async function handleResolvedRule(rule: (typeof alertRules)[number]): Promise<void> {
  const existingAlert = await repository.findActiveAlertByType(rule.type);
  if (!existingAlert) return;

  const resolved = await repository.resolveAlert(existingAlert.id);
  if (resolved) {
    dispatchResolution({ ...existingAlert, isActive: false, resolvedAt: new Date() });
  }
}

export async function runDetection(): Promise<void> {
  if (!isAlertingEnabled()) return;

  lastDetectionRun = new Date();

  for (const rule of alertRules) {
    try {
      const result = await rule.detect();

      if (result.triggered) {
        await handleTriggeredRule(rule, result.message, result.metadata || {});
      } else {
        await handleResolvedRule(rule);
      }
    } catch (error) {
      /* ignored */
    }
  }
}

export function startAlertEngine(): void {
  if (!isAlertingEnabled()) {
    return;
  }

  if (isRunning) {
    return;
  }

  isRunning = true;

  runDetection().catch(err => {
    console.error("Alert detection error:", err);
  });

  detectionInterval = setInterval(() => {
    runDetection().catch(err => {
      console.error("Alert detection interval error:", err);
    });
  }, DETECTION_INTERVAL_MS);
}

export function stopAlertEngine(): void {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  isRunning = false;
}

export function getEngineStatus(): {
  enabled: boolean;
  running: boolean;
  lastDetectionRun: string | null;
  ruleCount: number;
} {
  return {
    enabled: isAlertingEnabled(),
    running: isRunning,
    lastDetectionRun: lastDetectionRun?.toISOString() || null,
    ruleCount: alertRules.length,
  };
}

export async function getAlertStats(): Promise<AlertStats> {
  const stats = await repository.getAlertStats();
  return {
    ...stats,
    lastDetectionRun,
  };
}

export * as repository from "./alert-repository";
