/**
 * Autonomy Integration - AI Call Guard
 * Central wrapper for all AI provider calls with enforcement
 */

import { guardAiCall, DegradedResponse, GuardedFeature, DEFAULT_ENFORCEMENT_CONFIG } from '../enforcement';
import type { AICompletionOptions, AICompletionResult, UnifiedAIProvider } from '../../ai/providers';

const AI_CALL_TIMEOUT_MS = 60000;

// Feature mapping for different AI use cases
const FEATURE_MAP: Record<string, GuardedFeature> = {
  chat: 'chat',
  octopus: 'octopus',
  search: 'search',
  aeo: 'aeo',
  translation: 'translation',
  images: 'images',
  content: 'content_enrichment',
  seo: 'seo_optimization',
  linking: 'internal_linking',
};

/**
 * Wrap a unified AI provider with enforcement
 */
export function wrapProviderWithEnforcement(provider: UnifiedAIProvider): UnifiedAIProvider {
  return {
    ...provider,
    generateCompletion: async (options: AICompletionOptions): Promise<AICompletionResult> => {
      // Extract feature from context if available
      const feature = detectFeature(options);

      const result = await guardAiCall(
        feature,
        {
          estimatedTokens: options.maxTokens || 4000,
          estimatedCost: estimateCost(options.maxTokens || 4000, provider.name),
          metadata: {
            provider: provider.name,
            model: provider.model,
          },
        },
        () => provider.generateCompletion(options),
        {
          timeoutMs: AI_CALL_TIMEOUT_MS,
          fallback: createFallbackResult(provider, feature),
          action: 'ai_generate',
        }
      );

      // Check if degraded
      if ('isDegraded' in result) {
        const degraded = result as DegradedResponse<AICompletionResult>;
        console.warn('[AIGuard] Returning degraded response:', {
          provider: provider.name,
          feature,
          reason: degraded.reason,
        });
        return degraded.fallbackData;
      }

      return result;
    },
  };
}

/**
 * Guard a raw AI completion call
 */
export async function guardedAiCompletion(
  provider: UnifiedAIProvider,
  options: AICompletionOptions,
  context?: {
    feature?: GuardedFeature;
    entityId?: string;
    locale?: string;
  }
): Promise<AICompletionResult | DegradedResponse<AICompletionResult>> {
  const feature = context?.feature || detectFeature(options);

  return guardAiCall(
    feature,
    {
      entityId: context?.entityId,
      locale: context?.locale,
      estimatedTokens: options.maxTokens || 4000,
      estimatedCost: estimateCost(options.maxTokens || 4000, provider.name),
      metadata: {
        provider: provider.name,
        model: provider.model,
      },
    },
    () => provider.generateCompletion(options),
    {
      timeoutMs: AI_CALL_TIMEOUT_MS,
      fallback: createFallbackResult(provider, feature),
      action: 'ai_generate',
    }
  );
}

/**
 * Quick check if AI feature is available
 */
export async function isAiFeatureAvailable(feature: GuardedFeature): Promise<boolean> {
  if (!DEFAULT_ENFORCEMENT_CONFIG.enabled) return true;

  const { isFeatureAllowed } = await import('../enforcement');
  const result = await isFeatureAllowed(feature, 'ai_generate');
  return result.allowed;
}

/**
 * Get enforcement status for AI features
 */
export async function getAiEnforcementStatus(): Promise<{
  enabled: boolean;
  degradedMode: boolean;
  features: Record<GuardedFeature, { allowed: boolean; reason?: string }>;
}> {
  const { isFeatureAllowed } = await import('../enforcement');

  const features: GuardedFeature[] = ['chat', 'octopus', 'search', 'aeo', 'translation', 'images'];
  const featureStatus: Record<string, { allowed: boolean; reason?: string }> = {};

  for (const feature of features) {
    const result = await isFeatureAllowed(feature, 'ai_generate');
    featureStatus[feature] = result;
  }

  return {
    enabled: DEFAULT_ENFORCEMENT_CONFIG.enabled,
    degradedMode: DEFAULT_ENFORCEMENT_CONFIG.degradedModeEnabled,
    features: featureStatus as Record<GuardedFeature, { allowed: boolean; reason?: string }>,
  };
}

// Helper: Detect feature from options
function detectFeature(options: AICompletionOptions): GuardedFeature {
  const systemMessage = options.messages.find(m => m.role === 'system')?.content || '';
  const userMessage = options.messages.find(m => m.role === 'user')?.content || '';
  const combined = (systemMessage + ' ' + userMessage).toLowerCase();

  if (combined.includes('chat') || combined.includes('conversation')) return 'chat';
  if (combined.includes('octopus') || combined.includes('document')) return 'octopus';
  if (combined.includes('search') || combined.includes('query')) return 'search';
  if (combined.includes('aeo') || combined.includes('answer engine')) return 'aeo';
  if (combined.includes('translate') || combined.includes('translation')) return 'translation';
  if (combined.includes('seo') || combined.includes('meta description')) return 'seo_optimization';
  if (combined.includes('link') || combined.includes('internal')) return 'internal_linking';

  return 'content_enrichment'; // Default
}

// Helper: Estimate cost in cents
function estimateCost(tokens: number, provider: string): number {
  // Rough estimates per 1k tokens (input + output combined)
  const ratesPerThousand: Record<string, number> = {
    openai: 1, // ~$0.01/1k
    anthropic: 3, // ~$0.03/1k
    openrouter: 2, // varies
    deepseek: 0.5, // cheaper
    'replit-ai': 0, // free tier
  };

  const rate = ratesPerThousand[provider] || 1;
  return Math.ceil((tokens / 1000) * rate);
}

// Helper: Create fallback result for degraded mode
function createFallbackResult(provider: UnifiedAIProvider, feature: GuardedFeature): AICompletionResult {
  const fallbackMessages: Record<GuardedFeature, string> = {
    chat: 'I apologize, but I am temporarily unable to assist. Please try again later.',
    octopus: '{"error": "Content generation is temporarily limited."}',
    search: '{"results": [], "degraded": true}',
    aeo: '{"answer": "Information temporarily unavailable."}',
    translation: '[Translation temporarily unavailable]',
    images: '{"error": "Image generation is temporarily limited."}',
    content_enrichment: '{"enriched": false, "reason": "Service limited"}',
    seo_optimization: '{"optimized": false, "reason": "Service limited"}',
    internal_linking: '{"links": [], "reason": "Service limited"}',
    background_job: '{"status": "blocked"}',
    publishing: '{"allowed": false}',
  };

  return {
    content: fallbackMessages[feature] || 'Service temporarily limited.',
    provider: provider.name + '-degraded',
    model: provider.model,
  };
}
