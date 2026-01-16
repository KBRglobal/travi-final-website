/**
 * Governance Migration Script
 *
 * Convenience wrapper to run governance migrations and seeds.
 * Feature-flagged and idempotent - safe to run in production.
 *
 * Usage: npx tsx scripts/migrate-governance.ts [--dry-run]
 */

const isDryRun = process.argv.includes("--dry-run");

console.log("🏛️  Governance Migration");
console.log("─".repeat(40));
console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}`);
console.log(`ENABLE_ENTERPRISE_GOVERNANCE: ${process.env.ENABLE_ENTERPRISE_GOVERNANCE || "not set"}`);
console.log(`ENABLE_RBAC: ${process.env.ENABLE_RBAC || "not set"}`);
console.log("─".repeat(40));

if (isDryRun) {
  console.log("\n📋 Dry run - would perform:");
  console.log("  1. Create governance_roles table (if not exists)");
  console.log("  2. Create governance_permissions table (if not exists)");
  console.log("  3. Create user_role_assignments table (if not exists)");
  console.log("  4. Create governance_policies table (if not exists)");
  console.log("  5. Create governance_audit_logs table (if not exists)");
  console.log("  6. Create approval_requests table (if not exists)");
  console.log("  7. Create approval_steps table (if not exists)");
  console.log("  8. Create policy_evaluations table (if not exists)");
  console.log("  9. Seed default roles (6 roles)");
  console.log("  10. Seed default permissions (~35 permissions)");
  console.log("  11. Seed default policies (6 policies)");
  console.log("\n✅ Dry run complete. Run without --dry-run to apply changes.");
  process.exit(0);
}

// Run the actual migration
import("../server/governance/migrations/run-all")
  .catch((error) => {
    console.error("\n❌ Migration import failed:", error);
    process.exit(1);
  });
