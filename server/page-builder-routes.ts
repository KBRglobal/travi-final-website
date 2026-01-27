import { Router, Request, Response } from "express";
import { db } from "./db";
import {
  editablePages,
  pageSections,
  sectionVersions,
  insertEditablePageSchema,
  insertPageSectionSchema,
  insertSectionVersionSchema,
} from "@shared/schema";
import { eq, asc, desc, and, max } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import { z } from "zod";

const router = Router();

// ============================================================================
// EDITABLE PAGES - CRUD Operations
// ============================================================================

// GET /api/page-builder/pages - List all editable pages
router.get("/pages", isAuthenticated, async (_req: Request, res: Response) => {
  try {
    const pages = await db.select().from(editablePages).orderBy(desc(editablePages.updatedAt));

    res.json(pages);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch pages",
      heGuide: "",
    });
  }
});

// GET /api/page-builder/pages/:slug - Get page with all sections
router.get("/pages/:slug", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const [page] = await db
      .select()
      .from(editablePages)
      .where(eq(editablePages.slug, req.params.slug));

    if (!page) {
      return res.status(404).json({
        error: "Page not found",
        heGuide: "",
      });
    }

    const sections = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.pageId, page.id))
      .orderBy(asc(pageSections.sortOrder));

    res.json({ ...page, sections });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch page",
      heGuide: "",
    });
  }
});

// POST /api/page-builder/pages - Create new editable page
router.post("/pages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = insertEditablePageSchema.parse(req.body);

    const existingPage = await db
      .select()
      .from(editablePages)
      .where(eq(editablePages.slug, (validatedData as any).slug));

    if (existingPage.length > 0) {
      return res.status(400).json({
        error: "Page with this slug already exists",
        heGuide: "",
      });
    }

    const authReq = req as Request & { user?: { claims?: { sub?: string } } };
    const userId = authReq.user?.claims?.sub;

    const [page] = await db
      .insert(editablePages)
      .values({
        ...validatedData,
        lastEditedBy: userId,
      } as any)
      .returning();

    res.status(201).json(page);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors,
        heGuide: "",
      });
    }

    res.status(500).json({
      error: "Failed to create page",
      heGuide: "",
    });
  }
});

// PUT /api/page-builder/pages/:id - Update page metadata
router.put("/pages/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const authReq = req as Request & { user?: { claims?: { sub?: string } } };
    const userId = authReq.user?.claims?.sub;

    const [page] = await db
      .update(editablePages)
      .set({
        ...req.body,
        lastEditedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(editablePages.id, req.params.id))
      .returning();

    if (!page) {
      return res.status(404).json({
        error: "Page not found",
        heGuide: "",
      });
    }

    res.json(page);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update page",
      heGuide: "",
    });
  }
});

// DELETE /api/page-builder/pages/:id - Delete page (cascades to sections)
router.delete("/pages/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const [deletedPage] = await db
      .delete(editablePages)
      .where(eq(editablePages.id, req.params.id))
      .returning();

    if (!deletedPage) {
      return res.status(404).json({
        error: "Page not found",
        heGuide: "",
      });
    }

    res.json({
      success: true,
      deletedPage,
      heGuide: "",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete page",
      heGuide: "",
    });
  }
});

// ============================================================================
// PAGE SECTIONS - CRUD Operations
// ============================================================================

// GET /api/page-builder/sections/:pageId - Get sections for a page
router.get("/sections/:pageId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const sections = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.pageId, req.params.pageId))
      .orderBy(asc(pageSections.sortOrder));

    res.json(sections);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch sections",
      heGuide: "",
    });
  }
});

// POST /api/page-builder/sections - Create new section
router.post("/sections", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = insertPageSectionSchema.parse(req.body);

    const authReq = req as Request & { user?: { claims?: { sub?: string } } };
    const userId = authReq.user?.claims?.sub;

    const existingSections = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.pageId, (validatedData as any).pageId))
      .orderBy(desc(pageSections.sortOrder));

    const maxSortOrder = existingSections.length > 0 ? existingSections[0].sortOrder || 0 : 0;

    const [section] = await db
      .insert(pageSections)
      .values({
        ...validatedData,
        sortOrder: (validatedData as any).sortOrder ?? maxSortOrder + 1,
        lastEditedBy: userId,
      } as any)
      .returning();

    await db.insert(sectionVersions).values({
      sectionId: section.id,
      versionNumber: 1,
      data: {
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        buttonText: section.buttonText,
        buttonLink: section.buttonLink,
        titleHe: section.titleHe,
        subtitleHe: section.subtitleHe,
        descriptionHe: section.descriptionHe,
        buttonTextHe: section.buttonTextHe,
        backgroundImage: section.backgroundImage,
        backgroundVideo: section.backgroundVideo,
        images: section.images,
        data: section.data,
        dataHe: section.dataHe,
      },
      changedBy: userId,
      changeDescription: "Initial creation",
    } as any);

    res.status(201).json(section);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors,
        heGuide: "",
      });
    }

    res.status(500).json({
      error: "Failed to create section",
      heGuide: "",
    });
  }
});

// Shared handler for updating sections (used by both PUT and PATCH)
async function updateSectionHandler(req: Request, res: Response) {
  try {
    const authReq = req as Request & { user?: { claims?: { sub?: string } } };
    const userId = authReq.user?.claims?.sub;

    const [existingSection] = await db
      .select()
      .from(pageSections)
      .where(eq(pageSections.id, req.params.id));

    if (!existingSection) {
      return res.status(404).json({
        error: "Section not found",
        heGuide: "",
      });
    }

    const latestVersion = await db
      .select()
      .from(sectionVersions)
      .where(eq(sectionVersions.sectionId, req.params.id))
      .orderBy(desc(sectionVersions.versionNumber))
      .limit(1);

    const newVersionNumber = latestVersion.length > 0 ? latestVersion[0].versionNumber + 1 : 1;

    const [section] = await db
      .update(pageSections)
      .set({
        ...req.body,
        lastEditedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(pageSections.id, req.params.id))
      .returning();

    await db.insert(sectionVersions).values({
      sectionId: section.id,
      versionNumber: newVersionNumber,
      data: {
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        buttonText: section.buttonText,
        buttonLink: section.buttonLink,
        titleHe: section.titleHe,
        subtitleHe: section.subtitleHe,
        descriptionHe: section.descriptionHe,
        buttonTextHe: section.buttonTextHe,
        backgroundImage: section.backgroundImage,
        backgroundVideo: section.backgroundVideo,
        images: section.images,
        data: section.data,
        dataHe: section.dataHe,
      },
      changedBy: userId,
      changeDescription: req.body.changeDescription || `Updated to version ${newVersionNumber}`,
    } as any);

    res.json({
      ...section,
      versionNumber: newVersionNumber,
      heGuide: "",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update section",
      heGuide: "",
    });
  }
}

// PUT /api/page-builder/sections/:id - Update section (with version history)
router.put("/sections/:id", isAuthenticated, updateSectionHandler);

// PATCH /api/page-builder/sections/:id - Update section (partial updates)
router.patch("/sections/:id", isAuthenticated, updateSectionHandler);

// DELETE /api/page-builder/sections/:id - Delete section
router.delete("/sections/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const [deletedSection] = await db
      .delete(pageSections)
      .where(eq(pageSections.id, req.params.id))
      .returning();

    if (!deletedSection) {
      return res.status(404).json({
        error: "Section not found",
        heGuide: "",
      });
    }

    res.json({
      success: true,
      deletedSection,
      heGuide: "",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete section",
      heGuide: "",
    });
  }
});

// PUT /api/page-builder/sections/reorder - Reorder sections
router.put("/sections/reorder", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { sections: sectionUpdates } = req.body as {
      sections: { id: string; sortOrder: number }[];
    };

    if (!Array.isArray(sectionUpdates) || sectionUpdates.length === 0) {
      return res.status(400).json({
        error: "Invalid sections array",
        heGuide: "",
      });
    }

    const authReq = req as Request & { user?: { claims?: { sub?: string } } };
    const userId = authReq.user?.claims?.sub;

    for (const item of sectionUpdates) {
      await db
        .update(pageSections)
        .set({
          sortOrder: item.sortOrder,
          lastEditedBy: userId,
          updatedAt: new Date(),
        } as any)
        .where(eq(pageSections.id, item.id));
    }

    res.json({
      success: true,
      heGuide: "",
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to reorder sections",
      heGuide: "",
    });
  }
});

// ============================================================================
// SECTION VERSIONS - History
// ============================================================================

// GET /api/page-builder/sections/:id/versions - Get version history
router.get("/sections/:id/versions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const versions = await db
      .select()
      .from(sectionVersions)
      .where(eq(sectionVersions.sectionId, req.params.id))
      .orderBy(desc(sectionVersions.versionNumber));

    res.json(versions);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch section versions",
      heGuide: "",
    });
  }
});

// POST /api/page-builder/sections/:id/restore/:versionNumber - Restore a version
router.post(
  "/sections/:id/restore/:versionNumber",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const versionNumber = parseInt(req.params.versionNumber, 10);

      const [version] = await db
        .select()
        .from(sectionVersions)
        .where(
          and(
            eq(sectionVersions.sectionId, req.params.id),
            eq(sectionVersions.versionNumber, versionNumber)
          )
        );

      if (!version) {
        return res.status(404).json({
          error: "Version not found",
          heGuide: "",
        });
      }

      const authReq = req as Request & { user?: { claims?: { sub?: string } } };
      const userId = authReq.user?.claims?.sub;

      const versionData = version.data as Record<string, unknown>;

      const [restoredSection] = await db
        .update(pageSections)
        .set({
          title: versionData.title as string | null,
          subtitle: versionData.subtitle as string | null,
          description: versionData.description as string | null,
          buttonText: versionData.buttonText as string | null,
          buttonLink: versionData.buttonLink as string | null,
          titleHe: versionData.titleHe as string | null,
          subtitleHe: versionData.subtitleHe as string | null,
          descriptionHe: versionData.descriptionHe as string | null,
          buttonTextHe: versionData.buttonTextHe as string | null,
          backgroundImage: versionData.backgroundImage as string | null,
          backgroundVideo: versionData.backgroundVideo as string | null,
          images: versionData.images as string[],
          data: versionData.data as Record<string, unknown>,
          dataHe: versionData.dataHe as Record<string, unknown>,
          lastEditedBy: userId,
          updatedAt: new Date(),
        } as any)
        .where(eq(pageSections.id, req.params.id))
        .returning();

      const latestVersion = await db
        .select()
        .from(sectionVersions)
        .where(eq(sectionVersions.sectionId, req.params.id))
        .orderBy(desc(sectionVersions.versionNumber))
        .limit(1);

      const newVersionNum = latestVersion.length > 0 ? latestVersion[0].versionNumber + 1 : 1;

      await db.insert(sectionVersions).values({
        sectionId: req.params.id,
        versionNumber: newVersionNum,
        data: version.data,
        changedBy: userId,
        changeDescription: `Restored from version ${versionNumber}`,
      } as any);

      res.json({
        ...restoredSection,
        restoredFromVersion: versionNumber,
        newVersionNumber: newVersionNum,
        heGuide: "",
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to restore section version",
        heGuide: "",
      });
    }
  }
);

// ============================================================================
// PUBLIC ENDPOINT - No authentication required
// ============================================================================

// GET /api/page-builder/public/:slug - Public endpoint to get page with sections
router.get("/public/:slug", async (req: Request, res: Response) => {
  try {
    const [page] = await db
      .select()
      .from(editablePages)
      .where(and(eq(editablePages.slug, req.params.slug), eq(editablePages.isPublished, true)));

    if (!page) {
      return res.status(404).json({
        error: "Page not found or not published",
        heGuide: "",
      });
    }

    const sections = await db
      .select()
      .from(pageSections)
      .where(and(eq(pageSections.pageId, page.id), eq(pageSections.isVisible, true)))
      .orderBy(asc(pageSections.sortOrder));

    res.json({
      ...page,
      sections,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch page",
      heGuide: "",
    });
  }
});

// ============================================================================
// SEED ENDPOINTS - For initial data population
// ============================================================================

// POST /api/page-builder/seed/homepage - Seed the homepage with sections
router.post("/seed/homepage", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { seedHomepage } = await import("./seeds/seed-homepage");
    const result = await seedHomepage();

    if (result.success) {
      res.json({
        ...result,
        heGuide: "",
      });
    } else {
      res.status(400).json({
        ...result,
        heGuide: "",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to seed homepage",
      message: error instanceof Error ? error.message : "Unknown error",
      heGuide: "",
    });
  }
});

// POST /api/page-builder/seed/category/:type - Seed category pages
router.post("/seed/category/:type", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validTypes = ["hotels", "dining", "districts", "shopping"];
    const type = req.params.type;

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid category type. Must be one of: ${validTypes.join(", ")}`,
        heGuide: "",
      });
    }

    const { seedCategoryPage } = await import("./seeds/seed-homepage");
    const result = await seedCategoryPage(type as "hotels" | "dining" | "districts" | "shopping");

    if (result.success) {
      res.json({
        ...result,
        heGuide: ``,
      });
    } else {
      res.status(400).json({
        ...result,
        heGuide: ``,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to seed category page",
      message: error instanceof Error ? error.message : "Unknown error",
      heGuide: "",
    });
  }
});

// ============================================================================
// REGISTER ROUTES
// ============================================================================

export function registerPageBuilderRoutes(app: Router) {
  app.use("/api/page-builder", router);
}
