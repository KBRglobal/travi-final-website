/**
 * Enterprise Security & TOTP 2FA Routes
 * Device management, session security, security context, and two-factor authentication
 */

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import {
  requirePermission,
  logAuditEvent as logSecurityEvent,
  getAuditLogs,
  getBlockedIps,
} from "../security";
import { loginRateLimiter } from "../security/rate-limiter";
import { logSecurityEventFromRequest, SecurityEventType } from "../security/audit-logger";
import { verifyPreAuthToken, consumePreAuthToken } from "../security/pre-auth-token";
import { clearDualLockout } from "../security/password-policy";
import { adminAuthGuards } from "../security/admin-hardening";
import {
  deviceFingerprint,
  contextualAuth,
  sessionSecurity,
  threatIntelligence,
} from "../enterprise-security";
import { ROLE_PERMISSIONS, type UserRole } from "@shared/schema";

// Configure TOTP with time window tolerance
authenticator.options = { window: 1 };

// Authenticated request type
type AuthRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string; email?: string; name?: string } };
  session: Request["session"] & {
    userId?: string;
    id?: string;
    totpVerified?: boolean;
    save(callback?: (err?: unknown) => void): void;
    regenerate(callback?: (err?: unknown) => void): void;
  };
  login(user: unknown, callback: (err?: unknown) => void): void;
  ip?: string;
};

// Helper to get user ID from authenticated request
function getUserId(req: AuthRequest): string {
  return req.user!.claims!.sub;
}

// Role checking middleware
function requireRole(role: UserRole | UserRole[]) {
  return async (req: Request, res: Response, next: Function): Promise<void> => {
    const authReq = req as AuthRequest;
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
      res.status(403).json({
        error: "Insufficient permissions",
        requiredRole: role,
        currentRole: user.role,
      });
      return;
    }
    next();
  };
}

export function registerSecurityRoutes(app: Express): void {
  // ============================================================================
  // ENTERPRISE SECURITY ENDPOINTS
  // ============================================================================

  // Get user's registered devices
  app.get("/api/security/devices", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
      const devices = deviceFingerprint.getUserDevices(userId);
      res.json({ devices });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  // Trust a device
  app.post("/api/security/devices/:fingerprintHash/trust", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
      const fingerprint = deviceFingerprint.extractFromRequest(req);
      await deviceFingerprint.trustDevice(userId, fingerprint);
      res.json({ success: true, message: "Device trusted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to trust device" });
    }
  });

  // Revoke a device
  app.delete("/api/security/devices/:fingerprintHash", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
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
  });

  // Get user's active sessions
  app.get("/api/security/sessions", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
      const sessions = sessionSecurity.getUserSessions(userId);

      // Return sessions without sensitive data
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
  app.post("/api/security/sessions/revoke-all", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
      const currentSessionId = authReq.session?.id;

      const count = await sessionSecurity.revokeAllUserSessions(userId, currentSessionId);
      res.json({ success: true, message: `${count} sessions revoked` });
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke sessions" });
    }
  });

  // Get current security context
  app.get("/api/security/context", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const fingerprint = deviceFingerprint.extractFromRequest(req);

      // Get geo location
      const geo = await contextualAuth.getGeoLocation(ip);

      // Evaluate current context
      const contextResult = await contextualAuth.evaluateContext(
        userId,
        ip,
        fingerprint,
        geo || undefined
      );

      // Check device status
      const isKnown = deviceFingerprint.isKnownDevice(userId, fingerprint);
      const isTrusted = deviceFingerprint.isDeviceTrusted(userId, fingerprint);

      // Get threat analysis
      const threatAnalysis = threatIntelligence.analyzeRequest(req);

      res.json({
        ip: ip.substring(0, ip.lastIndexOf(".")) + ".xxx", // Mask last octet
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

  // Admin: Get security dashboard summary (requires admin role)
  app.get("/api/security/dashboard", isAuthenticated, requireRole("admin"), async (req, res) => {
    try {
      const blockedIps = getBlockedIps();

      res.json({
        blockedIps: blockedIps.length,
        blockedIpList: blockedIps.slice(0, 10), // Top 10
        recentSecurityEvents: await getAuditLogs({ resourceType: "auth", limit: 20 }),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get security dashboard" });
    }
  });

  // ============================================================================
  // TOTP 2FA Routes
  // ============================================================================

  // Get TOTP status for current user
  app.get("/api/totp/status", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
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
  app.post("/api/totp/setup", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
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

      // Generate a new secret
      const secret = authenticator.generateSecret();

      // Create the otpauth URL for the authenticator app
      const email = user.email || "user";
      const otpauth = authenticator.keyuri(email, "Travi CMS", secret);

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

      // Store the secret temporarily (not enabled yet until verified)
      await storage.updateUser(userId, { totpSecret: secret, totpEnabled: false });

      // Only return QR code and otpauth URI, not raw secret (security best practice)
      res.json({
        qrCode: qrCodeDataUrl,
        otpauth,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to setup TOTP" });
    }
  });

  // Verify TOTP and enable 2FA
  // Rate limited: 5 attempts per 15 minutes per IP to prevent TOTP brute-forcing
  app.post("/api/totp/verify", loginRateLimiter, isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
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

      // Verify the TOTP code
      const isValid = authenticator.verify({ token: code, secret: user.totpSecret });

      if (!isValid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Generate 8 recovery codes using cryptographically secure random bytes
      const recoveryCodes: string[] = [];
      for (let i = 0; i < 8; i++) {
        const recoveryCode = crypto.randomBytes(6).toString("hex").toUpperCase();
        recoveryCodes.push(recoveryCode);
      }

      // Hash recovery codes with bcrypt before storing in DB
      const hashedCodes = await Promise.all(recoveryCodes.map(code => bcrypt.hash(code, 10)));
      await storage.updateUser(userId, { totpEnabled: true, totpRecoveryCodes: hashedCodes });

      // Return plaintext codes to the user (they must save them now)
      res.json({
        success: true,
        message: "Two-factor authentication enabled",
        recoveryCodes,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to verify TOTP" });
    }
  });

  // Disable TOTP
  app.post("/api/totp/disable", isAuthenticated, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = getUserId(authReq);
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

      // Verify the TOTP code before disabling
      const isValid = authenticator.verify({ token: code, secret: user.totpSecret });

      if (!isValid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Disable TOTP for the user
      await storage.updateUser(userId, { totpEnabled: false, totpSecret: null });

      res.json({ success: true, message: "Two-factor authentication disabled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to disable TOTP" });
    }
  });

  // Rate limiting for TOTP validation (in-memory, per-session)
  const totpAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const MAX_TOTP_ATTEMPTS = 5;
  const TOTP_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

  // TOTP validation with pre-auth token flow
  // Session is only created AFTER successful TOTP verification
  app.post(
    "/api/totp/validate",
    ...adminAuthGuards,
    loginRateLimiter,
    async (req: Request, res: Response) => {
      try {
        const authReq = req as AuthRequest;
        const { code, preAuthToken } = req.body;
        const ip = req.ip || req.socket.remoteAddress || "unknown";

        if (!code) {
          return res.status(400).json({ error: "Verification code is required" });
        }

        if (!preAuthToken) {
          return res.status(400).json({ error: "Pre-auth token is required" });
        }

        // Verify the pre-auth token
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

        // Clean the code (remove spaces and dashes)
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
          // Reset if lockout expired
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

        // Verify the TOTP code (using cleaned code without spaces/dashes)
        const isValid = authenticator.verify({ token: cleanCode, secret: user.totpSecret });

        if (!isValid) {
          // Track failed attempt
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

        // TOTP valid - consume the pre-auth token (single use)
        await consumePreAuthToken(preAuthToken);

        // Clear TOTP attempts on success
        totpAttempts.delete(userId);

        // Clear dual lockout on successful MFA
        clearDualLockout(username.toLowerCase(), ip);

        // NOW create the session (this is the secure point where session is established)
        const sessionUser = {
          claims: { sub: user.id },
          id: user.id,
        };

        authReq.login(sessionUser, (err: any) => {
          if (err) {
            return res.status(500).json({ error: "Failed to create session after TOTP" });
          }

          // Mark TOTP as validated in session
          authReq.session.totpVerified = true;

          authReq.session.save((saveErr: any) => {
            if (saveErr) {
              return res.status(500).json({ error: "Failed to save session after TOTP" });
            }

            // Log successful MFA login
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

  // Rate limiting for recovery code validation (in-memory, per-user)
  const recoveryAttempts = new Map<string, { count: number; lastAttempt: number }>();
  const MAX_RECOVERY_ATTEMPTS = 3;
  const RECOVERY_LOCKOUT_MS = 30 * 60 * 1000; // 30 minutes

  // Validate recovery code (alternative to TOTP code) - supports preAuthToken flow
  app.post("/api/totp/validate-recovery", async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthRequest;
      const { recoveryCode, preAuthToken } = req.body;

      if (!recoveryCode) {
        return res.status(400).json({ error: "Recovery code is required" });
      }

      if (!preAuthToken) {
        return res.status(400).json({ error: "Pre-auth token is required" });
      }

      // Verify the pre-auth token
      const preAuthContext = await verifyPreAuthToken(preAuthToken);
      if (!preAuthContext) {
        return res.status(401).json({
          error: "Invalid or expired pre-auth token. Please log in again.",
          code: "PREAUTH_INVALID",
        });
      }

      const userId = preAuthContext.userId;

      // Rate limiting check
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

      // Compare against bcrypt-hashed recovery codes
      let codeIndex = -1;
      for (let i = 0; i < recoveryCodes.length; i++) {
        const matches = await bcrypt.compare(normalizedCode, recoveryCodes[i]);
        if (matches) {
          codeIndex = i;
          break;
        }
      }

      if (codeIndex === -1) {
        // Track failed attempt
        const current = recoveryAttempts.get(userId) || { count: 0, lastAttempt: now };
        recoveryAttempts.set(userId, { count: current.count + 1, lastAttempt: now });
        const remaining = MAX_RECOVERY_ATTEMPTS - current.count - 1;
        return res.status(400).json({
          error: "Invalid recovery code",
          attemptsRemaining: Math.max(0, remaining),
        });
      }

      // Clear attempts on success
      recoveryAttempts.delete(userId);

      // Consume the pre-auth token (single use)
      await consumePreAuthToken(preAuthToken);

      // Remove used recovery code
      recoveryCodes.splice(codeIndex, 1);
      await storage.updateUser(userId, { totpRecoveryCodes: recoveryCodes } as any);

      // Create session for the user
      authReq.session.regenerate((err: any) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }

        authReq.session.userId = user.id;
        authReq.session.totpVerified = true;

        authReq.session.save((saveErr: any) => {
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
}
