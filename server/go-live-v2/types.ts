/**
 * Go-Live Switch - Types
 */

export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

export type GoLiveStatus = 'ready' | 'not_ready' | 'blocked' | 'overridden';

/**
 * Single go-live check
 */
export interface GoLiveCheck {
  id: string;
  name: string;
  description: string;
  category: 'critical' | 'required' | 'recommended';
  status: CheckStatus;
  message: string;
  details?: string;
  actionUrl?: string;
  checkedAt: Date;
}

/**
 * Go-live status response
 */
export interface GoLiveStatusResponse {
  timestamp: Date;

  // Overall status
  status: GoLiveStatus;
  ready: boolean;

  // Checks
  checks: GoLiveCheck[];

  // Summary
  summary: {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    skipped: number;
  };

  // Blockers
  blockers: GoLiveCheck[];

  // Override info
  override?: GoLiveOverride;

  // Recommendation
  recommendation: string;
}

/**
 * Go-live override
 */
export interface GoLiveOverride {
  active: boolean;
  overriddenBy: string;
  reason: string;
  overriddenAt: Date;
  expiresAt?: Date;
}

/**
 * Override request
 */
export interface OverrideRequest {
  reason: string;
  overriddenBy: string;
  expiresInHours?: number;
}

/**
 * Go-live history entry
 */
export interface GoLiveHistoryEntry {
  id: string;
  timestamp: Date;
  status: GoLiveStatus;
  ready: boolean;
  checksSummary: {
    passed: number;
    failed: number;
  };
  override?: GoLiveOverride;
}
