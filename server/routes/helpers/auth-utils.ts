/**
 * Authentication Utilities for Route Handlers
 * Helper types and functions for authenticated requests
 */

import type { Request, Response, NextFunction } from "express";
import { storage } from "../../storage";
import type { UserRole, ROLE_PERMISSIONS } from "@shared/schema";

// Permission checking utilities (imported from security.ts for route-level checks)
export type PermissionKey = keyof typeof ROLE_PERMISSIONS.admin;

// Authenticated request type for route handlers
// Use intersection type to avoid interface compatibility issues
export type AuthRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string; email?: string; name?: string } };
  session: Request["session"] & {
    userId?: string;
    save(callback?: (err?: unknown) => void): void;
  };
  login(user: unknown, callback: (err?: unknown) => void): void;
};

/**
 * Helper to safely get user ID from authenticated request (after isAuthenticated middleware)
 */
export function getUserId(req: AuthRequest): string {
  // After isAuthenticated middleware, user.claims.sub is guaranteed to exist
  return req.user!.claims!.sub;
}

/**
 * Role checking middleware with proper Express types
 */
export function requireRole(role: UserRole | UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as Request & {
      isAuthenticated(): boolean;
      user?: { claims?: { sub?: string } };
    };
    if (!authReq.isAuthenticated() || !authReq.user?.claims?.sub) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const userId = authReq.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user.role as UserRole)) {
      res
        .status(403)
        .json({ error: "Insufficient permissions", requiredRole: role, currentRole: user.role });
      return;
    }
    next();
  };
}

/**
 * Security: Sanitize user input for logging to prevent log injection
 */
export function sanitizeForLog(input: string): string {
  if (!input) return "";
  return input.replace(new RegExp(String.raw`[\r\n\x00]`, "g"), "").substring(0, 200);
}
