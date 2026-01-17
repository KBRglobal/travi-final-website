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

// Role checking middleware
function requireRole(role: UserRole | UserRole[]) {
  return async (req: Request, res: Response, next: Function): Promise<void> => {
    const authReq = req as Request & { isAuthenticated(): boolean; user?: { claims?: { sub?: string } } };
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
      res.status(403).json({ error: "Insufficient permissions", requiredRole: role, currentRole: user.role });
      return;
    }
    next();
  };
}

export function registerCmsApiRoutes(app: Express): void {
  const router = Router();

  // ========== Site Settings API ==========
  
  // Get all settings
  router.get("/settings", isAuthenticated, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Get settings by category (for frontend grouping)
  router.get("/settings/grouped", isAuthenticated, requireRole("admin"), async (req: AuthRequest, res: Response) => {
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
      console.error("Error fetching grouped settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update multiple settings at once
  router.post("/settings/bulk", isAuthenticated, requireRole("admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        return res.status(400).json({ error: "Settings object required" });
      }
      
      // Validate allowed categories
      const allowedCategories = ["site", "api", "content", "notifications", "security"];
      const invalidCategories = Object.keys(settings).filter(c => !allowedCategories.includes(c));
      if (invalidCategories.length > 0) {
        return res.status(400).json({ error: `Invalid categories: ${invalidCategories.join(", ")}` });
      }
      
      const userId = getUserId(req);
      const updated: any[] = [];
      
      // Dangerous keys that could cause prototype pollution
      const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
      
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
          if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
            continue;
          }
          const setting = await storage.upsertSetting(key.trim(), value, category, userId);
          updated.push(setting);
        }
      }
      
      await (logAuditEvent as any)(req, "settings_change", "settings", "bulk", `Updated ${updated.length} settings`);
      res.json({ success: true, updated: updated.length });
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ========== Homepage Promotions Routes ==========

  router.get("/homepage-promotions/:section", async (req, res) => {
    try {
      const section = req.params.section as HomepageSection;
      const validSections = ["featured", "attractions", "hotels", "articles", "trending", "dining", "events"];
      if (!validSections.includes(section)) {
        return res.status(400).json({ error: "Invalid section" });
      }
      const promotions = await storage.getHomepagePromotionsBySection(section);
      
      // Fetch content details for each promotion
      const promotionsWithContent = await Promise.all(
        promotions.map(async (promo) => {
          if (promo.contentId) {
            const content = await storage.getContent(promo.contentId);
            return { ...promo, content };
          }
          return promo;
        })
      );
      
      res.json(promotionsWithContent);
    } catch (error) {
      console.error("Error fetching homepage promotions:", error);
      res.status(500).json({ error: "Failed to fetch homepage promotions" });
    }
  });

  router.post("/homepage-promotions", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const parsed = insertHomepagePromotionSchema.parse(req.body);
      const promotion = await storage.createHomepagePromotion(parsed);
      res.status(201).json(promotion);
    } catch (error) {
      console.error("Error creating homepage promotion:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create homepage promotion" });
    }
  });

  router.patch("/homepage-promotions/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
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
      console.error("Error updating homepage promotion:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update homepage promotion" });
    }
  });

  router.delete("/homepage-promotions/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      await storage.deleteHomepagePromotion(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting homepage promotion:", error);
      res.status(500).json({ error: "Failed to delete homepage promotion" });
    }
  });

  router.post("/homepage-promotions/reorder", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const reorderSchema = z.object({
        section: z.enum(["featured", "attractions", "hotels", "articles", "trending", "dining", "events"]),
        orderedIds: z.array(z.string().uuid()),
      });
      const { section, orderedIds } = reorderSchema.parse(req.body);
      
      await storage.reorderHomepagePromotions(section, orderedIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering homepage promotions:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to reorder homepage promotions" });
    }
  });

  // Mount all routes under /api
  app.use("/api", router);
}
