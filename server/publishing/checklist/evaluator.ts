/**
 * Pre-Publish Checklist Evaluator
 *
 * Evaluates content against a checklist of requirements.
 * Provides detailed feedback on what's blocking publication.
 *
 * FEATURE 5: Pre-Publish Checklist UI
 */

import { db } from "../../db";
import { contents, searchIndex } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  type ChecklistResult,
  type ChecklistItem,
  type ChecklistCategory,
  type ContentData,
  type CheckResult,
} from "./types";

/**
 * Checklist checks definition
 */
const CHECKS = {
  // Content checks
  hasTitle: {
    id: 'has_title',
    name: 'Title exists',
    description: 'Content must have a title',
    category: 'content' as ChecklistCategory,
    priority: 'required' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.title || content.title.trim().length === 0) {
        return { status: 'fail', message: 'Title is required' };
      }
      if (content.title.length < 10) {
        return { status: 'warning', message: 'Title is very short (< 10 characters)' };
      }
      return { status: 'pass', message: 'Title is set' };
    },
  },
  hasBody: {
    id: 'has_body',
    name: 'Body content exists',
    description: 'Content must have body blocks',
    category: 'content' as ChecklistCategory,
    priority: 'required' as const,
    check: (content: ContentData): CheckResult => {
      const blocks = content.blocks as unknown[] | null;
      if (!blocks || blocks.length === 0) {
        return { status: 'fail', message: 'Content has no body blocks' };
      }
      if (blocks.length < 2) {
        return { status: 'warning', message: 'Content has minimal body (only 1 block)' };
      }
      return { status: 'pass', message: `${blocks.length} content blocks` };
    },
  },
  hasSlug: {
    id: 'has_slug',
    name: 'URL slug set',
    description: 'Content must have a unique URL slug',
    category: 'content' as ChecklistCategory,
    priority: 'required' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.slug) {
        return { status: 'fail', message: 'URL slug is required' };
      }
      if (content.slug.includes(' ')) {
        return { status: 'fail', message: 'Slug contains spaces (invalid URL)' };
      }
      return { status: 'pass', message: `Slug: /${content.slug}` };
    },
  },
  hasMinWordCount: {
    id: 'min_word_count',
    name: 'Minimum word count',
    description: 'Content should have sufficient word count',
    category: 'content' as ChecklistCategory,
    priority: 'recommended' as const,
    check: (content: ContentData): CheckResult => {
      const wordCount = content.wordCount || 0;
      if (wordCount < 100) {
        return { status: 'warning', message: `Only ${wordCount} words (recommended: 300+)` };
      }
      if (wordCount < 300) {
        return { status: 'pass', message: `${wordCount} words (good, aim for 500+)` };
      }
      return { status: 'pass', message: `${wordCount} words` };
    },
  },

  // SEO checks
  hasMetaTitle: {
    id: 'has_meta_title',
    name: 'Meta title set',
    description: 'SEO meta title is configured',
    category: 'seo' as ChecklistCategory,
    priority: 'recommended' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.metaTitle) {
        return { status: 'warning', message: 'Meta title not set (will use page title)' };
      }
      if (content.metaTitle.length > 60) {
        return { status: 'warning', message: `Meta title too long (${content.metaTitle.length}/60 chars)` };
      }
      if (content.metaTitle.length < 30) {
        return { status: 'warning', message: `Meta title short (${content.metaTitle.length}/60 chars)` };
      }
      return { status: 'pass', message: `${content.metaTitle.length}/60 characters` };
    },
  },
  hasMetaDescription: {
    id: 'has_meta_description',
    name: 'Meta description set',
    description: 'SEO meta description is configured',
    category: 'seo' as ChecklistCategory,
    priority: 'recommended' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.metaDescription) {
        return { status: 'warning', message: 'Meta description not set' };
      }
      if (content.metaDescription.length > 160) {
        return { status: 'warning', message: `Description too long (${content.metaDescription.length}/160 chars)` };
      }
      if (content.metaDescription.length < 70) {
        return { status: 'warning', message: `Description short (${content.metaDescription.length}/160 chars)` };
      }
      return { status: 'pass', message: `${content.metaDescription.length}/160 characters` };
    },
  },
  hasPrimaryKeyword: {
    id: 'has_primary_keyword',
    name: 'Primary keyword set',
    description: 'Target keyword for SEO is configured',
    category: 'seo' as ChecklistCategory,
    priority: 'recommended' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.primaryKeyword) {
        return { status: 'warning', message: 'No primary keyword set' };
      }
      return { status: 'pass', message: `"${content.primaryKeyword}"` };
    },
  },
  seoScoreCheck: {
    id: 'seo_score',
    name: 'SEO score acceptable',
    description: 'Content has a good SEO score',
    category: 'seo' as ChecklistCategory,
    priority: 'recommended' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.seoScore) {
        return { status: 'warning', message: 'SEO score not calculated' };
      }
      if (content.seoScore < 30) {
        return { status: 'fail', message: `SEO score very low (${content.seoScore}/100)` };
      }
      if (content.seoScore < 50) {
        return { status: 'warning', message: `SEO score needs improvement (${content.seoScore}/100)` };
      }
      if (content.seoScore >= 80) {
        return { status: 'pass', message: `Excellent SEO score (${content.seoScore}/100)` };
      }
      return { status: 'pass', message: `Good SEO score (${content.seoScore}/100)` };
    },
  },

  // AEO checks
  hasAnswerCapsule: {
    id: 'has_answer_capsule',
    name: 'Answer capsule exists',
    description: 'AI-optimized answer summary for search engines',
    category: 'aeo' as ChecklistCategory,
    priority: 'recommended' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.answerCapsule) {
        return { status: 'warning', message: 'No answer capsule for AI engines' };
      }
      const words = content.answerCapsule.trim().split(/\s+/).length;
      if (words < 30) {
        return { status: 'warning', message: `Answer capsule short (${words} words, aim for 40-60)` };
      }
      if (words > 80) {
        return { status: 'warning', message: `Answer capsule long (${words} words, aim for 40-60)` };
      }
      return { status: 'pass', message: `${words} words (ideal: 40-60)` };
    },
  },
  aeoScoreCheck: {
    id: 'aeo_score',
    name: 'AEO score acceptable',
    description: 'Content is optimized for AI answer engines',
    category: 'aeo' as ChecklistCategory,
    priority: 'optional' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.aeoScore) {
        return { status: 'skip', message: 'AEO score not calculated' };
      }
      if (content.aeoScore < 30) {
        return { status: 'warning', message: `AEO score low (${content.aeoScore}/100)` };
      }
      if (content.aeoScore >= 70) {
        return { status: 'pass', message: `Good AEO score (${content.aeoScore}/100)` };
      }
      return { status: 'pass', message: `AEO score (${content.aeoScore}/100)` };
    },
  },

  // Media checks
  hasHeroImage: {
    id: 'has_hero_image',
    name: 'Hero image set',
    description: 'Main visual for the content',
    category: 'media' as ChecklistCategory,
    priority: 'recommended' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.heroImage) {
        return { status: 'warning', message: 'No hero image set' };
      }
      return { status: 'pass', message: 'Hero image configured' };
    },
  },
  hasCardImage: {
    id: 'has_card_image',
    name: 'Card/thumbnail image set',
    description: 'Image for list views and social sharing',
    category: 'media' as ChecklistCategory,
    priority: 'optional' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.cardImage) {
        if (content.heroImage) {
          return { status: 'pass', message: 'Will use hero image for cards' };
        }
        return { status: 'warning', message: 'No card image (hero will be used)' };
      }
      return { status: 'pass', message: 'Card image configured' };
    },
  },

  // Compliance checks
  isIndexed: {
    id: 'is_indexed',
    name: 'Search indexed',
    description: 'Content is indexed for internal search',
    category: 'compliance' as ChecklistCategory,
    priority: 'optional' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.isIndexed) {
        return { status: 'warning', message: 'Not yet indexed (will be indexed on publish)' };
      }
      return { status: 'pass', message: 'Indexed in search' };
    },
  },
  hasEntities: {
    id: 'has_entities',
    name: 'Entities extracted',
    description: 'Content has extracted entities for AI',
    category: 'compliance' as ChecklistCategory,
    priority: 'optional' as const,
    check: (content: ContentData): CheckResult => {
      if (!content.hasEntities) {
        return { status: 'skip', message: 'No entities extracted yet' };
      }
      return { status: 'pass', message: 'Entities extracted' };
    },
  },
};

/**
 * Get checks applicable to a content type
 */
function getChecksForContentType(contentType: string): typeof CHECKS[keyof typeof CHECKS][] {
  // All checks apply to all content types for now
  // Could be customized per type in future
  const allChecks = Object.values(CHECKS);

  // Filter based on content type if needed
  if (contentType === 'article') {
    // Articles might not need hero images as strictly
    return allChecks;
  }

  return allChecks;
}

/**
 * Evaluate the pre-publish checklist for a content item
 */
export async function evaluateChecklist(contentId: string): Promise<ChecklistResult> {
  const evaluatedAt = new Date();

  try {
    // Fetch content data
    const [content] = await db
      .select({
        id: contents.id,
        title: contents.title,
        type: contents.type,
        status: contents.status,
        slug: contents.slug,
        blocks: contents.blocks,
        answerCapsule: contents.answerCapsule,
        aeoScore: contents.aeoScore,
        seoScore: contents.seoScore,
        metaTitle: contents.metaTitle,
        metaDescription: contents.metaDescription,
        primaryKeyword: contents.primaryKeyword,
        heroImage: contents.heroImage,
        cardImage: contents.cardImage,
        wordCount: contents.wordCount,
      })
      .from(contents)
      .where(eq(contents.id, contentId));

    if (!content) {
      return createErrorResult(contentId, 'Content not found', evaluatedAt);
    }

    // Check if indexed
    const [indexed] = await db
      .select({ contentId: searchIndex.contentId })
      .from(searchIndex)
      .where(eq(searchIndex.contentId, contentId));

    // Build content data for checks
    const contentData: ContentData = {
      id: content.id,
      title: content.title,
      type: content.type,
      status: content.status,
      slug: content.slug,
      blocks: content.blocks as unknown[] | null,
      answerCapsule: content.answerCapsule,
      aeoScore: content.aeoScore,
      seoScore: content.seoScore,
      metaTitle: content.metaTitle,
      metaDescription: content.metaDescription,
      primaryKeyword: content.primaryKeyword,
      heroImage: content.heroImage,
      cardImage: content.cardImage,
      wordCount: content.wordCount,
      isIndexed: !!indexed,
      hasEntities: !!content.answerCapsule, // proxy
    };

    // Run all applicable checks
    const checks = getChecksForContentType(content.type);
    const items: ChecklistItem[] = [];

    for (const check of checks) {
      const result = check.check(contentData);
      items.push({
        id: check.id,
        name: check.name,
        description: check.description,
        category: check.category,
        priority: check.priority,
        status: result.status,
        message: result.message,
      });
    }

    // Calculate summary
    const summary = {
      passed: items.filter(i => i.status === 'pass').length,
      failed: items.filter(i => i.status === 'fail').length,
      warnings: items.filter(i => i.status === 'warning').length,
      skipped: items.filter(i => i.status === 'skip').length,
      total: items.length,
    };

    // Group by category
    const categories: ChecklistResult['categories'] = {};
    for (const item of items) {
      if (!categories[item.category]) {
        categories[item.category] = {
          score: 0,
          passed: 0,
          total: 0,
          items: [],
        };
      }
      categories[item.category]!.items.push(item);
      categories[item.category]!.total++;
      if (item.status === 'pass') {
        categories[item.category]!.passed++;
      }
    }

    // Calculate category scores
    for (const cat of Object.keys(categories) as ChecklistCategory[]) {
      const catData = categories[cat]!;
      catData.score = catData.total > 0 ? Math.round((catData.passed / catData.total) * 100) : 0;
    }

    // Calculate overall score (only count required items for blocking)
    const requiredItems = items.filter(i => i.priority === 'required');
    const requiredPassed = requiredItems.filter(i => i.status === 'pass').length;
    const canPublish = requiredItems.every(i => i.status === 'pass');

    const overallScore = items.length > 0
      ? Math.round((summary.passed / (summary.passed + summary.failed + summary.warnings)) * 100)
      : 0;

    // Get blocking and warning items
    const blockingItems = items.filter(i => i.status === 'fail' && i.priority === 'required');
    const warningItems = items.filter(i => i.status === 'warning' || (i.status === 'fail' && i.priority !== 'required'));

    return {
      contentId: content.id,
      contentTitle: content.title,
      contentType: content.type,
      canPublish,
      overallScore,
      categories,
      summary,
      blockingItems,
      warningItems,
      evaluatedAt,
    };
  } catch (error) {
    console.error('[Checklist] Error evaluating:', error);
    return createErrorResult(contentId, 'Evaluation failed', evaluatedAt);
  }
}

/**
 * Create an error result
 */
function createErrorResult(contentId: string, message: string, evaluatedAt: Date): ChecklistResult {
  return {
    contentId,
    contentTitle: 'Unknown',
    contentType: 'unknown',
    canPublish: false,
    overallScore: 0,
    categories: {},
    summary: { passed: 0, failed: 1, warnings: 0, skipped: 0, total: 1 },
    blockingItems: [{
      id: 'error',
      name: 'Evaluation Error',
      description: message,
      category: 'content',
      priority: 'required',
      status: 'fail',
      message,
    }],
    warningItems: [],
    evaluatedAt,
  };
}

/**
 * Quick check if content passes all required checks
 */
export async function passesRequiredChecks(contentId: string): Promise<boolean> {
  const result = await evaluateChecklist(contentId);
  return result.canPublish;
}
