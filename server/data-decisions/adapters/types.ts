/**
 * Adapter Types
 * Types for execution adapters that wire decisions to real effects
 */

import type { Decision, DecisionType } from '../types';

// =============================================================================
// EXECUTION RESULT
// =============================================================================

export type ExecutionStatus =
  | 'success'
  | 'partial'
  | 'blocked'
  | 'failed'
  | 'skipped'
  | 'dry_run';

export interface ExecutionResult {
  status: ExecutionStatus;
  decision: Decision;
  adapter: string;
  executedAt: Date;
  duration: number; // ms

  // Success details
  affectedResources?: string[];
  changes?: Record<string, unknown>;

  // Failure details
  error?: string;
  errorCode?: string;
  blockedBy?: string;
  blockedReason?: string;

  // Dry run
  dryRun: boolean;
  wouldHaveExecuted?: boolean;
  simulatedChanges?: Record<string, unknown>;

  // Audit
  auditId: string;
}

export interface ExecutionBlocked {
  blocked: true;
  reason: string;
  blockedBy: string;
  decision: Decision;
  canRetry: boolean;
  retryAfter?: Date;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface AdapterConfig {
  enabled: boolean;
  dryRunByDefault: boolean;
  timeout: number; // ms
  retries: number;
  retryDelay: number; // ms
  healthCheckInterval: number; // ms
}

export interface AdapterHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  lastCheck: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  consecutiveFailures: number;
  latency?: number;
  details?: string;
}

export interface ExecutionAdapter {
  // Identity
  readonly id: string;
  readonly name: string;
  readonly supportedActions: DecisionType[];

  // Configuration
  config: AdapterConfig;

  // Health
  getHealth(): AdapterHealth;
  checkHealth(): Promise<AdapterHealth>;

  // Execution
  canExecute(decision: Decision): boolean;
  execute(decision: Decision, dryRun?: boolean): Promise<ExecutionResult | ExecutionBlocked>;

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

export interface RegisteredAdapter {
  adapter: ExecutionAdapter;
  registeredAt: Date;
  lastUsed?: Date;
  executionCount: number;
  successCount: number;
  failureCount: number;
}

// =============================================================================
// SYSTEM REGISTRATION
// =============================================================================

export interface SystemRegistration {
  id: string;
  name: string;
  category: 'binding' | 'override' | 'advisory';
  capabilities: DecisionType[];
  healthEndpoint?: string;
  actionEndpoints: Partial<Record<DecisionType, string>>;
  registeredAt: Date;
  lastHealthCheck?: Date;
  health?: AdapterHealth;
}

// =============================================================================
// ACTION PAYLOADS
// =============================================================================

export interface SEOActionPayload {
  contentId?: string;
  url?: string;
  action: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface ContentActionPayload {
  contentId: string;
  action: string;
  reason: string;
  reviewerId?: string;
  deadline?: Date;
  metadata?: Record<string, unknown>;
}

export interface OpsActionPayload {
  action: string;
  target?: string;
  severity: 'info' | 'warning' | 'critical';
  incidentId?: string;
  rollbackTarget?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationPayload {
  recipients: string[];
  channel: 'email' | 'slack' | 'webhook' | 'log';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}
