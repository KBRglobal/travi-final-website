# SEO Governance Rules

**Authority Level:** BINDING
**Enforcement:** AUTOMATIC
**Override:** Engineering Lead + SEO Lead joint approval required

---

## 1. Publishing Blocks

### 1.1 Absolute Blocks (NO Override)

These conditions ALWAYS block publishing:

```typescript
const ABSOLUTE_BLOCKS = [
  { condition: 'seo_score < 40', reason: 'Critical SEO failure' },
  { condition: 'meta_title === null', reason: 'Missing meta title' },
  { condition: 'meta_description === null', reason: 'Missing meta description' },
  { condition: 'word_count < 200', reason: 'Content too thin' },
  { condition: 'duplicate_similarity > 0.9', reason: 'Near-duplicate content' },
  { condition: 'spam_score > 0.7', reason: 'Spam detected' },
  { condition: 'ai_hallucination_detected', reason: 'AI hallucination flagged' },
];
```

### 1.2 Conditional Blocks (Admin Override)

These conditions block unless explicitly overridden:

```typescript
const CONDITIONAL_BLOCKS = [
  {
    condition: 'seo_score < 60 && page_type === "MONEY_PAGE"',
    reason: 'Money page below SEO threshold'
  },
  {
    condition: 'aeo_score < 50 && page_type === "INFORMATIONAL"',
    reason: 'Informational page not AEO-ready'
  },
  {
    condition: 'cannibalization_risk > 0.7',
    reason: 'High cannibalization risk'
  },
  {
    condition: 'internal_links < 2',
    reason: 'Insufficient internal linking'
  },
  {
    condition: 'schema_markup === null',
    reason: 'Missing structured data'
  },
];
```

### 1.3 Warnings (Logged, Not Blocking)

```typescript
const WARNINGS = [
  'keyword_density < 0.5 || keyword_density > 3.0',
  'readability_score < 50',
  'paragraph_avg_length > 200',
  'external_links === 0',
  'image_count < 2',
];
```

---

## 2. SEO Override Authority

### 2.1 When SEO Overrides Content Decisions

| Scenario | SEO Action | Content Impact |
|----------|------------|----------------|
| Title too long | Truncate to 60 chars | Title modified |
| Description too long | Truncate to 160 chars | Description modified |
| Missing alt text | Auto-generate | Images tagged |
| No FAQ | Block or auto-generate | Content held |
| Duplicate intent | Canonical set | Traffic redirected |
| Thin content | Block publish | Draft status forced |

### 2.2 When Content Overrides SEO (Requires Approval)

| Scenario | Required Approval | Documentation |
|----------|-------------------|---------------|
| Publish < 60 SEO score | Engineering Lead | Risk acceptance form |
| Skip schema markup | SEO Lead | Technical justification |
| noindex request | SEO Lead | Business justification |
| Non-standard URL | SEO Lead | Redirect plan |

---

## 3. AEO Precedence Rules

### 3.1 AEO Takes Precedence When

```typescript
const AEO_PRECEDENCE = [
  // Informational content must be AEO-ready
  'page_type === "INFORMATIONAL" && aeo_score < 50',

  // Guides must have answer capsules
  'page_type === "GUIDE" && !has_answer_capsule',

  // All content must have speakable markup
  'page_type !== "SEO_RISK" && !has_speakable',

  // FAQs required for all indexable content
  'is_indexed && faq_count < 3',
];
```

### 3.2 AEO Requirements by Page Type

| Page Type | Min AEO Score | Answer Capsule | FAQ Count |
|-----------|---------------|----------------|-----------|
| MONEY_PAGE | 50 | Required | 6+ |
| INFORMATIONAL | 60 | Required | 8+ |
| GUIDE | 70 | Required | 10+ |
| EVERGREEN | 60 | Required | 6+ |
| NEWS | 30 | Optional | 3+ |
| EXPERIMENTAL | N/A | Optional | Optional |

---

## 4. Mandatory Approval Scenarios

### 4.1 Always Require Human Approval

| Action | Approver | SLA |
|--------|----------|-----|
| Delete published content | SEO Lead | 24h |
| Bulk noindex (> 10 pages) | Engineering Lead | 48h |
| URL structure change | SEO Lead + Engineering | 72h |
| Canonical to external domain | SEO Lead | 24h |
| Override duplicate block | SEO Lead | 24h |

### 4.2 Escalation Path

```
Level 1: SEO Engine (Automatic)
    ↓ (if blocked)
Level 2: Content Editor (can override warnings)
    ↓ (if still blocked)
Level 3: SEO Lead (can override conditional blocks)
    ↓ (if absolute block)
Level 4: Engineering Lead (can override with documentation)
```

---

## 5. Automatic Actions

### 5.1 Immediate Execution (No Approval)

| Trigger | Action |
|---------|--------|
| Content published | Generate schema |
| Content published | Set canonical |
| Content updated | Queue reindex |
| SEO score < 50 | Move to draft |
| Duplicate detected | Set noindex |
| Orphan detected | Add to linking queue |

### 5.2 Scheduled Execution (No Approval)

| Trigger | Action | Frequency |
|---------|--------|-----------|
| Zero traffic (90d) | Classify as SEO_RISK | Daily |
| Stale content (180d) | Flag for refresh | Weekly |
| Low AEO score | Queue for enhancement | Daily |
| Missing answer capsule | Auto-generate | On demand |

### 5.3 Supervised Execution (Requires Confirmation)

| Trigger | Action | Supervisor |
|---------|--------|------------|
| Content merge | Combine + redirect | SEO Lead |
| Bulk update (> 50) | Execute batch | Engineering |
| Delete (published) | Remove + redirect | SEO Lead |
| noindex (money page) | Apply noindex | SEO Lead |

---

## 6. Risk Management

### 6.1 SEO Risk Levels

| Level | Condition | Action |
|-------|-----------|--------|
| CRITICAL | Index drop > 20% | Halt all changes, alert leadership |
| HIGH | Penalty signals detected | Pause publishing, audit |
| MEDIUM | Crawl anomalies | Investigate, log |
| LOW | Minor fluctuations | Monitor |

### 6.2 Automatic Responses

```typescript
const RISK_RESPONSES = {
  CRITICAL: {
    pausePublishing: true,
    alertChannels: ['slack', 'email', 'sms'],
    requiresAcknowledgment: true,
    autoRollback: true,
  },
  HIGH: {
    pausePublishing: true,
    alertChannels: ['slack', 'email'],
    requiresAcknowledgment: true,
    autoRollback: false,
  },
  MEDIUM: {
    pausePublishing: false,
    alertChannels: ['slack'],
    requiresAcknowledgment: false,
    autoRollback: false,
  },
  LOW: {
    pausePublishing: false,
    alertChannels: [],
    requiresAcknowledgment: false,
    autoRollback: false,
  },
};
```

---

## 7. Audit Requirements

### 7.1 Logged Actions

All SEO actions must be logged:

```typescript
interface SEOAuditLog {
  timestamp: Date;
  action: string;
  contentId: string;
  beforeState: object;
  afterState: object;
  triggeredBy: 'automatic' | 'manual';
  approvedBy?: string;
  reason: string;
}
```

### 7.2 Retention

| Log Type | Retention |
|----------|-----------|
| Publishing decisions | 2 years |
| Block overrides | 5 years |
| Automatic actions | 1 year |
| Risk alerts | 3 years |

---

## 8. Compliance

### 8.1 Regular Reviews

| Review | Frequency | Reviewer |
|--------|-----------|----------|
| Governance rule audit | Quarterly | SEO Lead |
| Override analysis | Monthly | Engineering |
| Risk response drill | Quarterly | Full team |

### 8.2 Rule Changes

1. Propose change in writing
2. Impact analysis required
3. Engineering + SEO approval
4. 7-day notice before implementation
5. Rollback plan required

---

## 9. Enforcement

This governance document is enforced by:
- SEO Engine automatic validation
- CI/CD pipeline checks
- Pre-publish hooks
- Scheduled compliance scans

Violations are:
- Logged permanently
- Reported in weekly metrics
- Escalated if repeated
