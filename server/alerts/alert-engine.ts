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

export async function runDetection(): Promise<void> {
  if (!isAlertingEnabled()) return;

  lastDetectionRun = new Date();

  for (const rule of alertRules) {
    try {
      const result = await rule.detect();

      if (result.triggered) {
        const existingAlert = await repository.findActiveAlertByType(rule.type);
        if (!existingAlert) {
          const newAlert = await repository.createAlert(
            rule.type,
            rule.severity,
            result.message,
            result.metadata || {}
          );
          if (newAlert) {
            dispatchAlert(newAlert);
          }
        }
      } else {
        const existingAlert = await repository.findActiveAlertByType(rule.type);
        if (existingAlert) {
          const resolved = await repository.resolveAlert(existingAlert.id);
          if (resolved) {
            dispatchResolution({ ...existingAlert, isActive: false, resolvedAt: new Date() });
          }
        }
      }
    } catch (error) {
      console.error(`[AlertEngine] Error running detector for ${rule.type}:`, error);
    }
  }
}

export function startAlertEngine(): void {
  if (!isAlertingEnabled()) {
    console.log("[AlertEngine] Alerting system disabled (ENABLE_ALERTING_SYSTEM != true)");
    return;
  }

  if (isRunning) {
    console.log("[AlertEngine] Already running");
    return;
  }

  console.log("[AlertEngine] Starting alert detection engine...");
  isRunning = true;

  runDetection().catch(console.error);

  detectionInterval = setInterval(() => {
    runDetection().catch(console.error);
  }, DETECTION_INTERVAL_MS);

  console.log(`[AlertEngine] Detection running every ${DETECTION_INTERVAL_MS / 1000}s`);
}

export function stopAlertEngine(): void {
  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }
  isRunning = false;
  console.log("[AlertEngine] Stopped");
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

export { repository };
