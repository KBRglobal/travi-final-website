/**
 * SEO Engine Smoke Test Script
 *
 * Tests all core SEO Engine endpoints and reports:
 * - 404 (flag off) vs 200 (flag on)
 * - 401/403 (auth)
 * - Latency
 *
 * Usage:
 *   npx tsx scripts/smoke-seo-engine.ts
 *
 * Options:
 *   --enable-flags  Enable feature flags before testing
 *   --base-url      Base URL (default: http://localhost:5000)
 */

const BASE_URL = process.env.BASE_URL || process.argv.find(a => a.startsWith('--base-url='))?.split('=')[1] || 'http://localhost:5000';
const ENABLE_FLAGS = process.argv.includes('--enable-flags');

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  latencyMs: number;
  success: boolean;
  message: string;
  requiresAuth: boolean;
  requiresFlag?: string;
}

const results: TestResult[] = [];

// ============================================================================
// Endpoints to Test
// ============================================================================

const ENDPOINTS = [
  // Feature Flags (always accessible)
  { method: 'GET', path: '/api/seo-engine/flags', requiresAuth: false },

  // Core endpoints (require ENABLE_SEO_ENGINE)
  { method: 'GET', path: '/api/seo-engine/status', requiresAuth: false, requiresFlag: 'ENABLE_SEO_ENGINE' },
  { method: 'GET', path: '/api/seo-engine/dashboard', requiresAuth: false, requiresFlag: 'ENABLE_SEO_ENGINE' },

  // Governance
  { method: 'GET', path: '/api/seo-engine/governance/approvals', requiresAuth: false, requiresFlag: 'ENABLE_SEO_ENGINE' },
  { method: 'GET', path: '/api/seo-engine/governance/rollback-tokens', requiresAuth: true, requiresFlag: 'ENABLE_SEO_ENGINE' },

  // Adapters
  { method: 'GET', path: '/api/seo-engine/adapters/content/test-id', requiresAuth: false, requiresFlag: 'ENABLE_SEO_ENGINE' },
  { method: 'GET', path: '/api/seo-engine/adapters/metrics/test-id', requiresAuth: false, requiresFlag: 'ENABLE_SEO_ENGINE' },
  { method: 'GET', path: '/api/seo-engine/adapters/indexing/test-id', requiresAuth: false, requiresFlag: 'ENABLE_SEO_ENGINE' },
  { method: 'GET', path: '/api/seo-engine/adapters/links/test-id', requiresAuth: false, requiresFlag: 'ENABLE_SEO_ENGINE' },

  // Classification (require ENABLE_SEO_CLASSIFICATION)
  { method: 'GET', path: '/api/seo-engine/classification/distribution', requiresAuth: false, requiresFlag: 'ENABLE_SEO_CLASSIFICATION' },
  { method: 'GET', path: '/api/seo-engine/classification/risk-pages', requiresAuth: false, requiresFlag: 'ENABLE_SEO_CLASSIFICATION' },

  // AEO Validation (require ENABLE_SEO_AEO_VALIDATION)
  { method: 'GET', path: '/api/seo-engine/aeo-validation/needs-enhancement', requiresAuth: false, requiresFlag: 'ENABLE_SEO_AEO_VALIDATION' },

  // Link Graph (require ENABLE_SEO_LINK_GRAPH)
  { method: 'GET', path: '/api/seo-engine/link-graph/stats', requiresAuth: false, requiresFlag: 'ENABLE_SEO_LINK_GRAPH' },
  { method: 'GET', path: '/api/seo-engine/link-graph/optimizations', requiresAuth: false, requiresFlag: 'ENABLE_SEO_LINK_GRAPH' },
  { method: 'GET', path: '/api/seo-engine/link-graph/top-pages', requiresAuth: false, requiresFlag: 'ENABLE_SEO_LINK_GRAPH' },

  // Pipeline (require ENABLE_SEO_PIPELINE)
  { method: 'GET', path: '/api/seo-engine/pipeline/urgent', requiresAuth: false, requiresFlag: 'ENABLE_SEO_PIPELINE' },

  // Risks (require ENABLE_SEO_RISK_MONITOR)
  { method: 'GET', path: '/api/seo-engine/risks', requiresAuth: false, requiresFlag: 'ENABLE_SEO_RISK_MONITOR' },

  // Executive Dashboard (require ENABLE_SEO_EXEC_DASHBOARD)
  { method: 'GET', path: '/api/seo-engine/executive', requiresAuth: false, requiresFlag: 'ENABLE_SEO_EXEC_DASHBOARD' },
  { method: 'GET', path: '/api/seo-engine/executive/quick-health', requiresAuth: false, requiresFlag: 'ENABLE_SEO_EXEC_DASHBOARD' },

  // Autopilot (require ENABLE_SEO_AUTOPILOT)
  { method: 'GET', path: '/api/seo-engine/autopilot/status', requiresAuth: false, requiresFlag: 'ENABLE_SEO_AUTOPILOT' },
  { method: 'GET', path: '/api/seo-engine/autopilot/config', requiresAuth: false, requiresFlag: 'ENABLE_SEO_AUTOPILOT' },

  // Actions (require ENABLE_SEO_ACTIONS)
  { method: 'GET', path: '/api/seo-engine/actions/pending', requiresAuth: false, requiresFlag: 'ENABLE_SEO_ACTIONS' },
];

// ============================================================================
// Test Functions
// ============================================================================

async function testEndpoint(
  endpoint: { method: string; path: string; requiresAuth: boolean; requiresFlag?: string }
): Promise<TestResult> {
  const url = `${BASE_URL}${endpoint.path}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const latencyMs = Date.now() - startTime;
    const status = response.status;

    let success = false;
    let message = '';

    if (status === 200) {
      success = true;
      message = 'OK';
    } else if (status === 404 && endpoint.requiresFlag) {
      success = true; // Expected when flag is off
      message = `Flag off (${endpoint.requiresFlag})`;
    } else if (status === 401 || status === 403) {
      success = endpoint.requiresAuth; // Expected for auth-required endpoints
      message = endpoint.requiresAuth ? 'Auth required (expected)' : 'Unexpected auth error';
    } else if (status === 500) {
      success = false;
      message = 'Server error';
    } else {
      success = false;
      message = `Unexpected status: ${status}`;
    }

    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status,
      latencyMs,
      success,
      message,
      requiresAuth: endpoint.requiresAuth,
      requiresFlag: endpoint.requiresFlag,
    };
  } catch (error) {
    return {
      endpoint: endpoint.path,
      method: endpoint.method,
      status: 0,
      latencyMs: Date.now() - startTime,
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      requiresAuth: endpoint.requiresAuth,
      requiresFlag: endpoint.requiresFlag,
    };
  }
}

async function enableFlags(): Promise<void> {
  console.log('\n🔧 Enabling feature flags...\n');

  const flags = {
    ENABLE_SEO_ENGINE: true,
    ENABLE_SEO_AUTOPILOT: true,
    ENABLE_SEO_ACTIONS: true,
    ENABLE_SEO_LINK_GRAPH: true,
    ENABLE_SEO_PIPELINE: true,
    ENABLE_SEO_RISK_MONITOR: true,
    ENABLE_SEO_EXEC_DASHBOARD: true,
    ENABLE_SEO_CLASSIFICATION: true,
    ENABLE_SEO_AEO_VALIDATION: true,
  };

  try {
    const response = await fetch(`${BASE_URL}/api/seo-engine/flags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flags),
    });

    if (response.ok) {
      console.log('✅ Feature flags enabled');
    } else {
      console.log('⚠️  Could not enable flags (may require auth)');
    }
  } catch (error) {
    console.log('⚠️  Could not enable flags:', error);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║            SEO ENGINE SMOKE TEST                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ Base URL: ${BASE_URL.padEnd(50)} ║`);
  console.log(`║ Enable Flags: ${ENABLE_FLAGS ? 'YES' : 'NO'}${' '.repeat(45)} ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');

  if (ENABLE_FLAGS) {
    await enableFlags();
  }

  console.log('\n📋 Testing endpoints...\n');

  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    const statusIcon = result.success ? '✅' : '❌';
    const latency = `${result.latencyMs}ms`.padStart(6);
    const status = `${result.status}`.padStart(3);

    console.log(
      `${statusIcon} [${status}] ${result.method.padEnd(4)} ${result.endpoint.padEnd(50)} ${latency} ${result.message}`
    );
  }

  // Summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                       SUMMARY                                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgLatency = Math.round(results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length);

  const flagOff404 = results.filter(r => r.status === 404 && r.requiresFlag).length;
  const flagOn200 = results.filter(r => r.status === 200 && r.requiresFlag).length;
  const authRequired = results.filter(r => (r.status === 401 || r.status === 403) && r.requiresAuth).length;

  console.log(`║ Total Endpoints: ${ENDPOINTS.length}`.padEnd(63) + '║');
  console.log(`║ Passed: ${passed}`.padEnd(63) + '║');
  console.log(`║ Failed: ${failed}`.padEnd(63) + '║');
  console.log(`║ Avg Latency: ${avgLatency}ms`.padEnd(63) + '║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║ Flag OFF (404): ${flagOff404}`.padEnd(63) + '║');
  console.log(`║ Flag ON (200): ${flagOn200}`.padEnd(63) + '║');
  console.log(`║ Auth Required (401/403): ${authRequired}`.padEnd(63) + '║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // Exit with error code if any tests failed
  if (failed > 0) {
    console.log('\n❌ Some tests failed. See details above.\n');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  }
}

main().catch(console.error);
