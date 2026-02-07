# TRAVI Performance Fix Tracker

## Started: 2026-02-07

### Baseline Scores (Feb 7, 2026)

| Metric               | Score       |
| -------------------- | ----------- |
| Performance (Mobile) | 31/100      |
| Accessibility        | 91/100      |
| Best Practices       | 92/100      |
| SEO                  | 92/100      |
| Observatory          | B+ (80/100) |

### Key Metrics

| Metric      | Before   | After | Target |
| ----------- | -------- | ----- | ------ |
| FCP         | 3.6s     | -     | <1.8s  |
| LCP         | 6.6s     | -     | <2.5s  |
| TBT         | 24,010ms | -     | <200ms |
| Speed Index | 12.0s    | -     | <3.4s  |
| CLS         | 0        | -     | <0.1   |

### Bundle Analysis (Pre-optimization)

| Chunk                      | Size   | Gzip   | Loads On          |
| -------------------------- | ------ | ------ | ----------------- |
| admin-pages                | 371KB  | 76KB   | Admin only        |
| react-vendor               | 201KB  | 64KB   | Always            |
| analytics-vendor (PostHog) | 172KB  | 56KB   | Always (PROBLEM!) |
| ui-vendor (Radix)          | 163KB  | 48KB   | Always            |
| animation-vendor (Framer)  | 123KB  | 40KB   | Always            |
| form-vendor                | 89KB   | 24KB   | Always (PROBLEM!) |
| homepage                   | 58KB   | 15KB   | Homepage          |
| query-vendor               | 41KB   | 12KB   | Always            |
| icons-vendor               | 38KB   | 13KB   | Always            |
| ~15 common chunks          | ~500KB | ~170KB | Various           |

---

## Fixes Applied

### Fix 1: Lazy-load PostHog Analytics (Phase 1 - TBT)

- **File**: `client/src/main.tsx`
- **Issue**: PostHog (172KB) imported synchronously, blocks main thread
- **Fix**: Dynamic import after requestIdleCallback
- **Impact**: -172KB from initial bundle parse

### Fix 2: Move SW cleanup to non-blocking (Phase 1 - TBT)

- **File**: `client/index.html`
- **Issue**: Inline SW cleanup script blocks HTML parsing
- **Fix**: Defer execution, remove duplicate (also in main.tsx)
- **Impact**: Faster FCP, reduced TBT

### Fix 3: CSP Security Headers (Phase 3)

- **File**: `server/security/index.ts`
- **Issue**: Missing object-src 'none', upgrade-insecure-requests, nonces for inline scripts
- **Fix**: Add missing directives, tighten CSP
- **Impact**: Observatory B+ → A+

### Fix 4: Add preconnects and preloads (Phase 2 - LCP/FCP)

- **File**: `client/index.html`
- **Issue**: Missing preconnects to CDN, fonts
- **Fix**: Add rel=preconnect for critical origins
- **Impact**: Faster resource loading

### Fix 5: HSTS header fix (Phase 3)

- **File**: `server/security/index.ts`
- **Issue**: HSTS disabled, relying on Cloudflare only
- **Fix**: Enable with proper max-age, includeSubDomains, preload
- **Impact**: Observatory score improvement

### Fix 6: Permissions-Policy enhancement (Phase 3)

- **File**: `server/security/index.ts`
- **Issue**: Missing several permission restrictions
- **Fix**: Add comprehensive Permissions-Policy
- **Impact**: Security hardening

### Fix 7: Static asset caching (Phase 2/6)

- **File**: Server middleware
- **Issue**: Insufficient cache headers for static assets
- **Fix**: Immutable caching for hashed assets
- **Impact**: Repeat visit performance
