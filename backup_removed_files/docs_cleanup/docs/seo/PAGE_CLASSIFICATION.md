# Page Classification System

**Authority:** SEO Engine
**Classification is MANDATORY for all URLs**

---

## 1. Classification Types

Every URL must be classified into exactly ONE of the following types:

### MONEY_PAGE
Commercial intent pages designed to drive conversions.

**Characteristics:**
- Primary goal is booking/purchase
- Contains CTAs
- Has pricing information
- Targets transactional keywords

**SEO Priority:** MAXIMUM
**AEO Priority:** HIGH

**Examples:**
- Hotel detail pages
- Attraction booking pages
- Tour packages

---

### INFORMATIONAL
Educational content answering user questions.

**Characteristics:**
- Answers specific questions
- No direct commercial intent
- High AEO value
- Targets informational keywords

**SEO Priority:** HIGH
**AEO Priority:** MAXIMUM

**Examples:**
- "What is the best time to visit Dubai?"
- "How to get from airport to hotel"
- Neighborhood guides

---

### GUIDE
Comprehensive, long-form content for in-depth topics.

**Characteristics:**
- 2000+ words typical
- Multiple sections/chapters
- Pillar content for topic clusters
- High internal linking value

**SEO Priority:** HIGH
**AEO Priority:** HIGH

**Examples:**
- Complete Dubai Travel Guide 2025
- Ultimate Restaurant Guide
- District deep-dives

---

### NEWS
Time-sensitive, event-based content.

**Characteristics:**
- Short lifespan value
- Dated content
- Event announcements
- Trending topics

**SEO Priority:** MEDIUM
**AEO Priority:** LOW (decays quickly)

**Examples:**
- New hotel opening
- Festival announcements
- Regulatory changes

---

### EVERGREEN
Timeless content that maintains value.

**Characteristics:**
- No expiration
- Foundational knowledge
- Reference material
- Updated periodically

**SEO Priority:** HIGH
**AEO Priority:** HIGH

**Examples:**
- Visa requirements
- Cultural etiquette
- Climate information

---

### EXPERIMENTAL
New content formats or topics being tested.

**Characteristics:**
- Low traffic expectations initially
- A/B test variants
- New keyword targets
- Format experiments

**SEO Priority:** LOW
**AEO Priority:** LOW

**Constraints:**
- Maximum 10% of site content
- Auto-expire after 90 days without traction

---

### SEO_RISK
Content flagged as potentially harmful to site SEO.

**Characteristics:**
- Thin content
- Duplicate intent
- Cannibalization source
- Low-quality signals

**SEO Priority:** NEGATIVE
**AEO Priority:** NEGATIVE

**Actions:**
- noindex by default
- Queue for merge/delete
- Block from internal linking

---

## 2. Classification Rules

### 2.1 Automatic Classification

```typescript
function classifyPage(content: Content): PageType {
  // SEO_RISK takes precedence
  if (isSEORisk(content)) return 'SEO_RISK';

  // Classification by content type
  if (content.type === 'hotel' || content.type === 'attraction') {
    return 'MONEY_PAGE';
  }

  if (content.type === 'article') {
    if (isNewsContent(content)) return 'NEWS';
    if (isGuideContent(content)) return 'GUIDE';
    return 'INFORMATIONAL';
  }

  if (content.type === 'district') {
    return 'GUIDE';
  }

  if (content.type === 'event') {
    return 'NEWS';
  }

  // Check for evergreen characteristics
  if (isEvergreenContent(content)) return 'EVERGREEN';

  // Default fallback
  return 'INFORMATIONAL';
}
```

### 2.2 Risk Detection

```typescript
function isSEORisk(content: Content): boolean {
  return (
    content.wordCount < MIN_WORDS[content.type] * 0.5 ||
    content.duplicateSimilarity > 0.7 ||
    content.cannibalizationScore > 0.8 ||
    content.seoScore < 30 ||
    content.trafficLastMonth === 0 && content.ageInDays > 90
  );
}
```

---

## 3. Classification Impact

### 3.1 SEO Treatment by Type

| Type | Index | Sitemap Priority | Link Weight | Reindex Frequency |
|------|-------|------------------|-------------|-------------------|
| MONEY_PAGE | yes | 0.9 | 1.5x | immediate |
| INFORMATIONAL | yes | 0.8 | 1.0x | daily |
| GUIDE | yes | 0.9 | 2.0x | weekly |
| NEWS | yes | 0.6 | 0.5x | immediate |
| EVERGREEN | yes | 0.8 | 1.0x | monthly |
| EXPERIMENTAL | yes | 0.3 | 0.3x | weekly |
| SEO_RISK | no | 0.0 | 0.0x | never |

### 3.2 AEO Treatment by Type

| Type | Answer Capsule | FAQPage Schema | Speakable | AI Index |
|------|----------------|----------------|-----------|----------|
| MONEY_PAGE | required | required | optional | yes |
| INFORMATIONAL | required | required | required | yes |
| GUIDE | required | required | required | yes |
| NEWS | optional | optional | no | limited |
| EVERGREEN | required | required | required | yes |
| EXPERIMENTAL | optional | optional | no | no |
| SEO_RISK | forbidden | forbidden | no | no |

---

## 4. Reclassification Triggers

| Trigger | From | To | Condition |
|---------|------|----|-----------|
| Traffic spike | EXPERIMENTAL | INFORMATIONAL | > 100 sessions/week |
| Traffic death | any | SEO_RISK | 0 sessions for 90 days |
| Age out | NEWS | EVERGREEN or SEO_RISK | > 30 days old |
| Quality drop | any | SEO_RISK | SEO score < 30 |
| Cannibalization | any | SEO_RISK | Cannibalizes higher-value page |

---

## 5. Classification Storage

```sql
-- In contents table
page_classification ENUM(
  'MONEY_PAGE',
  'INFORMATIONAL',
  'GUIDE',
  'NEWS',
  'EVERGREEN',
  'EXPERIMENTAL',
  'SEO_RISK'
) NOT NULL DEFAULT 'INFORMATIONAL'

classification_updated_at TIMESTAMP
classification_reason TEXT
classification_confidence FLOAT
```

---

## 6. API

```
GET  /api/seo-engine/classification/:contentId
POST /api/seo-engine/classification/:contentId/override
GET  /api/seo-engine/classification/distribution
GET  /api/seo-engine/classification/risk-pages
```
