import type { Express, Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { requirePermission, checkReadOnlyMode, getUserId, logAuditEvent } from "../security";
import { insertHomepagePromotionSchema, type HomepageSection, type UserRole } from "@shared/schema";

/**
 * CMS/Settings API Routes
 *
 * Handles site settings and homepage promotions management:
 * - /api/settings (GET, POST bulk)
 * - /api/homepage-promotions (CRUD)
 */

// Authenticated request type
type AuthRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string; email?: string; name?: string } };
  session: Request["session"] & {
    userId?: string;
    save(callback?: (err?: unknown) => void): void;
  };
};

// Keys that could cause prototype pollution
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

type SettingValue = string | number | boolean | null;

function isValidSettingValue(value: unknown): value is SettingValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/** Extract valid key-value pairs from a category's settings */
function extractCategorySettings(
  category: string,
  values: Record<string, unknown>
): Array<{ category: string; key: string; value: string | number | boolean | null }> {
  const result: Array<{ category: string; key: string; value: string | number | boolean | null }> =
    [];
  for (const [key, value] of Object.entries(values)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    if (typeof key !== "string" || key.trim() === "") continue;
    if (!isValidSettingValue(value)) continue;
    result.push({ category, key: key.trim(), value });
  }
  return result;
}

function extractValidSettings(
  settings: Record<string, unknown>,
  allowedCategories: Set<string>
): Array<{ category: string; key: string; value: string | number | boolean | null }> {
  const result: Array<{ category: string; key: string; value: string | number | boolean | null }> =
    [];
  for (const [category, values] of Object.entries(settings)) {
    if (DANGEROUS_KEYS.has(category)) continue;
    if (!allowedCategories.has(category)) continue;
    if (typeof values !== "object" || values === null || Array.isArray(values)) continue;
    result.push(...extractCategorySettings(category, values as Record<string, unknown>));
  }
  return result;
}

// Role checking middleware
function requireRole(role: UserRole | UserRole[]) {
  return async (req: Request, res: Response, next: Function): Promise<void> => {
    const authReq = req as Request & {
      isAuthenticated(): boolean;
      user?: { claims?: { sub?: string } };
    };
    if (!authReq.isAuthenticated() || !authReq.user?.claims?.sub) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const userId = authReq.user.claims.sub;
    const user = await storage.getUser(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(user.role as UserRole)) {
      res
        .status(403)
        .json({ error: "Insufficient permissions", requiredRole: role, currentRole: user.role });
      return;
    }
    next();
  };
}

export function registerCmsApiRoutes(app: Express): void {
  const router = Router();

  // ========== Site Settings API ==========

  // Get all settings
  router.get(
    "/settings",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const settings = await storage.getSettings();
        res.json(settings);
      } catch {
        res.status(500).json({ error: "Failed to fetch settings" });
      }
    }
  );

  // Get settings by category (for frontend grouping)
  router.get(
    "/settings/grouped",
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
      } catch {
        res.status(500).json({ error: "Failed to fetch settings" });
      }
    }
  );

  // Update multiple settings at once
  router.post(
    "/settings/bulk",
    isAuthenticated,
    requireRole("admin"),
    async (req: AuthRequest, res: Response) => {
      try {
        const { settings } = req.body;
        if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
          return res.status(400).json({ error: "Settings object required" });
        }

        const allowedCategories = new Set(["site", "api", "content", "notifications", "security"]);
        const invalidCategories = Object.keys(settings).filter(c => !allowedCategories.has(c));
        if (invalidCategories.length > 0) {
          return res
            .status(400)
            .json({ error: `Invalid categories: ${invalidCategories.join(", ")}` });
        }

        const userId = getUserId(req);
        const validEntries = extractValidSettings(settings, allowedCategories);
        const updated: any[] = [];

        for (const { category, key, value } of validEntries) {
          const setting = await storage.upsertSetting(key, value, category, userId);
          updated.push(setting);
        }

        await (logAuditEvent as any)(
          req,
          "settings_change",
          "settings",
          "bulk",
          `Updated ${updated.length} settings`
        );
        res.json({ success: true, updated: updated.length });
      } catch {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  );

  // ========== Homepage Promotions Routes ==========

  router.get("/homepage-promotions/:section", async (req, res) => {
    try {
      const section = req.params.section as HomepageSection;
      const validSections = [
        "featured",
        "attractions",
        "hotels",
        "articles",
        "trending",
        "dining",
        "events",
      ];
      if (!validSections.includes(section)) {
        return res.status(400).json({ error: "Invalid section" });
      }
      const promotions = await storage.getHomepagePromotionsBySection(section);

      // Fetch content details for each promotion
      const promotionsWithContent = await Promise.all(
        promotions.map(async promo => {
          if (promo.contentId) {
            const content = await storage.getContent(promo.contentId);
            return { ...promo, content };
          }
          return promo;
        })
      );

      res.json(promotionsWithContent);
    } catch {
      res.status(500).json({ error: "Failed to fetch homepage promotions" });
    }
  });

  router.post(
    "/homepage-promotions",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const parsed = insertHomepagePromotionSchema.parse(req.body);
        const promotion = await storage.createHomepagePromotion(parsed);
        res.status(201).json(promotion);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create homepage promotion" });
      }
    }
  );

  router.patch(
    "/homepage-promotions/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        // Validate update payload - only allow specific fields
        const updateSchema = z.object({
          isActive: z.boolean().optional(),
          position: z.number().int().min(0).optional(),
          customTitle: z.string().nullable().optional(),
          customImage: z.string().nullable().optional(),
        });
        const parsed = updateSchema.parse(req.body);

        const promotion = await storage.updateHomepagePromotion(req.params.id, parsed);
        if (!promotion) {
          return res.status(404).json({ error: "Homepage promotion not found" });
        }
        res.json(promotion);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update homepage promotion" });
      }
    }
  );

  router.delete(
    "/homepage-promotions/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteHomepagePromotion(req.params.id);
        res.status(204).send();
      } catch {
        res.status(500).json({ error: "Failed to delete homepage promotion" });
      }
    }
  );

  router.post(
    "/homepage-promotions/reorder",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const reorderSchema = z.object({
          section: z.enum([
            "featured",
            "attractions",
            "hotels",
            "articles",
            "trending",
            "dining",
            "events",
          ]),
          orderedIds: z.array(z.string().uuid()),
        });
        const { section, orderedIds } = reorderSchema.parse(req.body);

        await storage.reorderHomepagePromotions(section, orderedIds);
        res.json({ success: true });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to reorder homepage promotions" });
      }
    }
  );

  // Mount all routes under /api
  app.use("/api", router);
}
