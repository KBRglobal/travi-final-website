/**
 * AEO Integrations
 * Slack notifications, Google Search Console, Webhooks
 */

import { log } from "../lib/logger";
import { registerNotificationHandler } from "./aeo-jobs";
import { safeFetch } from "../lib/ssrf-protection";

const aeoLogger = {
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[AEO Integrations] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) =>
    log.info(`[AEO Integrations] ${msg}`, data),
};

// ============================================================================
// Slack Integration
// ============================================================================

interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

let slackConfig: SlackConfig | null = null;

/**
 * Configure Slack integration
 */
export function configureSlack(config: SlackConfig): void {
  slackConfig = config;
  aeoLogger.info("Slack integration configured");

  // Register as notification handler
  registerNotificationHandler(async (message, data) => {
    await sendSlackNotification(message, data);
  });
}

/**
 * Send a Slack notification
 */
export async function sendSlackNotification(
  message: string,
  data?: Record<string, any>
): Promise<boolean> {
  if (!slackConfig?.webhookUrl) {
    return false;
  }

  try {
    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `:robot_face: *AEO Alert*\n${message}`,
        },
      },
    ];

    if (data) {
      blocks.push({
        type: "section",
        fields: Object.entries(data)
          .slice(0, 10)
          .map(([key, value]) => ({
            type: "mrkdwn",
            text: `*${key}:*\n${typeof value === "object" ? JSON.stringify(value) : value}`,
          })),
      });
    }

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Sent at ${new Date().toISOString()}`,
        },
      ],
    });

    const response = await fetch(slackConfig.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: slackConfig.channel,
        username: slackConfig.username || "AEO Bot",
        icon_emoji: slackConfig.iconEmoji || ":chart_with_upwards_trend:",
        blocks,
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    aeoLogger.info("Slack notification sent");
    return true;
  } catch (error) {
    aeoLogger.error("Failed to send Slack notification", { error });
    return false;
  }
}

// ============================================================================
// Google Search Console Integration
// ============================================================================

interface GSCConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  siteUrl: string;
}

let gscConfig: GSCConfig | null = null;
let gscAccessToken: string | null = null;
let gscTokenExpiry: Date | null = null;

/**
 * Configure Google Search Console integration
 */
export function configureGSC(config: GSCConfig): void {
  gscConfig = config;
  aeoLogger.info("Google Search Console integration configured");
}

/**
 * Get GSC access token
 */
async function getGSCAccessToken(): Promise<string | null> {
  if (!gscConfig) return null;

  if (gscAccessToken && gscTokenExpiry && gscTokenExpiry > new Date()) {
    return gscAccessToken;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: gscConfig.clientId,
        client_secret: gscConfig.clientSecret,
        refresh_token: gscConfig.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh GSC token");
    }

    const data = await response.json();
    gscAccessToken = data.access_token;
    gscTokenExpiry = new Date(Date.now() + data.expires_in * 1000 - 60000);

    return gscAccessToken;
  } catch (error) {
    aeoLogger.error("Failed to get GSC access token", { error });
    return null;
  }
}

/**
 * Get search analytics from GSC
 */
export async function getGSCSearchAnalytics(
  startDate: string,
  endDate: string,
  dimensions: ("query" | "page" | "country" | "device")[] = ["query", "page"]
): Promise<any> {
  if (!gscConfig) {
    throw new Error("GSC not configured");
  }

  const accessToken = await getGSCAccessToken();
  if (!accessToken) {
    throw new Error("Failed to get GSC access token");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscConfig.siteUrl)}/searchAnalytics/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions,
          rowLimit: 1000,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GSC API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.rows || [];
  } catch (error) {
    aeoLogger.error("Failed to get GSC search analytics", { error });
    throw error;
  }
}

/**
 * Get AI-related queries from GSC
 */
export async function getAIRelatedQueries(
  startDate: string,
  endDate: string
): Promise<
  Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>
> {
  const allQueries = await getGSCSearchAnalytics(startDate, endDate, ["query"]);

  // Filter for AI-related patterns
  const aiPatterns = [
    /chatgpt/i,
    /perplexity/i,
    /ai overview/i,
    /claude/i,
    /what is/i,
    /how to/i,
    /best \w+ for/i,
    /compare/i,
    /vs\s/i,
  ];

  return allQueries
    .filter((row: any) => aiPatterns.some(p => p.test(row.keys[0])))
    .map((row: any) => ({
      query: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }))
    .sort((a: any, b: any) => b.impressions - a.impressions);
}

// ============================================================================
// Webhook Integration
// ============================================================================

interface WebhookConfig {
  url: string;
  secret?: string;
  events: ("citation" | "capsule_generated" | "crawler_visit" | "alert")[];
}

const webhooks: WebhookConfig[] = [];

/**
 * Register a webhook
 */
export function registerWebhook(config: WebhookConfig): void {
  webhooks.push(config);
  aeoLogger.info("Webhook registered", { url: config.url, events: config.events });
}

/**
 * Remove a webhook
 */
export function removeWebhook(url: string): boolean {
  const index = webhooks.findIndex(w => w.url === url);
  if (index !== -1) {
    webhooks.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Send webhook event
 */
export async function sendWebhookEvent(
  eventType: "citation" | "capsule_generated" | "crawler_visit" | "alert",
  payload: Record<string, any>
): Promise<void> {
  const relevantWebhooks = webhooks.filter(w => w.events.includes(eventType));

  for (const webhook of relevantWebhooks) {
    try {
      const body = JSON.stringify({
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Add signature if secret is configured
      if (webhook.secret) {
        const crypto = await import("node:crypto");
        const signature = crypto.createHmac("sha256", webhook.secret).update(body).digest("hex");
        headers["X-AEO-Signature"] = signature;
      }

      // safeFetch handles SSRF validation, redirect blocking, and timeout
      const response = await safeFetch(webhook.url, {
        method: "POST",
        headers,
        body,
        timeout: 5000,
      });

      if (!response.ok) {
        aeoLogger.error("Webhook delivery failed", {
          url: webhook.url,
          status: response.status,
        });
      }
    } catch (error) {
      aeoLogger.error("Webhook delivery error", { url: webhook.url, error });
    }
  }
}

/**
 * Get all registered webhooks
 */
export function getWebhooks(): WebhookConfig[] {
  return [...webhooks];
}

// ============================================================================
// Email Notifications
// ============================================================================

interface EmailConfig {
  provider: "resend";
  apiKey: string;
  fromEmail: string;
  toEmails: string[];
}

let emailConfig: EmailConfig | null = null;

/**
 * Configure email notifications
 */
export function configureEmail(config: EmailConfig): void {
  emailConfig = config;
  aeoLogger.info("Email notifications configured");

  // Register as notification handler
  registerNotificationHandler(async (message, data) => {
    await sendEmailNotification("AEO Alert", message, data);
  });
}

/**
 * Send email notification
 */
export async function sendEmailNotification(
  subject: string,
  message: string,
  data?: Record<string, any>
): Promise<boolean> {
  if (!emailConfig) return false;

  try {
    const htmlContent = `
      <h2>AEO Alert</h2>
      <p>${message}</p>
      ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ""}
      <p><small>Sent at ${new Date().toISOString()}</small></p>
    `;

    // Using Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${emailConfig.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailConfig.fromEmail,
        to: emailConfig.toEmails,
        subject: `[AEO] ${subject}`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`);
    }

    aeoLogger.info("Email notification sent");
    return true;
  } catch (error) {
    aeoLogger.error("Failed to send email notification", { error });
    return false;
  }
}

// ============================================================================
// Integration Status
// ============================================================================

/**
 * Get status of all integrations
 */
export function getIntegrationStatus(): {
  slack: boolean;
  gsc: boolean;
  webhooks: number;
  email: boolean;
} {
  return {
    slack: !!slackConfig?.webhookUrl,
    gsc: !!gscConfig?.clientId,
    webhooks: webhooks.length,
    email: !!emailConfig?.apiKey,
  };
}
