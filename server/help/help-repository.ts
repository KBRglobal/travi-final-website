/**
 * Help Center - Repository
 *
 * Database operations for help categories and articles.
 */

import { db } from '../db';
import {
  helpCategories,
  helpArticles,
  type HelpCategory,
  type HelpArticle,
} from '@shared/schema';
import { eq, and, asc, desc, sql, ilike, or, count } from 'drizzle-orm';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateArticleInput,
  UpdateArticleInput,
  HelpCategoryWithArticles,
  HelpArticleWithCategory,
} from './types';

// ============================================================================
// Categories
// ============================================================================

export async function getAllCategories(locale: string = 'en'): Promise<HelpCategory[]> {
  return db
    .select()
    .from(helpCategories)
    .where(and(
      eq(helpCategories.locale, locale),
      eq(helpCategories.isActive, true)
    ))
    .orderBy(asc(helpCategories.order), asc(helpCategories.title));
}

export async function getAllCategoriesAdmin(): Promise<HelpCategory[]> {
  return db
    .select()
    .from(helpCategories)
    .orderBy(asc(helpCategories.order), asc(helpCategories.title));
}

export async function getCategoryById(id: string): Promise<HelpCategory | null> {
  const result = await db
    .select()
    .from(helpCategories)
    .where(eq(helpCategories.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getCategoryBySlug(slug: string, locale: string = 'en'): Promise<HelpCategory | null> {
  const result = await db
    .select()
    .from(helpCategories)
    .where(and(
      eq(helpCategories.slug, slug),
      eq(helpCategories.locale, locale),
      eq(helpCategories.isActive, true)
    ))
    .limit(1);
  return result[0] || null;
}

export async function getCategoryWithArticles(
  slug: string,
  locale: string = 'en'
): Promise<HelpCategoryWithArticles | null> {
  const category = await getCategoryBySlug(slug, locale);
  if (!category) return null;

  const articles = await db
    .select()
    .from(helpArticles)
    .where(and(
      eq(helpArticles.categoryId, category.id),
      eq(helpArticles.status, 'published'),
      eq(helpArticles.locale, locale)
    ))
    .orderBy(asc(helpArticles.order), asc(helpArticles.title));

  return {
    ...category,
    articles,
    articleCount: articles.length,
  };
}

export async function createCategory(input: CreateCategoryInput): Promise<HelpCategory> {
  const result = await db
    .insert(helpCategories)
    .values({
      slug: input.slug,
      title: input.title,
      description: input.description,
      icon: input.icon,
      locale: input.locale || 'en',
      order: input.order || 0,
    } as any)
    .returning();
  return result[0];
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<HelpCategory | null> {
  const result = await db
    .update(helpCategories)
    .set({
      ...input,
      updatedAt: new Date(),
    } as any)
    .where(eq(helpCategories.id, id))
    .returning();
  return result[0] || null;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const result = await db
    .delete(helpCategories)
    .where(eq(helpCategories.id, id))
    .returning({ id: helpCategories.id });
  return result.length > 0;
}

export async function categorySlugExists(slug: string, excludeId?: string): Promise<boolean> {
  const conditions = [eq(helpCategories.slug, slug)];
  if (excludeId) {
    conditions.push(sql`${helpCategories.id} != ${excludeId}`);
  }
  const result = await db
    .select({ id: helpCategories.id })
    .from(helpCategories)
    .where(and(...conditions))
    .limit(1);
  return result.length > 0;
}

// ============================================================================
// Articles
// ============================================================================

export async function getAllArticles(locale: string = 'en'): Promise<HelpArticle[]> {
  return db
    .select()
    .from(helpArticles)
    .where(and(
      eq(helpArticles.locale, locale),
      eq(helpArticles.status, 'published')
    ))
    .orderBy(asc(helpArticles.order), asc(helpArticles.title));
}

export async function getAllArticlesAdmin(): Promise<HelpArticleWithCategory[]> {
  const articles = await db
    .select()
    .from(helpArticles)
    .orderBy(desc(helpArticles.updatedAt));

  // Fetch categories for each article
  const categoryIds = [...new Set(articles.map(a => a.categoryId))];
  const categories = await db
    .select()
    .from(helpCategories)
    .where(sql`${helpCategories.id} IN ${categoryIds.length > 0 ? sql`(${sql.join(categoryIds.map(id => sql`${id}`), sql`, `)})` : sql`(NULL)`}`);

  const categoryMap = new Map(categories.map(c => [c.id, c]));

  return articles.map(article => ({
    ...article,
    category: categoryMap.get(article.categoryId)!,
  }));
}

export async function getArticleById(id: string): Promise<HelpArticle | null> {
  const result = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getArticleBySlug(
  categorySlug: string,
  articleSlug: string,
  locale: string = 'en'
): Promise<HelpArticleWithCategory | null> {
  const category = await getCategoryBySlug(categorySlug, locale);
  if (!category) return null;

  const result = await db
    .select()
    .from(helpArticles)
    .where(and(
      eq(helpArticles.categoryId, category.id),
      eq(helpArticles.slug, articleSlug),
      eq(helpArticles.status, 'published'),
      eq(helpArticles.locale, locale)
    ))
    .limit(1);

  if (!result[0]) return null;

  return {
    ...result[0],
    category,
  };
}

export async function createArticle(input: CreateArticleInput): Promise<HelpArticle> {
  const result = await db
    .insert(helpArticles)
    .values({
      categoryId: input.categoryId,
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      blocks: input.blocks || [],
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      locale: input.locale || 'en',
      order: input.order || 0,
      authorId: input.authorId,
    } as any)
    .returning();
  return result[0];
}

export async function updateArticle(id: string, input: UpdateArticleInput): Promise<HelpArticle | null> {
  const updateData: Record<string, unknown> = {
    ...input,
    updatedAt: new Date(),
  };

  // Set publishedAt when publishing
  if (input.status === 'published') {
    const existing = await getArticleById(id);
    if (existing && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }
  }

  const result = await db
    .update(helpArticles)
    .set(updateData)
    .where(eq(helpArticles.id, id))
    .returning();
  return result[0] || null;
}

export async function deleteArticle(id: string): Promise<boolean> {
  const result = await db
    .delete(helpArticles)
    .where(eq(helpArticles.id, id))
    .returning({ id: helpArticles.id });
  return result.length > 0;
}

export async function articleSlugExists(
  slug: string,
  locale: string,
  excludeId?: string
): Promise<boolean> {
  const conditions = [
    eq(helpArticles.slug, slug),
    eq(helpArticles.locale, locale),
  ];
  if (excludeId) {
    conditions.push(sql`${helpArticles.id} != ${excludeId}`);
  }
  const result = await db
    .select({ id: helpArticles.id })
    .from(helpArticles)
    .where(and(...conditions))
    .limit(1);
  return result.length > 0;
}

export async function incrementArticleViewCount(id: string): Promise<void> {
  await db
    .update(helpArticles)
    .set({
      viewCount: sql`${helpArticles.viewCount} + 1`,
    } as any)
    .where(eq(helpArticles.id, id));
}

// ============================================================================
// Search
// ============================================================================

export async function searchArticles(
  query: string,
  locale: string = 'en',
  limit: number = 20
): Promise<HelpArticle[]> {
  const searchPattern = `%${query}%`;

  return db
    .select()
    .from(helpArticles)
    .where(and(
      eq(helpArticles.status, 'published'),
      eq(helpArticles.locale, locale),
      or(
        ilike(helpArticles.title, searchPattern),
        ilike(helpArticles.summary, searchPattern),
        sql`${helpArticles.blocks}::text ILIKE ${searchPattern}`
      )
    ))
    .orderBy(desc(helpArticles.viewCount))
    .limit(limit);
}

// ============================================================================
// Stats
// ============================================================================

export async function getHelpStats(): Promise<{
  totalCategories: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  topViewedArticles: Array<{ id: string; title: string; viewCount: number; categoryId: string }>;
}> {
  const [categoryCount] = await db
    .select({ count: count() })
    .from(helpCategories);

  const [articleCount] = await db
    .select({ count: count() })
    .from(helpArticles);

  const [publishedCount] = await db
    .select({ count: count() })
    .from(helpArticles)
    .where(eq(helpArticles.status, 'published'));

  const topViewed = await db
    .select({
      id: helpArticles.id,
      title: helpArticles.title,
      viewCount: helpArticles.viewCount,
      categoryId: helpArticles.categoryId,
    })
    .from(helpArticles)
    .where(eq(helpArticles.status, 'published'))
    .orderBy(desc(helpArticles.viewCount))
    .limit(10);

  return {
    totalCategories: categoryCount.count,
    totalArticles: articleCount.count,
    publishedArticles: publishedCount.count,
    draftArticles: articleCount.count - publishedCount.count,
    topViewedArticles: topViewed,
  };
}
