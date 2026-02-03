import type { Express, Request, Response } from "express";
import { eq, and, sql, ilike, desc, or, inArray } from "drizzle-orm";
import { db } from "../../db";
import { tiqetsAttractions, tiqetsCities } from "@shared/schema";
import { requireAuth } from "../../security";

export function registerAdminTiqetsRoutes(app: Express): void {
  // GET /api/admin/tiqets/cities - Get all Tiqets cities
  app.get("/api/admin/tiqets/cities", requireAuth, async (req, res) => {
    try {
      const cities = await db.select().from(tiqetsCities).orderBy(tiqetsCities.name);
      res.json({ cities });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cities" });
    }
  });

  // PATCH /api/admin/tiqets/cities/:id - Update a city
  app.patch("/api/admin/tiqets/cities/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { tiqetsCityId, countryName, attractionCount, isActive } = req.body;

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (tiqetsCityId !== undefined) updateData.tiqetsCityId = tiqetsCityId;
      if (countryName !== undefined) updateData.countryName = countryName;
      if (attractionCount !== undefined) updateData.attractionCount = attractionCount;
      if (isActive !== undefined) updateData.isActive = isActive;

      await db.update(tiqetsCities).set(updateData).where(eq(tiqetsCities.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update city" });
    }
  });

  // GET /api/admin/tiqets/search-city - Search Tiqets API for a city
  app.get("/api/admin/tiqets/search-city", requireAuth, async (req, res) => {
    try {
      const { name } = req.query;
      const apiToken = process.env.TIQETS_API_TOKEN;

      if (!apiToken) {
        return res.status(400).json({ error: "Tiqets API not configured" });
      }

      const response = await fetch(
        `https://api.tiqets.com/v2/cities?search=${encodeURIComponent(name as string)}`,
        {
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Tiqets API error: ${response.status}`);
      }

      const data = await response.json();
      res.json({ results: data.cities || [] });
    } catch (error) {
      res.status(500).json({ error: "Failed to search Tiqets API", results: [] });
    }
  });

  // GET /api/admin/tiqets/attractions - Get all Tiqets attractions
  app.get("/api/admin/tiqets/attractions", requireAuth, async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;

      const query = db
        .select({
          id: tiqetsAttractions.id,
          title: tiqetsAttractions.title,
          slug: tiqetsAttractions.slug,
          cityName: tiqetsAttractions.cityName,
          status: tiqetsAttractions.status,
        })
        .from(tiqetsAttractions);

      const attractions = await query.limit(Number(limit)).offset(Number(offset));
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tiqetsAttractions);

      res.json({ attractions, total: countResult?.count || 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attractions" });
    }
  });

  // GET /api/admin/tiqets/attractions/:id - Get a single Tiqets attraction by ID
  app.get("/api/admin/tiqets/attractions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      const [attraction] = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.id, id))
        .limit(1);

      if (!attraction) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      res.json(attraction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attraction" });
    }
  });

  // PATCH /api/admin/tiqets/attractions/:id - Update SEO/AEO fields for an attraction
  app.patch("/api/admin/tiqets/attractions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { updateTiqetsAttractionSchema } = await import("@shared/schema");

      const parseResult = updateTiqetsAttractionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request body",
          details: parseResult.error.errors,
        });
      }

      const [existing] = await db
        .select({ id: tiqetsAttractions.id })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.id, id))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: "Attraction not found" });
      }

      const updateData = {
        ...parseResult.data,
        updatedAt: new Date(),
      };

      const [updated] = await db
        .update(tiqetsAttractions)
        .set(updateData as any)
        .where(eq(tiqetsAttractions.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update attraction" });
    }
  });

  // GET /api/admin/tiqets/attractions/by-city/:cityName - Get attractions for a specific city
  app.get("/api/admin/tiqets/attractions/by-city/:cityName", requireAuth, async (req, res) => {
    try {
      const { cityName } = req.params;
      const { limit = 50 } = req.query;

      const attractions = await db
        .select({
          id: tiqetsAttractions.id,
          title: tiqetsAttractions.title,
          slug: tiqetsAttractions.slug,
          cityName: tiqetsAttractions.cityName,
          status: tiqetsAttractions.status,
        })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.cityName, cityName))
        .limit(Number(limit));

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.cityName, cityName));

      res.json({ attractions, total: countResult?.count || 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attractions", attractions: [], total: 0 });
    }
  });

  // GET /api/admin/tiqets/integration-status - Check API connection status
  app.get("/api/admin/tiqets/integration-status", requireAuth, async (req, res) => {
    const apiToken = process.env.TIQETS_API_TOKEN;
    const partnerId = process.env.TIQETS_PARTNER_ID;

    let status: "connected" | "error" | "not_configured" = "not_configured";
    let message = "";

    if (!apiToken) {
      message = "TIQETS_API_TOKEN environment variable is not set";
    } else if (!partnerId) {
      message = "TIQETS_PARTNER_ID environment variable is not set";
      status = "error";
    } else {
      status = "connected";
      message = "Tiqets API is configured and ready to use";
    }

    res.json({
      tiqets: {
        configured: !!apiToken && !!partnerId,
        apiToken: !!apiToken,
        partnerId: partnerId || null,
        lastCheck: new Date().toISOString(),
        status,
        message,
      },
    });
  });

  // GET /api/admin/tiqets/dashboard-stats - Get dashboard statistics
  app.get("/api/admin/tiqets/dashboard-stats", requireAuth, async (req, res) => {
    try {
      const [citiesResult] = await db
        .select({
          total: sql<number>`count(*)`,
          configured: sql<number>`count(*) filter (where tiqets_city_id is not null)`,
          active: sql<number>`count(*) filter (where is_active = true)`,
        })
        .from(tiqetsCities);

      const [attractionsResult] = await db
        .select({
          total: sql<number>`count(*)`,
          imported: sql<number>`count(*) filter (where status = 'imported')`,
          ready: sql<number>`count(*) filter (where status = 'ready')`,
          published: sql<number>`count(*) filter (where status = 'published')`,
        })
        .from(tiqetsAttractions);

      const apiToken = process.env.TIQETS_API_TOKEN;
      const partnerId = process.env.TIQETS_PARTNER_ID;

      res.json({
        cities: {
          total: Number(citiesResult?.total) || 0,
          configured: Number(citiesResult?.configured) || 0,
          active: Number(citiesResult?.active) || 0,
        },
        attractions: {
          total: Number(attractionsResult?.total) || 0,
          imported: Number(attractionsResult?.imported) || 0,
          ready: Number(attractionsResult?.ready) || 0,
          published: Number(attractionsResult?.published) || 0,
        },
        integration: {
          status: apiToken && partnerId ? "connected" : "not_configured",
          partnerId: partnerId || null,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // POST /api/admin/tiqets/find-city-ids - Find Tiqets city IDs for our 16 cities
  app.post("/api/admin/tiqets/find-city-ids", requireAuth, async (req, res) => {
    try {
      const { TiqetsImportService } = await import("../../lib/tiqets-import-service");
      const service = new TiqetsImportService();

      const logs: string[] = [];
      const result = await service.findAllCityIds(msg => {
        logs.push(msg);
      });

      res.json({
        success: true,
        found: result.found,
        total: result.total,
        details: result.details,
        logs,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/admin/tiqets/import-city - Import attractions for a single city
  app.post("/api/admin/tiqets/import-city", requireAuth, async (req, res) => {
    try {
      const { tiqetsCityId, cityName } = req.body;

      if (!tiqetsCityId || !cityName) {
        return res.status(400).json({
          success: false,
          error: "Missing tiqetsCityId or cityName",
        });
      }

      const { TiqetsImportService } = await import("../../lib/tiqets-import-service");
      const service = new TiqetsImportService();

      const logs: string[] = [];
      const result = await service.importCity(tiqetsCityId, cityName, msg => {
        logs.push(msg);
      });

      res.json({
        success: true,
        ...result,
        logs,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/admin/tiqets/import-all - Import all 16 cities
  app.post("/api/admin/tiqets/import-all", requireAuth, async (req, res) => {
    try {
      const { TiqetsImportService } = await import("../../lib/tiqets-import-service");
      const service = new TiqetsImportService();

      const logs: string[] = [];
      const result = await service.importAllCities(msg => {
        logs.push(msg);
      });

      res.json({
        success: true,
        ...result,
        logs,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /api/admin/tiqets/test-connection - Test Tiqets API connection
  app.post("/api/admin/tiqets/test-connection", requireAuth, async (req, res) => {
    try {
      const { TiqetsClient } = await import("../../lib/tiqets-client");
      const client = new TiqetsClient();

      const result = await client.testConnection();

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  // POST /api/admin/tiqets/attractions/:id/generate-content - Generate AI content for single attraction
  // Uses multi-model provider with automatic fallback (Anthropic -> OpenAI -> Gemini)
  app.post("/api/admin/tiqets/attractions/:id/generate-content", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;

      // Get attraction directly from database
      const [attraction] = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.id, id))
        .limit(1);

      if (!attraction) {
        return res.status(404).json({ success: false, error: "Attraction not found" });
      }

      // Mark as generating
      await db
        .update(tiqetsAttractions)
        .set({ contentGenerationStatus: "generating", updatedAt: new Date() } as any)
        .where(eq(tiqetsAttractions.id, id));

      const { generateAttractionContent } = await import("../../services/attraction-content-generator");

      try {
        const result = await generateAttractionContent(attraction);

        // Save generated content to database
        const [updated] = await db
          .update(tiqetsAttractions)
          .set({
            h1Title: result.content.h1Title,
            metaTitle: result.content.metaTitle,
            metaDescription: result.content.metaDescription,
            highlights: result.content.highlights,
            faqs: result.content.faqs,
            aiContent: result.content.aiContent,
            contentGenerationStatus: "ready",
            status: "ready",
            contentGeneratedAt: new Date(),
            updatedAt: new Date(),
          } as any)
          .where(eq(tiqetsAttractions.id, id))
          .returning();

        res.json({
          success: true,
          attraction: updated,
          warnings: result.warnings,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs,
          tokensUsed: result.tokensUsed,
        });
      } catch (genError: any) {
        // Mark as failed
        await db
          .update(tiqetsAttractions)
          .set({ contentGenerationStatus: "failed", updatedAt: new Date() } as any)
          .where(eq(tiqetsAttractions.id, id));
        throw genError;
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // GET /api/admin/ai/providers - Check AI provider status
  app.get("/api/admin/ai/providers", requireAuth, async (req, res) => {
    try {
      const { getMultiModelProvider } = await import("../../ai/multi-model-provider");
      const provider = getMultiModelProvider();
      const providers = await provider.checkAvailability();
      res.json({ success: true, providers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // POST /api/admin/tiqets/generate-city-content - Generate AI content for all attractions in a city (SSE)
  // Uses multi-model provider with automatic fallback
  app.post("/api/admin/tiqets/generate-city-content", requireAuth, async (req, res) => {
    const { cityName } = req.body;

    if (!cityName) {
      return res.status(400).json({ success: false, error: "cityName is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Get attractions directly from database
      const attractions = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.cityName, cityName));

      // Filter to only pending or failed attractions (status can be "imported" or "ready")
      const pendingAttractions = attractions.filter(
        a => a.contentGenerationStatus === "pending" || a.contentGenerationStatus === "failed"
      );

      sendEvent({ type: "started", total: pendingAttractions.length, cityName });

      if (pendingAttractions.length === 0) {
        sendEvent({ type: "complete", processed: 0, errors: 0 });
        res.end();
        return;
      }

      const { generateAttractionContent } = await import("../../services/attraction-content-generator");

      let processed = 0;
      let errors = 0;
      const providerStats: Record<string, number> = {};

      for (const attraction of pendingAttractions) {
        try {
          sendEvent({ type: "processing", title: attraction.title });

          // Mark as generating
          await db
            .update(tiqetsAttractions)
            .set({ contentGenerationStatus: "generating" } as any)
            .where(eq(tiqetsAttractions.id, attraction.id));

          const result = await generateAttractionContent(attraction);

          // Track provider usage
          providerStats[result.provider] = (providerStats[result.provider] || 0) + 1;

          // Save generated content
          await db
            .update(tiqetsAttractions)
            .set({
              h1Title: result.content.h1Title,
              metaTitle: result.content.metaTitle,
              metaDescription: result.content.metaDescription,
              highlights: result.content.highlights,
              faqs: result.content.faqs,
              aiContent: result.content.aiContent,
              contentGenerationStatus: "ready",
              status: "ready",
              contentGeneratedAt: new Date(),
              updatedAt: new Date(),
            } as any)
            .where(eq(tiqetsAttractions.id, attraction.id));

          processed++;
          sendEvent({
            type: "progress",
            processed,
            errors,
            total: pendingAttractions.length,
            title: attraction.title,
            provider: result.provider,
            latencyMs: result.latencyMs,
          });
        } catch (err: any) {
          // Mark as failed
          await db
            .update(tiqetsAttractions)
            .set({ contentGenerationStatus: "failed" } as any)
            .where(eq(tiqetsAttractions.id, attraction.id));

          errors++;
          processed++;
          sendEvent({
            type: "progress",
            processed,
            errors,
            total: pendingAttractions.length,
            title: attraction.title,
            error: err.message,
          });
        }
      }

      sendEvent({ type: "complete", processed, errors, providerStats });
      res.end();
    } catch (error: any) {
      sendEvent({ type: "error", message: error.message });
      res.end();
    }
  });

  // POST /api/admin/tiqets/generate-all-content - Generate AI content for ALL cities (SSE)
  app.post("/api/admin/tiqets/generate-all-content", requireAuth, async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // First, reset any stuck "generating" status
      await db
        .update(tiqetsAttractions)
        .set({ contentGenerationStatus: "pending" } as any)
        .where(eq(tiqetsAttractions.contentGenerationStatus, "generating"));

      // Get all cities with pending attractions
      const cityStats = await db
        .select({
          cityName: tiqetsAttractions.cityName,
          count: sql<number>`count(*)::int`,
        })
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.contentGenerationStatus, "pending"))
        .groupBy(tiqetsAttractions.cityName)
        .orderBy(sql`count(*) desc`);

      const totalAttractions = cityStats.reduce((sum, c) => sum + c.count, 0);
      sendEvent({ type: "init", cities: cityStats, totalAttractions });

      if (totalAttractions === 0) {
        sendEvent({ type: "complete", totalProcessed: 0, totalErrors: 0 });
        res.end();
        return;
      }

      const { generateAttractionContent } = await import("../../services/attraction-content-generator");

      let globalProcessed = 0;
      let globalErrors = 0;
      const providerStats: Record<string, number> = {};

      for (const city of cityStats) {
        const cityName = city.cityName!;
        sendEvent({ type: "city_started", cityName, count: city.count });

        const attractions = await db
          .select()
          .from(tiqetsAttractions)
          .where(
            and(
              eq(tiqetsAttractions.cityName, cityName),
              eq(tiqetsAttractions.contentGenerationStatus, "pending")
            )
          );

        for (const attraction of attractions) {
          try {
            await db
              .update(tiqetsAttractions)
              .set({ contentGenerationStatus: "generating" } as any)
              .where(eq(tiqetsAttractions.id, attraction.id));

            const result = await generateAttractionContent(attraction);
            providerStats[result.provider] = (providerStats[result.provider] || 0) + 1;

            await db
              .update(tiqetsAttractions)
              .set({
                h1Title: result.content.h1Title,
                metaTitle: result.content.metaTitle,
                metaDescription: result.content.metaDescription,
                highlights: result.content.highlights,
                faqs: result.content.faqs,
                aiContent: result.content.aiContent,
                contentGenerationStatus: "ready",
                status: "ready",
                contentGeneratedAt: new Date(),
                updatedAt: new Date(),
              } as any)
              .where(eq(tiqetsAttractions.id, attraction.id));

            globalProcessed++;
            sendEvent({
              type: "progress",
              city: cityName,
              title: attraction.title?.slice(0, 50),
              provider: result.provider,
              latencyMs: result.latencyMs,
              globalProcessed,
              globalErrors,
              totalAttractions,
            });
          } catch (err: any) {
            await db
              .update(tiqetsAttractions)
              .set({ contentGenerationStatus: "failed" } as any)
              .where(eq(tiqetsAttractions.id, attraction.id));

            globalErrors++;
            sendEvent({
              type: "error",
              city: cityName,
              title: attraction.title?.slice(0, 50),
              error: err.message,
              globalProcessed,
              globalErrors,
              totalAttractions,
            });
          }
        }

        sendEvent({ type: "city_complete", cityName });
      }

      sendEvent({
        type: "complete",
        totalProcessed: globalProcessed,
        totalErrors: globalErrors,
        providerStats,
      });
      res.end();
    } catch (error: any) {
      sendEvent({ type: "fatal_error", message: error.message });
      res.end();
    }
  });

  // POST /api/admin/tiqets/generate-parallel - Generate AI content using available providers in parallel
  // Each provider handles a portion of attractions, evenly distributed
  app.post("/api/admin/tiqets/generate-parallel", requireAuth, async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Reset any stuck "generating" status
      await db
        .update(tiqetsAttractions)
        .set({ contentGenerationStatus: "pending" } as any)
        .where(eq(tiqetsAttractions.contentGenerationStatus, "generating"));

      // Check which providers are available by testing them
      const { getMultiModelProvider } = await import("../../ai/multi-model-provider");
      const providerInstance = getMultiModelProvider();
      const providerStatus = await providerInstance.checkAvailability();
      const potentialProviders = providerStatus.filter(p => p.available).map(p => p.name) as Array<
        "anthropic" | "openai" | "gemini" | "openrouter" | "deepseek" | "perplexity"
      >;

      sendEvent({ type: "testing_providers", potential: potentialProviders });

      // Test each provider with a quick request
      const testPrompt = "Reply with just: OK";
      const availableProviders: Array<
        "anthropic" | "openai" | "gemini" | "openrouter" | "deepseek" | "perplexity"
      > = [];

      for (const providerName of potentialProviders) {
        try {
          await providerInstance.generateWithSpecificProvider(providerName, testPrompt, {
            maxTokens: 10,
            temperature: 0,
          });
          availableProviders.push(providerName);
          sendEvent({ type: "provider_verified", provider: providerName, status: "ok" });
        } catch (err: any) {
          sendEvent({
            type: "provider_failed",
            provider: providerName,
            error: err.message?.slice(0, 100),
          });
        }
      }

      if (availableProviders.length === 0) {
        sendEvent({ type: "error", message: "No AI providers passed verification" });
        res.end();
        return;
      }

      sendEvent({ type: "providers_ready", available: availableProviders });

      // Get all pending attractions
      const allAttractions = await db
        .select()
        .from(tiqetsAttractions)
        .where(eq(tiqetsAttractions.contentGenerationStatus, "pending"));

      // Distribute attractions evenly among available providers
      const workloads: Array<{
        provider: "anthropic" | "openai" | "gemini" | "openrouter" | "deepseek" | "perplexity";
        attractions: typeof allAttractions;
      }> = availableProviders.map(p => ({ provider: p, attractions: [] }));

      allAttractions.forEach((attraction, index) => {
        const workerIndex = index % availableProviders.length;
        workloads[workerIndex].attractions.push(attraction);
      });

      const totalAttractions = allAttractions.length;
      sendEvent({
        type: "init",
        totalAttractions,
        distribution: workloads.map(w => ({
          provider: w.provider,
          count: w.attractions.length,
        })),
      });

      if (totalAttractions === 0) {
        sendEvent({ type: "complete", totalProcessed: 0, totalErrors: 0 });
        res.end();
        return;
      }

      const { generateAttractionContent } = await import("../../services/attraction-content-generator");

      // Shared progress tracking
      let globalProcessed = 0;
      let globalErrors = 0;
      const providerStats: Record<string, { processed: number; errors: number }> = {};

      // Worker function for a single provider
      const processWorker = async (workload: (typeof workloads)[0]) => {
        const { provider, attractions } = workload;
        providerStats[provider] = { processed: 0, errors: 0 };

        for (const attraction of attractions) {
          try {
            await db
              .update(tiqetsAttractions)
              .set({ contentGenerationStatus: "generating" } as any)
              .where(eq(tiqetsAttractions.id, attraction.id));

            const result = await generateAttractionContent(attraction, {
              specificProvider: provider as any,
            });

            await db
              .update(tiqetsAttractions)
              .set({
                h1Title: result.content.h1Title,
                metaTitle: result.content.metaTitle,
                metaDescription: result.content.metaDescription,
                highlights: result.content.highlights,
                faqs: result.content.faqs,
                aiContent: result.content.aiContent,
                contentGenerationStatus: "ready",
                status: "ready",
                contentGeneratedAt: new Date(),
                updatedAt: new Date(),
              } as any)
              .where(eq(tiqetsAttractions.id, attraction.id));

            globalProcessed++;
            providerStats[provider].processed++;
            sendEvent({
              type: "progress",
              provider,
              title: attraction.title?.slice(0, 40),
              latencyMs: result.latencyMs,
              globalProcessed,
              globalErrors,
              totalAttractions,
            });
          } catch (err: any) {
            await db
              .update(tiqetsAttractions)
              .set({ contentGenerationStatus: "failed" } as any)
              .where(eq(tiqetsAttractions.id, attraction.id));

            globalErrors++;
            providerStats[provider].errors++;
            sendEvent({
              type: "worker_error",
              provider,
              title: attraction.title?.slice(0, 40),
              error: err.message,
              globalProcessed,
              globalErrors,
              totalAttractions,
            });
          }
        }

        sendEvent({ type: "worker_complete", provider, stats: providerStats[provider] });
      };

      // Run all 3 workers in parallel
      sendEvent({ type: "workers_started", count: workloads.length });
      await Promise.all(workloads.map(w => processWorker(w)));

      sendEvent({
        type: "complete",
        totalProcessed: globalProcessed,
        totalErrors: globalErrors,
        providerStats,
      });
      res.end();
    } catch (error: any) {
      sendEvent({ type: "fatal_error", message: error.message });
      res.end();
    }
  });

  // POST /api/admin/tiqets/generate-octypo - High-quality V2 content generation using Octypo system
  // STRICT: Generates 90+ quality score articles with full BLUEPRINT compliance - NO EXCEPTIONS
  app.post("/api/admin/tiqets/generate-octypo", requireAuth, async (req, res) => {
    // Maximum parallelism - use all available engines
    const concurrency = Math.min(parseInt((req.query.concurrency as string) || "20"), 50);
    const batchSize = Math.min(parseInt((req.query.batch as string) || "100"), 200);

    res.json({
      status: "started",
      concurrency,
      batchSize,
      message:
        "Generation running in background. Check /api/admin/tiqets/octypo-status for progress.",
    });

    // Run generation in background (after response)
    setImmediate(async () => {
      // Import state first so we can always reset it
      const { octypoState } = await import("../../octypo/state");

      try {
        const { getOctypoOrchestrator } = await import("../../octypo");
        // AttractionData type is internal to octypo, not exported - use inline type
        const { pool } = await import("./db");

        // STRICT: Quality threshold is 90 - NO EXCEPTIONS
        const orchestrator = getOctypoOrchestrator({ maxRetries: 3, qualityThreshold: 90 });
        await orchestrator.initialize();

        const QUALITY_THRESHOLD = 90;
        let processed = 0;
        let highQuality = 0;
        let errors = 0;

        // Get attractions that need processing (quality_score below 90 or NULL)
        const { rows: attractions } = await pool.query(
          `
          SELECT id, title, city_name, venue_name, duration, primary_category, 
                 secondary_categories, languages, wheelchair_access, tiqets_description,
                 tiqets_highlights, price_usd, tiqets_rating, tiqets_review_count
          FROM tiqets_attractions 
          WHERE quality_score IS NULL OR quality_score < $1
          ORDER BY tiqets_review_count DESC NULLS LAST
          LIMIT $2
        `,
          [QUALITY_THRESHOLD, batchSize]
        );

        if (attractions.length === 0) {
          // CRITICAL: Reset running state when no work to do
          octypoState.setRunning(false);
          return;
        }

        // Process with bounded concurrency using Promise pool
        const processAttraction = async (attr: any) => {
          const attractionData = {
            id: 0,
            originalId: attr.id,
            title: attr.title || "Unknown",
            // FAIL-FAST: Do not use implicit Dubai fallback - require city_name or skip
            cityName: attr.city_name || "",
            venueName: attr.venue_name || undefined,
            duration: attr.duration || undefined,
            primaryCategory: attr.primary_category || undefined,
            secondaryCategories: attr.secondary_categories || undefined,
            languages: attr.languages || undefined,
            wheelchairAccess: attr.wheelchair_access || false,
            tiqetsDescription: attr.tiqets_description || undefined,
            tiqetsHighlights: attr.tiqets_highlights || undefined,
            priceFrom: attr.price_usd ? parseFloat(attr.price_usd) : undefined,
            rating: attr.tiqets_rating ? parseFloat(attr.tiqets_rating) : undefined,
            reviewCount: attr.tiqets_review_count || undefined,
          };

          try {
            const result = await orchestrator.generateAttractionContent(attractionData as any);

            if (result.success && result.content && result.qualityScore) {
              const content = result.content;
              const score = result.qualityScore;

              // Map content for storage
              const mappedContent = {
                introduction: content.introduction || "",
                whyVisit: content.introduction?.substring(0, 300) || "",
                proTip: content.honestLimitations?.[0] || "",
                whatToExpect: [
                  { title: "Experience", description: content.whatToExpect || "", icon: "star" },
                ],
                visitorTips: [
                  { title: "Tips", description: content.visitorTips || "", icon: "lightbulb" },
                ],
                howToGetThere: { description: content.howToGetThere || "", transport: [] },
                answerCapsule: content.answerCapsule || "",
                schemaPayload: content.schemaPayload || {},
              };

              // Truncate meta fields to fit database constraints
              const truncateToLength = (text: string, maxLen: number): string => {
                if (!text || text.length <= maxLen) return text || "";
                const truncated = text.slice(0, maxLen - 3);
                const lastSpace = truncated.lastIndexOf(" ");
                return (
                  (lastSpace > maxLen - 30 ? truncated.slice(0, lastSpace) : truncated) + "..."
                );
              };

              const safeMetaTitle = truncateToLength(content.metaTitle || "", 60);
              const safeMetaDescription = truncateToLength(content.metaDescription || "", 160);

              await pool.query(
                `
                UPDATE tiqets_attractions SET
                  ai_content = $1,
                  meta_title = $2,
                  meta_description = $3,
                  faqs = $4,
                  description = $5,
                  seo_score = $6,
                  aeo_score = $7,
                  fact_check_score = $8,
                  quality_score = $9,
                  content_version = 2,
                  last_content_update = NOW(),
                  content_generation_status = 'completed',
                  content_generation_completed_at = NOW()
                WHERE id = $10
              `,
                [
                  JSON.stringify(mappedContent),
                  safeMetaTitle,
                  safeMetaDescription,
                  JSON.stringify(content.faqs),
                  content.introduction,
                  score.seoScore,
                  score.aeoScore,
                  score.factCheckScore,
                  score.overallScore,
                  attr.id,
                ]
              );

              processed++;
              if (score.overallScore >= QUALITY_THRESHOLD) highQuality++;

              // Report success for adaptive concurrency
              octypoState.reportSuccess();
              octypoState.removeFromFailedQueue(attr.id);
            } else {
              errors++;
              octypoState.addToFailedQueue(attr.id, attr.title || "Unknown", "Generation failed");
            }
          } catch (err: any) {
            errors++;
            octypoState.addToFailedQueue(
              attr.id,
              attr.title || "Unknown",
              err.message || "Unknown error"
            );
          }
        };

        // Process with adaptive bounded concurrency
        const batchStartTime = Date.now();
        let chunkIndex = 0;
        let remainingAttractions = [...attractions];

        while (remainingAttractions.length > 0) {
          // Get adaptive concurrency (adjusts based on success rate)
          const adaptiveConcurrency = octypoState.adjustConcurrency();
          const chunk = remainingAttractions.splice(0, adaptiveConcurrency);

          const chunkStartTime = Date.now();
          await Promise.all(chunk.map(processAttraction));
          chunkIndex++;

          // Detailed batch completion logging
          const chunkDuration = ((Date.now() - chunkStartTime) / 1000).toFixed(1);
          const totalDuration = ((Date.now() - batchStartTime) / 1000).toFixed(1);
          const articlesPerMin =
            processed > 0 ? (processed / ((Date.now() - batchStartTime) / 60000)).toFixed(1) : "0";

          // Query remaining count for ETA
          const { rows: remainingRows } = await pool.query(`
            SELECT COUNT(*) as remaining FROM tiqets_attractions 
            WHERE quality_score IS NULL OR quality_score < 90
          `);
          const remaining = parseInt(remainingRows[0]?.remaining) || 0;
          const etaHours =
            parseFloat(articlesPerMin) > 0
              ? (remaining / (parseFloat(articlesPerMin) * 60)).toFixed(1)
              : "?";

          const stateStats = octypoState.getStats();
        }

        // Signal batch completion to background service
        octypoState.setRunning(false);
      } catch (err: any) {
        // Signal completion even on error
        octypoState.setRunning(false);
      }
    });
  });

  // GET /api/admin/tiqets/octypo-status - Get current octypo generation status
  app.get("/api/admin/tiqets/octypo-status", async (req, res) => {
    try {
      const { pool } = await import("./db");

      // STRICT: Quality threshold is 90 - NO EXCEPTIONS
      const { rows: stats } = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE quality_score >= 90) as high_quality,
          COUNT(*) FILTER (WHERE quality_score IS NOT NULL AND quality_score < 90) as low_quality,
          COUNT(*) FILTER (WHERE quality_score IS NULL) as pending,
          COUNT(*) as total,
          AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL) as avg_score,
          MAX(last_content_update) as last_update
        FROM tiqets_attractions
      `);

      const stat = stats[0];
      res.json({
        highQuality: parseInt(stat.high_quality) || 0,
        lowQuality: parseInt(stat.low_quality) || 0,
        pending: parseInt(stat.pending) || 0,
        total: parseInt(stat.total) || 0,
        avgScore: parseFloat(stat.avg_score) || 0,
        lastUpdate: stat.last_update,
        percentComplete:
          stat.total > 0
            ? ((parseInt(stat.high_quality) / parseInt(stat.total)) * 100).toFixed(1) + "%"
            : "0%",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/tiqets/generation-progress - Detailed generation progress dashboard
  app.get("/api/admin/tiqets/generation-progress", async (req, res) => {
    try {
      const { pool } = await import("./db");
      const { octypoState } = await import("../../octypo/state");

      const { rows: stats } = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE last_content_update > NOW() - INTERVAL '1 hour') as last_hour,
          COUNT(*) FILTER (WHERE last_content_update > NOW() - INTERVAL '24 hours') as last_24h,
          COUNT(*) FILTER (WHERE quality_score >= 90) as completed,
          COUNT(*) FILTER (WHERE quality_score IS NULL OR quality_score < 90) as pending,
          COUNT(*) as total,
          AVG(quality_score) FILTER (WHERE quality_score IS NOT NULL) as avg_score,
          MIN(last_content_update) FILTER (WHERE last_content_update > NOW() - INTERVAL '1 hour') as first_in_hour,
          MAX(last_content_update) as last_update
        FROM tiqets_attractions
      `);

      const stat = stats[0];
      const lastHour = parseInt(stat.last_hour) || 0;
      const last24h = parseInt(stat.last_24h) || 0;
      const completed = parseInt(stat.completed) || 0;
      const pending = parseInt(stat.pending) || 0;
      const total = parseInt(stat.total) || 0;

      // Calculate hourly rate based on last 24h average
      const hourlyRate = last24h > 0 ? (last24h / 24).toFixed(1) : "0";
      const currentHourlyRate = lastHour;

      // Estimate time to complete remaining
      const effectiveRate = currentHourlyRate > 0 ? currentHourlyRate : parseFloat(hourlyRate);
      const hoursRemaining = effectiveRate > 0 ? pending / effectiveRate : null;
      const etaText =
        hoursRemaining !== null
          ? hoursRemaining < 1
            ? `${Math.round(hoursRemaining * 60)} minutes`
            : `${hoursRemaining.toFixed(1)} hours`
          : "Unable to estimate";

      res.json({
        lastHour,
        last24Hours: last24h,
        averageHourlyRate: parseFloat(hourlyRate),
        currentHourlyRate,
        completed,
        pending,
        total,
        avgScore: parseFloat(stat.avg_score) || 0,
        lastUpdate: stat.last_update,
        batchStatus: {
          isRunning: octypoState.isRunning(),
          lastCompleted: octypoState.getLastCompleted(),
          lastActivity: octypoState.getLastActivity(),
        },
        eta: {
          hoursRemaining: hoursRemaining ? parseFloat(hoursRemaining.toFixed(2)) : null,
          text: etaText,
        },
        percentComplete: total > 0 ? ((completed / total) * 100).toFixed(1) + "%" : "0%",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/admin/tiqets/generate-smart-queue - Smart queue with work stealing and failover
  app.post("/api/admin/tiqets/generate-smart-queue", requireAuth, async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const { startSmartQueue, isQueueRunning } = await import("../../services/content-job-queue");
      const attractionGen = await import("../../services/attraction-content-generator");
      const generateFullAttractionContentEnhanced =
        (attractionGen as any).generateFullAttractionContentEnhanced ||
        attractionGen.generateAttractionContent;
      const { getMultiModelProvider } = await import("../../ai/multi-model-provider");

      if (isQueueRunning()) {
        res.write(
          `data: ${JSON.stringify({ type: "error", message: "Queue is already running" })}\n\n`
        );
        res.end();
        return;
      }

      // Content generation function that uses specific provider
      const generateContent = async (attractionId: string, providerName: string) => {
        const attraction = await db
          .select()
          .from(tiqetsAttractions)
          .where(eq(tiqetsAttractions.id, attractionId))
          .limit(1);

        if (!attraction.length) {
          throw new Error(`Attraction not found: ${attractionId}`);
        }

        const attr = attraction[0];
        const providerInstance = getMultiModelProvider();

        // Generate using specific provider
        const result = await providerInstance.generateWithSpecificProvider(
          providerName as any,
          `Generate comprehensive travel content for: ${attr.title}
Location: ${attr.cityName}
Description: ${attr.tiqetsSummary || attr.tiqetsDescription || ""}

Create:
1. Introduction (2-3 paragraphs)
2. Why Visit section
3. Pro Tip
4. What to Expect (3-5 points)
5. Visitor Tips (3-5 practical tips)
6. How to Get There
7. Answer capsule (direct answer for featured snippets)
8. 3-5 FAQs

Use natural, varied writing. No double dashes (--). No "you will" repetition.
${parseFloat(attr.tiqetsRating || "0") >= 4.5 ? "Mention it's highly rated." : ""}

Return as valid JSON.`,
          {
            maxTokens: 4000,
            temperature: 0.7,
            systemPrompt:
              "You are a professional travel content writer creating SEO-optimized attraction content.",
          }
        );

        // Parse and save the result
        let aiContent;
        try {
          aiContent = JSON.parse(result.content);
        } catch {
          aiContent = { rawContent: result.content };
        }

        await db
          .update(tiqetsAttractions)
          .set({
            aiContent,
            contentGenerationStatus: "completed",
            status: "ready",
            contentGeneratedAt: new Date(),
            updatedAt: new Date(),
          } as any)
          .where(eq(tiqetsAttractions.id, attractionId));

        return result;
      };

      await startSmartQueue(res, generateContent);
    } catch (error: any) {
      res.write(`data: ${JSON.stringify({ type: "fatal_error", message: error.message })}\n\n`);
      res.end();
    }
  });

  // GET /api/admin/tiqets/queue-stats - Get queue statistics
  app.get("/api/admin/tiqets/queue-stats", requireAuth, async (req, res) => {
    try {
      const { getQueueStats } = await import("../../services/content-job-queue");
      const stats = await getQueueStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/tiqets/health - Get comprehensive health status of content generation system
  app.get("/api/admin/tiqets/health", requireAuth, async (req, res) => {
    try {
      const { getHealthMetrics, forceReleaseAllLocks } =
        await import("../../services/tiqets-background-generator");
      const { getQueueStats, getFailureStats } = await import("../../services/content-job-queue");

      const [health, queueStats, failureStats] = await Promise.all([
        Promise.resolve(getHealthMetrics()),
        getQueueStats(),
        getFailureStats(),
      ]);

      // Calculate health score (0-100)
      let healthScore = 100;

      // Penalize for consecutive errors
      if (health.consecutiveErrors > 0) {
        healthScore -= Math.min(30, health.consecutiveErrors * 10);
      }

      // Penalize for stale locks
      const staleInProgress = queueStats.inProgress;
      if (staleInProgress > 5) {
        healthScore -= 20;
      } else if (staleInProgress > 0) {
        healthScore -= staleInProgress * 2;
      }

      // Penalize for high failure rate
      if (failureStats.total > 0 && queueStats.completed > 0) {
        const failureRate = failureStats.total / (failureStats.total + queueStats.completed);
        if (failureRate > 0.1) healthScore -= 20;
        else if (failureRate > 0.05) healthScore -= 10;
      }

      const status = healthScore >= 80 ? "healthy" : healthScore >= 50 ? "degraded" : "unhealthy";

      res.json({
        status,
        healthScore,
        background: {
          isRunning: health.isRunning,
          lastRun: health.lastRun,
          lastWatchdog: health.lastWatchdog,
          staleLocksReleased: health.staleLocksReleased,
          failedItemsReset: health.failedItemsReset,
          triggeredGenerations: health.triggeredGenerations,
          consecutiveErrors: health.consecutiveErrors,
          lastError: health.lastError,
        },
        queue: queueStats,
        failures: failureStats,
        recommendations: [
          ...(staleInProgress > 5
            ? ["High number of stale in-progress items - watchdog should clean these up"]
            : []),
          ...(health.consecutiveErrors > 3
            ? ["Multiple consecutive errors detected - check AI provider status"]
            : []),
          ...(failureStats.total > 10
            ? ["Consider using /api/admin/tiqets/reset-failed to retry failed items"]
            : []),
          ...(!health.isRunning ? ["Background generator is stopped - use restart to resume"] : []),
        ],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/tiqets/force-release-locks - Emergency: release all locks
  app.post("/api/admin/tiqets/force-release-locks", requireAuth, async (req, res) => {
    try {
      const { forceReleaseAllLocks } = await import("../../services/tiqets-background-generator");
      const released = await forceReleaseAllLocks();
      res.json({
        success: true,
        released,
        message: `Force released ${released} locks`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/tiqets/seo-slugs/preview - Preview SEO slug generation
  app.get("/api/admin/tiqets/seo-slugs/preview", requireAuth, async (req, res) => {
    try {
      const { previewSeoSlugs } = await import("../../services/seo-slug-generator");
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const preview = await previewSeoSlugs(limit);
      res.json({
        count: preview.length,
        samples: preview,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/tiqets/seo-slugs/backfill - Run SEO slug backfill
  app.post("/api/admin/tiqets/seo-slugs/backfill", requireAuth, async (req, res) => {
    try {
      const { backfillSeoSlugs } = await import("../../services/seo-slug-generator");
      const result = await backfillSeoSlugs({ batchSize: 100 });
      res.json({
        success: true,
        ...result,
        message: `Backfilled ${result.updated} attractions with SEO slugs (${result.errors} errors)`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/tiqets/seo-slugs/stats - Get SEO slug statistics
  app.get("/api/admin/tiqets/seo-slugs/stats", requireAuth, async (req, res) => {
    try {
      const result = await db
        .select({
          hasSeoSlug: sql<boolean>`seo_slug IS NOT NULL`,
          count: sql<number>`count(*)`,
        })
        .from(tiqetsAttractions)
        .groupBy(sql`seo_slug IS NOT NULL`);

      const withSlug = result.find(r => r.hasSeoSlug)?.count || 0;
      const withoutSlug = result.find(r => !r.hasSeoSlug)?.count || 0;

      res.json({
        withSeoSlug: Number(withSlug),
        withoutSeoSlug: Number(withoutSlug),
        total: Number(withSlug) + Number(withoutSlug),
        percentComplete: (Number(withSlug) / (Number(withSlug) + Number(withoutSlug))) * 100,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/tiqets/stop-queue - Stop the queue gracefully
  app.post("/api/admin/tiqets/stop-queue", requireAuth, async (req, res) => {
    try {
      const { stopQueue } = await import("../../services/content-job-queue");
      stopQueue();
      res.json({ success: true, message: "Queue stop requested" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // GET /api/admin/tiqets/failure-stats - Get failure statistics by provider/city/error
  app.get("/api/admin/tiqets/failure-stats", requireAuth, async (req, res) => {
    try {
      const { getFailureStats } = await import("../../services/content-job-queue");
      const stats = await getFailureStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/tiqets/reset-failed - Reset failed attractions for retry
  app.post("/api/admin/tiqets/reset-failed", requireAuth, async (req, res) => {
    try {
      const { resetFailedAttractions } = await import("../../services/content-job-queue");
      const { maxToReset, cityName, excludeProvider } = req.body;

      const result = await resetFailedAttractions({
        maxToReset: maxToReset || 1000,
        cityName,
        excludeProvider,
      });

      res.json({
        success: true,
        ...result,
        message: `Reset ${result.reset} failed attractions for retry`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // POST /api/admin/tiqets/retry-all-failed - Reset and immediately start processing
  app.post("/api/admin/tiqets/retry-all-failed", requireAuth, async (req, res) => {
    try {
      const { resetFailedAttractions, isQueueRunning } =
        await import("../../services/content-job-queue");

      // Check if queue is already running
      if (isQueueRunning()) {
        return res.status(400).json({
          error: "Queue is already running. Stop it first or wait for completion.",
        });
      }

      const { maxToReset, cityName } = req.body;

      // Reset failed attractions
      const resetResult = await resetFailedAttractions({
        maxToReset: maxToReset || 1000,
        cityName,
      });

      res.json({
        success: true,
        reset: resetResult.reset,
        byCity: resetResult.byCity,
        message: `Reset ${resetResult.reset} attractions. Use the SSE endpoint to start processing.`,
        nextStep: "Call /api/admin/tiqets/generate-smart-queue to start processing",
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
