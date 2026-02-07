import type { Alert } from "./types";

export function dispatchAlert(alert: Alert): void {
  const severityColor = {
    low: "\x1b[36m",
    medium: "\x1b[33m",
    high: "\x1b[31m",
    critical: "\x1b[35m",
  };
  const reset = "\x1b[0m";
}

export function dispatchResolution(alert: Alert): void {
  /* empty */
}
