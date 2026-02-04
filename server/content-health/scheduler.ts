// Stub - Content Health Scheduler disabled
export function startHealthScheduler(): void {}
export function stopHealthScheduler(): void {}
export function isHealthSchedulerRunning(): boolean {
  return false;
}

// Aliases for background-services.ts
export const startHealthScanner = startHealthScheduler;
export const stopHealthScanner = stopHealthScheduler;
export const isHealthScannerRunning = isHealthSchedulerRunning;
