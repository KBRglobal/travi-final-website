import { FallbackType, FallbackMessage, FALLBACK_MESSAGES, getFallbackMessage } from '../../shared/fallback-messages';
import { logger } from '../lib/logger';

export interface FallbackContext {
  userId?: string;
  sessionId?: string;
  requestPath?: string;
  originalError?: Error | string;
  metadata?: Record<string, unknown>;
}

export interface FallbackResponse {
  success: false;
  fallback: true;
  type: FallbackType;
  message: FallbackMessage;
  context?: {
    requestId?: string;
    timestamp: string;
  };
}

let fallbackCounter = 0;

function generateRequestId(): string {
  fallbackCounter = (fallbackCounter + 1) % 1000000;
  return `fb_${Date.now()}_${fallbackCounter.toString().padStart(6, '0')}`;
}

export function getFallbackResponse(
  type: FallbackType,
  context?: FallbackContext
): FallbackResponse {
  const requestId = generateRequestId();
  const timestamp = new Date().toISOString();
  const message = getFallbackMessage(type);

  logFallbackEvent(type, requestId, context);

  return {
    success: false,
    fallback: true,
    type,
    message,
    context: {
      requestId,
      timestamp
    }
  };
}

function logFallbackEvent(
  type: FallbackType,
  requestId: string,
  context?: FallbackContext
): void {
  const logData = {
    event: 'fallback_triggered',
    fallbackType: type,
    requestId,
    userId: context?.userId || 'anonymous',
    sessionId: context?.sessionId,
    requestPath: context?.requestPath,
    metadata: context?.metadata,
    timestamp: new Date().toISOString()
  };

  if (context?.originalError) {
    const errorMessage = context.originalError instanceof Error 
      ? context.originalError.message 
      : String(context.originalError);
    
    logger.warn({
      ...logData,
      originalError: errorMessage,
      stack: context.originalError instanceof Error ? context.originalError.stack : undefined
    }, `Fallback triggered: ${type}`);
  } else {
    logger.info(logData, `Fallback triggered: ${type}`);
  }
}

export function createSearchNoResultsFallback(
  query: string,
  context?: FallbackContext
): FallbackResponse {
  return getFallbackResponse('SEARCH_NO_RESULTS', {
    ...context,
    metadata: { ...context?.metadata, searchQuery: query }
  });
}

export function createChatUnavailableFallback(
  reason?: string,
  context?: FallbackContext
): FallbackResponse {
  return getFallbackResponse('CHAT_UNAVAILABLE', {
    ...context,
    metadata: { ...context?.metadata, reason }
  });
}

export function createContentNotFoundFallback(
  contentPath: string,
  context?: FallbackContext
): FallbackResponse {
  return getFallbackResponse('CONTENT_NOT_FOUND', {
    ...context,
    metadata: { ...context?.metadata, contentPath }
  });
}

export function createAiOverloadedFallback(
  context?: FallbackContext
): FallbackResponse {
  return getFallbackResponse('AI_OVERLOADED', context);
}

export function createGenericErrorFallback(
  error?: Error | string,
  context?: FallbackContext
): FallbackResponse {
  return getFallbackResponse('GENERIC_ERROR', {
    ...context,
    originalError: error
  });
}

export function createNetworkErrorFallback(
  context?: FallbackContext
): FallbackResponse {
  return getFallbackResponse('NETWORK_ERROR', context);
}

export function createRateLimitedFallback(
  retryAfterSeconds?: number,
  context?: FallbackContext
): FallbackResponse {
  return getFallbackResponse('RATE_LIMITED', {
    ...context,
    metadata: { ...context?.metadata, retryAfterSeconds }
  });
}

export function createSessionExpiredFallback(
  context?: FallbackContext
): FallbackResponse {
  return getFallbackResponse('SESSION_EXPIRED', context);
}

export { FallbackType, FallbackMessage, FALLBACK_MESSAGES };
