/**
 * Growth Dashboard API Routes
 * Provides unified view of auto-pilot activities, content queues, and growth metrics
 */

import type { Express, Request, Response } from "express";
import { requireAuth, requirePermission } from "../../security";
import { db } from "../../db";
import {
  destinations,
  translations,
  contents,
  aiGenerationLogs,
  SUPPORTED_LOCALES,
} from "@shared/schema";
import { eq, desc, and, sql, count, isNotNull, gte } from "drizzle-orm";

import {
  checkContentFreshness,
  refreshStaleContent,
  getTodayRefreshCount,
  freshnessConfig,
  type DestinationFreshness,
} from "../../services/content-freshness";
import { searchIndex } from "@shared/schema";

export function registerGrowthRoutes(app: Express) {
  // ============================================================================
  // SYSTEM HEALTH OVERVIEW
  // ============================================================================

  app.get("/api/admin/growth/overview", requireAuth, async (req: Request, res: Response) => {
    try {
      // Total destinations
      const [totalResult] = await db.select({ count: count() }).from(destinations);
      const totalDestinations = totalResult?.count || 0;

      // Destinations with content (not empty)
      const [withContentResult] = await db
        .select({ count: count() })
        .from(destinations)
        .where(sql`${destinations.status} != 'empty'`);
      const withContent = withContentResult?.count || 0;

      // Destinations with hero images
      const [withImagesResult] = await db
        .select({ count: count() })
        .from(destinations)
        .where(isNotNull(destinations.heroImage));
      const withImages = withImagesResult?.count || 0;

      // Calculate translation coverage (average across all languages)
      const [translationsCount] = await db.select({ count: count() }).from(translations);

      // Get total content items
      const [contentsCount] = await db
        .select({ count: count() })
        .from(contents)
        .where(eq(contents.status, "published"));

      const totalContents = contentsCount?.count || 0;
      const totalTranslations = translationsCount?.count || 0;
      const supportedLanguages = SUPPORTED_LOCALES.length;
      const expectedTranslations = totalContents * (supportedLanguages - 1); // minus English
      const translationCoverage =
        expectedTranslations > 0 ? Math.round((totalTranslations / expectedTranslations) * 100) : 0;

      // Active auto-pilot tasks (scheduled content)
      const [scheduledResult] = await db
        .select({ count: count() })
        .from(contents)
        .where(eq(contents.status, "scheduled"));
      const activeTasks = scheduledResult?.count || 0;

      res.json({
        totalDestinations,
        contentCoverage:
          totalDestinations > 0 ? Math.round((withContent / totalDestinations) * 100) : 0,
        imageCoverage:
          totalDestinations > 0 ? Math.round((withImages / totalDestinations) * 100) : 0,
        translationCoverage,
        activeTasks,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get growth overview" });
    }
  });

  // ============================================================================
  // CONTENT GENERATION PIPELINE
  // ============================================================================

  app.get(
    "/api/admin/growth/content-pipeline",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // Get all destinations ordered by priority
        const allDestinations = await db
          .select({
            id: destinations.id,
            name: destinations.name,
            country: destinations.country,
            isActive: destinations.isActive,
            status: destinations.status,
            seoScore: destinations.seoScore,
            wordCount: destinations.wordCount,
            lastGenerated: destinations.lastGenerated,
          })
          .from(destinations)
          .orderBy(
            desc(destinations.isActive),
            sql`CASE WHEN ${destinations.status} = 'empty' THEN 1 
               WHEN ${destinations.status} = 'partial' THEN 2 
               ELSE 3 END`,
            desc(destinations.createdAt)
          )
          .limit(50);

        // Calculate stats
        const stats = {
          empty: 0,
          partial: 0,
          complete: 0,
        };

        for (const dest of allDestinations) {
          if (dest.status === "empty") stats.empty++;
          else if (dest.status === "partial") stats.partial++;
          else stats.complete++;
        }

        const totalQueue = stats.empty + stats.partial;
        const ratePerDay = 3;
        const estimatedDays = Math.ceil(totalQueue / ratePerDay);

        res.json({
          queue: allDestinations.filter(d => d.status === "empty" || d.status === "partial"),
          completed: allDestinations.filter(d => d.status === "complete"),
          stats,
          totalInQueue: totalQueue,
          completionRate:
            allDestinations.length > 0
              ? Math.round((stats.complete / allDestinations.length) * 100)
              : 0,
          estimatedDaysToComplete: estimatedDays,
          ratePerDay,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get content pipeline" });
      }
    }
  );

  // ============================================================================
  // IMAGE GENERATION PIPELINE
  // ============================================================================

  app.get("/api/admin/growth/image-pipeline", requireAuth, async (req: Request, res: Response) => {
    try {
      // Get destinations needing images
      const allDestinations = await db
        .select({
          id: destinations.id,
          name: destinations.name,
          country: destinations.country,
          heroImage: destinations.heroImage,
          images: destinations.images,
          lastImageGenerated: destinations.lastImageGenerated,
          isActive: destinations.isActive,
        })
        .from(destinations)
        .orderBy(desc(destinations.isActive), desc(destinations.createdAt));

      const needingImages = allDestinations.filter(d => !d.heroImage);
      const withHeroOnly = allDestinations.filter(d => {
        const images = (d.images as any[]) || [];
        return d.heroImage && images.length < 4;
      });

      // Cost estimation
      const fluxCost = 0.03;
      const dalleCost = 0.08;
      const imagesNeeded =
        needingImages.length +
        withHeroOnly.reduce((acc, d) => {
          const images = (d.images as any[]) || [];
          return acc + (4 - images.length);
        }, 0);

      res.json({
        needingHeroImage: needingImages.map(d => ({
          id: d.id,
          name: d.name,
          country: d.country,
          isActive: d.isActive,
          sectionImagesCount: ((d.images as any[]) || []).length,
        })),
        needingSectionImages: withHeroOnly.map(d => ({
          id: d.id,
          name: d.name,
          country: d.country,
          hasHeroImage: true,
          sectionImagesCount: ((d.images as any[]) || []).length,
          imagesNeeded: 4 - ((d.images as any[]) || []).length,
        })),
        stats: {
          totalWithoutHero: needingImages.length,
          totalNeedingSections: withHeroOnly.length,
          totalImagesNeeded: imagesNeeded,
        },
        costEstimate: {
          flux: Math.round(imagesNeeded * fluxCost * 100) / 100,
          dalle: Math.round(imagesNeeded * dalleCost * 100) / 100,
          fluxPerImage: fluxCost,
          dallePerImage: dalleCost,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get image pipeline" });
    }
  });

  // ============================================================================
  // TRANSLATION PIPELINE
  // ============================================================================

  app.get(
    "/api/admin/growth/translation-pipeline",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        // Get published content
        const publishedContent = await db
          .select({
            id: contents.id,
            title: contents.title,
            type: contents.type,
          })
          .from(contents)
          .where(eq(contents.status, "published"))
          .limit(100);

        // Get existing translations
        const existingTranslations = await db
          .select({
            contentId: translations.contentId,
            locale: translations.locale,
          })
          .from(translations);

        // Build language coverage matrix
        const locales = SUPPORTED_LOCALES.filter(l => l.code !== "en"); // Exclude English (source)
        const coverageMatrix: Record<
          string,
          { translated: number; total: number; percentage: number }
        > = {};

        for (const locale of locales) {
          const translated = existingTranslations.filter(t => t.locale === locale.code).length;
          coverageMatrix[locale.code] = {
            translated,
            total: publishedContent.length,
            percentage:
              publishedContent.length > 0
                ? Math.round((translated / publishedContent.length) * 100)
                : 0,
          };
        }

        // Content needing translation
        const contentNeedingTranslation = publishedContent
          .map(content => {
            const contentTranslations = existingTranslations.filter(
              t => t.contentId === content.id
            );
            const translatedLocales = contentTranslations.map(t => t.locale);
            const missingLocales = locales
              .filter(l => !translatedLocales.includes(l.code as any))
              .map(l => ({ code: l.code, name: l.name, nativeName: l.nativeName }));

            return {
              ...content,
              translatedCount: contentTranslations.length,
              totalLocales: locales.length,
              missingLocales,
              coveragePercent: Math.round((contentTranslations.length / locales.length) * 100),
            };
          })
          .filter(c => c.missingLocales.length > 0);

        res.json({
          locales: locales.map(l => ({
            code: l.code,
            name: l.name,
            nativeName: l.nativeName,
            tier: l.tier,
            coverage: coverageMatrix[l.code],
          })),
          contentNeedingTranslation: contentNeedingTranslation.slice(0, 20),
          stats: {
            totalPublished: publishedContent.length,
            totalTranslations: existingTranslations.length,
            totalLanguages: locales.length,
            overallCoverage:
              publishedContent.length > 0
                ? Math.round(
                    (existingTranslations.length / (publishedContent.length * locales.length)) * 100
                  )
                : 0,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to get translation pipeline" });
      }
    }
  );

  // ============================================================================
  // ACTIVITY LOG
  // ============================================================================

  app.get("/api/admin/growth/activity-log", requireAuth, async (req: Request, res: Response) => {
    try {
      const limit = Number.parseInt(req.query.limit as string) || 50;

      // Get recent AI generation logs
      const logs = await db
        .select()
        .from(aiGenerationLogs)
        .orderBy(desc(aiGenerationLogs.createdAt))
        .limit(limit);

      res.json({
        activities: logs.map(log => ({
          id: log.id,
          type: log.targetType,
          targetId: log.targetId,
          provider: log.provider,
          model: log.model,
          success: log.success,
          error: log.error,
          seoScore: log.seoScore,
          qualityTier: log.qualityTier,
          duration: log.duration,
          timestamp: log.createdAt,
        })),
        total: logs.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get activity log" });
    }
  });

  // ============================================================================
  // GROWTH METRICS
  // ============================================================================

  app.get("/api/admin/growth/metrics", requireAuth, async (req: Request, res: Response) => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Content published this week
      const [weeklyContent] = await db
        .select({ count: count() })
        .from(contents)
        .where(and(eq(contents.status, "published"), gte(contents.publishedAt, weekAgo)));

      // Content published this month
      const [monthlyContent] = await db
        .select({ count: count() })
        .from(contents)
        .where(and(eq(contents.status, "published"), gte(contents.publishedAt, monthAgo)));

      // Images generated this week
      const [weeklyImages] = await db
        .select({ count: count() })
        .from(aiGenerationLogs)
        .where(
          and(
            eq(aiGenerationLogs.targetType, "image"),
            eq(aiGenerationLogs.success, true),
            gte(aiGenerationLogs.createdAt, weekAgo)
          )
        );

      // Images generated this month
      const [monthlyImages] = await db
        .select({ count: count() })
        .from(aiGenerationLogs)
        .where(
          and(
            eq(aiGenerationLogs.targetType, "image"),
            eq(aiGenerationLogs.success, true),
            gte(aiGenerationLogs.createdAt, monthAgo)
          )
        );

      // Translations this week
      const [weeklyTranslations] = await db
        .select({ count: count() })
        .from(translations)
        .where(gte(translations.createdAt, weekAgo));

      // Translations this month
      const [monthlyTranslations] = await db
        .select({ count: count() })
        .from(translations)
        .where(gte(translations.createdAt, monthAgo));

      // Calculate projected growth rate (based on weekly average)
      const weeklyRate =
        (weeklyContent?.count || 0) + (weeklyImages?.count || 0) + (weeklyTranslations?.count || 0);
      const projectedMonthly = weeklyRate * 4;

      res.json({
        content: {
          thisWeek: weeklyContent?.count || 0,
          thisMonth: monthlyContent?.count || 0,
        },
        images: {
          thisWeek: weeklyImages?.count || 0,
          thisMonth: monthlyImages?.count || 0,
        },
        translations: {
          thisWeek: weeklyTranslations?.count || 0,
          thisMonth: monthlyTranslations?.count || 0,
        },
        projectedGrowth: {
          weeklyRate,
          projectedMonthly,
        },
        updatedAt: now.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get growth metrics" });
    }
  });

  // ============================================================================
  // MANUAL TRIGGERS
  // ============================================================================

  app.post(
    "/api/admin/growth/trigger-images",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        // This would trigger the auto-image generator
        // For now, return a success response
        res.json({
          success: true,
          message: "Image generation triggered",
          triggeredAt: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to trigger image generation" });
      }
    }
  );

  app.post(
    "/api/admin/growth/trigger-translations",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        // This would trigger batch translation
        // For now, return a success response
        res.json({
          success: true,
          message: "Translation batch triggered",
          triggeredAt: new Date().toISOString(),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to trigger translations" });
      }
    }
  );

  // ============================================================================
  // CONTENT FRESHNESS
  // ============================================================================

  app.get("/api/admin/growth/freshness", requireAuth, async (req: Request, res: Response) => {
    try {
      const freshnessResult = await checkContentFreshness();
      const todayRefreshCount = await getTodayRefreshCount();

      const staleDestinations = freshnessResult.destinations.filter(d => d.isStale);
      const criticalDestinations = staleDestinations.filter(d => d.staleSeverity === "critical");
      const highPriorityDestinations = staleDestinations.filter(d => d.staleSeverity === "high");

      res.json({
        summary: {
          totalDestinations: freshnessResult.totalDestinations,
          staleCount: freshnessResult.staleCount,
          freshCount: freshnessResult.freshCount,
          criticalCount: freshnessResult.criticalCount,
          averageFreshnessScore: freshnessResult.averageFreshnessScore,
          refreshesToday: todayRefreshCount,
          maxRefreshesPerDay: freshnessConfig.maxRefreshesPerDay,
          remainingRefreshes: Math.max(0, freshnessConfig.maxRefreshesPerDay - todayRefreshCount),
        },
        config: {
          autoRefreshStale: freshnessConfig.autoRefreshStale,
          maxRefreshesPerDay: freshnessConfig.maxRefreshesPerDay,
          staleThresholdDays: freshnessConfig.staleThresholdDays,
          lowSeoScoreThreshold: freshnessConfig.lowSeoScoreThreshold,
        },
        staleDestinations: staleDestinations.map(d => ({
          id: d.destinationId,
          name: d.name,
          country: d.country,
          isActive: d.isActive,
          freshnessScore: d.freshnessScore,
          staleSeverity: d.staleSeverity,
          stalenessReasons: d.stalenessReasons,
          daysSinceGeneration: d.daysSinceGeneration,
          seoScore: d.seoScore,
          wordCount: d.wordCount,
          lastGenerated: d.lastGenerated?.toISOString() || null,
          priority: d.priority,
        })),
        criticalAlerts: criticalDestinations.slice(0, 5).map(d => ({
          id: d.destinationId,
          name: d.name,
          score: d.freshnessScore,
          reasons: d.stalenessReasons,
        })),
        allDestinations: freshnessResult.destinations.map(d => ({
          id: d.destinationId,
          name: d.name,
          country: d.country,
          isActive: d.isActive,
          freshnessScore: d.freshnessScore,
          staleSeverity: d.staleSeverity,
          isStale: d.isStale,
          seoScore: d.seoScore,
          lastGenerated: d.lastGenerated?.toISOString() || null,
        })),
        checkedAt: freshnessResult.checkedAt.toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get freshness status" });
    }
  });

  // ============================================================================
  // INTELLIGENCE STATS
  // ============================================================================

  app.get("/api/admin/intelligence-stats", requireAuth, async (req: Request, res: Response) => {
    try {
      // Total published content
      const [totalResult] = await db
        .select({ count: count() })
        .from(contents)
        .where(eq(contents.status, "published"));
      const totalPublished = totalResult?.count || 0;

      // Content with AEO capsule (answerCapsule is not null and not empty)
      const [aeoResult] = await db
        .select({ count: count() })
        .from(contents)
        .where(
          and(
            eq(contents.status, "published"),
            isNotNull(contents.answerCapsule),
            sql`${contents.answerCapsule} != ''`
          )
        );
      const withAEO = aeoResult?.count || 0;

      // Content in search index (check by counting entries in searchIndex table)
      const [indexedResult] = await db.select({ count: count() }).from(searchIndex);
      const indexed = indexedResult?.count || 0;

      // Entity-linked content (has parentId linking to destination)
      const [entityResult] = await db
        .select({ count: count() })
        .from(contents)
        .where(and(eq(contents.status, "published"), isNotNull(contents.parentId)));
      const entityLinked = entityResult?.count || 0;

      res.json({
        totalPublished: Number(totalPublished),
        indexed: Number(indexed),
        indexedPercent: totalPublished > 0 ? Math.round((indexed / totalPublished) * 100) : 0,
        withAEO: Number(withAEO),
        aeoPercent: totalPublished > 0 ? Math.round((withAEO / totalPublished) * 100) : 0,
        entityLinked: Number(entityLinked),
        entityLinkedPercent:
          totalPublished > 0 ? Math.round((entityLinked / totalPublished) * 100) : 0,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get intelligence stats" });
    }
  });

  app.post(
    "/api/admin/growth/refresh/:destinationId",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { destinationId } = req.params;

        if (!destinationId) {
          return res.status(400).json({ error: "destinationId is required" });
        }

        const todayRefreshCount = await getTodayRefreshCount();
        const skipLimit = req.body.skipLimit === true;

        if (!skipLimit && todayRefreshCount >= freshnessConfig.maxRefreshesPerDay) {
          return res.status(429).json({
            error: "Daily refresh limit reached",
            todayRefreshCount,
            maxRefreshesPerDay: freshnessConfig.maxRefreshesPerDay,
            message: `Maximum ${freshnessConfig.maxRefreshesPerDay} refreshes per day to control costs. Set skipLimit: true to override.`,
          });
        }

        const result = await refreshStaleContent(destinationId);

        if (result.success) {
          res.json({
            success: true,
            message: `Content refreshed for ${result.name}`,
            destinationId: result.destinationId,
            name: result.name,
            previousScore: result.previousScore,
            newScore: result.newScore,
            duration: result.duration,
            triggeredAt: new Date().toISOString(),
          });
        } else {
          res.status(500).json({
            success: false,
            error: result.error || "Refresh failed",
            destinationId: result.destinationId,
            name: result.name,
            duration: result.duration,
          });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to refresh content" });
      }
    }
  );
}
