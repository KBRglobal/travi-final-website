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
 * - Tokens are stored in database to survive server restarts
 * 
 * This prevents the security gap where session exists before MFA completion.
 */

import crypto from 'crypto';
import { db, pool } from '../db';
import { preAuthTokens } from '@shared/schema';
import { eq, lt } from 'drizzle-orm';

/**
 * Ensure the pre_auth_tokens table exists in the database
 * This handles the case where schema hasn't been migrated to Railway
 */
async function ensureTableExists(): Promise<void> {
  try {
    // First ensure the uuid extension is available
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS pre_auth_tokens (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash VARCHAR NOT NULL UNIQUE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR NOT NULL,
        nonce VARCHAR NOT NULL,
        ip_address VARCHAR,
        user_agent TEXT,
        risk_score INTEGER,
        device_fingerprint TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_pre_auth_token_hash" ON pre_auth_tokens(token_hash);
      CREATE INDEX IF NOT EXISTS "IDX_pre_auth_expires" ON pre_auth_tokens(expires_at);
    `;
    await pool.query(createTableSQL);
    console.log('[PreAuth] Table verified/created successfully');
  } catch (error) {
    // If FK constraint fails (users table doesn't exist yet), try without it
    try {
      const fallbackSQL = `
        CREATE TABLE IF NOT EXISTS pre_auth_tokens (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          token_hash VARCHAR NOT NULL UNIQUE,
          user_id VARCHAR NOT NULL,
          username VARCHAR NOT NULL,
          nonce VARCHAR NOT NULL,
          ip_address VARCHAR,
          user_agent TEXT,
          risk_score INTEGER,
          device_fingerprint TEXT,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "IDX_pre_auth_token_hash" ON pre_auth_tokens(token_hash);
        CREATE INDEX IF NOT EXISTS "IDX_pre_auth_expires" ON pre_auth_tokens(expires_at);
      `;
      await pool.query(fallbackSQL);
      console.log('[PreAuth] Table created (without FK constraint)');
    } catch (fallbackError) {
      console.error('[PreAuth] Failed to ensure table exists:', fallbackError);
    }
  }
}

// Initialize table on module load
ensureTableExists();

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
export interface PendingLogin {
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
 * Cleanup interval reference
 */
let cleanupTimerId: NodeJS.Timeout | null = null;

/**
 * Start cleanup timer for expired tokens (database cleanup)
 */
function startCleanupTimer(): void {
  if (cleanupTimerId) return;
  
  cleanupTimerId = setInterval(async () => {
    try {
      const now = new Date();
      await db.delete(preAuthTokens).where(lt(preAuthTokens.expiresAt, now));
    } catch (error) {
      console.error('[PreAuth] Database cleanup error:', error);
    }
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
export async function createPreAuthToken(
  userId: string,
  username: string,
  context: {
    ipAddress: string;
    userAgent: string;
    riskScore?: number;
    deviceFingerprint?: string;
  }
): Promise<{ token: string; expiresAt: number }> {
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
  
  // Store in database (keyed by token hash)
  const tokenHash = hashTokenForStorage(token);
  
  try {
    await db.insert(preAuthTokens).values({
      tokenHash,
      userId,
      username,
      nonce,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      riskScore: context.riskScore,
      deviceFingerprint: context.deviceFingerprint,
      expiresAt: new Date(expiresAt),
    });
    
    console.log(`[PreAuth] Token created for user ${username.substring(0, 3)}*** (expires in ${PRE_AUTH_CONFIG.tokenExpiry / 1000 / 60} min)`);
  } catch (error) {
    console.error('[PreAuth] Failed to store token in database:', error);
    throw new Error('Failed to create pre-auth token');
  }
  
  return { token, expiresAt };
}

/**
 * Verify pre-auth token and return pending login context
 * 
 * Returns null if token is invalid, expired, or already used
 */
export async function verifyPreAuthToken(token: string): Promise<PendingLogin | null> {
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
  
  // Look up pending login from database
  const tokenHash = hashTokenForStorage(token);
  
  try {
    const [dbToken] = await db
      .select()
      .from(preAuthTokens)
      .where(eq(preAuthTokens.tokenHash, tokenHash))
      .limit(1);
    
    if (!dbToken) {
      console.log('[PreAuth] Token not found (may be already used or server restarted)');
      return null;
    }
    
    // Check database expiration as well
    if (dbToken.expiresAt < new Date()) {
      console.log('[PreAuth] Token expired (db check)');
      return null;
    }
    
    // Verify nonce matches
    if (dbToken.nonce !== payload.nonce) {
      console.log('[PreAuth] Token nonce mismatch');
      return null;
    }
    
    // Verify userId matches
    if (dbToken.userId !== payload.userId) {
      console.log('[PreAuth] Token userId mismatch');
      return null;
    }
    
    // Return PendingLogin format
    return {
      userId: dbToken.userId,
      username: dbToken.username,
      createdAt: dbToken.createdAt ? dbToken.createdAt.getTime() : Date.now(),
      expiresAt: dbToken.expiresAt.getTime(),
      ipAddress: dbToken.ipAddress || '',
      userAgent: dbToken.userAgent || '',
      riskScore: dbToken.riskScore || undefined,
      deviceFingerprint: dbToken.deviceFingerprint || undefined,
      nonce: dbToken.nonce,
    };
  } catch (error) {
    console.error('[PreAuth] Database error during verification:', error);
    return null;
  }
}

/**
 * Consume pre-auth token after successful TOTP verification
 * 
 * This invalidates the token so it cannot be reused
 */
export async function consumePreAuthToken(token: string): Promise<boolean> {
  const tokenHash = hashTokenForStorage(token);
  
  try {
    const result = await db
      .delete(preAuthTokens)
      .where(eq(preAuthTokens.tokenHash, tokenHash));
    
    const deleted = (result as any).rowCount > 0;
    
    if (deleted) {
      console.log('[PreAuth] Token consumed successfully');
    }
    
    return deleted;
  } catch (error) {
    console.error('[PreAuth] Database error during token consumption:', error);
    return false;
  }
}

/**
 * Get pending login stats for monitoring
 */
export async function getPreAuthStats(): Promise<{
  pendingCount: number;
  oldestPendingAge?: number;
}> {
  try {
    const tokens = await db.select().from(preAuthTokens);
    const now = Date.now();
    let oldestAge: number | undefined;
    
    tokens.forEach((token) => {
      if (token.createdAt) {
        const age = now - token.createdAt.getTime();
        if (oldestAge === undefined || age > oldestAge) {
          oldestAge = age;
        }
      }
    });
    
    return {
      pendingCount: tokens.length,
      oldestPendingAge: oldestAge ? Math.floor(oldestAge / 1000) : undefined, // seconds
    };
  } catch (error) {
    console.error('[PreAuth] Database error getting stats:', error);
    return { pendingCount: 0 };
  }
}
