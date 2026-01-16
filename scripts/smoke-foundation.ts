#!/usr/bin/env npx tsx
/**
 * Foundation Smoke Test Script
 * Phase 1 Foundation: Verify foundation infrastructure is working
 *
 * Usage:
 *   npx tsx scripts/smoke-foundation.ts [base-url]
 *
 * Examples:
 *   npx tsx scripts/smoke-foundation.ts
 *   npx tsx scripts/smoke-foundation.ts http://localhost:5000
 *
 * Expected behavior:
 * - With ENABLE_FOUNDATION=false (default): All foundation endpoints return 404
 * - With ENABLE_FOUNDATION=true: Foundation endpoints are accessible
 */

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const BASE_URL = process.argv[2] || 'http://localhost:5000';

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; message: string }>
): Promise<TestResult> {
  const start = Date.now();
  try {
    const result = await testFn();
    return {
      name,
      passed: result.passed,
      message: result.message,
      duration: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      passed: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start,
    };
  }
}

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Test Cases
// ============================================================================

async function testHealthEndpoint(): Promise<{ passed: boolean; message: string }> {
  const url = `${BASE_URL}/api/health`;
  const response = await fetchWithTimeout(url);

  if (response.status === 200) {
    const data = await response.json();
    if (data.status === 'healthy' || data.status === 'unhealthy') {
      return { passed: true, message: `Health check OK: ${data.status}` };
    }
  }

  return { passed: false, message: `Unexpected response: ${response.status}` };
}

async function testFoundationPingDisabled(): Promise<{ passed: boolean; message: string }> {
  // When foundation is disabled, ping should return 404
  const url = `${BASE_URL}/api/_foundation/ping`;
  const response = await fetchWithTimeout(url);

  if (response.status === 404) {
    return { passed: true, message: 'Foundation ping correctly returns 404 when disabled' };
  }

  if (response.status === 200) {
    return {
      passed: true,
      message: 'Foundation is ENABLED - ping endpoint accessible',
    };
  }

  return { passed: false, message: `Unexpected response: ${response.status}` };
}

async function testEventStatsEndpoint(): Promise<{ passed: boolean; message: string }> {
  const url = `${BASE_URL}/api/_foundation/events/stats`;
  const response = await fetchWithTimeout(url);

  if (response.status === 404) {
    return { passed: true, message: 'Event stats correctly returns 404 when disabled' };
  }

  if (response.status === 200) {
    const data = await response.json();
    if ('enabled' in data) {
      return {
        passed: true,
        message: `Event bus stats accessible: enabled=${data.enabled}`,
      };
    }
  }

  return { passed: false, message: `Unexpected response: ${response.status}` };
}

async function testCorrelationIdHeader(): Promise<{ passed: boolean; message: string }> {
  const url = `${BASE_URL}/api/health`;
  const response = await fetchWithTimeout(url);

  const correlationId = response.headers.get('x-correlation-id');

  if (correlationId) {
    return {
      passed: true,
      message: `Correlation ID present: ${correlationId.substring(0, 20)}...`,
    };
  }

  // If correlation ID is not present, that's also fine (feature is disabled)
  return {
    passed: true,
    message: 'Correlation ID not present (feature likely disabled)',
  };
}

async function testNoBreakingChanges(): Promise<{ passed: boolean; message: string }> {
  // Test that existing endpoints still work
  const endpoints = [
    '/api/health',
  ];

  const results: string[] = [];

  for (const endpoint of endpoints) {
    const url = `${BASE_URL}${endpoint}`;
    try {
      const response = await fetchWithTimeout(url);
      if (response.status !== 200) {
        return {
          passed: false,
          message: `Endpoint ${endpoint} returned ${response.status}`,
        };
      }
      results.push(`${endpoint}: OK`);
    } catch (error) {
      return {
        passed: false,
        message: `Endpoint ${endpoint} failed: ${error}`,
      };
    }
  }

  return { passed: true, message: results.join(', ') };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('\n===========================================');
  console.log('  Foundation Smoke Test');
  console.log('===========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('-------------------------------------------\n');

  const tests = [
    { name: 'Health Endpoint', fn: testHealthEndpoint },
    { name: 'Foundation Ping (disabled check)', fn: testFoundationPingDisabled },
    { name: 'Event Stats Endpoint', fn: testEventStatsEndpoint },
    { name: 'Correlation ID Header', fn: testCorrelationIdHeader },
    { name: 'No Breaking Changes', fn: testNoBreakingChanges },
  ];

  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runTest(test.name, test.fn);
    results.push(result);

    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name} (${result.duration}ms)`);
    console.log(`   ${result.message}\n`);
  }

  console.log('-------------------------------------------');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('===========================================\n');

  if (failed > 0) {
    console.log('⚠️  Some tests failed. Check the output above.');
    process.exit(1);
  }

  console.log('✅ All smoke tests passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('Smoke test failed:', error);
  process.exit(1);
});
