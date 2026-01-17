/**
 * Reliable Webhook Admin Routes
 *
 * Admin endpoints for webhook outbox management:
 * - List/view outbox items
 * - Manual retry
 * - Metrics dashboard
 *
 * All routes require admin permission (canManageSettings)
 */

import type { Express, Request, Response } from "express";
import { requirePermission } from "../../security";
import { db } from "../../db";
import { webhookOutbox, webhookDeliveries, webhooks } from "@shared/schema";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { getOutboxMetrics } from "./metrics";

export function registerReliableWebhookAdminRoutes(app: Express): void {
  /**
   * GET /api/admin/webhooks/outbox
   * List outbox items with optional filtering
   */
  app.get(
    "/api/admin/webhooks/outbox",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const {
          status,
          limit = "50",
          offset = "0",
          endpointId,
        } = req.query;

        const limitNum = Math.min(parseInt(limit as string, 10) || 50, 100);
        const offsetNum = parseInt(offset as string, 10) || 0;

        // Build query
        let query = db
          .select({
            id: webhookOutbox.id,
            endpointId: webhookOutbox.endpointId,
            endpointUrl: webhooks.url,
            endpointName: webhooks.name,
            eventType: webhookOutbox.eventType,
            status: webhookOutbox.status,
            attempts: webhookOutbox.attempts,
            maxAttempts: webhookOutbox.maxAttempts,
            nextAttemptAt: webhookOutbox.nextAttemptAt,
            lastError: webhookOutbox.lastError,
            lastStatusCode: webhookOutbox.lastStatusCode,
            createdAt: webhookOutbox.createdAt,
            updatedAt: webhookOutbox.updatedAt,
          })
          .from(webhookOutbox)
          .leftJoin(webhooks, eq(webhookOutbox.endpointId, webhooks.id))
          .orderBy(desc(webhookOutbox.createdAt))
          .limit(limitNum)
          .offset(offsetNum);

        // Apply filters
        const conditions = [];
        if (status && typeof status === "string") {
          conditions.push(eq(webhookOutbox.status, status as any));
        }
        if (endpointId && typeof endpointId === "string") {
          conditions.push(eq(webhookOutbox.endpointId, endpointId));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as typeof query;
        }

        const items = await query;

        // Get total count for pagination
        let countQuery = db.select({ count: count() }).from(webhookOutbox);
        if (conditions.length > 0) {
          countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
        }
        const [totalResult] = await countQuery;

        res.json({
          items,
          total: totalResult?.count || 0,
          limit: limitNum,
          offset: offsetNum,
        });
      } catch (error) {
        console.error("[ReliableWebhook Admin] Error listing outbox:", error);
        res.status(500).json({ error: "Failed to list outbox items" });
      }
    }
  );

  /**
   * GET /api/admin/webhooks/outbox/:id
   * Get single outbox item with delivery history
   */
  app.get(
    "/api/admin/webhooks/outbox/:id",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Get outbox item with endpoint info
        const [item] = await db
          .select({
            id: webhookOutbox.id,
            endpointId: webhookOutbox.endpointId,
            endpointUrl: webhooks.url,
            endpointName: webhooks.name,
            eventType: webhookOutbox.eventType,
            payloadJson: webhookOutbox.payloadJson,
            idempotencyKey: webhookOutbox.idempotencyKey,
            status: webhookOutbox.status,
            attempts: webhookOutbox.attempts,
            maxAttempts: webhookOutbox.maxAttempts,
            nextAttemptAt: webhookOutbox.nextAttemptAt,
            lastError: webhookOutbox.lastError,
            lastStatusCode: webhookOutbox.lastStatusCode,
            createdAt: webhookOutbox.createdAt,
            updatedAt: webhookOutbox.updatedAt,
          })
          .from(webhookOutbox)
          .leftJoin(webhooks, eq(webhookOutbox.endpointId, webhooks.id))
          .where(eq(webhookOutbox.id, id))
          .limit(1);

        if (!item) {
          return res.status(404).json({ error: "Outbox item not found" });
        }

        // Get delivery attempts
        const deliveries = await db
          .select()
          .from(webhookDeliveries)
          .where(eq(webhookDeliveries.outboxId, id))
          .orderBy(desc(webhookDeliveries.attemptNo));

        res.json({
          ...item,
          deliveries,
        });
      } catch (error) {
        console.error("[ReliableWebhook Admin] Error fetching outbox item:", error);
        res.status(500).json({ error: "Failed to fetch outbox item" });
      }
    }
  );

  /**
   * POST /api/admin/webhooks/outbox/:id/retry
   * Reset item to pending for immediate retry
   */
  app.post(
    "/api/admin/webhooks/outbox/:id/retry",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Check item exists and is retryable
        const [item] = await db
          .select()
          .from(webhookOutbox)
          .where(eq(webhookOutbox.id, id))
          .limit(1);

        if (!item) {
          return res.status(404).json({ error: "Outbox item not found" });
        }

        if (item.status === "sending") {
          return res.status(409).json({
            error: "Item is currently being processed",
          });
        }

        // Reset to pending with immediate retry
        const [updated] = await db
          .update(webhookOutbox)
          .set({
            status: "pending",
            nextAttemptAt: new Date(),
            lockedUntil: null,
            updatedAt: new Date(),
          } as any)
          .where(eq(webhookOutbox.id, id))
          .returning();

        console.log(`[ReliableWebhook Admin] Manual retry scheduled for ${id}`);

        res.json({
          success: true,
          item: updated,
        });
      } catch (error) {
        console.error("[ReliableWebhook Admin] Error retrying outbox item:", error);
        res.status(500).json({ error: "Failed to retry outbox item" });
      }
    }
  );

  /**
   * GET /api/admin/webhooks/metrics
   * Get webhook delivery metrics
   */
  app.get(
    "/api/admin/webhooks/metrics",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const metrics = await getOutboxMetrics();
        res.json(metrics);
      } catch (error) {
        console.error("[ReliableWebhook Admin] Error fetching metrics:", error);
        res.status(500).json({ error: "Failed to fetch metrics" });
      }
    }
  );

  /**
   * DELETE /api/admin/webhooks/outbox/:id
   * Delete an outbox item (only if not currently sending)
   */
  app.delete(
    "/api/admin/webhooks/outbox/:id",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const [deleted] = await db
          .delete(webhookOutbox)
          .where(
            and(
              eq(webhookOutbox.id, id),
              sql`${webhookOutbox.status} != 'sending'`
            )
          )
          .returning({ id: webhookOutbox.id });

        if (!deleted) {
          return res.status(404).json({
            error: "Item not found or currently being processed",
          });
        }

        res.json({ success: true, deleted: id });
      } catch (error) {
        console.error("[ReliableWebhook Admin] Error deleting outbox item:", error);
        res.status(500).json({ error: "Failed to delete outbox item" });
      }
    }
  );

  /**
   * POST /api/admin/webhooks/outbox/cleanup
   * Clean up old succeeded/failed items
   */
  app.post(
    "/api/admin/webhooks/outbox/cleanup",
    requirePermission("canManageSettings"),
    async (req: Request, res: Response) => {
      try {
        const { olderThanDays = 7 } = req.body;
        const cutoffDate = new Date(
          Date.now() - olderThanDays * 24 * 60 * 60 * 1000
        );

        const result = await db
          .delete(webhookOutbox)
          .where(
            and(
              sql`${webhookOutbox.status} IN ('succeeded', 'failed')`,
              sql`${webhookOutbox.updatedAt} < ${cutoffDate}`
            )
          )
          .returning({ id: webhookOutbox.id });

        res.json({
          success: true,
          deleted: result.length,
          olderThanDays,
        });
      } catch (error) {
        console.error("[ReliableWebhook Admin] Error cleaning up outbox:", error);
        res.status(500).json({ error: "Failed to cleanup outbox" });
      }
    }
  );

  console.log("[ReliableWebhook] Admin routes registered");
}
