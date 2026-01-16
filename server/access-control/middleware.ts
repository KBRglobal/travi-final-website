/**
 * Access Control Middleware
 * Feature flag: ENABLE_RBAC
 */

import { Request, Response, NextFunction } from "express";
import { can, hasRole } from "./policy-engine";
import { Action, Resource, GovernanceRoleName } from "./types";
import { resolveContext } from "./context-resolver";

function isEnabled(): boolean {
  return process.env.ENABLE_RBAC === "true";
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
    [key: string]: unknown;
  };
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(action: Action, resource: Resource) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // ALWAYS require authentication first
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only use ENABLE_RBAC flag to control PERMISSION checks, not AUTH checks
    if (!isEnabled()) {
      if (!process.env.ENABLE_RBAC) {
        console.warn("[AccessControl] ENABLE_RBAC is not set - permission checks are disabled but authentication is still enforced");
      }
      return next();
    }

    // Extract resource ID from params if available
    const resourceId = req.params.id || req.params.contentId || req.params.entityId;

    // Resolve context for more granular checks
    const context = resourceId
      ? await resolveContext(resource, resourceId)
      : undefined;

    const result = await can(userId, action, resource, context);

    if (!result.allowed) {
      return res.status(403).json({
        error: "Forbidden",
        reason: result.reason,
        action,
        resource,
      });
    }

    next();
  };
}

/**
 * Middleware to require any of the specified roles
 */
export function requireRole(...roles: GovernanceRoleName[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // ALWAYS require authentication first
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only use ENABLE_RBAC flag to control ROLE checks, not AUTH checks
    if (!isEnabled()) {
      if (!process.env.ENABLE_RBAC) {
        console.warn("[AccessControl] ENABLE_RBAC is not set - role checks are disabled but authentication is still enforced");
      }
      return next();
    }

    const has = await hasRole(userId, roles);

    if (!has) {
      return res.status(403).json({
        error: "Forbidden",
        reason: `Requires one of roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
}

/**
 * Middleware to check permission and attach result to request
 */
export function checkPermission(action: Action, resource: Resource) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      (req as any).permissionResult = { allowed: false, reason: "Not authenticated" };
      return next();
    }

    // Only use ENABLE_RBAC flag to control PERMISSION checks, not AUTH checks
    if (!isEnabled()) {
      if (!process.env.ENABLE_RBAC) {
        console.warn("[AccessControl] ENABLE_RBAC is not set - permission checks are disabled but authentication is still enforced");
      }
      (req as any).permissionResult = { allowed: true, reason: "RBAC disabled" };
      return next();
    }

    const resourceId = req.params.id || req.params.contentId;
    const context = resourceId
      ? await resolveContext(resource, resourceId)
      : undefined;

    const result = await can(userId, action, resource, context);
    (req as any).permissionResult = result;

    next();
  };
}

/**
 * Middleware to require admin or higher
 */
export function requireAdmin() {
  return requireRole("super_admin", "admin");
}

/**
 * Middleware to require ops access
 */
export function requireOps() {
  return requireRole("super_admin", "admin", "ops");
}

/**
 * Middleware for view-only access
 */
export function requireViewer() {
  return requirePermission("view", "content");
}

console.log("[AccessControl] Middleware loaded");
