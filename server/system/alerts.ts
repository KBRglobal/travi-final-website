// Stub - System Alerts disabled

export interface AlertThreshold {
  threshold: number;
  unit: string;
  description: string;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
  timestamp: Date;
}

export interface AlertMetrics {
  totalAlerts: number;
  activeAlerts: number;
  byType: Record<string, number>;
}

export const ALERT_THRESHOLDS: Record<string, AlertThreshold> = {};

export function checkAlerts(): void {
  /* empty */
}
export function sendAlert(_type: string, _message: string): void {
  /* empty */
}
export function getAlertStatus() {
  return { alerts: [] };
}

export function checkAlertConditions(): Alert[] {
  return [];
}
export function formatAlertForHumans(_alert: Alert): string {
  return "";
}
export function getAlertMetrics(): AlertMetrics {
  return { totalAlerts: 0, activeAlerts: 0, byType: {} };
}
export function getActiveAlerts(): Alert[] {
  return [];
}
export function getAlertHistory(_limit?: number): Alert[] {
  return [];
}
