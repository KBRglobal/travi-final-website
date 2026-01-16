/**
 * Traffic Intelligence - Type Definitions
 *
 * Feature-flagged: ENABLE_TRAFFIC_INTELLIGENCE
 */

export type TrafficChannel =
  | 'organic_search'
  | 'ai_search'
  | 'referral'
  | 'social'
  | 'direct'
  | 'email'
  | 'paid'
  | 'unknown';

export type SearchEngine =
  | 'google'
  | 'bing'
  | 'yahoo'
  | 'duckduckgo'
  | 'baidu'
  | 'yandex'
  | 'other';

export type AIPlatform =
  | 'chatgpt'
  | 'perplexity'
  | 'gemini'
  | 'claude'
  | 'bing_chat'
  | 'google_aio'
  | 'other_ai';

export type SocialPlatform =
  | 'facebook'
  | 'twitter'
  | 'instagram'
  | 'linkedin'
  | 'pinterest'
  | 'tiktok'
  | 'youtube'
  | 'reddit'
  | 'whatsapp'
  | 'telegram'
  | 'other_social';

export interface TrafficSource {
  channel: TrafficChannel;
  source: string;
  medium: string;
  campaign?: string;
  searchEngine?: SearchEngine;
  aiPlatform?: AIPlatform;
  socialPlatform?: SocialPlatform;
  referrerDomain?: string;
  isBot: boolean;
  confidence: number; // 0-1
  raw: {
    referrer?: string;
    userAgent?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
}

export interface TrafficAttribution {
  id: string;
  contentId: string;
  entityId?: string;
  entityType?: string;
  channel: TrafficChannel;
  source: string;
  aiPlatform?: AIPlatform;
  impressions: number;
  visits: number;
  uniqueVisitors: number;
  bounceCount: number;
  totalTimeOnPage: number;
  date: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

export interface AIVisibilityMetrics {
  contentId: string;
  totalAIVisits: number;
  totalClassicVisits: number;
  aiVisibilityScore: number; // 0-100
  aiToClassicRatio: number;
  platformBreakdown: Record<AIPlatform, number>;
  trendDirection: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

export interface TrafficSummary {
  period: {
    start: string;
    end: string;
  };
  totalVisits: number;
  uniqueVisitors: number;
  channelBreakdown: Record<TrafficChannel, number>;
  topSources: Array<{ source: string; visits: number }>;
  aiSearchPercentage: number;
  topContent: Array<{ contentId: string; title?: string; visits: number }>;
}

export interface ContentTrafficStats {
  contentId: string;
  title?: string;
  totalVisits: number;
  uniqueVisitors: number;
  channelBreakdown: Record<TrafficChannel, number>;
  sourceBreakdown: Array<{ source: string; visits: number }>;
  aiVisibility: AIVisibilityMetrics;
  dailyTrend: Array<{ date: string; visits: number }>;
}
