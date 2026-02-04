/**
 * Real Autopilot Service
 * 4-mode autopilot system controlling all automated content operations
 */

import { db } from "../../db";
import { autopilotState, autopilotTasks, autopilotSchedules, contents } from "@shared/schema";
import { eq, and, desc, sql, gte, inArray } from "drizzle-orm";
import {
  AutopilotMode,
  AutopilotTaskType,
  AutopilotTaskStatus,
  AutopilotConfig,
  AutopilotStats,
  AutopilotStateData,
  TaskConfig,
  TaskResult,
  TaskSummary,
  ApprovalAction,
  MODE_BEHAVIORS,
  DEFAULT_AUTOPILOT_CONFIG,
} from "./types";
import { log } from "../../lib/logger";

export class RealAutopilot {
  private state: AutopilotStateData | null = null;
  private executors: Map<
    AutopilotTaskType,
    (taskId: string, config: TaskConfig) => Promise<TaskResult>
  > = new Map();
  private processInterval: NodeJS.Timeout | null = null;
  private readonly PROCESS_INTERVAL_MS = 60000; // 1 minute

  /**
   * Initialize the autopilot service
   */
  async initialize(): Promise<void> {
    // Load or create state
    const [existingState] = await db.select().from(autopilotState).limit(1);

    if (existingState) {
      this.state = {
        mode: existingState.mode as AutopilotMode,
        config: (existingState.config as AutopilotConfig) || DEFAULT_AUTOPILOT_CONFIG,
        stats: (existingState.stats as AutopilotStats) || {
          totalTasksCreated: 0,
          totalTasksCompleted: 0,
          totalContentGenerated: 0,
        },
        lastModeChangeBy: existingState.lastModeChangeBy || undefined,
        lastModeChangeAt: existingState.lastModeChangeAt || undefined,
      };
    } else {
      // Create initial state
      const [newState] = await db
        .insert(autopilotState)
        .values({
          mode: "off",
          config: DEFAULT_AUTOPILOT_CONFIG,
          stats: {
            totalTasksCreated: 0,
            totalTasksCompleted: 0,
            totalContentGenerated: 0,
          },
        })
        .returning();

      this.state = {
        mode: "off",
        config: DEFAULT_AUTOPILOT_CONFIG,
        stats: {
          totalTasksCreated: 0,
          totalTasksCompleted: 0,
          totalContentGenerated: 0,
        },
      };
    }

    log.info(`[RealAutopilot] Initialized with mode: ${this.state.mode}`);
  }

  /**
   * Register a task executor
   */
  registerExecutor(
    taskType: AutopilotTaskType,
    executor: (taskId: string, config: TaskConfig) => Promise<TaskResult>
  ): void {
    this.executors.set(taskType, executor);
    log.info(`[RealAutopilot] Registered executor for: ${taskType}`);
  }

  /**
   * Get current mode
   */
  getMode(): AutopilotMode {
    return this.state?.mode || "off";
  }

  /**
   * Get current state
   */
  getState(): AutopilotStateData | null {
    return this.state;
  }

  /**
   * Get mode behavior
   */
  getModeBehavior() {
    return MODE_BEHAVIORS[this.getMode()];
  }

  /**
   * Set autopilot mode
   */
  async setMode(mode: AutopilotMode, userId?: string): Promise<void> {
    if (!this.state) await this.initialize();

    const previousMode = this.state!.mode;
    this.state!.mode = mode;
    this.state!.lastModeChangeBy = userId;
    this.state!.lastModeChangeAt = new Date();

    // Update database
    await db.update(autopilotState).set({
      mode,
      lastModeChangeBy: userId,
      lastModeChangeAt: new Date(),
      updatedAt: new Date(),
    } as any);

    // Start/stop processing based on mode
    if (mode === "off") {
      this.stopProcessing();
    } else if (previousMode === "off") {
      this.startProcessing();
    }

    log.info(
      `[RealAutopilot] Mode changed from ${previousMode} to ${mode} by ${userId || "system"}`
    );
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<AutopilotConfig>): Promise<void> {
    if (!this.state) await this.initialize();

    this.state!.config = { ...this.state!.config, ...config };

    await db.update(autopilotState).set({
      config: this.state!.config,
      updatedAt: new Date(),
    } as any);

    log.info("[RealAutopilot] Configuration updated");
  }

  /**
   * Create a new task
   */
  async createTask(
    taskType: AutopilotTaskType,
    title: string,
    config: TaskConfig,
    options?: {
      description?: string;
      targetContentId?: string;
      targetEntityId?: string;
      priority?: number;
      scheduledFor?: Date;
    }
  ): Promise<string> {
    if (!this.state) await this.initialize();

    const behavior = this.getModeBehavior();

    // Determine initial status based on mode
    let initialStatus: AutopilotTaskStatus = "pending";
    if (behavior.requiresApproval) {
      initialStatus = "awaiting_approval";
    }

    const [task] = await db
      .insert(autopilotTasks)
      .values({
        taskType,
        status: initialStatus,
        priority: options?.priority || 5,
        title,
        description: options?.description,
        targetContentId: options?.targetContentId,
        targetEntityId: options?.targetEntityId,
        config,
        scheduledFor: options?.scheduledFor,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .returning();

    // Update stats
    this.state!.stats.totalTasksCreated++;
    await this.updateStats();

    log.info(`[RealAutopilot] Created task: ${task.id} (${taskType}) - ${title}`);

    // In full_auto mode, execute immediately if no schedule
    if (this.state!.mode === "full_auto" && !options?.scheduledFor) {
      this.executeTask(task.id).catch(err => {
        log.error(`[RealAutopilot] Failed to execute task ${task.id}:`, err);
      });
    }

    return task.id;
  }

  /**
   * Approve a task
   */
  async approveTask(action: ApprovalAction): Promise<boolean> {
    const [task] = await db
      .select()
      .from(autopilotTasks)
      .where(eq(autopilotTasks.id, action.taskId))
      .limit(1);

    if (!task || task.status !== "awaiting_approval") {
      return false;
    }

    if (action.action === "approve") {
      await db
        .update(autopilotTasks)
        .set({
          status: "approved",
          approvedBy: action.approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(autopilotTasks.id, action.taskId));

      log.info(`[RealAutopilot] Task ${action.taskId} approved by ${action.approvedBy}`);

      // Execute approved task
      this.executeTask(action.taskId).catch(err => {
        log.error(`[RealAutopilot] Failed to execute approved task ${action.taskId}:`, err);
      });

      return true;
    } else {
      await db
        .update(autopilotTasks)
        .set({
          status: "rejected",
          rejectedBy: action.approvedBy,
          rejectedAt: new Date(),
          rejectionReason: action.reason,
          updatedAt: new Date(),
        } as any)
        .where(eq(autopilotTasks.id, action.taskId));

      log.info(
        `[RealAutopilot] Task ${action.taskId} rejected by ${action.approvedBy}: ${action.reason}`
      );
      return true;
    }
  }

  /**
   * Execute a task
   */
  async executeTask(taskId: string): Promise<TaskResult> {
    const [task] = await db
      .select()
      .from(autopilotTasks)
      .where(eq(autopilotTasks.id, taskId))
      .limit(1);

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // Check if task can be executed
    if (!["pending", "approved"].includes(task.status)) {
      return { success: false, error: `Task status is ${task.status}, cannot execute` };
    }

    const executor = this.executors.get(task.taskType as AutopilotTaskType);
    if (!executor) {
      return { success: false, error: `No executor for task type: ${task.taskType}` };
    }

    // Update status to executing
    await db
      .update(autopilotTasks)
      .set({
        status: "executing",
        executionStartedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(autopilotTasks.id, taskId));

    try {
      const result = await executor(taskId, task.config as TaskConfig);

      // Update task with result
      await db
        .update(autopilotTasks)
        .set({
          status: result.success ? "completed" : "failed",
          result,
          executionCompletedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(autopilotTasks.id, taskId));

      if (result.success) {
        this.state!.stats.totalTasksCompleted++;
        if (result.contentIds) {
          this.state!.stats.totalContentGenerated += result.contentIds.length;
        }
        await this.updateStats();
      }

      log.info(`[RealAutopilot] Task ${taskId} ${result.success ? "completed" : "failed"}`);
      return result;
    } catch (error) {
      const result: TaskResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };

      await db
        .update(autopilotTasks)
        .set({
          status: "failed",
          result,
          retryCount: sql`retry_count + 1`,
          executionCompletedAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(eq(autopilotTasks.id, taskId));

      log.error(`[RealAutopilot] Task ${taskId} execution error:`, error);
      return result;
    }
  }

  /**
   * Get task summary
   */
  async getTaskSummary(): Promise<TaskSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [statusCounts, typeCounts, todayStats] = await Promise.all([
      db
        .execute(
          sql`
        SELECT status, COUNT(*)::int as count
        FROM autopilot_tasks
        WHERE status NOT IN ('completed', 'failed', 'rejected', 'cancelled')
        GROUP BY status
      `
        )
        .then(r => r.rows as Array<{ status: string; count: number }>),

      db
        .execute(
          sql`
        SELECT task_type, COUNT(*)::int as count
        FROM autopilot_tasks
        WHERE status NOT IN ('completed', 'failed', 'rejected', 'cancelled')
        GROUP BY task_type
      `
        )
        .then(r => r.rows as Array<{ task_type: string; count: number }>),

      db
        .execute(
          sql`
        SELECT
          COUNT(CASE WHEN status = 'completed' AND execution_completed_at >= ${today} THEN 1 END)::int as completed_today,
          COUNT(CASE WHEN status = 'failed' AND execution_completed_at >= ${today} THEN 1 END)::int as failed_today
        FROM autopilot_tasks
      `
        )
        .then(r => r.rows[0] as { completed_today: number; failed_today: number }),
    ]);

    const summary: TaskSummary = {
      pending: 0,
      awaitingApproval: 0,
      executing: 0,
      completedToday: todayStats?.completed_today || 0,
      failedToday: todayStats?.failed_today || 0,
      byType: {} as Record<AutopilotTaskType, number>,
    };

    for (const row of statusCounts) {
      if (row.status === "pending") summary.pending = row.count;
      else if (row.status === "awaiting_approval") summary.awaitingApproval = row.count;
      else if (row.status === "executing") summary.executing = row.count;
    }

    for (const row of typeCounts) {
      summary.byType[row.task_type as AutopilotTaskType] = row.count;
    }

    return summary;
  }

  /**
   * Get tasks by status
   */
  async getTasks(
    status?: AutopilotTaskStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<Array<typeof autopilotTasks.$inferSelect>> {
    let query = db
      .select()
      .from(autopilotTasks)
      .orderBy(desc(autopilotTasks.priority), desc(autopilotTasks.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      return db
        .select()
        .from(autopilotTasks)
        .where(eq(autopilotTasks.status, status))
        .orderBy(desc(autopilotTasks.priority), desc(autopilotTasks.createdAt))
        .limit(limit)
        .offset(offset);
    }

    return query;
  }

  /**
   * Get tasks awaiting approval
   */
  async getAwaitingApproval(
    limit: number = 50
  ): Promise<Array<typeof autopilotTasks.$inferSelect>> {
    return this.getTasks("awaiting_approval", limit);
  }

  /**
   * Run now - trigger immediate processing
   */
  async runNow(taskTypes?: AutopilotTaskType[]): Promise<{
    tasksCreated: number;
    tasksExecuted: number;
  }> {
    if (!this.state) await this.initialize();

    const behavior = this.getModeBehavior();
    if (!behavior.contentGeneration) {
      return { tasksCreated: 0, tasksExecuted: 0 };
    }

    // Get pending tasks to execute
    const pendingTasks = await db
      .select()
      .from(autopilotTasks)
      .where(
        and(
          inArray(autopilotTasks.status, ["pending", "approved"]),
          taskTypes ? inArray(autopilotTasks.taskType, taskTypes) : undefined
        )
      )
      .orderBy(desc(autopilotTasks.priority))
      .limit(10);

    let tasksExecuted = 0;
    for (const task of pendingTasks) {
      const result = await this.executeTask(task.id);
      if (result.success) tasksExecuted++;
    }

    return {
      tasksCreated: 0,
      tasksExecuted,
    };
  }

  /**
   * Start background processing
   */
  private startProcessing(): void {
    if (this.processInterval) return;

    this.processInterval = setInterval(async () => {
      await this.processQueue();
    }, this.PROCESS_INTERVAL_MS);

    log.info("[RealAutopilot] Background processing started");
  }

  /**
   * Stop background processing
   */
  private stopProcessing(): void {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    log.info("[RealAutopilot] Background processing stopped");
  }

  /**
   * Process task queue
   */
  private async processQueue(): Promise<void> {
    if (!this.state || this.state.mode === "off") return;

    const behavior = this.getModeBehavior();
    if (!behavior.contentGeneration) return;

    // Get executable tasks
    const tasks = await db
      .select()
      .from(autopilotTasks)
      .where(
        and(
          eq(autopilotTasks.status, behavior.requiresApproval ? "approved" : "pending"),
          sql`(scheduled_for IS NULL OR scheduled_for <= NOW())`,
          sql`(expires_at IS NULL OR expires_at > NOW())`
        )
      )
      .orderBy(desc(autopilotTasks.priority))
      .limit(5);

    for (const task of tasks) {
      await this.executeTask(task.id);
    }
  }

  /**
   * Update stats in database
   */
  private async updateStats(): Promise<void> {
    if (!this.state) return;

    await db.update(autopilotState).set({
      stats: {
        ...this.state.stats,
        lastActivityAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    } as any);
  }
}

// Singleton instance
let autopilotInstance: RealAutopilot | null = null;

export function getRealAutopilot(): RealAutopilot {
  if (!autopilotInstance) {
    autopilotInstance = new RealAutopilot();
  }
  return autopilotInstance;
}

export async function initializeRealAutopilot(): Promise<RealAutopilot> {
  const autopilot = getRealAutopilot();
  await autopilot.initialize();
  return autopilot;
}
