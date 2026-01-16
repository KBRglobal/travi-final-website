/**
 * Growth OS Signal Types
 *
 * Unified schema for all intelligence signals across the platform.
 */

/**
 * Signal source systems
 */
export type SignalSource =
  | 'traffic_intelligence'
  | 'media_intelligence'
  | 'tcoe'
  | 'content_health'
  | 'search_zero'
  | 'revenue_intelligence'
  | 'ops_incidents'
  | 'governance'
  | 'manual';

/**
 * Signal categories for grouping
 */
export type SignalCategory =
  | 'traffic'
  | 'content'
  | 'media'
  | 'revenue'
  | 'seo'
  | 'aeo'
  | 'ux'
  | 'ops'
  | 'governance'
  | 'risk';

/**
 * Signal priority levels
 */
export type SignalPriority = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Normalized signal structure
 */
export interface NormalizedSignal {
  /** Unique signal ID */
  id: string;
  /** Signal source system */
  source: SignalSource;
  /** Signal category */
  category: SignalCategory;
  /** Signal type identifier */
  type: string;
  /** Priority level */
  priority: SignalPriority;
  /** Severity score (0-100) */
  severity: number;
  /** Expected impact score (0-100) */
  impact: number;
  /** Confidence in the signal (0-100) */
  confidence: number;
  /** Human-readable title */
  title: string;
  /** Detailed description */
  description: string;
  /** Target entity type */
  entityType: 'content' | 'asset' | 'page' | 'segment' | 'system' | 'global';
  /** Target entity ID (if applicable) */
  entityId: string | null;
  /** Related content IDs */
  contentIds: string[];
  /** Affected traffic segments */
  trafficSegments: string[];
  /** Estimated revenue impact (positive or negative) */
  revenueImpact: number | null;
  /** Signal creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Signal expiration (when it becomes stale) */
  expiresAt: Date;
  /** Current freshness score (0-100, decays over time) */
  freshness: number;
  /** Whether signal has been acknowledged */
  acknowledged: boolean;
  /** Related signal IDs (for deduplication) */
  relatedSignalIds: string[];
  /** Raw metadata from source */
  metadata: Record<string, unknown>;
}

/**
 * Raw signal input from source systems
 */
export interface RawSignal {
  source: SignalSource;
  type: string;
  title: string;
  description?: string;
  severity?: number;
  impact?: number;
  confidence?: number;
  entityType?: string;
  entityId?: string;
  contentIds?: string[];
  trafficSegments?: string[];
  revenueImpact?: number;
  expiresIn?: number; // milliseconds
  metadata?: Record<string, unknown>;
}

/**
 * Signal query filters
 */
export interface SignalQuery {
  sources?: SignalSource[];
  categories?: SignalCategory[];
  priorities?: SignalPriority[];
  entityType?: string;
  entityId?: string;
  contentId?: string;
  trafficSegment?: string;
  minSeverity?: number;
  minImpact?: number;
  minFreshness?: number;
  includeAcknowledged?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'severity' | 'impact' | 'freshness' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Signal aggregation result
 */
export interface SignalAggregation {
  category: SignalCategory;
  count: number;
  avgSeverity: number;
  avgImpact: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

/**
 * Signal summary for a specific entity
 */
export interface EntitySignalSummary {
  entityType: string;
  entityId: string;
  totalSignals: number;
  topPriority: SignalPriority;
  avgSeverity: number;
  avgImpact: number;
  estimatedRevenueImpact: number;
  signals: NormalizedSignal[];
}
