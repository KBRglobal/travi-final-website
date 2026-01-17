# AEO Content Standard

**Purpose:** Define content structure optimized for AI Answer Engines
**Applies to:** Google SGE, OpenAI, Perplexity, Claude, Bing Chat

---

## 1. Answer Capsule Specification

### 1.1 Definition
A concise, self-contained answer that can be extracted by AI systems.

### 1.2 Structure

```html
<div class="answer-capsule" data-speakable="true">
  <p class="quick-answer">[Direct answer in 15-25 words]</p>
  <ul class="key-facts">
    <li>[Fact 1]</li>
    <li>[Fact 2]</li>
    <li>[Fact 3]</li>
  </ul>
  <p class="differentiator">[What makes this unique]</p>
</div>
```

### 1.3 Requirements

| Element | Required | Word Count | Format |
|---------|----------|------------|--------|
| Quick Answer | YES | 15-25 | Single sentence |
| Key Facts | YES | 3-5 items | Bullet list |
| Differentiator | YES | 10-20 | Single sentence |
| Full Capsule | YES | 40-60 total | Paragraph |

### 1.4 Quality Criteria

- **Completeness:** Answers the primary query without needing context
- **Accuracy:** Contains verifiable facts
- **Freshness:** Includes current year or date when relevant
- **Specificity:** Contains specific numbers, not vague terms

---

## 2. TL;DR Block Specification

### 2.1 Purpose
Executive summary for content scanners and AI extractors.

### 2.2 Structure

```html
<aside class="tldr-block" role="complementary">
  <h2>TL;DR</h2>
  <ul>
    <li>[Key point 1]</li>
    <li>[Key point 2]</li>
    <li>[Key point 3]</li>
    <li>[Key point 4]</li>
    <li>[Key point 5]</li>
  </ul>
</aside>
```

### 2.3 Placement
- Immediately after the introduction
- Before the first H2 section
- Visible without scrolling on desktop

---

## 3. Speakable Content Specification

### 3.1 Schema Markup

```json
{
  "@type": "WebPage",
  "speakable": {
    "@type": "SpeakableSpecification",
    "cssSelector": [
      ".answer-capsule",
      ".quick-answer",
      ".tldr-block"
    ]
  }
}
```

### 3.2 Requirements

- Maximum 300 characters per speakable section
- No special characters or formatting
- Natural spoken language
- Self-contained meaning

---

## 4. Source Attribution Standard

### 4.1 Citable Facts Format

```html
<span class="citable-fact" data-source="[source]" data-date="[date]">
  [Factual statement]
</span>
```

### 4.2 Attribution Requirements

| Fact Type | Attribution Required | Format |
|-----------|---------------------|--------|
| Statistics | YES | Source + Date |
| Prices | YES | "As of [date]" |
| Rankings | YES | Source + Methodology |
| Claims | YES | Source |
| General knowledge | NO | - |

---

## 5. Confidence Scoring

### 5.1 Content Confidence Levels

| Level | Score | Meaning |
|-------|-------|---------|
| VERIFIED | 90-100 | Facts verified from authoritative sources |
| HIGH | 70-89 | Generally accurate, minor assumptions |
| MEDIUM | 50-69 | Some unverified claims |
| LOW | 30-49 | Significant uncertainty |
| UNVERIFIED | 0-29 | Speculation or outdated |

### 5.2 Confidence Calculation

```typescript
confidence = (
  sourceQuality * 0.30 +
  dataFreshness * 0.25 +
  factVerification * 0.25 +
  authorExpertise * 0.20
)
```

---

## 6. Required Content Elements

### 6.1 For All AEO-Indexed Content

| Element | Required | Notes |
|---------|----------|-------|
| Answer Capsule | YES | 40-60 words |
| Primary Question (H1) | YES | Question format preferred |
| FAQ Section | YES | Minimum 5 Q&As |
| TL;DR Block | YES | 5 bullet points |
| Schema.org markup | YES | FAQPage + content type |
| Speakable specification | YES | Mark extractable content |

### 6.2 By Content Type

#### Money Pages (Hotels, Attractions)
- Price information with date
- Booking CTA
- Quick facts bar
- User ratings if available

#### Informational Pages
- Definition in first paragraph
- Step-by-step if applicable
- Comparison tables
- Expert attribution

#### Guide Pages
- Table of contents
- Chapter summaries
- Quick navigation
- Downloadable version

---

## 7. AI-Friendly Heading Structure

### 7.1 Question-Based H2s

Transform statements into questions:

| Instead of | Use |
|------------|-----|
| "Opening Hours" | "What are the opening hours?" |
| "Best Time to Visit" | "When is the best time to visit?" |
| "Getting There" | "How do I get there?" |
| "Ticket Prices" | "How much do tickets cost?" |

### 7.2 Heading Hierarchy

```
H1: [Primary Question]
  H2: [Supporting Question 1]
    H3: [Sub-topic]
  H2: [Supporting Question 2]
  H2: [Supporting Question 3]
  H2: Frequently Asked Questions
    [FAQ items - no H3]
```

---

## 8. Validation Rules

### 8.1 AEO Readiness Checklist

```typescript
interface AEOReadinessCheck {
  hasAnswerCapsule: boolean;      // Required
  capsuleWordCount: number;       // 40-60
  hasTLDR: boolean;               // Required
  tldrItemCount: number;          // 5+
  hasFAQSchema: boolean;          // Required
  faqCount: number;               // 5+
  hasSpeakable: boolean;          // Required
  questionHeadingCount: number;   // 3+
  hasDefinitionOpening: boolean;  // Required for informational
  confidenceScore: number;        // 70+
}
```

### 8.2 Blocking Conditions

Content is blocked from AI indexing if:
- Answer capsule missing
- FAQ count < 3
- Confidence score < 50
- No speakable content
- Word count < 500

---

## 9. Anti-Patterns (Avoid)

| Anti-Pattern | Reason |
|--------------|--------|
| Vague language ("many", "some") | AI needs specifics |
| Undated claims | Freshness unclear |
| First-person opinions | Not citable |
| Promotional fluff | No informational value |
| Dense paragraphs | AI extraction fails |
| Keyword stuffing | Spam detection |

---

## 10. Implementation

### 10.1 Content Creation Workflow

1. Define primary question
2. Write answer capsule FIRST
3. Expand into full content
4. Add FAQ section
5. Generate TL;DR
6. Mark speakable sections
7. Validate AEO readiness
8. Publish if score > 70

### 10.2 Automated Enhancement

```typescript
// AEO auto-enhancement triggers
if (content.aeoScore < 60) {
  generateAnswerCapsule(content);
  generateTLDR(content);
  extractFAQs(content);
  markSpeakableSections(content);
}
```
