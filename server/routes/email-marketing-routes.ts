/**
 * Email Marketing Routes
 * Email templates, A/B testing, segments, campaigns, and tracking
 */

import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { Resend } from "resend";
import { db } from "../db";
import { newsletterCampaigns, campaignEvents } from "@shared/schema";
import { storage } from "../storage";
import { requirePermission, checkReadOnlyMode } from "../security";
import { logAuditEvent } from "../utils/audit-logger";

// Email client helper
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

export function registerEmailMarketingRoutes(app: Express): void {
  // ============================================================================
  // EMAIL TEMPLATES API
  // ============================================================================

  app.get("/api/email-templates", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { category } = req.query;
      const filters = category ? { category: category as string } : undefined;
      const templates = await storage.getEmailTemplates(filters);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/email-templates/:id", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const template = await storage.getEmailTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post(
    "/api/email-templates",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const user = req.user as any;
        const templateData = {
          ...req.body,
          createdBy: user?.claims?.sub || null,
        };
        const template = await storage.createEmailTemplate(templateData);
        await logAuditEvent(
          req,
          "create",
          "campaign",
          template.id,
          `Created email template: ${template.name}`
        );
        res.status(201).json(template);
      } catch (error) {
        res.status(500).json({ error: "Failed to create template" });
      }
    }
  );

  app.patch(
    "/api/email-templates/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getEmailTemplate(id);
        if (!existing) {
          return res.status(404).json({ error: "Template not found" });
        }
        const template = await storage.updateEmailTemplate(id, req.body);
        await logAuditEvent(
          req,
          "update",
          "campaign",
          id,
          `Updated email template: ${template?.name}`
        );
        res.json(template);
      } catch (error) {
        res.status(500).json({ error: "Failed to update template" });
      }
    }
  );

  app.delete(
    "/api/email-templates/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getEmailTemplate(id);
        if (!existing) {
          return res.status(404).json({ error: "Template not found" });
        }
        await storage.deleteEmailTemplate(id);
        await logAuditEvent(
          req,
          "delete",
          "campaign",
          id,
          `Deleted email template: ${existing.name}`
        );
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete template" });
      }
    }
  );

  // ============================================================================
  // NEWSLETTER A/B TESTS API
  // ============================================================================

  app.get("/api/newsletter/ab-tests", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { status } = req.query;
      const filters = status ? { status: status as string } : undefined;
      const tests = await storage.getNewsletterAbTests(filters);
      res.json(tests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });

  app.get(
    "/api/newsletter/ab-tests/:id",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const test = await storage.getNewsletterAbTest(req.params.id);
        if (!test) {
          return res.status(404).json({ error: "A/B test not found" });
        }
        res.json(test);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch A/B test" });
      }
    }
  );

  app.post(
    "/api/newsletter/ab-tests",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const user = req.user as any;
        const testData = {
          ...req.body,
          createdBy: user?.claims?.sub || null,
          status: "draft",
        };
        const test = await storage.createNewsletterAbTest(testData);
        await logAuditEvent(req, "create", "campaign", test.id, `Created A/B test: ${test.name}`);
        res.status(201).json(test);
      } catch (error) {
        res.status(500).json({ error: "Failed to create A/B test" });
      }
    }
  );

  app.patch(
    "/api/newsletter/ab-tests/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getNewsletterAbTest(id);
        if (!existing) {
          return res.status(404).json({ error: "A/B test not found" });
        }
        const test = await storage.updateNewsletterAbTest(id, req.body);
        await logAuditEvent(req, "update", "campaign", id, `Updated A/B test: ${test?.name}`);
        res.json(test);
      } catch (error) {
        res.status(500).json({ error: "Failed to update A/B test" });
      }
    }
  );

  // Start an A/B test
  app.post(
    "/api/newsletter/ab-tests/:id/start",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const test = await storage.getNewsletterAbTest(id);
        if (!test) {
          return res.status(404).json({ error: "A/B test not found" });
        }
        if (test.status !== "draft") {
          return res.status(400).json({ error: "Test has already been started" });
        }

        const updated = await storage.updateNewsletterAbTest(id, {
          status: "running",
          startedAt: new Date(),
        });
        await logAuditEvent(req, "update", "campaign", id, `Started A/B test: ${test.name}`);
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: "Failed to start A/B test" });
      }
    }
  );

  // Select winner for an A/B test
  app.post(
    "/api/newsletter/ab-tests/:id/select-winner",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { winnerId } = req.body;

        if (!winnerId || !["a", "b"].includes(winnerId)) {
          return res.status(400).json({ error: "Winner must be 'a' or 'b'" });
        }

        const test = await storage.getNewsletterAbTest(id);
        if (!test) {
          return res.status(404).json({ error: "A/B test not found" });
        }

        const updated = await storage.updateNewsletterAbTest(id, {
          status: "completed",
          winnerId,
          completedAt: new Date(),
        });
        await logAuditEvent(
          req,
          "update",
          "campaign",
          id,
          `Selected winner for A/B test: ${test.name} - Winner: Variant ${winnerId.toUpperCase()}`
        );
        res.json(updated);
      } catch (error) {
        res.status(500).json({ error: "Failed to select winner" });
      }
    }
  );

  app.delete(
    "/api/newsletter/ab-tests/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getNewsletterAbTest(id);
        if (!existing) {
          return res.status(404).json({ error: "A/B test not found" });
        }
        await storage.deleteNewsletterAbTest(id);
        await logAuditEvent(req, "delete", "campaign", id, `Deleted A/B test: ${existing.name}`);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete A/B test" });
      }
    }
  );

  // ============================================================================
  // SUBSCRIBER SEGMENTS API
  // ============================================================================

  app.get("/api/subscriber-segments", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const segments = await storage.getSubscriberSegments();
      res.json(segments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch segments" });
    }
  });

  app.get(
    "/api/subscriber-segments/:id",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const segment = await storage.getSubscriberSegment(req.params.id);
        if (!segment) {
          return res.status(404).json({ error: "Segment not found" });
        }
        const conditions = await storage.getSegmentConditions(req.params.id);
        res.json({ ...segment, conditions });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch segment" });
      }
    }
  );

  app.post(
    "/api/subscriber-segments",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const user = req.user as any;
        const { conditions, ...segmentData } = req.body;

        const segment = await storage.createSubscriberSegment({
          ...segmentData,
          createdBy: user?.claims?.sub || null,
        });

        if (conditions && Array.isArray(conditions)) {
          for (const condition of conditions) {
            await storage.createSegmentCondition({
              ...condition,
              segmentId: segment.id,
            });
          }
        }

        await logAuditEvent(
          req,
          "create",
          "campaign",
          segment.id,
          `Created subscriber segment: ${segment.name}`
        );
        res.status(201).json(segment);
      } catch (error) {
        res.status(500).json({ error: "Failed to create segment" });
      }
    }
  );

  app.patch(
    "/api/subscriber-segments/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getSubscriberSegment(id);
        if (!existing) {
          return res.status(404).json({ error: "Segment not found" });
        }
        const segment = await storage.updateSubscriberSegment(id, req.body);
        await logAuditEvent(
          req,
          "update",
          "campaign",
          id,
          `Updated subscriber segment: ${segment?.name}`
        );
        res.json(segment);
      } catch (error) {
        res.status(500).json({ error: "Failed to update segment" });
      }
    }
  );

  app.delete(
    "/api/subscriber-segments/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getSubscriberSegment(id);
        if (!existing) {
          return res.status(404).json({ error: "Segment not found" });
        }
        await storage.deleteSubscriberSegment(id);
        await logAuditEvent(
          req,
          "delete",
          "campaign",
          id,
          `Deleted subscriber segment: ${existing.name}`
        );
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete segment" });
      }
    }
  );

  // ============================================================================
  // BOUNCE TRACKING STATS API
  // ============================================================================

  app.get(
    "/api/newsletter/bounce-stats",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const subscribers = await storage.getNewsletterSubscribers();
        const bouncedSubscribers = subscribers.filter(s => s.status === "bounced");
        const totalBounced = bouncedSubscribers.length;
        const totalSubscribers = subscribers.length;
        const bounceRate =
          totalSubscribers > 0 ? ((totalBounced / totalSubscribers) * 100).toFixed(2) : "0";

        res.json({
          totalBounced,
          totalSubscribers,
          bounceRate: parseFloat(bounceRate),
          bouncedSubscribers: bouncedSubscribers.slice(0, 50),
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch bounce statistics" });
      }
    }
  );

  // ============================================================================
  // NEWSLETTER SEGMENTS API (for segmentation by language preference)
  // ============================================================================

  app.get("/api/newsletter/segments", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const subscribers = await storage.getNewsletterSubscribers();
      const activeSubscribers = subscribers.filter(s => s.status === "subscribed");

      // Build language segments
      const languageSegments: Record<string, { count: number; subscribers: string[] }> = {};
      for (const sub of activeSubscribers) {
        const lang = sub.locale || "en";
        if (!languageSegments[lang]) {
          languageSegments[lang] = { count: 0, subscribers: [] };
        }
        languageSegments[lang].count++;
        languageSegments[lang].subscribers.push(sub.id);
      }

      // Get custom segments from storage
      const customSegments = await storage.getSubscriberSegments();

      // Format response
      const segments = [
        // Built-in language segments
        ...Object.entries(languageSegments).map(([lang, data]) => ({
          id: `lang_${lang}`,
          name: `Language: ${lang.toUpperCase()}`,
          type: "language" as const,
          language: lang,
          subscriberCount: data.count,
          isDynamic: true,
        })),
        // Custom segments
        ...customSegments.map(seg => ({
          id: seg.id,
          name: seg.name,
          type: "custom" as const,
          language: null,
          subscriberCount: seg.subscriberCount || 0,
          isDynamic: seg.isDynamic,
          description: seg.description,
        })),
      ];

      res.json({
        segments,
        totalActive: activeSubscribers.length,
        languageCounts: Object.fromEntries(
          Object.entries(languageSegments).map(([lang, data]) => [lang, data.count])
        ),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch segments" });
    }
  });

  // ============================================================================
  // CAMPAIGN CRUD ROUTES
  // ============================================================================

  app.get("/api/campaigns", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign" });
    }
  });

  app.post(
    "/api/campaigns",
    requirePermission("canCreate"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const user = req.user as any;
        const campaignData = {
          ...req.body,
          createdBy: user?.claims?.sub || null,
        };
        const campaign = await storage.createCampaign(campaignData);
        await logAuditEvent(
          req,
          "create",
          "campaign",
          campaign.id,
          `Created campaign: ${campaign.name}`,
          undefined,
          { name: campaign.name, subject: campaign.subject }
        );

        res.status(201).json(campaign);
      } catch (error) {
        res.status(500).json({ error: "Failed to create campaign" });
      }
    }
  );

  app.patch(
    "/api/campaigns/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getCampaign(id);
        if (!existing) {
          return res.status(404).json({ error: "Campaign not found" });
        }
        // Don't allow editing sent campaigns
        if (existing.status === "sent" || existing.status === "sending") {
          return res
            .status(400)
            .json({ error: "Cannot edit a campaign that has been sent or is sending" });
        }
        const campaign = await storage.updateCampaign(id, req.body);
        if (campaign) {
          await logAuditEvent(
            req,
            "update",
            "campaign",
            campaign.id,
            `Updated campaign: ${campaign.name}`,
            { name: existing.name, subject: existing.subject },
            { name: campaign.name, subject: campaign.subject }
          );
        }

        res.json(campaign);
      } catch (error) {
        res.status(500).json({ error: "Failed to update campaign" });
      }
    }
  );

  app.delete(
    "/api/campaigns/:id",
    requirePermission("canDelete"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const existing = await storage.getCampaign(id);
        if (!existing) {
          return res.status(404).json({ error: "Campaign not found" });
        }
        // Don't allow deleting sent campaigns
        if (existing.status === "sent" || existing.status === "sending") {
          return res
            .status(400)
            .json({ error: "Cannot delete a campaign that has been sent or is sending" });
        }
        await storage.deleteCampaign(id);
        await logAuditEvent(req, "delete", "campaign", id, `Deleted campaign: ${existing.name}`, {
          name: existing.name,
          subject: existing.subject,
        });

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete campaign" });
      }
    }
  );

  // Campaign events (for analytics)
  app.get("/api/campaigns/:id/events", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const { id } = req.params;
      const events = await storage.getCampaignEvents(id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch campaign events" });
    }
  });

  // Send campaign to all active subscribers
  app.post("/api/campaigns/:id/send", requirePermission("canEdit"), async (req, res) => {
    try {
      const { id } = req.params;
      const campaign = await storage.getCampaign(id);

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      if (campaign.status === "sent" || campaign.status === "sending") {
        return res
          .status(400)
          .json({ error: "Campaign has already been sent or is currently sending" });
      }

      const resend = getResendClient();
      if (!resend) {
        return res.status(500).json({ error: "Email service not configured" });
      }

      // Get active subscribers
      const subscribers = await storage.getActiveNewsletterSubscribers();

      if (subscribers.length === 0) {
        return res.status(400).json({ error: "No active subscribers to send to" });
      }

      // Update campaign status to sending
      await storage.updateCampaign(id, {
        status: "sending",
        sentAt: new Date(),
        totalRecipients: subscribers.length,
      });

      const baseUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";

      let sentCount = 0;
      let failedCount = 0;

      // Helper to inject tracking pixel into HTML
      const injectTrackingPixel = (
        html: string,
        campaignId: string,
        subscriberId: string
      ): string => {
        const trackingPixel = `<img src="${baseUrl}/api/track/open/${campaignId}/${subscriberId}" width="1" height="1" style="display:none" alt="" />`;
        // Insert before closing body tag, or append at end
        if (html.includes("</body>")) {
          return html.replace("</body>", `${trackingPixel}</body>`);
        }
        return html + trackingPixel;
      };

      // Helper to wrap links with click tracking
      const wrapLinksWithTracking = (
        html: string,
        campaignId: string,
        subscriberId: string
      ): string => {
        // Match href="..." but not tracking URLs or unsubscribe links
        return html.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url) => {
          // Don't wrap tracking URLs or unsubscribe links
          if (url.includes("/api/track/") || url.includes("/api/newsletter/unsubscribe")) {
            return match;
          }
          const trackingUrl = `${baseUrl}/api/track/click/${campaignId}/${subscriberId}?url=${encodeURIComponent(url)}`;
          return `href="${trackingUrl}"`;
        });
      };

      // Send to each subscriber
      for (const subscriber of subscribers) {
        try {
          // Personalize content
          let htmlContent = campaign.htmlContent || "";

          // Add unsubscribe link if not present
          const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${subscriber.id}`;
          if (!htmlContent.includes("/api/newsletter/unsubscribe")) {
            htmlContent = htmlContent.replace(
              "</body>",
              `<p style="text-align:center;font-size:12px;color:#999;margin-top:30px;"><a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a></p></body>`
            );
          }

          // Wrap links with click tracking
          htmlContent = wrapLinksWithTracking(htmlContent, id, subscriber.id);

          // Inject tracking pixel
          htmlContent = injectTrackingPixel(htmlContent, id, subscriber.id);

          // Replace personalization tokens
          const firstName = subscriber.firstName || "there";
          htmlContent = htmlContent.replace(/\{\{firstName\}\}/g, firstName);
          htmlContent = htmlContent.replace(/\{\{email\}\}/g, subscriber.email);

          await resend.emails.send({
            from: "Dubai Travel <noreply@dubaitravel.com>",
            to: subscriber.email,
            subject: campaign.subject,
            html: htmlContent,
          });

          // Record sent event
          await storage.createCampaignEvent({
            campaignId: id,
            subscriberId: subscriber.id,
            eventType: "sent",
            metadata: { email: subscriber.email },
          });

          sentCount++;
        } catch (emailError) {
          failedCount++;

          // Record failed event
          await storage.createCampaignEvent({
            campaignId: id,
            subscriberId: subscriber.id,
            eventType: "bounced",
            metadata: {
              email: subscriber.email,
              error: emailError instanceof Error ? emailError.message : "Unknown error",
            },
          });
        }
      }

      // Update campaign with final stats
      await storage.updateCampaign(id, {
        status: failedCount === subscribers.length ? "failed" : "sent",
        totalSent: sentCount,
      });

      res.json({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: subscribers.length,
      });
    } catch (error) {
      // Try to update status to failed
      try {
        await storage.updateCampaign(req.params.id, { status: "failed" });
      } catch {}

      res.status(500).json({ error: "Failed to send campaign" });
    }
  });

  // ============================================================================
  // EMAIL TRACKING ENDPOINTS
  // ============================================================================

  // Open tracking pixel - returns a 1x1 transparent GIF
  app.get("/api/track/open/:campaignId/:subscriberId", async (req, res) => {
    try {
      const { campaignId, subscriberId } = req.params;

      // Record the open event
      await storage.createCampaignEvent({
        campaignId,
        subscriberId,
        eventType: "opened",
        metadata: {
          userAgent: req.headers["user-agent"] || "unknown",
          ip: req.ip || "unknown",
        },
      });

      // Return a 1x1 transparent GIF
      const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.set("Content-Type", "image/gif");
      res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.send(transparentGif);
    } catch (error) {
      // Still return the pixel even on error
      const transparentGif = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
      );
      res.set("Content-Type", "image/gif");
      res.send(transparentGif);
    }
  });

  // Click tracking - redirects to actual URL after recording click
  app.get("/api/track/click/:campaignId/:subscriberId", async (req, res) => {
    try {
      const { campaignId, subscriberId } = req.params;
      const { url } = req.query;

      if (!url || typeof url !== "string") {
        return res.status(400).send("Missing URL parameter");
      }

      // Security: Validate redirect URL to prevent open redirect attacks
      const allowedDomains = ["travi.world", "www.travi.world", "localhost"];
      let isValidRedirect = false;

      try {
        // Allow relative URLs
        if (url.startsWith("/") && !url.startsWith("//")) {
          isValidRedirect = true;
        } else {
          // Parse absolute URLs and validate domain
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname.toLowerCase();
          isValidRedirect = allowedDomains.some(
            domain => hostname === domain || hostname.endsWith(`.${domain}`)
          );
        }
      } catch {
        // Invalid URL format
        isValidRedirect = false;
      }

      if (!isValidRedirect) {
        return res.status(400).send("Invalid redirect URL");
      }

      // Record the click event
      await storage.createCampaignEvent({
        campaignId,
        subscriberId,
        eventType: "clicked",
        metadata: {
          url,
          userAgent: req.headers["user-agent"] || "unknown",
          ip: req.ip || "unknown",
        },
      });

      // Redirect to the validated URL
      res.redirect(url);
    } catch (error) {
      res.status(500).send("Tracking error");
    }
  });
}
