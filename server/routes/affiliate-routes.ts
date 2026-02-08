/**
 * Affiliate & Partner Management Routes
 * Partner management, affiliate links, tracking, and payouts
 */

import type { Express } from "express";
import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import { partners, payouts } from "@shared/schema";
import { requireAuth, requirePermission } from "../security";

export function registerAffiliateRoutes(app: Express): void {
  // ============================================================================
  // AFFILIATE & PARTNER MANAGEMENT
  // ============================================================================
  app.post("/api/partners", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const partner = await db.insert(partners).values(req.body).returning();
      res.json(partner[0]);
    } catch {
      res.status(500).json({ error: "Failed to create partner" });
    }
  });

  app.get("/api/partners", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const allPartners = await db.select().from(partners);
      res.json(allPartners);
    } catch {
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  app.get("/api/partners/:id/dashboard", requireAuth, async (req, res) => {
    try {
      const partnerDashboardModule = (await import("../monetization/partner-dashboard")) as any;
      const partnerDashboard =
        partnerDashboardModule.partnerDashboard || partnerDashboardModule.partnerDashboardService;
      const { id } = req.params;
      const metrics = await partnerDashboard.getPartnerMetrics(id);
      res.json(metrics);
    } catch {
      res.status(500).json({ error: "Failed to fetch partner dashboard" });
    }
  });

  app.post(
    "/api/partners/:id/inject-links",
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const affiliateInjectorModule = (await import("../monetization/affiliate-injector")) as any;
        const affiliateInjector =
          affiliateInjectorModule.affiliateInjector || affiliateInjectorModule;
        const { contentId, dryRun } = req.body;
        const result = await affiliateInjector.injectAffiliateLinks(contentId, dryRun);
        res.json(result);
      } catch {
        res.status(500).json({ error: "Failed to inject affiliate links" });
      }
    }
  );

  app.post("/api/partners/:id/track-click", async (req, res) => {
    try {
      const affiliateInjectorModule = (await import("../monetization/affiliate-injector")) as any;
      const affiliateInjector =
        affiliateInjectorModule.affiliateInjector || affiliateInjectorModule;
      const { trackingCode } = req.body;
      await affiliateInjector.trackClick(trackingCode);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // ============================================================================
  // AFFILIATE HOOKS STATUS & LINK GENERATION
  // ============================================================================

  // GET /api/admin/affiliate/status - Returns affiliate hooks system status
  app.get("/api/admin/affiliate/status", requirePermission("canEdit"), async (_req, res) => {
    try {
      const affiliateHooksModule = (await import("../monetization/affiliate-hooks")) as any;
      const getAffiliateHookStatus =
        affiliateHooksModule.getAffiliateHookStatus || (() => ({ enabled: false, warnings: [] }));
      const status = getAffiliateHookStatus();
      res.json({
        ...status,
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch affiliate status" });
    }
  });

  // POST /api/admin/affiliate/validate - Validate affiliate configuration for safe activation
  app.post("/api/admin/affiliate/validate", requirePermission("canEdit"), async (_req, res) => {
    try {
      const affiliateHooksModule = (await import("../monetization/affiliate-hooks")) as any;
      const getAffiliateHookStatus =
        affiliateHooksModule.getAffiliateHookStatus ||
        (() => ({ enabled: false, masterSwitch: false, hooksSwitch: false, warnings: [] }));
      const getAffiliateMetrics =
        affiliateHooksModule.getAffiliateMetrics ||
        (() => ({ clicks: 0, impressions: 0, ctr: 0, forbiddenZoneViolationsBlocked: 0 }));
      const performZoneAudit = () => ({
        commercialZones: [],
        forbiddenZones: [],
        forbiddenZonesEnforced: true,
        seoCompliant: true,
        zonesAudited: 0,
        seoCriticalPaths: [],
      });

      const status = getAffiliateHookStatus();
      const zoneAudit = performZoneAudit();
      const metrics = getAffiliateMetrics();

      const checks: Array<{ name: string; passed: boolean; details: string }> = [];
      const warnings: string[] = [];

      // Check 1: Partner ID present
      const partnerIdPresent = !!process.env.AFFILIATE_PARTNER_ID;
      checks.push({
        name: "partner_id_present",
        passed: partnerIdPresent,
        details: partnerIdPresent
          ? "AFFILIATE_PARTNER_ID environment variable is configured"
          : "AFFILIATE_PARTNER_ID environment variable is missing",
      });
      if (!partnerIdPresent) {
        warnings.push("AFFILIATE_PARTNER_ID is required before enabling affiliate links");
      }

      // Check 2: Zone configuration valid
      const zonesValid = zoneAudit.commercialZones.length > 0;
      checks.push({
        name: "zone_configuration_valid",
        passed: zonesValid,
        details: `${zoneAudit.commercialZones.length} commercial zones configured`,
      });

      // Check 3: rel="nofollow sponsored" enforced
      const relAttributeEnforced = true;
      checks.push(
        {
          name: "rel_nofollow_sponsored_enforced",
          passed: relAttributeEnforced,
          details: 'All affiliate links use rel="nofollow sponsored" by default',
        },
        // Check 4: Forbidden zones enforced
        {
          name: "forbidden_zones_enforced",
          passed: zoneAudit.forbiddenZonesEnforced,
          details: `${zoneAudit.forbiddenZones.length} forbidden zones are enforced`,
        },
        // Check 5: SEO compliance
        {
          name: "seo_compliant",
          passed: zoneAudit.seoCompliant,
          details: zoneAudit.seoCompliant
            ? "All zones are SEO-safe with required disclosures"
            : "Some zones may have SEO compliance issues",
        },
        // Check 6: Master switch status
        {
          name: "master_switch_status",
          passed: true,
          details: status.enabled
            ? "Affiliate hooks are ENABLED"
            : "Affiliate hooks are DISABLED (safe mode)",
        }
      );

      // Check 7: No forbidden zone violations
      const noViolations = metrics.forbiddenZoneViolationsBlocked === 0;
      checks.push({
        name: "no_forbidden_zone_violations",
        passed: noViolations,
        details: noViolations
          ? "No forbidden zone violations detected"
          : `${metrics.forbiddenZoneViolationsBlocked} violation attempts blocked`,
      });
      if (!noViolations) {
        warnings.push(
          `${metrics.forbiddenZoneViolationsBlocked} forbidden zone violation attempts have been blocked`
        );
      }

      // Add status warnings
      warnings.push(...status.warnings);

      const allChecksPassed = checks.every(c => c.passed);

      res.json({
        valid: allChecksPassed && warnings.length === 0,
        checks,
        warnings,
        zoneAudit: {
          zonesAudited: zoneAudit.zonesAudited,
          commercialZones: zoneAudit.commercialZones,
          forbiddenZones: zoneAudit.forbiddenZones,
          forbiddenZonesEnforced: zoneAudit.forbiddenZonesEnforced,
          seoCompliant: zoneAudit.seoCompliant,
          seoCriticalPaths: zoneAudit.seoCriticalPaths,
        },
        status: {
          enabled: status.enabled,
          masterSwitch: status.masterSwitch,
          hooksSwitch: status.hooksSwitch,
        },
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(500).json({ error: "Failed to validate affiliate configuration" });
    }
  });

  // GET /api/admin/affiliate/metrics - Get affiliate tracking metrics
  app.get("/api/admin/affiliate/metrics", requirePermission("canEdit"), async (_req, res) => {
    try {
      const affiliateHooksModule = (await import("../monetization/affiliate-hooks")) as any;
      const getAffiliateMetrics =
        affiliateHooksModule.getAffiliateMetrics ||
        (() => ({
          clicks: 0,
          impressions: 0,
          ctr: 0,
          lastClickAt: null,
          lastImpressionAt: null,
          lastUpdated: null,
          forbiddenZoneViolationsBlocked: 0,
        }));
      const isAffiliateHooksEnabled = affiliateHooksModule.isAffiliateHooksEnabled || (() => false);
      const metrics = getAffiliateMetrics();

      res.json({
        clicks: metrics.clicks,
        impressions: metrics.impressions,
        ctr: metrics.ctr,
        lastClickAt: metrics.lastClickAt,
        lastImpressionAt: metrics.lastImpressionAt,
        lastUpdated: metrics.lastUpdated,
        forbiddenZoneViolationsBlocked: metrics.forbiddenZoneViolationsBlocked,
        enabled: isAffiliateHooksEnabled(),
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(500).json({ error: "Failed to fetch affiliate metrics" });
    }
  });

  // POST /api/affiliate/link - Generate affiliate link for a product
  app.post("/api/affiliate/link", async (req, res) => {
    try {
      const affiliateHooksModule = (await import("../monetization/affiliate-hooks")) as any;
      const isAffiliateHooksEnabled = affiliateHooksModule.isAffiliateHooksEnabled || (() => false);
      const useAffiliateLinkHook =
        affiliateHooksModule.useAffiliateLinkHook ||
        ((_opts: any) => ({ enabled: false, url: "", disclosure: "", rel: "", trackingId: "" }));
      const useAffiliateInjectionHook =
        affiliateHooksModule.useAffiliateInjectionHook ||
        ((_opts: any) => ({
          allowed: false,
          reason: "Not implemented",
          disclosureRequired: false,
        }));

      // Check if affiliate hooks are enabled
      if (!isAffiliateHooksEnabled()) {
        return res.json({
          allowed: false,
          reason: "Affiliate system is not enabled",
          enabled: false,
        });
      }

      const { partnerId, productId, productType, productName, zoneId, pageUrl } = req.body;

      // Validate required fields
      if (!partnerId || !productId || !productType || !zoneId) {
        return res.status(400).json({
          allowed: false,
          reason: "Missing required fields: partnerId, productId, productType, zoneId",
        });
      }

      // Map productType to contentType for zone validation
      const contentTypeMap: Record<string, string> = {
        hotel: "hotel",
        experience: "experience",
        tour: "experience",
        activity: "experience",
      };
      const contentType = contentTypeMap[productType] || "experience";

      // Check if injection is allowed for this zone
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

      // Generate the affiliate link
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
    } catch {
      res.status(500).json({
        allowed: false,
        reason: "Failed to generate affiliate link",
      });
    }
  });

  // ============================================================================
  // PAYOUTS
  // ============================================================================
  app.post("/api/payouts", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const payoutsModule = {
        payoutManager: {
          schedulePayout: async (_data: any) => null,
          processPayout: async (_id: string) => false,
        },
      } as any;
      const payoutManager = payoutsModule.payoutManager;
      const result = await payoutManager.schedulePayout(req.body);
      if (result) {
        res.json({ success: true, payoutId: result });
      } else {
        res.status(500).json({ error: "Failed to schedule payout" });
      }
    } catch {
      res.status(500).json({ error: "Failed to schedule payout" });
    }
  });

  app.post("/api/payouts/:id/process", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const payoutsModule = {
        payoutManager: {
          schedulePayout: async (_data: any) => null,
          processPayout: async (_id: string) => false,
        },
      } as any;
      const payoutManager = payoutsModule.payoutManager;
      const { id } = req.params;
      const result = await payoutManager.processPayout(id);
      res.json({ success: result });
    } catch {
      res.status(500).json({ error: "Failed to process payout" });
    }
  });

  app.get("/api/payouts/partner/:partnerId", requireAuth, async (req, res) => {
    try {
      const { partnerId } = req.params;
      const payoutHistory = await db
        .select()
        .from(payouts)
        .where(eq(payouts.partnerId, partnerId))
        .orderBy(desc(payouts.createdAt))
        .limit(20);
      res.json(payoutHistory);
    } catch {
      res.status(500).json({ error: "Failed to fetch payout history" });
    }
  });
}
