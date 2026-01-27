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
  const startTime = Date.now();

  try {
    // Step 1: Run table migrations

    const migrationResults = await runMigration();

    // Step 2: Run seeds

    const seedResults = await runSeed();

    // Summary
    const duration = Date.now() - startTime;

    const tablesCreated = migrationResults.filter(r => r.action === "created").length;
    const tablesExisting = migrationResults.filter(r => r.action === "exists").length;
    const dataSeeded = seedResults.filter(r => r.action === "seeded").length;
    const dataExisting = seedResults.filter(r => r.action === "exists").length;
    const errors = [...migrationResults, ...seedResults].filter(r => r.action === "error").length;

    if (errors > 0) {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

main();
