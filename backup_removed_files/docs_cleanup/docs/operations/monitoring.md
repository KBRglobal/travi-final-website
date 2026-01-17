# 📊 Monitoring

> Application monitoring guide

---

## 📈 Key Metrics

### Application Health

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| Response Time | < 200ms | < 500ms | > 1s |
| Error Rate | < 1% | < 5% | > 5% |
| Uptime | > 99.9% | > 99% | < 99% |

### Infrastructure

| Metric | Normal | Warning | Critical |
|--------|--------|---------|----------|
| CPU Usage | < 70% | < 85% | > 85% |
| Memory | < 70% | < 85% | > 85% |
| Disk | < 80% | < 90% | > 90% |

---

## 🔍 Health Checks

### Endpoint

```bash
GET /api/health

# Response
{
  "status": "ok",
  "timestamp": "2024-12-23T00:00:00Z",
  "version": "1.0.0"
}
```

### Automated Checks

```bash
# Every minute
curl -s https://app.com/api/health | jq '.status'
```

---

## 📊 Dashboards

### Key Dashboards

| Dashboard | Purpose |
|-----------|---------|
| Overview | System health |
| API | Endpoint performance |
| Database | Query metrics |
| Errors | Error tracking |

### Metrics to Track

- Request rate (req/min)
- Response time (p50, p95, p99)
- Error rate by endpoint
- Database query time
- Cache hit rate

---

## 🚨 Alerting

### Alert Levels

| Level | Response Time | Action |
|-------|---------------|--------|
| Info | Next business day | Review |
| Warning | 4 hours | Investigate |
| Critical | 15 minutes | Fix immediately |

### Alert Rules

```yaml
# High error rate
- alert: HighErrorRate
  condition: error_rate > 5%
  for: 5m
  severity: critical

# Slow response
- alert: SlowResponse
  condition: p95_latency > 1s
  for: 10m
  severity: warning

# Down
- alert: ServiceDown
  condition: health_check_failed
  for: 2m
  severity: critical
```

---

## 📱 Notifications

### Channels

| Channel | Alert Level |
|---------|-------------|
| Email | All |
| Slack | Warning+ |
| PagerDuty | Critical |
| SMS | Critical |

---

## 🔧 Tools

### Application Monitoring

- **PostHog** - Analytics (integrated)
- **Sentry** - Error tracking
- **Datadog** - APM

### Infrastructure

- **Replit** - Built-in metrics
- **Uptime Robot** - Uptime monitoring

---

## 📋 Monitoring Checklist

### Daily

- [ ] Check error logs
- [ ] Review response times
- [ ] Verify backups

### Weekly

- [ ] Review trends
- [ ] Check resource usage
- [ ] Update documentation

### Monthly

- [ ] Audit alerts
- [ ] Review SLOs
- [ ] Capacity planning
