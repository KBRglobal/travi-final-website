/**
 * Help Center - Public Routes
 *
 * Public-facing REST API for the help center.
 * Returns 404 when feature is disabled.
 */

import { Router, Request, Response } from 'express';
import * as helpService from './help-service';
import { isHelpCenterEnabled } from './types';

const router = Router();

// ============================================================================
// Middleware
// ============================================================================

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isHelpCenterEnabled()) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  next();
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/help
 * Get all categories with article counts
 */
router.get('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const locale = (req.query.locale as string) || 'en';
    const categories = await helpService.getCategories(locale);

    res.json({
      categories,
      meta: {
        title: 'Help Center',
        description: 'Find answers to your questions',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/help/search
 * Search help articles
 */
router.get('/search', requireEnabled, async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const locale = (req.query.locale as string) || 'en';

    if (!query.trim()) {
      res.json({ articles: [], total: 0, query: '' });
      return;
    }

    const result = await helpService.searchArticles(query, locale);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/help/category/:slug
 * Get category with its articles
 */
router.get('/category/:slug', requireEnabled, async (req: Request, res: Response) => {
  try {
    const locale = (req.query.locale as string) || 'en';
    const category = await helpService.getCategoryBySlug(req.params.slug, locale);

    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    res.json({
      category,
      meta: {
        title: `${category.title} - Help Center`,
        description: category.description || `Help articles about ${category.title}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/help/category/:categorySlug/article/:articleSlug
 * Get single article
 */
router.get('/category/:categorySlug/article/:articleSlug', requireEnabled, async (req: Request, res: Response) => {
  try {
    const locale = (req.query.locale as string) || 'en';
    const article = await helpService.getArticleBySlug(
      req.params.categorySlug,
      req.params.articleSlug,
      locale,
      true // increment view count
    );

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    res.json({
      article,
      meta: {
        title: article.metaTitle || `${article.title} - Help Center`,
        description: article.metaDescription || article.summary || '',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
