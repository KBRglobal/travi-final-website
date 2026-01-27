/**
 * Content Ownership Admin Routes
 */

import type { Express, Request, Response } from "express";
import { requireAuth } from "../security";
import {
  assignOwnership,
  removeOwnership,
  transferOwnership,
  getContentOwnership,
  getUserOwnerships,
  getExpiringOwnerships,
  getTransferHistory,
  getOwnershipStats,
} from "./repository";
import { isContentOwnershipEnabled, type OwnershipRole } from "./types";

export function registerContentOwnershipRoutes(app: Express): void {
  app.get(
    "/api/admin/ownership/content/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isContentOwnershipEnabled()) {
        return res.json({ enabled: false, message: "Content ownership feature disabled" });
      }

      const { contentId } = req.params;
      const matrix = getContentOwnership(contentId);
      res.json({ enabled: true, ...matrix });
    }
  );

  app.post("/api/admin/ownership/assign", requireAuth, async (req: Request, res: Response) => {
    if (!isContentOwnershipEnabled()) {
      return res.status(403).json({ error: "Feature disabled" });
    }

    const { contentId, userId, role, expiresAt, notes } = req.body;
    const assignedBy = (req as any).user?.id || "system";

    if (!contentId || !userId || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const ownership = assignOwnership(contentId, userId, role as OwnershipRole, assignedBy, {
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes,
    });

    res.json({ success: true, ownership });
  });

  app.post("/api/admin/ownership/transfer", requireAuth, async (req: Request, res: Response) => {
    if (!isContentOwnershipEnabled()) {
      return res.status(403).json({ error: "Feature disabled" });
    }

    const { contentId, fromUserId, toUserId, role, reason } = req.body;
    const transferredBy = (req as any).user?.id || "system";

    if (!contentId || !fromUserId || !toUserId || !role || !reason) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const transfer = transferOwnership(
      contentId,
      fromUserId,
      toUserId,
      role as OwnershipRole,
      transferredBy,
      reason
    );
    res.json({ success: true, transfer });
  });

  app.delete(
    "/api/admin/ownership/:contentId/:userId/:role",
    requireAuth,
    async (req: Request, res: Response) => {
      if (!isContentOwnershipEnabled()) {
        return res.status(403).json({ error: "Feature disabled" });
      }

      const { contentId, userId, role } = req.params;
      const removed = removeOwnership(contentId, userId, role as OwnershipRole);
      res.json({ success: removed });
    }
  );

  app.get("/api/admin/ownership/user/:userId", requireAuth, async (req: Request, res: Response) => {
    const { userId } = req.params;
    const ownerships = getUserOwnerships(userId);
    res.json({ userId, ownerships, count: ownerships.length });
  });

  app.get("/api/admin/ownership/expiring", requireAuth, async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 7;
    const expiring = getExpiringOwnerships(days);
    res.json({ expiring, count: expiring.length, withinDays: days });
  });

  app.get(
    "/api/admin/ownership/history/:contentId",
    requireAuth,
    async (req: Request, res: Response) => {
      const { contentId } = req.params;
      const history = getTransferHistory(contentId);
      res.json({ contentId, history, count: history.length });
    }
  );

  app.get("/api/admin/ownership/stats", requireAuth, async (req: Request, res: Response) => {
    const stats = getOwnershipStats();
    res.json({ enabled: isContentOwnershipEnabled(), ...stats });
  });
}
