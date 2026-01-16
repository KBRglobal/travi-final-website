/**
 * Alerts Module - Entry Point
 * 
 * TASK 7: Operational Alerting (Human-Safe)
 * 
 * Exports all alert functions and types for:
 * - Alert condition checking
 * - Human-readable alert formatting
 * - Alert history and metrics
 * 
 * Alert Types:
 * - runaway_cost: AI spend > 150% of daily average
 * - degraded_search: Zero-result rate > 20%
 * - ai_fallback_overuse: Fallback rate > 30%
 * - system_overload: RED tier for > 5 minutes
 * 
 * Storage:
 * - Max 100 alerts retained
 * - 24-hour TTL per alert
 * - In-memory only
 * 
 * Integration point for future notification systems:
 * - Email notifications
 * - Slack webhooks
 * - PagerDuty integration
 * - SMS alerts
 */

export {
  type Alert,
  type AlertType,
  type AlertSeverity,
  type AlertThreshold,
  ALERT_THRESHOLDS,
  COOLDOWN_MINUTES,
  MAX_ALERTS_RETAINED,
  ALERT_TTL_HOURS,
  createAlert,
  isAlertConditionMet,
  isAlertExpired,
  getSeverityLevel,
} from './alert-conditions';

export {
  checkAlertConditions,
  formatAlertForHumans,
  getActiveAlerts,
  getAlertsByType,
  getAlertsBySeverity,
  getAlertHistory,
  getCooldownStatus,
  clearCooldowns,
  clearAlerts,
  dismissAlert,
  getAlertMetrics,
  getRedTierDuration,
  type AlertMetrics,
} from './alert-handler';
