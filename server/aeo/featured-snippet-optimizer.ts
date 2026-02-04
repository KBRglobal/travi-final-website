/**
 * Featured Snippet Optimizer
 * Optimize content for Google Featured Snippets (position zero)
 *
 * Snippet Types:
 * 1. Paragraph - Direct answer to "what is" questions
 * 2. List - Numbered or bulleted lists for "how to" or "best X"
 * 3. Table - Comparisons and data
 * 4. Video - YouTube clips (handled separately)
 */

import { db } from "../db";
import { contents, aeoAnswerCapsules } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { log } from "../lib/logger";

export type SnippetType = "paragraph" | "ordered_list" | "unordered_list" | "table";

export interface FeaturedSnippetOpportunity {
  type: SnippetType;
  targetQuery: string;
  currentContent: string;
  optimizedContent: string;
  confidence: number;
  changes: string[];
}

export interface SnippetAnalysis {
  contentId: string;
  hasAnswerCapsule: boolean;
  hasListFormat: boolean;
  hasTableFormat: boolean;
  opportunities: FeaturedSnippetOpportunity[];
  score: number;
  recommendations: string[];
}

/**
 * Featured Snippet Patterns
 */
const SNIPPET_PATTERNS = {
  paragraph: {
    triggers: ["what is", "what are", "who is", "define", "meaning of"],
    idealLength: { min: 40, max: 60 }, // words
    structure: "Direct definition followed by elaboration",
  },
  ordered_list: {
    triggers: ["how to", "steps to", "guide to", "process of", "ways to"],
    idealItems: { min: 3, max: 8 },
    structure: "Numbered steps with clear actions",
  },
  unordered_list: {
    triggers: ["best", "top", "types of", "examples of", "reasons"],
    idealItems: { min: 4, max: 10 },
    structure: "Bullet points with concise items",
  },
  table: {
    triggers: ["comparison", "vs", "versus", "difference between", "price"],
    structure: "2-4 columns, clear headers, concise cells",
  },
};

/**
 * PAA (People Also Ask) Patterns for FAQ optimization
 */
const PAA_PATTERNS = [
  "how much does",
  "is it worth",
  "what is the best time",
  "how long does",
  "do i need",
  "what should i",
  "can i",
  "is there",
  "where is",
  "when is",
  "why is",
  "how do i",
];

export class FeaturedSnippetOptimizer {
  /**
   * Analyze content for featured snippet opportunities
   */
  async analyzeContent(contentId: string): Promise<SnippetAnalysis> {
    const recommendations: string[] = [];
    const opportunities: FeaturedSnippetOpportunity[] = [];

    try {
      // Get content
      const content = await db.query.contents.findFirst({
        where: eq(contents.id, contentId),
      });

      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      // Get answer capsule
      const capsule = await db.query.aeoAnswerCapsules.findFirst({
        where: eq(aeoAnswerCapsules.contentId, contentId),
      });

      const hasAnswerCapsule = !!capsule?.capsuleText;

      // Analyze content blocks
      const blocks = (content.blocks as any[]) || [];
      const hasListFormat = blocks.some(
        b => b.type === "list" || b.type === "numbered-list" || b.type === "bullet-list"
      );
      const hasTableFormat = blocks.some(b => b.type === "table");

      // Generate recommendations
      if (!hasAnswerCapsule) {
        recommendations.push(
          "Add an Answer Capsule (40-60 word direct answer) for paragraph snippet optimization"
        );
      }

      if (!hasListFormat) {
        recommendations.push(
          "Consider adding a numbered list for 'how to' queries or bullet list for 'best' queries"
        );
      }

      // Check answer capsule quality for paragraph snippets
      if (capsule?.capsuleText) {
        const wordCount = capsule.capsuleText.split(/\s+/).length;
        const opportunity = this.analyzeParagraphSnippet(capsule.capsuleText, content.title);

        if (opportunity) {
          opportunities.push(opportunity);
        }

        if (wordCount < 40) {
          recommendations.push(
            `Answer capsule is too short (${wordCount} words). Aim for 40-60 words.`
          );
        } else if (wordCount > 70) {
          recommendations.push(
            `Answer capsule may be too long (${wordCount} words). Aim for 40-60 words.`
          );
        }
      }

      // Check for list opportunities
      const listOpportunity = this.analyzeListOpportunity(content.title, blocks);
      if (listOpportunity) {
        opportunities.push(listOpportunity);
      }

      // Calculate score
      let score = 0;
      if (hasAnswerCapsule) score += 40;
      if (hasListFormat) score += 25;
      if (hasTableFormat) score += 15;
      if (opportunities.length > 0) score += 20;

      return {
        contentId,
        hasAnswerCapsule,
        hasListFormat,
        hasTableFormat,
        opportunities,
        score: Math.min(100, score),
        recommendations,
      };
    } catch (error) {
      log.error("[FeaturedSnippetOptimizer] Analyze error:", error);
      return {
        contentId,
        hasAnswerCapsule: false,
        hasListFormat: false,
        hasTableFormat: false,
        opportunities: [],
        score: 0,
        recommendations: ["Error analyzing content"],
      };
    }
  }

  /**
   * Analyze paragraph snippet opportunity
   */
  private analyzeParagraphSnippet(
    capsuleText: string,
    title: string
  ): FeaturedSnippetOpportunity | null {
    const lowerTitle = title.toLowerCase();

    // Check if title matches paragraph trigger patterns
    const matchingTrigger = SNIPPET_PATTERNS.paragraph.triggers.find(t => lowerTitle.includes(t));

    if (!matchingTrigger) return null;

    const words = capsuleText.split(/\s+/);
    const wordCount = words.length;
    const changes: string[] = [];
    let optimizedContent = capsuleText;

    // Check and suggest improvements
    if (wordCount < SNIPPET_PATTERNS.paragraph.idealLength.min) {
      changes.push(`Expand answer to at least ${SNIPPET_PATTERNS.paragraph.idealLength.min} words`);
    }

    if (wordCount > SNIPPET_PATTERNS.paragraph.idealLength.max) {
      changes.push(`Condense answer to max ${SNIPPET_PATTERNS.paragraph.idealLength.max} words`);
      optimizedContent = words.slice(0, 60).join(" ") + "...";
    }

    // Check if starts with a definition pattern
    const startsWithDefinition =
      capsuleText.match(/^[A-Z][^.]+\s+is\s+/) || capsuleText.match(/^[A-Z][^.]+\s+are\s+/);

    if (!startsWithDefinition) {
      changes.push("Start with a clear definition (e.g., 'X is...')");
    }

    return {
      type: "paragraph",
      targetQuery: matchingTrigger,
      currentContent: capsuleText,
      optimizedContent,
      confidence: changes.length === 0 ? 90 : 60,
      changes,
    };
  }

  /**
   * Analyze list snippet opportunity
   */
  private analyzeListOpportunity(title: string, blocks: any[]): FeaturedSnippetOpportunity | null {
    const lowerTitle = title.toLowerCase();

    // Check for ordered list triggers (how to)
    const orderedTrigger = SNIPPET_PATTERNS.ordered_list.triggers.find(t => lowerTitle.includes(t));

    if (orderedTrigger) {
      const listBlock = blocks.find(b => b.type === "list" || b.type === "numbered-list");

      if (!listBlock) {
        return {
          type: "ordered_list",
          targetQuery: orderedTrigger,
          currentContent: "No numbered list found",
          optimizedContent: "Add a numbered list with 5-8 clear steps",
          confidence: 40,
          changes: [
            "Add a numbered list section",
            "Start each item with an action verb",
            "Keep items under 15 words each",
          ],
        };
      }
    }

    // Check for unordered list triggers (best, top)
    const unorderedTrigger = SNIPPET_PATTERNS.unordered_list.triggers.find(t =>
      lowerTitle.includes(t)
    );

    if (unorderedTrigger) {
      const listBlock = blocks.find(b => b.type === "list" || b.type === "bullet-list");

      if (!listBlock) {
        return {
          type: "unordered_list",
          targetQuery: unorderedTrigger,
          currentContent: "No bullet list found",
          optimizedContent: "Add a bullet list with 5-10 items",
          confidence: 40,
          changes: [
            "Add a bullet list section near the top",
            "Include the target keyword in the first item",
            "Keep items concise and parallel in structure",
          ],
        };
      }
    }

    return null;
  }

  /**
   * Generate optimized answer capsule for featured snippet
   */
  generateOptimizedCapsule(
    title: string,
    existingContent: string
  ): {
    capsule: string;
    type: SnippetType;
    confidence: number;
  } {
    const lowerTitle = title.toLowerCase();

    // Determine best snippet type
    let type: SnippetType = "paragraph";

    if (SNIPPET_PATTERNS.ordered_list.triggers.some(t => lowerTitle.includes(t))) {
      type = "ordered_list";
    } else if (SNIPPET_PATTERNS.unordered_list.triggers.some(t => lowerTitle.includes(t))) {
      type = "unordered_list";
    } else if (SNIPPET_PATTERNS.table.triggers.some(t => lowerTitle.includes(t))) {
      type = "table";
    }

    // Extract key sentences from content for paragraph type
    const sentences = existingContent.match(/[^.!?]+[.!?]+/g) || [];
    let capsule = "";

    if (type === "paragraph" && sentences.length > 0) {
      // Find the most informative sentences
      const scoredSentences = sentences.map(s => ({
        text: s.trim(),
        score: this.scoreSentenceForSnippet(s, title),
      }));

      scoredSentences.sort((a, b) => b.score - a.score);

      // Take top sentences up to ~50 words
      let wordCount = 0;
      const selectedSentences: string[] = [];

      for (const sentence of scoredSentences) {
        const words = sentence.text.split(/\s+/).length;
        if (wordCount + words <= 60) {
          selectedSentences.push(sentence.text);
          wordCount += words;
        }
        if (wordCount >= 40) break;
      }

      capsule = selectedSentences.join(" ");
    }

    return {
      capsule,
      type,
      confidence: capsule.length > 0 ? 70 : 30,
    };
  }

  /**
   * Score a sentence for snippet potential
   */
  private scoreSentenceForSnippet(sentence: string, title: string): number {
    let score = 0;
    const lower = sentence.toLowerCase();
    const titleWords = title.toLowerCase().split(/\s+/);

    // Contains title keywords
    for (const word of titleWords) {
      if (word.length > 3 && lower.includes(word)) {
        score += 10;
      }
    }

    // Definition pattern
    if (lower.match(/\b(is|are|means|refers to|defined as)\b/)) {
      score += 20;
    }

    // Specific numbers or data
    if (lower.match(/\d+/)) {
      score += 15;
    }

    // Too short or too long penalty
    const wordCount = sentence.split(/\s+/).length;
    if (wordCount < 10 || wordCount > 40) {
      score -= 10;
    }

    return score;
  }

  /**
   * Check PAA pattern coverage in FAQs
   */
  checkPAACoverage(faqs: Array<{ question: string; answer: string }>): {
    coverage: number;
    matchedPatterns: string[];
    missingPatterns: string[];
    suggestions: string[];
  } {
    const matchedPatterns: string[] = [];
    const missingPatterns: string[] = [];

    for (const pattern of PAA_PATTERNS) {
      const isMatched = faqs.some(faq => faq.question.toLowerCase().includes(pattern));

      if (isMatched) {
        matchedPatterns.push(pattern);
      } else {
        missingPatterns.push(pattern);
      }
    }

    const coverage = (matchedPatterns.length / PAA_PATTERNS.length) * 100;

    const suggestions = missingPatterns.slice(0, 5).map(pattern => {
      return `Add a FAQ starting with "${pattern}..." to improve PAA coverage`;
    });

    return {
      coverage,
      matchedPatterns,
      missingPatterns,
      suggestions,
    };
  }

  /**
   * Generate FAQ suggestions based on PAA patterns
   */
  generateFAQSuggestions(title: string, existingFAQs: Array<{ question: string }>): string[] {
    const suggestions: string[] = [];
    const existingPatterns = new Set(
      existingFAQs.flatMap(faq => PAA_PATTERNS.filter(p => faq.question.toLowerCase().includes(p)))
    );

    // Subject extraction from title
    const subject = title.replace(/^(the|a|an)\s+/i, "").split(/\s*[-–—:]\s*/)[0];

    for (const pattern of PAA_PATTERNS) {
      if (existingPatterns.has(pattern)) continue;

      let suggestion = "";
      switch (pattern) {
        case "how much does":
          suggestion = `How much does ${subject} cost?`;
          break;
        case "is it worth":
          suggestion = `Is ${subject} worth visiting?`;
          break;
        case "what is the best time":
          suggestion = `What is the best time to visit ${subject}?`;
          break;
        case "how long does":
          suggestion = `How long does ${subject} take?`;
          break;
        case "do i need":
          suggestion = `Do I need tickets for ${subject}?`;
          break;
        case "can i":
          suggestion = `Can I visit ${subject} with kids?`;
          break;
        default:
          suggestion = `${pattern.charAt(0).toUpperCase() + pattern.slice(1)} ${subject}?`;
      }

      suggestions.push(suggestion);

      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }
}

export const featuredSnippetOptimizer = new FeaturedSnippetOptimizer();
