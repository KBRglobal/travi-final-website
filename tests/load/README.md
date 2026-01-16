# TRAVI CMS Load Testing

## Overview

This directory contains load testing scenarios for TRAVI CMS using [k6](https://k6.io/), a modern load testing tool built for developer happiness and CI/CD integration.

## Load Testing Strategy

### Test Types

| Test Type | Purpose | VUs | Duration |
|-----------|---------|-----|----------|
| Smoke | Verify basic functionality | 1-5 | 1 min |
| Load | Normal traffic simulation | 50-100 | 5-10 min |
| Stress | Find breaking point | 100-500 | 10-15 min |
| Spike | Sudden traffic surge | 1→500→1 | 5 min |
| Soak | Stability over time | 50 | 30-60 min |

### Test Scenarios

1. **Homepage Load Test** - Simulates 100 concurrent users browsing the homepage
2. **API Endpoints Stress Test** - Tests `/api/contents`, `/api/health` under load
3. **Content CRUD Operations** - Tests content creation, update, and deletion
4. **Rate Limiting Verification** - Ensures rate limits are enforced correctly
5. **Authentication Flow** - Tests login and session management

## Performance Baselines & Thresholds

### Response Time Thresholds
- **p95 < 500ms** - 95th percentile response time must be under 500ms
- **p99 < 1000ms** - 99th percentile response time must be under 1 second
- **avg < 200ms** - Average response time should be under 200ms

### Error Rate Thresholds
- **Error rate < 1%** - Less than 1% of requests should fail
- **Timeout rate < 0.1%** - Less than 0.1% should timeout

### Throughput Targets
- **Homepage**: 500+ req/s
- **API endpoints**: 200+ req/s
- **Content CRUD**: 50+ req/s

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```bash
choco install k6
```

**Docker:**
```bash
docker pull grafana/k6
```

## Running Tests

### Quick Start
```bash
# Run all load tests
npm run test:load

# Run with custom VUs and duration
k6 run --vus 50 --duration 5m tests/load/scenarios.js

# Run specific scenario
k6 run --env SCENARIO=homepage tests/load/scenarios.js
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:5000` | Target server URL |
| `SCENARIO` | `all` | Specific scenario to run |
| `VUS` | `100` | Number of virtual users |
| `DURATION` | `5m` | Test duration |

### Running in CI/CD

```yaml
# GitHub Actions example
- name: Run Load Tests
  run: |
    curl -L https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz | tar xz
    ./k6-v0.47.0-linux-amd64/k6 run tests/load/scenarios.js
```

### Running with Docker
```bash
docker run -i grafana/k6 run - < tests/load/scenarios.js
```

## Test Scenarios Detail

### 1. Homepage Load Test (`homepage`)
- **Purpose**: Validate homepage performance under load
- **VUs**: 100 concurrent users
- **Actions**: GET requests to `/` and static assets
- **Thresholds**: p95 < 500ms, errors < 1%

### 2. API Stress Test (`api_stress`)
- **Purpose**: Test API endpoint performance
- **Endpoints**: `/api/contents`, `/api/health`, `/api/destinations`
- **VUs**: 100 concurrent users
- **Thresholds**: p95 < 300ms, errors < 0.5%

### 3. Content CRUD (`content_crud`)
- **Purpose**: Test content management operations
- **Operations**: Create, Read, Update, Delete
- **VUs**: 20 concurrent users
- **Thresholds**: p95 < 1000ms, errors < 1%

### 4. Rate Limiting (`rate_limit`)
- **Purpose**: Verify rate limiting is working
- **Method**: Rapid requests to trigger limits
- **Expected**: 429 responses after threshold

### 5. Authentication (`auth_flow`)
- **Purpose**: Test login/logout performance
- **VUs**: 50 concurrent users
- **Thresholds**: p95 < 500ms

## Interpreting Results

### Key Metrics

```
http_req_duration.........: avg=145.23ms min=12.45ms med=98.32ms max=2.54s p(95)=387.21ms p(99)=892.43ms
http_req_failed...........: 0.45% ✓ 23 ✗ 5089
http_reqs.................: 5112  512.34/s
vus.......................: 100   min=100 max=100
vus_max...................: 100   min=100 max=100
```

### Success Criteria
- All thresholds pass (green checkmarks)
- Error rate below threshold
- Response times within acceptable range

### Common Issues
- **High p99**: Investigate slow queries, add caching
- **High error rate**: Check server logs, capacity
- **Timeouts**: Increase connection pool, optimize queries

## Output Formats

### JSON Report
```bash
k6 run --out json=results.json tests/load/scenarios.js
```

### InfluxDB (for Grafana dashboards)
```bash
k6 run --out influxdb=http://localhost:8086/k6 tests/load/scenarios.js
```

### Cloud (k6 Cloud)
```bash
k6 cloud tests/load/scenarios.js
```

## Best Practices

1. **Baseline First**: Run smoke tests before load tests
2. **Gradual Ramp-up**: Start with low VUs, increase gradually
3. **Realistic Data**: Use production-like data volumes
4. **Isolated Environment**: Test in staging, not production
5. **Monitor Backend**: Watch database, CPU, memory during tests
6. **Repeat Tests**: Run multiple times for consistency
7. **Document Results**: Keep historical data for comparison

## Related Documentation

- [LOAD-TESTING.md](../../docs/LOAD-TESTING.md) - Performance baselines and scaling
- [RUNBOOK.md](../../docs/RUNBOOK.md) - Operational procedures
- [SLA-DEFINITIONS.md](../../docs/SLA-DEFINITIONS.md) - Service level agreements
