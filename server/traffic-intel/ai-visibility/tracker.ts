/**
 * AI Visibility Tracking
 *
 * Tracks and scores AI platform visibility for content.
 * Feature-flagged: ENABLE_AI_VISIBILITY_TRACKING
 */

import type { AIPlatform, AIVisibilityMetrics, TrafficAttribution } from '../types';

// Score weights for different AI platforms
const PLATFORM_WEIGHTS: Record<AIPlatform, number> = {
  chatgpt: 1.0,
  perplexity: 0.9,
  gemini: 0.85,
  claude: 0.8,
  bing_chat: 0.75,
  google_aio: 0.7,
  other_ai: 0.5,
};

// Time decay factor (more recent = higher weight)
const TIME_DECAY_FACTOR = 0.95;
const DAYS_FOR_TREND = 7;

interface AIVisitRecord {
  platform: AIPlatform;
  count: number;
  lastSeen: Date;
}

interface ContentAIData {
  contentId: string;
  aiVisits: Map<AIPlatform, AIVisitRecord>;
  classicVisits: number;
  dailyData: Map<string, { ai: number; classic: number }>;
  lastUpdated: Date;
}

/**
 * AI Visibility Tracker
 */
export class AIVisibilityTracker {
  private data: Map<string, ContentAIData>;
  private readonly maxEntries: number;

  constructor(maxEntries: number = 5000) {
    this.data = new Map();
    this.maxEntries = maxEntries;
  }

  /**
   * Record an AI visit
   */
  recordAIVisit(contentId: string, platform: AIPlatform, date: Date = new Date()): void {
    let contentData = this.data.get(contentId);

    if (!contentData) {
      // Evict if at capacity
      if (this.data.size >= this.maxEntries) {
        const oldestKey = this.data.keys().next().value;
        if (oldestKey) {
          this.data.delete(oldestKey);
        }
      }

      contentData = {
        contentId,
        aiVisits: new Map(),
        classicVisits: 0,
        dailyData: new Map(),
        lastUpdated: new Date(),
      };
      this.data.set(contentId, contentData);
    }

    // Update AI visit record
    let visitRecord = contentData.aiVisits.get(platform);
    if (!visitRecord) {
      visitRecord = { platform, count: 0, lastSeen: date };
      contentData.aiVisits.set(platform, visitRecord);
    }
    visitRecord.count++;
    visitRecord.lastSeen = date;

    // Update daily data
    const dateStr = date.toISOString().split('T')[0];
    let dailyEntry = contentData.dailyData.get(dateStr);
    if (!dailyEntry) {
      dailyEntry = { ai: 0, classic: 0 };
      contentData.dailyData.set(dateStr, dailyEntry);
    }
    dailyEntry.ai++;

    contentData.lastUpdated = new Date();
  }

  /**
   * Record a classic (non-AI) visit
   */
  recordClassicVisit(contentId: string, date: Date = new Date()): void {
    let contentData = this.data.get(contentId);

    if (!contentData) {
      if (this.data.size >= this.maxEntries) {
        const oldestKey = this.data.keys().next().value;
        if (oldestKey) {
          this.data.delete(oldestKey);
        }
      }

      contentData = {
        contentId,
        aiVisits: new Map(),
        classicVisits: 0,
        dailyData: new Map(),
        lastUpdated: new Date(),
      };
      this.data.set(contentId, contentData);
    }

    contentData.classicVisits++;

    // Update daily data
    const dateStr = date.toISOString().split('T')[0];
    let dailyEntry = contentData.dailyData.get(dateStr);
    if (!dailyEntry) {
      dailyEntry = { ai: 0, classic: 0 };
      contentData.dailyData.set(dateStr, dailyEntry);
    }
    dailyEntry.classic++;

    contentData.lastUpdated = new Date();
  }

  /**
   * Calculate AI visibility score for content
   */
  private calculateScore(contentData: ContentAIData): number {
    if (contentData.aiVisits.size === 0) {
      return 0;
    }

    let weightedSum = 0;
    let totalVisits = 0;
    const now = Date.now();

    for (const [platform, record] of contentData.aiVisits) {
      const weight = PLATFORM_WEIGHTS[platform] || 0.5;
      const daysSinceLastSeen = (now - record.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      const timeDecay = Math.pow(TIME_DECAY_FACTOR, daysSinceLastSeen);

      weightedSum += record.count * weight * timeDecay;
      totalVisits += record.count;
    }

    // Base score from weighted visits
    const baseScore = Math.min(totalVisits * 5, 50);

    // Platform diversity bonus (more platforms = better)
    const diversityBonus = Math.min(contentData.aiVisits.size * 5, 20);

    // Ratio bonus (higher AI ratio = better)
    const totalTraffic = totalVisits + contentData.classicVisits;
    const ratioBonus = totalTraffic > 0
      ? Math.min((totalVisits / totalTraffic) * 30, 30)
      : 0;

    return Math.round(Math.min(baseScore + diversityBonus + ratioBonus, 100));
  }

  /**
   * Calculate trend direction
   */
  private calculateTrend(contentData: ContentAIData): 'up' | 'down' | 'stable' {
    const dailyEntries = Array.from(contentData.dailyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-DAYS_FOR_TREND);

    if (dailyEntries.length < 2) {
      return 'stable';
    }

    const firstHalf = dailyEntries.slice(0, Math.floor(dailyEntries.length / 2));
    const secondHalf = dailyEntries.slice(Math.floor(dailyEntries.length / 2));

    const firstAvg = firstHalf.reduce((sum, [, d]) => sum + d.ai, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, [, d]) => sum + d.ai, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / (firstAvg || 1);

    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }

  /**
   * Get visibility metrics for content
   */
  getMetrics(contentId: string): AIVisibilityMetrics | undefined {
    const contentData = this.data.get(contentId);
    if (!contentData) {
      return undefined;
    }

    let totalAIVisits = 0;
    const platformBreakdown: Record<AIPlatform, number> = {
      chatgpt: 0,
      perplexity: 0,
      gemini: 0,
      claude: 0,
      bing_chat: 0,
      google_aio: 0,
      other_ai: 0,
    };

    for (const [platform, record] of contentData.aiVisits) {
      platformBreakdown[platform] = record.count;
      totalAIVisits += record.count;
    }

    const totalClassicVisits = contentData.classicVisits;
    const totalTraffic = totalAIVisits + totalClassicVisits;

    return {
      contentId,
      totalAIVisits,
      totalClassicVisits,
      aiVisibilityScore: this.calculateScore(contentData),
      aiToClassicRatio: totalClassicVisits > 0
        ? Number((totalAIVisits / totalClassicVisits).toFixed(2))
        : totalAIVisits > 0 ? Infinity : 0,
      platformBreakdown,
      trendDirection: this.calculateTrend(contentData),
      lastUpdated: contentData.lastUpdated,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): AIVisibilityMetrics[] {
    const results: AIVisibilityMetrics[] = [];

    for (const contentId of this.data.keys()) {
      const metrics = this.getMetrics(contentId);
      if (metrics) {
        results.push(metrics);
      }
    }

    return results;
  }

  /**
   * Get top content by AI visibility
   */
  getTopByAIVisibility(limit: number = 10): AIVisibilityMetrics[] {
    return this.getAllMetrics()
      .sort((a, b) => b.aiVisibilityScore - a.aiVisibilityScore)
      .slice(0, limit);
  }

  /**
   * Get overall AI visibility stats
   */
  getOverallStats(): {
    totalAIVisits: number;
    totalClassicVisits: number;
    overallRatio: number;
    platformBreakdown: Record<AIPlatform, number>;
    contentWithAIVisits: number;
  } {
    let totalAIVisits = 0;
    let totalClassicVisits = 0;
    const platformBreakdown: Record<AIPlatform, number> = {
      chatgpt: 0,
      perplexity: 0,
      gemini: 0,
      claude: 0,
      bing_chat: 0,
      google_aio: 0,
      other_ai: 0,
    };
    let contentWithAIVisits = 0;

    for (const contentData of this.data.values()) {
      let hasAI = false;
      for (const [platform, record] of contentData.aiVisits) {
        platformBreakdown[platform] += record.count;
        totalAIVisits += record.count;
        hasAI = true;
      }
      totalClassicVisits += contentData.classicVisits;
      if (hasAI) contentWithAIVisits++;
    }

    return {
      totalAIVisits,
      totalClassicVisits,
      overallRatio: totalClassicVisits > 0
        ? Number((totalAIVisits / totalClassicVisits).toFixed(3))
        : totalAIVisits > 0 ? Infinity : 0,
      platformBreakdown,
      contentWithAIVisits,
    };
  }

  /**
   * Import from attribution data
   */
  importFromAttribution(attributions: TrafficAttribution[]): void {
    for (const attr of attributions) {
      if (attr.channel === 'ai_search' && attr.aiPlatform) {
        for (let i = 0; i < attr.visits; i++) {
          this.recordAIVisit(attr.contentId, attr.aiPlatform);
        }
      } else if (attr.channel === 'organic_search') {
        for (let i = 0; i < attr.visits; i++) {
          this.recordClassicVisit(attr.contentId);
        }
      }
    }
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Get entry count
   */
  size(): number {
    return this.data.size;
  }
}

// Singleton instance
let trackerInstance: AIVisibilityTracker | null = null;

export function getAIVisibilityTracker(): AIVisibilityTracker {
  if (!trackerInstance) {
    trackerInstance = new AIVisibilityTracker();
  }
  return trackerInstance;
}

export function resetAIVisibilityTracker(): void {
  if (trackerInstance) {
    trackerInstance.clear();
  }
  trackerInstance = null;
}
