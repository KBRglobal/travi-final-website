# TRAVI CMS - Load Testing Documentation

## Overview

This document outlines the load testing strategy, performance baselines, bottleneck analysis approach, and scaling recommendations for TRAVI CMS.

## Table of Contents
1. [Performance Baselines](#performance-baselines)
2. [Test Scenarios](#test-scenarios)
3. [Bottleneck Analysis](#bottleneck-analysis)
4. [Scaling Recommendations](#scaling-recommendations)
5. [Results Template](#results-template)
6. [CI/CD Integration](#cicd-integration)

---

## Performance Baselines

### Response Time Requirements

| Endpoint Category | Target p50 | Target p95 | Target p99 | Max |
|-------------------|------------|------------|------------|-----|
| Health Check | < 10ms | < 50ms | < 100ms | 200ms |
| Static Pages | < 50ms | < 200ms | < 500ms | 1s |
| API Read (list) | < 100ms | < 300ms | < 500ms | 1s |
| API Read (single) | < 50ms | < 150ms | < 300ms | 500ms |
| API Write (create) | < 200ms | < 500ms | < 1000ms | 2s |
| API Write (update) | < 150ms | < 400ms | < 800ms | 1.5s |
| Search | < 200ms | < 500ms | < 1000ms | 2s |
| AI Generation | < 5s | < 15s | < 30s | 60s |

### Throughput Requirements

| Scenario | Min Throughput | Target | Peak |
|----------|----------------|--------|------|
| Homepage | 200 req/s | 500 req/s | 1000 req/s |
| API List endpoints | 100 req/s | 200 req/s | 500 req/s |
| API Single endpoints | 200 req/s | 400 req/s | 800 req/s |
| Content Creation | 20 req/s | 50 req/s | 100 req/s |
| Authentication | 50 req/s | 100 req/s | 200 req/s |

### Error Rate Thresholds

| Scenario | Warning | Critical |
|----------|---------|----------|
| All endpoints | > 0.5% | > 1% |
| Critical endpoints | > 0.1% | > 0.5% |
| Authentication | > 0.1% | > 0.5% |

### Concurrency Targets

| Tier | Concurrent Users | Requests/min |
|------|------------------|--------------|
| Normal | 50-100 | 3,000-6,000 |
| Peak | 200-300 | 12,000-18,000 |
| Stress | 500+ | 30,000+ |

---

## Test Scenarios

### Scenario 1: Homepage Load Test

**Purpose**: Validate homepage performance under normal and peak load

**Configuration**:
```javascript
{
  vus: 100,
  duration: '5m',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01']
  }
}
```

**User Journey**:
1. Load homepage (GET /)
2. Wait 1-3s (simulated reading)
3. Load homepage API data
4. Wait 2-5s (simulated interaction)
5. Repeat

### Scenario 2: API Stress Test

**Purpose**: Test API endpoint capacity

**Endpoints Tested**:
- `GET /api/health` - Health check
- `GET /api/contents?limit=10` - Content list
- `GET /api/destinations` - Destinations list
- `GET /api/attractions` - Attractions list

**Configuration**:
```javascript
{
  vus: 100,
  duration: '6m',
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 }
  ]
}
```

### Scenario 3: Content CRUD Operations

**Purpose**: Test content management under load

**Operations**:
1. Create content (POST /api/contents)
2. List contents (GET /api/contents)
3. Read single content (GET /api/contents/:id)
4. Update content (PATCH /api/contents/:id)
5. Delete content (DELETE /api/contents/:id)

**Configuration**:
```javascript
{
  vus: 20,
  duration: '3m',
  thresholds: {
    content_creation_time: ['p(95)<1000']
  }
}
```

### Scenario 4: Rate Limiting Verification

**Purpose**: Ensure rate limits protect the system

**Test Method**:
1. Rapid-fire requests to single endpoint
2. Verify 429 responses are returned
3. Check rate limit headers

**Expected Behavior**:
- Rate limit of 100 requests/minute per IP
- Clear rate limit headers in response
- Graceful degradation, not crashes

### Scenario 5: Spike Test

**Purpose**: Test system resilience under sudden load spikes

**Configuration**:
```javascript
{
  stages: [
    { duration: '10s', target: 10 },   // Normal
    { duration: '10s', target: 200 },  // Spike
    { duration: '30s', target: 200 },  // Sustain
    { duration: '10s', target: 10 },   // Recover
    { duration: '30s', target: 10 }    // Normal
  ]
}
```

---

## Bottleneck Analysis

### Methodology

1. **Identify Metrics**: Monitor during load tests
   - CPU utilization
   - Memory usage
   - Database connections
   - Query execution time
   - Response times by endpoint

2. **Common Bottlenecks**:

| Symptom | Likely Cause | Investigation |
|---------|--------------|---------------|
| High p99, normal p50 | Database slow queries | Enable query logging, check indexes |
| Increasing response times | Memory pressure | Monitor heap, check for leaks |
| Connection errors | Pool exhaustion | Check pool size, connection limits |
| CPU spikes | Unoptimized code | Profile hot paths |
| Timeout errors | External dependencies | Check AI provider latency |

### Database Performance

**Query Monitoring**:
```sql
-- Find slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

**N+1 Query Detection**:
- Use the built-in `query-analyzer.ts` monitoring
- Look for repeated similar queries
- Check `/api/metrics` for query patterns

### Memory Analysis

**Key Metrics**:
- Heap used vs heap total
- External memory (buffers)
- RSS (resident set size)

**Tools**:
```bash
# Node.js memory snapshot
node --inspect server/index.ts
# In Chrome DevTools: Memory > Heap Snapshot
```

### Connection Pool Analysis

**PostgreSQL Connections**:
```sql
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
```

**Optimal Pool Size**:
```
pool_size = (num_cores * 2) + effective_spindle_count
```
For typical setup: 10-20 connections

---

## Scaling Recommendations

### Horizontal Scaling

#### When to Scale Out
- CPU consistently > 70%
- Response times exceed thresholds
- Connection pool exhausted

#### How to Scale
1. **Application Servers**: Add more instances behind load balancer
2. **Database**: Read replicas for read-heavy workloads
3. **Caching**: Add Redis for session/data caching

### Vertical Scaling

#### Resource Recommendations

| Load Level | CPU | Memory | DB Connections |
|------------|-----|--------|----------------|
| Low (< 50 VU) | 1 core | 1 GB | 10 |
| Medium (50-200 VU) | 2 cores | 2 GB | 20 |
| High (200-500 VU) | 4 cores | 4 GB | 50 |
| Enterprise (500+ VU) | 8+ cores | 8+ GB | 100+ |

### Caching Strategy

**Cache Layers**:
1. **Browser Cache**: Static assets (1 hour - 1 year)
2. **CDN Cache**: Static pages, images (1 hour)
3. **Application Cache**: API responses (5-60 seconds)
4. **Database Cache**: Query results (configurable)

**Cache Headers**:
```
Cache-Control: public, max-age=3600
ETag: "abc123"
Last-Modified: Mon, 01 Jan 2024 00:00:00 GMT
```

### Database Optimization

1. **Indexes**: Create for frequently queried columns
2. **Connection Pooling**: Use PgBouncer for high concurrency
3. **Query Optimization**: Use EXPLAIN ANALYZE
4. **Partitioning**: For tables > 10M rows

---

## Results Template

### Load Test Report

```markdown
# Load Test Report - [DATE]

## Test Configuration
- **Environment**: [staging/production]
- **Duration**: [X minutes]
- **Virtual Users**: [X VUs]
- **Target URL**: [URL]

## Summary
| Metric | Result | Threshold | Status |
|--------|--------|-----------|--------|
| Total Requests | X | - | - |
| Requests/sec | X | > 100 | PASS/FAIL |
| Avg Response Time | Xms | < 200ms | PASS/FAIL |
| P95 Response Time | Xms | < 500ms | PASS/FAIL |
| P99 Response Time | Xms | < 1000ms | PASS/FAIL |
| Error Rate | X% | < 1% | PASS/FAIL |

## Endpoint Performance
| Endpoint | Requests | Avg | P95 | Errors |
|----------|----------|-----|-----|--------|
| GET / | X | Xms | Xms | X% |
| GET /api/health | X | Xms | Xms | X% |
| GET /api/contents | X | Xms | Xms | X% |

## Observations
- [Key finding 1]
- [Key finding 2]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]

## Comparison to Baseline
| Metric | Previous | Current | Change |
|--------|----------|---------|--------|
| P95 Response | Xms | Xms | +X% |
```

### JSON Results Schema

```json
{
  "timestamp": "2024-12-29T12:00:00Z",
  "environment": "staging",
  "configuration": {
    "vus": 100,
    "duration": "5m",
    "scenario": "homepage_load"
  },
  "summary": {
    "total_requests": 50000,
    "requests_per_second": 166.67,
    "total_errors": 50,
    "error_rate": 0.001
  },
  "response_times": {
    "min": 12,
    "avg": 145,
    "med": 98,
    "p90": 287,
    "p95": 387,
    "p99": 892,
    "max": 2540
  },
  "thresholds": {
    "http_req_duration{p(95)<500}": { "ok": true },
    "http_req_failed{rate<0.01}": { "ok": true },
    "errors{rate<0.01}": { "ok": true }
  },
  "endpoints": [
    {
      "name": "GET /",
      "requests": 25000,
      "avg_ms": 120,
      "p95_ms": 350,
      "errors": 10
    }
  ]
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:
    inputs:
      scenario:
        description: 'Test scenario'
        default: 'all'
        type: choice
        options:
          - all
          - smoke
          - homepage
          - api_stress
      vus:
        description: 'Virtual users'
        default: '50'

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install k6
        run: |
          curl -L https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz
          sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
      
      - name: Run Load Tests
        run: |
          k6 run \
            --env BASE_URL=${{ secrets.STAGING_URL }} \
            --env SCENARIO=${{ inputs.scenario || 'smoke' }} \
            tests/load/scenarios.js
        continue-on-error: true
      
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: tests/load/results.json

      - name: Post Results to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const results = JSON.parse(fs.readFileSync('tests/load/results.json'));
            const body = `## Load Test Results
            - Requests/sec: ${results.metrics.http_reqs}
            - P95 Response: ${results.metrics.http_req_duration_p95}ms
            - Error Rate: ${(results.metrics.http_req_failed * 100).toFixed(2)}%
            `;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### Pre-deployment Gate

```yaml
- name: Load Test Gate
  run: |
    k6 run --env SCENARIO=smoke tests/load/scenarios.js
    if [ $? -ne 0 ]; then
      echo "Load tests failed - blocking deployment"
      exit 1
    fi
```

---

## Monitoring During Tests

### Key Metrics to Watch

1. **Application**:
   - Response times (avg, p95, p99)
   - Error rates
   - Request throughput

2. **Infrastructure**:
   - CPU utilization
   - Memory usage
   - Network I/O

3. **Database**:
   - Query latency
   - Connection count
   - Lock waits

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 0.5% | > 1% |
| P95 Latency | > 400ms | > 500ms |
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 75% | > 90% |
| DB Connections | > 80% pool | > 95% pool |

---

## Related Documentation

- [tests/load/README.md](../tests/load/README.md) - Test execution guide
- [SLA-DEFINITIONS.md](./SLA-DEFINITIONS.md) - Service level agreements
- [RUNBOOK.md](./RUNBOOK.md) - Operational procedures
- [INCIDENT-PLAYBOOK.md](./INCIDENT-PLAYBOOK.md) - Incident response
