/**
 * Alert Handler - Operational Alerting System
 * 
 * TASK 7: Operational Alerting (Human-Safe)
 * 
 * Functions:
 * - checkAlertConditions(): Alert[] - Check all alert conditions
 * - formatAlertForHumans(alert): string - Plain English message
 * - getActiveAlerts(): Alert[] - Get all non-expired alerts
 * 
 * HARD CONSTRAINTS:
 * - 15-minute cooldown per alert type (no spam)
 * - Human-readable messages (no jargon)
 * - Read-only (no auto-remediation)
 * - Max 100 alerts retained
 * - 24-hour TTL for alerts
 */

import { log } from '../../lib/logger';
import { 
  type Alert, 
  type AlertType, 
  type AlertSeverity,
  ALERT_THRESHOLDS,
  COOLDOWN_MINUTES,
  MAX_ALERTS_RETAINED,
  ALERT_TTL_HOURS,
  createAlert,
  isAlertConditionMet,
  isAlertExpired,
  getSeverityLevel,
} from './alert-conditions';
import { getCostAnalytics } from '../../ai-orchestrator/cost-analytics';
import { getTaskGovernance } from '../../ai-orchestrator/task-governance';
import { searchTelemetry } from '../../search/search-telemetry';
import { getLoadTierManager } from '../load-tiers';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AlertHandler] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[AlertHandler] ${msg}`, data),
  audit: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AlertHandler][AUDIT] ${msg}`, data),
};

interface AlertHandlerState {
  cooldowns: Map<AlertType, Date>;
  redTierStartedAt: Date | null;
  alerts: Alert[];
}

const state: AlertHandlerState = {
  cooldowns: new Map(),
  redTierStartedAt: null,
  alerts: [],
};

function pruneExpiredAlerts(): void {
  const before = state.alerts.length;
  state.alerts = state.alerts.filter(alert => !isAlertExpired(alert));
  const removed = before - state.alerts.length;
  
  if (removed > 0) {
    logger.info(`Pruned ${removed} expired alerts`);
  }
}

function enforceMaxAlerts(): void {
  if (state.alerts.length > MAX_ALERTS_RETAINED) {
    const overflow = state.alerts.length - MAX_ALERTS_RETAINED;
    state.alerts = state.alerts.slice(overflow);
    logger.info(`Removed ${overflow} oldest alerts to enforce max limit`);
  }
}

function isOnCooldown(type: AlertType): boolean {
  const lastTriggered = state.cooldowns.get(type);
  if (!lastTriggered) return false;
  
  const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
  const elapsed = Date.now() - lastTriggered.getTime();
  return elapsed < cooldownMs;
}

function setCooldown(type: AlertType): void {
  state.cooldowns.set(type, new Date());
}

function recordAlert(alert: Alert): void {
  state.alerts.push(alert);
  enforceMaxAlerts();
  
  logger.audit('ALERT_TRIGGERED', {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    title: alert.title,
    currentValue: alert.currentValue,
    threshold: alert.threshold,
    expiresAt: alert.expiresAt.toISOString(),
  });
}

function checkRunawayCost(): Alert | null {
  try {
    const costAnalytics = getCostAnalytics();
    const metrics = costAnalytics.getValueMetrics();
    
    if (metrics.totalCostAllTime === 0) return null;
    
    const daysOfData = Math.max(1, 7);
    const dailyAverage = metrics.totalCostAllTime / daysOfData;
    
    if (dailyAverage === 0) return null;
    
    const currentDayRatio = metrics.totalCost24h / dailyAverage;
    
    if (isAlertConditionMet('runaway_cost', currentDayRatio)) {
      return createAlert('runaway_cost', currentDayRatio, {
        currentDailyCost: metrics.totalCost24h,
        dailyAverage,
        percentOfAverage: (currentDayRatio * 100).toFixed(0) + '%',
        topCategories: metrics.costByCategory.slice(0, 3),
      });
    }
  } catch (error) {
    logger.warn('Failed to check runaway cost condition', { error: String(error) });
  }
  return null;
}

function checkDegradedSearch(): Alert | null {
  try {
    const metrics = searchTelemetry.getMetrics();
    
    if (metrics.totalSearches < 10) return null;
    
    const zeroResultRate = metrics.zeroResultRate * 100;
    
    if (isAlertConditionMet('degraded_search', zeroResultRate)) {
      return createAlert('degraded_search', zeroResultRate, {
        totalSearches: metrics.totalSearches,
        zeroResultSearches: Math.round(metrics.totalSearches * metrics.zeroResultRate),
        topZeroResultQueries: metrics.zeroResultQueries.slice(0, 5),
      });
    }
  } catch (error) {
    logger.warn('Failed to check degraded search condition', { error: String(error) });
  }
  return null;
}

function checkAiFallbackOveruse(): Alert | null {
  try {
    const taskGovernance = getTaskGovernance();
    const metrics = taskGovernance.getMetrics();
    
    let totalRequests = 0;
    let totalFallbacks = 0;
    
    for (const [, categoryData] of Object.entries(metrics.categories)) {
      totalRequests += categoryData.usage.totalRequests;
      totalFallbacks += categoryData.usage.fallbacks;
    }
    
    if (totalRequests < 10) return null;
    
    const fallbackRate = (totalFallbacks / totalRequests) * 100;
    
    if (isAlertConditionMet('ai_fallback_overuse', fallbackRate)) {
      return createAlert('ai_fallback_overuse', fallbackRate, {
        totalRequests,
        totalFallbacks,
        fallbackRateFormatted: fallbackRate.toFixed(1) + '%',
        recentFallbacks: metrics.recentFallbacks.slice(0, 5).map(f => ({
          category: f.category,
          reason: f.reason,
          originalProvider: f.originalProvider,
          fallbackProvider: f.fallbackProvider,
        })),
      });
    }
  } catch (error) {
    logger.warn('Failed to check AI fallback condition', { error: String(error) });
  }
  return null;
}

function checkSystemOverload(): Alert | null {
  try {
    const loadTierManager = getLoadTierManager();
    const metrics = loadTierManager.getMetrics();
    
    if (metrics.tier === 'red') {
      if (!state.redTierStartedAt) {
        state.redTierStartedAt = new Date();
      }
      
      const minutesInRed = (Date.now() - state.redTierStartedAt.getTime()) / (60 * 1000);
      
      if (isAlertConditionMet('system_overload', minutesInRed)) {
        return createAlert('system_overload', minutesInRed, {
          currentCapacity: metrics.capacity,
          capacityPercentage: metrics.capacity + '%',
          deferredTaskCount: metrics.state.deferredTaskCount,
          recentDeferrals: metrics.recentDeferrals.slice(0, 5),
        });
      }
    } else {
      state.redTierStartedAt = null;
    }
  } catch (error) {
    logger.warn('Failed to check system overload condition', { error: String(error) });
  }
  return null;
}

export function checkAlertConditions(): Alert[] {
  pruneExpiredAlerts();
  
  const newAlerts: Alert[] = [];
  
  const checkers: Array<{ type: AlertType; check: () => Alert | null }> = [
    { type: 'runaway_cost', check: checkRunawayCost },
    { type: 'degraded_search', check: checkDegradedSearch },
    { type: 'ai_fallback_overuse', check: checkAiFallbackOveruse },
    { type: 'system_overload', check: checkSystemOverload },
  ];
  
  for (const { type, check } of checkers) {
    if (isOnCooldown(type)) {
      logger.info(`Skipping ${type} check - on cooldown`);
      continue;
    }
    
    const alert = check();
    if (alert) {
      setCooldown(type);
      recordAlert(alert);
      newAlerts.push(alert);
      
      logger.warn(`Alert triggered: ${alert.title}`, {
        type: alert.type,
        severity: alert.severity,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
      });
    }
  }
  
  return newAlerts;
}

export function formatAlertForHumans(alert: Alert): string {
  const timeStr = alert.triggeredAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const dateStr = alert.triggeredAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  const severityLabel = alert.severity.toUpperCase();
  
  return [
    `${alert.title}`,
    `Severity: ${severityLabel}`,
    ``,
    `What's happening:`,
    alert.message,
    ``,
    `Current value: ${alert.currentValue.toFixed(1)}${alert.unit}`,
    `Threshold: ${alert.threshold}${alert.unit}`,
    ``,
    `What to do:`,
    alert.suggestedAction,
    ``,
    `Detected: ${dateStr} at ${timeStr}`,
  ].join('\n');
}

export function getActiveAlerts(): Alert[] {
  pruneExpiredAlerts();
  return [...state.alerts].sort((a, b) => {
    const severityDiff = getSeverityLevel(b.severity) - getSeverityLevel(a.severity);
    if (severityDiff !== 0) return severityDiff;
    return b.triggeredAt.getTime() - a.triggeredAt.getTime();
  });
}

export function getAlertsByType(type: AlertType): Alert[] {
  pruneExpiredAlerts();
  return state.alerts.filter(a => a.type === type);
}

export function getAlertsBySeverity(severity: AlertSeverity): Alert[] {
  pruneExpiredAlerts();
  return state.alerts.filter(a => a.severity === severity);
}

export function getAlertHistory(limit: number = 20): Alert[] {
  pruneExpiredAlerts();
  return state.alerts.slice(-limit).reverse();
}

export function getCooldownStatus(): Array<{ type: AlertType; cooldownEndsAt: Date | null; isOnCooldown: boolean }> {
  const result: Array<{ type: AlertType; cooldownEndsAt: Date | null; isOnCooldown: boolean }> = [];
  
  for (const type of Object.keys(ALERT_THRESHOLDS) as AlertType[]) {
    const lastTriggered = state.cooldowns.get(type);
    const onCooldown = isOnCooldown(type);
    
    if (lastTriggered && onCooldown) {
      const cooldownEndsAt = new Date(lastTriggered.getTime() + COOLDOWN_MINUTES * 60 * 1000);
      result.push({ type, cooldownEndsAt, isOnCooldown: true });
    } else {
      result.push({ type, cooldownEndsAt: null, isOnCooldown: false });
    }
  }
  
  return result;
}

export function clearCooldowns(): void {
  state.cooldowns.clear();
  logger.info('All alert cooldowns cleared');
}

export function clearAlerts(): void {
  state.alerts = [];
  logger.info('All alerts cleared');
}

export function dismissAlert(alertId: string): boolean {
  const index = state.alerts.findIndex(a => a.id === alertId);
  if (index !== -1) {
    const alert = state.alerts[index];
    state.alerts.splice(index, 1);
    logger.audit('ALERT_DISMISSED', { alertId, type: alert.type });
    return true;
  }
  return false;
}

export interface AlertMetrics {
  timestamp: string;
  activeAlerts: Alert[];
  alertCount: number;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByType: Record<AlertType, number>;
  cooldownStatus: Array<{ type: AlertType; cooldownEndsAt: string | null; isOnCooldown: boolean }>;
  thresholds: typeof ALERT_THRESHOLDS;
  settings: {
    cooldownMinutes: number;
    maxAlertsRetained: number;
    alertTtlHours: number;
  };
}

export function getAlertMetrics(): AlertMetrics {
  pruneExpiredAlerts();
  
  const activeAlerts = getActiveAlerts();
  
  const alertsBySeverity: Record<AlertSeverity, number> = {
    info: 0,
    warning: 0,
    critical: 0,
  };
  
  const alertsByType: Record<AlertType, number> = {
    runaway_cost: 0,
    degraded_search: 0,
    ai_fallback_overuse: 0,
    system_overload: 0,
  };
  
  for (const alert of activeAlerts) {
    alertsBySeverity[alert.severity]++;
    alertsByType[alert.type]++;
  }
  
  const cooldownStatus = getCooldownStatus().map(c => ({
    type: c.type,
    cooldownEndsAt: c.cooldownEndsAt?.toISOString() || null,
    isOnCooldown: c.isOnCooldown,
  }));
  
  return {
    timestamp: new Date().toISOString(),
    activeAlerts,
    alertCount: activeAlerts.length,
    alertsBySeverity,
    alertsByType,
    cooldownStatus,
    thresholds: ALERT_THRESHOLDS,
    settings: {
      cooldownMinutes: COOLDOWN_MINUTES,
      maxAlertsRetained: MAX_ALERTS_RETAINED,
      alertTtlHours: ALERT_TTL_HOURS,
    },
  };
}

export function getRedTierDuration(): number | null {
  if (!state.redTierStartedAt) return null;
  return (Date.now() - state.redTierStartedAt.getTime()) / (60 * 1000);
}
