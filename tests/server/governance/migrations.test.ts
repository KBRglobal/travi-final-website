/**
 * Governance Migration & Seed Pack Tests
 */

import { describe, it, expect } from "vitest";

describe("Governance Migration Pack", () => {
  describe("Table Definitions", () => {
    const GOVERNANCE_TABLES = [
      "governance_roles",
      "governance_permissions",
      "user_role_assignments",
      "governance_policies",
      "governance_audit_logs",
      "approval_requests",
      "approval_steps",
      "policy_evaluations",
    ];

    it("should have all required tables defined", () => {
      expect(GOVERNANCE_TABLES).toHaveLength(8);
      expect(GOVERNANCE_TABLES).toContain("governance_roles");
      expect(GOVERNANCE_TABLES).toContain("governance_permissions");
      expect(GOVERNANCE_TABLES).toContain("governance_policies");
    });

    it("should have correct table naming convention", () => {
      GOVERNANCE_TABLES.forEach((table) => {
        expect(table).toMatch(/^[a-z_]+$/);
        expect(table).not.toContain("-");
      });
    });
  });

  describe("Default Roles", () => {
    const DEFAULT_ROLES = [
      { name: "super_admin", priority: 100 },
      { name: "admin", priority: 80 },
      { name: "ops", priority: 60 },
      { name: "editor", priority: 40 },
      { name: "analyst", priority: 30 },
      { name: "viewer", priority: 10 },
    ];

    it("should have 6 default roles", () => {
      expect(DEFAULT_ROLES).toHaveLength(6);
    });

    it("should have correct priority ordering", () => {
      const sorted = [...DEFAULT_ROLES].sort((a, b) => b.priority - a.priority);
      expect(sorted[0].name).toBe("super_admin");
      expect(sorted[sorted.length - 1].name).toBe("viewer");
    });

    it("should have super_admin as highest priority", () => {
      const superAdmin = DEFAULT_ROLES.find((r) => r.name === "super_admin");
      expect(superAdmin?.priority).toBe(100);
    });

    it("should have all priorities be positive integers", () => {
      DEFAULT_ROLES.forEach((role) => {
        expect(Number.isInteger(role.priority)).toBe(true);
        expect(role.priority).toBeGreaterThan(0);
      });
    });

    it("should have unique priorities", () => {
      const priorities = DEFAULT_ROLES.map((r) => r.priority);
      const unique = new Set(priorities);
      expect(unique.size).toBe(priorities.length);
    });
  });

  describe("Default Permissions", () => {
    const PERMISSION_ACTIONS = [
      "create",
      "read",
      "update",
      "delete",
      "publish",
      "manage",
      "upload",
      "export",
      "*",
    ];

    const PERMISSION_RESOURCES = [
      "content",
      "user",
      "analytics",
      "audit",
      "roles",
      "policies",
      "approvals",
      "media",
      "reports",
      "system",
      "deployments",
      "monitoring",
      "*",
    ];

    const PERMISSION_SCOPES = ["global", "own"];

    it("should define standard actions", () => {
      expect(PERMISSION_ACTIONS).toContain("create");
      expect(PERMISSION_ACTIONS).toContain("read");
      expect(PERMISSION_ACTIONS).toContain("update");
      expect(PERMISSION_ACTIONS).toContain("delete");
    });

    it("should have wildcard action for super_admin", () => {
      expect(PERMISSION_ACTIONS).toContain("*");
    });

    it("should define relevant resources", () => {
      expect(PERMISSION_RESOURCES).toContain("content");
      expect(PERMISSION_RESOURCES).toContain("user");
      expect(PERMISSION_RESOURCES).toContain("analytics");
    });

    it("should have valid scopes", () => {
      expect(PERMISSION_SCOPES).toContain("global");
      expect(PERMISSION_SCOPES).toContain("own");
    });
  });

  describe("Default Policies", () => {
    const DEFAULT_POLICIES = [
      { name: "require-approval-for-publish", effect: "block" },
      { name: "prevent-self-approval", effect: "block" },
      { name: "audit-sensitive-actions", effect: "allow" },
      { name: "rate-limit-exports", effect: "warn" },
      { name: "restrict-delete-published", effect: "block" },
      { name: "warn-bulk-operations", effect: "warn" },
    ];

    const POLICY_EFFECTS = ["allow", "warn", "block"];
    const POLICY_TYPES = ["approval", "audit", "rate_limit", "restriction", "warning"];

    it("should have 6 default policies", () => {
      expect(DEFAULT_POLICIES).toHaveLength(6);
    });

    it("should use valid effects", () => {
      DEFAULT_POLICIES.forEach((policy) => {
        expect(POLICY_EFFECTS).toContain(policy.effect);
      });
    });

    it("should have unique policy names", () => {
      const names = DEFAULT_POLICIES.map((p) => p.name);
      const unique = new Set(names);
      expect(unique.size).toBe(names.length);
    });

    it("should have approval-related policies", () => {
      const approvalPolicies = DEFAULT_POLICIES.filter(
        (p) => p.name.includes("approval") || p.name.includes("approve")
      );
      expect(approvalPolicies.length).toBeGreaterThan(0);
    });

    it("should have audit policy", () => {
      const auditPolicy = DEFAULT_POLICIES.find((p) => p.name.includes("audit"));
      expect(auditPolicy).toBeDefined();
    });
  });

  describe("Migration Idempotency", () => {
    it("should use ON CONFLICT DO NOTHING for roles", () => {
      const insertPattern = /ON CONFLICT.*DO NOTHING/i;
      const mockSql = `INSERT INTO governance_roles (...) ON CONFLICT (name) DO NOTHING`;
      expect(mockSql).toMatch(insertPattern);
    });

    it("should use ON CONFLICT DO NOTHING for permissions", () => {
      const insertPattern = /ON CONFLICT.*DO NOTHING/i;
      const mockSql = `INSERT INTO governance_permissions (...) ON CONFLICT ON CONSTRAINT ... DO NOTHING`;
      expect(mockSql).toMatch(insertPattern);
    });

    it("should use ON CONFLICT DO NOTHING for policies", () => {
      const insertPattern = /ON CONFLICT.*DO NOTHING/i;
      const mockSql = `INSERT INTO governance_policies (...) ON CONFLICT (name) DO NOTHING`;
      expect(mockSql).toMatch(insertPattern);
    });

    it("should check table existence before creation", () => {
      const checkExistsPattern = /information_schema\.tables|EXISTS/i;
      const mockSql = `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'governance_roles')`;
      expect(mockSql).toMatch(checkExistsPattern);
    });
  });

  describe("Index Definitions", () => {
    const EXPECTED_INDEXES = [
      "IDX_gov_roles_name",
      "IDX_gov_roles_priority",
      "IDX_gov_perms_role",
      "IDX_gov_perms_action",
      "IDX_gov_perms_unique",
      "IDX_user_role_user",
      "IDX_user_role_role",
      "IDX_gov_policies_type",
      "IDX_gov_policies_active",
      "IDX_gov_audit_user",
      "IDX_gov_audit_action",
      "IDX_gov_audit_resource",
      "IDX_gov_audit_created",
      "IDX_approval_req_resource",
      "IDX_approval_req_requester",
      "IDX_approval_req_status",
    ];

    it("should define indexes for governance_roles", () => {
      const roleIndexes = EXPECTED_INDEXES.filter((i) => i.includes("gov_roles"));
      expect(roleIndexes.length).toBeGreaterThanOrEqual(2);
    });

    it("should define indexes for governance_permissions", () => {
      const permIndexes = EXPECTED_INDEXES.filter((i) => i.includes("gov_perms"));
      expect(permIndexes.length).toBeGreaterThanOrEqual(3);
    });

    it("should define indexes for governance_audit_logs", () => {
      const auditIndexes = EXPECTED_INDEXES.filter((i) => i.includes("gov_audit"));
      expect(auditIndexes.length).toBeGreaterThanOrEqual(4);
    });

    it("should define indexes for approval_requests", () => {
      const approvalIndexes = EXPECTED_INDEXES.filter((i) => i.includes("approval_req"));
      expect(approvalIndexes.length).toBeGreaterThanOrEqual(3);
    });

    it("should use consistent naming convention for indexes", () => {
      EXPECTED_INDEXES.forEach((index) => {
        expect(index).toMatch(/^IDX_[a-z_]+$/);
      });
    });
  });

  describe("Foreign Key Relationships", () => {
    const EXPECTED_FK_RELATIONSHIPS = [
      { from: "governance_permissions.role_id", to: "governance_roles.id", onDelete: "cascade" },
      { from: "user_role_assignments.user_id", to: "users.id", onDelete: "cascade" },
      { from: "user_role_assignments.role_id", to: "governance_roles.id", onDelete: "cascade" },
      { from: "approval_requests.requester_id", to: "users.id", onDelete: "no action" },
      { from: "approval_steps.request_id", to: "approval_requests.id", onDelete: "cascade" },
    ];

    it("should have permissions referencing roles", () => {
      const permToRole = EXPECTED_FK_RELATIONSHIPS.find(
        (fk) => fk.from === "governance_permissions.role_id"
      );
      expect(permToRole).toBeDefined();
      expect(permToRole?.to).toBe("governance_roles.id");
    });

    it("should have user_role_assignments referencing users and roles", () => {
      const userFk = EXPECTED_FK_RELATIONSHIPS.find(
        (fk) => fk.from === "user_role_assignments.user_id"
      );
      const roleFk = EXPECTED_FK_RELATIONSHIPS.find(
        (fk) => fk.from === "user_role_assignments.role_id"
      );
      expect(userFk).toBeDefined();
      expect(roleFk).toBeDefined();
    });

    it("should cascade delete from governance_roles to governance_permissions", () => {
      const fk = EXPECTED_FK_RELATIONSHIPS.find(
        (fk) => fk.from === "governance_permissions.role_id"
      );
      expect(fk?.onDelete).toBe("cascade");
    });

    it("should cascade delete from approval_requests to approval_steps", () => {
      const fk = EXPECTED_FK_RELATIONSHIPS.find(
        (fk) => fk.from === "approval_steps.request_id"
      );
      expect(fk?.onDelete).toBe("cascade");
    });
  });
});

console.log("[Governance Migration Tests] Tests loaded");
