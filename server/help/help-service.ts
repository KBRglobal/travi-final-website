/**
 * Help Center - Service Layer
 *
 * Business logic for help center operations.
 */

import { log } from '../lib/logger';
import * as repo from './help-repository';
import type {
  HelpCategory,
  HelpArticle,
  HelpCategoryWithArticles,
  HelpArticleWithCategory,
  HelpStats,
  HelpSearchResult,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateArticleInput,
  UpdateArticleInput,
} from './types';
import { isHelpCenterEnabled } from './types';

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[HelpCenter] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => log.error(`[HelpCenter] ${msg}`, undefined, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[HelpCenter] ${msg}`, data),
};

// ============================================================================
// Categories
// ============================================================================

export async function getCategories(locale: string = 'en'): Promise<HelpCategory[]> {
  if (!isHelpCenterEnabled()) {
    return [];
  }
  return repo.getAllCategories(locale);
}

export async function getCategoriesAdmin(): Promise<HelpCategory[]> {
  return repo.getAllCategoriesAdmin();
}

export async function getCategory(id: string): Promise<HelpCategory | null> {
  return repo.getCategoryById(id);
}

export async function getCategoryBySlug(
  slug: string,
  locale: string = 'en'
): Promise<HelpCategoryWithArticles | null> {
  if (!isHelpCenterEnabled()) {
    return null;
  }
  return repo.getCategoryWithArticles(slug, locale);
}

export async function createCategory(input: CreateCategoryInput): Promise<HelpCategory> {
  // Validate slug uniqueness
  const exists = await repo.categorySlugExists(input.slug);
  if (exists) {
    throw new Error(`Category with slug "${input.slug}" already exists`);
  }

  // Normalize slug
  const normalizedInput = {
    ...input,
    slug: normalizeSlug(input.slug),
  };

  const category = await repo.createCategory(normalizedInput);
  logger.info('Category created', { id: category.id, slug: category.slug });
  return category;
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<HelpCategory> {
  // Validate category exists
  const existing = await repo.getCategoryById(id);
  if (!existing) {
    throw new Error('Category not found');
  }

  // Validate slug uniqueness if changing
  if (input.slug && input.slug !== existing.slug) {
    const exists = await repo.categorySlugExists(input.slug, id);
    if (exists) {
      throw new Error(`Category with slug "${input.slug}" already exists`);
    }
    input.slug = normalizeSlug(input.slug);
  }

  const updated = await repo.updateCategory(id, input);
  if (!updated) {
    throw new Error('Failed to update category');
  }

  logger.info('Category updated', { id });
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  const deleted = await repo.deleteCategory(id);
  if (!deleted) {
    throw new Error('Category not found');
  }
  logger.info('Category deleted', { id });
}

// ============================================================================
// Articles
// ============================================================================

export async function getArticles(locale: string = 'en'): Promise<HelpArticle[]> {
  if (!isHelpCenterEnabled()) {
    return [];
  }
  return repo.getAllArticles(locale);
}

export async function getArticlesAdmin(): Promise<HelpArticleWithCategory[]> {
  return repo.getAllArticlesAdmin();
}

export async function getArticle(id: string): Promise<HelpArticle | null> {
  return repo.getArticleById(id);
}

export async function getArticleBySlug(
  categorySlug: string,
  articleSlug: string,
  locale: string = 'en',
  incrementView: boolean = true
): Promise<HelpArticleWithCategory | null> {
  if (!isHelpCenterEnabled()) {
    return null;
  }

  const article = await repo.getArticleBySlug(categorySlug, articleSlug, locale);
  if (!article) return null;

  // Increment view count (fire-and-forget)
  if (incrementView) {
    repo.incrementArticleViewCount(article.id).catch(err => {
      logger.error('Failed to increment view count', { articleId: article.id, error: err.message });
    });
  }

  return article;
}

export async function createArticle(input: CreateArticleInput): Promise<HelpArticle> {
  // Validate category exists
  const category = await repo.getCategoryById(input.categoryId);
  if (!category) {
    throw new Error('Category not found');
  }

  // Validate slug uniqueness
  const locale = input.locale || 'en';
  const exists = await repo.articleSlugExists(input.slug, locale);
  if (exists) {
    throw new Error(`Article with slug "${input.slug}" already exists for locale "${locale}"`);
  }

  // Normalize slug
  const normalizedInput = {
    ...input,
    slug: normalizeSlug(input.slug),
  };

  const article = await repo.createArticle(normalizedInput);
  logger.info('Article created', { id: article.id, slug: article.slug });
  return article;
}

export async function updateArticle(
  id: string,
  input: UpdateArticleInput
): Promise<HelpArticle> {
  // Validate article exists
  const existing = await repo.getArticleById(id);
  if (!existing) {
    throw new Error('Article not found');
  }

  // Validate category if changing
  if (input.categoryId && input.categoryId !== existing.categoryId) {
    const category = await repo.getCategoryById(input.categoryId);
    if (!category) {
      throw new Error('Category not found');
    }
  }

  // Validate slug uniqueness if changing
  const locale = input.locale || existing.locale;
  if (input.slug && input.slug !== existing.slug) {
    const exists = await repo.articleSlugExists(input.slug, locale, id);
    if (exists) {
      throw new Error(`Article with slug "${input.slug}" already exists for locale "${locale}"`);
    }
    input.slug = normalizeSlug(input.slug);
  }

  const updated = await repo.updateArticle(id, input);
  if (!updated) {
    throw new Error('Failed to update article');
  }

  logger.info('Article updated', { id, status: updated.status });
  return updated;
}

export async function publishArticle(id: string): Promise<HelpArticle> {
  return updateArticle(id, { status: 'published' });
}

export async function unpublishArticle(id: string): Promise<HelpArticle> {
  return updateArticle(id, { status: 'draft' });
}

export async function deleteArticle(id: string): Promise<void> {
  const deleted = await repo.deleteArticle(id);
  if (!deleted) {
    throw new Error('Article not found');
  }
  logger.info('Article deleted', { id });
}

// ============================================================================
// Search
// ============================================================================

export async function searchArticles(
  query: string,
  locale: string = 'en'
): Promise<HelpSearchResult> {
  if (!isHelpCenterEnabled() || !query.trim()) {
    return { articles: [], total: 0, query };
  }

  const articles = await repo.searchArticles(query.trim(), locale, 20);
  return {
    articles,
    total: articles.length,
    query,
  };
}

// ============================================================================
// Stats
// ============================================================================

export async function getStats(): Promise<HelpStats> {
  const stats = await repo.getHelpStats();

  // Fetch category titles for top viewed articles
  const categoryIds = [...new Set(stats.topViewedArticles.map(a => a.categoryId))];
  const categories = await Promise.all(
    categoryIds.map(id => repo.getCategoryById(id))
  );
  const categoryMap = new Map(
    categories.filter(Boolean).map(c => [c!.id, c!.title])
  );

  return {
    totalCategories: stats.totalCategories,
    totalArticles: stats.totalArticles,
    publishedArticles: stats.publishedArticles,
    draftArticles: stats.draftArticles,
    publishedPercent: stats.totalArticles > 0
      ? Math.round((stats.publishedArticles / stats.totalArticles) * 100)
      : 0,
    topViewedArticles: stats.topViewedArticles.map(a => ({
      id: a.id,
      title: a.title,
      viewCount: a.viewCount,
      categoryTitle: categoryMap.get(a.categoryId) || 'Unknown',
    })),
  };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
