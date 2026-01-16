/**
 * Revenue Intelligence Layer - Types
 * Ties content, entities, and journeys to revenue
 */

export interface RevenueEvent {
  id: string;
  type: RevenueEventType;
  amount: number;
  currency: string;
  contentId: string | null;
  entityId: string | null;
  userId: string | null;
  sessionId: string;
  touchpoints: TouchPoint[];
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export type RevenueEventType =
  | 'conversion'
  | 'purchase'
  | 'subscription'
  | 'booking'
  | 'lead'
  | 'signup';

export interface TouchPoint {
  contentId: string;
  type: TouchPointType;
  timestamp: Date;
  position: number;
  weight: number;
}

export type TouchPointType = 'first' | 'middle' | 'last' | 'assist';

export interface ContentValueScore {
  contentId: string;
  directRevenue: number;
  assistedRevenue: number;
  totalRevenue: number;
  conversions: number;
  assists: number;
  averageOrderValue: number;
  roiScore: number;
  valuePerView: number;
  lastUpdated: Date;
}

export interface EntityValueScore {
  entityId: string;
  entityName: string;
  directRevenue: number;
  assistedRevenue: number;
  totalRevenue: number;
  contentCount: number;
  conversionRate: number;
  roiScore: number;
  lastUpdated: Date;
}

export interface AttributionModel {
  type: AttributionModelType;
  touchpointWeights: Record<TouchPointType, number>;
}

export type AttributionModelType =
  | 'first_touch'
  | 'last_touch'
  | 'linear'
  | 'time_decay'
  | 'position_based';

export interface RevenueReport {
  id: string;
  type: ReportType;
  period: ReportPeriod;
  generatedAt: Date;
  data: RevenueReportData;
}

export type ReportType =
  | 'top_earners'
  | 'zero_converters'
  | 'content_roi'
  | 'entity_performance'
  | 'conversion_paths';

export interface ReportPeriod {
  startDate: Date;
  endDate: Date;
}

export interface RevenueReportData {
  totalRevenue: number;
  totalConversions: number;
  averageOrderValue: number;
  topContent: ContentValueScore[];
  topEntities: EntityValueScore[];
  zeroConverters: string[];
  conversionPaths: ConversionPath[];
}

export interface ConversionPath {
  id: string;
  touchpoints: TouchPoint[];
  revenue: number;
  frequency: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;
  conversionRate: number;
  topPerformingContent: number;
  underperformingContent: number;
  revenueByType: Record<string, number>;
}

export interface RevenueIntelConfig {
  enabled: boolean;
  attributionModel: AttributionModelType;
  lookbackDays: number;
  minConversionsForRoi: number;
  updateIntervalHours: number;
  conversionValue: Record<RevenueEventType, number>;
}

export const DEFAULT_REVENUE_CONFIG: RevenueIntelConfig = {
  enabled: true,
  attributionModel: 'position_based',
  lookbackDays: 30,
  minConversionsForRoi: 3,
  updateIntervalHours: 1,
  conversionValue: {
    conversion: 100,
    purchase: 0, // Use actual value
    subscription: 50,
    booking: 200,
    lead: 25,
    signup: 10,
  },
};

export const ATTRIBUTION_MODELS: Record<AttributionModelType, AttributionModel> = {
  first_touch: {
    type: 'first_touch',
    touchpointWeights: { first: 1, middle: 0, last: 0, assist: 0 },
  },
  last_touch: {
    type: 'last_touch',
    touchpointWeights: { first: 0, middle: 0, last: 1, assist: 0 },
  },
  linear: {
    type: 'linear',
    touchpointWeights: { first: 0.25, middle: 0.25, last: 0.25, assist: 0.25 },
  },
  time_decay: {
    type: 'time_decay',
    touchpointWeights: { first: 0.1, middle: 0.2, last: 0.5, assist: 0.2 },
  },
  position_based: {
    type: 'position_based',
    touchpointWeights: { first: 0.4, middle: 0.1, last: 0.4, assist: 0.1 },
  },
};
