/**
 * Enterprise Security Module - Defense in Depth Architecture
 *
 * Implements:
 * - Contextual Authentication (Geo, Device, Time-based)
 * - Device Fingerprinting & Session Binding
 * - ABAC (Attribute-Based Access Control) hybrid with RBAC
 * - Exponential Backoff with Jitter
 * - Password Security with bcrypt (with argon2id upgrade path)
 * - Behavioral Analysis & Threat Detection
 * - Secure Session Management
 */

import type { Request, Response, NextFunction } from "express";
import * as crypto from "node:crypto";
import bcrypt from "bcrypt";
import { auditLogger } from "./advanced-security";
import { isApprovedBot } from "./security";

// ============================================================================
// DEVICE FINGERPRINTING
// ============================================================================

export interface DeviceFingerprint {
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  screenResolution?: string;
  timezone?: string;
  platform?: string;
  colorDepth?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  touchSupport?: boolean;
}

type DeviceType = "desktop" | "mobile" | "tablet" | "unknown";

export interface DeviceInfo {
  fingerprintHash: string;
  deviceType: DeviceType;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  isTrusted: boolean;
  firstSeen: Date;
  lastSeen: Date;
  loginCount: number;
}

// In-memory store for device fingerprints (use Redis in production)
const deviceStore: Map<string, Map<string, DeviceInfo>> = new Map(); // userId -> (fingerprintHash -> DeviceInfo)

function parseUserAgent(ua: string): {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: DeviceType;
} {
  let browser = "Unknown";
  let browserVersion = "";
  let os = "Unknown";
  let osVersion = "";
  let deviceType: DeviceType = "unknown";

  // Detect browser
  if (ua.includes("Firefox/")) {
    browser = "Firefox";
    browserVersion = /Firefox\/(\d+(?:\.\d+)?)/.exec(ua)?.[1] || "";
  } else if (ua.includes("Edg/")) {
    browser = "Edge";
    browserVersion = /Edg\/(\d+(?:\.\d+)?)/.exec(ua)?.[1] || "";
  } else if (ua.includes("Chrome/")) {
    browser = "Chrome";
    browserVersion = /Chrome\/(\d+(?:\.\d+)?)/.exec(ua)?.[1] || "";
  } else if (ua.includes("Safari/") && !ua.includes("Chrome")) {
    browser = "Safari";
    browserVersion = /Version\/(\d+(?:\.\d+)?)/.exec(ua)?.[1] || "";
  }

  // Detect OS
  if (ua.includes("Windows")) {
    os = "Windows";
    osVersion = /Windows NT (\d+(?:\.\d+)?)/.exec(ua)?.[1] || "";
  } else if (ua.includes("Mac OS X")) {
    os = "macOS";
    osVersion = /Mac OS X (\d+[._]\d+)/.exec(ua)?.[1]?.replace("_", ".") || "";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  } else if (ua.includes("Android")) {
    os = "Android";
    osVersion = /Android (\d+(?:\.\d+)?)/.exec(ua)?.[1] || "";
  } else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
    osVersion = /OS (\d+[._]\d+)/.exec(ua)?.[1]?.replace("_", ".") || "";
  }

  // Detect device type
  if (ua.includes("Mobile") || (ua.includes("Android") && !ua.includes("Tablet"))) {
    deviceType = "mobile";
  } else if (ua.includes("Tablet") || ua.includes("iPad")) {
    deviceType = "tablet";
  } else if (os === "Windows" || os === "macOS" || os === "Linux") {
    deviceType = "desktop";
  }

  return { browser, browserVersion, os, osVersion, deviceType };
}

export const deviceFingerprint = {
  /**
   * Generate a hash from device fingerprint data
   */
  generateHash(fingerprint: DeviceFingerprint): string {
    const data = [
      fingerprint.userAgent,
      fingerprint.acceptLanguage,
      fingerprint.platform || "",
      fingerprint.timezone || "",
      fingerprint.screenResolution || "",
      fingerprint.colorDepth?.toString() || "",
      fingerprint.hardwareConcurrency?.toString() || "",
    ].join("|");

    return crypto.createHash("sha256").update(data).digest("hex").substring(0, 32);
  },

  /**
   * Extract fingerprint from request
   */
  extractFromRequest(req: Request): DeviceFingerprint {
    const getHeader = (name: string): string => {
      const val = req.headers[name];
      return typeof val === "string" ? val : "";
    };
    return {
      userAgent: getHeader("user-agent"),
      acceptLanguage: getHeader("accept-language"),
      acceptEncoding: getHeader("accept-encoding"),
      timezone: getHeader("x-timezone") || req.body?.timezone,
      screenResolution: getHeader("x-screen-resolution") || req.body?.screenResolution,
      platform: getHeader("x-platform") || req.body?.platform,
      colorDepth: Number.parseInt(getHeader("x-color-depth")) || undefined,
      hardwareConcurrency: Number.parseInt(getHeader("x-hardware-concurrency")) || undefined,
      deviceMemory: Number.parseFloat(getHeader("x-device-memory")) || undefined,
      touchSupport: getHeader("x-touch-support") === "true",
    };
  },

  /**
   * Register or update device for user
   */
  async registerDevice(
    userId: string,
    fingerprint: DeviceFingerprint,
    ip: string
  ): Promise<DeviceInfo> {
    const hash = this.generateHash(fingerprint);
    const { browser, browserVersion, os, osVersion, deviceType } = parseUserAgent(
      fingerprint.userAgent
    );

    let userDevices = deviceStore.get(userId);
    if (!userDevices) {
      userDevices = new Map();
      deviceStore.set(userId, userDevices);
    }

    let device = userDevices.get(hash);
    const now = new Date();

    if (device) {
      // Update existing device
      device.lastSeen = now;
      device.loginCount++;
    } else {
      // New device
      device = {
        fingerprintHash: hash,
        deviceType,
        browser,
        browserVersion,
        os,
        osVersion,
        isTrusted: false, // New devices are not trusted by default
        firstSeen: now,
        lastSeen: now,
        loginCount: 1,
      };

      // Log new device detection
      await auditLogger.log({
        action: "security:new_device_detected",
        userId,
        ipAddress: ip,
        details: {
          deviceType,
          browser,
          os,
          fingerprintHash: hash.substring(0, 8) + "...",
        },
        severity: "warning",
      });
    }

    userDevices.set(hash, device);
    return device;
  },

  /**
   * Check if device is known for user
   */
  isKnownDevice(userId: string, fingerprint: DeviceFingerprint): boolean {
    const hash = this.generateHash(fingerprint);
    const userDevices = deviceStore.get(userId);
    return userDevices?.has(hash) || false;
  },

  /**
   * Check if device is trusted
   */
  isDeviceTrusted(userId: string, fingerprint: DeviceFingerprint): boolean {
    const hash = this.generateHash(fingerprint);
    const userDevices = deviceStore.get(userId);
    const device = userDevices?.get(hash);
    return device?.isTrusted || false;
  },

  /**
   * Mark device as trusted
   */
  async trustDevice(userId: string, fingerprint: DeviceFingerprint): Promise<void> {
    const hash = this.generateHash(fingerprint);
    const userDevices = deviceStore.get(userId);
    const device = userDevices?.get(hash);

    if (device) {
      device.isTrusted = true;
      await auditLogger.log({
        action: "security:device_trusted",
        userId,
        details: { fingerprintHash: hash.substring(0, 8) + "..." },
        severity: "info",
      });
    }
  },

  /**
   * Get all devices for user
   */
  getUserDevices(userId: string): DeviceInfo[] {
    const userDevices = deviceStore.get(userId);
    return userDevices ? Array.from(userDevices.values()) : [];
  },

  /**
   * Revoke a device
   */
  async revokeDevice(userId: string, fingerprintHash: string): Promise<boolean> {
    const userDevices = deviceStore.get(userId);
    if (userDevices?.has(fingerprintHash)) {
      userDevices.delete(fingerprintHash);
      await auditLogger.log({
        action: "security:device_revoked",
        userId,
        details: { fingerprintHash: fingerprintHash.substring(0, 8) + "..." },
        severity: "info",
      });
      return true;
    }
    return false;
  },
};

// ============================================================================
// CONTEXTUAL AUTHENTICATION
// ============================================================================

interface GeoLocation {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface ContextualAuthResult {
  allowed: boolean;
  riskScore: number; // 0-100
  riskFactors: string[];
  requiresMfa: boolean;
  requiresVerification: boolean;
}

// User-specific access policies
interface UserAccessPolicy {
  allowedCountries?: string[]; // ISO country codes
  allowedTimeWindow?: { start: number; end: number }; // Hours in UTC
  allowedDaysOfWeek?: number[]; // 0-6 (Sunday-Saturday)
  maxConcurrentSessions?: number;
  requireTrustedDevice?: boolean;
  requireMfaForNewDevice?: boolean;
  ipWhitelist?: string[];
  ipBlacklist?: string[];
}

// In-memory policy store (use database in production)
const userPolicies: Map<string, UserAccessPolicy> = new Map();

// Default enterprise policy
const defaultPolicy: UserAccessPolicy = {
  maxConcurrentSessions: 5,
  requireMfaForNewDevice: true,
  allowedTimeWindow: { start: 0, end: 24 }, // All hours
  allowedDaysOfWeek: [0, 1, 2, 3, 4, 5, 6], // All days
};

export const contextualAuth = {
  /**
   * Get geo location from IP (uses free IP-API service)
   */
  async getGeoLocation(ip: string): Promise<GeoLocation | null> {
    // Skip for localhost/private IPs
    if (
      ip === "::1" ||
      ip.startsWith("127.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.")
    ) {
      return { country: "Local", countryCode: "XX", timezone: "UTC" };
    }

    try {
      // Use free geo IP service (consider paid service for production)
      const response = await fetch(
        `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,city,lat,lon,timezone`
      );
      const data = await response.json();

      if (data.status === "success") {
        return {
          country: data.country,
          countryCode: data.countryCode,
          region: data.region,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
        };
      }
    } catch (error) {
      /* ignored */
    }

    return null;
  },

  /**
   * Get user's access policy
   */
  getPolicy(userId: string): UserAccessPolicy {
    return userPolicies.get(userId) || defaultPolicy;
  },

  /**
   * Set user's access policy
   */
  setPolicy(userId: string, policy: Partial<UserAccessPolicy>): void {
    const existing = userPolicies.get(userId) || { ...defaultPolicy };
    userPolicies.set(userId, { ...existing, ...policy });
  },

  /**
   * Evaluate authentication context and calculate risk
   */
  async evaluateContext(
    userId: string,
    ip: string,
    fingerprint: DeviceFingerprint,
    geo?: GeoLocation
  ): Promise<ContextualAuthResult> {
    const policy = this.getPolicy(userId);
    const riskFactors: string[] = [];
    let riskScore = 0;

    // 1. Device Check
    const isKnownDevice = deviceFingerprint.isKnownDevice(userId, fingerprint);
    const isTrustedDevice = deviceFingerprint.isDeviceTrusted(userId, fingerprint);

    if (!isKnownDevice) {
      riskScore += 30;
      riskFactors.push("new_device");
    } else if (!isTrustedDevice) {
      riskScore += 10;
      riskFactors.push("untrusted_device");
    }

    // 2. Geo Check
    if (geo && policy.allowedCountries && policy.allowedCountries.length > 0) {
      if (!policy.allowedCountries.includes(geo.countryCode || "")) {
        riskScore += 40;
        riskFactors.push("geo_blocked");
      }
    }

    // Check for impossible travel (if we have previous login)
    // TODO: Implement impossible travel detection - requires storing previous login
    // location/timestamp in session history and comparing geo distance vs time elapsed

    // 3. Time-based Check
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentDay = now.getUTCDay();

    if (policy.allowedTimeWindow) {
      const { start, end } = policy.allowedTimeWindow;
      if (start <= end) {
        if (currentHour < start || currentHour >= end) {
          riskScore += 20;
          riskFactors.push("outside_time_window");
        }
      } else {
        // Overnight window (e.g., 22:00 - 06:00)
        if (currentHour < start && currentHour >= end) {
          riskScore += 20;
          riskFactors.push("outside_time_window");
        }
      }
    }

    if (policy.allowedDaysOfWeek && !policy.allowedDaysOfWeek.includes(currentDay)) {
      riskScore += 15;
      riskFactors.push("outside_allowed_days");
    }

    // 4. IP Check
    if (policy.ipBlacklist?.includes(ip)) {
      riskScore += 50;
      riskFactors.push("ip_blacklisted");
    }

    if (policy.ipWhitelist && policy.ipWhitelist.length > 0 && !policy.ipWhitelist.includes(ip)) {
      riskScore += 25;
      riskFactors.push("ip_not_whitelisted");
    }

    // Calculate final decision
    const requiresMfa =
      riskScore >= 20 ||
      (policy.requireMfaForNewDevice === true && !isKnownDevice) ||
      (policy.requireTrustedDevice === true && !isTrustedDevice);

    const requiresVerification = riskScore >= 50;
    const allowed = riskScore < 70 && !riskFactors.includes("geo_blocked");

    // Log high-risk attempts
    if (riskScore >= 30) {
      await auditLogger.log({
        action: "security:high_risk_login_attempt",
        userId,
        ipAddress: ip,
        details: { riskScore, riskFactors, allowed },
        severity: riskScore >= 50 ? "warning" : "info",
      });
    }

    return {
      allowed,
      riskScore,
      riskFactors,
      requiresMfa,
      requiresVerification,
    };
  },
};

// ============================================================================
// ABAC (Attribute-Based Access Control)
// ============================================================================

interface ResourceAttributes {
  ownerId?: string;
  type: string;
  status?: string;
  isPublished?: boolean;
  locale?: string;
  createdAt?: Date;
  sensitivity?: "low" | "medium" | "high" | "critical";
}

interface SubjectAttributes {
  userId: string;
  role: string;
  department?: string;
  clearanceLevel?: number;
  isActive: boolean;
  mfaEnabled?: boolean;
}

interface EnvironmentAttributes {
  ip: string;
  time: Date;
  dayOfWeek: number;
  isOfficeHours: boolean;
  deviceTrusted: boolean;
  riskScore: number;
}

type AbacAction = "read" | "create" | "update" | "delete" | "publish" | "approve" | "admin";

interface AbacPolicy {
  id: string;
  name: string;
  description?: string;
  priority: number; // Lower = higher priority
  effect: "allow" | "deny";
  conditions: AbacCondition[];
}

interface AbacCondition {
  attribute: string;
  operator: "eq" | "ne" | "in" | "nin" | "gt" | "gte" | "lt" | "lte" | "contains" | "regex";
  value: string | number | boolean | string[] | number[];
}

// Policy store
const abacPolicies: AbacPolicy[] = [
  // Default deny all
  {
    id: "default-deny",
    name: "Default Deny",
    priority: 1000,
    effect: "deny",
    conditions: [],
  },
  // Allow admin all actions
  {
    id: "admin-allow-all",
    name: "Admin Full Access",
    priority: 1,
    effect: "allow",
    conditions: [{ attribute: "subject.role", operator: "eq", value: "admin" }],
  },
  // Block high-risk sessions from critical operations
  {
    id: "block-high-risk-critical",
    name: "Block High Risk Critical Ops",
    priority: 5,
    effect: "deny",
    conditions: [
      { attribute: "resource.sensitivity", operator: "eq", value: "critical" },
      { attribute: "environment.riskScore", operator: "gte", value: 50 },
    ],
  },
  // Require MFA for publish actions
  {
    id: "require-mfa-publish",
    name: "Require MFA for Publish",
    priority: 10,
    effect: "deny",
    conditions: [
      { attribute: "action", operator: "eq", value: "publish" },
      { attribute: "subject.mfaEnabled", operator: "ne", value: true },
    ],
  },
  // Allow editors to update non-critical resources
  {
    id: "editor-update-content",
    name: "Editor Update Content",
    priority: 20,
    effect: "allow",
    conditions: [
      { attribute: "subject.role", operator: "in", value: ["editor", "admin"] },
      { attribute: "action", operator: "in", value: ["read", "create", "update"] },
      { attribute: "resource.sensitivity", operator: "in", value: ["low", "medium"] },
    ],
  },
  // Authors can only edit own content
  {
    id: "author-own-content",
    name: "Author Own Content",
    priority: 30,
    effect: "allow",
    conditions: [
      { attribute: "subject.role", operator: "eq", value: "author" },
      { attribute: "action", operator: "in", value: ["read", "create", "update"] },
      { attribute: "resource.ownerId", operator: "eq", value: "$subject.userId" },
    ],
  },
  // Contributors can create and read
  {
    id: "contributor-create-read",
    name: "Contributor Create/Read",
    priority: 40,
    effect: "allow",
    conditions: [
      { attribute: "subject.role", operator: "eq", value: "contributor" },
      { attribute: "action", operator: "in", value: ["read", "create"] },
    ],
  },
  // Viewers can only read published content
  {
    id: "viewer-read-published",
    name: "Viewer Read Published",
    priority: 50,
    effect: "allow",
    conditions: [
      { attribute: "subject.role", operator: "eq", value: "viewer" },
      { attribute: "action", operator: "eq", value: "read" },
      { attribute: "resource.isPublished", operator: "eq", value: true },
    ],
  },
];

function evaluateCondition(condition: AbacCondition, context: Record<string, unknown>): boolean {
  // Get attribute value from nested path (e.g., "subject.role")
  const getValue = (path: string): unknown => {
    // Handle special $subject reference
    let actualPath = path;
    if (path.startsWith("$subject.")) {
      actualPath = "subject." + path.substring(9);
    }

    const parts = actualPath.split(".");
    let value: unknown = context;
    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    return value;
  };

  const attrValue = getValue(condition.attribute);
  let compareValue: unknown = condition.value;

  // Resolve $references in value
  if (typeof compareValue === "string" && compareValue.startsWith("$")) {
    compareValue = getValue(compareValue.substring(1));
  }

  switch (condition.operator) {
    case "eq":
      return attrValue === compareValue;
    case "ne":
      return attrValue !== compareValue;
    case "in":
      return Array.isArray(compareValue) && compareValue.includes(attrValue as never);
    case "nin":
      return Array.isArray(compareValue) && !compareValue.includes(attrValue as never);
    case "gt":
      return (attrValue as number) > (compareValue as number);
    case "gte":
      return (attrValue as number) >= (compareValue as number);
    case "lt":
      return (attrValue as number) < (compareValue as number);
    case "lte":
      return (attrValue as number) <= (compareValue as number);
    case "contains":
      return (
        typeof attrValue === "string" &&
        typeof compareValue === "string" &&
        attrValue.includes(compareValue)
      );
    case "regex":
      return (
        typeof attrValue === "string" &&
        typeof compareValue === "string" &&
        new RegExp(compareValue).test(attrValue)
      );
    default:
      return false;
  }
}

export const abac = {
  /**
   * Evaluate access request against ABAC policies
   */
  evaluate(
    action: AbacAction,
    subject: SubjectAttributes,
    resource: ResourceAttributes,
    environment: EnvironmentAttributes
  ): { allowed: boolean; matchedPolicy?: string; reason?: string } {
    const context = { action, subject, resource, environment };

    // Sort policies by priority
    const sortedPolicies = [...abacPolicies].sort((a, b) => a.priority - b.priority);

    for (const policy of sortedPolicies) {
      // Check if all conditions match
      const allMatch =
        policy.conditions.length === 0 ||
        policy.conditions.every(cond => evaluateCondition(cond, context));

      if (allMatch) {
        return {
          allowed: policy.effect === "allow",
          matchedPolicy: policy.id,
          reason: policy.name,
        };
      }
    }

    // Default deny
    return { allowed: false, matchedPolicy: "implicit-deny", reason: "No matching policy" };
  },

  /**
   * Add a custom ABAC policy
   */
  addPolicy(policy: AbacPolicy): void {
    // Remove existing policy with same ID
    const index = abacPolicies.findIndex(p => p.id === policy.id);
    if (index >= 0) {
      abacPolicies.splice(index, 1);
    }
    abacPolicies.push(policy);
  },

  /**
   * Remove an ABAC policy
   */
  removePolicy(policyId: string): boolean {
    const index = abacPolicies.findIndex(p => p.id === policyId);
    if (index >= 0) {
      abacPolicies.splice(index, 1);
      return true;
    }
    return false;
  },

  /**
   * Get all policies
   */
  getPolicies(): AbacPolicy[] {
    return [...abacPolicies];
  },
};

// ============================================================================
// EXPONENTIAL BACKOFF WITH JITTER
// ============================================================================

interface BackoffConfig {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
  jitterFactor: number; // 0-1
}

interface BackoffState {
  attempts: number;
  nextAllowedAt: number;
  lockedUntil?: number;
}

// Store for tracking backoff states
const backoffStore: Map<string, BackoffState> = new Map();

// Cleanup expired entries every 10 minutes - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(
    () => {
      const now = Date.now();
      backoffStore.forEach((state, key) => {
        if (
          (state.lockedUntil && state.lockedUntil < now) ||
          state.nextAllowedAt < now - 3600000 // 1 hour old
        ) {
          backoffStore.delete(key);
        }
      });
    },
    10 * 60 * 1000
  );
}

export const exponentialBackoff = {
  config: {
    baseDelayMs: 1000, // 1 second
    maxDelayMs: 3600000, // 1 hour
    maxAttempts: 10,
    jitterFactor: 0.3,
  } as BackoffConfig,

  /**
   * Calculate delay with exponential backoff and jitter
   */
  calculateDelay(attempt: number, config?: BackoffConfig): number {
    const cfg = config || this.config;
    // Exponential: base * 2^attempt
    const exponentialDelay = cfg.baseDelayMs * Math.pow(2, attempt);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, cfg.maxDelayMs);

    // Add jitter: delay * (1 - jitter/2 + random * jitter)
    const jitter = (Math.random() - 0.5) * cfg.jitterFactor;
    const finalDelay = cappedDelay * (1 + jitter);

    return Math.round(finalDelay);
  },

  /**
   * Record a failed attempt and get next allowed time
   */
  recordFailure(key: string): {
    blocked: boolean;
    nextAllowedAt: Date;
    remainingAttempts: number;
    delayMs: number;
  } {
    const now = Date.now();
    let state = backoffStore.get(key);

    if (!state || state.nextAllowedAt < now) {
      state = { attempts: 0, nextAllowedAt: now };
    }

    state.attempts++;

    if (state.attempts >= this.config.maxAttempts) {
      // Lock for max delay
      state.lockedUntil = now + this.config.maxDelayMs;
      state.nextAllowedAt = state.lockedUntil;
    } else {
      const delay = this.calculateDelay(state.attempts);
      state.nextAllowedAt = now + delay;
    }

    backoffStore.set(key, state);

    return {
      blocked: state.attempts >= this.config.maxAttempts,
      nextAllowedAt: new Date(state.nextAllowedAt),
      remainingAttempts: Math.max(0, this.config.maxAttempts - state.attempts),
      delayMs: state.nextAllowedAt - now,
    };
  },

  /**
   * Check if key is currently blocked
   */
  isBlocked(key: string): {
    blocked: boolean;
    retryAfterMs?: number;
    attempts: number;
  } {
    const state = backoffStore.get(key);
    const now = Date.now();

    if (!state) {
      return { blocked: false, attempts: 0 };
    }

    if (state.nextAllowedAt > now) {
      return {
        blocked: true,
        retryAfterMs: state.nextAllowedAt - now,
        attempts: state.attempts,
      };
    }

    return { blocked: false, attempts: state.attempts };
  },

  /**
   * Reset backoff state after successful attempt
   */
  reset(key: string): void {
    backoffStore.delete(key);
  },

  /**
   * Express middleware for rate limiting with backoff
   */
  middleware(keyPrefix: string) {
    const self = this;
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.socket?.remoteAddress || "unknown";
      const userId = (req as Request & { user?: { claims?: { sub?: string } } }).user?.claims?.sub;
      const key = `${keyPrefix}:${userId || ip}`;

      const status = self.isBlocked(key);

      if (status.blocked) {
        res.setHeader("Retry-After", Math.ceil((status.retryAfterMs || 0) / 1000));
        return res.status(429).json({
          error: "Too many failed attempts",
          retryAfter: Math.ceil((status.retryAfterMs || 0) / 1000),
          attempts: status.attempts,
        });
      }

      // Attach failure handler to response using res.locals
      res.locals.recordFailure = () => {
        return self.recordFailure(key);
      };

      res.locals.resetBackoff = () => {
        self.reset(key);
      };

      next();
    };
  },
};

// ============================================================================
// PASSWORD SECURITY
// ============================================================================

interface PasswordStrengthResult {
  score: number; // 0-100
  strength: "very_weak" | "weak" | "fair" | "strong" | "very_strong";
  feedback: string[];
  meetsRequirements: boolean;
}

export const passwordSecurity = {
  /**
   * Hash password using bcrypt with high cost factor
   * Future: Support argon2id when available
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Higher than default for better security
    return bcrypt.hash(password, saltRounds);
  },

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  /**
   * Check password strength
   */
  checkStrength(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 15;
    if (password.length >= 16) score += 10;
    if (password.length < 8) feedback.push("Password should be at least 8 characters");

    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    else feedback.push("Add lowercase letters");

    if (/[A-Z]/.test(password)) score += 10;
    else feedback.push("Add uppercase letters");

    if (/\d/.test(password)) score += 10;
    else feedback.push("Add numbers");

    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 15;
    else feedback.push("Add special characters");

    // Pattern checks (deductions)
    if (/(.)\1{2,}/.test(password)) {
      score -= 10;
      feedback.push("Avoid repeating characters");
    }

    if (/^[a-zA-Z]+\d+$/.test(password) || /^\d+[a-zA-Z]+$/.test(password)) {
      score -= 10;
      feedback.push("Use a more complex pattern");
    }

    // Common patterns
    const commonPatterns = ["123456", "password", "qwerty", "abc123", "letmein"];
    if (commonPatterns.some(p => password.toLowerCase().includes(p))) {
      score -= 20;
      feedback.push("Avoid common password patterns");
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    // Determine strength
    let strength: PasswordStrengthResult["strength"];
    if (score < 20) strength = "very_weak";
    else if (score < 40) strength = "weak";
    else if (score < 60) strength = "fair";
    else if (score < 80) strength = "strong";
    else strength = "very_strong";

    // Check minimum requirements
    const meetsRequirements =
      password.length >= 8 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password);

    return { score, strength, feedback, meetsRequirements };
  },

  /**
   * Generate secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}";
    const all = lowercase + uppercase + numbers + special;

    // Ensure at least one of each type
    let password =
      lowercase[crypto.randomInt(lowercase.length)] +
      uppercase[crypto.randomInt(uppercase.length)] +
      numbers[crypto.randomInt(numbers.length)] +
      special[crypto.randomInt(special.length)];

    // Fill remaining with random chars
    for (let i = password.length; i < length; i++) {
      password += all[crypto.randomInt(all.length)];
    }

    // Shuffle
    return password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  },
};

// ============================================================================
// SESSION SECURITY
// ============================================================================

interface SecureSession {
  id: string;
  userId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
  riskScore: number;
}

// Session store (use Redis in production)
const sessionStore: Map<string, SecureSession> = new Map();

export const sessionSecurity = {
  /**
   * Create a new secure session
   */
  async createSession(
    userId: string,
    fingerprint: DeviceFingerprint,
    ip: string,
    options?: { expiresInMs?: number; riskScore?: number }
  ): Promise<SecureSession> {
    const sessionId = crypto.randomBytes(32).toString("hex");
    const now = new Date();
    const expiresInMs = options?.expiresInMs || 7 * 24 * 60 * 60 * 1000; // 7 days default

    const session: SecureSession = {
      id: sessionId,
      userId,
      deviceFingerprint: deviceFingerprint.generateHash(fingerprint),
      ipAddress: ip,
      userAgent: fingerprint.userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + expiresInMs),
      isActive: true,
      riskScore: options?.riskScore || 0,
    };

    sessionStore.set(sessionId, session);

    await auditLogger.log({
      action: "security:session_created",
      userId,
      ipAddress: ip,
      details: { sessionId: sessionId.substring(0, 8) + "..." },
      severity: "info",
    });

    return session;
  },

  /**
   * Validate session with device binding
   */
  validateSession(
    sessionId: string,
    fingerprint: DeviceFingerprint,
    ip: string
  ): { valid: boolean; session?: SecureSession; error?: string } {
    const session = sessionStore.get(sessionId);

    if (!session) {
      return { valid: false, error: "Session not found" };
    }

    if (!session.isActive) {
      return { valid: false, error: "Session has been revoked" };
    }

    if (new Date() > session.expiresAt) {
      sessionStore.delete(sessionId);
      return { valid: false, error: "Session expired" };
    }

    // Device binding check
    const currentFingerprint = deviceFingerprint.generateHash(fingerprint);
    if (session.deviceFingerprint !== currentFingerprint) {
      // Potential session hijacking attempt
      auditLogger.log({
        action: "security:session_fingerprint_mismatch",
        userId: session.userId,
        ipAddress: ip,
        details: {
          sessionId: sessionId.substring(0, 8) + "...",
          originalIp: session.ipAddress,
          currentIp: ip,
        },
        severity: "warning",
      });
      return { valid: false, error: "Device fingerprint mismatch" };
    }

    // Update last activity
    session.lastActivityAt = new Date();

    return { valid: true, session };
  },

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string, reason?: string): Promise<boolean> {
    const session = sessionStore.get(sessionId);
    if (!session) return false;

    session.isActive = false;

    await auditLogger.log({
      action: "security:session_revoked",
      userId: session.userId,
      details: { sessionId: sessionId.substring(0, 8) + "...", reason },
      severity: "info",
    });

    return true;
  },

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    let count = 0;

    sessionStore.forEach((session, id) => {
      if (session.userId === userId && id !== exceptSessionId) {
        session.isActive = false;
        count++;
      }
    });

    if (count > 0) {
      await auditLogger.log({
        action: "security:all_sessions_revoked",
        userId,
        details: { count, exceptSessionId: exceptSessionId?.substring(0, 8) + "..." },
        severity: "info",
      });
    }

    return count;
  },

  /**
   * Get all active sessions for user
   */
  getUserSessions(userId: string): SecureSession[] {
    const sessions: SecureSession[] = [];
    const now = new Date();

    sessionStore.forEach(session => {
      if (session.userId === userId && session.isActive && session.expiresAt > now) {
        sessions.push(session);
      }
    });

    return sessions;
  },

  /**
   * Cleanup expired sessions
   */
  cleanup(): number {
    const now = new Date();
    let cleaned = 0;

    sessionStore.forEach((session, id) => {
      if (session.expiresAt <= now || !session.isActive) {
        sessionStore.delete(id);
        cleaned++;
      }
    });

    return cleaned;
  },
};

// Run session cleanup every hour - only when not in publishing mode
if (process.env.DISABLE_BACKGROUND_SERVICES !== "true" && process.env.REPLIT_DEPLOYMENT !== "1") {
  setInterval(
    () => {
      const cleaned = sessionSecurity.cleanup();
      if (cleaned > 0) {
        /* Stale sessions cleaned up successfully */
      }
    },
    60 * 60 * 1000
  );
}

// ============================================================================
// THREAT INTELLIGENCE
// ============================================================================

interface ThreatIndicator {
  type: "ip" | "pattern" | "behavior";
  value: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  detectedAt: Date;
  expiresAt?: Date;
}

// In-memory threat intelligence store
const threatIndicators: Map<string, ThreatIndicator> = new Map();

export const threatIntelligence = {
  /**
   * Add a threat indicator
   */
  addIndicator(indicator: Omit<ThreatIndicator, "detectedAt">): void {
    const key = `${indicator.type}:${indicator.value}`;
    threatIndicators.set(key, {
      ...indicator,
      detectedAt: new Date(),
    });
  },

  /**
   * Check if IP is in threat list
   */
  checkIp(ip: string): ThreatIndicator | null {
    const key = `ip:${ip}`;
    const indicator = threatIndicators.get(key);

    if (indicator && (!indicator.expiresAt || indicator.expiresAt > new Date())) {
      return indicator;
    }

    return null;
  },

  /**
   * Analyze request for threat patterns
   */
  analyzeRequest(req: Request): {
    isThreat: boolean;
    indicators: ThreatIndicator[];
    riskScore: number;
  } {
    const indicators: ThreatIndicator[] = [];
    let riskScore = 0;

    const ip = req.ip || req.socket?.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";
    const path = req.path;

    // Check IP threats
    const ipThreat = this.checkIp(ip);
    if (ipThreat) {
      indicators.push(ipThreat);
      if (ipThreat.severity === "critical") riskScore += 50;
      else if (ipThreat.severity === "high") riskScore += 35;
      else if (ipThreat.severity === "medium") riskScore += 20;
      else riskScore += 10;
    }

    // Check for suspicious user agents
    const suspiciousAgents = ["sqlmap", "nikto", "nmap", "masscan", "zgrab"];
    if (suspiciousAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
      const indicator: ThreatIndicator = {
        type: "pattern",
        value: "suspicious_user_agent",
        severity: "high",
        description: `Suspicious user agent: ${userAgent.substring(0, 50)}`,
        detectedAt: new Date(),
      };
      indicators.push(indicator);
      riskScore += 40;
    }

    // Check for common attack patterns in path
    const attackPatterns = [
      { pattern: /\.\.\//, severity: "high" as const, desc: "Path traversal attempt" },
      { pattern: /<script/i, severity: "high" as const, desc: "XSS attempt" },
      { pattern: /union\s+select/i, severity: "critical" as const, desc: "SQL injection attempt" },
      { pattern: /etc\/passwd/, severity: "critical" as const, desc: "LFI attempt" },
      { pattern: /\.git\//i, severity: "medium" as const, desc: "Git exposure attempt" },
      { pattern: /\.env/i, severity: "high" as const, desc: "Env file access attempt" },
    ];

    const fullUrl =
      path + (req.query ? "?" + new URLSearchParams(req.query as any).toString() : "");

    for (const { pattern, severity, desc } of attackPatterns) {
      if (pattern.test(fullUrl)) {
        indicators.push({
          type: "pattern",
          value: pattern.source,
          severity,
          description: desc,
          detectedAt: new Date(),
        });
        if (severity === "critical") riskScore += 50;
        else if (severity === "high") riskScore += 35;
        else riskScore += 20;
      }
    }

    return {
      isThreat: riskScore >= 40,
      indicators,
      riskScore: Math.min(100, riskScore),
    };
  },

  /**
   * Express middleware for threat detection
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Skip threat detection for approved bots (AI crawlers, search engines)
      const userAgent = req.headers["user-agent"];
      const extReq = req as Request & {
        isApprovedBot?: boolean;
        threatAnalysis?: { isThreat: boolean; indicators: ThreatIndicator[]; riskScore: number };
      };
      if (extReq.isApprovedBot || isApprovedBot(userAgent)) {
        extReq.threatAnalysis = { isThreat: false, indicators: [], riskScore: 0 };
        return next();
      }

      const analysis = this.analyzeRequest(req);

      if (analysis.isThreat) {
        const ip = req.ip || req.socket?.remoteAddress || "";
        const userId = (req as Request & { user?: { claims?: { sub?: string } } }).user?.claims
          ?.sub;

        await auditLogger.log({
          action: "security:threat_detected",
          userId: userId || null,
          ipAddress: ip,
          details: {
            path: req.path,
            riskScore: analysis.riskScore,
            indicators: analysis.indicators.map(i => i.description),
          },
          severity: analysis.riskScore >= 50 ? "critical" : "warning",
        });

        // Block critical threats
        if (analysis.riskScore >= 70) {
          return res.status(403).json({
            error: "Request blocked for security reasons",
          });
        }
      }

      // Attach threat info for use by other middleware
      extReq.threatAnalysis = analysis;
      next();
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const enterpriseSecurity = {
  deviceFingerprint,
  contextualAuth,
  abac,
  exponentialBackoff,
  passwordSecurity,
  sessionSecurity,
  threatIntelligence,
};

export default enterpriseSecurity;
