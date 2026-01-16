/**
 * Systemic Risk Ledger - Core Logic
 * Tracks, accumulates, and decays systemic risks
 */

import {
  RiskEvent,
  RiskEventType,
  RiskAttributionType,
  RiskAccumulation,
  LatentRisk,
  RiskContributor,
  SystemicRiskSummary,
  RiskLedgerConfig,
  DEFAULT_RISK_LEDGER_CONFIG,
  DEFAULT_RISK_WEIGHTS,
} from './types';

// Bounded storage
const MAX_EVENTS = 5000;
const MAX_LATENT_RISKS = 100;
const MAX_ACCUMULATIONS = 500;

const eventStore: RiskEvent[] = [];
const latentRisks = new Map<string, LatentRisk>();
const accumulations = new Map<string, RiskAccumulation>();

let lastDecayRun = Date.now();
let lastComputeRun = Date.now();

function getConfig(): RiskLedgerConfig {
  return {
    ...DEFAULT_RISK_LEDGER_CONFIG,
    enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK EVENT RECORDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a risk event
 */
export function recordRiskEvent(
  type: RiskEventType,
  attribution: RiskEvent['attribution'],
  context: RiskEvent['context'],
  options?: {
    riskDelta?: number;
    halfLifeHours?: number;
  }
): RiskEvent {
  const config = getConfig();

  const riskDelta = options?.riskDelta ?? config.riskWeights[type];
  const halfLifeHours = options?.halfLifeHours ?? config.defaultDecayHalfLifeHours;

  const event: RiskEvent = {
    id: `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: new Date(),
    riskDelta,
    attribution,
    context,
    decay: {
      halfLifeHours,
      decaysTo: 0,
    },
    currentRisk: riskDelta,
    lastDecayAt: new Date(),
  };

  // Bounded storage
  if (eventStore.length >= MAX_EVENTS) {
    eventStore.shift();
  }
  eventStore.push(event);

  // Update accumulation
  updateAccumulation(event);

  // Check for latent risk patterns
  detectLatentRisks(event);

  return event;
}

/**
 * Record a mitigation event (reduces risk)
 */
export function recordMitigation(
  targetEventId: string,
  mitigatedBy: string,
  notes?: string
): boolean {
  const event = eventStore.find(e => e.id === targetEventId);
  if (!event) return false;

  event.mitigatedAt = new Date();
  event.mitigatedBy = mitigatedBy;
  event.currentRisk = 0;

  // Record mitigation as negative risk event
  recordRiskEvent(
    'mitigation_succeeded',
    event.attribution,
    {
      ...event.context,
      description: `Mitigated: ${event.context.description}`,
    }
  );

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACCUMULATION TRACKING
// ═══════════════════════════════════════════════════════════════════════════

function getAccumulationKey(attribution: RiskEvent['attribution']): string {
  return `${attribution.type}:${attribution.id}`;
}

function updateAccumulation(event: RiskEvent): void {
  const key = getAccumulationKey(event.attribution);
  const existing = accumulations.get(key);

  if (existing) {
    existing.currentRisk = Math.max(0, existing.currentRisk + event.riskDelta);
    if (existing.currentRisk > existing.peakRisk) {
      existing.peakRisk = existing.currentRisk;
      existing.peakAt = new Date();
    }
    existing.activeEvents++;
    existing.totalEventsEver++;
    existing.riskByType[event.type] = (existing.riskByType[event.type] || 0) + event.riskDelta;
    existing.lastUpdated = new Date();
  } else {
    // Bounded storage
    if (accumulations.size >= MAX_ACCUMULATIONS) {
      const lowest = Array.from(accumulations.entries())
        .sort(([, a], [, b]) => a.currentRisk - b.currentRisk)[0];
      if (lowest && lowest[1].currentRisk < event.riskDelta) {
        accumulations.delete(lowest[0]);
      }
    }

    accumulations.set(key, {
      attributionType: event.attribution.type,
      attributionId: event.attribution.id,
      attributionName: event.attribution.name,
      currentRisk: Math.max(0, event.riskDelta),
      peakRisk: Math.max(0, event.riskDelta),
      peakAt: new Date(),
      activeEvents: 1,
      mitigatedEvents: 0,
      totalEventsEver: 1,
      trend: { hourlyDelta: 0, dailyDelta: 0, weeklyDelta: 0 },
      riskByType: { [event.type]: event.riskDelta },
      lastUpdated: new Date(),
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DECAY PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply decay to all risk events
 */
export function applyDecay(): number {
  const now = Date.now();
  let decayedCount = 0;

  for (const event of eventStore) {
    if (event.mitigatedAt) continue; // Already mitigated
    if (event.currentRisk <= event.decay.decaysTo) continue; // Already at minimum

    const hoursSinceLastDecay = (now - event.lastDecayAt.getTime()) / (1000 * 60 * 60);
    const decayFactor = Math.pow(0.5, hoursSinceLastDecay / event.decay.halfLifeHours);
    const newRisk = Math.max(event.decay.decaysTo, event.riskDelta * decayFactor);

    if (newRisk !== event.currentRisk) {
      event.currentRisk = newRisk;
      event.lastDecayAt = new Date();
      decayedCount++;
    }
  }

  // Recompute accumulations after decay
  recomputeAccumulations();

  lastDecayRun = now;
  return decayedCount;
}

function recomputeAccumulations(): void {
  // Reset all accumulation risks
  for (const acc of accumulations.values()) {
    acc.currentRisk = 0;
    acc.activeEvents = 0;
    acc.riskByType = {};
  }

  // Sum current risks from events
  for (const event of eventStore) {
    if (event.currentRisk <= 0) continue;

    const key = getAccumulationKey(event.attribution);
    const acc = accumulations.get(key);
    if (acc) {
      acc.currentRisk += event.currentRisk;
      acc.activeEvents++;
      acc.riskByType[event.type] = (acc.riskByType[event.type] || 0) + event.currentRisk;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LATENT RISK DETECTION
// ═══════════════════════════════════════════════════════════════════════════

function detectLatentRisks(newEvent: RiskEvent): void {
  // Pattern 1: Repeated warnings from same source
  const recentWarnings = eventStore.filter(e =>
    e.type === 'warning_ignored' &&
    e.attribution.id === newEvent.attribution.id &&
    e.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
  );

  if (recentWarnings.length >= 3) {
    createOrUpdateLatentRisk(
      `repeated-warnings-${newEvent.attribution.id}`,
      `Repeated ignored warnings from ${newEvent.attribution.name}`,
      `${recentWarnings.length} warnings ignored in 24 hours`,
      newEvent.attribution,
      [{ type: 'warning_ignored', count: recentWarnings.length, contribution: recentWarnings.length * 5 }]
    );
  }

  // Pattern 2: Near misses accumulating
  const recentNearMisses = eventStore.filter(e =>
    e.type === 'near_miss' &&
    e.context.feature === newEvent.context.feature &&
    e.timestamp.getTime() > Date.now() - 48 * 60 * 60 * 1000
  );

  if (recentNearMisses.length >= 2) {
    createOrUpdateLatentRisk(
      `near-misses-${newEvent.context.feature || 'system'}`,
      `Near-miss pattern in ${newEvent.context.feature || 'system'}`,
      `${recentNearMisses.length} near-misses in 48 hours - incident likely`,
      newEvent.attribution,
      [{ type: 'near_miss', count: recentNearMisses.length, contribution: recentNearMisses.length * 10 }]
    );
  }

  // Pattern 3: Budget exhaustion + overrides = risk accumulation
  const budgetExhausted = eventStore.filter(e =>
    e.type === 'budget_exhausted' &&
    e.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length;
  const policyBypassed = eventStore.filter(e =>
    e.type === 'policy_bypassed' &&
    e.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
  ).length;

  if (budgetExhausted >= 2 && policyBypassed >= 2) {
    createOrUpdateLatentRisk(
      'budget-override-spiral',
      'Budget exhaustion with policy bypasses',
      'System is being pushed beyond limits with manual overrides',
      { type: 'policy', id: 'budget-policy', name: 'Budget Policy' },
      [
        { type: 'budget_exhausted', count: budgetExhausted, contribution: budgetExhausted * 8 },
        { type: 'policy_bypassed', count: policyBypassed, contribution: policyBypassed * 7 },
      ]
    );
  }

  // Pattern 4: Automation trust erosion
  const autoOverrides = eventStore.filter(e =>
    e.type === 'automation_overridden' &&
    e.timestamp.getTime() > Date.now() - 72 * 60 * 60 * 1000
  ).length;

  if (autoOverrides >= 5) {
    createOrUpdateLatentRisk(
      'automation-trust-erosion',
      'Automation decisions being overridden frequently',
      `${autoOverrides} automation overrides in 72 hours - trust erosion`,
      { type: 'automation', id: 'automation-system', name: 'Automation System' },
      [{ type: 'automation_overridden', count: autoOverrides, contribution: autoOverrides * 3 }]
    );
  }
}

function createOrUpdateLatentRisk(
  id: string,
  title: string,
  description: string,
  attribution: RiskEvent['attribution'],
  factors: LatentRisk['contributingFactors']
): void {
  const existing = latentRisks.get(id);
  const score = factors.reduce((sum, f) => sum + f.contribution, 0);
  const severity = score > 50 ? 'critical' : score > 30 ? 'high' : score > 15 ? 'medium' : 'low';
  const incidentProbability = Math.min(0.95, score / 100);

  if (existing) {
    existing.score = score;
    existing.severity = severity;
    existing.contributingFactors = factors;
    existing.lastUpdated = new Date();
    existing.occurrences++;
    existing.incidentProbability = incidentProbability;
  } else {
    // Bounded storage
    if (latentRisks.size >= MAX_LATENT_RISKS) {
      const lowest = Array.from(latentRisks.entries())
        .filter(([, r]) => r.status !== 'active')
        .sort(([, a], [, b]) => a.score - b.score)[0];
      if (lowest) {
        latentRisks.delete(lowest[0]);
      } else {
        // Remove lowest active
        const lowestActive = Array.from(latentRisks.entries())
          .sort(([, a], [, b]) => a.score - b.score)[0];
        if (lowestActive && lowestActive[1].score < score) {
          latentRisks.delete(lowestActive[0]);
        }
      }
    }

    latentRisks.set(id, {
      id,
      title,
      description,
      severity,
      score,
      confidence: Math.min(0.9, 0.5 + factors.length * 0.1),
      primaryAttribution: attribution,
      contributingFactors: factors,
      firstDetected: new Date(),
      lastUpdated: new Date(),
      occurrences: 1,
      incidentProbability,
      estimatedImpact: severity,
      timeToIncident: score > 30 ? 24 : score > 15 ? 72 : undefined,
      status: 'active',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute current systemic risk score
 */
export function computeSystemicRisk(): number {
  const totalRisk = Array.from(accumulations.values())
    .reduce((sum, acc) => sum + acc.currentRisk, 0);

  // Normalize to 0-100
  return Math.min(100, totalRisk);
}

/**
 * Get top hidden risks
 */
export function getTopHiddenRisks(limit: number = 5): LatentRisk[] {
  return Array.from(latentRisks.values())
    .filter(r => r.status === 'active')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get top risk contributors
 */
export function getTopContributors(limit: number = 5): RiskContributor[] {
  const totalRisk = computeSystemicRisk();
  const sorted = Array.from(accumulations.values())
    .sort((a, b) => b.currentRisk - a.currentRisk)
    .slice(0, limit);

  return sorted.map((acc, index) => {
    // Get top risk types for this contributor
    const topTypes = Object.entries(acc.riskByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type as RiskEventType);

    // Calculate trend based on recent vs older events
    const recentEvents = eventStore.filter(e =>
      getAccumulationKey(e.attribution) === `${acc.attributionType}:${acc.attributionId}` &&
      e.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    ).length;
    const olderEvents = eventStore.filter(e =>
      getAccumulationKey(e.attribution) === `${acc.attributionType}:${acc.attributionId}` &&
      e.timestamp.getTime() <= Date.now() - 24 * 60 * 60 * 1000 &&
      e.timestamp.getTime() > Date.now() - 48 * 60 * 60 * 1000
    ).length;

    const trend: RiskContributor['trend'] =
      recentEvents > olderEvents * 1.2 ? 'increasing' :
      recentEvents < olderEvents * 0.8 ? 'decreasing' : 'stable';

    return {
      rank: index + 1,
      attributionType: acc.attributionType,
      attributionId: acc.attributionId,
      attributionName: acc.attributionName,
      riskScore: acc.currentRisk,
      riskPercentage: totalRisk > 0 ? (acc.currentRisk / totalRisk) * 100 : 0,
      trend,
      topRiskTypes: topTypes,
    };
  });
}

/**
 * Get full systemic risk summary
 */
export function getSystemicRiskSummary(): SystemicRiskSummary {
  const config = getConfig();
  const overallScore = computeSystemicRisk();

  // Determine rating
  let rating: SystemicRiskSummary['rating'];
  if (overallScore >= config.thresholds.criticalRisk) rating = 'critical';
  else if (overallScore >= config.thresholds.highRisk) rating = 'high';
  else if (overallScore >= config.thresholds.elevatedRisk) rating = 'elevated';
  else if (overallScore >= config.thresholds.moderateRisk) rating = 'moderate';
  else rating = 'low';

  // Compute by source
  let automationRisk = 0;
  let humanRisk = 0;
  for (const event of eventStore) {
    if (event.currentRisk <= 0) continue;
    if (event.context.decisionSource === 'automation') {
      automationRisk += event.currentRisk;
    } else {
      humanRisk += event.currentRisk;
    }
  }

  // Compute by category
  const byCategory: Partial<Record<RiskAttributionType, number>> = {};
  for (const acc of accumulations.values()) {
    byCategory[acc.attributionType] = (byCategory[acc.attributionType] || 0) + acc.currentRisk;
  }

  // Compute trend
  const now = Date.now();
  const hourAgo = eventStore.filter(e => e.timestamp.getTime() > now - 60 * 60 * 1000)
    .reduce((sum, e) => sum + e.riskDelta, 0);
  const dayAgo = eventStore.filter(e =>
    e.timestamp.getTime() > now - 24 * 60 * 60 * 1000 &&
    e.timestamp.getTime() <= now - 60 * 60 * 1000
  ).reduce((sum, e) => sum + e.riskDelta, 0) / 23; // Normalize to hourly
  const weekAgo = eventStore.filter(e =>
    e.timestamp.getTime() > now - 7 * 24 * 60 * 60 * 1000 &&
    e.timestamp.getTime() <= now - 24 * 60 * 60 * 1000
  ).reduce((sum, e) => sum + e.riskDelta, 0) / (6 * 24); // Normalize to hourly

  const hourlyChange = hourAgo;
  const dailyChange = hourlyChange - dayAgo;
  const weeklyChange = dailyChange - weekAgo;

  const trendDirection: SystemicRiskSummary['trend']['direction'] =
    dailyChange > 5 ? 'worsening' :
    dailyChange < -5 ? 'improving' : 'stable';

  // Count warnings ignored
  const warningsIgnored = eventStore.filter(e =>
    e.type === 'warning_ignored' &&
    !e.mitigatedAt &&
    e.timestamp.getTime() > now - 24 * 60 * 60 * 1000
  ).length;

  // Count urgent mitigations needed
  const urgentMitigations = Array.from(latentRisks.values())
    .filter(r => r.status === 'active' && r.severity === 'critical').length;

  // Oldest unmitigated risk
  const oldestUnmitigated = eventStore
    .filter(e => !e.mitigatedAt && e.currentRisk > 0)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())[0];
  const riskDebtAge = oldestUnmitigated
    ? (now - oldestUnmitigated.timestamp.getTime()) / (1000 * 60 * 60)
    : 0;

  return {
    computedAt: new Date(),
    overallScore,
    rating,
    bySource: {
      automation: automationRisk,
      human: humanRisk,
    },
    byCategory,
    topHiddenRisks: getTopHiddenRisks(5),
    topContributors: getTopContributors(5),
    trend: {
      direction: trendDirection,
      hourlyChange,
      dailyChange,
      weeklyChange,
    },
    urgentMitigations,
    warningsIgnored,
    riskDebtAge,
  };
}

/**
 * Get accumulation for a specific attribution
 */
export function getAccumulation(
  type: RiskAttributionType,
  id: string
): RiskAccumulation | null {
  return accumulations.get(`${type}:${id}`) || null;
}

/**
 * Mark a latent risk as mitigated
 */
export function mitigateLatentRisk(id: string, notes?: string): boolean {
  const risk = latentRisks.get(id);
  if (!risk) return false;

  risk.status = 'mitigated';
  risk.mitigationNotes = notes;
  risk.lastUpdated = new Date();

  return true;
}

/**
 * Clear all risk data (for testing)
 */
export function clearRiskData(): void {
  eventStore.length = 0;
  latentRisks.clear();
  accumulations.clear();
}

/**
 * Get event count (for diagnostics)
 */
export function getRiskEventCount(): number {
  return eventStore.length;
}

/**
 * Get latent risk count
 */
export function getLatentRiskCount(): number {
  return latentRisks.size;
}
