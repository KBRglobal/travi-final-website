/**
 * Automated Content Refresh Engine - Type Definitions
 * Feature Flag: ENABLE_CONTENT_REFRESH_ENGINE=true
 */

// ============================================================================
// Refresh Signals
// ============================================================================

export type RefreshReasonCode =
  | 'stale_content'
  | 'traffic_drop'
  | 'zero_search_results'
  | 'revenue_decline'
  | 'outdated_information'
  | 'low_engagement'
  | 'competitor_outrank';

export interface RefreshSignal {
  code: RefreshReasonCode;
  weight: number;
  description: string;
  value: number;
  threshold: number;
  triggered: boolean;
}

// ============================================================================
// Refresh Analysis
// ============================================================================

export interface ContentRefreshAnalysis {
  contentId: string;
  contentTitle: string;
  contentType: string;
  publishedAt: Date;
  lastUpdatedAt?: Date;
  refreshScore: number;
  signals: RefreshSignal[];
  triggeredReasons: RefreshReasonCode[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendedAction: string;
  analyzedAt: Date;
}

export interface RefreshMetrics {
  ageInDays: number;
  trafficLast30Days: number;
  trafficPrev30Days: number;
  trafficChangePercent: number;
  zeroSearchAssociations: number;
  revenueLast30Days: number;
  revenuePrev30Days: number;
  revenueChangePercent: number;
  avgTimeOnPage: number;
  bounceRate: number;
}

// ============================================================================
// Refresh Job
// ============================================================================

export interface RefreshJob {
  id: string;
  contentId: string;
  contentTitle: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reasons: RefreshReasonCode[];
  suggestedActions: string[];
  estimatedImpact: string;
  createdAt: Date;
}

// ============================================================================
// Summary
// ============================================================================

export interface RefreshSummary {
  totalAnalyzed: number;
  needsRefresh: number;
  byPriority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topReasons: Array<{ reason: RefreshReasonCode; count: number }>;
  avgRefreshScore: number;
  period: { start: Date; end: Date };
}
