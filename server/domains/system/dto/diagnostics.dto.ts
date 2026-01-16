/**
 * Diagnostics DTOs
 * Phase 1 Foundation: Aggregated system diagnostics schema
 */

import { z } from 'zod';

// ============================================================================
// Diagnostics Aggregation
// ============================================================================

export const DiagnosticsResponseSchema = z.object({
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),

  // Health Summary
  health: z.object({
    status: z.enum(['healthy', 'unhealthy', 'degraded']),
    checks: z.object({
      database: z.object({
        status: z.enum(['healthy', 'unhealthy', 'warning', 'unknown']),
        latencyMs: z.number().optional(),
      }).optional(),
      memory: z.object({
        status: z.enum(['healthy', 'unhealthy', 'warning', 'unknown']),
        usagePercent: z.number().optional(),
        heapUsedMB: z.number().optional(),
        heapTotalMB: z.number().optional(),
      }).optional(),
    }),
  }),

  // System Info
  system: z.object({
    version: z.string(),
    nodeVersion: z.string(),
    environment: z.string(),
    uptimeSeconds: z.number(),
    uptimeFormatted: z.string(),
    startedAt: z.string().datetime(),
  }),

  // Enabled Domains
  domains: z.array(z.object({
    name: z.string(),
    enabled: z.boolean(),
  })),

  // Feature Flags Summary
  featureFlags: z.object({
    total: z.number(),
    enabled: z.number(),
    disabled: z.number(),
    foundation: z.record(z.boolean()),
  }),

  // Services Status
  services: z.object({
    activeAIProvider: z.string(),
    configured: z.object({
      ai: z.boolean(),
      imageGeneration: z.boolean(),
      translations: z.boolean(),
      email: z.boolean(),
      cloudStorage: z.boolean(),
    }),
  }),
});

export type DiagnosticsResponse = z.infer<typeof DiagnosticsResponseSchema>;
