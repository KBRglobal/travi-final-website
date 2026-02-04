// Stub - Content Health disabled
export function startHealthScheduler() {}
export function stopHealthScheduler() {}
export function startHealthScanner() {}
export function stopHealthScanner() {}
export function isHealthScannerRunning() {
  return false;
}
export function getHealthStatus() {
  return { healthy: true };
}
