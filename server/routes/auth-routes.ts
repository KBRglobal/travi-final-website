/**
 * Authentication Routes
 * Handles login, logout, user session, and authentication-related endpoints
 */

import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { storage } from "../storage";
import { ROLE_PERMISSIONS, type UserRole } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import {
  rateLimiters,
  requireAuth,
  requirePermission,
  recordFailedAttempt,
  logAuditEvent as logSecurityEvent,
} from "../security";
import { logSecurityEventFromRequest, SecurityEventType } from "../security/audit-logger";
import {
  enforceMandatory2FA,
  logAdminSecurityConfig,
  adminAuthGuards,
  magicLinkDisableMiddleware,
} from "../security/admin-hardening";
import { loginRateLimiter } from "../security/rate-limiter";
import {
  checkDualLockout,
  recordDualLockoutFailure,
  clearDualLockout,
} from "../security/password-policy";
import { createPreAuthToken } from "../security/pre-auth-token";
import {
  deviceFingerprint,
  contextualAuth,
  exponentialBackoff,
  threatIntelligence,
} from "../enterprise-security";

/**
 * Extended Request type for authenticated routes
 */
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
function getUserId(req: AuthRequest): string {
  return req.user!.claims!.sub;
}

function recordLoginFailure(
  req: Request,
  res: Response,
  ip: string,
  username: string,
  eventType: SecurityEventType,
  errorMessage: string,
  details: Record<string, unknown>
): void {
  recordFailedAttempt(ip);
  recordDualLockoutFailure(username.toLowerCase(), ip);
  (res as any).recordFailure?.();
  logSecurityEventFromRequest(req, eventType, {
    success: false,
    resource: "auth",
    action: "login",
    errorMessage,
    details,
  });
}

/** Check lockout status and return error response if locked */
function checkAndHandleLockout(req: Request, res: Response, username: string, ip: string): any {
  const lockoutStatus = checkDualLockout(username.toLowerCase(), ip);
  if (!lockoutStatus.locked) return null;

  const lockTypeMsgMap: Record<string, string> = { both: "IP and account", ip: "IP address" };
  const lockTypeMsg = lockTypeMsgMap[lockoutStatus.lockType || ""] || "account";
  logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
    success: false,
    resource: "auth",
    action: "login_lockout",
    errorMessage: `${lockTypeMsg} locked for ${lockoutStatus.remainingTime} minutes`,
    details: {
      attemptedUsername: username.substring(0, 3) + "***",
      lockType: lockoutStatus.lockType,
    },
  });
  return res.status(429).json({
    error: `Access temporarily locked. Try again in ${lockoutStatus.remainingTime} minutes.`,
    code: "ACCOUNT_LOCKED",
    lockType: lockoutStatus.lockType,
    remainingMinutes: lockoutStatus.remainingTime,
  });
}

export function registerAuthRoutes(app: Express): void {
  // Admin credentials from environment variables (hashed password stored in env)
  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

  // Log admin security configuration at startup
  logAdminSecurityConfig();

  // =====================
  // DEV ONLY: Auto-login endpoint for testing
  // =====================
  if (process.env.NODE_ENV !== "production" && process.env.REPL_SLUG) {
    app.post("/api/dev/auto-login", async (req: Request, res: Response) => {
      try {
        // Find admin user or first user with admin role
        const allUsers = await storage.getUsers();
        const adminUser = allUsers.find(u => u.role === "admin") || allUsers[0];

        if (!adminUser) {
          return res.status(404).json({ error: "No users found. Please create a user first." });
        }

        // Create session user object in the same format as regular login
        const sessionUser = {
          claims: { sub: adminUser.id },
          id: adminUser.id,
        };

        // Use req.login (Passport's method) to properly establish session
        req.login(sessionUser, (loginErr: any) => {
          if (loginErr) {
            return res.status(500).json({ error: "Failed to create session" });
          }

          // Mark TOTP as verified (bypass 2FA for dev testing)
          (req.session as any).totpVerified = true;

          req.session.save((saveErr: any) => {
            if (saveErr) {
              return res.status(500).json({ error: "Failed to save session" });
            }

            res.json({
              success: true,
              message: "DEV auto-login successful",
              user: {
                id: adminUser.id,
                username: adminUser.username,
                email: adminUser.email,
                role: adminUser.role,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
              },
            });
          });
        });
      } catch (error) {
        res.status(500).json({ error: "Auto-login failed" });
      }
    });
  }

  // =====================
  // Username/password login endpoint with enterprise security + admin hardening
  // =====================
  // Security layers (in order):
  // 1. Emergency kill switch (ADMIN_AUTH_DISABLED) - blocks all auth when enabled
  // 2. IP allowlist (ADMIN_ALLOWED_IPS) - restricts to configured IPs
  // 3. Rate limiting (5 attempts/15min) + exponential backoff
  // 4. Device fingerprinting, contextual auth, threat intelligence
  // 5. Password policy lockout check
  // 6. Mandatory 2FA enforcement
  app.post(
    "/api/auth/login",
    ...adminAuthGuards,
    rateLimiters.auth,
    exponentialBackoff.middleware("auth:login"),
    async (req: Request, res: Response) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          return res.status(400).json({ error: "Username and password are required" });
        }

        const ip = req.ip || req.socket.remoteAddress || "unknown";

        // SECURITY: Check dual lockout (IP + username) BEFORE any password verification
        const lockoutResponse = checkAndHandleLockout(req, res, username, ip);
        if (lockoutResponse) return lockoutResponse;

        // Enterprise Security: Threat Intelligence Check
        const threatAnalysis = threatIntelligence.analyzeRequest(req);
        if (threatAnalysis.isThreat && threatAnalysis.riskScore >= 70) {
          return res.status(403).json({ error: "Request blocked for security reasons" });
        }

        // Enterprise Security: Extract device fingerprint
        const fingerprint = deviceFingerprint.extractFromRequest(req);

        // Helper function to complete login with enterprise security
        const completeLogin = async (user: any) => {
          // Enterprise Security: Evaluate contextual authentication
          const geo = await contextualAuth.getGeoLocation(ip);
          const contextResult = await contextualAuth.evaluateContext(
            user.id,
            ip,
            fingerprint,
            geo || undefined
          );

          if (!contextResult.allowed) {
            return res.status(403).json({
              error: "Access denied based on security policy",
              riskFactors: contextResult.riskFactors,
              riskScore: contextResult.riskScore,
            });
          }

          // Enterprise Security: Register device
          const deviceInfo = await deviceFingerprint.registerDevice(user.id, fingerprint, ip);
          const isNewDevice = deviceInfo.loginCount === 1;

          // Check if MFA is required - ONLY if user has actually enrolled in 2FA
          // Users who haven't set up 2FA should be able to log in normally
          const requiresMfa = Boolean(user.totpEnabled && user.totpSecret);

          // P0-3 FIX: If MFA required, issue pre-auth token instead of creating session
          // Session is only created AFTER TOTP verification in /api/totp/validate
          if (requiresMfa) {
            const preAuthResult = await createPreAuthToken(user.id, user.username || user.email, {
              ipAddress: ip,
              userAgent: req.get("User-Agent") || "",
              riskScore: contextResult.riskScore,
              deviceFingerprint: JSON.stringify(fingerprint),
            });

            // Log pre-auth token issuance (not a full login yet) - use 'login' action with mfaPending flag
            logSecurityEvent({
              action: "login",
              resourceType: "auth",
              userId: user.id,
              userEmail: user.username || undefined,
              ip,
              userAgent: req.get("User-Agent"),
              details: {
                method: "password",
                role: user.role,
                isNewDevice,
                riskScore: contextResult.riskScore,
                mfaPending: true,
                preAuthTokenIssued: true,
              },
            });

            return res.json({
              success: true,
              requiresMfa: true,
              preAuthToken: preAuthResult.token,
              preAuthExpiresAt: preAuthResult.expiresAt,
              isNewDevice,
              riskScore: contextResult.riskScore,
              securityContext: {
                deviceTrusted: deviceInfo.isTrusted,
                country: geo?.country,
              },
            });
          }

          // No MFA required - create session immediately
          const sessionUser = {
            claims: { sub: user.id },
            id: user.id,
          };

          await new Promise<void>((resolve, reject) => {
            req.login(sessionUser, (err: any) => (err ? reject(err) : resolve()));
          });
          await new Promise<void>((resolve, reject) => {
            req.session.save((err: any) => (err ? reject(err) : resolve()));
          });

          // Enterprise Security: Reset backoff on successful login
          (res as any).resetBackoff?.();

          // Log successful login with enterprise security details
          logSecurityEvent({
            action: "login",
            resourceType: "auth",
            userId: user.id,
            userEmail: user.username || undefined,
            ip,
            userAgent: req.get("User-Agent"),
            details: {
              method: "password",
              role: user.role,
              isNewDevice,
              riskScore: contextResult.riskScore,
              deviceTrusted: deviceInfo.isTrusted,
              geo: geo ? { country: geo.country, city: geo.city } : null,
            },
          });

          res.json({
            success: true,
            user,
            requiresMfa: false,
            isNewDevice,
            riskScore: contextResult.riskScore,
            securityContext: {
              deviceTrusted: deviceInfo.isTrusted,
              country: geo?.country,
            },
          });
        };

        // Check for admin from environment first
        const isEnvAdmin = ADMIN_PASSWORD_HASH && username === ADMIN_USERNAME;
        const isAdminPassword = isEnvAdmin && (await bcrypt.compare(password, ADMIN_PASSWORD_HASH));
        if (isAdminPassword) {
          let adminUser = await storage.getUserByUsername(username);
          if (!adminUser) {
            adminUser = await storage.createUserWithPassword({
              username: ADMIN_USERNAME,
              passwordHash: ADMIN_PASSWORD_HASH,
              firstName: "Admin",
              lastName: "User",
              role: "admin",
              isActive: true,
            });
          }
          await completeLogin(adminUser);
          return;
        }

        // Check database for user
        const user = await storage.getUserByUsername(username);
        if (!user?.passwordHash) {
          recordLoginFailure(
            req,
            res,
            ip,
            username,
            SecurityEventType.LOGIN_FAILED,
            "User not found or no password",
            { attemptedUsername: username ? username.substring(0, 3) + "***" : "[empty]" }
          );
          return res.status(401).json({ error: "Invalid username or password" });
        }

        if (!user.isActive) {
          recordLoginFailure(
            req,
            res,
            ip,
            username,
            SecurityEventType.LOGIN_FAILED,
            "Account deactivated",
            { userId: user.id }
          );
          return res.status(401).json({ error: "Account is deactivated" });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          recordLoginFailure(
            req,
            res,
            ip,
            username,
            SecurityEventType.LOGIN_FAILED,
            "Invalid password",
            { userId: user.id }
          );
          return res.status(401).json({ error: "Invalid username or password" });
        }

        // SECURITY: Mandatory 2FA enforcement for admin accounts
        // If user has NOT configured TOTP, block access entirely
        const twoFaCheck = enforceMandatory2FA(user);
        if (!twoFaCheck.allowed) {
          logSecurityEventFromRequest(req, SecurityEventType.UNAUTHORIZED_ACCESS, {
            success: false,
            resource: "admin_auth",
            action: "2fa_not_configured",
            errorMessage: twoFaCheck.reason || "TOTP not configured",
            details: { userId: user.id },
          });
          return res.status(403).json({
            error: twoFaCheck.reason,
            code: "TOTP_SETUP_REQUIRED",
            requiresTotpSetup: true,
          });
        }

        // Clear lockout on successful password validation
        clearDualLockout(username.toLowerCase(), ip);

        await completeLogin(user);
      } catch (error) {
        res.status(500).json({ error: "Login failed" });
      }
    }
  );

  // =====================
  // Logout endpoint for password-based authentication
  // =====================
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub;
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    req.logout(err => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }

      // Destroy the session
      req.session?.destroy(sessionErr => {
        if (sessionErr) {
          // Log error but continue
        }

        // Log the logout event
        if (userId) {
          logSecurityEvent({
            action: "logout",
            resourceType: "auth",
            userId,
            ip,
            userAgent: req.get("User-Agent"),
            details: { method: "password" },
          });
        }

        // Clear the session cookie
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  // =====================
  // Get current authenticated user
  // =====================
  app.get("/api/auth/user", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove sensitive fields before sending
      const { passwordHash, totpSecret, totpRecoveryCodes, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // =====================
  // Get current user role and permissions
  // =====================
  app.get("/api/user/permissions", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      const userRole: UserRole = user?.role || "viewer";
      const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.viewer;
      res.json({ role: userRole, permissions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch permissions" });
    }
  });

  // =====================
  // Get all available roles (admin only)
  // =====================
  app.get("/api/roles", requirePermission("canManageUsers"), async (req, res) => {
    res.json({
      roles: ["admin", "editor", "author", "contributor", "viewer"],
      permissions: ROLE_PERMISSIONS,
    });
  });

  // =====================
  // Get system stats (authenticated users)
  // =====================
  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // =====================
  // Magic Link Authentication
  // Rate limited: 5 attempts per 15 minutes per IP to prevent abuse
  // =====================
  app.post(
    "/api/auth/magic-link",
    ...adminAuthGuards,
    magicLinkDisableMiddleware,
    loginRateLimiter,
    async (req, res) => {
      try {
        const { magicLinkAuth } = await import("../auth/magic-link");
        const { email } = req.body;
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const result = await magicLinkAuth.sendMagicLink(email, baseUrl);
        res.json(result);
      } catch (error) {
        res.status(500).json({ success: false, message: "Failed to send magic link" });
      }
    }
  );

  // Rate limited: 5 attempts per 15 minutes per IP to prevent token brute-forcing
  app.get(
    "/api/auth/magic-link/verify",
    ...adminAuthGuards,
    magicLinkDisableMiddleware,
    loginRateLimiter,
    async (req, res) => {
      try {
        const { magicLinkAuth } = await import("../auth/magic-link");
        const { token } = req.query;
        const result = await magicLinkAuth.verifyMagicLink(token as string);
        if (result.success) {
          // Set up session here if needed
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({ success: false, error: "Failed to verify magic link" });
      }
    }
  );
}
