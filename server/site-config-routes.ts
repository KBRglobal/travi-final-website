import { Router, Request, Response } from "express";
import { db } from "./db";
import {
  navigationMenus,
  navigationMenuItems,
  footerSections,
  footerLinks,
  staticPages,
  homepageSections,
  siteSettings,
} from "@shared/schema";
import { eq, asc } from "drizzle-orm";
import { clearBotBlockingCache } from "./security";

const router = Router();

// ============================================================================
// NAVIGATION MENUS
// ============================================================================

router.get("/navigation", async (_req: Request, res: Response) => {
  try {
    const menus = await db.select().from(navigationMenus).where(eq(navigationMenus.isActive, true));
    const items = await db
      .select()
      .from(navigationMenuItems)
      .orderBy(asc(navigationMenuItems.sortOrder));

    const menusWithItems = menus.map(menu => ({
      ...menu,
      items: items.filter(item => item.menuId === menu.id),
    }));

    res.json(menusWithItems);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch navigation" });
  }
});

router.get("/navigation/:slug", async (req: Request, res: Response) => {
  try {
    const [menu] = await db
      .select()
      .from(navigationMenus)
      .where(eq(navigationMenus.slug, req.params.slug));
    if (!menu) {
      return res.status(404).json({ error: "Menu not found" });
    }

    const items = await db
      .select()
      .from(navigationMenuItems)
      .where(eq(navigationMenuItems.menuId, menu.id))
      .orderBy(asc(navigationMenuItems.sortOrder));

    res.json({ ...menu, items });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});

router.post("/navigation", async (req: Request, res: Response) => {
  try {
    const [menu] = await db.insert(navigationMenus).values(req.body).returning();
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: "Failed to create menu" });
  }
});

router.put("/navigation/:id", async (req: Request, res: Response) => {
  try {
    const [menu] = await db
      .update(navigationMenus)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(navigationMenus.id, req.params.id))
      .returning();
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: "Failed to update menu" });
  }
});

router.post("/navigation/:menuId/items", async (req: Request, res: Response) => {
  try {
    const [item] = await db
      .insert(navigationMenuItems)
      .values({
        ...req.body,
        menuId: req.params.menuId,
      })
      .returning();
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

router.put("/navigation/items/:id", async (req: Request, res: Response) => {
  try {
    const [item] = await db
      .update(navigationMenuItems)
      .set(req.body)
      .where(eq(navigationMenuItems.id, req.params.id))
      .returning();
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

router.delete("/navigation/items/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(navigationMenuItems).where(eq(navigationMenuItems.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

router.put("/navigation/items/reorder", async (req: Request, res: Response) => {
  try {
    const { items } = req.body as { items: { id: string; sortOrder: number }[] };
    for (const item of items) {
      await db
        .update(navigationMenuItems)
        .set({ sortOrder: item.sortOrder } as any)
        .where(eq(navigationMenuItems.id, item.id));
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to reorder menu items" });
  }
});

// ============================================================================
// FOOTER
// ============================================================================

router.get("/footer", async (_req: Request, res: Response) => {
  try {
    const sections = await db
      .select()
      .from(footerSections)
      .where(eq(footerSections.isActive, true))
      .orderBy(asc(footerSections.sortOrder));
    const links = await db
      .select()
      .from(footerLinks)
      .where(eq(footerLinks.isActive, true))
      .orderBy(asc(footerLinks.sortOrder));

    const sectionsWithLinks = sections.map(section => ({
      ...section,
      links: links.filter(link => link.sectionId === section.id),
    }));

    res.json(sectionsWithLinks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch footer" });
  }
});

router.post("/footer/sections", async (req: Request, res: Response) => {
  try {
    const [section] = await db.insert(footerSections).values(req.body).returning();
    res.json(section);
  } catch (error) {
    res.status(500).json({ error: "Failed to create footer section" });
  }
});

router.put("/footer/sections/:id", async (req: Request, res: Response) => {
  try {
    const [section] = await db
      .update(footerSections)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(footerSections.id, req.params.id))
      .returning();
    res.json(section);
  } catch (error) {
    res.status(500).json({ error: "Failed to update footer section" });
  }
});

router.delete("/footer/sections/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(footerSections).where(eq(footerSections.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete footer section" });
  }
});

router.post("/footer/links", async (req: Request, res: Response) => {
  try {
    const [link] = await db.insert(footerLinks).values(req.body).returning();
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: "Failed to create footer link" });
  }
});

router.put("/footer/links/:id", async (req: Request, res: Response) => {
  try {
    const [link] = await db
      .update(footerLinks)
      .set(req.body)
      .where(eq(footerLinks.id, req.params.id))
      .returning();
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: "Failed to update footer link" });
  }
});

router.delete("/footer/links/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(footerLinks).where(eq(footerLinks.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete footer link" });
  }
});

// ============================================================================
// STATIC PAGES
// ============================================================================

router.get("/pages", async (_req: Request, res: Response) => {
  try {
    const pages = await db.select().from(staticPages);
    res.json(pages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch static pages" });
  }
});

// Get page by ID (for admin editor)
router.get("/pages/by-id/:id", async (req: Request, res: Response) => {
  try {
    const [page] = await db.select().from(staticPages).where(eq(staticPages.id, req.params.id));
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

// Get page by slug (for public pages)
router.get("/pages/:slug", async (req: Request, res: Response) => {
  try {
    const [page] = await db.select().from(staticPages).where(eq(staticPages.slug, req.params.slug));
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

router.post("/pages", async (req: Request, res: Response) => {
  try {
    const [page] = await db.insert(staticPages).values(req.body).returning();
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to create page" });
  }
});

router.put("/pages/:id", async (req: Request, res: Response) => {
  try {
    const [page] = await db
      .update(staticPages)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(staticPages.id, req.params.id))
      .returning();
    res.json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to update page" });
  }
});

router.delete("/pages/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(staticPages).where(eq(staticPages.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete page" });
  }
});

// Translate page to a specific language
router.post("/pages/:id/translate", async (req: Request, res: Response) => {
  try {
    const { targetLocale, title, metaTitle, metaDescription, blocks } = req.body;

    if (!targetLocale) {
      return res.status(400).json({ error: "targetLocale is required" });
    }

    // Lazy import translation service to avoid circular dependencies
    const { translateText } = await import("./services/translation-service");

    // Helper to translate with fallback
    const translateWithFallback = async (
      text: string,
      contentType: "title" | "description" | "body"
    ): Promise<string> => {
      if (!text || text.trim() === "") return text;
      const result = await translateText({
        text,
        sourceLocale: "en",
        targetLocale,
        contentType,
      });
      return result.success ? result.translatedText : text;
    };

    // Translate title and meta fields with fallbacks
    const translatedTitleText = await translateWithFallback(title || "", "title");
    const translatedMetaTitleText = await translateWithFallback(metaTitle || "", "title");
    const translatedMetaDescriptionText = await translateWithFallback(
      metaDescription || "",
      "description"
    );

    // Recursive helper to translate nested data
    const translateValue = async (value: unknown, key: string): Promise<unknown> => {
      if (typeof value === "string" && value.trim() !== "") {
        // Skip URLs and technical fields
        if (
          key.toLowerCase().includes("url") ||
          key.toLowerCase().includes("src") ||
          key.toLowerCase().includes("image") ||
          key.toLowerCase().includes("icon")
        ) {
          return value;
        }
        return await translateWithFallback(
          value,
          key.toLowerCase().includes("title") ? "title" : "body"
        );
      } else if (Array.isArray(value)) {
        return await Promise.all(
          value.map(async (item: unknown) => {
            if (typeof item === "string" && item.trim() !== "") {
              // Handle string arrays (like tips, localTips, etc.)
              return await translateWithFallback(item, "body");
            } else if (typeof item === "object" && item !== null) {
              // Handle object arrays (like FAQ items)
              const translatedItem: Record<string, unknown> = {};
              for (const [itemKey, itemValue] of Object.entries(item as Record<string, unknown>)) {
                translatedItem[itemKey] = await translateValue(itemValue, itemKey);
              }
              return translatedItem;
            }
            return item;
          })
        );
      } else if (typeof value === "object" && value !== null) {
        // Handle nested objects
        const translatedObj: Record<string, unknown> = {};
        for (const [objKey, objValue] of Object.entries(value as Record<string, unknown>)) {
          translatedObj[objKey] = await translateValue(objValue, objKey);
        }
        return translatedObj;
      }
      return value;
    };

    // Translate blocks
    const translatedBlocks = await Promise.all(
      (blocks || []).map(
        async (block: { id: string; type: string; data: Record<string, unknown> }) => {
          const translatedData: Record<string, unknown> = {};

          for (const [key, value] of Object.entries(block.data)) {
            translatedData[key] = await translateValue(value, key);
          }

          return { ...block, data: translatedData };
        }
      )
    );

    // Get current page
    const [page] = await db.select().from(staticPages).where(eq(staticPages.id, req.params.id));
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }

    // Update translations JSONB
    const currentTranslations = (page.translations as Record<string, unknown>) || {};
    const updatedTranslations = {
      ...currentTranslations,
      [targetLocale]: {
        title: translatedTitleText,
        metaTitle: translatedMetaTitleText,
        metaDescription: translatedMetaDescriptionText,
        blocks: translatedBlocks,
        translatedAt: new Date().toISOString(),
      },
    };

    // Save to database
    await db
      .update(staticPages)
      .set({ translations: updatedTranslations, updatedAt: new Date() } as any)
      .where(eq(staticPages.id, req.params.id));

    res.json({
      success: true,
      locale: targetLocale,
      title: translatedTitleText,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to translate page" });
  }
});

// ============================================================================
// HOMEPAGE SECTIONS
// ============================================================================

router.get("/homepage", async (_req: Request, res: Response) => {
  try {
    const sections = await db
      .select()
      .from(homepageSections)
      .where(eq((homepageSections as any).isActive, true))
      .orderBy(asc(homepageSections.sortOrder));
    res.json(sections);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch homepage sections" });
  }
});

router.post("/homepage", async (req: Request, res: Response) => {
  try {
    const [section] = await db.insert(homepageSections).values(req.body).returning();
    res.json(section);
  } catch (error) {
    res.status(500).json({ error: "Failed to create homepage section" });
  }
});

router.put("/homepage/:id", async (req: Request, res: Response) => {
  try {
    const [section] = await db
      .update(homepageSections)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(homepageSections.id, req.params.id))
      .returning();
    res.json(section);
  } catch (error) {
    res.status(500).json({ error: "Failed to update homepage section" });
  }
});

router.delete("/homepage/:id", async (req: Request, res: Response) => {
  try {
    await db.delete(homepageSections).where(eq(homepageSections.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete homepage section" });
  }
});

// ============================================================================
// SITE SETTINGS (using existing key-value pattern)
// ============================================================================

router.get("/settings", async (_req: Request, res: Response) => {
  try {
    const settings = await db.select().from(siteSettings);
    const settingsMap: Record<string, unknown> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }
    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings/:key", async (req: Request, res: Response) => {
  try {
    const { value, category, description } = req.body;
    const existing = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, req.params.key));

    if (existing.length > 0) {
      const [setting] = await db
        .update(siteSettings)
        .set({ value, updatedAt: new Date() } as any)
        .where(eq(siteSettings.key, req.params.key))
        .returning();

      // Clear bot blocking cache when this setting changes
      if (req.params.key === "botBlockingDisabled") {
        clearBotBlockingCache();
      }

      res.json(setting);
    } else {
      const [setting] = await db
        .insert(siteSettings)
        .values({
          key: req.params.key,
          value,
          category: category || "general",
          description,
        } as any)
        .returning();

      // Clear bot blocking cache when this setting changes
      if (req.params.key === "botBlockingDisabled") {
        clearBotBlockingCache();
      }

      res.json(setting);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to update setting" });
  }
});

// ============================================================================
// SEED DATA - Initialize with existing hardcoded content
// ============================================================================

router.post("/seed", async (_req: Request, res: Response) => {
  try {
    // Check if data already exists
    const existingMenus = await db.select().from(navigationMenus);
    const existingSections = await db.select().from(footerSections);

    if (existingMenus.length > 0 || existingSections.length > 0) {
      return res.json({ message: "Data already seeded", skipped: true });
    }

    // Create main navigation menu
    const [mainMenu] = await db
      .insert(navigationMenus)
      .values({
        name: "Main Navigation",
        slug: "main",
        location: "header",
        isActive: true,
      } as any)
      .returning();

    // Add navigation items (matching current hardcoded navLinks)
    const navItems = [
      { label: "Attractions", labelHe: "", href: "/attractions", icon: "Camera", sortOrder: 1 },
      { label: "Hotels", labelHe: "", href: "/hotels", icon: "Building2", sortOrder: 2 },
      { label: "Districts", labelHe: "", href: "/districts", icon: "MapPin", sortOrder: 3 },
      { label: "Dining", labelHe: "", href: "/dining", icon: "Utensils", sortOrder: 4 },
      { label: "Shopping", labelHe: "", href: "/shopping", icon: "ShoppingBag", sortOrder: 5 },
      { label: "News", labelHe: "", href: "/news", icon: "Compass", sortOrder: 6 },
      {
        label: "Real Estate",
        labelHe: "",
        href: "/destinations/dubai/off-plan",
        icon: "Sparkles",
        sortOrder: 7,
        isHighlighted: true,
        highlightStyle: "gradient",
      },
    ];

    for (const item of navItems) {
      await db.insert(navigationMenuItems).values({
        menuId: mainMenu.id,
        ...item,
        isActive: true,
        openInNewTab: false,
      } as any);
    }

    // Create footer sections
    const footerSectionsData = [
      { title: "Explore", titleHe: "", slug: "explore", sortOrder: 1 },
      { title: "Featured Guides", titleHe: "", slug: "guides", sortOrder: 2 },
      { title: "Tools", titleHe: "", slug: "tools", sortOrder: 3 },
      { title: "Social", titleHe: "", slug: "social", sortOrder: 4 },
    ];

    const createdSections: Record<string, string> = {};
    for (const section of footerSectionsData) {
      const [created] = await db
        .insert(footerSections)
        .values({
          ...section,
          isActive: true,
        } as any)
        .returning();
      createdSections[section.slug] = created.id;
    }

    // Add explore links
    const exploreLinksData = [
      { label: "Attractions", labelHe: "", href: "/attractions", icon: "Camera", sortOrder: 1 },
      { label: "Hotels", labelHe: "", href: "/hotels", icon: "Building2", sortOrder: 2 },
      { label: "Districts", labelHe: "", href: "/districts", icon: "MapPin", sortOrder: 3 },
      { label: "Dining", labelHe: "", href: "/dining", icon: "Utensils", sortOrder: 4 },
      { label: "News", labelHe: "", href: "/news", icon: "Compass", sortOrder: 5 },
    ];
    for (const link of exploreLinksData) {
      await db
        .insert(footerLinks)
        .values({
          sectionId: createdSections.explore,
          ...link,
          isActive: true,
          openInNewTab: false,
        } as any);
    }

    // Add featured guides
    const guidesData = [
      {
        label: "Free Things to Do",
        labelHe: "",
        href: "/destinations/dubai/free-things-to-do",
        icon: "Gift",
        sortOrder: 1,
      },
      {
        label: "Open 24 Hours",
        labelHe: "",
        href: "/destinations/dubai/24-hours-open",
        icon: "Coffee",
        sortOrder: 2,
      },
      {
        label: "Tribute to Sheikh Mohammed",
        labelHe: "",
        href: "/destinations/dubai/sheikh-mohammed",
        icon: "Crown",
        sortOrder: 3,
      },
      {
        label: "Laws for Tourists",
        labelHe: "",
        href: "/destinations/dubai/laws-for-tourists",
        icon: "Scale",
        sortOrder: 4,
      },
    ];
    for (const link of guidesData) {
      await db
        .insert(footerLinks)
        .values({
          sectionId: createdSections.guides,
          ...link,
          isActive: true,
          openInNewTab: false,
        } as any);
    }

    // Add tools
    const toolsData = [
      { label: "Currency Converter", labelHe: "", href: "/tools-currency-converter", sortOrder: 1 },
      { label: "ROI Calculator", labelHe: "", href: "/tools-roi-calculator", sortOrder: 2 },
      {
        label: "Mortgage Calculator",
        labelHe: "",
        href: "/tools-mortgage-calculator",
        sortOrder: 3,
      },
      { label: "Glossary", labelHe: "", href: "/glossary", sortOrder: 4 },
    ];
    for (const link of toolsData) {
      await db
        .insert(footerLinks)
        .values({
          sectionId: createdSections.tools,
          ...link,
          isActive: true,
          openInNewTab: false,
        } as any);
    }

    // Add social links
    const socialData = [
      {
        label: "Instagram",
        href: "https://instagram.com/travidubai",
        icon: "SiInstagram",
        sortOrder: 1,
        openInNewTab: true,
      },
      {
        label: "Facebook",
        href: "https://facebook.com/travidubai",
        icon: "SiFacebook",
        sortOrder: 2,
        openInNewTab: true,
      },
      {
        label: "X",
        href: "https://x.com/travidubai",
        icon: "SiX",
        sortOrder: 3,
        openInNewTab: true,
      },
      {
        label: "YouTube",
        href: "https://youtube.com/@travidubai",
        icon: "SiYoutube",
        sortOrder: 4,
        openInNewTab: true,
      },
      {
        label: "TikTok",
        href: "https://tiktok.com/@travidubai",
        icon: "SiTiktok",
        sortOrder: 5,
        openInNewTab: true,
      },
    ];
    for (const link of socialData) {
      await db
        .insert(footerLinks)
        .values({ sectionId: createdSections.social, ...link, isActive: true } as any);
    }

    res.json({
      message: "Seed data created successfully",
      navigation: { menuId: mainMenu.id, itemCount: navItems.length },
      footer: { sectionCount: footerSectionsData.length },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to seed data" });
  }
});

// ============================================================================
// PUBLIC ENDPOINTS (no auth required for frontend)
// ============================================================================

router.get("/public/navigation/:slug", async (req: Request, res: Response) => {
  try {
    const [menu] = await db
      .select()
      .from(navigationMenus)
      .where(eq(navigationMenus.slug, req.params.slug));

    if (!menu || !menu.isActive) {
      return res.json({ items: [] });
    }

    const items = await db
      .select()
      .from(navigationMenuItems)
      .where(eq(navigationMenuItems.menuId, menu.id))
      .orderBy(asc(navigationMenuItems.sortOrder));

    const activeItems = items.filter(item => item.isActive);
    res.json({ ...menu, items: activeItems });
  } catch (error) {
    res.json({ items: [] });
  }
});

router.get("/public/footer", async (_req: Request, res: Response) => {
  try {
    const sections = await db
      .select()
      .from(footerSections)
      .where(eq(footerSections.isActive, true))
      .orderBy(asc(footerSections.sortOrder));

    const links = await db
      .select()
      .from(footerLinks)
      .where(eq(footerLinks.isActive, true))
      .orderBy(asc(footerLinks.sortOrder));

    const sectionsWithLinks = sections.map(section => ({
      ...section,
      links: links.filter(link => link.sectionId === section.id),
    }));

    res.json(sectionsWithLinks);
  } catch (error) {
    res.json([]);
  }
});

// Public endpoint for static pages (About, Privacy, Terms, etc.)
router.get("/public/pages/:slug", async (req: Request, res: Response) => {
  try {
    const [page] = await db.select().from(staticPages).where(eq(staticPages.slug, req.params.slug));

    if (!page || !page.isActive) {
      return res.status(404).json({ error: "Page not found" });
    }

    res.json(page);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch page" });
  }
});

export function registerSiteConfigRoutes(app: Router) {
  app.use("/api/site-config", router);
}
