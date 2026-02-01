/**
 * Analytics Module (Stub)
 * Analytics functionality was simplified during cleanup.
 */

export interface LoopEntry {
  id: string;
  timestamp: Date;
  type: string;
  data?: Record<string, any>;
}

export interface LoopStep {
  id: string;
  entryId: string;
  step: number;
  action: string;
  timestamp: Date;
}

export function recordLoopEntry(
  type: string,
  data?: Record<string, any>
): LoopEntry {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    type,
    data,
  };
}

export function recordLoopStep(
  entryId: string,
  step: number,
  action: string
): LoopStep {
  return {
    id: crypto.randomUUID(),
    entryId,
    step,
    action,
    timestamp: new Date(),
  };
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
): void {
  // Stub - no-op
}

export function trackPageView(
  path: string,
  properties?: Record<string, any>
): void {
  // Stub - no-op
}
