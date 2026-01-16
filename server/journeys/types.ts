/**
 * User Journey & Funnel Engine - Type Definitions
 * Feature Flag: ENABLE_USER_JOURNEYS=true
 */

// ============================================================================
// Event Types
// ============================================================================

export type JourneyEventType =
  | 'page_view'
  | 'search'
  | 'content_open'
  | 'affiliate_click'
  | 'conversion'
  | 'exit';

export interface JourneyEvent {
  id: string;
  sessionId: string;
  userId?: string;
  visitorId: string;
  eventType: JourneyEventType;
  timestamp: Date;
  pageUrl: string;
  referrer?: string;
  contentId?: string;
  searchQuery?: string;
  affiliateId?: string;
  conversionValue?: number;
  metadata?: Record<string, unknown>;
}

export interface JourneyStep {
  eventType: JourneyEventType;
  timestamp: Date;
  pageUrl: string;
  contentId?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface UserJourney {
  id: string;
  sessionId: string;
  userId?: string;
  visitorId: string;
  steps: JourneyStep[];
  startedAt: Date;
  endedAt?: Date;
  totalDurationMs: number;
  converted: boolean;
  conversionValue?: number;
  entryPage: string;
  exitPage?: string;
  deviceType?: string;
  source?: string;
}

// ============================================================================
// Funnel Types
// ============================================================================

export interface FunnelDefinition {
  name: string;
  description: string;
  steps: FunnelStepDef[];
  enabled: boolean;
}

export interface FunnelStepDef {
  name: string;
  eventType: JourneyEventType;
  condition?: FunnelCondition;
}

export interface FunnelCondition {
  field: string;
  operator: 'equals' | 'contains' | 'exists' | 'not_exists';
  value?: string;
}

export interface FunnelAnalysis {
  funnelName: string;
  totalEntered: number;
  steps: FunnelStepAnalysis[];
  overallConversionRate: number;
  avgTimeToConversion: number;
  period: { start: Date; end: Date };
}

export interface FunnelStepAnalysis {
  stepName: string;
  eventType: JourneyEventType;
  count: number;
  conversionRate: number;
  dropoffRate: number;
  avgTimeFromPrevious: number;
}

// ============================================================================
// Summary Types
// ============================================================================

export interface JourneySummary {
  totalJourneys: number;
  totalConversions: number;
  conversionRate: number;
  avgJourneyDuration: number;
  avgStepsPerJourney: number;
  topEntryPages: Array<{ page: string; count: number }>;
  topExitPages: Array<{ page: string; count: number }>;
  eventBreakdown: Record<JourneyEventType, number>;
  period: { start: Date; end: Date };
}

// ============================================================================
// Cache Types
// ============================================================================

export interface JourneyCacheEntry<T> {
  value: T;
  expiresAt: number;
}
