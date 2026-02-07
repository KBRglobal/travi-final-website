/**
 * Autonomy Enforcement SDK - Express Middleware
 * Middleware helpers for HTTP route protection
 */

import type { Request, Response, NextFunction } from "express";
import { enforceAutonomy } from "./decision";

import {
  EnforcementContext,
  AutonomyBlockedError,
  DEFAULT_ENFORCEMENT_CONFIG,
  GuardedFeature,
  DegradedResponse,
} from "./types";
import { ActionType } from "../policy/types";

// Extended request with enforcement context
export interface EnforcedRequest extends Request {
  autonomy?: {
    decision: string;
    warnings: string[];
    budgetRemaining?: {
      actions: number;
      tokens: number;
      aiSpendCents: number;
    };
  };
}

type ContextExtractor = (req: Request) => Partial<EnforcementContext>;

/**
 * Create middleware that enforces autonomy policy before route execution
 */
export function createEnforcementMiddleware(
  feature: GuardedFeature,
  action: ActionType,
  contextExtractor?: ContextExtractor
) {
  return async (req: EnforcedRequest, res: Response, next: NextFunction) => {
    if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
      return next();
    }

    try {
      const baseContext: EnforcementContext = {
        feature,
        action,
        requesterId: (req as any).userId || (req as any).user?.id,
        ...extractDefaultContext(req),
        ...(contextExtractor ? contextExtractor(req) : {}),
      };

      const result = await enforceAutonomy(baseContext);

      // Attach enforcement info to request
      req.autonomy = {
        decision: result.decision,
        warnings: result.warnings,
        budgetRemaining: result.budgetRemaining,
      };

      if (!result.allowed) {
        return res.status(429).json({
          error: "Operation blocked by autonomy policy",
          code: "AUTONOMY_BLOCKED",
          decision: result.decision,
          reasons: result.reasons.map(r => ({ code: r.code, message: r.message })),
          retryAfter: getRetryAfterHeader(result.reasons),
        });
      }

      // Add warnings header if any
      if (result.warnings.length > 0) {
        res.setHeader("X-Autonomy-Warnings", result.warnings.join("; "));
      }

      next();
    } catch (error) {
      if (error instanceof AutonomyBlockedError) {
        return res.status(429).json(error.toJSON());
      }

      // On enforcement errors, block by default (fail closed)
      return res.status(503).json({
        error: "Autonomy enforcement unavailable",
        code: "ENFORCEMENT_ERROR",
      });
    }
  };
}

/**
 * Middleware that enforces with degraded mode fallback
 */
export function createDegradedModeMiddleware<T>(
  feature: GuardedFeature,
  action: ActionType,
  fallbackData: T,
  contextExtractor?: ContextExtractor
) {
  return async (req: EnforcedRequest, res: Response, next: NextFunction) => {
    if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) {
      return next();
    }

    try {
      const baseContext: EnforcementContext = {
        feature,
        action,
        requesterId: (req as any).userId || (req as any).user?.id,
        ...extractDefaultContext(req),
        ...(contextExtractor ? contextExtractor(req) : {}),
      };

      const result = await enforceAutonomy(baseContext);

      req.autonomy = {
        decision: result.decision,
        warnings: result.warnings,
        budgetRemaining: result.budgetRemaining,
      };

      if (!result.allowed) {
        // Return degraded response instead of blocking
        if (DEFAULT_ENFORCEMENT_CONFIG.degradedModeEnabled) {
          const degraded: DegradedResponse<T> = {
            isDegraded: true,
            reason:
              result.reasons.find(r => r.severity === "error")?.message ||
              DEFAULT_ENFORCEMENT_CONFIG.defaultBlockMessage,
            fallbackData,
            retryAfter: getRetryAfterHeader(result.reasons),
          };
          return res.status(200).json(degraded);
        }

        return res.status(429).json({
          error: "Operation blocked by autonomy policy",
          code: "AUTONOMY_BLOCKED",
          decision: result.decision,
          reasons: result.reasons.map(r => ({ code: r.code, message: r.message })),
        });
      }

      if (result.warnings.length > 0) {
        res.setHeader("X-Autonomy-Warnings", result.warnings.join("; "));
      }

      next();
    } catch (error) {
      // On errors with degraded mode, return fallback
      if (DEFAULT_ENFORCEMENT_CONFIG.degradedModeEnabled) {
        const degraded: DegradedResponse<T> = {
          isDegraded: true,
          reason: "Autonomy enforcement temporarily unavailable",
          fallbackData,
        };
        return res.status(200).json(degraded);
      }

      return res.status(503).json({
        error: "Autonomy enforcement unavailable",
        code: "ENFORCEMENT_ERROR",
      });
    }
  };
}

/**
 * Error handler middleware for AutonomyBlockedError
 */
export function autonomyErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error instanceof AutonomyBlockedError) {
    const retryAfter = error.retryAfter;
    if (retryAfter) {
      res.setHeader("Retry-After", retryAfter);
    }

    return res.status(429).json({
      error: error.message,
      code: error.code,
      decision: error.decision,
      reasons: error.reasons.map(r => ({ code: r.code, message: r.message })),
      feature: error.feature,
      action: error.action,
      retryAfter,
    });
  }

  next(error);
}

/**
 * Logging middleware for enforcement decisions
 */
export function enforcementLoggingMiddleware(
  req: EnforcedRequest,
  res: Response,
  next: NextFunction
) {
  res.on("finish", () => {
    if (req.autonomy) {
      if (req.autonomy.decision === "BLOCK") {
        /* Decision logged at autonomy level - no additional action needed */
      } else if (req.autonomy.warnings.length > 0) {
        /* Warnings captured at autonomy level */
      }
    }
  });

  next();
}

// Helper to extract default context from request
function extractDefaultContext(req: Request): Partial<EnforcementContext> {
  return {
    entityId: req.params?.id || req.body?.contentId || req.body?.entityId,
    contentId: req.body?.contentId || req.params?.contentId,
    locale:
      (req.query?.locale as string) ||
      req.body?.locale ||
      req.headers["accept-language"]?.split(",")[0],
  };
}

function getRetryAfterHeader(
  reasons: Array<{ code: string; message: string; severity: string }>
): number | undefined {
  if (reasons.some(r => r.code === "BUDGET_EXHAUSTED")) {
    return 3600;
  }
  if (reasons.some(r => r.code === "OUTSIDE_ALLOWED_HOURS")) {
    return 1800;
  }
  if (reasons.some(r => r.code === "RATE_LIMITED")) {
    return 60;
  }
  return undefined;
}
