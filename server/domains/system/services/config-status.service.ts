/**
 * Config Status Service
 * Phase 1 Foundation: Service configuration and feature flags
 */

import { getAIClient } from '../../../ai/providers';
import { safeMode } from '../../../security';
import { domains, getEnabledDomains } from '../../index';
import type {
  ConfigStatusResponse,
  FeatureFlagsResponse,
  DomainsStatusResponse,
} from '../dto';

// ============================================================================
// Feature Flag Definitions
// ============================================================================

interface FeatureFlagDefinition {
  name: string;
  envVar: string;
  description: string;
  category: 'foundation' | 'domain' | 'feature' | 'system';
}

const FEATURE_FLAGS: FeatureFlagDefinition[] = [
  // Foundation flags
  { name: 'foundation', envVar: 'ENABLE_FOUNDATION', description: 'Master switch for foundation architecture', category: 'foundation' },
  { name: 'foundation.correlationId', envVar: 'ENABLE_CORRELATION_ID', description: 'Request correlation ID tracking', category: 'foundation' },
  { name: 'foundation.errorHandler', envVar: 'ENABLE_FOUNDATION_ERROR_HANDLER', description: 'Foundation error handler', category: 'foundation' },
  { name: 'foundation.eventBus', envVar: 'ENABLE_FOUNDATION_EVENT_BUS', description: 'Domain event bus', category: 'foundation' },
  { name: 'foundation.eventStore', envVar: 'ENABLE_EVENT_STORE', description: 'Event store ring buffer', category: 'foundation' },
  { name: 'foundation.domains', envVar: 'ENABLE_FOUNDATION_DOMAINS', description: 'Domain route registration', category: 'foundation' },

  // Domain flags
  { name: 'domain.system', envVar: 'ENABLE_DOMAIN_SYSTEM', description: 'System domain', category: 'domain' },
  { name: 'domain.content', envVar: 'ENABLE_DOMAIN_CONTENT', description: 'Content domain', category: 'domain' },
  { name: 'domain.search', envVar: 'ENABLE_DOMAIN_SEARCH', description: 'Search domain', category: 'domain' },
  { name: 'domain.media', envVar: 'ENABLE_DOMAIN_MEDIA', description: 'Media domain', category: 'domain' },
  { name: 'domain.users', envVar: 'ENABLE_DOMAIN_USERS', description: 'Users domain', category: 'domain' },
  { name: 'domain.intelligence', envVar: 'ENABLE_DOMAIN_INTELLIGENCE', description: 'Intelligence domain', category: 'domain' },

  // System domain features
  { name: 'system.ping', envVar: 'ENABLE_FOUNDATION_PING', description: 'Foundation ping endpoint', category: 'feature' },
  { name: 'system.health', envVar: 'ENABLE_FOUNDATION_HEALTH', description: 'Foundation health endpoints', category: 'feature' },
  { name: 'system.diagnostics', envVar: 'ENABLE_SYSTEM_DIAGNOSTICS', description: 'System diagnostics endpoint', category: 'feature' },
  { name: 'system.configStatus', envVar: 'ENABLE_SYSTEM_CONFIG_STATUS', description: 'Config status endpoint', category: 'feature' },
  { name: 'system.featureFlags', envVar: 'ENABLE_SYSTEM_FEATURE_FLAGS', description: 'Feature flags endpoint', category: 'feature' },
];

// ============================================================================
// Service Implementation
// ============================================================================

export class ConfigStatusService {
  private static instance: ConfigStatusService;

  private constructor() {}

  static getInstance(): ConfigStatusService {
    if (!ConfigStatusService.instance) {
      ConfigStatusService.instance = new ConfigStatusService();
    }
    return ConfigStatusService.instance;
  }

  /**
   * Get service configuration status
   * Mirrors legacy /api/system-status but in foundation architecture
   */
  getConfigStatus(correlationId?: string): ConfigStatusResponse {
    const aiClient = getAIClient();

    return {
      timestamp: new Date().toISOString(),
      services: {
        openai: {
          configured: !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY),
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        },
        replicate: {
          configured: !!process.env.REPLICATE_API_KEY,
        },
        freepik: {
          configured: !!process.env.FREEPIK_API_KEY,
        },
        gemini: {
          configured: !!(process.env.GEMINI_API_KEY || process.env.GEMINI || process.env.gemini),
        },
        openrouter: {
          configured: !!(process.env.OPENROUTER_API_KEY || process.env.openrouterapi || process.env.OPENROUTERAPI || process.env.travisite),
        },
        deepl: {
          configured: !!process.env.DEEPL_API_KEY,
        },
        resend: {
          configured: !!process.env.RESEND_API_KEY,
        },
        cloudflare: {
          configured: !!(process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID),
        },
        google: {
          analyticsConfigured: !!process.env.GOOGLE_ANALYTICS_ID,
          searchConsoleConfigured: !!process.env.GOOGLE_SITE_VERIFICATION,
        },
      },
      activeAIProvider: aiClient?.provider || 'none',
      features: {
        aiContentGeneration: !!aiClient,
        aiImageGeneration: !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.REPLICATE_API_KEY),
        translations: !!process.env.DEEPL_API_KEY,
        emailCampaigns: !!process.env.RESEND_API_KEY,
        cloudStorage: !!(process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID),
      },
      safeMode: safeMode,
      ...(correlationId && { correlationId }),
    };
  }

  /**
   * Get all feature flags status
   */
  getFeatureFlags(correlationId?: string): FeatureFlagsResponse {
    const flags = FEATURE_FLAGS.map((flag) => ({
      name: flag.name,
      enabled: process.env[flag.envVar] === 'true',
      description: flag.description,
      category: flag.category,
    }));

    const enabled = flags.filter((f) => f.enabled).length;

    return {
      timestamp: new Date().toISOString(),
      flags,
      summary: {
        total: flags.length,
        enabled,
        disabled: flags.length - enabled,
      },
      ...(correlationId && { correlationId }),
    };
  }

  /**
   * Get foundation feature flags as a simple record
   */
  getFoundationFlags(): Record<string, boolean> {
    const foundationFlags = FEATURE_FLAGS.filter((f) => f.category === 'foundation');
    const result: Record<string, boolean> = {};

    for (const flag of foundationFlags) {
      result[flag.name] = process.env[flag.envVar] === 'true';
    }

    return result;
  }

  /**
   * Get enabled domains status
   */
  getDomainsStatus(correlationId?: string): DomainsStatusResponse {
    const domainList = Object.entries(domains).map(([name, info]) => ({
      name,
      enabled: info.enabled,
      features: (info as any).features,
    }));

    return {
      timestamp: new Date().toISOString(),
      domains: domainList,
      ...(correlationId && { correlationId }),
    };
  }

  /**
   * Check if a specific flag is enabled
   */
  isFlagEnabled(flagName: string): boolean {
    const flag = FEATURE_FLAGS.find((f) => f.name === flagName);
    if (!flag) return false;
    return process.env[flag.envVar] === 'true';
  }
}

export const configStatusService = ConfigStatusService.getInstance();
