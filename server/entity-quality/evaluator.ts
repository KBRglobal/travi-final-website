/**
 * Entity Quality Scoring Evaluator
 */

import { db } from "../db";
import { contents } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  type QualityScore,
  type QualityDimension,
  type DimensionScore,
  type QualityIssue,
  type QualityStats,
  DIMENSION_WEIGHTS,
  DEFAULT_THRESHOLDS,
} from "./types";

const qualityCache: Map<string, QualityScore> = new Map();

function evaluateCompleteness(content: any): DimensionScore {
  const components: Array<{ name: string; score: number; max: number }> = [];

  components.push(
    { name: "title", score: content.title ? 10 : 0, max: 10 },
    { name: "metaTitle", score: content.metaTitle ? 10 : 0, max: 10 },
    { name: "metaDescription", score: content.metaDescription ? 10 : 0, max: 10 },
    { name: "heroImage", score: content.heroImage ? 10 : 0, max: 10 },
    { name: "answerCapsule", score: content.answerCapsule ? 15 : 0, max: 15 },
    { name: "blocks", score: Math.min((content.blocks?.length || 0) * 3, 25), max: 25 },
    { name: "primaryKeyword", score: content.primaryKeyword ? 10 : 0, max: 10 },
    { name: "summary", score: content.summary ? 10 : 0, max: 10 }
  );

  const total = components.reduce((sum, c) => sum + c.score, 0);
  const max = components.reduce((sum, c) => sum + c.max, 0);

  return {
    score: Math.round((total / max) * 100),
    weight: DIMENSION_WEIGHTS.completeness,
    components,
  };
}

function evaluateAccuracy(content: any): DimensionScore {
  const components: Array<{ name: string; score: number; max: number }> = [];

  const titleLength = content.title?.length || 0;
  components.push({
    name: "titleLength",
    score: titleLength >= 20 && titleLength <= 70 ? 25 : 10,
    max: 25,
  });

  const metaDescLength = content.metaDescription?.length || 0;
  components.push({
    name: "metaDescLength",
    score: metaDescLength >= 120 && metaDescLength <= 160 ? 25 : 10,
    max: 25,
  });

  const seoScore = content.seoScore || 0;
  components.push({ name: "seoScore", score: Math.round(seoScore / 2), max: 50 });

  const total = components.reduce((sum, c) => sum + c.score, 0);
  const max = components.reduce((sum, c) => sum + c.max, 0);

  return { score: Math.round((total / max) * 100), weight: DIMENSION_WEIGHTS.accuracy, components };
}

function evaluateFreshness(content: any): DimensionScore {
  const components: Array<{ name: string; score: number; max: number }> = [];

  const updatedAt = content.updatedAt ? new Date(content.updatedAt) : null;
  if (updatedAt) {
    const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    let freshnessScore: number;
    if (daysSinceUpdate <= 30) {
      freshnessScore = 100;
    } else if (daysSinceUpdate <= 90) {
      freshnessScore = 70;
    } else if (daysSinceUpdate <= 180) {
      freshnessScore = 40;
    } else {
      freshnessScore = 10;
    }
    components.push({ name: "recency", score: freshnessScore, max: 100 });
  } else {
    components.push({ name: "recency", score: 0, max: 100 });
  }

  const total = components.reduce((sum, c) => sum + c.score, 0);
  const max = components.reduce((sum, c) => sum + c.max, 0);

  return {
    score: max > 0 ? Math.round((total / max) * 100) : 0,
    weight: DIMENSION_WEIGHTS.freshness,
    components,
  };
}

function evaluateConsistency(content: any): DimensionScore {
  const components: Array<{ name: string; score: number; max: number }> = [];

  // Check slug consistency with title
  const titleSlug =
    content.title
      ?.toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/(?:^-|-$)/g, "") || "";
  const slugMatch = content.slug?.includes(titleSlug.substring(0, 20)) ? 50 : 25;
  components.push({ name: "slugConsistency", score: slugMatch, max: 50 });

  // Check status consistency
  const statusScore = content.status === "published" && content.blocks?.length > 0 ? 50 : 25;
  components.push({ name: "statusConsistency", score: statusScore, max: 50 });

  const total = components.reduce((sum, c) => sum + c.score, 0);
  const max = components.reduce((sum, c) => sum + c.max, 0);

  return {
    score: max > 0 ? Math.round((total / max) * 100) : 0,
    weight: DIMENSION_WEIGHTS.consistency,
    components,
  };
}

function evaluateRichness(content: any): DimensionScore {
  const components: Array<{ name: string; score: number; max: number }> = [];

  const wordCount = content.wordCount || 0;
  let wordCountScore: number;
  if (wordCount >= 1000) {
    wordCountScore = 40;
  } else if (wordCount >= 500) {
    wordCountScore = 30;
  } else if (wordCount >= 200) {
    wordCountScore = 20;
  } else {
    wordCountScore = 10;
  }
  components.push({ name: "wordCount", score: wordCountScore, max: 40 });

  const blockCount = content.blocks?.length || 0;
  const blockScore = Math.min(blockCount * 5, 30);
  components.push({ name: "blockVariety", score: blockScore, max: 30 });

  let hasAeo: number;
  if (content.answerCapsule && content.aeoScore > 50) {
    hasAeo = 30;
  } else if (content.answerCapsule) {
    hasAeo = 15;
  } else {
    hasAeo = 0;
  }
  components.push({ name: "aeoQuality", score: hasAeo, max: 30 });

  const total = components.reduce((sum, c) => sum + c.score, 0);
  const max = components.reduce((sum, c) => sum + c.max, 0);

  return {
    score: max > 0 ? Math.round((total / max) * 100) : 0,
    weight: DIMENSION_WEIGHTS.richness,
    components,
  };
}

function evaluateEngagement(content: any): DimensionScore {
  const components: Array<{ name: string; score: number; max: number }> = [];

  const viewCount = content.viewCount || 0;
  let viewScore: number;
  if (viewCount >= 1000) {
    viewScore = 100;
  } else if (viewCount >= 100) {
    viewScore = 70;
  } else if (viewCount >= 10) {
    viewScore = 40;
  } else {
    viewScore = 10;
  }
  components.push({ name: "views", score: viewScore, max: 100 });

  const total = components.reduce((sum, c) => sum + c.score, 0);
  const max = components.reduce((sum, c) => sum + c.max, 0);

  return {
    score: max > 0 ? Math.round((total / max) * 100) : 0,
    weight: DIMENSION_WEIGHTS.engagement,
    components,
  };
}

function identifyIssues(dimensions: Record<QualityDimension, DimensionScore>): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (dimensions.completeness.score < 50) {
    issues.push({
      dimension: "completeness",
      severity: "high",
      message: "Missing critical content fields",
      recommendation: "Add meta title, description, and answer capsule",
    } as any);
  }
  if (dimensions.accuracy.score < 50) {
    issues.push({
      dimension: "accuracy",
      severity: "medium",
      message: "SEO optimization needed",
      recommendation: "Improve title length and meta description",
    } as any);
  }
  if (dimensions.freshness.score < 50) {
    issues.push({
      dimension: "freshness",
      severity: "medium",
      message: "Content may be outdated",
      recommendation: "Review and update content",
    } as any);
  }
  if (dimensions.richness.score < 50) {
    issues.push({
      dimension: "richness",
      severity: "low",
      message: "Content lacks depth",
      recommendation: "Add more content blocks and improve AEO score",
    } as any);
  }

  return issues;
}

export async function evaluateEntityQuality(entityId: string): Promise<QualityScore> {
  const [content] = await db.select().from(contents).where(eq(contents.id, entityId));

  if (!content) {
    return {
      entityId,
      entityType: "unknown",
      overallScore: 0,
      dimensions: {} as Record<QualityDimension, DimensionScore>,
      issues: [
        {
          dimension: "completeness",
          severity: "high",
          message: "Entity not found",
          recommendation: "Check entity ID",
        },
      ],
      calculatedAt: new Date(),
    } as any;
  }

  const dimensions: Record<QualityDimension, DimensionScore> = {
    completeness: evaluateCompleteness(content),
    accuracy: evaluateAccuracy(content),
    freshness: evaluateFreshness(content),
    consistency: evaluateConsistency(content),
    richness: evaluateRichness(content),
    engagement: evaluateEngagement(content),
  };

  const overallScore = Math.round(
    Object.values(dimensions).reduce((sum, d) => sum + d.score * d.weight, 0)
  );

  const score: QualityScore = {
    entityId,
    entityType: content.type,
    overallScore,
    dimensions,
    issues: identifyIssues(dimensions),
    calculatedAt: new Date(),
  } as any;

  qualityCache.set(entityId, score);
  return score;
}

export function getCachedQualityScore(entityId: string): QualityScore | undefined {
  return qualityCache.get(entityId);
}

export function getQualityGrade(score: number): "excellent" | "good" | "fair" | "poor" {
  if (score >= (DEFAULT_THRESHOLDS as any).excellent) return "excellent";
  if (score >= (DEFAULT_THRESHOLDS as any).good) return "good";
  if (score >= (DEFAULT_THRESHOLDS as any).fair) return "fair";
  return "poor";
}

export async function getQualityStats(): Promise<QualityStats> {
  const all = Array.from(qualityCache.values());

  const byGrade = { excellent: 0, good: 0, fair: 0, poor: 0 };
  let totalScore = 0;
  const issueCount: Record<string, number> = {};

  for (const score of all) {
    byGrade[getQualityGrade((score as any).overallScore)]++;
    totalScore += (score as any).overallScore;
    for (const issue of score.issues) {
      issueCount[issue.message] = (issueCount[issue.message] || 0) + 1;
    }
  }

  const topIssues = Object.entries(issueCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => ({ issue, count }));

  return {
    totalEntities: all.length,
    avgScore: all.length > 0 ? Math.round(totalScore / all.length) : 0,
    byGrade,
    topIssues,
  } as any;
}
