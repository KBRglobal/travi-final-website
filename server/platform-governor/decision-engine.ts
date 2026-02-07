/**
 * Autonomous Platform Governor - Decision Engine
 * Deterministic, explainable decision making
 */

import { createLogger } from "../lib/logger";
import { GOVERNOR_CONFIG } from "./config";
import { getEnabledRules } from "./rules";

import type {
  GovernorRule,
  RuleCondition,
  GovernorContext,
  GovernorDecision,
  Decision,
  AuditEntry,
  SystemRestriction,
} from "./types";

const logger = createLogger("governor-decision-engine");

// Storage
const decisions: GovernorDecision[] = [];
const auditLog: AuditEntry[] = [];
const activeRestrictions: SystemRestriction[] = [];
const ruleCooldowns: Map<string, number> = new Map();
const maxDecisions = GOVERNOR_CONFIG.maxDecisionsStored;

// ============================================================================
// Condition Evaluation
// ============================================================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function evaluateCondition(condition: RuleCondition, context: GovernorContext): boolean {
  let actual: unknown;

  // Get actual value based on condition type
  switch (condition.type) {
    case "ai_cost_exceeded":
      actual = context.aiCostBudget > 0 ? context.aiCostToday / context.aiCostBudget : 0;
      break;
    case "error_rate_spike":
      actual = context.errorRate;
      break;
    case "incident_severity_high":
      actual = context.incidentSeverity;
      break;
    case "queue_backlog_large":
      actual = context.queueBacklog;
      break;
    case "memory_pressure":
      actual = context.memoryUsagePercent;
      break;
    case "external_api_unstable":
      if (condition.field) {
        actual = getNestedValue(context as unknown as Record<string, unknown>, condition.field);
      } else {
        actual = Object.values(context.externalApiStatus).some(s => s !== "healthy");
      }
      break;
    case "custom":
      if (condition.field && context.customMetrics) {
        actual = context.customMetrics[condition.field];
      }
      break;
    default:
      return false;
  }

  // Compare based on operator
  const expected = condition.value;

  switch (condition.operator) {
    case "gt":
      return typeof actual === "number" && actual > (expected as number);
    case "gte":
      return typeof actual === "number" && actual >= (expected as number);
    case "lt":
      return typeof actual === "number" && actual < (expected as number);
    case "lte":
      return typeof actual === "number" && actual <= (expected as number);
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "contains":
      return typeof actual === "string" && actual.includes(expected as string);
    default:
      return false;
  }
}

function evaluateRule(rule: GovernorRule, context: GovernorContext): boolean {
  if (!rule.enabled) return false;

  // Check cooldown
  const lastTriggered = ruleCooldowns.get(rule.id);
  if (lastTriggered && Date.now() - lastTriggered < rule.cooldownMs) {
    return false;
  }

  const results = rule.conditions.map(c => evaluateCondition(c, context));

  if (rule.conditionLogic === "all") {
    return results.every(Boolean);
  } else {
    return results.some(Boolean);
  }
}

// ============================================================================
// Decision Making
// ============================================================================

function determineDecision(rule: GovernorRule): Decision {
  const blockingActions = ["force_read_only", "require_admin_override"];
  const throttleActions = [
    "throttle_ai",
    "reduce_concurrency",
    "disable_octopus",
    "disable_regeneration",
  ];

  const hasBlocking = rule.actions.some(a => blockingActions.includes(a.type));
  const hasThrottle = rule.actions.some(a => throttleActions.includes(a.type));

  if (hasBlocking) return "BLOCK";
  if (hasThrottle) return "THROTTLE";
  return "ALLOW";
}

function getAffectedSystems(rule: GovernorRule): string[] {
  const systems = new Set<string>();

  for (const action of rule.actions) {
    switch (action.type) {
      case "disable_octopus":
        systems.add("octopus");
        break;
      case "disable_regeneration":
        systems.add("regeneration");
        break;
      case "disable_experiments":
        systems.add("experiments");
        break;
      case "throttle_ai":
        systems.add("ai");
        break;
      case "force_read_only":
        systems.add("writes");
        break;
      case "disable_webhooks":
        systems.add("webhooks");
        break;
      case "reduce_concurrency":
        systems.add("concurrency");
        break;
    }
  }

  return Array.from(systems);
}

// ============================================================================
// Main Evaluation
// ============================================================================

export function evaluateRules(context: GovernorContext): GovernorDecision[] {
  const rules = getEnabledRules();
  const newDecisions: GovernorDecision[] = [];

  for (const rule of rules) {
    if (evaluateRule(rule, context)) {
      const decision: GovernorDecision = {
        id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        decision: determineDecision(rule),
        reason: rule.description,
        actions: rule.actions,
        affectedSystems: getAffectedSystems(rule),
        triggeredAt: new Date(),
        expiresAt: rule.actions.some(a => a.duration)
          ? new Date(Date.now() + Math.max(...rule.actions.map(a => a.duration || 0)))
          : undefined,
      };

      newDecisions.push(decision);
      decisions.unshift(decision);

      // Update cooldown
      ruleCooldowns.set(rule.id, Date.now());

      // Add audit entry
      auditLog.unshift({
        id: decision.id,
        timestamp: decision.triggeredAt,
        ruleId: rule.id,
        ruleName: rule.name,
        decision: decision.decision,
        reason: decision.reason,
        actions: rule.actions.map(a => a.type),
        affectedSystems: decision.affectedSystems,
        duration: 0,
        overridden: false,
      });

      // Apply restrictions
      for (const action of rule.actions) {
        if (action.type !== "alert_only") {
          activeRestrictions.push({
            system: getAffectedSystems({ ...rule, actions: [action] })[0] || "unknown",
            restriction: action.type,
            reason: rule.description,
            appliedAt: new Date(),
            expiresAt: action.duration ? new Date(Date.now() + action.duration) : undefined,
            ruleId: rule.id,
          });
        }
      }

      logger.warn(
        { ruleId: rule.id, decision: decision.decision, actions: rule.actions.map(a => a.type) },
        `Governor rule triggered: ${rule.name}`
      );
    }
  }

  // Enforce max decisions
  while (decisions.length > maxDecisions) {
    decisions.pop();
  }
  while (auditLog.length > maxDecisions) {
    auditLog.pop();
  }

  // Clean expired restrictions
  cleanExpiredRestrictions();

  return newDecisions;
}

// ============================================================================
// Restriction Management
// ============================================================================

function cleanExpiredRestrictions(): void {
  const now = Date.now();
  for (let i = activeRestrictions.length - 1; i >= 0; i--) {
    const restriction = activeRestrictions[i];
    if (restriction.expiresAt && restriction.expiresAt.getTime() < now) {
      activeRestrictions.splice(i, 1);
    }
  }
}

export function getActiveRestrictions(): SystemRestriction[] {
  cleanExpiredRestrictions();
  return [...activeRestrictions];
}

export function isSystemRestricted(system: string): boolean {
  return getActiveRestrictions().some(r => r.system === system);
}

export function getRestrictionForSystem(system: string): SystemRestriction | undefined {
  return getActiveRestrictions().find(r => r.system === system);
}

// ============================================================================
// Override & Reset
// ============================================================================

export function overrideDecision(decisionId: string, actorId: string): boolean {
  const decision = decisions.find(d => d.id === decisionId);
  if (!decision) return false;

  decision.overriddenBy = actorId;
  decision.overriddenAt = new Date();

  // Remove related restrictions
  for (let i = activeRestrictions.length - 1; i >= 0; i--) {
    if (activeRestrictions[i].ruleId === decision.ruleId) {
      activeRestrictions.splice(i, 1);
    }
  }

  // Update audit
  const audit = auditLog.find(a => a.id === decisionId);
  if (audit) {
    audit.overridden = true;
  }

  logger.info({ decisionId, actorId }, "Governor decision overridden");
  return true;
}

export function resetAllRestrictions(actorId: string): void {
  const count = activeRestrictions.length;
  activeRestrictions.length = 0;
  ruleCooldowns.clear();

  logger.info({ actorId, restrictionsCleared: count }, "All governor restrictions reset");
}

// ============================================================================
// Query Functions
// ============================================================================

export function getRecentDecisions(limit: number = 50): GovernorDecision[] {
  return decisions.slice(0, limit);
}

export function getAuditLog(limit: number = 100): AuditEntry[] {
  return auditLog.slice(0, limit);
}

export function getDecisionById(id: string): GovernorDecision | undefined {
  return decisions.find(d => d.id === id);
}

// ============================================================================
// Clear (for testing)
// ============================================================================

export function clearAll(): void {
  decisions.length = 0;
  auditLog.length = 0;
  activeRestrictions.length = 0;
  ruleCooldowns.clear();
}
