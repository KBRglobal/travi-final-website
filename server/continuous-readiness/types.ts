/**
 * Continuous Readiness Monitor - Type Definitions
 * Feature Flag: ENABLE_CONTINUOUS_READINESS=false
 */

export type ReadinessState = 'READY' | 'DEGRADED' | 'NOT_READY' | 'UNKNOWN';

export interface ReadinessCheck {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'warn' | 'fail' | 'skip';
  score: number;
  message: string;
  checkedAt: Date;
  durationMs: number;
}

export interface ReadinessSnapshot {
  id: string;
  timestamp: Date;
  state: ReadinessState;
  overallScore: number;
  checks: ReadinessCheck[];
  degradations: DegradationEvent[];
  mttr: MTTRStats;
}

export interface DegradationEvent {
  id: string;
  source: string;
  previousState: ReadinessState;
  newState: ReadinessState;
  detectedAt: Date;
  resolvedAt?: Date;
  durationMs?: number;
  description: string;
}

export interface MTTRStats {
  current: number | null;
  average: number;
  p50: number;
  p95: number;
  sampleCount: number;
  lastCalculatedAt: Date;
}

export interface ReadinessEvent {
  id: string;
  type: 'state_change' | 'degradation_detected' | 'recovery_detected' | 'check_failed' | 'mttr_updated';
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface MonitorConfig {
  intervalMs: number;
  enabled: boolean;
  degradationThreshold: number;
  recoveryThreshold: number;
  maxHistory: number;
}

export interface MonitorStatus {
  enabled: boolean;
  running: boolean;
  lastCheckAt?: Date;
  nextCheckAt?: Date;
  currentState: ReadinessState;
  checksCount: number;
  degradationsActive: number;
}
