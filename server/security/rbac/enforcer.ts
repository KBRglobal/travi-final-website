/**
 * RBAC Enforcer - Fail-Closed Permission Enforcement
 *
 * PRINCIPLE: No route can exist without explicit permission
 *
 * This enforcer wraps all permission checks and ensures:
 * - Default-deny behavior
 * - No environment variable bypass in production
 * - Audit trail for all decisions
 */

import { Request, Response, NextFunction } from "express";
import {
  getSecurityMode,
  shouldAllow,
  recordBlock,
  detectBypassAttempt,
} from "../core/security-kernel";

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export type Permission =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "publish"
  | "unpublish"
  | "approve"
  | "reject"
  | "manage_users"
  | "manage_roles"
  | "manage_policies"
  | "export"
  | "import"
  | "configure"
  | "audit"
  | "ops";

export type Resource =
  | "content"
  | "entity"
  | "users"
  | "roles"
  | "policies"
  | "settings"
  | "analytics"
  | "audit"
  | "media"
  | "system";

export type Role =
  | "super_admin"
  | "system_admin"
  | "manager"
  | "editor"
  | "analyst"
  | "ops"
  | "viewer"
  | "guest";

// ============================================================================
// ROLE-PERMISSION MATRIX (SINGLE SOURCE OF TRUTH)
// ============================================================================

const ROLE_PERMISSIONS: Record<Role, Record<Resource, Permission[]>> = {
  super_admin: {
    content: ["view", "create", "edit", "delete", "publish", "unpublish", "approve", "reject"],
    entity: ["view", "create", "edit", "delete"],
    users: ["view", "create", "edit", "delete", "manage_users", "manage_roles"],
    roles: ["view", "create", "edit", "delete", "manage_roles"],
    policies: ["view", "create", "edit", "delete", "manage_policies"],
    settings: ["view", "edit", "configure"],
    analytics: ["view", "export"],
    audit: ["view", "export", "audit"],
    media: ["view", "create", "edit", "delete"],
    system: ["view", "configure", "ops"],
  },
  system_admin: {
    content: ["view", "create", "edit", "delete", "publish", "unpublish"],
    entity: ["view", "create", "edit", "delete"],
    users: ["view", "edit", "manage_users"],
    roles: ["view"],
    policies: ["view", "create", "edit"],
    settings: ["view", "edit", "configure"],
    analytics: ["view", "export"],
    audit: ["view", "export"],
    media: ["view", "create", "edit", "delete"],
    system: ["view", "configure", "ops"],
  },
  manager: {
    content: ["view", "create", "edit", "delete", "publish", "unpublish", "approve", "reject"],
    entity: ["view", "create", "edit"],
    users: ["view"],
    roles: [],
    policies: ["view"],
    settings: ["view"],
    analytics: ["view", "export"],
    audit: ["view"],
    media: ["view", "create", "edit", "delete"],
    system: ["view"],
  },
  editor: {
    content: ["view", "create", "edit", "publish"],
    entity: ["view", "create", "edit"],
    users: [],
    roles: [],
    policies: [],
    settings: [],
    analytics: ["view"],
    audit: [],
    media: ["view", "create", "edit"],
    system: [],
  },
  analyst: {
    content: ["view"],
    entity: ["view"],
    users: [],
    roles: [],
    policies: [],
    settings: [],
    analytics: ["view", "export"],
    audit: ["view"],
    media: ["view"],
    system: [],
  },
  ops: {
    content: ["view"],
    entity: ["view"],
    users: [],
    roles: [],
    policies: [],
    settings: ["view", "configure"],
    analytics: ["view"],
    audit: ["view"],
    media: ["view"],
    system: ["view", "configure", "ops"],
  },
  viewer: {
    content: ["view"],
    entity: ["view"],
    users: [],
    roles: [],
    policies: [],
    settings: [],
    analytics: [],
    audit: [],
    media: ["view"],
    system: [],
  },
  guest: {
    content: [],
    entity: [],
    users: [],
    roles: [],
    policies: [],
    settings: [],
    analytics: [],
    audit: [],
    media: [],
    system: [],
  },
};

// ============================================================================
// ENFORCER STATE
// ============================================================================

interface EnforcerStats {
  totalChecks: number;
  allowed: number;
  denied: number;
  bypassAttempts: number;
}

const STATS: EnforcerStats = {
  totalChecks: 0,
  allowed: 0,
  denied: 0,
  bypassAttempts: 0,
};

// ============================================================================
// CORE ENFORCEMENT FUNCTIONS
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
    roles?: string[];
    name?: string;
    email?: string;
    [key: string]: unknown;
  };
  permissionCheck?: {
    allowed: boolean;
    permission: Permission;
    resource: Resource;
    reason: string;
    timestamp: Date;
  };
}

/**
 * Check if a role has a specific permission on a resource
 */
export function hasPermission(role: Role, permission: Permission, resource: Resource): boolean {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;

  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;

  return resourcePerms.includes(permission);
}

/**
 * Check if user has permission - FAIL-CLOSED
 */
export function checkUserPermission(
  userId: string | undefined,
  userRole: string | undefined,
  permission: Permission,
  resource: Resource,
  context?: Record<string, unknown>
): { allowed: boolean; reason: string } {
  STATS.totalChecks++;

  // Kernel-level check first
  const kernelCheck = shouldAllow({
    action: permission,
    resource,
    userId,
    userRole,
    context,
  });

  if (!kernelCheck.allowed) {
    STATS.denied++;
    return kernelCheck;
  }

  // No user = DENY
  if (!userId) {
    STATS.denied++;
    return { allowed: false, reason: "No authenticated user" };
  }

  // No role = DENY (treat as guest)
  const role = (userRole as Role) || "guest";

  // Check permission matrix
  const allowed = hasPermission(role, permission, resource);

  if (allowed) {
    STATS.allowed++;
    return { allowed: true, reason: `Role ${role} has ${permission} on ${resource}` };
  }

  STATS.denied++;
  return {
    allowed: false,
    reason: `Role ${role} lacks ${permission} permission on ${resource}`,
  };
}

// ============================================================================
// EXPRESS MIDDLEWARE
// ============================================================================

/**
 * Require specific permission - FAIL-CLOSED MIDDLEWARE
 */
export function requirePermission(permission: Permission, resource: Resource) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const check = checkUserPermission(userId, userRole, permission, resource, {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    // Attach check result to request for logging
    req.permissionCheck = {
      allowed: check.allowed,
      permission,
      resource,
      reason: check.reason,
      timestamp: new Date(),
    };

    if (!check.allowed) {
      recordBlock({
        action: permission,
        resource,
        userId,
        reason: check.reason,
      });

      return res.status(403).json({
        error: "Permission denied",
        reason: check.reason,
        permission,
        resource,
      });
    }

    next();
  };
}

/**
 * Require any of the specified roles
 */
export function requireRole(...roles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role as Role;

    if (!userRole) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(userRole)) {
      recordBlock({
        action: "access",
        resource: "system",
        userId: req.user?.id,
        reason: `Required role: ${roles.join(" or ")}`,
      });

      return res.status(403).json({
        error: "Insufficient role",
        required: roles,
        actual: userRole,
      });
    }

    next();
  };
}

/**
 * Require admin or higher
 */
export function requireAdmin() {
  return requireRole("super_admin", "system_admin", "manager");
}

/**
 * Require super admin only
 */
export function requireSuperAdmin() {
  return requireRole("super_admin");
}

/**
 * Ensure user is authenticated
 */
export function requireAuth() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      recordBlock({
        action: "access",
        resource: "system",
        userId: undefined,
        reason: "Not authenticated",
      });

      return res.status(401).json({ error: "Authentication required" });
    }

    next();
  };
}

// ============================================================================
// BYPASS PREVENTION
// ============================================================================

/**
 * Detect if someone is trying to bypass RBAC via environment variables
 */
export function detectRBACBypass(): void {
  const env = process.env;
  const isProduction = env.NODE_ENV === "production";

  // Check for suspicious environment variables
  const suspiciousVars = [
    "DISABLE_RBAC",
    "SKIP_RBAC",
    "RBAC_BYPASS",
    "NO_AUTH",
    "SKIP_AUTH",
    "DISABLE_AUTH",
    "ADMIN_BYPASS",
    "DEV_MODE",
    "DEBUG_MODE",
    "TEST_MODE",
  ];

  for (const varName of suspiciousVars) {
    if (env[varName]) {
      detectBypassAttempt({
        source: "environment",
        method: `${varName} set to ${env[varName]}`,
        details: isProduction
          ? "CRITICAL: Bypass attempt in production"
          : "Bypass variable detected in non-production",
      });

      STATS.bypassAttempts++;

      // In production, these variables are IGNORED
      if (isProduction) {
        /* Bypass variables ignored in production - logged for audit trail */
      }
    }
  }

  // Check if ENABLE_RBAC is explicitly set to false in production
  if (isProduction && env.ENABLE_RBAC === "false") {
    detectBypassAttempt({
      source: "environment",
      method: "ENABLE_RBAC set to false in production",
      details: "CRITICAL: Attempting to disable RBAC in production - IGNORED",
    });

    STATS.bypassAttempts++;
  }
}

// ============================================================================
// STATS & MONITORING
// ============================================================================

/**
 * Get enforcer statistics
 */
export function getEnforcerStats(): EnforcerStats & {
  denialRate: number;
  securityMode: string;
} {
  const denialRate = STATS.totalChecks > 0 ? (STATS.denied / STATS.totalChecks) * 100 : 0;

  return {
    ...STATS,
    denialRate: Math.round(denialRate * 100) / 100,
    securityMode: getSecurityMode(),
  };
}

/**
 * Get permission matrix for documentation
 */
export function getPermissionMatrix(): Record<Role, Record<Resource, Permission[]>> {
  return { ...ROLE_PERMISSIONS };
}

/**
 * Validate permission matrix integrity
 */
export function validatePermissionMatrix(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Ensure super_admin has all permissions
  const allResources = Object.keys(ROLE_PERMISSIONS.super_admin) as Resource[];
  const allPermissions: Permission[] = [
    "view",
    "create",
    "edit",
    "delete",
    "publish",
    "unpublish",
    "approve",
    "reject",
    "manage_users",
    "manage_roles",
    "manage_policies",
    "export",
    "import",
    "configure",
    "audit",
    "ops",
  ];

  for (const resource of allResources) {
    const superAdminPerms = ROLE_PERMISSIONS.super_admin[resource];
    for (const perm of allPermissions) {
      if (!superAdminPerms.includes(perm)) {
        errors.push(`super_admin missing ${perm} on ${resource}`);
      }
    }
  }

  // Ensure guest has no permissions
  for (const [resource, perms] of Object.entries(ROLE_PERMISSIONS.guest)) {
    if (perms.length > 0) {
      errors.push(`guest has permissions on ${resource}: ${perms.join(", ")}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Run bypass detection on module load
detectRBACBypass();
