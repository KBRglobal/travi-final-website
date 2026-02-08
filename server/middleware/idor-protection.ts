/**
 * IDOR (Insecure Direct Object Reference) Protection Middleware
 *
 * Prevents unauthorized access to resources by verifying:
 * 1. User ownership of resources
 * 2. Role-based permissions from ROLE_PERMISSIONS
 * 3. Self-access for user profile operations
 *
 * All authorization failures are logged for security auditing.
 */

import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { ROLE_PERMISSIONS, type UserRole, type User } from "@shared/schema";
import { getUserId } from "../security";

import { log } from "../lib/logger";

type PermissionKey = keyof typeof ROLE_PERMISSIONS.admin;

interface AuthorizationFailure {
  timestamp: string;
  type: "ownership" | "permission" | "self_access";
  userId: string | undefined;
  userRole: UserRole | undefined;
  resourceType: string;
  resourceId: string;
  requiredPermission?: PermissionKey;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
}

// Track failed authorization attempts per IP for rate limiting
const failedAuthAttempts = new Map<string, { count: number; firstAttempt: number }>();
const FAILURE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES_PER_WINDOW = 10;

/**
 * Log authorization failure for security audit
 * SECURITY: Logs all authorization failures and tracks repeated attempts
 */
function logAuthorizationFailure(failure: AuthorizationFailure): void {
  // Log to console in development, structured for production logging
  const logEntry = {
    timestamp: failure.timestamp,
    type: "AUTHORIZATION_FAILURE",
    subtype: failure.type,
    userId: failure.userId || "anonymous",
    userRole: failure.userRole || "none",
    resourceType: failure.resourceType,
    resourceId: failure.resourceId,
    requiredPermission: failure.requiredPermission,
    ip: failure.ip,
    path: failure.path,
    method: failure.method,
  };

  // Always log authorization failures - critical for security monitoring
  log.warn("[SECURITY:IDOR]", logEntry);

  // Track repeated failures from same IP
  const now = Date.now();
  const ipRecord = failedAuthAttempts.get(failure.ip);

  if (ipRecord) {
    // Reset if window expired
    if (now - ipRecord.firstAttempt > FAILURE_WINDOW_MS) {
      failedAuthAttempts.set(failure.ip, { count: 1, firstAttempt: now });
    } else {
      ipRecord.count++;
      if (ipRecord.count >= MAX_FAILURES_PER_WINDOW) {
        log.error(
          `[SECURITY:IDOR] ALERT: IP ${failure.ip} has ${ipRecord.count} authorization failures - possible attack`,
          undefined,
          { ip: failure.ip, count: ipRecord.count, windowMinutes: FAILURE_WINDOW_MS / 60000 }
        );
      }
    }
  } else {
    failedAuthAttempts.set(failure.ip, { count: 1, firstAttempt: now });
  }

  // Clean up old entries periodically (every 100 failures)
  if (failedAuthAttempts.size > 100) {
    for (const [ip, record] of failedAuthAttempts.entries()) {
      if (now - record.firstAttempt > FAILURE_WINDOW_MS) {
        failedAuthAttempts.delete(ip);
      }
    }
  }
}

/**
 * Check if a role has a specific permission
 */
function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions[permission] : false;
}

/**
 * Get the authenticated user's database record with role
 */
async function getAuthenticatedDbUser(req: Request): Promise<{
  userId: string;
  dbUser: User | null;
  userRole: UserRole;
} | null> {
  const userId = getUserId(req);
  const isAuthenticated = typeof req.isAuthenticated === "function" ? req.isAuthenticated() : false;

  if (!isAuthenticated || !userId) {
    return null;
  }

  const dbUser = await storage.getUser(userId);
  const userRole: UserRole = dbUser?.role || "viewer";

  return { userId, dbUser, userRole };
}

/**
 * Require ownership of a content resource
 * User must be the author of the content to proceed
 */
export function requireOwnership(resourceType: "content") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = await getAuthenticatedDbUser(req);

      if (!authUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { userId, dbUser, userRole } = authUser;
      const resourceId = req.params.id;

      if (!resourceId) {
        return res.status(400).json({ error: "Resource ID required" });
      }

      if (resourceType === "content") {
        const content = await storage.getContent(resourceId);

        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        if (content.authorId !== userId) {
          logAuthorizationFailure({
            timestamp: new Date().toISOString(),
            type: "ownership",
            userId,
            userRole,
            resourceType,
            resourceId,
            ip: req.ip || req.socket.remoteAddress || "unknown",
            userAgent: req.get("user-agent"),
            path: req.path,
            method: req.method,
          });

          return res.status(403).json({
            error: "Access denied",
            message: "You do not own this resource",
          });
        }
      }

      (req as any).dbUser = dbUser;
      (req as any).userRole = userRole;
      next();
    } catch {
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

/**
 * Require ownership OR a specific permission
 * Admins and users with the permission can access any resource
 * Other users can only access resources they own
 */
export function requireOwnershipOrPermission(
  permission: PermissionKey,
  resourceType: "content" = "content"
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = await getAuthenticatedDbUser(req);

      if (!authUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { userId, dbUser, userRole } = authUser;
      const resourceId = req.params.id;

      if (!resourceId) {
        return res.status(400).json({ error: "Resource ID required" });
      }

      // Admin or user with permission can access any resource
      if (hasPermission(userRole, permission)) {
        (req as any).dbUser = dbUser;
        (req as any).userRole = userRole;
        return next();
      }

      // Check ownership for content resources
      if (resourceType === "content") {
        const content = await storage.getContent(resourceId);

        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        if (content.authorId === userId) {
          (req as any).dbUser = dbUser;
          (req as any).userRole = userRole;
          return next();
        }
      }

      // Authorization failed - log and deny
      logAuthorizationFailure({
        timestamp: new Date().toISOString(),
        type: "permission",
        userId,
        userRole,
        resourceType,
        resourceId,
        requiredPermission: permission,
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("user-agent"),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        error: "Access denied",
        message: "You must own this resource or have appropriate permissions",
        requiredPermission: permission,
        currentRole: userRole,
      });
    } catch {
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

/**
 * Require self access or admin role
 * User can only access their own profile unless they are admin
 */
export function requireSelfOrAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = await getAuthenticatedDbUser(req);

      if (!authUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { userId, dbUser, userRole } = authUser;
      const targetUserId = req.params.id;

      if (!targetUserId) {
        return res.status(400).json({ error: "User ID required" });
      }

      // Admin can access any user
      if (userRole === "admin") {
        (req as any).dbUser = dbUser;
        (req as any).userRole = userRole;
        return next();
      }

      // User can access their own profile
      if (userId === targetUserId) {
        (req as any).dbUser = dbUser;
        (req as any).userRole = userRole;
        return next();
      }

      // Authorization failed - log and deny
      logAuthorizationFailure({
        timestamp: new Date().toISOString(),
        type: "self_access",
        userId,
        userRole,
        resourceType: "user",
        resourceId: targetUserId,
        ip: req.ip || req.socket.remoteAddress || "unknown",
        userAgent: req.get("user-agent"),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        error: "Access denied",
        message: "You can only access your own profile",
      });
    } catch {
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

/**
 * Require admin role only
 * Only admins can perform this action
 *
 * NOTE: In development mode with DEV_AUTO_AUTH=true, all requests are auto-authenticated
 * as admin. To test auth failures, disable DEV_AUTO_AUTH or test in production mode.
 */
export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = await getAuthenticatedDbUser(req);

      if (!authUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { userId, dbUser, userRole } = authUser;

      if (userRole !== "admin") {
        logAuthorizationFailure({
          timestamp: new Date().toISOString(),
          type: "permission",
          userId,
          userRole,
          resourceType: "admin_action",
          resourceId: req.params.id || "N/A",
          requiredPermission: "canManageUsers",
          ip: req.ip || req.socket.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          error: "Access denied",
          message: "Admin access required",
          currentRole: userRole,
        });
      }

      (req as any).dbUser = dbUser;
      (req as any).userRole = userRole;
      next();
    } catch {
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
}

/**
 * Check ROLE_PERMISSIONS for a specific permission
 * This is a re-export with audit logging for authorization failures
 */
export function requirePermissionWithAudit(permission: PermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = await getAuthenticatedDbUser(req);

      if (!authUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { userId, dbUser, userRole } = authUser;

      if (!hasPermission(userRole, permission)) {
        logAuthorizationFailure({
          timestamp: new Date().toISOString(),
          type: "permission",
          userId,
          userRole,
          resourceType: "action",
          resourceId: req.params.id || "N/A",
          requiredPermission: permission,
          ip: req.ip || req.socket.remoteAddress || "unknown",
          userAgent: req.get("user-agent"),
          path: req.path,
          method: req.method,
        });

        return res.status(403).json({
          error: "Permission denied",
          required: permission,
          currentRole: userRole,
        });
      }

      (req as any).dbUser = dbUser;
      (req as any).userRole = userRole;
      next();
    } catch {
      return res.status(500).json({ error: "Authorization check failed" });
    }
  };
}
