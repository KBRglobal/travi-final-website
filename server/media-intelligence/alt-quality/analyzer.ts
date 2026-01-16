/**
 * AI-Assisted Alt Text & Caption Quality Analyzer
 *
 * Evaluates alt text presence, keyword relevance, entity alignment,
 * and AEO friendliness. Proposes improvements without auto-applying.
 */

import { db } from '../../db';
import { mediaAssets, contents } from '@shared/schema';
import { eq, sql, isNull, not } from 'drizzle-orm';
import {
  getMediaIntelligenceConfig,
  isAltAnalysisEnabled,
  type IssueSeverity,
  type ImageContext,
} from '../config';
import type {
  AltTextAnalysis,
  MediaIssue,
} from '../types';
import { log } from '../../lib/logger';
import {
  extractMediaReferencesFromBlocks,
  normalizeMediaPath,
} from '../../media/library/references';
import type { ContentBlock, GalleryImage } from '@shared/schema';

/**
 * Analyze alt text quality for an image
 */
export function analyzeAltText(
  imagePath: string,
  currentAlt: string | null,
  imageContext: ImageContext,
  contentKeywords?: string[],
  contentTitle?: string
): AltTextAnalysis {
  const config = getMediaIntelligenceConfig();
  const issues: AltTextAnalysis['issues'] = [];

  // Check if alt exists
  const hasAlt = !!currentAlt && currentAlt.trim().length > 0;
  const trimmedAlt = currentAlt?.trim() || '';
  const length = trimmedAlt.length;

  // Check for generic patterns
  const isGeneric = config.altText.genericPatterns.some(pattern =>
    trimmedAlt.toLowerCase().includes(pattern.toLowerCase()) &&
    trimmedAlt.length < 30
  );

  // Check if descriptive (has multiple meaningful words)
  const words = trimmedAlt.split(/\s+/).filter(w => w.length > 2);
  const isDescriptive = words.length >= 3;

  // Check for keyword stuffing (too many repetitions)
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    const lower = word.toLowerCase();
    wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1);
  }
  const hasKeywordStuffing = Array.from(wordCounts.values()).some(count => count > 3);

  // Check if keywords from content are present
  let hasKeywords = false;
  let matchingKeywords: string[] = [];
  if (contentKeywords && contentKeywords.length > 0 && trimmedAlt) {
    const altLower = trimmedAlt.toLowerCase();
    matchingKeywords = contentKeywords.filter(kw =>
      altLower.includes(kw.toLowerCase())
    );
    hasKeywords = matchingKeywords.length > 0;
  }

  // Check context match
  let matchesContext = true;
  if (imageContext === 'hero' && trimmedAlt && !isDescriptive) {
    matchesContext = false;
  }

  // Calculate quality score
  let score = 0;

  if (!hasAlt) {
    score = 0;
    issues.push({
      type: 'missing',
      message: 'Alt text is missing',
      severity: imageContext === 'hero' ? 'critical' : 'high',
    });
  } else {
    // Base score for having alt text
    score = 30;

    // Length scoring
    if (length >= config.altText.minLength && length <= config.altText.maxLength) {
      score += 20;
    } else if (length < config.altText.minLength) {
      score += 5;
      issues.push({
        type: 'too_short',
        message: `Alt text is too short (${length} chars, minimum ${config.altText.minLength})`,
        severity: 'medium',
      });
    } else if (length > config.altText.maxLength) {
      score += 10;
      issues.push({
        type: 'too_long',
        message: `Alt text is too long (${length} chars, maximum ${config.altText.maxLength})`,
        severity: 'low',
      });
    }

    // Generic check
    if (isGeneric) {
      score -= 20;
      issues.push({
        type: 'generic',
        message: 'Alt text appears to be generic or auto-generated',
        severity: 'medium',
      });
    } else {
      score += 15;
    }

    // Descriptive check
    if (isDescriptive) {
      score += 15;
    }

    // Keyword stuffing check
    if (hasKeywordStuffing) {
      score -= 15;
      issues.push({
        type: 'keyword_stuffing',
        message: 'Alt text may contain keyword stuffing',
        severity: 'medium',
      });
    }

    // Keyword presence
    if (hasKeywords) {
      score += 10;
    }

    // Context match
    if (!matchesContext) {
      score -= 10;
      issues.push({
        type: 'misleading',
        message: 'Alt text may not adequately describe this important image',
        severity: 'medium',
      });
    } else {
      score += 10;
    }
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Generate proposed improvement if quality is low
  let proposedAlt: string | undefined;
  let proposedAltReason: string | undefined;

  if (score < 60 && contentTitle) {
    proposedAlt = generateAltSuggestion(imagePath, imageContext, contentTitle, contentKeywords);
    proposedAltReason = score === 0
      ? 'Alt text is missing - this suggestion provides a starting point'
      : 'Current alt text could be more descriptive and SEO-friendly';
  }

  return {
    path: imagePath,
    imageContext,
    currentAlt,
    quality: {
      score,
      hasAlt,
      length,
      isGeneric,
      hasKeywords,
      isDescriptive,
      matchesContext,
    },
    issues,
    proposedAlt,
    proposedAltReason,
    entityAlignment: {
      matchesContentTopic: hasKeywords,
      relevantEntities: matchingKeywords,
    },
  };
}

/**
 * Analyze all alt texts for a content item
 */
export async function analyzeContentAltTexts(
  contentId: string
): Promise<{
  contentId: string;
  title: string;
  analyses: AltTextAnalysis[];
  summary: {
    totalImages: number;
    withAlt: number;
    withGoodAlt: number; // score >= 70
    averageScore: number;
    issues: MediaIssue[];
  };
}> {
  if (!isAltAnalysisEnabled()) {
    return {
      contentId,
      title: '',
      analyses: [],
      summary: {
        totalImages: 0,
        withAlt: 0,
        withGoodAlt: 0,
        averageScore: 0,
        issues: [],
      },
    };
  }

  // Get content
  const [content] = await db
    .select()
    .from(contents)
    .where(eq(contents.id, contentId))
    .limit(1);

  if (!content) {
    return {
      contentId,
      title: '',
      analyses: [],
      summary: {
        totalImages: 0,
        withAlt: 0,
        withGoodAlt: 0,
        averageScore: 0,
        issues: [],
      },
    };
  }

  const analyses: AltTextAnalysis[] = [];
  const keywords = [
    content.primaryKeyword,
    ...(content.secondaryKeywords || []),
  ].filter(Boolean) as string[];

  // Analyze hero image
  if (content.heroImage) {
    const analysis = analyzeAltText(
      content.heroImage,
      content.heroImageAlt,
      'hero',
      keywords,
      content.title
    );
    analyses.push(analysis);
  }

  // Analyze card image
  if (content.cardImage) {
    const analysis = analyzeAltText(
      content.cardImage,
      content.cardImageAlt,
      'card',
      keywords,
      content.title
    );
    analyses.push(analysis);
  }

  // Analyze gallery images from blocks
  const blocks = content.blocks as ContentBlock[];
  if (blocks && Array.isArray(blocks)) {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue;

      const blockType = (block as { type?: string }).type;
      const data = (block as { data?: Record<string, unknown> }).data;

      if (!data) continue;

      if (blockType === 'gallery') {
        const images = data.images as GalleryImage[] | undefined;
        if (Array.isArray(images)) {
          for (const img of images) {
            const analysis = analyzeAltText(
              img.image,
              img.alt,
              'gallery',
              keywords,
              content.title
            );
            analyses.push(analysis);
          }
        }
      }

      // Check for inline images
      if (blockType === 'image' && data.image) {
        const analysis = analyzeAltText(
          data.image as string,
          data.alt as string | null,
          'inline',
          keywords,
          content.title
        );
        analyses.push(analysis);
      }
    }
  }

  // Calculate summary
  const withAlt = analyses.filter(a => a.quality.hasAlt).length;
  const withGoodAlt = analyses.filter(a => a.quality.score >= 70).length;
  const totalScore = analyses.reduce((sum, a) => sum + a.quality.score, 0);
  const averageScore = analyses.length > 0 ? Math.round(totalScore / analyses.length) : 0;

  // Collect all issues
  const issues: MediaIssue[] = [];
  for (const analysis of analyses) {
    for (const issue of analysis.issues) {
      issues.push({
        id: `alt-${issue.type}-${analysis.path}`,
        type: `alt_${issue.type}`,
        severity: issue.severity,
        message: issue.message,
        details: {
          imagePath: analysis.path,
          imageContext: analysis.imageContext,
          currentAlt: analysis.currentAlt,
        },
        contentId,
      });
    }
  }

  return {
    contentId,
    title: content.title,
    analyses,
    summary: {
      totalImages: analyses.length,
      withAlt,
      withGoodAlt,
      averageScore,
      issues,
    },
  };
}

/**
 * Get alt text quality summary across all content
 */
export async function getAltTextSummary(): Promise<{
  totalImages: number;
  withAlt: number;
  withoutAlt: number;
  averageScore: number;
  issuesByType: Record<string, number>;
  contentWithPoorAlt: Array<{
    contentId: string;
    title: string;
    imagesWithoutAlt: number;
    averageScore: number;
  }>;
}> {
  if (!isAltAnalysisEnabled()) {
    return {
      totalImages: 0,
      withAlt: 0,
      withoutAlt: 0,
      averageScore: 0,
      issuesByType: {},
      contentWithPoorAlt: [],
    };
  }

  // Get all published content
  const allContent = await db
    .select()
    .from(contents)
    .where(eq(contents.status, 'published'));

  let totalImages = 0;
  let withAlt = 0;
  let totalScore = 0;
  const issuesByType: Record<string, number> = {};
  const contentWithPoorAlt: Array<{
    contentId: string;
    title: string;
    imagesWithoutAlt: number;
    averageScore: number;
  }> = [];

  for (const content of allContent) {
    let contentImages = 0;
    let contentWithAlt = 0;
    let contentTotalScore = 0;

    const keywords = [
      content.primaryKeyword,
      ...(content.secondaryKeywords || []),
    ].filter(Boolean) as string[];

    // Check hero image
    if (content.heroImage) {
      contentImages++;
      totalImages++;
      const analysis = analyzeAltText(
        content.heroImage,
        content.heroImageAlt,
        'hero',
        keywords,
        content.title
      );
      contentTotalScore += analysis.quality.score;
      totalScore += analysis.quality.score;
      if (analysis.quality.hasAlt) {
        contentWithAlt++;
        withAlt++;
      }
      for (const issue of analysis.issues) {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      }
    }

    // Check card image
    if (content.cardImage) {
      contentImages++;
      totalImages++;
      const analysis = analyzeAltText(
        content.cardImage,
        content.cardImageAlt,
        'card',
        keywords,
        content.title
      );
      contentTotalScore += analysis.quality.score;
      totalScore += analysis.quality.score;
      if (analysis.quality.hasAlt) {
        contentWithAlt++;
        withAlt++;
      }
      for (const issue of analysis.issues) {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      }
    }

    // Check gallery images
    const blocks = content.blocks as ContentBlock[];
    if (blocks && Array.isArray(blocks)) {
      for (const block of blocks) {
        if (!block || typeof block !== 'object') continue;
        const blockType = (block as { type?: string }).type;
        const data = (block as { data?: Record<string, unknown> }).data;
        if (!data) continue;

        if (blockType === 'gallery') {
          const images = data.images as GalleryImage[] | undefined;
          if (Array.isArray(images)) {
            for (const img of images) {
              contentImages++;
              totalImages++;
              const analysis = analyzeAltText(
                img.image,
                img.alt,
                'gallery',
                keywords,
                content.title
              );
              contentTotalScore += analysis.quality.score;
              totalScore += analysis.quality.score;
              if (analysis.quality.hasAlt) {
                contentWithAlt++;
                withAlt++;
              }
              for (const issue of analysis.issues) {
                issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
              }
            }
          }
        }
      }
    }

    // Track content with poor alt text
    const avgScore = contentImages > 0 ? Math.round(contentTotalScore / contentImages) : 0;
    const imagesWithoutAlt = contentImages - contentWithAlt;

    if (imagesWithoutAlt > 0 || avgScore < 60) {
      contentWithPoorAlt.push({
        contentId: content.id,
        title: content.title,
        imagesWithoutAlt,
        averageScore: avgScore,
      });
    }
  }

  // Sort by worst first
  contentWithPoorAlt.sort((a, b) => a.averageScore - b.averageScore);

  return {
    totalImages,
    withAlt,
    withoutAlt: totalImages - withAlt,
    averageScore: totalImages > 0 ? Math.round(totalScore / totalImages) : 0,
    issuesByType,
    contentWithPoorAlt: contentWithPoorAlt.slice(0, 20),
  };
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

function generateAltSuggestion(
  imagePath: string,
  imageContext: ImageContext,
  contentTitle: string,
  keywords?: string[]
): string {
  // Extract filename hints
  const filename = imagePath.split('/').pop() || '';
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const nameWords = nameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\d+/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w.toLowerCase());

  // Start with context-appropriate prefix
  let suggestion = '';

  switch (imageContext) {
    case 'hero':
      suggestion = `${contentTitle} - Featured image`;
      break;
    case 'card':
      suggestion = `${contentTitle} preview`;
      break;
    case 'gallery':
      // Try to use filename hints
      if (nameWords.length > 0) {
        const cleanWords = nameWords.filter(w =>
          !['img', 'image', 'photo', 'pic', 'dsc', 'screenshot'].includes(w)
        );
        if (cleanWords.length > 0) {
          suggestion = `${cleanWords.join(' ')} at ${contentTitle}`;
        } else {
          suggestion = `Photo from ${contentTitle}`;
        }
      } else {
        suggestion = `Photo from ${contentTitle}`;
      }
      break;
    default:
      suggestion = `Image related to ${contentTitle}`;
  }

  // Add a keyword if available and not already included
  if (keywords && keywords.length > 0) {
    const keyword = keywords[0];
    if (!suggestion.toLowerCase().includes(keyword.toLowerCase())) {
      if (suggestion.length + keyword.length < 120) {
        suggestion = `${suggestion} - ${keyword}`;
      }
    }
  }

  // Ensure proper capitalization
  suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1);

  // Truncate if too long
  if (suggestion.length > 125) {
    suggestion = suggestion.substring(0, 122) + '...';
  }

  return suggestion;
}
