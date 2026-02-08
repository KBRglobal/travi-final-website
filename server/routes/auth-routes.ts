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

/** Promise wrapper for req.login callback */
function loginAsync(req: Request, sessionUser: unknown): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    (req as any).login(sessionUser, (err: any) => (err ? reject(err) : resolve()));
  });
}

/** Promise wrapper for req.session.save callback */
function saveSessionAsync(req: Request): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    req.session.save((err: any) => (err ? reject(err) : resolve()));
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

/** Try environment-variable admin login; returns true if handled */
async function tryEnvAdminLogin(
  username: string,
  password: string,
  adminUsername: string,
  adminPasswordHash: string | undefined,
  completeLogin: (user: any) => Promise<void>
): Promise<boolean> {
  const isEnvAdmin = adminPasswordHash && username === adminUsername;
  if (!isEnvAdmin) return false;
  const isAdminPassword = await bcrypt.compare(password, adminPasswordHash);
  if (!isAdminPassword) return false;

  let adminUser = await storage.getUserByUsername(username);
  if (!adminUser) {
    adminUser = await storage.createUserWithPassword({
      username: adminUsername,
      passwordHash: adminPasswordHash,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      isActive: true,
    });
  }
  await completeLogin(adminUser);
  return true;
}

/** Validate DB user: check active status, password, 2FA. Returns truthy if handled (error sent). */
async function validateDbUser(
  user: any,
  password: string,
  req: Request,
  res: Response,
  ip: string,
  username: string
): Promise<any> {
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
    recordLoginFailure(req, res, ip, username, SecurityEventType.LOGIN_FAILED, "Invalid password", {
      userId: user.id,
    });
    return res.status(401).json({ error: "Invalid username or password" });
  }

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

  return null;
}

/** Complete login with enterprise security checks and session creation */
async function completeLoginWithSecurity(
  user: any,
  ip: string,
  fingerprint: any,
  req: Request,
  res: Response
): Promise<void> {
  const geo = await contextualAuth.getGeoLocation(ip);
  const contextResult = await contextualAuth.evaluateContext(
    user.id,
    ip,
    fingerprint,
    geo || undefined
  );

  if (!contextResult.allowed) {
    res.status(403).json({
      error: "Access denied based on security policy",
      riskFactors: contextResult.riskFactors,
      riskScore: contextResult.riskScore,
    });
    return;
  }

  const deviceInfo = await deviceFingerprint.registerDevice(user.id, fingerprint, ip);
  const isNewDevice = deviceInfo.loginCount === 1;
  const requiresMfa = Boolean(user.totpEnabled && user.totpSecret);

  if (requiresMfa) {
    await handleMfaPreAuth({
      user,
      ip,
      contextResult,
      fingerprint,
      isNewDevice,
      deviceInfo,
      geo,
      req,
      res,
    });
    return;
  }

  const sessionUser = { claims: { sub: user.id }, id: user.id };
  await loginAsync(req, sessionUser);
  await saveSessionAsync(req);
  (res as any).resetBackoff?.();

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
}

/** Handle MFA pre-auth flow: issue pre-auth token and return MFA-required response */
async function handleMfaPreAuth(opts: {
  user: any;
  ip: string;
  contextResult: { riskScore: number };
  fingerprint: any;
  isNewDevice: boolean;
  deviceInfo: { isTrusted: boolean };
  geo: { country?: string } | null | undefined;
  req: Request;
  res: Response;
}) {
  const { user, ip, contextResult, fingerprint, isNewDevice, deviceInfo, geo, req, res } = opts;

  const preAuthResult = await createPreAuthToken(user.id, user.username || user.email, {
    ipAddress: ip,
    userAgent: req.get("User-Agent") || "",
    riskScore: contextResult.riskScore,
    deviceFingerprint: JSON.stringify(fingerprint),
  });

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

/** Core password login logic extracted from the route handler to reduce cognitive complexity */
async function handlePasswordLogin(
  req: Request,
  res: Response,
  adminUsername: string,
  adminPasswordHash: string | undefined
): Promise<void> {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";

  // SECURITY: Check dual lockout (IP + username) BEFORE any password verification
  const lockoutResponse = checkAndHandleLockout(req, res, username, ip);
  if (lockoutResponse) return;

  // Enterprise Security: Threat Intelligence Check
  const threatAnalysis = threatIntelligence.analyzeRequest(req);
  if (threatAnalysis.isThreat && threatAnalysis.riskScore >= 70) {
    res.status(403).json({ error: "Request blocked for security reasons" });
    return;
  }

  const fingerprint = deviceFingerprint.extractFromRequest(req);
  const completeLogin = (user: any) => completeLoginWithSecurity(user, ip, fingerprint, req, res);

  // Check for admin from environment first
  const envAdminResult = await tryEnvAdminLogin(
    username,
    password,
    adminUsername,
    adminPasswordHash,
    completeLogin
  );
  if (envAdminResult) return;

  // Check database for user
  const user = await storage.getUserByUsername(username);
  if (!user?.passwordHash) {
    const masked = username ? username.substring(0, 3) + "***" : "[empty]";
    recordLoginFailure(
      req,
      res,
      ip,
      username,
      SecurityEventType.LOGIN_FAILED,
      "User not found or no password",
      { attemptedUsername: masked }
    );
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const dbError = await validateDbUser(user, password, req, res, ip, username);
  if (dbError) return;

  // Clear lockout on successful password validation
  clearDualLockout(username.toLowerCase(), ip);

  await completeLogin(user);
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
        const allUsers = await storage.getUsers();
        const adminUser = allUsers.find(u => u.role === "admin") || allUsers[0];

        if (!adminUser) {
          return res.status(404).json({ error: "No users found. Please create a user first." });
        }

        const sessionUser = {
          claims: { sub: adminUser.id },
          id: adminUser.id,
        };

        await loginAsync(req, sessionUser);
        (req.session as any).totpVerified = true;
        await saveSessionAsync(req);

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
      } catch {
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
        await handlePasswordLogin(req, res, ADMIN_USERNAME, ADMIN_PASSWORD_HASH);
      } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
      } catch {
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
      } catch {
        res.status(500).json({ success: false, error: "Failed to verify magic link" });
      }
    }
  );
}
