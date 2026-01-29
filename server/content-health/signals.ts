/**
 * Content Health Engine - Signals
 * Detects health issues in content
 */

import { db } from "../db";
import { contents, aeoAnswerCapsules } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
// Type definitions inline to avoid import errors
type HealthSignalType =
  | "entity_drift"
  | "impressions_declining"
  | "aeo_missing"
  | "aeo_stale"
  | "outdated_publish"
  | "broken_links"
  | "low_engagement"
  | "orphan_content"
  | "missing_schema"
  | "thin_content";

interface ContentHealthSignal {
  type: HealthSignalType;
  weight: number;
  score: number;
  message: string;
  detectedAt: Date;
  data?: Record<string, unknown>;
}

const DEFAULT_HEALTH_CONFIG = {
  signalWeights: {
    entity_drift: 10,
    impressions_declining: 15,
    aeo_missing: 20,
    aeo_stale: 10,
    outdated_publish: 15,
    broken_links: 20,
    low_engagement: 10,
    orphan_content: 10,
    missing_schema: 15,
    thin_content: 15,
  },
  staleDays: {
    aeo: 90,
    content: 180,
  },
} as any;

const SIGNAL_TIMEOUT_MS = 5000;

interface ContentContext {
  id: string;
  type: string;
  title: string;
  blocks: unknown[];
  status: string;
  publishedAt: Date | null;
  updatedAt: Date | null;
  metadata?: Record<string, unknown>;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Signal detection timeout")), ms)
    ),
  ]);
}

function extractTextFromBlocks(blocks: any[]): string {
  if (!Array.isArray(blocks)) return "";
  return blocks
    .map(block => {
      if (typeof block === "string") return block;
      if (block.text) return block.text;
      if (block.content) return extractTextFromBlocks(block.content);
      if (block.children) return extractTextFromBlocks(block.children);
      return "";
    })
    .join(" ");
}

function countInternalLinks(blocks: any[]): number {
  if (!Array.isArray(blocks)) return 0;
  const jsonStr = JSON.stringify(blocks);
  const matches = jsonStr.match(/href=["']\/[^"']+["']/gi);
  return matches?.length || 0;
}

export const signalDetectors: Record<
  HealthSignalType,
  (ctx: ContentContext) => Promise<ContentHealthSignal | null>
> = {
  async entity_drift(ctx) {
    const metadata = ctx.metadata || {};
    const entityCount = (metadata as any).entityCount || 0;
    const expectedEntities = (metadata as any).expectedEntityCount || 5;

    if (entityCount === 0) {
      return {
        type: "entity_drift",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.entity_drift,
        score: 0,
        message: "No entities extracted from content",
        detectedAt: new Date(),
        data: { entityCount, expectedEntities },
      };
    }

    if (entityCount < expectedEntities * 0.5) {
      return {
        type: "entity_drift",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.entity_drift,
        score: Math.round((entityCount / expectedEntities) * 100),
        message: `Entity count (${entityCount}) significantly below expected (${expectedEntities})`,
        detectedAt: new Date(),
        data: { entityCount, expectedEntities },
      };
    }

    return null;
  },

  async impressions_declining(ctx) {
    const metadata = ctx.metadata || {};
    const impressions = (metadata as any).impressions || {};
    const current = impressions.current || 0;
    const previous = impressions.previous || 0;

    if (previous > 0 && current < previous * 0.5) {
      const decline = Math.round(((previous - current) / previous) * 100);
      return {
        type: "impressions_declining",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.impressions_declining,
        score: Math.max(0, 100 - decline),
        message: `Search impressions declined by ${decline}%`,
        detectedAt: new Date(),
        data: { current, previous, decline },
      };
    }

    return null;
  },

  async aeo_missing(ctx) {
    try {
      const [capsule] = await withTimeout(
        db.select().from(aeoAnswerCapsules).where(eq(aeoAnswerCapsules.contentId, ctx.id)).limit(1),
        SIGNAL_TIMEOUT_MS
      );

      if (!capsule) {
        return {
          type: "aeo_missing",
          weight: DEFAULT_HEALTH_CONFIG.signalWeights.aeo_missing,
          score: 0,
          message: "No AEO answer capsule exists for this content",
          detectedAt: new Date(),
        };
      }
    } catch (error) {
      console.error("AEO missing signal check failed:", error);
    }

    return null;
  },

  async aeo_stale(ctx) {
    try {
      const staleDays = DEFAULT_HEALTH_CONFIG.staleDays.aeo;
      const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

      const [capsule] = await withTimeout(
        db.select().from(aeoAnswerCapsules).where(eq(aeoAnswerCapsules.contentId, ctx.id)).limit(1),
        SIGNAL_TIMEOUT_MS
      );

      if (capsule && (capsule as any).createdAt < staleDate) {
        const daysSinceUpdate = Math.floor(
          (Date.now() - (capsule as any).createdAt.getTime()) / (24 * 60 * 60 * 1000)
        );
        return {
          type: "aeo_stale",
          weight: DEFAULT_HEALTH_CONFIG.signalWeights.aeo_stale,
          score: Math.max(0, 100 - Math.round((daysSinceUpdate / staleDays) * 50)),
          message: `AEO capsule is ${daysSinceUpdate} days old`,
          detectedAt: new Date(),
          data: { daysSinceUpdate, staleDays },
        };
      }
    } catch (error) {
      console.error("AEO stale signal check failed:", error);
    }

    return null;
  },

  async outdated_publish(ctx) {
    if (!ctx.publishedAt) return null;

    const staleDays = DEFAULT_HEALTH_CONFIG.staleDays.content;
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

    if (ctx.publishedAt < staleDate && (!ctx.updatedAt || ctx.updatedAt < staleDate)) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - (ctx.updatedAt || ctx.publishedAt).getTime()) / (24 * 60 * 60 * 1000)
      );
      return {
        type: "outdated_publish",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.outdated_publish,
        score: Math.max(0, 100 - Math.round((daysSinceUpdate / staleDays) * 50)),
        message: `Content not updated in ${daysSinceUpdate} days`,
        detectedAt: new Date(),
        data: { daysSinceUpdate, staleDays },
      };
    }

    return null;
  },

  async broken_links(ctx) {
    const blocks = (ctx.blocks as any[]) || [];
    const jsonStr = JSON.stringify(blocks);
    const linkMatches = jsonStr.match(/href=["']([^"']+)["']/gi) || [];

    // Simple check for obviously broken patterns
    const suspiciousPatterns = [
      /href=["']#["']/gi,
      /href=["']undefined["']/gi,
      /href=["']null["']/gi,
      /href=["']\s*["']/gi,
    ];

    let brokenCount = 0;
    for (const pattern of suspiciousPatterns) {
      const matches = jsonStr.match(pattern);
      if (matches) brokenCount += matches.length;
    }

    if (brokenCount > 0) {
      return {
        type: "broken_links",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.broken_links,
        score: Math.max(0, 100 - brokenCount * 20),
        message: `Found ${brokenCount} potentially broken links`,
        detectedAt: new Date(),
        data: { brokenCount, totalLinks: linkMatches.length },
      };
    }

    return null;
  },

  async low_engagement(ctx) {
    const metadata = ctx.metadata || {};
    const engagement = (metadata as any).engagement || {};
    const bounceRate = engagement.bounceRate || 0;
    const avgTimeOnPage = engagement.avgTimeOnPage || 0;

    if (bounceRate > 80 || avgTimeOnPage < 10) {
      return {
        type: "low_engagement",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.low_engagement,
        score: Math.max(0, 100 - bounceRate),
        message: `Low engagement: ${bounceRate}% bounce rate, ${avgTimeOnPage}s avg time`,
        detectedAt: new Date(),
        data: { bounceRate, avgTimeOnPage },
      };
    }

    return null;
  },

  async orphan_content(ctx) {
    const blocks = (ctx.blocks as any[]) || [];
    const internalLinks = countInternalLinks(blocks);

    // Check if content has no incoming links (simplified check via metadata)
    const metadata = ctx.metadata || {};
    const inboundLinks = (metadata as any).inboundLinks || 0;

    if (internalLinks === 0 && inboundLinks === 0) {
      return {
        type: "orphan_content",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.orphan_content,
        score: 20,
        message: "Content has no internal links (orphan page)",
        detectedAt: new Date(),
        data: { outboundLinks: internalLinks, inboundLinks },
      };
    }

    return null;
  },

  async missing_schema(ctx) {
    const metadata = ctx.metadata || {};
    const hasSchema = (metadata as any).schemaMarkup;

    const typesRequiringSchema = ["hotel", "restaurant", "attraction", "event"];
    if (typesRequiringSchema.includes(ctx.type) && !hasSchema) {
      return {
        type: "missing_schema",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.missing_schema,
        score: 0,
        message: `${ctx.type} content missing schema.org markup`,
        detectedAt: new Date(),
      };
    }

    return null;
  },

  async thin_content(ctx) {
    const blocks = (ctx.blocks as any[]) || [];
    const text = extractTextFromBlocks(blocks);
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    const minWordCount = ctx.type === "article" ? 500 : 200;

    if (wordCount < minWordCount) {
      return {
        type: "thin_content",
        weight: DEFAULT_HEALTH_CONFIG.signalWeights.thin_content,
        score: Math.round((wordCount / minWordCount) * 100),
        message: `Content is thin (${wordCount} words, minimum ${minWordCount})`,
        detectedAt: new Date(),
        data: { wordCount, minWordCount },
      };
    }

    return null;
  },
};

export async function detectSignals(ctx: ContentContext): Promise<ContentHealthSignal[]> {
  const signals: ContentHealthSignal[] = [];

  for (const [signalType, detector] of Object.entries(signalDetectors)) {
    try {
      const signal = await detector(ctx);
      if (signal) {
        signals.push(signal);
      }
    } catch (error) {
      console.error(`Health signal detector "${signalType}" failed:`, error);
    }
  }

  return signals;
}
