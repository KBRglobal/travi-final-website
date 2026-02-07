/**
 * Security Event Intelligence Engine
 *
 * Real-time correlation and anomaly detection:
 * - Behavioral baselines
 * - Attack pattern recognition
 * - Cross-event correlation
 * - Threat scoring
 * - Automated alerting
 */

import { SecurityEventType } from "../../governance/types";

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityAnomaly {
  id: string;
  type: AnomalyType;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number; // 0-1
  timestamp: Date;
  userId?: string;
  description: string;
  relatedEvents: string[];
  indicators: AnomalyIndicator[];
  suggestedActions: string[];
}

export type AnomalyType =
  | "brute_force"
  | "privilege_escalation"
  | "data_exfiltration"
  | "impossible_travel"
  | "off_hours_activity"
  | "unusual_resource_access"
  | "mass_modification"
  | "permission_probing"
  | "lateral_movement"
  | "credential_stuffing"
  | "session_hijacking"
  | "insider_threat";

export interface AnomalyIndicator {
  name: string;
  value: number;
  threshold: number;
  description: string;
}

export interface BehavioralBaseline {
  userId: string;
  period: "daily" | "weekly";
  metrics: {
    avgLoginHour: number;
    loginHourStdDev: number;
    avgActionsPerSession: number;
    commonResources: string[];
    commonActions: string[];
    commonIPs: string[];
    avgSessionDurationMs: number;
  };
  lastUpdated: Date;
}

export interface ThreatScore {
  userId: string;
  score: number; // 0-100
  factors: ThreatFactor[];
  trend: "increasing" | "stable" | "decreasing";
  lastUpdated: Date;
}

export interface ThreatFactor {
  name: string;
  weight: number;
  value: number;
  description: string;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  pattern: EventPattern[];
  timeWindowMs: number;
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
  anomalyType: AnomalyType;
}

export interface EventPattern {
  eventType: SecurityEventType;
  count?: number;
  operator?: "gte" | "lte" | "eq";
  sameUser?: boolean;
  sameResource?: boolean;
  sameIP?: boolean;
}

// ============================================================================
// CORRELATION RULES
// ============================================================================

const CORRELATION_RULES: CorrelationRule[] = [
  {
    id: "brute_force_login",
    name: "Brute Force Login Attempt",
    description: "Multiple failed logins followed by success",
    pattern: [
      { eventType: "login_failure", count: 5, operator: "gte", sameUser: true },
      { eventType: "login_success", count: 1, sameUser: true },
    ],
    timeWindowMs: 5 * 60 * 1000, // 5 minutes
    threshold: 1,
    severity: "high",
    anomalyType: "brute_force",
  },
  {
    id: "credential_stuffing",
    name: "Credential Stuffing Attack",
    description: "Multiple failed logins from same IP for different users",
    pattern: [{ eventType: "login_failure", count: 10, operator: "gte", sameIP: true }],
    timeWindowMs: 10 * 60 * 1000,
    threshold: 1,
    severity: "critical",
    anomalyType: "credential_stuffing",
  },
  {
    id: "privilege_escalation",
    name: "Privilege Escalation Attempt",
    description: "User role changed followed by sensitive operations",
    pattern: [
      { eventType: "role_assigned", count: 1, sameUser: true },
      { eventType: "role_modification" as any, count: 1, sameUser: true },
    ],
    timeWindowMs: 60 * 60 * 1000, // 1 hour
    threshold: 1,
    severity: "critical",
    anomalyType: "privilege_escalation",
  },
  {
    id: "permission_probing",
    name: "Permission Probing",
    description: "Multiple permission denied events",
    pattern: [{ eventType: "permission_denied", count: 10, operator: "gte", sameUser: true }],
    timeWindowMs: 10 * 60 * 1000,
    threshold: 1,
    severity: "medium",
    anomalyType: "permission_probing",
  },
  {
    id: "mass_deletion",
    name: "Mass Deletion",
    description: "Large number of delete operations",
    pattern: [{ eventType: "content_deleted" as any, count: 10, operator: "gte", sameUser: true }],
    timeWindowMs: 5 * 60 * 1000,
    threshold: 1,
    severity: "high",
    anomalyType: "mass_modification",
  },
  {
    id: "bulk_export",
    name: "Bulk Data Export",
    description: "Large data export operation",
    pattern: [{ eventType: "data_export" as any, count: 5, operator: "gte", sameUser: true }],
    timeWindowMs: 60 * 60 * 1000,
    threshold: 1,
    severity: "high",
    anomalyType: "data_exfiltration",
  },
  {
    id: "session_hijack",
    name: "Session Hijacking Suspected",
    description: "Same session from multiple IPs",
    pattern: [{ eventType: "resource_accessed" as any, count: 2, operator: "gte", sameUser: true }],
    timeWindowMs: 5 * 60 * 1000,
    threshold: 1,
    severity: "critical",
    anomalyType: "session_hijacking",
  },
];

// ============================================================================
// EVENT BUFFER
// ============================================================================

interface BufferedEvent {
  id: string;
  type: SecurityEventType;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  sessionId?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

class EventBuffer {
  private events: BufferedEvent[] = [];
  private readonly maxSize = 50000;
  private readonly retentionMs = 24 * 60 * 60 * 1000; // 24 hours

  add(event: BufferedEvent): void {
    this.events.push(event);
    this.cleanup();
  }

  getEvents(filter: {
    userId?: string;
    type?: SecurityEventType;
    ipAddress?: string;
    since?: Date;
  }): BufferedEvent[] {
    let filtered = this.events;

    if (filter.since) {
      filtered = filtered.filter(e => e.timestamp >= filter.since!);
    }
    if (filter.userId) {
      filtered = filtered.filter(e => e.userId === filter.userId);
    }
    if (filter.type) {
      filtered = filtered.filter(e => e.type === filter.type);
    }
    if (filter.ipAddress) {
      filtered = filtered.filter(e => e.ipAddress === filter.ipAddress);
    }

    return filtered;
  }

  getEventsByIP(ip: string, windowMs: number): BufferedEvent[] {
    const since = new Date(Date.now() - windowMs);
    return this.events.filter(e => e.ipAddress === ip && e.timestamp >= since);
  }

  getEventsByUser(userId: string, windowMs: number): BufferedEvent[] {
    const since = new Date(Date.now() - windowMs);
    return this.events.filter(e => e.userId === userId && e.timestamp >= since);
  }

  getUniqueIPsForUser(userId: string, windowMs: number): string[] {
    const events = this.getEventsByUser(userId, windowMs);
    return [...new Set(events.map(e => e.ipAddress).filter(Boolean) as string[])];
  }

  private cleanup(): void {
    const cutoff = new Date(Date.now() - this.retentionMs);
    this.events = this.events.filter(e => e.timestamp >= cutoff);

    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-this.maxSize);
    }
  }
}

const eventBuffer = new EventBuffer();

// ============================================================================
// BEHAVIORAL BASELINE
// ============================================================================

class BaselineManager {
  private readonly baselines: Map<string, BehavioralBaseline> = new Map();

  updateBaseline(userId: string, events: BufferedEvent[]): void {
    if (events.length < 10) return; // Need minimum events

    const loginEvents = events.filter(e => ["login_success"].includes(e.type));
    const actionEvents = events.filter(
      e => !["login_success", "login_failure", "logout"].includes(e.type)
    );

    // Calculate login hour average
    const loginHours = loginEvents.map(e => e.timestamp.getHours());
    const avgLoginHour = loginHours.reduce((a, b) => a + b, 0) / loginHours.length || 12;
    const loginHourVariance =
      loginHours.reduce((sum, h) => sum + Math.pow(h - avgLoginHour, 2), 0) / loginHours.length;
    const loginHourStdDev = Math.sqrt(loginHourVariance);

    // Common resources
    const resourceCounts = new Map<string, number>();
    for (const e of actionEvents) {
      const key = `${e.resourceType}:${e.resourceId}`;
      resourceCounts.set(key, (resourceCounts.get(key) || 0) + 1);
    }
    const commonResources = [...resourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([r]) => r);

    // Common actions
    const actionCounts = new Map<string, number>();
    for (const e of actionEvents) {
      actionCounts.set(e.type, (actionCounts.get(e.type) || 0) + 1);
    }
    const commonActions = [...actionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([a]) => a);

    // Common IPs
    const ipCounts = new Map<string, number>();
    for (const e of events) {
      if (e.ipAddress) {
        ipCounts.set(e.ipAddress, (ipCounts.get(e.ipAddress) || 0) + 1);
      }
    }
    const commonIPs = [...ipCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip]) => ip);

    this.baselines.set(userId, {
      userId,
      period: "daily",
      metrics: {
        avgLoginHour,
        loginHourStdDev,
        avgActionsPerSession: actionEvents.length / Math.max(loginEvents.length, 1),
        commonResources,
        commonActions,
        commonIPs,
        avgSessionDurationMs: 0, // Would calculate from session data
      },
      lastUpdated: new Date(),
    });
  }

  getBaseline(userId: string): BehavioralBaseline | undefined {
    return this.baselines.get(userId);
  }

  checkDeviation(userId: string, event: BufferedEvent): AnomalyIndicator[] {
    const baseline = this.baselines.get(userId);
    if (!baseline) return [];

    const indicators: AnomalyIndicator[] = [];

    // Check login hour deviation
    if (event.type === "login_success") {
      const hour = event.timestamp.getHours();
      const deviation = Math.abs(hour - baseline.metrics.avgLoginHour);
      const stdDevs = deviation / (baseline.metrics.loginHourStdDev || 1);

      if (stdDevs > 2) {
        indicators.push({
          name: "login_hour_deviation",
          value: stdDevs,
          threshold: 2,
          description: `Login at unusual hour (${hour}:00, normally ~${Math.round(baseline.metrics.avgLoginHour)}:00)`,
        });
      }
    }

    // Check IP deviation
    if (event.ipAddress && !baseline.metrics.commonIPs.includes(event.ipAddress)) {
      indicators.push({
        name: "new_ip_address",
        value: 1,
        threshold: 0,
        description: `Access from new IP: ${event.ipAddress}`,
      });
    }

    // Check unusual resource access
    if (event.resourceType && event.resourceId) {
      const resourceKey = `${event.resourceType}:${event.resourceId}`;
      if (!baseline.metrics.commonResources.includes(resourceKey)) {
        indicators.push({
          name: "unusual_resource",
          value: 1,
          threshold: 0,
          description: `Access to unusual resource: ${resourceKey}`,
        });
      }
    }

    // Check unusual action
    if (!baseline.metrics.commonActions.includes(event.type)) {
      indicators.push({
        name: "unusual_action",
        value: 1,
        threshold: 0,
        description: `Unusual action type: ${event.type}`,
      });
    }

    return indicators;
  }
}

const baselineManager = new BaselineManager();

// ============================================================================
// THREAT SCORING
// ============================================================================

class ThreatScorer {
  private readonly scores: Map<string, ThreatScore> = new Map();
  private readonly decayRate = 0.95; // Score decays by 5% per hour

  updateScore(userId: string, anomaly: SecurityAnomaly): void {
    const current = this.scores.get(userId) || {
      userId,
      score: 0,
      factors: [],
      trend: "stable" as const,
      lastUpdated: new Date(),
    };

    // Apply decay
    const hoursSinceUpdate = (Date.now() - current.lastUpdated.getTime()) / (60 * 60 * 1000);
    const decayedScore = current.score * Math.pow(this.decayRate, hoursSinceUpdate);

    // Add new score based on anomaly
    let addition = 0;
    switch (anomaly.severity) {
      case "critical":
        addition = 30;
        break;
      case "high":
        addition = 20;
        break;
      case "medium":
        addition = 10;
        break;
      case "low":
        addition = 5;
        break;
    }

    const newScore = Math.min(100, decayedScore + addition * anomaly.confidence);

    // Update factors
    const factors = [...current.factors];
    factors.push({
      name: anomaly.type,
      weight: addition,
      value: anomaly.confidence,
      description: anomaly.description,
    });

    // Keep only recent factors
    if (factors.length > 20) {
      factors.shift();
    }

    // Determine trend
    let trend: "increasing" | "stable" | "decreasing" = "stable";
    if (newScore > current.score + 5) {
      trend = "increasing";
    } else if (newScore < current.score - 5) {
      trend = "decreasing";
    }

    this.scores.set(userId, {
      userId,
      score: newScore,
      factors,
      trend,
      lastUpdated: new Date(),
    });
  }

  getScore(userId: string): ThreatScore | undefined {
    return this.scores.get(userId);
  }

  getHighRiskUsers(threshold: number = 50): ThreatScore[] {
    return [...this.scores.values()]
      .filter(s => s.score >= threshold)
      .sort((a, b) => b.score - a.score);
  }
}

const threatScorer = new ThreatScorer();

// ============================================================================
// CORRELATION ENGINE
// ============================================================================

class CorrelationEngine {
  private readonly detectedAnomalies: SecurityAnomaly[] = [];

  processEvent(event: BufferedEvent): SecurityAnomaly[] {
    const anomalies: SecurityAnomaly[] = [];

    // Add to buffer
    eventBuffer.add(event);

    // Check against correlation rules
    for (const rule of CORRELATION_RULES) {
      const matched = this.checkRule(rule, event);
      if (matched) {
        const anomaly = this.createAnomaly(rule, event, matched);
        anomalies.push(anomaly);
        this.detectedAnomalies.push(anomaly);

        // Update threat score
        if (event.userId) {
          threatScorer.updateScore(event.userId, anomaly);
        }
      }
    }

    // Check behavioral deviation
    if (event.userId) {
      const deviations = baselineManager.checkDeviation(event.userId, event);
      if (deviations.length >= 2) {
        // Multiple deviations = potential insider threat
        const anomaly: SecurityAnomaly = {
          id: `insider_${Date.now()}`,
          type: "insider_threat",
          severity: deviations.length >= 3 ? "high" : "medium",
          confidence: Math.min(1, deviations.length * 0.25),
          timestamp: new Date(),
          userId: event.userId,
          description: "Multiple behavioral deviations detected",
          relatedEvents: [event.id],
          indicators: deviations,
          suggestedActions: [
            "Review user's recent activity",
            "Verify user identity through secondary channel",
          ],
        };
        anomalies.push(anomaly);
        threatScorer.updateScore(event.userId, anomaly);
      }
    }

    // Check for impossible travel
    if (event.userId && event.ipAddress) {
      const impossibleTravel = this.checkImpossibleTravel(event);
      if (impossibleTravel) {
        anomalies.push(impossibleTravel);
        threatScorer.updateScore(event.userId, impossibleTravel);
      }
    }

    return anomalies;
  }

  private checkRule(rule: CorrelationRule, triggerEvent: BufferedEvent): BufferedEvent[] | null {
    const since = new Date(Date.now() - rule.timeWindowMs);
    const matchedEvents: BufferedEvent[] = [];

    for (const pattern of rule.pattern) {
      let events: BufferedEvent[];

      if (pattern.sameUser && triggerEvent.userId) {
        events = eventBuffer.getEventsByUser(triggerEvent.userId, rule.timeWindowMs);
      } else if (pattern.sameIP && triggerEvent.ipAddress) {
        events = eventBuffer.getEventsByIP(triggerEvent.ipAddress, rule.timeWindowMs);
      } else {
        events = eventBuffer.getEvents({ since });
      }

      const typeMatches = events.filter(e => e.type === pattern.eventType);

      if (pattern.count && pattern.operator) {
        const countMatch =
          (pattern.operator === "gte" && typeMatches.length >= pattern.count) ||
          (pattern.operator === "lte" && typeMatches.length <= pattern.count) ||
          (pattern.operator === "eq" && typeMatches.length === pattern.count);

        if (!countMatch) return null;
      }

      matchedEvents.push(...typeMatches);
    }

    return matchedEvents.length > 0 ? matchedEvents : null;
  }

  private createAnomaly(
    rule: CorrelationRule,
    triggerEvent: BufferedEvent,
    matchedEvents: BufferedEvent[]
  ): SecurityAnomaly {
    return {
      id: `${rule.id}_${Date.now()}`,
      type: rule.anomalyType,
      severity: rule.severity,
      confidence: Math.min(1, matchedEvents.length / (rule.threshold * 2)),
      timestamp: new Date(),
      userId: triggerEvent.userId,
      description: rule.description,
      relatedEvents: matchedEvents.map(e => e.id),
      indicators: [
        {
          name: "matched_events",
          value: matchedEvents.length,
          threshold: rule.threshold,
          description: `${matchedEvents.length} events matched pattern`,
        },
      ],
      suggestedActions: this.getSuggestedActions(rule.anomalyType),
    };
  }

  private checkImpossibleTravel(event: BufferedEvent): SecurityAnomaly | null {
    if (!event.userId || !event.ipAddress) return null;

    const recentIPs = eventBuffer.getUniqueIPsForUser(event.userId, 30 * 60 * 1000); // 30 min

    // If more than 2 unique IPs in 30 minutes (excluding local ranges)
    const publicIPs = recentIPs.filter(
      ip => !ip.startsWith("192.168.") && !ip.startsWith("10.") && !ip.startsWith("127.")
    );

    if (publicIPs.length >= 2) {
      return {
        id: `impossible_travel_${Date.now()}`,
        type: "impossible_travel",
        severity: "high",
        confidence: 0.8,
        timestamp: new Date(),
        userId: event.userId,
        description: `User accessed from ${publicIPs.length} different locations within 30 minutes`,
        relatedEvents: [event.id],
        indicators: [
          {
            name: "unique_ips",
            value: publicIPs.length,
            threshold: 2,
            description: `IPs: ${publicIPs.join(", ")}`,
          },
        ],
        suggestedActions: [
          "Force session termination",
          "Require re-authentication",
          "Notify user of suspicious access",
        ],
      };
    }

    return null;
  }

  private getSuggestedActions(anomalyType: AnomalyType): string[] {
    const actions: Record<AnomalyType, string[]> = {
      brute_force: ["Implement account lockout", "Add CAPTCHA", "Review authentication logs"],
      privilege_escalation: [
        "Revoke elevated permissions",
        "Audit role changes",
        "Notify security team",
      ],
      data_exfiltration: ["Block export operations", "Review exported data", "Enable DLP controls"],
      impossible_travel: ["Force re-authentication", "Terminate suspicious sessions", "Enable MFA"],
      off_hours_activity: ["Flag for review", "Limit off-hours permissions", "Enable monitoring"],
      unusual_resource_access: [
        "Review access patterns",
        "Verify business need",
        "Update access policies",
      ],
      mass_modification: ["Pause batch operations", "Review changes", "Enable approval workflow"],
      permission_probing: [
        "Rate limit failed operations",
        "Review user permissions",
        "Enable security monitoring",
      ],
      lateral_movement: [
        "Isolate affected systems",
        "Review access paths",
        "Enable network segmentation",
      ],
      credential_stuffing: ["Enable IP blocking", "Enforce password changes", "Enable MFA"],
      session_hijacking: [
        "Terminate all sessions",
        "Force password reset",
        "Enable session binding",
      ],
      insider_threat: [
        "Increase monitoring",
        "Review recent activity",
        "Schedule security interview",
      ],
    };

    return actions[anomalyType] || ["Review and investigate"];
  }

  getRecentAnomalies(hours: number = 24): SecurityAnomaly[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.detectedAnomalies.filter(a => a.timestamp >= since);
  }

  getAnomaliesByType(type: AnomalyType): SecurityAnomaly[] {
    return this.detectedAnomalies.filter(a => a.type === type);
  }

  getAnomaliesForUser(userId: string): SecurityAnomaly[] {
    return this.detectedAnomalies.filter(a => a.userId === userId);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const correlationEngine = new CorrelationEngine();

/**
 * Process a security event
 */
export function processSecurityEvent(event: {
  id: string;
  type: SecurityEventType;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}): SecurityAnomaly[] {
  const bufferedEvent: BufferedEvent = {
    ...event,
    timestamp: new Date(),
  };

  return correlationEngine.processEvent(bufferedEvent);
}

/**
 * Get current threat level for user
 */
export function getUserThreatScore(userId: string): ThreatScore | undefined {
  return threatScorer.getScore(userId);
}

/**
 * Get all high-risk users
 */
export function getHighRiskUsers(threshold: number = 50): ThreatScore[] {
  return threatScorer.getHighRiskUsers(threshold);
}

/**
 * Get recent anomalies
 */
export function getRecentAnomalies(hours: number = 24): SecurityAnomaly[] {
  return correlationEngine.getRecentAnomalies(hours);
}

/**
 * Update user behavioral baseline
 */
export function updateUserBaseline(userId: string): void {
  const events = eventBuffer.getEvents({ userId });
  baselineManager.updateBaseline(
    userId,
    events.map(e => ({
      ...e,
      timestamp: e.timestamp,
    }))
  );
}

/**
 * Get intelligence summary
 */
export function getIntelligenceSummary(): {
  totalEventsProcessed: number;
  anomaliesLast24h: number;
  highRiskUsers: number;
  topAnomalyTypes: { type: AnomalyType; count: number }[];
} {
  const recentAnomalies = correlationEngine.getRecentAnomalies(24);

  const typeCounts = new Map<AnomalyType, number>();
  for (const a of recentAnomalies) {
    typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1);
  }

  const topAnomalyTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  return {
    totalEventsProcessed: eventBuffer.getEvents({}).length,
    anomaliesLast24h: recentAnomalies.length,
    highRiskUsers: threatScorer.getHighRiskUsers(50).length,
    topAnomalyTypes,
  };
}
