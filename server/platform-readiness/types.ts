/**
 * Platform Readiness & Go-Live Command Center - Type Definitions
 * Feature Flag: ENABLE_PLATFORM_READINESS=false
 */

// ============================================================================
// Readiness Status
// ============================================================================

export type ReadinessStatus = 'READY' | 'DEGRADED' | 'BLOCKED';
export type CheckStatus = 'pass' | 'warn' | 'fail' | 'skip';
export type CheckCategory = 'content' | 'infra' | 'ai' | 'seo' | 'ops' | 'revenue';
export type SignalSource =
  | 'publishing_gates'
  | 'intelligence_coverage'
  | 'content_readiness'
  | 'search_indexing'
  | 'sitemap_health'
  | 'job_queue'
  | 'incidents'
  | 'kill_switches'
  | 'ai_providers'
  | 'cost_guards';

// ============================================================================
// Signals
// ============================================================================

export interface ReadinessSignal {
  source: SignalSource;
  name: string;
  status: CheckStatus;
  score: number; // 0-100
  message: string;
  category: CheckCategory;
  isBlocking: boolean;
  metadata?: Record<string, unknown>;
  collectedAt: Date;
}

export interface SignalCollectorResult {
  source: SignalSource;
  signals: ReadinessSignal[];
  duration: number;
  error?: string;
}

// ============================================================================
// Blockers & Warnings
// ============================================================================

export interface Blocker {
  id: string;
  source: SignalSource;
  category: CheckCategory;
  severity: 'hard' | 'soft';
  title: string;
  description: string;
  remediation?: string;
  detectedAt: Date;
}

// ============================================================================
// Checklist
// ============================================================================

export interface ChecklistItem {
  id: string;
  category: CheckCategory;
  name: string;
  description: string;
  status: CheckStatus;
  required: boolean;
  details?: string;
}

export interface Checklist {
  items: ChecklistItem[];
  summary: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    skipped: number;
  };
  byCategory: Record<CheckCategory, {
    total: number;
    passed: number;
    status: CheckStatus;
  }>;
  generatedAt: Date;
}

// ============================================================================
// Overall Status
// ============================================================================

export interface PlatformReadinessStatus {
  status: ReadinessStatus;
  score: number; // 0-100
  blockers: Blocker[];
  warnings: Blocker[];
  signals: ReadinessSignal[];
  checklist: Checklist;
  canGoLive: boolean;
  evaluatedAt: Date;
  durationMs: number;
}

export interface SimulationResult {
  wouldSucceed: boolean;
  status: ReadinessStatus;
  score: number;
  blockingReasons: string[];
  warningReasons: string[];
  recommendations: string[];
  simulatedAt: Date;
}

// ============================================================================
// Feature Status
// ============================================================================

export interface PlatformReadinessFeatureStatus {
  enabled: boolean;
  config: {
    blockingThreshold: number;
    warningThreshold: number;
    signalSources: SignalSource[];
  };
}
