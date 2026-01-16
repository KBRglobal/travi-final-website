/**
 * Content Performance - Recommendation Engine
 *
 * Generates fix recommendations for performance issues.
 */

import {
  PerformanceIssue,
  PerformanceIssueType,
  Recommendation,
  RecommendationType,
} from './types';

/**
 * Generate recommendations for an issue.
 */
export function generateRecommendations(issue: PerformanceIssue): Recommendation[] {
  switch (issue.type) {
    case 'low_ctr':
      return getLowCtrRecommendations(issue);
    case 'high_bounce':
      return getHighBounceRecommendations(issue);
    case 'low_dwell':
      return getLowDwellRecommendations(issue);
    case 'no_clicks':
      return getNoClicksRecommendations(issue);
    case 'poor_position':
      return getPoorPositionRecommendations(issue);
    case 'declining_traffic':
      return getDecliningTrafficRecommendations(issue);
    default:
      return [];
  }
}

/**
 * Recommendations for low CTR.
 */
function getLowCtrRecommendations(issue: PerformanceIssue): Recommendation[] {
  return [
    {
      type: 'improve_title',
      priority: 'high',
      title: 'Improve Page Title',
      description: 'Write a more compelling title with power words and clear value proposition',
      estimatedImpact: '+50-100% CTR improvement possible',
      actionable: true,
    },
    {
      type: 'improve_meta',
      priority: 'high',
      title: 'Optimize Meta Description',
      description: 'Write a more engaging meta description with a clear call-to-action',
      estimatedImpact: '+20-50% CTR improvement possible',
      actionable: true,
    },
    {
      type: 'optimize_keywords',
      priority: 'medium',
      title: 'Review Target Keywords',
      description: 'Ensure title and meta match search intent for your target keywords',
      estimatedImpact: 'Better alignment with user intent',
      actionable: true,
    },
  ];
}

/**
 * Recommendations for high bounce rate.
 */
function getHighBounceRecommendations(issue: PerformanceIssue): Recommendation[] {
  return [
    {
      type: 'regenerate_intro',
      priority: 'high',
      title: 'Improve Introduction',
      description: 'Write a more engaging intro that immediately addresses user intent',
      estimatedImpact: '-10-20% bounce rate possible',
      actionable: true,
    },
    {
      type: 'add_internal_links',
      priority: 'medium',
      title: 'Add Internal Links',
      description: 'Add relevant internal links to encourage further exploration',
      estimatedImpact: 'Increased pages per session',
      actionable: true,
    },
    {
      type: 'improve_content',
      priority: 'medium',
      title: 'Improve Content Quality',
      description: 'Ensure content delivers on the promise of the title/meta',
      estimatedImpact: 'Better user satisfaction',
      actionable: true,
    },
    {
      type: 'add_images',
      priority: 'low',
      title: 'Add Visual Content',
      description: 'Add relevant images to break up text and increase engagement',
      estimatedImpact: 'Improved visual engagement',
      actionable: true,
    },
  ];
}

/**
 * Recommendations for low dwell time.
 */
function getLowDwellRecommendations(issue: PerformanceIssue): Recommendation[] {
  return [
    {
      type: 'improve_content',
      priority: 'high',
      title: 'Expand Content Depth',
      description: 'Add more valuable, detailed information that keeps readers engaged',
      estimatedImpact: '+30-60 seconds dwell time',
      actionable: true,
    },
    {
      type: 'add_images',
      priority: 'medium',
      title: 'Add Visual Content',
      description: 'Include images, infographics, or videos to increase engagement time',
      estimatedImpact: '+20-40 seconds dwell time',
      actionable: true,
    },
    {
      type: 'add_internal_links',
      priority: 'medium',
      title: 'Add Interactive Elements',
      description: 'Add related content links, TOC, or interactive elements',
      estimatedImpact: 'Increased time on page',
      actionable: true,
    },
  ];
}

/**
 * Recommendations for no clicks despite impressions.
 */
function getNoClicksRecommendations(issue: PerformanceIssue): Recommendation[] {
  return [
    {
      type: 'improve_title',
      priority: 'high',
      title: 'Completely Revise Title',
      description: 'The current title is not attracting any clicks - needs complete overhaul',
      estimatedImpact: 'Essential for any clicks',
      actionable: true,
    },
    {
      type: 'improve_meta',
      priority: 'high',
      title: 'Rewrite Meta Description',
      description: 'Create a compelling meta description with clear value proposition',
      estimatedImpact: 'Critical for generating clicks',
      actionable: true,
    },
    {
      type: 'optimize_keywords',
      priority: 'high',
      title: 'Review Keyword Targeting',
      description: 'Content may be ranking for wrong keywords - review and realign',
      estimatedImpact: 'Better search match',
      actionable: true,
    },
  ];
}

/**
 * Recommendations for poor search position.
 */
function getPoorPositionRecommendations(issue: PerformanceIssue): Recommendation[] {
  return [
    {
      type: 'improve_content',
      priority: 'high',
      title: 'Enhance Content Quality',
      description: 'Add more comprehensive, authoritative content to improve rankings',
      estimatedImpact: 'Potential position improvement',
      actionable: true,
    },
    {
      type: 'add_entities',
      priority: 'high',
      title: 'Link More Entities',
      description: 'Add more relevant entities to improve topical authority',
      estimatedImpact: 'Better semantic signals',
      actionable: true,
    },
    {
      type: 'add_internal_links',
      priority: 'medium',
      title: 'Build Internal Links',
      description: 'Get more internal links from high-authority pages',
      estimatedImpact: 'Improved page authority',
      actionable: true,
    },
    {
      type: 'optimize_keywords',
      priority: 'medium',
      title: 'Optimize Keyword Usage',
      description: 'Ensure target keywords are properly used in content',
      estimatedImpact: 'Better keyword relevance',
      actionable: true,
    },
  ];
}

/**
 * Recommendations for declining traffic.
 */
function getDecliningTrafficRecommendations(issue: PerformanceIssue): Recommendation[] {
  return [
    {
      type: 'improve_content',
      priority: 'high',
      title: 'Update Content',
      description: 'Content may be outdated - refresh with current information',
      estimatedImpact: 'Restored or improved rankings',
      actionable: true,
    },
    {
      type: 'optimize_keywords',
      priority: 'medium',
      title: 'Review Keyword Changes',
      description: 'Search trends may have shifted - update keyword targeting',
      estimatedImpact: 'Alignment with current trends',
      actionable: true,
    },
  ];
}

/**
 * Enrich issues with recommendations.
 */
export function enrichIssuesWithRecommendations(
  issues: PerformanceIssue[]
): PerformanceIssue[] {
  return issues.map(issue => ({
    ...issue,
    recommendations: generateRecommendations(issue),
  }));
}

/**
 * Get prioritized action list from issues.
 */
export function getPrioritizedActions(
  issues: PerformanceIssue[]
): Array<{
  contentId: string;
  issueType: PerformanceIssueType;
  recommendation: Recommendation;
}> {
  const actions: Array<{
    contentId: string;
    issueType: PerformanceIssueType;
    recommendation: Recommendation;
  }> = [];

  for (const issue of issues) {
    const recommendations = generateRecommendations(issue);
    for (const rec of recommendations) {
      if (rec.actionable) {
        actions.push({
          contentId: issue.contentId,
          issueType: issue.type,
          recommendation: rec,
        });
      }
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return actions.sort(
    (a, b) => priorityOrder[a.recommendation.priority] - priorityOrder[b.recommendation.priority]
  );
}
