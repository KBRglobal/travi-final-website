/**
 * Go-Live Checklist (System Readiness Gate) - Type Definitions
 * Feature Flag: ENABLE_GO_LIVE_CHECKLIST=true
 */

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
export type OverallStatus = 'PASS' | 'WARN' | 'BLOCK';

export interface CheckResult {
  id: string;
  name: string;
  description: string;
  status: CheckStatus;
  message: string;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface GoLiveStatus {
  status: OverallStatus;
  checks: CheckResult[];
  summary: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    skipped: number;
  };
  timestamp: Date;
  durationMs: number;
}

export interface CheckConfig {
  id: string;
  name: string;
  description: string;
  critical: boolean; // If critical check fails, overall status is BLOCK
  enabled: boolean;
}

export interface GoLiveFeatureStatus {
  enabled: boolean;
  config: {
    checksEnabled: string[];
    criticalChecks: string[];
  };
}
