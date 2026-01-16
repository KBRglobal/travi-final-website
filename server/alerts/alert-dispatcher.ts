import type { Alert } from "./types";

export function dispatchAlert(alert: Alert): void {
  const severityColor = {
    low: "\x1b[36m",
    medium: "\x1b[33m",
    high: "\x1b[31m",
    critical: "\x1b[35m",
  };
  const reset = "\x1b[0m";

  console.log(
    `${severityColor[alert.severity]}[ALERT:${alert.severity.toUpperCase()}]${reset} ` +
    `[${alert.type}] ${alert.message}`,
    { alertId: alert.id, metadata: alert.metadata }
  );
}

export function dispatchResolution(alert: Alert): void {
  console.log(
    `\x1b[32m[ALERT:RESOLVED]\x1b[0m [${alert.type}] ${alert.message}`,
    { alertId: alert.id }
  );
}
