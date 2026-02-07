/**
 * Translation Routes
 * DeepL Multi-Language SEO System
 */

import type { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../security";
import { SUPPORTED_LOCALES } from "@shared/schema";

export function registerTranslationRoutes(app: Express): void {
  // ============================================================================
  // TRANSLATIONS - DeepL Multi-Language SEO System
  // ============================================================================

  // Get translation coverage for dashboard (simplified stats per language)
  app.get("/api/translations/coverage", async (req, res) => {
    try {
      const contents = await storage.getContents();
      const publishedContents = contents.filter(c => c.status === "published");
      const allTranslations = await storage.getAllTranslations();

      const supportedLocales = ["en", "ar", "hi", "zh", "ru", "fr", "de", "es", "ja"];

      const coverage: Record<string, { translated: number; total: number }> = {};
      for (const locale of supportedLocales) {
        if (locale === "en") {
          // English is the source language
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
  app.get("/api/translations/stats", requirePermission("canViewAnalytics"), async (req, res) => {
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
        const total = publishedContents.length;

        return {
          locale,
          translated,
          total,
          percentage: total > 0 ? Math.round((translated / total) * 100) : 0,
        };
      });

      res.json({
        totalContent: publishedContents.length,
        languageStats,
        totalTranslations: allTranslations.filter(t => t.status === "completed").length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translation stats" });
    }
  });

  // List all content with their translation status
  app.get("/api/translations", requireAuth, async (req, res) => {
    try {
      const contents = await storage.getContents();
      const allTranslations = await storage.getAllTranslations();

      const contentTranslations = contents.map(content => {
        const translations = allTranslations.filter(t => t.contentId === content.id);
        const completedLocales = translations
          .filter(t => t.status === "completed")
          .map(t => t.locale);

        return {
          id: content.id,
          title: content.title,
          slug: content.slug,
          status: content.status,
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

  // Get translations for a content item
  app.get("/api/translations/:contentId", async (req, res) => {
    try {
      const translations = await storage.getTranslationsByContentId(req.params.contentId);
      res.json(translations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  // Get a specific translation
  app.get("/api/translations/:contentId/:locale", async (req, res) => {
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

  // Translate content to a specific language using DeepL
  app.post(
    "/api/translations/:contentId/translate",
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
        const generateContentHash = () => "disabled";

        // Note: translation-service uses (content, sourceLocale, targetLocale) order
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
  app.post(
    "/api/translations/:contentId/translate-all",
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
        const generateContentHash = () => "disabled";

        // translateToAllLanguages handles tier filtering internally
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
  app.put(
    "/api/translations/:contentId/:locale",
    requirePermission("canEdit"),
    async (req, res) => {
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
    }
  );

  // Get DeepL usage stats
  app.get("/api/translations/usage", requirePermission("canViewAnalytics"), async (req, res) => {
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

  // Get public translated content
  app.get("/api/public/content/:slug/:locale", async (req, res) => {
    try {
      const { slug, locale } = req.params;

      const content = await storage.getContentBySlug(slug);
      if (!content || content.status !== "published") {
        return res.status(404).json({ error: "Content not found" });
      }

      if (locale === "en") {
        return res.json(content);
      }

      const translation = await storage.getTranslation(content.id, locale as any);
      if (!translation || translation.status !== "completed") {
        return res.json(content);
      }

      res.json({
        ...content,
        title: translation.title || content.title,
        metaTitle: translation.metaTitle || content.metaTitle,
        metaDescription: translation.metaDescription || content.metaDescription,
        blocks: translation.blocks || content.blocks,
        locale,
        isTranslated: true,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Get all translations status for admin dashboard
  app.get(
    "/api/admin/translation-status",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const contents = await storage.getContents({ status: "published" });

        const status = await Promise.all(
          contents.map(async content => {
            const translations = await storage.getTranslationsByContentId(content.id);
            const translatedLocales: string[] = translations
              .filter(t => t.status === "completed")
              .map(t => t.locale) as string[];

            return {
              contentId: content.id,
              title: content.title,
              type: content.type,
              translatedLocales,
              totalTranslations: translatedLocales.length,
              missingLocales: SUPPORTED_LOCALES.filter(
                l => l.code !== "en" && !translatedLocales.includes(l.code)
              ).map(l => l.code),
            };
          })
        );

        res.json({
          totalContent: contents.length,
          items: status,
          localeStats: SUPPORTED_LOCALES.map(locale => ({
            code: locale.code,
            name: locale.name,
            tier: locale.tier,
            translatedCount: status.filter(s => s.translatedLocales.includes(locale.code)).length,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch translation status" });
      }
    }
  );
}
