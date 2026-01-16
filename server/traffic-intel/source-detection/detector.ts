/**
 * Traffic Source Detection - Core Detector
 *
 * Deterministic classification of traffic sources from request data.
 * Feature-flagged: ENABLE_TRAFFIC_INTELLIGENCE
 */

import type { Request } from 'express';
import type {
  TrafficSource,
  TrafficChannel,
  SearchEngine,
  AIPlatform,
  SocialPlatform,
} from '../types';
import {
  SEARCH_ENGINE_PATTERNS,
  AI_REFERRER_PATTERNS,
  AI_USER_AGENT_PATTERNS,
  SOCIAL_PATTERNS,
  EMAIL_PATTERNS,
  PAID_UTM_MEDIUMS,
  BOT_PATTERNS,
  PREVIEW_BOT_PATTERNS,
} from './patterns';

interface DetectionInput {
  referrer?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

/**
 * Extract detection input from Express request
 */
export function extractDetectionInput(req: Request): DetectionInput {
  const referrer = req.get('referer') || req.get('referrer') || undefined;
  const userAgent = req.get('user-agent') || undefined;

  // UTM parameters
  const utmSource = (req.query.utm_source as string) || undefined;
  const utmMedium = (req.query.utm_medium as string) || undefined;
  const utmCampaign = (req.query.utm_campaign as string) || undefined;
  const utmContent = (req.query.utm_content as string) || undefined;
  const utmTerm = (req.query.utm_term as string) || undefined;

  return {
    referrer,
    userAgent,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
  };
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

/**
 * Check if user agent is a bot
 */
function detectBot(userAgent?: string): { isBot: boolean; isPreviewBot: boolean } {
  if (!userAgent) {
    return { isBot: false, isPreviewBot: false };
  }

  const isPreviewBot = PREVIEW_BOT_PATTERNS.some((p) => p.test(userAgent));
  const isBot = BOT_PATTERNS.some((p) => p.test(userAgent));

  return { isBot, isPreviewBot };
}

/**
 * Detect AI platform from referrer
 */
function detectAIPlatformFromReferrer(referrer: string): AIPlatform | undefined {
  for (const [platform, patterns] of Object.entries(AI_REFERRER_PATTERNS)) {
    if (patterns.some((p) => p.test(referrer))) {
      return platform as AIPlatform;
    }
  }
  return undefined;
}

/**
 * Detect AI platform from user agent
 */
function detectAIPlatformFromUserAgent(userAgent: string): AIPlatform | undefined {
  for (const [platform, patterns] of Object.entries(AI_USER_AGENT_PATTERNS)) {
    if (patterns.some((p) => p.test(userAgent))) {
      return platform as AIPlatform;
    }
  }
  return undefined;
}

/**
 * Detect search engine from referrer
 */
function detectSearchEngine(referrer: string): SearchEngine | undefined {
  for (const [engine, patterns] of Object.entries(SEARCH_ENGINE_PATTERNS)) {
    if (patterns.some((p) => p.test(referrer))) {
      return engine as SearchEngine;
    }
  }
  return undefined;
}

/**
 * Detect social platform from referrer
 */
function detectSocialPlatform(referrer: string): SocialPlatform | undefined {
  for (const [platform, patterns] of Object.entries(SOCIAL_PATTERNS)) {
    if (patterns.some((p) => p.test(referrer))) {
      return platform as SocialPlatform;
    }
  }
  return undefined;
}

/**
 * Check if referrer is from email
 */
function isEmailReferrer(referrer: string): boolean {
  return EMAIL_PATTERNS.some((p) => p.test(referrer));
}

/**
 * Check if traffic is paid (based on UTM)
 */
function isPaidTraffic(utmMedium?: string): boolean {
  if (!utmMedium) return false;
  return PAID_UTM_MEDIUMS.includes(utmMedium.toLowerCase());
}

/**
 * Main detection function - deterministic classification
 */
export function detectTrafficSource(input: DetectionInput): TrafficSource {
  const { referrer, userAgent, utmSource, utmMedium, utmCampaign } = input;

  // Detect bot status
  const { isBot } = detectBot(userAgent);

  // Initialize result
  const result: TrafficSource = {
    channel: 'unknown',
    source: 'unknown',
    medium: 'unknown',
    isBot,
    confidence: 0,
    raw: {
      referrer,
      userAgent,
      utmSource,
      utmMedium,
      utmCampaign,
    },
  };

  // Step 1: Check for paid traffic (UTM-based)
  if (isPaidTraffic(utmMedium)) {
    result.channel = 'paid';
    result.source = utmSource || 'unknown';
    result.medium = utmMedium || 'paid';
    result.campaign = utmCampaign;
    result.confidence = 0.95;
    return result;
  }

  // Step 2: Check for AI platform from user agent
  if (userAgent) {
    const aiPlatformUA = detectAIPlatformFromUserAgent(userAgent);
    if (aiPlatformUA) {
      result.channel = 'ai_search';
      result.aiPlatform = aiPlatformUA;
      result.source = aiPlatformUA;
      result.medium = 'ai';
      result.confidence = 0.9;
      return result;
    }
  }

  // Step 3: Check referrer-based detection
  if (referrer) {
    const referrerDomain = extractDomain(referrer);
    result.referrerDomain = referrerDomain;

    // Check AI platform from referrer
    const aiPlatformRef = detectAIPlatformFromReferrer(referrer);
    if (aiPlatformRef) {
      result.channel = 'ai_search';
      result.aiPlatform = aiPlatformRef;
      result.source = aiPlatformRef;
      result.medium = 'ai';
      result.confidence = 0.85;
      return result;
    }

    // Check search engine
    const searchEngine = detectSearchEngine(referrer);
    if (searchEngine) {
      result.channel = 'organic_search';
      result.searchEngine = searchEngine;
      result.source = searchEngine;
      result.medium = 'organic';
      result.confidence = 0.9;
      return result;
    }

    // Check social platform
    const socialPlatform = detectSocialPlatform(referrer);
    if (socialPlatform) {
      result.channel = 'social';
      result.socialPlatform = socialPlatform;
      result.source = socialPlatform;
      result.medium = 'social';
      result.confidence = 0.85;
      return result;
    }

    // Check email
    if (isEmailReferrer(referrer)) {
      result.channel = 'email';
      result.source = referrerDomain || 'email';
      result.medium = 'email';
      result.confidence = 0.8;
      return result;
    }

    // Generic referral
    result.channel = 'referral';
    result.source = referrerDomain || 'unknown';
    result.medium = 'referral';
    result.confidence = 0.7;
    return result;
  }

  // Step 4: UTM source without referrer
  if (utmSource) {
    // Check if UTM indicates social
    const lowerSource = utmSource.toLowerCase();
    if (['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'].includes(lowerSource)) {
      result.channel = 'social';
      result.source = utmSource;
      result.medium = utmMedium || 'social';
      result.confidence = 0.75;
      return result;
    }

    // Check if UTM indicates email
    if (['email', 'newsletter', 'mailchimp', 'sendgrid'].includes(lowerSource)) {
      result.channel = 'email';
      result.source = utmSource;
      result.medium = utmMedium || 'email';
      result.confidence = 0.75;
      return result;
    }

    // Generic UTM referral
    result.channel = 'referral';
    result.source = utmSource;
    result.medium = utmMedium || 'unknown';
    result.confidence = 0.6;
    return result;
  }

  // Step 5: Direct traffic (no referrer, no UTM)
  result.channel = 'direct';
  result.source = 'direct';
  result.medium = 'none';
  result.confidence = 0.5; // Lower confidence since could be many things

  return result;
}

/**
 * Convenience function for Express requests
 */
export function detectFromRequest(req: Request): TrafficSource {
  const input = extractDetectionInput(req);
  return detectTrafficSource(input);
}

/**
 * Check if traffic is from AI platform
 */
export function isAITraffic(source: TrafficSource): boolean {
  return source.channel === 'ai_search' && source.aiPlatform !== undefined;
}

/**
 * Get normalized channel name for display
 */
export function getChannelDisplayName(channel: TrafficChannel): string {
  const names: Record<TrafficChannel, string> = {
    organic_search: 'Organic Search',
    ai_search: 'AI Search',
    referral: 'Referral',
    social: 'Social Media',
    direct: 'Direct',
    email: 'Email',
    paid: 'Paid',
    unknown: 'Unknown',
  };
  return names[channel];
}
