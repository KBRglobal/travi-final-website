/**
 * Real Autopilot Module
 * 4-mode autopilot system controlling all automated content operations
 */

export * from "./types";
export { getRealAutopilot, initializeRealAutopilot, RealAutopilot } from "./real-autopilot";
export { getAutopilotScheduler, AutopilotScheduler } from "./scheduler";
export { registerAllExecutors } from "./executors";

import { initializeRealAutopilot, getRealAutopilot } from "./real-autopilot";
import { getAutopilotScheduler } from "./scheduler";
import { registerAllExecutors } from "./executors";
import { log } from "../../lib/logger";

/**
 * Initialize the complete autopilot system
 */
export async function initializeAutopilotSystem(): Promise<void> {
  try {
    // Initialize autopilot service
    await initializeRealAutopilot();

    // Register all task executors
    registerAllExecutors();

    // Initialize scheduler (but don't start yet - controlled by mode)
    const scheduler = getAutopilotScheduler();
    await scheduler.initialize();

    // Start scheduler if autopilot is not off
    const autopilot = getRealAutopilot();
    if (autopilot.getMode() !== "off") {
      scheduler.start();
    }

    log.info("[AutopilotSystem] Fully initialized");
  } catch (error) {
    log.error("[AutopilotSystem] Initialization failed:", error);
    throw error;
  }
}

/**
 * Quick API for autopilot operations
 */
export const autopilotAPI = {
  /**
   * Get current status
   */
  async getStatus() {
    const autopilot = getRealAutopilot();
    const state = autopilot.getState();
    const summary = await autopilot.getTaskSummary();

    return {
      mode: autopilot.getMode(),
      behavior: autopilot.getModeBehavior(),
      config: state?.config,
      stats: state?.stats,
      taskSummary: summary,
    };
  },

  /**
   * Set mode
   */
  async setMode(mode: "off" | "monitor" | "semi_auto" | "full_auto", userId?: string) {
    const autopilot = getRealAutopilot();
    await autopilot.setMode(mode, userId);

    // Start/stop scheduler based on mode
    const scheduler = getAutopilotScheduler();
    if (mode === "off") {
      scheduler.stop();
    } else {
      scheduler.start();
    }

    return autopilot.getState();
  },

  /**
   * Get tasks awaiting approval
   */
  async getAwaitingApproval(limit?: number) {
    const autopilot = getRealAutopilot();
    return autopilot.getAwaitingApproval(limit);
  },

  /**
   * Approve or reject a task
   */
  async processApproval(
    taskId: string,
    action: "approve" | "reject",
    userId: string,
    reason?: string
  ) {
    const autopilot = getRealAutopilot();
    return autopilot.approveTask({
      taskId,
      action,
      approvedBy: userId,
      reason,
    });
  },

  /**
   * Trigger immediate processing
   */
  async runNow(taskTypes?: string[]) {
    const autopilot = getRealAutopilot();
    return autopilot.runNow(taskTypes as any);
  },

  /**
   * Get schedules
   */
  async getSchedules() {
    const scheduler = getAutopilotScheduler();
    return scheduler.getSchedules();
  },

  /**
   * Update a schedule
   */
  async updateSchedule(id: string, updates: { enabled?: boolean; cronExpression?: string }) {
    const scheduler = getAutopilotScheduler();
    return scheduler.updateSchedule(id, updates);
  },
};
