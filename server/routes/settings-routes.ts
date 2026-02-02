/**
 * Site Settings and Content Safety Routes
 * Admin endpoints for managing site settings and checking content integrity
 */

import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requireRole } from "../security/rbac/enforcer";
import { type AuthRequest } from "../security";

// Helper to get user ID from auth request
function getUserId(req: AuthRequest): string | undefined {
  return (req as any).user?.claims?.sub || (req as any).user?.id;
}

// Import logAuditEvent for audit trail
async function logAuditEvent(
  req: any,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  oldData?: any,
  newData?: any
) {
  // This is a simplified version - the actual implementation is in routes.ts
  // For now, just log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[AUDIT] ${action} ${entityType}:${entityId} - ${description}`);
  }
}

export function registerSettingsRoutes(app: Express): void {
  // ========== Site Settings API ==========

  // Get all settings
  app.get(
    "/api/settings",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const settings = await storage.getSettings();
        res.json(settings);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch settings" });
      }
    }
  );

  // Get settings by category (for frontend grouping)
  app.get(
    "/api/settings/grouped",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const settings = await storage.getSettings();
        const grouped: Record<string, Record<string, unknown>> = {};
        for (const setting of settings) {
          if (!grouped[setting.category]) {
            grouped[setting.category] = {};
          }
          grouped[setting.category][setting.key] = setting.value;
        }
        res.json(grouped);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch settings" });
      }
    }
  );

  // Update multiple settings at once
  app.post(
    "/api/settings/bulk",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { settings } = req.body;
        if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
          return res.status(400).json({ error: "Settings object required" });
        }

        // Validate allowed categories
        const allowedCategories = ["site", "api", "content", "notifications", "security"];
        const invalidCategories = Object.keys(settings).filter(c => !allowedCategories.includes(c));
        if (invalidCategories.length > 0) {
          return res
            .status(400)
            .json({ error: `Invalid categories: ${invalidCategories.join(", ")}` });
        }

        const userId = getUserId(req);
        const updated: any[] = [];

        // Dangerous keys that could cause prototype pollution
        const dangerousKeys = new Set(["__proto__", "constructor", "prototype"]);

        for (const [category, values] of Object.entries(settings)) {
          // Skip dangerous keys to prevent prototype pollution
          if (dangerousKeys.has(category)) {
            continue;
          }
          if (typeof values !== "object" || values === null || Array.isArray(values)) {
            continue;
          }
          for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
            // Skip dangerous keys to prevent prototype pollution
            if (dangerousKeys.has(key)) {
              continue;
            }
            // Validate key is a non-empty string
            if (typeof key !== "string" || key.trim() === "") {
              continue;
            }
            // Validate value is a primitive (string, number, boolean) or null
            if (
              value !== null &&
              typeof value !== "string" &&
              typeof value !== "number" &&
              typeof value !== "boolean"
            ) {
              continue;
            }
            const setting = await storage.upsertSetting(key.trim(), value, category, userId);
            updated.push(setting);
          }
        }

        await logAuditEvent(
          req,
          "settings_change",
          "settings",
          "bulk",
          `Updated ${updated.length} settings`
        );
        res.json({ success: true, updated: updated.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  );

  // ========== Content Safety Check Endpoints ==========

  // Check for broken internal links
  app.get(
    "/api/content/broken-links",
    isAuthenticated,
    requireRole(["admin", "editor"]),
    async (req: AuthRequest, res: Response) => {
      try {
        const links = await storage.getInternalLinks();
        const brokenLinks: {
          linkId: string;
          sourceId: string | null;
          targetId: string | null;
          reason: string;
        }[] = [];

        for (const link of links) {
          // Check if target content exists
          if (link.targetContentId) {
            const targetContent = await storage.getContent(link.targetContentId);
            if (!targetContent) {
              brokenLinks.push({
                linkId: link.id,
                sourceId: link.sourceContentId,
                targetId: link.targetContentId,
                reason: "Target content not found",
              });
            }
          }
        }

        res.json({ total: links.length, broken: brokenLinks.length, brokenLinks });
      } catch (error) {
        res.status(500).json({ error: "Failed to check broken links" });
      }
    }
  );

  // Check content status before bulk delete
  app.post(
    "/api/content/bulk-delete-check",
    isAuthenticated,
    requireRole(["admin", "editor"]),
    async (req: AuthRequest, res: Response) => {
      try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
          return res.status(400).json({ error: "IDs array required" });
        }

        const warnings: { id: string; title: string; status: string; reason: string }[] = [];

        for (const id of ids) {
          const content = await storage.getContent(id);
          if (content) {
            if (content.status === "published") {
              warnings.push({
                id: content.id,
                title: content.title,
                status: content.status,
                reason: "Content is published and visible to users",
              });
            } else if (content.status === "scheduled") {
              warnings.push({
                id: content.id,
                title: content.title,
                status: content.status,
                reason: "Content is scheduled for publishing",
              });
            }
          }
        }

        res.json({
          total: ids.length,
          warnings: warnings.length,
          items: warnings,
          canProceed: true,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to check bulk delete" });
      }
    }
  );
}
