/**
 * Keywords Repository Routes
 * Keyword management for SEO and content targeting
 */

import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requirePermission, checkReadOnlyMode } from "../security";
import { insertKeywordRepositorySchema } from "@shared/schema";

export function registerKeywordsRoutes(app: Express): void {
  // ============================================================================
  // KEYWORD REPOSITORY CRUD
  // ============================================================================

  app.get("/api/keywords", async (req, res) => {
    try {
      const { type, category, isActive } = req.query;
      const items = await storage.getKeywords({
        type: type as string | undefined,
        category: category as string | undefined,
        isActive: isActive === undefined ? undefined : isActive === "true",
      });
      res.json(items);
    } catch {
      res.status(500).json({ error: "Failed to fetch keywords" });
    }
  });

  app.get("/api/keywords/:id", async (req, res) => {
    try {
      const item = await storage.getKeyword(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Keyword not found" });
      }
      res.json(item);
    } catch {
      res.status(500).json({ error: "Failed to fetch keyword" });
    }
  });

  app.post("/api/keywords", requirePermission("canCreate"), checkReadOnlyMode, async (req, res) => {
    try {
      const parsed = insertKeywordRepositorySchema.parse(req.body);
      const item = await storage.createKeyword(parsed);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create keyword" });
    }
  });

  app.patch(
    "/api/keywords/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const item = await storage.updateKeyword(req.params.id, req.body);
        if (!item) {
          return res.status(404).json({ error: "Keyword not found" });
        }
        res.json(item);
      } catch {
        res.status(500).json({ error: "Failed to update keyword" });
      }
    }
  );

  app.delete(
    "/api/keywords/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteKeyword(req.params.id);
        res.status(204).send();
      } catch {
        res.status(500).json({ error: "Failed to delete keyword" });
      }
    }
  );

  app.post(
    "/api/keywords/:id/use",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const item = await storage.incrementKeywordUsage(req.params.id);
        if (!item) {
          return res.status(404).json({ error: "Keyword not found" });
        }
        res.json(item);
      } catch {
        res.status(500).json({ error: "Failed to increment keyword usage" });
      }
    }
  );

  // Bulk import keywords
  app.post(
    "/api/keywords/bulk-import",
    requirePermission("canManageSettings"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { keywords } = req.body;
        if (!Array.isArray(keywords) || keywords.length === 0) {
          return res.status(400).json({ error: "Keywords array is required" });
        }

        const results = { created: 0, skipped: 0, errors: [] as string[] };

        for (const kw of keywords) {
          try {
            const existingKeywords = await storage.getKeywords({});
            const exists = existingKeywords.some(
              (k: { keyword: string }) => k.keyword.toLowerCase() === kw.keyword.toLowerCase()
            );

            if (exists) {
              results.skipped++;
              continue;
            }

            await storage.createKeyword({
              keyword: kw.keyword,
              type: kw.type || "primary",
              category: kw.category || null,
              searchVolume: kw.searchVolume || null,
              competition: kw.competition || null,
              relatedKeywords: kw.relatedKeywords || [],
              priority: kw.priority || 0,
              notes: kw.notes || null,
              isActive: true,
            });
            results.created++;
          } catch (err: any) {
            if (err?.code === "23505") {
              results.skipped++;
            } else {
              results.errors.push(
                `Failed to import "${kw.keyword}": ${err?.message || "Unknown error"}`
              );
            }
          }
        }

        res.json({
          success: true,
          created: results.created,
          skipped: results.skipped,
          errors: results.errors.slice(0, 10),
          totalErrors: results.errors.length,
        });
      } catch {
        res.status(500).json({ error: "Failed to bulk import keywords" });
      }
    }
  );
}
