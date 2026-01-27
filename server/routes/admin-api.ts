import type { Express, Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import { eq, and, inArray } from "drizzle-orm";
import {
  homepageSections,
  homepageCards,
  experienceCategories,
  regionLinks,
  heroSlides,
  homepageCta,
  homepageSeoMeta,
  destinations,
  pageSeo,
  destinationsIndexConfig,
  SUPPORTED_LOCALES,
  DestinationsIndexHeroSlide,
} from "@shared/schema";
import { requirePermission, checkReadOnlyMode } from "../security";
import {
  getTranslations,
  getBulkTranslations,
  setTranslations,
  deleteEntityTranslations,
} from "../cms-translations";
import { DESTINATIONS_INDEX_SEO, validateCharacterLimits } from "@shared/field-ownership";
import multer from "multer";
import sharp from "sharp";

const upload = multer({ storage: multer.memoryStorage() });

export function registerAdminApiRoutes(app: Express): void {
  const router = Router();

  // ============================================================================
  // LOGS ROUTES
  // ============================================================================

  router.get(
    "/logs",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { consoleLogger } = await import("../console-logger");
        const { category, level, search, limit = "200" } = req.query;

        let logs = consoleLogger.getLogs(parseInt(limit as string, 10) || 200);

        if (category && category !== "all") {
          logs = logs.filter(log => log.category === category);
        }
        if (level && level !== "all") {
          logs = logs.filter(log => log.level === level);
        }
        if (search && typeof search === "string") {
          const searchLower = search.toLowerCase();
          logs = logs.filter(
            log =>
              log.humanMessage.toLowerCase().includes(searchLower) ||
              log.rawMessage.toLowerCase().includes(searchLower)
          );
        }

        const transformedLogs = logs.map(log => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          category: log.category,
          message: log.humanMessage,
          rawMessage: log.rawMessage,
        }));

        res.json({
          logs: transformedLogs.reverse(),
          total: transformedLogs.length,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch logs" });
      }
    }
  );

  router.get(
    "/logs/stream",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      const { consoleLogger } = await import("../console-logger");
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const onLog = (log: any) => {
        const data = JSON.stringify({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level,
          category: log.category,
          message: log.humanMessage,
          rawMessage: log.rawMessage,
        });
        res.write(`data: ${data}\n\n`);
      };

      consoleLogger.on("log", onLog);

      req.on("close", () => {
        consoleLogger.off("log", onLog);
      });
    }
  );

  router.get(
    "/logs/stats",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        const { consoleLogger } = await import("../console-logger");
        const logs = consoleLogger.getLogs();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const stats = {
          total: logs.length,
          byLevel: {
            error: logs.filter(l => l.level === "error").length,
            warning: logs.filter(l => l.level === "warn").length,
            info: logs.filter(l => l.level === "info").length,
            debug: logs.filter(l => l.level === "debug").length,
          },
          byCategory: {
            system: logs.filter(l => l.category === "system").length,
            ai: logs.filter(l => l.category === "ai").length,
            images: logs.filter(l => l.category === "images").length,
            storage: logs.filter(l => l.category === "storage").length,
            rss: logs.filter(l => l.category === "rss").length,
            content: logs.filter(l => l.category === "content").length,
            auth: logs.filter(l => l.category === "auth").length,
            http: logs.filter(l => l.category === "http").length,
            autopilot: logs.filter(l => l.category === "autopilot").length,
            dev: logs.filter(l => l.category === "dev").length,
          },
          recentErrors: logs.filter(l => l.level === "error" && l.timestamp >= oneHourAgo).length,
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch log stats" });
      }
    }
  );

  router.delete(
    "/logs",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        const { consoleLogger } = await import("../console-logger");
        consoleLogger.clear();
        consoleLogger.addManualLog("info", "system", "Logs cleared by admin");
        res.json({ success: true, message: "Logs cleared" });
      } catch (error) {
        res.status(500).json({ error: "Failed to clear logs" });
      }
    }
  );

  router.get(
    "/logs/export",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { consoleLogger } = await import("../console-logger");
        const { category, level } = req.query;

        let logs = consoleLogger.getLogs();
        if (category && category !== "all") {
          logs = logs.filter(log => log.category === category);
        }
        if (level && level !== "all") {
          logs = logs.filter(log => log.level === level);
        }

        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="logs-${new Date().toISOString().split("T")[0]}.json"`
        );
        res.json(logs);
      } catch (error) {
        res.status(500).json({ error: "Failed to export logs" });
      }
    }
  );

  // ============================================================================
  // HOMEPAGE SECTIONS ROUTES
  // ============================================================================

  router.get("/homepage/sections", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const sections = await db.select().from(homepageSections).orderBy(homepageSections.sortOrder);

      const translationsMap = await getBulkTranslations(
        "homepage_section",
        sections.map(s => s.id),
        locale
      );
      const translatedSections = sections.map(section => {
        const trans = translationsMap.get(String(section.id)) || {};
        return {
          ...section,
          title: trans.title ?? section.title,
          subtitle: trans.subtitle ?? section.subtitle,
        };
      });

      res.json(translatedSections);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  router.patch(
    "/homepage/sections/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const { title, subtitle, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageSections)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageSections.id, id));
        }

        await setTranslations("homepage_section", id, locale, { title, subtitle });

        const [section] = await db
          .select()
          .from(homepageSections)
          .where(eq(homepageSections.id, id));
        const trans = await getTranslations("homepage_section", id, locale);

        res.json({
          ...section,
          title: trans.title ?? section?.title,
          subtitle: trans.subtitle ?? section?.subtitle,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update homepage section" });
      }
    }
  );

  // ============================================================================
  // AVAILABLE IMAGES ROUTES
  // ============================================================================

  router.get("/homepage/available-images", requirePermission("canEdit"), async (req, res) => {
    try {
      const fs = await import("fs").then(m => m.promises);
      const pathModule = await import("path");

      const folder = (req.query.folder as string) || "hero";
      const allowedFolders = ["hero", "cards", "experiences", "regions"];

      if (!allowedFolders.includes(folder)) {
        return res.status(400).json({ error: "Invalid folder" });
      }

      const targetDir = pathModule.join(process.cwd(), "client", "public", folder);

      try {
        const files = await fs.readdir(targetDir);
        const imageFiles = files
          .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
          .map(f => ({
            filename: f,
            url: `/${folder}/${f}`,
            name: f.replace(/\.[^.]+$/, "").replace(/-/g, " "),
          }));
        res.json(imageFiles);
      } catch {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to list images" });
    }
  });

  router.get("/homepage/available-hero-images", requirePermission("canEdit"), async (req, res) => {
    try {
      const fs = await import("fs").then(m => m.promises);
      const path = await import("path");
      const heroDir = path.join(process.cwd(), "client", "public", "hero");

      try {
        const files = await fs.readdir(heroDir);
        const imageFiles = files
          .filter(f => /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f))
          .map(f => ({
            filename: f,
            url: `/hero/${f}`,
            name: f.replace(/\.[^.]+$/, "").replace(/-/g, " "),
          }));
        res.json(imageFiles);
      } catch {
        res.json([]);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to list hero images" });
    }
  });

  router.post(
    "/homepage/upload-image",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        const fs = await import("fs").then(m => m.promises);
        const pathModule = await import("path");

        let customFilename = req.body.customFilename?.trim();
        const targetFolder = req.body.folder || "hero";

        const allowedFolders = ["hero", "cards", "experiences", "regions"];
        if (!allowedFolders.includes(targetFolder)) {
          return res.status(400).json({ error: "Invalid target folder" });
        }

        if (customFilename) {
          customFilename = customFilename
            .toLowerCase()
            .replace(/[^a-z0-9\-_]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        } else {
          customFilename = req.file.originalname
            .replace(/\.[^.]+$/, "")
            .toLowerCase()
            .replace(/[^a-z0-9\-_]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        }

        if (!customFilename) {
          customFilename = `image-${Date.now()}`;
        }

        const finalFilename = `${customFilename}.webp`;
        const targetDir = pathModule.join(process.cwd(), "client", "public", targetFolder);
        const targetPath = pathModule.join(targetDir, finalFilename);

        await fs.mkdir(targetDir, { recursive: true });

        try {
          await fs.access(targetPath);
          return res
            .status(400)
            .json({ error: `File "${finalFilename}" already exists. Choose a different name.` });
        } catch {
          // File doesn't exist, good to proceed
        }

        const webpBuffer = await sharp(req.file.buffer).webp({ quality: 85 }).toBuffer();

        const metadata = await sharp(webpBuffer).metadata();

        await fs.writeFile(targetPath, webpBuffer);

        const url = `/${targetFolder}/${finalFilename}`;

        res.json({
          success: true,
          filename: finalFilename,
          url,
          width: metadata.width,
          height: metadata.height,
          size: webpBuffer.length,
          folder: targetFolder,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to upload image" });
      }
    }
  );

  // ============================================================================
  // HERO SLIDES ROUTES
  // ============================================================================

  router.get("/homepage/hero-slides", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const slides = await db.select().from(heroSlides).orderBy(heroSlides.sortOrder);

      const translationsMap = await getBulkTranslations(
        "hero_slide",
        slides.map(s => s.id),
        locale
      );
      const translatedSlides = slides.map(slide => {
        const trans = translationsMap.get(String(slide.id)) || {};
        return {
          ...slide,
          headline: trans.headline ?? slide.headline,
          subheadline: trans.subheadline ?? slide.subheadline,
          ctaText: trans.ctaText ?? slide.ctaText,
        };
      });

      res.json(translatedSlides);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hero slides" });
    }
  });

  router.post(
    "/homepage/hero-slides",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { headline, subheadline, ctaText, ...structuralData } = req.body;

        const [slide] = await db.insert(heroSlides).values(structuralData).returning();

        await setTranslations("hero_slide", slide.id, locale, { headline, subheadline, ctaText });

        res.json({ ...slide, headline, subheadline, ctaText });
      } catch (error) {
        res.status(500).json({ error: "Failed to create hero slide" });
      }
    }
  );

  router.patch(
    "/homepage/hero-slides/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const { headline, subheadline, ctaText, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(heroSlides)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(heroSlides.id, id));
        }

        await setTranslations("hero_slide", id, locale, { headline, subheadline, ctaText });

        const [slide] = await db.select().from(heroSlides).where(eq(heroSlides.id, id));
        const trans = await getTranslations("hero_slide", id, locale);

        res.json({
          ...slide,
          headline: trans.headline ?? slide?.headline,
          subheadline: trans.subheadline ?? slide?.subheadline,
          ctaText: trans.ctaText ?? slide?.ctaText,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update hero slide" });
      }
    }
  );

  router.delete(
    "/homepage/hero-slides/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        await deleteEntityTranslations("hero_slide", id);
        await db.delete(heroSlides).where(eq(heroSlides.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete hero slide" });
      }
    }
  );

  // ============================================================================
  // HOMEPAGE CARDS ROUTES
  // ============================================================================

  router.get("/homepage/cards", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const cards = await db.select().from(homepageCards).orderBy(homepageCards.sortOrder);

      const translationsMap = await getBulkTranslations(
        "homepage_card",
        cards.map(c => c.id),
        locale
      );
      const translatedCards = cards.map(card => {
        const trans = translationsMap.get(String(card.id)) || {};
        return {
          ...card,
          title: trans.title ?? card.title,
          subtitle: trans.subtitle ?? card.subtitle,
        };
      });

      res.json(translatedCards);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage cards" });
    }
  });

  router.post(
    "/homepage/cards",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { title, subtitle, ...structuralData } = req.body;

        const [card] = await db.insert(homepageCards).values(structuralData).returning();
        await setTranslations("homepage_card", card.id, locale, { title, subtitle });

        res.json({ ...card, title, subtitle });
      } catch (error) {
        res.status(500).json({ error: "Failed to create homepage card" });
      }
    }
  );

  router.patch(
    "/homepage/cards/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const locale = (req.query.locale as string) || "en";
        const { title, subtitle, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageCards)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageCards.id, id));
        }

        await setTranslations("homepage_card", id, locale, { title, subtitle });

        const [card] = await db.select().from(homepageCards).where(eq(homepageCards.id, id));
        const trans = await getTranslations("homepage_card", id, locale);

        res.json({
          ...card,
          title: trans.title ?? card?.title,
          subtitle: trans.subtitle ?? card?.subtitle,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update homepage card" });
      }
    }
  );

  router.delete(
    "/homepage/cards/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteEntityTranslations("homepage_card", id);
        await db.delete(homepageCards).where(eq(homepageCards.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete homepage card" });
      }
    }
  );

  // ============================================================================
  // EXPERIENCE CATEGORIES ROUTES
  // ============================================================================

  router.get("/homepage/experience-categories", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const categories = await db
        .select()
        .from(experienceCategories)
        .orderBy(experienceCategories.sortOrder);

      const translationsMap = await getBulkTranslations(
        "experience_category",
        categories.map(c => c.id),
        locale
      );
      const translatedCategories = categories.map(cat => {
        const trans = translationsMap.get(String(cat.id)) || {};
        return {
          ...cat,
          name: trans.name ?? cat.name,
          description: trans.description ?? cat.description,
        };
      });

      res.json(translatedCategories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch experience categories" });
    }
  });

  router.post(
    "/homepage/experience-categories",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { name, description, ...structuralData } = req.body;

        const [category] = await db.insert(experienceCategories).values(structuralData).returning();
        await setTranslations("experience_category", category.id, locale, { name, description });

        res.json({ ...category, name, description });
      } catch (error) {
        res.status(500).json({ error: "Failed to create experience category" });
      }
    }
  );

  router.patch(
    "/homepage/experience-categories/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const locale = (req.query.locale as string) || "en";
        const { name, description, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(experienceCategories)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(experienceCategories.id, id));
        }

        await setTranslations("experience_category", id, locale, { name, description });

        const [cat] = await db
          .select()
          .from(experienceCategories)
          .where(eq(experienceCategories.id, id));
        const trans = await getTranslations("experience_category", id, locale);

        res.json({
          ...cat,
          name: trans.name ?? cat?.name,
          description: trans.description ?? cat?.description,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update experience category" });
      }
    }
  );

  router.delete(
    "/homepage/experience-categories/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteEntityTranslations("experience_category", id);
        await db.delete(experienceCategories).where(eq(experienceCategories.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete experience category" });
      }
    }
  );

  // ============================================================================
  // DESTINATIONS ADMIN ROUTES
  // ============================================================================

  router.get("/homepage/destinations", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const allDestinations = await db.select().from(destinations).orderBy(destinations.name);

      const translationsMap = await getBulkTranslations(
        "destination" as any,
        allDestinations.map(d => d.id),
        locale
      );
      const translatedDestinations = allDestinations.map(dest => {
        const trans = translationsMap.get(String(dest.id)) || {};
        return {
          ...dest,
          name: trans.name ?? dest.name,
          summary: trans.summary ?? dest.summary,
        };
      });

      res.json(translatedDestinations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  router.post(
    "/homepage/destinations",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { id, name, summary, country, slug, cardImage, cardImageAlt, isActive } = req.body;

        const existing = await db.select().from(destinations).where(eq(destinations.id, id));
        if (existing.length > 0) {
          return res.status(400).json({ error: "Destination with this ID already exists" });
        }

        const normalizedName = name
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");

        const [destination] = await db
          .insert(destinations)
          .values({
            id,
            name,
            normalizedName,
            country: country || "",
            slug: slug || `/destinations/${id}`,
            cardImage,
            cardImageAlt,
            isActive: isActive ?? true,
            summary,
          } as any)
          .returning();

        await setTranslations("destination" as any, id, locale, { name, summary });

        res.json({ ...destination, name, summary });
      } catch (error) {
        res.status(500).json({ error: "Failed to create destination" });
      }
    }
  );

  router.patch(
    "/homepage/destinations/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = req.params.id;
        const locale = (req.query.locale as string) || "en";
        const { name, summary, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(destinations)
            .set({
              ...structuralUpdates,
              updatedAt: new Date(),
            })
            .where(eq(destinations.id, id));
        }

        await setTranslations("destination" as any, id, locale, { name, summary });

        const [dest] = await db.select().from(destinations).where(eq(destinations.id, id));
        const trans = await getTranslations("destination" as any, id, locale);

        res.json({
          ...dest,
          name: trans.name ?? dest?.name,
          summary: trans.summary ?? dest?.summary,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update destination" });
      }
    }
  );

  router.delete(
    "/homepage/destinations/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = req.params.id;
        await deleteEntityTranslations("destination" as any, id);
        await db.delete(destinations).where(eq(destinations.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete destination" });
      }
    }
  );

  router.post(
    "/homepage/destinations/analyze-image",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
          return res.status(400).json({ error: "imageUrl is required" });
        }

        const { visualSearch } = await import("../ai/visual-search");
        const analysis = await visualSearch.analyzeImage(imageUrl);

        if (!analysis) {
          return res.status(500).json({ error: "Failed to analyze image" });
        }

        const suggestedAlt = analysis.description.slice(0, 125);
        const suggestedKeywords = analysis.keywords.slice(0, 5);

        res.json({
          success: true,
          analysis: {
            description: analysis.description,
            keywords: analysis.keywords,
            landmarks: analysis.landmarks,
            colors: analysis.colors,
            mood: analysis.mood,
            contentType: analysis.contentType,
            confidence: analysis.confidence,
          },
          suggestions: {
            altText: suggestedAlt,
            keywords: suggestedKeywords,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to analyze image";
        res.status(500).json({ error: message });
      }
    }
  );

  // ============================================================================
  // AUTO META GENERATOR
  // ============================================================================

  router.post("/auto-meta", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    const { imageUrl, filename } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "imageUrl is required",
        },
      });
    }

    try {
      const { visualSearch } = await import("../ai/visual-search");
      const result = await (visualSearch as any).generateAutoMeta(imageUrl, filename);

      if (result.success) {
        return res.json({
          success: true,
          meta: result.meta,
        });
      } else {
        return res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      return res.status(500).json({
        success: false,
        error: {
          code: "UNKNOWN",
          message: "Unexpected server error",
          details: message,
        },
      });
    }
  });

  // ============================================================================
  // REGION LINKS ROUTES
  // ============================================================================

  router.get("/homepage/region-links", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const links = await db.select().from(regionLinks).orderBy(regionLinks.sortOrder);

      const translationsMap = await getBulkTranslations(
        "region_link",
        links.map(l => l.id),
        locale
      );
      const translatedLinks = links.map(link => {
        const trans = translationsMap.get(String(link.id)) || {};
        return {
          ...link,
          name: trans.name ?? link.name,
        };
      });

      res.json(translatedLinks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch region links" });
    }
  });

  router.post(
    "/homepage/region-links",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { name, ...structuralData } = req.body;

        const [link] = await db.insert(regionLinks).values(structuralData).returning();
        await setTranslations("region_link", link.id, locale, { name });

        res.json({ ...link, name });
      } catch (error) {
        res.status(500).json({ error: "Failed to create region link" });
      }
    }
  );

  router.patch(
    "/homepage/region-links/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        const locale = (req.query.locale as string) || "en";
        const { name, ...structuralUpdates } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(regionLinks)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(regionLinks.id, id));
        }

        await setTranslations("region_link", id, locale, { name });

        const [link] = await db.select().from(regionLinks).where(eq(regionLinks.id, id));
        const trans = await getTranslations("region_link", id, locale);

        res.json({
          ...link,
          name: trans.name ?? link?.name,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update region link" });
      }
    }
  );

  router.delete(
    "/homepage/region-links/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        await deleteEntityTranslations("region_link", id);
        await db.delete(regionLinks).where(eq(regionLinks.id, id));
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete region link" });
      }
    }
  );

  // ============================================================================
  // HOMEPAGE CTA ROUTES
  // ============================================================================

  router.get("/homepage/cta", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const [cta] = await db.select().from(homepageCta).limit(1);
      if (!cta) return res.json(null);

      const trans = await getTranslations("homepage_cta", cta.id, locale);
      res.json({
        ...cta,
        headline: trans.headline ?? cta.headline,
        subheadline: trans.subheadline ?? cta.subheadline,
        inputPlaceholder: trans.inputPlaceholder ?? cta.inputPlaceholder,
        buttonText: trans.buttonText ?? cta.buttonText,
        helperText: trans.helperText ?? cta.helperText,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage CTA" });
    }
  });

  router.patch(
    "/homepage/cta/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const {
          headline,
          subheadline,
          inputPlaceholder,
          buttonText,
          helperText,
          ...structuralUpdates
        } = req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageCta)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageCta.id, id));
        }

        await setTranslations("homepage_cta", id, locale, {
          headline,
          subheadline,
          inputPlaceholder,
          buttonText,
          helperText,
        });

        const [cta] = await db.select().from(homepageCta).where(eq(homepageCta.id, id));
        const trans = await getTranslations("homepage_cta", id, locale);

        res.json({
          ...cta,
          headline: trans.headline ?? cta?.headline,
          subheadline: trans.subheadline ?? cta?.subheadline,
          inputPlaceholder: trans.inputPlaceholder ?? cta?.inputPlaceholder,
          buttonText: trans.buttonText ?? cta?.buttonText,
          helperText: trans.helperText ?? cta?.helperText,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update homepage CTA" });
      }
    }
  );

  // ============================================================================
  // HOMEPAGE SEO META ROUTES
  // ============================================================================

  router.get("/homepage/seo-meta", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const [meta] = await db.select().from(homepageSeoMeta).limit(1);
      if (!meta) return res.json(null);

      const trans = await getTranslations("homepage_seo_meta", meta.id, locale);
      res.json({
        ...meta,
        metaTitle: trans.metaTitle ?? meta.metaTitle,
        metaDescription: trans.metaDescription ?? meta.metaDescription,
        ogTitle: trans.ogTitle ?? meta.ogTitle,
        ogDescription: trans.ogDescription ?? meta.ogDescription,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch homepage SEO meta" });
    }
  });

  router.patch(
    "/homepage/seo-meta/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const { metaTitle, metaDescription, ogTitle, ogDescription, ...structuralUpdates } =
          req.body;

        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageSeoMeta)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageSeoMeta.id, id));
        }

        await setTranslations("homepage_seo_meta", id, locale, {
          metaTitle,
          metaDescription,
          ogTitle,
          ogDescription,
        });

        const [meta] = await db.select().from(homepageSeoMeta).where(eq(homepageSeoMeta.id, id));
        const trans = await getTranslations("homepage_seo_meta", id, locale);

        res.json({
          ...meta,
          metaTitle: trans.metaTitle ?? meta?.metaTitle,
          metaDescription: trans.metaDescription ?? meta?.metaDescription,
          ogTitle: trans.ogTitle ?? meta?.ogTitle,
          ogDescription: trans.ogDescription ?? meta?.ogDescription,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update homepage SEO meta" });
      }
    }
  );

  // ============================================================================
  // HOMEPAGE TRANSLATION GENERATION
  // ============================================================================

  router.post(
    "/homepage/generate-translations",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { translateText } = await import("../services/translation-service");
        const { cmsTranslations } = await import("@shared/schema");

        const overwrite = req.body?.overwrite === true;

        const HOMEPAGE_ENTITY_TYPES = [
          "homepage_section",
          "homepage_card",
          "experience_category",
          "region_link",
          "hero_slide",
          "homepage_cta",
          "homepage_seo_meta",
        ] as const;

        const englishTranslations = await db
          .select()
          .from(cmsTranslations)
          .where(
            and(
              eq(cmsTranslations.locale, "en"),
              inArray(cmsTranslations.entityType, [...HOMEPAGE_ENTITY_TYPES])
            )
          );

        if (englishTranslations.length === 0) {
          return res.json({
            success: true,
            translated: 0,
            skipped: 0,
            locales: [],
            message: "No English homepage content to translate",
          });
        }

        const existingTranslations = await db
          .select()
          .from(cmsTranslations)
          .where(inArray(cmsTranslations.entityType, [...HOMEPAGE_ENTITY_TYPES]));

        const existingKeys = new Set(
          existingTranslations
            .filter(t => t.locale !== "en" && t.value && t.value.trim() !== "")
            .map(t => `${t.entityType}:${t.entityId}:${t.locale}:${t.field}`)
        );

        const targetLocales = SUPPORTED_LOCALES.filter(l => l.code !== "en").map(l => l.code);

        let translatedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        for (const targetLocale of targetLocales) {
          for (const engTrans of englishTranslations) {
            if (!engTrans.value || engTrans.value.trim() === "") continue;

            const key = `${engTrans.entityType}:${engTrans.entityId}:${targetLocale}:${engTrans.field}`;

            if (!overwrite && existingKeys.has(key)) {
              skippedCount++;
              continue;
            }

            try {
              const result = await translateText(
                {
                  text: engTrans.value,
                  sourceLocale: "en" as any,
                  targetLocale: targetLocale as any,
                  contentType: "body",
                },
                { provider: "claude" }
              );

              await setTranslations(engTrans.entityType as any, engTrans.entityId, targetLocale, {
                [engTrans.field]: result.translatedText,
              });

              translatedCount++;
            } catch (error) {
              const errMsg = `Failed to translate ${engTrans.entityType}:${engTrans.entityId}:${engTrans.field} to ${targetLocale}`;

              errors.push(errMsg);
            }
          }
        }

        res.json({
          success: true,
          translated: translatedCount,
          skipped: skippedCount,
          locales: targetLocales,
          errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
          message:
            skippedCount > 0
              ? `${skippedCount} existing translations preserved (use overwrite=true to replace)`
              : undefined,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to generate translations" });
      }
    }
  );

  // ============================================================================
  // DASHBOARD STATS ROUTES
  // ============================================================================

  router.get(
    "/analytics/stats",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        const { contents, articles, destinations, users, aiGenerationLogs, tiqetsAttractions } =
          await import("@shared/schema");
        const { count, sql, eq } = await import("drizzle-orm");

        // Get content counts
        const [contentStats] = await db
          .select({
            total: count(),
          })
          .from(contents);

        const [articleStats] = await db
          .select({
            total: count(),
          })
          .from(articles);

        const [destinationStats] = await db
          .select({
            total: count(),
          })
          .from(destinations);

        // Get status counts
        const [publishedCount] = await db
          .select({
            count: count(),
          })
          .from(contents)
          .where(sql`${contents.status} = 'published'`);

        const [draftCount] = await db
          .select({
            count: count(),
          })
          .from(contents)
          .where(sql`${contents.status} = 'draft'`);

        // Get image counts (from tiqetsAttractions with images)
        let imageCount = 0;
        try {
          const [imgStats] = await db
            .select({
              total: count(),
            })
            .from(tiqetsAttractions)
            .where(sql`${tiqetsAttractions.tiqetsImages} IS NOT NULL`);
          imageCount = imgStats?.total || 0;
        } catch {
          imageCount = 0;
        }

        // Get REAL user count from database
        let userTotal = 0;
        try {
          const [userStats] = await db
            .select({
              total: count(),
            })
            .from(users);
          userTotal = userStats?.total || 0;
        } catch {
          userTotal = 0;
        }

        // Get REAL AI generation stats from ai_generation_logs
        let aiCompleted = 0;
        let aiFailed = 0;
        try {
          const [completedStats] = await db
            .select({
              count: count(),
            })
            .from(aiGenerationLogs)
            .where(eq(aiGenerationLogs.success, true));
          aiCompleted = completedStats?.count || 0;

          const [failedStats] = await db
            .select({
              count: count(),
            })
            .from(aiGenerationLogs)
            .where(eq(aiGenerationLogs.success, false));
          aiFailed = failedStats?.count || 0;
        } catch {
          // Table may not exist yet
        }

        // Get Tiqets content generation stats (as additional AI generation tracking)
        // NOTE: Tiqets attractions use "published" status when generation is complete
        let tiqetsCompleted = 0;
        try {
          const [tiqetsStats] = await db
            .select({
              count: count(),
            })
            .from(tiqetsAttractions)
            .where(eq(tiqetsAttractions.status, "published"));
          tiqetsCompleted = tiqetsStats?.count || 0;
        } catch {
          // Table may not exist
        }

        const totalAiCompleted = aiCompleted + tiqetsCompleted;
        const published = publishedCount?.count || 0;

        // Calculate REAL aggregate total content across all content types
        const attractionsCount = contentStats?.total || 0;
        const articlesCount = articleStats?.total || 0;
        const destinationsCount = destinationStats?.total || 0;
        const aggregateTotalContent = attractionsCount + articlesCount + destinationsCount;

        const stats = {
          contents: {
            total: aggregateTotalContent, // Sum of ALL content types
            attractions: attractionsCount,
            articles: articlesCount,
            destinations: destinationsCount,
            pages: 0,
          },
          media: {
            images: imageCount,
            videos: 0, // No video tracking exists
            storageUsed: "N/A",
          },
          users: {
            total: userTotal,
            online: 0, // No real session tracking exists
          },
          pendingTasks: {
            review: draftCount?.count || 0,
            scheduled: 0, // No scheduling system exists
            aiQueue: 0, // No AI queue tracking exists
          },
          status: {
            published: published,
            draft: draftCount?.count || 0,
          },
          aiGeneration: {
            completed: totalAiCompleted,
            pending: 0, // No pending queue tracking
            failed: aiFailed,
          },
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch stats" });
      }
    }
  );

  router.get(
    "/activity-feed",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        // Return empty array - activity tracking to be implemented
        // In production, this would query an activity_logs table
        const activities: any[] = [];
        res.json(activities);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch activity feed" });
      }
    }
  );

  router.get(
    "/notifications",
    requirePermission("canManageSettings"),
    async (_req: Request, res: Response) => {
      try {
        // Return system notifications
        const notifications: any[] = [];
        res.json(notifications);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch notifications" });
      }
    }
  );

  // ============================================================================
  // PAGE SEO ROUTES - Generic SEO configuration for any page
  // ============================================================================

  // Get all page SEO configurations
  // Uses dedicated canEditPageSeo permission for Field Ownership enforcement
  router.get(
    "/page-seo",
    requirePermission("canEditPageSeo"),
    async (_req: Request, res: Response) => {
      try {
        const allPageSeo = await db.select().from(pageSeo);
        res.json(allPageSeo);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch page SEO configurations" });
      }
    }
  );

  // Get SEO for a specific page path
  // Uses dedicated canEditPageSeo permission for Field Ownership enforcement
  router.get(
    "/page-seo/:pagePath(*)",
    requirePermission("canEditPageSeo"),
    async (req: Request, res: Response) => {
      try {
        const pagePath = "/" + req.params.pagePath;
        const [seoData] = await db.select().from(pageSeo).where(eq(pageSeo.pagePath, pagePath));

        if (!seoData) {
          return res.status(404).json({ error: "Page SEO not found", pagePath });
        }

        res.json(seoData);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch page SEO" });
      }
    }
  );

  // Create or update SEO for a page
  // Uses dedicated canEditPageSeo permission for Field Ownership enforcement
  // This is the ONLY write surface for page_seo fields, enforced via capability
  router.put(
    "/page-seo/:pagePath(*)",
    requirePermission("canEditPageSeo"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const pagePath = "/" + req.params.pagePath;
        const {
          pageLabel,
          metaTitle,
          metaDescription,
          canonicalUrl,
          ogTitle,
          ogDescription,
          ogImage,
          robotsMeta,
          jsonLdSchema,
        } = req.body;

        // Field Ownership Enforcement using shared/field-ownership.ts contract
        // This route is the ONLY authorized writer for page_seo fields.
        // Owner: /admin/page-seo (PageSeoEditor component)
        const ROUTE_OWNER = "/admin/page-seo";
        const CONTRACT = DESTINATIONS_INDEX_SEO;

        // Verify this route is the authorized owner per the contract
        const contractFields = CONTRACT.fields;
        for (const [fieldName, fieldConfig] of Object.entries(contractFields)) {
          if (fieldConfig.owner !== ROUTE_OWNER) {
            return res.status(500).json({
              error: "Contract configuration error",
              message: `Field ${fieldName} has mismatched ownership in contract`,
              code: "CONTRACT_VIOLATION",
            });
          }
        }

        // Build allowed fields from the contract
        const ALLOWED_FIELDS = new Set([
          ...Object.keys(contractFields),
          "pagePath",
          "pageLabel",
          "fieldOwner", // Additional metadata fields
        ]);

        // Validate that only allowed fields are being submitted
        const submittedFields = Object.keys(req.body);
        const invalidFields = submittedFields.filter(f => !ALLOWED_FIELDS.has(f));
        if (invalidFields.length > 0) {
          return res.status(403).json({
            error: "Field ownership violation",
            message: `Fields not allowed: ${invalidFields.join(", ")}. This route only manages page SEO fields defined in the ownership contract.`,
            code: "FIELD_OWNERSHIP_VIOLATION",
          });
        }

        // Character limit validation using contract limits
        const errors: string[] = [];
        const fieldValues: Record<string, string | null> = {
          metaTitle,
          metaDescription,
          ogTitle,
          ogDescription,
        };

        for (const [fieldName, fieldConfig] of Object.entries(contractFields)) {
          const limits = (fieldConfig as any).limits;
          if (limits && fieldValues[fieldName]) {
            const value = fieldValues[fieldName] as string;
            const validation = validateCharacterLimits(value, limits);
            if (!validation.valid) {
              const limitDesc = `${limits.min}-${limits.max}`;
              if (validation.tooShort) {
                errors.push(
                  `${fieldName} must be at least ${limits.min} characters (current: ${value.length})`
                );
              } else if (validation.tooLong) {
                errors.push(
                  `${fieldName} must be at most ${limits.max} characters (current: ${value.length})`
                );
              }
            }
          }
        }
        if (errors.length > 0) {
          return res.status(400).json({
            error: "Validation failed",
            details: errors,
            code: "CHARACTER_LIMIT_VIOLATION",
          });
        }

        // Check if exists
        const [existing] = await db.select().from(pageSeo).where(eq(pageSeo.pagePath, pagePath));

        if (existing) {
          // Update
          const [updated] = await db
            .update(pageSeo)
            .set({
              pageLabel,
              metaTitle,
              metaDescription,
              canonicalUrl,
              ogTitle,
              ogDescription,
              ogImage,
              robotsMeta,
              jsonLdSchema,
              updatedAt: new Date(),
            } as any)
            .where(eq(pageSeo.pagePath, pagePath))
            .returning();
          res.json(updated);
        } else {
          // Create
          const [created] = await db
            .insert(pageSeo)
            .values({
              pagePath,
              pageLabel,
              metaTitle,
              metaDescription,
              canonicalUrl,
              ogTitle,
              ogDescription,
              ogImage,
              robotsMeta,
              jsonLdSchema,
            } as any)
            .returning();
          res.status(201).json(created);
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to save page SEO" });
      }
    }
  );

  // Delete SEO for a page
  // Uses dedicated canEditPageSeo permission for Field Ownership enforcement
  router.delete(
    "/page-seo/:pagePath(*)",
    requirePermission("canEditPageSeo"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const pagePath = "/" + req.params.pagePath;
        await db.delete(pageSeo).where(eq(pageSeo.pagePath, pagePath));
        res.json({ success: true, deleted: pagePath });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete page SEO" });
      }
    }
  );

  // ============================================================================
  // DESTINATIONS INDEX CONFIG ROUTES - Hero carousel for /destinations page
  // ============================================================================

  // Get destinations index config
  router.get(
    "/destinations-index/config",
    requirePermission("canViewAll"),
    async (req: Request, res: Response) => {
      try {
        const [config] = await db.select().from(destinationsIndexConfig).limit(1);

        if (!config) {
          // Return empty config structure if none exists
          return res.json({
            id: null,
            heroSlides: [],
            heroTitle: null,
            heroSubtitle: null,
            heroDescription: null,
            heroCTAText: null,
            heroCTALink: null,
          });
        }

        res.json(config);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch destinations index config" });
      }
    }
  );

  // Update destinations index config
  router.put(
    "/destinations-index/config",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const { heroSlides, heroTitle, heroSubtitle, heroDescription, heroCTAText, heroCTALink } =
          req.body;

        // Get existing config or create new one
        const [existing] = await db.select().from(destinationsIndexConfig).limit(1);

        if (existing) {
          const [updated] = await db
            .update(destinationsIndexConfig)
            .set({
              heroSlides: heroSlides ?? existing.heroSlides,
              heroTitle: heroTitle ?? existing.heroTitle,
              heroSubtitle: heroSubtitle ?? existing.heroSubtitle,
              heroDescription: heroDescription ?? existing.heroDescription,
              heroCTAText: heroCTAText ?? existing.heroCTAText,
              heroCTALink: heroCTALink ?? existing.heroCTALink,
              updatedAt: new Date(),
            })
            .where(eq(destinationsIndexConfig.id, existing.id))
            .returning();
          res.json(updated);
        } else {
          // Create new config
          const [created] = await db
            .insert(destinationsIndexConfig)
            .values({
              heroSlides: heroSlides ?? [],
              heroTitle,
              heroSubtitle,
              heroDescription,
              heroCTAText,
              heroCTALink,
            })
            .returning();
          res.status(201).json(created);
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to save destinations index config" });
      }
    }
  );

  // Update hero slides (carousel management)
  router.put(
    "/destinations-index/hero-slides",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const { heroSlides } = req.body as { heroSlides: DestinationsIndexHeroSlide[] };

        if (!Array.isArray(heroSlides)) {
          return res.status(400).json({ error: "heroSlides must be an array" });
        }

        // Validate each slide has required fields
        for (const slide of heroSlides) {
          if (!slide.id || !slide.destinationId || !slide.filename || !slide.alt) {
            return res.status(400).json({
              error: "Each slide must have id, destinationId, filename, and alt (required for SEO)",
            });
          }
        }

        // Get existing config or create new one
        const [existing] = await db.select().from(destinationsIndexConfig).limit(1);

        if (existing) {
          const [updated] = await db
            .update(destinationsIndexConfig)
            .set({
              heroSlides,
              updatedAt: new Date(),
            })
            .where(eq(destinationsIndexConfig.id, existing.id))
            .returning();
          res.json(updated);
        } else {
          // Create new config with slides
          const [created] = await db
            .insert(destinationsIndexConfig)
            .values({ heroSlides })
            .returning();
          res.status(201).json(created);
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to save hero slides" });
      }
    }
  );

  // Upload hero image for destinations index carousel
  router.post(
    "/destinations-index/hero-image",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        // MIME type validation
        const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedMimes.includes(file.mimetype)) {
          return res.status(400).json({
            error: `Invalid file type. Allowed: ${allowedMimes.join(", ")}`,
          });
        }

        // Generate SEO-safe filename
        const ext = file.mimetype.split("/")[1];
        const sanitizedName = (req.body.alt || "destinations-hero")
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 50);
        const timestamp = Date.now();
        const filename = `destinations-index-hero-${sanitizedName}-${timestamp}.${ext}`;

        // Process image with sharp for optimization
        const optimizedBuffer = await sharp(file.buffer)
          .resize(1920, 1080, { fit: "cover", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Store in object storage
        const { StorageManager } = await import("../storage-manager");
        const storage = StorageManager.getInstance();
        const storagePath = `destinations-index-hero/${filename}`;
        await storage.uploadBuffer(optimizedBuffer, storagePath, "image/jpeg");

        // Get public URL
        const url = storage.getPublicUrl(storagePath);

        res.json({
          filename,
          url,
          path: storagePath,
          success: true,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to upload hero image" });
      }
    }
  );

  // Get all active destinations for dropdown selection
  router.get(
    "/destinations-index/available-destinations",
    requirePermission("canViewAll"),
    async (req: Request, res: Response) => {
      try {
        const activeDestinations = await db
          .select({
            id: destinations.id,
            name: destinations.name,
            slug: destinations.slug,
            country: destinations.country,
            cardImage: destinations.cardImage,
            cardImageAlt: destinations.cardImageAlt,
            heroImage: destinations.heroImage,
          })
          .from(destinations)
          .where(eq(destinations.isActive, true))
          .orderBy(destinations.name);

        res.json(activeDestinations);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch available destinations" });
      }
    }
  );

  // Upload card image for a destination
  router.post(
    "/destinations/:id/card-image",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        const destinationId = req.params.id;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: "No image file provided" });
        }

        // Verify destination exists
        const [destination] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, destinationId));
        if (!destination) {
          return res.status(404).json({ error: "Destination not found" });
        }

        // MIME type validation
        const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedMimes.includes(file.mimetype)) {
          return res.status(400).json({
            error: `Invalid file type. Allowed: ${allowedMimes.join(", ")}`,
          });
        }

        // Generate SEO-safe filename using destination name
        const ext = file.mimetype.split("/")[1];
        const sanitizedName = destination.name
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 50);
        const timestamp = Date.now();
        const filename = `destination-card-${sanitizedName}-${timestamp}.${ext}`;

        // Process image with sharp for card optimization (smaller size)
        const optimizedBuffer = await sharp(file.buffer)
          .resize(800, 600, { fit: "cover", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Store in object storage
        const { StorageManager } = await import("../storage-manager");
        const storage = StorageManager.getInstance();
        const storagePath = `destination-cards/${filename}`;
        await storage.uploadBuffer(optimizedBuffer, storagePath, "image/jpeg");

        // Get public URL
        const url = storage.getPublicUrl(storagePath);

        // Update destination with new card image
        const alt = req.body.alt || `${destination.name} - Travel destination card`;
        await db
          .update(destinations)
          .set({
            cardImage: url,
            cardImageAlt: alt,
            updatedAt: new Date(),
          } as any)
          .where(eq(destinations.id, destinationId));

        res.json({
          filename,
          url,
          path: storagePath,
          alt,
          success: true,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to upload card image" });
      }
    }
  );

  // Update destination card alt text (without changing image)
  router.patch(
    "/destinations/:id/card-alt",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const destinationId = req.params.id;
        const { alt } = req.body;

        if (!alt || typeof alt !== "string") {
          return res.status(400).json({ error: "Alt text is required" });
        }

        const [updated] = await db
          .update(destinations)
          .set({
            cardImageAlt: alt,
            updatedAt: new Date(),
          } as any)
          .where(eq(destinations.id, destinationId))
          .returning();

        if (!updated) {
          return res.status(404).json({ error: "Destination not found" });
        }

        res.json({ success: true, cardImageAlt: alt });
      } catch (error) {
        res.status(500).json({ error: "Failed to update alt text" });
      }
    }
  );

  // Mount the router at /api/admin
  app.use("/api/admin", router);
}
