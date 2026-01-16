/**
 * Policy-as-Code Engine
 * Flexible condition-based policy evaluation
 */

import { db } from "../db";
import {
  governancePolicies,
  policyEvaluations,
  userRoleAssignments,
  governanceRoles,
} from "@shared/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import {
  PolicyRule,
  PolicyCondition,
  PolicyEffect,
  PolicyEvaluation,
  AccessContext,
  AdminRole,
  Action,
  Resource,
  ConditionOperator,
  TimeSchedule,
  RateLimitConfig,
} from "./types";
import { logAuthzEvent } from "./security-logger";

// ============================================================================
// DEFAULT POLICIES
// ============================================================================

const DEFAULT_POLICIES: PolicyRule[] = [
  {
    id: "deny-delete-published",
    name: "Prevent Deleting Published Content",
    description: "Cannot delete content that is currently published",
    effect: "deny",
    priority: 100,
    conditions: [
      { field: "context.status", operator: "equals", value: "published" },
    ],
    actions: ["delete"],
    resources: ["content"],
    isActive: true,
  },
  {
    id: "require-approval-publish",
    name: "Require Approval for Publishing",
    description: "Content publishing requires manager approval",
    effect: "require_approval",
    priority: 90,
    conditions: [],
    actions: ["publish"],
    resources: ["content"],
    roles: ["editor"],
    isActive: true,
  },
  {
    id: "owners-can-edit-drafts",
    name: "Content Owners Can Edit Drafts",
    description: "Allow content owners to edit their own drafts",
    effect: "allow",
    priority: 80,
    conditions: [
      { field: "context.isOwner", operator: "equals", value: true },
      { field: "context.status", operator: "equals", value: "draft", logicalOperator: "AND" },
    ],
    actions: ["edit"],
    resources: ["content"],
    isActive: true,
  },
  {
    id: "business-hours-only",
    name: "Administrative Actions During Business Hours",
    description: "System admin actions only during business hours",
    effect: "deny",
    priority: 70,
    conditions: [
      { field: "time.hour", operator: "not_in", value: [9, 10, 11, 12, 13, 14, 15, 16, 17] },
    ],
    actions: ["manage_users", "manage_roles", "manage_policies"],
    resources: ["users", "roles", "policies"],
    roles: ["system_admin"],
    schedules: [
      {
        startTime: "09:00",
        endTime: "17:00",
        daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
        timezone: "Asia/Dubai",
      },
    ],
    isActive: false, // Disabled by default
  },
  {
    id: "rate-limit-exports",
    name: "Rate Limit Data Exports",
    description: "Limit data exports to prevent abuse",
    effect: "deny",
    priority: 60,
    conditions: [
      { field: "rateLimit.exceeded", operator: "equals", value: true },
    ],
    actions: ["export"],
    resources: ["content", "users", "analytics"],
    rateLimit: {
      maxRequests: 10,
      windowMinutes: 60,
      scope: "user",
    },
    isActive: true,
  },
];

// In-memory policy storage
const policies = new Map<string, PolicyRule>(
  DEFAULT_POLICIES.map((p) => [p.id, p])
);

// Rate limit counters
const rateLimitCounters = new Map<string, { count: number; resetAt: Date }>();

// ============================================================================
// CONDITION EVALUATOR
// ============================================================================

class ConditionEvaluator {
  private context: Record<string, unknown>;

  constructor(context: Record<string, unknown>) {
    this.context = context;
  }

  /**
   * Evaluate a single condition
   */
  evaluate(condition: PolicyCondition): boolean {
    const fieldValue = this.getFieldValue(condition.field);
    const { operator, value } = condition;

    switch (operator) {
      case "equals":
        return fieldValue === value;

      case "not_equals":
        return fieldValue !== value;

      case "contains":
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(value);
        }
        if (typeof fieldValue === "string" && typeof value === "string") {
          return fieldValue.includes(value);
        }
        return false;

      case "not_contains":
        if (Array.isArray(fieldValue)) {
          return !fieldValue.includes(value);
        }
        if (typeof fieldValue === "string" && typeof value === "string") {
          return !fieldValue.includes(value);
        }
        return true;

      case "starts_with":
        return typeof fieldValue === "string" && typeof value === "string"
          ? fieldValue.startsWith(value)
          : false;

      case "ends_with":
        return typeof fieldValue === "string" && typeof value === "string"
          ? fieldValue.endsWith(value)
          : false;

      case "greater_than":
        return typeof fieldValue === "number" && typeof value === "number"
          ? fieldValue > value
          : false;

      case "less_than":
        return typeof fieldValue === "number" && typeof value === "number"
          ? fieldValue < value
          : false;

      case "in":
        return Array.isArray(value) && value.includes(fieldValue);

      case "not_in":
        return Array.isArray(value) && !value.includes(fieldValue);

      case "between":
        if (Array.isArray(value) && value.length === 2 && typeof fieldValue === "number") {
          return fieldValue >= value[0] && fieldValue <= value[1];
        }
        return false;

      case "is_null":
        return fieldValue === null || fieldValue === undefined;

      case "is_not_null":
        return fieldValue !== null && fieldValue !== undefined;

      case "matches_regex":
        if (typeof fieldValue === "string" && typeof value === "string") {
          try {
            return new RegExp(value).test(fieldValue);
          } catch {
            return false;
          }
        }
        return false;

      case "has_role":
        const userRoles = this.getFieldValue("user.roles") as AdminRole[] | undefined;
        if (!Array.isArray(userRoles)) return false;
        if (Array.isArray(value)) {
          return value.some((r) => userRoles.includes(r));
        }
        return userRoles.includes(value as AdminRole);

      case "is_owner":
        return this.getFieldValue("context.isOwner") === true;

      case "within_time_window":
        return this.evaluateTimeWindow(value as TimeSchedule);

      case "ip_in_range":
        return this.evaluateIpRange(fieldValue as string, value as string[]);

      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Evaluate multiple conditions with logical operators
   */
  evaluateAll(conditions: PolicyCondition[]): boolean {
    if (conditions.length === 0) return true;

    let result = this.evaluate(conditions[0]);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluate(condition);

      if (condition.logicalOperator === "OR") {
        result = result || conditionResult;
      } else {
        // Default to AND
        result = result && conditionResult;
      }
    }

    return result;
  }

  /**
   * Get nested field value from context
   */
  private getFieldValue(field: string): unknown {
    const parts = field.split(".");
    let value: unknown = this.context;

    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      if (typeof value !== "object") return undefined;
      value = (value as Record<string, unknown>)[part];
    }

    return value;
  }

  /**
   * Evaluate time window condition
   */
  private evaluateTimeWindow(schedule: TimeSchedule): boolean {
    const now = new Date();
    const timezone = schedule.timezone || "UTC";

    // Convert to timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };
    const timeStr = now.toLocaleTimeString("en-US", options);
    const [hours, minutes] = timeStr.split(":").map(Number);
    const currentMinutes = hours * 60 + minutes;

    // Check day of week
    const dayOptions: Intl.DateTimeFormatOptions = { timeZone: timezone, weekday: "short" };
    const dayStr = now.toLocaleDateString("en-US", dayOptions);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayMap[dayStr];

    if (schedule.daysOfWeek && !schedule.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }

    // Check time range
    if (schedule.startTime && schedule.endTime) {
      const [startH, startM] = schedule.startTime.split(":").map(Number);
      const [endH, endM] = schedule.endTime.split(":").map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return true;
  }

  /**
   * Evaluate IP range condition (supports CIDR notation)
   */
  private evaluateIpRange(ip: string, ranges: string[]): boolean {
    if (!ip) return false;

    for (const range of ranges) {
      if (range.includes("/")) {
        // CIDR notation
        if (this.ipInCidr(ip, range)) return true;
      } else {
        // Exact match
        if (ip === range) return true;
      }
    }

    return false;
  }

  /**
   * Check if IP is in CIDR range
   */
  private ipInCidr(ip: string, cidr: string): boolean {
    const [range, bits] = cidr.split("/");
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(range);

    return (ipNum & mask) === (rangeNum & mask);
  }

  /**
   * Convert IP to number
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split(".").map(Number);
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  }
}

// ============================================================================
// POLICY ENGINE
// ============================================================================

class PolicyEngine {
  /**
   * Evaluate policies for an access request
   */
  async evaluate(params: {
    userId: string;
    action: Action;
    resource: Resource;
    context: AccessContext;
    userRoles: AdminRole[];
    ipAddress?: string;
  }): Promise<{
    effect: PolicyEffect;
    matchedPolicies: PolicyEvaluation[];
    message?: string;
  }> {
    const { userId, action, resource, context, userRoles, ipAddress } = params;

    // Build evaluation context
    const evalContext: Record<string, unknown> = {
      user: {
        id: userId,
        roles: userRoles,
      },
      action,
      resource,
      context: {
        ...context,
        isOwner: context.ownerId === userId,
      },
      time: {
        hour: new Date().getHours(),
        minute: new Date().getMinutes(),
        dayOfWeek: new Date().getDay(),
      },
      request: {
        ipAddress,
      },
      rateLimit: {
        exceeded: await this.checkRateLimit(userId, action, resource),
      },
    };

    const evaluator = new ConditionEvaluator(evalContext);
    const matchedPolicies: PolicyEvaluation[] = [];

    // Get all active policies sorted by priority (highest first)
    const activePolicies = Array.from(policies.values())
      .filter((p) => p.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of activePolicies) {
      // Check if policy applies to this action/resource
      if (!policy.actions.includes(action)) continue;
      if (!policy.resources.includes(resource)) continue;

      // Check if policy applies to user's roles
      if (policy.roles && policy.roles.length > 0) {
        if (!policy.roles.some((r) => userRoles.includes(r))) continue;
      }

      // Check time schedule
      if (policy.schedules && policy.schedules.length > 0) {
        const inSchedule = policy.schedules.some((s) =>
          evaluator.evaluate({ field: "time", operator: "within_time_window", value: s })
        );
        if (!inSchedule) continue;
      }

      // Evaluate conditions
      const conditionsMet = evaluator.evaluateAll(policy.conditions);

      const evaluation: PolicyEvaluation = {
        policyId: policy.id,
        policyName: policy.name,
        effect: policy.effect,
        matched: conditionsMet,
        reason: conditionsMet ? policy.message || policy.description : undefined,
      };

      matchedPolicies.push(evaluation);

      // First matching deny wins
      if (conditionsMet && policy.effect === "deny") {
        await this.logEvaluation(policy, userId, action, resource, context.resourceId, "denied");
        return {
          effect: "deny",
          matchedPolicies,
          message: policy.message || `Policy "${policy.name}" denied this action`,
        };
      }

      // First matching require_approval sets the effect
      if (conditionsMet && policy.effect === "require_approval") {
        await this.logEvaluation(policy, userId, action, resource, context.resourceId, "require_approval");
        return {
          effect: "require_approval",
          matchedPolicies,
          message: policy.message || `Policy "${policy.name}" requires approval for this action`,
        };
      }
    }

    // Default to allow
    return {
      effect: "allow",
      matchedPolicies,
    };
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(userId: string, action: Action, resource: Resource): Promise<boolean> {
    // Find rate limit policy for this action/resource
    const rateLimitPolicy = Array.from(policies.values()).find(
      (p) =>
        p.isActive &&
        p.rateLimit &&
        p.actions.includes(action) &&
        p.resources.includes(resource)
    );

    if (!rateLimitPolicy?.rateLimit) return false;

    const { maxRequests, windowMinutes, scope } = rateLimitPolicy.rateLimit;
    const key = scope === "user" ? `${userId}:${action}:${resource}` : `global:${action}:${resource}`;

    const now = new Date();
    const counter = rateLimitCounters.get(key);

    if (!counter || counter.resetAt < now) {
      // Start new window
      rateLimitCounters.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + windowMinutes * 60 * 1000),
      });
      return false;
    }

    // Increment counter
    counter.count++;

    if (counter.count > maxRequests) {
      return true; // Rate limit exceeded
    }

    return false;
  }

  /**
   * Log policy evaluation
   */
  private async logEvaluation(
    policy: PolicyRule,
    userId: string,
    action: Action,
    resource: Resource,
    resourceId?: string,
    result: string = "allowed"
  ): Promise<void> {
    try {
      await db.insert(policyEvaluations).values({
        policyId: policy.id,
        policyName: policy.name,
        userId,
        action,
        resource,
        resourceId,
        result,
        reason: policy.message,
      });
    } catch (error) {
      console.error("[PolicyEngine] Error logging evaluation:", error);
    }
  }

  /**
   * Add a new policy
   */
  addPolicy(policy: PolicyRule): void {
    policies.set(policy.id, policy);
  }

  /**
   * Remove a policy
   */
  removePolicy(policyId: string): boolean {
    return policies.delete(policyId);
  }

  /**
   * Update a policy
   */
  updatePolicy(policyId: string, updates: Partial<PolicyRule>): PolicyRule | null {
    const existing = policies.get(policyId);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    policies.set(policyId, updated);
    return updated;
  }

  /**
   * Get all policies
   */
  getAllPolicies(): PolicyRule[] {
    return Array.from(policies.values());
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): PolicyRule | undefined {
    return policies.get(policyId);
  }

  /**
   * Sync policies from database
   */
  async syncFromDatabase(): Promise<number> {
    const dbPolicies = await db
      .select()
      .from(governancePolicies)
      .where(eq(governancePolicies.isActive, true));

    for (const dbPolicy of dbPolicies) {
      const rule: PolicyRule = {
        id: dbPolicy.id,
        name: dbPolicy.name,
        description: dbPolicy.description || undefined,
        effect: dbPolicy.effect as PolicyEffect,
        priority: dbPolicy.priority,
        conditions: dbPolicy.conditions as PolicyCondition[],
        actions: dbPolicy.actions as Action[],
        resources: dbPolicy.resources as Resource[],
        roles: dbPolicy.roles as AdminRole[] | undefined,
        isActive: dbPolicy.isActive,
      };
      policies.set(rule.id, rule);
    }

    return dbPolicies.length;
  }

  /**
   * Get policy analytics
   */
  async getAnalytics(params: {
    policyId?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): Promise<{
    totalEvaluations: number;
    allowedCount: number;
    deniedCount: number;
    approvalRequiredCount: number;
    byPolicy: Record<string, { allowed: number; denied: number; approval: number }>;
  }> {
    let query = db.select().from(policyEvaluations);

    if (params.policyId) {
      query = query.where(eq(policyEvaluations.policyId, params.policyId)) as typeof query;
    }

    const evaluations = await query.limit(params.limit || 1000);

    const stats = {
      totalEvaluations: evaluations.length,
      allowedCount: 0,
      deniedCount: 0,
      approvalRequiredCount: 0,
      byPolicy: {} as Record<string, { allowed: number; denied: number; approval: number }>,
    };

    for (const evaluation of evaluations) {
      const policyName = evaluation.policyName;

      if (!stats.byPolicy[policyName]) {
        stats.byPolicy[policyName] = { allowed: 0, denied: 0, approval: 0 };
      }

      switch (evaluation.result) {
        case "allowed":
          stats.allowedCount++;
          stats.byPolicy[policyName].allowed++;
          break;
        case "denied":
          stats.deniedCount++;
          stats.byPolicy[policyName].denied++;
          break;
        case "require_approval":
          stats.approvalRequiredCount++;
          stats.byPolicy[policyName].approval++;
          break;
      }
    }

    return stats;
  }
}

// Singleton instance
export const policyEngine = new PolicyEngine();

console.log("[Governance] Policy Engine loaded");
