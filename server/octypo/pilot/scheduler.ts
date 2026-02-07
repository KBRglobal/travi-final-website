/**
 * Autopilot Scheduler
 * Cron-based scheduling for autopilot tasks
 */

import { db } from "../../db";
import { autopilotSchedules } from "@shared/schema";
import { eq, and, sql, lte } from "drizzle-orm";
import { getRealAutopilot } from "./real-autopilot";
import { AutopilotTaskType, ScheduleConfig, DEFAULT_SCHEDULES, TaskConfig } from "./types";
import { log } from "../../lib/logger";

// Simple cron parser for basic expressions
function parseCronExpression(expression: string): {
  minute: number | "*";
  hour: number | "*";
  dayOfMonth: number | "*";
  month: number | "*";
  dayOfWeek: number | "*";
} {
  const parts = expression.split(" ");
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${expression}`);
  }

  const parse = (part: string): number | "*" => {
    if (part === "*") return "*";
    const num = Number.parseInt(part, 10);
    if (Number.isNaN(num)) return "*";
    return num;
  };

  return {
    minute: parse(parts[0]),
    hour: parse(parts[1]),
    dayOfMonth: parse(parts[2]),
    month: parse(parts[3]),
    dayOfWeek: parse(parts[4]),
  };
}

// Check if cron matches current time
function cronMatches(expression: string, date: Date): boolean {
  try {
    const cron = parseCronExpression(expression);
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    if (cron.minute !== "*" && cron.minute !== minute) return false;
    if (cron.hour !== "*" && cron.hour !== hour) return false;
    if (cron.dayOfMonth !== "*" && cron.dayOfMonth !== dayOfMonth) return false;
    if (cron.month !== "*" && cron.month !== month) return false;
    if (cron.dayOfWeek !== "*" && cron.dayOfWeek !== dayOfWeek) return false;

    return true;
  } catch {
    return false;
  }
}

// Calculate next run time
function calculateNextRun(expression: string, fromDate: Date = new Date()): Date {
  // Simple implementation: check next 24*60 minutes
  const checkDate = new Date(fromDate);
  checkDate.setSeconds(0);
  checkDate.setMilliseconds(0);

  for (let i = 0; i < 24 * 60 * 7; i++) {
    // Up to 1 week
    checkDate.setMinutes(checkDate.getMinutes() + 1);
    if (cronMatches(expression, checkDate)) {
      return checkDate;
    }
  }

  // Fallback: 24 hours from now
  return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
}

export class AutopilotScheduler {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // 1 minute
  private initialized = false;

  /**
   * Initialize schedules from defaults
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check if schedules exist
    const existing = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(autopilotSchedules)
      .then(r => r[0]?.count || 0);

    if (existing === 0) {
      // Create default schedules
      await this.createDefaultSchedules();
    }

    this.initialized = true;
    log.info("[AutopilotScheduler] Initialized");
  }

  /**
   * Create default schedules
   */
  private async createDefaultSchedules(): Promise<void> {
    const schedules: Array<{
      name: string;
      taskType: AutopilotTaskType;
      cronExpression: string;
      enabled: boolean;
      config: Record<string, unknown>;
    }> = [
      {
        name: "Content Generation",
        taskType: "content_generation",
        cronExpression: DEFAULT_SCHEDULES.contentGeneration?.cronExpression || "0 */4 * * *",
        enabled: DEFAULT_SCHEDULES.contentGeneration?.enabled || false,
        config: { maxPerRun: DEFAULT_SCHEDULES.contentGeneration?.maxPerRun || 10 },
      },
      {
        name: "Quality Improvement",
        taskType: "quality_improvement",
        cronExpression: DEFAULT_SCHEDULES.qualityImprovement?.cronExpression || "0 3 * * *",
        enabled: DEFAULT_SCHEDULES.qualityImprovement?.enabled || false,
        config: { targetContentAge: DEFAULT_SCHEDULES.qualityImprovement?.targetContentAge || 30 },
      },
      {
        name: "Freshness Update",
        taskType: "freshness_update",
        cronExpression: DEFAULT_SCHEDULES.freshnessUpdate?.cronExpression || "0 4 * * *",
        enabled: DEFAULT_SCHEDULES.freshnessUpdate?.enabled || false,
        config: { maxAge: DEFAULT_SCHEDULES.freshnessUpdate?.maxAge || 90 },
      },
      {
        name: "Internal Linking",
        taskType: "internal_linking",
        cronExpression: DEFAULT_SCHEDULES.internalLinking?.cronExpression || "0 5 * * 0",
        enabled: DEFAULT_SCHEDULES.internalLinking?.enabled || false,
        config: { batchSize: DEFAULT_SCHEDULES.internalLinking?.batchSize || 100 },
      },
      {
        name: "Image Optimization",
        taskType: "image_optimization",
        cronExpression: DEFAULT_SCHEDULES.imageOptimization?.cronExpression || "0 2 * * *",
        enabled: DEFAULT_SCHEDULES.imageOptimization?.enabled || false,
        config: { batchSize: DEFAULT_SCHEDULES.imageOptimization?.batchSize || 50 },
      },
    ];

    for (const schedule of schedules) {
      const nextRun = calculateNextRun(schedule.cronExpression);
      await db.insert(autopilotSchedules).values({
        name: schedule.name,
        taskType: schedule.taskType,
        cronExpression: schedule.cronExpression,
        enabled: schedule.enabled,
        config: schedule.config,
        nextRunAt: nextRun,
      } as any);
    }

    log.info(`[AutopilotScheduler] Created ${schedules.length} default schedules`);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(async () => {
      await this.checkSchedules();
    }, this.CHECK_INTERVAL_MS);

    // Run immediately
    this.checkSchedules().catch(err => {
      log.error("[AutopilotScheduler] Initial check failed:", err);
    });

    log.info("[AutopilotScheduler] Started");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    log.info("[AutopilotScheduler] Stopped");
  }

  /**
   * Check and run due schedules
   */
  private async checkSchedules(): Promise<void> {
    await this.initialize();

    const now = new Date();

    // Get due schedules
    const dueSchedules = await db
      .select()
      .from(autopilotSchedules)
      .where(and(eq(autopilotSchedules.enabled, true), lte(autopilotSchedules.nextRunAt, now)));

    for (const schedule of dueSchedules) {
      await this.runSchedule(schedule);
    }
  }

  /**
   * Run a schedule
   */
  private async runSchedule(schedule: typeof autopilotSchedules.$inferSelect): Promise<void> {
    log.info(`[AutopilotScheduler] Running schedule: ${schedule.name}`);

    const autopilot = getRealAutopilot();
    const config = schedule.config as TaskConfig;

    try {
      // Create task based on schedule type
      await autopilot.createTask(
        schedule.taskType as AutopilotTaskType,
        `Scheduled: ${schedule.name}`,
        config,
        {
          description: `Automatically scheduled task from ${schedule.name}`,
        }
      );

      // Update schedule
      const nextRun = calculateNextRun(schedule.cronExpression);
      await db
        .update(autopilotSchedules)
        .set({
          lastRunAt: new Date(),
          nextRunAt: nextRun,
          runCount: sql`run_count + 1`,
          updatedAt: new Date(),
        } as any)
        .where(eq(autopilotSchedules.id, schedule.id));

      log.info(`[AutopilotScheduler] Schedule ${schedule.name} completed, next run: ${nextRun}`);
    } catch (error) {
      log.error(`[AutopilotScheduler] Schedule ${schedule.name} failed:`, error);

      await db
        .update(autopilotSchedules)
        .set({
          failCount: sql`fail_count + 1`,
          updatedAt: new Date(),
        } as any)
        .where(eq(autopilotSchedules.id, schedule.id));
    }
  }

  /**
   * Get all schedules
   */
  async getSchedules(): Promise<Array<typeof autopilotSchedules.$inferSelect>> {
    await this.initialize();
    return db.select().from(autopilotSchedules);
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    id: string,
    updates: {
      enabled?: boolean;
      cronExpression?: string;
      config?: Record<string, unknown>;
    }
  ): Promise<void> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (updates.enabled !== undefined) {
      updateData.enabled = updates.enabled;
    }

    if (updates.cronExpression) {
      updateData.cronExpression = updates.cronExpression;
      updateData.nextRunAt = calculateNextRun(updates.cronExpression);
    }

    if (updates.config) {
      updateData.config = updates.config;
    }

    await db
      .update(autopilotSchedules)
      .set(updateData as any)
      .where(eq(autopilotSchedules.id, id));

    log.info(`[AutopilotScheduler] Updated schedule: ${id}`);
  }

  /**
   * Trigger a schedule immediately
   */
  async triggerSchedule(id: string): Promise<void> {
    const [schedule] = await db
      .select()
      .from(autopilotSchedules)
      .where(eq(autopilotSchedules.id, id))
      .limit(1);

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    await this.runSchedule(schedule);
  }
}

// Singleton instance
let schedulerInstance: AutopilotScheduler | null = null;

export function getAutopilotScheduler(): AutopilotScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new AutopilotScheduler();
  }
  return schedulerInstance;
}
