# Metrics Source of Truth

> **This document is BINDING for all teams: SEO, Content, Growth, Ops, Autonomy, Product.**
> Metrics defined here have AUTHORITY over opinions and override manual decisions.

## Document Version
- Version: 1.0.0
- Last Updated: 2026-01-01
- Status: ACTIVE
- Owner: Data Intelligence System

---

## 1. Metrics Authority Levels

### Level 1: BLOCKING (Highest Authority)
These metrics can **HALT** operations. No override without escalation.

| Metric ID | Threshold | Action | Override Requires |
|-----------|-----------|--------|-------------------|
| `health.error_rate` | > 5% | BLOCK_ALL_DEPLOYMENTS | CTO approval |
| `health.uptime` | < 99% | FREEZE_AUTOMATION | Ops lead + CTO |
| `cost.ai_api_cost` | > daily_budget * 1.5 | THROTTLE_AI | Finance + CTO |
| `content.quality_score` | < 30 | BLOCK_PUBLISH | Editor-in-chief |
| `aeo.aeo_score` | < 20 | BLOCK_PUBLISH | SEO lead |
| `seo.seo_score` | < 25 | BLOCK_PUBLISH | SEO lead |

### Level 2: TRIGGERING (Action Authority)
These metrics **INITIATE** automated actions.

| Metric ID | Condition | Triggered Action |
|-----------|-----------|------------------|
| `engagement.bounce_rate` | > 80% for 7d | TRIGGER_CONTENT_REVIEW |
| `seo.ctr` | < 1% with impressions > 1000 | TRIGGER_META_OPTIMIZATION |
| `aeo.citations` | = 0 for 30d | TRIGGER_AEO_AUDIT |
| `content.freshness_score` | < 30 | TRIGGER_CONTENT_REFRESH |
| `conversion.conversion_rate` | < 0.5% | TRIGGER_CRO_ANALYSIS |
| `growth.internal_link_ctr` | < 2% | TRIGGER_INTERLINKING_TASK |

### Level 3: ESCALATING (Human Required)
These metrics **REQUIRE** human decision.

| Metric ID | Condition | Escalation Target |
|-----------|-----------|-------------------|
| `revenue.total_revenue` | -30% WoW | Exec + Finance |
| `traffic.organic_sessions` | -40% WoW | SEO + Exec |
| `cost.roi` | < 0% for 14d | Product + Finance |
| `health.api_response_time` | > 5000ms | Ops + Engineering |
| Anomaly severity | = critical | Relevant team lead |

### Level 4: ADVISORY (Information Only)
These metrics inform but do not trigger actions.

- `engagement.page_views` (without context)
- `engagement.unique_visitors` (without trend)
- `traffic.direct_sessions`
- `traffic.social_sessions`
- Raw counts without conversion context

---

## 2. Metrics Hierarchy

When metrics conflict, resolution follows this hierarchy:

```
1. SAFETY METRICS (highest priority)
   └── health.error_rate
   └── health.uptime
   └── cost thresholds

2. REVENUE METRICS
   └── revenue.total_revenue
   └── conversion.conversion_rate
   └── cost.roi

3. QUALITY METRICS
   └── content.quality_score
   └── seo.seo_score
   └── aeo.aeo_score

4. ENGAGEMENT METRICS
   └── engagement.session_duration
   └── engagement.bounce_rate
   └── engagement.dwell_time

5. VOLUME METRICS (lowest priority)
   └── traffic.total_sessions
   └── engagement.page_views
   └── seo.impressions
```

**Rule**: A metric can NEVER override a metric from a higher level.

---

## 3. Metric Authority by Domain

### SEO Domain
**Authoritative Metrics:**
- `seo.average_position` - Determines ranking health
- `seo.ctr` - Determines SERP effectiveness
- `seo.impressions` - Determines visibility scope

**Blocking Power:**
- `seo.seo_score` < 25 blocks publish
- `seo.average_position` > 100 triggers delisting review

### AEO Domain
**Authoritative Metrics:**
- `aeo.aeo_score` - Primary AEO health indicator
- `aeo.citations` - Proves AI platform visibility
- `aeo.crawler_visits` - Confirms AI accessibility

**Blocking Power:**
- `aeo.aeo_score` < 20 blocks publish
- Zero crawler visits for 7d triggers technical audit

### Content Domain
**Authoritative Metrics:**
- `content.quality_score` - AI-evaluated quality
- `content.performance_score` - Unified performance
- `content.freshness_score` - Staleness indicator

**Blocking Power:**
- `content.quality_score` < 30 blocks publish
- `content.freshness_score` < 20 triggers mandatory refresh

### Growth Domain
**Authoritative Metrics:**
- `growth.search_loop_conversion` - Search funnel health
- `growth.chat_loop_conversion` - Chat funnel health
- `growth.internal_link_ctr` - Internal navigation health

**Triggering Power:**
- Conversion < 50% of baseline triggers optimization

### Operations Domain
**Authoritative Metrics:**
- `health.error_rate` - System stability
- `health.api_response_time` - Performance
- `cost.ai_api_cost` - Budget compliance

**Blocking Power:**
- Error rate > 5% halts all automation
- Cost > budget freezes AI operations

---

## 4. Metric Data Requirements

For a metric to have authority, it MUST have:

| Requirement | Threshold |
|-------------|-----------|
| Data points | Minimum 100 |
| Time range | Minimum 7 days |
| Confidence score | Minimum 70% |
| Freshness | Maximum 24 hours old |

Metrics failing these requirements are demoted to ADVISORY.

---

## 5. Override Protocol

### Temporary Override (max 24h)
- Requires: Team lead approval
- Logged: All overrides recorded
- Review: Automatic review triggered at expiry

### Extended Override (max 7d)
- Requires: Director-level approval
- Logged: Full audit trail
- Review: Daily status check required

### Permanent Exception
- Requires: C-level approval
- Documentation: Written justification required
- Review: Quarterly review mandatory

---

## 6. Metric Freshness Requirements

| Metric Category | Max Staleness | Refresh Interval |
|-----------------|---------------|------------------|
| Health | 1 minute | Real-time |
| Cost | 1 hour | Hourly |
| Engagement | 4 hours | 4x daily |
| SEO | 24 hours | Daily |
| AEO | 24 hours | Daily |
| Revenue | 24 hours | Daily |
| Content | 7 days | Weekly |

Stale metrics lose BLOCKING authority but retain ADVISORY status.

---

## 7. Audit Requirements

All metric-based decisions MUST be logged with:

1. **Decision ID** - Unique identifier
2. **Triggering Metric** - Which metric triggered
3. **Metric Value** - Value at decision time
4. **Threshold** - What threshold was crossed
5. **Action Taken** - What action resulted
6. **Timestamp** - When decision was made
7. **Authority Level** - Which level applied
8. **Override Status** - If any override was in effect

Audit logs retained for: **2 years minimum**

---

## 8. Change Management

Changes to this document require:

1. RFC submitted to Data Governance team
2. Impact analysis on existing automations
3. Approval from all affected domain leads
4. 7-day notice before implementation
5. Rollback plan documented

**Emergency changes** require C-level approval and same-day notification to all teams.

---

## Appendix A: Metric ID Reference

Full list of authoritative metric IDs:

```
# Engagement
engagement.page_views
engagement.unique_visitors
engagement.session_duration
engagement.bounce_rate
engagement.dwell_time
engagement.scroll_depth
engagement.pages_per_session
engagement.return_visitor_rate

# Traffic
traffic.total_sessions
traffic.organic_sessions
traffic.ai_referral_sessions
traffic.direct_sessions
traffic.referral_sessions
traffic.social_sessions

# SEO
seo.impressions
seo.clicks
seo.ctr
seo.average_position
seo.indexed_pages
seo.seo_score
seo.keyword_rankings

# AEO
aeo.ai_impressions
aeo.citations
aeo.citation_rate
aeo.click_throughs
aeo.avg_position
aeo.aeo_score
aeo.crawler_visits

# Content
content.total_published
content.created_this_period
content.avg_word_count
content.performance_score
content.freshness_score
content.quality_score
content.decay_rate

# Conversion
conversion.total_conversions
conversion.conversion_rate
conversion.newsletter_signups
conversion.lead_form_submissions
conversion.affiliate_clicks
conversion.funnel_completion_rate

# Revenue
revenue.total_revenue
revenue.affiliate_revenue
revenue.revenue_per_session
revenue.revenue_per_content

# Cost
cost.ai_api_cost
cost.content_generation_cost
cost.cost_per_content
cost.roi

# Growth
growth.search_loop_conversion
growth.chat_loop_conversion
growth.content_loop_retention
growth.internal_link_ctr
growth.content_freshness

# Health
health.api_response_time
health.error_rate
health.uptime
health.database_connections
health.cache_hit_rate
health.job_queue_length
```

---

**Document Status: ACTIVE AND BINDING**
