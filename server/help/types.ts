/**
 * Help Center - Type Definitions
 */

import type { HelpCategory, HelpArticle, ContentBlock } from '@shared/schema';

// Re-export schema types
export type { HelpCategory, HelpArticle };

// Feature flag
export function isHelpCenterEnabled(): boolean {
  return process.env.ENABLE_HELP_CENTER === 'true';
}

// API Response types
export interface HelpCategoryWithArticles extends HelpCategory {
  articles: HelpArticle[];
  articleCount: number;
}

export interface HelpArticleWithCategory extends HelpArticle {
  category: HelpCategory;
}

// Search types
export interface HelpSearchResult {
  articles: HelpArticle[];
  total: number;
  query: string;
}

// Stats types
export interface HelpStats {
  totalCategories: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  publishedPercent: number;
  topViewedArticles: Array<{
    id: string;
    title: string;
    viewCount: number;
    categoryTitle: string;
  }>;
}

// Input types for mutations
export interface CreateCategoryInput {
  slug: string;
  title: string;
  description?: string;
  icon?: string;
  locale?: string;
  order?: number;
}

export interface UpdateCategoryInput {
  slug?: string;
  title?: string;
  description?: string;
  icon?: string;
  locale?: string;
  order?: number;
  isActive?: boolean;
}

export interface CreateArticleInput {
  categoryId: string;
  slug: string;
  title: string;
  summary?: string;
  blocks?: ContentBlock[];
  metaTitle?: string;
  metaDescription?: string;
  locale?: string;
  order?: number;
  authorId?: string;
}

export interface UpdateArticleInput {
  categoryId?: string;
  slug?: string;
  title?: string;
  summary?: string;
  blocks?: ContentBlock[];
  metaTitle?: string;
  metaDescription?: string;
  locale?: string;
  order?: number;
  status?: 'draft' | 'published';
}
