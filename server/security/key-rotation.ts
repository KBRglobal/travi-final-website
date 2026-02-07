/**
 * Key Rotation System
 *
 * Implements secure key rotation for:
 * - Session secrets
 * - JWT tokens
 * - API keys
 *
 * Best Practices:
 * - Keys are rotated on schedule (configurable)
 * - Old keys remain valid for grace period
 * - Automatic alerts when rotation is due
 */

import crypto from "node:crypto";

/**
 * Key Rotation Configuration
 */
export const KEY_ROTATION_CONFIG = {
  // Rotation intervals (in days)
  sessionSecret: 30, // Rotate every 30 days
  jwtSecret: 90, // Rotate every 90 days
  apiKeys: 180, // Rotate every 180 days

  // Grace period (in days) - old keys still valid
  gracePeriod: 7,

  // Alert threshold (in days before expiry)
  alertThreshold: 7,
};

/**
 * Key metadata tracking
 */
interface KeyMetadata {
  keyId: string;
  createdAt: Date;
  expiresAt: Date;
  rotatedAt?: Date;
  keyType: "session" | "jwt" | "api";
  isActive: boolean;
}

// In-memory key tracking (use database for production)
const keyRegistry = new Map<string, KeyMetadata>();

/**
 * Generate a secure random key
 */
export function generateSecureKey(length: number = 64): string {
  return crypto.randomBytes(length).toString("base64url");
}

/**
 * Register a new key for rotation tracking
 */
export function registerKey(
  keyId: string,
  keyType: KeyMetadata["keyType"],
  rotationDays: number = KEY_ROTATION_CONFIG.sessionSecret
): KeyMetadata {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + rotationDays * 24 * 60 * 60 * 1000);

  const metadata: KeyMetadata = {
    keyId,
    createdAt: now,
    expiresAt,
    keyType,
    isActive: true,
  };

  keyRegistry.set(keyId, metadata);

  return metadata;
}

/**
 * Check if a key needs rotation
 */
export function needsRotation(keyId: string): { needsRotation: boolean; daysRemaining: number } {
  const metadata = keyRegistry.get(keyId);

  if (!metadata) {
    return { needsRotation: true, daysRemaining: 0 };
  }

  const now = new Date();
  const daysRemaining = Math.ceil(
    (metadata.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  return {
    needsRotation: daysRemaining <= 0,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * Check if rotation alert should be triggered
 */
export function shouldAlert(keyId: string): boolean {
  const { daysRemaining } = needsRotation(keyId);
  return daysRemaining > 0 && daysRemaining <= KEY_ROTATION_CONFIG.alertThreshold;
}

/**
 * Mark key as rotated
 */
export function markRotated(keyId: string): void {
  const metadata = keyRegistry.get(keyId);
  if (metadata) {
    metadata.rotatedAt = new Date();
    metadata.isActive = false;
  }
}

/**
 * Get all keys that need rotation
 */
export function getKeysNeedingRotation(): KeyMetadata[] {
  const keysToRotate: KeyMetadata[] = [];

  keyRegistry.forEach((metadata, keyId) => {
    if (metadata.isActive) {
      const { needsRotation: needs, daysRemaining } = needsRotation(keyId);
      if (needs || shouldAlert(keyId)) {
        keysToRotate.push({
          ...metadata,
          expiresAt: new Date(metadata.expiresAt.getTime()), // Clone date
        });
      }
    }
  });

  return keysToRotate;
}

/**
 * Get key rotation status report
 */
export function getRotationStatus(): {
  totalKeys: number;
  activeKeys: number;
  keysNeedingRotation: number;
  keysWithAlerts: number;
  details: Array<{
    keyId: string;
    keyType: string;
    daysRemaining: number;
    status: "ok" | "alert" | "expired";
  }>;
} {
  const details: Array<{
    keyId: string;
    keyType: string;
    daysRemaining: number;
    status: "ok" | "alert" | "expired";
  }> = [];

  let activeKeys = 0;
  let keysNeedingRotation = 0;
  let keysWithAlerts = 0;

  keyRegistry.forEach((metadata, keyId) => {
    if (metadata.isActive) {
      activeKeys++;
      const { needsRotation: needs, daysRemaining } = needsRotation(keyId);
      const alert = shouldAlert(keyId);

      let status: "ok" | "alert" | "expired" = "ok";
      if (needs) {
        status = "expired";
        keysNeedingRotation++;
      } else if (alert) {
        status = "alert";
        keysWithAlerts++;
      }

      details.push({
        keyId,
        keyType: metadata.keyType,
        daysRemaining,
        status,
      });
    }
  });

  return {
    totalKeys: keyRegistry.size,
    activeKeys,
    keysNeedingRotation,
    keysWithAlerts,
    details,
  };
}

/**
 * Session secret rotation helper
 *
 * For Express session, you can use an array of secrets:
 * - First secret is used for signing new sessions
 * - All secrets are valid for verifying existing sessions
 *
 * Example usage:
 * ```
 * const secrets = getSessionSecrets();
 * app.use(session({ secret: secrets, ... }));
 * ```
 */
let sessionSecrets: string[] = [];

export function initializeSessionSecrets(): string[] {
  // Load from environment or generate new
  const primarySecret = process.env.SESSION_SECRET || generateSecureKey(64);
  const previousSecret = process.env.SESSION_SECRET_PREVIOUS;

  sessionSecrets = [primarySecret];
  if (previousSecret) {
    sessionSecrets.push(previousSecret);
  }

  // Register for rotation tracking
  registerKey("session-primary", "session", KEY_ROTATION_CONFIG.sessionSecret);

  return sessionSecrets;
}

export function getSessionSecrets(): string[] {
  if (sessionSecrets.length === 0) {
    return initializeSessionSecrets();
  }
  return sessionSecrets;
}

/**
 * Rotate session secret
 * Call this when SESSION_SECRET environment variable is updated
 */
export function rotateSessionSecret(newSecret: string): void {
  // Move current primary to previous position
  if (sessionSecrets.length > 0) {
    sessionSecrets = [newSecret, sessionSecrets[0]];
  } else {
    sessionSecrets = [newSecret];
  }

  // Mark old key as rotated
  markRotated("session-primary");

  // Register new key
  registerKey("session-primary", "session", KEY_ROTATION_CONFIG.sessionSecret);
}

/**
 * Log rotation status on startup
 */
export function logRotationStatus(): void {
  const status = getRotationStatus();

  if (status.keysNeedingRotation > 0) {
  }

  if (status.keysWithAlerts > 0) {
  }

  status.details.forEach(detail => {
    if (detail.status === "expired") {
    } else if (detail.status === "alert") {
    }
  });
}
