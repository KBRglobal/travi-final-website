# Public Surface & SEO Exposure Audit

**Date:** 2026-01-01
**Auditor:** SEO Exposure Auditor
**Scope:** sitemap, robots.txt, canonical URLs, indexing exposure

---

## 1. Executive Summary

This audit examines the public-facing SEO surface of the TRAVI website, focusing on ensuring only correct pages are indexable while administrative and internal pages remain protected from search engines.

### Overall Status: **MODERATE RISK**

| Category | Status | Risk Level |
|----------|--------|------------|
| Sitemap Configuration | Dual implementation | Medium |
| Robots.txt | Properly configured | Low |
| Canonical URLs | Implemented, gaps exist | Medium |
| Admin Page Protection | Partially protected | Medium |
| Duplicate URL Handling | Detection available, not automated | Medium |

---

## 2. Sitemap Audit

### 2.1 Implementation Overview

The system has **two sitemap implementations**:

1. **Original Sitemap Service** (`server/services/sitemap-service.ts`)
   - Generates locale-specific sitemaps
   - Supports all 17+ locales
   - URL pattern: `/sitemap-{locale}.xml`

2. **Sitemap V2** (`server/seo/sitemap-v2/`)
   - Feature-flagged: `ENABLE_SITEMAP_V2=true`
   - Partitioned by locale, content type, and pagination
   - URL pattern: `/sitemaps/{locale}/{type}/{page}.xml`
   - Max 50,000 URLs per sitemap (standard limit)

### 2.2 Supported Content Types (V2)

| Content Type | Priority | Change Frequency |
|--------------|----------|------------------|
| attraction | 0.9 | weekly |
| hotel | 0.9 | weekly |
| landing_page | 0.9 | weekly |
| off_plan | 0.8 | weekly |
| district | 0.8 | weekly |
| itinerary | 0.8 | weekly |
| article | 0.8 | weekly |
| case_study | 0.7 | weekly |
| dining | 0.7 | weekly |
| event | 0.7 | weekly |
| transport | 0.6 | weekly |

### 2.3 Supported Locales

```
en, ar, zh, hi, ru, de, fr, ja, ko, pt, es, it, nl, tr, fa, ur, he
```

### 2.4 Findings

| Issue | Severity | Status |
|-------|----------|--------|
| Dual sitemap systems may cause confusion | Medium | Active |
| Static pages not in dynamic sitemaps | Low | Documented |
| V2 behind feature flag | Info | By design |

---

## 3. Robots.txt Audit

### 3.1 Configuration Summary

**Location:** Generated dynamically via `buildRobotsTxt()`

#### Allowed Bots

| Category | User-Agents |
|----------|-------------|
| Search Engines | Googlebot, Googlebot-Image, Googlebot-News, Bingbot, Slurp, DuckDuckBot, Baiduspider, YandexBot |
| AI Assistants | anthropic-ai, Claude-Web, ChatGPT-User, GPTBot, Google-Extended, PerplexityBot, Applebot, cohere-ai |
| Social Media | facebookexternalhit, Facebot, Twitterbot, LinkedInBot, Pinterest, WhatsApp, TelegramBot, Slackbot, Discordbot |
| SEO Tools | AhrefsBot, SemrushBot, MJ12bot |

#### Blocked Paths (for major bots)

```
Disallow: /admin/
Disallow: /api/
```

#### Default Rule

```
User-agent: *
Disallow: /
```

### 3.2 Findings

| Issue | Severity | Status |
|-------|----------|--------|
| Default blocks all unknown bots | Medium | Intentional |
| /admin/ properly blocked for major bots | Low | Passing |
| /api/ properly blocked | Low | Passing |

---

## 4. Canonical URL Audit

### 4.1 Implementation

**Client-side:** `SEOHead` component (`client/src/components/seo-head.tsx`)
- Injects canonical link tag dynamically
- Generates hreflang alternates for all locales
- Supports x-default pointing to English

**Server-side:** `getCanonicalUrl()` (`server/lib/meta-tags.ts`)
- Base URL: `https://travi.world`
- English: `https://travi.world/{path}`
- Other locales: `https://travi.world/{locale}/{path}`

### 4.2 Canonical Manager

**Service:** `server/canonical-manager/service.ts`
- Detects duplicates via title similarity (>=70% threshold)
- Supports canonical groups with duplicate tracking
- Actions: redirect, noindex, delete, keep

### 4.3 Findings

| Issue | Severity | Status |
|-------|----------|--------|
| noIndex prop available but inconsistently used | Medium | Needs review |
| Hreflang implementation complete | Low | Passing |
| Missing canonical on some admin pages | Low | Acceptable |

---

## 5. Admin Page Exposure Audit

### 5.1 Admin Routes

All admin functionality is under `/admin/*` path:

```
/admin/                    - Dashboard
/admin/attractions/*       - Attraction management
/admin/hotels/*            - Hotel management
/admin/articles/*          - Article management
/admin/destinations/*      - Destination management
/admin/settings            - Site settings
/admin/security            - Security settings
/admin/governance/*        - Governance tools
/admin/monetization/*      - Monetization tools
/admin/enterprise/*        - Enterprise features
... (100+ admin routes)
```

### 5.2 Protection Measures

| Measure | Status |
|---------|--------|
| robots.txt blocks /admin/ | ✅ Active |
| Authentication required | ✅ Active |
| noindex meta tags | ⚠️ Not verified |
| RBAC permissions | ✅ Active |

### 5.3 Findings

| Issue | Severity | Status |
|-------|----------|--------|
| robots.txt blocks admin for known bots | Low | Passing |
| Admin pages lack explicit noindex meta | Medium | Needs fix |
| Authentication gates access | Low | Passing |

---

## 6. Duplicate URL Detection

### 6.1 Entity Merge System

**Service:** `server/entity-merge/detector.ts`

Detection methods:
- Exact name match
- Same slug detection
- Known alias matching
- Location + similar name (>=70%)
- Fuzzy name matching (>=85%)

### 6.2 Content Types Covered

- Destinations
- Attractions
- Hotels
- Articles

### 6.3 Findings

| Issue | Severity | Status |
|-------|----------|--------|
| Duplicate detection available | Info | Implemented |
| Not integrated with sitemap generation | Medium | Gap |
| Manual review required for merges | Low | By design |

---

## 7. SEO Engine Alignment

### 7.1 Go-Live Checks

The Go-Live service (`server/go-live-v2/service.ts`) includes:

| Check | Category |
|-------|----------|
| Sitemap enabled | Required |
| Search enabled | Required |
| No critical incidents | Critical |
| No blocked publishes | Required |
| Database healthy | Critical |

### 7.2 SEO Validation (4-Tier System)

**Endpoint:** `/api/seo/validate`

| Tier | Name | Impact |
|------|------|--------|
| 1 | Critical | Blocks publishing |
| 2 | Essential | Affects ranking |
| 3 | Technical | Professional quality |
| 4 | Quality | Excellence differentiator |

### 7.3 Feature Flags

| Flag | Purpose |
|------|---------|
| ENABLE_SITEMAP_V2 | New sitemap system |
| ENABLE_SEO_HEALTH | Technical health checks |
| ENABLE_GO_LIVE_V2 | Go-live readiness |
| ENABLE_ENTITY_MERGE | Duplicate detection |

---

## 8. Recommendations

### High Priority

1. **Add explicit noindex to admin pages**
   - Ensure all `/admin/*` routes have `<meta name="robots" content="noindex, nofollow">`

2. **Consolidate sitemap implementations**
   - Consider deprecating original sitemap service
   - Enable ENABLE_SITEMAP_V2 by default

3. **Automate duplicate exclusion from sitemaps**
   - Integrate canonical manager with sitemap generation
   - Exclude duplicates from XML output

### Medium Priority

4. **Document feature flag requirements**
   - Create checklist for production readiness
   - Enable all SEO-related feature flags

5. **Add sitemap monitoring**
   - Track sitemap crawl rates
   - Alert on generation failures

### Low Priority

6. **Review default robots.txt rule**
   - Consider allowing more bots or creating an explicit allowlist
   - Balance security vs discoverability

---

## 9. Appendix

### A. File References

| File | Purpose |
|------|---------|
| `server/seo/sitemap-v2/generator.ts` | Sitemap V2 generation |
| `server/seo/sitemap-v2/routes.ts` | Sitemap V2 endpoints |
| `server/services/sitemap-service.ts` | Original sitemap service |
| `server/canonical-manager/service.ts` | Duplicate management |
| `server/entity-merge/detector.ts` | Duplicate detection |
| `client/src/components/seo-head.tsx` | Client-side SEO |
| `server/lib/meta-tags.ts` | Server-side meta generation |
| `server/go-live-v2/service.ts` | Go-live checks |
| `server/routes/seo-routes.ts` | SEO API endpoints |

### B. Related Documentation

- `docs/SYSTEM-ARCHITECTURE.md`
- `docs/PHASE-12-PLANNING-REPORT.md`
- `docs/MONETIZATION-STRATEGY.md`
