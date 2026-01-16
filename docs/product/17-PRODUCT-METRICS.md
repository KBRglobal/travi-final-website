# Product Metrics

**סטטוס:** מחייב
**תאריך:** 2026-01-01
**גרסה:** 1.0

---

## 1. מטרה

מסמך זה מגדיר איך מודדים הצלחה של המוצר.
לא טכני. לא vanity metrics. רק מה שמשנה.

---

## 2. North Star Metric

### Primary Metric

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    PUBLISHED CONTENT QUALITY                         │
│                                                                     │
│    Formula: (Content with SEO Score ≥70 AND Published) / Total     │
│                                                                     │
│    Target: 80%                                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why This Metric

- Combines quantity (published) + quality (SEO score)
- Directly impacts business (SEO = traffic = revenue)
- Measurable automatically
- Actionable

---

## 3. Category Metrics

### 3.1 Content Efficiency

| Metric | Formula | Target | Current | Trend |
|--------|---------|--------|---------|-------|
| **Time to Publish** | Avg(publishedAt - createdAt) | < 2 days | TBD | - |
| **Review Turnaround** | Avg(reviewedAt - submittedAt) | < 24 hours | N/A | - |
| **First-time Approval Rate** | Approved / (Approved + Rejected) | > 70% | N/A | - |
| **Content Velocity** | Published per week | Increasing | TBD | - |
| **Draft Abandonment** | Drafts > 30 days old | < 10% | TBD | - |

### 3.2 Content Quality

| Metric | Formula | Target | Current | Trend |
|--------|---------|--------|---------|-------|
| **Average SEO Score** | Avg(seoScore) for published | > 70 | TBD | - |
| **Average AEO Score** | Avg(aeoScore) for published | > 60 | TBD | - |
| **Missing Hero Image** | Published without heroImage | 0% | TBD | - |
| **Missing Alt Text** | Images without altText | < 5% | TBD | - |
| **Freshness** | Updated in last 6 months | > 80% | TBD | - |

### 3.3 User Errors

| Metric | Formula | Target | Current | Trend |
|--------|---------|--------|---------|-------|
| **Publish Rollback Rate** | Unpublished within 24h / Published | < 2% | TBD | - |
| **Bulk Operation Failures** | Failed bulk ops / Total | < 1% | TBD | - |
| **Duplicate Content Created** | Duplicates detected | 0 | TBD | - |
| **Broken Link Rate** | Pages with broken links | < 1% | TBD | - |

### 3.4 Admin Adoption

| Metric | Formula | Target | Current | Trend |
|--------|---------|--------|---------|-------|
| **Daily Active Users** | Unique admins/day | Increasing | TBD | - |
| **Feature Adoption** | Users using feature / Total users | > 50% | TBD | - |
| **Search Usage** | Searches / Sessions | Increasing | TBD | - |
| **Help Center Visits** | Help page views | Decreasing | TBD | - |
| **Session Duration** | Avg admin session length | Stable | TBD | - |

### 3.5 System Health

| Metric | Formula | Target | Current | Trend |
|--------|---------|--------|---------|-------|
| **API Error Rate** | 5xx responses / Total | < 0.1% | TBD | - |
| **Page Load Time** | p95 load time | < 3s | TBD | - |
| **API Response Time** | p95 response time | < 500ms | TBD | - |
| **Uptime** | Available time / Total time | > 99.9% | TBD | - |

---

## 4. Dashboard Design

### 4.1 Executive Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TRAVI CMS - Product Health                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │
│  │ QUALITY SCORE   │  │ VELOCITY        │  │ ADOPTION        │     │
│  │     78%         │  │   42/week       │  │    85%          │     │
│  │   ▲ +5%         │  │   ▲ +12%        │  │   ▲ +3%         │     │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ CONTENT PUBLISHED (Last 30 Days)                             │   │
│  │ ████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ 168 published                              Target: 200      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌───────────────────────────┐  ┌───────────────────────────┐      │
│  │ TOP ISSUES                │  │ RECENT ACTIVITY           │      │
│  │ • 12 items pending review │  │ • John published Hotel X  │      │
│  │ • 5 items with low SEO    │  │ • AI generated 3 articles │      │
│  │ • 2 broken links          │  │ • Review approved: Beach  │      │
│  └───────────────────────────┘  └───────────────────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Content Team Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONTENT TEAM - Daily View                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  MY WORK                                                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Drafts: 3    In Review: 2    Published Today: 1              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  PENDING REVIEWS (I need to review)                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ • Dubai Marina Hotel - by Sarah - 2h ago                    │   │
│  │ • Top 10 Attractions - by AI Writer - 5h ago                │   │
│  │ • Business Bay Guide - by John - 1d ago ⚠️                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  MY PERFORMANCE                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ This Week: Published 8  |  Avg SEO: 74  |  Approval: 85%    │   │
│  │ vs Last Week:    +2     |         +3    |            +5%    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Measurement Implementation

### 5.1 Data Collection Points

| Metric | Collection Point | Storage |
|--------|-----------------|---------|
| Time to Publish | Content save event | analytics_events |
| SEO Score | Content publish | contents.seoScore |
| User Actions | Audit middleware | audit_logs |
| Page Load | Client-side timer | analytics_events |
| API Response | Server middleware | Server logs |

### 5.2 Tracking Events

```typescript
// Required events
trackEvent('content.created', { contentId, type, authorId })
trackEvent('content.submitted_for_review', { contentId, authorId })
trackEvent('content.reviewed', { contentId, reviewerId, decision })
trackEvent('content.published', { contentId, publisherId, seoScore })
trackEvent('content.unpublished', { contentId, userId, reason })
trackEvent('bulk.operation', { type, count, userId, success })
trackEvent('search.performed', { query, results, userId })
trackEvent('feature.used', { feature, userId })
```

### 5.3 Calculation Queries

```sql
-- Time to Publish (avg hours)
SELECT AVG(EXTRACT(EPOCH FROM (published_at - created_at)) / 3600)
FROM contents
WHERE status = 'published'
AND published_at > NOW() - INTERVAL '30 days';

-- Quality Score
SELECT
  COUNT(*) FILTER (WHERE seo_score >= 70) * 100.0 / COUNT(*)
FROM contents
WHERE status = 'published';

-- Review Turnaround (avg hours)
SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - submitted_at)) / 3600)
FROM contents
WHERE reviewed_at IS NOT NULL
AND submitted_at > NOW() - INTERVAL '30 days';
```

---

## 6. Targets by Phase

### 6.1 Phase 1 (Weeks 1-2) - Baseline

| Metric | Target |
|--------|--------|
| Establish baseline | ✓ |
| Tracking implemented | 100% |
| Dashboard created | ✓ |

### 6.2 Phase 2 (Weeks 3-4) - Improvement

| Metric | Target |
|--------|--------|
| Time to Publish | -20% vs baseline |
| Review Turnaround | < 48h |
| Admin Errors | -50% |

### 6.3 Phase 3 (Week 5+) - Optimization

| Metric | Target |
|--------|--------|
| Time to Publish | < 2 days |
| Review Turnaround | < 24h |
| Quality Score | > 75% |
| Feature Adoption | > 60% |

---

## 7. Reporting Cadence

| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| Daily Digest | Daily | Content Team | Pending items, velocity |
| Weekly Summary | Weekly | Leadership | All metrics, trends |
| Monthly Review | Monthly | All stakeholders | Deep analysis |
| Quarterly Report | Quarterly | Board | Business impact |

---

## 8. Alert Thresholds

### 8.1 Immediate Alerts

| Condition | Alert |
|-----------|-------|
| API error rate > 1% | Page Dev team |
| Uptime < 99% | Page Ops team |
| Bulk operation fails | Notify initiator + admin |

### 8.2 Daily Alerts

| Condition | Alert |
|-----------|-------|
| Items in review > 48h | Email to editors |
| Drafts abandoned > 30 days | Email to authors |
| SEO score < 50 published | Daily digest |

### 8.3 Weekly Alerts

| Condition | Alert |
|-----------|-------|
| Velocity down > 20% | Weekly report highlight |
| Quality score down > 5% | Leadership attention |

---

## 9. Success Criteria

### 9.1 After Phase 1

```
✅ All tracking implemented
✅ Baseline established
✅ Dashboard operational
✅ No critical gaps in data
```

### 9.2 After Phase 2

```
✅ Review workflow reduces errors by 50%
✅ Time to publish improved by 20%
✅ User satisfaction stable or improved
```

### 9.3 After Full Rollout

```
✅ Quality Score > 80%
✅ Time to Publish < 2 days
✅ Review Turnaround < 24h
✅ Admin Adoption > 90%
✅ Error Rate < 1%
```

---

## 10. Anti-Metrics (What NOT to Optimize)

| Metric | Why Not |
|--------|---------|
| Total content count | Quantity ≠ Quality |
| Page views alone | Traffic without conversion |
| Time on admin site | Could mean confusion |
| Features built | Shipping ≠ Value |

---

## 11. Metric Ownership

| Metric Category | Owner |
|-----------------|-------|
| Content Efficiency | Product Lead |
| Content Quality | Content Lead |
| User Errors | QA Lead |
| Admin Adoption | Product Lead |
| System Health | Tech Lead |

---

## 12. Review Process

### Monthly Metric Review

```
1. Collect all metrics
2. Compare to targets
3. Identify gaps
4. Root cause analysis
5. Action items
6. Update targets if needed
7. Document and share
```

### Metric Change Request

```
To add/change/remove a metric:
1. Document rationale
2. Define collection method
3. Set initial target
4. Get Product Lead approval
5. Implement tracking
6. Add to dashboard
```
