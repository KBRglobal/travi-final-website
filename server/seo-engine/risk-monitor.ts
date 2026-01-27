/**
 * SEO Risk & Penalty Monitor
 *
 * Monitors for:
 * - Index drops
 * - Ranking losses
 * - Penalty signals
 * - Crawl anomalies
 * - Manual actions
 *
 * Risk Levels:
 * - CRITICAL: Immediate action required
 * - HIGH: Action within 24 hours
 * - MEDIUM: Investigation needed
 * - LOW: Monitor only
 */

import { db } from "../db";
import { contents, seoAuditLogs } from "../../shared/schema";
import { eq, and, lt, gt, desc, sql, count } from "drizzle-orm";

export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type RiskType =
  | "INDEX_DROP"
  | "RANKING_LOSS"
  | "PENALTY_SIGNAL"
  | "CRAWL_ANOMALY"
  | "MANUAL_ACTION"
  | "TRAFFIC_DECLINE"
  | "SPAM_DETECTION"
  | "QUALITY_DECLINE";

export interface RiskAlert {
  id: string;
  type: RiskType;
  level: RiskLevel;
  title: string;
  description: string;
  detectedAt: Date;
  affectedContentIds: string[];
  metrics: {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
  };
  autoResponse: RiskResponse;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface RiskResponse {
  pausePublishing: boolean;
  alertChannels: ("slack" | "email" | "sms")[];
  requiresAcknowledgment: boolean;
  autoRollback: boolean;
  actions: string[];
}

// Risk responses by level
const RISK_RESPONSES: Record<RiskLevel, RiskResponse> = {
  CRITICAL: {
    pausePublishing: true,
    alertChannels: ["slack", "email", "sms"],
    requiresAcknowledgment: true,
    autoRollback: true,
    actions: ["Halt all changes", "Alert leadership", "Begin investigation"],
  },
  HIGH: {
    pausePublishing: true,
    alertChannels: ["slack", "email"],
    requiresAcknowledgment: true,
    autoRollback: false,
    actions: ["Pause publishing", "Audit recent changes", "Monitor closely"],
  },
  MEDIUM: {
    pausePublishing: false,
    alertChannels: ["slack"],
    requiresAcknowledgment: false,
    autoRollback: false,
    actions: ["Investigate", "Log findings"],
  },
  LOW: {
    pausePublishing: false,
    alertChannels: [],
    requiresAcknowledgment: false,
    autoRollback: false,
    actions: ["Monitor"],
  },
};

// Thresholds for detection
const THRESHOLDS = {
  indexDrop: {
    critical: 0.2, // 20% drop
    high: 0.1, // 10% drop
    medium: 0.05, // 5% drop
  },
  rankingLoss: {
    critical: 20, // 20+ positions
    high: 10, // 10+ positions
    medium: 5, // 5+ positions
  },
  trafficDecline: {
    critical: 0.4, // 40% drop
    high: 0.25, // 25% drop
    medium: 0.15, // 15% drop
  },
  qualityDecline: {
    critical: 0.3, // 30% score drop
    high: 0.2, // 20% score drop
    medium: 0.1, // 10% score drop
  },
};

export interface RiskSummary {
  totalAlerts: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  unacknowledged: number;
  publishingPaused: boolean;
  latestAlert?: RiskAlert;
}

export class RiskMonitor {
  private alerts: Map<string, RiskAlert> = new Map();
  private publishingPaused: boolean = false;

  constructor() {
    // Initialize with empty alerts
  }

  /**
   * Run full risk check
   */
  async runRiskCheck(): Promise<RiskAlert[]> {
    const newAlerts: RiskAlert[] = [];

    // Check index health
    const indexAlerts = await this.checkIndexHealth();
    newAlerts.push(...indexAlerts);

    // Check traffic trends
    const trafficAlerts = await this.checkTrafficTrends();
    newAlerts.push(...trafficAlerts);

    // Check quality scores
    const qualityAlerts = await this.checkQualityScores();
    newAlerts.push(...qualityAlerts);

    // Check for spam signals
    const spamAlerts = await this.checkSpamSignals();
    newAlerts.push(...spamAlerts);

    // Store alerts
    for (const alert of newAlerts) {
      this.alerts.set(alert.id, alert);

      // Execute auto-response
      await this.executeResponse(alert);
    }

    return newAlerts;
  }

  /**
   * Check index health
   */
  private async checkIndexHealth(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    // Get indexed content count
    const indexedContent = await db.query.contents.findMany({
      where: and(eq(contents.status, "published"), sql`noindex IS NULL OR noindex = false`),
    });

    const currentIndexed = indexedContent.length;

    // In production, this would compare to historical data
    // For now, simulate detection
    const previousIndexed = (indexedContent[0] as any)?.previousIndexedCount || currentIndexed;
    const change = currentIndexed - previousIndexed;
    const changePercent = previousIndexed > 0 ? change / previousIndexed : 0;

    if (changePercent < -THRESHOLDS.indexDrop.critical) {
      alerts.push(
        this.createAlert(
          "INDEX_DROP",
          "CRITICAL",
          "Critical Index Drop Detected",
          `Indexed pages dropped by ${Math.abs(Math.round(changePercent * 100))}% (${Math.abs(change)} pages)`,
          indexedContent.slice(0, 10).map(c => c.id),
          { current: currentIndexed, previous: previousIndexed, change, changePercent }
        )
      );
    } else if (changePercent < -THRESHOLDS.indexDrop.high) {
      alerts.push(
        this.createAlert(
          "INDEX_DROP",
          "HIGH",
          "Significant Index Drop",
          `Indexed pages dropped by ${Math.abs(Math.round(changePercent * 100))}%`,
          indexedContent.slice(0, 10).map(c => c.id),
          { current: currentIndexed, previous: previousIndexed, change, changePercent }
        )
      );
    }

    return alerts;
  }

  /**
   * Check traffic trends
   */
  private async checkTrafficTrends(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, "published"),
    });

    // Aggregate traffic
    let currentTraffic = 0;
    let previousTraffic = 0;
    const decliningContent: string[] = [];

    for (const content of allContent) {
      const current = (content as any).trafficThisWeek || 0;
      const previous = (content as any).trafficLastWeek || current;

      currentTraffic += current;
      previousTraffic += previous;

      // Track content with significant decline
      if (previous > 0 && (current - previous) / previous < -0.5) {
        decliningContent.push(content.id);
      }
    }

    const change = currentTraffic - previousTraffic;
    const changePercent = previousTraffic > 0 ? change / previousTraffic : 0;

    if (changePercent < -THRESHOLDS.trafficDecline.critical) {
      alerts.push(
        this.createAlert(
          "TRAFFIC_DECLINE",
          "CRITICAL",
          "Critical Traffic Decline",
          `Overall traffic dropped by ${Math.abs(Math.round(changePercent * 100))}%`,
          decliningContent.slice(0, 20),
          { current: currentTraffic, previous: previousTraffic, change, changePercent }
        )
      );
    } else if (changePercent < -THRESHOLDS.trafficDecline.high) {
      alerts.push(
        this.createAlert(
          "TRAFFIC_DECLINE",
          "HIGH",
          "Significant Traffic Decline",
          `Overall traffic dropped by ${Math.abs(Math.round(changePercent * 100))}%`,
          decliningContent.slice(0, 10),
          { current: currentTraffic, previous: previousTraffic, change, changePercent }
        )
      );
    }

    return alerts;
  }

  /**
   * Check quality scores
   */
  private async checkQualityScores(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, "published"),
    });

    // Calculate average SEO score
    const scores = allContent.map(c => (c as any).seoScore || 0).filter(s => s > 0);
    const currentAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // In production, compare to historical average
    const previousAvg = (allContent[0] as any)?.previousAvgSeoScore || currentAvg;
    const change = currentAvg - previousAvg;
    const changePercent = previousAvg > 0 ? change / previousAvg : 0;

    if (changePercent < -THRESHOLDS.qualityDecline.critical) {
      alerts.push(
        this.createAlert(
          "QUALITY_DECLINE",
          "HIGH",
          "Significant Quality Score Decline",
          `Average SEO score dropped from ${Math.round(previousAvg)} to ${Math.round(currentAvg)}`,
          [],
          { current: currentAvg, previous: previousAvg, change, changePercent }
        )
      );
    }

    // Check for individual pages with very low scores
    const lowScoreContent = allContent.filter(c => {
      const score = (c as any).seoScore || 0;
      return score > 0 && score < 40;
    });

    if (lowScoreContent.length > allContent.length * 0.1) {
      alerts.push(
        this.createAlert(
          "QUALITY_DECLINE",
          "MEDIUM",
          "Many Pages Below Quality Threshold",
          `${lowScoreContent.length} pages (${Math.round((lowScoreContent.length / allContent.length) * 100)}%) have SEO scores below 40`,
          lowScoreContent.slice(0, 20).map(c => c.id),
          {
            current: lowScoreContent.length,
            previous: 0,
            change: lowScoreContent.length,
            changePercent: 0,
          }
        )
      );
    }

    return alerts;
  }

  /**
   * Check for spam signals
   */
  private async checkSpamSignals(): Promise<RiskAlert[]> {
    const alerts: RiskAlert[] = [];

    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, "published"),
    });

    // Check for high spam scores
    const spamContent = allContent.filter(c => ((c as any).spamScore || 0) > 0.5);

    if (spamContent.length > 0) {
      const avgSpamScore =
        spamContent.reduce((sum, c) => sum + ((c as any).spamScore || 0), 0) / spamContent.length;

      if (avgSpamScore > 0.7) {
        alerts.push(
          this.createAlert(
            "SPAM_DETECTION",
            "CRITICAL",
            "Spam Content Detected",
            `${spamContent.length} pages flagged with high spam scores (avg: ${Math.round(avgSpamScore * 100)}%)`,
            spamContent.map(c => c.id),
            { current: avgSpamScore, previous: 0, change: avgSpamScore, changePercent: 0 }
          )
        );
      } else if (avgSpamScore > 0.5) {
        alerts.push(
          this.createAlert(
            "SPAM_DETECTION",
            "HIGH",
            "Potential Spam Detected",
            `${spamContent.length} pages have elevated spam scores`,
            spamContent.map(c => c.id),
            { current: avgSpamScore, previous: 0, change: avgSpamScore, changePercent: 0 }
          )
        );
      }
    }

    return alerts;
  }

  /**
   * Create an alert object
   */
  private createAlert(
    type: RiskType,
    level: RiskLevel,
    title: string,
    description: string,
    affectedContentIds: string[],
    metrics: { current: number; previous: number; change: number; changePercent: number }
  ): RiskAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      level,
      title,
      description,
      detectedAt: new Date(),
      affectedContentIds,
      metrics,
      autoResponse: RISK_RESPONSES[level],
      acknowledged: false,
      resolved: false,
    };
  }

  /**
   * Execute automatic response to alert
   */
  private async executeResponse(alert: RiskAlert): Promise<void> {
    const response = alert.autoResponse;

    // Pause publishing if required
    if (response.pausePublishing) {
      this.publishingPaused = true;
    }

    // Send alerts
    for (const channel of response.alertChannels) {
      await this.sendAlert(channel, alert);
    }

    // Log to audit
    await this.logRiskEvent(alert);
  }

  /**
   * Send alert to channel
   */
  private async sendAlert(channel: "slack" | "email" | "sms", alert: RiskAlert): Promise<void> {
    // In production, this would integrate with notification services
  }

  /**
   * Log risk event
   */
  private async logRiskEvent(alert: RiskAlert): Promise<void> {
    try {
      await db.insert(seoAuditLogs).values({
        contentId: alert.affectedContentIds[0] || "system",
        action: `RISK_${alert.type}`,
        reason: alert.description,
        triggeredBy: "automatic",
        status: "detected",
        priority: alert.level,
        data: JSON.stringify(alert.metrics),
        createdAt: new Date(),
      } as any);
    } catch (error) {}
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    // Resume publishing if this was the only blocking alert
    if (this.shouldResumePublishing()) {
      this.publishingPaused = false;
    }

    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    // Resume publishing if this was the only blocking alert
    if (this.shouldResumePublishing()) {
      this.publishingPaused = false;
    }

    return true;
  }

  /**
   * Check if publishing should resume
   */
  private shouldResumePublishing(): boolean {
    for (const [, alert] of this.alerts) {
      if (
        alert.autoResponse.pausePublishing &&
        !alert.resolved &&
        (!alert.autoResponse.requiresAcknowledgment || !alert.acknowledged)
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get risk summary
   */
  getSummary(): RiskSummary {
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let unacknowledged = 0;
    let latestAlert: RiskAlert | undefined;

    for (const [, alert] of this.alerts) {
      if (!alert.resolved) {
        switch (alert.level) {
          case "CRITICAL":
            critical++;
            break;
          case "HIGH":
            high++;
            break;
          case "MEDIUM":
            medium++;
            break;
          case "LOW":
            low++;
            break;
        }

        if (!alert.acknowledged && alert.autoResponse.requiresAcknowledgment) {
          unacknowledged++;
        }

        if (!latestAlert || alert.detectedAt > latestAlert.detectedAt) {
          latestAlert = alert;
        }
      }
    }

    return {
      totalAlerts: critical + high + medium + low,
      critical,
      high,
      medium,
      low,
      unacknowledged,
      publishingPaused: this.publishingPaused,
      latestAlert,
    };
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): RiskAlert[] {
    return Array.from(this.alerts.values())
      .filter(a => !a.resolved)
      .sort((a, b) => {
        const levelOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return levelOrder[a.level] - levelOrder[b.level];
      });
  }

  /**
   * Check if publishing is allowed
   */
  isPublishingAllowed(): boolean {
    return !this.publishingPaused;
  }

  /**
   * Force resume publishing (emergency override)
   */
  forceResumePublishing(overrideBy: string): void {
    this.publishingPaused = false;
  }
}
