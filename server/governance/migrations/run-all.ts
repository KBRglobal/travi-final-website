/**
 * Governance Migration Runner
 *
 * Runs all governance migrations and seeds in order.
 * Idempotent - safe to run multiple times.
 *
 * Usage: npx tsx server/governance/migrations/run-all.ts
 */

import { runMigration } from "./001-governance-tables";
import { runSeed } from "./002-seed-governance";

async function main() {
  console.log("═".repeat(60));
  console.log("🏛️  ENTERPRISE GOVERNANCE MIGRATION RUNNER");
  console.log("═".repeat(60));

  const startTime = Date.now();

  try {
    // Step 1: Run table migrations
    console.log("\n📦 Step 1: Creating/Updating Tables");
    console.log("─".repeat(60));
    const migrationResults = await runMigration();

    // Step 2: Run seeds
    console.log("\n🌱 Step 2: Seeding Default Data");
    console.log("─".repeat(60));
    const seedResults = await runSeed();

    // Summary
    const duration = Date.now() - startTime;
    console.log("\n" + "═".repeat(60));
    console.log("📊 MIGRATION COMPLETE");
    console.log("═".repeat(60));

    const tablesCreated = migrationResults.filter((r) => r.action === "created").length;
    const tablesExisting = migrationResults.filter((r) => r.action === "exists").length;
    const dataSeeded = seedResults.filter((r) => r.action === "seeded").length;
    const dataExisting = seedResults.filter((r) => r.action === "exists").length;
    const errors = [...migrationResults, ...seedResults].filter((r) => r.action === "error").length;

    console.log(`\n  Tables:    ${tablesCreated} created, ${tablesExisting} existing`);
    console.log(`  Data:      ${dataSeeded} seeded, ${dataExisting} existing`);
    console.log(`  Errors:    ${errors}`);
    console.log(`  Duration:  ${duration}ms`);
    console.log("");

    if (errors > 0) {
      console.log("⚠️  Some operations had errors. Check the output above.");
      process.exit(1);
    }

    console.log("✅ All migrations completed successfully!");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

main();
