/**
 * Config Status DTOs
 * Phase 1 Foundation: Service configuration and feature status schemas
 */

import { z } from 'zod';

// ============================================================================
// Service Configuration
// ============================================================================

const ServiceStatusSchema = z.object({
  configured: z.boolean(),
  model: z.string().optional(),
});

const GoogleServicesSchema = z.object({
  analyticsConfigured: z.boolean(),
  searchConsoleConfigured: z.boolean(),
});

export const ConfigStatusResponseSchema = z.object({
  timestamp: z.string().datetime(),
  services: z.object({
    openai: ServiceStatusSchema,
    replicate: ServiceStatusSchema,
    freepik: ServiceStatusSchema,
    gemini: ServiceStatusSchema,
    openrouter: ServiceStatusSchema,
    deepl: ServiceStatusSchema,
    resend: ServiceStatusSchema,
    cloudflare: ServiceStatusSchema,
    google: GoogleServicesSchema,
  }),
  activeAIProvider: z.string(),
  features: z.object({
    aiContentGeneration: z.boolean(),
    aiImageGeneration: z.boolean(),
    translations: z.boolean(),
    emailCampaigns: z.boolean(),
    cloudStorage: z.boolean(),
  }),
  safeMode: z.boolean(),
  correlationId: z.string().optional(),
});

export type ConfigStatusResponse = z.infer<typeof ConfigStatusResponseSchema>;

// ============================================================================
// Feature Flags
// ============================================================================

const FeatureFlagSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  description: z.string().optional(),
  category: z.string().optional(),
});

export const FeatureFlagsResponseSchema = z.object({
  timestamp: z.string().datetime(),
  flags: z.array(FeatureFlagSchema),
  summary: z.object({
    total: z.number(),
    enabled: z.number(),
    disabled: z.number(),
  }),
  correlationId: z.string().optional(),
});

export type FeatureFlagsResponse = z.infer<typeof FeatureFlagsResponseSchema>;

// ============================================================================
// Enabled Domains
// ============================================================================

const DomainStatusSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  features: z.record(z.boolean()).optional(),
});

export const DomainsStatusResponseSchema = z.object({
  timestamp: z.string().datetime(),
  domains: z.array(DomainStatusSchema),
  correlationId: z.string().optional(),
});

export type DomainsStatusResponse = z.infer<typeof DomainsStatusResponseSchema>;
