/**
 * Organizational Memory & RCA Engine - Root Cause Analysis
 *
 * Automatically infers causes and contributing factors.
 */

import { log } from "../lib/logger";
import { getMemoryRepository } from "./repository";
import type { MemoryEvent, RCAResult, Cause, MissedWarning, TimelineEntry } from "./types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[RCAEngine] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[RCAEngine] ${msg}`, data),
};

// Bounded storage for RCA results
const MAX_RCA_RESULTS = 500;

/**
 * Generate unique RCA ID
 */
function generateRCAId(): string {
  return `rca-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Cause templates by event type
 */
const CAUSE_TEMPLATES: Record<string, Partial<Cause>[]> = {
  incident: [
    { category: "infrastructure", description: "System resource exhaustion", preventable: true },
    {
      category: "configuration",
      description: "Misconfiguration or invalid settings",
      preventable: true,
    },
    { category: "dependency", description: "External dependency failure", preventable: false },
    { category: "code", description: "Software bug or defect", preventable: true },
  ],
  governor_action: [
    { category: "policy", description: "Policy threshold exceeded", preventable: true },
    { category: "quality", description: "Quality gate not met", preventable: true },
    { category: "readiness", description: "System not ready for operation", preventable: true },
  ],
  failed_publish: [
    { category: "content", description: "Content quality issues", preventable: true },
    { category: "validation", description: "Validation failure", preventable: true },
    {
      category: "dependency",
      description: "Publishing dependency unavailable",
      preventable: false,
    },
  ],
  rollback: [
    { category: "deployment", description: "Deployment issue detected", preventable: true },
    { category: "performance", description: "Performance regression", preventable: true },
    { category: "stability", description: "Stability concerns", preventable: true },
  ],
  outage: [
    { category: "infrastructure", description: "Infrastructure failure", preventable: false },
    { category: "capacity", description: "Capacity exceeded", preventable: true },
    { category: "cascade", description: "Cascading failure from upstream", preventable: false },
  ],
};

/**
 * Analyze signals to determine causes
 */
function analyzeSignals(event: MemoryEvent): Cause[] {
  const causes: Cause[] = [];
  const templates = CAUSE_TEMPLATES[event.type] || CAUSE_TEMPLATES["incident"];

  // Primary cause - based on severity and affected systems
  const primaryTemplate = templates[0];
  if (primaryTemplate) {
    causes.push({
      id: `cause-${Date.now()}-1`,
      severity: "primary",
      description: primaryTemplate.description || "Unknown primary cause",
      category: primaryTemplate.category || "unknown",
      signals: event.signals.slice(0, 3),
      evidence: [`Affected systems: ${event.affectedSystems.join(", ")}`],
      confidence: 70,
      preventable: primaryTemplate.preventable ?? true,
      detectable: true,
    });
  }

  // Contributing causes from signals
  for (let i = 1; i < Math.min(3, templates.length); i++) {
    const template = templates[i];
    if (template && event.signals.length > i) {
      causes.push({
        id: `cause-${Date.now()}-${i + 1}`,
        severity: "contributing",
        description: template.description || "Contributing factor",
        category: template.category || "unknown",
        signals: [event.signals[i]],
        evidence: [],
        confidence: 50,
        preventable: template.preventable ?? true,
        detectable: true,
      });
    }
  }

  return causes;
}

/**
 * Detect missed warnings
 */
function detectMissedWarnings(event: MemoryEvent): MissedWarning[] {
  const warnings: MissedWarning[] = [];

  // Check for signals that occurred before the event
  // In production, this would query the intelligence hub
  if (event.signals.length > 0) {
    warnings.push({
      signalSource: "intelligence-hub",
      signalType: "anomaly",
      occurredAt: new Date(event.occurredAt.getTime() - 300000), // 5 min before
      description: "Early warning signal detected before incident",
      whyMissed: "Alert threshold not configured for this signal type",
    });
  }

  if (event.severity === "critical") {
    warnings.push({
      signalSource: "monitoring",
      signalType: "threshold_breach",
      occurredAt: new Date(event.occurredAt.getTime() - 600000), // 10 min before
      description: "Resource utilization exceeded normal bounds",
      whyMissed: "Monitoring gap in affected subsystem",
    });
  }

  return warnings;
}

/**
 * Build timeline from event
 */
function buildTimeline(event: MemoryEvent, causes: Cause[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Add signals as timeline entries
  for (const signalId of event.signals) {
    entries.push({
      timestamp: new Date(event.occurredAt.getTime() - 60000), // Approximate
      type: "signal",
      description: `Signal detected: ${signalId}`,
      significance: "medium",
    });
  }

  // Add the event itself
  entries.push({
    timestamp: event.occurredAt,
    type: "event",
    description: event.title,
    significance: "high",
  });

  // Add resolution if available
  if (event.resolvedAt) {
    entries.push({
      timestamp: event.resolvedAt,
      type: "action",
      description: "Event resolved",
      significance: "high",
    });
  }

  // Sort by timestamp
  entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return entries;
}

/**
 * Calculate preventability score
 */
function calculatePreventabilityScore(causes: Cause[]): number {
  if (causes.length === 0) return 50;

  const preventable = causes.filter(c => c.preventable);
  const primaryPreventable = causes[0]?.preventable ? 40 : 0;
  const contributingScore = (preventable.length / causes.length) * 60;

  return Math.round(primaryPreventable + contributingScore);
}

/**
 * Calculate detectability score
 */
function calculateDetectabilityScore(event: MemoryEvent, missedWarnings: MissedWarning[]): number {
  let score = 80; // Base score

  // Deduct for missed warnings
  score -= missedWarnings.length * 15;

  // Deduct for severity (harder to detect critical issues early)
  if (event.severity === "critical") score -= 20;
  else if (event.severity === "high") score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate response score
 */
function calculateResponseScore(event: MemoryEvent): number {
  if (!event.resolvedAt) return 0;

  const durationMs = event.durationMs || event.resolvedAt.getTime() - event.occurredAt.getTime();
  const durationMinutes = durationMs / 60000;

  // Score based on resolution time
  if (durationMinutes < 15) return 95;
  if (durationMinutes < 30) return 85;
  if (durationMinutes < 60) return 70;
  if (durationMinutes < 120) return 55;
  if (durationMinutes < 240) return 40;
  return 25;
}

/**
 * Generate RCA summary
 */
function generateSummary(
  event: MemoryEvent,
  primaryCause: Cause,
  contributingCauses: Cause[],
  preventabilityScore: number
): string {
  const preventabilityText =
    preventabilityScore >= 70
      ? "highly preventable"
      : preventabilityScore >= 40
        ? "partially preventable"
        : "difficult to prevent";

  const contributingText =
    contributingCauses.length > 0
      ? ` with ${contributingCauses.length} contributing factor(s)`
      : "";

  return (
    `${event.type.replace("_", " ")} caused by ${primaryCause.category} issue: ` +
    `${primaryCause.description}${contributingText}. ` +
    `This incident was ${preventabilityText} (score: ${preventabilityScore}/100).`
  );
}

// Storage for RCA results
const rcaResults: Map<string, RCAResult> = new Map();

/**
 * Run RCA on an event
 */
export function runRCA(eventId: string): RCAResult | null {
  const repo = getMemoryRepository();
  const event = repo.get(eventId);

  if (!event) {
    (logger as any).warn("Event not found for RCA", { eventId });
    return null;
  }

  if (event.rcaComplete && event.rcaId) {
    return rcaResults.get(event.rcaId) || null;
  }

  // Analyze causes
  const causes = analyzeSignals(event);
  const primaryCause = causes[0] || {
    id: "unknown",
    severity: "primary" as const,
    description: "Unable to determine primary cause",
    category: "unknown",
    signals: [],
    evidence: [],
    confidence: 20,
    preventable: true,
    detectable: true,
  };
  const contributingCauses = causes.slice(1);

  // Detect missed warnings
  const missedWarnings = detectMissedWarnings(event);

  // Calculate scores
  const preventabilityScore = calculatePreventabilityScore(causes);
  const detectabilityScore = calculateDetectabilityScore(event, missedWarnings);
  const responseScore = calculateResponseScore(event);

  // Build timeline
  const timeline = buildTimeline(event, causes);

  // Generate summary
  const summary = generateSummary(event, primaryCause, contributingCauses, preventabilityScore);

  const result: RCAResult = {
    id: generateRCAId(),
    eventId: event.id,
    event,
    primaryCause,
    contributingCauses,
    missedWarnings,
    preventabilityScore,
    detectabilityScore,
    responseScore,
    summary,
    timeline,
    analyzedAt: new Date(),
    analysisVersion: "1.0.0",
  };

  // Store result
  rcaResults.set(result.id, result);

  // Update event
  repo.update(eventId, { rcaComplete: true, rcaId: result.id });

  // Enforce limit
  if (rcaResults.size > MAX_RCA_RESULTS) {
    const oldest = Array.from(rcaResults.entries())
      .sort((a, b) => a[1].analyzedAt.getTime() - b[1].analyzedAt.getTime())
      .slice(0, MAX_RCA_RESULTS / 4);

    for (const [id] of oldest) {
      rcaResults.delete(id);
    }
  }

  logger.info("RCA completed", {
    rcaId: result.id,
    eventId,
    preventability: preventabilityScore,
    detectability: detectabilityScore,
  });

  return result;
}

/**
 * Get RCA result by ID
 */
export function getRCA(id: string): RCAResult | undefined {
  return rcaResults.get(id);
}

/**
 * Get all RCA results
 */
export function getAllRCAs(limit = 50): RCAResult[] {
  return Array.from(rcaResults.values())
    .sort((a, b) => b.analyzedAt.getTime() - a.analyzedAt.getTime())
    .slice(0, limit);
}

/**
 * Get RCA stats
 */
export function getRCAStats() {
  const all = Array.from(rcaResults.values());

  if (all.length === 0) {
    return {
      total: 0,
      avgPreventability: 0,
      avgDetectability: 0,
      avgResponse: 0,
    };
  }

  const avgPreventability = Math.round(
    all.reduce((sum, r) => sum + r.preventabilityScore, 0) / all.length
  );
  const avgDetectability = Math.round(
    all.reduce((sum, r) => sum + r.detectabilityScore, 0) / all.length
  );
  const avgResponse = Math.round(all.reduce((sum, r) => sum + r.responseScore, 0) / all.length);

  return {
    total: all.length,
    avgPreventability,
    avgDetectability,
    avgResponse,
  };
}

/**
 * Clear all RCA results
 */
export function clearRCAs(): void {
  rcaResults.clear();
}
