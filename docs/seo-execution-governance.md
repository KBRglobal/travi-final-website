# SEO Execution Governance

**Status:** AUTHORITATIVE
**Version:** 1.0.0
**Effective Date:** 2026-01-01
**Owner:** Platform Architecture

---

## Purpose

This document establishes the **single source of truth** for SEO exposure decisions on the TRAVI platform. It defines which systems are authoritative, how they interact, and the exact conditions under which indexing behavior changes.

**This is not a cleanup document.** No existing systems are deleted. This document provides **orchestration governance** over the existing infrastructure.

---

## 1. Precedence Hierarchy

All SEO exposure decisions follow this strict precedence order:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEO DECISION PRECEDENCE                      │
│                                                                 │
│   1. CANONICAL URL    →  Highest authority                      │
│   2. SITEMAP          →  Must align with canonical              │
│   3. ROBOTS.TXT       →  Enforces access control                │
│   4. FEATURE FLAGS    →  Enables/disables systems               │
│   5. META TAGS        →  Page-level overrides                   │
│                                                                 │
│   If conflict: higher number MUST defer to lower number         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 Precedence Rules

| Conflict Scenario | Resolution |
|-------------------|------------|
| Canonical says X, sitemap includes Y | Sitemap MUST exclude Y or redirect to X |
| Robots blocks path, sitemap includes it | Sitemap MUST exclude blocked paths |
| Feature flag disables system, meta tag says index | Meta tag is ignored; system is off |
| noindex meta on canonical URL | Remove from sitemap; respect noindex |

### 1.2 Invariants

These conditions MUST always be true:

1. **No URL in sitemap without canonical resolution**
2. **No canonical URL excluded from sitemap** (unless noindex)
3. **No admin path (/admin/*) ever indexed**
4. **No API path (/api/*) ever indexed**
5. **English (en) is always the canonical locale source**

---

## 2. Authoritative Systems

### 2.1 Sitemap Authority

**DECISION: Sitemap V2 is the future canonical sitemap system.**

| System | Status | Authority |
|--------|--------|-----------|
| `server/services/sitemap-service.ts` | LEGACY | Fallback only |
| `server/seo/sitemap-v2/` | CANONICAL | Primary when enabled |

**Activation Conditions for V2:**

```
ENABLE_SITEMAP_V2=true
```

**Transition Protocol:**

1. V1 continues serving if `ENABLE_SITEMAP_V2` is unset or `false`
2. V2 takes over completely when flag is `true`
3. No dual-serving; exactly one system is active at any time
4. Migration: Enable V2 in staging → verify → enable in production

### 2.2 Robots.txt Authority

**DECISION: AEO robots strategy is the future canonical.**

Three generators exist:

| Generator | Location | Default Bot Policy | Status |
|-----------|----------|-------------------|--------|
| Original | `server/services/sitemap-service.ts` | Block unknown (`*` Disallow: /) | LEGACY |
| V2 | `server/seo/sitemap-v2/generator.ts` | Block unknown (`*` Disallow: /) | LEGACY |
| AEO | `server/aeo/aeo-static-files.ts` | Allow with restrictions | **CANONICAL** |

**Rationale:** The AEO strategy is AI-first and future-proof. It:
- Explicitly allows known search engines and AI crawlers
- Allows unknown bots by default (protecting only sensitive paths)
- Prevents blocking future AI systems we don't yet know about

### 2.3 Canonical URL Authority

| System | Location | Authority |
|--------|----------|-----------|
| Localization Rules | `server/localization/canonical-rules.ts` | **CANONICAL** |
| Canonical Manager | `server/canonical-manager/` | Duplicate resolution |

**Canonical Locale:** English (`en`) is ALWAYS the canonical source.

---

## 3. Robots Strategy

### 3.1 Safe Default Policy

The following robots.txt strategy is **APPROVED** for production:

```
# ═══════════════════════════════════════════════════════════════
# TRAVI Robots.txt — AI-First Discovery Strategy
# ═══════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────
# PROTECTED PATHS — Blocked for ALL crawlers
# ───────────────────────────────────────────────────────────────
User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /private/
Disallow: /*.json$
Allow: /

# ───────────────────────────────────────────────────────────────
# SEARCH ENGINES — Explicit Allow (priority crawling)
# ───────────────────────────────────────────────────────────────
User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: Bingbot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/

User-agent: Slurp
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: Baiduspider
Allow: /

User-agent: YandexBot
Allow: /

# ───────────────────────────────────────────────────────────────
# AI CRAWLERS — Explicit Allow (AI-first discovery)
# ───────────────────────────────────────────────────────────────
User-agent: GPTBot
Allow: /
Disallow: /admin/
Disallow: /api/
Crawl-delay: 1

User-agent: ChatGPT-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /
Disallow: /admin/
Disallow: /api/
Crawl-delay: 1

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /
Crawl-delay: 1

User-agent: cohere-ai
Allow: /

User-agent: Applebot
Allow: /

User-agent: CCBot
Allow: /
Crawl-delay: 2

# ───────────────────────────────────────────────────────────────
# SOCIAL PREVIEW BOTS — Allow for link unfurling
# ───────────────────────────────────────────────────────────────
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: Slackbot
Allow: /

User-agent: Discordbot
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: TelegramBot
Allow: /

# ───────────────────────────────────────────────────────────────
# SEO TOOLS — Allow for monitoring
# ───────────────────────────────────────────────────────────────
User-agent: AhrefsBot
Allow: /

User-agent: SemrushBot
Allow: /

User-agent: MJ12bot
Allow: /

# ───────────────────────────────────────────────────────────────
# SITEMAPS
# ───────────────────────────────────────────────────────────────
Sitemap: https://travi.world/sitemap.xml
```

### 3.2 Key Strategy Decisions

| Decision | Rationale |
|----------|-----------|
| Default `Allow: /` for unknown bots | Future AI crawlers we don't know yet can discover content |
| Block `/admin/`, `/api/`, `/auth/` for ALL | Non-negotiable security boundary |
| Crawl-delay for AI bots | Prevents overwhelming during AI training runs |
| Single sitemap reference | V2 generates index at `/sitemap.xml` |

### 3.3 Production vs Staging

| Environment | Robots Behavior |
|-------------|-----------------|
| Production | Full robots.txt as defined above |
| Staging | `Disallow: /` for all (block everything) |

**Staging Detection:**

```typescript
const isStaging = process.env.NODE_ENV !== 'production' ||
                  process.env.ENVIRONMENT === 'staging';
if (isStaging) {
  return 'User-agent: *\nDisallow: /';
}
```

---

## 4. Sitemap Strategy

### 4.1 V2 as Canonical

**DECISION: Sitemap V2 is the canonical sitemap system.**

| Aspect | V1 (Legacy) | V2 (Canonical) |
|--------|-------------|----------------|
| URL Limit | Unbounded | 50,000 per file |
| Partitioning | By locale only | By locale + type + page |
| Caching | None | LRU + TTL |
| Regeneration | On-demand | Scheduled + on-demand |
| Feature Flag | None | `ENABLE_SITEMAP_V2` |

### 4.2 Activation Conditions

V2 becomes active when ALL of these are true:

```
ENABLE_SITEMAP_V2=true
NODE_ENV=production (or explicit enablement in staging)
```

### 4.3 URL Inclusion Rules

A URL is included in sitemap if and only if:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SITEMAP INCLUSION RULES                      │
│                                                                 │
│   1. Content status = 'published'                               │
│   2. Content has valid canonical URL                            │
│   3. Content is NOT marked as duplicate in canonical manager    │
│   4. Content does NOT have noindex meta                         │
│   5. Path is NOT in robots.txt Disallow                         │
│   6. Locale has translation OR is English (canonical)           │
│                                                                 │
│   ALL conditions must be TRUE for inclusion                     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Duplicate Handling

When canonical manager detects duplicates:

| Scenario | Sitemap Action |
|----------|----------------|
| Duplicate marked for `redirect` | Exclude duplicate, include canonical only |
| Duplicate marked for `noindex` | Exclude both from sitemap |
| Duplicate marked for `keep` | Include both (editorial decision) |
| Duplicate pending review | Include both until resolved |

### 4.5 Zero Crawler Confusion Protocol

To ensure crawlers never see conflicting sitemaps:

1. **Single Active System:** Only V1 OR V2 serves requests, never both
2. **Route Priority:** V2 routes registered AFTER V1 routes (higher priority when enabled)
3. **Cache Invalidation:** When switching, clear all sitemap caches
4. **Transition Window:** 24-hour observation period after switching

---

## 5. Indexability Classification

### 5.1 Route Classification

All routes fall into one of these categories:

| Classification | Robots | Sitemap | Meta | Examples |
|---------------|--------|---------|------|----------|
| **INDEXABLE** | Allow | Include | index | `/attractions/*`, `/hotels/*`, `/articles/*` |
| **NOINDEX** | Allow | Exclude | noindex | `/search`, `/404`, `/coming-soon` |
| **BLOCKED** | Disallow | Exclude | noindex | `/admin/*`, `/api/*`, `/auth/*` |
| **CONDITIONAL** | Allow | Conditional | varies | `/events/*` (future events only) |

### 5.2 Explicit Classifications

**Always INDEXABLE:**

```
/
/attractions/*
/hotels/*
/dining/*
/districts/*
/articles/*
/destinations/*
/off-plan/*
/case-study/*
/compare-*
/pillar-*
/tools-*
/glossary-*
/landing-*
/privacy-policy
/terms-conditions
/cookie-policy
/about
/contact
```

**Always BLOCKED:**

```
/admin/*
/api/*
/auth/*
/private/*
/*.json (API responses)
```

**Always NOINDEX:**

```
/search
/search?*
/404
/access-denied
/coming-soon
/v2/* (until V2 public router is production-ready)
```

**CONDITIONAL:**

```
/events/*      → indexable if event.endDate > now
/news/*        → indexable if article.status = 'published'
```

---

## 6. Governance Module Architecture

### 6.1 Module Location

```
server/seo-governance/
├── index.ts              # Module exports
├── types.ts              # Type definitions
├── config.ts             # Configuration and feature flags
├── decision-engine.ts    # Core decision logic
├── route-classifier.ts   # Route classification
├── sitemap-coordinator.ts # Sitemap system coordination
├── robots-coordinator.ts  # Robots.txt coordination
└── canonical-resolver.ts  # Canonical URL resolution
```

### 6.2 Feature Flag

```
ENABLE_SEO_GOVERNANCE=true
```

When enabled, the governance module becomes the single decision point for all SEO exposure questions. Existing systems continue to function but defer to governance decisions.

### 6.3 Core Interface

```typescript
// server/seo-governance/types.ts

export type IndexabilityDecision =
  | 'indexable'
  | 'noindex'
  | 'blocked'
  | 'conditional';

export type SitemapAuthority = 'v1' | 'v2';

export type RobotsStrategy = 'legacy' | 'aeo';

export interface SEOGovernanceConfig {
  // Feature activation
  enabled: boolean;

  // Sitemap authority
  sitemapAuthority: SitemapAuthority;

  // Robots strategy
  robotsStrategy: RobotsStrategy;

  // Environment
  isProduction: boolean;
  isStaging: boolean;

  // Canonical settings
  canonicalLocale: 'en';
  baseUrl: string;
}

export interface IndexabilityQuery {
  path: string;
  locale?: string;
  contentId?: string;
  contentType?: string;
  contentStatus?: string;
}

export interface IndexabilityResult {
  decision: IndexabilityDecision;
  includedInSitemap: boolean;
  canonicalUrl: string | null;
  hreflangUrls: { locale: string; url: string }[];
  reason: string;
  confidence: number;
}

export interface GovernanceDecision {
  timestamp: Date;
  query: IndexabilityQuery;
  result: IndexabilityResult;
  precedenceApplied: string[];
}
```

### 6.4 Decision Engine

```typescript
// server/seo-governance/decision-engine.ts (DESIGN ONLY)

export class SEOGovernanceEngine {
  private config: SEOGovernanceConfig;
  private routeClassifier: RouteClassifier;
  private canonicalResolver: CanonicalResolver;

  /**
   * Determine if a path should be indexable
   * This is THE authoritative decision function
   */
  async evaluateIndexability(query: IndexabilityQuery): Promise<IndexabilityResult> {
    // 1. Check route classification (blocked paths)
    const routeClass = this.routeClassifier.classify(query.path);
    if (routeClass === 'blocked') {
      return this.blocked(query, 'Route is in blocked path list');
    }

    // 2. Check canonical resolution
    const canonical = await this.canonicalResolver.resolve(query);
    if (canonical.isDuplicate && canonical.action === 'redirect') {
      return this.noindex(query, 'Duplicate content with redirect');
    }

    // 3. Check content status
    if (query.contentStatus && query.contentStatus !== 'published') {
      return this.noindex(query, 'Content not published');
    }

    // 4. Check conditional rules (events, etc.)
    if (this.isConditional(query)) {
      return this.evaluateConditional(query);
    }

    // 5. Default: indexable
    return this.indexable(query, canonical);
  }

  /**
   * Determine which sitemap system should serve requests
   */
  getSitemapAuthority(): SitemapAuthority {
    if (process.env.ENABLE_SITEMAP_V2 === 'true') {
      return 'v2';
    }
    return 'v1';
  }

  /**
   * Determine which robots strategy to use
   */
  getRobotsStrategy(): RobotsStrategy {
    // AEO strategy is preferred for AI-first discovery
    if (process.env.ENABLE_AEO === 'true') {
      return 'aeo';
    }
    return 'legacy';
  }

  /**
   * Get production-safe robots.txt content
   */
  getRobotsTxt(): string {
    if (!this.config.isProduction) {
      return 'User-agent: *\nDisallow: /';
    }

    const strategy = this.getRobotsStrategy();
    if (strategy === 'aeo') {
      return generateAEORobotsTxt(this.config.baseUrl);
    }
    return generateLegacyRobotsTxt(this.config.baseUrl);
  }
}
```

### 6.5 Route Classifier

```typescript
// server/seo-governance/route-classifier.ts (DESIGN ONLY)

export class RouteClassifier {
  private blockedPatterns = [
    /^\/admin\//,
    /^\/api\//,
    /^\/auth\//,
    /^\/private\//,
    /\.json$/,
  ];

  private noindexPatterns = [
    /^\/search/,
    /^\/404/,
    /^\/access-denied/,
    /^\/coming-soon/,
    /^\/v2\//,  // Until V2 public router is production-ready
  ];

  private conditionalPatterns = [
    { pattern: /^\/events\//, evaluator: 'eventDateCheck' },
  ];

  classify(path: string): IndexabilityDecision {
    // Check blocked first (highest priority)
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(path)) return 'blocked';
    }

    // Check noindex
    for (const pattern of this.noindexPatterns) {
      if (pattern.test(path)) return 'noindex';
    }

    // Check conditional
    for (const { pattern } of this.conditionalPatterns) {
      if (pattern.test(path)) return 'conditional';
    }

    // Default: indexable
    return 'indexable';
  }
}
```

### 6.6 Integration Points

The governance module integrates with existing systems without modifying them:

```typescript
// Integration with existing sitemap V2
// server/seo/sitemap-v2/generator.ts

import { getGovernanceEngine } from '../seo-governance';

async function shouldIncludeInSitemap(content: Content): Promise<boolean> {
  const governance = getGovernanceEngine();
  if (!governance.isEnabled()) {
    // Fallback to existing logic
    return content.status === 'published';
  }

  const result = await governance.evaluateIndexability({
    path: `/${content.type}/${content.slug}`,
    contentId: content.id,
    contentType: content.type,
    contentStatus: content.status,
  });

  return result.includedInSitemap;
}
```

---

## 7. Feature Flag Governance

### 7.1 SEO-Related Feature Flags

| Flag | Purpose | Safe Default | Production Recommendation |
|------|---------|--------------|---------------------------|
| `ENABLE_SITEMAP_V2` | Activate V2 sitemap system | `false` | `true` |
| `ENABLE_SEO_HEALTH` | Activate SEO health monitoring | `false` | `true` |
| `ENABLE_ENTITY_MERGE` | Activate duplicate detection | `false` | `true` |
| `ENABLE_CANONICAL_MANAGER` | Activate canonical management | `false` | `true` |
| `ENABLE_SEO_GOVERNANCE` | Activate unified governance | `false` | `true` (after testing) |
| `ENABLE_AEO` | Activate AI-optimized robots | `false` | `true` |

### 7.2 Flag Dependencies

```
ENABLE_SEO_GOVERNANCE
  └── requires: ENABLE_SITEMAP_V2
  └── requires: ENABLE_CANONICAL_MANAGER
  └── recommends: ENABLE_SEO_HEALTH
  └── recommends: ENABLE_ENTITY_MERGE
```

### 7.3 Activation Sequence

For production activation:

```
1. ENABLE_SITEMAP_V2=true          (Week 1: Verify sitemap generation)
2. ENABLE_CANONICAL_MANAGER=true   (Week 2: Verify duplicate detection)
3. ENABLE_SEO_HEALTH=true          (Week 3: Verify health monitoring)
4. ENABLE_ENTITY_MERGE=true        (Week 4: Verify entity detection)
5. ENABLE_AEO=true                 (Week 5: Verify AI crawler access)
6. ENABLE_SEO_GOVERNANCE=true      (Week 6: Activate unified governance)
```

---

## 8. Environment-Specific Rules

### 8.1 Production

```env
NODE_ENV=production
ENABLE_SITEMAP_V2=true
ENABLE_SEO_GOVERNANCE=true
ENABLE_AEO=true
BASE_URL=https://travi.world
```

**Behavior:**
- Full sitemap generation
- AI-first robots.txt
- All content types indexed
- Canonical URLs enforced

### 8.2 Staging

```env
NODE_ENV=staging
ENABLE_SITEMAP_V2=true
ENABLE_SEO_GOVERNANCE=true
BASE_URL=https://staging.travi.world
```

**Behavior:**
- robots.txt returns `Disallow: /` for all bots
- Sitemap generated but not submitted to search engines
- X-Robots-Tag: noindex on all responses

### 8.3 Development

```env
NODE_ENV=development
```

**Behavior:**
- No SEO systems active
- No sitemap generation
- No robots.txt served

---

## 9. Monitoring & Validation

### 9.1 Health Checks

The governance module exposes health checks:

```
GET /api/seo-governance/health
```

Response:

```json
{
  "enabled": true,
  "sitemapAuthority": "v2",
  "robotsStrategy": "aeo",
  "lastDecision": "2026-01-01T12:00:00Z",
  "decisionsToday": 1523,
  "cacheHitRate": 0.94
}
```

### 9.2 Decision Audit

All indexability decisions are logged:

```
GET /api/seo-governance/audit?path=/attractions/burj-khalifa
```

Response:

```json
{
  "query": {
    "path": "/attractions/burj-khalifa",
    "locale": "en"
  },
  "result": {
    "decision": "indexable",
    "includedInSitemap": true,
    "canonicalUrl": "https://travi.world/attractions/burj-khalifa",
    "reason": "Published content, no duplicates",
    "confidence": 100
  },
  "precedenceApplied": [
    "route_classification: indexable",
    "canonical_resolution: primary",
    "content_status: published"
  ]
}
```

### 9.3 Alerts

The governance module emits alerts for:

| Condition | Alert Level |
|-----------|-------------|
| Sitemap generation failed | Critical |
| Canonical conflict detected | Warning |
| Duplicate in sitemap | Warning |
| Admin path nearly indexed | Critical |
| Feature flag inconsistency | Warning |

---

## 10. Non-Negotiable Constraints

These constraints are **ABSOLUTE** and cannot be overridden:

1. **Admin paths NEVER indexed** — No `/admin/*` URL appears in any sitemap or is allowed by robots.txt
2. **API paths NEVER indexed** — No `/api/*` URL appears in any sitemap
3. **Auth paths NEVER indexed** — No `/auth/*` URL is accessible to crawlers
4. **Staging NEVER indexed** — All staging environments block all crawlers
5. **English is canonical** — All canonical URLs derive from English content
6. **Published only** — Only `status: 'published'` content appears in sitemaps
7. **One sitemap authority** — Exactly one sitemap system serves requests at any time

---

## 11. Implementation Checklist

When implementing the governance module:

- [ ] Create `server/seo-governance/` directory structure
- [ ] Implement `SEOGovernanceConfig` type and loader
- [ ] Implement `RouteClassifier` with blocked/noindex/conditional patterns
- [ ] Implement `CanonicalResolver` integration with existing canonical manager
- [ ] Implement `SEOGovernanceEngine.evaluateIndexability()`
- [ ] Implement `getSitemapAuthority()` and `getRobotsStrategy()`
- [ ] Add feature flag `ENABLE_SEO_GOVERNANCE`
- [ ] Add health check endpoint
- [ ] Add audit logging
- [ ] Add integration tests
- [ ] Document in this file

---

## 12. Appendix

### A. File References

| Purpose | File |
|---------|------|
| Sitemap V1 | `server/services/sitemap-service.ts` |
| Sitemap V2 | `server/seo/sitemap-v2/` |
| Canonical Manager | `server/canonical-manager/` |
| Canonical Rules | `server/localization/canonical-rules.ts` |
| AEO Robots | `server/aeo/aeo-static-files.ts` |
| Entity Merge | `server/entity-merge/` |
| SEO Health | `server/seo-health/` |
| Platform Contract | `server/platform-contract.ts` |
| Go-Live Checks | `server/go-live-v2/service.ts` |

### B. Related Documents

| Document | Purpose |
|----------|---------|
| `docs/public-surface-audit.md` | Current state audit |
| `docs/seo-risk-list.md` | Risk tracking |
| `docs/SYSTEM-ARCHITECTURE.md` | System overview |

### C. Governance History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-01 | Initial governance document | SEO Auditor |

---

**END OF GOVERNANCE DOCUMENT**
