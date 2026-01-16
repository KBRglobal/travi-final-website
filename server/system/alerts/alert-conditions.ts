/**
 * Alert Conditions - Operational Alerting (Human-Safe)
 * 
 * TASK 7: Operational Alerting
 * 
 * Defines alert types and thresholds for when humans must intervene:
 * - runaway_cost: AI spend > 150% of daily average
 * - degraded_search: Zero-result rate > 20%
 * - ai_fallback_overuse: AI fallback rate > 30%
 * - system_overload: Load tier RED for > 5 minutes
 * 
 * HARD CONSTRAINTS:
 * - Human-readable (no jargon)
 * - Read-only (no auto-remediation)
 */

export type AlertType = 
  | 'runaway_cost'
  | 'degraded_search'
  | 'ai_fallback_overuse'
  | 'system_overload';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertThreshold {
  type: AlertType;
  threshold: number;
  unit: string;
  description: string;
  severity: AlertSeverity;
  suggestedAction: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  suggestedAction: string;
  currentValue: number;
  threshold: number;
  unit: string;
  triggeredAt: Date;
  expiresAt: Date;
  context?: Record<string, unknown>;
}

export const ALERT_TTL_HOURS = 24;

export const ALERT_THRESHOLDS: Record<AlertType, AlertThreshold> = {
  runaway_cost: {
    type: 'runaway_cost',
    threshold: 1.5,
    unit: 'x daily average',
    description: 'AI costs exceed 150% of the daily average',
    severity: 'critical',
    suggestedAction: 'Review the AI usage dashboard and check for unusual activity. Consider pausing non-essential AI tasks.',
  },
  degraded_search: {
    type: 'degraded_search',
    threshold: 20,
    unit: '%',
    description: 'Search zero-result rate exceeds 20%',
    severity: 'warning',
    suggestedAction: 'Check if the search index is healthy and up-to-date. Users may need to be notified of reduced search quality.',
  },
  ai_fallback_overuse: {
    type: 'ai_fallback_overuse',
    threshold: 30,
    unit: '%',
    description: 'AI provider fallback rate exceeds 30%',
    severity: 'critical',
    suggestedAction: 'Check AI provider status pages. The system is using backup providers more than expected.',
  },
  system_overload: {
    type: 'system_overload',
    threshold: 5,
    unit: ' minutes',
    description: 'System in RED load tier for more than 5 minutes',
    severity: 'critical',
    suggestedAction: 'Consider reducing traffic or scaling resources. Non-critical features are being deferred.',
  },
};

export const COOLDOWN_MINUTES = 15;
export const MAX_ALERTS_RETAINED = 100;

export function createAlert(
  type: AlertType,
  currentValue: number,
  context?: Record<string, unknown>
): Alert {
  const threshold = ALERT_THRESHOLDS[type];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ALERT_TTL_HOURS * 60 * 60 * 1000);
  
  return {
    id: `alert_${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    severity: threshold.severity,
    title: getAlertTitle(type),
    message: getAlertMessage(type, currentValue, threshold.threshold),
    suggestedAction: threshold.suggestedAction,
    currentValue,
    threshold: threshold.threshold,
    unit: threshold.unit,
    triggeredAt: now,
    expiresAt,
    context,
  };
}

function getAlertTitle(type: AlertType): string {
  switch (type) {
    case 'runaway_cost':
      return 'AI Costs Running High';
    case 'degraded_search':
      return 'Search Quality Degraded';
    case 'ai_fallback_overuse':
      return 'AI Providers Struggling';
    case 'system_overload':
      return 'System Under Heavy Load';
  }
}

function getAlertMessage(type: AlertType, current: number, threshold: number): string {
  switch (type) {
    case 'runaway_cost':
      return `AI spending is ${(current * 100).toFixed(0)}% of the daily average (threshold: ${(threshold * 100).toFixed(0)}%). Check for unusual AI usage patterns or runaway processes.`;
    case 'degraded_search':
      return `${current.toFixed(0)}% of searches are returning no results. Users may be unable to find what they're looking for.`;
    case 'ai_fallback_overuse':
      return `${current.toFixed(0)}% of AI requests needed backup providers. Primary AI services may be experiencing issues.`;
    case 'system_overload':
      return `System has been in high-load mode for ${current.toFixed(0)} minutes. Some features may be running slower than usual.`;
  }
}

export function isAlertConditionMet(type: AlertType, currentValue: number): boolean {
  const threshold = ALERT_THRESHOLDS[type];
  return currentValue >= threshold.threshold;
}

export function isAlertExpired(alert: Alert): boolean {
  return new Date() >= alert.expiresAt;
}

export function getSeverityLevel(severity: AlertSeverity): number {
  switch (severity) {
    case 'info': return 0;
    case 'warning': return 1;
    case 'critical': return 2;
  }
}
