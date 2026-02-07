# TRAVI Performance Fix Tracker

## Baseline (Feb 7, 2026)

| Metric               | Current  | Target   |
| -------------------- | -------- | -------- |
| Performance (Mobile) | 31       | 90+      |
| FCP                  | 3.6s     | <1.8s    |
| LCP                  | 6.6s     | <2.5s    |
| TBT                  | 24,010ms | <200ms   |
| Speed Index          | 12.0s    | <3.4s    |
| CLS                  | 0        | <0.1     |
| Observatory          | B+ (80)  | A+ (95+) |
| Accessibility        | 91       | 98+      |
| SEO                  | 92       | 100      |
| Best Practices       | 92       | 100      |

## Fixes Applied

### Phase 1: TBT & Bundle (Agent: @perf-bundle)

- [ ] Analyze and optimize bundle chunks
- [ ] Remove unused dependencies
- [ ] Optimize barrel imports
- [ ] Tree-shake icon imports

### Phase 2: FCP/LCP & Render (Agent: @perf-render)

- [ ] Fix render-blocking resources in index.html
- [ ] Preload LCP image
- [ ] Optimize font loading
- [ ] Add preconnects
- [ ] Defer non-critical scripts

### Phase 3: Security Headers (Agent: @security)

- [ ] Fix CSP (remove unsafe-inline from script-src)
- [ ] Configure HSTS properly
- [ ] Add Permissions-Policy
- [ ] Set cache headers

### Phase 4: Accessibility (Agent: @a11y)

- [ ] Fix ARIA id associations
- [ ] Fix definition list structure
- [ ] Fix touch target sizes (44x44px min)
- [ ] Add missing alt text
- [ ] Fix heading hierarchy

### Phase 5: SEO (Agent: @seo)

- [ ] Fix robots.txt syntax
- [ ] Fix hreflang implementation
- [ ] Create/fix sitemap.xml
- [ ] Add canonical URLs
- [ ] Fix crawlability issues

## Rules

- `npm run check` must pass after every change
- Commit after each fix
- Do NOT change visual design
- Do NOT change routes or data structures
