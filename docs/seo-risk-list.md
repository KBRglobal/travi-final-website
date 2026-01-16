# SEO Risk List

**Date:** 2026-01-01
**Status:** Active Monitoring Required

---

## Risk Summary

| Priority | Count | Action Required |
|----------|-------|-----------------|
| Critical | 2 | Immediate |
| High | 4 | Within 1 week |
| Medium | 5 | Within 1 month |
| Low | 4 | Monitor |

---

## Critical Risks

### RISK-001: Duplicate Sitemap Systems
**Priority:** Critical
**Status:** Open

**Description:**
Two independent sitemap implementations exist:
1. Original: `server/services/sitemap-service.ts`
2. V2: `server/seo/sitemap-v2/`

This creates potential for:
- URL conflicts between systems
- Inconsistent content in sitemaps
- Crawler confusion

**Evidence:**
```typescript
// Original system generates: /sitemap-{locale}.xml
// V2 system generates: /sitemaps/{locale}/{type}/{page}.xml
```

**Impact:**
- Search engines may receive conflicting sitemap data
- Potential duplicate crawling of same content
- Wasted crawl budget

**Remediation:**
1. Enable `ENABLE_SITEMAP_V2=true` in production
2. Ensure V2 routes override original routes
3. Add 301 redirects from old sitemap URLs to new format
4. Deprecate original sitemap service

---

### RISK-002: Admin Pages Missing noindex
**Priority:** Critical
**Status:** Open

**Description:**
Admin pages under `/admin/*` do not have explicit `noindex` meta tags. While robots.txt blocks crawling, this is not guaranteed protection.

**Evidence:**
```typescript
// SEOHead component has noIndex prop but admin pages don't use it
interface SEOHeadProps {
  noIndex?: boolean; // Available but not enforced on admin
}
```

**Impact:**
- If robots.txt is bypassed, admin URLs could be indexed
- Internal tools exposed in search results
- Potential security exposure

**Remediation:**
1. Add `noIndex={true}` to all admin layout components
2. Implement server-side noindex header for `/admin/*` routes:
   ```typescript
   res.setHeader('X-Robots-Tag', 'noindex, nofollow');
   ```

---

## High Risks

### RISK-003: Feature Flags Not Enabled in Production
**Priority:** High
**Status:** Needs Verification

**Description:**
Critical SEO features are behind feature flags that may not be enabled:
- `ENABLE_SITEMAP_V2`
- `ENABLE_SEO_HEALTH`
- `ENABLE_ENTITY_MERGE`

**Impact:**
- Advanced sitemap features disabled
- Duplicate detection not running
- SEO health monitoring inactive

**Remediation:**
1. Verify all SEO feature flags in production `.env`
2. Create production checklist for required flags
3. Add startup validation for critical flags

---

### RISK-004: Canonical Manager Not Integrated with Sitemap
**Priority:** High
**Status:** Open

**Description:**
The canonical manager (`server/canonical-manager/`) detects duplicates but doesn't exclude them from sitemap generation.

**Evidence:**
```typescript
// generator.ts builds sitemaps from ALL published content
const result = await db.select()
  .from(contents)
  .where(eq(contents.status, 'published')); // No duplicate filtering
```

**Impact:**
- Duplicate URLs appear in sitemap
- Crawl budget wasted on duplicates
- Potential ranking dilution

**Remediation:**
1. Query canonical manager before sitemap generation
2. Exclude duplicate entries from sitemap
3. Include only canonical URLs

---

### RISK-005: V2 Public Routes Not in Sitemap
**Priority:** High
**Status:** Open

**Description:**
The new V2 public router (`client/src/components/public-v2/router.tsx`) has routes not included in sitemap generation.

**Evidence:**
```typescript
// V2 routes like /v2/country/:country/city/:city not in sitemap
<Route path="/v2/country/:country/city/:city" component={CityPage} />
```

**Impact:**
- New content hierarchy not discoverable by search engines
- Reduced indexation of location-based content

**Remediation:**
1. Add V2 route patterns to sitemap generator
2. Generate dynamic entries for country/city combinations
3. Ensure proper canonical URLs for V2 pages

---

### RISK-006: Overly Restrictive Default Robots Rule
**Priority:** High
**Status:** By Design

**Description:**
The default robots.txt rule blocks all unknown bots:
```
User-agent: *
Disallow: /
```

**Impact:**
- Legitimate bots not on allowlist are blocked
- New search engines or tools cannot access content
- May miss emerging AI systems

**Remediation:**
1. Consider allowing `/` for unknown bots but blocking `/admin/` and `/api/`
2. Regularly update bot allowlist
3. Monitor for missed legitimate traffic

---

## Medium Risks

### RISK-007: Missing Canonical on Static Pages
**Priority:** Medium
**Status:** Open

**Description:**
Some static pages may not have proper canonical tags set:
- `/privacy-policy`
- `/terms-conditions`
- `/cookie-policy`
- `/about`
- `/contact`

**Impact:**
- Potential duplicate indexing across locales
- Unclear canonical reference

**Remediation:**
1. Audit all static page templates
2. Add SEOHead component with proper canonicalPath
3. Verify hreflang alternates

---

### RISK-008: Translation Content Canonical Drift
**Priority:** Medium
**Status:** Potential

**Description:**
Translated content uses locale-prefixed URLs but canonical relationships may not be maintained when translations are updated independently.

**Evidence:**
```typescript
// Translations fetched separately, may drift from canonical
const translations = await storage.getTranslationsByContentId(content.id);
```

**Impact:**
- Translated pages diverge from canonical
- Inconsistent content across locales

**Remediation:**
1. Enforce translation sync with canonical content
2. Add validation for translation/canonical consistency
3. Monitor localization drift

---

### RISK-009: Event Content Has Short Lifespan
**Priority:** Medium
**Status:** By Design

**Description:**
Event content type (priority 0.7) may include past events that should be noindexed or removed from sitemap.

**Impact:**
- Outdated events appearing in search results
- Poor user experience
- Wasted crawl budget

**Remediation:**
1. Add `endDate` check to sitemap generation
2. Auto-noindex past events
3. Add "Past Events" section with lower priority

---

### RISK-010: Missing Schema.org Validation
**Priority:** Medium
**Status:** Open

**Description:**
Structured data is generated but not validated for completeness. Missing required fields may cause rich snippet failures.

**Evidence:**
```typescript
// generateAttractionStructuredData may miss required fields
return {
  name: attraction.name,
  description: attraction.description,
  // Missing: geo coordinates, opening hours, price range
};
```

**Impact:**
- Rich snippets not displaying
- Reduced search visibility

**Remediation:**
1. Add Schema.org validation to build process
2. Test structured data with Google Rich Results Test
3. Add required field enforcement

---

### RISK-011: SEO Score Not Blocking Low-Quality Publishes
**Priority:** Medium
**Status:** Open

**Description:**
The SEO validation system has 4 tiers, but Tier 1 (Critical) being 100% is not always enforced before publishing.

**Evidence:**
```typescript
// canPublish logic exists but may be bypassed
const result = validateSEO(content, pageType);
// result.canPublish may be ignored
```

**Impact:**
- Low-quality content getting indexed
- SEO score degradation

**Remediation:**
1. Enforce Tier 1 = 100% before publishing
2. Add publish gate in content editor
3. Create override mechanism with audit trail

---

## Low Risks

### RISK-012: Missing Alt Text Detection
**Priority:** Low
**Status:** Info Level

**Description:**
Alt text validation exists in SEO checker but severity is "info" level:
```typescript
missing_alt_text: 'info',
```

**Impact:**
- Images without alt text pass validation
- Reduced image search visibility
- Accessibility issues

**Remediation:**
1. Consider upgrading to "warning" level
2. Add auto-generation for missing alt text
3. Track alt text coverage metrics

---

### RISK-013: Sitemap Cache TTL May Be Too Short
**Priority:** Low
**Status:** Monitor

**Description:**
Sitemap cache is set to 5 minutes (300 seconds):
```typescript
res.set('Cache-Control', 'public, max-age=300');
```

**Impact:**
- Frequent regeneration under high crawl load
- Minor performance impact

**Remediation:**
1. Consider increasing to 3600 seconds (1 hour)
2. Add CDN layer for sitemap caching
3. Monitor regeneration frequency

---

### RISK-014: hreflang Missing for Some Locales
**Priority:** Low
**Status:** Potential

**Description:**
Translations may not exist for all 17 supported locales, leading to incomplete hreflang sets.

**Impact:**
- Search engines may not surface localized versions
- Users may see wrong language version

**Remediation:**
1. Track translation coverage by locale
2. Add placeholder hreflang with x-default fallback
3. Prioritize high-traffic locale translations

---

### RISK-015: OpenAPI/Swagger Endpoints Exposed
**Priority:** Low
**Status:** Informational

**Description:**
API documentation endpoints may be publicly accessible and indexed.

**Impact:**
- Internal API structure exposed
- Minor security consideration

**Remediation:**
1. Add noindex to API documentation pages
2. Consider authentication for API docs
3. Block `/api/docs*` in robots.txt

---

## Risk Tracking

| Risk ID | Created | Last Review | Owner | Status |
|---------|---------|-------------|-------|--------|
| RISK-001 | 2026-01-01 | - | SEO Team | Open |
| RISK-002 | 2026-01-01 | - | Engineering | Open |
| RISK-003 | 2026-01-01 | - | DevOps | Needs Verification |
| RISK-004 | 2026-01-01 | - | SEO Team | Open |
| RISK-005 | 2026-01-01 | - | Engineering | Open |
| RISK-006 | 2026-01-01 | - | SEO Team | By Design |
| RISK-007 | 2026-01-01 | - | Content | Open |
| RISK-008 | 2026-01-01 | - | Localization | Potential |
| RISK-009 | 2026-01-01 | - | Content | By Design |
| RISK-010 | 2026-01-01 | - | Engineering | Open |
| RISK-011 | 2026-01-01 | - | Engineering | Open |
| RISK-012 | 2026-01-01 | - | Content | Info Level |
| RISK-013 | 2026-01-01 | - | DevOps | Monitor |
| RISK-014 | 2026-01-01 | - | Localization | Potential |
| RISK-015 | 2026-01-01 | - | Security | Informational |

---

## Next Review

**Scheduled:** 2026-02-01
**Reviewer:** SEO & Engineering Teams

---

## Related Documents

- `docs/public-surface-audit.md` - Full audit report
- `docs/SYSTEM-ARCHITECTURE.md` - System overview
- `docs/PHASE-13-EXECUTION-PLAN.md` - Implementation timeline
