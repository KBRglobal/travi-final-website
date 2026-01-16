/**
 * Autonomy Control Plane - Override Management
 * Temporary policy overrides with TTL and audit trail
 */

import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { GuardedFeature, EnforcementOverride } from '../enforcement/types';

// In-memory cache for active overrides
const overrideCache = new Map<string, { override: EnforcementOverride; expiresAt: number }>();
const MAX_CACHE_SIZE = 200;
const CACHE_TTL_MS = 30000;

// Override schema for validation
export const createOverrideSchema = z.object({
  targetKey: z.string().min(1).max(200),
  feature: z.enum([
    'chat', 'octopus', 'search', 'aeo', 'translation', 'images',
    'content_enrichment', 'seo_optimization', 'internal_linking',
    'background_job', 'publishing'
  ]),
  reason: z.string().min(10).max(500),
  ttlMinutes: z.number().int().min(5).max(1440), // 5 min to 24 hours
});

export type CreateOverrideInput = z.infer<typeof createOverrideSchema>;

// Override storage (using decision logs table with special flag)
interface StoredOverride {
  id: string;
  targetKey: string;
  feature: string;
  reason: string;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
}

// In-memory store for overrides (production would use dedicated table)
const overrideStore = new Map<string, StoredOverride>();

function generateOverrideId(): string {
  return `ovr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getCacheKey(targetKey: string, feature: GuardedFeature): string {
  return `${targetKey}:${feature}`;
}

/**
 * Create a temporary override allowing an operation
 */
export async function createOverride(
  input: CreateOverrideInput,
  createdBy: string
): Promise<EnforcementOverride> {
  const id = generateOverrideId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.ttlMinutes * 60 * 1000);

  const stored: StoredOverride = {
    id,
    targetKey: input.targetKey,
    feature: input.feature,
    reason: input.reason,
    createdBy,
    createdAt: now,
    expiresAt,
    revokedAt: null,
    revokedBy: null,
  };

  overrideStore.set(id, stored);

  const override: EnforcementOverride = {
    id,
    targetKey: input.targetKey,
    feature: input.feature as GuardedFeature,
    reason: input.reason,
    createdBy,
    createdAt: now,
    expiresAt,
    active: true,
  };

  // Update cache
  const cacheKey = getCacheKey(input.targetKey, input.feature as GuardedFeature);
  overrideCache.set(cacheKey, { override, expiresAt: Date.now() + CACHE_TTL_MS });

  console.log('[Overrides] Created override:', {
    id,
    targetKey: input.targetKey,
    feature: input.feature,
    expiresAt: expiresAt.toISOString(),
    createdBy,
  });

  return override;
}

/**
 * Check for active override
 */
export async function getActiveOverride(
  targetKey: string,
  feature: GuardedFeature
): Promise<EnforcementOverride | null> {
  const cacheKey = getCacheKey(targetKey, feature);

  // Check cache
  const cached = overrideCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    if (cached.override.expiresAt > new Date() && cached.override.active) {
      return cached.override;
    }
    overrideCache.delete(cacheKey);
    return null;
  }

  // Check store
  const now = new Date();
  for (const stored of overrideStore.values()) {
    if (
      stored.targetKey === targetKey &&
      stored.feature === feature &&
      stored.expiresAt > now &&
      !stored.revokedAt
    ) {
      const override: EnforcementOverride = {
        id: stored.id,
        targetKey: stored.targetKey,
        feature: stored.feature as GuardedFeature,
        reason: stored.reason,
        createdBy: stored.createdBy,
        createdAt: stored.createdAt,
        expiresAt: stored.expiresAt,
        active: true,
      };

      // Update cache
      if (overrideCache.size >= MAX_CACHE_SIZE) {
        const firstKey = overrideCache.keys().next().value;
        if (firstKey) overrideCache.delete(firstKey);
      }
      overrideCache.set(cacheKey, { override, expiresAt: Date.now() + CACHE_TTL_MS });

      return override;
    }
  }

  return null;
}

/**
 * Revoke an override
 */
export async function revokeOverride(
  id: string,
  revokedBy: string
): Promise<{ success: boolean; error?: string }> {
  const stored = overrideStore.get(id);

  if (!stored) {
    return { success: false, error: 'Override not found' };
  }

  if (stored.revokedAt) {
    return { success: false, error: 'Override already revoked' };
  }

  stored.revokedAt = new Date();
  stored.revokedBy = revokedBy;

  // Invalidate cache
  const cacheKey = getCacheKey(stored.targetKey, stored.feature as GuardedFeature);
  overrideCache.delete(cacheKey);

  console.log('[Overrides] Revoked override:', {
    id,
    revokedBy,
    originalCreator: stored.createdBy,
  });

  return { success: true };
}

/**
 * List all overrides (active and expired)
 */
export async function listOverrides(options?: {
  activeOnly?: boolean;
  feature?: GuardedFeature;
  targetKey?: string;
  limit?: number;
}): Promise<EnforcementOverride[]> {
  const now = new Date();
  const results: EnforcementOverride[] = [];

  for (const stored of overrideStore.values()) {
    // Apply filters
    if (options?.feature && stored.feature !== options.feature) continue;
    if (options?.targetKey && stored.targetKey !== options.targetKey) continue;

    const isActive = stored.expiresAt > now && !stored.revokedAt;
    if (options?.activeOnly && !isActive) continue;

    results.push({
      id: stored.id,
      targetKey: stored.targetKey,
      feature: stored.feature as GuardedFeature,
      reason: stored.reason,
      createdBy: stored.createdBy,
      createdAt: stored.createdAt,
      expiresAt: stored.expiresAt,
      active: isActive,
    });
  }

  // Sort by creation date (newest first)
  results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  // Apply limit
  if (options?.limit) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Get override by ID
 */
export async function getOverride(id: string): Promise<EnforcementOverride | null> {
  const stored = overrideStore.get(id);
  if (!stored) return null;

  const now = new Date();
  return {
    id: stored.id,
    targetKey: stored.targetKey,
    feature: stored.feature as GuardedFeature,
    reason: stored.reason,
    createdBy: stored.createdBy,
    createdAt: stored.createdAt,
    expiresAt: stored.expiresAt,
    active: stored.expiresAt > now && !stored.revokedAt,
  };
}

/**
 * Cleanup expired overrides
 */
export async function cleanupExpiredOverrides(): Promise<number> {
  const now = new Date();
  let cleaned = 0;

  for (const [id, stored] of overrideStore.entries()) {
    // Remove if expired more than 24 hours ago
    const expiryBuffer = 24 * 60 * 60 * 1000;
    if (stored.expiresAt.getTime() + expiryBuffer < now.getTime()) {
      overrideStore.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log('[Overrides] Cleaned up expired overrides:', cleaned);
  }

  return cleaned;
}

/**
 * Get override statistics
 */
export async function getOverrideStats(): Promise<{
  totalActive: number;
  totalExpired: number;
  byFeature: Record<string, number>;
  recentlyCreated: number;
}> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  let totalActive = 0;
  let totalExpired = 0;
  let recentlyCreated = 0;
  const byFeature: Record<string, number> = {};

  for (const stored of overrideStore.values()) {
    const isActive = stored.expiresAt > now && !stored.revokedAt;

    if (isActive) {
      totalActive++;
      byFeature[stored.feature] = (byFeature[stored.feature] || 0) + 1;
    } else {
      totalExpired++;
    }

    if (stored.createdAt > oneHourAgo) {
      recentlyCreated++;
    }
  }

  return { totalActive, totalExpired, byFeature, recentlyCreated };
}

// Cleanup timer
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startOverrideCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => cleanupExpiredOverrides(), 60 * 60 * 1000); // Every hour
}

export function stopOverrideCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Clear cache
export function clearOverrideCache(): void {
  overrideCache.clear();
}
