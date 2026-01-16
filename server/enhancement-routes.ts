/**
 * Enhancement Routes
 *
 * API endpoints for all enhancement modules:
 * - Content Enhancement (Readability, CTA, Duplicates, Related)
 * - Search Analytics
 * - Exit Intent Popups
 * - Advanced Security
 * - Newsletter
 * - Monetization
 * - PWA
 */

import type { Express, Request, Response } from "express";
import { requirePermission, requireAuth } from "./security";
import { contentEnhancement } from "./content-enhancement";
import { searchAnalytics } from "./search-analytics";
import { exitIntent } from "./exit-intent";
import { advancedSecurity } from "./advanced-security";
import { newsletter } from "./newsletter";
import { monetization } from "./monetization";
import { pwa } from "./pwa-offline";

export function registerEnhancementRoutes(app: Express) {

  // ============================================================================
  // CONTENT ENHANCEMENT
  // ============================================================================

  // Readability analysis
  app.get("/api/enhance/readability/:contentId", requireAuth, async (req, res) => {
    try {
      const analysis = await contentEnhancement.readability.analyzeContent(req.params.contentId);
      if (!analysis) return res.status(404).json({ error: "Content not found" });
      res.json(analysis);
    } catch (error) {
      console.error("[Enhancement] Readability error:", error);
      res.status(500).json({ error: "Failed to analyze readability" });
    }
  });

  // CTA suggestions
  app.get("/api/enhance/ctas/:contentId", requireAuth, async (req, res) => {
    try {
      const ctas = await contentEnhancement.cta.generateCtas(req.params.contentId);
      res.json({ ctas });
    } catch (error) {
      console.error("[Enhancement] CTA error:", error);
      res.status(500).json({ error: "Failed to generate CTAs" });
    }
  });

  // Duplicate detection
  app.get("/api/enhance/duplicates/:contentId", requireAuth, async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 30;
      const duplicates = await contentEnhancement.duplicates.findDuplicates(
        req.params.contentId,
        threshold
      );
      res.json({ duplicates, count: duplicates.length });
    } catch (error) {
      console.error("[Enhancement] Duplicates error:", error);
      res.status(500).json({ error: "Failed to find duplicates" });
    }
  });

  // Scan all for duplicates
  app.get("/api/enhance/duplicates", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const result = await contentEnhancement.duplicates.scanAllForDuplicates();
      res.json(result);
    } catch (error) {
      console.error("[Enhancement] Scan duplicates error:", error);
      res.status(500).json({ error: "Failed to scan duplicates" });
    }
  });

  // Related content
  app.get("/api/enhance/related/:contentId", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const related = await contentEnhancement.related.findRelated(req.params.contentId, limit);
      res.json({ related });
    } catch (error) {
      console.error("[Enhancement] Related error:", error);
      res.status(500).json({ error: "Failed to find related content" });
    }
  });

  // Continue reading
  app.get("/api/enhance/continue/:contentId", async (req, res) => {
    try {
      const result = await contentEnhancement.flow.getContinueReading(req.params.contentId);
      res.json(result);
    } catch (error) {
      console.error("[Enhancement] Continue reading error:", error);
      res.status(500).json({ error: "Failed to get continue reading" });
    }
  });

  // ============================================================================
  // SEARCH ANALYTICS
  // ============================================================================

  // Log search
  app.post("/api/search/log", async (req, res) => {
    try {
      const { query, resultsCount, locale, sessionId } = req.body;
      const searchId = await searchAnalytics.logSearch(query, resultsCount, locale, sessionId);
      res.json({ searchId });
    } catch (error) {
      console.error("[Search] Log error:", error);
      res.status(500).json({ error: "Failed to log search" });
    }
  });

  // Log click
  app.post("/api/search/click", async (req, res) => {
    try {
      const { searchId, resultId } = req.body;
      await searchAnalytics.logClick(searchId, resultId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Search] Click error:", error);
      res.status(500).json({ error: "Failed to log click" });
    }
  });

  // Search analytics dashboard
  app.get("/api/search/analytics", requireAuth, async (req, res) => {
    try {
      const dashboard = await searchAnalytics.getDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error("[Search] Analytics error:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Content suggestions from search
  app.get("/api/search/suggestions", requireAuth, async (req, res) => {
    try {
      const suggestions = await searchAnalytics.getContentSuggestions();
      res.json({ suggestions });
    } catch (error) {
      console.error("[Search] Suggestions error:", error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  // ============================================================================
  // EXIT INTENT POPUPS
  // ============================================================================

  // Get popup config for content
  app.get("/api/popups/:contentId", async (req, res) => {
    try {
      const locale = req.query.locale as string || "en";
      const config = await exitIntent.getClientConfig(req.params.contentId, locale);
      res.json(config);
    } catch (error) {
      console.error("[Popups] Config error:", error);
      res.status(500).json({ error: "Failed to get popup config" });
    }
  });

  // Track popup impression
  app.post("/api/popups/:popupId/impression", async (req, res) => {
    try {
      await exitIntent.trackImpression(req.params.popupId);
      res.json({ success: true });
    } catch (error) {
      console.error("[Popups] Impression error:", error);
      res.status(500).json({ error: "Failed to track impression" });
    }
  });

  // Track popup conversion
  app.post("/api/popups/:popupId/convert", async (req, res) => {
    try {
      await exitIntent.trackConversion(req.params.popupId, req.body);
      res.json({ success: true });
    } catch (error) {
      console.error("[Popups] Conversion error:", error);
      res.status(500).json({ error: "Failed to track conversion" });
    }
  });

  // Popup analytics
  app.get("/api/popups/analytics", requireAuth, async (req, res) => {
    try {
      const analytics = await exitIntent.getAnalytics();
      res.json({ analytics });
    } catch (error) {
      console.error("[Popups] Analytics error:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // ============================================================================
  // NEWSLETTER
  // ============================================================================

  // Subscribe
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email, name, locale, source, tags } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }

      const result = await newsletter.subscribers.add(email, {
        name,
        locale,
        source,
        tags,
      });

      res.json({
        success: true,
        isNew: result.isNew,
        needsConfirmation: result.subscriber.status === "pending",
      });
    } catch (error) {
      console.error("[Newsletter] Subscribe error:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Unsubscribe
  app.post("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email } = req.body;
      const success = await newsletter.subscribers.unsubscribe(email);
      res.json({ success });
    } catch (error) {
      console.error("[Newsletter] Unsubscribe error:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Subscriber stats
  app.get("/api/newsletter/stats", requireAuth, async (req, res) => {
    try {
      const stats = await newsletter.subscribers.getStats();
      res.json(stats);
    } catch (error) {
      console.error("[Newsletter] Stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // Create campaign
  app.post("/api/newsletter/campaigns", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const campaign = await newsletter.campaigns.create(req.body);
      res.json(campaign);
    } catch (error) {
      console.error("[Newsletter] Campaign error:", error);
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  // Generate newsletter from content
  app.post("/api/newsletter/generate", requireAuth, async (req, res) => {
    try {
      const { days, contentTypes, limit } = req.body;
      const generated = await newsletter.campaigns.generateFromContent({
        days: days || 7,
        contentTypes,
        limit,
      });
      res.json(generated);
    } catch (error) {
      console.error("[Newsletter] Generate error:", error);
      res.status(500).json({ error: "Failed to generate newsletter" });
    }
  });

  // ============================================================================
  // MONETIZATION - PREMIUM CONTENT
  // ============================================================================

  // Check premium status
  app.get("/api/premium/:contentId", async (req, res) => {
    try {
      const preview = await monetization.premium.getPreview(req.params.contentId);
      res.json(preview);
    } catch (error) {
      console.error("[Premium] Status error:", error);
      res.status(500).json({ error: "Failed to check premium status" });
    }
  });

  // Check access
  app.get("/api/premium/:contentId/access", requireAuth, async (req: any, res) => {
    try {
      const hasAccess = await monetization.premium.hasAccess(req.user.id, req.params.contentId);
      res.json({ hasAccess });
    } catch (error) {
      console.error("[Premium] Access error:", error);
      res.status(500).json({ error: "Failed to check access" });
    }
  });

  // Purchase content
  app.post("/api/premium/:contentId/purchase", requireAuth, async (req: any, res) => {
    try {
      const purchase = await monetization.premium.purchase(
        req.user.id,
        req.params.contentId,
        req.body
      );
      res.json(purchase);
    } catch (error) {
      console.error("[Premium] Purchase error:", error);
      res.status(500).json({ error: "Failed to purchase" });
    }
  });

  // Premium stats
  app.get("/api/premium/stats", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const stats = await monetization.premium.getStats();
      res.json(stats);
    } catch (error) {
      console.error("[Premium] Stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // ============================================================================
  // MONETIZATION - BUSINESS LISTINGS
  // ============================================================================

  // Get listing tiers
  app.get("/api/listings/tiers", async (req, res) => {
    res.json({ tiers: monetization.listings.getTiers() });
  });

  // Create listing
  app.post("/api/listings", requireAuth, async (req, res) => {
    try {
      const listing = await monetization.listings.create(req.body);
      res.json(listing);
    } catch (error) {
      console.error("[Listings] Create error:", error);
      res.status(500).json({ error: "Failed to create listing" });
    }
  });

  // Get listing analytics
  app.get("/api/listings/:id/analytics", requireAuth, async (req, res) => {
    try {
      const analytics = await monetization.listings.getAnalytics(req.params.id);
      if (!analytics) return res.status(404).json({ error: "Listing not found" });
      res.json(analytics);
    } catch (error) {
      console.error("[Listings] Analytics error:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  // Track listing impression
  app.post("/api/listings/:id/impression", async (req, res) => {
    try {
      await monetization.listings.trackImpression(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Listings] Impression error:", error);
      res.status(500).json({ error: "Failed to track impression" });
    }
  });

  // Track listing click
  app.post("/api/listings/:id/click", async (req, res) => {
    try {
      await monetization.listings.trackClick(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[Listings] Click error:", error);
      res.status(500).json({ error: "Failed to track click" });
    }
  });

  // ============================================================================
  // MONETIZATION - LEADS
  // ============================================================================

  // Submit lead
  app.post("/api/leads", async (req, res) => {
    try {
      const lead = await monetization.leads.submit(req.body);
      res.json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("[Leads] Submit error:", error);
      res.status(500).json({ error: "Failed to submit lead" });
    }
  });

  // Get leads dashboard
  app.get("/api/leads/dashboard/:businessId", requireAuth, async (req, res) => {
    try {
      const dashboard = await monetization.leads.getDashboard(req.params.businessId);
      res.json(dashboard);
    } catch (error) {
      console.error("[Leads] Dashboard error:", error);
      res.status(500).json({ error: "Failed to get dashboard" });
    }
  });

  // Update lead status
  app.patch("/api/leads/:id/status", requireAuth, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const lead = await monetization.leads.updateStatus(req.params.id, status, notes);
      if (!lead) return res.status(404).json({ error: "Lead not found" });
      res.json(lead);
    } catch (error) {
      console.error("[Leads] Update error:", error);
      res.status(500).json({ error: "Failed to update lead" });
    }
  });

  // Export leads
  app.get("/api/leads/export/:businessId", requireAuth, async (req, res) => {
    try {
      const csv = await monetization.leads.exportCsv(req.params.businessId);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
      res.send(csv);
    } catch (error) {
      console.error("[Leads] Export error:", error);
      res.status(500).json({ error: "Failed to export leads" });
    }
  });

  // Revenue dashboard
  app.get("/api/revenue/stats", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const stats = await monetization.revenue.getStats();
      res.json(stats);
    } catch (error) {
      console.error("[Revenue] Stats error:", error);
      res.status(500).json({ error: "Failed to get revenue stats" });
    }
  });

  // ============================================================================
  // PWA
  // ============================================================================

  // Manifest
  app.get("/manifest.json", async (req, res) => {
    try {
      const locale = req.query.locale as string || "en";
      const manifest = await pwa.manager.generateManifest(locale);
      res.json(manifest);
    } catch (error) {
      console.error("[PWA] Manifest error:", error);
      res.status(500).json({ error: "Failed to generate manifest" });
    }
  });

  // Service worker
  app.get("/sw.js", async (req, res) => {
    try {
      const sw = pwa.manager.generateServiceWorker();
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Service-Worker-Allowed", "/");
      res.send(sw);
    } catch (error) {
      console.error("[PWA] SW error:", error);
      res.status(500).send("// Service worker unavailable");
    }
  });

  // Offline page
  app.get("/offline", async (req, res) => {
    const html = pwa.manager.generateOfflinePage();
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  });

  // Push subscribe
  app.post("/api/push/subscribe", async (req: any, res) => {
    try {
      await pwa.push.subscribe(req.body, req.user?.id);
      res.json({ success: true });
    } catch (error) {
      console.error("[PWA] Push subscribe error:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Push unsubscribe
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      await pwa.push.unsubscribe(req.body.endpoint);
      res.json({ success: true });
    } catch (error) {
      console.error("[PWA] Push unsubscribe error:", error);
      res.status(500).json({ error: "Failed to unsubscribe" });
    }
  });

  // Send push notification
  app.post("/api/push/send", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { title, body, ...options } = req.body;
      const result = await pwa.push.send(title, body, options);
      res.json(result);
    } catch (error) {
      console.error("[PWA] Push send error:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Push stats
  app.get("/api/push/stats", requireAuth, async (req, res) => {
    try {
      const stats = await pwa.push.getStats();
      res.json(stats);
    } catch (error) {
      console.error("[PWA] Push stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  // ============================================================================
  // SECURITY
  // ============================================================================

  // Audit logs
  app.get("/api/security/audit", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { userId, action, severity, limit, offset } = req.query;
      const logs = await advancedSecurity.auditLogger.getLogs({
        userId: userId as string,
        action: action as string,
        severity: severity as any,
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      });
      res.json(logs);
    } catch (error) {
      console.error("[Security] Audit error:", error);
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });

  // Security summary
  app.get("/api/security/summary", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const summary = await advancedSecurity.auditLogger.getSecuritySummary(hours);
      res.json(summary);
    } catch (error) {
      console.error("[Security] Summary error:", error);
      res.status(500).json({ error: "Failed to get security summary" });
    }
  });

  // 2FA setup
  app.post("/api/security/2fa/setup", requireAuth, async (req: any, res) => {
    try {
      const result = await advancedSecurity.twoFactorAuth.generateSecret(req.user.id);
      res.json(result);
    } catch (error) {
      console.error("[Security] 2FA setup error:", error);
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  // 2FA verify
  app.post("/api/security/2fa/verify", requireAuth, async (req: any, res) => {
    try {
      const { code } = req.body;
      const success = await advancedSecurity.twoFactorAuth.verifyAndEnable(req.user.id, code);
      res.json({ success });
    } catch (error) {
      console.error("[Security] 2FA verify error:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  // 2FA disable
  app.post("/api/security/2fa/disable", requireAuth, async (req: any, res) => {
    try {
      const success = await advancedSecurity.twoFactorAuth.disable(req.user.id);
      res.json({ success });
    } catch (error) {
      console.error("[Security] 2FA disable error:", error);
      res.status(500).json({ error: "Failed to disable 2FA" });
    }
  });

  console.log("[Enhancement] Routes registered");
}
