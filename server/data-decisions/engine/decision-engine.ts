/**
 * Decision Engine
 * Core engine that evaluates signals, applies rules, and generates decisions
 */

import { randomUUID } from 'crypto';
import type {
  Decision,
  DecisionType,
  DecisionCategory,
  DecisionStatus,
  DataActionBinding,
  EvaluatedSignal,
  AutopilotMode,
  ConfidenceScore,
  DecisionAuditLog,
} from '../types';
import { bindingsRegistry } from './bindings-registry';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface DecisionEngineConfig {
  autopilotMode: AutopilotMode;
  minimumConfidence: number;
  maximumDataStaleness: number; // hours
  enableCircuitBreaker: boolean;
  decisionExpiryHours: number;
}

const DEFAULT_CONFIG: DecisionEngineConfig = {
  autopilotMode: 'supervised',
  minimumConfidence: 70,
  maximumDataStaleness: 24,
  enableCircuitBreaker: true,
  decisionExpiryHours: 24,
};

// =============================================================================
// METRIC THRESHOLDS
// =============================================================================

interface MetricThreshold {
  operator: '>' | '<' | '>=' | '<=' | '=' | '!=' | 'change';
  value: number;
  changeType?: 'absolute' | 'percentage';
  changePeriod?: string;
}

function parseCondition(condition: string): MetricThreshold | null {
  // Handle percentage conditions
  const percentMatch = condition.match(/^([<>]=?|=)\s*(-?\d+(?:\.\d+)?)\s*%$/);
  if (percentMatch) {
    return {
      operator: percentMatch[1] as MetricThreshold['operator'],
      value: parseFloat(percentMatch[2]) / 100,
    };
  }

  // Handle week-over-week change conditions
  const wowMatch = condition.match(/^(-?\d+(?:\.\d+)?)\s*%\s*week-over-week$/);
  if (wowMatch) {
    return {
      operator: 'change',
      value: parseFloat(wowMatch[1]) / 100,
      changeType: 'percentage',
      changePeriod: 'week',
    };
  }

  // Handle simple numeric conditions
  const numericMatch = condition.match(/^([<>]=?|=)\s*(-?\d+(?:\.\d+)?)$/);
  if (numericMatch) {
    return {
      operator: numericMatch[1] as MetricThreshold['operator'],
      value: parseFloat(numericMatch[2]),
    };
  }

  // Handle dollar amount conditions
  const dollarMatch = condition.match(/^([<>]=?|=)\s*\$(-?\d+(?:\.\d+)?)$/);
  if (dollarMatch) {
    return {
      operator: dollarMatch[1] as MetricThreshold['operator'],
      value: parseFloat(dollarMatch[2]),
    };
  }

  // Handle position increase conditions
  const positionMatch = condition.match(/increased by\s*>\s*(\d+)\s*positions/);
  if (positionMatch) {
    return {
      operator: '>',
      value: parseInt(positionMatch[1]),
      changeType: 'absolute',
    };
  }

  return null;
}

function evaluateCondition(
  threshold: MetricThreshold,
  currentValue: number,
  previousValue?: number
): boolean {
  if (threshold.operator === 'change' && previousValue !== undefined) {
    const change = (currentValue - previousValue) / previousValue;
    return change <= threshold.value; // For negative thresholds (e.g., -30%)
  }

  switch (threshold.operator) {
    case '>':
      return currentValue > threshold.value;
    case '<':
      return currentValue < threshold.value;
    case '>=':
      return currentValue >= threshold.value;
    case '<=':
      return currentValue <= threshold.value;
    case '=':
      return Math.abs(currentValue - threshold.value) < 0.001;
    case '!=':
      return Math.abs(currentValue - threshold.value) >= 0.001;
    default:
      return false;
  }
}

// =============================================================================
// DECISION CATEGORY MAPPING
// =============================================================================

function determineCategory(
  binding: DataActionBinding,
  autopilotMode: AutopilotMode
): DecisionCategory {
  // Category D: FORBIDDEN - never allowed
  const forbiddenActions: DecisionType[] = [
    // These would be listed if we had them
  ];

  if (forbiddenActions.includes(binding.action)) {
    return 'forbidden';
  }

  // Category C: ESCALATION-ONLY
  if (binding.authority === 'escalating' || binding.autopilot === 'off') {
    return 'escalation_only';
  }

  // Category B: SUPERVISED
  if (
    binding.autopilot === 'supervised' ||
    (autopilotMode === 'supervised' && binding.authority === 'triggering')
  ) {
    return 'supervised';
  }

  // Category A: AUTO-EXECUTE
  if (binding.autopilot === 'full' && autopilotMode !== 'off') {
    return 'auto_execute';
  }

  return 'supervised';
}

// =============================================================================
// DECISION ENGINE
// =============================================================================

export interface MetricData {
  metricId: string;
  currentValue: number;
  previousValue?: number;
  dataPoints: number;
  lastUpdated: Date;
  confidence?: number;
}

export interface DecisionResult {
  decision: Decision;
  shouldExecute: boolean;
  requiresApproval: boolean;
  auditLog: DecisionAuditLog;
}

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private pendingDecisions: Map<string, Decision> = new Map();
  private executedDecisions: Decision[] = [];
  private circuitBreakerOpen = false;

  constructor(config: Partial<DecisionEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // =========================================================================
  // CONFIGURATION
  // =========================================================================

  setAutopilotMode(mode: AutopilotMode): void {
    this.config.autopilotMode = mode;
  }

  getAutopilotMode(): AutopilotMode {
    return this.config.autopilotMode;
  }

  setMinimumConfidence(confidence: number): void {
    this.config.minimumConfidence = Math.max(0, Math.min(100, confidence));
  }

  // =========================================================================
  // SIGNAL EVALUATION
  // =========================================================================

  evaluateSignal(binding: DataActionBinding, metrics: MetricData[]): EvaluatedSignal | null {
    const { signal } = binding;

    // Handle metric-based signals
    if (signal.metric) {
      const metricData = metrics.find(m => m.metricId === signal.metric);
      if (!metricData) return null;

      const threshold = parseCondition(signal.condition);
      if (!threshold) return null;

      const triggered = evaluateCondition(
        threshold,
        metricData.currentValue,
        metricData.previousValue
      );

      // Check minimum data points
      if (signal.minDataPoints && metricData.dataPoints < signal.minDataPoints) {
        return {
          bindingId: binding.id,
          metricId: signal.metric,
          currentValue: metricData.currentValue,
          threshold: threshold.value,
          condition: signal.condition,
          triggered: false, // Not enough data
          confidence: (metricData.dataPoints / signal.minDataPoints) * 100,
          dataPoints: metricData.dataPoints,
          freshness: this.calculateFreshness(metricData.lastUpdated),
        };
      }

      // Check additional condition if present
      if (signal.additionalCondition && triggered) {
        const additionalBinding = { ...binding, signal: { ...signal, condition: signal.additionalCondition } };
        const additionalResult = this.evaluateSignal(additionalBinding, metrics);
        if (!additionalResult?.triggered) {
          return {
            bindingId: binding.id,
            metricId: signal.metric,
            currentValue: metricData.currentValue,
            threshold: threshold.value,
            condition: signal.condition,
            triggered: false,
            confidence: metricData.confidence || 85,
            dataPoints: metricData.dataPoints,
            freshness: this.calculateFreshness(metricData.lastUpdated),
          };
        }
      }

      return {
        bindingId: binding.id,
        metricId: signal.metric,
        currentValue: metricData.currentValue,
        threshold: threshold.value,
        condition: signal.condition,
        triggered,
        confidence: metricData.confidence || 85,
        dataPoints: metricData.dataPoints,
        freshness: this.calculateFreshness(metricData.lastUpdated),
      };
    }

    return null;
  }

  private calculateFreshness(lastUpdated: Date): number {
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);
    return hoursSinceUpdate;
  }

  // =========================================================================
  // DECISION GENERATION
  // =========================================================================

  generateDecision(
    binding: DataActionBinding,
    signal: EvaluatedSignal,
    entityId?: string
  ): DecisionResult | null {
    // Check circuit breaker
    if (this.circuitBreakerOpen && binding.authority !== 'blocking') {
      return null;
    }

    // Check if binding is on cooldown
    if (bindingsRegistry.isOnCooldown(binding.id)) {
      return null;
    }

    // Check max executions
    if (bindingsRegistry.hasReachedMaxExecutions(binding.id)) {
      return null;
    }

    // Check confidence threshold
    if (signal.confidence < this.config.minimumConfidence) {
      return null;
    }

    // Check data freshness
    if (signal.freshness > this.config.maximumDataStaleness) {
      return null;
    }

    const category = determineCategory(binding, this.config.autopilotMode);
    const decisionId = `DEC-${Date.now()}-${randomUUID().substring(0, 8)}`;

    const decision: Decision = {
      id: decisionId,
      bindingId: binding.id,
      type: binding.action,
      category,
      authority: binding.authority,
      signal: {
        metricId: signal.metricId,
        value: signal.currentValue,
        threshold: signal.threshold,
        condition: signal.condition,
      },
      confidence: signal.confidence,
      dataSufficiency: Math.min(100, (signal.dataPoints / 100) * 100),
      freshness: signal.freshness,
      status: 'pending',
      autopilotMode: this.config.autopilotMode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.decisionExpiryHours * 60 * 60 * 1000),
      impactedEntities: entityId ? [{ type: 'content', id: entityId }] : [],
      taskConfig: binding.task,
      escalation: binding.escalation,
    };

    const shouldExecute = this.shouldAutoExecute(decision);
    const requiresApproval = this.requiresApproval(decision);

    const auditLog = this.createAuditLog(decision, signal);

    return {
      decision,
      shouldExecute,
      requiresApproval,
      auditLog,
    };
  }

  private shouldAutoExecute(decision: Decision): boolean {
    if (this.config.autopilotMode === 'off') {
      return false;
    }

    if (decision.category === 'forbidden') {
      return false;
    }

    if (decision.category === 'escalation_only') {
      return false;
    }

    if (decision.category === 'auto_execute') {
      return true;
    }

    if (decision.category === 'supervised' && this.config.autopilotMode === 'full') {
      return true;
    }

    return false;
  }

  private requiresApproval(decision: Decision): boolean {
    if (decision.category === 'forbidden') {
      return true; // Always requires approval (and will be denied)
    }

    if (decision.category === 'escalation_only') {
      return true;
    }

    if (decision.category === 'supervised' && this.config.autopilotMode !== 'full') {
      return true;
    }

    return false;
  }

  private createAuditLog(decision: Decision, signal: EvaluatedSignal): DecisionAuditLog {
    return {
      decisionId: decision.id,
      timestamp: new Date(),
      triggerType: 'metric',
      triggerId: signal.metricId,
      triggerValue: signal.currentValue,
      threshold: signal.threshold,
      confidence: signal.confidence,
      dataSufficiency: decision.dataSufficiency,
      freshness: signal.freshness,
      decisionType: decision.type,
      category: decision.category,
      autopilotMode: decision.autopilotMode,
      executed: false,
      executedBy: 'system',
      approvalRequired: this.requiresApproval(decision),
      impactedEntities: decision.impactedEntities,
    };
  }

  // =========================================================================
  // DECISION EXECUTION
  // =========================================================================

  executeDecision(decision: Decision): Decision {
    const binding = bindingsRegistry.get(decision.bindingId);

    decision.status = 'executed';
    decision.executedAt = new Date();
    decision.executedBy = 'system';

    if (binding) {
      bindingsRegistry.recordExecution(binding.id);
    }

    this.executedDecisions.push(decision);
    this.pendingDecisions.delete(decision.id);

    return decision;
  }

  approveDecision(decisionId: string, approvedBy: string, notes?: string): Decision | null {
    const decision = this.pendingDecisions.get(decisionId);
    if (!decision) return null;

    decision.status = 'approved';
    decision.approvedBy = approvedBy;
    decision.approvedAt = new Date();
    decision.approvalNotes = notes;

    return this.executeDecision(decision);
  }

  rejectDecision(decisionId: string, rejectedBy: string, reason?: string): Decision | null {
    const decision = this.pendingDecisions.get(decisionId);
    if (!decision) return null;

    decision.status = 'rejected';
    decision.approvedBy = rejectedBy;
    decision.approvalNotes = reason;

    this.pendingDecisions.delete(decisionId);
    return decision;
  }

  queueDecision(decision: Decision): void {
    this.pendingDecisions.set(decision.id, decision);
  }

  // =========================================================================
  // BATCH PROCESSING
  // =========================================================================

  processMetrics(metrics: MetricData[]): DecisionResult[] {
    const results: DecisionResult[] = [];
    const bindings = bindingsRegistry.getEnabled();

    // Sort bindings by authority (blocking first)
    const sortedBindings = bindings.sort((a, b) => {
      const order = { blocking: 0, escalating: 1, triggering: 2, advisory: 3 };
      return order[a.authority] - order[b.authority];
    });

    for (const binding of sortedBindings) {
      const signal = this.evaluateSignal(binding, metrics);

      if (signal?.triggered) {
        const result = this.generateDecision(binding, signal);

        if (result) {
          results.push(result);

          if (result.shouldExecute) {
            this.executeDecision(result.decision);
          } else if (result.requiresApproval) {
            this.queueDecision(result.decision);
          }
        }
      }
    }

    return results;
  }

  // =========================================================================
  // QUERY METHODS
  // =========================================================================

  getPendingDecisions(): Decision[] {
    return Array.from(this.pendingDecisions.values());
  }

  getPendingByCategory(category: DecisionCategory): Decision[] {
    return this.getPendingDecisions().filter(d => d.category === category);
  }

  getExecutedDecisions(limit = 100): Decision[] {
    return this.executedDecisions.slice(-limit);
  }

  getDecision(id: string): Decision | undefined {
    return this.pendingDecisions.get(id) || this.executedDecisions.find(d => d.id === id);
  }

  // =========================================================================
  // CIRCUIT BREAKER
  // =========================================================================

  openCircuitBreaker(reason: string): void {
    this.circuitBreakerOpen = true;
    console.error(`[DecisionEngine] Circuit breaker opened: ${reason}`);
  }

  closeCircuitBreaker(): void {
    this.circuitBreakerOpen = false;
    console.log('[DecisionEngine] Circuit breaker closed');
  }

  isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerOpen;
  }

  // =========================================================================
  // CLEANUP
  // =========================================================================

  expireOldDecisions(): number {
    const now = new Date();
    let expired = 0;

    for (const [id, decision] of this.pendingDecisions) {
      if (decision.expiresAt && decision.expiresAt < now) {
        decision.status = 'expired';
        this.pendingDecisions.delete(id);
        expired++;
      }
    }

    return expired;
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  getStatistics(): {
    pending: number;
    executed: number;
    byCategory: Record<DecisionCategory, number>;
    byAuthority: Record<string, number>;
    autopilotMode: AutopilotMode;
    circuitBreakerOpen: boolean;
  } {
    const pending = this.getPendingDecisions();

    const byCategory = {
      auto_execute: 0,
      supervised: 0,
      escalation_only: 0,
      forbidden: 0,
    };

    const byAuthority: Record<string, number> = {
      blocking: 0,
      triggering: 0,
      escalating: 0,
      advisory: 0,
    };

    for (const decision of pending) {
      byCategory[decision.category]++;
      byAuthority[decision.authority]++;
    }

    return {
      pending: pending.length,
      executed: this.executedDecisions.length,
      byCategory,
      byAuthority,
      autopilotMode: this.config.autopilotMode,
      circuitBreakerOpen: this.circuitBreakerOpen,
    };
  }
}

// Singleton instance
export const decisionEngine = new DecisionEngine();
