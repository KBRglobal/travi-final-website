#!/usr/bin/env npx tsx
/**
 * Quick setup script for Octypo secrets
 * Run: npx tsx scripts/setup-octypo-secrets.ts
 */

// Add --setup flag if not present
if (!process.argv.includes("--setup") && !process.argv.includes("-s")) {
  process.argv.push("--setup");
}

// Import the secrets module which will run setup due to the flag
await import("../server/octypo/config/secrets.js");
