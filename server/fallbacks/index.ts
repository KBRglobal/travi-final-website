export {
  getFallbackResponse,
  createSearchNoResultsFallback,
  createChatUnavailableFallback,
  createContentNotFoundFallback,
  createAiOverloadedFallback,
  createGenericErrorFallback,
  createNetworkErrorFallback,
  createRateLimitedFallback,
  createSessionExpiredFallback,
  FallbackType,
  FallbackMessage,
  FALLBACK_MESSAGES,
  type FallbackContext,
  type FallbackResponse
} from './fallback-handler';

export {
  getFallbackMessage,
  isValidFallbackType
} from '../../shared/fallback-messages';
