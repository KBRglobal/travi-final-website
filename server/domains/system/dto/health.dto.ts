/**
 * Health Check DTOs
 * Phase 1 Foundation: Request/Response schemas for health endpoints
 */

import { z } from 'zod';

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Health check query parameters
 */
export const HealthCheckQuerySchema = z.object({
  /** Include detailed checks (db, memory, etc.) */
  detailed: z
    .enum(['true', 'false'])
    .optional()
    .default('true')
    .transform((v) => v === 'true'),
  /** Specific checks to include */
  checks: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',') : undefined)),
});

export type HealthCheckQuery = z.infer<typeof HealthCheckQuerySchema>;

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Individual check result
 */
export const CheckResultSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'warning', 'unknown']),
  latency: z.number().optional(),
  usage: z.number().optional(),
  message: z.string().optional(),
});

export type CheckResult = z.infer<typeof CheckResultSchema>;

/**
 * Health check response
 */
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.string().datetime(),
  uptime: z.number(),
  version: z.string(),
  correlationId: z.string().optional(),
  checks: z.object({
    database: CheckResultSchema.optional(),
    memory: CheckResultSchema.optional(),
  }).optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/**
 * Liveness probe response
 */
export const LivenessResponseSchema = z.object({
  status: z.literal('alive'),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
});

export type LivenessResponse = z.infer<typeof LivenessResponseSchema>;

/**
 * Readiness probe response
 */
export const ReadinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
  reason: z.string().optional(),
});

export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>;
