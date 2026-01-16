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
  SUPPORTED_LOCALES,
} from "@shared/schema";
import { requirePermission, checkReadOnlyMode } from "../security";
import {
  getTranslations,
  getBulkTranslations,
  setTranslations,
  deleteEntityTranslations,
} from "../cms-translations";
import multer from "multer";
import sharp from "sharp";

const upload = multer({ storage: multer.memoryStorage() });

export function registerAdminApiRoutes(app: Express): void {
  const router = Router();

  // ============================================================================
  // LOGS ROUTES
  // ============================================================================

  router.get("/logs", requirePermission("canManageSettings"), async (req: Request, res: Response) => {
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
        logs = logs.filter(log =>
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
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  router.get("/logs/stream", requirePermission("canManageSettings"), async (req: Request, res: Response) => {
    const { consoleLogger } = await import("../console-logger");
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
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

    consoleLogger.on('log', onLog);

    req.on('close', () => {
      consoleLogger.off('log', onLog);
    });
  });

  router.get("/logs/stats", requirePermission("canManageSettings"), async (_req: Request, res: Response) => {
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
      console.error("Error fetching log stats:", error);
      res.status(500).json({ error: "Failed to fetch log stats" });
    }
  });

  router.delete("/logs", requirePermission("canManageSettings"), async (_req: Request, res: Response) => {
    try {
      const { consoleLogger } = await import("../console-logger");
      consoleLogger.clear();
      consoleLogger.addManualLog("info", "system", "Logs cleared by admin");
      res.json({ success: true, message: "Logs cleared" });
    } catch (error) {
      console.error("Error clearing logs:", error);
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  router.get("/logs/export", requirePermission("canManageSettings"), async (req: Request, res: Response) => {
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
      res.setHeader("Content-Disposition", `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(logs);
    } catch (error) {
      console.error("Error exporting logs:", error);
      res.status(500).json({ error: "Failed to export logs" });
    }
  });

  // ============================================================================
  // HOMEPAGE SECTIONS ROUTES
  // ============================================================================

  router.get("/homepage/sections", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const sections = await db.select().from(homepageSections).orderBy(homepageSections.sortOrder);
      
      const translationsMap = await getBulkTranslations("homepage_section", sections.map(s => s.id), locale);
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
      console.error("Error fetching homepage sections:", error);
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  router.patch("/homepage/sections/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const { id } = req.params;
      const locale = (req.query.locale as string) || "en";
      const { title, subtitle, ...structuralUpdates } = req.body;
      
      if (Object.keys(structuralUpdates).length > 0) {
        await db.update(homepageSections).set({...structuralUpdates, updatedAt: new Date()}).where(eq(homepageSections.id, id));
      }
      
      await setTranslations("homepage_section", id, locale, { title, subtitle });
      
      const [section] = await db.select().from(homepageSections).where(eq(homepageSections.id, id));
      const trans = await getTranslations("homepage_section", id, locale);
      
      res.json({
        ...section,
        title: trans.title ?? section?.title,
        subtitle: trans.subtitle ?? section?.subtitle,
      });
    } catch (error) {
      console.error("Error updating homepage section:", error);
      res.status(500).json({ error: "Failed to update homepage section" });
    }
  });

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
        const imageFiles = files.filter(f => 
          /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f)
        ).map(f => ({
          filename: f,
          url: `/${folder}/${f}`,
          name: f.replace(/\.[^.]+$/, '').replace(/-/g, ' ')
        }));
        res.json(imageFiles);
      } catch {
        res.json([]);
      }
    } catch (error) {
      console.error("Error listing images:", error);
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
        const imageFiles = files.filter(f => 
          /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f)
        ).map(f => ({
          filename: f,
          url: `/hero/${f}`,
          name: f.replace(/\.[^.]+$/, '').replace(/-/g, ' ')
        }));
        res.json(imageFiles);
      } catch {
        res.json([]);
      }
    } catch (error) {
      console.error("Error listing hero images:", error);
      res.status(500).json({ error: "Failed to list hero images" });
    }
  });

  router.post("/homepage/upload-image", requirePermission("canEdit"), checkReadOnlyMode, upload.single("file"), async (req, res) => {
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
          .replace(/[^a-z0-9\-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      } else {
        customFilename = req.file.originalname
          .replace(/\.[^.]+$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9\-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
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
        return res.status(400).json({ error: `File "${finalFilename}" already exists. Choose a different name.` });
      } catch {
        // File doesn't exist, good to proceed
      }

      const webpBuffer = await sharp(req.file.buffer)
        .webp({ quality: 85 })
        .toBuffer();

      const metadata = await sharp(webpBuffer).metadata();

      await fs.writeFile(targetPath, webpBuffer);

      const url = `/${targetFolder}/${finalFilename}`;

      console.log(`[Homepage Image Upload] Saved: ${finalFilename} to ${targetFolder}`);

      res.json({
        success: true,
        filename: finalFilename,
        url,
        width: metadata.width,
        height: metadata.height,
        size: webpBuffer.length,
        folder: targetFolder
      });
    } catch (error) {
      console.error("[Homepage Image Upload] Error:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });

  // ============================================================================
  // HERO SLIDES ROUTES
  // ============================================================================

  router.get("/homepage/hero-slides", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const slides = await db.select().from(heroSlides).orderBy(heroSlides.sortOrder);
      
      const translationsMap = await getBulkTranslations("hero_slide", slides.map(s => s.id), locale);
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
      console.error("Error fetching hero slides:", error);
      res.status(500).json({ error: "Failed to fetch hero slides" });
    }
  });

  router.post("/homepage/hero-slides", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const { headline, subheadline, ctaText, ...structuralData } = req.body;
      
      const [slide] = await db.insert(heroSlides).values(structuralData).returning();
      
      await setTranslations("hero_slide", slide.id, locale, { headline, subheadline, ctaText });
      
      res.json({ ...slide, headline, subheadline, ctaText });
    } catch (error) {
      console.error("Error creating hero slide:", error);
      res.status(500).json({ error: "Failed to create hero slide" });
    }
  });

  router.patch("/homepage/hero-slides/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const { id } = req.params;
      const locale = (req.query.locale as string) || "en";
      const { headline, subheadline, ctaText, ...structuralUpdates } = req.body;
      
      if (Object.keys(structuralUpdates).length > 0) {
        await db.update(heroSlides).set({...structuralUpdates, updatedAt: new Date()}).where(eq(heroSlides.id, id));
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
      console.error("Error updating hero slide:", error);
      res.status(500).json({ error: "Failed to update hero slide" });
    }
  });

  router.delete("/homepage/hero-slides/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const { id } = req.params;
      await deleteEntityTranslations("hero_slide", id);
      await db.delete(heroSlides).where(eq(heroSlides.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting hero slide:", error);
      res.status(500).json({ error: "Failed to delete hero slide" });
    }
  });

  // ============================================================================
  // HOMEPAGE CARDS ROUTES
  // ============================================================================

  router.get("/homepage/cards", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const cards = await db.select().from(homepageCards).orderBy(homepageCards.sortOrder);
      
      const translationsMap = await getBulkTranslations("homepage_card", cards.map(c => c.id), locale);
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
      console.error("Error fetching homepage cards:", error);
      res.status(500).json({ error: "Failed to fetch homepage cards" });
    }
  });

  router.post("/homepage/cards", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const { title, subtitle, ...structuralData } = req.body;
      
      const [card] = await db.insert(homepageCards).values(structuralData).returning();
      await setTranslations("homepage_card", card.id, locale, { title, subtitle });
      
      res.json({ ...card, title, subtitle });
    } catch (error) {
      console.error("Error creating homepage card:", error);
      res.status(500).json({ error: "Failed to create homepage card" });
    }
  });

  router.patch("/homepage/cards/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const locale = (req.query.locale as string) || "en";
      const { title, subtitle, ...structuralUpdates } = req.body;
      
      if (Object.keys(structuralUpdates).length > 0) {
        await db.update(homepageCards).set({...structuralUpdates, updatedAt: new Date()}).where(eq(homepageCards.id, id));
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
      console.error("Error updating homepage card:", error);
      res.status(500).json({ error: "Failed to update homepage card" });
    }
  });

  router.delete("/homepage/cards/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await deleteEntityTranslations("homepage_card", id);
      await db.delete(homepageCards).where(eq(homepageCards.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting homepage card:", error);
      res.status(500).json({ error: "Failed to delete homepage card" });
    }
  });

  // ============================================================================
  // EXPERIENCE CATEGORIES ROUTES
  // ============================================================================

  router.get("/homepage/experience-categories", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const categories = await db.select().from(experienceCategories).orderBy(experienceCategories.sortOrder);
      
      const translationsMap = await getBulkTranslations("experience_category", categories.map(c => c.id), locale);
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
      console.error("Error fetching experience categories:", error);
      res.status(500).json({ error: "Failed to fetch experience categories" });
    }
  });

  router.post("/homepage/experience-categories", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const { name, description, ...structuralData } = req.body;
      
      const [category] = await db.insert(experienceCategories).values(structuralData).returning();
      await setTranslations("experience_category", category.id, locale, { name, description });
      
      res.json({ ...category, name, description });
    } catch (error) {
      console.error("Error creating experience category:", error);
      res.status(500).json({ error: "Failed to create experience category" });
    }
  });

  router.patch("/homepage/experience-categories/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const locale = (req.query.locale as string) || "en";
      const { name, description, ...structuralUpdates } = req.body;
      
      if (Object.keys(structuralUpdates).length > 0) {
        await db.update(experienceCategories).set({...structuralUpdates, updatedAt: new Date()}).where(eq(experienceCategories.id, id));
      }
      
      await setTranslations("experience_category", id, locale, { name, description });
      
      const [cat] = await db.select().from(experienceCategories).where(eq(experienceCategories.id, id));
      const trans = await getTranslations("experience_category", id, locale);
      
      res.json({
        ...cat,
        name: trans.name ?? cat?.name,
        description: trans.description ?? cat?.description,
      });
    } catch (error) {
      console.error("Error updating experience category:", error);
      res.status(500).json({ error: "Failed to update experience category" });
    }
  });

  router.delete("/homepage/experience-categories/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await deleteEntityTranslations("experience_category", id);
      await db.delete(experienceCategories).where(eq(experienceCategories.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting experience category:", error);
      res.status(500).json({ error: "Failed to delete experience category" });
    }
  });

  // ============================================================================
  // DESTINATIONS ADMIN ROUTES
  // ============================================================================

  router.get("/homepage/destinations", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const allDestinations = await db
        .select()
        .from(destinations)
        .orderBy(destinations.name);
      
      const translationsMap = await getBulkTranslations("destination", allDestinations.map(d => d.id), locale);
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
      console.error("Error fetching destinations:", error);
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  router.post("/homepage/destinations", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const { id, name, summary, country, slug, cardImage, cardImageAlt, isActive } = req.body;
      
      const existing = await db.select().from(destinations).where(eq(destinations.id, id));
      if (existing.length > 0) {
        return res.status(400).json({ error: "Destination with this ID already exists" });
      }
      
      const normalizedName = name.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
      
      const [destination] = await db.insert(destinations).values({
        id,
        name,
        normalizedName,
        country: country || "",
        slug: slug || `/destinations/${id}`,
        cardImage,
        cardImageAlt,
        isActive: isActive ?? true,
        summary,
      }).returning();
      
      await setTranslations("destination", id, locale, { name, summary });
      
      res.json({ ...destination, name, summary });
    } catch (error) {
      console.error("Error creating destination:", error);
      res.status(500).json({ error: "Failed to create destination" });
    }
  });

  router.patch("/homepage/destinations/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const id = req.params.id;
      const locale = (req.query.locale as string) || "en";
      const { name, summary, ...structuralUpdates } = req.body;
      
      if (Object.keys(structuralUpdates).length > 0) {
        await db.update(destinations).set({
          ...structuralUpdates,
          updatedAt: new Date(),
        }).where(eq(destinations.id, id));
      }
      
      await setTranslations("destination", id, locale, { name, summary });
      
      const [dest] = await db.select().from(destinations).where(eq(destinations.id, id));
      const trans = await getTranslations("destination", id, locale);
      
      res.json({
        ...dest,
        name: trans.name ?? dest?.name,
        summary: trans.summary ?? dest?.summary,
      });
    } catch (error) {
      console.error("Error updating destination:", error);
      res.status(500).json({ error: "Failed to update destination" });
    }
  });

  router.delete("/homepage/destinations/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const id = req.params.id;
      await deleteEntityTranslations("destination", id);
      await db.delete(destinations).where(eq(destinations.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting destination:", error);
      res.status(500).json({ error: "Failed to delete destination" });
    }
  });

  router.post("/homepage/destinations/analyze-image", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
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
      console.error("Error analyzing image:", error);
      const message = error instanceof Error ? error.message : "Failed to analyze image";
      res.status(500).json({ error: message });
    }
  });

  // ============================================================================
  // AUTO META GENERATOR
  // ============================================================================

  router.post("/auto-meta", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    console.log("[Auto Meta API] Request received");
    
    const { imageUrl, filename } = req.body;
    
    if (!imageUrl) {
      console.error("[Auto Meta API] Missing imageUrl in request body");
      return res.status(400).json({ 
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'imageUrl is required',
        }
      });
    }
    
    console.log("[Auto Meta API] imageUrl:", imageUrl.substring(0, 80));
    console.log("[Auto Meta API] filename:", filename || "(not provided)");
    
    try {
      const { visualSearch } = await import("../ai/visual-search");
      const result = await visualSearch.generateAutoMeta(imageUrl, filename);
      
      if (result.success) {
        console.log("[Auto Meta API] Success - returning metadata");
        return res.json({
          success: true,
          meta: result.meta,
        });
      } else {
        console.error("[Auto Meta API] Failed:", result.error.code, result.error.message);
        return res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error) {
      console.error("[Auto Meta API] Unexpected exception:", error);
      const message = error instanceof Error ? error.message : "Unexpected error";
      return res.status(500).json({ 
        success: false,
        error: {
          code: 'UNKNOWN',
          message: 'Unexpected server error',
          details: message,
        }
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
      
      const translationsMap = await getBulkTranslations("region_link", links.map(l => l.id), locale);
      const translatedLinks = links.map(link => {
        const trans = translationsMap.get(String(link.id)) || {};
        return {
          ...link,
          name: trans.name ?? link.name,
        };
      });
      
      res.json(translatedLinks);
    } catch (error) {
      console.error("Error fetching region links:", error);
      res.status(500).json({ error: "Failed to fetch region links" });
    }
  });

  router.post("/homepage/region-links", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const { name, ...structuralData } = req.body;
      
      const [link] = await db.insert(regionLinks).values(structuralData).returning();
      await setTranslations("region_link", link.id, locale, { name });
      
      res.json({ ...link, name });
    } catch (error) {
      console.error("Error creating region link:", error);
      res.status(500).json({ error: "Failed to create region link" });
    }
  });

  router.patch("/homepage/region-links/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const locale = (req.query.locale as string) || "en";
      const { name, ...structuralUpdates } = req.body;
      
      if (Object.keys(structuralUpdates).length > 0) {
        await db.update(regionLinks).set({...structuralUpdates, updatedAt: new Date()}).where(eq(regionLinks.id, id));
      }
      
      await setTranslations("region_link", id, locale, { name });
      
      const [link] = await db.select().from(regionLinks).where(eq(regionLinks.id, id));
      const trans = await getTranslations("region_link", id, locale);
      
      res.json({
        ...link,
        name: trans.name ?? link?.name,
      });
    } catch (error) {
      console.error("Error updating region link:", error);
      res.status(500).json({ error: "Failed to update region link" });
    }
  });

  router.delete("/homepage/region-links/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await deleteEntityTranslations("region_link", id);
      await db.delete(regionLinks).where(eq(regionLinks.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting region link:", error);
      res.status(500).json({ error: "Failed to delete region link" });
    }
  });

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
      console.error("Error fetching homepage CTA:", error);
      res.status(500).json({ error: "Failed to fetch homepage CTA" });
    }
  });

  router.patch("/homepage/cta/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const { id } = req.params;
      const locale = (req.query.locale as string) || "en";
      const { headline, subheadline, inputPlaceholder, buttonText, helperText, ...structuralUpdates } = req.body;
      
      if (Object.keys(structuralUpdates).length > 0) {
        await db.update(homepageCta).set({...structuralUpdates, updatedAt: new Date()}).where(eq(homepageCta.id, id));
      }
      
      await setTranslations("homepage_cta", id, locale, { headline, subheadline, inputPlaceholder, buttonText, helperText });
      
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
      console.error("Error updating homepage CTA:", error);
      res.status(500).json({ error: "Failed to update homepage CTA" });
    }
  });

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
      console.error("Error fetching homepage SEO meta:", error);
      res.status(500).json({ error: "Failed to fetch homepage SEO meta" });
    }
  });

  router.patch("/homepage/seo-meta/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const { id } = req.params;
      const locale = (req.query.locale as string) || "en";
      const { metaTitle, metaDescription, ogTitle, ogDescription, ...structuralUpdates } = req.body;
      
      if (Object.keys(structuralUpdates).length > 0) {
        await db.update(homepageSeoMeta).set({...structuralUpdates, updatedAt: new Date()}).where(eq(homepageSeoMeta.id, id));
      }
      
      await setTranslations("homepage_seo_meta", id, locale, { metaTitle, metaDescription, ogTitle, ogDescription });
      
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
      console.error("Error updating homepage SEO meta:", error);
      res.status(500).json({ error: "Failed to update homepage SEO meta" });
    }
  });

  // ============================================================================
  // HOMEPAGE TRANSLATION GENERATION
  // ============================================================================

  router.post("/homepage/generate-translations", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
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
        "homepage_seo_meta"
      ] as const;
      
      const englishTranslations = await db.select()
        .from(cmsTranslations)
        .where(and(
          eq(cmsTranslations.locale, "en"),
          inArray(cmsTranslations.entityType, [...HOMEPAGE_ENTITY_TYPES])
        ));
      
      if (englishTranslations.length === 0) {
        return res.json({ success: true, translated: 0, skipped: 0, locales: [], message: "No English homepage content to translate" });
      }
      
      const existingTranslations = await db.select()
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
            const result = await translateText({
              text: engTrans.value,
              sourceLocale: "en" as any,
              targetLocale: targetLocale as any,
              contentType: "body",
            }, { provider: "claude" });
            
            await setTranslations(
              engTrans.entityType as any,
              engTrans.entityId,
              targetLocale,
              { [engTrans.field]: result.translatedText }
            );
            
            translatedCount++;
          } catch (error) {
            const errMsg = `Failed to translate ${engTrans.entityType}:${engTrans.entityId}:${engTrans.field} to ${targetLocale}`;
            console.error(errMsg, error);
            errors.push(errMsg);
          }
        }
      }
      
      console.log(`[Generate Translations] Completed: ${translatedCount} translations, ${skippedCount} skipped across ${targetLocales.length} locales`);
      
      res.json({
        success: true,
        translated: translatedCount,
        skipped: skippedCount,
        locales: targetLocales,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
        message: skippedCount > 0 ? `${skippedCount} existing translations preserved (use overwrite=true to replace)` : undefined,
      });
    } catch (error) {
      console.error("Error generating translations:", error);
      res.status(500).json({ error: "Failed to generate translations" });
    }
  });

  // Mount the router at /api/admin
  app.use("/api/admin", router);
  console.log("[Routes] ✓ Admin API routes registered");
}
