import { Router, Request, Response } from "express";
import { db } from "../db";
import {
  localizedAssets,
  insertLocalizedAssetSchema,
  localizedAssetEntityTypes,
  localizedAssetUsages,
  supportedLocales,
} from "@shared/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, requirePermission } from "../security";
import { z } from "zod";

const router = Router();

// Strict validation schemas using shared enums
const entityTypeSchema = z.enum(localizedAssetEntityTypes);
const localeSchema = z.enum(supportedLocales);
const usageSchema = z.enum(localizedAssetUsages);

const querySchema = z.object({
  locale: localeSchema.optional(),
  usage: usageSchema.optional(),
});

const paramsSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().min(1),
  locale: localeSchema.optional(),
  usage: usageSchema.optional(),
});

router.get("/api/localized-assets/:entityType/:entityId", async (req: Request, res: Response) => {
  try {
    // Validate params and query with strict enum validation
    const entityTypeResult = entityTypeSchema.safeParse(req.params.entityType);
    if (!entityTypeResult.success) {
      return res.status(400).json({
        error: "Invalid entityType",
        valid: localizedAssetEntityTypes,
      });
    }

    const entityId = req.params.entityId;
    if (!entityId) {
      return res.status(400).json({ error: "entityId is required" });
    }

    const queryResult = querySchema.safeParse(req.query);
    const { locale, usage } = queryResult.success ? queryResult.data : {};

    const baseQuery = db
      .select()
      .from(localizedAssets)
      .where(
        and(
          eq(localizedAssets.entityType, entityTypeResult.data),
          eq(localizedAssets.entityId, entityId)
        )
      );

    const assets = await baseQuery.orderBy(asc(localizedAssets.sortOrder));

    let filteredAssets = assets;
    if (locale) {
      filteredAssets = filteredAssets.filter(a => a.locale === locale);
    }
    if (usage) {
      filteredAssets = filteredAssets.filter(a => a.usage === usage);
    }

    res.json(filteredAssets);
  } catch {
    res.status(500).json({ error: "Failed to fetch localized assets" });
  }
});

router.get(
  "/api/localized-assets/:entityType/:entityId/:locale/:usage",
  async (req: Request, res: Response) => {
    try {
      // Strict enum validation on all params
      const entityTypeResult = entityTypeSchema.safeParse(req.params.entityType);
      const localeResult = localeSchema.safeParse(req.params.locale);
      const usageResult = usageSchema.safeParse(req.params.usage);
      const entityId = req.params.entityId;

      if (!entityTypeResult.success) {
        return res
          .status(400)
          .json({ error: "Invalid entityType", valid: localizedAssetEntityTypes });
      }
      if (!localeResult.success) {
        return res.status(400).json({ error: "Invalid locale", valid: supportedLocales });
      }
      if (!usageResult.success) {
        return res.status(400).json({ error: "Invalid usage", valid: localizedAssetUsages });
      }
      if (!entityId) {
        return res.status(400).json({ error: "entityId is required" });
      }

      const [asset] = await db
        .select()
        .from(localizedAssets)
        .where(
          and(
            eq(localizedAssets.entityType, entityTypeResult.data as any),
            eq(localizedAssets.entityId, entityId),
            eq(localizedAssets.locale, localeResult.data as any),
            eq(localizedAssets.usage, usageResult.data as any)
          )
        );

      if (!asset) {
        // Fallback to English
        const [fallbackAsset] = await db
          .select()
          .from(localizedAssets)
          .where(
            and(
              eq(localizedAssets.entityType, entityTypeResult.data),
              eq(localizedAssets.entityId, entityId),
              eq(localizedAssets.locale, "en"),
              eq(localizedAssets.usage, usageResult.data)
            )
          );

        if (!fallbackAsset) {
          return res.status(404).json({
            error: "Asset not found",
            locale: localeResult.data,
            fallbackTried: "en",
          });
        }
        return res.json({ ...fallbackAsset, isFallback: true, requestedLocale: localeResult.data });
      }

      res.json({ ...asset, isFallback: false });
    } catch {
      res.status(500).json({ error: "Failed to fetch localized asset" });
    }
  }
);

router.post(
  "/api/admin/localized-assets",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const data = insertLocalizedAssetSchema.parse(req.body) as any;

      const [existing] = await db
        .select()
        .from(localizedAssets)
        .where(
          and(
            eq(localizedAssets.entityType, data.entityType),
            eq(localizedAssets.entityId, data.entityId),
            eq(localizedAssets.locale, data.locale),
            eq(localizedAssets.usage, data.usage)
          )
        );

      if (existing) {
        const [updated] = await db
          .update(localizedAssets)
          .set({
            ...data,
            updatedAt: new Date(),
          } as any)
          .where(eq(localizedAssets.id, existing.id))
          .returning();

        return res.json(updated);
      }

      const [created] = await db.insert(localizedAssets).values(data).returning();

      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save localized asset" });
    }
  }
);

router.delete(
  "/api/admin/localized-assets/:id",
  requirePermission("canEdit"),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const [deleted] = await db
        .delete(localizedAssets)
        .where(eq(localizedAssets.id, id))
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }

      res.json({ success: true, deleted });
    } catch {
      res.status(500).json({ error: "Failed to delete localized asset" });
    }
  }
);

router.get("/api/admin/localized-assets", requireAuth, async (req: Request, res: Response) => {
  try {
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;
    const localeParam = req.query.locale as string | undefined;

    const conditions = [];
    if (entityType) conditions.push(eq(localizedAssets.entityType, entityType as any));
    if (entityId) conditions.push(eq(localizedAssets.entityId, entityId));
    if (localeParam) conditions.push(eq(localizedAssets.locale, localeParam as any));

    const baseQuery = db.select().from(localizedAssets);
    const assets =
      conditions.length > 0
        ? await baseQuery.where(and(...conditions)).orderBy(desc(localizedAssets.updatedAt))
        : await baseQuery.orderBy(desc(localizedAssets.updatedAt));

    res.json(assets);
  } catch {
    res.status(500).json({ error: "Failed to list localized assets" });
  }
});

export default router;
