/**
 * Security Guards Middleware
 *
 * Centralized adapter layer for wiring Security Gate to routes.
 * All critical operations flow through these guards.
 *
 * USAGE:
 *   import { contentGuard, bulkGuard, governanceGuard, exportGuard } from './security/middleware/security-guards';
 *   router.use(governanceGuard);
 *   router.delete('/:id', contentGuard('delete'), handler);
 */

import { Request, Response, NextFunction } from "express";
import { assertAllowed, SecurityGateResult, SecurityGateError } from "../gate/security-gate";
import { AdminRole, Action, Resource } from "../../governance/types";

// ============================================================================
// CONFIGURATION
// ============================================================================

const SECURITY_GATE_ENABLED = process.env.SECURITY_GATE_ENABLED !== "false";
const SECURITY_GATE_ENFORCE = process.env.SECURITY_GATE_ENFORCE === "true" ||
  process.env.NODE_ENV === "production";
const BULK_APPROVAL_THRESHOLD = parseInt(process.env.SECURITY_GATE_BULK_THRESHOLD || "10");

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: AdminRole;
    roles?: string[];
  };
  sessionId?: string;
  securityGateResult?: SecurityGateResult;
}

// ============================================================================
// HELPER: Extract Actor from Request
// ============================================================================

function extractActor(req: AuthenticatedRequest): {
  userId: string;
  role: AdminRole;
  sessionId?: string;
  ipAddress?: string;
} {
  const user = req.user;

  if (!user) {
    return {
      userId: "anonymous",
      role: "viewer" as AdminRole,
      ipAddress: req.ip,
    };
  }

  // Determine role from user object
  let role: AdminRole = "viewer";
  if (user.role) {
    role = user.role;
  } else if (user.roles && user.roles.length > 0) {
    // Pick highest role
    const roleHierarchy: AdminRole[] = [
      "super_admin",
      "system_admin",
      "manager",
      "ops",
      "editor",
      "analyst",
      "viewer",
    ];
    for (const r of roleHierarchy) {
      if (user.roles.includes(r)) {
        role = r;
        break;
      }
    }
  }

  return {
    userId: user.id,
    role,
    sessionId: req.sessionId,
    ipAddress: req.ip,
  };
}

// ============================================================================
// HELPER: Handle Gate Result
// ============================================================================

function handleGateResult(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  result: SecurityGateResult,
  context: string
): void {
  // Store result for downstream use
  req.securityGateResult = result;

  if (result.blocked) {
    if (SECURITY_GATE_ENFORCE) {
      console.log(`[SecurityGuard] BLOCKED: ${context} - ${result.reason}`);
      res.status(403).json({
        error: result.reason,
        code: result.code,
        requiresApproval: result.requiresApproval,
        approvalType: result.approvalType,
        recommendations: result.recommendations,
        _securityGate: true,
      });
      return;
    } else {
      // Advisory mode - log but allow
      console.warn(`[SecurityGuard] ADVISORY: Would block ${context} - ${result.reason}`);
    }
  }

  next();
}

// ============================================================================
// CONTENT GUARD
// ============================================================================

/**
 * Guard for content operations (publish, delete, update)
 */
export function contentGuard(action: "publish" | "unpublish" | "delete" | "edit") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!SECURITY_GATE_ENABLED) return next();

    const actor = extractActor(req);
    const resourceId = req.params.id || req.params.slug;

    try {
      const result = await assertAllowed({
        actor,
        action,
        resource: "content",
        resourceId,
        context: {
          metadata: { contentId: resourceId },
        },
      });

      handleGateResult(req, res, next, result, `content.${action}`);
    } catch (error) {
      console.error("[SecurityGuard] Content guard error:", error);
      // Fail-closed
      if (SECURITY_GATE_ENFORCE) {
        return res.status(500).json({
          error: "Security check failed",
          code: "GATE_ERROR",
        });
      }
      next();
    }
  };
}

// ============================================================================
// BULK OPERATION GUARD
// ============================================================================

/**
 * Guard for bulk operations
 */
export function bulkGuard(operation: "update" | "delete" | "export" | "import") {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!SECURITY_GATE_ENABLED) return next();

    const actor = extractActor(req);

    // Estimate record count from request
    let recordCount = 0;
    if (req.body?.ids) {
      recordCount = Array.isArray(req.body.ids) ? req.body.ids.length : 1;
    } else if (req.body?.contentIds) {
      recordCount = Array.isArray(req.body.contentIds) ? req.body.contentIds.length : 1;
    } else if (req.query?.limit) {
      recordCount = parseInt(req.query.limit as string) || 100;
    }

    try {
      const result = await assertAllowed({
        actor,
        action: `bulk_${operation}` as Action,
        resource: "content",
        context: {
          recordCount,
          requiresApproval: recordCount > BULK_APPROVAL_THRESHOLD,
          metadata: { operation, recordCount },
        },
      });

      handleGateResult(req, res, next, result, `bulk.${operation}[${recordCount}]`);
    } catch (error) {
      console.error("[SecurityGuard] Bulk guard error:", error);
      if (SECURITY_GATE_ENFORCE) {
        return res.status(500).json({
          error: "Security check failed",
          code: "GATE_ERROR",
        });
      }
      next();
    }
  };
}

/**
 * Middleware for all bulk endpoints (pattern: /bulk-*)
 */
export async function bulkOperationMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!SECURITY_GATE_ENABLED) {
    next();
    return;
  }

  // Determine operation type from URL
  let operation: "update" | "delete" | "export" | "import" = "update";
  const path = req.path.toLowerCase();

  if (path.includes("delete")) operation = "delete";
  else if (path.includes("export")) operation = "export";
  else if (path.includes("import")) operation = "import";

  const guard = bulkGuard(operation);
  guard(req, res, next);
}

// ============================================================================
// GOVERNANCE GUARD
// ============================================================================

/**
 * Guard for governance/RBAC operations
 */
export async function governanceGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!SECURITY_GATE_ENABLED) {
    next();
    return;
  }

  const actor = extractActor(req);
  const method = req.method.toUpperCase();
  const path = req.path.toLowerCase();

  // Determine action and resource from path
  let action: Action = "view";
  let resource: Resource = "policies";

  if (path.includes("role")) {
    resource = "roles";
    if (method === "POST") action = "manage_roles";
    else if (method === "PUT" || method === "PATCH") action = "manage_roles";
    else if (method === "DELETE") action = "manage_roles";
  } else if (path.includes("permission")) {
    resource = "roles";
    action = "manage_roles";
  } else if (path.includes("user")) {
    resource = "users";
    if (method !== "GET") action = "manage_users";
  } else if (path.includes("polic")) {
    resource = "policies";
    if (method !== "GET") action = "manage_policies";
  } else if (path.includes("approval")) {
    resource = "policies";
    if (path.includes("decide")) action = "approve";
    else if (method === "POST") action = "manage_policies";
  }

  // Skip GET requests in monitor mode
  if (method === "GET" && action === "view") {
    next();
    return;
  }

  try {
    const result = await assertAllowed({
      actor,
      action,
      resource,
      resourceId: req.params.id || req.params.roleId || req.params.userId,
      context: {
        requiresApproval: action === "manage_roles" || action === "manage_users",
        metadata: { method, path },
      },
    });

    handleGateResult(req, res, next, result, `governance.${action}:${resource}`);
  } catch (error) {
    console.error("[SecurityGuard] Governance guard error:", error);
    if (SECURITY_GATE_ENFORCE) {
      res.status(500).json({
        error: "Security check failed",
        code: "GATE_ERROR",
      });
      return;
    }
    next();
  }
}

// ============================================================================
// EXPORT GUARD
// ============================================================================

/**
 * Guard for data export operations
 */
export async function exportGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!SECURITY_GATE_ENABLED) {
    next();
    return;
  }

  const actor = extractActor(req);
  const path = req.path.toLowerCase();

  // Determine resource type from path
  let resource: Resource = "content";
  if (path.includes("user") || path.includes("gdpr")) resource = "users";
  else if (path.includes("audit") || path.includes("log")) resource = "audit";
  else if (path.includes("entit")) resource = "entity";
  else if (path.includes("compliance")) resource = "policies";

  // Estimate record count
  let recordCount = parseInt(req.query.limit as string) || 1000;

  try {
    const result = await assertAllowed({
      actor,
      action: "export",
      resource,
      context: {
        recordCount,
        byteCount: recordCount * 1024, // Rough estimate
        requiresApproval: resource === "users" || resource === "audit",
        metadata: { exportFormat: req.path.endsWith(".csv") ? "csv" : "json" },
      },
    });

    handleGateResult(req, res, next, result, `export.${resource}`);
  } catch (error) {
    console.error("[SecurityGuard] Export guard error:", error);
    if (SECURITY_GATE_ENFORCE) {
      res.status(500).json({
        error: "Security check failed",
        code: "GATE_ERROR",
      });
      return;
    }
    next();
  }
}

// ============================================================================
// AUTONOMY GUARD
// ============================================================================

/**
 * Guard for autonomy/autopilot mode changes
 */
export async function autonomyGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!SECURITY_GATE_ENABLED) {
    next();
    return;
  }

  const actor = extractActor(req);
  const method = req.method.toUpperCase();

  // Only guard mutations
  if (method === "GET") {
    next();
    return;
  }

  const system = req.params.system || req.body?.system || "unknown";

  try {
    const result = await assertAllowed({
      actor,
      action: "autonomy_change",
      resource: "system",
      resourceId: system,
      context: {
        requiresApproval: true,
        isAutomated: false,
        metadata: {
          system,
          operation: method === "DELETE" ? "disable" : "enable",
        },
      },
    });

    handleGateResult(req, res, next, result, `autonomy.change:${system}`);
  } catch (error) {
    console.error("[SecurityGuard] Autonomy guard error:", error);
    if (SECURITY_GATE_ENFORCE) {
      res.status(500).json({
        error: "Security check failed",
        code: "GATE_ERROR",
      });
      return;
    }
    next();
  }
}

// ============================================================================
// PUBLISH GUARD (Newsletter/Broadcast)
// ============================================================================

/**
 * Guard for publish/broadcast operations
 */
export async function publishGuard(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!SECURITY_GATE_ENABLED) {
    next();
    return;
  }

  const actor = extractActor(req);

  try {
    const result = await assertAllowed({
      actor,
      action: "publish",
      resource: "content",
      context: {
        requiresApproval: true,
        metadata: {
          type: "broadcast",
          path: req.path,
        },
      },
    });

    handleGateResult(req, res, next, result, "publish.broadcast");
  } catch (error) {
    console.error("[SecurityGuard] Publish guard error:", error);
    if (SECURITY_GATE_ENFORCE) {
      res.status(500).json({
        error: "Security check failed",
        code: "GATE_ERROR",
      });
      return;
    }
    next();
  }
}

// ============================================================================
// COMBINED GUARD FACTORY
// ============================================================================

/**
 * Create a guard for any action/resource combination
 */
export function createGuard(action: Action, resource: Resource) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!SECURITY_GATE_ENABLED) return next();

    const actor = extractActor(req);

    try {
      const result = await assertAllowed({
        actor,
        action,
        resource,
        resourceId: req.params.id,
        context: {
          metadata: { path: req.path, method: req.method },
        },
      });

      handleGateResult(req, res, next, result, `${action}:${resource}`);
    } catch (error) {
      console.error("[SecurityGuard] Guard error:", error);
      if (SECURITY_GATE_ENFORCE) {
        return res.status(500).json({
          error: "Security check failed",
          code: "GATE_ERROR",
        });
      }
      next();
    }
  };
}

// ============================================================================
// STATUS
// ============================================================================

console.log("[SecurityGuards] Module loaded");
console.log(`[SecurityGuards] ENABLED: ${SECURITY_GATE_ENABLED}`);
console.log(`[SecurityGuards] ENFORCE: ${SECURITY_GATE_ENFORCE}`);
console.log(`[SecurityGuards] BULK_THRESHOLD: ${BULK_APPROVAL_THRESHOLD}`);
