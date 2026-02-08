/**
 * Audit Logger Utility
 * Centralized audit logging for tracking user actions across the system
 */

import type { Request } from "express";
import { storage } from "../storage";

export type AuditActionType =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "submit_for_review"
  | "approve"
  | "reject"
  | "login"
  | "logout"
  | "user_create"
  | "user_update"
  | "user_delete"
  | "role_change"
  | "settings_change"
  | "media_upload"
  | "media_delete"
  | "restore";

export type AuditEntityType =
  | "content"
  | "user"
  | "media"
  | "settings"
  | "rss_feed"
  | "affiliate_link"
  | "translation"
  | "session"
  | "tag"
  | "cluster"
  | "campaign"
  | "newsletter_subscriber";

/**
 * Log an audit event for tracking user actions
 */
export async function logAuditEvent(
  req: Request,
  actionType: AuditActionType,
  entityType: AuditEntityType,
  entityId: string | null,
  description: string,
  beforeState?: Record<string, unknown>,
  afterState?: Record<string, unknown>
): Promise<void> {
  try {
    const user = (req as any).user;
    const userId = user?.claims?.sub;
    let userName = null;
    let userRole = null;

    if (userId) {
      const dbUser = await storage.getUser(userId);
      userName = dbUser
        ? `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || dbUser.email
        : null;
      userRole = dbUser?.role || null;
    }

    await storage.createAuditLog({
      userId: userId || null,
      userName,
      userRole,
      actionType,
      entityType,
      entityId,
      description,
      beforeState,
      afterState,
      ipAddress:
        (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
        req.socket.remoteAddress ||
        null,
      userAgent: req.headers["user-agent"] || null,
    });
  } catch {
    void 0;
  }
}
