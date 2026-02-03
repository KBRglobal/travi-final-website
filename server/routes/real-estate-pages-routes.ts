/**
 * Real Estate Pages Routes
 * CRUD for CMS editable real estate content pages
 */

import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { realEstatePages, insertRealEstatePageSchema } from "@shared/schema";
import { requireAuth, requirePermission, type AuthRequest } from "../security";

export function registerRealEstatePagesRoutes(app: Express): void {
  // ============================================================================
  // REAL ESTATE PAGES - CMS EDITABLE CONTENT
  // ============================================================================

  // Get all real estate pages
  app.get("/api/real-estate-pages", requireAuth, async (req, res) => {
    try {
      const { category } = req.query;
      let query = db.select().from(realEstatePages);

      if (category && typeof category === "string") {
        query = query.where(eq(realEstatePages.category, category as any)) as any;
      }

      const pages = await query.orderBy(realEstatePages.title);
      res.json({ pages });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch real estate pages" });
    }
  });

  // Get single real estate page by pageKey
  app.get("/api/real-estate-pages/:pageKey", requireAuth, async (req, res) => {
    try {
      const { pageKey } = req.params;
      const [page] = await db
        .select()
        .from(realEstatePages)
        .where(eq(realEstatePages.pageKey, pageKey));

      if (!page) {
        return res.status(404).json({ error: "Page not found" });
      }

      res.json(page);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch real estate page" });
    }
  });

  // Create or update real estate page (upsert)
  app.post("/api/real-estate-pages", requirePermission("canEdit"), async (req, res) => {
    try {
      const parsed = insertRealEstatePageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      // Check if page exists
      const parsedData = parsed.data as { pageKey: string; [key: string]: unknown };
      const [existing] = await db
        .select()
        .from(realEstatePages)
        .where(eq(realEstatePages.pageKey, parsedData.pageKey));

      if (existing) {
        // Update existing
        const [updated] = await db
          .update(realEstatePages)
          .set({
            ...parsedData,
            lastEditedBy: userId,
            updatedAt: new Date(),
          } as any)
          .where(eq(realEstatePages.pageKey, parsedData.pageKey))
          .returning();
        res.json(updated);
      } else {
        // Create new
        const [created] = await db
          .insert(realEstatePages)
          .values({
            ...parsedData,
            lastEditedBy: userId,
          } as any)
          .returning();
        res.status(201).json(created);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to save real estate page" });
    }
  });

  // Update real estate page
  app.patch("/api/real-estate-pages/:pageKey", requirePermission("canEdit"), async (req, res) => {
    try {
      const { pageKey } = req.params;
      const authReq = req as AuthRequest;
      const userId = authReq.user?.claims?.sub;

      // Validate with partial schema
      const partialSchema = insertRealEstatePageSchema.partial();
      const parsed = partialSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.errors });
      }

      const [updated] = await db
        .update(realEstatePages)
        .set({
          ...parsed.data,
          lastEditedBy: userId,
          updatedAt: new Date(),
        } as any)
        .where(eq(realEstatePages.pageKey, pageKey))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Page not found" });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update real estate page" });
    }
  });

  // Delete real estate page
  app.delete(
    "/api/real-estate-pages/:pageKey",
    requirePermission("canDelete"),
    async (req, res) => {
      try {
        const { pageKey } = req.params;

        const [deleted] = await db
          .delete(realEstatePages)
          .where(eq(realEstatePages.pageKey, pageKey))
          .returning();

        if (!deleted) {
          return res.status(404).json({ error: "Page not found" });
        }

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete real estate page" });
      }
    }
  );

  // Seed initial real estate pages from static data
  app.post(
    "/api/real-estate-pages/seed",
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const STATIC_PAGES = [
          // Guides
          { pageKey: "investment-guide", category: "guide", title: "Investment Guide" },
          { pageKey: "how-to-buy", category: "guide", title: "How to Buy Off-Plan" },
          { pageKey: "payment-plans", category: "guide", title: "Payment Plans" },
          { pageKey: "best-2026", category: "guide", title: "Best Projects 2026" },
          { pageKey: "roi-guide", category: "pillar", title: "ROI & Rental Yields Guide" },
          { pageKey: "legal-guide", category: "pillar", title: "Legal & Security Guide" },
          { pageKey: "glossary", category: "guide", title: "Glossary" },
          // Calculators
          { pageKey: "roi-calculator", category: "calculator", title: "ROI Calculator" },
          {
            pageKey: "payment-calculator",
            category: "calculator",
            title: "Payment Plan Calculator",
          },
          {
            pageKey: "affordability-calculator",
            category: "calculator",
            title: "Affordability Calculator",
          },
          { pageKey: "currency-converter", category: "calculator", title: "Currency Converter" },
          { pageKey: "stamp-duty-calculator", category: "calculator", title: "Fees Calculator" },
          {
            pageKey: "rental-yield-calculator",
            category: "calculator",
            title: "Rental Yield Calculator",
          },
          { pageKey: "mortgage-calculator", category: "calculator", title: "Mortgage Calculator" },
          // Comparisons
          { pageKey: "off-plan-vs-ready", category: "comparison", title: "Off-Plan vs Ready" },
          { pageKey: "jvc-vs-dubai-south", category: "comparison", title: "JVC vs Dubai South" },
          { pageKey: "emaar-vs-damac", category: "comparison", title: "Emaar vs DAMAC" },
          { pageKey: "downtown-vs-marina", category: "comparison", title: "Downtown vs Marina" },
          { pageKey: "crypto-vs-bank", category: "comparison", title: "Crypto vs Bank Payment" },
          { pageKey: "villa-vs-apartment", category: "comparison", title: "Villa vs Apartment" },
          { pageKey: "studio-vs-1bed", category: "comparison", title: "Studio vs 1-Bedroom" },
          // Case Studies
          { pageKey: "case-jvc-investor", category: "case_study", title: "JVC Studio Investor" },
          { pageKey: "case-crypto-buyer", category: "case_study", title: "Crypto Buyer Success" },
          { pageKey: "case-golden-visa", category: "case_study", title: "Golden Visa Journey" },
          { pageKey: "case-expat-family", category: "case_study", title: "Expat Family Home" },
          {
            pageKey: "case-investor-flip",
            category: "case_study",
            title: "Investor Flip Strategy",
          },
          { pageKey: "case-portfolio", category: "case_study", title: "Portfolio Diversification" },
          { pageKey: "case-launch-day", category: "case_study", title: "Off-Plan Launch Day" },
          { pageKey: "case-retirement", category: "case_study", title: "Retirement Planning" },
          // Locations
          { pageKey: "off-plan-jvc", category: "location", title: "JVC Off-Plan" },
          { pageKey: "off-plan-dubai-south", category: "location", title: "Dubai South Off-Plan" },
          {
            pageKey: "off-plan-business-bay",
            category: "location",
            title: "Business Bay Off-Plan",
          },
          {
            pageKey: "off-plan-dubai-marina",
            category: "location",
            title: "Dubai Marina Off-Plan",
          },
          {
            pageKey: "off-plan-creek-harbour",
            category: "location",
            title: "Creek Harbour Off-Plan",
          },
          {
            pageKey: "off-plan-palm-jumeirah",
            category: "location",
            title: "Palm Jumeirah Off-Plan",
          },
          { pageKey: "off-plan-al-furjan", category: "location", title: "Al Furjan Off-Plan" },
          // Developers
          { pageKey: "developer-emaar", category: "developer", title: "Emaar Properties" },
          { pageKey: "developer-damac", category: "developer", title: "DAMAC Properties" },
          { pageKey: "developer-nakheel", category: "developer", title: "Nakheel" },
          { pageKey: "developer-meraas", category: "developer", title: "Meraas" },
          { pageKey: "developer-sobha", category: "developer", title: "Sobha Realty" },
        ];

        let created = 0;
        let skipped = 0;

        for (const page of STATIC_PAGES) {
          const [existing] = await db
            .select()
            .from(realEstatePages)
            .where(eq(realEstatePages.pageKey, page.pageKey));

          if (!existing) {
            await db.insert(realEstatePages).values({
              pageKey: page.pageKey,
              category: page.category as any,
              title: page.title,
            });
            created++;
          } else {
            skipped++;
          }
        }

        res.json({ success: true, created, skipped, total: STATIC_PAGES.length });
      } catch (error) {
        res.status(500).json({ error: "Failed to seed real estate pages" });
      }
    }
  );
}
