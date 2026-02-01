/**
 * System Alerts (Stub)
 * Alert functionality was simplified during cleanup.
 */

export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
}

export interface AlertConfig {
  enabled: boolean;
  levels: AlertLevel[];
}

export function getActiveAlerts(): Alert[] {
  return [];
}

export function createAlert(level: AlertLevel, message: string): Alert {
  return {
    id: crypto.randomUUID(),
    level,
    message,
    timestamp: new Date(),
  };
}

export function getAlertConfig(): AlertConfig {
  return {
    enabled: false,
    levels: ['error', 'critical'],
  };
}

export interface AlertMetrics {
  totalAlerts: number;
  activeAlerts: number;
  byLevel: Record<AlertLevel, number>;
}

export interface AlertConditionResult {
  triggered: boolean;
  alerts: Alert[];
}

export function checkAlertConditions(): AlertConditionResult {
  return {
    triggered: false,
    alerts: [],
  };
}

export function formatAlertForHumans(alert: Alert): string {
  return `[${alert.level.toUpperCase()}] ${alert.message}`;
}

export function getAlertMetrics(): AlertMetrics {
  return {
    totalAlerts: 0,
    activeAlerts: 0,
    byLevel: {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    },
  };
}

export function getAlertHistory(limit: number = 100): Alert[] {
  return [];
}
