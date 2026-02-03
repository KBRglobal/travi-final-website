/**
 * Page Layout Routes
 * Live Edit System and Sitemaps for Multilingual SEO Support
 */

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { eq, and } from "drizzle-orm";
import { pageLayouts } from "@shared/schema";
import { storage } from "../storage";
import { requireAuth } from "../security";
import { SUPPORTED_LOCALES } from "@shared/schema";

export function registerPageLayoutRoutes(app: Express): void {
  // ============================================================================
  // PAGE LAYOUTS - Live Edit System
  // ============================================================================

  // Get layout for a page
  app.get("/api/layouts/:slug", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;

      const layout = await db.select().from(pageLayouts).where(eq(pageLayouts.slug, slug)).limit(1);

      if (layout.length === 0) {
        return res.status(404).json({ error: "Layout not found" });
      }

      res.json(layout[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // Save draft layout
  app.put("/api/layouts/:slug/draft", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;
      const { components } = req.body;
      const user = req.user as any;
      const userId = user?.claims?.sub;

      // Check if layout exists
      const existing = await db
        .select()
        .from(pageLayouts)
        .where(eq(pageLayouts.slug, slug))
        .limit(1);

      if (existing.length === 0) {
        // Create new layout
        const [newLayout] = await db
          .insert(pageLayouts)
          .values({
            slug,
            draftComponents: components,
            status: "draft",
            draftUpdatedAt: new Date(),
            createdBy: userId,
            updatedBy: userId,
          } as any)
          .returning();

        return res.json(newLayout);
      }

      // Update existing layout
      const [updated] = await db
        .update(pageLayouts)
        .set({
          draftComponents: components,
          draftUpdatedAt: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
        } as any)
        .where(eq(pageLayouts.slug, slug))
        .returning();

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to save draft" });
    }
  });

  // Publish layout (copy draft to published)
  app.post("/api/layouts/:slug/publish", requireAuth, async (req, res) => {
    try {
      const { slug } = req.params;
      const user = req.user as any;
      const userId = user?.claims?.sub;

      // Get user role from database
      const dbUser = userId ? await storage.getUser(userId) : null;
      const userRole = dbUser?.role || "viewer";

      // Check user role - only admin/editor can publish
      if (!dbUser || !["admin", "editor"].includes(userRole)) {
        return res.status(403).json({ error: "Insufficient permissions to publish" });
      }

      const existing = await db
        .select()
        .from(pageLayouts)
        .where(eq(pageLayouts.slug, slug))
        .limit(1);

      if (existing.length === 0) {
        return res.status(404).json({ error: "Layout not found" });
      }

      const layout = existing[0];

      // Copy draft to published
      const [published] = await db
        .update(pageLayouts)
        .set({
          components: layout.draftComponents || [],
          status: "published",
          publishedAt: new Date(),
          updatedBy: userId,
          updatedAt: new Date(),
        } as any)
        .where(eq(pageLayouts.slug, slug))
        .returning();

      res.json(published);
    } catch (error) {
      res.status(500).json({ error: "Failed to publish layout" });
    }
  });

  // Get published layout (for public viewing)
  app.get("/api/public/layouts/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      const layout = await db
        .select({
          slug: pageLayouts.slug,
          title: pageLayouts.title,
          components: pageLayouts.components,
          publishedAt: pageLayouts.publishedAt,
        })
        .from(pageLayouts)
        .where(and(eq(pageLayouts.slug, slug), eq(pageLayouts.status, "published")))
        .limit(1);

      if (layout.length === 0) {
        return res.status(404).json({ error: "Layout not found" });
      }

      res.json(layout[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch layout" });
    }
  });

  // ============================================================================
  // SITEMAPS - Multilingual SEO Support (50 languages)
  // ============================================================================

  // Main sitemap index - lists all language-specific sitemaps
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const { generateSitemapIndex } = await import("../services/sitemap");
      const sitemapIndex = await generateSitemapIndex();
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(sitemapIndex);
    } catch (error) {
      res.status(500).set("Content-Type", "text/plain").send("Error generating sitemap");
    }
  });

  // Language-specific sitemaps (e.g., /sitemap-en.xml, /sitemap-ar.xml)
  app.get("/sitemap-:locale.xml", async (req, res) => {
    try {
      const locale = req.params.locale as any;

      // Validate locale
      if (!SUPPORTED_LOCALES.some(l => l.code === locale)) {
        return res.status(404).set("Content-Type", "text/plain").send("Sitemap not found");
      }

      const { generateLocaleSitemap } = await import("../services/sitemap");
      const sitemap = await generateLocaleSitemap(locale);
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
      res.send(sitemap);
    } catch (error) {
      res.status(500).set("Content-Type", "text/plain").send("Error generating sitemap");
    }
  });

  // Robots.txt with sitemap references
  app.get("/robots.txt", async (req, res) => {
    try {
      const { generateRobotsTxt } = await import("../services/sitemap");
      const robotsTxt = generateRobotsTxt();
      res.set("Content-Type", "text/plain; charset=utf-8");
      res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.send(robotsTxt);
    } catch (error) {
      res.status(500).set("Content-Type", "text/plain").send("Error generating robots.txt");
    }
  });
}
