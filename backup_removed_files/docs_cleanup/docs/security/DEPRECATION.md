# Security Authority - Legacy Security Logic Deprecation

## Overview

With the introduction of the **Security Authority** system, all security decisions must now flow through the centralized `SecurityGate`. This document identifies legacy security patterns that should be deprecated, blocked, or removed.

## New Security Architecture

```
                    ┌──────────────────────────┐
                    │   SECURITY AUTHORITY     │
                    │  (Highest Authority)     │
                    └────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌───────────────┐    ┌───────────────────┐    ┌────────────────┐
│  SecurityGate │    │  Security Modes   │    │  Override      │
│  (Enforcement)│    │  (lockdown/etc)   │    │  Registry      │
└───────────────┘    └───────────────────┘    └────────────────┘
        │
        ├────────► Data Decisions
        ├────────► SEO Autopilot
        ├────────► Ops/Cutover
        ├────────► Bulk Operations
        └────────► All Critical Actions

# Security Deprecation Notice

**Document Version:** 1.0
**Last Updated:** 2025-01-01
**Status:** ACTIVE

This document lists legacy security patterns that are being deprecated or removed in favor of the centralized Security Operating System (SecurityOS).

## Overview

With the introduction of SecurityOS (`server/security/`), all security decisions now flow through a single, fail-closed enforcement layer. This eliminates security bypass vulnerabilities and ensures consistent policy enforcement across the platform.

---

## DEPRECATED: Environment Variable Bypasses

The following environment variables are **DEPRECATED** and will be **IGNORED** in production:

| Variable | Status | Replacement |
|----------|--------|-------------|
| `ENABLE_RBAC` | DEPRECATED | Always enforced via `SecurityKernel` |
| `DISABLE_RBAC` | BLOCKED | Detected and ignored by `detectRBACBypass()` |
| `SKIP_RBAC` | BLOCKED | Detected and ignored |
| `RBAC_BYPASS` | BLOCKED | Detected and ignored |
| `NO_AUTH` | BLOCKED | Detected and ignored |
| `SKIP_AUTH` | BLOCKED | Detected and ignored |
| `DISABLE_AUTH` | BLOCKED | Detected and ignored |
| `SECURITY_FORCE_MONITOR` | DEPRECATED | Only works in development |
| `POLICY_BYPASS_ROLES` | DEPRECATED | Use `OverrideRegistry` instead |
| `DISABLE_ALL_LIMITS` | DEPRECATED | Use `SecurityMode` restrictions |

### Migration Path

**Before (Deprecated):**
```typescript
if (process.env.ENABLE_RBAC !== "true") {
  // Skip permission check
  return next();
}
```

**After (Required):**
```typescript
import { assertAllowed } from "./security/gate/security-gate";

const result = await assertAllowed({
  actor: { userId, role },
  action,
  resource,
});

if (!result.allowed) {
  return res.status(403).json({ error: result.reason });
}
 
```

---


## DEPRECATED Patterns

### 1. Direct RBAC Checks (Outside SecurityGate)

**Status:** `DEPRECATED`

**Files Affected:**
- `server/access-control/middleware.ts`
- `server/access-control/policy-engine.ts`
- `server/access-control/permissions.ts`

**Current Pattern:**
```typescript
// DEPRECATED - Do not use directly
import { can, requirePermission } from './access-control';

router.use(requirePermission('edit', 'content'));
```

**New Pattern:**
```typescript
// CORRECT - Use SecurityGate
import { requireSecurityGate } from './security/authority';

router.use(requireSecurityGate('content_update', 'content'));
```

**Migration Notes:**
- The RBAC system is now an input to SecurityGate, not a direct authorization mechanism
- SecurityGate evaluates RBAC + security modes + threat levels + overrides
- Existing `can()` calls should be replaced with `SecurityGate.assertAllowed()`

---

### 2. Manual Permission Checks in Route Handlers

**Status:** `DEPRECATED`

**Files Affected:**
- `server/routes.ts` (various inline checks)
- `server/routes/admin/*.ts`
- `server/governance/routes.ts`

**Current Pattern:**
```typescript
// DEPRECATED
router.post('/api/content', async (req, res) => {
  const user = req.user;
  if (!user.roles.includes('editor')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // ... action

## DEPRECATED: Manual Permission Checks

Legacy permission check patterns that should be replaced:

### Pattern 1: `requireAuth` Middleware (Partial Deprecation)

**Status:** MIGRATE to SecurityGate for critical operations

**Location:** Various route handlers

**Old Pattern:**
```typescript
router.post("/endpoint", requireAuth, async (req, res) => {
  // Only checks authentication, not authorization
 
});
```

**New Pattern:**
```typescript

// CORRECT
router.post('/api/content',
  requireSecurityGate('content_create', 'content'),
  async (req, res) => {
    // SecurityGate already validated - proceed safely
    // ... action

import { securityGateMiddleware } from "./security/gate/security-gate";

router.post("/endpoint",
  requireAuth,  // Keep for authentication
  securityGateMiddleware("create", "resource"),  // Add for authorization
  async (req, res) => {
    // SecurityGate ensures proper authorization
 
  }
);
```
 
---

### 3. Feature-Flag-Based Auth Bypasses

**Status:** `BLOCKED`

**Files Affected:**
- Multiple files checking `ENABLE_*` flags to bypass security

**Current Pattern:**
```typescript
// BLOCKED - Never bypass security with feature flags
if (process.env.ENABLE_FAST_MODE === 'true') {
  // Skip permission check
  return performAction();
}
```

**Why This is Blocked:**
- Feature flags should control functionality, not security
- Security decisions must always flow through SecurityGate
- Even in development, security should be enforced (use overrides instead)

**New Pattern:**
```typescript
// CORRECT - Always check security, use overrides if needed
const decision = await SecurityGate.assertAllowed({
  actor: { userId: user.id, roles: user.roles },
  action: 'admin_action',
  resource: 'system',
  context: {},
});

if (!decision.allowed) {
  throw new SecurityGateError(decision);
}
```

---

### 4. Old Enterprise Security Module

**Status:** `DEPRECATED` (will be absorbed into Security Authority)

**Files Affected:**
- `server/enterprise-security.ts`
- `server/security.ts`

**Migration Notes:**
- `server/security/index.ts` remains for attack detection, rate limiting, etc.
- Authorization logic moves to Security Authority
- Audit logging is unified under Security Authority

---

### 5. Scattered isAdmin Checks

**Status:** `DEPRECATED`

**Files Affected:**
- `server/routes/admin/media-library-routes.ts`
- `server/routes/image-routes.ts`
- `server/routes/referral-routes.ts`
- Various other route files

**Current Pattern:**
```typescript
// DEPRECATED
function isAdmin(req: Request): boolean {
  return req.user?.roles?.includes('admin');
}

if (!isAdmin(req)) {
  return res.status(403).json({ error: 'Admin only' });
}
```

**New Pattern:**
```typescript
// CORRECT
router.use(requireSecurityGate('admin_action', 'system'));
```

---

### 6. Direct Role Hierarchy Comparisons

**Status:** `DEPRECATED`

**Files Affected:**
- `server/access-control/types.ts` (`ROLE_HIERARCHY`)
- Files importing and using `ROLE_HIERARCHY` directly

**Current Pattern:**
```typescript
// DEPRECATED
import { ROLE_HIERARCHY } from './access-control/types';

if (ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY['admin']) {
### Pattern 2: `isAdmin` Checks

**Status:** DEPRECATED

**Old Pattern:**
```typescript
if (req.user.isAdmin) {
 
  // Allow action
}
```

**Why Deprecated:**
- Role hierarchy is one factor in security decisions
- Threat levels, security modes, and overrides also matter
- Direct comparison bypasses important security controls

**New Pattern:**
```typescript
// CORRECT - Let SecurityGate evaluate all factors
const decision = await SecurityGate.assertAllowed({
  actor: { userId: user.id, roles: [user.role] },
  action: 'admin_action',
  resource: 'system',
  context: {},

**New Pattern:**
```typescript
import { checkUserPermission } from "./security/rbac/enforcer";

const result = checkUserPermission(userId, role, "manage_users", "users");
if (result.allowed) {
  // Allow action
}
```

### Pattern 3: Role-Based Conditionals

**Status:** DEPRECATED

**Old Pattern:**
```typescript
if (user.role === "admin" || user.role === "super_admin") {
  // Allow sensitive operation
}
```

**New Pattern:**
```typescript
import { assertAllowed } from "./security/gate/security-gate";

const result = await assertAllowed({
  actor: { userId: user.id, role: user.role },
  action: "sensitive_operation",
  resource: "system",
 
});
```

---

## REMOVED Patterns

### 1. Inline Session Validation

**Status:** `REMOVED` (handled by auth middleware)

Any code that manually validates sessions outside the auth middleware should be removed.

---

## Migration Timeline

### Phase 1: Parallel Operation (Current)
- Security Authority is deployed with feature flag OFF
- Legacy systems continue to operate
- No breaking changes

### Phase 2: Shadow Mode
- Enable Security Authority in monitor mode
- All decisions logged but not enforced
- Compare decisions with legacy system

### Phase 3: Enforce Mode
- Enable Security Authority enforcement
- Legacy checks become redundant
- Gradual removal of deprecated code

### Phase 4: Cleanup
- Remove deprecated patterns
- Update documentation
- Full Security Authority operation

---

## Feature Flag Configuration

To enable Security Authority:

```bash
# Enable the security authority (required)
ENABLE_SECURITY_AUTHORITY=true

# Default security mode (lockdown | enforce | monitor)
SECURITY_DEFAULT_MODE=enforce

# Fail-closed behavior (default: true)
SECURITY_FAIL_CLOSED=true

# Audit all decisions (default: true)
SECURITY_AUDIT_ALL=true

# Auto-lockdown on critical threat (default: true)
SECURITY_AUTO_LOCKDOWN=true

# Maximum override duration in hours (default: 24)
SECURITY_MAX_OVERRIDE_HOURS=24
```

---

## Files Safe to Remove (After Phase 4)

Once Security Authority is fully operational, these patterns can be removed:

1. `server/access-control/middleware.ts` - `requirePermission` middleware
2. `server/access-control/policy-engine.ts` - Direct `can()` usage
3. `server/enterprise-security.ts` - Consolidated into Security Authority
4. Inline permission checks in route handlers

## DEPRECATED: Feature Flag Auth Bypasses

These patterns allowed security bypasses via feature flags:

| Pattern | Status | Notes |
|---------|--------|-------|
| `POLICY_BYPASS_ROLES` | DEPRECATED | Use OverrideRegistry with justification |
| `ENABLE_POLICY_ENFORCEMENT` | DEPRECATED | Always enforced |
| `ENABLE_ENTERPRISE_GOVERNANCE` | DEPRECATED | SecurityOS is always active |

---

## BLOCKED: Security Bypass Attempts

The following patterns are actively detected and blocked by SecurityOS:

### 1. Environment Variable Tampering

The `detectRBACBypass()` function in `server/security/rbac/enforcer.ts` scans for:

```typescript
const suspiciousVars = [
  "DISABLE_RBAC",
  "SKIP_RBAC",
  "RBAC_BYPASS",
  "RBAC_ENABLED",
  "NO_AUTH",
  "SKIP_AUTH",
  "DISABLE_AUTH",
  "BYPASS_SECURITY",
  "ADMIN_MODE",
  "DEBUG_AUTH",
];
```

**In production:** These variables are logged and ignored.

### 2. Self-Approval Attacks

The `ApprovalSafety` module blocks:
- Self-approval (same user requesting and approving)
- Circular approval chains
- Rubber-stamping (approvals < 30 seconds)
- Collusion patterns (same approver > 80% of time)

### 3. Privilege Escalation

The RBAC enforcer prevents:
- Granting roles higher than your own
- Modifying permissions you don't have
- Escalating through policy manipulation

---

## REMOVED: Legacy Code Locations

The following code patterns have been or should be removed:

### Files to Review

| File | Pattern | Action |
|------|---------|--------|
| `server/access-control/` | Old RBAC | MIGRATE to SecurityOS |
| `server/policies/middleware.ts` | `POLICY_BYPASS_ROLES` | Use OverrideRegistry |
| Various routes | `requireAuth` only | Add SecurityGate |

### Migration Checklist

- [ ] Replace all `ENABLE_RBAC` checks with SecurityGate
- [ ] Replace `isAdmin` checks with RBAC enforcer
- [ ] Replace role-based conditionals with permission checks
- [ ] Remove `POLICY_BYPASS_ROLES` usage
- [ ] Add SecurityGate to all critical endpoints
- [ ] Update tests to use SecurityGate mocks

---

## Timeline

| Phase | Date | Action |
|-------|------|--------|
| Phase 1 | 2025-01 | SecurityOS deployed, legacy works in parallel |
| Phase 2 | 2025-02 | Deprecation warnings enabled |
| Phase 3 | 2025-03 | Legacy bypasses blocked |
| Phase 4 | 2025-04 | Legacy code removed |

---

## Enforcement

### Development

- Deprecation warnings logged to console
- Tests may use legacy patterns temporarily

### Staging

- Deprecation warnings become errors
- Legacy patterns fail in strict mode

### Production

- All bypass attempts are blocked
- All actions require SecurityGate approval
- Evidence generated for compliance
 

---

## Contact

For questions about migration or deprecation status, contact the Security team.

---

*Last Updated: 2026-01-01*
*Document Version: 1.0*

For questions about migration:
- Review `server/security/` documentation
- Check SecurityOS API at `/api/security/dashboard`
- File issues for migration assistance

---

**SECURITY NOTICE:** Attempting to bypass these controls in production is logged, blocked, and may trigger security alerts.
 
