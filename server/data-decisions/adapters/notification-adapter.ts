/**
 * Notification Adapter
 * Sends alerts and notifications for decisions (log-only if notifications not ready)
 */

import type { Decision, DecisionType } from '../types';
import { BaseAdapter } from './base-adapter';
import type { AdapterConfig, NotificationPayload } from './types';

// =============================================================================
// NOTIFICATION CONFIG
// =============================================================================

interface NotificationConfig extends AdapterConfig {
  defaultChannel: 'email' | 'slack' | 'webhook' | 'log';
  logOnly: boolean; // If true, only logs (no external notifications)
  recipientMapping: Record<string, string[]>;
}

const DEFAULT_NOTIFICATION_CONFIG: Partial<NotificationConfig> = {
  defaultChannel: 'log',
  logOnly: true, // Safe default
  recipientMapping: {
    'ops-critical': ['ops-team@example.com'],
    'ops-lead': ['ops-lead@example.com'],
    'seo-lead': ['seo-lead@example.com'],
    'content-lead': ['content-lead@example.com'],
    'finance-lead': ['finance@example.com'],
    'finance-ops': ['finance-ops@example.com'],
    'product-lead': ['product-lead@example.com'],
    'data-lead': ['data-lead@example.com'],
    'exec': ['exec@example.com'],
    'engineering': ['engineering@example.com'],
  },
};

// =============================================================================
// NOTIFICATION ADAPTER
// =============================================================================

export class NotificationAdapter extends BaseAdapter {
  readonly id = 'notification-adapter';
  readonly name = 'Notification Adapter';
  readonly supportedActions: DecisionType[] = [
    'ESCALATE_TO_HUMAN',
    'LOG_AND_MONITOR',
    'EXECUTE_IMMEDIATE_ACTION',
  ];

  private notificationConfig: NotificationConfig;
  private notificationLog: Array<{
    timestamp: Date;
    payload: NotificationPayload;
    sent: boolean;
    channel: string;
  }> = [];

  constructor(
    config: Partial<NotificationConfig> = {},
    adapterConfig: Partial<AdapterConfig> = {}
  ) {
    super({ ...adapterConfig, dryRunByDefault: false }); // Notifications are safe to send
    this.notificationConfig = {
      ...DEFAULT_NOTIFICATION_CONFIG,
      ...config,
    } as NotificationConfig;
  }

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================

  protected async performHealthCheck(): Promise<boolean> {
    // Log-only mode is always healthy
    if (this.notificationConfig.logOnly) {
      return true;
    }

    // In production, check notification service health
    return true;
  }

  // =========================================================================
  // EXECUTION
  // =========================================================================

  protected async executeAction(decision: Decision): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    const payload = this.buildPayload(decision);

    console.log(`[Notification Adapter] Sending notification:`, {
      title: payload.title,
      recipients: payload.recipients,
      channel: payload.channel,
      priority: payload.priority,
    });

    if (this.notificationConfig.logOnly) {
      return this.logNotification(payload);
    }

    return this.sendNotification(payload);
  }

  protected async executeDryRun(decision: Decision): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    const payload = this.buildPayload(decision);

    console.log(`[Notification Adapter] Dry run notification:`, payload);

    return {
      success: true,
      affectedResources: payload.recipients,
      changes: {
        wouldSend: true,
        payload,
      },
    };
  }

  // =========================================================================
  // PAYLOAD BUILDING
  // =========================================================================

  private buildPayload(decision: Decision): NotificationPayload {
    const recipients = this.resolveRecipients(decision);
    const priority = this.mapPriority(decision);
    const channel = this.determineChannel(decision);

    return {
      recipients,
      channel,
      priority,
      title: this.formatTitle(decision),
      body: this.formatBody(decision),
      metadata: {
        decisionId: decision.id,
        decisionType: decision.type,
        authority: decision.authority,
        confidence: decision.confidence,
        signal: decision.signal,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private resolveRecipients(decision: Decision): string[] {
    const recipients: Set<string> = new Set();

    // Add escalation recipients
    if (decision.escalation) {
      const primary = this.notificationConfig.recipientMapping[decision.escalation.primary];
      if (primary) {
        primary.forEach(r => recipients.add(r));
      }

      if (decision.escalation.secondary) {
        const secondary = this.notificationConfig.recipientMapping[decision.escalation.secondary];
        if (secondary) {
          secondary.forEach(r => recipients.add(r));
        }
      }
    }

    // Add domain-based recipients
    const domain = decision.signal.metricId.split('.')[0];
    const domainRecipients = this.notificationConfig.recipientMapping[`${domain}-lead`];
    if (domainRecipients) {
      domainRecipients.forEach(r => recipients.add(r));
    }

    // Default recipient if none found
    if (recipients.size === 0) {
      recipients.add('ops-team@example.com');
    }

    return Array.from(recipients);
  }

  private mapPriority(decision: Decision): 'low' | 'normal' | 'high' | 'urgent' {
    if (decision.escalation?.channel === 'urgent') return 'urgent';
    if (decision.escalation?.channel === 'high') return 'high';
    if (decision.authority === 'blocking') return 'urgent';
    if (decision.authority === 'escalating') return 'high';
    return 'normal';
  }

  private determineChannel(decision: Decision): 'email' | 'slack' | 'webhook' | 'log' {
    if (this.notificationConfig.logOnly) return 'log';

    // Urgent goes to Slack
    if (decision.escalation?.channel === 'urgent') return 'slack';

    return this.notificationConfig.defaultChannel;
  }

  private formatTitle(decision: Decision): string {
    const prefix = this.getPriorityPrefix(decision);
    const action = this.humanizeAction(decision.type);

    return `${prefix}${action}`;
  }

  private getPriorityPrefix(decision: Decision): string {
    if (decision.authority === 'blocking') return '🚨 CRITICAL: ';
    if (decision.authority === 'escalating') return '⚠️ ATTENTION: ';
    return '📊 ';
  }

  private humanizeAction(actionType: DecisionType): string {
    const mapping: Partial<Record<DecisionType, string>> = {
      ESCALATE_TO_HUMAN: 'Decision Requires Human Review',
      LOG_AND_MONITOR: 'Anomaly Detected - Monitoring',
      EXECUTE_IMMEDIATE_ACTION: 'Immediate Action Required',
      BLOCK_PUBLISH: 'Content Publish Blocked',
      BLOCK_ALL_DEPLOYMENTS: 'All Deployments Blocked',
      FREEZE_AUTOMATION: 'Automation Frozen',
      ROLLBACK_CHANGES: 'Rollback Initiated',
    };

    return mapping[actionType] || actionType.replace(/_/g, ' ');
  }

  private formatBody(decision: Decision): string {
    const lines: string[] = [];

    // What happened
    lines.push('## What Happened');
    lines.push(`The system detected a condition requiring attention.`);
    lines.push('');

    // Signal details
    lines.push('## Signal');
    lines.push(`- **Metric:** ${decision.signal.metricId}`);
    lines.push(`- **Value:** ${decision.signal.value}`);
    lines.push(`- **Condition:** ${decision.signal.condition}`);
    lines.push(`- **Threshold:** ${decision.signal.threshold}`);
    lines.push('');

    // Decision details
    lines.push('## Decision');
    lines.push(`- **Type:** ${decision.type}`);
    lines.push(`- **Authority:** ${decision.authority}`);
    lines.push(`- **Confidence:** ${decision.confidence}%`);
    lines.push(`- **Decision ID:** ${decision.id}`);
    lines.push('');

    // Required action
    lines.push('## Required Action');
    lines.push(this.getRequiredAction(decision));
    lines.push('');

    // SLA if applicable
    if (decision.escalation?.sla) {
      lines.push('## SLA');
      lines.push(`Response required within: ${decision.escalation.sla}`);
      lines.push('');
    }

    // Impacted entities
    if (decision.impactedEntities.length > 0) {
      lines.push('## Impacted Resources');
      for (const entity of decision.impactedEntities) {
        lines.push(`- ${entity.type}: ${entity.id}`);
      }
    }

    return lines.join('\n');
  }

  private getRequiredAction(decision: Decision): string {
    switch (decision.type) {
      case 'ESCALATE_TO_HUMAN':
        return 'Please review this decision and approve or reject it in the decision queue.';
      case 'LOG_AND_MONITOR':
        return 'No immediate action required. The system is monitoring the situation.';
      case 'EXECUTE_IMMEDIATE_ACTION':
        return 'Immediate attention required. Review and take action.';
      default:
        return `Review the ${decision.type} decision and confirm the outcome.`;
    }
  }

  // =========================================================================
  // NOTIFICATION SENDING
  // =========================================================================

  private async logNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    // Log-only mode: just record the notification
    console.log('='.repeat(60));
    console.log('[NOTIFICATION]', payload.title);
    console.log('-'.repeat(60));
    console.log('To:', payload.recipients.join(', '));
    console.log('Priority:', payload.priority);
    console.log('-'.repeat(60));
    console.log(payload.body);
    console.log('='.repeat(60));

    this.notificationLog.push({
      timestamp: new Date(),
      payload,
      sent: true,
      channel: 'log',
    });

    return {
      success: true,
      affectedResources: payload.recipients,
      changes: {
        logged: true,
        channel: 'log',
        recipients: payload.recipients,
      },
    };
  }

  private async sendNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    affectedResources?: string[];
    changes?: Record<string, unknown>;
  }> {
    // In production, this would send actual notifications
    // For now, simulate sending

    await this.delay(100);

    this.notificationLog.push({
      timestamp: new Date(),
      payload,
      sent: true,
      channel: payload.channel,
    });

    return {
      success: true,
      affectedResources: payload.recipients,
      changes: {
        sent: true,
        channel: payload.channel,
        recipients: payload.recipients,
        messageId: `msg-${Date.now()}`,
      },
    };
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  getNotificationLog(limit = 50): typeof this.notificationLog {
    return this.notificationLog.slice(-limit);
  }

  setLogOnly(logOnly: boolean): void {
    this.notificationConfig.logOnly = logOnly;
  }

  setDefaultChannel(channel: 'email' | 'slack' | 'webhook' | 'log'): void {
    this.notificationConfig.defaultChannel = channel;
  }

  addRecipientMapping(group: string, recipients: string[]): void {
    this.notificationConfig.recipientMapping[group] = recipients;
  }
}

// Singleton instance
export const notificationAdapter = new NotificationAdapter();
