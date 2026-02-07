import type { Express } from "express";
import { eq, and, sql } from "drizzle-orm";

import { db } from "../../db";
import { tiqetsAttractions } from "@shared/schema";
import { requireAuth } from "../../security";

export function registerAdminContentQualityRoutes(app: Express): void {
  // GET /api/admin/content-quality/report - Get overall quality report
  app.get("/api/admin/content-quality/report", requireAuth, async (req, res) => {
    try {
      const { getContentQualityReport } = await import("../../services/content-regeneration-job");
      const report = await getContentQualityReport();
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/content-quality/attractions - Get attractions with quality scores
  app.get("/api/admin/content-quality/attractions", requireAuth, async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;

      let query = db
        .select({
          id: tiqetsAttractions.id,
          title: tiqetsAttractions.title,
          cityName: tiqetsAttractions.cityName,
          seoSlug: tiqetsAttractions.seoSlug,
          qualityScore: tiqetsAttractions.qualityScore,
          seoScore: tiqetsAttractions.seoScore,
          aeoScore: tiqetsAttractions.aeoScore,
          factCheckScore: tiqetsAttractions.factCheckScore,
          contentVersion: tiqetsAttractions.contentVersion,
          status: tiqetsAttractions.status,
          lastContentUpdate: tiqetsAttractions.lastContentUpdate,
        })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "ready"))
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit))
        .orderBy(tiqetsAttractions.qualityScore);

      const attractions = await query;

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.status, "ready"));

      res.json({
        attractions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(countResult[0]?.count || 0),
          totalPages: Math.ceil(Number(countResult[0]?.count || 0) / Number(limit)),
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/content-quality/regenerate/:id - Regenerate single attraction
  app.post("/api/admin/content-quality/regenerate/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { regenerateSingleAttraction } =
        await import("../../services/content-regeneration-job");
      const result = await regenerateSingleAttraction(id);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/content-quality/regenerate-all - Start bulk regeneration
  app.post("/api/admin/content-quality/regenerate-all", requireAuth, async (req, res) => {
    try {
      const { batchSize, cityFilter } = req.body;
      const { regenerateAllAttractions, getRegenerationStats } =
        await import("../../services/content-regeneration-job");

      // Start in background - use high parallelism (user has 20 API keys)
      regenerateAllAttractions({
        batchSize: batchSize || 30,
        cityFilter,
      }).catch(err => {});

      res.json({
        success: true,
        message: "Regeneration job started",
        stats: getRegenerationStats(),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/content-quality/regeneration-status - Get regeneration job status
  app.get("/api/admin/content-quality/regeneration-status", requireAuth, async (req, res) => {
    try {
      const { getRegenerationStats } = await import("../../services/content-regeneration-job");
      res.json(getRegenerationStats());
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/api-keys/detected - Get which API key env vars are detected (no values exposed)
  app.get("/api/admin/api-keys/detected", requireAuth, async (req, res) => {
    try {
      // Helper: check for env var presence and add to list
      const checkEnvKey = (list: string[], key: string) => {
        if (process.env[key]) list.push(key);
      };
      // Helper: check numbered env vars (KEY_1 through KEY_20)
      const checkNumberedKeys = (list: string[], prefix: string) => {
        for (let i = 1; i <= 20; i++) {
          checkEnvKey(list, `${prefix}_${i}`);
        }
      };

      const detected: Record<string, string[]> = {
        anthropic: [],
        helicone: [],
        openai: [],
        openrouter: [],
        gemini: [],
        groq: [],
        mistral: [],
        deepseek: [],
      };

      checkEnvKey(detected.anthropic, "AI_INTEGRATIONS_ANTHROPIC_API_KEY");
      checkEnvKey(detected.anthropic, "ANTHROPIC_API_KEY");
      checkNumberedKeys(detected.anthropic, "ANTHROPIC_API_KEY");

      checkEnvKey(detected.helicone, "HELICONE_API_KEY");
      checkNumberedKeys(detected.helicone, "HELICONE_API_KEY");

      checkEnvKey(detected.openai, "AI_INTEGRATIONS_OPENAI_API_KEY");
      checkEnvKey(detected.openai, "OPENAI_API_KEY");
      checkNumberedKeys(detected.openai, "OPENAI_API_KEY");

      checkEnvKey(detected.openrouter, "OPENROUTER_API_KEY");
      checkNumberedKeys(detected.openrouter, "OPENROUTER_API_KEY");

      checkEnvKey(detected.gemini, "AI_INTEGRATIONS_GEMINI_API_KEY");
      checkEnvKey(detected.gemini, "GEMINI_API_KEY");
      checkEnvKey(detected.groq, "GROQ_API_KEY");
      checkEnvKey(detected.mistral, "MISTRAL_API_KEY");
      checkEnvKey(detected.deepseek, "DEEPSEEK_API_KEY");

      const total = Object.values(detected).reduce((sum, arr) => sum + arr.length, 0);
      res.json({ detected, total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/content-quality/engine-stats - Get multi-provider engine pool statistics
  app.get("/api/admin/content-quality/engine-stats", requireAuth, async (req, res) => {
    try {
      const { EngineRegistry } = await import("../../services/engine-registry");
      const stats = EngineRegistry.getStats();
      const engines = EngineRegistry.getAllEngines().map(e => ({
        id: e.id,
        name: e.name,
        provider: e.provider,
        model: e.model,
        isHealthy: e.isHealthy,
        successCount: e.successCount,
        errorCount: e.errorCount,
        lastError: e.lastError,
        lastUsed: e.lastUsed,
      }));
      res.json({ stats, engines });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/content-quality/validate/:id - Validate content quality for an attraction
  app.post("/api/admin/content-quality/validate/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { validateContent } = await import("../../services/content-quality-validator");

      const attraction = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.id, id))
        .limit(1);

      if (!attraction.length) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      const aiContent = (attraction[0].aiContent as Record<string, any>) || {};
      const score = validateContent(aiContent, {
        cityName: attraction[0].cityName,
        title: attraction[0].title,
        duration: attraction[0].duration,
        wheelchairAccess: attraction[0].wheelchairAccess,
      });

      res.json(score);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/content-quality/publish-ready - Publish all attractions with 90+ score
  app.post("/api/admin/content-quality/publish-ready", requireAuth, async (req, res) => {
    try {
      const result = await db
        .update(tiqetsAttractions)
        .set({ status: "published" } as any)
        .where(
          and(
            eq(tiqetsAttractions.status, "ready"),
            sql`quality_score >= 90`,
            sql`seo_score >= 90`,
            sql`aeo_score >= 90`,
            sql`fact_check_score >= 90`
          )
        );

      res.json({
        success: true,
        message: "Published all attractions with 90+ scores on all metrics",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
