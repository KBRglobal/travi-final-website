/**
 * System Info DTOs
 * Phase 1 Foundation: Version, uptime, and build information schemas
 */

import { z } from 'zod';

// ============================================================================
// Version Info
// ============================================================================

export const VersionResponseSchema = z.object({
  currentVersion: z.string(),
  supportedVersions: z.array(z.string()),
  deprecatedEndpoints: z.array(z.object({
    path: z.string(),
    info: z.object({
      deprecatedAt: z.string().optional(),
      sunsetAt: z.string().optional(),
      replacement: z.string().optional(),
      reason: z.string().optional(),
    }),
  })),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
});

export type VersionResponse = z.infer<typeof VersionResponseSchema>;

// ============================================================================
// Uptime Info
// ============================================================================

export const UptimeResponseSchema = z.object({
  uptimeSeconds: z.number(),
  uptimeFormatted: z.string(),
  startedAt: z.string().datetime(),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
});

export type UptimeResponse = z.infer<typeof UptimeResponseSchema>;

// ============================================================================
// Build Info
// ============================================================================

export const BuildInfoResponseSchema = z.object({
  version: z.string(),
  nodeVersion: z.string(),
  environment: z.string(),
  buildTime: z.string().optional(),
  gitCommit: z.string().optional(),
  gitBranch: z.string().optional(),
  timestamp: z.string().datetime(),
  correlationId: z.string().optional(),
});

export type BuildInfoResponse = z.infer<typeof BuildInfoResponseSchema>;
