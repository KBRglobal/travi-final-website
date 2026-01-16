/**
 * Octopus v2 - Intelligence Client (Read-Only)
 * 
 * Integrates with intelligence endpoints for image analysis.
 * Called ONLY after approval, results stored in ImageUsage, 
 * NEVER overrides the Image Engine.
 * 
 * HARD CONSTRAINTS:
 * - Read-only integration (no mutations to image engine)
 * - Called only after manual/automated approval
 * - Results are cached in ImageUsage records
 */

import { type IntelligenceSnapshot } from '@shared/schema';
import { log } from '../lib/logger';
import { fetchWithTimeout } from '../lib/fetch-with-timeout';

const INTELLIGENCE_TIMEOUT_MS = 30000; // 30 seconds

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => 
    log.info(`[IntelligenceClient] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => 
    log.error(`[IntelligenceClient] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => 
    log.warn(`[IntelligenceClient] ${msg}`, data),
};

// Intelligence API endpoints (internal)
const INTELLIGENCE_BASE_URL = process.env.INTELLIGENCE_API_URL || '/api/v1/intelligence';

export interface RelevanceRequest {
  assetId: string;
  entityId: string;
  entityType: string;
  entityName?: string;
  entityDescription?: string;
}

export interface RelevanceResponse {
  relevanceScore: number;      // 0-100
  confidenceLevel: number;     // 0-1
  subjects: string[];
  tags: string[];
  reasoning?: string;
}

export interface UsageRequest {
  assetId: string;
  role: string;
  pageType: string;
  dimensions?: { width: number; height: number };
}

export interface UsageResponse {
  usageScore: number;          // 0-100 suitability for role
  qualityScore: number;        // 0-100 technical quality
  composition: string;
  mood: string;
  colorPalette: string[];
  suggestions?: string[];
}

/**
 * Fetch relevance score from intelligence API
 * 
 * @param request - Relevance request parameters
 * @returns Relevance response or null if failed
 */
export async function fetchRelevance(request: RelevanceRequest): Promise<RelevanceResponse | null> {
  try {
    logger.info('Fetching relevance score', { 
      assetId: request.assetId, 
      entityId: request.entityId 
    });

    const response = await fetchWithTimeout(`${INTELLIGENCE_BASE_URL}/relevance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      timeoutMs: INTELLIGENCE_TIMEOUT_MS,
    });

    if (!response.ok) {
      logger.error('Relevance API error', { 
        status: response.status, 
        assetId: request.assetId 
      });
      return null;
    }

    const data = await response.json() as RelevanceResponse;
    
    logger.info('Relevance score fetched', { 
      assetId: request.assetId,
      relevanceScore: data.relevanceScore,
      confidenceLevel: data.confidenceLevel,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch relevance', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      assetId: request.assetId,
    });
    return null;
  }
}

/**
 * Fetch usage suitability from intelligence API
 * 
 * @param request - Usage request parameters
 * @returns Usage response or null if failed
 */
export async function fetchUsage(request: UsageRequest): Promise<UsageResponse | null> {
  try {
    logger.info('Fetching usage suitability', { 
      assetId: request.assetId, 
      role: request.role 
    });

    const response = await fetchWithTimeout(`${INTELLIGENCE_BASE_URL}/usage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      timeoutMs: INTELLIGENCE_TIMEOUT_MS,
    });

    if (!response.ok) {
      logger.error('Usage API error', { 
        status: response.status, 
        assetId: request.assetId 
      });
      return null;
    }

    const data = await response.json() as UsageResponse;
    
    logger.info('Usage suitability fetched', { 
      assetId: request.assetId,
      usageScore: data.usageScore,
      qualityScore: data.qualityScore,
    });

    return data;
  } catch (error) {
    logger.error('Failed to fetch usage', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      assetId: request.assetId,
    });
    return null;
  }
}

/**
 * Fetch complete intelligence for an image
 * Combines relevance and usage into a single snapshot
 * 
 * @param assetId - The image asset ID
 * @param entityId - The entity ID
 * @param entityType - The entity type
 * @param role - The requested role
 * @param pageType - The page type
 * @returns Complete intelligence snapshot
 */
export async function fetchIntelligenceSnapshot(
  assetId: string,
  entityId: string,
  entityType: string,
  role: string,
  pageType: string,
  entityName?: string,
  entityDescription?: string
): Promise<IntelligenceSnapshot | null> {
  try {
    // Fetch both in parallel
    const [relevance, usage] = await Promise.all([
      fetchRelevance({ assetId, entityId, entityType, entityName, entityDescription }),
      fetchUsage({ assetId, role, pageType }),
    ]);

    if (!relevance && !usage) {
      logger.warn('No intelligence data available', { assetId });
      return null;
    }

    const snapshot: IntelligenceSnapshot = {
      relevanceScore: relevance?.relevanceScore,
      usageScore: usage?.usageScore,
      qualityScore: usage?.qualityScore,
      confidenceLevel: relevance?.confidenceLevel,
      tags: relevance?.tags,
      subjects: relevance?.subjects,
      mood: usage?.mood,
      colorPalette: usage?.colorPalette,
      composition: usage?.composition,
      fetchedAt: new Date().toISOString(),
      provider: 'octopus-intelligence',
    };

    logger.info('Intelligence snapshot created', { 
      assetId,
      hasRelevance: !!relevance,
      hasUsage: !!usage,
    });

    return snapshot;
  } catch (error) {
    logger.error('Failed to fetch intelligence snapshot', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      assetId,
    });
    return null;
  }
}

/**
 * Batch fetch intelligence for multiple images
 * 
 * @param requests - Array of image requests
 * @returns Map of assetId to intelligence snapshot
 */
export async function batchFetchIntelligence(
  requests: Array<{
    assetId: string;
    entityId: string;
    entityType: string;
    role: string;
    pageType: string;
    entityName?: string;
    entityDescription?: string;
  }>
): Promise<Map<string, IntelligenceSnapshot | null>> {
  const results = new Map<string, IntelligenceSnapshot | null>();

  // Process in parallel with concurrency limit
  const concurrencyLimit = 5;
  
  for (let i = 0; i < requests.length; i += concurrencyLimit) {
    const batch = requests.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(async (req) => {
        const snapshot = await fetchIntelligenceSnapshot(
          req.assetId,
          req.entityId,
          req.entityType,
          req.role,
          req.pageType,
          req.entityName,
          req.entityDescription
        );
        return { assetId: req.assetId, snapshot };
      })
    );

    for (const { assetId, snapshot } of batchResults) {
      results.set(assetId, snapshot);
    }
  }

  logger.info('Batch intelligence fetch complete', { 
    requestCount: requests.length,
    successCount: Array.from(results.values()).filter(v => v !== null).length,
  });

  return results;
}

/**
 * Mock intelligence for testing (no external calls)
 */
export function mockIntelligenceSnapshot(
  qualityScore = 75,
  relevanceScore = 80
): IntelligenceSnapshot {
  return {
    relevanceScore,
    usageScore: 70,
    qualityScore,
    confidenceLevel: 0.85,
    tags: ['travel', 'dubai', 'landmark'],
    subjects: ['architecture', 'skyline'],
    mood: 'inspiring',
    colorPalette: ['#1a73e8', '#f5f5f5', '#333333'],
    composition: 'rule-of-thirds',
    fetchedAt: new Date().toISOString(),
    provider: 'mock',
  };
}
