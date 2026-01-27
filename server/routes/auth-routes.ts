import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcrypt";
import crypto from "crypto";
import {
  ROLE_PERMISSIONS,
  type UserRole,
  emailOtpCodes as emailOtpCodesTable,
} from "@shared/schema";
import { db } from "../db";
import { eq, and, gt, sql } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import { rateLimiters, logAuditEvent as logSecurityEvent } from "../security";
import {
  checkDualLockout,
  recordDualLockoutFailure,
  clearDualLockout,
} from "../security/password-policy";
import {
  createPreAuthToken,
  verifyPreAuthToken,
  consumePreAuthToken,
} from "../security/pre-auth-token";
import { loginRateLimiter } from "../security/rate-limiter";
import { logSecurityEventFromRequest, SecurityEventType } from "../security/audit-logger";
import {
  adminAuthGuards,
  magicLinkDisableMiddleware,
  enforceMandatory2FA,
} from "../security/admin-hardening";
import {
  deviceFingerprint,
  contextualAuth,
  exponentialBackoff,
  sessionSecurity,
  threatIntelligence,
} from "../enterprise-security";
import { recordFailedAttempt } from "../security";

// Configure TOTP with time window tolerance for clock drift (2 steps = 60 seconds before/after)
authenticator.options = { window: 2 };

// Admin credentials from environment
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || "";

// Authenticated request type
type AuthRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string; email?: string; name?: string } };
  session: Request["session"] & {
    userId?: string;
    save(callback?: (err?: unknown) => void): void;
  };
  login(user: unknown, callback: (err?: unknown) => void): void;
};

// Helper to safely get user ID from authenticated request
function getUserId(req: AuthRequest): string {
  return req.user!.claims!.sub;
}

// Helper to check role
function requireRole(role: UserRole | UserRole[]) {
  return async (req: Request, res: Response, next: Function): Promise<void> => {
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

// Rate limiting for TOTP validation (in-memory, per-session)
const totpAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_TOTP_ATTEMPTS = 5;
const TOTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

// Rate limiting for recovery code validation (in-memory, per-user)
const recoveryAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

export function registerAuthRoutes(app: Express): void {
  // Login endpoint
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
        const lockoutStatus = checkDualLockout(username.toLowerCase(), ip);
        if (lockoutStatus.locked) {
          const lockTypeMsg =
            lockoutStatus.lockType === "both"
              ? "IP and account"
              : lockoutStatus.lockType === "ip"
                ? "IP address"
                : "account";
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

          // Check if MFA is required
          const requiresMfa = Boolean(user.totpEnabled && user.totpSecret);

          // If MFA required, issue pre-auth token instead of creating session
          if (requiresMfa) {
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

          // No MFA required - create session immediately
          const sessionUser = {
            claims: { sub: user.id },
            id: user.id,
          };

          req.login(sessionUser, (err: any) => {
            if (err) {
              return res.status(500).json({ error: "Failed to create session" });
            }
            req.session.save((saveErr: any) => {
              if (saveErr) {
                return res.status(500).json({ error: "Failed to save session" });
              }

              // Enterprise Security: Reset backoff on successful login
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
            });
          });
        };

        // Check for admin from environment first
        if (ADMIN_PASSWORD_HASH && username === ADMIN_USERNAME) {
          const isAdminPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
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
        }

        // Check database for user
        const user = await storage.getUserByUsername(username);
        if (!user || !user.passwordHash) {
          recordFailedAttempt(ip);
          recordDualLockoutFailure(username.toLowerCase(), ip);
          (res as any).recordFailure?.();
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "login",
            errorMessage: "User not found or no password",
            details: { attemptedUsername: username ? username.substring(0, 3) + "***" : "[empty]" },
          });
          return res.status(401).json({ error: "Invalid username or password" });
        }

        if (!user.isActive) {
          recordFailedAttempt(ip);
          recordDualLockoutFailure(username.toLowerCase(), ip);
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "login",
            errorMessage: "Account deactivated",
            details: { userId: user.id },
          });
          return res.status(401).json({ error: "Account is deactivated" });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
          recordFailedAttempt(ip);
          recordDualLockoutFailure(username.toLowerCase(), ip);
          (res as any).recordFailure?.();
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "login",
            errorMessage: "Invalid password",
            details: { userId: user.id },
          });
          return res.status(401).json({ error: "Invalid username or password" });
        }

        // SECURITY: Mandatory 2FA enforcement for admin accounts
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

        clearDualLockout(username.toLowerCase(), ip);
        await completeLogin(user);
      } catch (error) {
        res.status(500).json({ error: "Login failed" });
      }
    }
  );

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub;
    const ip = req.ip || req.socket.remoteAddress || "unknown";

    req.logout(err => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }

      req.session?.destroy(sessionErr => {
        if (sessionErr) {
        }

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

        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  // Get current authenticated user
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

  // Get current user role and permissions
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

  // Get user's registered devices
  app.get("/api/security/devices", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const devices = deviceFingerprint.getUserDevices(userId);
      res.json({ devices });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  // Trust a device
  app.post(
    "/api/security/devices/:fingerprintHash/trust",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = getUserId(req);
        const { fingerprintHash } = req.params;
        const fingerprint = deviceFingerprint.extractFromRequest(req);

        await deviceFingerprint.trustDevice(userId, fingerprint);
        res.json({ success: true, message: "Device trusted" });
      } catch (error) {
        res.status(500).json({ error: "Failed to trust device" });
      }
    }
  );

  // Revoke a device
  app.delete(
    "/api/security/devices/:fingerprintHash",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = getUserId(req);
        const { fingerprintHash } = req.params;

        const revoked = await deviceFingerprint.revokeDevice(userId, fingerprintHash);
        if (revoked) {
          res.json({ success: true, message: "Device revoked" });
        } else {
          res.status(404).json({ error: "Device not found" });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to revoke device" });
      }
    }
  );

  // Get user's active sessions
  app.get("/api/security/sessions", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const sessions = sessionSecurity.getUserSessions(userId);

      const safeSessions = sessions.map(s => ({
        id: s.id.substring(0, 8) + "...",
        createdAt: s.createdAt,
        lastActivityAt: s.lastActivityAt,
        expiresAt: s.expiresAt,
        ipAddress: s.ipAddress,
        isActive: s.isActive,
        riskScore: s.riskScore,
      }));

      res.json({ sessions: safeSessions });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  // Revoke all other sessions
  app.post(
    "/api/security/sessions/revoke-all",
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = getUserId(req);
        const currentSessionId = (req.session as any)?.id;

        const count = await sessionSecurity.revokeAllUserSessions(userId, currentSessionId);
        res.json({ success: true, message: `${count} sessions revoked` });
      } catch (error) {
        res.status(500).json({ error: "Failed to revoke sessions" });
      }
    }
  );

  // Get current security context
  app.get("/api/security/context", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const fingerprint = deviceFingerprint.extractFromRequest(req);

      const geo = await contextualAuth.getGeoLocation(ip);
      const contextResult = await contextualAuth.evaluateContext(
        userId,
        ip,
        fingerprint,
        geo || undefined
      );
      const isKnown = deviceFingerprint.isKnownDevice(userId, fingerprint);
      const isTrusted = deviceFingerprint.isDeviceTrusted(userId, fingerprint);
      const threatAnalysis = threatIntelligence.analyzeRequest(req);

      res.json({
        ip: ip.substring(0, ip.lastIndexOf(".")) + ".xxx",
        geo: geo
          ? {
              country: geo.country,
              countryCode: geo.countryCode,
              region: geo.region,
              city: geo.city,
              timezone: geo.timezone,
            }
          : null,
        device: {
          isKnown,
          isTrusted,
          fingerprintHash: deviceFingerprint.generateHash(fingerprint).substring(0, 8) + "...",
        },
        riskAssessment: {
          score: contextResult.riskScore,
          factors: contextResult.riskFactors,
          requiresMfa: contextResult.requiresMfa,
        },
        threatIndicators:
          threatAnalysis.indicators.length > 0
            ? threatAnalysis.indicators.map(i => i.description)
            : [],
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get security context" });
    }
  });

  // Admin: Get security dashboard summary
  app.get(
    "/api/security/dashboard",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { getBlockedIps, getAuditLogs } = await import("../security");
        const blockedIps = getBlockedIps();

        res.json({
          blockedIps: blockedIps.length,
          blockedIpList: blockedIps.slice(0, 10),
          recentSecurityEvents: await getAuditLogs({ resourceType: "auth", limit: 20 }),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get security dashboard" });
      }
    }
  );

  // TOTP 2FA Routes

  // Get TOTP status for current user
  app.get("/api/totp/status", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        totpEnabled: user.totpEnabled || false,
        hasSecret: !!user.totpSecret,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch TOTP status" });
    }
  });

  // Setup TOTP - Generate secret and QR code
  app.post("/api/totp/setup", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Security: If TOTP is already enabled, require current code to reset
      if (user.totpEnabled && user.totpSecret) {
        const { currentCode } = req.body;
        if (!currentCode) {
          return res.status(400).json({
            error: "2FA is already enabled. Provide current code to reset.",
            requiresCurrentCode: true,
          });
        }
        const isValid = authenticator.verify({ token: currentCode, secret: user.totpSecret });
        if (!isValid) {
          return res.status(400).json({ error: "Invalid current verification code" });
        }
      }

      const secret = authenticator.generateSecret();
      const email = user.email || "user";
      const otpauth = authenticator.keyuri(email, "Travi CMS", secret);
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

      await storage.updateUser(userId, { totpSecret: secret, totpEnabled: false });

      res.json({
        qrCode: qrCodeDataUrl,
        otpauth,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to setup TOTP" });
    }
  });

  // Verify TOTP and enable 2FA
  app.post(
    "/api/totp/verify",
    loginRateLimiter,
    isAuthenticated,
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = getUserId(req);
        const { code } = req.body;

        if (!code || typeof code !== "string") {
          return res.status(400).json({ error: "Verification code is required" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.totpSecret) {
          return res.status(400).json({ error: "TOTP not set up. Please run setup first." });
        }

        const isValid = authenticator.verify({ token: code, secret: user.totpSecret });

        if (!isValid) {
          return res.status(400).json({ error: "Invalid verification code" });
        }

        // Generate recovery codes
        const recoveryCodes: string[] = [];
        for (let i = 0; i < 10; i++) {
          const code =
            Math.random().toString(36).substring(2, 8).toUpperCase() +
            Math.random().toString(36).substring(2, 8).toUpperCase();
          recoveryCodes.push(code);
        }

        await storage.updateUser(userId, { totpEnabled: true, totpRecoveryCodes: recoveryCodes });

        res.json({
          success: true,
          message: "Two-factor authentication enabled",
          recoveryCodes,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to verify TOTP" });
      }
    }
  );

  // Disable TOTP
  app.post("/api/totp/disable", isAuthenticated, async (req: AuthRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const { code } = req.body;

      if (!code || typeof code !== "string") {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.totpSecret || !user.totpEnabled) {
        return res.status(400).json({ error: "TOTP is not enabled" });
      }

      const isValid = authenticator.verify({ token: code, secret: user.totpSecret });

      if (!isValid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      await storage.updateUser(userId, { totpEnabled: false, totpSecret: null });

      res.json({ success: true, message: "Two-factor authentication disabled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to disable TOTP" });
    }
  });

  // TOTP validation with pre-auth token flow
  app.post(
    "/api/totp/validate",
    ...adminAuthGuards,
    loginRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const { code, preAuthToken } = req.body;
        const ip = req.ip || req.socket.remoteAddress || "unknown";

        if (!code) {
          return res.status(400).json({ error: "Verification code is required" });
        }

        if (!preAuthToken) {
          return res.status(400).json({ error: "Pre-auth token is required" });
        }

        const preAuthContext = await verifyPreAuthToken(preAuthToken);
        if (!preAuthContext) {
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "totp_validate_invalid_preauth",
            errorMessage: "Invalid or expired pre-auth token",
            details: {},
          });
          return res.status(401).json({
            error: "Invalid or expired pre-auth token. Please log in again.",
            code: "PREAUTH_INVALID",
          });
        }

        const userId = preAuthContext.userId;
        const username = preAuthContext.username;
        const cleanCode = String(code).replace(/[\s-]/g, "").trim();

        // Rate limiting check
        const now = Date.now();
        const attempts = totpAttempts.get(userId);
        if (attempts) {
          if (now - attempts.lastAttempt < TOTP_LOCKOUT_MS && attempts.count >= MAX_TOTP_ATTEMPTS) {
            const remainingMs = TOTP_LOCKOUT_MS - (now - attempts.lastAttempt);
            const remainingMin = Math.ceil(remainingMs / 60000);
            return res.status(429).json({
              error: `Too many failed attempts. Try again in ${remainingMin} minutes.`,
              retryAfterMs: remainingMs,
            });
          }
          if (now - attempts.lastAttempt >= TOTP_LOCKOUT_MS) {
            totpAttempts.delete(userId);
          }
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.totpSecret || !user.totpEnabled) {
          return res.status(400).json({ error: "TOTP is not enabled for this user" });
        }

        const isValid = authenticator.verify({ token: cleanCode, secret: user.totpSecret });

        if (!isValid) {
          const current = totpAttempts.get(userId) || { count: 0, lastAttempt: now };
          totpAttempts.set(userId, { count: current.count + 1, lastAttempt: now });
          const remaining = MAX_TOTP_ATTEMPTS - current.count - 1;

          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_FAILED, {
            success: false,
            resource: "auth",
            action: "totp_validate_failed",
            errorMessage: "Invalid TOTP code",
            details: { userId, attemptsRemaining: remaining },
          });

          return res.status(400).json({
            error: "Invalid verification code",
            attemptsRemaining: Math.max(0, remaining),
          });
        }

        await consumePreAuthToken(preAuthToken);
        totpAttempts.delete(userId);
        clearDualLockout(username.toLowerCase(), ip);

        const sessionUser = {
          claims: { sub: user.id },
          id: user.id,
        };

        // Check if passport login function is available
        if (typeof req.login !== "function") {
          // Fallback: set session manually without passport
          // Ensure session exists before trying to write to it
          if (!req.session) {
            return res.status(500).json({ error: "Session not available" });
          }

          // Initialize passport object on session if it doesn't exist
          if (!(req.session as any).passport) {
            (req.session as any).passport = {};
          }
          (req.session as any).passport.user = sessionUser;
          (req.session as any).totpVerified = true;
          (req.session as any).userId = user.id;

          req.session.save((saveErr: any) => {
            if (saveErr) {
              return res.status(500).json({ error: "Failed to save session after TOTP" });
            }

            logSecurityEvent({
              action: "login",
              resourceType: "auth",
              userId: user.id,
              userEmail: user.username || undefined,
              ip,
              userAgent: req.get("User-Agent"),
              details: {
                method: "password+totp",
                role: user.role,
                mfaCompleted: true,
                preAuthRiskScore: preAuthContext.riskScore,
              },
            });

            res.json({
              success: true,
              valid: true,
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
              },
            });
          });
          return;
        }

        req.login(sessionUser, (err: any) => {
          if (err) {
            return res.status(500).json({ error: "Failed to create session after TOTP" });
          }

          (req.session as any).totpVerified = true;

          req.session.save((saveErr: any) => {
            if (saveErr) {
              return res.status(500).json({ error: "Failed to save session after TOTP" });
            }

            logSecurityEvent({
              action: "login",
              resourceType: "auth",
              userId: user.id,
              userEmail: user.username || undefined,
              ip,
              userAgent: req.get("User-Agent"),
              details: {
                method: "password+totp",
                role: user.role,
                mfaCompleted: true,
                preAuthRiskScore: preAuthContext.riskScore,
              },
            });

            res.json({
              success: true,
              valid: true,
              user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
              },
            });
          });
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to validate TOTP" });
      }
    }
  );

  // Validate recovery code
  app.post("/api/totp/validate-recovery", async (req: Request, res: Response) => {
    try {
      const { recoveryCode, preAuthToken } = req.body;

      if (!recoveryCode) {
        return res.status(400).json({ error: "Recovery code is required" });
      }

      if (!preAuthToken) {
        return res.status(400).json({ error: "Pre-auth token is required" });
      }

      const preAuthContext = await verifyPreAuthToken(preAuthToken);
      if (!preAuthContext) {
        return res.status(401).json({
          error: "Invalid or expired pre-auth token. Please log in again.",
          code: "PREAUTH_INVALID",
        });
      }

      const userId = preAuthContext.userId;
      const now = Date.now();
      const attempts = recoveryAttempts.get(userId);
      if (attempts) {
        if (
          now - attempts.lastAttempt < RECOVERY_LOCKOUT_MS &&
          attempts.count >= MAX_RECOVERY_ATTEMPTS
        ) {
          const remainingMs = RECOVERY_LOCKOUT_MS - (now - attempts.lastAttempt);
          const remainingMin = Math.ceil(remainingMs / 60000);
          return res.status(429).json({
            error: `Too many failed attempts. Try again in ${remainingMin} minutes.`,
            retryAfterMs: remainingMs,
          });
        }
        if (now - attempts.lastAttempt >= RECOVERY_LOCKOUT_MS) {
          recoveryAttempts.delete(userId);
        }
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.totpEnabled) {
        return res.status(400).json({ error: "TOTP is not enabled" });
      }

      const recoveryCodes = (user as any).totpRecoveryCodes || [];
      const normalizedCode = recoveryCode.toUpperCase().replace(/-/g, "");
      const codeIndex = recoveryCodes.findIndex((c: string) => c === normalizedCode);

      if (codeIndex === -1) {
        const current = recoveryAttempts.get(userId) || { count: 0, lastAttempt: now };
        recoveryAttempts.set(userId, { count: current.count + 1, lastAttempt: now });
        const remaining = MAX_RECOVERY_ATTEMPTS - current.count - 1;
        return res.status(400).json({
          error: "Invalid recovery code",
          attemptsRemaining: Math.max(0, remaining),
        });
      }

      recoveryAttempts.delete(userId);
      await consumePreAuthToken(preAuthToken);
      recoveryCodes.splice(codeIndex, 1);
      await storage.updateUser(userId, { totpRecoveryCodes: recoveryCodes } as any);

      (req as any).session.regenerate((err: any) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }

        (req as any).session.userId = user.id;
        (req as any).session.totpValidated = true;

        (req as any).session.save((saveErr: any) => {
          if (saveErr) {
            return res.status(500).json({ error: "Session save error" });
          }

          res.json({
            success: true,
            message: "Recovery code accepted",
            remainingCodes: recoveryCodes.length,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              firstName: user.firstName,
              lastName: user.lastName,
            },
          });
        });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to validate recovery code" });
    }
  });

  // Magic link routes
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
          res.json(result);
        } else {
          res.status(400).json(result);
        }
      } catch (error) {
        res.status(500).json({ success: false, error: "Failed to verify magic link" });
      }
    }
  );

  // Get all available roles (admin only)
  app.get("/api/roles", isAuthenticated, requireRole("admin"), async (req, res) => {
    res.json({
      roles: ["admin", "editor", "author", "contributor", "viewer"],
      permissions: ROLE_PERMISSIONS,
    });
  });

  // NOTE: DEV auto-login endpoint is now registered in routes.ts AFTER setupAuth
  // to ensure session middleware is available

  // ============================================
  // EMAIL OTP LOGIN (Simple email-based login)
  // Database-backed for persistence across restarts
  // ============================================

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
  const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
  const MAX_OTP_ATTEMPTS = 5;

  // Helper: Ensure email_otp_codes table exists (runtime DDL)
  async function ensureEmailOtpTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS email_otp_codes (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR NOT NULL,
          code_hash VARCHAR NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_email_otp_codes_email ON email_otp_codes(email)
      `);
    } catch (err) {}
  }

  // Initialize table on startup
  ensureEmailOtpTable().then(() => {});

  // Hash function for OTP codes
  function hashCode(code: string): string {
    return crypto.createHash("sha256").update(code).digest("hex");
  }

  // Request OTP - only for admin email
  app.post("/api/auth/email-otp/request", loginRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Only allow the admin email
      if (!ADMIN_EMAIL || normalizedEmail !== ADMIN_EMAIL.toLowerCase()) {
        // Security: Don't reveal if email exists - generic message

        return res.status(200).json({
          success: true,
          message: "If this email is registered, you will receive a code shortly",
        });
      }

      // Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = hashCode(code);
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

      // Delete any existing OTP for this email
      await db.execute(sql`DELETE FROM email_otp_codes WHERE email = ${normalizedEmail}`);

      // Store OTP in database
      await db.execute(sql`
        INSERT INTO email_otp_codes (email, code_hash, attempts, expires_at)
        VALUES (${normalizedEmail}, ${codeHash}, 0, ${expiresAt})
      `);

      // Send email via Resend
      try {
        const { Resend } = await import("resend");
        const resendApiKey = process.env.RESEND_API_KEY;

        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: process.env.FROM_EMAIL || "Travi CMS <noreply@traviapp.com>",
            to: normalizedEmail,
            subject: "Your Travi CMS Login Code",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333; text-align: center;">Travi CMS Login</h2>
                <p style="color: #666; text-align: center;">Your login code is:</p>
                <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
                </div>
                <p style="color: #999; font-size: 12px; text-align: center;">
                  This code expires in 5 minutes. If you didn't request this, ignore this email.
                </p>
              </div>
            `,
          });
        } else {
          // Fallback for development - log code
        }
      } catch (emailError) {
        // Still return success to not leak info
      }

      // In development, include the code in response for testing
      const isDev = process.env.NODE_ENV === "development";
      res.json({
        success: true,
        message: "If this email is registered, you will receive a code shortly",
        expiresIn: OTP_EXPIRY_MS / 1000,
        ...(isDev && { _devCode: code }), // Only included in development!
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Verify OTP and login
  app.post("/api/auth/email-otp/verify", loginRateLimiter, async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email and code are required" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Get OTP from database
      const otpRecords = await db.execute(sql`
        SELECT id, code_hash, attempts, expires_at 
        FROM email_otp_codes 
        WHERE email = ${normalizedEmail}
        LIMIT 1
      `);

      const otpData = otpRecords.rows[0] as
        | { id: string; code_hash: string; attempts: number; expires_at: Date }
        | undefined;

      // Check if OTP exists
      if (!otpData) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      // Check expiry
      if (new Date() > new Date(otpData.expires_at)) {
        await db.execute(sql`DELETE FROM email_otp_codes WHERE email = ${normalizedEmail}`);
        return res.status(400).json({ error: "Code has expired. Please request a new one." });
      }

      // Check attempts
      if (otpData.attempts >= MAX_OTP_ATTEMPTS) {
        await db.execute(sql`DELETE FROM email_otp_codes WHERE email = ${normalizedEmail}`);
        return res.status(429).json({ error: "Too many attempts. Please request a new code." });
      }

      // Verify code
      const codeHash = hashCode(code.trim());
      if (otpData.code_hash !== codeHash) {
        await db.execute(sql`
          UPDATE email_otp_codes 
          SET attempts = attempts + 1 
          WHERE email = ${normalizedEmail}
        `);
        return res.status(400).json({
          error: "Invalid code",
          attemptsRemaining: MAX_OTP_ATTEMPTS - otpData.attempts - 1,
        });
      }

      // OTP is valid - delete it
      await db.execute(sql`DELETE FROM email_otp_codes WHERE email = ${normalizedEmail}`);

      // Find admin user by email
      let adminUser = await storage.getUserByEmail(normalizedEmail);

      // If no user with this email, get the first admin user from the list
      if (!adminUser) {
        const allUsers = await storage.getUsers();
        adminUser = allUsers.find(u => u.role === "admin");
      }

      if (!adminUser) {
        return res.status(500).json({ error: "Admin user not found" });
      }

      // Create session
      const authReq = req as AuthRequest;
      if (!authReq.session) {
        return res.status(500).json({ error: "Session not available" });
      }

      authReq.session.userId = adminUser.id;

      // Use passport to login
      const userForPassport = {
        claims: {
          sub: adminUser.id,
          email: adminUser.email || normalizedEmail,
          name: adminUser.name || "Admin",
        },
      };

      authReq.login(userForPassport, (err: unknown) => {
        if (err) {
          return res.status(500).json({ error: "Failed to create session" });
        }

        authReq.session.save((saveErr: unknown) => {
          if (saveErr) {
          }

          // Log audit event
          logSecurityEventFromRequest(req, SecurityEventType.LOGIN_SUCCESS, {
            success: true,
            resource: "auth",
            action: "email_otp_login",
            details: {
              method: "email_otp",
              email: normalizedEmail.substring(0, 5) + "***",
              userId: adminUser!.id,
            },
          });

          res.json({
            success: true,
            message: "Login successful",
            user: {
              id: adminUser!.id,
              email: adminUser!.email,
              name: adminUser!.name,
              role: adminUser!.role,
            },
          });
        });
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify code" });
    }
  });
}
