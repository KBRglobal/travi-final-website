/**
 * Production Cutover Engine - Type Definitions
 * Feature Flag: ENABLE_PRODUCTION_CUTOVER=false
 */

export type CutoverDecision = 'CAN_GO_LIVE' | 'WARN' | 'BLOCK';
export type CutoverMode = 'live' | 'dry-run';

export interface CutoverBlocker {
  id: string;
  source: string;
  severity: 'hard' | 'soft';
  title: string;
  description: string;
  category: string;
  detectedAt: Date;
}

export interface CutoverSignature {
  hash: string;
  timestamp: Date;
  version: string;
  inputsHash: string;
}

export interface CutoverResult {
  decision: CutoverDecision;
  signature: CutoverSignature;
  mode: CutoverMode;
  score: number;
  hardBlockers: CutoverBlocker[];
  softBlockers: CutoverBlocker[];
  reasons: string[];
  recommendations: string[];
  snapshot: SystemSnapshot;
  evaluatedAt: Date;
  expiresAt?: Date;
  durationMs: number;
}

export interface TimeBoxedApproval {
  id: string;
  decision: CutoverDecision;
  approvedBy: string;
  approvedAt: Date;
  expiresAt: Date;
  reason: string;
}

export interface EmergencyOverride {
  id: string;
  overriddenBy: string;
  overriddenAt: Date;
  previousDecision: CutoverDecision;
  newDecision: CutoverDecision;
  reason: string;
  expiresAt: Date;
  logged: boolean;
}

export interface SystemSnapshot {
  id: string;
  timestamp: Date;
  readiness: { score: number; status: string; blockers: number };
  governor: { restrictions: number; activeRules: string[] };
  incidents: { open: number; critical: number };
  costs: { utilized: number; budget: number };
  backpressure: { queueDepth: number; memoryPercent: number };
}

export interface CutoverStatus {
  enabled: boolean;
  currentDecision?: CutoverDecision;
  lastEvaluatedAt?: Date;
  activeApproval?: TimeBoxedApproval;
  activeOverride?: EmergencyOverride;
}
