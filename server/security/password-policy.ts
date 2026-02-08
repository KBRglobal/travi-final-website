/**
 * Password Security Policy
 *
 * Implements comprehensive password security including:
 * - Strength requirements
 * - zxcvbn-based strength scoring
 * - Password history tracking
 * - Account lockout mechanism
 */

import zxcvbn from "zxcvbn";
import bcrypt from "bcrypt";
import { storage } from "../storage";

/**
 * Password Policy Configuration
 */
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  minStrengthScore: 3, // zxcvbn score (0-4)
  historyCount: 12, // Number of previous passwords to check
  // Legacy - kept for backward compatibility but dual lockout is preferred
  maxFailedAttempts: 5,
  lockoutDuration: 30 * 60 * 1000, // 30 minutes in milliseconds
};

/**
 * Dual Lockout Configuration
 *
 * SECURITY RATIONALE:
 * - Per-IP lockout is PRIMARY defense (prevents brute force from single source)
 * - Per-username lockout is SECONDARY (higher threshold to prevent DoS)
 *
 * Attack mitigation:
 * - Attacker from single IP: Blocked after 10 attempts (IP lockout)
 * - Attacker rotating IPs to target one user: Blocked after 15 attempts (username lockout)
 * - Random attacker cannot easily lock out admin account (needs 15 failures)
 *
 * Per-username lockout activates only when suspicious patterns detected:
 * - Multiple IPs failing for same username
 * - OR username failures exceed threshold
 */
export const DUAL_LOCKOUT_CONFIG = {
  // Per-IP lockout (primary defense)
  ip: {
    maxAttempts: 10,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    windowDuration: 15 * 60 * 1000, // 15 minute sliding window
  },
  // Per-username lockout (secondary defense - higher threshold)
  username: {
    maxAttempts: 15, // Higher to prevent easy DoS
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
    windowDuration: 30 * 60 * 1000, // 30 minute sliding window
    multiIpThreshold: 3, // Trigger if fails from 3+ different IPs
  },
};

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength?: {
    score: number;
    feedback: string[];
    warning?: string;
  };
}

/**
 * Check password character requirements and collect errors
 */
function checkCharacterRequirements(password: string): string[] {
  const errors: string[] = [];

  const checks: Array<{ enabled: boolean; test: RegExp; message: string }> = [
    {
      enabled: PASSWORD_POLICY.requireUppercase,
      test: /[A-Z]/,
      message: "Password must contain at least one uppercase letter",
    },
    {
      enabled: PASSWORD_POLICY.requireLowercase,
      test: /[a-z]/,
      message: "Password must contain at least one lowercase letter",
    },
    {
      enabled: PASSWORD_POLICY.requireNumbers,
      test: /\d/,
      message: "Password must contain at least one number",
    },
    {
      enabled: PASSWORD_POLICY.requireSpecialChars,
      test: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
      message: "Password must contain at least one special character",
    },
  ];

  for (const check of checks) {
    if (check.enabled && !check.test.test(password)) {
      errors.push(check.message);
    }
  }

  return errors;
}

/**
 * Check password for common weak patterns
 */
function checkWeakPatterns(password: string): string[] {
  const errors: string[] = [];

  if (/^(.)\1+$/.test(password)) {
    errors.push("Password cannot be all the same character");
  }

  const numericSeqs = "012|123|234|345|456|567|678|789|890";
  const alphaSeqs =
    "abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz";
  const sequencePattern = new RegExp(`^(${numericSeqs}|${alphaSeqs})+$`, "i");
  if (sequencePattern.test(password)) {
    errors.push("Password cannot be a simple sequence");
  }

  return errors;
}

/**
 * Validate password against security policy
 */
export function validatePasswordStrength(
  password: string,
  userInputs?: string[]
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
  }

  errors.push(...checkCharacterRequirements(password), ...checkWeakPatterns(password));

  // Use zxcvbn for comprehensive strength analysis
  const strengthResult = zxcvbn(password, userInputs || []);

  const strength = {
    score: strengthResult.score,
    feedback:
      strengthResult.feedback.suggestions.length > 0
        ? strengthResult.feedback.suggestions
        : ([] as string[]),
    warning: strengthResult.feedback.warning,
  };

  if (strengthResult.score < PASSWORD_POLICY.minStrengthScore) {
    errors.push(
      `Password is too weak (strength score: ${strengthResult.score}/4, minimum required: ${PASSWORD_POLICY.minStrengthScore})`
    );
    if (strengthResult.feedback.warning) {
      errors.push(strengthResult.feedback.warning);
    }
    if (strengthResult.feedback.suggestions.length > 0) {
      errors.push(...strengthResult.feedback.suggestions);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    strength: strength.score >= PASSWORD_POLICY.minStrengthScore ? strength : undefined,
  };
}

/**
 * Check if password was used recently (password history)
 * Note: This requires password_history table in the database.
 * For now, returns allowed=true to maintain backward compatibility.
 */
export async function checkPasswordHistory(
  userId: string,
  newPassword: string
): Promise<{ allowed: boolean; message?: string }> {
  try {
    // Check if storage has password history methods
    const storageAny = storage as any;
    if (typeof storageAny.getPasswordHistory !== "function") {
      // Password history not yet implemented in storage, allow the change
      return { allowed: true };
    }

    // Get user's password history from storage
    const history = await storageAny.getPasswordHistory(userId, PASSWORD_POLICY.historyCount);

    // Check if new password matches any recent password
    for (const historyEntry of history) {
      const matches = await bcrypt.compare(newPassword, historyEntry.passwordHash);
      if (matches) {
        return {
          allowed: false,
          message: `You cannot reuse any of your last ${PASSWORD_POLICY.historyCount} passwords`,
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    // On error, allow the password change (fail open for better UX)
    return { allowed: true };
  }
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // High security
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Dual lockout entry - tracks both IP and username failures
 */
interface DualLockoutEntry {
  failedAttempts: number;
  lockedUntil?: number;
  lastFailedAttempt?: number;
  failingIps?: Set<string>; // For username entries: track distinct IPs
  attempts: Array<{ timestamp: number; ip?: string }>; // Sliding window tracking
}

// In-memory stores for dual lockout tracking
const ipLockoutStore = new Map<string, DualLockoutEntry>();
const usernameLockoutStore = new Map<string, DualLockoutEntry>();

// Store timer reference for cleanup
let cleanupTimerId: NodeJS.Timeout | null = null;

// Clean up expired entries every 2 minutes
function startCleanupTimer() {
  if (cleanupTimerId) return; // Already started

  cleanupTimerId = setInterval(
    () => {
      const now = Date.now();

      // Clean IP lockout store
      ipLockoutStore.forEach((entry, key) => {
        if (entry.lockedUntil && entry.lockedUntil < now) {
          ipLockoutStore.delete(key);
        } else {
          // Remove old attempts outside the window
          entry.attempts = entry.attempts.filter(
            a => now - a.timestamp < DUAL_LOCKOUT_CONFIG.ip.windowDuration
          );
          if (entry.attempts.length === 0 && !entry.lockedUntil) {
            ipLockoutStore.delete(key);
          }
        }
      });

      // Clean username lockout store
      usernameLockoutStore.forEach((entry, key) => {
        if (entry.lockedUntil && entry.lockedUntil < now) {
          usernameLockoutStore.delete(key);
        } else {
          // Remove old attempts outside the window
          entry.attempts = entry.attempts.filter(
            a => now - a.timestamp < DUAL_LOCKOUT_CONFIG.username.windowDuration
          );
          if (entry.attempts.length === 0 && !entry.lockedUntil) {
            usernameLockoutStore.delete(key);
          }
        }
      });
    },
    2 * 60 * 1000
  );

  // Allow Node.js to exit even if timer is running
  cleanupTimerId.unref();
}

// Start the cleanup timer
startCleanupTimer();

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupLockoutTimer(): void {
  if (cleanupTimerId) {
    clearInterval(cleanupTimerId);
    cleanupTimerId = null;
  }
}

/**
 * Record a failed login attempt with dual lockout strategy
 *
 * PRIMARY: Per-IP lockout (lower threshold, prevents brute force)
 * SECONDARY: Per-username lockout (higher threshold, prevents DoS while still protecting)
 *
 * @param username - The username being attempted
 * @param ip - The IP address of the request
 */
export function recordDualLockoutFailure(username: string, ip: string): void {
  const now = Date.now();
  const normalizedUsername = username.toLowerCase();

  // === PRIMARY: Track per-IP failures ===
  const ipEntry = ipLockoutStore.get(ip) || {
    failedAttempts: 0,
    attempts: [],
  };

  // Add attempt to sliding window
  ipEntry.attempts.push({ timestamp: now });

  // Filter to keep only attempts within window
  ipEntry.attempts = ipEntry.attempts.filter(
    a => now - a.timestamp < DUAL_LOCKOUT_CONFIG.ip.windowDuration
  );

  ipEntry.failedAttempts = ipEntry.attempts.length;
  ipEntry.lastFailedAttempt = now;

  // Lock IP if threshold exceeded
  if (ipEntry.failedAttempts >= DUAL_LOCKOUT_CONFIG.ip.maxAttempts) {
    ipEntry.lockedUntil = now + DUAL_LOCKOUT_CONFIG.ip.lockoutDuration;
  }

  ipLockoutStore.set(ip, ipEntry);

  // === SECONDARY: Track per-username failures ===
  const userEntry = usernameLockoutStore.get(normalizedUsername) || {
    failedAttempts: 0,
    attempts: [],
    failingIps: new Set<string>(),
  };

  // Add attempt to sliding window
  userEntry.attempts.push({ timestamp: now, ip });

  // Filter to keep only attempts within window
  userEntry.attempts = userEntry.attempts.filter(
    a => now - a.timestamp < DUAL_LOCKOUT_CONFIG.username.windowDuration
  );

  // Track distinct IPs
  if (!userEntry.failingIps) {
    userEntry.failingIps = new Set<string>();
  }
  userEntry.failingIps.add(ip);

  userEntry.failedAttempts = userEntry.attempts.length;
  userEntry.lastFailedAttempt = now;

  // Lock username if:
  // 1. Threshold exceeded AND
  // 2. Either multiple IPs are failing OR very high failure count
  const multiIpAttack = userEntry.failingIps.size >= DUAL_LOCKOUT_CONFIG.username.multiIpThreshold;
  const highFailureCount = userEntry.failedAttempts >= DUAL_LOCKOUT_CONFIG.username.maxAttempts;

  if (highFailureCount || (multiIpAttack && userEntry.failedAttempts >= 10)) {
    userEntry.lockedUntil = now + DUAL_LOCKOUT_CONFIG.username.lockoutDuration;
  }

  usernameLockoutStore.set(normalizedUsername, userEntry);
}

/**
 * Check dual lockout status
 *
 * Checks BOTH IP and username lockouts.
 * Returns locked if EITHER is locked.
 *
 * @param username - The username being attempted
 * @param ip - The IP address of the request
 */
/**
 * Check a single lockout entry and clean up if expired
 */
function checkLockoutEntry(
  entry: DualLockoutEntry | undefined,
  storeKey: string,
  store: Map<string, DualLockoutEntry>,
  now: number
): { locked: boolean; remainingTime: number } {
  if (!entry) {
    return { locked: false, remainingTime: 0 };
  }

  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { locked: true, remainingTime: Math.ceil((entry.lockedUntil - now) / 1000 / 60) };
  }

  if (entry.lockedUntil && entry.lockedUntil <= now) {
    store.delete(storeKey);
  }

  return { locked: false, remainingTime: 0 };
}

/**
 * Determine the lock type from IP and username lock status
 */
function determineLockType(ipLocked: boolean, userLocked: boolean): "ip" | "username" | "both" {
  if (ipLocked && userLocked) return "both";
  if (ipLocked) return "ip";
  return "username";
}

export function checkDualLockout(
  username: string,
  ip: string
): {
  locked: boolean;
  lockType?: "ip" | "username" | "both";
  remainingTime?: number;
  ipAttempts?: number;
  usernameAttempts?: number;
} {
  const now = Date.now();
  const normalizedUsername = username.toLowerCase();

  const ipEntry = ipLockoutStore.get(ip);
  const userEntry = usernameLockoutStore.get(normalizedUsername);

  const ipStatus = checkLockoutEntry(ipEntry, ip, ipLockoutStore, now);
  const userStatus = checkLockoutEntry(userEntry, normalizedUsername, usernameLockoutStore, now);

  if (!ipStatus.locked && !userStatus.locked) {
    return {
      locked: false,
      ipAttempts: ipEntry?.failedAttempts,
      usernameAttempts: userEntry?.failedAttempts,
    };
  }

  return {
    locked: true,
    lockType: determineLockType(ipStatus.locked, userStatus.locked),
    remainingTime: Math.max(ipStatus.remainingTime, userStatus.remainingTime),
    ipAttempts: ipEntry?.failedAttempts,
    usernameAttempts: userEntry?.failedAttempts,
  };
}

/**
 * Clear dual lockout entries on successful login
 */
export function clearDualLockout(username: string, ip: string): void {
  const normalizedUsername = username.toLowerCase();

  // Clear IP lockout
  ipLockoutStore.delete(ip);

  // Clear username lockout
  usernameLockoutStore.delete(normalizedUsername);
}

/**
 * Get lockout status for admin/debugging
 */
export function getLockoutStats(): {
  ipLockouts: Array<{
    ip: string;
    failedAttempts: number;
    lockedUntil?: Date;
  }>;
  usernameLockouts: Array<{
    username: string;
    failedAttempts: number;
    lockedUntil?: Date;
    distinctIps: number;
  }>;
} {
  const ipLockouts: Array<{
    ip: string;
    failedAttempts: number;
    lockedUntil?: Date;
  }> = [];

  const usernameLockouts: Array<{
    username: string;
    failedAttempts: number;
    lockedUntil?: Date;
    distinctIps: number;
  }> = [];

  ipLockoutStore.forEach((entry, ip) => {
    ipLockouts.push({
      ip,
      failedAttempts: entry.failedAttempts,
      lockedUntil: entry.lockedUntil ? new Date(entry.lockedUntil) : undefined,
    });
  });

  usernameLockoutStore.forEach((entry, username) => {
    usernameLockouts.push({
      username,
      failedAttempts: entry.failedAttempts,
      lockedUntil: entry.lockedUntil ? new Date(entry.lockedUntil) : undefined,
      distinctIps: entry.failingIps?.size || 0,
    });
  });

  return { ipLockouts, usernameLockouts };
}

/**
 * Store password in history after successful change
 * Note: This requires password_history table in the database.
 * For now, this is a no-op to maintain backward compatibility.
 */
export async function addToPasswordHistory(userId: string, passwordHash: string): Promise<void> {
  try {
    // Check if storage has password history methods
    const storageAny = storage as any;
    if (typeof storageAny.addPasswordHistory === "function") {
      await storageAny.addPasswordHistory(userId, passwordHash);
    }
    // If method doesn't exist, silently skip (backward compatibility)
  } catch (error) {
    // Don't fail the password change if history tracking fails
  }
}

/**
 * Comprehensive password change validation
 */
export async function validatePasswordChange(
  userId: string,
  newPassword: string,
  userInputs?: string[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate password strength
  const strengthResult = validatePasswordStrength(newPassword, userInputs);
  if (!strengthResult.valid) {
    errors.push(...strengthResult.errors);
  }

  // Check password history
  const historyResult = await checkPasswordHistory(userId, newPassword);
  if (!historyResult.allowed && historyResult.message) {
    errors.push(historyResult.message);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
