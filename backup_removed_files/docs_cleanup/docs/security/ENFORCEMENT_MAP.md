# Security Gate Enforcement Map

**Version:** 1.0
**Created:** 2025-01-01
**Status:** ACTIVE WIRING PHASE

This document maps all critical actions that MUST pass through the Security Gate before execution.

---

## Overview

The Security Gate (`server/security/gate/security-gate.ts`) is the **single enforcement point** for all critical operations. Every action listed below must call `assertAllowed()` before execution.

---

## Critical Actions Matrix

### A. Content Publish / Unpublish

| File | Function/Endpoint | Action | Resource | Risk if Missed |
|------|-------------------|--------|----------|----------------|
| `server/routes.ts:12765` | `POST /api/layouts/:slug/publish` | `publish` | `content` | 🔴 CRITICAL - Unapproved content goes live |
| `server/routes.ts:10787` | `POST /api/newsletter/send` | `publish` | `content` | 🔴 CRITICAL - Mass email without approval |

**Choke Point Strategy:** Single middleware at route level

```typescript
// Wiring point
securityGateMiddleware("publish", "content")
```

---

### B. Content Delete (Hard/Soft)

| File | Function/Endpoint | Action | Resource | Risk if Missed |
|------|-------------------|--------|----------|----------------|
| `server/routes.ts:4945` | `DELETE /api/contents/:id` | `delete` | `content` | 🔴 CRITICAL - Data loss |
| `server/storage.ts:2043` | `bulkDeleteContents()` | `bulk_delete` | `content` | 🔴 CRITICAL - Mass data loss |

**Choke Point Strategy:** Wire at route handler, storage layer already covered by bulk wrapper

```typescript
// Wiring point
securityGateMiddleware("delete", "content")
```

---

### C. Bulk Operations

| File | Function/Endpoint | Action | Resource | Risk if Missed |
|------|-------------------|--------|----------|----------------|
| `server/routes.ts:12099` | `POST /api/contents/bulk-status` | `bulk_update` | `content` | 🟡 HIGH - Mass status change |
| `server/routes.ts:12116` | `POST /api/contents/bulk-delete` | `bulk_delete` | `content` | 🔴 CRITICAL - Mass deletion |
| `server/routes.ts:12134` | `POST /api/contents/bulk-add-tag` | `bulk_update` | `content` | 🟢 MEDIUM - Metadata only |
| `server/routes.ts:12151` | `POST /api/contents/bulk-remove-tag` | `bulk_update` | `content` | 🟢 MEDIUM - Metadata only |
| `server/routes.ts:8428` | `POST /api/keywords/bulk-import` | `bulk_update` | `keywords` | 🟡 HIGH - Data injection |
| `server/routes.ts:8778` | `POST /api/users/bulk-delete` | `bulk_delete` | `users` | 🔴 CRITICAL - User removal |

**Choke Point Strategy:** Create `bulkOperationGuard` adapter middleware

```typescript
// Single adapter for all bulk endpoints
app.use("/api/*/bulk-*", bulkOperationGuard);
```

---

### D. Governance Changes (Roles/Permissions/Policies)

| File | Function/Endpoint | Action | Resource | Risk if Missed |
|------|-------------------|--------|----------|----------------|
| `server/access-control/admin-routes.ts:52` | `POST /roles/:roleId/permissions` | `manage_roles` | `roles` | 🔴 CRITICAL - Privilege escalation |
| `server/access-control/admin-routes.ts:67` | `DELETE /permissions/:id` | `manage_roles` | `roles` | 🔴 CRITICAL - Access revocation |
| `server/access-control/admin-routes.ts:82` | `POST /users/:userId/roles` | `manage_users` | `users` | 🔴 CRITICAL - Role assignment |
| `server/permissions/routes.ts:61` | `POST /roles` | `manage_roles` | `roles` | 🔴 CRITICAL - Role creation |
| `server/permissions/routes.ts:86` | `PUT /roles/:roleId` | `manage_roles` | `roles` | 🔴 CRITICAL - Role modification |
| `server/permissions/routes.ts:106` | `DELETE /roles/:roleId` | `manage_roles` | `roles` | 🔴 CRITICAL - Role deletion |
| `server/governance/routes.ts:480` | `POST /approvals/create` | `manage_policies` | `policies` | 🟡 HIGH - Workflow manipulation |
| `server/governance/routes.ts:516` | `POST /approvals/:id/decide` | `approve` | `policies` | 🔴 CRITICAL - Approval bypass |

**Choke Point Strategy:** Wire at each governance route file entry point

```typescript
// server/access-control/admin-routes.ts - add at router creation
router.use(governanceGuard);

// server/permissions/routes.ts - add at router creation
router.use(governanceGuard);
```

---

### E. Autonomy Mode Changes

| File | Function/Endpoint | Action | Resource | Risk if Missed |
|------|-------------------|--------|----------|----------------|
| `server/security/autonomy/autonomy-controller.ts:529` | `POST /override/:system` | `autonomy_change` | `autonomy` | 🔴 CRITICAL - Bypass security |
| `server/security/autonomy/autonomy-controller.ts:556` | `DELETE /override/:system` | `autonomy_change` | `autonomy` | 🟡 HIGH - State change |
| `server/autonomy/control-plane/admin-routes.ts:273` | `POST /override` | `autonomy_change` | `autonomy` | 🔴 CRITICAL - Policy bypass |
| `server/autonomy/control-plane/admin-routes.ts:297` | `DELETE /overrides/:id` | `autonomy_change` | `autonomy` | 🟡 HIGH - State change |

**Choke Point Strategy:** Already controlled via `autonomyController` - add Security Gate check

```typescript
// Already has single choke point in setManualOverride()
// Wire assertAllowed() inside the method
```

---

### F. Data Export / Compliance Export

| File | Function/Endpoint | Action | Resource | Risk if Missed |
|------|-------------------|--------|----------|----------------|
| `server/exports/routes.ts:63` | `GET /contents.csv` | `export` | `content` | 🔴 CRITICAL - Data exfil |
| `server/exports/routes.ts:92` | `GET /contents.json` | `export` | `content` | 🔴 CRITICAL - Data exfil |
| `server/exports/routes.ts:120` | `GET /entities/:type.csv` | `export` | `entity` | 🔴 CRITICAL - Data exfil |
| `server/routes.ts:12168` | `GET /contents/export` | `export` | `content` | 🔴 CRITICAL - Data exfil |
| `server/routes.ts:2344` | `GET /admin/logs/export` | `export` | `audit` | 🔴 CRITICAL - Audit tampering |
| `server/routes.ts:14603` | `GET /gdpr/export/:userId` | `export` | `users` | 🔴 CRITICAL - PII exposure |
| `server/governance/routes.ts:599` | `POST /compliance/gdpr-export` | `export` | `compliance` | 🔴 CRITICAL - PII exposure |
| `server/governance/routes.ts:636` | `POST /compliance/audit-report` | `export` | `audit` | 🟡 HIGH - Audit exposure |

**Choke Point Strategy:** Create `exportGuard` middleware for all export routes

```typescript
// Apply to all export patterns
app.use("/api/*export*", exportGuard);
app.use("/api/*/export", exportGuard);
```

---

## Minimal Wiring Strategy

Given the constraint of <10 files, the recommended wiring approach:

### Phase 1: Create Adapter Layer (1 file)

Create `server/security/middleware/security-guards.ts`:
- `contentGuard` - for publish/delete
- `bulkOperationGuard` - for all bulk-* endpoints
- `governanceGuard` - for role/permission changes
- `exportGuard` - for all export operations

### Phase 2: Wire at Choke Points (4-5 files max)

| File | Modification | Lines Changed |
|------|--------------|---------------|
| `server/security/middleware/security-guards.ts` | NEW FILE | ~150 lines |
| `server/access-control/admin-routes.ts` | Add guard import + use | ~5 lines |
| `server/permissions/routes.ts` | Add guard import + use | ~5 lines |
| `server/exports/routes.ts` | Add guard import + use | ~5 lines |
| `server/security/autonomy/autonomy-controller.ts` | Add assertAllowed in setManualOverride | ~10 lines |

**Total: 5 files, ~175 lines**

---

## Risk Assessment

| Priority | Category | Files Affected | Est. Impact |
|----------|----------|----------------|-------------|
| P0 | Bulk Delete | 1 | Mass data loss |
| P0 | Role Assignment | 2 | Privilege escalation |
| P0 | Data Export | 3 | PII/data breach |
| P1 | Content Publish | 1 | Unapproved content |
| P1 | Autonomy Override | 1 | Security bypass |
| P2 | Bulk Update | 1 | Metadata corruption |

---

## Verification Checklist

After wiring, verify each action is gated:

- [ ] `DELETE /api/contents/:id` → Returns 403 for viewer
- [ ] `POST /api/contents/bulk-delete` → Requires approval in enforce mode
- [ ] `POST /admin/access-control/users/:id/roles` → Blocked in lockdown
- [ ] `GET /api/admin/exports/contents.csv` → Rate limited
- [ ] `POST /autonomy/override/:system` → Blocked during high threat
- [ ] `POST /api/newsletter/send` → Requires publish permission

---

## Feature Flags

| Flag | Default | Effect |
|------|---------|--------|
| `SECURITY_GATE_ENABLED` | `true` | Enable/disable all guards |
| `SECURITY_GATE_ENFORCE` | `true` in prod | Block vs log-only |
| `SECURITY_GATE_BULK_THRESHOLD` | `10` | Records before requiring approval |

---

## Rollback Plan

If wiring causes issues:
1. Set `SECURITY_GATE_ENFORCE=false` → Advisory mode
2. Set `SECURITY_GATE_ENABLED=false` → Full disable
3. Remove guard middleware from specific routes

All changes are additive and can be disabled without code changes.
