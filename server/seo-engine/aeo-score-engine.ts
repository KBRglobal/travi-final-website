/**
 * AEO Score Engine - Answer Engine Optimization Scoring
 *
 * Calculates AEO score (0-100) for content based on:
 * - Answer capsule quality (25 points)
 * - Snippet readiness (20 points)
 * - Schema completeness (20 points)
 * - AI-friendly headings (15 points)
 * - Key facts presence (10 points)
 * - Citability (10 points)
 */

import { db } from '../db';
import {
  contents,
  aeoAnswerCapsules,
  attractions,
  hotels,
  dining,
  districts,
  articles,
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import {
  SEOEngineConfig,
  AEOScoreResult,
  AEOScoreBreakdown,
  AEORecommendation,
} from './types';

export class AEOScoreEngine {
  private config: SEOEngineConfig;

  constructor(config: SEOEngineConfig) {
    this.config = config;
  }

  /**
   * Calculate AEO score for content
   */
  async calculate(contentId: string): Promise<AEOScoreResult> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const breakdown = await this.calculateBreakdown(content);
    const recommendations = this.generateRecommendations(breakdown, content);
    const score = this.calculateTotalScore(breakdown);

    // Update content's AEO score
    await db
      .update(contents)
      .set({
        aeoScore: score,
        updatedAt: new Date(),
      })
      .where(eq(contents.id, contentId));

    return {
      contentId,
      score,
      breakdown,
      recommendations,
      lastCalculated: new Date(),
    };
  }

  /**
   * Calculate score breakdown
   */
  private async calculateBreakdown(content: any): Promise<AEOScoreBreakdown> {
    const [
      answerCapsule,
      snippetReadiness,
      schemaCompleteness,
      aiHeadings,
      keyFactsPresence,
      citability,
    ] = await Promise.all([
      this.scoreAnswerCapsule(content),
      this.scoreSnippetReadiness(content),
      this.scoreSchemaCompleteness(content),
      this.scoreAIHeadings(content),
      this.scoreKeyFactsPresence(content),
      this.scoreCitability(content),
    ]);

    return {
      answerCapsule,
      snippetReadiness,
      schemaCompleteness,
      aiHeadings,
      keyFactsPresence,
      citability,
    };
  }

  /**
   * Score answer capsule quality (0-25)
   */
  private async scoreAnswerCapsule(content: any): Promise<number> {
    const capsule = await db.query.aeoAnswerCapsules.findFirst({
      where: and(
        eq(aeoAnswerCapsules.contentId, content.id),
        eq(aeoAnswerCapsules.locale, this.config.defaultLocale as any)
      ),
    });

    if (!capsule) {
      return 0;
    }

    let score = 0;
    const text = capsule.capsuleText || '';

    // Base points for having a capsule (5)
    score += 5;

    // Word count (40-60 words optimal) (5)
    const wordCount = text.split(/\s+/).length;
    if (wordCount >= 40 && wordCount <= 60) {
      score += 5;
    } else if (wordCount >= 30 && wordCount <= 80) {
      score += 3;
    } else if (wordCount > 0) {
      score += 1;
    }

    // Has quick answer (5)
    if (capsule.quickAnswer) {
      score += 5;
    }

    // Has key facts (5)
    if (capsule.keyFacts && capsule.keyFacts.length >= 3) {
      score += 5;
    } else if (capsule.keyFacts && capsule.keyFacts.length > 0) {
      score += 2;
    }

    // Has differentiator (3)
    if (capsule.differentiator) {
      score += 3;
    }

    // Is approved (2)
    if (capsule.isApproved) {
      score += 2;
    }

    return Math.min(score, 25);
  }

  /**
   * Score snippet readiness (0-20)
   */
  private async scoreSnippetReadiness(content: any): Promise<number> {
    let score = 0;
    const blocks = content.blocks || [];

    // Has answer in first paragraph (5)
    const firstParagraph = blocks.find((b: any) => b.type === 'paragraph');
    if (firstParagraph) {
      const text = firstParagraph.content || firstParagraph.data?.text || '';
      // Check if starts with direct answer pattern
      if (this.isDirectAnswer(text)) {
        score += 5;
      } else if (text.length > 50) {
        score += 2;
      }
    }

    // Has lists for featured snippets (5)
    const hasLists = blocks.some(
      (b: any) => b.type === 'list' || b.type === 'bullet_list' || b.type === 'numbered_list'
    );
    if (hasLists) {
      score += 5;
    }

    // Has tables for data snippets (3)
    const hasTables = blocks.some((b: any) => b.type === 'table');
    if (hasTables) {
      score += 3;
    }

    // Has definition-style content (3)
    if (content.metaDescription && content.metaDescription.length >= 100) {
      score += 3;
    }

    // Clear paragraph structure (4)
    const paragraphs = blocks.filter((b: any) => b.type === 'paragraph');
    const avgLength =
      paragraphs.length > 0
        ? paragraphs.reduce((sum: number, p: any) => {
            const text = p.content || p.data?.text || '';
            return sum + text.length;
          }, 0) / paragraphs.length
        : 0;

    // Optimal paragraph length is 100-200 chars
    if (avgLength >= 100 && avgLength <= 200) {
      score += 4;
    } else if (avgLength >= 50 && avgLength <= 300) {
      score += 2;
    }

    return Math.min(score, 20);
  }

  /**
   * Score schema completeness (0-20)
   */
  private async scoreSchemaCompleteness(content: any): Promise<number> {
    let score = 0;
    const seoSchema = content.seoSchema;

    if (!seoSchema) {
      return 0;
    }

    // Has @context and @graph (4)
    if (seoSchema['@context'] && seoSchema['@graph']) {
      score += 4;
    }

    const graph = seoSchema['@graph'] || [];

    // Has WebPage schema (3)
    if (graph.some((n: any) => n['@type'] === 'WebPage')) {
      score += 3;
    }

    // Has type-specific schema (4)
    const typeSchemas = [
      'TouristAttraction',
      'Hotel',
      'Restaurant',
      'Event',
      'Article',
      'TouristDestination',
    ];
    if (graph.some((n: any) => typeSchemas.includes(n['@type']))) {
      score += 4;
    }

    // Has FAQPage schema (4)
    if (graph.some((n: any) => n['@type'] === 'FAQPage')) {
      score += 4;
    }

    // Has Breadcrumb schema (2)
    if (graph.some((n: any) => n['@type'] === 'BreadcrumbList')) {
      score += 2;
    }

    // Has Speakable schema (3)
    if (graph.some((n: any) => n.speakable)) {
      score += 3;
    }

    return Math.min(score, 20);
  }

  /**
   * Score AI-friendly headings (0-15)
   */
  private async scoreAIHeadings(content: any): Promise<number> {
    let score = 0;
    const blocks = content.blocks || [];

    // Count H2 headings
    const h2s = blocks.filter(
      (b: any) =>
        (b.type === 'heading' && (b.level === 2 || b.data?.level === 2)) ||
        b.type === 'h2'
    );

    // Optimal is 4-8 H2s (5)
    if (h2s.length >= 4 && h2s.length <= 8) {
      score += 5;
    } else if (h2s.length >= 2 && h2s.length <= 12) {
      score += 3;
    } else if (h2s.length >= 1) {
      score += 1;
    }

    // Check if headings are questions (great for AI) (5)
    const questionHeadings = h2s.filter((h: any) => {
      const text = h.content || h.data?.text || h.text || '';
      return text.includes('?') || this.isImplicitQuestion(text);
    });

    if (questionHeadings.length >= 3) {
      score += 5;
    } else if (questionHeadings.length >= 1) {
      score += 2;
    }

    // Check heading clarity (not too long, descriptive) (5)
    const clearHeadings = h2s.filter((h: any) => {
      const text = h.content || h.data?.text || h.text || '';
      return text.length >= 10 && text.length <= 60;
    });

    if (clearHeadings.length === h2s.length && h2s.length > 0) {
      score += 5;
    } else if (clearHeadings.length >= h2s.length * 0.7) {
      score += 3;
    }

    return Math.min(score, 15);
  }

  /**
   * Score key facts presence (0-10)
   */
  private async scoreKeyFactsPresence(content: any): Promise<number> {
    let score = 0;

    // Check type-specific quick info
    const typeData = await this.getTypeSpecificData(content);

    // Has quick info bar (4)
    if (typeData?.quickInfoBar && typeData.quickInfoBar.length >= 3) {
      score += 4;
    } else if (typeData?.quickInfoBar && typeData.quickInfoBar.length > 0) {
      score += 2;
    }

    // Has highlights (3)
    if (typeData?.highlights && typeData.highlights.length >= 3) {
      score += 3;
    } else if (typeData?.highlights && typeData.highlights.length > 0) {
      score += 1;
    }

    // Has essential info (3)
    if (typeData?.essentialInfo && typeData.essentialInfo.length >= 3) {
      score += 3;
    } else if (typeData?.essentialInfo && typeData.essentialInfo.length > 0) {
      score += 1;
    }

    return Math.min(score, 10);
  }

  /**
   * Score citability (0-10)
   */
  private async scoreCitability(content: any): Promise<number> {
    let score = 0;

    // Has primary keyword (2)
    if (content.primaryKeyword) {
      score += 2;
    }

    // Word count is sufficient (2)
    if (content.wordCount >= 1000) {
      score += 2;
    } else if (content.wordCount >= 500) {
      score += 1;
    }

    // Has unique meta description (2)
    if (content.metaDescription && content.metaDescription.length >= 120) {
      score += 2;
    }

    // Is published (not draft) (2)
    if (content.status === 'published') {
      score += 2;
    }

    // Has been updated recently (2)
    if (content.updatedAt) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - content.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate < 90) {
        score += 2;
      } else if (daysSinceUpdate < 180) {
        score += 1;
      }
    }

    return Math.min(score, 10);
  }

  /**
   * Get type-specific data
   */
  private async getTypeSpecificData(content: any): Promise<any> {
    switch (content.type) {
      case 'attraction':
        return db.query.attractions.findFirst({
          where: eq(attractions.contentId, content.id),
        });
      case 'hotel':
        return db.query.hotels.findFirst({
          where: eq(hotels.contentId, content.id),
        });
      case 'dining':
        return db.query.dining.findFirst({
          where: eq(dining.contentId, content.id),
        });
      case 'district':
        return db.query.districts.findFirst({
          where: eq(districts.contentId, content.id),
        });
      case 'article':
        return db.query.articles.findFirst({
          where: eq(articles.contentId, content.id),
        });
      default:
        return null;
    }
  }

  /**
   * Calculate total score from breakdown
   */
  private calculateTotalScore(breakdown: AEOScoreBreakdown): number {
    return (
      breakdown.answerCapsule +
      breakdown.snippetReadiness +
      breakdown.schemaCompleteness +
      breakdown.aiHeadings +
      breakdown.keyFactsPresence +
      breakdown.citability
    );
  }

  /**
   * Generate recommendations based on score breakdown
   */
  private generateRecommendations(
    breakdown: AEOScoreBreakdown,
    content: any
  ): AEORecommendation[] {
    const recommendations: AEORecommendation[] = [];

    // Answer capsule recommendations
    if (breakdown.answerCapsule < 15) {
      recommendations.push({
        priority: breakdown.answerCapsule === 0 ? 'critical' : 'high',
        category: 'answerCapsule',
        message:
          breakdown.answerCapsule === 0
            ? 'No answer capsule found'
            : 'Answer capsule needs improvement',
        action:
          breakdown.answerCapsule === 0
            ? 'Generate an answer capsule (40-60 words) that directly answers the main query'
            : 'Add key facts and differentiator to the answer capsule',
        potentialGain: 25 - breakdown.answerCapsule,
      });
    }

    // Snippet readiness recommendations
    if (breakdown.snippetReadiness < 12) {
      recommendations.push({
        priority: 'high',
        category: 'snippetReadiness',
        message: 'Content not optimized for featured snippets',
        action:
          'Add lists, tables, and ensure the first paragraph directly answers the main question',
        potentialGain: 20 - breakdown.snippetReadiness,
      });
    }

    // Schema recommendations
    if (breakdown.schemaCompleteness < 12) {
      recommendations.push({
        priority: 'medium',
        category: 'schemaCompleteness',
        message: 'Schema.org markup is incomplete',
        action: 'Add FAQPage and Speakable schemas to improve AI extraction',
        potentialGain: 20 - breakdown.schemaCompleteness,
      });
    }

    // AI headings recommendations
    if (breakdown.aiHeadings < 10) {
      recommendations.push({
        priority: 'medium',
        category: 'aiHeadings',
        message: 'Heading structure not optimized for AI',
        action:
          'Use question-format H2 headings (e.g., "What is...?", "How to...?") for better AI extraction',
        potentialGain: 15 - breakdown.aiHeadings,
      });
    }

    // Key facts recommendations
    if (breakdown.keyFactsPresence < 6) {
      recommendations.push({
        priority: 'medium',
        category: 'keyFactsPresence',
        message: 'Missing quick facts and key information',
        action:
          'Add a quick info bar with essential facts (price, hours, location, etc.)',
        potentialGain: 10 - breakdown.keyFactsPresence,
      });
    }

    // Citability recommendations
    if (breakdown.citability < 6) {
      recommendations.push({
        priority: 'low',
        category: 'citability',
        message: 'Content citability can be improved',
        action:
          'Ensure content is published, has a primary keyword, and is regularly updated',
        potentialGain: 10 - breakdown.citability,
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    return recommendations;
  }

  /**
   * Check if text is a direct answer pattern
   */
  private isDirectAnswer(text: string): boolean {
    const directPatterns = [
      /^[A-Z][^.!?]*(?:is|are|was|were|has|have|can|will|should)\s/i,
      /^The\s+(?:best|top|most|main|key)\s/i,
      /^To\s+(?:get|reach|visit|find|book)\s/i,
      /^(?:Located|Found|Situated|Set)\s+(?:in|at|on)\s/i,
      /^(?:Yes|No)[,.]?\s/i,
    ];

    return directPatterns.some((pattern) => pattern.test(text.trim()));
  }

  /**
   * Check if heading is an implicit question
   */
  private isImplicitQuestion(text: string): boolean {
    const questionWords = [
      'what',
      'how',
      'why',
      'when',
      'where',
      'who',
      'which',
      'best',
      'top',
      'guide',
      'tips',
      'ways',
      'steps',
      'everything',
    ];

    const lowerText = text.toLowerCase();
    return questionWords.some((word) => lowerText.includes(word));
  }

  /**
   * Batch calculate AEO scores
   */
  async batchCalculate(contentIds: string[]): Promise<Map<string, AEOScoreResult>> {
    const results = new Map<string, AEOScoreResult>();

    for (const contentId of contentIds) {
      try {
        const result = await this.calculate(contentId);
        results.set(contentId, result);
      } catch (error) {
        console.error(`Failed to calculate AEO score for ${contentId}:`, error);
      }
    }

    return results;
  }
}
