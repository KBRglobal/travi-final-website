/**
 * Operations & Reliability - Shared Types
 *
 * Common type definitions for the ops layer.
 */

export type Severity = 'healthy' | 'degraded' | 'critical';

export type Subsystem = 'search' | 'aeo' | 'octopus' | 'monetization' | 'chat';

export type Feature = 'search' | 'aeo' | 'chat' | 'octopus';

export interface HealthStatus {
  status: Severity;
  message: string;
  lastChecked: Date;
  details?: Record<string, unknown>;
}

export interface ComponentHealth {
  name: string;
  status: Severity;
  message: string;
  latencyMs?: number;
  lastChecked: Date;
}

export interface SystemHealthSnapshot {
  overall: Severity;
  timestamp: Date;
  components: {
    jobQueue: ComponentHealth;
    aiProviders: ComponentHealth;
    database: ComponentHealth;
    memory: ComponentHealth;
  };
  activeAlerts: string[];
}

export interface UsageRecord {
  feature: Feature;
  tokensUsed: number;
  costUsd: number;
  timestamp: Date;
}

export interface UsageBudget {
  feature: Feature;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  dailyUsedUsd: number;
  monthlyUsedUsd: number;
}

export interface BackpressureState {
  isActive: boolean;
  level: 'none' | 'light' | 'heavy';
  reason?: string;
  activatedAt?: Date;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    queueDepth: number;
    aiLatencyMs: number;
  };
}

export interface JobHealthState {
  jobId: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'stuck' | 'poison';
  retries: number;
  lastAttemptAt?: Date;
  stuckSince?: Date;
  errorHistory: string[];
}

export interface KillSwitchState {
  subsystem: Subsystem;
  enabled: boolean;
  reason?: string;
  enabledAt?: Date;
  source: 'env' | 'db' | 'api';
}
