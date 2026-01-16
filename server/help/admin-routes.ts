/**
 * Help Center - Admin Routes
 *
 * REST API for managing help categories and articles.
 * Requires admin/editor authentication.
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
    res.status(403).json({
      error: 'Help Center is disabled',
      hint: 'Set ENABLE_HELP_CENTER=true to enable',
    });
    return;
  }
  next();
}

// ============================================================================
// Categories
// ============================================================================

/**
 * GET /api/admin/help/categories
 * List all categories (admin view - includes inactive)
 */
router.get('/categories', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const categories = await helpService.getCategoriesAdmin();
    res.json({ categories });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin/help/categories/:id
 * Get single category by ID
 */
router.get('/categories/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const category = await helpService.getCategory(req.params.id);
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/help/categories
 * Create a new category
 */
router.post('/categories', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { slug, title, description, icon, locale, order } = req.body;

    if (!slug || !title) {
      res.status(400).json({ error: 'slug and title are required' });
      return;
    }

    const category = await helpService.createCategory({
      slug,
      title,
      description,
      icon,
      locale,
      order,
    });

    res.status(201).json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('already exists')) {
      res.status(409).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * PUT /api/admin/help/categories/:id
 * Update a category
 */
router.put('/categories/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { slug, title, description, icon, locale, order, isActive } = req.body;

    const category = await helpService.updateCategory(req.params.id, {
      slug,
      title,
      description,
      icon,
      locale,
      order,
      isActive,
    });

    res.json({ category });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('already exists')) {
      res.status(409).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * DELETE /api/admin/help/categories/:id
 * Delete a category (cascades to articles)
 */
router.delete('/categories/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    await helpService.deleteCategory(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// ============================================================================
// Articles
// ============================================================================

/**
 * GET /api/admin/help/articles
 * List all articles (admin view - includes drafts)
 */
router.get('/articles', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const articles = await helpService.getArticlesAdmin();
    res.json({ articles });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin/help/articles/:id
 * Get single article by ID
 */
router.get('/articles/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const article = await helpService.getArticle(req.params.id);
    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json({ article });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/help/articles
 * Create a new article
 */
router.post('/articles', requireEnabled, async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      slug,
      title,
      summary,
      blocks,
      metaTitle,
      metaDescription,
      locale,
      order,
    } = req.body;

    if (!categoryId || !slug || !title) {
      res.status(400).json({ error: 'categoryId, slug, and title are required' });
      return;
    }

    // Get author from authenticated user if available
    const authorId = (req as any).user?.id;

    const article = await helpService.createArticle({
      categoryId,
      slug,
      title,
      summary,
      blocks,
      metaTitle,
      metaDescription,
      locale,
      order,
      authorId,
    });

    res.status(201).json({ article });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('already exists')) {
      res.status(409).json({ error: message });
    } else if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * PUT /api/admin/help/articles/:id
 * Update an article
 */
router.put('/articles/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const {
      categoryId,
      slug,
      title,
      summary,
      blocks,
      metaTitle,
      metaDescription,
      locale,
      order,
      status,
    } = req.body;

    const article = await helpService.updateArticle(req.params.id, {
      categoryId,
      slug,
      title,
      summary,
      blocks,
      metaTitle,
      metaDescription,
      locale,
      order,
      status,
    });

    res.json({ article });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else if (message.includes('already exists')) {
      res.status(409).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * POST /api/admin/help/articles/:id/publish
 * Publish an article
 */
router.post('/articles/:id/publish', requireEnabled, async (req: Request, res: Response) => {
  try {
    const article = await helpService.publishArticle(req.params.id);
    res.json({ article });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * POST /api/admin/help/articles/:id/unpublish
 * Unpublish an article
 */
router.post('/articles/:id/unpublish', requireEnabled, async (req: Request, res: Response) => {
  try {
    const article = await helpService.unpublishArticle(req.params.id);
    res.json({ article });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

/**
 * DELETE /api/admin/help/articles/:id
 * Delete an article
 */
router.delete('/articles/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    await helpService.deleteArticle(req.params.id);
    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('not found')) {
      res.status(404).json({ error: message });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

// ============================================================================
// Stats
// ============================================================================

/**
 * GET /api/admin/help/stats
 * Get help center statistics
 */
router.get('/stats', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const stats = await helpService.getStats();
    res.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
