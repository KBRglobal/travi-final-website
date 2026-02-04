// Stub - content health scheduler disabled
export function startContentHealthMonitor(): void {}
export function stopContentHealthMonitor(): void {}
export function getContentHealthStatus(): { running: boolean } {
  return { running: false };
}
export function startHealthScanner(): void {}
export function stopHealthScanner(): void {}
export function isHealthScannerRunning(): boolean {
  return false;
}
