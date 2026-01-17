# SEO & AEO Source of Truth

**Version:** 1.0
**Authority Level:** BINDING
**Override Priority:** This document supersedes Product, Content, and Marketing decisions.

---

## 1. Official SEO Signals

### 1.1 Critical Signals (Block Publishing)

| Signal | Threshold | Action |
|--------|-----------|--------|
| `seo_score` | < 50 | **BLOCK** - Cannot publish |
| `meta_title` | Missing or < 30 chars | **BLOCK** |
| `meta_description` | Missing or < 100 chars | **BLOCK** |
| `primary_keyword` | Not defined | **BLOCK** |
| `word_count` | < 70% of type minimum | **BLOCK** |
| `duplicate_content` | Similarity > 80% | **BLOCK** |
| `h1_count` | 0 or > 1 | **BLOCK** |

### 1.2 Essential Signals (Trigger Automatic Action)

| Signal | Threshold | Action |
|--------|-----------|--------|
| `seo_score` | 50-69 | Auto-fix where possible |
| `internal_links` | < 3 | Auto-inject links |
| `schema_markup` | Missing | Auto-generate |
| `canonical_url` | Missing | Auto-set |
| `image_alt_text` | Missing | Auto-generate |
| `faq_count` | < 5 for money pages | Flag for content expansion |

### 1.3 Quality Signals (Informational)

| Signal | Optimal Range | Notes |
|--------|---------------|-------|
| `keyword_density` | 1-2% | Warning if outside range |
| `readability_score` | 60-80 | Flesch-Kincaid |
| `paragraph_avg_length` | 50-150 words | |
| `h2_count` | 4-8 | |
| `external_links` | 1-3 | Authoritative sources |

---

## 2. Official AEO Signals

### 2.1 Critical AEO Signals (Block AI Visibility)

| Signal | Threshold | Action |
|--------|-----------|--------|
| `aeo_score` | < 40 | **BLOCK** from AI indexing |
| `answer_capsule` | Missing | **BLOCK** for informational content |
| `speakable_content` | Missing | **BLOCK** for voice search |

### 2.2 Essential AEO Signals (Trigger Enhancement)

| Signal | Threshold | Action |
|--------|-----------|--------|
| `aeo_score` | 40-59 | Auto-enhance content structure |
| `quick_facts` | < 3 | Auto-extract from content |
| `faq_schema` | Missing | Auto-generate from content |
| `tldr_block` | Missing | Auto-generate |
| `key_takeaways` | < 3 | Auto-extract |

### 2.3 Quality AEO Signals (Informational)

| Signal | Optimal | Notes |
|--------|---------|-------|
| `answer_capsule_words` | 40-60 | Direct answer length |
| `citation_readiness` | true | Has attributable facts |
| `question_headings` | 3+ | H2s as questions |
| `definition_opening` | true | First paragraph defines topic |

---

## 3. Publishing Gates

### 3.1 Hard Blocks (No Override)

```
IF seo_score < 50 → BLOCK
IF meta_title IS NULL → BLOCK
IF meta_description IS NULL → BLOCK
IF primary_keyword IS NULL → BLOCK
IF word_count < MIN_WORDS[content_type] * 0.7 → BLOCK
IF duplicate_content_similarity > 0.8 → BLOCK
```

### 3.2 Soft Blocks (Admin Override Allowed)

```
IF seo_score < 70 AND page_type = 'money_page' → SOFT_BLOCK
IF aeo_score < 40 AND page_type = 'informational' → SOFT_BLOCK
IF internal_links < 3 → SOFT_BLOCK
IF schema_markup IS NULL → SOFT_BLOCK
```

### 3.3 Warnings (Log Only)

```
IF keyword_density < 0.5 OR > 3.0 → WARN
IF readability_score < 50 → WARN
IF external_links = 0 → WARN
```

---

## 4. Automatic Action Triggers

### 4.1 Immediate Actions

| Condition | Action |
|-----------|--------|
| New content published | Generate schema, validate canonical |
| Content updated | Trigger re-index, recalculate scores |
| SEO score drops below 60 | Queue for auto-fix |
| Duplicate detected | Suggest canonical merge |

### 4.2 Scheduled Actions

| Condition | Action | Frequency |
|-----------|--------|-----------|
| Stale content (> 180 days) | Flag for refresh | Weekly |
| Zero-traffic pages | Queue for audit | Daily |
| Orphan pages | Generate link suggestions | Daily |
| Low AEO score (< 50) | Queue for enhancement | Daily |

### 4.3 Escalation Actions

| Condition | Action |
|-----------|--------|
| Crawl anomaly detected | Alert + auto-investigate |
| Index drop > 10% | CRITICAL alert + pause publishing |
| Penalty signals detected | CRITICAL alert + audit all content |

---

## 5. Score Calculation Formulas

### 5.1 SEO Score (0-100)

```
seo_score = (
  tier1_critical * 0.40 +    // Must be 100% to publish
  tier2_essential * 0.30 +   // Affects ranking
  tier3_technical * 0.20 +   // Professional implementation
  tier4_quality * 0.10       // Excellence factors
)
```

### 5.2 AEO Score (0-100)

```
aeo_score = (
  answer_capsule_quality * 0.25 +
  snippet_readiness * 0.20 +
  schema_completeness * 0.20 +
  ai_headings * 0.15 +
  key_facts_presence * 0.10 +
  citability * 0.10
)
```

### 5.3 Combined Visibility Score (0-100)

```
visibility_score = (seo_score * 0.6) + (aeo_score * 0.4)
```

---

## 6. Content Type Minimums

| Type | Min Words | Min FAQs | Min H2s | Min Images |
|------|-----------|----------|---------|------------|
| attraction | 1500 | 6 | 5 | 3 |
| hotel | 1200 | 6 | 4 | 4 |
| article | 1200 | 5 | 4 | 2 |
| dining | 1200 | 5 | 4 | 3 |
| district | 1500 | 6 | 5 | 3 |
| event | 800 | 4 | 3 | 1 |
| itinerary | 1500 | 5 | 6 | 4 |
| landing_page | 1000 | 4 | 4 | 2 |
| guide | 1800 | 8 | 6 | 3 |

---

## 7. Signal Priority Hierarchy

When signals conflict, use this priority:

1. **Security signals** (always override)
2. **Legal/compliance signals**
3. **SEO critical signals** (this document)
4. **AEO critical signals** (this document)
5. **Business priority signals**
6. **Content quality signals**

---

## 8. Change Control

This document may only be modified by:
- SEO/AEO Engine automated updates (data-driven)
- Explicit approval from Engineering + SEO leadership

Changes require:
- Version increment
- Changelog entry
- System-wide cache invalidation

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2025-01-01 | Initial binding document |
