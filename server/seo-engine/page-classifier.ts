/**
 * Page Classification System - Automatic URL Classification
 *
 * Every URL MUST be classified into exactly ONE of these types:
 * - MONEY_PAGE: Commercial intent, conversion-focused
 * - INFORMATIONAL: Educational, answers questions
 * - GUIDE: Long-form comprehensive content
 * - NEWS: Time-sensitive, event-based
 * - EVERGREEN: Timeless reference content
 * - EXPERIMENTAL: New formats being tested
 * - SEO_RISK: Flagged as harmful to site SEO
 *
 * Classification is MANDATORY and AUTOMATIC.
 */

import { db } from '../db';
import { contents } from '../../shared/schema';
import { eq, and, lt, gt, sql } from 'drizzle-orm';

export type PageClassification =
  | 'MONEY_PAGE'
  | 'INFORMATIONAL'
  | 'GUIDE'
  | 'NEWS'
  | 'EVERGREEN'
  | 'EXPERIMENTAL'
  | 'SEO_RISK';

export interface ClassificationResult {
  contentId: string;
  classification: PageClassification;
  confidence: number;
  reason: string;
  seoPriority: 'MAXIMUM' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE';
  aeoPriority: 'MAXIMUM' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE';
  requirements: ClassificationRequirements;
  previousClassification?: PageClassification;
  reclassificationTrigger?: string;
}

export interface ClassificationRequirements {
  minWords: number;
  minFAQs: number;
  answerCapsuleRequired: boolean;
  speakableRequired: boolean;
  schemaTypes: string[];
  sitemapPriority: number;
  linkWeight: number;
  reindexFrequency: 'immediate' | 'daily' | 'weekly' | 'monthly' | 'never';
  aiIndex: boolean;
}

// Classification requirements by type
const CLASSIFICATION_CONFIG: Record<PageClassification, {
  seoPriority: 'MAXIMUM' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE';
  aeoPriority: 'MAXIMUM' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NEGATIVE';
  requirements: ClassificationRequirements;
}> = {
  MONEY_PAGE: {
    seoPriority: 'MAXIMUM',
    aeoPriority: 'HIGH',
    requirements: {
      minWords: 1200,
      minFAQs: 6,
      answerCapsuleRequired: true,
      speakableRequired: false,
      schemaTypes: ['Product', 'Hotel', 'TouristAttraction', 'FAQPage'],
      sitemapPriority: 0.9,
      linkWeight: 1.5,
      reindexFrequency: 'immediate',
      aiIndex: true,
    },
  },
  INFORMATIONAL: {
    seoPriority: 'HIGH',
    aeoPriority: 'MAXIMUM',
    requirements: {
      minWords: 1000,
      minFAQs: 5,
      answerCapsuleRequired: true,
      speakableRequired: true,
      schemaTypes: ['Article', 'FAQPage', 'HowTo'],
      sitemapPriority: 0.8,
      linkWeight: 1.0,
      reindexFrequency: 'daily',
      aiIndex: true,
    },
  },
  GUIDE: {
    seoPriority: 'HIGH',
    aeoPriority: 'HIGH',
    requirements: {
      minWords: 2000,
      minFAQs: 8,
      answerCapsuleRequired: true,
      speakableRequired: true,
      schemaTypes: ['Article', 'FAQPage', 'ItemList', 'HowTo'],
      sitemapPriority: 0.9,
      linkWeight: 2.0,
      reindexFrequency: 'weekly',
      aiIndex: true,
    },
  },
  NEWS: {
    seoPriority: 'MEDIUM',
    aeoPriority: 'LOW',
    requirements: {
      minWords: 500,
      minFAQs: 3,
      answerCapsuleRequired: false,
      speakableRequired: false,
      schemaTypes: ['NewsArticle', 'Event'],
      sitemapPriority: 0.6,
      linkWeight: 0.5,
      reindexFrequency: 'immediate',
      aiIndex: false,
    },
  },
  EVERGREEN: {
    seoPriority: 'HIGH',
    aeoPriority: 'HIGH',
    requirements: {
      minWords: 1200,
      minFAQs: 6,
      answerCapsuleRequired: true,
      speakableRequired: true,
      schemaTypes: ['Article', 'FAQPage'],
      sitemapPriority: 0.8,
      linkWeight: 1.0,
      reindexFrequency: 'monthly',
      aiIndex: true,
    },
  },
  EXPERIMENTAL: {
    seoPriority: 'LOW',
    aeoPriority: 'LOW',
    requirements: {
      minWords: 300,
      minFAQs: 0,
      answerCapsuleRequired: false,
      speakableRequired: false,
      schemaTypes: ['WebPage'],
      sitemapPriority: 0.3,
      linkWeight: 0.3,
      reindexFrequency: 'weekly',
      aiIndex: false,
    },
  },
  SEO_RISK: {
    seoPriority: 'NEGATIVE',
    aeoPriority: 'NEGATIVE',
    requirements: {
      minWords: 0,
      minFAQs: 0,
      answerCapsuleRequired: false,
      speakableRequired: false,
      schemaTypes: [],
      sitemapPriority: 0.0,
      linkWeight: 0.0,
      reindexFrequency: 'never',
      aiIndex: false,
    },
  },
};

// Content types that are automatically classified as MONEY_PAGE
const MONEY_PAGE_CONTENT_TYPES = ['hotel', 'attraction', 'tour', 'package', 'booking'];

// Keywords that indicate evergreen content
const EVERGREEN_INDICATORS = [
  'visa', 'requirement', 'etiquette', 'culture', 'climate', 'weather',
  'currency', 'language', 'safety', 'law', 'regulation', 'tradition',
];

// Keywords that indicate news content
const NEWS_INDICATORS = [
  'opening', 'new', 'announcement', 'launch', 'update', 'event',
  'festival', 'celebration', '2024', '2025', '2026',
];

export class PageClassifier {
  /**
   * Classify a single content item
   */
  async classifyContent(contentId: string): Promise<ClassificationResult> {
    const content = await db.query.contents.findFirst({
      where: eq(contents.id, contentId),
    });

    if (!content) {
      throw new Error(`Content not found: ${contentId}`);
    }

    return this.classify(content);
  }

  /**
   * Classify content based on its attributes
   */
  private classify(content: any): ClassificationResult {
    const previousClassification = content.pageClassification as PageClassification | undefined;
    let classification: PageClassification;
    let reason: string;
    let confidence: number;
    let reclassificationTrigger: string | undefined;

    // Step 1: Check for SEO_RISK first (takes precedence)
    const riskCheck = this.checkSEORisk(content);
    if (riskCheck.isRisk) {
      classification = 'SEO_RISK';
      reason = riskCheck.reason;
      confidence = riskCheck.confidence;
      if (previousClassification && previousClassification !== 'SEO_RISK') {
        reclassificationTrigger = `Quality drop: ${riskCheck.reason}`;
      }
    }
    // Step 2: Classify by content type
    else if (MONEY_PAGE_CONTENT_TYPES.includes(content.type?.toLowerCase())) {
      classification = 'MONEY_PAGE';
      reason = `Content type "${content.type}" is commercial`;
      confidence = 95;
    }
    // Step 3: Check for news content
    else if (this.isNewsContent(content)) {
      classification = 'NEWS';
      reason = 'Time-sensitive content detected';
      confidence = 85;
    }
    // Step 4: Check for guide content
    else if (this.isGuideContent(content)) {
      classification = 'GUIDE';
      reason = 'Long-form comprehensive content';
      confidence = 90;
    }
    // Step 5: Check for evergreen content
    else if (this.isEvergreenContent(content)) {
      classification = 'EVERGREEN';
      reason = 'Timeless reference content';
      confidence = 80;
    }
    // Step 6: Check for experimental
    else if (content.pageClassification === 'EXPERIMENTAL') {
      // Preserve experimental status unless it's gained traction
      if (this.hasGainedTraction(content)) {
        classification = 'INFORMATIONAL';
        reason = 'Experimental content graduated (traffic > 100/week)';
        confidence = 85;
        reclassificationTrigger = 'Traffic spike';
      } else {
        classification = 'EXPERIMENTAL';
        reason = 'Experimental content under evaluation';
        confidence = 75;
      }
    }
    // Step 7: Default to INFORMATIONAL
    else {
      classification = 'INFORMATIONAL';
      reason = 'Educational content answering user questions';
      confidence = 75;
    }

    const config = CLASSIFICATION_CONFIG[classification];

    return {
      contentId: content.id,
      classification,
      confidence,
      reason,
      seoPriority: config.seoPriority,
      aeoPriority: config.aeoPriority,
      requirements: config.requirements,
      previousClassification,
      reclassificationTrigger,
    };
  }

  /**
   * Check if content is an SEO risk
   */
  private checkSEORisk(content: any): { isRisk: boolean; reason: string; confidence: number } {
    const wordCount = content.wordCount || 0;
    const seoScore = content.seoScore || 0;
    const duplicateSimilarity = content.duplicateSimilarity || 0;
    const trafficLastMonth = content.trafficLastMonth || 0;
    const ageInDays = content.createdAt
      ? Math.floor((Date.now() - new Date(content.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Content type minimum words
    const typeMinWords: Record<string, number> = {
      attraction: 1500,
      hotel: 1200,
      article: 1200,
      dining: 1200,
      district: 1500,
      event: 800,
      itinerary: 1500,
      guide: 1800,
    };

    const minWords = typeMinWords[content.type?.toLowerCase()] || 800;

    // Check various risk factors
    if (wordCount < minWords * 0.5) {
      return { isRisk: true, reason: 'Thin content (word count too low)', confidence: 95 };
    }

    if (duplicateSimilarity > 0.7) {
      return { isRisk: true, reason: 'Duplicate content detected', confidence: 90 };
    }

    if (seoScore < 30) {
      return { isRisk: true, reason: 'Critical SEO score failure', confidence: 95 };
    }

    if (trafficLastMonth === 0 && ageInDays > 90) {
      return { isRisk: true, reason: 'Zero traffic for 90+ days', confidence: 85 };
    }

    // Check cannibalization (would need additional data)
    const cannibalizationScore = content.cannibalizationScore || 0;
    if (cannibalizationScore > 0.8) {
      return { isRisk: true, reason: 'High cannibalization risk', confidence: 88 };
    }

    return { isRisk: false, reason: '', confidence: 0 };
  }

  /**
   * Check if content is news-like
   */
  private isNewsContent(content: any): boolean {
    const title = (content.title || '').toLowerCase();
    const type = (content.type || '').toLowerCase();

    // Event type is always news
    if (type === 'event') return true;

    // Check for news indicators in title
    const hasNewsIndicator = NEWS_INDICATORS.some(indicator =>
      title.includes(indicator.toLowerCase())
    );

    // Check if content has a specific date/time focus
    const hasDateFocus = content.eventDate || content.publishDate;

    return hasNewsIndicator && hasDateFocus;
  }

  /**
   * Check if content is guide-like
   */
  private isGuideContent(content: any): boolean {
    const type = (content.type || '').toLowerCase();
    const wordCount = content.wordCount || 0;
    const title = (content.title || '').toLowerCase();

    // District pages are guides
    if (type === 'district') return true;

    // Explicit guide type
    if (type === 'guide') return true;

    // Long-form articles with guide-like titles
    const guideIndicators = ['guide', 'complete', 'ultimate', 'comprehensive', 'everything'];
    const hasGuideTitle = guideIndicators.some(indicator => title.includes(indicator));

    return hasGuideTitle && wordCount >= 1500;
  }

  /**
   * Check if content is evergreen
   */
  private isEvergreenContent(content: any): boolean {
    const title = (content.title || '').toLowerCase();
    const description = (content.metaDescription || '').toLowerCase();
    const combined = title + ' ' + description;

    return EVERGREEN_INDICATORS.some(indicator =>
      combined.includes(indicator.toLowerCase())
    );
  }

  /**
   * Check if experimental content has gained traction
   */
  private hasGainedTraction(content: any): boolean {
    const trafficLastWeek = content.trafficLastWeek || 0;
    return trafficLastWeek > 100;
  }

  /**
   * Batch classify all content
   */
  async classifyAllContent(): Promise<ClassificationResult[]> {
    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const results: ClassificationResult[] = [];

    for (const content of allContent) {
      try {
        const result = this.classify(content);
        results.push(result);

        // Update classification in database if changed
        if (result.classification !== (content as any).pageClassification) {
          await this.updateClassification(content.id, result);
        }
      } catch (error) {
        console.error(`Failed to classify content ${content.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Update content classification in database
   */
  private async updateClassification(
    contentId: string,
    result: ClassificationResult
  ): Promise<void> {
    await db
      .update(contents)
      .set({
        pageClassification: result.classification,
        classificationConfidence: result.confidence,
        classificationReason: result.reason,
        classificationUpdatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));
  }

  /**
   * Get classification distribution
   */
  async getDistribution(): Promise<Record<PageClassification, number>> {
    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const distribution: Record<PageClassification, number> = {
      MONEY_PAGE: 0,
      INFORMATIONAL: 0,
      GUIDE: 0,
      NEWS: 0,
      EVERGREEN: 0,
      EXPERIMENTAL: 0,
      SEO_RISK: 0,
    };

    for (const content of allContent) {
      const result = this.classify(content);
      distribution[result.classification]++;
    }

    return distribution;
  }

  /**
   * Get all pages classified as SEO_RISK
   */
  async getRiskPages(): Promise<ClassificationResult[]> {
    const allContent = await db.query.contents.findMany({
      where: eq(contents.status, 'published'),
    });

    const riskPages: ClassificationResult[] = [];

    for (const content of allContent) {
      const result = this.classify(content);
      if (result.classification === 'SEO_RISK') {
        riskPages.push(result);
      }
    }

    return riskPages;
  }

  /**
   * Get classification requirements for a type
   */
  getRequirements(classification: PageClassification): ClassificationRequirements {
    return CLASSIFICATION_CONFIG[classification].requirements;
  }

  /**
   * Mark content as experimental
   */
  async markAsExperimental(contentId: string): Promise<void> {
    await db
      .update(contents)
      .set({
        pageClassification: 'EXPERIMENTAL',
        classificationReason: 'Manually marked as experimental',
        classificationUpdatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));
  }

  /**
   * Override classification (requires approval tracking)
   */
  async overrideClassification(
    contentId: string,
    newClassification: PageClassification,
    reason: string,
    approvedBy: string
  ): Promise<void> {
    await db
      .update(contents)
      .set({
        pageClassification: newClassification,
        classificationReason: `Override: ${reason}`,
        classificationOverrideBy: approvedBy,
        classificationOverrideAt: new Date(),
        classificationUpdatedAt: new Date(),
      } as any)
      .where(eq(contents.id, contentId));
  }

  /**
   * Schedule reclassification check for old news content
   */
  async checkNewsExpiration(): Promise<ClassificationResult[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const oldNewsContent = await db.query.contents.findMany({
      where: and(
        eq(contents.status, 'published'),
        sql`${contents.type} = 'event' OR page_classification = 'NEWS'`
      ),
    });

    const reclassified: ClassificationResult[] = [];

    for (const content of oldNewsContent) {
      const createdAt = new Date(content.createdAt);
      if (createdAt < thirtyDaysAgo) {
        // Check if it should become EVERGREEN or SEO_RISK
        const wordCount = content.wordCount || 0;
        const trafficLastMonth = (content as any).trafficLastMonth || 0;

        let newClassification: PageClassification;
        let reason: string;

        if (wordCount >= 1000 && trafficLastMonth > 50) {
          newClassification = 'EVERGREEN';
          reason = 'Aged news with sustained traffic';
        } else if (trafficLastMonth === 0) {
          newClassification = 'SEO_RISK';
          reason = 'Aged news with no traffic';
        } else {
          continue; // Keep as NEWS for now
        }

        const result: ClassificationResult = {
          contentId: content.id,
          classification: newClassification,
          confidence: 80,
          reason,
          seoPriority: CLASSIFICATION_CONFIG[newClassification].seoPriority,
          aeoPriority: CLASSIFICATION_CONFIG[newClassification].aeoPriority,
          requirements: CLASSIFICATION_CONFIG[newClassification].requirements,
          previousClassification: 'NEWS',
          reclassificationTrigger: 'Age out (> 30 days)',
        };

        await this.updateClassification(content.id, result);
        reclassified.push(result);
      }
    }

    return reclassified;
  }
}
