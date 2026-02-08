/**
 * GDPR Compliance Routes
 * Data export, deletion, and consent management endpoints
 */

import type { Express } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { storage } from "../storage";
import { contents } from "@shared/schema";
import { requireAuth, requirePermission } from "../security";

export function registerGdprRoutes(app: Express): void {
  // ============================================================================
  // GDPR COMPLIANCE ENDPOINTS
  // ============================================================================

  // Export user data (GDPR Article 15 - Right of Access)
  app.get("/api/gdpr/export/:userId", requireAuth, async (req, res) => {
    const { userId } = req.params;
    const currentUser = req.user as { id: string; role: string };

    // Can only export own data or admin can export any
    if (currentUser.id !== userId && currentUser.role !== "admin") {
      return res.status(403).json({ error: "Cannot export other user's data" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's content
      const userContent = await db
        .select({
          id: contents.id,
          type: contents.type,
          title: contents.title,
          status: contents.status,
          createdAt: contents.createdAt,
        })
        .from(contents)
        .where(eq(contents.authorId, userId));

      const exportData = {
        exportDate: new Date().toISOString(),
        dataSubject: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        content: userContent,
        consent: {
          analytics: true, // Would come from consent table in production
          marketing: false,
          recordedAt: new Date().toISOString(),
        },
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="gdpr-export-${userId}.json"`);
      res.json(exportData);
    } catch {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Delete user data (GDPR Article 17 - Right to Erasure)
  app.delete(
    "/api/gdpr/delete/:userId",
    requireAuth,
    requirePermission("canManageUsers"),
    async (req, res) => {
      const { userId } = req.params;
      const currentUser = req.user as { id: string };
      const { anonymizeContent } = req.body || {};

      try {
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Prevent deleting self
        if (currentUser.id === userId) {
          return res
            .status(400)
            .json({ error: "Cannot delete your own account via this endpoint" });
        }

        let contentAnonymized = 0;

        // Anonymize content if requested (default: true)
        if (anonymizeContent !== false) {
          const result = await db
            .update(contents)
            .set({ authorId: "deleted-user" } as any)
            .where(eq(contents.authorId, userId));
          contentAnonymized = result.rowCount || 0;
        }

        // Delete the user
        await storage.deleteUser(userId);

        // Log the deletion for audit

        res.json({
          success: true,
          deletedAt: new Date().toISOString(),
          actions: {
            userDeleted: true,
            contentAnonymized,
          },
        });
      } catch {
        res.status(500).json({ error: "Failed to delete user data" });
      }
    }
  );

  // Record consent preferences (GDPR Article 7)
  app.post("/api/gdpr/consent", requireAuth, async (req, res) => {
    const { analytics, marketing, necessary } = req.body;

    if (typeof analytics !== "boolean" || typeof marketing !== "boolean") {
      return res.status(400).json({ error: "analytics and marketing must be boolean values" });
    }

    // In production, this would store in a consent table

    res.json({
      success: true,
      recordedAt: new Date().toISOString(),
      preferences: {
        analytics,
        marketing,
        necessary: necessary ?? true,
      },
    });
  });
}
