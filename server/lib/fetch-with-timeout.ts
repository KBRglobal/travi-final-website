/**
 * Fetch wrapper with timeout support
 * Phase 16: Network hardening - no external call may block indefinitely
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

export class FetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`Fetch timeout after ${timeoutMs}ms: ${url}`);
    this.name = 'FetchTimeoutError';
  }
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchTimeoutError(url, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export default fetchWithTimeout;
