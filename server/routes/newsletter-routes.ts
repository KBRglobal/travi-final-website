/**
 * Newsletter Routes
 * Subscription, confirmation, unsubscribe, and subscriber management
 */

import type { Express } from "express";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";
import { Resend } from "resend";
import { db } from "../db";
import { newsletterSubscribers } from "@shared/schema";
import { storage } from "../storage";
import { rateLimiters, requirePermission, checkReadOnlyMode } from "../security";
import { logAuditEvent } from "../utils/audit-logger";

// ============================================================================
// NEWSLETTER EMAIL HELPERS
// ============================================================================

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

async function sendConfirmationEmail(
  email: string,
  token: string,
  firstName?: string
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    return false;
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000";

  const confirmUrl = `${baseUrl}/api/newsletter/confirm/${token}`;
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";

  try {
    await resend.emails.send({
      from: "Dubai Travel <noreply@dubaitravel.com>",
      to: email,
      subject: "Please confirm your subscription to Dubai Travel",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0066cc; margin-bottom: 10px;">Dubai Travel</h1>
          </div>

          <p style="font-size: 16px;">${greeting}</p>

          <p style="font-size: 16px;">Thank you for signing up for our newsletter! Please confirm your subscription by clicking the button below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmUrl}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Confirm Subscription
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">If you didn't sign up for this newsletter, you can safely ignore this email.</p>

          <p style="font-size: 14px; color: #666;">This link will expire in 48 hours.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="font-size: 12px; color: #999; text-align: center;">
            Dubai Travel - Your guide to the best of Dubai
          </p>
        </body>
        </html>
      `,
    });

    return true;
  } catch {
    return false;
  }
}

async function sendWelcomeEmail(
  email: string,
  firstName?: string,
  unsubscribeToken?: string
): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    return false;
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:5000";

  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  const unsubscribeUrl = unsubscribeToken
    ? `${baseUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`
    : `${baseUrl}/api/newsletter/unsubscribe`;

  try {
    await resend.emails.send({
      from: "Dubai Travel <noreply@dubaitravel.com>",
      to: email,
      subject: "Welcome to Dubai Travel Newsletter!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0066cc; margin-bottom: 10px;">Dubai Travel</h1>
          </div>

          <p style="font-size: 16px;">${greeting}</p>

          <p style="font-size: 16px;">Welcome to the Dubai Travel newsletter! We're thrilled to have you join our community of travel enthusiasts.</p>

          <p style="font-size: 16px;">Here's what you can expect from us:</p>

          <ul style="font-size: 16px; margin: 20px 0; padding-left: 24px;">
            <li style="margin-bottom: 8px;">Exclusive travel tips and insider guides</li>
            <li style="margin-bottom: 8px;">Special deals on hotels and attractions</li>
            <li style="margin-bottom: 8px;">Latest events and happenings in Dubai</li>
            <li style="margin-bottom: 8px;">Hidden gems and local recommendations</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${baseUrl}" style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Explore Dubai Travel
            </a>
          </div>

          <p style="font-size: 14px; color: #666;">Stay tuned for our next newsletter packed with amazing Dubai content!</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

          <p style="font-size: 12px; color: #999; text-align: center;">
            Dubai Travel - Your guide to the best of Dubai<br>
            <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
          </p>
        </body>
        </html>
      `,
    });

    return true;
  } catch {
    return false;
  }
}

function renderNewsletterPage(success: boolean, message: string, title: string): string {
  const bgColor = success ? "#e8f5e9" : "#ffebee";
  const textColor = success ? "#2e7d32" : "#c62828";
  const icon = success ? "&#10003;" : "&#10007;";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Dubai Travel</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 20px;
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          max-width: 480px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${bgColor};
          color: ${textColor};
          font-size: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        h1 {
          color: #333;
          font-size: 24px;
          margin-bottom: 16px;
        }
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          margin-top: 24px;
          padding: 12px 24px;
          background: #0066cc;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
        }
        .button:hover { background: #0052a3; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="button">Visit Dubai Travel</a>
      </div>
    </body>
    </html>
  `;
}

function renderConfirmationPage(success: boolean, message: string): string {
  return renderNewsletterPage(success, message, success ? "You're All Set!" : "Oops!");
}

function renderUnsubscribePage(success: boolean, message: string): string {
  return renderNewsletterPage(success, message, success ? "Unsubscribed" : "Oops!");
}

// ============================================================================
// NEWSLETTER ROUTES
// ============================================================================

export function registerNewsletterRoutes(app: Express): void {
  // Newsletter subscription (public) - Double Opt-In flow with rate limiting
  app.post("/api/newsletter/subscribe", rateLimiters.newsletter, async (req, res) => {
    try {
      const { email, firstName, lastName, source } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }

      // Get IP address
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

      // Check if already subscribed
      const existing = await storage.getNewsletterSubscriberByEmail(email);
      if (existing) {
        if (existing.status === "subscribed") {
          return res.json({ success: true, message: "Already subscribed" });
        }
        if (existing.status === "pending_confirmation") {
          return res.json({
            success: true,
            message: "Confirmation email already sent. Please check your inbox.",
          });
        }
        // Allow resubscription for unsubscribed users
        if (existing.status === "unsubscribed") {
          const confirmToken = crypto.randomUUID();
          const consentEntry = {
            action: "resubscribe" as const,
            timestamp: new Date().toISOString(),
            ipAddress,
            userAgent: req.headers["user-agent"],
            source: source || "coming_soon",
          };
          const consentLog = [...(existing.consentLog || []), consentEntry];

          await storage.updateNewsletterSubscriber(existing.id, {
            status: "pending_confirmation",
            confirmToken,
            consentLog,
            ipAddress,
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
          });

          // Send confirmation email
          await sendConfirmationEmail(
            email,
            confirmToken,
            firstName || existing.firstName || undefined
          );

          return res.json({
            success: true,
            message: "Please check your email to confirm your subscription",
          });
        }
      }

      // Generate confirmation token
      const confirmToken = crypto.randomUUID();

      // Create consent log entry
      const consentEntry = {
        action: "subscribe" as const,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: req.headers["user-agent"],
        source: source || "coming_soon",
      };

      // Save to database with pending status
      await storage.createNewsletterSubscriber({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        source: source || "coming_soon",
        status: "pending_confirmation",
        ipAddress,
        confirmToken,
        consentLog: [consentEntry],
      });

      // Send confirmation email
      await sendConfirmationEmail(email, confirmToken, firstName || undefined);

      res.json({ success: true, message: "Please check your email to confirm your subscription" });
    } catch {
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // Newsletter confirmation endpoint - Double Opt-In step 2
  app.get("/api/newsletter/confirm/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).send(renderConfirmationPage(false, "Invalid confirmation link"));
      }

      const subscriber = await storage.getNewsletterSubscriberByToken(token);

      if (!subscriber) {
        return res
          .status(404)
          .send(renderConfirmationPage(false, "Confirmation link not found or expired"));
      }

      if (subscriber.status === "subscribed") {
        return res.send(renderConfirmationPage(true, "Your subscription was already confirmed!"));
      }

      // Get IP address
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

      // Create consent log entry for confirmation
      const consentEntry = {
        action: "confirm" as const,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: req.headers["user-agent"],
      };
      const consentLog = [...(subscriber.consentLog || []), consentEntry];

      // Update subscriber status
      await storage.updateNewsletterSubscriber(subscriber.id, {
        status: "subscribed",
        consentLog,
        isActive: true,
      });

      // Clear confirmToken and set confirmedAt in separate update (since confirmedAt is not in insert schema)
      await db
        .update(newsletterSubscribers)
        .set({
          confirmToken: null,
          confirmedAt: new Date(),
        } as any)
        .where(eq(newsletterSubscribers.id, subscriber.id));

      // Send welcome email (fire and forget - don't block response)
      sendWelcomeEmail(subscriber.email, subscriber.firstName || undefined, subscriber.id).catch(
        () => {}
      );

      res.send(renderConfirmationPage(true, "Thank you! Your subscription has been confirmed."));
    } catch {
      res
        .status(500)
        .send(renderConfirmationPage(false, "Something went wrong. Please try again."));
    }
  });

  // Newsletter unsubscribe endpoint (public) - requires token for security
  app.get("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res
          .status(400)
          .send(
            renderUnsubscribePage(
              false,
              "Invalid unsubscribe link. Please use the link from your email."
            )
          );
      }

      const subscriber = await storage.getNewsletterSubscriberByToken(token as string);

      if (!subscriber) {
        return res.send(
          renderUnsubscribePage(false, "Unsubscribe link not found or already used.")
        );
      }

      if (subscriber.status === "unsubscribed") {
        return res.send(renderUnsubscribePage(true, "You have already been unsubscribed."));
      }

      // Get IP address
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

      // Create consent log entry
      const consentEntry = {
        action: "unsubscribe" as const,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: req.headers["user-agent"],
      };
      const consentLog = [...(subscriber.consentLog || []), consentEntry];

      // Update subscriber status
      await storage.updateNewsletterSubscriber(subscriber.id, {
        status: "unsubscribed",
        consentLog,
        isActive: false,
      });

      // Set unsubscribedAt
      await db
        .update(newsletterSubscribers)
        .set({ unsubscribedAt: new Date() } as any)
        .where(eq(newsletterSubscribers.id, subscriber.id));

      res.send(
        renderUnsubscribePage(true, "You have been successfully unsubscribed from our newsletter.")
      );
    } catch {
      res.status(500).send(renderUnsubscribePage(false, "Something went wrong. Please try again."));
    }
  });

  // Newsletter subscribers list (admin only)
  app.get(
    "/api/newsletter/subscribers",
    requirePermission("canViewAnalytics"),
    async (req, res) => {
      try {
        const { status } = req.query;
        const filters = status ? { status: status as string } : undefined;
        const subscribers = await storage.getNewsletterSubscribers(filters);
        res.json(subscribers);
      } catch {
        res.status(500).json({ error: "Failed to fetch subscribers" });
      }
    }
  );

  // Delete newsletter subscriber (admin only - right to be forgotten)
  app.delete(
    "/api/newsletter/subscribers/:id",
    requirePermission("canManageUsers"),
    async (req, res) => {
      try {
        const { id } = req.params;
        const subscriber = await storage.getNewsletterSubscriber(id);

        if (!subscriber) {
          return res.status(404).json({ error: "Subscriber not found" });
        }

        const deleted = await storage.deleteNewsletterSubscriber(id);
        if (deleted) {
          await logAuditEvent(
            req,
            "delete",
            "newsletter_subscriber",
            id,
            `Deleted newsletter subscriber: ${subscriber.email}`,
            { email: subscriber.email }
          );

          res.json({ success: true, message: "Subscriber deleted successfully" });
        } else {
          res.status(500).json({ error: "Failed to delete subscriber" });
        }
      } catch {
        res.status(500).json({ error: "Failed to delete subscriber" });
      }
    }
  );

  // Update subscriber preferences (language, interest tags)
  app.patch(
    "/api/newsletter/subscribers/:id",
    requirePermission("canManageUsers"),
    checkReadOnlyMode,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { languagePreference, interestTags, tags, preferences } = req.body;

        const subscriber = await storage.getNewsletterSubscriber(id);
        if (!subscriber) {
          return res.status(404).json({ error: "Subscriber not found" });
        }

        const updateData: Record<string, any> = {};
        if (languagePreference !== undefined) updateData.languagePreference = languagePreference;
        if (interestTags !== undefined) updateData.interestTags = interestTags;
        if (tags !== undefined) updateData.tags = tags;
        if (preferences !== undefined) updateData.preferences = preferences;

        const updated = await storage.updateNewsletterSubscriber(id, updateData);
        await logAuditEvent(
          req,
          "update",
          "newsletter_subscriber",
          id,
          `Updated subscriber preferences: ${subscriber.email}`
        );
        res.json(updated);
      } catch {
        res.status(500).json({ error: "Failed to update subscriber" });
      }
    }
  );
}
