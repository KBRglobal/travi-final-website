/**
 * Pre-Auth Token Module
 * 
 * Implements secure pre-authentication tokens for MFA flow.
 * 
 * SECURITY DESIGN:
 * - Session is NOT created until TOTP is verified
 * - After password verification, a short-lived HMAC-signed token is issued
 * - Token must be presented with valid TOTP code to complete login
 * - Tokens expire in 5 minutes and are single-use
 * 
 * This prevents the security gap where session exists before MFA completion.
 */

import crypto from 'crypto';

/**
 * Pre-auth token configuration
 */
const PRE_AUTH_CONFIG = {
  tokenExpiry: 5 * 60 * 1000, // 5 minutes in milliseconds
  hmacAlgorithm: 'sha256',
};

/**
 * Secret key for HMAC signing
 * In production, this should be a secure random value from environment
 */
function getSigningSecret(): string {
  const envSecret = process.env.PRE_AUTH_TOKEN_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return envSecret;
  }
  
  // Fallback: Generate from SESSION_SECRET or create deterministic one
  // WARNING: In production, PRE_AUTH_TOKEN_SECRET should be explicitly set
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret) {
    return crypto.createHash('sha256').update(`pre-auth:${sessionSecret}`).digest('hex');
  }
  
  // Last resort fallback for development
  console.warn('[Security] WARNING: PRE_AUTH_TOKEN_SECRET not set. Using fallback.');
  return crypto.createHash('sha256').update('travi-pre-auth-dev-secret').digest('hex');
}

/**
 * Pending login entry
 * Stores context that will be used when completing login after TOTP
 */
interface PendingLogin {
  userId: string;
  username: string;
  createdAt: number;
  expiresAt: number;
  ipAddress: string;
  userAgent: string;
  riskScore?: number;
  deviceFingerprint?: string;
  nonce: string;
}

/**
 * In-memory store for pending logins
 * Key: token hash (we never store the full token)
 */
const pendingLogins = new Map<string, PendingLogin>();

/**
 * Cleanup interval reference
 */
let cleanupTimerId: NodeJS.Timeout | null = null;

/**
 * Start cleanup timer for expired tokens
 */
function startCleanupTimer(): void {
  if (cleanupTimerId) return;
  
  cleanupTimerId = setInterval(() => {
    const now = Date.now();
    pendingLogins.forEach((entry, key) => {
      if (entry.expiresAt < now) {
        pendingLogins.delete(key);
      }
    });
  }, 60 * 1000); // Every minute
  
  cleanupTimerId.unref();
}

startCleanupTimer();

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupPreAuthTimer(): void {
  if (cleanupTimerId) {
    clearInterval(cleanupTimerId);
    cleanupTimerId = null;
  }
}

/**
 * Generate a cryptographically secure nonce
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create HMAC signature for token
 */
function signToken(payload: string): string {
  const secret = getSigningSecret();
  return crypto.createHmac(PRE_AUTH_CONFIG.hmacAlgorithm, secret)
    .update(payload)
    .digest('hex');
}

/**
 * Hash token for storage (we never store full tokens)
 */
function hashTokenForStorage(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create pre-auth token payload
 */
interface PreAuthTokenPayload {
  userId: string;
  nonce: string;
  exp: number;
}

/**
 * Create a pre-auth token after successful password verification
 * 
 * This token proves password was verified but session is NOT created yet.
 * Must be presented with valid TOTP code to complete login.
 */
export function createPreAuthToken(
  userId: string,
  username: string,
  context: {
    ipAddress: string;
    userAgent: string;
    riskScore?: number;
    deviceFingerprint?: string;
  }
): { token: string; expiresAt: number } {
  const now = Date.now();
  const expiresAt = now + PRE_AUTH_CONFIG.tokenExpiry;
  const nonce = generateNonce();
  
  // Create token payload
  const payload: PreAuthTokenPayload = {
    userId,
    nonce,
    exp: expiresAt,
  };
  
  // Serialize and sign
  const payloadJson = JSON.stringify(payload);
  const payloadBase64 = Buffer.from(payloadJson).toString('base64url');
  const signature = signToken(payloadBase64);
  
  // Token format: base64url(payload).signature
  const token = `${payloadBase64}.${signature}`;
  
  // Store pending login entry (keyed by token hash)
  const tokenHash = hashTokenForStorage(token);
  const pendingEntry: PendingLogin = {
    userId,
    username,
    createdAt: now,
    expiresAt,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    riskScore: context.riskScore,
    deviceFingerprint: context.deviceFingerprint,
    nonce,
  };
  
  pendingLogins.set(tokenHash, pendingEntry);
  
  console.log(`[PreAuth] Token created for user ${username.substring(0, 3)}*** (expires in ${PRE_AUTH_CONFIG.tokenExpiry / 1000 / 60} min)`);
  
  return { token, expiresAt };
}

/**
 * Verify pre-auth token and return pending login context
 * 
 * Returns null if token is invalid, expired, or already used
 */
export function verifyPreAuthToken(token: string): PendingLogin | null {
  if (!token || typeof token !== 'string') {
    return null;
  }
  
  // Split token into payload and signature
  const parts = token.split('.');
  if (parts.length !== 2) {
    console.log('[PreAuth] Invalid token format');
    return null;
  }
  
  const [payloadBase64, signature] = parts;
  
  // Verify signature
  const expectedSignature = signToken(payloadBase64);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.log('[PreAuth] Invalid token signature');
    return null;
  }
  
  // Decode payload
  let payload: PreAuthTokenPayload;
  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString();
    payload = JSON.parse(payloadJson);
  } catch (error) {
    console.log('[PreAuth] Invalid token payload');
    return null;
  }
  
  // Check expiration
  if (payload.exp < Date.now()) {
    console.log('[PreAuth] Token expired');
    return null;
  }
  
  // Look up pending login
  const tokenHash = hashTokenForStorage(token);
  const pendingLogin = pendingLogins.get(tokenHash);
  
  if (!pendingLogin) {
    console.log('[PreAuth] Token not found (may be already used)');
    return null;
  }
  
  // Verify nonce matches
  if (pendingLogin.nonce !== payload.nonce) {
    console.log('[PreAuth] Token nonce mismatch');
    return null;
  }
  
  // Verify userId matches
  if (pendingLogin.userId !== payload.userId) {
    console.log('[PreAuth] Token userId mismatch');
    return null;
  }
  
  return pendingLogin;
}

/**
 * Consume pre-auth token after successful TOTP verification
 * 
 * This invalidates the token so it cannot be reused
 */
export function consumePreAuthToken(token: string): boolean {
  const tokenHash = hashTokenForStorage(token);
  const existed = pendingLogins.has(tokenHash);
  pendingLogins.delete(tokenHash);
  
  if (existed) {
    console.log('[PreAuth] Token consumed successfully');
  }
  
  return existed;
}

/**
 * Get pending login stats for monitoring
 */
export function getPreAuthStats(): {
  pendingCount: number;
  oldestPendingAge?: number;
} {
  const now = Date.now();
  let oldestAge: number | undefined;
  
  pendingLogins.forEach((entry) => {
    const age = now - entry.createdAt;
    if (oldestAge === undefined || age > oldestAge) {
      oldestAge = age;
    }
  });
  
  return {
    pendingCount: pendingLogins.size,
    oldestPendingAge: oldestAge ? Math.floor(oldestAge / 1000) : undefined, // seconds
  };
}
