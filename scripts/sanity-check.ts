/**
 * TASK 8: Sanity Script - System health verification
 * Dev-only script to check if core systems are alive
 * 
 * Usage: npx tsx scripts/sanity-check.ts
 */

import { db } from "../server/db";
import { contents, destinations, searchIndex } from "../shared/schema";
import { count } from "drizzle-orm";

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: unknown;
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. Database reachable
  try {
    const [result] = await db.select({ count: count() }).from(contents);
    results.push({
      name: "Database",
      status: "pass",
      message: `Connected - ${result?.count || 0} content items`,
    });
  } catch (error) {
    results.push({
      name: "Database",
      status: "fail",
      message: "Cannot connect to database",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  // 2. Search index reachable
  try {
    const [result] = await db.select({ count: count() }).from(searchIndex);
    results.push({
      name: "Search Index",
      status: "pass",
      message: `Available - ${result?.count || 0} indexed items`,
    });
  } catch (error) {
    results.push({
      name: "Search Index",
      status: "fail",
      message: "Search index table not accessible",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  // 3. Destinations exist
  try {
    const [result] = await db.select({ count: count() }).from(destinations);
    const destCount = Number(result?.count || 0);
    results.push({
      name: "Destinations",
      status: destCount > 0 ? "pass" : "warn",
      message: destCount > 0 ? `${destCount} destinations configured` : "No destinations found",
    });
  } catch (error) {
    results.push({
      name: "Destinations",
      status: "fail",
      message: "Cannot query destinations",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  // 4. Environment variables
  const requiredEnvVars = ["DATABASE_URL"];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
  results.push({
    name: "Environment",
    status: missingEnvVars.length === 0 ? "pass" : "fail",
    message:
      missingEnvVars.length === 0
        ? "All required environment variables set"
        : `Missing: ${missingEnvVars.join(", ")}`,
  });

  // 5. AI providers configured
  const aiProviders = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "OPENROUTER_API_KEY"];
  const configuredProviders = aiProviders.filter((v) => process.env[v]);
  results.push({
    name: "AI Providers",
    status: configuredProviders.length > 0 ? "pass" : "warn",
    message:
      configuredProviders.length > 0
        ? `${configuredProviders.length} AI provider(s) configured`
        : "No AI providers configured",
  });

  // 6 & 7. Event bus and Job queue checks via runtime health endpoint
  // This checks the actual running server state, not just module imports
  const serverPort = process.env.PORT || 5000;
  const healthUrl = `http://localhost:${serverPort}/api/health`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(healthUrl, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timeout);

    if (response.ok) {
      const health = await response.json();
      // Event Bus check
      const subscriberCount = health.eventBus?.subscriberCount || 0;
      const hasInitTimestamp = !!health.eventBus?.lastInitializedAt;
      results.push({
        name: "Event Bus",
        status: health.eventBus?.initialized && subscriberCount > 0 && hasInitTimestamp ? "pass" : "fail",
        message: health.eventBus?.initialized && hasInitTimestamp
          ? `Event bus initialized at ${health.eventBus.lastInitializedAt} with ${subscriberCount} subscribers`
          : "Event bus not initialized on server",
      });
      // Job Queue check - must be available, running, and have recent tick (within 5 seconds)
      const queueRunning = health.jobQueue?.available && health.jobQueue?.isRunning;
      const lastTickAt = health.jobQueue?.lastTickAt ? new Date(health.jobQueue.lastTickAt) : null;
      const tickAgeMs = lastTickAt ? Date.now() - lastTickAt.getTime() : Infinity;
      const isTickRecent = tickAgeMs < 5000; // Must have ticked within last 5 seconds
      const lastProcessedAt = health.jobQueue?.lastProcessedAt;

      let queueMessage: string;
      if (queueRunning && isTickRecent) {
        queueMessage = `Job queue running, last tick: ${health.jobQueue.lastTickAt}` +
          (lastProcessedAt ? `, last job completed: ${lastProcessedAt}` : ", no jobs processed yet");
      } else if (queueRunning && lastTickAt) {
        queueMessage = `Job queue stalled - last tick was ${Math.round(tickAgeMs / 1000)}s ago`;
      } else if (queueRunning) {
        queueMessage = "Job queue running but no tick received yet";
      } else if (health.jobQueue?.available) {
        queueMessage = "Job queue available but not running";
      } else {
        queueMessage = "Job queue not available on server";
      }

      results.push({
        name: "Job Queue",
        status: queueRunning && isTickRecent ? "pass" : "fail",
        message: queueMessage,
      });
    } else {
      results.push({
        name: "Event Bus",
        status: "fail",
        message: `Health endpoint returned status ${response.status}`,
      });
      results.push({
        name: "Job Queue",
        status: "fail",
        message: `Health endpoint returned status ${response.status}`,
      });
    }
  } catch (error) {
    // Server not running or unreachable
    results.push({
      name: "Event Bus",
      status: "warn",
      message: "Server not running - cannot verify event bus",
      details: error instanceof Error ? error.message : String(error),
    });
    results.push({
      name: "Job Queue",
      status: "warn",
      message: "Server not running - cannot verify job queue",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return results;
}

async function main() {
  console.log("\n========================================");
  console.log("  TRAVI CMS - System Sanity Check");
  console.log("========================================\n");

  try {
    const results = await runChecks();
    let hasFailures = false;
    let hasWarnings = false;

    for (const result of results) {
      const icon = result.status === "pass" ? "✓" : result.status === "warn" ? "!" : "✗";
      const color = result.status === "pass" ? "\x1b[32m" : result.status === "warn" ? "\x1b[33m" : "\x1b[31m";
      console.log(`${color}[${icon}]\x1b[0m ${result.name}: ${result.message}`);
      if (result.details) {
        console.log(`    Details: ${JSON.stringify(result.details)}`);
      }

      if (result.status === "fail") hasFailures = true;
      if (result.status === "warn") hasWarnings = true;
    }

    console.log("\n----------------------------------------");
    if (hasFailures) {
      console.log("\x1b[31m✗ SYSTEM HAS FAILURES\x1b[0m");
      process.exit(1);
    } else if (hasWarnings) {
      console.log("\x1b[33m! SYSTEM OPERATIONAL WITH WARNINGS\x1b[0m");
      process.exit(0);
    } else {
      console.log("\x1b[32m✓ ALL SYSTEMS OPERATIONAL\x1b[0m");
      process.exit(0);
    }
  } catch (error) {
    console.error("\x1b[31mFATAL ERROR:\x1b[0m", error);
    process.exit(1);
  }
}

main();
