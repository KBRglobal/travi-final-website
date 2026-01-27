/**
 * Autonomous Growth Tasks - Queue
 * Task queue and execution management
 */

import { GrowthTask, TaskStatus, TaskResult, GrowthMetrics, DEFAULT_GROWTH_CONFIG } from "./types";
import { runDetectors } from "./detectors";
import { batchGenerateTasks } from "./task-generator";
import { prioritizeTasks, calculateGrowthMetrics } from "./prioritizer";

// Task queue (in-memory, would be DB in production)
const taskQueue: Map<string, GrowthTask> = new Map();
const MAX_QUEUE_SIZE = DEFAULT_GROWTH_CONFIG.maxPendingTasks;

let detectorIntervalId: NodeJS.Timeout | null = null;
let isRunning = false;

function isEnabled(): boolean {
  return process.env.ENABLE_GROWTH_TASKS === "true";
}

export function addTask(task: GrowthTask): boolean {
  // Enforce queue size limit
  const pendingCount = Array.from(taskQueue.values()).filter(t => t.status === "pending").length;

  if (pendingCount >= MAX_QUEUE_SIZE) {
    return false;
  }

  // Check for duplicates
  const exists = Array.from(taskQueue.values()).some(
    t =>
      t.type === task.type && t.targetContentId === task.targetContentId && t.status === "pending"
  );

  if (exists) {
    return false;
  }

  taskQueue.set(task.id, task);
  return true;
}

export function addTasks(tasks: GrowthTask[]): number {
  let added = 0;
  for (const task of tasks) {
    if (addTask(task)) added++;
  }
  return added;
}

export function getTask(taskId: string): GrowthTask | null {
  return taskQueue.get(taskId) || null;
}

export function getAllTasks(): GrowthTask[] {
  return Array.from(taskQueue.values());
}

export function getPendingTasks(): GrowthTask[] {
  return prioritizeTasks(Array.from(taskQueue.values()).filter(t => t.status === "pending"));
}

export function updateTaskStatus(taskId: string, status: TaskStatus, result?: TaskResult): boolean {
  const task = taskQueue.get(taskId);
  if (!task) return false;

  task.status = status;

  if (status === "in_progress") {
    task.startedAt = new Date();
  }

  if (status === "completed" || status === "failed") {
    task.completedAt = new Date();
    task.result = result || null;
  }

  return true;
}

export function assignTask(taskId: string, userId: string): boolean {
  const task = taskQueue.get(taskId);
  if (!task || task.status !== "pending") return false;

  task.assignedTo = userId;
  task.status = "in_progress";
  task.startedAt = new Date();
  return true;
}

export function completeTask(taskId: string, result: TaskResult): boolean {
  return updateTaskStatus(taskId, result.success ? "completed" : "failed", result);
}

export function skipTask(taskId: string, reason: string): boolean {
  return updateTaskStatus(taskId, "skipped", {
    success: false,
    message: reason,
  });
}

export function removeTask(taskId: string): boolean {
  return taskQueue.delete(taskId);
}

export function clearCompletedTasks(): number {
  let removed = 0;
  for (const [id, task] of taskQueue) {
    if (task.status === "completed" || task.status === "skipped") {
      taskQueue.delete(id);
      removed++;
    }
  }
  return removed;
}

async function runDetectionCycle(): Promise<void> {
  if (!isEnabled() || isRunning) return;

  isRunning = true;

  try {
    const detections = await runDetectors();
    const tasks = batchGenerateTasks(detections);
    const added = addTasks(tasks);
  } catch (error) {
  } finally {
    isRunning = false;
  }
}

export function startQueue(): void {
  if (!isEnabled()) {
    return;
  }

  // Initial detection run after 30 seconds
  setTimeout(runDetectionCycle, 30000);

  // Periodic detection
  const intervalMs = DEFAULT_GROWTH_CONFIG.detectorIntervalMinutes * 60 * 1000;
  detectorIntervalId = setInterval(runDetectionCycle, intervalMs);
}

export function stopQueue(): void {
  if (detectorIntervalId) {
    clearInterval(detectorIntervalId);
    detectorIntervalId = null;
  }
}

export function getQueueStats(): {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  skipped: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
} {
  const tasks = Array.from(taskQueue.values());

  const byType: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const task of tasks) {
    byType[task.type] = (byType[task.type] || 0) + 1;
    byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
  }

  return {
    total: tasks.length,
    pending: tasks.filter(t => t.status === "pending").length,
    inProgress: tasks.filter(t => t.status === "in_progress").length,
    completed: tasks.filter(t => t.status === "completed").length,
    failed: tasks.filter(t => t.status === "failed").length,
    skipped: tasks.filter(t => t.status === "skipped").length,
    byType,
    byPriority,
  };
}

export function getGrowthMetrics(): GrowthMetrics {
  return calculateGrowthMetrics(Array.from(taskQueue.values()));
}

export async function forceDetectionRun(): Promise<number> {
  const before = taskQueue.size;
  await runDetectionCycle();
  return taskQueue.size - before;
}
