/**
 * Snippet Engine - Answer Capsules & Snippet-Ready Content
 *
 * Optimizes content for:
 * - Featured snippets (Google)
 * - Answer boxes
 * - AI citations (ChatGPT, Perplexity, etc.)
 * - Voice search responses
 * - Knowledge panels
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
  SnippetReadiness,
  SnippetElement,
  SnippetRecommendation,
} from './types';

export class SnippetEngine {
  private config: SEOEngineConfig;

  constructor(config: SEOEngineConfig) {
    this.config = config;
  }

  /**
   * Analyze snippet readiness for content
   */
  async analyzeReadiness(contentId: string): Promise<SnippetReadiness> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    const elements = await this.detectElements(content);
    const score = this.calculateScore(elements);
    const recommendations = this.generateRecommendations(elements, content);

    return {
      contentId,
      score,
      featuredSnippetReady: this.isFeaturedSnippetReady(elements),
      answerBoxReady: this.isAnswerBoxReady(elements),
      aiCitationReady: this.isAICitationReady(elements),
      elements,
      recommendations,
    };
  }

  /**
   * Detect snippet elements in content
   */
  private async detectElements(content: any): Promise<SnippetElement[]> {
    const elements: SnippetElement[] = [];
    const blocks = content.blocks || [];

    // Check for answer capsule
    const capsule = await db.query.aeoAnswerCapsules.findFirst({
      where: eq(aeoAnswerCapsules.contentId, content.id),
    });

    elements.push({
      type: 'answer_capsule',
      present: !!capsule,
      quality: this.evaluateCapsuleQuality(capsule),
      content: capsule?.capsuleText,
    });

    // Check for FAQ
    const faqData = await this.getFAQData(content);
    elements.push({
      type: 'faq',
      present: faqData.length > 0,
      quality: this.evaluateFAQQuality(faqData),
    });

    // Check for HowTo/Steps
    const howToSteps = this.extractHowToSteps(blocks);
    elements.push({
      type: 'how_to',
      present: howToSteps.length >= 3,
      quality: howToSteps.length >= 5 ? 'excellent' : howToSteps.length >= 3 ? 'good' : 'missing',
    });

    // Check for quick facts
    const quickFacts = await this.getQuickFacts(content);
    elements.push({
      type: 'quick_facts',
      present: quickFacts.length >= 3,
      quality:
        quickFacts.length >= 6
          ? 'excellent'
          : quickFacts.length >= 3
          ? 'good'
          : quickFacts.length > 0
          ? 'needs_improvement'
          : 'missing',
    });

    // Check for definition-style opening
    const hasDefinition = this.hasDefinitionOpening(blocks);
    elements.push({
      type: 'definition',
      present: hasDefinition,
      quality: hasDefinition ? 'good' : 'missing',
    });

    // Check for lists
    const hasList = blocks.some(
      (b: any) =>
        b.type === 'list' ||
        b.type === 'bullet_list' ||
        b.type === 'numbered_list'
    );
    elements.push({
      type: 'list',
      present: hasList,
      quality: hasList ? 'good' : 'missing',
    });

    // Check for tables
    const hasTable = blocks.some((b: any) => b.type === 'table');
    elements.push({
      type: 'table',
      present: hasTable,
      quality: hasTable ? 'good' : 'missing',
    });

    return elements;
  }

  /**
   * Get FAQ data for content
   */
  private async getFAQData(content: any): Promise<any[]> {
    // Check blocks first
    const blocks = content.blocks || [];
    const faqBlock = blocks.find(
      (b: any) => b.type === 'faq' || b.type === 'FAQ'
    );
    if (faqBlock?.data?.items) {
      return faqBlock.data.items;
    }

    // Check type-specific data
    switch (content.type) {
      case 'attraction': {
        const attraction = await db.query.attractions.findFirst({
          where: eq(attractions.contentId, content.id),
        });
        return attraction?.faq || [];
      }
      case 'hotel': {
        const hotel = await db.query.hotels.findFirst({
          where: eq(hotels.contentId, content.id),
        });
        return hotel?.faq || [];
      }
      case 'dining': {
        const restaurant = await db.query.dining.findFirst({
          where: eq(dining.contentId, content.id),
        });
        return restaurant?.faq || [];
      }
      case 'district': {
        const district = await db.query.districts.findFirst({
          where: eq(districts.contentId, content.id),
        });
        return district?.faq || [];
      }
      case 'article': {
        const article = await db.query.articles.findFirst({
          where: eq(articles.contentId, content.id),
        });
        return article?.faq || [];
      }
      default:
        return [];
    }
  }

  /**
   * Get quick facts for content
   */
  private async getQuickFacts(content: any): Promise<any[]> {
    switch (content.type) {
      case 'attraction': {
        const attraction = await db.query.attractions.findFirst({
          where: eq(attractions.contentId, content.id),
        });
        return attraction?.quickInfoBar || [];
      }
      case 'hotel': {
        const hotel = await db.query.hotels.findFirst({
          where: eq(hotels.contentId, content.id),
        });
        return hotel?.quickInfoBar || [];
      }
      case 'dining': {
        const restaurant = await db.query.dining.findFirst({
          where: eq(dining.contentId, content.id),
        });
        return restaurant?.quickInfoBar || [];
      }
      case 'district': {
        const district = await db.query.districts.findFirst({
          where: eq(districts.contentId, content.id),
        });
        return district?.quickInfoBar || [];
      }
      default:
        return [];
    }
  }

  /**
   * Extract HowTo steps from content blocks
   */
  private extractHowToSteps(blocks: any[]): any[] {
    const steps: any[] = [];

    for (const block of blocks) {
      if (
        block.type === 'heading' &&
        (block.level === 2 || block.data?.level === 2)
      ) {
        const text = block.content || block.data?.text || '';
        // Check if it looks like a step
        if (
          /^\d+\.|^step|^how to|^first|^next|^then|^finally/i.test(
            text.trim()
          )
        ) {
          steps.push({ name: text, text: '' });
        }
      }
    }

    return steps;
  }

  /**
   * Check for definition-style opening
   */
  private hasDefinitionOpening(blocks: any[]): boolean {
    const firstParagraph = blocks.find((b: any) => b.type === 'paragraph');
    if (!firstParagraph) return false;

    const text = firstParagraph.content || firstParagraph.data?.text || '';
    const patterns = [
      /^[A-Z][^.!?]* is (a|an|the) /,
      /^The [A-Z][^.!?]* is /,
      /^A [A-Z][^.!?]* is /,
      /refers to/i,
      /defined as/i,
      /known as/i,
    ];

    return patterns.some((p) => p.test(text.trim()));
  }

  /**
   * Evaluate capsule quality
   */
  private evaluateCapsuleQuality(
    capsule: any
  ): 'excellent' | 'good' | 'needs_improvement' | 'missing' {
    if (!capsule) return 'missing';

    const text = capsule.capsuleText || '';
    const wordCount = text.split(/\s+/).length;

    // Excellent: 40-60 words, has quick answer, key facts, differentiator
    if (
      wordCount >= 40 &&
      wordCount <= 60 &&
      capsule.quickAnswer &&
      capsule.keyFacts?.length >= 3 &&
      capsule.differentiator
    ) {
      return 'excellent';
    }

    // Good: reasonable length, has some components
    if (
      wordCount >= 30 &&
      wordCount <= 80 &&
      (capsule.quickAnswer || capsule.keyFacts?.length > 0)
    ) {
      return 'good';
    }

    return 'needs_improvement';
  }

  /**
   * Evaluate FAQ quality
   */
  private evaluateFAQQuality(
    faqData: any[]
  ): 'excellent' | 'good' | 'needs_improvement' | 'missing' {
    if (!faqData || faqData.length === 0) return 'missing';

    // Excellent: 8+ questions with good answers
    if (faqData.length >= 8) {
      const hasGoodAnswers = faqData.every(
        (f) => f.answer && f.answer.length >= 50
      );
      if (hasGoodAnswers) return 'excellent';
    }

    // Good: 6+ questions
    if (faqData.length >= 6) return 'good';

    // Some FAQs but not enough
    return 'needs_improvement';
  }

  /**
   * Calculate snippet readiness score
   */
  private calculateScore(elements: SnippetElement[]): number {
    let score = 0;
    const weights = {
      answer_capsule: 25,
      faq: 20,
      how_to: 15,
      quick_facts: 15,
      definition: 10,
      list: 10,
      table: 5,
    };

    const qualityMultipliers = {
      excellent: 1,
      good: 0.8,
      needs_improvement: 0.4,
      missing: 0,
    };

    for (const element of elements) {
      const weight = weights[element.type] || 0;
      const multiplier = qualityMultipliers[element.quality];
      score += weight * multiplier;
    }

    return Math.round(score);
  }

  /**
   * Check if ready for featured snippets
   */
  private isFeaturedSnippetReady(elements: SnippetElement[]): boolean {
    // Needs definition opening + list/table OR FAQ
    const hasDefinition = elements.find(
      (e) => e.type === 'definition' && e.present
    );
    const hasList = elements.find((e) => e.type === 'list' && e.present);
    const hasTable = elements.find((e) => e.type === 'table' && e.present);
    const hasFAQ = elements.find(
      (e) => e.type === 'faq' && e.quality !== 'missing'
    );

    return Boolean((hasDefinition && (hasList || hasTable)) || (hasFAQ?.quality === 'excellent'));
  }

  /**
   * Check if ready for answer box
   */
  private isAnswerBoxReady(elements: SnippetElement[]): boolean {
    const capsule = elements.find((e) => e.type === 'answer_capsule');
    const quickFacts = elements.find((e) => e.type === 'quick_facts');

    return (
      capsule?.quality === 'excellent' ||
      (capsule?.quality === 'good' && quickFacts?.present)
    );
  }

  /**
   * Check if ready for AI citations
   */
  private isAICitationReady(elements: SnippetElement[]): boolean {
    // AI citation requires good answer capsule + FAQ
    const capsule = elements.find((e) => e.type === 'answer_capsule');
    const faq = elements.find((e) => e.type === 'faq');

    const capsuleGood =
      capsule?.quality === 'excellent' || capsule?.quality === 'good';
    const faqGood = faq?.quality === 'excellent' || faq?.quality === 'good';

    return capsuleGood && faqGood;
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(
    elements: SnippetElement[],
    content: any
  ): SnippetRecommendation[] {
    const recommendations: SnippetRecommendation[] = [];

    for (const element of elements) {
      if (element.quality === 'missing' || element.quality === 'needs_improvement') {
        const rec = this.getRecommendationForElement(element, content);
        if (rec) {
          recommendations.push(rec);
        }
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );

    return recommendations;
  }

  /**
   * Get recommendation for specific element
   */
  private getRecommendationForElement(
    element: SnippetElement,
    content: any
  ): SnippetRecommendation | null {
    switch (element.type) {
      case 'answer_capsule':
        return {
          element: 'Answer Capsule',
          action:
            element.quality === 'missing'
              ? 'Generate an answer capsule (40-60 words) that directly answers the main query'
              : 'Improve answer capsule by adding key facts and differentiator',
          priority: 'high',
          example: `${content.title} is [brief description]. Key highlights include [3 key points]. Best for [target audience].`,
        };

      case 'faq':
        return {
          element: 'FAQ Section',
          action:
            element.quality === 'missing'
              ? 'Add 8-10 frequently asked questions with comprehensive answers'
              : 'Expand FAQ section to 8+ questions with detailed answers',
          priority: 'high',
          example:
            'Q: What are the opening hours? A: [Answer with specific times and days]',
        };

      case 'quick_facts':
        return {
          element: 'Quick Facts',
          action: 'Add a quick info bar with essential facts (price, hours, location, etc.)',
          priority: 'medium',
        };

      case 'definition':
        return {
          element: 'Definition Opening',
          action:
            'Start the content with a clear definition or description of the main topic',
          priority: 'medium',
          example: `${content.title} is a [category] located in [location], known for [key feature].`,
        };

      case 'list':
        return {
          element: 'List Content',
          action: 'Add bulleted or numbered lists to organize key points',
          priority: 'low',
        };

      case 'table':
        return {
          element: 'Table Data',
          action:
            'Add a comparison table or data table for structured information',
          priority: 'low',
        };

      default:
        return null;
    }
  }

  /**
   * Generate answer capsule for content
   */
  async generateCapsule(contentId: string): Promise<{
    capsuleText: string;
    quickAnswer: string;
    keyFacts: string[];
    differentiator: string;
  }> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    // Generate capsule based on content
    const typeData = await this.getTypeSpecificData(content);
    const quickFacts = await this.getQuickFacts(content);

    // Build capsule components
    const quickAnswer = this.buildQuickAnswer(content, typeData);
    const keyFacts = this.buildKeyFacts(content, typeData, quickFacts);
    const differentiator = this.buildDifferentiator(content, typeData);
    const capsuleText = this.buildCapsuleText(
      quickAnswer,
      keyFacts,
      differentiator
    );

    return {
      capsuleText,
      quickAnswer,
      keyFacts,
      differentiator,
    };
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
      default:
        return null;
    }
  }

  /**
   * Build quick answer
   */
  private buildQuickAnswer(content: any, typeData: any): string {
    const title = content.title;
    // FAIL-FAST: Do not use implicit Dubai fallback for location
    const location = typeData?.location;
    
    if (!location) {
      // Return generic answer without location when not provided
      switch (content.type) {
        case 'attraction':
          return `${title} is a popular attraction.`;
        case 'hotel':
          const starsNoLoc = typeData?.starRating ? `${typeData.starRating}-star` : '';
          return `${title} is a ${starsNoLoc} hotel.`;
        case 'dining':
          const cuisineNoLoc = typeData?.cuisineType || '';
          return `${title} is a ${cuisineNoLoc} restaurant.`;
        case 'district':
          return `${title} is a vibrant neighborhood.`;
        default:
          return `${title} is a featured destination.`;
      }
    }

    switch (content.type) {
      case 'attraction':
        return `${title} is a popular attraction in ${location}.`;
      case 'hotel':
        const stars = typeData?.starRating ? `${typeData.starRating}-star` : '';
        return `${title} is a ${stars} hotel in ${location}.`;
      case 'dining':
        const cuisine = typeData?.cuisineType || '';
        return `${title} is a ${cuisine} restaurant in ${location}.`;
      case 'district':
        return `${title} is a vibrant neighborhood in ${location}.`;
      default:
        return `${title} is located in ${location}.`;
    }
  }

  /**
   * Build key facts array
   */
  private buildKeyFacts(
    content: any,
    typeData: any,
    quickFacts: any[]
  ): string[] {
    const facts: string[] = [];

    // Add from quick info bar
    for (const fact of quickFacts.slice(0, 4)) {
      if (fact.label && fact.value) {
        facts.push(`${fact.label}: ${fact.value}`);
      }
    }

    // Add type-specific facts
    if (typeData?.priceFrom) {
      facts.push(`Price from: ${typeData.priceFrom}`);
    }
    if (typeData?.duration) {
      facts.push(`Duration: ${typeData.duration}`);
    }
    if (typeData?.starRating) {
      facts.push(`Rating: ${typeData.starRating} stars`);
    }

    return facts.slice(0, 5);
  }

  /**
   * Build differentiator
   */
  private buildDifferentiator(content: any, typeData: any): string {
    // Use highlights if available
    const highlights = typeData?.highlights || [];
    if (highlights.length > 0) {
      const first = highlights[0];
      return first.title || first.label || '';
    }

    // Fallback to primary keyword
    return content.primaryKeyword || '';
  }

  /**
   * Build complete capsule text
   */
  private buildCapsuleText(
    quickAnswer: string,
    keyFacts: string[],
    differentiator: string
  ): string {
    let capsule = quickAnswer;

    if (keyFacts.length > 0) {
      capsule += ` Key details: ${keyFacts.slice(0, 3).join(', ')}.`;
    }

    if (differentiator) {
      capsule += ` Known for: ${differentiator}.`;
    }

    return capsule;
  }
}
