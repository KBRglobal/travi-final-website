// Stub - content health scheduler disabled
export function startContentHealthMonitor(): void {}
export function stopContentHealthMonitor(): void {}
export async function getContentHealthStatus(): Promise<any> {
  return { healthy: true };
}
export function startHealthScanner(): void {}
export function stopHealthScanner(): void {}
export function isHealthScannerRunning(): boolean {
  return false;
}
