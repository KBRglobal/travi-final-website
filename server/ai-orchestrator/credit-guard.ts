/**
 * Credit Guard (Stub)
 */

export interface CreditGuard {
  hasCredits: () => boolean;
  getCredits: () => number;
  getUsageSummary: () => Record<string, any>;
  isObserveOnly: () => boolean;
}

export function getCreditGuard(): CreditGuard {
  return {
    hasCredits: () => true,
    getCredits: () => 1000,
    getUsageSummary: () => ({}),
    isObserveOnly: () => false,
  };
}
