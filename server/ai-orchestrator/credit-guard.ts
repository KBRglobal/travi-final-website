/**
 * Credit Guard (Stub)
 */

export interface CreditGuard {
  hasCredits: () => boolean;
  getCredits: () => number;
}

export function getCreditGuard(): CreditGuard {
  return {
    hasCredits: () => true,
    getCredits: () => 1000,
  };
}
