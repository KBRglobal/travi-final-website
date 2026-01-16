/**
 * Governance Intervention Engine - Core Logic
 * Recommends adjustments but NEVER hard-blocks
 */

import {
  Intervention,
  InterventionType,
  InterventionPriority,
  InterventionStatus,
  AutoAdjustment,
  InterventionRule,
  InterventionEngineConfig,
  DEFAULT_INTERVENTION_CONFIG,
  DEFAULT_INTERVENTION_RULES,
} from './types';
import { computeSignal, computeAllSignals, GovernanceSignal } from '../metrics';
import { computeSystemicRisk, getSystemicRiskSummary } from '../risk';

// Bounded storage
const MAX_INTERVENTIONS = 50;
const MAX_AUTO_ADJUSTMENTS = 100;
const MAX_HISTORY = 500;

const activeInterventions = new Map<string, Intervention>();
const autoAdjustments = new Map<string, AutoAdjustment>();
const interventionHistory: Intervention[] = [];
const rules: InterventionRule[] = [...DEFAULT_INTERVENTION_RULES];

function getConfig(): InterventionEngineConfig {
  return {
    ...DEFAULT_INTERVENTION_CONFIG,
    enabled: process.env.ENABLE_PLATFORM_SELF_GOVERNANCE === 'true',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE EVALUATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate all rules and generate interventions
 */
export function evaluateRules(): Intervention[] {
  const config = getConfig();
  if (!config.enabled) return [];

  const newInterventions: Intervention[] = [];
  const now = Date.now();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    // Check cooldown
    if (rule.lastTriggered) {
      const hoursSinceLastTrigger = (now - rule.lastTriggered.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastTrigger < rule.cooldown.minIntervalHours) continue;
    }

    // Evaluate conditions
    const conditionsMet = evaluateConditions(rule);
    if (!conditionsMet) continue;

    // Create intervention
    const intervention = createInterventionFromRule(rule);
    if (intervention) {
      newInterventions.push(intervention);
      rule.lastTriggered = new Date();
      rule.triggerCount++;
    }
  }

  return newInterventions;
}

function evaluateConditions(rule: InterventionRule): boolean {
  for (const condition of rule.conditions) {
    let value: number;

    if (condition.type === 'signal_below' || condition.type === 'signal_above') {
      const signal = computeSignal(condition.target as GovernanceSignal, condition.window);
      value = signal.value;
    } else if (condition.type === 'risk_above') {
      value = computeSystemicRisk();
    } else if (condition.type === 'pattern_detected') {
      // For pattern detection, check if pattern exists
      const summary = getSystemicRiskSummary();
      value = summary.topHiddenRisks.some(r => r.id.includes(condition.target)) ? 1 : 0;
    } else {
      continue;
    }

    // Check threshold
    if (condition.type === 'signal_below' && value >= condition.threshold) return false;
    if (condition.type === 'signal_above' && value <= condition.threshold) return false;
    if (condition.type === 'risk_above' && value <= condition.threshold) return false;
    if (condition.type === 'pattern_detected' && value === 0) return false;
  }

  return true;
}

function createInterventionFromRule(rule: InterventionRule): Intervention | null {
  const config = getConfig();

  // Gather triggering signals
  const triggeringSignals: GovernanceSignal[] = [];
  for (const condition of rule.conditions) {
    if (condition.type === 'signal_below' || condition.type === 'signal_above') {
      triggeringSignals.push(condition.target as GovernanceSignal);
    }
  }

  const intervention: Intervention = {
    id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: rule.action.interventionType,
    priority: rule.action.priority,
    status: 'proposed',

    target: {
      type: 'global',
      id: 'platform',
      name: 'Platform-wide',
    },

    adjustment: {
      parameter: getParameterForInterventionType(rule.action.interventionType),
      currentValue: 'current',
      recommendedValue: rule.action.adjustmentPercent
        ? `${rule.action.adjustmentPercent > 0 ? '+' : ''}${rule.action.adjustmentPercent}%`
        : 'as recommended',
      percentChange: rule.action.adjustmentPercent,
    },

    rationale: {
      summary: `${rule.name}: Triggered by ${rule.conditions.length} condition(s)`,
      triggeringSignals,
      triggeringRisks: [],
      dataPoints: 0,
      confidence: 0.8,
    },

    reversibility: {
      isReversible: true,
      rollbackProcedure: `Revert ${rule.action.interventionType} to previous value`,
      rollbackTimeMinutes: 5,
    },

    createdAt: new Date(),
    expiresAt: new Date(Date.now() + config.interventionExpiryHours * 60 * 60 * 1000),
  };

  // Store intervention
  storeIntervention(intervention);

  return intervention;
}

function getParameterForInterventionType(type: InterventionType): string {
  const parameterMap: Record<InterventionType, string> = {
    tighten_budget: 'autonomy_budget_limit',
    loosen_budget: 'autonomy_budget_limit',
    raise_approval_level: 'required_approval_level',
    lower_approval_level: 'required_approval_level',
    extend_cooldown: 'action_cooldown_seconds',
    reduce_cooldown: 'action_cooldown_seconds',
    require_simulation: 'simulation_required',
    increase_monitoring: 'monitoring_level',
    decrease_monitoring: 'monitoring_level',
    adjust_confidence: 'confidence_threshold',
    prioritize_review: 'review_priority',
    deprioritize_review: 'review_priority',
    escalate_attention: 'attention_level',
    suggest_policy_review: 'policy_review_flag',
  };
  return parameterMap[type];
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERVENTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

function storeIntervention(intervention: Intervention): void {
  // Bounded storage
  if (activeInterventions.size >= MAX_INTERVENTIONS) {
    // Remove oldest expired or superseded
    const removable = Array.from(activeInterventions.entries())
      .filter(([, i]) => i.status === 'expired' || i.status === 'superseded')
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());

    if (removable.length > 0) {
      activeInterventions.delete(removable[0][0]);
    } else {
      // Remove oldest
      const oldest = Array.from(activeInterventions.entries())
        .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime())[0];
      if (oldest) {
        moveToHistory(oldest[1]);
        activeInterventions.delete(oldest[0]);
      }
    }
  }

  activeInterventions.set(intervention.id, intervention);
}

function moveToHistory(intervention: Intervention): void {
  if (interventionHistory.length >= MAX_HISTORY) {
    interventionHistory.shift();
  }
  interventionHistory.push(intervention);
}

/**
 * Get all active interventions
 */
export function getActiveInterventions(): Intervention[] {
  return Array.from(activeInterventions.values())
    .filter(i => i.status === 'proposed' || i.status === 'accepted')
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Get intervention by ID
 */
export function getIntervention(id: string): Intervention | null {
  return activeInterventions.get(id) || null;
}

/**
 * Accept an intervention
 */
export function acceptIntervention(id: string, acceptedBy: string): boolean {
  const intervention = activeInterventions.get(id);
  if (!intervention || intervention.status !== 'proposed') return false;

  intervention.status = 'accepted';
  intervention.actedUponAt = new Date();
  intervention.actedUponBy = acceptedBy;

  return true;
}

/**
 * Reject an intervention
 */
export function rejectIntervention(id: string, rejectedBy: string, reason?: string): boolean {
  const intervention = activeInterventions.get(id);
  if (!intervention || intervention.status !== 'proposed') return false;

  intervention.status = 'rejected';
  intervention.actedUponAt = new Date();
  intervention.actedUponBy = rejectedBy;

  moveToHistory(intervention);
  activeInterventions.delete(id);

  return true;
}

/**
 * Record intervention outcome
 */
export function recordInterventionOutcome(
  id: string,
  wasEffective: boolean,
  signalImpact: Record<GovernanceSignal, number>,
  notes?: string
): boolean {
  const intervention = activeInterventions.get(id) || interventionHistory.find(i => i.id === id);
  if (!intervention) return false;

  intervention.outcome = {
    measuredAt: new Date(),
    wasEffective,
    signalImpact,
    notes,
  };

  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTO-ADJUSTMENTS (NO HUMAN APPROVAL NEEDED)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply auto-adjustments based on patterns
 */
export function applyAutoAdjustments(): AutoAdjustment[] {
  const config = getConfig();
  if (!config.enabled) return [];

  const adjustments: AutoAdjustment[] = [];
  const signals = computeAllSignals('day');

  // Adjust confidence based on accuracy signals
  const accuracySignals = signals.filter(s =>
    s.signal === 'override_accuracy' || s.signal === 'policy_precision'
  );

  for (const signal of accuracySignals) {
    if (signal.rating === 'critical' || signal.rating === 'concerning') {
      const adjustment = createAutoAdjustment(
        'confidence_score',
        { type: 'feature', id: 'global' },
        signal.value,
        Math.max(
          signal.value + config.autoAdjustThresholds.minConfidenceAdjustment,
          signal.value - config.autoAdjustThresholds.confidenceStepSize
        ),
        `${signal.signal} is ${signal.rating} (${(signal.value * 100).toFixed(0)}%)`
      );
      adjustments.push(adjustment);
    } else if (signal.rating === 'excellent') {
      const adjustment = createAutoAdjustment(
        'confidence_score',
        { type: 'feature', id: 'global' },
        signal.value,
        Math.min(
          signal.value + config.autoAdjustThresholds.maxConfidenceAdjustment,
          signal.value + config.autoAdjustThresholds.confidenceStepSize
        ),
        `${signal.signal} is excellent - increasing confidence`
      );
      adjustments.push(adjustment);
    }
  }

  // Adjust priority based on risk
  const riskSummary = getSystemicRiskSummary();
  if (riskSummary.rating === 'critical' || riskSummary.rating === 'high') {
    const adjustment = createAutoAdjustment(
      'recommendation_priority',
      { type: 'policy', id: 'risk-related' },
      0,
      riskSummary.rating === 'critical' ? 2 : 1,
      `Systemic risk is ${riskSummary.rating} - elevating priority`
    );
    adjustments.push(adjustment);
  }

  return adjustments;
}

function createAutoAdjustment(
  type: AutoAdjustment['type'],
  target: AutoAdjustment['target'],
  from: number,
  to: number,
  reason: string
): AutoAdjustment {
  const config = getConfig();

  const adjustment: AutoAdjustment = {
    id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    target,
    adjustment: { from, to, reason },
    appliedAt: new Date(),
    expiresAt: new Date(Date.now() + config.autoAdjustmentExpiryHours * 60 * 60 * 1000),
    wasReverted: false,
  };

  // Bounded storage
  if (autoAdjustments.size >= MAX_AUTO_ADJUSTMENTS) {
    const expired = Array.from(autoAdjustments.entries())
      .filter(([, a]) => a.expiresAt && a.expiresAt < new Date())
      .sort(([, a], [, b]) => a.appliedAt.getTime() - b.appliedAt.getTime());

    if (expired.length > 0) {
      autoAdjustments.delete(expired[0][0]);
    } else {
      const oldest = Array.from(autoAdjustments.entries())
        .sort(([, a], [, b]) => a.appliedAt.getTime() - b.appliedAt.getTime())[0];
      if (oldest) autoAdjustments.delete(oldest[0]);
    }
  }

  autoAdjustments.set(adjustment.id, adjustment);
  return adjustment;
}

/**
 * Revert an auto-adjustment
 */
export function revertAutoAdjustment(id: string): boolean {
  const adjustment = autoAdjustments.get(id);
  if (!adjustment || adjustment.wasReverted) return false;

  adjustment.wasReverted = true;
  adjustment.revertedAt = new Date();

  return true;
}

/**
 * Get all auto-adjustments
 */
export function getAutoAdjustments(): AutoAdjustment[] {
  return Array.from(autoAdjustments.values())
    .filter(a => !a.wasReverted && (!a.expiresAt || a.expiresAt > new Date()))
    .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
}

// ═══════════════════════════════════════════════════════════════════════════
// RULE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all intervention rules
 */
export function getInterventionRules(): InterventionRule[] {
  return [...rules];
}

/**
 * Enable/disable a rule
 */
export function setRuleEnabled(ruleId: string, enabled: boolean): boolean {
  const rule = rules.find(r => r.id === ruleId);
  if (!rule) return false;
  rule.enabled = enabled;
  return true;
}

/**
 * Add a custom rule
 */
export function addInterventionRule(rule: InterventionRule): void {
  rules.push(rule);
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAGNOSTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get intervention statistics
 */
export function getInterventionStats(): {
  activeCount: number;
  proposedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  effectiveRate: number;
  autoAdjustmentCount: number;
} {
  const active = Array.from(activeInterventions.values());
  const history = interventionHistory;
  const all = [...active, ...history];

  const withOutcome = all.filter(i => i.outcome);
  const effective = withOutcome.filter(i => i.outcome?.wasEffective);

  return {
    activeCount: active.length,
    proposedCount: active.filter(i => i.status === 'proposed').length,
    acceptedCount: all.filter(i => i.status === 'accepted').length,
    rejectedCount: all.filter(i => i.status === 'rejected').length,
    effectiveRate: withOutcome.length > 0 ? effective.length / withOutcome.length : 1,
    autoAdjustmentCount: autoAdjustments.size,
  };
}

/**
 * Clear all intervention data (for testing)
 */
export function clearInterventionData(): void {
  activeInterventions.clear();
  autoAdjustments.clear();
  interventionHistory.length = 0;
  for (const rule of rules) {
    rule.lastTriggered = undefined;
    rule.triggerCount = 0;
  }
}
