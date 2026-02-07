/**
 * Log Routes - API endpoints for the Admin Panel log viewer
 */

import { Express, Request, Response } from "express";
import {
  getLogs,
  getLogStats,
  clearLogs,
  exportLogs,
  getCategories,
  getCategoryDisplayNames,
  LogFilter,
  LogCategory,
  LogLevel,
} from "../services/log-service";
import { requirePermission } from "../security";

export function registerLogRoutes(app: Express) {
  /**
   * GET /api/admin/logs
   * Get logs with optional filtering
   */
  app.get(
    "/api/admin/logs",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const filter: LogFilter = {};

        // Parse level filter
        if (req.query.level) {
          const levels = String(req.query.level).split(",") as LogLevel[];
          filter.level = levels;
        }

        // Parse category filter
        if (req.query.category) {
          const categories = String(req.query.category).split(",") as LogCategory[];
          filter.category = categories;
        }

        // Parse search
        if (req.query.search) {
          filter.search = String(req.query.search);
        }

        // Parse date range
        if (req.query.startDate) {
          filter.startDate = new Date(String(req.query.startDate));
        }
        if (req.query.endDate) {
          filter.endDate = new Date(String(req.query.endDate));
        }

        // Parse pagination
        if (req.query.limit) {
          filter.limit = Number.parseInt(String(req.query.limit), 10);
        }
        if (req.query.offset) {
          filter.offset = Number.parseInt(String(req.query.offset), 10);
        }

        const logs = getLogs(filter);
        res.json({ logs, count: logs.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
      }
    }
  );

  /**
   * GET /api/admin/logs/stats
   * Get log statistics
   */
  app.get(
    "/api/admin/logs/stats",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const stats = getLogStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch log stats" });
      }
    }
  );

  /**
   * GET /api/admin/logs/categories
   * Get available log categories
   */
  app.get(
    "/api/admin/logs/categories",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const categories = getCategories();
        const displayNames = getCategoryDisplayNames();
        res.json({ categories, displayNames });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch log categories" });
      }
    }
  );

  /**
   * GET /api/admin/logs/export
   * Export logs as JSON
   */
  app.get(
    "/api/admin/logs/export",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const filter: LogFilter = {};

        if (req.query.level) {
          filter.level = String(req.query.level).split(",") as LogLevel[];
        }
        if (req.query.category) {
          filter.category = String(req.query.category).split(",") as LogCategory[];
        }

        const jsonData = exportLogs(filter);

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=logs-${Date.now()}.json`);
        res.send(jsonData);
      } catch (error) {
        res.status(500).json({ error: "Failed to export logs" });
      }
    }
  );

  /**
   * DELETE /api/admin/logs
   * Clear all logs (admin only)
   */
  app.delete(
    "/api/admin/logs",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        clearLogs();
        res.json({ success: true, message: "Logs cleared" });
      } catch (error) {
        res.status(500).json({ error: "Failed to clear logs" });
      }
    }
  );

  /**
   * GET /api/admin/logs/stream
   * Server-Sent Events for real-time log streaming
   */
  app.get(
    "/api/admin/logs/stream",
    requirePermission("canManageSettings"),
    (req: Request, res: Response) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

      // Keep connection alive
      const keepAlive = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: "ping" })}\n\n`);
      }, 30000);

      // Clean up on close
      req.on("close", () => {
        clearInterval(keepAlive);
      });
    }
  );
}
