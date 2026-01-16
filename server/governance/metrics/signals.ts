/**
 * Governance Quality Signals - Computation Engine
 * Computes 15 governance quality metrics from raw events
 */

import {
  GovernanceSignal,
  GovernanceScore,
  GovernanceEvent,
  HistoricalScore,
  WindowAggregate,
  MetricWindow,
  DEFAULT_METRICS_CONFIG,
  DEFAULT_THRESHOLDS,
  INVERTED_SIGNALS,
  GovernanceMetricsConfig,
} from './types';

// Bounded storage
const MAX_EVENTS = 10000;
const MAX_HISTORY = 5000;

const eventStore: GovernanceEvent[] = [];
const historyStore = new Map<string, HistoricalScore>();
const aggregateCache = new Map<string, { aggregate: WindowAggregate; expiresAt: number }>();

function getConfig(): GovernanceMetricsConfig {
  return {
    ...DEFAULT_METRICS_CONFIG,
    enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT RECORDING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Record a governance event for metric computation
 */
export function recordEvent(event: Omit<GovernanceEvent, 'id'>): GovernanceEvent {
  const fullEvent: GovernanceEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  // Bounded: remove oldest if at capacity
  if (eventStore.length >= MAX_EVENTS) {
    eventStore.shift();
  }

  eventStore.push(fullEvent);
  return fullEvent;
}

/**
 * Update event outcome after the fact
 */
export function updateEventOutcome(
  eventId: string,
  outcome: GovernanceEvent['outcome']
): boolean {
  const event = eventStore.find(e => e.id === eventId);
  if (!event) return false;
  event.outcome = outcome;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// WINDOW AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════

function getWindowBounds(window: MetricWindow, referenceDate: Date = new Date()): { start: Date; end: Date } {
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);

  switch (window) {
    case 'hour':
      start.setHours(start.getHours() - 1);
      break;
    case 'day':
      start.setDate(start.getDate() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
  }

  return { start, end };
}

function getPreviousWindowBounds(window: MetricWindow, referenceDate: Date = new Date()): { start: Date; end: Date } {
  const { start: currentStart } = getWindowBounds(window, referenceDate);
  return getWindowBounds(window, currentStart);
}

/**
 * Aggregate events for a time window
 */
export function aggregateWindow(window: MetricWindow, referenceDate: Date = new Date()): WindowAggregate {
  const { start, end } = getWindowBounds(window, referenceDate);
  const cacheKey = `${window}-${start.toISOString()}`;

  // Check cache
  const cached = aggregateCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.aggregate;
  }

  // Filter events in window
  const events = eventStore.filter(e =>
    e.timestamp >= start && e.timestamp <= end
  );

  // Compute counts
  const counts = {
    totalDecisions: events.filter(e => e.type === 'decision_made').length,
    automationDecisions: events.filter(e => e.type === 'decision_made' && e.source === 'automation').length,
    humanDecisions: events.filter(e => e.type === 'decision_made' && e.source === 'human').length,
    overrides: events.filter(e => e.type === 'override_applied').length,
    approvals: events.filter(e => e.type === 'approval_granted').length,
    denials: events.filter(e => e.type === 'approval_denied').length,
    incidents: events.filter(e => e.type === 'incident_occurred').length,
    warnings: events.filter(e => e.type === 'warning_issued').length,
    escalations: events.filter(e => e.type === 'escalation_triggered').length,
    reverts: events.filter(e => e.type === 'revert_executed').length,
  };

  // Compute outcomes
  const decisionsWithOutcome = events.filter(e => e.type === 'decision_made' && e.outcome);
  const overridesWithOutcome = events.filter(e => e.type === 'override_applied' && e.outcome);
  const approvalsWithOutcome = events.filter(e => e.type === 'approval_granted' && e.outcome);
  const warningsWithOutcome = events.filter(e => e.type === 'warning_issued' && e.outcome);

  const outcomes = {
    incidentsAfterAllow: decisionsWithOutcome.filter(e =>
      e.data.decision === 'ALLOW' && e.outcome?.hadIncident
    ).length,
    incidentsAfterDeny: decisionsWithOutcome.filter(e =>
      e.data.decision === 'BLOCK' && e.outcome?.hadIncident
    ).length,
    overridesThatAvoided: overridesWithOutcome.filter(e =>
      !e.outcome?.hadIncident && !e.outcome?.degradedSystem
    ).length,
    overridesThatCaused: overridesWithOutcome.filter(e =>
      e.outcome?.hadIncident || e.outcome?.degradedSystem
    ).length,
    approvalsThaDegraded: approvalsWithOutcome.filter(e =>
      e.outcome?.degradedSystem
    ).length,
    warningsBeforeIncidents: warningsWithOutcome.filter(e =>
      e.outcome?.hadIncident
    ).length,
    warningsWithoutIncidents: warningsWithOutcome.filter(e =>
      !e.outcome?.hadIncident
    ).length,
  };

  // Compute latencies
  const decisionLatencies = decisionsWithOutcome
    .filter(e => e.outcome?.latencyMs !== undefined)
    .map(e => e.outcome!.latencyMs!);

  const recoveryEvents = events.filter(e =>
    e.type === 'incident_occurred' && e.outcome?.resolved && e.outcome.latencyMs
  );

  const latencies = {
    avgDecisionMs: decisionLatencies.length > 0
      ? decisionLatencies.reduce((a, b) => a + b, 0) / decisionLatencies.length
      : 0,
    p95DecisionMs: decisionLatencies.length > 0
      ? decisionLatencies.sort((a, b) => a - b)[Math.floor(decisionLatencies.length * 0.95)] || 0
      : 0,
    avgRecoveryMs: recoveryEvents.length > 0
      ? recoveryEvents.reduce((sum, e) => sum + (e.outcome?.latencyMs || 0), 0) / recoveryEvents.length
      : 0,
  };

  // Compute budgets
  const budgetAllocated = events
    .filter(e => e.type === 'budget_allocated')
    .reduce((sum, e) => sum + ((e.data.amount as number) || 0), 0);
  const budgetConsumed = events
    .filter(e => e.type === 'budget_consumed')
    .reduce((sum, e) => sum + ((e.data.amount as number) || 0), 0);

  const budgets = {
    allocated: budgetAllocated,
    consumed: budgetConsumed,
    wasted: Math.max(0, budgetAllocated - budgetConsumed),
  };

  const aggregate: WindowAggregate = {
    window,
    start,
    end,
    counts,
    outcomes,
    latencies,
    budgets,
  };

  // Cache for 1 minute
  aggregateCache.set(cacheKey, { aggregate, expiresAt: Date.now() + 60000 });

  return aggregate;
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL COMPUTATION - ALL 15 SIGNALS
// ═══════════════════════════════════════════════════════════════════════════

function computeRating(
  signal: GovernanceSignal,
  value: number
): GovernanceScore['rating'] {
  const thresholds = DEFAULT_THRESHOLDS[signal];
  const isInverted = INVERTED_SIGNALS.includes(signal);

  if (isInverted) {
    // Lower is better
    if (value <= thresholds.excellent) return 'excellent';
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.acceptable) return 'acceptable';
    if (value <= thresholds.concerning) return 'concerning';
    return 'critical';
  } else {
    // Higher is better
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.acceptable) return 'acceptable';
    if (value >= thresholds.concerning) return 'concerning';
    return 'critical';
  }
}

function computeTrend(
  current: number,
  previous: number,
  signal: GovernanceSignal
): GovernanceScore['trend'] {
  const delta = current - previous;
  const isInverted = INVERTED_SIGNALS.includes(signal);
  const significantChange = 0.05; // 5% change threshold

  let direction: 'improving' | 'stable' | 'degrading';

  if (Math.abs(delta) < significantChange) {
    direction = 'stable';
  } else if (isInverted) {
    direction = delta < 0 ? 'improving' : 'degrading';
  } else {
    direction = delta > 0 ? 'improving' : 'degrading';
  }

  return { direction, delta, previousValue: previous };
}

/**
 * Signal 1: Override Accuracy
 * Overrides that avoided incidents vs caused them
 */
function computeOverrideAccuracy(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const avoided = current.outcomes.overridesThatAvoided;
  const caused = current.outcomes.overridesThatCaused;
  const total = avoided + caused;
  const value = total > 0 ? avoided / total : 1;

  const prevTotal = previous.outcomes.overridesThatAvoided + previous.outcomes.overridesThatCaused;
  const prevValue = prevTotal > 0 ? previous.outcomes.overridesThatAvoided / prevTotal : 1;

  return buildScore('override_accuracy', value, avoided, total, 'avoided / (avoided + caused)', current, prevValue);
}

/**
 * Signal 2: Policy Precision
 * True positives / (True positives + False positives)
 */
function computePolicyPrecision(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  // True positive: blocked and would have caused incident
  // False positive: blocked but wouldn't have caused incident
  const blocked = current.counts.denials;
  const falseBlocks = current.outcomes.incidentsAfterDeny; // Blocked but still had incident = false negative actually
  // Approximate: if we block and no incident, it's either TP or FP
  // Use override rate as proxy for FP
  const overriddenBlocks = current.counts.overrides;
  const trueBlocks = Math.max(0, blocked - overriddenBlocks);

  const value = blocked > 0 ? trueBlocks / blocked : 1;

  const prevBlocked = previous.counts.denials;
  const prevOverridden = previous.counts.overrides;
  const prevTrueBlocks = Math.max(0, prevBlocked - prevOverridden);
  const prevValue = prevBlocked > 0 ? prevTrueBlocks / prevBlocked : 1;

  return buildScore('policy_precision', value, trueBlocks, blocked, 'trueBlocks / totalBlocks', current, prevValue);
}

/**
 * Signal 3: Approval Effectiveness
 * Approved changes that did NOT degrade system
 */
function computeApprovalEffectiveness(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const approvals = current.counts.approvals;
  const degraded = current.outcomes.approvalsThaDegraded;
  const effective = approvals - degraded;
  const value = approvals > 0 ? effective / approvals : 1;

  const prevApprovals = previous.counts.approvals;
  const prevDegraded = previous.outcomes.approvalsThaDegraded;
  const prevEffective = prevApprovals - prevDegraded;
  const prevValue = prevApprovals > 0 ? prevEffective / prevApprovals : 1;

  return buildScore('approval_effectiveness', value, effective, approvals, '(approvals - degraded) / approvals', current, prevValue);
}

/**
 * Signal 4: Autonomy Trust Score
 * How often automation decisions are kept vs reverted
 */
function computeAutonomyTrustScore(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const automationDecisions = current.counts.automationDecisions;
  const reverts = current.counts.reverts;
  const kept = automationDecisions - reverts;
  const value = automationDecisions > 0 ? kept / automationDecisions : 1;

  const prevAuto = previous.counts.automationDecisions;
  const prevReverts = previous.counts.reverts;
  const prevKept = prevAuto - prevReverts;
  const prevValue = prevAuto > 0 ? prevKept / prevAuto : 1;

  return buildScore('autonomy_trust_score', value, kept, automationDecisions, '(auto - reverts) / auto', current, prevValue);
}

/**
 * Signal 5: Readiness Volatility (lower is better)
 * Rate of readiness state changes
 */
function computeReadinessVolatility(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const readinessChanges = eventStore.filter(e =>
    e.type === 'readiness_changed' &&
    e.timestamp >= current.start && e.timestamp <= current.end
  ).length;

  // Normalize by time window (changes per hour, expect < 1)
  const hoursInWindow = (current.end.getTime() - current.start.getTime()) / (1000 * 60 * 60);
  const value = hoursInWindow > 0 ? Math.min(1, readinessChanges / (hoursInWindow * 2)) : 0;

  const prevChanges = eventStore.filter(e =>
    e.type === 'readiness_changed' &&
    e.timestamp >= previous.start && e.timestamp <= previous.end
  ).length;
  const prevHours = (previous.end.getTime() - previous.start.getTime()) / (1000 * 60 * 60);
  const prevValue = prevHours > 0 ? Math.min(1, prevChanges / (prevHours * 2)) : 0;

  return buildScore('readiness_volatility', value, readinessChanges, hoursInWindow * 2, 'changes / (hours * 2)', current, prevValue);
}

/**
 * Signal 6: Incident Preventability Index
 * Incidents that had prior warning signals
 */
function computeIncidentPreventability(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const incidents = current.counts.incidents;
  const warningsBeforeIncidents = current.outcomes.warningsBeforeIncidents;
  const value = incidents > 0 ? warningsBeforeIncidents / incidents : 1;

  const prevIncidents = previous.counts.incidents;
  const prevWarnings = previous.outcomes.warningsBeforeIncidents;
  const prevValue = prevIncidents > 0 ? prevWarnings / prevIncidents : 1;

  return buildScore('incident_preventability', value, warningsBeforeIncidents, incidents, 'warningsBeforeIncidents / incidents', current, prevValue);
}

/**
 * Signal 7: Budget Waste Ratio (lower is better)
 * Unused budget as fraction of allocated
 */
function computeBudgetWasteRatio(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const allocated = current.budgets.allocated;
  const wasted = current.budgets.wasted;
  const value = allocated > 0 ? wasted / allocated : 0;

  const prevAllocated = previous.budgets.allocated;
  const prevWasted = previous.budgets.wasted;
  const prevValue = prevAllocated > 0 ? prevWasted / prevAllocated : 0;

  return buildScore('budget_waste_ratio', value, wasted, allocated, 'wasted / allocated', current, prevValue);
}

/**
 * Signal 8: Decision Latency Drift (lower is better)
 * How much latency increased from baseline
 */
function computeDecisionLatencyDrift(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const currentLatency = current.latencies.avgDecisionMs;
  const baselineLatency = previous.latencies.avgDecisionMs || currentLatency;
  const drift = baselineLatency > 0 ? (currentLatency - baselineLatency) / baselineLatency : 0;
  const value = Math.max(0, Math.min(1, drift));

  return buildScore('decision_latency_drift', value, currentLatency, baselineLatency, '(current - baseline) / baseline', current, 0);
}

/**
 * Signal 9: Executive Surprise Index (lower is better)
 * Incidents that had NO prior warning
 */
function computeExecutiveSurpriseIndex(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const incidents = current.counts.incidents;
  const warned = current.outcomes.warningsBeforeIncidents;
  const surprises = incidents - warned;
  const value = incidents > 0 ? surprises / incidents : 0;

  const prevIncidents = previous.counts.incidents;
  const prevWarned = previous.outcomes.warningsBeforeIncidents;
  const prevSurprises = prevIncidents - prevWarned;
  const prevValue = prevIncidents > 0 ? prevSurprises / prevIncidents : 0;

  return buildScore('executive_surprise_index', value, surprises, incidents, '(incidents - warned) / incidents', current, prevValue);
}

/**
 * Signal 10: Escalation Effectiveness
 * Escalations that resulted in changed outcomes
 */
function computeEscalationEffectiveness(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const escalations = current.counts.escalations;
  const escalationsWithOutcome = eventStore.filter(e =>
    e.type === 'escalation_triggered' &&
    e.timestamp >= current.start && e.timestamp <= current.end &&
    e.outcome?.resolved
  ).length;
  const value = escalations > 0 ? escalationsWithOutcome / escalations : 1;

  const prevEscalations = previous.counts.escalations;
  const prevResolved = eventStore.filter(e =>
    e.type === 'escalation_triggered' &&
    e.timestamp >= previous.start && e.timestamp <= previous.end &&
    e.outcome?.resolved
  ).length;
  const prevValue = prevEscalations > 0 ? prevResolved / prevEscalations : 1;

  return buildScore('escalation_effectiveness', value, escalationsWithOutcome, escalations, 'resolved / escalations', current, prevValue);
}

/**
 * Signal 11: Automation Degradation Rate (lower is better)
 * Automation decisions that got worse over time
 */
function computeAutomationDegradationRate(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const autoDecisions = current.counts.automationDecisions;
  const autoIncidents = eventStore.filter(e =>
    e.type === 'decision_made' &&
    e.source === 'automation' &&
    e.timestamp >= current.start && e.timestamp <= current.end &&
    e.outcome?.hadIncident
  ).length;
  const value = autoDecisions > 0 ? autoIncidents / autoDecisions : 0;

  const prevAuto = previous.counts.automationDecisions;
  const prevIncidents = eventStore.filter(e =>
    e.type === 'decision_made' &&
    e.source === 'automation' &&
    e.timestamp >= previous.start && e.timestamp <= previous.end &&
    e.outcome?.hadIncident
  ).length;
  const prevValue = prevAuto > 0 ? prevIncidents / prevAuto : 0;

  return buildScore('automation_degradation_rate', value, autoIncidents, autoDecisions, 'autoIncidents / autoDecisions', current, prevValue);
}

/**
 * Signal 12: Governance Response Time
 * Fast response to signals (normalized)
 */
function computeGovernanceResponseTime(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const interventions = eventStore.filter(e =>
    e.type === 'intervention_applied' &&
    e.timestamp >= current.start && e.timestamp <= current.end &&
    e.outcome?.latencyMs !== undefined
  );

  const avgResponseMs = interventions.length > 0
    ? interventions.reduce((sum, e) => sum + (e.outcome?.latencyMs || 0), 0) / interventions.length
    : 0;

  // Normalize: expect < 5 minutes = 300000ms
  const value = Math.max(0, 1 - (avgResponseMs / 300000));

  const prevInterventions = eventStore.filter(e =>
    e.type === 'intervention_applied' &&
    e.timestamp >= previous.start && e.timestamp <= previous.end &&
    e.outcome?.latencyMs !== undefined
  );
  const prevAvg = prevInterventions.length > 0
    ? prevInterventions.reduce((sum, e) => sum + (e.outcome?.latencyMs || 0), 0) / prevInterventions.length
    : 0;
  const prevValue = Math.max(0, 1 - (prevAvg / 300000));

  return buildScore('governance_response_time', value, 300000 - avgResponseMs, 300000, '1 - (avgMs / 300000)', current, prevValue);
}

/**
 * Signal 13: Recovery Efficiency
 * Fast recovery from incidents
 */
function computeRecoveryEfficiency(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const avgRecoveryMs = current.latencies.avgRecoveryMs;
  // Normalize: expect < 30 minutes = 1800000ms
  const value = Math.max(0, 1 - (avgRecoveryMs / 1800000));

  const prevAvg = previous.latencies.avgRecoveryMs;
  const prevValue = Math.max(0, 1 - (prevAvg / 1800000));

  return buildScore('recovery_efficiency', value, 1800000 - avgRecoveryMs, 1800000, '1 - (avgMs / 1800000)', current, prevValue);
}

/**
 * Signal 14: False Alarm Rate (lower is better)
 * Warnings that weren't real issues
 */
function computeFalseAlarmRate(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const warnings = current.counts.warnings;
  const falseAlarms = current.outcomes.warningsWithoutIncidents;
  const value = warnings > 0 ? falseAlarms / warnings : 0;

  const prevWarnings = previous.counts.warnings;
  const prevFalse = previous.outcomes.warningsWithoutIncidents;
  const prevValue = prevWarnings > 0 ? prevFalse / prevWarnings : 0;

  return buildScore('false_alarm_rate', value, falseAlarms, warnings, 'falseAlarms / warnings', current, prevValue);
}

/**
 * Signal 15: Intervention Success Rate
 * Interventions that improved outcomes
 */
function computeInterventionSuccessRate(current: WindowAggregate, previous: WindowAggregate): GovernanceScore {
  const interventions = eventStore.filter(e =>
    e.type === 'intervention_applied' &&
    e.timestamp >= current.start && e.timestamp <= current.end
  );
  const successful = interventions.filter(e => e.outcome?.resolved && !e.outcome?.degradedSystem).length;
  const value = interventions.length > 0 ? successful / interventions.length : 1;

  const prevInterventions = eventStore.filter(e =>
    e.type === 'intervention_applied' &&
    e.timestamp >= previous.start && e.timestamp <= previous.end
  );
  const prevSuccessful = prevInterventions.filter(e => e.outcome?.resolved && !e.outcome?.degradedSystem).length;
  const prevValue = prevInterventions.length > 0 ? prevSuccessful / prevInterventions.length : 1;

  return buildScore('intervention_success_rate', value, successful, interventions.length, 'successful / interventions', current, prevValue);
}

function buildScore(
  signal: GovernanceSignal,
  value: number,
  numerator: number,
  denominator: number,
  formula: string,
  aggregate: WindowAggregate,
  previousValue: number
): GovernanceScore {
  const trend = computeTrend(value, previousValue, signal);
  const rating = computeRating(signal, value);

  return {
    signal,
    window: aggregate.window,
    windowStart: aggregate.start,
    windowEnd: aggregate.end,
    value: Math.max(0, Math.min(1, value)),
    components: { numerator, denominator, formula },
    trend,
    rating,
    threshold: DEFAULT_THRESHOLDS[signal],
    dataPoints: aggregate.counts.totalDecisions,
    confidence: Math.min(1, aggregate.counts.totalDecisions / 100),
    computedAt: new Date(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

const SIGNAL_COMPUTERS: Record<GovernanceSignal, (c: WindowAggregate, p: WindowAggregate) => GovernanceScore> = {
  override_accuracy: computeOverrideAccuracy,
  policy_precision: computePolicyPrecision,
  approval_effectiveness: computeApprovalEffectiveness,
  autonomy_trust_score: computeAutonomyTrustScore,
  readiness_volatility: computeReadinessVolatility,
  incident_preventability: computeIncidentPreventability,
  budget_waste_ratio: computeBudgetWasteRatio,
  decision_latency_drift: computeDecisionLatencyDrift,
  executive_surprise_index: computeExecutiveSurpriseIndex,
  escalation_effectiveness: computeEscalationEffectiveness,
  automation_degradation_rate: computeAutomationDegradationRate,
  governance_response_time: computeGovernanceResponseTime,
  recovery_efficiency: computeRecoveryEfficiency,
  false_alarm_rate: computeFalseAlarmRate,
  intervention_success_rate: computeInterventionSuccessRate,
};

/**
 * Compute a single governance signal
 */
export function computeSignal(signal: GovernanceSignal, window: MetricWindow): GovernanceScore {
  const current = aggregateWindow(window);
  const { start: prevStart, end: prevEnd } = getPreviousWindowBounds(window);
  const previous = aggregateWindow(window, prevStart);

  return SIGNAL_COMPUTERS[signal](current, previous);
}

/**
 * Compute all governance signals for a window
 */
export function computeAllSignals(window: MetricWindow): GovernanceScore[] {
  const current = aggregateWindow(window);
  const { start: prevStart } = getPreviousWindowBounds(window);
  const previous = aggregateWindow(window, prevStart);

  return Object.keys(SIGNAL_COMPUTERS).map(signal =>
    SIGNAL_COMPUTERS[signal as GovernanceSignal](current, previous)
  );
}

/**
 * Persist scores to history
 */
export function persistScores(scores: GovernanceScore[]): void {
  for (const score of scores) {
    const periodKey = `${score.windowStart.toISOString().slice(0, 13)}-${score.window}`;
    const historyKey = `${score.signal}-${periodKey}`;

    const record: HistoricalScore = {
      id: historyKey,
      signal: score.signal,
      window: score.window,
      periodKey,
      value: score.value,
      components: score.components,
      rating: score.rating,
      dataPoints: score.dataPoints,
      recordedAt: new Date(),
    };

    // Bounded storage
    if (historyStore.size >= MAX_HISTORY) {
      const oldest = Array.from(historyStore.values())
        .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())[0];
      if (oldest) historyStore.delete(oldest.id);
    }

    historyStore.set(historyKey, record);
  }
}

/**
 * Get historical scores for a signal
 */
export function getHistoricalScores(signal: GovernanceSignal, limit: number = 100): HistoricalScore[] {
  return Array.from(historyStore.values())
    .filter(h => h.signal === signal)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
    .slice(0, limit);
}

/**
 * Get overall governance health score
 */
export function computeOverallHealth(window: MetricWindow): {
  score: number;
  rating: GovernanceScore['rating'];
  breakdown: { signal: GovernanceSignal; score: number; rating: GovernanceScore['rating'] }[];
} {
  const signals = computeAllSignals(window);

  // Weighted average (all equal for now)
  const avgScore = signals.reduce((sum, s) => sum + s.value, 0) / signals.length;

  // Count ratings
  const ratings = signals.map(s => s.rating);
  const criticalCount = ratings.filter(r => r === 'critical').length;
  const concerningCount = ratings.filter(r => r === 'concerning').length;

  let overallRating: GovernanceScore['rating'];
  if (criticalCount > 2) overallRating = 'critical';
  else if (criticalCount > 0 || concerningCount > 3) overallRating = 'concerning';
  else if (concerningCount > 0 || avgScore < 0.7) overallRating = 'acceptable';
  else if (avgScore >= 0.9) overallRating = 'excellent';
  else overallRating = 'good';

  return {
    score: avgScore,
    rating: overallRating,
    breakdown: signals.map(s => ({ signal: s.signal, score: s.value, rating: s.rating })),
  };
}

/**
 * Clear all data (for testing)
 */
export function clearMetricsData(): void {
  eventStore.length = 0;
  historyStore.clear();
  aggregateCache.clear();
}

/**
 * Get event count (for diagnostics)
 */
export function getEventCount(): number {
  return eventStore.length;
}
