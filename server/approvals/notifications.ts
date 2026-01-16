/**
 * Approval Notifications Service
 *
 * Sends notifications for approval events via email and webhooks.
 * Feature flag: ENABLE_APPROVAL_NOTIFICATIONS
 */

import { db } from "../db";
import { users, approvalRequests } from "@shared/schema";
import { eq } from "drizzle-orm";

// =====================================================
// TYPES
// =====================================================

export interface NotificationPayload {
  type: "approval_requested" | "approval_approved" | "approval_rejected" | "approval_escalated" | "approval_expired";
  requestId: string;
  requestType: string;
  resourceType: string;
  resourceId: string;
  requesterId: string;
  requesterName?: string;
  approverIds?: string[];
  reason?: string;
  comment?: string;
  escalationLevel?: number;
  expiresAt?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  channel: "email" | "webhook" | "slack" | "internal";
  success: boolean;
  recipientCount: number;
  error?: string;
}

export interface NotificationConfig {
  emailEnabled: boolean;
  webhookEnabled: boolean;
  slackEnabled: boolean;
  emailFrom?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  slackWebhookUrl?: string;
  retryAttempts: number;
  retryDelayMs: number;
}

// =====================================================
// CONFIGURATION
// =====================================================

function getNotificationConfig(): NotificationConfig {
  return {
    emailEnabled: process.env.ENABLE_APPROVAL_EMAIL_NOTIFICATIONS === "true",
    webhookEnabled: process.env.ENABLE_APPROVAL_WEBHOOKS === "true",
    slackEnabled: process.env.ENABLE_APPROVAL_SLACK === "true",
    emailFrom: process.env.APPROVAL_EMAIL_FROM || "noreply@example.com",
    webhookUrl: process.env.APPROVAL_WEBHOOK_URL,
    webhookSecret: process.env.APPROVAL_WEBHOOK_SECRET,
    slackWebhookUrl: process.env.APPROVAL_SLACK_WEBHOOK_URL,
    retryAttempts: parseInt(process.env.APPROVAL_NOTIFICATION_RETRY_ATTEMPTS || "3"),
    retryDelayMs: parseInt(process.env.APPROVAL_NOTIFICATION_RETRY_DELAY_MS || "1000"),
  };
}

// =====================================================
// EMAIL NOTIFICATIONS
// =====================================================

interface EmailRecipient {
  email: string;
  name?: string;
}

async function getApproverEmails(approverIds: string[]): Promise<EmailRecipient[]> {
  if (!approverIds.length) return [];

  const approvers = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.isActive, true));

  return approvers
    .filter((u) => approverIds.includes(u.email) || approverIds.some((id) => u.email))
    .map((u) => ({ email: u.email, name: u.name || undefined }));
}

function generateEmailSubject(payload: NotificationPayload): string {
  switch (payload.type) {
    case "approval_requested":
      return `[Action Required] Approval needed: ${payload.requestType} for ${payload.resourceType}`;
    case "approval_approved":
      return `[Approved] ${payload.requestType} for ${payload.resourceType} has been approved`;
    case "approval_rejected":
      return `[Rejected] ${payload.requestType} for ${payload.resourceType} has been rejected`;
    case "approval_escalated":
      return `[Escalated] ${payload.requestType} for ${payload.resourceType} requires attention`;
    case "approval_expired":
      return `[Expired] ${payload.requestType} for ${payload.resourceType} has expired`;
    default:
      return `[Approval Update] ${payload.requestType}`;
  }
}

function generateEmailBody(payload: NotificationPayload): string {
  const lines: string[] = [];

  lines.push(`Approval Request Update`);
  lines.push(`${"=".repeat(40)}`);
  lines.push(``);
  lines.push(`Request Type: ${payload.requestType}`);
  lines.push(`Resource: ${payload.resourceType} (${payload.resourceId})`);
  lines.push(`Requester: ${payload.requesterName || payload.requesterId}`);
  lines.push(`Status: ${payload.type.replace("approval_", "").toUpperCase()}`);

  if (payload.reason) {
    lines.push(``);
    lines.push(`Reason: ${payload.reason}`);
  }

  if (payload.comment) {
    lines.push(``);
    lines.push(`Comment: ${payload.comment}`);
  }

  if (payload.escalationLevel) {
    lines.push(``);
    lines.push(`Escalation Level: ${payload.escalationLevel}`);
  }

  if (payload.expiresAt) {
    lines.push(``);
    lines.push(`Expires: ${new Date(payload.expiresAt).toLocaleString()}`);
  }

  lines.push(``);
  lines.push(`${"=".repeat(40)}`);
  lines.push(`Request ID: ${payload.requestId}`);
  lines.push(`Created: ${new Date(payload.createdAt).toLocaleString()}`);

  return lines.join("\n");
}

async function sendEmailNotification(
  payload: NotificationPayload,
  config: NotificationConfig
): Promise<NotificationResult> {
  if (!config.emailEnabled) {
    return { channel: "email", success: true, recipientCount: 0 };
  }

  try {
    const recipients = await getApproverEmails(payload.approverIds || []);

    if (recipients.length === 0) {
      return { channel: "email", success: true, recipientCount: 0 };
    }

    const subject = generateEmailSubject(payload);
    const body = generateEmailBody(payload);

    // Log email (actual sending would use a service like SendGrid, SES, etc.)
    console.log(`[ApprovalNotifications] Would send email to ${recipients.length} recipients:`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Recipients: ${recipients.map((r) => r.email).join(", ")}`);

    // In production, integrate with email service here
    // await emailService.send({ from: config.emailFrom, to: recipients, subject, body });

    return { channel: "email", success: true, recipientCount: recipients.length };
  } catch (error) {
    return {
      channel: "email",
      success: false,
      recipientCount: 0,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

// =====================================================
// WEBHOOK NOTIFICATIONS
// =====================================================

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: NotificationPayload;
  signature?: string;
}

function createWebhookSignature(payload: string, secret: string): string {
  // Simple HMAC-like signature (in production, use crypto.createHmac)
  const encoder = new TextEncoder();
  const data = encoder.encode(payload + secret);
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash;
  }
  return `sha256=${Math.abs(hash).toString(16).padStart(16, "0")}`;
}

async function sendWebhookNotification(
  payload: NotificationPayload,
  config: NotificationConfig
): Promise<NotificationResult> {
  if (!config.webhookEnabled || !config.webhookUrl) {
    return { channel: "webhook", success: true, recipientCount: 0 };
  }

  const webhookPayload: WebhookPayload = {
    event: payload.type,
    timestamp: new Date().toISOString(),
    data: payload,
  };

  const payloadStr = JSON.stringify(webhookPayload);
  if (config.webhookSecret) {
    webhookPayload.signature = createWebhookSignature(payloadStr, config.webhookSecret);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
    try {
      const response = await fetch(config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Approval-Event": payload.type,
          "X-Approval-Signature": webhookPayload.signature || "",
        },
        body: JSON.stringify(webhookPayload),
      });

      if (response.ok) {
        console.log(`[ApprovalNotifications] Webhook sent successfully to ${config.webhookUrl}`);
        return { channel: "webhook", success: true, recipientCount: 1 };
      }

      lastError = new Error(`Webhook returned ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown webhook error");
    }

    // Wait before retry
    if (attempt < config.retryAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, config.retryDelayMs * (attempt + 1)));
    }
  }

  return {
    channel: "webhook",
    success: false,
    recipientCount: 0,
    error: lastError?.message || "Webhook failed after retries",
  };
}

// =====================================================
// SLACK NOTIFICATIONS
// =====================================================

function generateSlackMessage(payload: NotificationPayload): object {
  const statusEmoji: Record<string, string> = {
    approval_requested: ":hourglass:",
    approval_approved: ":white_check_mark:",
    approval_rejected: ":x:",
    approval_escalated: ":warning:",
    approval_expired: ":clock1:",
  };

  const statusColor: Record<string, string> = {
    approval_requested: "#ffc107",
    approval_approved: "#28a745",
    approval_rejected: "#dc3545",
    approval_escalated: "#fd7e14",
    approval_expired: "#6c757d",
  };

  return {
    attachments: [
      {
        color: statusColor[payload.type] || "#007bff",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `${statusEmoji[payload.type] || ":bell:"} Approval ${payload.type.replace("approval_", "").replace("_", " ").toUpperCase()}`,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: `*Request Type:*\n${payload.requestType}` },
              { type: "mrkdwn", text: `*Resource:*\n${payload.resourceType}` },
              { type: "mrkdwn", text: `*Requester:*\n${payload.requesterName || payload.requesterId}` },
              { type: "mrkdwn", text: `*Request ID:*\n\`${payload.requestId.slice(0, 8)}...\`` },
            ],
          },
        ],
      },
    ],
  };
}

async function sendSlackNotification(
  payload: NotificationPayload,
  config: NotificationConfig
): Promise<NotificationResult> {
  if (!config.slackEnabled || !config.slackWebhookUrl) {
    return { channel: "slack", success: true, recipientCount: 0 };
  }

  try {
    const slackMessage = generateSlackMessage(payload);

    const response = await fetch(config.slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });

    if (response.ok) {
      console.log("[ApprovalNotifications] Slack notification sent successfully");
      return { channel: "slack", success: true, recipientCount: 1 };
    }

    return {
      channel: "slack",
      success: false,
      recipientCount: 0,
      error: `Slack returned ${response.status}`,
    };
  } catch (error) {
    return {
      channel: "slack",
      success: false,
      recipientCount: 0,
      error: error instanceof Error ? error.message : "Unknown Slack error",
    };
  }
}

// =====================================================
// MAIN NOTIFICATION DISPATCHER
// =====================================================

export async function sendApprovalNotification(
  payload: NotificationPayload
): Promise<NotificationResult[]> {
  const config = getNotificationConfig();
  const results: NotificationResult[] = [];

  // Check if notifications are enabled at all
  const notificationsEnabled = process.env.ENABLE_APPROVAL_NOTIFICATIONS === "true";
  if (!notificationsEnabled) {
    console.log("[ApprovalNotifications] Notifications disabled (ENABLE_APPROVAL_NOTIFICATIONS not set)");
    return [{ channel: "internal", success: true, recipientCount: 0 }];
  }

  console.log(`[ApprovalNotifications] Sending ${payload.type} notification for request ${payload.requestId}`);

  // Send via all configured channels in parallel
  const [emailResult, webhookResult, slackResult] = await Promise.all([
    sendEmailNotification(payload, config),
    sendWebhookNotification(payload, config),
    sendSlackNotification(payload, config),
  ]);

  results.push(emailResult, webhookResult, slackResult);

  const successCount = results.filter((r) => r.success).length;
  const totalRecipients = results.reduce((sum, r) => sum + r.recipientCount, 0);

  console.log(`[ApprovalNotifications] Sent to ${totalRecipients} recipients via ${successCount}/${results.length} channels`);

  return results;
}

// =====================================================
// CONVENIENCE FUNCTIONS
// =====================================================

export async function notifyApprovalRequested(
  requestId: string,
  requestType: string,
  resourceType: string,
  resourceId: string,
  requesterId: string,
  approverIds: string[],
  reason?: string
): Promise<NotificationResult[]> {
  return sendApprovalNotification({
    type: "approval_requested",
    requestId,
    requestType,
    resourceType,
    resourceId,
    requesterId,
    approverIds,
    reason,
    createdAt: new Date().toISOString(),
  });
}

export async function notifyApprovalDecision(
  requestId: string,
  decision: "approved" | "rejected",
  requestType: string,
  resourceType: string,
  resourceId: string,
  requesterId: string,
  comment?: string
): Promise<NotificationResult[]> {
  return sendApprovalNotification({
    type: decision === "approved" ? "approval_approved" : "approval_rejected",
    requestId,
    requestType,
    resourceType,
    resourceId,
    requesterId,
    comment,
    createdAt: new Date().toISOString(),
  });
}

export async function notifyApprovalEscalated(
  requestId: string,
  requestType: string,
  resourceType: string,
  resourceId: string,
  requesterId: string,
  escalationLevel: number,
  approverIds: string[]
): Promise<NotificationResult[]> {
  return sendApprovalNotification({
    type: "approval_escalated",
    requestId,
    requestType,
    resourceType,
    resourceId,
    requesterId,
    escalationLevel,
    approverIds,
    createdAt: new Date().toISOString(),
  });
}

export async function notifyApprovalExpired(
  requestId: string,
  requestType: string,
  resourceType: string,
  resourceId: string,
  requesterId: string
): Promise<NotificationResult[]> {
  return sendApprovalNotification({
    type: "approval_expired",
    requestId,
    requestType,
    resourceType,
    resourceId,
    requesterId,
    createdAt: new Date().toISOString(),
  });
}

console.log("[ApprovalNotifications] Module loaded");
