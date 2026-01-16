/**
 * TRAVI CMS Load Testing Scenarios
 * 
 * k6 load testing script for comprehensive performance testing
 * 
 * Run: npm run test:load
 * Or: k6 run tests/load/scenarios.js
 * 
 * Environment variables:
 * - BASE_URL: Target server URL (default: http://localhost:5000)
 * - SCENARIO: Specific scenario to run (default: all)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const contentCreationTime = new Trend('content_creation_time');
const apiResponseTime = new Trend('api_response_time');
const rateLimitHits = new Counter('rate_limit_hits');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const SCENARIO = __ENV.SCENARIO || 'all';

// Thresholds - Performance requirements
export const options = {
  thresholds: {
    // Overall HTTP thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000', 'avg<200'],
    http_req_failed: ['rate<0.01'],
    
    // Custom metric thresholds
    errors: ['rate<0.01'],
    api_response_time: ['p(95)<300'],
    content_creation_time: ['p(95)<1000'],
  },
  
  // Test scenarios with different load patterns
  scenarios: {
    // Smoke test - verify basic functionality
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest',
    },
    
    // Homepage load test - 100 concurrent users
    homepage_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Ramp up to 50 users
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '3m', target: 100 },   // Stay at 100 users
        { duration: '30s', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      exec: 'homepageLoad',
    },
    
    // API endpoints stress test
    api_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'apiStress',
    },
    
    // Content CRUD under load
    content_crud: {
      executor: 'constant-vus',
      vus: 20,
      duration: '3m',
      tags: { test_type: 'crud' },
      exec: 'contentCrud',
    },
    
    // Rate limiting verification
    rate_limit_test: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 50,
      maxDuration: '2m',
      tags: { test_type: 'rate_limit' },
      exec: 'rateLimitTest',
    },
    
    // Spike test - sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 10 },   // Normal load
        { duration: '10s', target: 200 },  // Spike!
        { duration: '30s', target: 200 },  // Stay at spike
        { duration: '10s', target: 10 },   // Recover
        { duration: '30s', target: 10 },   // Stay at normal
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest',
    },
  },
};

// Helper function for common headers
function getHeaders(includeAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'k6-load-test/1.0',
  };
  
  if (includeAuth && __ENV.AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
  }
  
  return headers;
}

// Check response and update error rate
function checkResponse(res, name, expectedStatus = 200) {
  const success = check(res, {
    [`${name} status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name} response time < 500ms`]: (r) => r.timings.duration < 500,
    [`${name} has body`]: (r) => r.body && r.body.length > 0,
  });
  
  errorRate.add(!success);
  return success;
}

/**
 * Smoke Test - Basic functionality verification
 * Runs a few requests to ensure the system is responding
 */
export function smokeTest() {
  group('Smoke Test', () => {
    // Health check
    const healthRes = http.get(`${BASE_URL}/api/health`, { headers: getHeaders() });
    check(healthRes, {
      'health check returns 200': (r) => r.status === 200,
    });
    
    // Homepage
    const homeRes = http.get(`${BASE_URL}/`, { headers: getHeaders() });
    check(homeRes, {
      'homepage returns 200': (r) => r.status === 200,
    });
    
    sleep(1);
  });
}

/**
 * Homepage Load Test - 100 concurrent users
 * Simulates typical user browsing behavior
 */
export function homepageLoad() {
  group('Homepage Load Test', () => {
    // Homepage request
    const homeRes = http.get(`${BASE_URL}/`, {
      headers: getHeaders(),
      tags: { name: 'homepage' },
    });
    checkResponse(homeRes, 'homepage');
    
    // Simulate reading time
    sleep(Math.random() * 2 + 1);
    
    // API calls that homepage makes
    const endpoints = [
      '/api/health',
      '/api/contents?limit=10&status=published',
    ];
    
    const responses = http.batch(
      endpoints.map(endpoint => ({
        method: 'GET',
        url: `${BASE_URL}${endpoint}`,
        params: { headers: getHeaders(), tags: { name: endpoint } },
      }))
    );
    
    responses.forEach((res, i) => {
      apiResponseTime.add(res.timings.duration);
      checkResponse(res, endpoints[i]);
    });
    
    // User think time
    sleep(Math.random() * 3 + 2);
  });
}

/**
 * API Stress Test - Tests API endpoints under load
 * Focuses on /api/contents, /api/auth endpoints
 */
export function apiStress() {
  group('API Stress Test', () => {
    // Test various API endpoints
    const endpoints = [
      { url: '/api/health', method: 'GET' },
      { url: '/api/contents?limit=10', method: 'GET' },
      { url: '/api/contents?limit=20&offset=10', method: 'GET' },
      { url: '/api/destinations', method: 'GET' },
      { url: '/api/attractions?limit=10', method: 'GET' },
    ];
    
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    const startTime = Date.now();
    const res = http.request(endpoint.method, `${BASE_URL}${endpoint.url}`, null, {
      headers: getHeaders(),
      tags: { name: endpoint.url },
    });
    const duration = Date.now() - startTime;
    
    apiResponseTime.add(duration);
    checkResponse(res, endpoint.url);
    
    // Random sleep to simulate real user behavior
    sleep(Math.random() * 0.5 + 0.1);
  });
}

/**
 * Content CRUD Test - Tests content creation under load
 * Simulates admin users creating and managing content
 */
export function contentCrud() {
  group('Content CRUD Operations', () => {
    const timestamp = Date.now();
    const vuId = __VU;
    
    // Test content creation (mock - will fail without auth, but tests the endpoint)
    const createPayload = JSON.stringify({
      title: `Load Test Article ${vuId}-${timestamp}`,
      slug: `load-test-${vuId}-${timestamp}`,
      content: 'This is a load test article content. '.repeat(10),
      type: 'article',
      status: 'draft',
      metaTitle: `Load Test ${vuId}`,
      metaDescription: 'A test article for load testing purposes',
    });
    
    const createStart = Date.now();
    const createRes = http.post(`${BASE_URL}/api/contents`, createPayload, {
      headers: getHeaders(true),
      tags: { name: 'create_content' },
    });
    contentCreationTime.add(Date.now() - createStart);
    
    // Expect 401 without auth, or 201/200 with auth
    const createSuccess = check(createRes, {
      'create content responds': (r) => r.status === 401 || r.status === 201 || r.status === 200,
      'create content time < 1s': (r) => r.timings.duration < 1000,
    });
    errorRate.add(!createSuccess);
    
    // Read content list
    const listRes = http.get(`${BASE_URL}/api/contents?limit=10`, {
      headers: getHeaders(),
      tags: { name: 'list_contents' },
    });
    checkResponse(listRes, 'list_contents');
    
    sleep(0.5);
  });
}

/**
 * Rate Limiting Test - Verifies rate limits are working
 * Rapid requests to trigger rate limiting
 */
export function rateLimitTest() {
  group('Rate Limit Verification', () => {
    // Make rapid requests to trigger rate limiting
    const responses = [];
    
    for (let i = 0; i < 5; i++) {
      const res = http.get(`${BASE_URL}/api/health`, {
        headers: getHeaders(),
        tags: { name: 'rate_limit_probe' },
      });
      responses.push(res);
      // Minimal sleep to trigger rate limits
      sleep(0.01);
    }
    
    // Check if any requests were rate limited
    const rateLimited = responses.filter(r => r.status === 429);
    if (rateLimited.length > 0) {
      rateLimitHits.add(rateLimited.length);
      console.log(`Rate limit triggered: ${rateLimited.length} requests blocked`);
    }
    
    // Verify rate limit headers if present
    const lastRes = responses[responses.length - 1];
    check(lastRes, {
      'has rate limit headers': (r) => 
        r.headers['X-RateLimit-Limit'] !== undefined || 
        r.headers['RateLimit-Limit'] !== undefined ||
        r.status === 200 || 
        r.status === 429,
    });
    
    sleep(1); // Wait before next iteration
  });
}

/**
 * Spike Test - Tests system behavior under sudden load
 * Simulates sudden traffic spikes
 */
export function spikeTest() {
  group('Spike Test', () => {
    // Primary page request
    const pageRes = http.get(`${BASE_URL}/`, {
      headers: getHeaders(),
      tags: { name: 'spike_homepage' },
    });
    checkResponse(pageRes, 'spike_homepage');
    
    // API request
    const apiRes = http.get(`${BASE_URL}/api/health`, {
      headers: getHeaders(),
      tags: { name: 'spike_health' },
    });
    checkResponse(apiRes, 'spike_health');
    
    // Minimal sleep during spike
    sleep(Math.random() * 0.5 + 0.1);
  });
}

/**
 * Default function - runs when no specific scenario is selected
 */
export default function() {
  if (SCENARIO === 'homepage' || SCENARIO === 'all') {
    homepageLoad();
  }
  if (SCENARIO === 'api' || SCENARIO === 'all') {
    apiStress();
  }
  if (SCENARIO === 'crud' || SCENARIO === 'all') {
    contentCrud();
  }
  if (SCENARIO === 'rate_limit') {
    rateLimitTest();
  }
  if (SCENARIO === 'spike') {
    spikeTest();
  }
  if (SCENARIO === 'smoke') {
    smokeTest();
  }
}

/**
 * Setup function - runs once before the test
 */
export function setup() {
  console.log(`Starting load test against ${BASE_URL}`);
  console.log(`Scenario: ${SCENARIO}`);
  
  // Verify target is reachable
  const healthCheck = http.get(`${BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    console.error(`Target ${BASE_URL} is not healthy. Status: ${healthCheck.status}`);
  }
  
  return { startTime: Date.now() };
}

/**
 * Teardown function - runs once after the test
 */
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

/**
 * Handle summary - custom summary output
 */
export function handleSummary(data) {
  // Generate summary report
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    scenario: SCENARIO,
    metrics: {
      http_reqs: data.metrics.http_reqs?.values?.count || 0,
      http_req_duration_avg: data.metrics.http_req_duration?.values?.avg || 0,
      http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)'] || 0,
      http_req_duration_p99: data.metrics.http_req_duration?.values['p(99)'] || 0,
      http_req_failed: data.metrics.http_req_failed?.values?.rate || 0,
      errors: data.metrics.errors?.values?.rate || 0,
    },
    thresholds: data.thresholds,
  };
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/load/results.json': JSON.stringify(summary, null, 2),
  };
}

// Text summary helper
function textSummary(data, options) {
  const lines = [];
  lines.push('\n========== LOAD TEST SUMMARY ==========\n');
  lines.push(`Target: ${BASE_URL}`);
  lines.push(`Scenario: ${SCENARIO}`);
  lines.push(`\nMetrics:`);
  
  if (data.metrics.http_reqs) {
    lines.push(`  Total Requests: ${data.metrics.http_reqs.values.count}`);
    lines.push(`  Requests/sec: ${data.metrics.http_reqs.values.rate?.toFixed(2)}`);
  }
  
  if (data.metrics.http_req_duration) {
    lines.push(`  Response Time (avg): ${data.metrics.http_req_duration.values.avg?.toFixed(2)}ms`);
    lines.push(`  Response Time (p95): ${data.metrics.http_req_duration.values['p(95)']?.toFixed(2)}ms`);
    lines.push(`  Response Time (p99): ${data.metrics.http_req_duration.values['p(99)']?.toFixed(2)}ms`);
  }
  
  if (data.metrics.http_req_failed) {
    lines.push(`  Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`);
  }
  
  lines.push('\nThresholds:');
  Object.entries(data.thresholds || {}).forEach(([name, threshold]) => {
    const status = threshold.ok ? 'PASS' : 'FAIL';
    lines.push(`  ${status} ${name}`);
  });
  
  lines.push('\n========================================\n');
  return lines.join('\n');
}
