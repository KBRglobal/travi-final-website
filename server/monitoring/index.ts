// Stub - Monitoring disabled
import { Router } from "express";
export const monitoringRoutes = Router();
export function setupMonitoring(..._args: unknown[]) {}
export function startMonitoring() {}
export function stopMonitoring() {}
export function getMonitoringStatus() {
  return { running: false };
}
export function getPerformanceMetrics() {
  return { cpu: 0, memory: 0, requests: 0 };
}
