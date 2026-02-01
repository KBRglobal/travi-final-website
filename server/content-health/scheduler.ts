/**
 * Content Health Scheduler (Stub)
 * Content health monitoring was simplified during cleanup.
 */

let isRunning = false;

export function startHealthScanner(): void {
  isRunning = true;
  // Stub - no-op
}

export function stopHealthScanner(): void {
  isRunning = false;
  // Stub - no-op
}

export function isHealthScannerRunning(): boolean {
  return isRunning;
}
