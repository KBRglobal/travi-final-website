/**
 * Platform Guards - Runtime Invariant Enforcement
 *
 * These functions enforce platform invariants at runtime.
 * They provide type-safe assertions and throw meaningful errors.
 *
 * USAGE:
 * - Call assertInvariant() for generic boolean checks
 * - Call guardImageAccess() in any direct image provider code
 * - Call guardLocaleCanonical() when using a locale as translation source
 * - Use assertNever() in switch statements for exhaustiveness checking
 * - Use devWarn() for development-only warnings
 */

import {
  IMAGE_ENGINE_ONLY,
  CANONICAL_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "../../shared/invariants";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Error thrown when an invariant is violated
 */
export class InvariantError extends Error {
  constructor(
    public readonly message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(`Invariant violation: ${message}`);
    this.name = "InvariantError";
  }
}

/**
 * Assert that a condition is true, throw if false
 *
 * @param condition - Boolean condition to check
 * @param message - Error message if condition is false
 * @throws {InvariantError} if condition is false
 *
 * @example
 * assertInvariant(user !== null, 'User must be authenticated');
 * assertInvariant(results.length <= MAX_SEARCH_RESULTS, 'Too many search results');
 */
export function assertInvariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}

/**
 * Guard against direct image provider access
 *
 * All image requests MUST go through the Image Engine API.
 * Direct provider calls bypass rate limiting, caching, and optimization.
 *
 * @throws {InvariantError} if IMAGE_ENGINE_ONLY is true (always in production)
 *
 * @example
 * // In any direct Freepik/stock image code:
 * guardImageAccess(); // This will throw
 */
export function guardImageAccess(): void {
  if (IMAGE_ENGINE_ONLY) {
    throw new InvariantError(
      "Direct image provider access is forbidden. Use Image Engine API (/api/v1/images/*)",
      { invariant: "IMAGE_ENGINE_ONLY", value: IMAGE_ENGINE_ONLY }
    );
  }

  devWarn("IMAGE_ENGINE_ONLY is disabled - this should only happen in tests");
}

/**
 * Guard against using non-canonical locale as translation source
 *
 * English (en) is the canonical source for all translations.
 * Other locales can only be TARGETS, never SOURCES.
 *
 * @param locale - The locale being used as source
 * @throws {InvariantError} if locale is not the canonical locale
 *
 * @example
 * guardLocaleCanonical('en'); // OK
 * guardLocaleCanonical('fr'); // Throws - French cannot be source
 */
export function guardLocaleCanonical(locale: string): void {
  if (locale !== CANONICAL_LOCALE) {
    throw new InvariantError(
      `Locale "${locale}" cannot be used as translation source. Only "${CANONICAL_LOCALE}" is allowed.`,
      {
        invariant: "CANONICAL_LOCALE",
        provided: locale,
        required: CANONICAL_LOCALE,
      }
    );
  }
}

/**
 * Validate that a locale is supported
 *
 * @param locale - The locale to validate
 * @returns true if locale is supported
 *
 * @example
 * if (!isValidLocale(userLocale)) {
 *   throw new Error('Unsupported locale');
 * }
 */
export function isValidLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/**
 * Guard that a locale is supported
 *
 * @param locale - The locale to validate
 * @throws {InvariantError} if locale is not in SUPPORTED_LOCALES
 */
export function guardSupportedLocale(locale: string): asserts locale is SupportedLocale {
  if (!isValidLocale(locale)) {
    throw new InvariantError(`Locale "${locale}" is not supported`, {
      invariant: "SUPPORTED_LOCALES",
      provided: locale,
      supported: SUPPORTED_LOCALES,
    });
  }
}

/**
 * Development-only warning
 *
 * Logs to console only when NODE_ENV !== 'production'.
 * Safe to use in production code - it becomes a no-op.
 *
 * @param message - Warning message to log
 * @param data - Optional data to include in warning
 *
 * @example
 * devWarn('Deprecated API usage', { endpoint: '/v1/old' });
 */
export function devWarn(message: string, data?: Record<string, unknown>): void {
  if (isDev) {
  }
}

/**
 * Assert that a value is never reached (impossible state)
 *
 * Use in switch statements to ensure exhaustiveness.
 * TypeScript will error if a case is not handled.
 *
 * @param x - Value that should be never (all cases handled)
 * @throws {InvariantError} always - this code path should be unreachable
 *
 * @example
 * type Status = 'pending' | 'active' | 'complete';
 *
 * function handleStatus(status: Status): string {
 *   switch (status) {
 *     case 'pending': return 'Waiting...';
 *     case 'active': return 'In progress';
 *     case 'complete': return 'Done!';
 *     default:
 *       return assertNever(status); // TypeScript errors if case missed
 *   }
 * }
 */
export function assertNever(x: never): never {
  throw new InvariantError("Impossible state reached - unhandled case in exhaustive check", {
    value: x,
  });
}

/**
 * Assert with type narrowing
 *
 * @param value - Value to check
 * @param message - Error message if value is falsy
 * @throws {InvariantError} if value is falsy
 *
 * @example
 * const user = await getUser(id);
 * assertDefined(user, 'User not found');
 * // user is now non-nullable
 */
export function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new InvariantError(message, { value });
  }
}

/**
 * Runtime bounds check with dev warning
 *
 * Returns clamped value but warns in dev if clamping occurred.
 *
 * @param value - Value to check
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @param label - Label for dev warning
 * @returns Clamped value
 */
export function clampWithWarning(value: number, min: number, max: number, label: string): number {
  if (value < min) {
    devWarn(`${label} below minimum`, { value, min, clamped: min });
    return min;
  }
  if (value > max) {
    devWarn(`${label} above maximum`, { value, max, clamped: max });
    return max;
  }
  return value;
}

/**
 * Create a typed guard function for custom invariants
 *
 * @param name - Invariant name for error messages
 * @param check - Function that returns true if invariant holds
 * @returns Guard function that throws if check fails
 *
 * @example
 * const guardPositive = createGuard('POSITIVE_NUMBER', (n: number) => n > 0);
 * guardPositive(-5); // Throws
 */
export function createGuard<T>(name: string, check: (value: T) => boolean): (value: T) => void {
  return (value: T) => {
    if (!check(value)) {
      throw new InvariantError(`Guard ${name} failed`, { value });
    }
  };
}
