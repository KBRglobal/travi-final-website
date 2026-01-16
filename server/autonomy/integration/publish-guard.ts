/**
 * Autonomy Integration - Publish Guard
 * Content publishing enforcement without modifying content-subscribers.ts
 */

import { guardPublish, AutonomyBlockedError, DEFAULT_ENFORCEMENT_CONFIG } from '../enforcement';

export interface PublishCheckResult {
  allowed: boolean;
  reason?: string;
  warnings: string[];
  requiresApproval?: boolean;
  suggestedAction?: 'proceed' | 'review' | 'wait' | 'override';
}

/**
 * Check if content can be published
 * Call this before any publishing operation
 */
export async function canPublishContent(
  contentId: string,
  contentType: string,
  options?: {
    userId?: string;
    locale?: string;
    source?: 'manual' | 'scheduled' | 'auto-pilot';
  }
): Promise<PublishCheckResult> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
    return { allowed: true, warnings: [] };
  }

  const result = await guardPublish({
    contentId,
    contentType,
    userId: options?.userId,
    locale: options?.locale,
  });

  // Determine suggested action
  let suggestedAction: PublishCheckResult['suggestedAction'] = 'proceed';
  if (!result.allowed) {
    if (result.reason?.includes('budget')) {
      suggestedAction = 'wait';
    } else if (result.reason?.includes('approval')) {
      suggestedAction = 'review';
    } else {
      suggestedAction = 'override';
    }
  } else if (result.requiresApproval) {
    suggestedAction = 'review';
  }

  return {
    allowed: result.allowed,
    reason: result.reason,
    warnings: result.warnings,
    requiresApproval: result.requiresApproval,
    suggestedAction,
  };
}

/**
 * Assert publishing is allowed - throws if blocked
 */
export async function assertCanPublish(
  contentId: string,
  contentType: string,
  options?: {
    userId?: string;
    locale?: string;
  }
): Promise<void> {
  const result = await canPublishContent(contentId, contentType, options);

  if (!result.allowed) {
    throw new AutonomyBlockedError(
      result.reason || 'Publishing blocked by autonomy policy',
      {
        reasons: [{
          code: 'PUBLISH_BLOCKED',
          message: result.reason || 'Publishing not allowed',
          severity: 'error',
        }],
        feature: 'publishing',
        action: 'content_publish',
      }
    );
  }
}

/**
 * Create publish guard middleware for Express routes
 * Use this to protect publish endpoints
 */
export function createPublishGuardMiddleware() {
  return async (req: any, res: any, next: any) => {
    if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
      return next();
    }

    const contentId = req.params?.id || req.body?.contentId;
    const contentType = req.body?.type || 'content';
    const userId = req.userId || req.user?.id;

    if (!contentId) {
      return next(); // Let route handler deal with missing ID
    }

    const result = await canPublishContent(contentId, contentType, {
      userId,
      locale: req.body?.locale,
    });

    if (!result.allowed) {
      return res.status(409).json({
        error: 'Publishing blocked by autonomy policy',
        code: 'AUTONOMY_PUBLISH_BLOCKED',
        reason: result.reason,
        suggestedAction: result.suggestedAction,
        warnings: result.warnings,
      });
    }

    // Attach result to request for downstream use
    req.autonomyPublishCheck = result;

    // Add warnings header if any
    if (result.warnings.length > 0) {
      res.setHeader('X-Autonomy-Warnings', result.warnings.join('; '));
    }

    next();
  };
}

/**
 * Batch check for multiple content items
 */
export async function canPublishBatch(
  items: Array<{ contentId: string; contentType: string }>,
  options?: {
    userId?: string;
    locale?: string;
  }
): Promise<Map<string, PublishCheckResult>> {
  const results = new Map<string, PublishCheckResult>();

  // Process in parallel with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(item =>
        canPublishContent(item.contentId, item.contentType, options)
          .then(result => ({ contentId: item.contentId, result }))
      )
    );

    for (const { contentId, result } of batchResults) {
      results.set(contentId, result);
    }
  }

  return results;
}

/**
 * Get publishing status summary
 */
export async function getPublishingStatus(): Promise<{
  enabled: boolean;
  degradedMode: boolean;
  canPublish: boolean;
  reason?: string;
  warnings: string[];
}> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
    return {
      enabled: false,
      degradedMode: false,
      canPublish: true,
      warnings: [],
    };
  }

  // Check generic publishing capability
  const result = await guardPublish({
    contentId: 'status-check',
    contentType: 'generic',
  });

  return {
    enabled: DEFAULT_ENFORCEMENT_CONFIG.enabled,
    degradedMode: DEFAULT_ENFORCEMENT_CONFIG.degradedModeEnabled,
    canPublish: result.allowed,
    reason: result.reason,
    warnings: result.warnings,
  };
}
