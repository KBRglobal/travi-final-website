import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import crypto from "crypto";
import { Resend } from "resend";
import {
  rateLimiters,
  requirePermission,
  checkReadOnlyMode,
} from "../security";

// Newsletter email helpers
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured");
    return null;
  }
  return new Resend(apiKey);
}

async function sendConfirmationEmail(email: string, token: string, firstName?: string): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.log("[Newsletter] Resend not configured, skipping confirmation email for:", email);
    return false;
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';

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
    console.log("[Newsletter] Confirmation email sent to:", email);
    return true;
  } catch (error) {
    console.error("[Newsletter] Failed to send confirmation email:", error);
    return false;
  }
}

async function sendWelcomeEmail(email: string, firstName?: string, unsubscribeToken?: string): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.log("[Newsletter] Resend not configured, skipping welcome email for:", email);
    return false;
  }

  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';

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
    console.log("[Newsletter] Welcome email sent to:", email);
    return true;
  } catch (error) {
    console.error("[Newsletter] Failed to send welcome email:", error);
    return false;
  }
}

function renderConfirmationPage(success: boolean, message: string): string {
  return renderNewsletterPage(success, message, success ? "You're All Set!" : "Oops!");
}

function renderUnsubscribePage(success: boolean, message: string): string {
  return renderNewsletterPage(success, message, success ? "Unsubscribed" : "Oops!");
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

export function registerNewsletterRoutes(app: Express): void {
  // Newsletter subscription endpoint - Double Opt-In step 1
  app.post("/api/newsletter/subscribe", rateLimiters.newsletter, async (req, res) => {
    try {
      const { email, firstName, lastName, source } = req.body;
      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ error: "Valid email required" });
      }

      // Get IP address
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";

      // Check if already subscribed
      const existing = await storage.getNewsletterSubscriberByEmail(email);
      if (existing) {
        if (existing.status === "subscribed") {
          return res.json({ success: true, message: "Already subscribed" });
        }
        if (existing.status === "pending_confirmation") {
          return res.json({ success: true, message: "Confirmation email already sent. Please check your inbox." });
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
          await sendConfirmationEmail(email, confirmToken, firstName || existing.firstName || undefined);

          return res.json({ success: true, message: "Please check your email to confirm your subscription" });
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

      console.log("[Newsletter] New subscriber saved (pending confirmation):", email);
      res.json({ success: true, message: "Please check your email to confirm your subscription" });
    } catch (error) {
      console.error("Error subscribing to newsletter:", error);
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
        return res.status(404).send(renderConfirmationPage(false, "Confirmation link not found or expired"));
      }

      if (subscriber.status === "subscribed") {
        return res.send(renderConfirmationPage(true, "Your subscription was already confirmed!"));
      }

      // Update status to subscribed
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      const confirmationEntry = {
        action: "confirm" as const,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: req.headers["user-agent"],
      };
      const consentLog = [...(subscriber.consentLog || []), confirmationEntry];

      await storage.updateNewsletterSubscriber(subscriber.id, {
        status: "subscribed",
        confirmedAt: new Date(),
        consentLog,
        confirmToken: null, // Clear token after confirmation
      });

      // Send welcome email
      await sendWelcomeEmail(subscriber.email, subscriber.firstName || undefined, (subscriber as any).unsubscribeToken || undefined);

      console.log("[Newsletter] Subscription confirmed:", subscriber.email);
      res.send(renderConfirmationPage(true, "Thank you for confirming! Check your email for a welcome message."));
    } catch (error) {
      console.error("Error confirming newsletter subscription:", error);
      res.status(500).send(renderConfirmationPage(false, "Something went wrong. Please try again later."));
    }
  });

  // Newsletter unsubscribe endpoint
  app.get("/api/newsletter/unsubscribe", async (req, res) => {
    try {
      const { email, token } = req.query;

      if (!email && !token) {
        return res.status(400).send(renderUnsubscribePage(false, "Email or token required"));
      }

      let subscriber;
      if (token && typeof token === "string") {
        subscriber = await (storage as any).getNewsletterSubscriberByUnsubscribeToken(token);
      } else if (email && typeof email === "string") {
        subscriber = await storage.getNewsletterSubscriberByEmail(email);
      }

      if (!subscriber) {
        return res.status(404).send(renderUnsubscribePage(false, "Subscriber not found"));
      }

      if (subscriber.status === "unsubscribed") {
        return res.send(renderUnsubscribePage(true, "You were already unsubscribed."));
      }

      // Update status to unsubscribed
      const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
      const unsubscribeEntry = {
        action: "unsubscribe" as const,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent: req.headers["user-agent"],
      };
      const consentLog = [...(subscriber.consentLog || []), unsubscribeEntry];

      await storage.updateNewsletterSubscriber(subscriber.id, {
        status: "unsubscribed",
        unsubscribedAt: new Date(),
        consentLog,
      });

      console.log("[Newsletter] Unsubscribed:", subscriber.email);
      res.send(renderUnsubscribePage(true, "You have been successfully unsubscribed. You can resubscribe anytime."));
    } catch (error) {
      console.error("Error unsubscribing from newsletter:", error);
      res.status(500).send(renderUnsubscribePage(false, "Something went wrong. Please try again later."));
    }
  });

  // Get all newsletter subscribers (admin only)
  app.get("/api/newsletter/subscribers", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const subscribers = await storage.getNewsletterSubscribers();
      res.json(subscribers);
    } catch (error) {
      console.error("Error fetching newsletter subscribers:", error);
      res.status(500).json({ error: "Failed to fetch subscribers" });
    }
  });

  // Delete newsletter subscriber (admin only)
  app.delete("/api/newsletter/subscribers/:id", requirePermission("canManageUsers"), async (req, res) => {
    try {
      const subscriber = await (storage as any).getNewsletterSubscriberById(req.params.id);
      if (!subscriber) {
        return res.status(404).json({ error: "Subscriber not found" });
      }

      await storage.deleteNewsletterSubscriber(req.params.id);
      console.log("[Newsletter] Deleted subscriber:", subscriber.email);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting newsletter subscriber:", error);
      res.status(500).json({ error: "Failed to delete subscriber" });
    }
  });

  // Update newsletter subscriber (admin only)
  app.patch("/api/newsletter/subscribers/:id", requirePermission("canManageUsers"), checkReadOnlyMode, async (req, res) => {
    try {
      const subscriber = await (storage as any).getNewsletterSubscriberById(req.params.id);
      if (!subscriber) {
        return res.status(404).json({ error: "Subscriber not found" });
      }

      const { status, firstName, lastName, tags } = req.body;
      const updates: any = {};
      if (status) updates.status = status;
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (tags !== undefined) updates.tags = tags;

      const updated = await storage.updateNewsletterSubscriber(req.params.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Error updating newsletter subscriber:", error);
      res.status(500).json({ error: "Failed to update subscriber" });
    }
  });

  // Newsletter A/B test routes
  app.get("/api/newsletter/ab-tests", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const tests = await storage.getNewsletterAbTests();
      res.json(tests);
    } catch (error) {
      console.error("Error fetching A/B tests:", error);
      res.status(500).json({ error: "Failed to fetch A/B tests" });
    }
  });

  app.get("/api/newsletter/ab-tests/:id", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const test = await storage.getNewsletterAbTest(req.params.id);
      if (!test) {
        return res.status(404).json({ error: "A/B test not found" });
      }
      res.json(test);
    } catch (error) {
      console.error("Error fetching A/B test:", error);
      res.status(500).json({ error: "Failed to fetch A/B test" });
    }
  });

  app.post("/api/newsletter/ab-tests", requirePermission("canCreate"), checkReadOnlyMode, async (req, res) => {
    try {
      const test = await storage.createNewsletterAbTest(req.body);
      res.status(201).json(test);
    } catch (error) {
      console.error("Error creating A/B test:", error);
      res.status(500).json({ error: "Failed to create A/B test" });
    }
  });

  app.patch("/api/newsletter/ab-tests/:id", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const test = await storage.updateNewsletterAbTest(req.params.id, req.body);
      res.json(test);
    } catch (error) {
      console.error("Error updating A/B test:", error);
      res.status(500).json({ error: "Failed to update A/B test" });
    }
  });

  app.post("/api/newsletter/ab-tests/:id/start", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const test = await storage.updateNewsletterAbTest(req.params.id, {
        status: "running",
        startedAt: new Date(),
      });
      res.json(test);
    } catch (error) {
      console.error("Error starting A/B test:", error);
      res.status(500).json({ error: "Failed to start A/B test" });
    }
  });

  app.post("/api/newsletter/ab-tests/:id/select-winner", requirePermission("canEdit"), checkReadOnlyMode, async (req, res) => {
    try {
      const { winnerVariant } = req.body;
      if (!winnerVariant) {
        return res.status(400).json({ error: "Winner variant required" });
      }

      const test = await storage.updateNewsletterAbTest(req.params.id, {
        status: "completed",
        winnerVariant,
        completedAt: new Date(),
      } as any);
      res.json(test);
    } catch (error) {
      console.error("Error selecting winner:", error);
      res.status(500).json({ error: "Failed to select winner" });
    }
  });

  app.delete("/api/newsletter/ab-tests/:id", requirePermission("canDelete"), checkReadOnlyMode, async (req, res) => {
    try {
      await storage.deleteNewsletterAbTest(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting A/B test:", error);
      res.status(500).json({ error: "Failed to delete A/B test" });
    }
  });

  // Newsletter bounce stats
  app.get("/api/newsletter/bounce-stats", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const stats = await (storage as any).getNewsletterBounceStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching bounce stats:", error);
      res.status(500).json({ error: "Failed to fetch bounce stats" });
    }
  });

  // Newsletter segments
  app.get("/api/newsletter/segments", requirePermission("canViewAnalytics"), async (req, res) => {
    try {
      const segments = await (storage as any).getNewsletterSegments();
      res.json(segments);
    } catch (error) {
      console.error("Error fetching segments:", error);
      res.status(500).json({ error: "Failed to fetch segments" });
    }
  });

  // Send newsletter campaign
  app.post("/api/newsletter/send", requirePermission("canPublish"), checkReadOnlyMode, async (req, res) => {
    try {
      const { subject, content, segmentId, scheduledFor } = req.body;

      if (!subject || !content) {
        return res.status(400).json({ error: "Subject and content are required" });
      }

      // Create campaign
      const campaign = await (storage as any).createNewsletterCampaign({
        subject,
        content,
        segmentId: segmentId || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: scheduledFor ? "scheduled" : "sent",
        sentAt: scheduledFor ? null : new Date(),
      });

      // If immediate send, queue the send job
      if (!scheduledFor) {
        // Queue newsletter send job here
        console.log("[Newsletter] Campaign created and queued:", campaign.id);
      }

      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error sending newsletter:", error);
      res.status(500).json({ error: "Failed to send newsletter" });
    }
  });
}
