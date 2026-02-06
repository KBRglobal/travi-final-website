# TRAVI - Audit & Task Tracker

> **DELETE THIS FILE** when all tasks are completed and verified. This file is a temporary coordination document.

---

## IMPORTANT RULES FOR ALL TEAMMATES

### Git Workflow

- **Push directly to `main`** after each completed task — no branches, no PRs, no merge conflicts
- Use the GitHub token configured in the environment for pushing
- Commit message format: `[ROLE] Short description of what was done`
  - Example: `[SECURITY] Replace Math.random with crypto.randomBytes for recovery codes`
  - Example: `[FRONTEND] Lazy-load i18n language files`
- **After every task**: commit, push, then report completion

### DO NOT BREAK

- **Railway PostgreSQL** — the database runs on Railway. Do NOT modify `DATABASE_URL` or connection config in `server/db.ts` without explicit approval
- **Replit Secrets** — ALL API keys and secrets come from the Replit Secrets panel (environment variables). They are:
  - `DATABASE_URL` (Railway PostgreSQL)
  - `SESSION_SECRET`
  - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_GENAI_API_KEY`, `GROQ_API_KEY`
  - `RESEND_API_KEY`
  - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - `REPLIT_OBJECT_STORE_ID`
  - And other service keys
- **NEVER hardcode secrets** — always use `process.env.VARIABLE_NAME`
- **NEVER delete or modify `.replit` config** — it controls deployment
- **NEVER change the port** (5000) or deployment target
- **Test locally before pushing** — run `npm run check` (TypeScript) at minimum

### File Safety

- Read files before editing
- Keep backups of critical files mentally (know what you changed)
- If unsure about a change, ask the team lead first

---

## PROJECT OVERVIEW

**Project**: TRAVI — Dubai Travel Guide CMS
**Location**: `/Users/admin/travi-final-website/`
**Stack**: React 18.3.1 + Express.js + PostgreSQL (Railway) + Drizzle ORM
**Deployment**: Replit (autoscale)
**Repo**: Push via GitHub token (direct to main)

---

## FULL AUDIT RESULTS

### 1. SECURITY AUDIT (by Security Specialist)

**Overall**: Mature security posture with enterprise SecurityOS, but 3 critical findings.

#### CRITICAL

| ID   | Finding                                                                        | File                               | Line    | Status |
| ---- | ------------------------------------------------------------------------------ | ---------------------------------- | ------- | ------ |
| S-C1 | `.env` file has live Railway DB credentials exposed                            | `.env`                             | 14      | TODO   |
| S-C2 | Recovery codes generated with `Math.random()` (not cryptographically secure)   | `server/routes/security-routes.ts` | 339-342 | TODO   |
| S-C3 | Recovery codes stored in PLAINTEXT (comment says "hashed" but code stores raw) | `server/routes/security-routes.ts` | 345-346 | TODO   |

#### HIGH

| ID   | Finding                                                                                     | File                         | Line | Status |
| ---- | ------------------------------------------------------------------------------------------- | ---------------------------- | ---- | ------ |
| S-H1 | OIDC user upsert defaults new users to `admin` role                                         | `server/replitAuth.ts`       | 111  | TODO   |
| S-H2 | `DEV_AUTO_AUTH=true` bypass enabled by default in dev                                       | `.env.development`           | 420  | TODO   |
| S-H3 | `iframe` allowed in DOMPurify config — clickjacking risk                                    | `client/src/lib/sanitize.ts` | 39   | TODO   |
| S-H4 | Session `resave: true` causes race condition                                                | `server/replitAuth.ts`       | 63   | TODO   |
| S-H5 | Multiple routes missing auth middleware (`/api/admin/media`, `/api/translate`, `/api/chat`) | `server/routes.ts`           | 885+ | TODO   |

#### MEDIUM

| ID   | Finding                                                                     | File                                                    | Line    | Status |
| ---- | --------------------------------------------------------------------------- | ------------------------------------------------------- | ------- | ------ |
| S-M1 | Weak session secret in `.env.development`                                   | `.env.development`                                      | 32      | TODO   |
| S-M2 | CSP allows `unsafe-inline` and `unsafe-eval` (STRICT_CSP defaults false)    | `server/security/index.ts`                              | 195-196 | TODO   |
| S-M3 | `img-src` allows `http:` (non-HTTPS images)                                 | `server/security/index.ts`                              | 234     | TODO   |
| S-M4 | `style` attribute allowed in DOMPurify — CSS exfiltration risk              | `client/src/lib/sanitize.ts`                            | 52      | TODO   |
| S-M5 | SVG allowed in MIME types but not in magic bytes validation — inconsistency | `server/security.ts` / `server/security/file-upload.ts` | 597     | TODO   |
| S-M6 | Pre-auth token fallback to hardcoded secret                                 | `server/security/pre-auth-token.ts`                     | 105     | TODO   |

#### LOW

| ID   | Finding                                                    | File                                   | Line    | Status |
| ---- | ---------------------------------------------------------- | -------------------------------------- | ------- | ------ |
| S-L1 | Hardcoded allowed emails in OIDC auth                      | `server/replitAuth.ts`                 | 154-155 | TODO   |
| S-L2 | `dangerouslySetInnerHTML` in homepage without sanitization | `client/src/pages/homepage.tsx`        | 921     | TODO   |
| S-L3 | Verbose error responses in IDOR middleware                 | `server/middleware/idor-protection.ts` | 244-245 | TODO   |
| S-L4 | SQL injection regex has false positives for CMS content    | `server/security/index.ts`             | 25-40   | TODO   |

#### Positive Security Features (DO NOT REMOVE)

- Enterprise SecurityOS kernel with threat detection
- Pre-auth token pattern for MFA (HMAC signing + DB-backed)
- Dual lockout (IP + username) with sliding window
- Magic bytes file validation
- SSRF protection with private IP blocking
- Prototype pollution protection
- IDOR protection middleware with audit logging
- bcrypt with 12 salt rounds
- zxcvbn password strength validation (min score 3)
- IP blocking with exponential backoff
- CORS restricted (no wildcard)
- Security headers (Helmet, X-Frame-Options, Referrer-Policy)
- Device fingerprinting and contextual auth
- Emergency kill switch
- Optimistic locking middleware

---

### 2. QA / TEST COVERAGE AUDIT (by QA Engineer)

**Overall**: 6 test files with 108 test cases for 800+ source files. Coverage < 2%.

#### Current Test Files (all PASSING)

| File                                                        | Tests | Quality                              |
| ----------------------------------------------------------- | ----- | ------------------------------------ |
| `server/lib/__tests__/safe-error.test.ts`                   | 31    | EXCELLENT                            |
| `server/security/authority/__tests__/security-gate.test.ts` | 18    | EXCELLENT                            |
| `server/alerts/__tests__/alert-engine.test.ts`              | 7     | GOOD                                 |
| `server/intelligence/coverage/evaluator.test.ts`            | 7     | EXCELLENT                            |
| `server/routes/__tests__/file-upload-validation.test.ts`    | 18    | GOOD (but tests recreated functions) |
| `server/routes/__tests__/path-traversal-protection.test.ts` | 27    | GOOD (but tests recreated functions) |

#### Critical Coverage Gaps

| Category          | Source Files | Test Files | Coverage |
| ----------------- | ------------ | ---------- | -------- |
| Server Routes     | 84           | 0          | ~0%      |
| Server Services   | 30           | 0          | 0%       |
| Server Security   | 40+          | 1          | ~2%      |
| Server Lib        | 30+          | 1          | ~3%      |
| Client Components | 68           | 0          | 0%       |
| Client Pages      | 43           | 0          | 0%       |
| Client Hooks      | 10           | 0          | 0%       |
| Client Lib        | 10           | 0          | 0%       |
| Shared Schema     | 30+          | 0          | 0%       |

#### Test Infrastructure Issues

- `file-upload-validation.test.ts` and `path-traversal-protection.test.ts` recreate functions instead of importing from source
- No integration tests (no supertest)
- No E2E tests (no Playwright/Cypress)
- No React component tests (despite @testing-library/react being installed)
- No mock database layer
- No test factories/fixtures
- 50% coverage threshold in vitest.config.ts is aspirational (would fail if enforced)

#### Priority Testing Strategy

- **P0**: Auth routes, Zod schemas, sanitize.ts, sanitize-ai-output.ts, validators
- **P1**: Content CRUD routes (supertest), rate-limiter, password-policy, error-boundary component
- **P2**: Security modules, SSR renderers, client hooks
- **P3**: Page rendering tests, E2E setup

---

### 3. UX/UI AUDIT (by UX/UI Designer)

**Overall**: Strong design system with shadcn/ui + CSS variables. Accessibility issues.

#### Design System Strengths

- CSS variable system with light/dark mode (index.css:94-339)
- TRAVI brand tokens: `--travi-purple`, `--travi-orange`, `--travi-green`
- Dual font: Chillax (headings) + Satoshi (body) with font-display: swap
- shadcn/ui "new-york" style with proper aliases
- 7 button variants, 4 sizes
- Admin layout system with 6 patterns
- Skip link, focus-visible styles, RTL support

#### Issues

| Priority | Finding                                                            | File                                                        |
| -------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| P0       | Nested `<main>` elements (App.tsx + homepage.tsx) — violates HTML5 | `homepage.tsx:1547`, `App.tsx:248`                          |
| P0       | ErrorBoundary hardcoded English — breaks i18n                      | `error-boundary.tsx:59`                                     |
| P0       | Homepage hardcoded English strings (not using `t()`)               | `homepage.tsx:1176,1179,1217-1222,1226,1085,1588,1738`      |
| P1       | Duplicate navigation — homepage renders own header vs PublicNav    | `homepage.tsx:1452-1545`                                    |
| P1       | `#6443F4` used directly in 50+ places instead of design tokens     | Multiple files                                              |
| P1       | Inconsistent button patterns — inline gradients vs design system   | `homepage.tsx:975,1653,1856`                                |
| P1       | Duplicated animation CSS across 3 files                            | `homepage.tsx`, `destinations.tsx`, `destinations-hero.tsx` |
| P2       | Cookie consent banner missing ARIA roles                           | `cookie-consent-banner.tsx:41`                              |
| P2       | Live chat widget missing aria-labels and roles                     | `live-chat-widget.tsx:177,122,186,136`                      |
| P2       | Missing reduced motion on homepage animations                      | `homepage.tsx`                                              |
| P2       | SafeImage not used consistently — raw `<img>` tags                 | Multiple files                                              |
| P3       | Dialog overlay fully opaque                                        | `dialog.tsx:24`                                             |
| P3       | 10px/11px text sizes may fail WCAG AA                              | `homepage.tsx:956`                                          |
| P3       | NotFound game not accessible                                       | `not-found.tsx:22-403`                                      |
| P3       | Login form missing loading states and form semantics               | `login.tsx`                                                 |

---

### 4. FRONTEND ARCHITECTURE AUDIT (by Frontend Developer)

**Overall**: Good code splitting, but i18n bundle bloat and route explosion.

#### Issues

| Priority | Finding                                                             | File                                 |
| -------- | ------------------------------------------------------------------- | ------------------------------------ |
| CRITICAL | 28 language files loaded eagerly (~200KB+ JSON) — need lazy loading | `client/src/lib/i18n/config.ts:8-43` |
| HIGH     | 672 Route components (28 locales × 24 routes) — O(n) matching       | `App.tsx:196-212`                    |
| HIGH     | homepage.tsx is 1,870 lines with 8+ inline components               | `homepage.tsx`                       |
| HIGH     | Missing gzip/brotli compression plugin in Vite                      | `vite.config.ts`                     |
| MEDIUM   | No ErrorBoundary around PublicRouter                                | `App.tsx`                            |
| MEDIUM   | Zustand installed but unused (dead dependency)                      | `package.json`                       |
| MEDIUM   | useToast REMOVE_DELAY = 1,000,000ms (~16 minutes)                   | `use-toast.ts:9`                     |
| MEDIUM   | Dual meta tag management (useDocumentMeta vs react-helmet-async)    | Multiple                             |
| MEDIUM   | GTM ID hardcoded instead of env variable                            | `cookie-consent-context.tsx:23`      |
| LOW      | useIsMobile returns false on SSR/first render                       | `use-mobile.tsx:18`                  |
| LOW      | LOCALE_PREFIXES duplicated from SUPPORTED_LOCALES                   | `App.tsx:125-154`                    |
| LOW      | HashRedirect uses window.location.href (full reload)                | `App.tsx:73`                         |

#### Build Config Notes

- Terser minification with drop_console — good
- CSS code splitting enabled — good
- 15+ manual chunks strategy — good
- Chunk size limit 600KB — too generous
- Source maps disabled — makes prod debugging impossible
- Replit plugin always loaded even outside Replit

---

### 5. API DESIGN AUDIT (by API Architect)

**Overall**: Massive API with 200+ endpoints, but major consistency issues.

#### Issues

| Priority | Finding                                                       | Details                                                |
| -------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| CRITICAL | Dual route registration system                                | `routes.ts` AND `routes/index.ts` both register routes |
| CRITICAL | Swagger/OpenAPI completely disabled (stub)                    | `server/openapi/swagger-ui.ts` returns empty Router    |
| CRITICAL | 5+ different error response formats                           | No RFC 7807 compliance                                 |
| CRITICAL | 4 incompatible pagination patterns                            | limit+offset, page+pageSize, limit-only, offset-only   |
| HIGH     | ~85% endpoints have NO rate limiting                          | Including all public API                               |
| HIGH     | Most routes have NO input validation                          | Admin routes accept raw req.body                       |
| HIGH     | Inconsistent HTTP status codes                                | Some return 200 with error in body                     |
| HIGH     | Monolithic routes.ts (1,186 lines)                            | Inline handlers + business logic                       |
| MEDIUM   | No HATEOAS/Link headers                                       | No hypermedia                                          |
| MEDIUM   | Inconsistent naming (plural/singular, kebab/camel)            | URL conventions                                        |
| MEDIUM   | No standard response envelope                                 | Some raw arrays, some wrapped                          |
| MEDIUM   | GET /api/contents/:id/schema has NO AUTH                      | Exposes content schema                                 |
| MEDIUM   | POST /api/public/surveys/:slug/responses has NO rate limiting | Spam risk                                              |

#### API Versioning (GOOD)

- URL prefix `/api/v1/*` + Accept header support
- RFC 8594 Sunset header for deprecation
- `X-API-Version` response header
- Only v1 exists currently

#### Auth Middleware Hierarchy (GOOD)

- isAuthenticated → requireAuth → requirePermission → requireOwnContentOrPermission → requireOwnershipOrPermission → requireSelfOrAdmin → requireAdmin → adminAuthGuards

---

### 6. BACKEND ARCHITECTURE AUDIT (by Backend Developer)

**Overall**: Well-modularized with strong domain separation. Monitoring disabled.

#### Architecture Strengths

- Early-listen with deferred initialization pattern
- 38 focused schema modules
- 28 domain-specific storage files
- 6 background services with lifecycle management
- Graceful shutdown (multi-phase, 30s timeout)
- API versioning middleware
- Optimistic locking via ETag
- IDOR protection with audit logging

#### Issues

| Priority | Finding                                                         | File                                             |
| -------- | --------------------------------------------------------------- | ------------------------------------------------ |
| HIGH     | Monitoring completely disabled (stub/no-op)                     | `server/monitoring/index.ts`                     |
| HIGH     | Rate limiting in-memory only — won't work multi-instance        | `server/security.ts`                             |
| HIGH     | `requirePermission()` hits DB every call — needs caching        | `server/security.ts:469`                         |
| HIGH     | `GET /api/contents` fetches ALL contents with no pagination     | `content-crud-routes.ts:64`                      |
| MEDIUM   | Dual SIGINT/SIGTERM handlers may conflict                       | `server/db.ts:40-47` + `server/index.ts:594-665` |
| MEDIUM   | `ssl: { rejectUnauthorized: false }` on DB connection           | `server/db.ts:31`                                |
| MEDIUM   | Console.log override intercepts all output — performance impact | `server/console-logger.ts`                       |
| LOW      | Migration naming inconsistent (numbered + descriptive mix)      | `migrations/`                                    |
| LOW      | `server/index.ts` is 666 lines with inline sitemap HTML         | `server/index.ts`                                |
| LOW      | `security.ts` is 1,312 lines (partially split into security/)   | `server/security.ts`                             |

#### Database Config

- Pool: max 15, min 2, idle 30s, connect timeout 10s
- SSL with rejectUnauthorized: false (Railway internal)
- allowExitOnIdle: true

---

### 7. DEVOPS AUDIT (by DevOps Engineer)

**Overall**: Strong app-level infra, severely lacking operational infra.

#### What Works

- 3-tier health checks (healthz, health, comprehensive)
- Graceful shutdown with phased approach
- Env validation via env-validator.ts
- Static file caching strategy (immutable hashed assets)
- Husky pre-commit hooks (lint-staged + tsc)

#### Critical Gaps

| Component               | Status                                                                 | Priority |
| ----------------------- | ---------------------------------------------------------------------- | -------- |
| CI/CD Pipeline          | MISSING — zero GitHub Actions                                          | P0       |
| Database Backups        | STUB — all functions return `{ success: true }` without doing anything | P0       |
| Database Restore        | MISSING — referenced script doesn't exist                              | P0       |
| Monitoring/APM          | STUB — setupMonitoring() is a no-op                                    | P1       |
| Error Tracking          | MISSING — no Sentry/Bugsnag                                            | P1       |
| Docker/Containerization | MISSING — Replit vendor lock-in                                        | P1       |
| Structured Logging      | MISSING — uses console.log, pino in deps but unused                    | P2       |
| Node.js Version Pin     | MISSING — no .nvmrc (runtime v22, target v20, config v20 mismatch)     | P2       |
| Staging Environment     | Config only, no actual infra                                           | P1       |
| Log Aggregation         | MISSING                                                                | P1       |
| CDN                     | MISSING                                                                | P2       |
| Load Testing            | MISSING                                                                | P2       |
| Secret Management       | No vault/secrets manager                                               | P1       |

#### Build Issues

- Custom `scripts/build.ts` bypasses `vite.config.ts` due to Rollup circular dep bug
- Server bundle is 43MB — extremely large
- 150+ feature flags with no management system

---

### 8. RESPONSIVE DESIGN AUDIT (by Responsive Specialist)

**Overall**: Good Tailwind responsive utilities, missing responsive images.

#### What Works

- Correct viewport meta tags + PWA manifest
- Mobile-first approach throughout (stacking layouts)
- RTL support with comprehensive CSS rules
- Lazy loading + priority loading for hero images
- Reduced motion support via useReducedMotion()
- Sheet-based mobile navigation
- Touch-friendly button sizes

#### Issues

| Priority | Finding                                                               | File                            |
| -------- | --------------------------------------------------------------------- | ------------------------------- |
| HIGH     | No `srcset` or `<picture>` elements — mobile downloads desktop images | All image components            |
| HIGH     | DataTable has no mobile adaptation (no scroll, no card view)          | `data-table.tsx`                |
| MEDIUM   | Live Chat widget `w-80` overflows on 320px screens                    | `live-chat-widget.tsx:122`      |
| MEDIUM   | No custom breakpoint for small mobile (320-480px)                     | `tailwind.config.ts`            |
| MEDIUM   | Stats row can overflow on 320px                                       | `destinations-hero.tsx:281-313` |
| MEDIUM   | Section padding `lg:px-[140px]` too aggressive at 1024px              | `public-layout.tsx:86`          |
| LOW      | Fixed `gap-[30px]` in CategoryGrid not responsive                     | `public-layout.tsx:240`         |
| LOW      | Section vertical padding `py-[60px]` not responsive                   | `public-layout.tsx:82`          |
| LOW      | Some `ml`/`mr` instead of logical `ms`/`me` in RTL                    | Various files                   |
| LOW      | No fluid typography (clamp/calc)                                      | All typography                  |
| LOW      | Service Worker disabled — no offline PWA                              | `index.html:8-29`               |
| LOW      | DestinationHero `min-h-[700px]` overflows landscape mobile            | `DestinationHero.tsx:98`        |

---

### 9. SEO & AEO AUDIT (by SEO/AEO Specialist)

**Overall Score: 78/100** — Strong infrastructure, critical SSR gap.

#### Strengths

- 4-tier SEO validation system (publishing gate)
- AEO Answer Capsules (40-60 word AI summaries per content/locale)
- AI Crawler management (allow search bots, block training bots)
- 30-locale sitemap with hreflang + x-default
- llms.txt / ai-plugin.json for AI discoverability
- IndexNow integration for instant Bing indexing
- Tourism schema types (TouristAttraction, Hotel, Restaurant, Event)
- Citation tracking for AI platforms
- Content-Language headers + Vary: Accept-Language

#### Issues

| Priority | Finding                                                                   | File                                                                              |
| -------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| CRITICAL | SPA without SSR — crawlers see same meta on every page                    | `client/index.html`                                                               |
| CRITICAL | 3 conflicting robots.txt files with opposite policies                     | `public/robots.txt`, `client/public/robots.txt`, `server/aeo/aeo-static-files.ts` |
| CRITICAL | `dubai-keywords.ts` is empty stub — keyword strategy non-functional       | `shared/dubai-keywords.ts`                                                        |
| CRITICAL | IndexNow API key hardcoded in source code                                 | `server/routes/seo-routes.ts:377`                                                 |
| HIGH     | StructuredData injected via useEffect — invisible to non-JS crawlers      | `client/src/components/seo-head.tsx`                                              |
| HIGH     | Breadcrumbs component missing BreadcrumbList JSON-LD                      | `client/src/components/breadcrumbs.tsx`                                           |
| HIGH     | Duplicate WebSite JSON-LD (index.html + homepage component)               | `client/index.html:89-120`                                                        |
| HIGH     | No prerender/dynamic rendering for bot traffic                            | Server middleware                                                                 |
| HIGH     | Only English active in homepage language switcher (30 locales in sitemap) | `homepage.tsx`                                                                    |
| MEDIUM   | No canonical URL fallback in static HTML                                  | `client/index.html`                                                               |
| MEDIUM   | `maximum-scale=1` blocks user zoom — WCAG violation + Google flag         | `client/index.html:34`                                                            |
| MEDIUM   | Font preload uses TTF instead of WOFF2                                    | `client/index.html:37`                                                            |
| MEDIUM   | No hreflang tags in static HTML (only in sitemap)                         | `client/index.html`                                                               |
| MEDIUM   | Missing og:locale and og:locale:alternate                                 | `client/index.html`                                                               |
| MEDIUM   | Affiliate script from opaque domain `emrld.ltd`                           | `client/index.html:130-146`                                                       |
| LOW      | No `<noscript>` fallback content                                          | `client/index.html`                                                               |
| LOW      | SEO validation thresholds slightly too strict                             | `seo-validation-agent.ts`                                                         |

---

## TASK EXECUTION PLAN

### Phase 1: EMERGENCY (Week 1)

| Task                                                                       | Assignee       | Dependencies | Status |
| -------------------------------------------------------------------------- | -------------- | ------------ | ------ |
| 1.1 Add `.env.staging`, `.env.development` to `.gitignore`                 | DevOps         | None         | TODO   |
| 1.2 Replace `Math.random()` with `crypto.randomBytes()` for recovery codes | Security       | None         | TODO   |
| 1.3 Hash recovery codes with bcrypt before DB storage                      | Security       | 1.2          | TODO   |
| 1.4 Move IndexNow API key to env var                                       | SEO/AEO        | None         | TODO   |
| 1.5 Change OIDC default role from `admin` to `viewer`                      | Security       | None         | TODO   |
| 1.6 Add auth middleware to unprotected admin routes                        | Security + API | None         | TODO   |
| 1.7 Set up basic GitHub Actions CI (lint → typecheck → build)              | DevOps         | None         | TODO   |
| 1.8 Consolidate robots.txt to single dynamic source                        | SEO/AEO        | None         | TODO   |

### Phase 2: STABILITY (Week 2-3)

| Task                                                        | Assignee         | Dependencies | Status |
| ----------------------------------------------------------- | ---------------- | ------------ | ------ |
| 2.1 Lazy-load i18n language files (dynamic imports)         | Frontend         | None         | TODO   |
| 2.2 Fix route explosion — locale-aware router wrapper       | Frontend         | None         | TODO   |
| 2.3 Decompose homepage.tsx into modules                     | Frontend + UX/UI | None         | TODO   |
| 2.4 Remove duplicate `<main>` element from homepage         | UX/UI            | 2.3          | TODO   |
| 2.5 Fix ErrorBoundary i18n (wrap with functional component) | UX/UI            | None         | TODO   |
| 2.6 Translate hardcoded English strings in homepage         | UX/UI            | 2.3          | TODO   |
| 2.7 Implement real DB backup (pg_dump)                      | DevOps + Backend | None         | TODO   |
| 2.8 Activate monitoring (replace stub)                      | DevOps + Backend | None         | TODO   |
| 2.9 Unify error response format to RFC 7807                 | API + Backend    | None         | TODO   |
| 2.10 Standardize pagination pattern                         | API + Backend    | None         | TODO   |
| 2.11 Set `resave: false` in session config                  | Security         | None         | TODO   |
| 2.12 Remove `iframe` from DOMPurify allowed tags            | Security         | None         | TODO   |

### Phase 3: QUALITY (Week 3-5)

| Task                                                      | Assignee                 | Dependencies | Status |
| --------------------------------------------------------- | ------------------------ | ------------ | ------ |
| 3.1 Add P0 tests: auth routes, sanitize, Zod schemas      | QA                       | None         | TODO   |
| 3.2 Add integration tests with supertest for content CRUD | QA                       | 2.9          | TODO   |
| 3.3 Add responsive images (srcset/picture)                | Responsive + Frontend    | None         | TODO   |
| 3.4 Fix DataTable mobile adaptation                       | Responsive               | None         | TODO   |
| 3.5 Fix Live Chat widget overflow on 320px                | Responsive               | None         | TODO   |
| 3.6 Add ARIA roles to cookie consent banner               | UX/UI                    | None         | TODO   |
| 3.7 Add aria-labels to live chat widget                   | UX/UI                    | None         | TODO   |
| 3.8 Implement SSR/prerender for SEO                       | SEO + Frontend + Backend | None         | TODO   |
| 3.9 Fix StructuredData to use Helmet instead of useEffect | SEO + Frontend           | None         | TODO   |
| 3.10 Add BreadcrumbList JSON-LD to breadcrumbs component  | SEO                      | None         | TODO   |
| 3.11 Remove duplicate WebSite schema from index.html      | SEO                      | None         | TODO   |
| 3.12 Enable OpenAPI/Swagger documentation                 | API                      | None         | TODO   |
| 3.13 Add input validation (Zod) to admin routes           | API + Backend            | None         | TODO   |
| 3.14 Use design tokens instead of hardcoded `#6443F4`     | UX/UI + Frontend         | None         | TODO   |
| 3.15 Move shared animations to index.css                  | UX/UI + Frontend         | None         | TODO   |

### Phase 4: OPTIMIZATION (Week 5-8)

| Task                                                 | Assignee           | Dependencies | Status |
| ---------------------------------------------------- | ------------------ | ------------ | ------ |
| 4.1 Implement Redis-backed rate limiting             | Backend + Security | None         | TODO   |
| 4.2 Cache user roles in requirePermission()          | Backend            | None         | TODO   |
| 4.3 Add pagination to GET /api/contents              | Backend + API      | 2.10         | TODO   |
| 4.4 Reduce server bundle (43MB target → 10MB)        | DevOps             | None         | TODO   |
| 4.5 Add Dockerfile + docker-compose                  | DevOps             | None         | TODO   |
| 4.6 Add Sentry error tracking                        | DevOps             | None         | TODO   |
| 4.7 Populate dubai-keywords.ts with real data        | SEO                | None         | TODO   |
| 4.8 Add gzip/brotli compression plugin to Vite       | Frontend           | None         | TODO   |
| 4.9 Add .nvmrc with Node.js version                  | DevOps             | None         | TODO   |
| 4.10 Enable STRICT_CSP in production                 | Security           | None         | TODO   |
| 4.11 Remove `maximum-scale=1` from viewport meta     | Responsive + SEO   | None         | TODO   |
| 4.12 Add reduced motion to homepage animations       | UX/UI              | None         | TODO   |
| 4.13 Unify homepage nav with PublicNav component     | UX/UI + Frontend   | 2.3          | TODO   |
| 4.14 Convert font preload to WOFF2                   | SEO + Frontend     | None         | TODO   |
| 4.15 Fix useToast REMOVE_DELAY (16 min → reasonable) | Frontend           | None         | TODO   |
| 4.16 Remove unused Zustand dependency                | Frontend           | None         | TODO   |
| 4.17 Add ErrorBoundary around PublicRouter           | Frontend           | None         | TODO   |
| 4.18 Implement E2E tests with Playwright             | QA                 | 3.1          | TODO   |
| 4.19 Migrate console.log to pino structured logging  | Backend + DevOps   | None         | TODO   |
| 4.20 Add CDN (Cloudflare) for static assets          | DevOps             | None         | TODO   |

---

## COMPLETION TRACKING

- [ ] Phase 1: Emergency (0/8 tasks)
- [ ] Phase 2: Stability (0/12 tasks)
- [ ] Phase 3: Quality (0/15 tasks)
- [ ] Phase 4: Optimization (0/20 tasks)

**Total: 0/55 tasks completed**

---

> **REMINDER**: Delete this file when all phases are complete and verified.
