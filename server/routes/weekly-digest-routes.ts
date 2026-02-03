/**
 * Weekly Digest Admin Routes
 * Endpoints for managing and triggering weekly digest emails
 */

import type { Express, Request, Response } from "express";
import { requireAuth, requirePermission, type AuthRequest } from "../security";

export function registerWeeklyDigestRoutes(app: Express): void {
  // ============================================================================
  // WEEKLY DIGEST ADMIN ENDPOINTS
  // ============================================================================

  // Get weekly digest status (admin only)
  app.get(
    "/api/admin/digest/status",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { getDigestStatus } = await import("../newsletter/weekly-digest");
        const status = await getDigestStatus();
        res.json(status);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch digest status" });
      }
    }
  );

  // Manual trigger weekly digest (admin only)
  app.post(
    "/api/admin/digest/send-now",
    requireAuth,
    requirePermission("canManageUsers"),
    async (req, res) => {
      try {
        const { sendWeeklyDigest, isWeeklyDigestEnabled } =
          await import("../newsletter/weekly-digest");

        if (!isWeeklyDigestEnabled()) {
          return res.status(400).json({
            error: "Weekly digest feature is disabled. Set ENABLE_WEEKLY_DIGEST=true to enable.",
          });
        }

        // Allow force flag to bypass week dedupe protection
        const { force } = req.body || {};
        const result = await sendWeeklyDigest({ force: !!force });

        if (result.success) {
          res.json({
            success: true,
            message: `Weekly digest sent successfully to ${result.recipientCount} subscribers`,
            campaignId: result.campaignId,
            recipientCount: result.recipientCount,
            weekNumber: result.weekNumber,
          });
        } else {
          res.status(400).json({
            error: result.error || "Failed to send digest",
            skippedReason: result.skippedReason,
            weekNumber: result.weekNumber,
          });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to send weekly digest" });
      }
    }
  );

  // Test digest endpoint: Send to single test email (admin only)
  app.post(
    "/api/admin/digest/test",
    requireAuth,
    requirePermission("canManageSettings"),
    async (req, res) => {
      try {
        const { recipientEmail } = req.body;

        if (!recipientEmail || typeof recipientEmail !== "string") {
          return res.status(400).json({ error: "recipientEmail is required" });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
          return res.status(400).json({ error: "Invalid email format" });
        }

        const { sendTestDigest } = await import("../newsletter/weekly-digest");
        const result = await sendTestDigest(recipientEmail);

        if (result.success) {
          res.json({
            success: true,
            previewHtml: result.previewHtml,
            sentTo: result.sentTo,
            generatedAt: result.generatedAt,
            articleCount: result.articleCount,
          });
        } else {
          res.status(400).json({
            success: false,
            error: result.error,
            sentTo: result.sentTo,
            generatedAt: result.generatedAt,
          });
        }
      } catch (error) {
        res.status(500).json({ error: "Failed to send test digest" });
      }
    }
  );

  // Dry-run digest endpoint: Generate content without sending (admin only)
  app.post(
    "/api/admin/digest/dry-run",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { dryRunDigest } = await import("../newsletter/weekly-digest");
        const result = await dryRunDigest();

        res.json({
          previewHtml: result.previewHtml,
          articleCount: result.articleCount,
          estimatedRecipients: result.estimatedRecipients,
          generatedAt: result.generatedAt,
          subject: result.subject,
          subjectHe: result.subjectHe,
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to generate dry-run digest" });
      }
    }
  );

  // Digest KPI stats endpoint (admin only)
  app.get(
    "/api/admin/digest/stats",
    requireAuth,
    requirePermission("canEdit"),
    async (req, res) => {
      try {
        const { getDigestKPIStats } = await import("../newsletter/weekly-digest");
        const stats = await getDigestKPIStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch digest stats" });
      }
    }
  );
}
