# Route Registration Status

This document tracks which route files are registered in the main `routes.ts` file and provides recommendations for unregistered route files.

**Last Updated:** 2026-01-01

---

## Summary

- **Total Route Files Found:** 110+
- **Registered and Active:** ~85
- **Unregistered (Not in routes.ts):** 7
- **Registered via index.ts (routes/):** 4

---

## Registered Routes

### Via Direct Registration Functions

These routes are registered using `register*Routes(app)` pattern:

- ✅ `auto-pilot-routes.ts` → `registerAutoPilotRoutes(app)`
- ✅ `automation-routes.ts` → `registerAutomationRoutes(app)`
- ✅ `content-intelligence-routes.ts` → `registerContentIntelligenceRoutes(app)`
- ✅ `customer-journey-routes.ts` → `registerCustomerJourneyRoutes(app)`
- ✅ `doc-upload-routes.ts` → `registerDocUploadRoutes(app)`
- ✅ `enhancement-routes.ts` → `registerEnhancementRoutes(app)`
- ✅ `enterprise-routes.ts` → `registerEnterpriseRoutes(app)`
- ✅ `feature-routes.ts` → `registerFeatureRoutes(app)`
- ✅ `page-builder-routes.ts` → `registerPageBuilderRoutes(app)`
- ✅ `site-config-routes.ts` → `registerSiteConfigRoutes(app)`
- ✅ `social-routes.ts` → `registerSocialRoutes(app)`
- ✅ `routes/admin/growth-routes.ts` → `registerGrowthRoutes(app)`
- ✅ `routes/image-routes.ts` → `registerImageRoutes(app)`
- ✅ `routes/log-routes.ts` → `registerLogRoutes(app)`
- ✅ `routes/qa-routes.ts` → `registerQaRoutes(app)`
- ✅ `routes/referral-routes.ts` → `registerReferralRoutes(app)`
- ✅ `routes/seo-routes.ts` → `registerSEORoutes(app)`
- ✅ `search/search-debug-routes.ts` → `registerSearchDebugRoutes(app)`
- ✅ `webhooks/reliable/admin-routes.ts` → `registerReliableWebhookAdminRoutes(app)`
- ✅ And ~60 more via various register functions...

### Via app.use() Pattern

These routes are registered using `app.use(path, ...middleware, router)`:

- ✅ `autonomy/control-plane/admin-routes.ts` → `app.use("/api/admin/autonomy/control-plane", ...)`
- ✅ `autonomy/policy/admin-routes.ts` → `app.use("/api/admin/autonomy", ...)`
- ✅ `help/admin-routes.ts` → `app.use("/api/admin/help", ...)`
- ✅ `help/public-routes.ts` → `app.use("/api/help", ...)`
- ✅ `routes/admin/jobs-routes.ts` → `app.use("/api/admin/jobs", ...)`
- ✅ `routes/admin/media-library-routes.ts` → `app.use("/api/admin/media", ...)`
- ✅ `go-live/routes.ts` → `app.use("/api/admin/go-live", ...)`
- ✅ `go-live-forensics/routes.ts` → `app.use("/api/ops/forensics", ...)`
- ✅ `continuous-readiness/routes.ts` → `app.use("/api/ops/readiness", ...)`
- ✅ `production-cutover/routes.ts` → `app.use("/api/ops/cutover", ...)`
- ✅ `blast-radius/routes.ts` → `app.use("/api/ops/blast-radius", ...)`
- ✅ `executive/go-live-report/routes.ts` → `app.use("/api/ops/executive/report", ...)`
- ✅ `pcal/routes.ts` → `app.use("/api/ops/pcal", ...)`
- ✅ And many more...

### Via registerAllRoutes() (in routes/index.ts)

These routes are registered through the `registerAllRoutes(app)` function:

- ✅ `routes/auth-routes.ts` → `registerAuthRoutes(app)`
- ✅ `routes/content-routes.ts` → `registerContentRoutes(app)`
- ✅ `routes/analytics-routes.ts` → `registerAnalyticsRoutes(app)`
- ✅ `routes/newsletter-routes.ts` → `registerNewsletterRoutes(app)`

---

## Unregistered Routes (Not in routes.ts)

### 1. `access-control/admin-routes.ts`

**Status:** ❌ NOT REGISTERED
**Feature Flag:** `ENABLE_RBAC=true`
**Endpoints:** `/api/admin/access-control/*`
**Purpose:** Role-based access control management

**Recommendation:** **REGISTER** - This appears to be a legitimate feature for RBAC. If RBAC is planned for production, this should be registered.

**Action Required:**
```typescript
import { accessControlRoutes } from "./access-control/admin-routes";
app.use("/api/admin/access-control", requireAuth, requirePermission("canEdit"), accessControlRoutes);
```

---

### 2. `ops/admin-routes.ts`

**Status:** ❌ NOT REGISTERED
**Purpose:** Operations & Reliability admin endpoints (incidents, release guards, AI failover, data integrity, snapshots)
**Endpoints:** `/api/admin/ops/*` (intended)

**Recommendation:** **REGISTER** - This consolidates ops features and should be registered if ops features are needed.

**Action Required:**
```typescript
import { opsAdminRoutes } from "./ops/admin-routes";
app.use("/api/admin/ops", requireAuth, requirePermission("canEdit"), opsAdminRoutes);
```

**Note:** Some ops routes are already registered individually (incidents, etc.), so verify no duplication.

---

### 3. `policies/admin-routes.ts`

**Status:** ❌ NOT REGISTERED
**Feature Flag:** `ENABLE_POLICY_ENFORCEMENT=true`
**Endpoints:** `/api/admin/policies/*`
**Purpose:** Policy management and enforcement

**Recommendation:** **REGISTER** - If policy enforcement is a planned feature, register this.

**Action Required:**
```typescript
import { policiesRoutes } from "./policies/admin-routes";
app.use("/api/admin/policies", requireAuth, requirePermission("canEdit"), policiesRoutes);
```

---

### 4. `revenue-intelligence/admin-routes.ts`

**Status:** ❌ NOT REGISTERED
**Feature Flag:** `ENABLE_MONETIZATION_DASHBOARD=true`
**Endpoints:** `/api/admin/monetization/*` (commercial zones, affiliate decisions, attribution tracking, revenue scoring)
**Purpose:** Monetization dashboard for revenue intelligence

**Recommendation:** **REGISTER** if monetization features are needed, otherwise **ARCHIVE**.

**Action Required:**
```typescript
import { monetizationRoutes } from "./revenue-intelligence/admin-routes";
app.use("/api/admin/monetization", requireAuth, requirePermission("canEdit"), monetizationRoutes);
```

---

### 5. `go-live-control-plane/api/routes.ts`

**Status:** ❌ NOT REGISTERED
**Feature Flag:** `ENABLE_GLCP=true`
**Endpoints:** `/api/ops/glcp/*` (intended)
**Purpose:** Go-Live Control Plane - Meta-orchestration system for platform go-live decisions

**Recommendation:** **KEEP AS EXPERIMENTAL** - This is a next-generation go-live system. See "Go-Live Systems Comparison" below.

---

### 6. `go-live-control-plane/enforcement/admin-routes.ts`

**Status:** ❌ NOT REGISTERED
**Feature Flag:** `ENABLE_GLCP=true`
**Endpoints:** `/api/admin/go-live/glcp/*` (intended)
**Purpose:** GLCP enforcement and admin interface

**Recommendation:** **KEEP AS EXPERIMENTAL** - Part of go-live-control-plane system.

---

### 7. `go-live-v2/routes.ts`

**Status:** ❌ NOT REGISTERED
**Feature Flag:** `ENABLE_GO_LIVE_V2=false`
**Endpoints:** (not specified)
**Purpose:** "Go-Live Switch v2" - Single endpoint that answers "Are we ready to go live?"

**Recommendation:** **KEEP AS EXPERIMENTAL** - See "Go-Live Systems Comparison" below.

---

## Go-Live Systems Comparison

There are **4 different go-live systems** in the codebase. Here's which one is authoritative:

### ✅ AUTHORITATIVE: `go-live/` (REGISTERED & ENABLED)

- **Status:** ✅ REGISTERED at `/api/admin/go-live`
- **Feature Flag:** `ENABLE_GO_LIVE_CHECKLIST=true`
- **Purpose:** System Readiness Gate - evaluates critical invariants (DB, event bus, search, AEO, sitemap, job queue, incidents)
- **Returns:** PASS/WARN/BLOCK status
- **Use Case:** Production readiness checks before launch

**This is the PRIMARY go-live system currently in use.**

---

### ⚠️ EXPERIMENTAL: `go-live-forensics/` (REGISTERED but DISABLED)

- **Status:** ✅ REGISTERED at `/api/ops/forensics` but feature is disabled
- **Feature Flag:** `ENABLE_GO_LIVE_FORENSICS=false`
- **Purpose:** Immutable timeline log of go-live decisions, approvals, overrides, and system events
- **Use Case:** Audit trail and forensic analysis of go-live events

**Recommendation:** This is a complementary system to `go-live/`. It can be enabled alongside the main go-live system for audit purposes. **KEEP**.

---

### ⚠️ EXPERIMENTAL: `go-live-v2/` (NOT REGISTERED, DISABLED)

- **Status:** ❌ NOT REGISTERED
- **Feature Flag:** `ENABLE_GO_LIVE_V2=false`
- **Purpose:** "Go-Live Switch v2" - simplified single endpoint
- **Use Case:** Possibly a simpler alternative to the main go-live system

**Recommendation:** This appears to be an experimental alternative. **KEEP AS EXPERIMENTAL** until decision is made on whether to adopt or remove.

---

### ⚠️ EXPERIMENTAL: `go-live-control-plane/` (NOT REGISTERED, DISABLED)

- **Status:** ❌ NOT REGISTERED (has 2 route files)
- **Feature Flag:** `ENABLE_GLCP=true` (but routes not wired)
- **Purpose:** Meta-orchestration system with:
  - System Capability Registry
  - Environment Readiness Evaluator
  - Feature Rollout Simulator
  - Safe Rollout Executor
  - Executive Go-Live API
- **Use Case:** Most sophisticated go-live system with simulation and orchestration

**Recommendation:** This is the most advanced system but not yet integrated. **KEEP AS EXPERIMENTAL** - appears to be future replacement for all go-live systems.

---

## Recommendations Summary

| Route File | Action | Priority | Reason |
|------------|--------|----------|---------|
| `access-control/admin-routes.ts` | **REGISTER** | Medium | Legitimate RBAC feature |
| `ops/admin-routes.ts` | **REGISTER** (after dedup check) | Medium | Consolidates ops features |
| `policies/admin-routes.ts` | **REGISTER** | Medium | Legitimate policy feature |
| `revenue-intelligence/admin-routes.ts` | **REGISTER or ARCHIVE** | Low | Depends on monetization needs |
| `go-live-control-plane/*` (2 files) | **KEEP EXPERIMENTAL** | N/A | Next-gen go-live system |
| `go-live-v2/routes.ts` | **KEEP EXPERIMENTAL** | N/A | Alternative go-live system |

---

## Action Items

### Completed Actions ✅

1. ✅ **Add deprecation/status comments** to experimental go-live route files:
   - `go-live-v2/routes.ts`
   - `go-live-control-plane/api/routes.ts`
   - `go-live-control-plane/enforcement/admin-routes.ts`
2. ✅ **Document go-live systems** (completed in this file)
3. ✅ **Create ROUTE_REGISTRATION_STATUS.md** documentation

### Short-term Actions (Medium Priority)

1. **Evaluate and register** legitimate unregistered routes:
   - `access-control/admin-routes.ts`
   - `policies/admin-routes.ts`
   - `ops/admin-routes.ts` (verify no duplication with existing routes)

2. **Decision on revenue-intelligence**: Register if needed, archive if not

### Long-term Actions (Low Priority)

3. **Make architectural decision** on go-live systems:
   - Choose between current `go-live/`, `go-live-v2/`, and `go-live-control-plane/`
   - Archive or remove the ones not chosen
   - Consider enabling `go-live-forensics/` for audit trail

---

## Notes

- This audit was performed on 2026-01-01
- Route files were identified by pattern: `*routes.ts` and `*-routes.ts`
- Test files and node_modules were excluded
- The main routes.ts file is **574KB** and contains all route registrations
- Some route files may be registered through module index files (e.g., `routes/index.ts`)
