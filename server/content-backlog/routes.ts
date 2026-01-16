/**
 * Content Backlog - Admin Routes
 */

import { Router, Request, Response } from 'express';
import { db } from '@db';
import { content } from '@db/schema';
import { isContentBacklogEnabled } from './types';
import { collectAllIdeas } from './collector';
import { getScoringBreakdown } from './scorer';
import {
  createBacklogItems,
  getBacklogItems,
  getBacklogItem,
  getBacklogSummary,
  updateBacklogItemStatus,
  convertToContent,
  cleanupOldItems,
} from './repository';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isContentBacklogEnabled()) {
    res.status(503).json({
      error: 'Content Backlog is disabled',
      hint: 'Set ENABLE_CONTENT_BACKLOG=true to enable',
    });
    return;
  }
  next();
}

/**
 * GET /api/admin/backlog
 * Get all backlog items.
 */
router.get('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const source = req.query.source as string | undefined;
    const minScore = parseInt(req.query.minScore as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;

    const items = await getBacklogItems({
      status: status as 'new' | 'in_review' | 'approved' | 'rejected' | 'converted' | undefined,
      source: source as 'zero_result_search' | 'low_click_search' | 'rss_topic' | 'entity_gap' | undefined,
      minScore,
      limit,
    });

    res.json({
      items,
      count: items.length,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/backlog/summary
 * Get backlog summary.
 */
router.get('/summary', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const summary = await getBacklogSummary();
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/backlog/:id
 * Get specific backlog item.
 */
router.get('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await getBacklogItem(id);

    if (!item) {
      res.status(404).json({ error: 'Backlog item not found' });
      return;
    }

    const scoringBreakdown = getScoringBreakdown(item);

    res.json({ item, scoringBreakdown });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/backlog/collect
 * Collect new backlog items from all sources.
 */
router.post('/collect', requireEnabled, async (req: Request, res: Response) => {
  try {
    const limitPerSource = parseInt(req.query.limit as string) || 20;

    const ideas = await collectAllIdeas(limitPerSource);
    const result = await createBacklogItems(ideas);

    res.json({
      ...result,
      message: `Created ${result.created} items, skipped ${result.skipped} duplicates`,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/backlog/:id/status
 * Update backlog item status.
 */
router.post('/:id/status', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const item = await updateBacklogItemStatus(id, status);

    if (!item) {
      res.status(404).json({ error: 'Backlog item not found' });
      return;
    }

    res.json({ item });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/backlog/:id/convert-to-draft
 * Convert backlog item to draft content.
 */
router.post('/:id/convert-to-draft', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await getBacklogItem(id);

    if (!item) {
      res.status(404).json({ error: 'Backlog item not found' });
      return;
    }

    if (item.status === 'converted') {
      res.status(400).json({
        error: 'Item already converted',
        contentId: item.convertedContentId,
      });
      return;
    }

    // Create draft content
    const [newContent] = await db
      .insert(content)
      .values({
        title: item.title,
        slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        status: 'draft',
        blocks: [
          {
            type: 'paragraph',
            data: {
              text: item.description,
            },
          },
        ],
        locale: 'en',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Mark backlog item as converted
    await convertToContent(id, newContent.id);

    res.json({
      message: 'Converted to draft content',
      contentId: newContent.id,
      backlogItem: await getBacklogItem(id),
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/backlog/cleanup
 * Clean up old converted/rejected items.
 */
router.post('/cleanup', requireEnabled, async (req: Request, res: Response) => {
  try {
    const olderThanDays = parseInt(req.query.days as string) || 30;
    const cleaned = await cleanupOldItems(olderThanDays);

    res.json({
      cleaned,
      message: `Cleaned ${cleaned} old items`,
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as backlogRoutes };
