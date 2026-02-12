/**
 * AI Logging Utility
 *
 * Provides a safe accessor for the dynamically-registered global `addSystemLog`
 * function. Because the function is attached to `globalThis` at runtime, typed
 * access is not feasible; this wrapper encapsulates the dynamic lookup.
 */

/**
 * Log a structured system message via the global `addSystemLog` function
 * (if it has been registered at runtime). Silently no-ops when unavailable.
 *
 * @param level   - Severity level (e.g. "info", "warning", "error")
 * @param category - Log category (e.g. "ai", "images")
 * @param message  - Human-readable message
 * @param details  - Optional structured details
 */
export function addSystemLog(
  level: string,
  category: string,
  message: string,
  details?: Record<string, unknown>
): void {
  // globalThis is dynamically extended at runtime; typed access is not feasible here
  const g = globalThis as Record<string, unknown>;
  if (typeof g.addSystemLog === "function") {
    (g.addSystemLog as (l: string, c: string, m: string, d?: Record<string, unknown>) => void)(
      level,
      category,
      message,
      details
    );
  }
}
