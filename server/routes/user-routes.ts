/**
 * User Management Routes
 * Admin-only user CRUD operations with strict password policy enforcement
 */

import type { Express } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { storage } from "../storage";
import { requirePermission, checkReadOnlyMode, invalidateRoleCache } from "../security";
import { requireSelfOrAdmin, requireAdmin } from "../middleware/idor-protection";
import {
  validatePasswordStrength,
  validatePasswordChange,
  PASSWORD_POLICY,
} from "../security/password-policy";
import { logSecurityEventFromRequest, SecurityEventType } from "../security/audit-logger";
import { logAuditEvent } from "../utils/audit-logger";
import { createLogger } from "../lib/logger";

const userLog = createLogger("user-routes");

export function registerUserRoutes(app: Express): void {
  // =====================
  // User Management Routes (Admin only)
  // =====================

  app.get("/api/users", requirePermission("canManageUsers"), async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(
        users.map(u => ({
          id: u.id,
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt,
          profileImageUrl: u.profileImageUrl,
        }))
      );
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get single user by ID - IDOR protected
  // Users can only view their own profile unless they are admin
  app.get("/api/users/:id", requireSelfOrAdmin(), async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // SECURITY: Admin user creation with strict password policy enforcement
  // Requirements: 12+ chars, uppercase, lowercase, numbers, special chars, zxcvbn score >= 3
  app.post(
    "/api/users",
    requirePermission("canManageUsers"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { username, password, firstName, lastName, email, role } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: "Username and password are required" });
        }

        // SECURITY: Strict password policy enforcement for admin accounts
        // Uses zxcvbn for strength scoring, blocks weak/common passwords
        const passwordValidation = validatePasswordStrength(
          password,
          [username, firstName, lastName, email].filter(Boolean)
        );
        if (!passwordValidation.valid) {
          // Log failed password policy attempt
          logSecurityEventFromRequest(req, SecurityEventType.UNAUTHORIZED_ACCESS, {
            success: false,
            resource: "admin_user",
            action: "create_user_weak_password",
            errorMessage: "Password does not meet security requirements",
            details: { errorCount: passwordValidation.errors.length },
          });
          return res.status(400).json({
            error: "Password does not meet security requirements",
            code: "WEAK_PASSWORD",
            requirements: [
              `Minimum ${PASSWORD_POLICY.minLength} characters`,
              "At least one uppercase letter",
              "At least one lowercase letter",
              "At least one number",
              "At least one special character",
              `Strength score at least ${PASSWORD_POLICY.minStrengthScore}/4`,
            ],
            validationErrors: passwordValidation.errors,
          });
        }

        const existingUser = await storage.getUserByUsername(username.toLowerCase());
        if (existingUser) {
          return res.status(400).json({ error: "A user with this username already exists" });
        }

        if (email) {
          const existingEmail = await storage.getUserByEmail(email.toLowerCase());
          if (existingEmail) {
            return res.status(400).json({ error: "A user with this email already exists" });
          }
        }

        // SECURITY: Use higher bcrypt rounds (12) for admin password hashing
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await storage.createUserWithPassword({
          username: username.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          email: email?.toLowerCase(),
          role: role || "editor",
          isActive: true,
        });

        res.status(201).json({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create user" });
      }
    }
  );

  // SECURITY: Admin user update with strict password policy enforcement for password changes
  app.patch(
    "/api/users/:id",
    requirePermission("canManageUsers"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const existingUser = await storage.getUser(req.params.id);

        // Handle password change separately with strict policy enforcement
        const { password, ...updateData } = req.body;
        const passwordChanged = Boolean(password);
        if (password) {
          // SECURITY: Strict password policy enforcement for password changes
          // Uses zxcvbn for strength scoring, checks password history (if implemented)
          const passwordValidation = await validatePasswordChange(
            req.params.id,
            password,
            [
              existingUser?.username,
              existingUser?.email,
              existingUser?.firstName,
              existingUser?.lastName,
            ].filter(Boolean) as string[]
          );
          if (!passwordValidation.valid) {
            // Log failed password policy attempt
            logSecurityEventFromRequest(req, SecurityEventType.PASSWORD_CHANGE, {
              success: false,
              resource: "admin_user",
              action: "password_change_weak",
              errorMessage: "Password does not meet security requirements",
              details: {
                targetUserId: req.params.id,
                errorCount: passwordValidation.errors.length,
              },
            });
            return res.status(400).json({
              error: "Password does not meet security requirements",
              code: "WEAK_PASSWORD",
              requirements: [
                `Minimum ${PASSWORD_POLICY.minLength} characters`,
                "At least one uppercase letter",
                "At least one lowercase letter",
                "At least one number",
                "At least one special character",
                `Strength score at least ${PASSWORD_POLICY.minStrengthScore}/4`,
                `Cannot reuse last ${PASSWORD_POLICY.historyCount} passwords`,
              ],
              validationErrors: passwordValidation.errors,
            });
          }
          // SECURITY: Use higher bcrypt rounds (12) for admin password hashing
          updateData.passwordHash = await bcrypt.hash(password, 12);
        }

        const user = await storage.updateUser(req.params.id, updateData);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Audit log user update (check for role change)
        const actionType = existingUser?.role === user.role ? "user_update" : "role_change";
        await logAuditEvent(
          req,
          actionType,
          "user",
          req.params.id,
          actionType === "role_change"
            ? `Role changed for ${user.username || user.email}: ${existingUser?.role} -> ${user.role}`
            : `Updated user: ${user.username || user.email}`,
          {
            username: existingUser?.username,
            email: existingUser?.email,
            role: existingUser?.role,
            isActive: existingUser?.isActive,
          },
          { username: user.username, email: user.email, role: user.role, isActive: user.isActive }
        );

        // Security audit: Log password change (critical security event)
        if (passwordChanged) {
          logSecurityEventFromRequest(req, SecurityEventType.PASSWORD_CHANGE, {
            success: true,
            resource: "user",
            action: "password_change",
            details: { targetUserId: user.id },
          });
        }

        // Invalidate cached role so the updated user re-fetches from DB
        if (existingUser?.role !== user.role) {
          invalidateRoleCache(req);
        }

        // Security audit: Log role/privilege change (critical security event)
        if (existingUser?.role !== user.role) {
          logSecurityEventFromRequest(req, SecurityEventType.ROLE_CHANGED, {
            success: true,
            resource: "user",
            action: "role_change",
            details: {
              targetUserId: user.id,
              previousRole: existingUser?.role,
              newRole: user.role,
            },
          });
        }

        res.json({
          id: user.id,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update user" });
      }
    }
  );

  // Delete user - admin only (IDOR protected)
  app.delete("/api/users/:id", requireAdmin(), checkReadOnlyMode, async (req, res) => {
    try {
      const existingUser = await storage.getUser(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }
      await storage.deleteUser(req.params.id);

      // Audit log user deletion
      await logAuditEvent(
        req,
        "user_delete",
        "user",
        req.params.id,
        `Deleted user: ${existingUser.email}`,
        { email: existingUser.email, role: existingUser.role }
      );

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Bulk delete users
  app.post(
    "/api/users/bulk-delete",
    requirePermission("canManageUsers"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({ error: "Invalid or empty ids array" });
        }

        // Get current user ID to prevent self-deletion
        const currentUserId = (req as any).session?.userId;

        // Filter out current user if included
        const idsToDelete = ids.filter((id: string) => id !== currentUserId);

        if (idsToDelete.length === 0) {
          return res.status(400).json({ error: "Cannot delete your own account" });
        }

        let deletedCount = 0;
        for (const id of idsToDelete) {
          try {
            const existingUser = await storage.getUser(id);
            if (existingUser) {
              await storage.deleteUser(id);
              await logAuditEvent(
                req,
                "user_delete",
                "user",
                id,
                `Bulk deleted user: ${existingUser.email}`,
                { email: existingUser.email, role: existingUser.role }
              );
              deletedCount++;
            }
          } catch (err) {
            userLog.error({ err }, "Bulk delete user failed");
          }
        }

        res.json({ success: true, deletedCount });
      } catch (error) {
        res.status(500).json({ error: "Failed to bulk delete users" });
      }
    }
  );
}
