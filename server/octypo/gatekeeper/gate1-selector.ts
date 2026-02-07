/**
 * Gate 1: Content Selector
 * Evaluates RSS items and decides what's worth writing about
 *
 * Responsibilities:
 * - Analyze SEO potential (40%)
 * - Analyze AEO potential (35%)
 * - Analyze Virality potential (25%)
 * - Classify into S1/S2/S3 tiers
 * - Match to best writer
 * - Generate writer prompt
 */

import { EngineRegistry, generateWithEngine } from "../../services/engine-registry";
import { WRITERS } from "@shared/writers.config";
import {
  ContentSelectionInput,
  ContentSelectionResult,
  SEOAnalysis,
  AEOAnalysis,
  ViralityAnalysis,
  ContentTier,
  SelectionDecision,
  GatekeeperConfig,
  DEFAULT_GATEKEEPER_CONFIG,
} from "./types";
import { logger } from "../../lib/logger";
import { getDeduplicationEngine } from "./deduplication";
import { EVALUATOR_PROMPTS } from "./prompts/evaluator-prompts";

// Use the 2026-optimized prompts from the prompts module
const GATE1_SYSTEM_PROMPT = EVALUATOR_PROMPTS.SYSTEM;

// User prompt template from the 2026 optimized prompts
const GATE1_EVALUATION_PROMPT = EVALUATOR_PROMPTS.USER_TEMPLATE;

export class Gate1Selector {
  private config: GatekeeperConfig;

  constructor(config: Partial<GatekeeperConfig> = {}) {
    this.config = { ...DEFAULT_GATEKEEPER_CONFIG, ...config };
  }

  async evaluate(input: ContentSelectionInput): Promise<ContentSelectionResult> {
    const startTime = Date.now();

    logger.info({ title: input.title.substring(0, 50) }, "[Gate1] Evaluating content");

    try {
      // Step 0: Deduplication check (before spending LLM resources)
      const dedupEngine = getDeduplicationEngine();
      const dedupResult = await dedupEngine.checkContent(
        input.title,
        input.summary,
        input.sourceUrl
      );

      if (!dedupResult.isOriginal) {
        logger.info(
          {
            title: input.title.substring(0, 50),
            similarity: Math.round((dedupResult.duplicateOf?.similarity || 0) * 100),
            duplicateOf: dedupResult.duplicateOf?.sourceTitle?.substring(0, 50),
          },
          "[Gate1] Duplicate content detected - skipping"
        );

        // Return early with skip decision
        return {
          feedItemId: input.feedItemId,
          seoAnalysis: {
            score: 0,
            searchVolumePotential: "low",
            competitionLevel: "high",
            keywordOpportunities: [],
            travelJourneyStage: "inspiration",
            eeaTScore: 0,
            reasoning: "Duplicate content",
          },
          aeoAnalysis: {
            score: 0,
            extractability: "low",
            schemaPotential: [],
            answerBoxPotential: false,
            semanticClarity: 0,
            entityAuthority: [],
            reasoning: "Duplicate content",
          },
          viralityAnalysis: {
            score: 0,
            emotionalTriggers: [],
            culturalRelevance: "low",
            timeliness: "stale",
            shareability: 0,
            reasoning: "Duplicate content",
          },
          totalScore: 0,
          tier: "S3",
          decision: "skip",
          recommendedWriterId: "",
          writerName: "",
          estimatedValue: "low",
          estimatedCost: "low",
          valueMatrixQuadrant: "skip",
          reasoning: `Duplicate content (${Math.round((dedupResult.duplicateOf?.similarity || 0) * 100)}% similar to: ${dedupResult.duplicateOf?.sourceTitle || "existing content"})`,
          contentType: "article",
          evaluatedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Build the evaluation prompt
      const prompt = this.buildPrompt(input);

      // Call LLM for evaluation
      const response = await this.callLLM(prompt);

      // Parse and validate response
      const evaluation = this.parseResponse(response);

      // Calculate weighted score
      const totalScore = this.calculateTotalScore(
        evaluation.seoAnalysis,
        evaluation.aeoAnalysis,
        evaluation.viralityAnalysis
      );

      // Determine tier based on score
      const tier = this.determineTier(totalScore);

      // Make final decision
      const decision = this.makeDecision(totalScore, tier, evaluation);

      // Match to best writer
      const writer = this.matchWriter(evaluation.recommendedWriterCategory, input.category);

      // Determine value matrix quadrant
      const valueMatrixQuadrant = this.determineValueQuadrant(
        evaluation.estimatedValue,
        evaluation.estimatedCost
      );

      const result: ContentSelectionResult = {
        feedItemId: input.feedItemId,
        seoAnalysis: evaluation.seoAnalysis,
        aeoAnalysis: evaluation.aeoAnalysis,
        viralityAnalysis: evaluation.viralityAnalysis,
        totalScore,
        tier,
        decision,
        recommendedWriterId: writer.id,
        writerName: writer.name,
        estimatedValue: evaluation.estimatedValue,
        estimatedCost: evaluation.estimatedCost,
        valueMatrixQuadrant,
        reasoning: evaluation.reasoning,
        contentType: evaluation.contentType || "article",
        evaluatedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
      };

      logger.info({ totalScore, tier, decision }, "[Gate1] Evaluation complete");

      return result;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : "Unknown" },
        "[Gate1] Evaluation failed"
      );
      throw error;
    }
  }

  private buildPrompt(input: ContentSelectionInput): string {
    return GATE1_EVALUATION_PROMPT.replace("{title}", input.title)
      .replace("{summary}", input.summary || "No summary available")
      .replace("{sourceName}", input.sourceName || "Unknown")
      .replace("{sourceCredibility}", "medium") // TODO: Implement source credibility scoring based on domain reputation, historical accuracy
      .replace("{category}", input.category || "General")
      .replace("{destination}", input.destinationId || "Not specified")
      .replace("{publishedDate}", input.publishedDate?.toISOString() || "Unknown");
  }

  private async callLLM(prompt: string): Promise<string> {
    const preferredProviders = [this.config.preferredEngine, ...this.config.fallbackEngines];
    const triedEngines = new Set<string>();
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      // Get next engine using round-robin from preferred providers
      const engine =
        EngineRegistry.getNextByProviderPreference(preferredProviders, triedEngines) ||
        EngineRegistry.getNextFromQueue(triedEngines);

      if (!engine) {
        throw new Error("No available engine for Gate1 evaluation");
      }

      triedEngines.add(engine.id);

      if (!engine.isHealthy) {
        continue;
      }

      try {
        const response = await generateWithEngine(engine, GATE1_SYSTEM_PROMPT, prompt);
        EngineRegistry.reportSuccess(engine.id);
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        EngineRegistry.reportError(engine.id, errorMsg);
        logger.warn({ engineId: engine.id, error: errorMsg }, "[Gate1] Engine failed, trying next");
        continue;
      }
    }

    throw new Error("All LLM engines failed for Gate1 evaluation");
  }

  private parseResponse(response: string): any {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response;

    const jsonMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(response);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find JSON object directly
    const objectMatch = /\{[\s\S]*\}/.exec(jsonStr);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error("[Gate1] Failed to parse LLM response");
      throw new Error("Failed to parse Gate1 evaluation response");
    }
  }

  private calculateTotalScore(
    seo: SEOAnalysis,
    aeo: AEOAnalysis,
    virality: ViralityAnalysis
  ): number {
    const weightedScore =
      (seo.score * this.config.seoWeight) / 100 +
      (aeo.score * this.config.aeoWeight) / 100 +
      (virality.score * this.config.viralityWeight) / 100;

    return Math.round(weightedScore);
  }

  private determineTier(score: number): ContentTier {
    if (score >= this.config.minScoreForS1) return "S1";
    if (score >= this.config.minScoreForS2) return "S2";
    return "S3";
  }

  private makeDecision(score: number, tier: ContentTier, evaluation: any): SelectionDecision {
    // Skip if below threshold
    if (score < this.config.skipBelowScore) {
      return "skip";
    }

    // Skip if stale content
    if (evaluation.viralityAnalysis?.timeliness === "stale") {
      return "skip";
    }

    // Write S1 and S2 immediately
    if (tier === "S1" || tier === "S2") {
      return "write";
    }

    // S3: Check value matrix
    if (evaluation.estimatedValue === "low" && evaluation.estimatedCost === "high") {
      return "skip";
    }

    // S3 with decent value: queue for later
    if (tier === "S3" && score >= this.config.minScoreForS3) {
      return "queue";
    }

    return "skip";
  }

  private matchWriter(
    recommendedCategory: string,
    inputCategory?: string
  ): { id: string; name: string } {
    const category = recommendedCategory?.toLowerCase() || inputCategory?.toLowerCase() || "";

    // Category to writer mapping based on WRITERS config
    const categoryMap: Record<string, string> = {
      // Sarah Mitchell - Luxury
      luxury: "sarah-mitchell",
      hotel: "sarah-mitchell",
      resort: "sarah-mitchell",
      spa: "sarah-mitchell",
      "fine dining": "sarah-mitchell",

      // Omar Hassan - Adventure
      adventure: "omar-hassan",
      outdoor: "omar-hassan",
      sports: "omar-hassan",
      hiking: "omar-hassan",
      extreme: "omar-hassan",

      // Fatima Al-Rashid - Food
      food: "fatima-al-rashid",
      culinary: "fatima-al-rashid",
      restaurant: "fatima-al-rashid",
      cuisine: "fatima-al-rashid",
      dining: "fatima-al-rashid",

      // Michael Chen - Business
      business: "michael-chen",
      mice: "michael-chen",
      corporate: "michael-chen",
      conference: "michael-chen",

      // Rebecca Thompson - Family
      family: "rebecca-thompson",
      kids: "rebecca-thompson",
      multigenerational: "rebecca-thompson",

      // Ahmed Mansour - Culture
      culture: "ahmed-mansour",
      heritage: "ahmed-mansour",
      history: "ahmed-mansour",
      museum: "ahmed-mansour",
      art: "ahmed-mansour",

      // David Rodriguez - Budget
      budget: "david-rodriguez",
      backpacker: "david-rodriguez",
      cheap: "david-rodriguez",
      affordable: "david-rodriguez",

      // Layla Nasser - Sustainable
      sustainable: "layla-nasser",
      eco: "layla-nasser",
      green: "layla-nasser",
      environment: "layla-nasser",
    };

    // Find matching writer
    for (const [keyword, writerId] of Object.entries(categoryMap)) {
      if (category.includes(keyword)) {
        const writer = WRITERS.find(w => w.id === writerId);
        if (writer) {
          return { id: writer.id, name: writer.name };
        }
      }
    }

    // Default to Sarah Mitchell (general travel authority)
    const defaultWriter = WRITERS.find(w => w.id === "sarah-mitchell") || WRITERS[0];
    return { id: defaultWriter.id, name: defaultWriter.name };
  }

  private determineValueQuadrant(
    value: "high" | "medium" | "low",
    cost: "high" | "medium" | "low"
  ): "quick_win" | "strategic_investment" | "gap_filler" | "skip" {
    if (value === "high" && (cost === "low" || cost === "medium")) {
      return "quick_win";
    }
    if (value === "high" && cost === "high") {
      return "strategic_investment";
    }
    if ((value === "low" || value === "medium") && cost === "low") {
      return "gap_filler";
    }
    return "skip";
  }

  /**
   * Batch evaluate multiple items
   */
  async evaluateBatch(
    items: ContentSelectionInput[],
    maxConcurrent: number = this.config.maxConcurrentEvaluations
  ): Promise<ContentSelectionResult[]> {
    const results: ContentSelectionResult[] = [];

    // Process in batches
    for (let i = 0; i < items.length; i += maxConcurrent) {
      const batch = items.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(item =>
          this.evaluate(item).catch(error => {
            logger.error({ error: error.message }, "[Gate1] Batch item failed");
            return null;
          })
        )
      );

      results.push(...batchResults.filter((r): r is ContentSelectionResult => r !== null));
    }

    return results;
  }
}

// Singleton instance
let gate1Instance: Gate1Selector | null = null;

export function getGate1Selector(config?: Partial<GatekeeperConfig>): Gate1Selector {
  if (!gate1Instance || config) {
    gate1Instance = new Gate1Selector(config);
  }
  return gate1Instance;
}
