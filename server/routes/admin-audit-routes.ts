/**
 * Admin Audit Routes
 * Audit log viewing with filtering capabilities
 */

import type { Express } from "express";
import { requirePermission, auditLogReadOnly, getAuditLogs } from "../security";

export function registerAdminAuditRoutes(app: Express): void {
  // Get audit logs (admin only) - now reads from database
  app.get(
    "/api/admin/audit-logs",
    requirePermission("canPublish"),
    auditLogReadOnly,
    async (req, res) => {
      try {
        const { action, resourceType, userId, limit = 100 } = req.query;
        const logs = await getAuditLogs({
          action: action as string,
          resourceType: resourceType as string,
          userId: userId as string,
          limit: Number.parseInt(limit as string) || 100,
        });
        res.json({ logs, total: logs.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch audit logs" });
      }
    }
  );
}
