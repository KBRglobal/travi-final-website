/**
 * AEO Content Validator - Validates content against AEO standards
 *
 * Validates:
 * - Answer Capsule quality and presence
 * - TL;DR block requirements
 * - Speakable content specification
 * - FAQ schema readiness
 * - AI-friendly heading structure
 * - Source attribution standards
 */

import { db } from "../db";
import { contents } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { PageClassifier, PageClassification } from "./page-classifier";

export interface AEOValidationResult {
  contentId: string;
  isValid: boolean;
  aeoScore: number;
  checks: AEOCheck[];
  blockingIssues: string[];
  recommendations: string[];
  aiIndexEligible: boolean;
}

export interface AEOCheck {
  name: string;
  passed: boolean;
  required: boolean;
  score: number;
  maxScore: number;
  details: string;
}

// AEO requirements by page classification
const AEO_REQUIREMENTS: Record<
  PageClassification,
  {
    minAeoScore: number;
    answerCapsuleRequired: boolean;
    tldrRequired: boolean;
    minFaqCount: number;
    speakableRequired: boolean;
    questionHeadingsMin: number;
  }
> = {
  MONEY_PAGE: {
    minAeoScore: 50,
    answerCapsuleRequired: true,
    tldrRequired: false,
    minFaqCount: 6,
    speakableRequired: false,
    questionHeadingsMin: 3,
  },
  INFORMATIONAL: {
    minAeoScore: 60,
    answerCapsuleRequired: true,
    tldrRequired: true,
    minFaqCount: 8,
    speakableRequired: true,
    questionHeadingsMin: 4,
  },
  GUIDE: {
    minAeoScore: 70,
    answerCapsuleRequired: true,
    tldrRequired: true,
    minFaqCount: 10,
    speakableRequired: true,
    questionHeadingsMin: 5,
  },
  EVERGREEN: {
    minAeoScore: 60,
    answerCapsuleRequired: true,
    tldrRequired: true,
    minFaqCount: 6,
    speakableRequired: true,
    questionHeadingsMin: 3,
  },
  NEWS: {
    minAeoScore: 30,
    answerCapsuleRequired: false,
    tldrRequired: false,
    minFaqCount: 3,
    speakableRequired: false,
    questionHeadingsMin: 2,
  },
  EXPERIMENTAL: {
    minAeoScore: 0,
    answerCapsuleRequired: false,
    tldrRequired: false,
    minFaqCount: 0,
    speakableRequired: false,
    questionHeadingsMin: 0,
  },
  SEO_RISK: {
    minAeoScore: 0,
    answerCapsuleRequired: false,
    tldrRequired: false,
    minFaqCount: 0,
    speakableRequired: false,
    questionHeadingsMin: 0,
  },
};

export class AEOContentValidator {
  private classifier: PageClassifier;

  constructor() {
    this.classifier = new PageClassifier();
  }

  /**
   * Validate content against AEO standards
   */
  async validateContent(contentId: string): Promise<AEOValidationResult> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    // Get classification for requirements
    const classification = await this.classifier.classifyContent(contentId);
    const requirements = AEO_REQUIREMENTS[classification.classification];

    const checks: AEOCheck[] = [];
    const blockingIssues: string[] = [];
    const recommendations: string[] = [];

    // 1. Answer Capsule Check
    const answerCapsuleCheck = this.checkAnswerCapsule(content, requirements.answerCapsuleRequired);
    checks.push(answerCapsuleCheck);
    if (!answerCapsuleCheck.passed && answerCapsuleCheck.required) {
      blockingIssues.push("Missing or invalid answer capsule");
    }

    // 2. TL;DR Block Check
    const tldrCheck = this.checkTLDR(content, requirements.tldrRequired);
    checks.push(tldrCheck);
    if (!tldrCheck.passed && tldrCheck.required) {
      blockingIssues.push("Missing TL;DR block");
    }

    // 3. FAQ Schema Check
    const faqCheck = this.checkFAQSchema(content, requirements.minFaqCount);
    checks.push(faqCheck);
    if (!faqCheck.passed && requirements.minFaqCount > 0) {
      blockingIssues.push(
        `Insufficient FAQs (need ${requirements.minFaqCount}, have ${(content as any).faqCount || 0})`
      );
    }

    // 4. Speakable Content Check
    const speakableCheck = this.checkSpeakableContent(content, requirements.speakableRequired);
    checks.push(speakableCheck);
    if (!speakableCheck.passed && speakableCheck.required) {
      blockingIssues.push("Missing speakable content markup");
    }

    // 5. Question Headings Check
    const headingsCheck = this.checkQuestionHeadings(content, requirements.questionHeadingsMin);
    checks.push(headingsCheck);
    if (!headingsCheck.passed) {
      recommendations.push(
        `Add more question-based H2 headings (need ${requirements.questionHeadingsMin})`
      );
    }

    // 6. Definition Opening Check
    const definitionCheck = this.checkDefinitionOpening(content);
    checks.push(definitionCheck);
    if (!definitionCheck.passed && classification.classification === "INFORMATIONAL") {
      recommendations.push("First paragraph should define the topic");
    }

    // 7. Confidence Score Check
    const confidenceCheck = this.checkConfidenceScore(content);
    checks.push(confidenceCheck);
    if (!confidenceCheck.passed) {
      recommendations.push("Improve content confidence with verified sources");
    }

    // 8. Citation Readiness Check
    const citationCheck = this.checkCitationReadiness(content);
    checks.push(citationCheck);
    if (!citationCheck.passed) {
      recommendations.push("Add source attributions for statistics and claims");
    }

    // 9. Word Count Check
    const wordCountCheck = this.checkWordCount(content);
    checks.push(wordCountCheck);
    if (!wordCountCheck.passed) {
      blockingIssues.push("Content too thin for AEO indexing (< 500 words)");
    }

    // 10. AI-Friendly Format Check
    const formatCheck = this.checkAIFriendlyFormat(content);
    checks.push(formatCheck);
    if (!formatCheck.passed) {
      recommendations.push("Improve content structure with shorter paragraphs and bullet points");
    }

    // Calculate total AEO score
    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    const maxScore = checks.reduce((sum, check) => sum + check.maxScore, 0);
    const aeoScore = Math.round((totalScore / maxScore) * 100);

    // Determine if valid and AI-indexable
    const isValid = blockingIssues.length === 0 && aeoScore >= requirements.minAeoScore;
    const aiIndexEligible =
      isValid &&
      classification.classification !== "SEO_RISK" &&
      classification.classification !== "EXPERIMENTAL";

    return {
      contentId,
      isValid,
      aeoScore,
      checks,
      blockingIssues,
      recommendations,
      aiIndexEligible,
    };
  }

  /**
   * Check answer capsule presence and quality
   */
  private checkAnswerCapsule(content: any, required: boolean): AEOCheck {
    const capsule = content.answerCapsule || "";
    const wordCount = capsule.split(/\s+/).filter((w: string) => w.length > 0).length;

    let score = 0;
    let details = "";

    if (!capsule) {
      details = "No answer capsule present";
    } else if (wordCount < 40) {
      score = 5;
      details = `Answer capsule too short (${wordCount} words, need 40-60)`;
    } else if (wordCount > 60) {
      score = 7;
      details = `Answer capsule too long (${wordCount} words, need 40-60)`;
    } else {
      score = 10;
      details = `Valid answer capsule (${wordCount} words)`;
    }

    return {
      name: "Answer Capsule",
      passed: score >= 7,
      required,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check TL;DR block
   */
  private checkTLDR(content: any, required: boolean): AEOCheck {
    const tldr = content.tldrBlock || content.tldr || "";
    const items =
      (tldr.match(/<li>/gi) || []).length ||
      tldr.split("\n").filter((l: string) => l.trim().startsWith("-")).length;

    let score = 0;
    let details = "";

    if (!tldr) {
      details = "No TL;DR block present";
    } else if (items < 5) {
      score = 5;
      details = `TL;DR has only ${items} items (need 5)`;
    } else {
      score = 10;
      details = `Valid TL;DR block (${items} items)`;
    }

    return {
      name: "TL;DR Block",
      passed: score >= 7,
      required,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check FAQ schema readiness
   */
  private checkFAQSchema(content: any, minFaqCount: number): AEOCheck {
    const faqCount = content.faqCount || 0;
    const hasFAQSchema = content.hasFAQSchema || content.schemaTypes?.includes("FAQPage");

    let score = 0;
    let details = "";

    if (faqCount === 0) {
      details = "No FAQs present";
    } else if (faqCount < minFaqCount) {
      score = Math.round((faqCount / minFaqCount) * 10);
      details = `Has ${faqCount} FAQs (need ${minFaqCount})`;
    } else if (!hasFAQSchema) {
      score = 7;
      details = `Has ${faqCount} FAQs but missing FAQPage schema`;
    } else {
      score = 10;
      details = `Valid FAQ section (${faqCount} FAQs with schema)`;
    }

    return {
      name: "FAQ Schema",
      passed: score >= 7,
      required: minFaqCount > 0,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check speakable content markup
   */
  private checkSpeakableContent(content: any, required: boolean): AEOCheck {
    const hasSpeakable = content.hasSpeakable || content.speakableSelectors?.length > 0;
    const speakableLength = content.speakableContentLength || 0;

    let score = 0;
    let details = "";

    if (!hasSpeakable) {
      details = "No speakable content markup";
    } else if (speakableLength > 300) {
      score = 7;
      details = `Speakable content too long (${speakableLength} chars, max 300)`;
    } else if (speakableLength < 50) {
      score = 5;
      details = `Speakable content too short (${speakableLength} chars)`;
    } else {
      score = 10;
      details = `Valid speakable content (${speakableLength} chars)`;
    }

    return {
      name: "Speakable Content",
      passed: score >= 7,
      required,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check question-based headings
   */
  private checkQuestionHeadings(content: any, minCount: number): AEOCheck {
    const headings = content.h2Headings || [];
    const questionHeadings = headings.filter(
      (h: string) =>
        h.endsWith("?") ||
        h.toLowerCase().startsWith("what") ||
        h.toLowerCase().startsWith("how") ||
        h.toLowerCase().startsWith("when") ||
        h.toLowerCase().startsWith("where") ||
        h.toLowerCase().startsWith("why") ||
        h.toLowerCase().startsWith("who")
    );

    const count = questionHeadings.length;
    let score = 0;
    let details = "";

    if (count === 0) {
      details = "No question-based H2 headings";
    } else if (count < minCount) {
      score = Math.round((count / minCount) * 10);
      details = `Has ${count} question headings (need ${minCount})`;
    } else {
      score = 10;
      details = `Good question-based headings (${count})`;
    }

    return {
      name: "Question Headings",
      passed: score >= 7,
      required: minCount > 0,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check if first paragraph defines the topic
   */
  private checkDefinitionOpening(content: any): AEOCheck {
    const firstParagraph = content.firstParagraph || content.excerpt || "";
    const hasDefinition = /\b(is|are|refers to|means|defined as)\b/i.test(firstParagraph);
    const hasTopicMention = firstParagraph
      .toLowerCase()
      .includes((content.primaryKeyword || "").toLowerCase());

    let score = 0;
    let details = "";

    if (!firstParagraph) {
      details = "No opening paragraph found";
    } else if (hasDefinition && hasTopicMention) {
      score = 10;
      details = "Good definition opening with topic mention";
    } else if (hasDefinition || hasTopicMention) {
      score = 6;
      details = "Partial definition opening";
    } else {
      details = "Opening paragraph does not define the topic";
    }

    return {
      name: "Definition Opening",
      passed: score >= 6,
      required: false,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check content confidence score
   */
  private checkConfidenceScore(content: any): AEOCheck {
    const confidence = content.confidenceScore || 0;

    let score = 0;
    let details = "";

    if (confidence >= 90) {
      score = 10;
      details = "VERIFIED - All facts from authoritative sources";
    } else if (confidence >= 70) {
      score = 8;
      details = "HIGH confidence - Generally accurate";
    } else if (confidence >= 50) {
      score = 5;
      details = "MEDIUM confidence - Some unverified claims";
    } else {
      details = `LOW confidence (${confidence}) - Significant uncertainty`;
    }

    return {
      name: "Confidence Score",
      passed: score >= 7,
      required: false,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check citation readiness
   */
  private checkCitationReadiness(content: any): AEOCheck {
    const hasCitations = content.citationCount > 0 || content.hasSourceAttribution;
    const citationCount = content.citationCount || 0;

    let score = 0;
    let details = "";

    if (citationCount >= 3) {
      score = 10;
      details = `Good citation coverage (${citationCount} sources)`;
    } else if (citationCount >= 1) {
      score = 6;
      details = `Limited citations (${citationCount} source${citationCount > 1 ? "s" : ""})`;
    } else if (hasCitations) {
      score = 4;
      details = "Has attribution but no formal citations";
    } else {
      details = "No source attributions";
    }

    return {
      name: "Citation Readiness",
      passed: score >= 6,
      required: false,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check word count for AEO
   */
  private checkWordCount(content: any): AEOCheck {
    const wordCount = content.wordCount || 0;

    let score = 0;
    let details = "";

    if (wordCount >= 1500) {
      score = 10;
      details = `Excellent content length (${wordCount} words)`;
    } else if (wordCount >= 1000) {
      score = 8;
      details = `Good content length (${wordCount} words)`;
    } else if (wordCount >= 500) {
      score = 5;
      details = `Minimum content length (${wordCount} words)`;
    } else {
      details = `Content too thin (${wordCount} words, need 500+)`;
    }

    return {
      name: "Word Count",
      passed: wordCount >= 500,
      required: true,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Check AI-friendly format
   */
  private checkAIFriendlyFormat(content: any): AEOCheck {
    const avgParagraphLength = content.avgParagraphLength || 0;
    const hasBulletLists = content.bulletListCount > 0;
    const hasNumberedLists = content.numberedListCount > 0;
    const hasTables = content.tableCount > 0;

    let score = 0;
    let details = "";

    // Short paragraphs are AI-friendly
    if (avgParagraphLength <= 100) {
      score += 3;
    } else if (avgParagraphLength <= 150) {
      score += 2;
    }

    // Lists are AI-friendly
    if (hasBulletLists || hasNumberedLists) {
      score += 4;
    }

    // Tables are AI-friendly
    if (hasTables) {
      score += 3;
    }

    if (score >= 7) {
      details = "Good AI-friendly formatting";
    } else if (score >= 4) {
      details = "Partial AI-friendly formatting";
    } else {
      details = "Content needs better structure for AI extraction";
    }

    return {
      name: "AI-Friendly Format",
      passed: score >= 5,
      required: false,
      score,
      maxScore: 10,
      details,
    };
  }

  /**
   * Batch validate all content
   */
  async validateAllContent(): Promise<AEOValidationResult[]> {
    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, "published"),
    });

    const results: AEOValidationResult[] = [];

    for (const content of allContent) {
      try {
        const result = await this.validateContent(content.id);
        results.push(result);
      } catch (error) {}
    }

    return results;
  }

  /**
   * Get content needing AEO enhancement
   */
  async getContentNeedingEnhancement(): Promise<
    { contentId: string; issues: string[]; priority: "HIGH" | "MEDIUM" | "LOW" }[]
  > {
    const results = await this.validateAllContent();

    return results
      .filter(r => !r.isValid || r.recommendations.length > 0)
      .map(r => ({
        contentId: r.contentId,
        issues: [...r.blockingIssues, ...r.recommendations],
        priority:
          r.blockingIssues.length > 0
            ? ("HIGH" as const)
            : r.aeoScore < 50
              ? ("MEDIUM" as const)
              : ("LOW" as const),
      }))
      .sort((a, b) => {
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }
}
