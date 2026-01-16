# B. Backlog Lock (30 Items)

**Status:** LOCKED - No additions without Product Lead approval
**Execution Window:** 30 days

---

## Phase 1: Foundation (Days 1-10)

### PM-001: Complete Audit Logging Middleware

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/server/middleware/audit.ts` (create), `/server/routes.ts` (add middleware calls) |
| Do Not Touch | `/shared/schema.ts`, auth files, frontend |
| **Dependencies** | None |
| **Risk Level** | High |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Middleware logs: userId, action, entityType, entityId, oldValue, newValue, IP, timestamp |
| 2 | Applied to all POST/PUT/PATCH/DELETE in `/api/admin/*` |
| 3 | Logs write to `audit_logs` table |
| 4 | No performance degradation (< 50ms added latency) |
| 5 | Unit tests for middleware with 90% coverage |
| 6 | Integration test proves log written on content create |

---

### PM-002: Bulk Operations Dry-Run API

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/server/routes/bulk-operations.ts` (create), `/server/services/bulk.ts` (create) |
| Do Not Touch | Existing routes, schema, frontend |
| **Dependencies** | None |
| **Risk Level** | Critical |
| **Merge Strategy** | Feature flag: `ENABLE_BULK_DRY_RUN` |
| **Acceptance Criteria** | |
| 1 | `POST /api/admin/bulk/dry-run` accepts { action, itemIds } |
| 2 | Returns { preview: [{id, currentValue, newValue}], affectedCount, estimatedTime } |
| 3 | No data is modified during dry-run |
| 4 | Limit: max 500 items per request |
| 5 | Validates all items exist before preview |
| 6 | Returns 400 if any item would fail |
| 7 | Test: dry-run of 100 items returns in < 2s |

---

### PM-003: Bulk Operations Execute with Approval

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/server/routes/bulk-operations.ts`, `/server/services/bulk.ts` |
| Do Not Touch | Existing routes, schema, frontend |
| **Dependencies** | PM-002 |
| **Risk Level** | Critical |
| **Merge Strategy** | Feature flag: `ENABLE_BULK_EXECUTE` |
| **Acceptance Criteria** | |
| 1 | `POST /api/admin/bulk/execute` requires dryRunId from PM-002 |
| 2 | Items 1-9: execute immediately, audit logged |
| 3 | Items 10-99: require 2FA verification |
| 4 | Items 100+: require second admin approval |
| 5 | Creates rollback snapshot before execution |
| 6 | Rollback available for 24 hours via `POST /api/admin/bulk/:id/rollback` |
| 7 | Email notification on completion |

---

### PM-004: Protection Levels Middleware

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-3 |
| **Scope Boundaries** | |
| Touch | `/server/middleware/protection.ts` (create) |
| Do Not Touch | Auth files, existing middleware |
| **Dependencies** | PM-001 |
| **Risk Level** | High |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | `protectionLevel(0)` = no extra check |
| 2 | `protectionLevel(1)` = requires `X-Confirm: true` header |
| 3 | `protectionLevel(2)` = level 1 + audit log |
| 4 | `protectionLevel(3)` = level 2 + 2FA token required |
| 5 | `protectionLevel(4)` = level 3 + pending approval record |
| 6 | Returns 403 with clear message if check fails |
| 7 | Unit tests for each level |

---

### PM-005: Route Manifest Contract

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/shared/contracts/routes.ts` (create) |
| Do Not Touch | `/client/src/App.tsx`, existing routes |
| **Dependencies** | None |
| **Risk Level** | Medium |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | TypeScript interface `RouteDefinition { path, component, permissions, category }` |
| 2 | Export `ADMIN_ROUTES: RouteDefinition[]` with all 52 routes |
| 3 | Export `PUBLIC_ROUTES: RouteDefinition[]` with all public routes |
| 4 | Export `DEPRECATED_ROUTES: {from, to, until}[]` |
| 5 | Zod schema validates route definitions |
| 6 | No runtime code, only type definitions |

---

### PM-006: Navigation Schema Contract

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/shared/contracts/navigation.ts` (create) |
| Do Not Touch | Existing navigation components |
| **Dependencies** | PM-005 |
| **Risk Level** | Medium |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Interface `NavItem { id, label, icon, route, children?, permissions, category }` |
| 2 | Export `ADMIN_NAV_STRUCTURE` with 6 categories |
| 3 | Export `getNavForRole(role): NavItem[]` function |
| 4 | Viewer sees: Dashboard, Analytics (limited) |
| 5 | Editor sees: Dashboard, Content, SEO, Media, Analytics |
| 6 | Admin sees: All 6 categories |
| 7 | Unit test for each role's nav structure |

---

### PM-007: API Contracts for Critical Endpoints

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/shared/contracts/api.ts` (create) |
| Do Not Touch | Existing API implementations |
| **Dependencies** | None |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Zod schemas for request/response of: content CRUD, user CRUD, bulk ops |
| 2 | Export `ContentCreateRequest`, `ContentCreateResponse`, etc. |
| 3 | All schemas match current API behavior |
| 4 | TypeScript infers types from schemas |
| 5 | Documentation comments on each schema |

---

### PM-008: Redirect Middleware for Deprecated Routes

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-3 |
| **Scope Boundaries** | |
| Touch | `/server/middleware/redirects.ts` (create), `/server/index.ts` (add middleware) |
| Do Not Touch | Existing routes |
| **Dependencies** | PM-005 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Reads from `DEPRECATED_ROUTES` contract |
| 2 | Returns 301 redirect for deprecated routes |
| 3 | Logs redirect count for monitoring |
| 4 | `/privacy-policy` → `/privacy` |
| 5 | `/terms-conditions` → `/terms` |
| 6 | `/cookies` → `/cookie-policy` |
| 7 | Integration test verifies all redirects |

---

### PM-009: Sitemap Generator Update

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/server/services/sitemap.ts` (modify) |
| Do Not Touch | Frontend, schema |
| **Dependencies** | PM-005 |
| **Risk Level** | Medium |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Generates sitemap.xml with all PUBLIC_ROUTES |
| 2 | Includes all published content URLs |
| 3 | Excludes deprecated routes |
| 4 | Excludes `/admin/*` routes |
| 5 | Includes lastmod from content updatedAt |
| 6 | Regenerates on content publish |
| 7 | Accessible at `/sitemap.xml` |

---

### PM-010: Review Workflow Backend

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/server/services/review-workflow.ts` (create), `/server/routes/content.ts` (modify review endpoints) |
| Do Not Touch | Schema (already has status field), frontend |
| **Dependencies** | PM-001 |
| **Risk Level** | Critical |
| **Merge Strategy** | Feature flag: `ENABLE_REVIEW_WORKFLOW` |
| **Acceptance Criteria** | |
| 1 | `POST /api/admin/content/:id/submit-review` changes status to `in_review` |
| 2 | `POST /api/admin/content/:id/approve` requires Editor+ role, changes to `approved` |
| 3 | `POST /api/admin/content/:id/reject` requires Editor+, feedback mandatory (min 20 chars) |
| 4 | Reject changes status to `draft`, stores feedback |
| 5 | Only Author+ can submit for review |
| 6 | Notification created on each state change |
| 7 | Audit log for each transition |
| 8 | Cannot publish directly unless Admin (bypass flag) |

---

## Phase 2: Workflow & UI (Days 11-20)

### PM-011: Review Dashboard Component

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/client/src/components/admin/review/ReviewDashboard.tsx` (create), `/client/src/components/admin/review/ReviewItem.tsx` (create) |
| Do Not Touch | Existing components, App.tsx |
| **Dependencies** | PM-010 |
| **Risk Level** | Medium |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Displays list of items with status `in_review` |
| 2 | Shows: title, author, submitted date, content type |
| 3 | Sort by: date, priority, author |
| 4 | Filter by: content type |
| 5 | Click opens content in preview mode |
| 6 | Approve/Reject buttons visible for Editor+ |
| 7 | Reject shows feedback dialog |
| 8 | Responsive on tablet+ |

---

### PM-012: Version History Backend API

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/server/routes/versions.ts` (create), `/server/services/versioning.ts` (create) |
| Do Not Touch | Schema (content_versions exists) |
| **Dependencies** | PM-001 |
| **Risk Level** | Medium |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | `GET /api/admin/content/:id/versions` returns version list |
| 2 | `GET /api/admin/content/:id/versions/:versionId` returns full snapshot |
| 3 | `GET /api/admin/content/:id/versions/:v1/diff/:v2` returns diff |
| 4 | `POST /api/admin/content/:id/rollback/:versionId` restores content |
| 5 | Rollback creates new version (not destructive) |
| 6 | Rollback requires protection level 2 |
| 7 | Version created on every save (debounced 30s) |

---

### PM-013: Version History UI Component

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/client/src/components/admin/versions/VersionHistory.tsx` (create), `/client/src/components/admin/versions/VersionDiff.tsx` (create) |
| Do Not Touch | Existing editor components |
| **Dependencies** | PM-012 |
| **Risk Level** | Medium |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Panel shows version list with: number, date, author |
| 2 | Click version shows preview |
| 3 | "Compare" button shows side-by-side diff |
| 4 | "Restore" button with confirmation dialog |
| 5 | Diff highlights additions (green) and deletions (red) |
| 6 | Pagination if > 20 versions |
| 7 | Loading states for async operations |

---

### PM-014: Notification System Backend

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-3 |
| **Scope Boundaries** | |
| Touch | `/server/services/notifications.ts` (create), `/server/routes/notifications.ts` (create) |
| Do Not Touch | Schema (notifications table exists) |
| **Dependencies** | PM-010 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | `GET /api/admin/notifications` returns user's unread notifications |
| 2 | `POST /api/admin/notifications/:id/read` marks as read |
| 3 | `POST /api/admin/notifications/read-all` marks all as read |
| 4 | Notification created on: review submitted, approved, rejected, published |
| 5 | Notification includes: type, title, message, actionUrl, createdAt |
| 6 | Email sent for high-priority notifications |
| 7 | Notifications auto-expire after 30 days |

---

### PM-015: Admin Navigation Restructure

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/client/src/components/admin/navigation/AdminNav.tsx` (create or heavily modify) |
| Do Not Touch | Route implementations, existing pages |
| **Dependencies** | PM-006 |
| **Risk Level** | High |
| **Merge Strategy** | Feature flag: `ENABLE_NEW_NAV` |
| **Acceptance Criteria** | |
| 1 | 6 category sections: Content, SEO, Media, Governance, Analytics, System |
| 2 | Collapsible sections with icons |
| 3 | Role-based visibility per PM-006 |
| 4 | Current route highlighted |
| 5 | Badge count for pending reviews (Editors) |
| 6 | Mobile: hamburger menu with slide-out |
| 7 | Keyboard accessible |
| 8 | Persists collapsed state in localStorage |

---

### PM-016: Content Hub Page

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-3 |
| **Scope Boundaries** | |
| Touch | `/client/src/pages/admin/content/index.tsx` (create) |
| Do Not Touch | Existing content list pages |
| **Dependencies** | PM-015 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Gateway page for Content category |
| 2 | Cards for: Destinations, Articles, Attractions, Hotels, Dining, Events, Districts, Pages, AI Tools |
| 3 | Each card shows: name, icon, item count, last updated |
| 4 | Click navigates to respective list |
| 5 | Quick action buttons: New Article, New Attraction |
| 6 | Responsive grid layout |

---

### PM-017: SEO Hub Page

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-3 |
| **Scope Boundaries** | |
| Touch | `/client/src/pages/admin/seo/index.tsx` (create) |
| Do Not Touch | Existing SEO pages |
| **Dependencies** | PM-015 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Gateway page for SEO category |
| 2 | Cards for: Keywords, Audit, AEO, Translations, Intelligence |
| 3 | Summary metrics: avg SEO score, content needing attention, translation coverage |
| 4 | Alert section for SEO issues (low scores, missing meta) |
| 5 | Quick actions: Run Audit, Check Coverage |

---

### PM-018: Governance Hub Page

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-3 |
| **Scope Boundaries** | |
| Touch | `/client/src/pages/admin/governance/index.tsx` (create) |
| Do Not Touch | Existing governance pages |
| **Dependencies** | PM-015 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Gateway page for Governance category (Admin only) |
| 2 | Cards for: Users, Audit Logs, Security |
| 3 | Summary: total users, active sessions, recent audit events |
| 4 | Quick actions: Invite User, View Recent Activity |
| 5 | Alert for security events (failed logins, etc) |

---

### PM-019: Dining Route Fix

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/server/routes/dining.ts`, `/client/src/pages/public-dining.tsx` |
| Do Not Touch | Schema, other routes |
| **Dependencies** | None |
| **Risk Level** | Medium |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | `/dining` returns published dining content only |
| 2 | `/dining/:slug` returns single dining item |
| 3 | Filter by cuisine type working |
| 4 | Filter by district working |
| 5 | Map view toggle functional |
| 6 | Related dining shows correctly |
| 7 | SEO meta tags present |

---

### PM-020: News Page Consolidation

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/client/src/pages/public-news.tsx`, `/client/src/pages/public-articles.tsx` |
| Do Not Touch | API routes, schema |
| **Dependencies** | None |
| **Risk Level** | Medium |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | `/news` shows articles with category "news" |
| 2 | `/articles` shows all other articles |
| 3 | Shared article card component |
| 4 | Consistent pagination |
| 5 | Filter by date range |
| 6 | Sort by: date, popularity |
| 7 | No duplicate content between pages |

---

## Phase 3: Cleanup & Stability (Days 21-30)

### PM-021: Dubai Routes Consolidation

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/client/src/pages/destination-dubai.tsx`, related Dubai pages |
| Do Not Touch | Other destination pages |
| **Dependencies** | PM-005, PM-008 |
| **Risk Level** | High |
| **Merge Strategy** | Staged merge - backup old pages |
| **Acceptance Criteria** | |
| 1 | Single `/dubai` entry point |
| 2 | Sub-routes: `/dubai/attractions`, `/dubai/hotels`, `/dubai/dining`, `/dubai/districts` |
| 3 | Old routes redirect to new structure |
| 4 | All content accessible |
| 5 | SEO preserved (canonical URLs) |
| 6 | Internal links updated |
| 7 | Sitemap reflects new structure |

---

### PM-022: Guides Content-First UX

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/client/src/pages/help/*`, `/client/src/components/help/*` |
| Do Not Touch | API routes |
| **Dependencies** | None |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Help center shows content above navigation |
| 2 | Search bar prominent at top |
| 3 | Popular articles shown first |
| 4 | Categories collapsible |
| 5 | Article pages have clear back navigation |
| 6 | Related articles shown at bottom |
| 7 | Print-friendly article view |

---

### PM-023: Delete Deprecated Route Files

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | Delete files per 14-DEPRECATION-AND-DELETE.md |
| Do Not Touch | Files not in deprecation list |
| **Dependencies** | PM-008, PM-021 |
| **Risk Level** | Medium |
| **Merge Strategy** | Isolated branch, require verification |
| **Acceptance Criteria** | |
| 1 | Delete `/client/src/pages/coming-soon.tsx` |
| 2 | Delete duplicate page files (site-settings, homepage-promotions, etc) |
| 3 | No broken imports after deletion |
| 4 | Tests updated to remove references |
| 5 | Build succeeds |
| 6 | All redirects in place before deletion |

---

### PM-024: Delete Deprecated API Endpoints

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/server/routes.ts` (remove deprecated sections), relevant service files |
| Do Not Touch | Active endpoints |
| **Dependencies** | PM-008 |
| **Risk Level** | Medium |
| **Merge Strategy** | Isolated branch, require verification |
| **Acceptance Criteria** | |
| 1 | Remove `/api/admin/settings/legacy` |
| 2 | Remove `/api/admin/content/quick-publish` |
| 3 | Merge `/api/admin/site-settings` into `/api/admin/settings` |
| 4 | No 404s on active routes |
| 5 | Integration tests pass |
| 6 | Consumers migrated before deletion |

---

### PM-025: Admin Security - No Public Index

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-3 |
| **Scope Boundaries** | |
| Touch | `/server/middleware/admin-protection.ts` (create), `/server/index.ts` |
| Do Not Touch | Auth system |
| **Dependencies** | PM-004 |
| **Risk Level** | High |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | All `/admin/*` routes require authentication |
| 2 | Unauthenticated requests to admin return 401 (not 302) |
| 3 | Admin routes not indexed (X-Robots-Tag: noindex) |
| 4 | Admin routes blocked in robots.txt |
| 5 | Rate limiting on admin login: 5 attempts/minute |
| 6 | Session timeout: 24 hours |
| 7 | Activity logged on admin access |

---

### PM-026: Role-Based Content Visibility

| Field | Value |
|-------|-------|
| **Owner Agent** | BACKEND-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/server/services/content.ts`, `/server/middleware/content-access.ts` (create) |
| Do Not Touch | Schema, auth |
| **Dependencies** | PM-004 |
| **Risk Level** | High |
| **Merge Strategy** | Feature flag: `ENABLE_CONTENT_VISIBILITY` |
| **Acceptance Criteria** | |
| 1 | Viewer: sees published content only |
| 2 | Contributor: sees own drafts + published |
| 3 | Author: sees own content (all statuses) + published |
| 4 | Editor: sees all content |
| 5 | Admin: sees all content including deleted |
| 6 | API enforces visibility (not just UI) |
| 7 | Test for each role |

---

### PM-027: Integration Test Suite for Workflows

| Field | Value |
|-------|-------|
| **Owner Agent** | QA-AGENT-1 |
| **Scope Boundaries** | |
| Touch | `/tests/integration/workflow.test.ts` (create) |
| Do Not Touch | Source code |
| **Dependencies** | PM-010, PM-012, PM-014 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Test: Draft → Submit → Approve → Publish flow |
| 2 | Test: Draft → Submit → Reject → Edit → Resubmit flow |
| 3 | Test: Version created on publish |
| 4 | Test: Notification sent on each transition |
| 5 | Test: Permissions enforced (Author cannot approve) |
| 6 | Test: Rollback creates new version |
| 7 | All tests run in < 60 seconds |

---

### PM-028: E2E Test Suite for Admin Navigation

| Field | Value |
|-------|-------|
| **Owner Agent** | QA-AGENT-2 |
| **Scope Boundaries** | |
| Touch | `/tests/e2e/admin-nav.test.ts` (create) |
| Do Not Touch | Source code |
| **Dependencies** | PM-015 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Test: All 6 categories render for Admin |
| 2 | Test: Viewer only sees Dashboard, Analytics |
| 3 | Test: Editor sees Content, SEO, Media, Analytics |
| 4 | Test: Navigation collapse persists on reload |
| 5 | Test: Mobile menu opens/closes |
| 6 | Test: All nav links resolve (no 404) |

---

### PM-029: Metrics Dashboard Implementation

| Field | Value |
|-------|-------|
| **Owner Agent** | FRONTEND-AGENT-3 |
| **Scope Boundaries** | |
| Touch | `/client/src/pages/admin/analytics/metrics.tsx` (create) |
| Do Not Touch | Existing analytics pages |
| **Dependencies** | PM-001 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | Dashboard shows: Quality Score, Velocity, Adoption |
| 2 | Chart: Content published over time (30 days) |
| 3 | List: Top issues (pending review, low SEO) |
| 4 | List: Recent activity |
| 5 | Data refreshes every 5 minutes |
| 6 | Export to CSV button |

---

### PM-030: Documentation Update

| Field | Value |
|-------|-------|
| **Owner Agent** | CONTENT-AGENT |
| **Scope Boundaries** | |
| Touch | `/docs/api/*`, `/docs/features/*`, `/docs/getting-started/*` |
| Do Not Touch | Product docs, ADRs |
| **Dependencies** | PM-010, PM-012, PM-015 |
| **Risk Level** | Low |
| **Merge Strategy** | Safe |
| **Acceptance Criteria** | |
| 1 | API docs updated for new endpoints (review, versions, bulk) |
| 2 | Feature docs updated for review workflow |
| 3 | Getting started updated with new nav structure |
| 4 | Screenshots updated |
| 5 | Changelog updated |
| 6 | All code examples tested |

---

## Summary

| Phase | Items | Days |
|-------|-------|------|
| Phase 1: Foundation | PM-001 to PM-010 | 1-10 |
| Phase 2: Workflow & UI | PM-011 to PM-020 | 11-20 |
| Phase 3: Cleanup & Stability | PM-021 to PM-030 | 21-30 |

| Risk Level | Count |
|------------|-------|
| Critical | 4 |
| High | 7 |
| Medium | 11 |
| Low | 8 |
