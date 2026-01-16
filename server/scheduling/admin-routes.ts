/**
 * Content Scheduling Admin Routes
 *
 * Admin-only endpoints for content scheduling and calendar.
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  scheduleContent,
  cancelSchedule,
  getUpcoming,
  getCalendar,
  getScheduleStatus,
  getFailures,
  isEnabled,
} from "./schedule-service";
import { getSchedulerMetrics } from "./scheduler-engine";

/**
 * Register scheduling admin routes
 */
export function registerSchedulingRoutes(app: Express): void {
  /**
   * POST /api/admin/content/:id/schedule
   * Schedule content for future publishing
   */
  app.post("/api/admin/content/:id/schedule", requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt is required' });
    }

    try {
      const result = await scheduleContent(id, scheduledAt);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        contentId: result.contentId,
        scheduledAt: result.scheduledAt?.toISOString(),
      });
    } catch (error) {
      console.error('[Scheduling] Error scheduling content:', error);
      res.status(500).json({ error: 'Failed to schedule content' });
    }
  });

  /**
   * POST /api/admin/content/:id/cancel-schedule
   * Cancel scheduled publishing
   */
  app.post("/api/admin/content/:id/cancel-schedule", requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const result = await cancelSchedule(id);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        contentId: result.contentId,
      });
    } catch (error) {
      console.error('[Scheduling] Error cancelling schedule:', error);
      res.status(500).json({ error: 'Failed to cancel schedule' });
    }
  });

  /**
   * GET /api/admin/content/:id/schedule-status
   * Get schedule status for a specific content
   */
  app.get("/api/admin/content/:id/schedule-status", requireAuth, async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const status = await getScheduleStatus(id);

      if (!status) {
        return res.status(404).json({ error: 'Content not found' });
      }

      res.json(status);
    } catch (error) {
      console.error('[Scheduling] Error getting schedule status:', error);
      res.status(500).json({ error: 'Failed to get schedule status' });
    }
  });

  /**
   * GET /api/admin/content/schedule/upcoming
   * Get upcoming scheduled content
   */
  app.get("/api/admin/content/schedule/upcoming", requireAuth, async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;

    try {
      const result = await getUpcoming(Math.min(limit, 100));
      res.json(result);
    } catch (error) {
      console.error('[Scheduling] Error getting upcoming:', error);
      res.status(500).json({ error: 'Failed to get upcoming schedules' });
    }
  });

  /**
   * GET /api/admin/content/schedule/calendar
   * Get calendar view for a month
   */
  app.get("/api/admin/content/schedule/calendar", requireAuth, async (req: Request, res: Response) => {
    const now = new Date();
    const year = parseInt(req.query.year as string) || now.getFullYear();
    const month = parseInt(req.query.month as string) || now.getMonth() + 1;

    if (month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month (1-12)' });
    }

    try {
      const calendar = await getCalendar(year, month);
      res.json(calendar);
    } catch (error) {
      console.error('[Scheduling] Error getting calendar:', error);
      res.status(500).json({ error: 'Failed to get calendar' });
    }
  });

  /**
   * GET /api/admin/content/schedule/failures
   * Get failed schedules (past due, not published)
   */
  app.get("/api/admin/content/schedule/failures", requireAuth, async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;

    try {
      const failures = await getFailures(Math.min(limit, 100));
      res.json({
        items: failures,
        count: failures.length,
      });
    } catch (error) {
      console.error('[Scheduling] Error getting failures:', error);
      res.status(500).json({ error: 'Failed to get failures' });
    }
  });

  /**
   * GET /api/admin/content/schedule/metrics
   * Get scheduler metrics
   */
  app.get("/api/admin/content/schedule/metrics", requireAuth, async (req: Request, res: Response) => {
    try {
      const metrics = getSchedulerMetrics();
      res.json({
        enabled: isEnabled(),
        ...metrics,
      });
    } catch (error) {
      console.error('[Scheduling] Error getting metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  });

  console.log('[Scheduling] Admin routes registered');
}
