/**
 * Governance Seed Pack
 *
 * Seeds default roles, permissions, and policies for the governance system.
 * Idempotent - safe to run multiple times (uses ON CONFLICT DO NOTHING).
 *
 * Feature flags:
 * - ENABLE_ENTERPRISE_GOVERNANCE
 * - ENABLE_RBAC
 *
 * Usage: npx tsx server/governance/migrations/002-seed-governance.ts
 */

import { db } from "../../db";
import { governanceRoles, governancePermissions, governancePolicies } from "@shared/schema";
import { sql } from "drizzle-orm";

interface SeedResult {
  entity: string;
  action: "seeded" | "exists" | "error";
  count?: number;
  message?: string;
}

// Default role hierarchy with priorities
const DEFAULT_ROLES = [
  {
    id: "role-super-admin",
    name: "super_admin",
    displayName: "Super Administrator",
    description: "Full system access with all permissions. Cannot be restricted by policies.",
    priority: 100,
    isSystem: true,
  },
  {
    id: "role-admin",
    name: "admin",
    displayName: "Administrator",
    description: "Administrative access to manage users, content, and system settings.",
    priority: 80,
    isSystem: true,
  },
  {
    id: "role-ops",
    name: "ops",
    displayName: "Operations",
    description: "Operational access for managing deployments, monitoring, and maintenance.",
    priority: 60,
    isSystem: true,
  },
  {
    id: "role-editor",
    name: "editor",
    displayName: "Editor",
    description: "Content editing and publishing permissions.",
    priority: 40,
    isSystem: true,
  },
  {
    id: "role-analyst",
    name: "analyst",
    displayName: "Analyst",
    description: "Read-only access to analytics and reports.",
    priority: 30,
    isSystem: true,
  },
  {
    id: "role-viewer",
    name: "viewer",
    displayName: "Viewer",
    description: "Basic read-only access to content.",
    priority: 10,
    isSystem: true,
  },
];

// Default permissions for each role
const DEFAULT_PERMISSIONS = [
  // Super Admin - everything
  { roleId: "role-super-admin", action: "*", resource: "*", scope: "global" },

  // Admin - most things except system-critical
  { roleId: "role-admin", action: "create", resource: "content", scope: "global" },
  { roleId: "role-admin", action: "read", resource: "content", scope: "global" },
  { roleId: "role-admin", action: "update", resource: "content", scope: "global" },
  { roleId: "role-admin", action: "delete", resource: "content", scope: "global" },
  { roleId: "role-admin", action: "publish", resource: "content", scope: "global" },
  { roleId: "role-admin", action: "create", resource: "user", scope: "global" },
  { roleId: "role-admin", action: "read", resource: "user", scope: "global" },
  { roleId: "role-admin", action: "update", resource: "user", scope: "global" },
  { roleId: "role-admin", action: "read", resource: "analytics", scope: "global" },
  { roleId: "role-admin", action: "read", resource: "audit", scope: "global" },
  { roleId: "role-admin", action: "manage", resource: "roles", scope: "global" },
  { roleId: "role-admin", action: "manage", resource: "policies", scope: "global" },
  { roleId: "role-admin", action: "manage", resource: "approvals", scope: "global" },

  // Ops - operational access
  { roleId: "role-ops", action: "read", resource: "content", scope: "global" },
  { roleId: "role-ops", action: "read", resource: "analytics", scope: "global" },
  { roleId: "role-ops", action: "read", resource: "audit", scope: "global" },
  { roleId: "role-ops", action: "manage", resource: "system", scope: "global" },
  { roleId: "role-ops", action: "manage", resource: "deployments", scope: "global" },
  { roleId: "role-ops", action: "manage", resource: "monitoring", scope: "global" },

  // Editor - content management
  { roleId: "role-editor", action: "create", resource: "content", scope: "global" },
  { roleId: "role-editor", action: "read", resource: "content", scope: "global" },
  { roleId: "role-editor", action: "update", resource: "content", scope: "global" },
  { roleId: "role-editor", action: "delete", resource: "content", scope: "own" },
  { roleId: "role-editor", action: "publish", resource: "content", scope: "own" },
  { roleId: "role-editor", action: "read", resource: "media", scope: "global" },
  { roleId: "role-editor", action: "upload", resource: "media", scope: "global" },

  // Analyst - read-only analytics
  { roleId: "role-analyst", action: "read", resource: "content", scope: "global" },
  { roleId: "role-analyst", action: "read", resource: "analytics", scope: "global" },
  { roleId: "role-analyst", action: "export", resource: "analytics", scope: "global" },
  { roleId: "role-analyst", action: "read", resource: "reports", scope: "global" },

  // Viewer - basic read access
  { roleId: "role-viewer", action: "read", resource: "content", scope: "global" },
  { roleId: "role-viewer", action: "read", resource: "media", scope: "global" },
];

// Default policies
const DEFAULT_POLICIES = [
  {
    id: "policy-require-approval-publish",
    name: "require-approval-for-publish",
    description: "Require approval for publishing content except for admins",
    policyType: "approval",
    effect: "block",
    priority: 50,
    conditions: { requireApproval: true, minApprovers: 1 },
    actions: ["publish"],
    resources: ["content"],
    roles: ["editor"],
    message: "Publishing requires approval from an administrator",
  },
  {
    id: "policy-prevent-self-approve",
    name: "prevent-self-approval",
    description: "Users cannot approve their own requests",
    policyType: "approval",
    effect: "block",
    priority: 10,
    conditions: { preventSelfApproval: true },
    actions: ["approve"],
    resources: ["approval_request"],
    roles: [],
    message: "You cannot approve your own request",
  },
  {
    id: "policy-audit-sensitive-actions",
    name: "audit-sensitive-actions",
    description: "Log all sensitive actions to the audit trail",
    policyType: "audit",
    effect: "allow",
    priority: 100,
    conditions: { logToAudit: true, retentionDays: 90 },
    actions: ["delete", "publish", "unpublish", "update_role", "grant_permission"],
    resources: ["*"],
    roles: [],
    message: null,
  },
  {
    id: "policy-rate-limit-exports",
    name: "rate-limit-exports",
    description: "Limit bulk exports to prevent abuse",
    policyType: "rate_limit",
    effect: "warn",
    priority: 60,
    conditions: { maxPerHour: 10, maxRecords: 10000 },
    actions: ["export"],
    resources: ["content", "analytics", "users"],
    roles: ["editor", "analyst", "viewer"],
    message: "Export rate limit reached. Please wait before exporting more data.",
  },
  {
    id: "policy-restrict-delete-published",
    name: "restrict-delete-published",
    description: "Prevent deletion of published content without approval",
    policyType: "restriction",
    effect: "block",
    priority: 40,
    conditions: { contentStatus: "published" },
    actions: ["delete"],
    resources: ["content"],
    roles: ["editor"],
    message: "Published content cannot be deleted without admin approval",
  },
  {
    id: "policy-warn-bulk-operations",
    name: "warn-bulk-operations",
    description: "Show warning for bulk operations affecting many records",
    policyType: "warning",
    effect: "warn",
    priority: 70,
    conditions: { minAffectedRecords: 10 },
    actions: ["bulk_update", "bulk_delete"],
    resources: ["*"],
    roles: [],
    message: "You are about to modify multiple records. Please confirm this action.",
  },
];

async function seedRoles(): Promise<SeedResult> {
  try {
    let seededCount = 0;
    for (const role of DEFAULT_ROLES) {
      const result = await db.execute(sql`
        INSERT INTO governance_roles (id, name, display_name, description, priority, is_system, is_active)
        VALUES (${role.id}, ${role.name}, ${role.displayName}, ${role.description}, ${role.priority}, ${role.isSystem}, true)
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `);
      if (result.rowCount && result.rowCount > 0) {
        seededCount++;
        console.log(`  ✅ Created role: ${role.displayName}`);
      } else {
        console.log(`  ⏭️  Role exists: ${role.displayName}`);
      }
    }
    return { entity: "roles", action: seededCount > 0 ? "seeded" : "exists", count: seededCount };
  } catch (error) {
    return { entity: "roles", action: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function seedPermissions(): Promise<SeedResult> {
  try {
    let seededCount = 0;
    for (const perm of DEFAULT_PERMISSIONS) {
      const result = await db.execute(sql`
        INSERT INTO governance_permissions (role_id, action, resource, scope, is_allowed)
        VALUES (${perm.roleId}, ${perm.action}, ${perm.resource}, ${perm.scope}, true)
        ON CONFLICT ON CONSTRAINT "IDX_gov_perms_unique" DO NOTHING
        RETURNING id
      `);
      if (result.rowCount && result.rowCount > 0) {
        seededCount++;
      }
    }
    console.log(`  ✅ Seeded ${seededCount} permissions`);
    return { entity: "permissions", action: seededCount > 0 ? "seeded" : "exists", count: seededCount };
  } catch (error) {
    // Try without constraint name (for compatibility)
    try {
      let seededCount = 0;
      for (const perm of DEFAULT_PERMISSIONS) {
        const existing = await db.execute(sql`
          SELECT id FROM governance_permissions
          WHERE role_id = ${perm.roleId}
            AND action = ${perm.action}
            AND resource = ${perm.resource}
            AND scope = ${perm.scope}
        `);
        if (!existing.rows || existing.rows.length === 0) {
          await db.execute(sql`
            INSERT INTO governance_permissions (role_id, action, resource, scope, is_allowed)
            VALUES (${perm.roleId}, ${perm.action}, ${perm.resource}, ${perm.scope}, true)
          `);
          seededCount++;
        }
      }
      console.log(`  ✅ Seeded ${seededCount} permissions (fallback method)`);
      return { entity: "permissions", action: seededCount > 0 ? "seeded" : "exists", count: seededCount };
    } catch (fallbackError) {
      return { entity: "permissions", action: "error", message: fallbackError instanceof Error ? fallbackError.message : "Unknown error" };
    }
  }
}

async function seedPolicies(): Promise<SeedResult> {
  try {
    let seededCount = 0;
    for (const policy of DEFAULT_POLICIES) {
      const result = await db.execute(sql`
        INSERT INTO governance_policies (
          id, name, description, policy_type, effect, priority,
          conditions, actions, resources, roles, message, is_active
        )
        VALUES (
          ${policy.id}, ${policy.name}, ${policy.description}, ${policy.policyType}, ${policy.effect}, ${policy.priority},
          ${JSON.stringify(policy.conditions)}::jsonb, ${JSON.stringify(policy.actions)}::jsonb,
          ${JSON.stringify(policy.resources)}::jsonb, ${JSON.stringify(policy.roles)}::jsonb,
          ${policy.message}, true
        )
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `);
      if (result.rowCount && result.rowCount > 0) {
        seededCount++;
        console.log(`  ✅ Created policy: ${policy.name}`);
      } else {
        console.log(`  ⏭️  Policy exists: ${policy.name}`);
      }
    }
    return { entity: "policies", action: seededCount > 0 ? "seeded" : "exists", count: seededCount };
  } catch (error) {
    return { entity: "policies", action: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function runSeed(): Promise<SeedResult[]> {
  const results: SeedResult[] = [];

  console.log("\n🌱 Running Governance Seed Pack...\n");

  // Seed roles
  console.log("📁 Seeding roles...");
  results.push(await seedRoles());

  // Seed permissions
  console.log("\n🔑 Seeding permissions...");
  results.push(await seedPermissions());

  // Seed policies
  console.log("\n📋 Seeding policies...");
  results.push(await seedPolicies());

  console.log("\n✅ Seeding completed!");

  return results;
}

// Run seed if executed directly
const isMainModule = typeof require !== 'undefined' && require.main === module;
if (isMainModule) {
  runSeed()
    .then((results) => {
      console.log("\n📋 Seed Summary:");
      console.log("─".repeat(50));
      results.forEach((r) => {
        const icon = r.action === "seeded" ? "✅" : r.action === "exists" ? "⏭️ " : "❌";
        const countStr = r.count !== undefined ? ` (${r.count} new)` : "";
        console.log(`${icon} ${r.entity}: ${r.action}${countStr}${r.message ? ` - ${r.message}` : ""}`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seeding failed:", error);
      process.exit(1);
    });
}

export default runSeed;
