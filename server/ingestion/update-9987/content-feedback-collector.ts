/**
 * Content Feedback Collector - Human-in-the-Loop System
 * 
 * Update 9987 Phase 2.2: Argilla/Label Studio inspired feedback collection
 * 
 * Features:
 * - Content quality ratings (1-5 stars)
 * - Binary accept/reject decisions
 * - Multi-label tagging for issues
 * - Free-text corrections and notes
 * - Feedback aggregation for AI improvement
 * - Reviewer agreement scoring
 * 
 * Use Cases:
 * - AI content review before publishing
 * - Writer persona quality tracking
 * - Translation accuracy verification
 * - Image-caption matching validation
 */

import { log } from '../../lib/logger';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[ContentFeedback] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[ContentFeedback] ${msg}`, data),
};

export type FeedbackType = 
  | 'content_quality'
  | 'translation_accuracy'
  | 'image_relevance'
  | 'seo_compliance'
  | 'factual_accuracy'
  | 'tone_appropriateness';

export type IssueLabel =
  | 'factual_error'
  | 'grammar_issue'
  | 'style_mismatch'
  | 'missing_info'
  | 'outdated_info'
  | 'wrong_translation'
  | 'wrong_image'
  | 'poor_formatting'
  | 'duplicate_content'
  | 'hallucination'
  | 'inappropriate_tone'
  | 'seo_violation'
  | 'other';

export interface FeedbackEntry {
  id: string;
  contentId: string;
  contentType: 'article' | 'attraction' | 'hotel' | 'translation' | 'image_caption';
  feedbackType: FeedbackType;
  
  decision: 'accept' | 'reject' | 'needs_revision';
  rating: number;
  
  issues: IssueLabel[];
  corrections: ContentCorrection[];
  notes: string;
  
  reviewerId: string;
  reviewerRole: 'editor' | 'translator' | 'qa' | 'admin';
  confidence: number;
  
  aiGenerated: boolean;
  aiModel?: string;
  writerPersona?: string;
  
  createdAt: Date;
  reviewTimeSeconds: number;
}

export interface ContentCorrection {
  field: string;
  original: string;
  corrected: string;
  reason?: string;
}

export interface FeedbackStats {
  totalReviews: number;
  acceptRate: number;
  rejectRate: number;
  revisionRate: number;
  averageRating: number;
  averageReviewTime: number;
  commonIssues: { label: IssueLabel; count: number; percentage: number }[];
  ratingDistribution: Record<number, number>;
  reviewerAgreement: number;
}

export interface PersonaPerformance {
  personaId: string;
  personaName: string;
  totalContent: number;
  acceptRate: number;
  averageRating: number;
  commonIssues: IssueLabel[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface FeedbackQuery {
  contentType?: string;
  feedbackType?: FeedbackType;
  decision?: 'accept' | 'reject' | 'needs_revision';
  minRating?: number;
  maxRating?: number;
  issues?: IssueLabel[];
  reviewerId?: string;
  writerPersona?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ContentFeedbackCollector {
  private feedback: Map<string, FeedbackEntry> = new Map();
  private byContent: Map<string, Set<string>> = new Map();
  private byReviewer: Map<string, Set<string>> = new Map();
  private byPersona: Map<string, Set<string>> = new Map();
  
  /**
   * Submit feedback for content
   */
  submitFeedback(entry: Omit<FeedbackEntry, 'id' | 'createdAt'>): FeedbackEntry {
    const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const feedback: FeedbackEntry = {
      ...entry,
      id,
      createdAt: new Date(),
    };
    
    this.feedback.set(id, feedback);
    
    if (!this.byContent.has(entry.contentId)) {
      this.byContent.set(entry.contentId, new Set());
    }
    this.byContent.get(entry.contentId)!.add(id);
    
    if (!this.byReviewer.has(entry.reviewerId)) {
      this.byReviewer.set(entry.reviewerId, new Set());
    }
    this.byReviewer.get(entry.reviewerId)!.add(id);
    
    if (entry.writerPersona) {
      if (!this.byPersona.has(entry.writerPersona)) {
        this.byPersona.set(entry.writerPersona, new Set());
      }
      this.byPersona.get(entry.writerPersona)!.add(id);
    }
    
    logger.info('Feedback submitted', {
      id,
      contentId: entry.contentId,
      decision: entry.decision,
      rating: entry.rating,
      issueCount: entry.issues.length,
    });
    
    return feedback;
  }
  
  /**
   * Quick accept/reject decision
   */
  quickReview(
    contentId: string,
    contentType: FeedbackEntry['contentType'],
    decision: 'accept' | 'reject',
    reviewerId: string,
    options: {
      rating?: number;
      issues?: IssueLabel[];
      notes?: string;
      aiModel?: string;
      writerPersona?: string;
    } = {}
  ): FeedbackEntry {
    return this.submitFeedback({
      contentId,
      contentType,
      feedbackType: 'content_quality',
      decision,
      rating: options.rating || (decision === 'accept' ? 4 : 2),
      issues: options.issues || [],
      corrections: [],
      notes: options.notes || '',
      reviewerId,
      reviewerRole: 'editor',
      confidence: 0.9,
      aiGenerated: true,
      aiModel: options.aiModel,
      writerPersona: options.writerPersona,
      reviewTimeSeconds: 0,
    });
  }
  
  /**
   * Get feedback for specific content
   */
  getContentFeedback(contentId: string): FeedbackEntry[] {
    const feedbackIds = this.byContent.get(contentId);
    if (!feedbackIds) return [];
    
    return Array.from(feedbackIds)
      .map(id => this.feedback.get(id)!)
      .filter(Boolean)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  /**
   * Get aggregated stats
   */
  getStats(query: FeedbackQuery = {}): FeedbackStats {
    const entries = this.queryFeedback(query);
    
    if (entries.length === 0) {
      return {
        totalReviews: 0,
        acceptRate: 0,
        rejectRate: 0,
        revisionRate: 0,
        averageRating: 0,
        averageReviewTime: 0,
        commonIssues: [],
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        reviewerAgreement: 0,
      };
    }
    
    const accepts = entries.filter(e => e.decision === 'accept').length;
    const rejects = entries.filter(e => e.decision === 'reject').length;
    const revisions = entries.filter(e => e.decision === 'needs_revision').length;
    
    const totalRating = entries.reduce((sum, e) => sum + e.rating, 0);
    const totalReviewTime = entries.reduce((sum, e) => sum + e.reviewTimeSeconds, 0);
    
    const issueCounts = new Map<IssueLabel, number>();
    for (const entry of entries) {
      for (const issue of entry.issues) {
        issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
      }
    }
    
    const commonIssues = Array.from(issueCounts.entries())
      .map(([label, count]) => ({
        label,
        count,
        percentage: (count / entries.length) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const entry of entries) {
      const rounded = Math.round(Math.max(1, Math.min(5, entry.rating)));
      ratingDistribution[rounded]++;
    }
    
    const reviewerAgreement = this.calculateReviewerAgreement(entries);
    
    return {
      totalReviews: entries.length,
      acceptRate: (accepts / entries.length) * 100,
      rejectRate: (rejects / entries.length) * 100,
      revisionRate: (revisions / entries.length) * 100,
      averageRating: totalRating / entries.length,
      averageReviewTime: totalReviewTime / entries.length,
      commonIssues,
      ratingDistribution,
      reviewerAgreement,
    };
  }
  
  /**
   * Get performance by writer persona
   */
  getPersonaPerformance(personaId?: string): PersonaPerformance[] {
    const personas = personaId 
      ? [personaId] 
      : Array.from(this.byPersona.keys());
    
    return personas.map(pid => {
      const feedbackIds = this.byPersona.get(pid) || new Set();
      const entries = Array.from(feedbackIds)
        .map(id => this.feedback.get(id)!)
        .filter(Boolean);
      
      if (entries.length === 0) {
        return {
          personaId: pid,
          personaName: pid,
          totalContent: 0,
          acceptRate: 0,
          averageRating: 0,
          commonIssues: [],
          trend: 'stable' as const,
        };
      }
      
      const accepts = entries.filter(e => e.decision === 'accept').length;
      const totalRating = entries.reduce((sum, e) => sum + e.rating, 0);
      
      const issueCounts = new Map<IssueLabel, number>();
      for (const entry of entries) {
        for (const issue of entry.issues) {
          issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1);
        }
      }
      const commonIssues = Array.from(issueCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label]) => label);
      
      const sortedByDate = [...entries].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      const recentHalf = sortedByDate.slice(Math.floor(sortedByDate.length / 2));
      const olderHalf = sortedByDate.slice(0, Math.floor(sortedByDate.length / 2));
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentHalf.length >= 3 && olderHalf.length >= 3) {
        const recentAvg = recentHalf.reduce((s, e) => s + e.rating, 0) / recentHalf.length;
        const olderAvg = olderHalf.reduce((s, e) => s + e.rating, 0) / olderHalf.length;
        if (recentAvg > olderAvg + 0.3) trend = 'improving';
        else if (recentAvg < olderAvg - 0.3) trend = 'declining';
      }
      
      return {
        personaId: pid,
        personaName: pid,
        totalContent: entries.length,
        acceptRate: (accepts / entries.length) * 100,
        averageRating: totalRating / entries.length,
        commonIssues,
        trend,
      };
    });
  }
  
  /**
   * Get training data for AI improvement
   */
  getTrainingData(options: {
    minRating?: number;
    maxRating?: number;
    decision?: 'accept' | 'reject';
    limit?: number;
  } = {}): Array<{
    contentId: string;
    rating: number;
    decision: string;
    issues: IssueLabel[];
    corrections: ContentCorrection[];
    notes: string;
  }> {
    let entries = Array.from(this.feedback.values());
    
    if (options.minRating !== undefined) {
      entries = entries.filter(e => e.rating >= options.minRating!);
    }
    if (options.maxRating !== undefined) {
      entries = entries.filter(e => e.rating <= options.maxRating!);
    }
    if (options.decision) {
      entries = entries.filter(e => e.decision === options.decision);
    }
    
    const sorted = entries.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    const limited = options.limit ? sorted.slice(0, options.limit) : sorted;
    
    return limited.map(e => ({
      contentId: e.contentId,
      rating: e.rating,
      decision: e.decision,
      issues: e.issues,
      corrections: e.corrections,
      notes: e.notes,
    }));
  }
  
  /**
   * Get rejected content for re-generation queue
   */
  getRejectedForRegeneration(limit: number = 50): Array<{
    contentId: string;
    contentType: string;
    issues: IssueLabel[];
    writerPersona?: string;
    rejectedAt: Date;
  }> {
    const rejected = Array.from(this.feedback.values())
      .filter(e => e.decision === 'reject' && e.aiGenerated)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
    
    return rejected.map(e => ({
      contentId: e.contentId,
      contentType: e.contentType,
      issues: e.issues,
      writerPersona: e.writerPersona,
      rejectedAt: e.createdAt,
    }));
  }
  
  /**
   * Query feedback with filters
   */
  private queryFeedback(query: FeedbackQuery): FeedbackEntry[] {
    let entries = Array.from(this.feedback.values());
    
    if (query.contentType) {
      entries = entries.filter(e => e.contentType === query.contentType);
    }
    if (query.feedbackType) {
      entries = entries.filter(e => e.feedbackType === query.feedbackType);
    }
    if (query.decision) {
      entries = entries.filter(e => e.decision === query.decision);
    }
    if (query.minRating !== undefined) {
      entries = entries.filter(e => e.rating >= query.minRating!);
    }
    if (query.maxRating !== undefined) {
      entries = entries.filter(e => e.rating <= query.maxRating!);
    }
    if (query.issues && query.issues.length > 0) {
      entries = entries.filter(e => 
        query.issues!.some(issue => e.issues.includes(issue))
      );
    }
    if (query.reviewerId) {
      entries = entries.filter(e => e.reviewerId === query.reviewerId);
    }
    if (query.writerPersona) {
      entries = entries.filter(e => e.writerPersona === query.writerPersona);
    }
    if (query.startDate) {
      entries = entries.filter(e => e.createdAt >= query.startDate!);
    }
    if (query.endDate) {
      entries = entries.filter(e => e.createdAt <= query.endDate!);
    }
    
    entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (query.offset) {
      entries = entries.slice(query.offset);
    }
    if (query.limit) {
      entries = entries.slice(0, query.limit);
    }
    
    return entries;
  }
  
  /**
   * Calculate inter-reviewer agreement (Cohen's Kappa approximation)
   */
  private calculateReviewerAgreement(entries: FeedbackEntry[]): number {
    const contentReviews = new Map<string, FeedbackEntry[]>();
    
    for (const entry of entries) {
      if (!contentReviews.has(entry.contentId)) {
        contentReviews.set(entry.contentId, []);
      }
      contentReviews.get(entry.contentId)!.push(entry);
    }
    
    let agreements = 0;
    let comparisons = 0;
    
    for (const reviews of contentReviews.values()) {
      if (reviews.length < 2) continue;
      
      for (let i = 0; i < reviews.length - 1; i++) {
        for (let j = i + 1; j < reviews.length; j++) {
          comparisons++;
          if (reviews[i].decision === reviews[j].decision) {
            agreements++;
          }
        }
      }
    }
    
    if (comparisons === 0) return 1.0;
    
    const observedAgreement = agreements / comparisons;
    const expectedAgreement = 1 / 3;
    
    const kappa = (observedAgreement - expectedAgreement) / (1 - expectedAgreement);
    
    return Math.max(0, Math.min(1, kappa));
  }
  
  /**
   * Export feedback for external analysis
   */
  exportForAnalysis(): {
    entries: FeedbackEntry[];
    stats: FeedbackStats;
    personaPerformance: PersonaPerformance[];
  } {
    return {
      entries: Array.from(this.feedback.values()),
      stats: this.getStats(),
      personaPerformance: this.getPersonaPerformance(),
    };
  }
  
  /**
   * Import feedback from external source
   */
  importFeedback(entries: FeedbackEntry[]): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;
    
    for (const entry of entries) {
      if (this.feedback.has(entry.id)) {
        skipped++;
        continue;
      }
      
      this.feedback.set(entry.id, entry);
      
      if (!this.byContent.has(entry.contentId)) {
        this.byContent.set(entry.contentId, new Set());
      }
      this.byContent.get(entry.contentId)!.add(entry.id);
      
      if (!this.byReviewer.has(entry.reviewerId)) {
        this.byReviewer.set(entry.reviewerId, new Set());
      }
      this.byReviewer.get(entry.reviewerId)!.add(entry.id);
      
      if (entry.writerPersona) {
        if (!this.byPersona.has(entry.writerPersona)) {
          this.byPersona.set(entry.writerPersona, new Set());
        }
        this.byPersona.get(entry.writerPersona)!.add(entry.id);
      }
      
      imported++;
    }
    
    logger.info('Feedback imported', { imported, skipped });
    return { imported, skipped };
  }
  
  /**
   * Clear all feedback (for testing)
   */
  clear(): void {
    this.feedback.clear();
    this.byContent.clear();
    this.byReviewer.clear();
    this.byPersona.clear();
  }
}

export const contentFeedbackCollector = new ContentFeedbackCollector();

export function submitFeedback(
  entry: Omit<FeedbackEntry, 'id' | 'createdAt'>
): FeedbackEntry {
  return contentFeedbackCollector.submitFeedback(entry);
}

export function quickReview(
  contentId: string,
  contentType: FeedbackEntry['contentType'],
  decision: 'accept' | 'reject',
  reviewerId: string,
  options?: {
    rating?: number;
    issues?: IssueLabel[];
    notes?: string;
    aiModel?: string;
    writerPersona?: string;
  }
): FeedbackEntry {
  return contentFeedbackCollector.quickReview(
    contentId, contentType, decision, reviewerId, options
  );
}

export function getFeedbackStats(query?: FeedbackQuery): FeedbackStats {
  return contentFeedbackCollector.getStats(query);
}
