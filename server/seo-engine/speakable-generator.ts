/**
 * Speakable Generator
 * Generate Speakable schema for voice assistant optimization
 *
 * Speakable identifies sections of a page that are especially suited
 * for text-to-speech conversion (Google Assistant, Alexa, Siri)
 */

import { db } from "../db";
import { contents, aeoAnswerCapsules } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { log } from "../lib/logger";

export interface SpeakableSection {
  cssSelector: string;
  content: string;
  type: "answer-capsule" | "key-facts" | "summary" | "definition" | "faq-answer";
  priority: number;
  characterCount: number;
}

export interface SpeakableSchema {
  "@type": "WebPage";
  "@id": string;
  speakable: {
    "@type": "SpeakableSpecification";
    cssSelector: string[];
    xpath?: string[];
  };
  mainContentOfPage?: {
    "@type": "WebPageElement";
    cssSelector: string;
    text: string;
  };
}

export interface SpeakableAnalysis {
  contentId: string;
  hasSpeakableContent: boolean;
  sections: SpeakableSection[];
  schema: SpeakableSchema | null;
  score: number;
  recommendations: string[];
}

/**
 * Speakable Content Guidelines
 */
const SPEAKABLE_GUIDELINES = {
  // Ideal character counts for TTS
  answerCapsule: { min: 100, max: 300 },
  keyFacts: { min: 50, max: 200 },
  summary: { min: 100, max: 400 },

  // CSS selectors for speakable content
  defaultSelectors: [
    ".answer-capsule",
    ".quick-answer",
    ".key-facts",
    ".content-summary",
    ".definition",
  ],

  // Content that should NOT be speakable
  excludePatterns: [
    "click here",
    "read more",
    "see also",
    "advertisement",
    "sponsored",
    "share this",
    "follow us",
  ],
};

export class SpeakableGenerator {
  /**
   * Analyze content for speakable sections
   */
  async analyzeContent(contentId: string, baseUrl: string): Promise<SpeakableAnalysis> {
    const recommendations: string[] = [];
    const sections: SpeakableSection[] = [];

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

      // Analyze answer capsule
      if (capsule?.capsuleText) {
        const capsuleSection = this.analyzeSpeakableSection(
          capsule.capsuleText,
          ".answer-capsule",
          "answer-capsule"
        );

        if (capsuleSection) {
          sections.push(capsuleSection);
        }
      } else {
        recommendations.push("Add an Answer Capsule for voice assistant optimization");
      }

      // Analyze content blocks for speakable sections
      const blocks = (content.blocks as any[]) || [];
      const keyFacts = this.extractKeyFacts(blocks);

      if (keyFacts) {
        sections.push(keyFacts);
      }

      // Analyze meta description as fallback summary
      if (content.metaDescription && sections.length === 0) {
        const metaSection = this.analyzeSpeakableSection(
          content.metaDescription,
          ".meta-summary",
          "summary"
        );

        if (metaSection) {
          sections.push(metaSection);
        }
      }

      // Generate schema if we have speakable content
      let schema: SpeakableSchema | null = null;

      if (sections.length > 0) {
        schema = this.generateSpeakableSchema(
          contentId,
          content.type,
          content.slug || "",
          sections,
          baseUrl
        );
      }

      // Calculate score
      let score = 0;
      if (capsule?.capsuleText) score += 50;
      if (keyFacts) score += 25;
      if (sections.length >= 2) score += 15;
      if (schema) score += 10;

      // Add recommendations
      if (!keyFacts) {
        recommendations.push("Add a 'Key Facts' section with bullet points for voice readability");
      }

      if (sections.length < 2) {
        recommendations.push("Add more concise, speakable sections (summaries, definitions)");
      }

      const hasSpeakableContent = sections.length > 0;

      return {
        contentId,
        hasSpeakableContent,
        sections,
        schema,
        score: Math.min(100, score),
        recommendations,
      };
    } catch (error) {
      log.error("[SpeakableGenerator] Analyze error:", error);
      return {
        contentId,
        hasSpeakableContent: false,
        sections: [],
        schema: null,
        score: 0,
        recommendations: ["Error analyzing content for speakable sections"],
      };
    }
  }

  /**
   * Analyze a section for speakable suitability
   */
  private analyzeSpeakableSection(
    text: string,
    cssSelector: string,
    type: SpeakableSection["type"]
  ): SpeakableSection | null {
    // Check for excluded patterns
    const lowerText = text.toLowerCase();
    for (const pattern of SPEAKABLE_GUIDELINES.excludePatterns) {
      if (lowerText.includes(pattern)) {
        return null;
      }
    }

    const characterCount = text.length;

    // Check length guidelines
    const guidelines =
      type === "answer-capsule"
        ? SPEAKABLE_GUIDELINES.answerCapsule
        : type === "key-facts"
          ? SPEAKABLE_GUIDELINES.keyFacts
          : SPEAKABLE_GUIDELINES.summary;

    if (characterCount < guidelines.min || characterCount > guidelines.max * 1.5) {
      return null;
    }

    // Calculate priority based on type
    let priority = 1;
    if (type === "answer-capsule") priority = 1;
    else if (type === "key-facts") priority = 2;
    else if (type === "summary") priority = 3;
    else if (type === "definition") priority = 4;
    else priority = 5;

    return {
      cssSelector,
      content: text,
      type,
      priority,
      characterCount,
    };
  }

  /**
   * Extract key facts from content blocks
   */
  private extractKeyFacts(blocks: any[]): SpeakableSection | null {
    // Look for list blocks or key facts section
    for (const block of blocks) {
      // Check for key facts heading
      if (block.type === "heading" && block.content?.toLowerCase().includes("key fact")) {
        // Get the next list block
        const index = blocks.indexOf(block);
        const nextBlock = blocks[index + 1];

        if (nextBlock?.type === "list" && nextBlock.items) {
          const factsText = nextBlock.items
            .slice(0, 5)
            .map((item: any) => item.content || item.text || item)
            .join(". ");

          if (factsText.length > 50) {
            return this.analyzeSpeakableSection(factsText, ".key-facts", "key-facts");
          }
        }
      }

      // Check for bullet lists that might be key facts
      if (block.type === "list" && block.items?.length >= 3) {
        const items = block.items.slice(0, 5);
        const factsText = items.map((item: any) => item.content || item.text || item).join(". ");

        if (factsText.length >= 100 && factsText.length <= 400) {
          return this.analyzeSpeakableSection(factsText, ".key-facts-list", "key-facts");
        }
      }
    }

    return null;
  }

  /**
   * Generate Speakable schema markup
   */
  private generateSpeakableSchema(
    contentId: string,
    contentType: string,
    slug: string,
    sections: SpeakableSection[],
    baseUrl: string
  ): SpeakableSchema {
    const url = `${baseUrl}/${contentType}/${slug}`;

    // Sort sections by priority
    const sortedSections = [...sections].sort((a, b) => a.priority - b.priority);

    // Get CSS selectors
    const cssSelectors = sortedSections.map(s => s.cssSelector);

    // Get primary speakable content
    const primarySection = sortedSections[0];

    return {
      "@type": "WebPage",
      "@id": `${url}#speakable`,
      speakable: {
        "@type": "SpeakableSpecification",
        cssSelector: cssSelectors,
      },
      mainContentOfPage: primarySection
        ? {
            "@type": "WebPageElement",
            cssSelector: primarySection.cssSelector,
            text: primarySection.content,
          }
        : undefined,
    };
  }

  /**
   * Generate optimized speakable text from raw content
   */
  optimizeForSpeech(text: string): string {
    // Clean up for TTS
    let optimized = text
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, "")
      // Remove email addresses
      .replace(/[^\s]+@[^\s]+/g, "")
      // Expand common abbreviations
      .replace(/\be\.g\./gi, "for example")
      .replace(/\bi\.e\./gi, "that is")
      .replace(/\betc\./gi, "and so on")
      .replace(/\bvs\./gi, "versus")
      .replace(/\bDr\./gi, "Doctor")
      .replace(/\bMr\./gi, "Mister")
      .replace(/\bMrs\./gi, "Missus")
      .replace(/\bMs\./gi, "Miss")
      // Convert numbers to words for small numbers
      .replace(/\b1\b/g, "one")
      .replace(/\b2\b/g, "two")
      .replace(/\b3\b/g, "three")
      .replace(/\b4\b/g, "four")
      .replace(/\b5\b/g, "five")
      // Add pauses after sentences
      .replace(/\.\s+/g, ". ")
      // Remove extra whitespace
      .replace(/\s+/g, " ")
      .trim();

    return optimized;
  }

  /**
   * Validate speakable content quality
   */
  validateSpeakableQuality(text: string): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Check length
    if (text.length < 100) {
      issues.push("Content too short for voice (minimum 100 characters)");
      score -= 30;
    } else if (text.length > 500) {
      issues.push("Content may be too long for voice (recommended max 500 characters)");
      score -= 15;
    }

    // Check for problematic patterns
    if (/https?:\/\//.test(text)) {
      issues.push("Contains URLs which don't read well");
      score -= 10;
    }

    if (/\([^)]+\)/.test(text)) {
      issues.push("Contains parenthetical text which may confuse listeners");
      score -= 5;
    }

    // Check for complex sentences (more than 25 words)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);
    if (longSentences.length > 0) {
      issues.push(`${longSentences.length} sentence(s) too long for easy listening`);
      score -= longSentences.length * 5;
    }

    // Check readability (simplified Flesch reading ease approximation)
    const words = text.split(/\s+/).length;
    const syllables = text.replace(/[^aeiouy]/gi, "").length;
    const avgSyllablesPerWord = syllables / words;

    if (avgSyllablesPerWord > 2) {
      issues.push("Vocabulary may be too complex for voice");
      score -= 10;
    }

    return {
      isValid: score >= 60,
      issues,
      score: Math.max(0, score),
    };
  }
}

export const speakableGenerator = new SpeakableGenerator();
