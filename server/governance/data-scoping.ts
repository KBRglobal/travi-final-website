/**
 * Data Access Scoping (Row-Level Security)
 * Controls which data rows a user can access
 */

import { db } from "../db";
import { users, contents, userRoleAssignments, governanceRoles } from "@shared/schema";
import { eq, and, or, inArray, SQL, sql } from "drizzle-orm";
import {
  DataAccessScope,
  DataScopeRule,
  RowLevelFilter,
  AdminRole,
  Resource,
  ROLE_HIERARCHY,
} from "./types";

// ============================================================================
// DEFAULT SCOPE RULES BY ROLE
// ============================================================================

const DEFAULT_SCOPE_RULES: Record<AdminRole, Record<Resource, DataScopeRule[]>> = {
  super_admin: {
    // Super admin can access everything
    content: [{ field: "*", operator: "all" }],
    entity: [{ field: "*", operator: "all" }],
    revenue: [{ field: "*", operator: "all" }],
    users: [{ field: "*", operator: "all" }],
    roles: [{ field: "*", operator: "all" }],
    policies: [{ field: "*", operator: "all" }],
    workflows: [{ field: "*", operator: "all" }],
    settings: [{ field: "*", operator: "all" }],
    analytics: [{ field: "*", operator: "all" }],
    audit: [{ field: "*", operator: "all" }],
    media: [{ field: "*", operator: "all" }],
    translations: [{ field: "*", operator: "all" }],
    integrations: [{ field: "*", operator: "all" }],
    system: [{ field: "*", operator: "all" }],
  },
  system_admin: {
    content: [{ field: "*", operator: "all" }],
    entity: [{ field: "*", operator: "all" }],
    revenue: [], // No revenue access
    users: [{ field: "*", operator: "all" }],
    roles: [{ field: "isSystem", operator: "equals", value: false }], // Can't modify system roles
    policies: [{ field: "*", operator: "all" }],
    workflows: [{ field: "*", operator: "all" }],
    settings: [{ field: "*", operator: "all" }],
    analytics: [{ field: "*", operator: "all" }],
    audit: [{ field: "*", operator: "all" }],
    media: [{ field: "*", operator: "all" }],
    translations: [{ field: "*", operator: "all" }],
    integrations: [{ field: "*", operator: "all" }],
    system: [{ field: "*", operator: "all" }],
  },
  manager: {
    content: [{ field: "*", operator: "all" }],
    entity: [{ field: "*", operator: "all" }],
    revenue: [{ field: "*", operator: "all" }],
    users: [{ field: "role", operator: "in", values: ["editor", "viewer", "analyst"] }],
    roles: [], // No role management
    policies: [], // No policy management
    workflows: [{ field: "*", operator: "all" }],
    settings: [], // No settings access
    analytics: [{ field: "*", operator: "all" }],
    audit: [{ field: "*", operator: "all" }],
    media: [{ field: "*", operator: "all" }],
    translations: [{ field: "*", operator: "all" }],
    integrations: [],
    system: [],
  },
  ops: {
    content: [{ field: "status", operator: "in", values: ["published", "archived"] }],
    entity: [{ field: "*", operator: "all" }],
    revenue: [],
    users: [],
    roles: [],
    policies: [],
    workflows: [],
    settings: [{ field: "*", operator: "all" }],
    analytics: [{ field: "*", operator: "all" }],
    audit: [{ field: "*", operator: "all" }],
    media: [{ field: "*", operator: "all" }],
    translations: [],
    integrations: [{ field: "*", operator: "all" }],
    system: [{ field: "*", operator: "all" }],
  },
  editor: {
    content: [{ field: "*", operator: "all" }],
    entity: [{ field: "*", operator: "all" }],
    revenue: [],
    users: [],
    roles: [],
    policies: [],
    workflows: [],
    settings: [],
    analytics: [{ field: "*", operator: "all" }],
    audit: [],
    media: [{ field: "*", operator: "all" }],
    translations: [{ field: "*", operator: "all" }],
    integrations: [],
    system: [],
  },
  analyst: {
    content: [{ field: "status", operator: "in", values: ["published"] }],
    entity: [{ field: "*", operator: "all" }],
    revenue: [{ field: "*", operator: "all" }],
    users: [],
    roles: [],
    policies: [],
    workflows: [],
    settings: [],
    analytics: [{ field: "*", operator: "all" }],
    audit: [],
    media: [],
    translations: [],
    integrations: [],
    system: [],
  },
  viewer: {
    content: [{ field: "status", operator: "equals", value: "published" }],
    entity: [{ field: "*", operator: "all" }],
    revenue: [],
    users: [],
    roles: [],
    policies: [],
    workflows: [],
    settings: [],
    analytics: [],
    audit: [],
    media: [],
    translations: [],
    integrations: [],
    system: [],
  },
};

// ============================================================================
// ALLOWED FIELD NAMES (Security: Only these fields can be used in SQL queries)
// ============================================================================

const ALLOWED_FIELDS = new Set([
  "*",
  "id",
  "authorId",
  "status",
  "role",
  "isSystem",
  "type",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "userId",
  "ownerId",
]);

function isValidFieldName(field: string): boolean {
  return ALLOWED_FIELDS.has(field);
}

function sanitizeTableAlias(alias: string): string {
  return alias.replace(/[^a-zA-Z0-9_]/g, "");
}

// ============================================================================
// DATA SCOPING SERVICE
// ============================================================================

class DataScopingService {
  /**
   * Get effective scope for user on a resource
   */
  async getEffectiveScope(
    userId: string,
    resource: Resource,
    accessType: "read" | "write" | "delete" = "read"
  ): Promise<DataAccessScope> {
    // Get user roles
    const roles = await this.getUserRoles(userId);

    // Merge scope rules from all roles (highest role wins for conflicts)
    const mergedRules: DataScopeRule[] = [];

    // Sort roles by priority (highest first)
    const sortedRoles = roles.sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);

    for (const role of sortedRoles) {
      const roleRules = DEFAULT_SCOPE_RULES[role]?.[resource] || [];

      // If role has "all" access, return immediately
      if (roleRules.some(r => r.operator === "all")) {
        return {
          userId,
          resource,
          accessType,
          scopeRules: [{ field: "*", operator: "all" }],
        };
      }

      // Add rules that don't conflict
      for (const rule of roleRules) {
        if (!mergedRules.some(r => r.field === rule.field)) {
          mergedRules.push(rule);
        }
      }
    }

    // Add owner-based access for content
    if (resource === "content" && accessType !== "delete") {
      mergedRules.push({ field: "authorId", operator: "is_owner" });
    }

    return {
      userId,
      resource,
      accessType,
      scopeRules: mergedRules,
    };
  }

  /**
   * Build SQL where clause from scope rules
   * Security: Field names are validated against ALLOWED_FIELDS allowlist
   */
  buildWhereClause(scope: DataAccessScope, userId: string, tableAlias?: string): SQL | undefined {
    if (scope.scopeRules.length === 0) {
      // No access - return impossible condition
      return sql`1 = 0`;
    }

    const conditions: SQL[] = [];
    const sanitizedPrefix = tableAlias ? sanitizeTableAlias(tableAlias) + "." : "";

    for (const rule of scope.scopeRules) {
      if (rule.operator === "all") {
        // Full access, no filter needed
        return undefined;
      }

      // Security: Validate field name against allowlist
      if (!isValidFieldName(rule.field)) {
        continue;
      }

      // Build column reference - field is validated against allowlist, alias is sanitized
      // For qualified names (with table alias), we need to use sql.raw since sql.identifier
      // doesn't support dotted names, but both parts are validated/sanitized
      const columnRef = tableAlias
        ? sql.raw(`${sanitizedPrefix}${rule.field}`)
        : sql.identifier(rule.field);

      if (rule.operator === "is_owner") {
        conditions.push(sql`${columnRef} = ${userId}`);
      } else if (rule.operator === "equals") {
        conditions.push(sql`${columnRef} = ${rule.value}`);
      } else if (rule.operator === "in" && rule.values && rule.values.length > 0) {
        const placeholders = rule.values.map(v => sql`${v}`);
        conditions.push(sql`${columnRef} IN (${sql.join(placeholders, sql`, `)})`);
      }
    }

    if (conditions.length === 0) {
      return undefined;
    }

    // Combine with OR (user gets access if any condition matches)
    return sql.join(conditions, sql` OR `);
  }

  /**
   * Check if user can access specific record
   */
  async canAccessRecord(
    userId: string,
    resource: Resource,
    record: Record<string, unknown>,
    accessType: "read" | "write" | "delete" = "read"
  ): Promise<{ allowed: boolean; reason?: string }> {
    const scope = await this.getEffectiveScope(userId, resource, accessType);

    if (scope.scopeRules.length === 0) {
      return { allowed: false, reason: "No access rules defined for this resource" };
    }

    for (const rule of scope.scopeRules) {
      if (rule.operator === "all") {
        return { allowed: true };
      }

      const fieldValue = record[rule.field];

      if (rule.operator === "is_owner" && fieldValue === userId) {
        return { allowed: true };
      }

      if (rule.operator === "equals" && fieldValue === rule.value) {
        return { allowed: true };
      }

      if (rule.operator === "in" && rule.values?.includes(fieldValue)) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: "Record does not match any access rules" };
  }

  /**
   * Filter records based on user scope
   */
  async filterRecords<T extends Record<string, unknown>>(
    userId: string,
    resource: Resource,
    records: T[],
    accessType: "read" | "write" | "delete" = "read"
  ): Promise<T[]> {
    const scope = await this.getEffectiveScope(userId, resource, accessType);

    if (scope.scopeRules.length === 0) {
      return [];
    }

    // Check for "all" access
    if (scope.scopeRules.some(r => r.operator === "all")) {
      return records;
    }

    return records.filter(record => {
      for (const rule of scope.scopeRules) {
        const fieldValue = record[rule.field];

        if (rule.operator === "is_owner" && fieldValue === userId) {
          return true;
        }

        if (rule.operator === "equals" && fieldValue === rule.value) {
          return true;
        }

        if (rule.operator === "in" && rule.values?.includes(fieldValue)) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Get row-level filters for database queries
   */
  async getRowLevelFilters(
    userId: string,
    resource: Resource,
    accessType: "read" | "write" | "delete" = "read"
  ): Promise<RowLevelFilter[]> {
    const scope = await this.getEffectiveScope(userId, resource, accessType);
    const filters: RowLevelFilter[] = [];

    for (const rule of scope.scopeRules) {
      if (rule.operator === "all") {
        return []; // No filters needed
      }

      if (rule.operator === "is_owner") {
        filters.push({
          field: rule.field,
          operator: "=",
          value: userId,
        });
      } else if (rule.operator === "equals") {
        filters.push({
          field: rule.field,
          operator: "=",
          value: rule.value,
        });
      } else if (rule.operator === "in") {
        filters.push({
          field: rule.field,
          operator: "IN",
          value: rule.values,
        });
      }
    }

    return filters;
  }

  /**
   * Get user's roles
   */
  private async getUserRoles(userId: string): Promise<AdminRole[]> {
    const assignments = await db
      .select({
        roleName: governanceRoles.name,
      })
      .from(userRoleAssignments)
      .innerJoin(governanceRoles, eq(governanceRoles.id, userRoleAssignments.roleId))
      .where(and(eq(userRoleAssignments.userId, userId), eq(userRoleAssignments.isActive, true)));

    return assignments.map(a => a.roleName as AdminRole);
  }

  /**
   * Get accessible content types for user
   */
  async getAccessibleContentTypes(userId: string): Promise<string[]> {
    const roles = await this.getUserRoles(userId);

    // Super admin and system admin can access all
    if (roles.some(r => ["super_admin", "system_admin", "manager", "editor"].includes(r))) {
      return ["all"];
    }

    // Default content types for lower roles
    return ["article", "attraction", "hotel", "dining", "district"];
  }

  /**
   * Get accessible statuses for user
   */
  async getAccessibleStatuses(userId: string): Promise<string[]> {
    const roles = await this.getUserRoles(userId);

    if (roles.some(r => ["super_admin", "system_admin", "manager", "editor"].includes(r))) {
      return ["draft", "in_review", "reviewed", "approved", "scheduled", "published", "archived"];
    }

    if (roles.includes("analyst")) {
      return ["published"];
    }

    if (roles.includes("viewer")) {
      return ["published"];
    }

    return ["published"];
  }

  /**
   * Add custom scope rule for user
   */
  addCustomRule(userId: string, resource: Resource, rule: DataScopeRule): void {
    // Store in memory or database as needed
    // This would be used for temporary or per-user custom access
  }

  /**
   * Get scope summary for user
   */
  async getScopeSummary(userId: string): Promise<{
    resources: Record<Resource, { canRead: boolean; canWrite: boolean; canDelete: boolean }>;
  }> {
    const resources: Resource[] = [
      "content",
      "entity",
      "revenue",
      "users",
      "roles",
      "policies",
      "workflows",
      "settings",
      "analytics",
      "audit",
      "media",
      "translations",
      "integrations",
      "system",
    ];

    const summary: Record<Resource, { canRead: boolean; canWrite: boolean; canDelete: boolean }> =
      {} as any;

    for (const resource of resources) {
      const readScope = await this.getEffectiveScope(userId, resource, "read");
      const writeScope = await this.getEffectiveScope(userId, resource, "write");
      const deleteScope = await this.getEffectiveScope(userId, resource, "delete");

      summary[resource] = {
        canRead: readScope.scopeRules.length > 0,
        canWrite: writeScope.scopeRules.length > 0,
        canDelete: deleteScope.scopeRules.length > 0,
      };
    }

    return { resources: summary };
  }
}

// Singleton instance
export const dataScopingService = new DataScopingService();
