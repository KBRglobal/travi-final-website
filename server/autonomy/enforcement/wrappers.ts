/**
 * Autonomy Enforcement SDK - Wrappers
 * Guard wrappers for AI calls, jobs, and publishing operations
 */

import { enforceAutonomy, enforceOrThrow } from "./decision";
import { recordConsumption } from "./budget-consumer";

import {
  EnforcementContext,
  AutonomyBlockedError,
  GuardedFeature,
  DegradedResponse,
  JobBlockResult,
  DEFAULT_ENFORCEMENT_CONFIG,
} from "./types";
import { ActionType } from "../policy/types";

const DEFAULT_AI_TIMEOUT_MS = 30000;
const DEFAULT_JOB_TIMEOUT_MS = 60000;

// Degraded mode fallback messages
const DEGRADED_FALLBACKS: Record<GuardedFeature, string> = {
  chat: "I apologize, but I am temporarily unable to process your request. Please try again later.",
  octopus: "Content generation is temporarily limited. Please try again later.",
  search: "Search enrichment is temporarily unavailable.",
  aeo: "AEO optimization is temporarily limited.",
  translation: "Translation service is temporarily unavailable.",
  images: "Image generation is temporarily limited.",
  content_enrichment: "Content enrichment is temporarily unavailable.",
  seo_optimization: "SEO optimization is temporarily limited.",
  internal_linking: "Internal linking is temporarily unavailable.",
  background_job: "Background processing is temporarily limited.",
  publishing: "Publishing is temporarily restricted.",
};

/**
 * Guard wrapper for AI calls
 * Wraps any async function with policy enforcement and budget tracking
 */
function resolveFallback<T>(fallback: T | (() => T)): T {
  return typeof fallback === "function" ? (fallback as () => T)() : fallback;
}

function makeDegradedResponse<T>(
  reason: string,
  fallbackData: T,
  retryAfter?: number
): DegradedResponse<T> {
  return {
    isDegraded: true,
    reason,
    fallbackData,
    ...(retryAfter !== undefined ? { retryAfter } : {}),
  } as DegradedResponse<T>;
}

function canUseDegradedMode<T>(options?: { fallback?: T | (() => T) }): boolean {
  return DEFAULT_ENFORCEMENT_CONFIG.degradedModeEnabled && options?.fallback !== undefined;
}

function getErrorReason(reasons: Array<{ severity: string; message: string }>): string | undefined {
  return reasons.find(r => r.severity === "error")?.message;
}

export async function guardAiCall<T>(
  feature: GuardedFeature,
  context: Omit<EnforcementContext, "feature" | "action">,
  fn: () => Promise<T>,
  options?: {
    timeoutMs?: number;
    fallback?: T | (() => T);
    action?: ActionType;
  }
): Promise<T | DegradedResponse<T>> {
  const startTime = Date.now();
  const action = options?.action || "ai_generate";

  const enforcementContext: EnforcementContext = {
    ...context,
    feature,
    action,
  };

  // Check enforcement
  const result = await enforceAutonomy(enforcementContext);

  if (!result.allowed) {
    if (canUseDegradedMode(options)) {
      const fallbackData = resolveFallback(options!.fallback!);
      return makeDegradedResponse(
        getErrorReason(result.reasons) || DEGRADED_FALLBACKS[feature],
        fallbackData,
        3600
      );
    }

    throw new AutonomyBlockedError(
      getErrorReason(result.reasons) || DEFAULT_ENFORCEMENT_CONFIG.defaultBlockMessage,
      { reasons: result.reasons, feature, action, matchedPolicy: result.matchedPolicy }
    );
  }

  // Execute the function with timeout
  const timeoutMs = options?.timeoutMs || DEFAULT_AI_TIMEOUT_MS;

  try {
    const response = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`AI call timeout after ${timeoutMs}ms`)), timeoutMs)
      ),
    ]);

    const durationMs = Date.now() - startTime;
    await recordConsumption({
      feature,
      action,
      tokensUsed: context.estimatedTokens || 0,
      aiSpendCents: context.estimatedCost || 0,
      success: true,
      durationMs,
      timestamp: new Date(),
    });

    return response;
  } catch (error) {
    const durationMs = Date.now() - startTime;
    await recordConsumption({
      feature,
      action,
      tokensUsed: context.estimatedTokens || 0,
      aiSpendCents: 0,
      success: false,
      durationMs,
      timestamp: new Date(),
    });

    if (canUseDegradedMode(options) && !(error instanceof AutonomyBlockedError)) {
      const fallbackData = resolveFallback(options!.fallback!);
      return makeDegradedResponse(
        error instanceof Error ? error.message : "AI call failed",
        fallbackData
      );
    }

    throw error;
  }
}

/**
 * Guard wrapper for job execution
 * Returns blocking result instead of throwing to allow job queue to handle rescheduling
 */
export async function guardJobExecution(
  jobType: string,
  context: {
    jobId: string;
    entityId?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<JobBlockResult> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
    return { blocked: false, shouldRetry: true };
  }

  const feature: GuardedFeature = "background_job";
  const action: ActionType = "ai_generate"; // Most jobs involve AI

  try {
    const result = await enforceAutonomy({
      feature,
      action,
      entityId: context.entityId,
      locale: context.locale,
      metadata: {
        ...context.metadata,
        jobType,
        jobId: context.jobId,
      },
    });

    if (!result.allowed) {
      // Determine if should retry based on reason
      const shouldRetry = result.reasons.some(
        r =>
          r.code === "BUDGET_EXHAUSTED" ||
          r.code === "OUTSIDE_ALLOWED_HOURS" ||
          r.code === "RATE_LIMITED"
      );

      // Calculate reschedule time
      let rescheduleAfterMs = 60000; // Default 1 minute
      if (result.reasons.some(r => r.code === "BUDGET_EXHAUSTED")) {
        rescheduleAfterMs = 3600000; // 1 hour for budget
      } else if (result.reasons.some(r => r.code === "OUTSIDE_ALLOWED_HOURS")) {
        rescheduleAfterMs = 1800000; // 30 minutes for time window
      }

      return {
        blocked: true,
        reason:
          result.reasons.find(r => r.severity === "error")?.message || "Job blocked by policy",
        rescheduleAfterMs,
        shouldRetry,
      };
    }

    return { blocked: false, shouldRetry: true };
  } catch (error) {
    // On errors, block but allow retry
    return {
      blocked: true,
      reason: error instanceof Error ? error.message : "Enforcement check failed",
      rescheduleAfterMs: 60000,
      shouldRetry: true,
    };
  }
}

/**
 * Guard wrapper for publishing operations
 * Returns detailed result for UI feedback
 */
export async function guardPublish(context: {
  contentId: string;
  contentType: string;
  userId?: string;
  locale?: string;
}): Promise<{
  allowed: boolean;
  reason?: string;
  warnings: string[];
  requiresApproval?: boolean;
}> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
    return { allowed: true, warnings: [] };
  }

  try {
    const result = await enforceAutonomy({
      feature: "publishing",
      action: "content_publish",
      contentId: context.contentId,
      entityId: context.contentId,
      locale: context.locale,
      requesterId: context.userId,
      metadata: {
        contentType: context.contentType,
      },
    });

    if (!result.allowed) {
      return {
        allowed: false,
        reason: result.reasons.find(r => r.severity === "error")?.message,
        warnings: result.warnings,
      };
    }

    // Check if requires approval
    const requiresApproval = result.reasons.some(r => r.code === "REQUIRES_APPROVAL");

    return {
      allowed: true,
      warnings: result.warnings,
      requiresApproval,
    };
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : "Publishing check failed",
      warnings: [],
    };
  }
}

/**
 * Simple enforcement wrapper that throws on block
 */
export async function withEnforcement<T>(
  feature: GuardedFeature,
  action: ActionType,
  fn: () => Promise<T>,
  context?: Partial<EnforcementContext>
): Promise<T> {
  await enforceOrThrow({
    feature,
    action,
    ...context,
  });

  return fn();
}

/**
 * Check if a feature is currently allowed (quick check for UI)
 */
export async function isFeatureAllowed(
  feature: GuardedFeature,
  action: ActionType = "ai_generate"
): Promise<{ allowed: boolean; reason?: string }> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
    return { allowed: true };
  }

  const result = await enforceAutonomy({ feature, action });
  return {
    allowed: result.allowed,
    reason: result.allowed ? undefined : result.reasons.find(r => r.severity === "error")?.message,
  };
}

/**
 * Get degraded fallback message for a feature
 */
export function getDegradedFallback(feature: GuardedFeature): string {
  return DEGRADED_FALLBACKS[feature] || DEFAULT_ENFORCEMENT_CONFIG.defaultBlockMessage;
}
