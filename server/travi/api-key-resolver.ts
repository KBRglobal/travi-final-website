/**
 * TRAVI API Key Resolver
 * 
 * Retrieves API keys from environment variables (Replit Secrets) as primary source,
 * with database fallback for admin-managed keys.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { decryptApiKey } from './encryption';

// Service name mapping to environment variable names
const ENV_VAR_MAP: Record<string, string[]> = {
  gemini: ['GEMINI_API_KEY', 'AI_INTEGRATIONS_GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'],
  openai: ['OPENAI_API_KEY', 'AI_INTEGRATIONS_OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY', 'AI_INTEGRATIONS_ANTHROPIC_API_KEY'],
  google_places: ['GOOGLE_PLACES_API_KEY'],
  freepik: ['FREEPIK_API_KEY'],
};

// Cache for API keys (refreshed every 5 minutes)
let keyCache: Map<string, { value: string | null; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get an API key for a service.
 * Priority: Environment variables (Replit Secrets) > Database (encrypted)
 * 
 * @param serviceName - The service name (gemini, openai, anthropic, google_places, freepik)
 * @returns The API key or null if not found
 */
export async function getApiKey(serviceName: string): Promise<string | null> {
  // Check cache first
  const cached = keyCache.get(serviceName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  let apiKey: string | null = null;

  // Try environment variables first (Replit Secrets)
  const envVars = ENV_VAR_MAP[serviceName] || [];
  for (const envVar of envVars) {
    const value = process.env[envVar];
    if (value && value.trim() !== '') {
      apiKey = value;
      break;
    }
  }

  // Fallback to database if no env var found
  if (!apiKey) {
    try {
      const result = await db.execute(sql`
        SELECT api_key_encrypted FROM travi_api_keys 
        WHERE service_name = ${serviceName}
        LIMIT 1
      `);

      if (result.rows.length > 0 && result.rows[0].api_key_encrypted) {
        try {
          apiKey = decryptApiKey(result.rows[0].api_key_encrypted as string);
          console.log(`[APIKeyResolver] Retrieved ${serviceName} key from database`);
        } catch (decryptError) {
          console.error(`[APIKeyResolver] Failed to decrypt ${serviceName} key:`, decryptError);
        }
      }
    } catch (dbError) {
      // Table might not exist yet, that's okay
    }
  }

  // Cache the result
  keyCache.set(serviceName, { value: apiKey, timestamp: Date.now() });

  return apiKey;
}

/**
 * Check if an API key is configured for a service (without returning the key)
 */
export async function isApiKeyConfigured(serviceName: string): Promise<boolean> {
  const key = await getApiKey(serviceName);
  return key !== null && key.trim() !== '';
}

/**
 * Clear the key cache (call after updating keys)
 */
export function clearApiKeyCache(): void {
  keyCache.clear();
  console.log('[APIKeyResolver] Cache cleared');
}

/**
 * Clear cache for a specific service
 */
export function clearServiceKeyCache(serviceName: string): void {
  keyCache.delete(serviceName);
  console.log(`[APIKeyResolver] Cache cleared for ${serviceName}`);
}

/**
 * Get all configured services status
 */
export async function getApiKeyStatus(): Promise<Record<string, { configured: boolean; source: 'env' | 'database' | 'none' }>> {
  const services = ['gemini', 'openai', 'anthropic', 'google_places', 'freepik'];
  const status: Record<string, { configured: boolean; source: 'env' | 'database' | 'none' }> = {};

  for (const service of services) {
    let source: 'env' | 'database' | 'none' = 'none';
    let configured = false;

    // Check env vars first (primary source)
    const envVars = ENV_VAR_MAP[service] || [];
    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value && value.trim() !== '') {
        source = 'env';
        configured = true;
        break;
      }
    }

    // Check database if not in env
    if (!configured) {
      try {
        const result = await db.execute(sql`
          SELECT api_key_encrypted FROM travi_api_keys 
          WHERE service_name = ${service}
          LIMIT 1
        `);

        if (result.rows.length > 0 && result.rows[0].api_key_encrypted) {
          source = 'database';
          configured = true;
        }
      } catch {
        // Table might not exist
      }
    }

    status[service] = { configured, source };
  }

  return status;
}
