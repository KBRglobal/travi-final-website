import type { Express } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requirePermission, checkReadOnlyMode } from "../security";
import { SUPPORTED_LOCALES } from "@shared/schema";

const updateTranslationSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed", "needs_review"]).optional(),
  title: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  blocks: z.array(z.any()).optional(),
  translatedBy: z.string().optional(),
  reviewedBy: z.string().optional(),
});

/**
 * Localization API Routes
 *
 * Handles all translation and localization endpoints:
 * - /api/locales - Get supported locales
 * - /api/translations - Translation CRUD operations
 * - /api/translations/coverage - Translation coverage stats
 * - /api/translations/stats - Translation statistics
 * - /api/translations/usage - DeepL usage stats
 * - /api/translations/:contentId - Content-specific translations
 * - /api/translations/:contentId/:locale - Locale-specific translations
 * - /api/translations/:contentId/translate - Auto-translate content
 * - /api/translations/:contentId/translate-all - Batch translate content
 */
export function registerLocalizationApiRoutes(app: Express): void {
  const router = Router();

  // Get supported locales
  router.get("/locales", (req, res) => {
    res.json(SUPPORTED_LOCALES);
  });

  // Get translation coverage for dashboard (simplified stats per language)
  router.get("/translations/coverage", async (req, res) => {
    try {
      const contents = await storage.getContents();
      const publishedContents = contents.filter(c => c.status === "published");
      const allTranslations = await storage.getAllTranslations();

      const supportedLocales = ["en", "ar", "hi", "zh", "ru", "fr", "de", "es", "ja"];

      const coverage: Record<string, { translated: number; total: number }> = {};
      for (const locale of supportedLocales) {
        if (locale === "en") {
          coverage[locale] = {
            translated: publishedContents.length,
            total: publishedContents.length,
          };
        } else {
          const localeTranslations = allTranslations.filter(
            t => t.locale === locale && t.status === "completed"
          );
          coverage[locale] = {
            translated: localeTranslations.length,
            total: publishedContents.length,
          };
        }
      }

      res.json(coverage);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation coverage" });
    }
  });

  // Get translation statistics for admin dashboard
  router.get("/translations/stats", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const contents = await storage.getContents();
      const publishedContents = contents.filter(c => c.status === "published");
      const allTranslations = await storage.getAllTranslations();

      const supportedLocales = [
        "ar",
        "hi",
        "zh",
        "ru",
        "ur",
        "fr",
        "de",
        "fa",
        "bn",
        "fil",
        "es",
        "tr",
        "it",
        "ja",
        "ko",
        "he",
      ];

      const languageStats = supportedLocales.map(locale => {
        const localeTranslations = allTranslations.filter(
          t => t.locale === locale && t.status === "completed"
        );
        const translated = localeTranslations.length;
        const pending = publishedContents.length - translated;
        const percentage =
          publishedContents.length > 0
            ? Math.round((translated / publishedContents.length) * 100)
            : 0;
        return { locale, translated, pending: Math.max(0, pending), percentage };
      });

      const totalTranslated = new Set(
        allTranslations.filter(t => t.status === "completed").map(t => t.contentId)
      ).size;

      res.json({
        totalContent: publishedContents.length,
        translatedContent: totalTranslated,
        pendingContent: publishedContents.length - totalTranslated,
        languageStats,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation stats" });
    }
  });

  // Get DeepL usage stats
  router.get("/translations/usage", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      // translation-service deleted in Phase 4.2 cleanup
      const usage = { character_count: 0, character_limit: 0 };
      const getDeepLSupportedLocales = () => [] as string[];
      const getUnsupportedLocales = () => [] as string[];

      res.json({
        usage,
        supportedLocales: getDeepLSupportedLocales(),
        unsupportedLocales: getUnsupportedLocales(),
        totalLocales: SUPPORTED_LOCALES.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  // Get all translations with content info (admin list view)
  router.get("/translations", requirePermission("canEdit"), async (req, res) => {
    try {
      const contents = await storage.getContents();
      const publishedContents = contents.filter(c => c.status === "published");
      const allTranslations = await storage.getAllTranslations();

      const contentTranslations = publishedContents.map(content => {
        const contentTrans = allTranslations.filter(t => t.contentId === content.id);
        const completedLocales = contentTrans
          .filter(t => t.status === "completed")
          .map(t => t.locale);
        return {
          contentId: content.id,
          title: content.title,
          slug: content.slug,
          type: content.type,
          completedLocales,
          translationCount: completedLocales.length,
        };
      });

      res.json(contentTranslations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  // Get translation by ID (skip reserved paths)
  router.get("/translations/:id", async (req, res, next) => {
    if (["stats", "coverage", "usage"].includes(req.params.id)) {
      return next("route");
    }
    try {
      const translation = await storage.getTranslationById(req.params.id);
      if (!translation) {
        return res.status(404).json({ error: "Translation not found" });
      }
      res.json(translation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation" });
    }
  });

  // Update translation
  router.patch(
    "/translations/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const parsed = updateTranslationSchema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ error: "Validation error", details: parsed.error.errors });
        }
        const translation = await storage.updateTranslation(req.params.id, parsed.data);
        if (!translation) {
          return res.status(404).json({ error: "Translation not found" });
        }
        res.json(translation);
      } catch (error) {
        res.status(500).json({ error: "Failed to update translation" });
      }
    }
  );

  // Delete translation
  router.delete(
    "/translations/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteTranslation(req.params.id);
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete translation" });
      }
    }
  );

  // Get translations for a content item
  router.get("/translations/:contentId", async (req, res) => {
    try {
      const translations = await storage.getTranslationsByContentId(req.params.contentId);
      res.json(translations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  // Get a specific translation by content and locale
  router.get("/translations/:contentId/:locale", async (req, res) => {
    try {
      const { contentId, locale } = req.params;
      const translation = await storage.getTranslation(contentId, locale as any);
      if (!translation) {
        return res.status(404).json({ error: "Translation not found" });
      }
      res.json(translation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation" });
    }
  });

  // Translate content to a specific language using DeepL/Claude
  router.post(
    "/translations/:contentId/translate",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { contentId } = req.params;
        const { targetLocale, sourceLocale = "en" } = req.body;

        if (!targetLocale) {
          return res.status(400).json({ error: "Target locale is required" });
        }

        const content = await storage.getContent(contentId);
        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        // translation-service deleted in Phase 4.2 cleanup
        const translateContent = async (
          ..._args: any[]
        ): Promise<{
          title: string | null;
          metaTitle: string | null;
          metaDescription: string | null;
          blocks: any[];
          sourceHash: string;
        }> => {
          throw new Error("Automatic translation is permanently disabled");
        };

        const translatedContent = await translateContent(
          {
            title: content.title,
            metaTitle: content.metaTitle || undefined,
            metaDescription: content.metaDescription || undefined,
            blocks: content.blocks || [],
          },
          sourceLocale,
          targetLocale
        );

        const existingTranslation = await storage.getTranslation(contentId, targetLocale);

        if (existingTranslation?.isManualOverride) {
          return res.status(409).json({
            error: "Manual override exists. Use force=true to overwrite.",
            existingTranslation,
          });
        }

        const translationData = {
          contentId,
          locale: targetLocale,
          status: "completed" as const,
          title: translatedContent.title || null,
          metaTitle: translatedContent.metaTitle || null,
          metaDescription: translatedContent.metaDescription || null,
          blocks: translatedContent.blocks || [],
          sourceHash: translatedContent.sourceHash,
          translatedBy: "claude",
          translationProvider: "claude",
          isManualOverride: false,
        };

        let translation;
        if (existingTranslation) {
          translation = await storage.updateTranslation(existingTranslation.id, translationData);
        } else {
          translation = await storage.createTranslation(translationData);
        }

        res.json(translation);
      } catch (error) {
        res.status(500).json({ error: "Failed to translate content" });
      }
    }
  );

  // Batch translate content to multiple languages
  router.post(
    "/translations/:contentId/translate-all",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { contentId } = req.params;
        const { targetTiers = [1, 2], sourceLocale = "en" } = req.body;

        const content = await storage.getContent(contentId);
        if (!content) {
          return res.status(404).json({ error: "Content not found" });
        }

        // translation-service deleted in Phase 4.2 cleanup
        const translateToAllLanguages = async (..._args: any[]): Promise<Map<string, any>> => {
          throw new Error("Automatic translation is permanently disabled");
        };

        const translations = await translateToAllLanguages(
          {
            title: content.title,
            metaTitle: content.metaTitle || undefined,
            metaDescription: content.metaDescription || undefined,
            blocks: content.blocks || [],
          },
          sourceLocale as any,
          targetTiers
        );

        const savedTranslations = [];
        for (const [locale, translatedContent] of translations) {
          const existingTranslation = await storage.getTranslation(contentId, locale as any);

          if (existingTranslation?.isManualOverride) {
            continue;
          }

          const translationData = {
            contentId,
            locale,
            status: "completed" as const,
            title: translatedContent.title || null,
            metaTitle: translatedContent.metaTitle || null,
            metaDescription: translatedContent.metaDescription || null,
            blocks: translatedContent.blocks || [],
            sourceHash: translatedContent.sourceHash,
            translatedBy: "claude",
            translationProvider: "claude",
            isManualOverride: false,
          };

          let translation;
          if (existingTranslation) {
            translation = await storage.updateTranslation(existingTranslation.id, translationData);
          } else {
            translation = await storage.createTranslation(translationData);
          }
          savedTranslations.push(translation);
        }

        res.json({
          success: true,
          translatedCount: savedTranslations.length,
          targetLocales: SUPPORTED_LOCALES,
          translations: savedTranslations,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to batch translate content" });
      }
    }
  );

  // Manual translation override
  router.put("/translations/:contentId/:locale", requirePermission("canEdit"), async (req, res) => {
    try {
      const { contentId, locale } = req.params;
      const { title, metaTitle, metaDescription, blocks } = req.body;

      const existingTranslation = await storage.getTranslation(contentId, locale as any);

      const translationData = {
        contentId,
        locale: locale as any,
        status: "completed" as const,
        title: title || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        blocks: blocks || [],
        translatedBy: "manual",
        translationProvider: "manual",
        isManualOverride: true,
      };

      let translation;
      if (existingTranslation) {
        translation = await storage.updateTranslation(existingTranslation.id, translationData);
      } else {
        translation = await storage.createTranslation(translationData);
      }

      res.json(translation);
    } catch (error) {
      res.status(500).json({ error: "Failed to save translation" });
    }
  });

  app.use("/api", router);
}
