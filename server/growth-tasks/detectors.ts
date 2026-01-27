/**
 * Autonomous Growth Tasks - Detectors
 * Detects growth opportunities across the content system
 */

import { db } from "../db";
import { contents, aeoAnswerCapsules } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { Detection, DetectorType, GrowthTaskType, DEFAULT_GROWTH_CONFIG } from "./types";

const DETECTOR_TIMEOUT_MS = 30000;

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export const detectors: Record<DetectorType, () => Promise<Detection[]>> = {
  async missing_content(): Promise<Detection[]> {
    // Detect high-traffic entities without dedicated content
    const detections: Detection[] = [];

    // This would integrate with entity system to find popular entities
    // without dedicated content pages
    // Simplified: check for entities mentioned often but without their own page

    return detections;
  },

  async entity_without_aeo(): Promise<Detection[]> {
    const detections: Detection[] = [];

    // Find published content without AEO capsules
    const contentWithoutAeo = await withTimeout(
      db
        .select({
          id: contents.id,
          title: contents.title,
          type: contents.type,
        })
        .from(contents)
        .where(eq(contents.status, "published"))
        .limit(100),
      DETECTOR_TIMEOUT_MS,
      []
    );

    for (const content of contentWithoutAeo) {
      const [capsule] = await db
        .select()
        .from(aeoAnswerCapsules)
        .where(eq(aeoAnswerCapsules.contentId, content.id))
        .limit(1);

      if (!capsule) {
        detections.push({
          type: "entity_without_aeo",
          confidence: 0.85,
          data: {
            contentId: content.id,
            contentTitle: content.title,
            contentType: content.type,
          },
          suggestedTask: "improve_aeo",
          detectedAt: new Date(),
        });
      }
    }

    return detections.slice(0, 20); // Limit results
  },

  async high_value_no_links(): Promise<Detection[]> {
    const detections: Detection[] = [];

    // Find high-traffic content with few internal links
    const highValueContent = await withTimeout(
      db
        .select({
          id: contents.id,
          title: contents.title,
          blocks: contents.blocks,
        })
        .from(contents)
        .where(eq(contents.status, "published"))
        .limit(50),
      DETECTOR_TIMEOUT_MS,
      []
    );

    for (const content of highValueContent) {
      const blocks = (content.blocks as any[]) || [];
      const jsonStr = JSON.stringify(blocks);
      const internalLinks = (jsonStr.match(/href=["']\/[^"']+["']/gi) || []).length;

      if (internalLinks < 2) {
        detections.push({
          type: "high_value_no_links",
          confidence: 0.75,
          data: {
            contentId: content.id,
            contentTitle: content.title,
            currentLinks: internalLinks,
          },
          suggestedTask: "add_internal_links",
          detectedAt: new Date(),
        });
      }
    }

    return detections.slice(0, 15);
  },

  async zero_result_queries(): Promise<Detection[]> {
    const detections: Detection[] = [];

    // This would integrate with search analytics to find
    // queries that returned zero results
    // Simplified: return empty for now

    return detections;
  },

  async orphan_content(): Promise<Detection[]> {
    const detections: Detection[] = [];

    // Find content with no inbound links
    const allContent = await withTimeout(
      db
        .select({
          id: contents.id,
          title: contents.title,
          slug: contents.slug,
        })
        .from(contents)
        .where(eq(contents.status, "published"))
        .limit(200),
      DETECTOR_TIMEOUT_MS,
      []
    );

    // Build inbound link map
    const inboundMap = new Map<string, number>();

    for (const content of allContent) {
      const blocks = (content as any).blocks || [];
      const jsonStr = JSON.stringify(blocks);
      const linkMatches = jsonStr.match(/href=["']\/([^"']+)["']/gi) || [];

      for (const match of linkMatches) {
        const slug = match.replace(/href=["']\//i, "").replace(/["']$/, "");
        const targetContent = allContent.find(c => c.slug === slug);
        if (targetContent) {
          inboundMap.set(targetContent.id, (inboundMap.get(targetContent.id) || 0) + 1);
        }
      }
    }

    // Find orphans (no inbound links)
    for (const content of allContent) {
      const inbound = inboundMap.get(content.id) || 0;
      if (inbound === 0) {
        detections.push({
          type: "orphan_content",
          confidence: 0.9,
          data: {
            contentId: content.id,
            contentTitle: content.title,
            inboundLinks: 0,
          },
          suggestedTask: "rescue_orphan",
          detectedAt: new Date(),
        });
      }
    }

    return detections.slice(0, 20);
  },

  async stale_content(): Promise<Detection[]> {
    const detections: Detection[] = [];

    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 180); // 6 months

    const staleContent = await withTimeout(
      db
        .select({
          id: contents.id,
          title: contents.title,
          updatedAt: contents.updatedAt,
        })
        .from(contents)
        .where(and(eq(contents.status, "published"), lt(contents.updatedAt, staleDate)))
        .limit(30),
      DETECTOR_TIMEOUT_MS,
      []
    );

    for (const content of staleContent) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - (content.updatedAt?.getTime() || 0)) / (24 * 60 * 60 * 1000)
      );

      detections.push({
        type: "stale_content",
        confidence: 0.7,
        data: {
          contentId: content.id,
          contentTitle: content.title,
          daysSinceUpdate,
        },
        suggestedTask: "update_stale_content",
        detectedAt: new Date(),
      });
    }

    return detections;
  },

  async low_conversion(): Promise<Detection[]> {
    const detections: Detection[] = [];

    // Would integrate with revenue intel to find
    // high-traffic, low-converting content
    // Simplified: return empty for now

    return detections;
  },

  async content_gap(): Promise<Detection[]> {
    const detections: Detection[] = [];

    // Would use competitor analysis or search console data
    // to identify content gaps
    // Simplified: return empty for now

    return detections;
  },
};

export async function runDetectors(enabledDetectors?: DetectorType[]): Promise<Detection[]> {
  const toRun = enabledDetectors || DEFAULT_GROWTH_CONFIG.enabledDetectors;
  const allDetections: Detection[] = [];

  for (const detectorType of toRun) {
    const detector = detectors[detectorType];
    if (!detector) continue;

    try {
      const detections = await detector();
      allDetections.push(...detections);
    } catch (error) {}
  }

  return allDetections;
}

export async function runSingleDetector(type: DetectorType): Promise<Detection[]> {
  const detector = detectors[type];
  if (!detector) return [];

  try {
    return await detector();
  } catch (error) {
    return [];
  }
}
