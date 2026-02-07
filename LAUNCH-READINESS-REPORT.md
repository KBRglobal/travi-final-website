# Launch Readiness Report

## Date: 2026-02-07

## Branch: launch-fix

### Critical Checks

- [x] npm run check: 0 errors
- [x] /api/public/destinations: 17 destinations with descriptions
- [x] /api/public/attractions: 3,408+ attractions with names
- [x] Tiqets product URLs present (3,408 with product_url)
- [x] Login works without Replit (standalone auth PRIMARY)
- [x] Admin user exists (admin / 1c932a80)
- [ ] Health endpoints return 200 — NOT VERIFIED (requires running server)
- [ ] Memory under 80% — NOT VERIFIED (requires running server)
- [x] Zero orphaned translations
- [x] Zero NULL fingerprints
- [x] All 17 destination pages have content (descriptions + highlights)
- [x] Hero images on all 17 destinations
- [x] 5 published articles
- [x] SEO meta tags on all 17 destinations (meta_title present)
- [ ] No Replit domains in CORS config — ISSUE: `https://replit.com` still in CSP script-src (server/security/index.ts:188)
- [x] No exposed secrets in client code (only placeholders like "sk-..." in form fields)
- [ ] All admin routes require auth — ISSUE: 7 admin routes missing auth middleware (see below)
- [x] No duplicate route registrations (cleaned by @route-surgeon)

### Security Issues Found

#### 1. Replit domain in CSP (LOW)

`server/security/index.ts:188` still includes `https://replit.com` in the CSP `script-src` directive. This allows Replit scripts to execute on the production site. Should be removed if not deploying on Replit.

#### 2. Admin routes without auth middleware (MEDIUM)

The following admin routes lack `requireAuth` or `isAuthenticated` middleware:

| File                                            | Route                                   | Method |
| ----------------------------------------------- | --------------------------------------- | ------ |
| server/routes/guides-routes.ts:219              | /api/admin/guides/import-wikivoyage     | POST   |
| server/routes/guides-routes.ts:247              | /api/admin/guides/import-all-wikivoyage | POST   |
| server/routes/guides-routes.ts:261              | /api/admin/guides/wikivoyage-status     | GET    |
| server/routes/destination-content-routes.ts:886 | /api/admin/destinations/:slug/mobility  | GET    |
| server/routes/destination-content-routes.ts:926 | /api/admin/destinations/:slug/mobility  | PUT    |
| server/routes/admin/tiqets-routes.ts:1110       | /api/admin/tiqets/octypo-status         | GET    |
| server/routes/admin/tiqets-routes.ts:1145       | /api/admin/tiqets/generation-progress   | GET    |

#### 3. Replit references in production code (INFO)

Replit-related code exists throughout the server (auth fallback, AI providers, deployment checks). This is expected since:

- Auth: Replit OIDC is fallback-only, gated behind `process.env.REPL_ID`
- AI providers: Replit AI is last-resort fallback
- Deployment checks: Use `REPLIT_DEPLOYMENT` env var for conditional behavior

No hardcoded API keys or secrets were found in client code.

#### 4. Client-side Replit references (INFO)

- `client/src/pages/login.tsx:78` — "Secure authentication via Replit" text (cosmetic)
- `client/src/pages/settings.tsx:175` — "OpenAI is configured via Replit AI Integrations" text (cosmetic)
- `client/src/lib/analytics.ts:2` — Comment referencing Replit blueprint

### Database Verification

| Check                                 | Expected | Actual           | Status |
| ------------------------------------- | -------- | ---------------- | ------ |
| Active destinations with descriptions | 17       | 17               | PASS   |
| Total attractions                     | 3,408    | 3,408            | PASS   |
| Published tiqets attractions          | 3,408    | 3,408            | PASS   |
| Published articles                    | 5        | 5                | PASS   |
| Orphaned translations                 | 0        | 0                | PASS   |
| NULL fingerprints                     | 0        | 0                | PASS   |
| Admin user exists                     | yes      | yes (role=admin) | PASS   |
| Destinations with hero images         | 17       | 17               | PASS   |
| Destinations with SEO meta            | 17       | 17               | PASS   |
| Tiqets with product URLs              | 3,408    | 3,408            | PASS   |

### TypeScript Health

- `npm run check`: **0 errors** (verified twice)

### Verdict: READY (with caveats)

The system is functionally ready for launch. All data is in place, TypeScript compiles cleanly, auth is standalone-first, and content is seeded.

**Before going fully live, fix these:**

1. **(MEDIUM)** Add auth middleware to 7 unprotected admin routes
2. **(LOW)** Remove `https://replit.com` from CSP if not deploying on Replit
3. **(LOW)** Update cosmetic Replit text in login.tsx and settings.tsx

### Remaining issues (if any):

1. 7 admin routes missing auth middleware (guides, mobility, tiqets status)
2. Replit CSP origin still present in security/index.ts
3. Health/memory checks require a running server instance to verify
4. Tracker tasks 1.4 (locale enum) and 1.5 (sessions table) marked as TBD

### Commit Log (7 commits on launch-fix):

| #   | Hash    | Agent           | Message                                                                                                        |
| --- | ------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | 0cb47b7 | @orphan-cleaner | Archive orphaned data, add ghost tables to Drizzle schema                                                      |
| 2   | c088621 | @memory-ops     | Lazy-load AI SDKs, fix health endpoints, delay non-critical services                                           |
| 3   | 0fd515b | @route-surgeon  | Remove duplicate routes, add auth to unguarded admin endpoints                                                 |
| 4   | 9b7356b | @auth-surgeon   | Normalize trailing commas in replitAuth.ts                                                                     |
| 5   | 1320763 | @schema-doctor  | Sync Drizzle schema with live DB — fix destinations id type, add 42 missing columns, fix broken module imports |
| 6   | c0fe79c | @data-linker    | Sync 3,408 tiqets attractions to contents + attractions tables                                                 |
| 7   | a57551c | @content-primer | Enrich 17 destinations with descriptions, SEO meta, highlights, and 5 seed articles                            |
