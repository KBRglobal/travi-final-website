/**
 * Gate 2: Article Approver
 * Reviews written articles and decides: approve, revise, or reject
 *
 * Responsibilities:
 * - Quality assessment
 * - Issue identification
 * - Correction instructions for revision
 * - Final approval for publication
 */

import { EngineRegistry, generateWithEngine } from "../../services/engine-registry";
import {
  ArticleApprovalInput,
  ArticleApprovalResult,
  QualityIssue,
  CorrectionInstruction,
  ApprovalDecision,
  GatekeeperConfig,
  DEFAULT_GATEKEEPER_CONFIG,
} from "./types";
import { logger } from "../../lib/logger";

const GATE2_SYSTEM_PROMPT = `You are a senior travel content editor for TRAVI, a premium travel platform.
Your job is to review AI-generated articles and decide if they're ready for publication.

## Quality Standards

### Must-Have (Critical - will reject if missing)
- Accurate facts (prices, distances, dates, names)
- No AI-sounding phrases ("nestled", "vibrant tapestry", "embark on a journey")
- Clear, natural language
- Proper structure with introduction, body, conclusion
- Actionable information for travelers

### Should-Have (Major - will require revision)
- Engaging opening hook
- Sensory details (sights, sounds, smells, textures)
- Local insider tips
- Practical logistics (how to get there, costs, timings)
- SEO-optimized title and meta description
- Answer-ready FAQ section

### Nice-to-Have (Minor - note but don't reject)
- Cultural context
- Personal recommendations
- Alternative options
- Seasonal considerations

## Decision Guidelines

**APPROVE** if:
- Quality score >= 85
- No critical issues
- Minor issues can be accepted

**REVISE** if:
- Quality score 60-84
- Fixable issues identified
- Worth the revision effort
- Max 3 revision rounds

**REJECT** if:
- Quality score < 60
- Fundamental problems (wrong topic, completely off-brand)
- Not worth fixing
- Already revised 3+ times

## Revision Instructions
When requesting revision, provide SPECIFIC, ACTIONABLE corrections:
- BAD: "Make it more engaging"
- GOOD: "Add a sensory description in paragraph 2. Instead of 'The market is busy', describe the sounds of vendors calling and the smell of spices."

Be demanding but constructive. We want excellence, not perfection paralysis.

Respond in JSON format only.`;

const GATE2_REVIEW_PROMPT = `Review this travel article for publication:

**Title:** {title}
**Meta Title:** {metaTitle}
**Meta Description:** {metaDescription}

**Summary/Answer Capsule:**
{summary}

**Word Count:** {wordCount}
**Writer:** {writerId}
**Previous Quality Score:** {quality108Score}
**Revision #:** {revisionCount}

**Article Content:**
{content}

---

Evaluate and respond with this exact JSON structure:
{
  "overallQuality": <0-100>,
  "decision": "approve" | "revise" | "reject",
  "issues": [
    {
      "category": "accuracy" | "style" | "seo" | "aeo" | "structure" | "engagement" | "sensitivity",
      "severity": "critical" | "major" | "minor",
      "description": "<what's wrong>",
      "location": "<where in the article>",
      "suggestion": "<how to fix>"
    }
  ],
  "corrections": [
    {
      "section": "<which section to fix>",
      "issue": "<the problem>",
      "instruction": "<specific action to take>",
      "priority": "must_fix" | "should_fix" | "nice_to_have"
    }
  ],
  "publicationReady": true | false,
  "reasoning": "<2-3 sentences explaining your decision>",
  "editorNotes": "<notes for the record>"
}

Be thorough but fair. If it's good enough to publish, approve it. Don't nitpick.`;

export class Gate2Approver {
  private readonly config: GatekeeperConfig;

  constructor(config: Partial<GatekeeperConfig> = {}) {
    this.config = { ...DEFAULT_GATEKEEPER_CONFIG, ...config };
  }

  async review(
    input: ArticleApprovalInput,
    revisionCount: number = 0
  ): Promise<ArticleApprovalResult> {
    const startTime = Date.now();

    logger.info(
      { title: input.title.substring(0, 50), revisionCount },
      "[Gate2] Reviewing article"
    );

    try {
      // Build the review prompt
      const prompt = this.buildPrompt(input, revisionCount);

      // Call LLM for review
      const response = await this.callLLM(prompt);

      // Parse and validate response
      const review = this.parseResponse(response);

      // Override decision based on config thresholds
      const decision = this.finalizeDecision(review, revisionCount);

      // Build revision prompt if needed
      let revisionPrompt: string | undefined;
      if (decision === "revise" && review.corrections?.length > 0) {
        revisionPrompt = this.buildRevisionPrompt(input, review.corrections);
      }

      const result: ArticleApprovalResult = {
        contentId: input.contentId,
        decision,
        overallQuality: review.overallQuality,
        issues: review.issues || [],
        corrections: decision === "revise" ? review.corrections : undefined,
        revisionPrompt,
        maxRevisions: this.config.maxRevisionsAllowed,
        publicationReady: decision === "approve",
        reasoning: review.reasoning,
        editorNotes: review.editorNotes || "",
        evaluatedAt: new Date(),
        revisionCount,
        processingTimeMs: Date.now() - startTime,
      };

      logger.info({ quality: review.overallQuality, decision }, "[Gate2] Review complete");

      return result;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : "Unknown" },
        "[Gate2] Review failed"
      );
      throw error;
    }
  }

  private buildPrompt(input: ArticleApprovalInput, revisionCount: number): string {
    // Extract text content from blocks
    const contentText = this.extractContentText(input.blocks);

    return GATE2_REVIEW_PROMPT.replace("{title}", input.title)
      .replace("{metaTitle}", input.metaTitle || input.title)
      .replace("{metaDescription}", input.metaDescription || "")
      .replace("{summary}", input.answerCapsule || input.summary || "")
      .replace("{wordCount}", String(input.wordCount || 0))
      .replace("{writerId}", input.writerId || "Unknown")
      .replace("{quality108Score}", String(input.quality108Score || "N/A"))
      .replace("{revisionCount}", String(revisionCount))
      .replace("{content}", contentText);
  }

  private extractContentText(blocks: any[]): string {
    if (!blocks || !Array.isArray(blocks)) {
      return "No content available";
    }

    const textParts: string[] = [];

    for (const block of blocks) {
      const extracted = this.extractBlockText(block);
      if (extracted) textParts.push(extracted);
    }

    // Limit content length for LLM context
    const fullText = textParts.join("\n\n");
    if (fullText.length > 15000) {
      return fullText.substring(0, 15000) + "\n\n[Content truncated for review...]";
    }

    return fullText;
  }

  private extractBlockText(block: any): string | null {
    switch (block.type) {
      case "paragraph":
        return block.data?.text || null;
      case "text":
        return block.data?.content || null;
      case "heading":
        return block.data?.text ? `\n## ${block.data.text}\n` : null;
      case "list":
        return block.data?.items
          ? block.data.items.map((item: string) => `- ${item}`).join("\n")
          : null;
      case "faq":
        return block.data?.items
          ? block.data.items.map((faq: any) => `Q: ${faq.question}\nA: ${faq.answer}\n`).join("")
          : null;
      default:
        return null;
    }
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
        throw new Error("No available engine for Gate2 review");
      }

      triedEngines.add(engine.id);

      if (!engine.isHealthy) {
        continue;
      }

      try {
        const response = await generateWithEngine(engine, GATE2_SYSTEM_PROMPT, prompt);
        EngineRegistry.reportSuccess(engine.id);
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        EngineRegistry.reportError(engine.id, errorMsg);
        logger.warn({ engineId: engine.id, error: errorMsg }, "[Gate2] Engine failed, trying next");
        continue;
      }
    }

    throw new Error("All LLM engines failed for Gate2 review");
  }

  private parseResponse(response: string): any {
    let jsonStr = response;

    const jsonMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(response);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const objectMatch = /\{[\s\S]*\}/.exec(jsonStr);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    try {
      return JSON.parse(jsonStr);
    } catch {
      logger.error("[Gate2] Failed to parse LLM response");
      throw new Error("Failed to parse Gate2 review response");
    }
  }

  private finalizeDecision(review: any, revisionCount: number): ApprovalDecision {
    const quality = review.overallQuality || 0;

    // Auto-reject if quality too low
    if (quality < this.config.autoRejectBelowQuality) {
      return "reject";
    }

    // Auto-reject if max revisions exceeded
    if (
      revisionCount >= this.config.maxRevisionsAllowed &&
      quality < this.config.minQualityForApproval
    ) {
      logger.warn({ revisionCount }, "[Gate2] Max revisions reached, rejecting");
      return "reject";
    }

    // Approve if quality meets threshold
    if (quality >= this.config.minQualityForApproval) {
      // Check for critical issues
      const criticalIssues = (review.issues || []).filter(
        (i: QualityIssue) => i.severity === "critical"
      );
      if (criticalIssues.length === 0) {
        return "approve";
      }
      // Has critical issues, needs revision even with good score
      return "revise";
    }

    // Quality between reject and approve thresholds
    return "revise";
  }

  private buildRevisionPrompt(
    original: ArticleApprovalInput,
    corrections: CorrectionInstruction[]
  ): string {
    const mustFix = corrections.filter(c => c.priority === "must_fix");
    const shouldFix = corrections.filter(c => c.priority === "should_fix");

    let prompt = `REVISION REQUIRED for article: "${original.title}"

The editor has reviewed your article and identified issues that need to be fixed.

## MUST FIX (Critical - article will be rejected without these fixes):
${
  mustFix.length > 0
    ? mustFix
        .map((c, i) => `${i + 1}. **${c.section}**: ${c.issue}\n   → ${c.instruction}`)
        .join("\n\n")
    : "None"
}

## SHOULD FIX (Important - significantly improves quality):
${
  shouldFix.length > 0
    ? shouldFix
        .map((c, i) => `${i + 1}. **${c.section}**: ${c.issue}\n   → ${c.instruction}`)
        .join("\n\n")
    : "None"
}

## Original Article Summary:
${original.summary || original.metaDescription || ""}

## Instructions:
1. Address ALL "must fix" items
2. Address as many "should fix" items as possible
3. Maintain the same overall structure and tone
4. Keep the word count similar (currently: ${original.wordCount})
5. Do not introduce new issues while fixing existing ones

Please rewrite the article with these corrections applied.`;

    return prompt;
  }

  /**
   * Quick quality check without full review
   * Used for batch processing or pre-screening
   */
  async quickCheck(input: ArticleApprovalInput): Promise<{
    estimatedQuality: number;
    hasObviousIssues: boolean;
    recommendation: "likely_pass" | "needs_review" | "likely_fail";
  }> {
    // Simple heuristics for quick check
    const issues: string[] = [];

    // Check word count
    if (input.wordCount < 500) {
      issues.push("Too short");
    }
    if (input.wordCount > 3000) {
      issues.push("Too long");
    }

    // Check meta
    if (!input.metaTitle || input.metaTitle.length < 30) {
      issues.push("Meta title too short or missing");
    }
    if (!input.metaDescription || input.metaDescription.length < 100) {
      issues.push("Meta description too short or missing");
    }

    // Check for AI patterns in title
    const aiPatterns = ["nestled", "vibrant", "tapestry", "embark", "unveil", "discover the"];
    const titleLower = input.title.toLowerCase();
    if (aiPatterns.some(p => titleLower.includes(p))) {
      issues.push("AI-sounding title");
    }

    // Use quality108 score if available
    let estimatedQuality = 70; // Base estimate
    if (input.quality108Score) {
      estimatedQuality = Math.round((input.quality108Score * 100) / 108);
    }

    // Adjust based on issues
    estimatedQuality -= issues.length * 10;
    estimatedQuality = Math.max(0, Math.min(100, estimatedQuality));

    let recommendation: "likely_pass" | "needs_review" | "likely_fail";
    if (estimatedQuality >= 80) {
      recommendation = "likely_pass";
    } else if (estimatedQuality >= 50) {
      recommendation = "needs_review";
    } else {
      recommendation = "likely_fail";
    }

    return {
      estimatedQuality,
      hasObviousIssues: issues.length > 0,
      recommendation,
    };
  }
}

// Singleton instance
let gate2Instance: Gate2Approver | null = null;

export function getGate2Approver(config?: Partial<GatekeeperConfig>): Gate2Approver {
  if (!gate2Instance || config) {
    gate2Instance = new Gate2Approver(config);
  }
  return gate2Instance;
}
