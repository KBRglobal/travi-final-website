/**
 * Strategic Priority Engine - Signal Collectors
 * Gathers signals from various system modules
 */

import {
  PrioritySignal,
  SignalSource,
  ContentPriorityContext,
  DEFAULT_STRATEGY_WEIGHTS,
} from "./types";

// Signal collection timeout
const SIGNAL_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export interface SignalCollector {
  source: SignalSource;
  collect(contentId: string): Promise<PrioritySignal[]>;
}

export const contentHealthCollector: SignalCollector = {
  source: "content_health",

  async collect(contentId: string): Promise<PrioritySignal[]> {
    const signals: PrioritySignal[] = [];

    try {
      // Dynamic import to avoid circular dependencies
      const { scoreContent } = (await import("../content-health")) as any;
      const healthScore = await withTimeout(scoreContent(contentId), SIGNAL_TIMEOUT_MS, null);

      if (healthScore) {
        // Overall health signal
        signals.push({
          source: "content_health",
          signalType: "overall_health",
          value: healthScore.overallScore,
          weight: DEFAULT_STRATEGY_WEIGHTS.contentHealth,
          contributionScore: 0,
          data: { needsRemediation: healthScore.needsRemediation },
        });

        // Individual health signals
        for (const signal of healthScore.signals) {
          signals.push({
            source: "content_health",
            signalType: signal.type,
            value: signal.score,
            weight: signal.weight / 100,
            contributionScore: 0,
            data: signal.data,
          });
        }
      }
    } catch (error) {
      console.error("Content health signal collection failed:", error);
    }

    return signals;
  },
};

export const revenueIntelCollector: SignalCollector = {
  source: "revenue_intel",

  async collect(contentId: string): Promise<PrioritySignal[]> {
    const signals: PrioritySignal[] = [];

    try {
      const { calculateContentValue } = await import("../revenue-intel");
      const valueScore = await withTimeout(
        calculateContentValue(contentId),
        SIGNAL_TIMEOUT_MS,
        null
      );

      if (valueScore) {
        signals.push({
          source: "revenue_intel",
          signalType: "total_revenue",
          value: Math.min(100, valueScore.totalRevenue / 10),
          weight: DEFAULT_STRATEGY_WEIGHTS.revenueIntel * 0.4,
          contributionScore: 0,
          data: { revenue: valueScore.totalRevenue },
        });

        signals.push({
          source: "revenue_intel",
          signalType: "roi_score",
          value: valueScore.roiScore,
          weight: DEFAULT_STRATEGY_WEIGHTS.revenueIntel * 0.3,
          contributionScore: 0,
          data: { conversions: valueScore.conversions },
        });

        signals.push({
          source: "revenue_intel",
          signalType: "value_per_view",
          value: Math.min(100, valueScore.valuePerView * 100),
          weight: DEFAULT_STRATEGY_WEIGHTS.revenueIntel * 0.3,
          contributionScore: 0,
        });
      }
    } catch (error) {
      console.error("Revenue intel signal failed:", error);
    }

    return signals;
  },
};

export const linkGraphCollector: SignalCollector = {
  source: "link_graph",

  async collect(contentId: string): Promise<PrioritySignal[]> {
    const signals: PrioritySignal[] = [];

    try {
      const { getContentLinkStats } = await import("../link-graph");
      const linkStats = await withTimeout(getContentLinkStats(contentId), SIGNAL_TIMEOUT_MS, null);

      if (linkStats) {
        signals.push({
          source: "link_graph",
          signalType: "authority_score",
          value: linkStats.authorityScore,
          weight: DEFAULT_STRATEGY_WEIGHTS.linkGraph * 0.4,
          contributionScore: 0,
        });

        signals.push({
          source: "link_graph",
          signalType: "inbound_links",
          value: Math.min(100, linkStats.inboundLinks * 10),
          weight: DEFAULT_STRATEGY_WEIGHTS.linkGraph * 0.3,
          contributionScore: 0,
          data: { count: linkStats.inboundLinks },
        });

        signals.push({
          source: "link_graph",
          signalType: "orphan_status",
          value: linkStats.isOrphan ? 0 : 100,
          weight: DEFAULT_STRATEGY_WEIGHTS.linkGraph * 0.3,
          contributionScore: 0,
          data: { isOrphan: linkStats.isOrphan },
        });
      }
    } catch (error) {
      console.error("Link graph signal failed:", error);
    }

    return signals;
  },
};

export const searchIntelCollector: SignalCollector = {
  source: "search_intel",

  async collect(contentId: string): Promise<PrioritySignal[]> {
    const signals: PrioritySignal[] = [];

    // Search intel would come from GSC integration or internal search
    // Simplified: use metadata-based signals
    try {
      const { db } = await import("../db");
      const { contents } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

      if (content) {
        const metadata = (content as any).metadata || {};
        const impressions = metadata.impressions?.current || 0;
        const clicks = metadata.clicks || 0;

        signals.push({
          source: "search_intel",
          signalType: "impressions",
          value: Math.min(100, impressions / 100),
          weight: DEFAULT_STRATEGY_WEIGHTS.searchIntel * 0.4,
          contributionScore: 0,
          data: { impressions },
        });

        signals.push({
          source: "search_intel",
          signalType: "ctr",
          value: impressions > 0 ? Math.min(100, (clicks / impressions) * 1000) : 50,
          weight: DEFAULT_STRATEGY_WEIGHTS.searchIntel * 0.3,
          contributionScore: 0,
        });

        // Recency signal
        const daysSinceUpdate = content.updatedAt
          ? (Date.now() - content.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
          : 365;

        signals.push({
          source: "search_intel",
          signalType: "recency",
          value: Math.max(0, 100 - daysSinceUpdate / 3.65),
          weight: DEFAULT_STRATEGY_WEIGHTS.recency,
          contributionScore: 0,
          data: { daysSinceUpdate: Math.round(daysSinceUpdate) },
        });
      }
    } catch (error) {
      console.error("Search intel signal failed:", error);
    }

    return signals;
  },
};

export const allCollectors: SignalCollector[] = [
  contentHealthCollector,
  revenueIntelCollector,
  linkGraphCollector,
  searchIntelCollector,
];

export async function collectAllSignals(contentId: string): Promise<PrioritySignal[]> {
  const allSignals: PrioritySignal[] = [];

  const results = await Promise.all(
    allCollectors.map(collector =>
      collector.collect(contentId).catch(err => {
        return [];
      })
    )
  );

  for (const signals of results) {
    allSignals.push(...signals);
  }

  return allSignals;
}
