/**
 * Enterprise API Routes
 * Teams, Workflows, Notifications, Webhooks, Activity, Comments, Locks
 */

import type { Express, Request, Response } from "express";
import { requirePermission, requireAuth } from "./security";
import { enterprise } from "./enterprise";
import { cache, cacheKeys } from "./cache";
import { exportService, importService, backupService, type ExportOptions } from "./import-export";

export function registerEnterpriseRoutes(app: Express) {
  // ============================================================================
  // TEAMS ROUTES
  // ============================================================================

  // Get all teams
  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const teams = await enterprise.teams.getAll();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Get single team
  app.get("/api/teams/:id", requireAuth, async (req, res) => {
    try {
      const team = await enterprise.teams.getById(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      const members = await enterprise.teams.getMembers(req.params.id);
      res.json({ ...team, members });
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  // Create team
  app.post("/api/teams", requirePermission("canManageUsers"), async (req, res) => {
    try {
      const team = await enterprise.teams.create(req.body);
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Failed to create team" });
    }
  });

  // Update team
  app.patch("/api/teams/:id", requirePermission("canManageUsers"), async (req, res) => {
    try {
      const team = await enterprise.teams.update(req.params.id, req.body);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ error: "Failed to update team" });
    }
  });

  // Delete team
  app.delete("/api/teams/:id", requirePermission("canManageUsers"), async (req, res) => {
    try {
      await enterprise.teams.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ error: "Failed to delete team" });
    }
  });

  // Add team member
  app.post("/api/teams/:id/members", requirePermission("canManageUsers"), async (req, res) => {
    try {
      const member = await enterprise.teams.addMember({
        teamId: req.params.id,
        userId: req.body.userId,
        role: req.body.role || "member",
      });
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ error: "Failed to add team member" });
    }
  });

  // Remove team member
  app.delete("/api/teams/:teamId/members/:userId", requirePermission("canManageUsers"), async (req, res) => {
    try {
      await enterprise.teams.removeMember(req.params.teamId, req.params.userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ error: "Failed to remove team member" });
    }
  });

  // Get user's teams
  app.get("/api/users/:userId/teams", requireAuth, async (req, res) => {
    try {
      const teams = await enterprise.teams.getUserTeams(req.params.userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ error: "Failed to fetch user teams" });
    }
  });

  // ============================================================================
  // WORKFLOW ROUTES
  // ============================================================================

  // Get workflow templates
  app.get("/api/workflows/templates", requireAuth, async (req, res) => {
    try {
      const templates = await enterprise.workflows.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching workflow templates:", error);
      res.status(500).json({ error: "Failed to fetch workflow templates" });
    }
  });

  // Create workflow template
  app.post("/api/workflows/templates", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const user = req.user as any;
      const template = await enterprise.workflows.createTemplate({
        ...req.body,
        createdBy: user?.claims?.sub,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating workflow template:", error);
      res.status(500).json({ error: "Failed to create workflow template" });
    }
  });

  // Submit content for review
  app.post("/api/contents/:id/submit-for-review", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const instance = await enterprise.workflows.submitForReview(
        req.params.id,
        req.body.templateId,
        user?.claims?.sub
      );

      // Log activity
      await enterprise.activity.log({
        type: "workflow_submitted",
        actorId: user?.claims?.sub,
        targetType: "content",
        targetId: req.params.id,
        metadata: { workflowId: instance.id },
      });

      res.status(201).json(instance);
    } catch (error) {
      console.error("Error submitting for review:", error);
      res.status(500).json({ error: "Failed to submit for review" });
    }
  });

  // Get workflow status for content
  app.get("/api/contents/:id/workflow", requireAuth, async (req, res) => {
    try {
      const instance = await enterprise.workflows.getInstanceByContent(req.params.id);
      res.json(instance || { status: "none" });
    } catch (error) {
      console.error("Error fetching workflow status:", error);
      res.status(500).json({ error: "Failed to fetch workflow status" });
    }
  });

  // Get pending approvals for current user
  app.get("/api/workflows/pending", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const approvals = await enterprise.workflows.getPendingApprovals(user?.claims?.sub);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      res.status(500).json({ error: "Failed to fetch pending approvals" });
    }
  });

  // Approve workflow
  app.post("/api/workflows/:instanceId/approve", requirePermission("canPublish"), async (req, res) => {
    try {
      const user = req.user as any;
      const instance = await enterprise.workflows.approve(
        req.params.instanceId,
        user?.claims?.sub,
        req.body.comment
      );

      if (instance) {
        await enterprise.activity.log({
          type: "workflow_approved",
          actorId: user?.claims?.sub,
          targetType: "workflow",
          targetId: req.params.instanceId,
        });
      }

      res.json(instance);
    } catch (error) {
      console.error("Error approving workflow:", error);
      res.status(500).json({ error: "Failed to approve workflow" });
    }
  });

  // Reject workflow
  app.post("/api/workflows/:instanceId/reject", requirePermission("canPublish"), async (req, res) => {
    try {
      const user = req.user as any;
      const instance = await enterprise.workflows.reject(
        req.params.instanceId,
        user?.claims?.sub,
        req.body.comment
      );

      if (instance) {
        await enterprise.activity.log({
          type: "workflow_rejected",
          actorId: user?.claims?.sub,
          targetType: "workflow",
          targetId: req.params.instanceId,
        });
      }

      res.json(instance);
    } catch (error) {
      console.error("Error rejecting workflow:", error);
      res.status(500).json({ error: "Failed to reject workflow" });
    }
  });

  // ============================================================================
  // ACTIVITY ROUTES
  // ============================================================================

  // Get recent activity
  app.get("/api/activity", requireAuth, async (req, res) => {
    try {
      const { limit, teamId } = req.query;
      const activities = await enterprise.activity.getRecent({
        limit: limit ? parseInt(limit as string) : 50,
        teamId: teamId as string,
      });
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // Get activity for specific content
  app.get("/api/contents/:id/activity", requireAuth, async (req, res) => {
    try {
      const activities = await enterprise.activity.getForContent(req.params.id);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching content activity:", error);
      res.status(500).json({ error: "Failed to fetch content activity" });
    }
  });

  // ============================================================================
  // CONTENT LOCKING ROUTES
  // ============================================================================

  // Acquire lock
  app.post("/api/contents/:id/lock", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const result = await enterprise.locks.acquireLock(req.params.id, user?.claims?.sub);

      if ("error" in result) {
        return res.status(409).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error("Error acquiring lock:", error);
      res.status(500).json({ error: "Failed to acquire lock" });
    }
  });

  // Release lock
  app.delete("/api/contents/:id/lock", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await enterprise.locks.releaseLock(req.params.id, user?.claims?.sub);
      res.status(204).send();
    } catch (error) {
      console.error("Error releasing lock:", error);
      res.status(500).json({ error: "Failed to release lock" });
    }
  });

  // Get lock status
  app.get("/api/contents/:id/lock", requireAuth, async (req, res) => {
    try {
      const lock = await enterprise.locks.getLock(req.params.id);
      res.json(lock || { locked: false });
    } catch (error) {
      console.error("Error fetching lock:", error);
      res.status(500).json({ error: "Failed to fetch lock status" });
    }
  });

  // Get all active locks (admin only)
  app.get("/api/admin/locks", requirePermission("canManageUsers"), async (req, res) => {
    try {
      const locks = await enterprise.locks.getAllActiveLocks();
      res.json({ locks, total: locks.length });
    } catch (error) {
      console.error("Error fetching all locks:", error);
      res.status(500).json({ error: "Failed to fetch active locks" });
    }
  });

  // Force unlock (admin only)
  app.delete("/api/admin/locks/:contentId/force", requirePermission("canManageUsers"), async (req, res) => {
    try {
      await enterprise.locks.forceUnlock(req.params.contentId);
      res.json({ success: true, message: "Lock released successfully" });
    } catch (error) {
      console.error("Error force unlocking:", error);
      res.status(500).json({ error: "Failed to force unlock" });
    }
  });

  // Cleanup expired locks (admin only)
  app.post("/api/admin/locks/cleanup", requirePermission("canManageUsers"), async (req, res) => {
    try {
      const count = await enterprise.locks.cleanupExpired();
      res.json({ success: true, cleaned: count });
    } catch (error) {
      console.error("Error cleaning up locks:", error);
      res.status(500).json({ error: "Failed to cleanup expired locks" });
    }
  });

  // ============================================================================
  // NOTIFICATIONS ROUTES
  // ============================================================================

  // Get notifications for current user
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const { unreadOnly, limit } = req.query;
      const notifications = await enterprise.notifications.getForUser(user?.claims?.sub, {
        unreadOnly: unreadOnly === "true",
        limit: limit ? parseInt(limit as string) : 50,
      });
      const unreadCount = await enterprise.notifications.getUnreadCount(user?.claims?.sub);
      res.json({ notifications, unreadCount });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await enterprise.notifications.markAsRead(req.params.id, user?.claims?.sub);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await enterprise.notifications.markAllAsRead(user?.claims?.sub);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      await enterprise.notifications.delete(req.params.id, user?.claims?.sub);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // ============================================================================
  // WEBHOOKS ROUTES
  // ============================================================================

  // Get all webhooks
  app.get("/api/webhooks", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const webhooks = await enterprise.webhooks.getAll();
      res.json(webhooks);
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  // Create webhook
  app.post("/api/webhooks", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const user = req.user as any;
      const webhook = await enterprise.webhooks.create({
        ...req.body,
        createdBy: user?.claims?.sub,
      });
      res.status(201).json(webhook);
    } catch (error) {
      console.error("Error creating webhook:", error);
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  // Update webhook
  app.patch("/api/webhooks/:id", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const webhook = await enterprise.webhooks.update(req.params.id, req.body);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      res.json(webhook);
    } catch (error) {
      console.error("Error updating webhook:", error);
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  // Delete webhook
  app.delete("/api/webhooks/:id", requirePermission("canManageSettings"), async (req, res) => {
    try {
      await enterprise.webhooks.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting webhook:", error);
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // Get webhook logs
  app.get("/api/webhooks/:id/logs", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const logs = await enterprise.webhooks.getLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      res.status(500).json({ error: "Failed to fetch webhook logs" });
    }
  });

  // Test webhook
  app.post("/api/webhooks/:id/test", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const webhook = await enterprise.webhooks.getById(req.params.id);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      await enterprise.webhooks.trigger("test", {
        message: "This is a test webhook",
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, message: "Test webhook sent" });
    } catch (error) {
      console.error("Error testing webhook:", error);
      res.status(500).json({ error: "Failed to test webhook" });
    }
  });

  // ============================================================================
  // COMMENTS ROUTES
  // ============================================================================

  // Get comments for content
  app.get("/api/contents/:id/comments", requireAuth, async (req, res) => {
    try {
      const comments = await enterprise.comments.getForContent(req.params.id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Create comment
  app.post("/api/contents/:id/comments", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const comment = await enterprise.comments.create({
        contentId: req.params.id,
        authorId: user?.claims?.sub,
        body: req.body.body,
        parentId: req.body.parentId,
        mentions: req.body.mentions || [],
      });

      // Log activity
      await enterprise.activity.log({
        type: "comment_added",
        actorId: user?.claims?.sub,
        targetType: "content",
        targetId: req.params.id,
        metadata: { commentId: comment.id },
      });

      // Notify mentioned users
      if (req.body.mentions?.length) {
        await enterprise.notifications.createMany(
          req.body.mentions.map((userId: string) => ({
            userId,
            type: "comment_mention" as const,
            title: "You were mentioned in a comment",
            message: req.body.body.substring(0, 100),
            link: `/contents/${req.params.id}#comment-${comment.id}`,
          }))
        );
      }

      res.status(201).json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Update comment
  app.patch("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      const comment = await enterprise.comments.update(req.params.id, req.body.body);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      console.error("Error updating comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // Delete comment
  app.delete("/api/comments/:id", requireAuth, async (req, res) => {
    try {
      await enterprise.comments.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Resolve comment
  app.post("/api/comments/:id/resolve", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      const comment = await enterprise.comments.resolve(req.params.id, user?.claims?.sub);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      console.error("Error resolving comment:", error);
      res.status(500).json({ error: "Failed to resolve comment" });
    }
  });

  // Unresolve comment
  app.post("/api/comments/:id/unresolve", requireAuth, async (req, res) => {
    try {
      const comment = await enterprise.comments.unresolve(req.params.id);
      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json(comment);
    } catch (error) {
      console.error("Error unresolving comment:", error);
      res.status(500).json({ error: "Failed to unresolve comment" });
    }
  });

  // ============================================================================
  // CACHE STATUS ROUTE
  // ============================================================================

  app.get("/api/admin/cache/status", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const stats = await cache.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching cache status:", error);
      res.status(500).json({ error: "Failed to fetch cache status" });
    }
  });

  // Clear cache
  app.post("/api/admin/cache/clear", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { pattern = "*" } = req.body;
      const cleared = await cache.invalidate(pattern);
      res.json({ success: true, cleared });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // ============================================================================
  // IMPORT/EXPORT ROUTES
  // ============================================================================

  // Get backup statistics
  app.get("/api/admin/backup/stats", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const stats = await backupService.getBackupStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching backup stats:", error);
      res.status(500).json({ error: "Failed to fetch backup statistics" });
    }
  });

  // Export data
  app.post("/api/admin/export", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const options: ExportOptions = req.body || {};
      const data = await exportService.exportData(options);

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="travi-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(data);
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // Preview export (returns stats without downloading)
  app.post("/api/admin/export/preview", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const options: ExportOptions = req.body || {};
      const data = await exportService.exportData(options);
      res.json({
        version: data.version,
        stats: data.stats,
        options: data.options,
      });
    } catch (error) {
      console.error("Error previewing export:", error);
      res.status(500).json({ error: "Failed to preview export" });
    }
  });

  // Validate import data
  app.post("/api/admin/import/validate", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const validation = await importService.validateImportData(req.body);
      res.json(validation);
    } catch (error) {
      console.error("Error validating import:", error);
      res.status(500).json({ error: "Failed to validate import data" });
    }
  });

  // Import data (dry run)
  app.post("/api/admin/import/preview", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { data, options = {} } = req.body;
      const result = await importService.importData(data, { ...options, dryRun: true });
      res.json(result);
    } catch (error) {
      console.error("Error previewing import:", error);
      res.status(500).json({ error: "Failed to preview import" });
    }
  });

  // Import data (actual)
  app.post("/api/admin/import", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const { data, options = {} } = req.body;

      // Validate first
      const validation = await importService.validateImportData(data);
      if (!validation.valid) {
        return res.status(400).json({ error: "Invalid import data", details: validation.errors });
      }

      const result = await importService.importData(data, { ...options, dryRun: false });
      res.json(result);
    } catch (error) {
      console.error("Error importing data:", error);
      res.status(500).json({ error: "Failed to import data" });
    }
  });

  // Create full backup
  app.post("/api/admin/backup", requirePermission("canManageSettings"), async (req, res) => {
    try {
      const data = await backupService.createBackup();

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="travi-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(data);
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  console.log("[Enterprise] Routes registered");
}
