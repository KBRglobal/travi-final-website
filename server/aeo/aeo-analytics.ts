/**
 * AEO Advanced Analytics
 * ROI tracking, query mapping, content gap analysis
 */

import { db } from "../db";
import {
  contents,
  aeoAnswerCapsules,
  aeoCitations,
  aeoPerformanceMetrics,
} from "../../shared/schema";
import { eq, and, gte, lte, count } from "drizzle-orm";
import { log } from "../lib/logger";
import { TRAVELER_PERSONAS, PLATFORM_PREFERENCES } from "./aeo-config";

const aeoLogger = {
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[AEO Analytics] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO Analytics] ${msg}`, data),
};

// ============================================================================
// ROI Tracking
// ============================================================================

export interface ROIMetrics {
  period: string;
  investment: {
    aiApiCosts: number;
    laborHours: number;
    estimatedCost: number;
  };
  returns: {
    aiTrafficSessions: number;
    conversions: number;
    revenue: number;
    estimatedValue: number;
  };
  roi: number;
  roiPercentage: number;
  breakdown: {
    byPlatform: Array<{
      platform: string;
      traffic: number;
      conversions: number;
      revenue: number;
    }>;
    byContentType: Array<{
      type: string;
      traffic: number;
      conversions: number;
      revenue: number;
    }>;
  };
}

/**
 * Calculate ROI for AEO efforts
 */
export async function calculateROI(
  startDate: Date,
  endDate: Date,
  options: {
    aiApiCostPerCall?: number;
    avgHourlyLaborCost?: number;
    estimatedLaborHours?: number;
    avgSessionValue?: number;
  } = {}
): Promise<ROIMetrics> {
  const {
    aiApiCostPerCall = 0.02, // $0.02 per AI API call
    avgHourlyLaborCost = 50, // $50/hour
    estimatedLaborHours = 10, // 10 hours for setup
    avgSessionValue = 5, // $5 value per AI-referred session
  } = options;

  // Get performance metrics
  const metrics = await db
    .select()
    .from(aeoPerformanceMetrics)
    .where(
      and(gte(aeoPerformanceMetrics.date, startDate), lte(aeoPerformanceMetrics.date, endDate))
    );

  // Get capsule count (represents AI API calls)
  const capsuleCount = await db
    .select({ count: count() })
    .from(aeoAnswerCapsules)
    .where(
      and(
        gte(aeoAnswerCapsules.generatedAt, startDate),
        lte(aeoAnswerCapsules.generatedAt, endDate)
      )
    );

  // Calculate investment
  const aiApiCosts = (capsuleCount[0]?.count || 0) * aiApiCostPerCall;
  const laborCost = estimatedLaborHours * avgHourlyLaborCost;
  const totalInvestment = aiApiCosts + laborCost;

  // Calculate returns
  const totalTraffic = metrics.reduce((sum, m) => sum + (m.clickThroughs || 0), 0);
  const totalConversions = metrics.reduce((sum, m) => sum + (m.conversions || 0), 0);
  const totalRevenue = metrics.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const estimatedValue = totalTraffic * avgSessionValue;

  // Calculate ROI
  const roi = estimatedValue - totalInvestment;
  const roiPercentage = totalInvestment > 0 ? (roi / totalInvestment) * 100 : 0;

  // Breakdown by platform
  const platformMap = new Map<string, { traffic: number; conversions: number; revenue: number }>();
  for (const m of metrics) {
    const existing = platformMap.get(m.platform) || { traffic: 0, conversions: 0, revenue: 0 };
    platformMap.set(m.platform, {
      traffic: existing.traffic + (m.clickThroughs || 0),
      conversions: existing.conversions + (m.conversions || 0),
      revenue: existing.revenue + (m.revenue || 0),
    });
  }

  // Breakdown by content type (would need to join with contents table)
  const typeMap = new Map<string, { traffic: number; conversions: number; revenue: number }>();

  return {
    period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
    investment: {
      aiApiCosts,
      laborHours: estimatedLaborHours,
      estimatedCost: totalInvestment,
    },
    returns: {
      aiTrafficSessions: totalTraffic,
      conversions: totalConversions,
      revenue: totalRevenue,
      estimatedValue,
    },
    roi,
    roiPercentage: Math.round(roiPercentage * 100) / 100,
    breakdown: {
      byPlatform: Array.from(platformMap.entries()).map(([platform, data]) => ({
        platform,
        ...data,
      })),
      byContentType: Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        ...data,
      })),
    },
  };
}

// ============================================================================
// Query Mapping
// ============================================================================

export interface QueryMapping {
  query: string;
  matchedContent: Array<{
    contentId: string;
    title: string;
    type: string;
    relevanceScore: number;
  }>;
  suggestedContent: Array<{
    type: string;
    title: string;
    reason: string;
  }>;
  platform: string;
  frequency: number;
}

/**
 * Map queries to existing content and suggest new content
 */
export async function mapQueriesToContent(days: number = 30): Promise<QueryMapping[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all citations with queries
  const citations = await db
    .select()
    .from(aeoCitations)
    .where(gte(aeoCitations.detectedAt, startDate));

  // Group by query
  const queryMap = new Map<string, { platform: string; count: number; contentIds: Set<string> }>();
  for (const citation of citations) {
    const normalizedQuery = citation.query.toLowerCase().trim();
    const existing = queryMap.get(normalizedQuery) || {
      platform: citation.platform,
      count: 0,
      contentIds: new Set<string>(),
    };
    existing.count++;
    existing.contentIds.add(citation.contentId);
    queryMap.set(normalizedQuery, existing);
  }

  // Get all published content for matching
  const allContent = await db
    .select({
      id: contents.id,
      title: contents.title,
      type: contents.type,
      metaDescription: contents.metaDescription,
    })
    .from(contents)
    .where(eq(contents.status, "published"));

  const results: QueryMapping[] = [];

  for (const [query, data] of queryMap.entries()) {
    // Find matching content
    const matchedContent = allContent
      .map(content => ({
        contentId: content.id,
        title: content.title,
        type: content.type,
        relevanceScore: calculateRelevanceScore(query, content),
      }))
      .filter(m => m.relevanceScore > 0.3)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    // Suggest new content based on query patterns
    const suggestedContent = suggestContentForQuery(query, matchedContent);

    results.push({
      query,
      matchedContent,
      suggestedContent,
      platform: data.platform,
      frequency: data.count,
    });
  }

  return results.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Calculate relevance score between query and content
 */
function calculateRelevanceScore(
  query: string,
  content: { title: string; metaDescription: string | null }
): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const titleWords = content.title.toLowerCase().split(/\s+/);
  const descWords = (content.metaDescription || "").toLowerCase().split(/\s+/);

  let score = 0;
  let maxScore = queryWords.length * 2;

  for (const word of queryWords) {
    if (titleWords.includes(word)) score += 2;
    else if (descWords.includes(word)) score += 1;
    else if (titleWords.some(w => w.includes(word) || word.includes(w))) score += 1;
  }

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Suggest new content based on query patterns
 */
function suggestContentForQuery(
  query: string,
  existingMatches: Array<{ type: string; relevanceScore: number }>
): Array<{ type: string; title: string; reason: string }> {
  const suggestions: Array<{ type: string; title: string; reason: string }> = [];

  // Check for comparison patterns
  if (/vs|versus|compare|between/i.test(query)) {
    const match = /(.+?)\s+(?:vs|versus|compare|between)\s+(.+)/i.exec(query);
    if (match) {
      suggestions.push({
        type: "article",
        title: `${match[1].trim()} vs ${match[2].trim()}: Complete Comparison Guide`,
        reason: "Query indicates comparison intent - create detailed comparison content",
      });
    }
  }

  // Check for "best" patterns
  if (/best\s+/i.test(query)) {
    const match = /best\s+(.+?)(?:\s+in\s+|\s+for\s+)?(.+)?/i.exec(query);
    if (match) {
      const locationSuffix = match[2] ? " in " + match[2].trim() : "";
      suggestions.push({
        type: "article",
        title: `Top 10 Best ${match[1].trim()}${locationSuffix}`,
        reason: 'Query seeks "best" options - create ranked list content',
      });
    }
  }

  // Check for "how to" patterns
  if (/how\s+to/i.test(query)) {
    suggestions.push({
      type: "article",
      title: query.replace(/^how\s+to\s+/i, "Complete Guide: How to "),
      reason: "Query seeks instructions - create step-by-step guide",
    });
  }

  // Check for cost/price patterns
  if (/cost|price|how\s+much/i.test(query)) {
    suggestions.push({
      type: "article",
      title: `${query.replace(/cost|price|how\s+much/i, "").trim()} Cost Guide: Complete Pricing Breakdown`,
      reason: "Query seeks pricing information - create detailed cost guide",
    });
  }

  // If low relevance matches, suggest more targeted content
  if (existingMatches.every(m => m.relevanceScore < 0.5)) {
    suggestions.push({
      type: "article",
      title: `Everything You Need to Know About ${query}`,
      reason: "No highly relevant existing content - create comprehensive guide",
    });
  }

  return suggestions.slice(0, 3);
}

// ============================================================================
// Content Gap Analysis
// ============================================================================

export interface ContentGap {
  category: string;
  description: string;
  priority: "high" | "medium" | "low";
  suggestedContent: Array<{
    title: string;
    type: string;
    targetPersona: string;
    estimatedValue: string;
  }>;
  competitorExamples?: string[];
}

/**
 * Analyze content gaps for AEO optimization
 */
export async function analyzeContentGaps(): Promise<ContentGap[]> {
  const gaps: ContentGap[] = [];

  // Get content stats
  const contentStats = await db
    .select({
      type: contents.type,
      count: count(),
    })
    .from(contents)
    .where(eq(contents.status, "published"))
    .groupBy(contents.type);

  const typeCount = new Map(contentStats.map(s => [s.type, s.count]));

  // Get capsule coverage
  const capsuleStats = await db
    .select({
      count: count(),
    })
    .from(aeoAnswerCapsules);

  const totalContent = contentStats.reduce((sum, s) => sum + s.count, 0);
  const capsuleCoverage = totalContent > 0 ? (capsuleStats[0]?.count || 0) / totalContent : 0;

  // Gap 1: Low capsule coverage
  if (capsuleCoverage < 0.8) {
    gaps.push({
      category: "Capsule Coverage",
      description: `Only ${Math.round(capsuleCoverage * 100)}% of content has answer capsules`,
      priority: "high",
      suggestedContent: [],
    });
  }

  // Gap 2: Missing comparison content (articles with comparison focus)
  const articleCount = typeCount.get("article") || 0;
  if (articleCount < 20) {
    gaps.push({
      category: "Comparison Content",
      description: "Limited comparison content for AI platform citations",
      priority: "high",
      suggestedContent: [
        {
          title: "Downtown Dubai vs Dubai Marina: Where to Stay",
          type: "article",
          targetPersona: "familyTraveler",
          estimatedValue: "High - comparison queries have 4.4x higher CTR",
        },
        {
          title: "JBR vs Palm Jumeirah Beach Comparison",
          type: "article",
          targetPersona: "luxurySeeker",
          estimatedValue: "High",
        },
      ],
      competitorExamples: ["timeout.com", "tripadvisor.com"],
    });
  }

  // Gap 3: Missing FAQ hubs
  gaps.push({
    category: "FAQ Hub Pages",
    description: "Need dedicated FAQ hub pages for AI-optimized answers",
    priority: "high",
    suggestedContent: [
      {
        title: "Dubai Travel FAQ: 100 Questions Answered",
        type: "article",
        targetPersona: "budgetExplorer",
        estimatedValue: "Very High - FAQ pages dominate AI citations",
      },
    ],
  });

  // Gap 4: Cost guide content
  const hasCostGuides = Array.from(typeCount.entries()).some(
    ([type]) => type.includes("cost") || type.includes("price")
  );

  if (!hasCostGuides) {
    gaps.push({
      category: "Cost & Budget Guides",
      description: "Missing cost breakdown content for budget-conscious travelers",
      priority: "medium",
      suggestedContent: [
        {
          title: "How Much Does a Trip to Dubai Cost in 2024",
          type: "article",
          targetPersona: "budgetExplorer",
          estimatedValue: "High - cost queries are common AI questions",
        },
        {
          title: "Dubai on a Budget: Complete Daily Cost Breakdown",
          type: "article",
          targetPersona: "budgetExplorer",
          estimatedValue: "High",
        },
      ],
    });
  }

  // Gap 5: Persona-specific content
  for (const [personaKey, persona] of Object.entries(TRAVELER_PERSONAS)) {
    // Check if we have content targeting this persona
    // This is simplified - in production would check targetAudience field
    gaps.push({
      category: `${persona.name} Content`,
      description: `Content optimized for ${persona.name.toLowerCase()} persona`,
      priority: "medium",
      suggestedContent: persona.interests.slice(0, 2).map(interest => ({
        title: `Best ${interest} for ${persona.name}s in Dubai`,
        type: "article",
        targetPersona: personaKey,
        estimatedValue: "Medium",
      })),
    });
  }

  // Gap 6: Multi-language capsules
  gaps.push({
    category: "Arabic Content",
    description: "30% of Dubai visitors speak Arabic - ensure Arabic capsules",
    priority: "high",
    suggestedContent: [],
  });

  return gaps.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ============================================================================
// Platform Performance Analysis
// ============================================================================

export interface PlatformAnalysis {
  platform: string;
  metrics: {
    citations: number;
    clickThroughs: number;
    conversions: number;
    avgPosition: number;
    citationGrowth: number; // % change from previous period
  };
  topContent: Array<{
    contentId: string;
    title: string;
    citations: number;
  }>;
  topQueries: Array<{
    query: string;
    count: number;
  }>;
  recommendations: string[];
}

/**
 * Analyze performance by AI platform
 */
export async function analyzePlatformPerformance(days: number = 30): Promise<PlatformAnalysis[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const previousEndDate = new Date(startDate);
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousStartDate.getDate() - days);

  // Get current period metrics
  const currentMetrics = await db
    .select()
    .from(aeoPerformanceMetrics)
    .where(
      and(gte(aeoPerformanceMetrics.date, startDate), lte(aeoPerformanceMetrics.date, endDate))
    );

  // Get previous period for comparison
  const previousMetrics = await db
    .select()
    .from(aeoPerformanceMetrics)
    .where(
      and(
        gte(aeoPerformanceMetrics.date, previousStartDate),
        lte(aeoPerformanceMetrics.date, previousEndDate)
      )
    );

  // Get citations
  const citations = await db
    .select()
    .from(aeoCitations)
    .where(gte(aeoCitations.detectedAt, startDate));

  // Aggregate by platform
  const platforms = ["chatgpt", "perplexity", "google_aio", "claude", "bing_chat", "gemini"];
  const results: PlatformAnalysis[] = [];

  for (const platform of platforms) {
    const platformMetrics = currentMetrics.filter(m => m.platform === platform);
    const previousPlatformMetrics = previousMetrics.filter(m => m.platform === platform);
    const platformCitations = citations.filter(c => c.platform === platform);

    const currentCitationCount = platformCitations.length;
    const previousCitationCount = previousPlatformMetrics.reduce(
      (sum, m) => sum + (m.citations || 0),
      0
    );

    let citationGrowth: number;
    if (previousCitationCount > 0) {
      citationGrowth =
        ((currentCitationCount - previousCitationCount) / previousCitationCount) * 100;
    } else if (currentCitationCount > 0) {
      citationGrowth = 100;
    } else {
      citationGrowth = 0;
    }

    // Get top content for this platform
    const contentCounts = new Map<string, number>();
    for (const c of platformCitations) {
      contentCounts.set(c.contentId, (contentCounts.get(c.contentId) || 0) + 1);
    }

    const topContentIds = Array.from(contentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topContent = await Promise.all(
      topContentIds.map(async ([contentId, count]) => {
        const content = await db.query.contents.findFirst({
          where: eq(contents.id, contentId),
        });
        return {
          contentId,
          title: content?.title || "Unknown",
          citations: count,
        };
      })
    );

    // Get top queries
    const queryCounts = new Map<string, number>();
    for (const c of platformCitations) {
      const normalized = c.query.toLowerCase().trim();
      queryCounts.set(normalized, (queryCounts.get(normalized) || 0) + 1);
    }

    const topQueries = Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Generate recommendations based on platform preferences
    const recommendations = generatePlatformRecommendations(platform, {
      citationGrowth,
      citationCount: currentCitationCount,
    });

    results.push({
      platform,
      metrics: {
        citations: currentCitationCount,
        clickThroughs: platformMetrics.reduce((sum, m) => sum + (m.clickThroughs || 0), 0),
        conversions: platformMetrics.reduce((sum, m) => sum + (m.conversions || 0), 0),
        avgPosition: calculateAvgPosition(platformMetrics),
        citationGrowth: Math.round(citationGrowth * 10) / 10,
      },
      topContent,
      topQueries,
      recommendations,
    });
  }

  return results.sort((a, b) => b.metrics.citations - a.metrics.citations);
}

function calculateAvgPosition(metrics: any[]): number {
  const positions = metrics
    .map(m => m.avgPosition)
    .filter((p): p is number => p !== null && p !== undefined);

  if (positions.length === 0) return 0;
  return Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10;
}

function generatePlatformRecommendations(
  platform: string,
  stats: { citationGrowth: number; citationCount: number }
): string[] {
  const recommendations: string[] = [];
  const prefs = PLATFORM_PREFERENCES[platform as keyof typeof PLATFORM_PREFERENCES];

  if (!prefs) return recommendations;

  if (stats.citationCount < 10) {
    recommendations.push(
      `Focus on creating ${prefs.contentTypes.join(", ")} content to increase ${platform} citations`
    );
  }

  if (stats.citationGrowth < 0) {
    recommendations.push(
      `Citation decline detected - review and update existing content for ${platform}`
    );
  }

  if ((prefs as any).prefersSchemaMarkup) {
    recommendations.push("Ensure all content has proper schema markup");
  }

  if ((prefs as any).prefersFAQSchema) {
    recommendations.push("Add FAQ sections to high-value content");
  }

  if ((prefs as any).prefersDirectAnswers) {
    recommendations.push("Optimize answer capsules to be more direct and concise");
  }

  return recommendations.slice(0, 3);
}

// ============================================================================
// Export Analytics Dashboard Data
// ============================================================================

export interface AnalyticsDashboardData {
  roi: ROIMetrics;
  gaps: ContentGap[];
  queryMappings: QueryMapping[];
  platformAnalysis: PlatformAnalysis[];
}

/**
 * Get complete analytics dashboard data
 */
export async function getAnalyticsDashboard(
  startDate: Date,
  endDate: Date
): Promise<AnalyticsDashboardData> {
  const [roi, gaps, queryMappings, platformAnalysis] = await Promise.all([
    calculateROI(startDate, endDate),
    analyzeContentGaps(),
    mapQueriesToContent(30),
    analyzePlatformPerformance(30),
  ]);

  return {
    roi,
    gaps,
    queryMappings,
    platformAnalysis,
  };
}
