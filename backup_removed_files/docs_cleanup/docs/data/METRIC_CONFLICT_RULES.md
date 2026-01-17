# Metric Conflict Resolution Rules

> **This document defines how to handle contradictory metric signals.**
> When metrics disagree, these rules determine the outcome.

## Document Version
- Version: 1.0.0
- Last Updated: 2026-01-01
- Status: ACTIVE

---

## 1. Conflict Types

### Type A: Inverse Correlation Conflict
One metric improves while a related metric declines.

**Examples:**
- SEO score ↑ but Revenue ↓
- Engagement ↑ but Conversion ↓
- Traffic ↑ but Quality ↓

### Type B: Velocity Mismatch Conflict
Metrics change at incompatible rates.

**Examples:**
- Traffic ↑↑↑ but Infrastructure ↔
- Content production ↑↑ but Quality review ↔
- Cost ↑↑ but Revenue ↑

### Type C: Goal Conflict
Metrics optimize for mutually exclusive goals.

**Examples:**
- AEO optimization vs. Monetization placement
- Content depth vs. Page speed
- SEO keyword density vs. User experience

### Type D: Temporal Conflict
Short-term and long-term metrics disagree.

**Examples:**
- Short-term traffic ↑ but Long-term rankings ↓
- Immediate revenue ↑ but User trust ↓
- Quick wins vs. Strategic investments

---

## 2. Conflict Resolution Matrix

### 2.1 Safety vs. Any Other Metric

**Rule: SAFETY ALWAYS WINS**

| Conflict | Resolution |
|----------|------------|
| Revenue ↑ but Error Rate ↑ | Halt revenue activity |
| Traffic ↑ but Uptime ↓ | Reduce traffic |
| Growth ↑ but Cost Breach | Stop growth activity |

**No exceptions. No overrides.**

---

### 2.2 Revenue vs. Quality

| Conflict | Condition | Resolution |
|----------|-----------|------------|
| Revenue ↑ Quality ↓ | Quality > 60 | Allow, monitor quality |
| Revenue ↑ Quality ↓ | Quality 40-60 | Escalate to PM |
| Revenue ↑ Quality ↓ | Quality < 40 | Block revenue activity |
| Revenue ↓ Quality ↑ | Revenue -10% | Allow quality focus |
| Revenue ↓ Quality ↑ | Revenue -20% | Balance intervention |
| Revenue ↓ Quality ↑ | Revenue -30% | Escalate to Exec |

---

### 2.3 Traffic vs. Conversion

| Conflict | Resolution |
|----------|------------|
| Traffic ↑ Conversion ↓ | Investigate traffic quality |
| Traffic ↑ Conversion ↓↓ | Stop traffic acquisition, fix funnel |
| Traffic ↓ Conversion ↑ | Accept if revenue neutral |
| Traffic ↓↓ Conversion ↑ | Resume traffic acquisition |

**Key Metric:** Revenue per Session

If `revenue.revenue_per_session` stable → Allow traffic changes
If `revenue.revenue_per_session` declining → Prioritize conversion

---

### 2.4 SEO vs. AEO

| Conflict | Resolution |
|----------|------------|
| SEO ↑ AEO ↓ | Continue, AEO catch-up expected |
| SEO ↓ AEO ↑ | Continue, new traffic source validated |
| SEO ↓ AEO ↓ | Critical review required |
| SEO ↑ AEO ↑ | Optimal state, accelerate |

**Combined Health Score:**
```
combined_search_health = (seo_score * 0.6) + (aeo_score * 0.4)
```

If combined < 50 → Escalate
If combined 50-70 → Monitor closely
If combined > 70 → Continue

---

### 2.5 Engagement vs. Revenue

| Conflict | Resolution |
|----------|------------|
| Engagement ↑ Revenue ↓ | 7-day observation period |
| Engagement ↑ Revenue ↓ (7d) | Check affiliate placement |
| Engagement ↑ Revenue ↓↓ | Rollback engagement changes |
| Engagement ↓ Revenue ↑ | Unsustainable, investigate |

**Principle:** High engagement should eventually drive revenue.
If it doesn't, the engagement is not valuable engagement.

---

### 2.6 Content Volume vs. Quality

| Conflict | Resolution |
|----------|------------|
| Volume ↑ Quality ↓ | Throttle production |
| Volume ↑ Quality ↓↓ | Halt production, audit |
| Volume ↓ Quality ↑ | Sustainable, continue |
| Volume ↓ Quality ↔ | Resume production |

**Quality Floor:**
- New content must score > 50 before publish
- Average portfolio quality must stay > 60

---

### 2.7 Cost vs. Growth

| Conflict | Resolution |
|----------|------------|
| Cost ↑ Growth ↑ | Calculate unit economics |
| Cost ↑↑ Growth ↑ | Optimize efficiency |
| Cost ↑ Growth ↓ | Immediate cost reduction |
| Cost ↓ Growth ↓ | Evaluate investment needs |

**Unit Economics Check:**
```
cost_per_acquisition = cost.ai_api_cost / conversion.total_conversions
```

If CPA > LTV threshold → Halt growth spending
If CPA < LTV threshold → Continue with monitoring

---

## 3. Priority Rules

When multiple conflicts exist simultaneously:

### Priority Order:
1. **Safety conflicts** - Resolve immediately
2. **Revenue conflicts** - Resolve within 24h
3. **Quality conflicts** - Resolve within 48h
4. **Engagement conflicts** - Resolve within 7d
5. **Volume conflicts** - Resolve within 14d

### Compound Conflicts:
When 3+ metrics conflict:
1. Identify the highest-priority metric
2. Stabilize that metric first
3. Then address secondary conflicts
4. Log all trade-offs made

---

## 4. Conflict Detection Algorithm

```typescript
function detectConflicts(metrics: MetricSnapshot[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (const m1 of metrics) {
    for (const m2 of metrics) {
      if (m1.id === m2.id) continue;

      // Check for inverse correlation
      if (isInverseCorrelation(m1, m2)) {
        conflicts.push({
          type: 'inverse_correlation',
          metrics: [m1.id, m2.id],
          severity: calculateConflictSeverity(m1, m2),
          resolution: lookupResolution(m1.id, m2.id)
        });
      }

      // Check for goal conflict
      if (hasGoalConflict(m1, m2)) {
        conflicts.push({
          type: 'goal_conflict',
          metrics: [m1.id, m2.id],
          severity: 'medium',
          resolution: 'escalate_to_human'
        });
      }
    }
  }

  return prioritizeConflicts(conflicts);
}
```

---

## 5. Escalation Thresholds

| Conflict Severity | Resolution Time | Escalation Target |
|-------------------|-----------------|-------------------|
| Critical | 1 hour | Exec + relevant leads |
| High | 4 hours | Domain lead |
| Medium | 24 hours | Team lead |
| Low | 7 days | Automated resolution |

---

## 6. Resolution Logging

Every conflict resolution must log:

```json
{
  "conflictId": "CONF-2026-001",
  "detectedAt": "2026-01-01T12:00:00Z",
  "type": "inverse_correlation",
  "metrics": [
    {"id": "seo.ctr", "trend": "up", "value": 3.5},
    {"id": "revenue.affiliate_revenue", "trend": "down", "value": -15}
  ],
  "resolution": {
    "decision": "prioritize_revenue",
    "action": "rollback_seo_changes",
    "decidedBy": "automated",
    "rationale": "Revenue decline exceeds SEO improvement value"
  },
  "outcome": {
    "measuredAt": "2026-01-08T12:00:00Z",
    "result": "revenue_stabilized",
    "sideEffects": ["seo_ctr_normalized"]
  }
}
```

---

## 7. Conflict Prevention

### Recommended Practices:

1. **Pre-change Impact Analysis**
   - Before any change, model impact on related metrics
   - Flag potential conflicts before they occur

2. **Gradual Rollouts**
   - Roll out changes to 10% first
   - Monitor for conflicts before full rollout

3. **Conflict-Aware Optimization**
   - Optimization algorithms must consider trade-offs
   - No single-metric optimization allowed

4. **Regular Health Checks**
   - Daily automated conflict scans
   - Weekly human review of conflict trends

---

## 8. Known Conflict Pairs

Pre-identified conflict pairs requiring special handling:

| Pair | Typical Conflict | Default Resolution |
|------|------------------|-------------------|
| SEO score ↔ Page speed | Content vs. Performance | Balance at 70/30 |
| Word count ↔ Engagement | Depth vs. Attention | Cap at 3000 words |
| Ad density ↔ UX | Revenue vs. Experience | Max 3 ad units |
| Internal links ↔ External links | Retention vs. Authority | 80/20 ratio |
| Freshness ↔ Stability | Updates vs. Rankings | Quarterly major updates |
| AI content ↔ Authenticity | Scale vs. Trust | 70% AI max |

---

**Document Status: ACTIVE AND BINDING**
