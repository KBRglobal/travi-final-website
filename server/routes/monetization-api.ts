import type { Express, Request, Response } from "express";
import { Router } from "express";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { partners, payouts, affiliateClicks, insertAffiliateLinkSchema } from "@shared/schema";
import { requireAuth, requirePermission, checkReadOnlyMode } from "../security";
import { storage } from "../storage";
import { z } from "zod";

type AuthRequest = Request & {
  isAuthenticated(): boolean;
  user?: { claims?: { sub: string } };
};

async function logAuditEvent(
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  description: string,
  oldValue?: unknown,
  newValue?: unknown
) {
  try {
    const { logAuditEvent: logAudit } = (await import("../security/audit-logger")) as any;
    await logAudit(req, action, entityType, entityId, description, oldValue, newValue);
  } catch (error) {}
}

export function registerMonetizationApiRoutes(app: Express): void {
  const router = Router();

  // ============================================================================
  // AFFILIATE CLICK TRACKING
  // ============================================================================

  router.post("/affiliate/click", async (req: Request, res: Response) => {
    try {
      const { attractionId, destination } = req.body;

      if (!attractionId || typeof attractionId !== "string") {
        return res.status(400).json({ error: "attractionId is required and must be a string" });
      }

      const userAgent = req.headers["user-agent"] || null;
      const referrer = req.headers.referer || null;
      const sessionId = (req as any).sessionID || req.headers["x-session-id"] || null;

      await db.insert(affiliateClicks).values({
        attractionId,
        destination,
        userAgent,
        referrer,
        sessionId,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // ============================================================================
  // AFFILIATE LINK GENERATION
  // ============================================================================

  router.post("/affiliate/link", async (req: Request, res: Response) => {
    try {
      const { isAffiliateHooksEnabled, useAffiliateLinkHook, useAffiliateInjectionHook } =
        await import("../monetization/affiliate-hooks");

      if (!isAffiliateHooksEnabled()) {
        return res.json({
          allowed: false,
          reason: "Affiliate system is not enabled",
          enabled: false,
        });
      }

      const { partnerId, productId, productType, productName, zoneId, pageUrl } = req.body;

      if (!partnerId || !productId || !productType || !zoneId) {
        return res.status(400).json({
          allowed: false,
          reason: "Missing required fields: partnerId, productId, productType, zoneId",
        });
      }

      const contentTypeMap: Record<string, string> = {
        hotel: "hotel",
        experience: "experience",
        tour: "experience",
        activity: "experience",
      };
      const contentType = contentTypeMap[productType] || "experience";

      const injectionResult = useAffiliateInjectionHook({
        zoneId,
        contentType: contentType as any,
        pageUrl: pageUrl || "/",
        productId,
        productType,
        partnerId,
      });

      if (!injectionResult.allowed) {
        return res.json({
          allowed: false,
          reason: injectionResult.reason,
          enabled: true,
        });
      }

      const linkResult = useAffiliateLinkHook({
        partnerId,
        productId,
        productType,
        productName: productName || productId,
      });

      res.json({
        allowed: true,
        enabled: linkResult.enabled,
        url: linkResult.url,
        disclosure: linkResult.disclosure,
        rel: linkResult.rel,
        trackingId: linkResult.trackingId,
        disclosureRequired: injectionResult.disclosureRequired,
      });
    } catch (error) {
      res.status(500).json({
        allowed: false,
        reason: "Failed to generate affiliate link",
      });
    }
  });

  // ============================================================================
  // AFFILIATE LINKS CRUD
  // ============================================================================

  router.get("/affiliate-links", requireAuth, async (req: Request, res: Response) => {
    try {
      const { contentId } = req.query;
      const links = await storage.getAffiliateLinks(contentId as string | undefined);
      res.json(links);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliate links" });
    }
  });

  router.get("/affiliate-links/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const link = await storage.getAffiliateLink(req.params.id);
      if (!link) {
        return res.status(404).json({ error: "Affiliate link not found" });
      }
      res.json(link);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch affiliate link" });
    }
  });

  router.post(
    "/affiliate-links",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const parsed = insertAffiliateLinkSchema.parse(req.body);
        const link = await storage.createAffiliateLink(parsed);
        await logAuditEvent(
          req,
          "create",
          "affiliate_link",
          link.id,
          `Created affiliate link: ${link.anchor}`,
          undefined,
          { anchor: link.anchor, url: link.url }
        );
        res.status(201).json(link);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: "Validation error", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create affiliate link" });
      }
    }
  );

  router.patch(
    "/affiliate-links/:id",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const existingLink = await storage.getAffiliateLink(req.params.id);
        const link = await storage.updateAffiliateLink(req.params.id, req.body);
        if (!link) {
          return res.status(404).json({ error: "Affiliate link not found" });
        }
        await logAuditEvent(
          req,
          "update",
          "affiliate_link",
          link.id,
          `Updated affiliate link: ${link.anchor}`,
          existingLink ? { anchor: existingLink.anchor, url: existingLink.url } : undefined,
          { anchor: link.anchor, url: link.url }
        );
        res.json(link);
      } catch (error) {
        res.status(500).json({ error: "Failed to update affiliate link" });
      }
    }
  );

  router.delete(
    "/affiliate-links/:id",
    requirePermission("canAccessAffiliates"),
    checkReadOnlyMode,
    async (req: Request, res: Response) => {
      try {
        const existingLink = await storage.getAffiliateLink(req.params.id);
        await storage.deleteAffiliateLink(req.params.id);
        if (existingLink) {
          await logAuditEvent(
            req,
            "delete",
            "affiliate_link",
            req.params.id,
            `Deleted affiliate link: ${existingLink.anchor}`,
            { anchor: existingLink.anchor, url: existingLink.url }
          );
        }
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete affiliate link" });
      }
    }
  );

  // ============================================================================
  // PARTNERS MANAGEMENT
  // ============================================================================

  router.post(
    "/partners",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const partner = await db.insert(partners).values(req.body).returning();
        res.json(partner[0]);
      } catch (error) {
        res.status(500).json({ error: "Failed to create partner" });
      }
    }
  );

  router.get(
    "/partners",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const allPartners = await db.select().from(partners);
        res.json(allPartners);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch partners" });
      }
    }
  );

  router.get("/partners/:id/dashboard", requireAuth, async (req: Request, res: Response) => {
    try {
      const { partnerDashboard } = await import("../monetization/partner-dashboard");
      const { id } = req.params;
      const metrics = await partnerDashboard.getPartnerMetrics(id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch partner dashboard" });
    }
  });

  router.post(
    "/partners/:id/inject-links",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { affiliateInjector } = await import("../monetization/affiliate-injector");
        const { contentId, dryRun } = req.body;
        const result = await affiliateInjector.injectAffiliateLinks(contentId, dryRun);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to inject affiliate links" });
      }
    }
  );

  router.post("/partners/:id/track-click", async (req: Request, res: Response) => {
    try {
      const { affiliateInjector } = await import("../monetization/affiliate-injector");
      const { trackingCode } = req.body;
      await affiliateInjector.trackClick(trackingCode);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // ============================================================================
  // PAYOUTS
  // ============================================================================

  router.post(
    "/payouts",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { payoutManager } = await import("../monetization/payouts");
        const result = await payoutManager.schedulePayout(req.body);
        if (result) {
          res.json({ success: true, payoutId: result });
        } else {
          res.status(500).json({ error: "Failed to schedule payout" });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to schedule payout" });
      }
    }
  );

  router.post(
    "/payouts/:id/process",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { payoutManager } = await import("../monetization/payouts");
        const { id } = req.params;
        const result = await payoutManager.processPayout(id);
        res.json({ success: result });
      } catch (error) {
        res.status(500).json({ error: "Failed to process payout" });
      }
    }
  );

  router.get("/payouts/partner/:partnerId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { partnerId } = req.params;
      const payoutHistory = await db
        .select()
        .from(payouts)
        .where(eq(payouts.partnerId, partnerId))
        .orderBy(desc(payouts.createdAt))
        .limit(20);
      res.json(payoutHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payout history" });
    }
  });

  // Mount all routes under /api
  app.use("/api", router);
}
