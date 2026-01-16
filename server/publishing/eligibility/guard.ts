/**
 * Publish Guard
 *
 * Guards publish actions and blocks when eligibility fails.
 * Integrates with manual and scheduled publishing.
 */

import { evaluateEligibility } from "./engine";
import {
  type EligibilityOptions,
  type PublishGuardResult,
  isPublishGuardsEnabled,
} from "./types";

/**
 * Check if publishing is allowed and return structured result
 */
export async function checkPublishGuard(
  contentId: string,
  options: EligibilityOptions = {}
): Promise<PublishGuardResult> {
  // If guards are disabled, always allow
  if (!isPublishGuardsEnabled()) {
    return {
      allowed: true,
      eligibility: {
        contentId,
        allowed: true,
        blockingReasons: [],
        warnings: ['Publish guards disabled'],
        score: 100,
        evaluatedAt: new Date(),
      },
      action: 'proceed',
    };
  }

  const eligibility = await evaluateEligibility(contentId, options);

  if (!eligibility.allowed) {
    console.log(`[PublishGuard] Blocked: ${contentId}`, {
      reasons: eligibility.blockingReasons,
    });

    return {
      allowed: false,
      eligibility,
      action: 'blocked',
    };
  }

  if (eligibility.warnings.length > 0) {
    console.log(`[PublishGuard] Allowed with warnings: ${contentId}`, {
      warnings: eligibility.warnings,
    });

    return {
      allowed: true,
      eligibility,
      action: 'warning',
    };
  }

  return {
    allowed: true,
    eligibility,
    action: 'proceed',
  };
}

/**
 * Guard for manual publish actions
 * Returns structured error if blocked
 */
export async function guardManualPublish(
  contentId: string,
  options: EligibilityOptions = {}
): Promise<{ success: boolean; error?: string; eligibility?: PublishGuardResult['eligibility'] }> {
  const result = await checkPublishGuard(contentId, options);

  if (!result.allowed) {
    return {
      success: false,
      error: `Publishing blocked: ${result.eligibility.blockingReasons.join('; ')}`,
      eligibility: result.eligibility,
    };
  }

  return {
    success: true,
    eligibility: result.eligibility,
  };
}

/**
 * Guard for scheduled publish actions
 * Used by scheduler engine
 */
export async function guardScheduledPublish(
  contentId: string
): Promise<{ allowed: boolean; reasons: string[] }> {
  const result = await checkPublishGuard(contentId, { forcePublish: true });

  return {
    allowed: result.allowed,
    reasons: result.eligibility.blockingReasons,
  };
}
