# Data → Action Bindings

> **This document defines explicit, executable bindings between data signals and system actions.**
> Every binding is implemented in the Decision Engine.

## Document Version
- Version: 1.0.0
- Last Updated: 2026-01-01
- Status: ACTIVE

---

## 1. Binding Format

Each binding follows this structure:

```typescript
{
  id: string;                    // Unique binding ID
  signal: SignalCondition;       // What triggers this binding
  action: ActionType;            // What action to take
  authority: AuthorityLevel;     // blocking | triggering | escalating
  autopilot: AutopilotMode;      // off | supervised | full
  cooldown: number;              // Seconds before can trigger again
  maxExecutions: number;         // Max times per day
}
```

---

## 2. BLOCKING Bindings

These bindings can HALT operations.

### BND-BLOCK-001: Critical Error Rate
```yaml
id: BND-BLOCK-001
signal:
  metric: health.error_rate
  condition: "> 5%"
  duration: "5 minutes"
action: BLOCK_ALL_DEPLOYMENTS
authority: blocking
autopilot: full
cooldown: 0
maxExecutions: unlimited
escalation: ops-critical
```

### BND-BLOCK-002: Uptime Breach
```yaml
id: BND-BLOCK-002
signal:
  metric: health.uptime
  condition: "< 99%"
  duration: "15 minutes"
action: FREEZE_AUTOMATION
authority: blocking
autopilot: full
cooldown: 0
maxExecutions: unlimited
escalation: ops-critical
```

### BND-BLOCK-003: Cost Overrun
```yaml
id: BND-BLOCK-003
signal:
  metric: cost.ai_api_cost
  condition: "> daily_budget * 1.5"
  duration: "immediate"
action: THROTTLE_AI
authority: blocking
autopilot: full
cooldown: 3600
maxExecutions: 3
escalation: finance-ops
```

### BND-BLOCK-004: Quality Gate Failure
```yaml
id: BND-BLOCK-004
signal:
  metric: content.quality_score
  condition: "< 30"
  context: "pre-publish"
action: BLOCK_PUBLISH
authority: blocking
autopilot: full
cooldown: 0
maxExecutions: unlimited
escalation: content-lead
```

### BND-BLOCK-005: SEO Score Failure
```yaml
id: BND-BLOCK-005
signal:
  metric: seo.seo_score
  condition: "< 25"
  context: "pre-publish"
action: BLOCK_PUBLISH
authority: blocking
autopilot: full
cooldown: 0
maxExecutions: unlimited
escalation: seo-lead
```

### BND-BLOCK-006: AEO Score Failure
```yaml
id: BND-BLOCK-006
signal:
  metric: aeo.aeo_score
  condition: "< 20"
  context: "pre-publish"
action: BLOCK_PUBLISH
authority: blocking
autopilot: full
cooldown: 0
maxExecutions: unlimited
escalation: seo-lead
```

---

## 3. TRIGGER Bindings

These bindings initiate automated actions.

### BND-TRIG-001: High Bounce Rate → Content Review
```yaml
id: BND-TRIG-001
signal:
  metric: engagement.bounce_rate
  condition: "> 80%"
  duration: "7 days"
  minDataPoints: 100
action: TRIGGER_CONTENT_REVIEW
authority: triggering
autopilot: supervised
cooldown: 604800  # 7 days
maxExecutions: 1
task:
  type: growth_opportunity
  category: content
  priority: high
```

### BND-TRIG-002: Low CTR → Meta Optimization
```yaml
id: BND-TRIG-002
signal:
  metric: seo.ctr
  condition: "< 1%"
  additionalCondition: "seo.impressions > 1000"
  duration: "7 days"
action: TRIGGER_META_OPTIMIZATION
authority: triggering
autopilot: full
cooldown: 604800
maxExecutions: 1
task:
  type: seo_task
  category: quick_win
  priority: high
  automatable: true
```

### BND-TRIG-003: Zero Citations → AEO Audit
```yaml
id: BND-TRIG-003
signal:
  metric: aeo.citations
  condition: "= 0"
  duration: "30 days"
  context: "published content"
action: TRIGGER_AEO_AUDIT
authority: triggering
autopilot: supervised
cooldown: 2592000  # 30 days
maxExecutions: 1
task:
  type: aeo_task
  category: strategic
  priority: medium
```

### BND-TRIG-004: Stale Content → Refresh
```yaml
id: BND-TRIG-004
signal:
  metric: content.freshness_score
  condition: "< 30"
  context: "high-traffic content"
action: TRIGGER_CONTENT_REFRESH
authority: triggering
autopilot: supervised
cooldown: 2592000
maxExecutions: 1
task:
  type: content_task
  category: content
  priority: medium
```

### BND-TRIG-005: Low Conversion → CRO Analysis
```yaml
id: BND-TRIG-005
signal:
  metric: conversion.conversion_rate
  condition: "< 0.5%"
  duration: "14 days"
  minDataPoints: 500
action: TRIGGER_CRO_ANALYSIS
authority: triggering
autopilot: supervised
cooldown: 1209600  # 14 days
maxExecutions: 1
task:
  type: growth_opportunity
  category: revenue
  priority: high
```

### BND-TRIG-006: Poor Internal Linking
```yaml
id: BND-TRIG-006
signal:
  metric: growth.internal_link_ctr
  condition: "< 2%"
  duration: "7 days"
action: TRIGGER_INTERLINKING_TASK
authority: triggering
autopilot: full
cooldown: 604800
maxExecutions: 5
task:
  type: seo_task
  category: quick_win
  priority: medium
  automatable: true
```

### BND-TRIG-007: Position Decline → SEO Rewrite
```yaml
id: BND-TRIG-007
signal:
  metric: seo.average_position
  condition: "increased by > 10 positions"
  duration: "14 days"
  context: "previously ranking content"
action: TRIGGER_SEO_REWRITE
authority: triggering
autopilot: supervised
cooldown: 2592000
maxExecutions: 1
task:
  type: seo_task
  category: strategic
  priority: high
```

### BND-TRIG-008: High Traffic Low Revenue
```yaml
id: BND-TRIG-008
signal:
  metric: revenue.revenue_per_session
  condition: "< $0.01"
  additionalCondition: "traffic.total_sessions > 1000"
  duration: "7 days"
action: TRIGGER_MONETIZATION_REVIEW
authority: triggering
autopilot: supervised
cooldown: 604800
maxExecutions: 1
task:
  type: revenue_task
  category: revenue
  priority: high
```

---

## 4. ESCALATION Bindings

These bindings require human decision.

### BND-ESC-001: Revenue Crash
```yaml
id: BND-ESC-001
signal:
  metric: revenue.total_revenue
  condition: "-30% week-over-week"
action: ESCALATE_TO_HUMAN
authority: escalating
autopilot: off
escalation:
  primary: finance-lead
  secondary: exec
  channel: urgent
  sla: "1 hour"
```

### BND-ESC-002: Organic Traffic Crash
```yaml
id: BND-ESC-002
signal:
  metric: traffic.organic_sessions
  condition: "-40% week-over-week"
action: ESCALATE_TO_HUMAN
authority: escalating
autopilot: off
escalation:
  primary: seo-lead
  secondary: exec
  channel: urgent
  sla: "2 hours"
```

### BND-ESC-003: Negative ROI
```yaml
id: BND-ESC-003
signal:
  metric: cost.roi
  condition: "< 0%"
  duration: "14 days"
action: ESCALATE_TO_HUMAN
authority: escalating
autopilot: off
escalation:
  primary: product-lead
  secondary: finance
  channel: high
  sla: "24 hours"
```

### BND-ESC-004: Critical Anomaly
```yaml
id: BND-ESC-004
signal:
  type: anomaly
  severity: critical
action: ESCALATE_TO_HUMAN
authority: escalating
autopilot: supervised
escalation:
  primary: relevant-domain-lead
  secondary: ops
  channel: high
  sla: "4 hours"
```

### BND-ESC-005: Slow API Response
```yaml
id: BND-ESC-005
signal:
  metric: health.api_response_time
  condition: "> 5000ms"
  duration: "10 minutes"
action: ESCALATE_TO_HUMAN
authority: escalating
autopilot: off
escalation:
  primary: ops-lead
  secondary: engineering
  channel: urgent
  sla: "30 minutes"
```

---

## 5. AUTOMATION Bindings

These bindings execute without human intervention (in full autopilot).

### BND-AUTO-001: Cache Optimization
```yaml
id: BND-AUTO-001
signal:
  metric: health.cache_hit_rate
  condition: "< 70%"
  duration: "1 hour"
action: AUTO_OPTIMIZE_CACHE
authority: triggering
autopilot: full
cooldown: 3600
maxExecutions: 5
```

### BND-AUTO-002: Queue Scaling
```yaml
id: BND-AUTO-002
signal:
  metric: health.job_queue_length
  condition: "> 200"
  duration: "5 minutes"
action: AUTO_SCALE_WORKERS
authority: triggering
autopilot: full
cooldown: 300
maxExecutions: 10
```

### BND-AUTO-003: Crawler Priority Boost
```yaml
id: BND-AUTO-003
signal:
  metric: aeo.crawler_visits
  condition: "> 100 in 24h"
  context: "specific content"
action: INCREASE_CRAWL_PRIORITY
authority: triggering
autopilot: full
cooldown: 86400
maxExecutions: 50
```

### BND-AUTO-004: Feature Throttle
```yaml
id: BND-AUTO-004
signal:
  metric: health.error_rate
  condition: "> 2%"
  context: "specific feature"
  duration: "5 minutes"
action: DISABLE_FEATURE
authority: triggering
autopilot: full
cooldown: 300
maxExecutions: 5
```

---

## 6. FUNNEL Bindings

Specific bindings for funnel bottlenecks.

### BND-FUN-001: Search Funnel Bottleneck
```yaml
id: BND-FUN-001
signal:
  funnel: search-journey
  stage: click
  dropoff: "> 95%"
action: TRIGGER_CTR_OPTIMIZATION
authority: triggering
autopilot: supervised
cooldown: 604800
task:
  type: seo_task
  priority: high
```

### BND-FUN-002: Content Funnel Bottleneck
```yaml
id: BND-FUN-002
signal:
  funnel: content-discovery
  stage: engage
  dropoff: "> 70%"
action: TRIGGER_ENGAGEMENT_OPTIMIZATION
authority: triggering
autopilot: supervised
cooldown: 604800
task:
  type: content_task
  priority: medium
```

### BND-FUN-003: Conversion Funnel Bottleneck
```yaml
id: BND-FUN-003
signal:
  funnel: affiliate-conversion
  stage: affiliate-click
  dropoff: "> 95%"
action: TRIGGER_CTA_OPTIMIZATION
authority: triggering
autopilot: supervised
cooldown: 604800
task:
  type: revenue_task
  priority: high
```

---

## 7. ANOMALY Bindings

Responses to detected anomalies.

### BND-ANO-001: Spike Response
```yaml
id: BND-ANO-001
signal:
  type: anomaly
  anomalyType: spike
  severity: warning
action: LOG_AND_MONITOR
authority: advisory
autopilot: full
```

### BND-ANO-002: Drop Response
```yaml
id: BND-ANO-002
signal:
  type: anomaly
  anomalyType: drop
  severity: warning
action: TRIGGER_INVESTIGATION
authority: triggering
autopilot: supervised
```

### BND-ANO-003: Trend Break Response
```yaml
id: BND-ANO-003
signal:
  type: anomaly
  anomalyType: trend_break
  severity: any
action: ESCALATE_TO_HUMAN
authority: escalating
autopilot: off
```

### BND-ANO-004: Threshold Breach
```yaml
id: BND-ANO-004
signal:
  type: anomaly
  anomalyType: threshold
  severity: critical
action: EXECUTE_IMMEDIATE_ACTION
authority: blocking
autopilot: full
```

---

## 8. Binding Execution Rules

1. **Order of Evaluation**: Bindings evaluated in order of authority level (blocking → escalating → triggering → advisory)

2. **Conflict Resolution**: If multiple bindings trigger for same entity, highest authority wins

3. **Cooldown Enforcement**: Binding cannot re-trigger until cooldown expires

4. **Max Executions**: Daily limit on how many times binding can execute

5. **Confidence Requirement**: Binding only executes if signal confidence > 70%

6. **Data Freshness**: Binding only executes if data < maximum staleness

---

## 9. Binding Audit Requirements

Every binding execution logs:

```json
{
  "bindingId": "BND-TRIG-001",
  "triggeredAt": "2026-01-01T12:00:00Z",
  "signal": {
    "metricId": "engagement.bounce_rate",
    "value": 85.2,
    "threshold": 80,
    "confidence": 92
  },
  "action": "TRIGGER_CONTENT_REVIEW",
  "result": "task_created",
  "taskId": "task-123",
  "autopilotMode": "supervised",
  "executionTimeMs": 45
}
```

---

**Document Status: ACTIVE AND BINDING**
