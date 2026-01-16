/**
 * Policy Condition Evaluator
 * Feature flag: ENABLE_POLICY_ENFORCEMENT
 */

import { PolicyCondition, PolicyContext } from "./types";

/**
 * Evaluate a single condition against context
 */
export function evaluateCondition(
  condition: PolicyCondition,
  context: PolicyContext
): boolean {
  const value = getFieldValue(condition.field, context);

  switch (condition.operator) {
    case "eq":
      return value === condition.value;

    case "ne":
      return value !== condition.value;

    case "gt":
      return typeof value === "number" && value > (condition.value as number);

    case "lt":
      return typeof value === "number" && value < (condition.value as number);

    case "gte":
      return typeof value === "number" && value >= (condition.value as number);

    case "lte":
      return typeof value === "number" && value <= (condition.value as number);

    case "in":
      if (Array.isArray(condition.value)) {
        return condition.value.includes(value);
      }
      return false;

    case "notIn":
      if (Array.isArray(condition.value)) {
        return !condition.value.includes(value);
      }
      return true;

    case "contains":
      if (typeof value === "string" && typeof condition.value === "string") {
        return value.includes(condition.value);
      }
      if (Array.isArray(value)) {
        return value.includes(condition.value);
      }
      return false;

    case "exists":
      return condition.value ? value !== undefined && value !== null : value === undefined || value === null;

    default:
      return false;
  }
}

/**
 * Get field value from context
 */
export function getFieldValue(field: string, context: PolicyContext): unknown {
  // Direct context fields
  const directFields: Record<string, unknown> = {
    userId: context.userId,
    userRole: context.userRole,
    userRoles: context.userRoles,
    action: context.action,
    resource: context.resource,
    resourceId: context.resourceId,
    locale: context.locale,
    contentStatus: context.contentStatus,
    contentType: context.contentType,
    score: context.score,
  };

  if (field in directFields) {
    return directFields[field];
  }

  // Computed fields
  if (field === "isAdmin") {
    return context.userRoles?.includes("admin") || context.userRoles?.includes("super_admin");
  }

  if (field === "isSuperAdmin") {
    return context.userRoles?.includes("super_admin");
  }

  if (field === "isPublished") {
    return context.contentStatus === "published";
  }

  if (field === "isDraft") {
    return context.contentStatus === "draft";
  }

  if (field === "isBulkOperation") {
    return context.metadata?.isBulkOperation === true;
  }

  if (field === "localeMatch") {
    const userLocales = context.metadata?.userLocales as string[] | undefined;
    if (!userLocales || !context.locale) return true;
    return userLocales.includes(context.locale);
  }

  // Metadata fields
  if (field.startsWith("metadata.") && context.metadata) {
    const metaField = field.substring(9);
    return context.metadata[metaField];
  }

  return undefined;
}

/**
 * Evaluate all conditions (AND logic)
 */
export function evaluateAllConditions(
  conditions: PolicyCondition[],
  context: PolicyContext
): { match: boolean; matchedConditions: string[] } {
  if (conditions.length === 0) {
    return { match: true, matchedConditions: [] };
  }

  const matchedConditions: string[] = [];

  for (const condition of conditions) {
    const result = evaluateCondition(condition, context);
    if (result) {
      matchedConditions.push(`${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`);
    } else {
      return { match: false, matchedConditions: [] };
    }
  }

  return { match: true, matchedConditions };
}

/**
 * Check if role matches policy
 */
export function roleMatchesPolicy(
  userRoles: string[] | undefined,
  policyRoles: string[]
): boolean {
  // Empty policy roles = applies to all roles
  if (policyRoles.length === 0) return true;

  // No user roles = doesn't match
  if (!userRoles || userRoles.length === 0) return false;

  // Check if any user role is in policy roles
  return userRoles.some((role) => policyRoles.includes(role));
}

/**
 * Check if action matches policy
 */
export function actionMatchesPolicy(action: string, policyActions: string[]): boolean {
  if (policyActions.length === 0) return true;
  return policyActions.includes(action);
}

/**
 * Check if resource matches policy
 */
export function resourceMatchesPolicy(resource: string, policyResources: string[]): boolean {
  if (policyResources.length === 0) return true;
  return policyResources.includes(resource);
}

console.log("[Policies] Evaluator loaded");
