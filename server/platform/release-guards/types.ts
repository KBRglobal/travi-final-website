/**
 * Release Safety & Deploy Guards - Types
 *
 * FEATURE 2: Prevent unsafe deploys/configurations
 */

export type GuardSeverity = 'ok' | 'warn' | 'block';

export type GuardCategory =
  | 'env_var'
  | 'feature_flag'
  | 'database'
  | 'kill_switch'
  | 'dependency';

export interface GuardCheckResult {
  name: string;
  category: GuardCategory;
  severity: GuardSeverity;
  message: string;
  details?: Record<string, unknown>;
  passedAt?: Date;
  failedAt?: Date;
}

export interface ReleaseGuardConfig {
  // Required environment variables
  requiredEnvVars: string[];

  // Incompatible feature flag combinations
  incompatibleFlags: Array<{
    flags: string[];
    reason: string;
  }>;

  // Required database tables
  requiredTables: string[];

  // Warn if kill switches are disabled in production
  warnOnDisabledKillSwitches: boolean;

  // Custom validators
  customValidators: Array<{
    name: string;
    validate: () => Promise<GuardCheckResult>;
  }>;
}

export interface SafetyReport {
  timestamp: Date;
  environment: string;
  overallSeverity: GuardSeverity;
  canProceed: boolean;
  checks: GuardCheckResult[];
  blockingIssues: string[];
  warnings: string[];
}
