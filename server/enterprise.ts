/**
 * Enterprise Services
 * Teams, Workflows, Notifications, Webhooks, Activity Feed, Content Locking
 */

import { db } from "./db";
import { eq, and, desc, sql, inArray, isNull, gt, lt } from "drizzle-orm";
import {
  teams, teamMembers, workflowTemplates, workflowInstances, workflowApprovals,
  activities, contentLocks, notifications, webhooks, webhookLogs, comments,
  scheduledTasks, users, contents,
  type Team, type TeamMember, type InsertTeam, type InsertTeamMember,
  type WorkflowTemplate, type WorkflowInstance, type WorkflowApproval,
  type InsertWorkflowTemplate, type InsertWorkflowInstance,
  type Activity, type InsertActivity,
  type ContentLock, type InsertContentLock,
  type Notification, type InsertNotification,
  type Webhook, type WebhookLog, type InsertWebhook,
  type Comment, type InsertComment,
  type ScheduledTask, type InsertScheduledTask,
} from "@shared/schema";
import crypto from "crypto";
import { validateUrlForSSRF } from "./security";

// ============================================================================
// TEAMS SERVICE
// ============================================================================

export const teamsService = {
  async getAll(): Promise<Team[]> {
    return db.select().from(teams).orderBy(teams.name);
  },

  async getById(id: string): Promise<Team | null> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || null;
  },

  async getBySlug(slug: string): Promise<Team | null> {
    const [team] = await db.select().from(teams).where(eq(teams.slug, slug));
    return team || null;
  },

  async create(data: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(data).returning();
    return team;
  },

  async update(id: string, data: Partial<InsertTeam>): Promise<Team | null> {
    const [team] = await db.update(teams)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(teams.id, id))
      .returning();
    return team || null;
  },

  async delete(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  },

  async getMembers(teamId: string): Promise<(TeamMember & { user: { id: string; firstName: string | null; lastName: string | null; email: string | null } })[]> {
    const members = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
        user: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        }
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
    return members as any;
  },

  async addMember(data: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db.insert(teamMembers).values(data).returning();
    return member;
  },

  async removeMember(teamId: string, userId: string): Promise<void> {
    await db.delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  },

  async getUserTeams(userId: string): Promise<Team[]> {
    const userTeams = await db
      .select({ team: teams })
      .from(teamMembers)
      .leftJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));
    return userTeams.map(t => t.team).filter(Boolean) as Team[];
  },
};

// ============================================================================
// WORKFLOWS SERVICE
// ============================================================================

export const workflowsService = {
  async getTemplates(): Promise<WorkflowTemplate[]> {
    return db.select().from(workflowTemplates).where(eq(workflowTemplates.isActive, true));
  },

  async getTemplateById(id: string): Promise<WorkflowTemplate | null> {
    const [template] = await db.select().from(workflowTemplates).where(eq(workflowTemplates.id, id));
    return template || null;
  },

  async createTemplate(data: InsertWorkflowTemplate): Promise<WorkflowTemplate> {
    const [template] = await db.insert(workflowTemplates).values(data as any).returning();
    return template;
  },

  async updateTemplate(id: string, data: Partial<InsertWorkflowTemplate>): Promise<WorkflowTemplate | null> {
    const [template] = await db.update(workflowTemplates)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(workflowTemplates.id, id))
      .returning();
    return template || null;
  },

  async submitForReview(contentId: string, templateId: string, submittedBy: string): Promise<WorkflowInstance> {
    const [instance] = await db.insert(workflowInstances).values({
      templateId,
      contentId,
      submittedBy,
      status: "pending",
      currentStep: 0,
    }).returning();

    // Create first approval step
    const template = await this.getTemplateById(templateId);
    if (template?.steps && template.steps.length > 0) {
      await db.insert(workflowApprovals).values({
        instanceId: instance.id,
        stepNumber: 0,
        status: "pending",
      });
    }

    return instance;
  },

  async getInstanceByContent(contentId: string): Promise<WorkflowInstance | null> {
    const [instance] = await db.select().from(workflowInstances)
      .where(eq(workflowInstances.contentId, contentId))
      .orderBy(desc(workflowInstances.submittedAt))
      .limit(1);
    return instance || null;
  },

  async getPendingApprovals(userId: string): Promise<WorkflowApproval[]> {
    // Get approvals where user is the approver
    return db.select().from(workflowApprovals)
      .where(and(
        eq(workflowApprovals.approverId, userId),
        eq(workflowApprovals.status, "pending")
      ));
  },

  async approve(instanceId: string, approverId: string, comment?: string): Promise<WorkflowInstance | null> {
    const instance = await db.select().from(workflowInstances).where(eq(workflowInstances.id, instanceId)).then(r => r[0]);
    if (!instance) return null;

    const template = instance.templateId ? await this.getTemplateById(instance.templateId) : null;
    const steps = template?.steps || [];
    const currentStep = instance.currentStep || 0;

    // Update current approval
    await db.update(workflowApprovals)
      .set({ status: "approved", approverId, comment, decidedAt: new Date() })
      .where(and(
        eq(workflowApprovals.instanceId, instanceId),
        eq(workflowApprovals.stepNumber, currentStep)
      ));

    // Check if there are more steps
    if (currentStep < steps.length - 1) {
      // Move to next step
      const [updated] = await db.update(workflowInstances)
        .set({ currentStep: currentStep + 1, status: "in_progress" })
        .where(eq(workflowInstances.id, instanceId))
        .returning();

      // Create next approval
      await db.insert(workflowApprovals).values({
        instanceId,
        stepNumber: currentStep + 1,
        status: "pending",
      });

      return updated;
    } else {
      // Final approval - complete workflow
      const [updated] = await db.update(workflowInstances)
        .set({ status: "approved", completedAt: new Date() })
        .where(eq(workflowInstances.id, instanceId))
        .returning();

      return updated;
    }
  },

  async reject(instanceId: string, approverId: string, comment: string): Promise<WorkflowInstance | null> {
    const instance = await db.select().from(workflowInstances).where(eq(workflowInstances.id, instanceId)).then(r => r[0]);
    if (!instance) return null;

    const currentStep = instance.currentStep || 0;

    // Update current approval
    await db.update(workflowApprovals)
      .set({ status: "rejected", approverId, comment, decidedAt: new Date() })
      .where(and(
        eq(workflowApprovals.instanceId, instanceId),
        eq(workflowApprovals.stepNumber, currentStep)
      ));

    // Reject the whole workflow
    const [updated] = await db.update(workflowInstances)
      .set({ status: "rejected", completedAt: new Date() })
      .where(eq(workflowInstances.id, instanceId))
      .returning();

    return updated;
  },
};

// ============================================================================
// ACTIVITY SERVICE
// ============================================================================

export const activityService = {
  async log(data: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(data).returning();
    return activity;
  },

  async getRecent(options?: { limit?: number; teamId?: string; actorId?: string }): Promise<Activity[]> {
    let query = db.select().from(activities);

    if (options?.teamId) {
      query = query.where(eq(activities.teamId, options.teamId)) as any;
    }
    if (options?.actorId) {
      query = query.where(eq(activities.actorId, options.actorId)) as any;
    }

    return query.orderBy(desc(activities.createdAt)).limit(options?.limit || 50);
  },

  async getForContent(contentId: string): Promise<Activity[]> {
    return db.select().from(activities)
      .where(and(
        eq(activities.targetType, "content"),
        eq(activities.targetId, contentId)
      ))
      .orderBy(desc(activities.createdAt));
  },
};

// ============================================================================
// CONTENT LOCKING SERVICE
// ============================================================================

const LOCK_DURATION_MINUTES = 30;

export const lockService = {
  async acquireLock(contentId: string, userId: string): Promise<ContentLock | { error: string; lockedBy?: { id: string; name: string } }> {
    // Check for existing active lock
    const [existingLock] = await db.select({
      lock: contentLocks,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
      }
    })
      .from(contentLocks)
      .leftJoin(users, eq(contentLocks.userId, users.id))
      .where(and(
        eq(contentLocks.contentId, contentId),
        eq(contentLocks.isActive, true),
        gt(contentLocks.expiresAt, new Date())
      ));

    if (existingLock && existingLock.lock.userId !== userId) {
      return {
        error: "Content is locked by another user",
        lockedBy: {
          id: existingLock.user?.id || "",
          name: `${existingLock.user?.firstName || ""} ${existingLock.user?.lastName || ""}`.trim() || "Unknown",
        }
      };
    }

    // If user already has lock, extend it
    if (existingLock && existingLock.lock.userId === userId) {
      const [updated] = await db.update(contentLocks)
        .set({ expiresAt: new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000) })
        .where(eq(contentLocks.id, existingLock.lock.id))
        .returning();
      return updated;
    }

    // Create new lock
    const [lock] = await db.insert(contentLocks).values({
      contentId,
      userId,
      expiresAt: new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000),
      isActive: true,
    }).returning();

    return lock;
  },

  async releaseLock(contentId: string, userId: string): Promise<void> {
    await db.update(contentLocks)
      .set({ isActive: false })
      .where(and(
        eq(contentLocks.contentId, contentId),
        eq(contentLocks.userId, userId),
        eq(contentLocks.isActive, true)
      ));
  },

  async getLock(contentId: string): Promise<(ContentLock & { user: { firstName: string | null; lastName: string | null } }) | null> {
    const [lock] = await db.select({
      id: contentLocks.id,
      contentId: contentLocks.contentId,
      userId: contentLocks.userId,
      lockedAt: contentLocks.lockedAt,
      expiresAt: contentLocks.expiresAt,
      isActive: contentLocks.isActive,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
      }
    })
      .from(contentLocks)
      .leftJoin(users, eq(contentLocks.userId, users.id))
      .where(and(
        eq(contentLocks.contentId, contentId),
        eq(contentLocks.isActive, true),
        gt(contentLocks.expiresAt, new Date())
      ));
    return lock as any || null;
  },

  async cleanupExpired(): Promise<number> {
    const result = await db.update(contentLocks)
      .set({ isActive: false })
      .where(and(
        eq(contentLocks.isActive, true),
        lt(contentLocks.expiresAt, new Date())
      ))
      .returning();
    return result.length;
  },

  /**
   * Force unlock - admin only
   * Releases a lock regardless of who owns it
   */
  async forceUnlock(contentId: string): Promise<void> {
    await db.update(contentLocks)
      .set({ isActive: false })
      .where(and(
        eq(contentLocks.contentId, contentId),
        eq(contentLocks.isActive, true)
      ));
  },

  /**
   * Get all active locks for admin monitoring
   */
  async getAllActiveLocks(): Promise<Array<ContentLock & { user: { firstName: string | null; lastName: string | null; email: string }; content: { title: string; type: string } }>> {
    const locks = await db.select({
      id: contentLocks.id,
      contentId: contentLocks.contentId,
      userId: contentLocks.userId,
      lockedAt: contentLocks.lockedAt,
      expiresAt: contentLocks.expiresAt,
      isActive: contentLocks.isActive,
      user: {
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      },
      content: {
        title: contents.title,
        type: contents.type,
      }
    })
      .from(contentLocks)
      .leftJoin(users, eq(contentLocks.userId, users.id))
      .leftJoin(contents, eq(contentLocks.contentId, contents.id))
      .where(and(
        eq(contentLocks.isActive, true),
        gt(contentLocks.expiresAt, new Date())
      ))
      .orderBy(desc(contentLocks.lockedAt));
    return locks as any;
  },
};

// ============================================================================
// NOTIFICATIONS SERVICE
// ============================================================================

export const notificationsService = {
  async create(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  },

  async createMany(data: InsertNotification[]): Promise<Notification[]> {
    if (data.length === 0) return [];
    return db.insert(notifications).values(data).returning();
  },

  async getForUser(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
    const conditions = [eq(notifications.userId, userId)];
    if (options?.unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    return db.select().from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(options?.limit || 50);
  },

  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
    return Number(result?.count) || 0;
  },

  async markAsRead(id: string, userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ));
  },

  async markAllAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ));
  },

  async delete(id: string, userId: string): Promise<void> {
    await db.delete(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, userId)
      ));
  },
};

// ============================================================================
// WEBHOOKS SERVICE
// ============================================================================

export const webhooksService = {
  async getAll(): Promise<Webhook[]> {
    return db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  },

  async getById(id: string): Promise<Webhook | null> {
    const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, id));
    return webhook || null;
  },

  async create(data: InsertWebhook): Promise<Webhook> {
    // Generate secret if not provided
    const secret = data.secret || crypto.randomBytes(32).toString("hex");
    const [webhook] = await db.insert(webhooks).values({ ...data, secret } as any).returning();
    return webhook;
  },

  async update(id: string, data: Partial<InsertWebhook>): Promise<Webhook | null> {
    const [webhook] = await db.update(webhooks)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(webhooks.id, id))
      .returning();
    return webhook || null;
  },

  async delete(id: string): Promise<void> {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  },

  async getByEvent(event: string): Promise<Webhook[]> {
    const activeWebhooks = await db.select().from(webhooks).where(eq(webhooks.isActive, true));
    return activeWebhooks.filter(w => (w.events as string[])?.includes(event));
  },

  async trigger(event: string, payload: Record<string, unknown>): Promise<void> {
    const targetWebhooks = await this.getByEvent(event);

    for (const webhook of targetWebhooks) {
      // Fire and forget with retries (non-blocking)
      this.sendWithRetry(webhook, event, payload);
    }
  },

  /**
   * Send webhook with exponential backoff retry
   * Retries up to 3 times with delays: 2s, 4s, 8s
   */
  async sendWithRetry(
    webhook: Webhook,
    event: string,
    payload: Record<string, unknown>,
    attempt: number = 1
  ): Promise<void> {
    const MAX_RETRIES = 3;
    const startTime = Date.now();

    try {
      // SSRF Protection: Validate webhook URL before sending
      const ssrfCheck = validateUrlForSSRF(webhook.url);
      if (!ssrfCheck.valid) {
        console.warn(`[Webhook] SSRF blocked for webhook ${webhook.id}: ${ssrfCheck.error}`);
        await db.insert(webhookLogs).values({
          webhookId: webhook.id,
          event,
          payload,
          responseStatus: 0,
          error: `SSRF blocked: ${ssrfCheck.error}`,
          duration: Date.now() - startTime,
        });
        return;
      }

      const signature = crypto
        .createHmac("sha256", webhook.secret || "")
        .update(JSON.stringify(payload))
        .digest("hex");

      const response = await fetch(ssrfCheck.sanitizedUrl!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
          "X-Webhook-Attempt": String(attempt),
          ...(webhook.headers as Record<string, string> || {}),
        },
        body: JSON.stringify({ event, payload, timestamp: new Date().toISOString() }),
      });

      const responseBody = await response.text();
      const duration = Date.now() - startTime;

      await db.insert(webhookLogs).values({
        webhookId: webhook.id,
        event,
        payload,
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000),
        duration,
      });

      // Retry on 5xx errors (server errors)
      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[Webhook] Retry ${attempt} for ${webhook.id} after ${delay}ms (status: ${response.status})`);
        setTimeout(() => this.sendWithRetry(webhook, event, payload, attempt + 1), delay);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      await db.insert(webhookLogs).values({
        webhookId: webhook.id,
        event,
        payload,
        error: `Attempt ${attempt}: ${errorMsg}`,
        duration,
      });

      // Retry on network errors
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[Webhook] Retry ${attempt} for ${webhook.id} after ${delay}ms (error: ${errorMsg})`);
        setTimeout(() => this.sendWithRetry(webhook, event, payload, attempt + 1), delay);
      } else {
        console.error(`[Webhook] Max retries exceeded for ${webhook.id}: ${errorMsg}`);
      }
    }
  },

  async getLogs(webhookId: string, limit: number = 50): Promise<WebhookLog[]> {
    return db.select().from(webhookLogs)
      .where(eq(webhookLogs.webhookId, webhookId))
      .orderBy(desc(webhookLogs.createdAt))
      .limit(limit);
  },
};

// ============================================================================
// COMMENTS SERVICE
// ============================================================================

export const commentsService = {
  async getForContent(contentId: string): Promise<(Comment & { author: { firstName: string | null; lastName: string | null } })[]> {
    const result = await db.select({
      id: comments.id,
      contentId: comments.contentId,
      parentId: comments.parentId,
      authorId: comments.authorId,
      body: comments.body,
      mentions: comments.mentions,
      isResolved: comments.isResolved,
      resolvedBy: comments.resolvedBy,
      resolvedAt: comments.resolvedAt,
      editedAt: comments.editedAt,
      createdAt: comments.createdAt,
      author: {
        firstName: users.firstName,
        lastName: users.lastName,
      }
    })
      .from(comments)
      .leftJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.contentId, contentId))
      .orderBy(comments.createdAt);
    return result as any;
  },

  async create(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data as any).returning();
    return comment;
  },

  async update(id: string, body: string): Promise<Comment | null> {
    const [comment] = await db.update(comments)
      .set({ body, editedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return comment || null;
  },

  async delete(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  },

  async resolve(id: string, resolvedBy: string): Promise<Comment | null> {
    const [comment] = await db.update(comments)
      .set({ isResolved: true, resolvedBy, resolvedAt: new Date() })
      .where(eq(comments.id, id))
      .returning();
    return comment || null;
  },

  async unresolve(id: string): Promise<Comment | null> {
    const [comment] = await db.update(comments)
      .set({ isResolved: false, resolvedBy: null, resolvedAt: null })
      .where(eq(comments.id, id))
      .returning();
    return comment || null;
  },
};

// ============================================================================
// SCHEDULED TASKS SERVICE
// ============================================================================

export const scheduledTasksService = {
  async create(data: InsertScheduledTask): Promise<ScheduledTask> {
    const [task] = await db.insert(scheduledTasks).values(data).returning();
    return task;
  },

  async getPending(): Promise<ScheduledTask[]> {
    return db.select().from(scheduledTasks)
      .where(and(
        eq(scheduledTasks.status, "pending"),
        lt(scheduledTasks.scheduledFor, new Date())
      ))
      .orderBy(scheduledTasks.scheduledFor);
  },

  async markCompleted(id: string): Promise<void> {
    await db.update(scheduledTasks)
      .set({ status: "completed", executedAt: new Date() })
      .where(eq(scheduledTasks.id, id));
  },

  async markFailed(id: string, error: string): Promise<void> {
    await db.update(scheduledTasks)
      .set({ status: "failed", error, executedAt: new Date() })
      .where(eq(scheduledTasks.id, id));
  },

  async cancel(id: string): Promise<void> {
    await db.update(scheduledTasks)
      .set({ status: "cancelled" })
      .where(eq(scheduledTasks.id, id));
  },

  async getForTarget(targetType: string, targetId: string): Promise<ScheduledTask[]> {
    return db.select().from(scheduledTasks)
      .where(and(
        eq(scheduledTasks.targetType, targetType),
        eq(scheduledTasks.targetId, targetId),
        eq(scheduledTasks.status, "pending")
      ));
  },
};

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================

export const enterprise = {
  teams: teamsService,
  workflows: workflowsService,
  activity: activityService,
  locks: lockService,
  notifications: notificationsService,
  webhooks: webhooksService,
  comments: commentsService,
  scheduledTasks: scheduledTasksService,
};
