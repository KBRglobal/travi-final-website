/**
 * AI Writers and Homepage Promotions Routes
 * Virtual newsroom writers and homepage content promotions
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requirePermission, checkReadOnlyMode } from "../security";

import { insertHomepagePromotionSchema, type HomepageSection } from "@shared/schema";

export function registerWriterPromotionRoutes(app: Express): void {
  // ==========================================
  // AI Writers Routes
  // ==========================================

  // Get all writers
  app.get("/api/writers", async (req, res) => {
    try {
      const writers = await storage.getAllWriters();
      res.json({ writers, total: writers.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch writers" });
    }
  });

  // Get writer stats
  app.get("/api/writers/stats", async (req, res) => {
    try {
      const stats = await storage.getWriterStats();
      res.json({ stats });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch writer stats" });
    }
  });

  // Get single writer by slug
  app.get("/api/writers/:slug", async (req, res) => {
    try {
      const writer = await storage.getWriterBySlug(req.params.slug);
      if (!writer) {
        return res.status(404).json({ error: "Writer not found" });
      }
      res.json(writer);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch writer" });
    }
  });

  // Seed writers from config
  app.post(
    "/api/writers/seed",
    requirePermission("canManageSettings"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const count = await storage.seedWritersFromConfig();
        res.json({ success: true, message: `Seeded ${count} writers` });
      } catch (error) {
        res.status(500).json({ error: "Failed to seed writers" });
      }
    }
  );

  // Update writer with Zod validation
  const updateWriterSchema = z
    .object({
      isActive: z.boolean().optional(),
      name: z.string().min(1).max(100).optional(),
      avatar: z.string().url().optional().or(z.literal("")),
      bio: z.string().max(5000).optional(),
      shortBio: z.string().max(500).optional(),
    })
    .strict();

  app.patch(
    "/api/writers/:id",
    requirePermission("canManageSettings"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        // Validate request body with Zod
        const parsed = updateWriterSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({
            error: "Invalid request body",
            details: parsed.error.errors,
          });
        }

        // Reject empty updates
        if (Object.keys(parsed.data).length === 0) {
          return res.status(400).json({ error: "No valid fields to update" });
        }

        const updated = await storage.updateWriter(req.params.id, parsed.data);
        if (!updated) {
          return res.status(404).json({ error: "Writer not found" });
        }
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: "Failed to update writer" });
      }
    }
  );

  // ==========================================
  // Homepage Promotions Routes
  // ==========================================

  app.get("/api/homepage-promotions/:section", async (req, res) => {
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
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage promotions" });
    }
  });

  app.post(
    "/api/homepage-promotions",
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

  app.patch(
    "/api/homepage-promotions/:id",
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

  app.delete(
    "/api/homepage-promotions/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteHomepagePromotion(req.params.id);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete homepage promotion" });
      }
    }
  );

  app.post(
    "/api/homepage-promotions/reorder",
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
}
