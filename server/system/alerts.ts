/**
 * System Alerts (Stub)
 * Alert functionality was simplified during cleanup.
 */

export type AlertLevel = "info" | "warning" | "error" | "critical";

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
  timestamp: Date;
  type: string;
  severity: AlertLevel;
  title: string;
  currentValue: number;
  threshold: number;
  unit: string;
  triggeredAt: Date;
  context: Record<string, any>;
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
    type: "general",
    severity: level,
    title: message,
    currentValue: 0,
    threshold: 0,
    unit: "",
    triggeredAt: new Date(),
    context: {},
  };
}

export function getAlertConfig(): AlertConfig {
  return {
    enabled: false,
    levels: ["error", "critical"],
  };
}

export interface AlertThresholdConfig {
  threshold: number;
  unit: string;
  description: string;
  severity: AlertLevel;
}

export interface AlertSettings {
  cooldownMinutes: number;
  enabled: boolean;
}

export interface AlertMetrics {
  totalAlerts: number;
  activeAlerts: Alert[];
  byLevel: Record<AlertLevel, number>;
  timestamp: string;
  recentHistory: Alert[];
  cooldownStatus: Record<string, boolean>;
  thresholds: Record<string, AlertThresholdConfig>;
  settings: AlertSettings;
}

export interface AlertConditionResult {
  triggered: boolean;
  alerts: Alert[];
  length: number;
}

export function checkAlertConditions(): AlertConditionResult {
  return {
    triggered: false,
    alerts: [],
    length: 0,
  };
}

export function formatAlertForHumans(alert: Alert): string {
  return `[${alert.level.toUpperCase()}] ${alert.message}`;
}

export function getAlertMetrics(): AlertMetrics {
  return {
    totalAlerts: 0,
    activeAlerts: [],
    byLevel: {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    },
    timestamp: new Date().toISOString(),
    recentHistory: [],
    cooldownStatus: {},
    thresholds: {},
    settings: {
      cooldownMinutes: 15,
      enabled: true,
    },
  };
}

export function getAlertHistory(limit: number = 100): Alert[] {
  return [];
}
