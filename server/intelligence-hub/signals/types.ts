/**
 * Enterprise Intelligence Hub - Signal Types
 *
 * Unified signal format for all intelligence sources.
 * NO direct imports from other engines — adapter pattern only.
 */

export type SignalSource =
  | 'content-confidence'
  | 'content-decay'
  | 'growth-recommendations'
  | 'search-zero'
  | 'ai-audit'
  | 'cost-guards'
  | 'backpressure'
  | 'incidents'
  | 'data-integrity'
  | 'external';

export type EntityType =
  | 'content'
  | 'destination'
  | 'entity'
  | 'media'
  | 'cluster'
  | 'user'
  | 'system';

export type SignalSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type SignalCategory =
  | 'quality'
  | 'performance'
  | 'cost'
  | 'revenue'
  | 'engagement'
  | 'health'
  | 'integrity';

/**
 * Unified Signal - All signals normalized to this format
 */
export interface UnifiedSignal {
  id: string;
  source: SignalSource;
  category: SignalCategory;
  entityType: EntityType;
  entityId: string;
  severity: SignalSeverity;
  score: number;         // 0-100 normalized
  reason: string;
  details: Record<string, unknown>;
  timestamp: Date;
  expiresAt?: Date;
  correlationId?: string;
}

/**
 * Raw Signal - Input from adapters before normalization
 */
export interface RawSignal {
  source: SignalSource;
  entityType?: EntityType;
  entityId?: string;
  rawScore?: number;
  rawSeverity?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp?: Date;
}

/**
 * Signal Batch - For bulk operations
 */
export interface SignalBatch {
  signals: UnifiedSignal[];
  source: SignalSource;
  batchId: string;
  processedAt: Date;
}

/**
 * Signal Query - For filtering signals
 */
export interface SignalQuery {
  sources?: SignalSource[];
  entityTypes?: EntityType[];
  entityIds?: string[];
  severities?: SignalSeverity[];
  categories?: SignalCategory[];
  since?: Date;
  until?: Date;
  minScore?: number;
  maxScore?: number;
  limit?: number;
  offset?: number;
}

/**
 * Signal Statistics
 */
export interface SignalStats {
  totalSignals: number;
  bySource: Record<SignalSource, number>;
  bySeverity: Record<SignalSeverity, number>;
  byCategory: Record<SignalCategory, number>;
  avgScore: number;
  lastUpdated: Date;
}

/**
 * Adapter interface - Each signal source implements this
 */
export interface SignalAdapter {
  source: SignalSource;
  isAvailable(): boolean;
  fetchSignals(since?: Date): Promise<RawSignal[]>;
  normalize(raw: RawSignal): UnifiedSignal | null;
}
