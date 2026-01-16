/**
 * TRAVI API Keys Encryption Utility
 * 
 * Provides AES-256-GCM encryption/decryption for storing API keys securely.
 * NEVER store API keys in plain text!
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get encryption key from environment (must be 32 bytes / 256 bits)
function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.API_KEYS_ENCRYPTION_KEY;
  
  if (!keyBase64) {
    // Generate a key if not configured (for development only)
    // In production, this should be configured in environment variables
    console.warn('[Encryption] WARNING: API_KEYS_ENCRYPTION_KEY not set, generating temporary key');
    console.warn('[Encryption] This key will change on restart - configure a permanent key in secrets!');
    
    // Use a deterministic key based on DATABASE_URL for consistency within same environment
    const seed = process.env.DATABASE_URL || 'default-seed-for-development';
    return crypto.createHash('sha256').update(seed).digest();
  }
  
  // Decode base64 key
  const key = Buffer.from(keyBase64, 'base64');
  
  if (key.length !== 32) {
    throw new Error(`Invalid encryption key length: ${key.length} bytes (expected 32)`);
  }
  
  return key;
}

/**
 * Encrypt an API key using AES-256-GCM
 * Returns format: iv:authTag:encryptedData (all hex encoded)
 */
export function encryptApiKey(apiKey: string): string {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('Cannot encrypt empty API key');
  }
  
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Return: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an API key using AES-256-GCM
 * Expects format: iv:authTag:encryptedData (all hex encoded)
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey || encryptedKey.trim() === '') {
    throw new Error('Cannot decrypt empty encrypted key');
  }
  
  const parts = encryptedKey.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format (expected iv:authTag:data)');
  }
  
  const [ivHex, authTagHex, encrypted] = parts;
  
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Mask an API key for display (show only last 4 characters)
 * Example: "sk-proj-abcdefghijklmnop" -> "sk-...mnop"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '***';
  }
  
  // Show prefix (up to 3 chars) and last 4 chars
  const prefix = apiKey.substring(0, Math.min(3, apiKey.length - 4));
  const suffix = apiKey.substring(apiKey.length - 4);
  
  return `${prefix}...${suffix}`;
}

/**
 * Check if encryption key is properly configured
 */
export function isEncryptionConfigured(): boolean {
  try {
    const key = getEncryptionKey();
    return key.length === 32;
  } catch {
    return false;
  }
}

/**
 * Generate a new encryption key (for initial setup)
 * Run: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

// Validate encryption on module load
try {
  const testKey = 'test-api-key-12345';
  const encrypted = encryptApiKey(testKey);
  const decrypted = decryptApiKey(encrypted);
  
  if (decrypted !== testKey) {
    console.error('[Encryption] Self-test FAILED: decryption mismatch');
  } else {
    console.log('[Encryption] Self-test passed');
  }
} catch (error) {
  console.error('[Encryption] Self-test FAILED:', error);
}
