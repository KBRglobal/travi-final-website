/**
 * User Feedback Loop - Routes
 */

import { Router, Request, Response } from 'express';
import { isFeedbackLoopEnabled, FeedbackType, FeedbackStatus, FeedbackPriority } from './types';
import {
  submitFeedback,
  getFeedback,
  updateFeedbackStatus,
  updateFeedbackPriority,
  assignFeedback,
  addFeedbackTags,
  removeFeedbackTag,
  deleteFeedback,
  getAllFeedback,
  getContentFeedbackSummary,
  getFeedbackTrends,
  getFeedbackStats,
  bulkUpdateStatus,
  bulkAssign,
  getFeedbackActionLogs,
  getAllTags,
} from './feedback-manager';

const router = Router();

function requireEnabled(_req: Request, res: Response, next: () => void): void {
  if (!isFeedbackLoopEnabled()) {
    res.status(503).json({
      error: 'Feedback Loop is disabled',
      hint: 'Set ENABLE_FEEDBACK_LOOP=true to enable',
    });
    return;
  }
  next();
}

/**
 * POST /api/feedback
 * Submit new feedback (public endpoint).
 */
router.post('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId, contentUrl, type, message, rating, userId, userEmail, tags, metadata } = req.body;

    if (!contentId || !contentUrl || !type) {
      res.status(400).json({ error: 'contentId, contentUrl, and type are required' });
      return;
    }

    const feedback = submitFeedback(contentId, contentUrl, type as FeedbackType, {
      message,
      rating,
      userId,
      userEmail,
      tags,
      metadata,
    });

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/feedback
 * Get all feedback with filters.
 */
router.get('/', requireEnabled, async (req: Request, res: Response) => {
  try {
    const contentId = req.query.contentId as string | undefined;
    const type = req.query.type as FeedbackType | undefined;
    const status = req.query.status as FeedbackStatus | undefined;
    const priority = req.query.priority as FeedbackPriority | undefined;
    const assignedTo = req.query.assignedTo as string | undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const order = (req.query.order as string) || 'desc';

    const feedback = getAllFeedback(
      { contentId, type, status, priority, assignedTo },
      {
        limit,
        offset,
        sortBy: sortBy as 'createdAt' | 'updatedAt' | 'priority' | 'rating',
        order: order as 'asc' | 'desc',
      }
    );

    res.json({ feedback, count: feedback.length });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/feedback/:id
 * Get feedback by ID.
 */
router.get('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = getFeedback(id);

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/feedback/:id/status
 * Update feedback status.
 */
router.put('/:id/status', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolution, performedBy } = req.body;

    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }

    const feedback = updateFeedbackStatus(
      id,
      status as FeedbackStatus,
      performedBy || 'admin',
      resolution
    );

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/feedback/:id/priority
 * Update feedback priority.
 */
router.put('/:id/priority', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { priority, performedBy } = req.body;

    if (!priority) {
      res.status(400).json({ error: 'priority is required' });
      return;
    }

    const feedback = updateFeedbackPriority(
      id,
      priority as FeedbackPriority,
      performedBy || 'admin'
    );

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * PUT /api/admin/feedback/:id/assign
 * Assign feedback to a user.
 */
router.put('/:id/assign', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo, performedBy } = req.body;

    if (!assignedTo) {
      res.status(400).json({ error: 'assignedTo is required' });
      return;
    }

    const feedback = assignFeedback(id, assignedTo, performedBy || 'admin');

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/feedback/:id/tags
 * Add tags to feedback.
 */
router.post('/:id/tags', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    if (!Array.isArray(tags)) {
      res.status(400).json({ error: 'tags array is required' });
      return;
    }

    const feedback = addFeedbackTags(id, tags);

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * DELETE /api/admin/feedback/:id/tags/:tag
 * Remove tag from feedback.
 */
router.delete('/:id/tags/:tag', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id, tag } = req.params;

    const feedback = removeFeedbackTag(id, decodeURIComponent(tag));

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }

    res.json({ feedback });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * DELETE /api/admin/feedback/:id
 * Delete feedback.
 */
router.delete('/:id', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = deleteFeedback(id);
    res.json({ deleted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/feedback/content/:contentId/summary
 * Get feedback summary for a content piece.
 */
router.get('/content/:contentId/summary', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const summary = getContentFeedbackSummary(contentId);

    if (!summary) {
      res.status(404).json({ error: 'No feedback found for this content' });
      return;
    }

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/feedback/trends
 * Get feedback trends.
 */
router.get('/trends', requireEnabled, async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const trends = getFeedbackTrends(days);
    res.json({ trends });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/feedback/stats
 * Get feedback stats.
 */
router.get('/stats', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const stats = getFeedbackStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/feedback/bulk/status
 * Bulk update feedback status.
 */
router.post('/bulk/status', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { ids, status, performedBy } = req.body;

    if (!Array.isArray(ids) || !status) {
      res.status(400).json({ error: 'ids array and status are required' });
      return;
    }

    const result = bulkUpdateStatus(ids, status as FeedbackStatus, performedBy || 'admin');
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * POST /api/admin/feedback/bulk/assign
 * Bulk assign feedback.
 */
router.post('/bulk/assign', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { ids, assignedTo, performedBy } = req.body;

    if (!Array.isArray(ids) || !assignedTo) {
      res.status(400).json({ error: 'ids array and assignedTo are required' });
      return;
    }

    const result = bulkAssign(ids, assignedTo, performedBy || 'admin');
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/feedback/:id/logs
 * Get action logs for feedback.
 */
router.get('/:id/logs', requireEnabled, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = getFeedbackActionLogs(id, limit);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

/**
 * GET /api/admin/feedback/tags
 * Get all unique tags.
 */
router.get('/tags', requireEnabled, async (_req: Request, res: Response) => {
  try {
    const tags = getAllTags();
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as feedbackLoopRoutes };
