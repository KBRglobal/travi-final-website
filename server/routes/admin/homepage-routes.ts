/**
 * Admin Homepage CMS Routes
 * Handles all /api/admin/homepage/* endpoints for managing homepage content
 * Including sections, hero slides, cards, experience categories, destinations, region links, CTA, SEO meta
 */

import type { Express } from "express";
import { db } from "../../db";
import { eq, and, inArray } from "drizzle-orm";
import {
  homepageSections,
  heroSlides,
  homepageCards,
  experienceCategories,
  destinations,
  regionLinks,
  homepageCta,
  homepageSeoMeta,
  cmsTranslations,
  SUPPORTED_LOCALES,
} from "@shared/schema";
import { requirePermission, checkReadOnlyMode } from "../../security";
import {
  getBulkTranslations,
  setTranslations,
  getTranslations,
  deleteEntityTranslations,
} from "../../cms-translations";
import sharp from "sharp";
import multer from "multer";

// Configure multer for memory storage (matching routes.ts pattern)
const upload = multer({ storage: multer.memoryStorage() });

/** Helper to translate a single homepage entity translation entry */
async function translateSingleHomepageEntry(
  engTrans: { entityType: string; entityId: string; field: string; value: string | null },
  targetLocale: string,
  overwrite: boolean,
  existingKeys: Set<string>,
  translateText: (...args: any[]) => Promise<{ translatedText: string }>
): Promise<"skipped" | "translated" | string | null> {
  if (!engTrans.value || engTrans.value.trim() === "") return null;
  const key = `${engTrans.entityType}:${engTrans.entityId}:${targetLocale}:${engTrans.field}`;
  if (!overwrite && existingKeys.has(key)) return "skipped";
  try {
    const result = await translateText(
      { text: engTrans.value, sourceLocale: "en", targetLocale, contentType: "body" },
      { provider: "claude" }
    );
    await setTranslations(engTrans.entityType as any, engTrans.entityId, targetLocale, {
      [engTrans.field]: result.translatedText,
    });
    return "translated";
  } catch {
    return `Failed to translate ${engTrans.entityType}:${engTrans.entityId}:${engTrans.field} to ${targetLocale}`;
  }
}

export function registerAdminHomepageRoutes(app: Express): void {
  // ========== HOMEPAGE CMS ADMIN ROUTES ==========
  // All admin endpoints now support ?locale=xx for reading/writing translations
  // Translatable fields are saved to cms_translations table

  // Homepage Sections CRUD
  app.get("/api/admin/homepage/sections", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const sections = await db
        .select()
        .from(homepageSections)
        .orderBy(homepageSections.sortOrder)
        .limit(100);

      // Apply translations
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
    } catch {
      res.status(500).json({ error: "Failed to fetch homepage sections" });
    }
  });

  app.patch(
    "/api/admin/homepage/sections/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const locale = (req.query.locale as string) || "en";
        const { title, subtitle, ...structuralUpdates } = req.body;

        // Update structural fields directly on table
        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(homepageSections)
            .set({ ...structuralUpdates, updatedAt: new Date() })
            .where(eq(homepageSections.id, id));
        }

        // Save translatable fields to translations table
        await setTranslations("homepage_section", id, locale, { title, subtitle });

        // Fetch updated record with translations
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
      } catch {
        res.status(500).json({ error: "Failed to update homepage section" });
      }
    }
  );

  // List available server-side images from a specific folder
  app.get(
    "/api/admin/homepage/available-images",
    requirePermission("canEdit"),
    async (req, res) => {
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
              name: f.replace(/\.[^.]+$/, "").replaceAll("-", " "),
            }));
          res.json(imageFiles);
        } catch {
          res.json([]);
        }
      } catch {
        res.status(500).json({ error: "Failed to list images" });
      }
    }
  );

  // Legacy endpoint for hero images (backwards compatibility)
  app.get(
    "/api/admin/homepage/available-hero-images",
    requirePermission("canEdit"),
    async (req, res) => {
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
              name: f.replace(/\.[^.]+$/, "").replaceAll("-", " "),
            }));
          res.json(imageFiles);
        } catch {
          res.json([]);
        }
      } catch {
        res.status(500).json({ error: "Failed to list hero images" });
      }
    }
  );

  // Upload homepage image with WebP conversion and custom filename
  app.post(
    "/api/admin/homepage/upload-image",
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

        // Get custom filename from request body, or use original
        let customFilename = req.body.customFilename?.trim();
        const targetFolder = req.body.folder || "hero"; // Default to hero folder

        // Validate folder (only allow specific folders)
        const allowedFolders = ["hero", "cards", "experiences", "regions"];
        if (!allowedFolders.includes(targetFolder)) {
          return res.status(400).json({ error: "Invalid target folder" });
        }

        // Sanitize filename - remove special chars, keep only alphanumeric, hyphens, underscores
        if (customFilename) {
          customFilename = customFilename
            .toLowerCase()
            .replaceAll(/[^a-z0-9\-_]/g, "-")
            .replaceAll(/-+/g, "-")
            .replaceAll(/(?:^-|-$)/g, "");
        } else {
          // Use original filename without extension
          customFilename = req.file.originalname
            .replace(/\.[^.]+$/, "")
            .toLowerCase()
            .replaceAll(/[^a-z0-9\-_]/g, "-")
            .replaceAll(/-+/g, "-")
            .replaceAll(/(?:^-|-$)/g, "");
        }

        if (!customFilename) {
          customFilename = `image-${Date.now()}`;
        }

        // Always save as WebP
        const finalFilename = `${customFilename}.webp`;
        const targetDir = pathModule.join(process.cwd(), "client", "public", targetFolder);
        const targetPath = pathModule.join(targetDir, finalFilename);

        // Ensure directory exists
        await fs.mkdir(targetDir, { recursive: true });

        // Check if file already exists
        try {
          await fs.access(targetPath);
          return res
            .status(400)
            .json({ error: `File "${finalFilename}" already exists. Choose a different name.` });
        } catch {
          void 0; // File doesn't exist, good to proceed
        }

        // Convert to WebP using sharp
        const webpBuffer = await sharp(req.file.buffer).webp({ quality: 85 }).toBuffer();

        // Get image dimensions
        const metadata = await sharp(webpBuffer).metadata();

        // Save the file
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
      } catch {
        res.status(500).json({ error: "Failed to upload image" });
      }
    }
  );

  // Hero Slides CRUD
  app.get("/api/admin/homepage/hero-slides", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const slides = await db.select().from(heroSlides).orderBy(heroSlides.sortOrder).limit(50);

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
    } catch {
      res.status(500).json({ error: "Failed to fetch hero slides" });
    }
  });

  app.post(
    "/api/admin/homepage/hero-slides",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { headline, subheadline, ctaText, ...structuralData } = req.body;

        const [slide] = await db.insert(heroSlides).values(structuralData).returning();

        // Save translations
        await setTranslations("hero_slide", slide.id, locale, { headline, subheadline, ctaText });

        res.json({ ...slide, headline, subheadline, ctaText });
      } catch {
        res.status(500).json({ error: "Failed to create hero slide" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/hero-slides/:id",
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
      } catch {
        res.status(500).json({ error: "Failed to update hero slide" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/hero-slides/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        await deleteEntityTranslations("hero_slide", id);
        await db.delete(heroSlides).where(eq(heroSlides.id, id));
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to delete hero slide" });
      }
    }
  );

  // Homepage Cards (Quick Categories) CRUD
  app.get("/api/admin/homepage/cards", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const cards = await db
        .select()
        .from(homepageCards)
        .orderBy(homepageCards.sortOrder)
        .limit(100);

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
    } catch {
      res.status(500).json({ error: "Failed to fetch homepage cards" });
    }
  });

  app.post(
    "/api/admin/homepage/cards",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { title, subtitle, ...structuralData } = req.body;

        const [card] = await db.insert(homepageCards).values(structuralData).returning();
        await setTranslations("homepage_card", card.id, locale, { title, subtitle });

        res.json({ ...card, title, subtitle });
      } catch {
        res.status(500).json({ error: "Failed to create homepage card" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/cards/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = Number.parseInt(req.params.id);
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
      } catch {
        res.status(500).json({ error: "Failed to update homepage card" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/cards/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = Number.parseInt(req.params.id);
        await deleteEntityTranslations("homepage_card", id);
        await db.delete(homepageCards).where(eq(homepageCards.id, id));
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to delete homepage card" });
      }
    }
  );

  // Experience Categories CRUD
  app.get(
    "/api/admin/homepage/experience-categories",
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const categories = await db
          .select()
          .from(experienceCategories)
          .orderBy(experienceCategories.sortOrder)
          .limit(50);

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
      } catch {
        res.status(500).json({ error: "Failed to fetch experience categories" });
      }
    }
  );

  app.post(
    "/api/admin/homepage/experience-categories",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { name, description, ...structuralData } = req.body;

        const [category] = await db.insert(experienceCategories).values(structuralData).returning();
        await setTranslations("experience_category", category.id, locale, { name, description });

        res.json({ ...category, name, description });
      } catch {
        res.status(500).json({ error: "Failed to create experience category" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/experience-categories/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = Number.parseInt(req.params.id);
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
      } catch {
        res.status(500).json({ error: "Failed to update experience category" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/experience-categories/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = Number.parseInt(req.params.id);
        await deleteEntityTranslations("experience_category", id);
        await db.delete(experienceCategories).where(eq(experienceCategories.id, id));
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to delete experience category" });
      }
    }
  );

  // ============================================================================
  // DESTINATIONS ADMIN CRUD (Homepage Editor)
  // ============================================================================

  app.get("/api/admin/homepage/destinations", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const allDestinations = await db.select().from(destinations).orderBy(destinations.name);

      // Get translations for destinations
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
    } catch {
      res.status(500).json({ error: "Failed to fetch destinations" });
    }
  });

  app.post(
    "/api/admin/homepage/destinations",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { id, name, summary, country, slug, cardImage, cardImageAlt, isActive } = req.body;

        // Check if destination with this ID already exists
        const existing = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, Number(id)));
        if (existing.length > 0) {
          return res.status(400).json({ error: "Destination with this ID already exists" });
        }

        // Generate normalizedName for indexed lookups (consistent with graph-resolver)
        const normalizedName = name
          .toLowerCase()
          .trim()
          .replaceAll(/[^\w\s-]/g, "")
          .replaceAll(/\s+/g, "-")
          .replaceAll(/-+/g, "-");

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

        // Store translations
        await setTranslations("destination" as any, id, locale, { name, summary });

        res.json({ ...destination, name, summary });
      } catch {
        res.status(500).json({ error: "Failed to create destination" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/destinations/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = req.params.id;
        const locale = (req.query.locale as string) || "en";
        const { name, summary, ...structuralUpdates } = req.body;

        // Update structural fields in destinations table
        if (Object.keys(structuralUpdates).length > 0) {
          await db
            .update(destinations)
            .set({
              ...structuralUpdates,
              updatedAt: new Date(),
            })
            .where(eq(destinations.id, Number(id)));
        }

        // Store translations
        await setTranslations("destination" as any, id, locale, { name, summary });

        const [dest] = await db
          .select()
          .from(destinations)
          .where(eq(destinations.id, Number(id)));
        const trans = await getTranslations("destination" as any, id, locale);

        res.json({
          ...dest,
          name: trans.name ?? dest?.name,
          summary: trans.summary ?? dest?.summary,
        });
      } catch {
        res.status(500).json({ error: "Failed to update destination" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/destinations/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = req.params.id;
        await deleteEntityTranslations("destination" as any, id);
        await db.delete(destinations).where(eq(destinations.id, Number(id)));
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to delete destination" });
      }
    }
  );

  // AI Image Analysis for destinations - deprecated
  app.post(
    "/api/admin/homepage/destinations/analyze-image",
    requirePermission("canEdit"),
    async (_req, res) => {
      res.status(410).json({
        error: "This endpoint has been deprecated. Use Octypo system for image analysis.",
      });
    }
  );

  // Auto Meta Generator - deprecated
  app.post("/api/admin/auto-meta", requirePermission("canEdit"), async (_req, res) => {
    res.status(410).json({
      success: false,
      error: {
        code: "DEPRECATED",
        message: "This endpoint has been deprecated. Use Octypo system for meta generation.",
      },
    });
  });

  // Region Links CRUD
  app.get("/api/admin/homepage/region-links", requirePermission("canEdit"), async (req, res) => {
    try {
      const locale = (req.query.locale as string) || "en";
      const links = await db.select().from(regionLinks).orderBy(regionLinks.sortOrder).limit(100);

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
    } catch {
      res.status(500).json({ error: "Failed to fetch region links" });
    }
  });

  app.post(
    "/api/admin/homepage/region-links",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const locale = (req.query.locale as string) || "en";
        const { name, ...structuralData } = req.body;

        const [link] = await db.insert(regionLinks).values(structuralData).returning();
        await setTranslations("region_link", link.id, locale, { name });

        res.json({ ...link, name });
      } catch {
        res.status(500).json({ error: "Failed to create region link" });
      }
    }
  );

  app.patch(
    "/api/admin/homepage/region-links/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = Number.parseInt(req.params.id);
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
      } catch {
        res.status(500).json({ error: "Failed to update region link" });
      }
    }
  );

  app.delete(
    "/api/admin/homepage/region-links/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const id = Number.parseInt(req.params.id);
        await deleteEntityTranslations("region_link", id);
        await db.delete(regionLinks).where(eq(regionLinks.id, id));
        res.json({ success: true });
      } catch {
        res.status(500).json({ error: "Failed to delete region link" });
      }
    }
  );

  // Homepage CTA CRUD
  app.get("/api/admin/homepage/cta", requirePermission("canEdit"), async (req, res) => {
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
    } catch {
      res.status(500).json({ error: "Failed to fetch homepage CTA" });
    }
  });

  app.patch(
    "/api/admin/homepage/cta/:id",
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
      } catch {
        res.status(500).json({ error: "Failed to update homepage CTA" });
      }
    }
  );

  // Homepage SEO Meta CRUD
  app.get("/api/admin/homepage/seo-meta", requirePermission("canEdit"), async (req, res) => {
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
    } catch {
      res.status(500).json({ error: "Failed to fetch homepage SEO meta" });
    }
  });

  app.patch(
    "/api/admin/homepage/seo-meta/:id",
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
      } catch {
        res.status(500).json({ error: "Failed to update homepage SEO meta" });
      }
    }
  );

  // Generate translations for all languages from English source (HOMEPAGE ONLY)
  // Non-destructive by default - skips fields that already have translations
  app.post(
    "/api/admin/homepage/generate-translations",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        // translation-service deleted in Phase 4.2 cleanup
        const translateText = async (..._args: any[]): Promise<{ translatedText: string }> => {
          throw new Error("Automatic translation is permanently disabled");
        };

        // Allow overwrite with explicit flag (default: false - non-destructive)
        const overwrite = req.body?.overwrite === true;

        // Homepage entity types ONLY - do not translate other CMS content
        const HOMEPAGE_ENTITY_TYPES = [
          "homepage_section",
          "homepage_card",
          "experience_category",
          "region_link",
          "hero_slide",
          "homepage_cta",
          "homepage_seo_meta",
        ] as const;

        // Get English translations for homepage entities only
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

        // Get ALL existing translations for homepage entities (to check what exists)
        const existingTranslations = await db
          .select()
          .from(cmsTranslations)
          .where(inArray(cmsTranslations.entityType, [...HOMEPAGE_ENTITY_TYPES]));

        // Build a Set for O(1) lookup: "entityType:entityId:locale:field"
        const existingKeys = new Set(
          existingTranslations
            .filter(t => t.locale !== "en" && t.value && t.value.trim() !== "")
            .map(t => `${t.entityType}:${t.entityId}:${t.locale}:${t.field}`)
        );

        // Get target locales (exclude 'en')
        const targetLocales = SUPPORTED_LOCALES.filter(l => l.code !== "en").map(l => l.code);

        let translatedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        // Process translations for each target locale
        for (const targetLocale of targetLocales) {
          for (const engTrans of englishTranslations) {
            const result = await translateSingleHomepageEntry(
              engTrans,
              targetLocale,
              overwrite,
              existingKeys,
              translateText
            );
            if (result === "skipped") skippedCount++;
            else if (result === "translated") translatedCount++;
            else if (result) errors.push(result);
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
      } catch {
        res.status(500).json({ error: "Failed to generate translations" });
      }
    }
  );
}
