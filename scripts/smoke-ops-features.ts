#!/usr/bin/env npx tsx
/**
 * Smoke Test Script for Ops Features
 * Tests core endpoints of each production ops module.
 *
 * Usage:
 *   npx tsx scripts/smoke-ops-features.ts [--base-url=http://localhost:5000]
 *
 * Note: Requires feature flags to be enabled:
 *   ENABLE_INCIDENTS=true
 *   ENABLE_AUDIT_V2=true
 *   ENABLE_ENTITY_QUALITY=true
 *   ENABLE_EXPORTS=true
 *   ENABLE_GO_LIVE_CHECKLIST=true
 */

const DEFAULT_BASE_URL = 'http://localhost:5000';
const TIMEOUT_MS = 5000;

interface TestResult {
  module: string;
  endpoint: string;
  status: 'pass' | 'fail' | 'skip';
  statusCode?: number;
  message: string;
  duration: number;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function testEndpoint(
  module: string,
  baseUrl: string,
  path: string,
  expectedWhenDisabled: number = 404
): Promise<TestResult> {
  const url = `${baseUrl}${path}`;
  const start = Date.now();

  try {
    const response = await fetchWithTimeout(url);
    const duration = Date.now() - start;

    if (response.status === 200) {
      return {
        module,
        endpoint: path,
        status: 'pass',
        statusCode: response.status,
        message: 'Endpoint responding',
        duration,
      };
    } else if (response.status === expectedWhenDisabled) {
      return {
        module,
        endpoint: path,
        status: 'skip',
        statusCode: response.status,
        message: 'Feature disabled (expected)',
        duration,
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        module,
        endpoint: path,
        status: 'pass',
        statusCode: response.status,
        message: 'Auth required (endpoint exists)',
        duration,
      };
    } else {
      return {
        module,
        endpoint: path,
        status: 'fail',
        statusCode: response.status,
        message: `Unexpected status: ${response.status}`,
        duration,
      };
    }
  } catch (error) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('ECONNREFUSED')) {
      return {
        module,
        endpoint: path,
        status: 'fail',
        message: 'Server not running',
        duration,
      };
    }

    return {
      module,
      endpoint: path,
      status: 'fail',
      message,
      duration,
    };
  }
}

async function runSmokeTests(baseUrl: string): Promise<TestResult[]> {
  console.log(`\n🔥 Running Ops Features Smoke Tests`);
  console.log(`   Base URL: ${baseUrl}\n`);

  const tests = [
    // Incidents
    { module: 'Incidents', path: '/api/admin/incidents/status' },
    { module: 'Incidents', path: '/api/admin/incidents/summary' },

    // Audit Log v2
    { module: 'Audit V2', path: '/api/admin/audit/status' },
    { module: 'Audit V2', path: '/api/admin/audit/summary' },

    // Entity Quality
    { module: 'Entity Quality', path: '/api/admin/entity-quality/status' },
    { module: 'Entity Quality', path: '/api/admin/entity-quality/stats' },

    // Exports
    { module: 'Exports', path: '/api/admin/exports/status' },

    // Go-Live
    { module: 'Go-Live', path: '/api/admin/go-live/status' },
    { module: 'Go-Live', path: '/api/admin/go-live/checks' },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await testEndpoint(test.module, baseUrl, test.path);
    results.push(result);

    const icon = result.status === 'pass' ? '✓' : result.status === 'skip' ? '○' : '✗';
    const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'skip' ? '\x1b[33m' : '\x1b[31m';
    console.log(`${color}${icon}\x1b[0m [${test.module}] ${test.path} - ${result.message} (${result.duration}ms)`);
  }

  return results;
}

function printSummary(results: TestResult[]): void {
  const passed = results.filter(r => r.status === 'pass').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const total = results.length;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Summary: ${passed} passed, ${skipped} skipped, ${failed} failed (${total} total)`);

  if (failed > 0) {
    console.log(`\n\x1b[31mFailed tests:\x1b[0m`);
    for (const result of results.filter(r => r.status === 'fail')) {
      console.log(`  - [${result.module}] ${result.endpoint}: ${result.message}`);
    }
  }

  if (skipped > 0) {
    console.log(`\n\x1b[33mSkipped (feature flags OFF):\x1b[0m`);
    const skippedModules = [...new Set(results.filter(r => r.status === 'skip').map(r => r.module))];
    for (const mod of skippedModules) {
      console.log(`  - ${mod}`);
    }
  }

  console.log('');
}

async function main(): Promise<void> {
  // Parse arguments
  let baseUrl = DEFAULT_BASE_URL;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--base-url=')) {
      baseUrl = arg.split('=')[1];
    }
  }

  const results = await runSmokeTests(baseUrl);
  printSummary(results);

  // Exit with error if any tests failed (not skipped)
  const hasFailures = results.some(r => r.status === 'fail');
  process.exit(hasFailures ? 1 : 0);
}

main().catch(console.error);
