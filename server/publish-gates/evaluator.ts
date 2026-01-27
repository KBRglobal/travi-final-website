/**
 * Publish Gates - Evaluator
 * Evaluates content against publishing rules
 */

import { db } from "../db";
import { contents, aeoAnswerCapsules } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  PublishGateRule,
  GateRuleType,
  GateEvaluationContext,
  GateEvaluationResult,
  GateRuleResult,
} from "./types";
import { rulesRegistry } from "./rules";

const EVALUATION_TIMEOUT_MS = 10000;

interface ContentData {
  id: string;
  type: string;
  title: string;
  blocks: unknown[];
  status: string;
  entityCount: number;
  wordCount: number;
  internalLinks: number;
  hasAeoCapsule: boolean;
  isSearchIndexed: boolean;
  intelligenceScore: number;
  hasSchemaMarkup: boolean;
}

async function fetchContentData(contentId: string): Promise<ContentData | null> {
  const timeoutPromise = new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error("Content fetch timeout")), EVALUATION_TIMEOUT_MS)
  );

  const fetchPromise = async (): Promise<ContentData | null> => {
    const [content] = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);

    if (!content) return null;

    const blocks = (content.blocks as any[]) || [];
    const textContent = extractTextFromBlocks(blocks);
    const wordCount = textContent.split(/\s+/).filter(w => w.length > 0).length;
    const internalLinks = countInternalLinks(blocks);

    // Check for AEO capsule
    const [capsule] = await db
      .select()
      .from(aeoAnswerCapsules)
      .where(eq(aeoAnswerCapsules.contentId, contentId))
      .limit(1);

    // Entity count from content metadata
    const metadata = (content as any).metadata || {};
    const entityCount = metadata.entityCount || 0;
    const intelligenceScore = metadata.intelligenceScore || 0;

    return {
      id: content.id,
      type: content.type,
      title: content.title,
      blocks,
      status: content.status,
      entityCount,
      wordCount,
      internalLinks,
      hasAeoCapsule: !!capsule,
      isSearchIndexed: metadata.searchIndexed ?? true,
      intelligenceScore,
      hasSchemaMarkup: !!metadata.schemaMarkup,
    };
  };

  try {
    return await Promise.race([fetchPromise(), timeoutPromise]);
  } catch (error) {
    return null;
  }
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
  const internalLinkPattern = /href=["']\/[^"']+["']/gi;
  const matches = jsonStr.match(internalLinkPattern);
  return matches?.length || 0;
}

async function evaluateRule(
  rule: PublishGateRule,
  data: ContentData,
  context: GateEvaluationContext
): Promise<GateRuleResult> {
  const baseResult: Partial<GateRuleResult> = {
    ruleId: rule.id,
    ruleName: rule.name,
    ruleType: rule.type,
  };

  switch (rule.type) {
    case "min_entity_count": {
      const threshold = rule.config.threshold || 3;
      const passed = data.entityCount >= threshold;
      return {
        ...baseResult,
        passed,
        score: data.entityCount,
        threshold,
        message: passed
          ? `Entity count (${data.entityCount}) meets threshold`
          : `Entity count (${data.entityCount}) below threshold (${threshold})`,
        details: { entityCount: data.entityCount },
      } as GateRuleResult;
    }

    case "search_indexed": {
      return {
        ...baseResult,
        passed: data.isSearchIndexed,
        score: data.isSearchIndexed ? 100 : 0,
        threshold: 100,
        message: data.isSearchIndexed
          ? "Content is indexed in search"
          : "Content is not indexed in search",
      } as GateRuleResult;
    }

    case "aeo_capsule_required": {
      return {
        ...baseResult,
        passed: data.hasAeoCapsule,
        score: data.hasAeoCapsule ? 100 : 0,
        threshold: 100,
        message: data.hasAeoCapsule
          ? "AEO capsule exists"
          : "AEO capsule missing - content needs answer optimization",
      } as GateRuleResult;
    }

    case "intelligence_score": {
      const threshold = rule.config.threshold || 60;
      const passed = data.intelligenceScore >= threshold;
      return {
        ...baseResult,
        passed,
        score: data.intelligenceScore,
        threshold,
        message: passed
          ? `Intelligence score (${data.intelligenceScore}) meets threshold`
          : `Intelligence score (${data.intelligenceScore}) below threshold (${threshold})`,
        details: { intelligenceScore: data.intelligenceScore },
      } as GateRuleResult;
    }

    case "internal_links": {
      const threshold = rule.config.threshold || 2;
      const passed = data.internalLinks >= threshold;
      return {
        ...baseResult,
        passed,
        score: data.internalLinks,
        threshold,
        message: passed
          ? `Internal links (${data.internalLinks}) meets threshold`
          : `Internal links (${data.internalLinks}) below threshold (${threshold})`,
        details: { internalLinks: data.internalLinks },
      } as GateRuleResult;
    }

    case "word_count": {
      const minValue = rule.config.minValue || 300;
      const passed = data.wordCount >= minValue;
      return {
        ...baseResult,
        passed,
        score: data.wordCount,
        threshold: minValue,
        message: passed
          ? `Word count (${data.wordCount}) meets minimum`
          : `Word count (${data.wordCount}) below minimum (${minValue})`,
        details: { wordCount: data.wordCount },
      } as GateRuleResult;
    }

    case "schema_markup": {
      return {
        ...baseResult,
        passed: data.hasSchemaMarkup,
        score: data.hasSchemaMarkup ? 100 : 0,
        threshold: 100,
        message: data.hasSchemaMarkup ? "Schema markup exists" : "Schema markup missing",
      } as GateRuleResult;
    }

    default:
      return {
        ...baseResult,
        passed: true,
        score: 100,
        threshold: 0,
        message: "Unknown rule type - skipped",
      } as GateRuleResult;
  }
}

export async function evaluatePublishGates(
  context: GateEvaluationContext
): Promise<GateEvaluationResult> {
  const startTime = Date.now();

  // Fetch content data
  const contentData = await fetchContentData(context.contentId);

  if (!contentData) {
    return {
      passed: false,
      contentId: context.contentId,
      evaluatedAt: new Date(),
      totalRules: 0,
      passedRules: 0,
      failedRules: 0,
      results: [],
      blockedBy: ["content_not_found"],
      canOverride: false,
    };
  }

  // Get applicable rules
  const rules = rulesRegistry.getRulesForContentType(contentData.type);

  // Evaluate each rule
  const results: GateRuleResult[] = [];
  const blockedBy: string[] = [];

  for (const rule of rules) {
    // Check if user role bypasses this rule
    if (rule.config.bypassRoles?.includes(context.userRole)) {
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        passed: true,
        score: 100,
        threshold: 0,
        message: "Bypassed for user role",
      });
      continue;
    }

    const result = await evaluateRule(rule, contentData, context);
    results.push(result);

    if (!result.passed) {
      blockedBy.push(rule.id);
    }
  }

  const passedRules = results.filter(r => r.passed).length;
  const failedRules = results.filter(r => !r.passed).length;
  const allPassed = failedRules === 0;

  return {
    passed: allPassed || context.forcePublish === true,
    contentId: context.contentId,
    evaluatedAt: new Date(),
    totalRules: results.length,
    passedRules,
    failedRules,
    results,
    blockedBy,
    canOverride: context.userRole === "admin" || context.userRole === "editor",
  };
}

export async function quickCheck(contentId: string, ruleId: string): Promise<boolean> {
  const rule = rulesRegistry.getRule(ruleId);
  if (!rule || !rule.enabled) return true;

  const contentData = await fetchContentData(contentId);
  if (!contentData) return false;

  const result = await evaluateRule(rule, contentData, {
    contentId,
    contentType: contentData.type,
    userId: "system",
    userRole: "system",
  });

  return result.passed;
}
