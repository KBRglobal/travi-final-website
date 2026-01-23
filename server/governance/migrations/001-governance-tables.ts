/**
 * Governance Tables Migration
 *
 * Creates/updates governance tables for RBAC, policies, approvals, and audit.
 * Idempotent - safe to run multiple times.
 *
 * Feature flags:
 * - ENABLE_ENTERPRISE_GOVERNANCE
 * - ENABLE_RBAC
 *
 * Usage: npx tsx server/governance/migrations/001-governance-tables.ts
 */

import { db } from "../../db";
import { sql } from "drizzle-orm";

interface MigrationResult {
  table: string;
  action: "created" | "exists" | "updated" | "error";
  message?: string;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ${tableName}
    ) as exists
  `);
  return (result.rows[0] as { exists: boolean })?.exists === true;
}

async function checkEnumExists(enumName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT EXISTS (
      SELECT FROM pg_type
      WHERE typname = ${enumName}
    ) as exists
  `);
  return (result.rows[0] as { exists: boolean })?.exists === true;
}

export async function runMigration(): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  console.log("\n🔄 Running Governance Tables Migration...\n");

  try {
    // 1. Create governance_role enum if not exists
    const enumExists = await checkEnumExists("governance_role");
    if (!enumExists) {
      await db.execute(sql`
        CREATE TYPE governance_role AS ENUM (
          'super_admin', 'admin', 'editor', 'analyst', 'ops', 'viewer'
        )
      `);
      results.push({ table: "governance_role (enum)", action: "created" });
      console.log("✅ Created governance_role enum");
    } else {
      results.push({ table: "governance_role (enum)", action: "exists" });
      console.log("⏭️  governance_role enum already exists");
    }

    // 2. Create governance_roles table
    const rolesExists = await checkTableExists("governance_roles");
    if (!rolesExists) {
      await db.execute(sql`
        CREATE TABLE governance_roles (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
          name VARCHAR(50) NOT NULL UNIQUE,
          display_name VARCHAR(100) NOT NULL,
          description TEXT,
          priority INTEGER NOT NULL DEFAULT 0,
          is_system BOOLEAN NOT NULL DEFAULT false,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_roles_name" ON governance_roles (name)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_roles_priority" ON governance_roles (priority)`);
      results.push({ table: "governance_roles", action: "created" });
      console.log("✅ Created governance_roles table");
    } else {
      results.push({ table: "governance_roles", action: "exists" });
      console.log("⏭️  governance_roles table already exists");
    }

    // 3. Create governance_permissions table
    const permsExists = await checkTableExists("governance_permissions");
    if (!permsExists) {
      await db.execute(sql`
        CREATE TABLE governance_permissions (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
          role_id VARCHAR NOT NULL REFERENCES governance_roles(id) ON DELETE CASCADE,
          action VARCHAR(50) NOT NULL,
          resource VARCHAR(50) NOT NULL,
          scope VARCHAR(50) NOT NULL DEFAULT 'global',
          scope_value VARCHAR(255),
          is_allowed BOOLEAN NOT NULL DEFAULT true,
          conditions JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_perms_role" ON governance_permissions (role_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_perms_action" ON governance_permissions (action, resource)`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_gov_perms_unique" ON governance_permissions (role_id, action, resource, scope, COALESCE(scope_value, ''))`);
      results.push({ table: "governance_permissions", action: "created" });
      console.log("✅ Created governance_permissions table");
    } else {
      results.push({ table: "governance_permissions", action: "exists" });
      console.log("⏭️  governance_permissions table already exists");
    }

    // 4. Create user_role_assignments table
    const assignExists = await checkTableExists("user_role_assignments");
    if (!assignExists) {
      await db.execute(sql`
        CREATE TABLE user_role_assignments (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
          user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role_id VARCHAR NOT NULL REFERENCES governance_roles(id) ON DELETE CASCADE,
          scope VARCHAR(50) NOT NULL DEFAULT 'global',
          scope_value VARCHAR(255),
          granted_by VARCHAR REFERENCES users(id),
          granted_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP,
          is_active BOOLEAN NOT NULL DEFAULT true
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_user_role_user" ON user_role_assignments (user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_user_role_role" ON user_role_assignments (role_id)`);
      await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_user_role_unique" ON user_role_assignments (user_id, role_id, scope, COALESCE(scope_value, ''))`);
      results.push({ table: "user_role_assignments", action: "created" });
      console.log("✅ Created user_role_assignments table");
    } else {
      results.push({ table: "user_role_assignments", action: "exists" });
      console.log("⏭️  user_role_assignments table already exists");
    }

    // 5. Create governance_policies table
    const policiesExists = await checkTableExists("governance_policies");
    if (!policiesExists) {
      await db.execute(sql`
        CREATE TABLE governance_policies (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          policy_type VARCHAR(50) NOT NULL,
          effect VARCHAR(10) NOT NULL DEFAULT 'block',
          priority INTEGER NOT NULL DEFAULT 100,
          conditions JSONB NOT NULL DEFAULT '{}',
          actions JSONB DEFAULT '[]',
          resources JSONB DEFAULT '[]',
          roles JSONB DEFAULT '[]',
          message TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by VARCHAR REFERENCES users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_policies_type" ON governance_policies (policy_type)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_policies_active" ON governance_policies (is_active)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_policies_priority" ON governance_policies (priority)`);
      results.push({ table: "governance_policies", action: "created" });
      console.log("✅ Created governance_policies table");
    } else {
      results.push({ table: "governance_policies", action: "exists" });
      console.log("⏭️  governance_policies table already exists");
    }

    // 6. Create governance_audit_logs table
    const auditExists = await checkTableExists("governance_audit_logs");
    if (!auditExists) {
      await db.execute(sql`
        CREATE TABLE governance_audit_logs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
          user_id VARCHAR REFERENCES users(id),
          user_role VARCHAR(50),
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(100) NOT NULL,
          resource_id VARCHAR(255),
          before_snapshot TEXT,
          after_snapshot TEXT,
          snapshot_hash VARCHAR(64),
          source VARCHAR(50) NOT NULL DEFAULT 'api',
          ip_address VARCHAR(45),
          user_agent TEXT,
          session_id VARCHAR(255),
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_audit_user" ON governance_audit_logs (user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_audit_action" ON governance_audit_logs (action)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_audit_resource" ON governance_audit_logs (resource, resource_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_audit_created" ON governance_audit_logs (created_at)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_gov_audit_source" ON governance_audit_logs (source)`);
      results.push({ table: "governance_audit_logs", action: "created" });
      console.log("✅ Created governance_audit_logs table");
    } else {
      results.push({ table: "governance_audit_logs", action: "exists" });
      console.log("⏭️  governance_audit_logs table already exists");
    }

    // 7. Create approval_requests table
    const approvalReqExists = await checkTableExists("approval_requests");
    if (!approvalReqExists) {
      await db.execute(sql`
        CREATE TABLE approval_requests (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
          request_type VARCHAR(50) NOT NULL,
          resource_type VARCHAR(50) NOT NULL,
          resource_id VARCHAR(255) NOT NULL,
          requester_id VARCHAR NOT NULL REFERENCES users(id),
          current_step INTEGER NOT NULL DEFAULT 0,
          total_steps INTEGER NOT NULL DEFAULT 1,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          priority VARCHAR(20) NOT NULL DEFAULT 'normal',
          reason TEXT,
          metadata JSONB,
          escalated_at TIMESTAMP,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_approval_req_resource" ON approval_requests (resource_type, resource_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_approval_req_requester" ON approval_requests (requester_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_approval_req_status" ON approval_requests (status)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_approval_req_created" ON approval_requests (created_at)`);
      results.push({ table: "approval_requests", action: "created" });
      console.log("✅ Created approval_requests table");
    } else {
      results.push({ table: "approval_requests", action: "exists" });
      console.log("⏭️  approval_requests table already exists");
    }

    // 8. Create approval_steps table
    const approvalStepsExists = await checkTableExists("approval_steps");
    if (!approvalStepsExists) {
      await db.execute(sql`
        CREATE TABLE approval_steps (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
          request_id VARCHAR NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
          step_number INTEGER NOT NULL,
          approver_type VARCHAR(20) NOT NULL,
          approver_id VARCHAR,
          approver_role VARCHAR(50),
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          decision VARCHAR(20),
          decision_reason TEXT,
          decided_by VARCHAR REFERENCES users(id),
          decided_at TIMESTAMP,
          auto_approve_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_approval_steps_request" ON approval_steps (request_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_approval_steps_approver" ON approval_steps (approver_type, approver_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_approval_steps_status" ON approval_steps (status)`);
      results.push({ table: "approval_steps", action: "created" });
      console.log("✅ Created approval_steps table");
    } else {
      results.push({ table: "approval_steps", action: "exists" });
      console.log("⏭️  approval_steps table already exists");
    }

    // 9. Create policy_evaluations table
    const policyEvalsExists = await checkTableExists("policy_evaluations");
    if (!policyEvalsExists) {
      await db.execute(sql`
        CREATE TABLE policy_evaluations (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
          policy_id VARCHAR REFERENCES governance_policies(id),
          policy_name VARCHAR(100) NOT NULL,
          user_id VARCHAR REFERENCES users(id),
          action VARCHAR(100) NOT NULL,
          resource VARCHAR(100) NOT NULL,
          resource_id VARCHAR(255),
          result VARCHAR(20) NOT NULL,
          reason TEXT,
          evaluated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_policy_eval_policy" ON policy_evaluations (policy_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_policy_eval_user" ON policy_evaluations (user_id)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_policy_eval_result" ON policy_evaluations (result)`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_policy_eval_time" ON policy_evaluations (evaluated_at)`);
      results.push({ table: "policy_evaluations", action: "created" });
      console.log("✅ Created policy_evaluations table");
    } else {
      results.push({ table: "policy_evaluations", action: "exists" });
      console.log("⏭️  policy_evaluations table already exists");
    }

    console.log("\n✅ Migration completed successfully!");

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    results.push({ table: "migration", action: "error", message: errMsg });
    console.error("\n❌ Migration failed:", errMsg);
    throw error;
  }

  return results;
}

// Run migration if executed directly
const isMainModule = typeof require !== 'undefined' && require.main === module;
if (isMainModule) {
  runMigration()
    .then((results) => {
      console.log("\n📋 Migration Summary:");
      console.log("─".repeat(50));
      results.forEach((r) => {
        const icon = r.action === "created" ? "✅" : r.action === "exists" ? "⏭️ " : "❌";
        console.log(`${icon} ${r.table}: ${r.action}${r.message ? ` - ${r.message}` : ""}`);
      });
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

export default runMigration;
