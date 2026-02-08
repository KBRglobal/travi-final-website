/**
 * Admin Logs & Console Logger Routes
 * Real-time log streaming, statistics, and export functionality
 */

import type { Express, Request, Response } from "express";
import { requirePermission } from "../security";
import { consoleLogger } from "../console-logger";

export function registerAdminLogsRoutes(app: Express): void {
  // Get logs - now returns actual console output with human-readable messages
  app.get(
    "/api/admin/logs",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { category, level, search, limit = "200" } = req.query;

        let logs = consoleLogger.getLogs(Number.parseInt(limit as string, 10) || 200);

        if (category && category !== "all") {
          logs = logs.filter(log => log.category === category);
        }
        if (level && level !== "all") {
          logs = logs.filter(log => log.level === level);
        }
        if (search && typeof search === "string") {
          const searchLower = search.toLowerCase();
          logs = logs.filter(
            log =>
              log.humanMessage.toLowerCase().includes(searchLower) ||
              log.rawMessage.toLowerCase().includes(searchLower)
          );
        }

        // Transform to the expected format for the frontend
        const transformedLogs = logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          category: log.category,
          message: log.humanMessage,
          rawMessage: log.rawMessage,
        }));

        res.json({
          logs: transformedLogs.toReversed(), // Most recent first
          total: transformedLogs.length,
        });
      } catch {
        res.status(500).json({ error: "Failed to fetch logs" });
      }
    }
  );

  // Server-Sent Events endpoint for real-time log streaming
  app.get(
    "/api/admin/logs/stream",
    requirePermission("canManageSettings"),
    (req: Request, res: Response) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const onLog = (log: any) => {
        const data = JSON.stringify({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          category: log.category,
          message: log.humanMessage,
          rawMessage: log.rawMessage,
        });
        res.write(`data: ${data}\n\n`);
      };

      consoleLogger.on("log", onLog);

      req.on("close", () => {
        consoleLogger.off("log", onLog);
      });
    }
  );

  // Get log stats
  app.get(
    "/api/admin/logs/stats",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        const logs = consoleLogger.getLogs();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const stats = {
          total: logs.length,
          byLevel: {
            error: logs.filter(l => l.level === "error").length,
            warning: logs.filter(l => l.level === "warn").length,
            info: logs.filter(l => l.level === "info").length,
            debug: logs.filter(l => l.level === "debug").length,
          },
          byCategory: {
            system: logs.filter(l => l.category === "system").length,
            ai: logs.filter(l => l.category === "ai").length,
            images: logs.filter(l => l.category === "images").length,
            storage: logs.filter(l => l.category === "storage").length,
            rss: logs.filter(l => l.category === "rss").length,
            content: logs.filter(l => l.category === "content").length,
            auth: logs.filter(l => l.category === "auth").length,
            http: logs.filter(l => l.category === "http").length,
            autopilot: logs.filter(l => l.category === "autopilot").length,
            dev: logs.filter(l => l.category === "dev").length,
          },
          recentErrors: logs.filter(l => l.level === "error" && l.timestamp >= oneHourAgo).length,
        };

        res.json(stats);
      } catch {
        res.status(500).json({ error: "Failed to fetch log stats" });
      }
    }
  );

  // Clear logs
  app.delete(
    "/api/admin/logs",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        consoleLogger.clear();
        consoleLogger.addManualLog("info", "system", "Logs cleared by admin");
        res.json({ success: true, message: "Logs cleared" });
      } catch {
        res.status(500).json({ error: "Failed to clear logs" });
      }
    }
  );

  // Export logs
  app.get(
    "/api/admin/logs/export",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { category, level } = req.query;

        let logs = consoleLogger.getLogs();
        if (category && category !== "all") {
          logs = logs.filter(log => log.category === category);
        }
        if (level && level !== "all") {
          logs = logs.filter(log => log.level === level);
        }

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="logs-${new Date().toISOString().split("T")[0]}.json"`
        );
        res.json(logs);
      } catch {
        res.status(500).json({ error: "Failed to export logs" });
      }
    }
  );

  // Log server startup
  consoleLogger.addManualLog("info", "server", "CMS Server started successfully");
}
