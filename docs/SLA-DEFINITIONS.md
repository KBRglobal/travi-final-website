# Service Level Agreements (SLA) | הסכמי רמת שירות

> Defining service level objectives, monitoring approach, and incident response thresholds for TRAVI CMS

---

## Table of Contents | תוכן עניינים

- [Service Level Objectives | יעדי רמת שירות](#service-level-objectives--יעדי-רמת-שירות)
- [Monitoring Approach | גישת ניטור](#monitoring-approach--גישת-ניטור)
- [Incident Response | תגובה לאירועים](#incident-response--תגובה-לאירועים)
- [Escalation Procedures | נהלי הסלמה](#escalation-procedures--נהלי-הסלמה)
- [SLA Compliance Tracking | מעקב עמידה ב-SLA](#sla-compliance-tracking--מעקב-עמידה-ב-sla)

---

## Service Level Objectives | יעדי רמת שירות

### API Response Time | זמן תגובת API

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| p50 | < 200ms | - |
| p95 | < 500ms | > 1s |
| p99 | < 2s | > 5s |

**Measurement**: Measured from request received to response sent, excluding network latency.

**Exclusions**:
- AI content generation endpoints (separate SLO)
- File upload endpoints (size-dependent)
- Bulk export operations

---

### Uptime Target | יעד זמינות

| Metric | Target | Calculation Period |
|--------|--------|-------------------|
| Availability | 99.5% | Monthly |
| Allowed Downtime | 3.65 hours/month | Rolling 30 days |

**Uptime Calculation**:
```
Uptime % = (Total Minutes - Downtime Minutes) / Total Minutes × 100
```

**Excluded from Downtime**:
- Scheduled maintenance (with 24h notice)
- Third-party provider outages
- Force majeure events

---

### Error Rate | שיעור שגיאות

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| 5xx Errors | < 1% | > 3% |
| 4xx Errors | < 5% | > 10% |
| Overall Success Rate | > 99% | < 97% |

**Error Rate Calculation**:
```
Error Rate = (Failed Requests / Total Requests) × 100
```

**Excluded from Error Rate**:
- Client validation errors (400)
- Authentication failures (401)
- Rate limit responses (429)

---

### AI Content Generation | יצירת תוכן בינה מלאכותית

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Generation Time | < 60s | > 120s |
| Success Rate | > 95% | < 90% |
| Quality Score | > 80% | < 70% |

**Generation Time Breakdown**:
| Phase | Expected Duration |
|-------|-------------------|
| Prompt construction | < 1s |
| AI API call | 30-45s |
| Response parsing | < 1s |
| Content validation | < 2s |
| Storage | < 1s |

**Quality Metrics**:
- SEO compliance score
- Word count within range
- No banned phrases detected
- Required sections present

---

### Translation Service | שירות תרגום

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Translation Time | < 10s | > 30s |
| Success Rate | > 98% | < 95% |
| Quality Score | > 90% | < 80% |

---

### Email Delivery | משלוח דוא"ל

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Delivery Rate | > 98% | < 95% |
| API Response Time | < 2s | > 5s |
| Bounce Rate | < 2% | > 5% |

---

### Database Performance | ביצועי מסד נתונים

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Query p95 | < 100ms | > 500ms |
| Query p99 | < 500ms | > 2s |
| Connection Pool Utilization | < 80% | > 90% |

---

## Monitoring Approach | גישת ניטור

### Health Check Endpoints

| Endpoint | Check Interval | Timeout |
|----------|----------------|---------|
| `/api/health` | 30s | 5s |
| `/api/health/db` | 60s | 10s |
| `/api/health/ai` | 300s | 30s |

### Key Performance Indicators

**Real-time Monitoring**:
- Request rate (requests/minute)
- Error rate (%)
- Response time distribution
- Active connections

**Daily Metrics**:
- Total requests processed
- Unique users
- AI generations completed
- Translation volume
- Email delivery stats

---

### Alerting Thresholds | סף התראות

#### P1 - Critical (Immediate Response)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Service Down | No response for 2 min | Page on-call |
| Error Rate | > 10% for 5 min | Page on-call |
| Response Time p99 | > 10s for 5 min | Page on-call |
| Database Connection Failed | Any | Page on-call |

#### P2 - High (Response within 30 minutes)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error Rate | > 5% for 15 min | Alert team |
| Response Time p95 | > 2s for 15 min | Alert team |
| AI Provider Degraded | > 50% failures | Alert team |
| Disk Usage | > 85% | Alert team |

#### P3 - Medium (Response within 4 hours)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error Rate | > 2% for 1 hour | Ticket created |
| Response Time p95 | > 1s for 1 hour | Ticket created |
| Memory Usage | > 80% | Ticket created |
| API Rate Limiting Triggered | > 100 events/hour | Ticket created |

#### P4 - Low (Response within 24 hours)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Warning-level errors | Sustained for 24h | Review in next sprint |
| Performance degradation | < 10% impact | Schedule optimization |

---

## Incident Response | תגובה לאירועים

### Severity Levels | רמות חומרה

| Level | Description | Response Time | Resolution Time |
|-------|-------------|---------------|-----------------|
| SEV1 | Complete outage | 15 min | 4 hours |
| SEV2 | Major feature broken | 30 min | 8 hours |
| SEV3 | Minor feature degraded | 4 hours | 24 hours |
| SEV4 | Non-critical issue | 24 hours | 72 hours |

### Response Procedures

#### SEV1 - Complete Outage

1. **Acknowledge** (within 15 min)
   - Confirm incident detection
   - Begin investigation

2. **Communicate** (within 30 min)
   - Update status page
   - Notify stakeholders

3. **Mitigate** (ongoing)
   - Implement temporary fixes
   - Roll back if necessary

4. **Resolve** (target: 4 hours)
   - Deploy permanent fix
   - Verify system stability

5. **Post-mortem** (within 48 hours)
   - Root cause analysis
   - Action items documented

#### SEV2 - Major Feature Broken

1. **Acknowledge** (within 30 min)
2. **Communicate** (within 1 hour)
3. **Mitigate** (target: 2 hours)
4. **Resolve** (target: 8 hours)
5. **Post-mortem** (within 1 week)

---

### Third-Party Provider Incidents

| Provider | Impact | Fallback |
|----------|--------|----------|
| Anthropic Down | AI generation degraded | OpenRouter → DeepSeek → OpenAI |
| OpenAI Down | Backup AI unavailable | Earlier providers in chain |
| Resend Down | Email delivery stopped | Queue for retry |
| DeepL Down | Translation unavailable | Claude AI fallback |
| Object Storage Down | Media upload/access failed | Local filesystem (dev only) |

---

## Escalation Procedures | נהלי הסלמה

### On-Call Rotation

| Time | Coverage |
|------|----------|
| Business Hours (9am-6pm) | Primary team |
| After Hours | On-call engineer |
| Weekends/Holidays | On-call engineer |

### Escalation Path

```
Level 1: On-call Engineer
    │
    ▼ (15 min without progress for SEV1)
Level 2: Engineering Lead
    │
    ▼ (30 min without progress for SEV1)
Level 3: Engineering Manager
    │
    ▼ (External dependency identified)
Level 4: Vendor Support
```

### Communication Channels

| Severity | Primary Channel | Backup Channel |
|----------|-----------------|----------------|
| SEV1 | Phone/SMS | Slack #incidents |
| SEV2 | Slack #incidents | Email |
| SEV3 | Slack #alerts | Ticket system |
| SEV4 | Ticket system | - |

---

## SLA Compliance Tracking | מעקב עמידה ב-SLA

### Monthly SLA Report

| Metric | Target | This Month | Status |
|--------|--------|------------|--------|
| Uptime | 99.5% | - | - |
| p95 Response Time | < 500ms | - | - |
| Error Rate | < 1% | - | - |
| AI Generation Success | > 95% | - | - |

### Quarterly Review

- Review SLA compliance trends
- Identify improvement opportunities
- Adjust thresholds if needed
- Update documentation

---

## Definitions | הגדרות

| Term | Definition |
|------|------------|
| **Uptime** | Percentage of time the service is available and responsive |
| **p50** | Median response time (50th percentile) |
| **p95** | Response time at 95th percentile |
| **p99** | Response time at 99th percentile |
| **SLO** | Service Level Objective - internal target |
| **SLA** | Service Level Agreement - contractual commitment |
| **SLI** | Service Level Indicator - actual measured value |
| **MTTR** | Mean Time To Recovery |
| **MTTD** | Mean Time To Detection |

---

## Related Documentation | תיעוד קשור

- [Third-Party Integrations](./THIRD-PARTY-INTEGRATIONS.md)
- [Incident Playbook](./INCIDENT-PLAYBOOK.md)
- [Runbook](./RUNBOOK.md)
- [Monitoring Setup](./operations/monitoring.md)
