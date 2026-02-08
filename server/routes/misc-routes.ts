/**
 * Miscellaneous Routes
 * Collection of utility routes for AI images, internal links, scheduled content,
 * property leads, audit logs, content rules, and database backups.
 */

import type { Express, Request, Response } from "express";
import * as fs from "node:fs";
import * as path from "node:path";
import { eq, desc } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "../db";
import { contentRules } from "@shared/schema";
import { storage } from "../storage";
import { rateLimiters, requireAuth, requirePermission, checkReadOnlyMode } from "../security";
import { getStorageManager } from "../services/storage-adapter";
import { createLogger } from "../lib/logger";

// ============================================================================
// EMAIL HELPER
// ============================================================================

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

function buildLeadEmailHtml(
  lead: { id: string | number },
  fields: {
    name: string;
    email: string;
    phone?: string;
    propertyType?: string;
    budget?: string;
    paymentMethod?: string;
    preferredAreas?: string[];
    timeline?: string;
    message?: string;
  }
): string {
  const phoneRow = fields.phone
    ? `<tr><td style="padding: 12px 0; border-bottom: 1px solid #D3CFD8;">
        <span style="color: #A79FB2; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Phone</span><br>
        <a href="tel:${fields.phone}" style="color: #6443F4; font-size: 16px; text-decoration: none; font-weight: 500;">${fields.phone}</a>
      </td></tr>`
    : "";

  const prefRows: string[] = [];
  if (fields.propertyType) {
    prefRows.push(
      `<tr><td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px;">Property Type</td><td style="padding: 10px 0; color: #24103E; font-size: 14px; font-weight: 500;">${fields.propertyType}</td></tr>`
    );
  }
  if (fields.budget) {
    prefRows.push(
      `<tr><td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px;">Budget</td><td style="padding: 10px 0;"><span style="background: linear-gradient(135deg, #FF9327, #FFD112); color: #24103E; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${fields.budget}</span></td></tr>`
    );
  }
  if (fields.paymentMethod) {
    prefRows.push(
      `<tr><td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px;">Payment Method</td><td style="padding: 10px 0;"><span style="background: #6443F4; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">${fields.paymentMethod}</span></td></tr>`
    );
  }
  if (fields.preferredAreas?.length) {
    const badges = fields.preferredAreas
      .map(
        (area: string) =>
          `<span style="display: inline-block; background: #FEECF4; color: #F94498; padding: 4px 10px; border-radius: 20px; font-size: 12px; margin: 2px 4px 2px 0;">${area}</span>`
      )
      .join("");
    prefRows.push(
      `<tr><td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px; vertical-align: top;">Preferred Areas</td><td style="padding: 10px 0;">${badges}</td></tr>`
    );
  }
  if (fields.timeline) {
    prefRows.push(
      `<tr><td width="40%" style="padding: 10px 0; color: #504065; font-size: 14px;">Timeline</td><td style="padding: 10px 0; color: #24103E; font-size: 14px; font-weight: 500;">${fields.timeline}</td></tr>`
    );
  }

  const messageBlock = fields.message
    ? `<tr><td style="padding: 0 40px 30px 40px;"><h3 style="margin: 0 0 10px 0; color: #24103E; font-size: 16px; font-weight: 600;">Message</h3><p style="margin: 0; padding: 15px; background: #f8f5fc; border-radius: 8px; color: #504065; font-size: 14px; line-height: 1.6;">${fields.message}</p></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f8f5fc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f5fc; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(100,67,244,0.1);">
        <tr><td style="background: linear-gradient(135deg, #6443F4 0%, #F94498 100%); padding: 30px 40px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">New Property Lead</h1>
          <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Dubai Off-Plan Investment Inquiry</p>
        </td></tr>
        <tr><td style="background-color: #FEECF4; padding: 20px 40px; border-bottom: 1px solid #FDA9E5;">
          <p style="margin: 0; color: #504065; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Lead Name</p>
          <h2 style="margin: 5px 0 0 0; color: #24103E; font-size: 22px; font-weight: 600;">${fields.name.trim()}</h2>
        </td></tr>
        <tr><td style="padding: 30px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding: 12px 0; border-bottom: 1px solid #D3CFD8;">
              <span style="color: #A79FB2; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Email</span><br>
              <a href="mailto:${fields.email.trim()}" style="color: #6443F4; font-size: 16px; text-decoration: none; font-weight: 500;">${fields.email.trim()}</a>
            </td></tr>
            ${phoneRow}
          </table>
        </td></tr>
        <tr><td style="padding: 0 40px 30px 40px;">
          <h3 style="margin: 0 0 15px 0; color: #24103E; font-size: 16px; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #F94498;">Property Preferences</h3>
          <table width="100%" cellpadding="0" cellspacing="0">${prefRows.join("")}</table>
        </td></tr>
        ${messageBlock}
        <tr><td style="background: #24103E; padding: 25px 40px; text-align: center;">
          <p style="margin: 0 0 5px 0; color: #A79FB2; font-size: 11px;">Lead ID: ${lead.id}</p>
          <p style="margin: 0; color: #A79FB2; font-size: 11px;">Submitted: ${new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendLeadNotificationEmail(
  lead: { id: string | number },
  fields: {
    name: string;
    email: string;
    phone?: string;
    propertyType?: string;
    budget?: string;
    paymentMethod?: string;
    preferredAreas?: string[];
    timeline?: string;
    message?: string;
  }
): Promise<void> {
  const resend = getResendClient();
  if (!resend) return;

  const notificationEmail = process.env.LEAD_NOTIFICATION_EMAIL || "info@travi.world";
  await resend.emails.send({
    from: "Travi Leads <leads@travi.world>",
    to: notificationEmail,
    subject: `New Property Lead: ${fields.name.trim()} - Dubai Off-Plan`,
    html: buildLeadEmailHtml(lead, fields),
  });
}

// ============================================================================
// REGISTER MISCELLANEOUS ROUTES
// ============================================================================

const miscLog = createLogger("misc-routes");

export function registerMiscRoutes(app: Express): void {
  // ============================================================================
  // AI-GENERATED IMAGES
  // ============================================================================

  // Serve AI-generated images from storage
  app.get("/api/ai-images/:filename", async (req: Request, res: Response) => {
    const filename = req.params.filename;

    // Security: Prevent path traversal attacks
    if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      res.status(400).send("Invalid filename");
      return;
    }

    // Security: Only allow specific file extensions
    const allowedExtensions = ["jpg", "jpeg", "png", "webp", "gif"];
    const ext = filename.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      res.status(400).send("Invalid file type");
      return;
    }

    try {
      const objectPath = `public/ai-generated/${filename}`;
      const storageManager = getStorageManager();
      const buffer = await storageManager.download(objectPath);

      if (!buffer) {
        res.status(404).send("Image not found");
        return;
      }

      // Determine content type
      const fileExt = filename.split(".").pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        gif: "image/gif",
      };

      res.set("Content-Type", contentTypes[fileExt || "jpg"] || "image/jpeg");
      res.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
      res.send(buffer);
    } catch {
      res.status(404).send("Image not found");
    }
  });

  // ============================================================================
  // INTERNAL LINKS
  // ============================================================================

  app.get("/api/internal-links", async (req, res) => {
    try {
      const { contentId } = req.query;
      const links = await storage.getInternalLinks(contentId as string | undefined);
      res.json(links);
    } catch {
      res.status(500).json({ error: "Failed to fetch internal links" });
    }
  });

  app.post(
    "/api/internal-links",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const link = await storage.createInternalLink(req.body);
        res.status(201).json(link);
      } catch {
        res.status(500).json({ error: "Failed to create internal link" });
      }
    }
  );

  app.delete(
    "/api/internal-links/:id",
    requirePermission("canEdit"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        await storage.deleteInternalLink(req.params.id);
        res.status(204).send();
      } catch {
        res.status(500).json({ error: "Failed to delete internal link" });
      }
    }
  );

  // ============================================================================
  // SCHEDULED CONTENT
  // ============================================================================

  // Get scheduled content ready for publishing - admin only
  app.get("/api/scheduled-content", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const scheduledContent = await storage.getScheduledContentToPublish();
      res.json(scheduledContent);
    } catch {
      res.status(500).json({ error: "Failed to fetch scheduled content" });
    }
  });

  // ============================================================================
  // PROPERTY LEADS
  // ============================================================================

  // Property Lead submission (public) - for off-plan property inquiries
  app.post("/api/leads/property", rateLimiters.newsletter, async (req, res) => {
    try {
      const {
        email,
        name,
        phone,
        propertyType,
        budget,
        paymentMethod,
        preferredAreas,
        timeline,
        message,
        consent,
      } = req.body;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }
      if (!name || typeof name !== "string" || name.trim().length < 2) {
        return res.status(400).json({ error: "Name required" });
      }
      if (!consent) {
        return res.status(400).json({ error: "Consent required" });
      }

      // Get IP address and user agent
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      const userAgent = req.headers["user-agent"] || "";

      // Save lead to database
      const lead = await storage.createPropertyLead({
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: phone || null,
        propertyType: propertyType || null,
        budget: budget || null,
        paymentMethod: paymentMethod || null,
        preferredAreas: preferredAreas || null,
        timeline: timeline || null,
        message: message || null,
        source: "off-plan-form",
        status: "new",
        ipAddress,
        userAgent,
        consentGiven: true,
      });

      // Send email notification to admin
      await sendLeadNotificationEmail(lead, {
        name,
        email,
        phone,
        propertyType,
        budget,
        paymentMethod,
        preferredAreas,
        timeline,
        message,
      }).catch(emailError => {
        miscLog.error({ err: emailError }, "Failed to send lead notification email");
      });

      res.json({
        success: true,
        message: "Thank you! Our team will contact you within 24 hours.",
        leadId: lead.id,
      });
    } catch {
      res.status(500).json({ error: "Failed to submit. Please try again." });
    }
  });

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  app.get("/api/audit-logs", requirePermission("canViewAuditLogs"), async (req, res) => {
    try {
      const { userId, entityType, entityId, actionType, limit, offset } = req.query;
      const filters = {
        userId: userId as string | undefined,
        entityType: entityType as string | undefined,
        entityId: entityId as string | undefined,
        actionType: actionType as string | undefined,
        limit: limit ? Number.parseInt(limit as string) : 50,
        offset: offset ? Number.parseInt(offset as string) : 0,
      };
      const [logs, total] = await Promise.all([
        storage.getAuditLogs(filters),
        storage.getAuditLogCount(filters),
      ]);
      res.json({ logs, total, limit: filters.limit, offset: filters.offset });
    } catch {
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // ============================================================================
  // CONTENT RULES
  // ============================================================================

  // Get active content rules
  app.get("/api/content-rules", requireAuth, async (req, res) => {
    try {
      const rules = await db
        .select()
        .from(contentRules)
        .where(eq(contentRules.isActive, true))
        .limit(1);
      if (rules.length === 0) {
        // Return default rules if none exist
        const { DEFAULT_CONTENT_RULES } = await import("@shared/schema");
        return res.json({ id: null, ...DEFAULT_CONTENT_RULES });
      }
      res.json(rules[0]);
    } catch {
      res.status(500).json({ error: "Failed to fetch content rules" });
    }
  });

  // Save/update content rules
  app.post("/api/content-rules", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const data = req.body;

      // First, deactivate all existing rules
      await db.update(contentRules).set({ isActive: false } as any);

      // Check if rule with this name exists
      const existing = await db
        .select()
        .from(contentRules)
        .where(eq(contentRules.name, data.name))
        .limit(1);

      if (existing.length > 0) {
        // Update existing rule
        await db
          .update(contentRules)
          .set({ ...data, isActive: true, updatedAt: new Date() } as any)
          .where(eq(contentRules.name, data.name));
        res.json({ success: true, updated: true });
      } else {
        // Insert new rule
        await db.insert(contentRules).values({
          ...data,
          isActive: true,
          createdBy: (req as any).user?.id,
        } as any);
        res.json({ success: true, created: true });
      }
    } catch {
      res.status(500).json({ error: "Failed to save content rules" });
    }
  });

  // Get all content rules (including inactive)
  app.get("/api/content-rules/all", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const rules = await db.select().from(contentRules).orderBy(desc(contentRules.createdAt));
      res.json(rules);
    } catch {
      res.status(500).json({ error: "Failed to fetch content rules" });
    }
  });

  // ============================================================================
  // DATABASE BACKUPS (Admin only)
  // Access control: requirePermission("canManageSettings") ensures only
  // authorized admins can access these endpoints (CWE-770 mitigation).
  // ============================================================================

  app.get("/api/admin/backups", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
      if (!fs.existsSync(backupDir)) {
        return res.json({ backups: [], directory: backupDir });
      }
      const files = fs
        .readdirSync(backupDir)
        .filter(f => f.startsWith("backup-") && f.endsWith(".sql.gz"))
        .map(f => {
          const stats = fs.statSync(path.join(backupDir, f));
          return {
            name: f,
            size: stats.size,
            createdAt: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      res.json({ backups: files, directory: backupDir });
    } catch {
      res.status(500).json({ error: "Failed to list backups" });
    }
  });

  app.post("/api/admin/backups", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { triggerBackup } = await import("../lib/backup-scheduler");
      const result = await triggerBackup();
      if (result.success) {
        res.json({ success: true, backup: result });
      } else {
        res.status(500).json({ error: result.error || "Backup failed" });
      }
    } catch {
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/admin/backups/status", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { getSchedulerStatus } = await import("../lib/backup-scheduler");
      res.json(getSchedulerStatus());
    } catch {
      res.status(500).json({ error: "Failed to get backup status" });
    }
  });
}
