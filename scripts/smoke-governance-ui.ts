/**
 * Governance UI Smoke Test Script
 *
 * Validates that all governance API endpoints are responding correctly.
 * Feature flag: ENABLE_ENTERPRISE_GOVERNANCE_UI
 *
 * Usage: npx tsx scripts/smoke-governance-ui.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

interface TestResult {
  endpoint: string;
  method: string;
  status: "pass" | "fail" | "skip";
  statusCode?: number;
  message?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: "GET" | "POST" = "GET",
  body?: object,
  expectedStatus: number[] = [200, 401, 403]
): Promise<void> {
  const start = Date.now();
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        // Note: In production, you'd need authentication headers
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - start;
    const passed = expectedStatus.includes(response.status);

    results.push({
      endpoint,
      method,
      status: passed ? "pass" : "fail",
      statusCode: response.status,
      duration,
      message: passed ? undefined : `Expected ${expectedStatus.join("|")}, got ${response.status}`,
    });
  } catch (error) {
    results.push({
      endpoint,
      method,
      status: "fail",
      message: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - start,
    });
  }
}

async function runSmokeTests(): Promise<void> {
  console.log("🔍 Governance UI Smoke Tests");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log("─".repeat(60));

  // Test Governance Summary
  console.log("\n📊 Testing Governance Dashboard...");
  await testEndpoint("/api/admin/governance/summary");

  // Test Roles Management
  console.log("🛡️  Testing Roles Management...");
  await testEndpoint("/api/admin/governance/roles");

  // Test Users Management
  console.log("👥 Testing Users Management...");
  await testEndpoint("/api/admin/governance/users");

  // Test Policies Management
  console.log("📋 Testing Policies Management...");
  await testEndpoint("/api/admin/governance/policies");

  // Test Approvals Management
  console.log("⏳ Testing Approvals Management...");
  await testEndpoint("/api/admin/governance/approvals");
  await testEndpoint("/api/admin/governance/approvals?status=pending");

  // Test Audit Log
  console.log("📜 Testing Audit Log...");
  await testEndpoint("/api/admin/governance/audit");
  await testEndpoint("/api/admin/governance/audit?page=1&limit=10");
  await testEndpoint("/api/admin/governance/audit?eventType=update");

  // Test Access Control (RBAC)
  console.log("🔐 Testing Access Control...");
  await testEndpoint("/api/admin/access-control/roles");
  await testEndpoint("/api/admin/access-control/permissions");

  // Print Results
  console.log("\n" + "═".repeat(60));
  console.log("📋 RESULTS SUMMARY");
  console.log("═".repeat(60));

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  results.forEach((result) => {
    const icon = result.status === "pass" ? "✅" : result.status === "fail" ? "❌" : "⏭️";
    const statusText = result.statusCode ? `[${result.statusCode}]` : "";
    const durationText = result.duration ? `(${result.duration}ms)` : "";
    console.log(
      `${icon} ${result.method.padEnd(4)} ${result.endpoint.padEnd(45)} ${statusText.padEnd(6)} ${durationText}`
    );
    if (result.message) {
      console.log(`   └─ ${result.message}`);
    }
  });

  console.log("\n" + "─".repeat(60));
  console.log(`Total: ${results.length} | ✅ Passed: ${passed} | ❌ Failed: ${failed} | ⏭️ Skipped: ${skipped}`);

  // Exit with error code if any tests failed
  if (failed > 0) {
    console.log("\n⚠️  Some tests failed. Check the results above.");
    process.exit(1);
  } else {
    console.log("\n🎉 All smoke tests passed!");
    process.exit(0);
  }
}

// Feature flag check
const isGovernanceEnabled = process.env.ENABLE_ENTERPRISE_GOVERNANCE === "true";
const isRbacEnabled = process.env.ENABLE_RBAC === "true";

if (!isGovernanceEnabled && !isRbacEnabled) {
  console.log("⚠️  Governance features are disabled.");
  console.log("   Set ENABLE_ENTERPRISE_GOVERNANCE=true or ENABLE_RBAC=true to enable.");
  console.log("\n   Running tests anyway (will expect 401/403 responses)...\n");
}

runSmokeTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
