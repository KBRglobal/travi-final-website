/**
 * TRAVI Content Generation - Retry Handler
 * 
 * Implements exponential backoff, smart retry decisions,
 * and error classification for API calls.
 */

import { delay } from './budget-manager';

// Maximum retry attempts
const MAX_RETRIES = 3;

// Base delay for exponential backoff (in ms)
const BASE_DELAY = 1000;

// Error codes that should not be retried
const SKIP_RETRY_CODES = [
  400, // Bad Request - invalid parameters
  401, // Unauthorized - wrong API key
  403, // Forbidden - no access
  404, // Not Found - resource doesn't exist
  422, // Unprocessable Entity - validation failed
];

// Error codes that indicate rate limiting
const RATE_LIMIT_CODES = [
  429, // Too Many Requests
];

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  wasRateLimited: boolean;
  finalStatus?: number;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error, nextDelay: number) => void;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

// Extract status code from error
function getStatusCode(error: any): number | undefined {
  // Direct status property
  if (error?.status) return error.status;
  if (error?.statusCode) return error.statusCode;
  
  // Response object
  if (error?.response?.status) return error.response.status;
  if (error?.response?.statusCode) return error.response.statusCode;
  
  // Check message for common patterns
  const message = error?.message || '';
  const match = message.match(/(\d{3})/);
  if (match) {
    const code = parseInt(match[1], 10);
    if (code >= 400 && code < 600) return code;
  }
  
  return undefined;
}

// Determine if error should be retried
function shouldRetryError(error: any, attempt: number, maxRetries: number = MAX_RETRIES): boolean {
  const statusCode = getStatusCode(error);
  
  // Don't retry if we've exhausted attempts (use configured maxRetries, not constant)
  if (attempt >= maxRetries) return false;
  
  // Don't retry known skip codes
  if (statusCode && SKIP_RETRY_CODES.includes(statusCode)) return false;
  
  // Always retry rate limits (with backoff)
  if (statusCode && RATE_LIMIT_CODES.includes(statusCode)) return true;
  
  // Retry server errors (5xx)
  if (statusCode && statusCode >= 500 && statusCode < 600) return true;
  
  // Retry network errors
  if (isNetworkError(error)) return true;
  
  // Retry timeouts
  if (isTimeoutError(error)) return true;
  
  // Default: retry for unknown errors
  return true;
}

// Check if error is a network error
function isNetworkError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('socket') ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ENOTFOUND'
  );
}

// Check if error is a timeout
function isTimeoutError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('timeout') ||
    message.includes('timed out') ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'ESOCKETTIMEDOUT'
  );
}

// Check if error is a rate limit
export function isRateLimitError(error: any): boolean {
  const statusCode = getStatusCode(error);
  if (statusCode && RATE_LIMIT_CODES.includes(statusCode)) return true;
  
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('quota exceeded')
  );
}

// Calculate delay with exponential backoff
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number = 30000): number {
  // Exponential backoff: baseDelay * 2^attempt + random jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

// Main retry wrapper
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const baseDelay = options.baseDelay ?? BASE_DELAY;
  const maxDelay = options.maxDelay ?? 30000;
  
  let lastError: Error | undefined;
  let wasRateLimited = false;
  let finalStatus: number | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt + 1,
        wasRateLimited,
        finalStatus: 200,
      };
    } catch (error: any) {
      lastError = error;
      finalStatus = getStatusCode(error);
      
      if (isRateLimitError(error)) {
        wasRateLimited = true;
      }
      
      // Check if we should retry (pass configured maxRetries)
      const shouldRetry = options.shouldRetry 
        ? options.shouldRetry(error, attempt)
        : shouldRetryError(error, attempt, maxRetries);
      
      if (!shouldRetry || attempt >= maxRetries) {
        break;
      }
      
      // Calculate delay
      const delayMs = calculateDelay(attempt, baseDelay, maxDelay);
      
      // Callback before retry
      if (options.onRetry) {
        options.onRetry(attempt + 1, error, delayMs);
      }
      
      // Wait before retrying
      await delay(delayMs);
    }
  }
  
  return {
    success: false,
    error: lastError,
    attempts: maxRetries + 1,
    wasRateLimited,
    finalStatus,
  };
}

// Batch operation with retry support
export async function withBatchRetry<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: RetryOptions & {
    batchSize?: number;
    delayBetweenBatches?: number;
    onItemComplete?: (item: T, result: RetryResult<R>) => void;
  } = {}
): Promise<{
  successful: { item: T; result: R }[];
  failed: { item: T; error: Error }[];
  totalAttempts: number;
}> {
  const batchSize = options.batchSize ?? 5;
  const delayBetweenBatches = options.delayBetweenBatches ?? 1000;
  
  const successful: { item: T; result: R }[] = [];
  const failed: { item: T; error: Error }[] = [];
  let totalAttempts = 0;
  
  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch in parallel
    const results = await Promise.all(
      batch.map(async (item) => {
        const result = await withRetry(() => processFn(item), options);
        totalAttempts += result.attempts;
        
        if (options.onItemComplete) {
          options.onItemComplete(item, result);
        }
        
        return { item, result };
      })
    );
    
    // Categorize results
    for (const { item, result } of results) {
      if (result.success && result.data !== undefined) {
        successful.push({ item, result: result.data });
      } else {
        failed.push({ item, error: result.error || new Error('Unknown error') });
      }
    }
    
    // Delay between batches (except for last batch)
    if (i + batchSize < items.length) {
      await delay(delayBetweenBatches);
    }
  }
  
  return { successful, failed, totalAttempts };
}

// Error classifier for logging
export function classifyError(error: any): {
  type: 'rate_limit' | 'auth' | 'not_found' | 'validation' | 'server' | 'network' | 'timeout' | 'unknown';
  recoverable: boolean;
  statusCode?: number;
  message: string;
} {
  const statusCode = getStatusCode(error);
  const message = error?.message || 'Unknown error';
  
  if (isRateLimitError(error)) {
    return { type: 'rate_limit', recoverable: true, statusCode, message };
  }
  
  if (statusCode === 401 || statusCode === 403) {
    return { type: 'auth', recoverable: false, statusCode, message };
  }
  
  if (statusCode === 404) {
    return { type: 'not_found', recoverable: false, statusCode, message };
  }
  
  if (statusCode === 400 || statusCode === 422) {
    return { type: 'validation', recoverable: false, statusCode, message };
  }
  
  if (statusCode && statusCode >= 500) {
    return { type: 'server', recoverable: true, statusCode, message };
  }
  
  if (isNetworkError(error)) {
    return { type: 'network', recoverable: true, statusCode, message };
  }
  
  if (isTimeoutError(error)) {
    return { type: 'timeout', recoverable: true, statusCode, message };
  }
  
  return { type: 'unknown', recoverable: true, statusCode, message };
}
