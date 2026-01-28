/**
 * Operations & Reliability - Backpressure & Load Shedding
 *
 * FEATURE 3: Automatic load management
 * - Disable non-critical jobs under load
 * - Throttle AI calls
 * - Automatic activation/deactivation
 *
 * Feature flag: ENABLE_BACKPRESSURE=true
 */

import { log } from "../lib/logger";
import { getOpsConfig } from "./config";
import type { BackpressureState } from "./types";

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[Backpressure] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[Backpressure] ${msg}`, data),
  alert: (msg: string, data?: Record<string, unknown>) =>
    log.warn(`[Backpressure][ALERT] ${msg}`, data),
};

type BackpressureLevel = "none" | "light" | "heavy";

interface ThrottleConfig {
  maxConcurrentAiCalls: number;
  delayBetweenCallsMs: number;
  disableNonCriticalJobs: boolean;
  rejectNewRequests: boolean;
}

const LEVEL_CONFIGS: Record<BackpressureLevel, ThrottleConfig> = {
  none: {
    maxConcurrentAiCalls: 10,
    delayBetweenCallsMs: 0,
    disableNonCriticalJobs: false,
    rejectNewRequests: false,
  },
  light: {
    maxConcurrentAiCalls: 5,
    delayBetweenCallsMs: 100,
    disableNonCriticalJobs: true,
    rejectNewRequests: false,
  },
  heavy: {
    maxConcurrentAiCalls: 2,
    delayBetweenCallsMs: 500,
    disableNonCriticalJobs: true,
    rejectNewRequests: true,
  },
};

// Bounded metrics history
const MAX_METRICS_HISTORY = 60;

interface MetricsSnapshot {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  queueDepth: number;
  aiLatencyMs: number;
}

class BackpressureController {
  private currentLevel: BackpressureLevel = "none";
  private activatedAt?: Date;
  private lastDeactivatedAt?: Date;
  private metricsHistory: MetricsSnapshot[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private currentAiCalls = 0;
  private aiCallQueue: Array<() => void> = [];

  /**
   * Get current backpressure state
   */
  getState(): BackpressureState {
    const metrics = this.getCurrentMetrics();
    return {
      isActive: this.currentLevel !== "none",
      level: this.currentLevel,
      reason: this.getActivationReason(),
      activatedAt: this.activatedAt,
      metrics,
    };
  }

  /**
   * Get current system metrics
   */
  private getCurrentMetrics(): BackpressureState["metrics"] {
    const memUsage = process.memoryUsage();
    const memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // CPU usage approximation (would need more sophisticated tracking in production)
    const cpuUsage = this.estimateCpuUsage();

    // Queue depth from last check
    const lastMetrics = this.metricsHistory[this.metricsHistory.length - 1];

    return {
      cpuUsage,
      memoryUsage,
      queueDepth: lastMetrics?.queueDepth ?? 0,
      aiLatencyMs: lastMetrics?.aiLatencyMs ?? 0,
    };
  }

  /**
   * Estimate CPU usage (simplified)
   */
  private estimateCpuUsage(): number {
    // In production, use proper CPU monitoring
    // This is a placeholder that uses event loop lag as a proxy
    const cpuUsage = process.cpuUsage();
    const total = cpuUsage.user + cpuUsage.system;
    // Rough estimate - would need baseline measurement
    return Math.min(100, total / 1000000); // Microseconds to rough percentage
  }

  /**
   * Check system metrics and adjust backpressure level
   */
  async checkAndAdjust(): Promise<BackpressureLevel> {
    const config = getOpsConfig();

    if (!config.backpressureEnabled) {
      if (this.currentLevel !== "none") {
        this.setLevel("none", "Feature disabled");
      }
      return "none";
    }

    const metrics = await this.collectMetrics();
    this.recordMetrics(metrics);

    const newLevel = this.calculateLevel(metrics);

    if (newLevel !== this.currentLevel) {
      this.setLevel(newLevel, this.getActivationReason(metrics));
    }

    return this.currentLevel;
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<MetricsSnapshot> {
    const memUsage = process.memoryUsage();
    const memoryUsage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    const cpuUsage = this.estimateCpuUsage();

    // Get queue depth
    let queueDepth = 0;
    try {
      const { jobQueue } = await import("../job-queue");
      const stats = await jobQueue.getStats();
      queueDepth = stats.pending + stats.processing;
    } catch {
      // Queue not available
    }

    // Get AI latency from health tracker
    let aiLatencyMs = 0;
    try {
      const { getHealthTracker } = await import("../ai-orchestrator/health-tracker");
      const tracker = getHealthTracker();
      const healthData = tracker.getAllHealth();
      if (healthData.length > 0) {
        const avgLatency =
          healthData.reduce((sum, h) => sum + h.averageLatencyMs, 0) / healthData.length;
        aiLatencyMs = avgLatency;
      }
    } catch {
      // Health tracker not available
    }

    return {
      timestamp: new Date(),
      cpuUsage,
      memoryUsage,
      queueDepth,
      aiLatencyMs,
    };
  }

  /**
   * Record metrics to bounded history
   */
  private recordMetrics(metrics: MetricsSnapshot): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > MAX_METRICS_HISTORY) {
      this.metricsHistory.shift();
    }
  }

  /**
   * Calculate appropriate backpressure level based on metrics
   */
  private calculateLevel(metrics: MetricsSnapshot): BackpressureLevel {
    const config = getOpsConfig();

    // Heavy backpressure conditions
    if (
      metrics.cpuUsage > config.backpressure.cpuThresholdPercent + 10 ||
      metrics.memoryUsage > config.backpressure.memoryThresholdPercent + 10 ||
      metrics.queueDepth > config.backpressure.queueDepthThreshold * 2 ||
      metrics.aiLatencyMs > config.backpressure.aiLatencyThresholdMs * 2
    ) {
      return "heavy";
    }

    // Light backpressure conditions
    if (
      metrics.cpuUsage > config.backpressure.cpuThresholdPercent ||
      metrics.memoryUsage > config.backpressure.memoryThresholdPercent ||
      metrics.queueDepth > config.backpressure.queueDepthThreshold ||
      metrics.aiLatencyMs > config.backpressure.aiLatencyThresholdMs
    ) {
      return "light";
    }

    // Check cooldown before returning to none
    if (this.currentLevel !== "none" && this.activatedAt) {
      const elapsed = Date.now() - this.activatedAt.getTime();
      if (elapsed < config.backpressure.cooldownMs) {
        return this.currentLevel;
      }
    }

    return "none";
  }

  /**
   * Get reason for current activation
   */
  private getActivationReason(metrics?: MetricsSnapshot): string | undefined {
    if (this.currentLevel === "none") return undefined;

    const m = metrics || this.getCurrentMetrics();
    const config = getOpsConfig();
    const reasons: string[] = [];

    if (m.cpuUsage > config.backpressure.cpuThresholdPercent) {
      reasons.push(`High CPU: ${Math.round(m.cpuUsage)}%`);
    }
    if (m.memoryUsage > config.backpressure.memoryThresholdPercent) {
      reasons.push(`High memory: ${Math.round(m.memoryUsage)}%`);
    }
    if (m.queueDepth > config.backpressure.queueDepthThreshold) {
      reasons.push(`Queue depth: ${m.queueDepth}`);
    }
    if (m.aiLatencyMs > config.backpressure.aiLatencyThresholdMs) {
      reasons.push(`AI latency: ${Math.round(m.aiLatencyMs)}ms`);
    }

    return reasons.join(", ") || "Unknown";
  }

  /**
   * Set backpressure level
   */
  private setLevel(level: BackpressureLevel, reason?: string): void {
    const previousLevel = this.currentLevel;
    this.currentLevel = level;

    if (level !== "none" && previousLevel === "none") {
      this.activatedAt = new Date();
      logger.alert("Backpressure ACTIVATED", { level, reason });
    } else if (level === "none" && previousLevel !== "none") {
      this.lastDeactivatedAt = new Date();
      const duration = this.activatedAt ? Date.now() - this.activatedAt.getTime() : 0;
      logger.info("Backpressure DEACTIVATED", {
        previousLevel,
        durationMs: duration,
      });
      this.activatedAt = undefined;
    } else if (level !== previousLevel) {
      logger.warn("Backpressure level changed", {
        from: previousLevel,
        to: level,
        reason,
      });
    }
  }

  /**
   * Check if a request should be allowed based on current backpressure
   */
  shouldAllowRequest(isCritical: boolean = false): boolean {
    // If backpressure feature is disabled, always allow
    const opsConfig = getOpsConfig();
    if (!opsConfig.backpressureEnabled) return true;

    const config = LEVEL_CONFIGS[this.currentLevel];

    if (isCritical) return true;
    if (config.rejectNewRequests) return false;

    return true;
  }

  /**
   * Check if non-critical jobs should run
   */
  shouldRunNonCriticalJobs(): boolean {
    const config = LEVEL_CONFIGS[this.currentLevel];
    return !config.disableNonCriticalJobs;
  }

  /**
   * Throttle an AI call (returns a promise that resolves when call can proceed)
   */
  async throttleAiCall(): Promise<void> {
    const config = LEVEL_CONFIGS[this.currentLevel];

    // Add delay between calls
    if (config.delayBetweenCallsMs > 0) {
      await new Promise(resolve => setTimeout(resolve, config.delayBetweenCallsMs));
    }

    // Wait for available slot if at capacity
    if (this.currentAiCalls >= config.maxConcurrentAiCalls) {
      await new Promise<void>(resolve => {
        this.aiCallQueue.push(resolve);
      });
    }

    this.currentAiCalls++;
  }

  /**
   * Release an AI call slot
   */
  releaseAiCall(): void {
    this.currentAiCalls = Math.max(0, this.currentAiCalls - 1);

    // Release next waiting call
    const next = this.aiCallQueue.shift();
    if (next) {
      next();
    }
  }

  /**
   * Get current throttle configuration
   */
  getThrottleConfig(): ThrottleConfig {
    return { ...LEVEL_CONFIGS[this.currentLevel] };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(): MetricsSnapshot[] {
    return [...this.metricsHistory];
  }

  /**
   * Start automatic backpressure monitoring
   */
  start(): void {
    if (this.isRunning) return;

    const config = getOpsConfig();
    if (!config.backpressureEnabled) {
      logger.info("Backpressure monitoring disabled by feature flag");
      return;
    }

    this.isRunning = true;

    // Check every 5 seconds
    this.checkInterval = setInterval(() => {
      this.checkAndAdjust().catch(err => {
        logger.warn("Backpressure check failed", { error: String(err) });
      });
    }, 5000);

    // Initial check
    this.checkAndAdjust().catch(err => {
      logger.warn("Initial backpressure check failed", { error: String(err) });
    });

    logger.info("Backpressure controller started");
  }

  /**
   * Stop automatic monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info("Backpressure controller stopped");
  }

  /**
   * Check if controller is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Force a specific level (for testing/emergency)
   */
  forceLevel(level: BackpressureLevel, reason: string): void {
    this.setLevel(level, `Forced: ${reason}`);
  }
}

// Singleton instance
let instance: BackpressureController | null = null;

export function getBackpressureController(): BackpressureController {
  if (!instance) {
    instance = new BackpressureController();
  }
  return instance;
}

export function resetBackpressureController(): void {
  if (instance) {
    instance.stop();
  }
  instance = null;
}

// Convenience functions
export function shouldAllowRequest(isCritical: boolean = false): boolean {
  return getBackpressureController().shouldAllowRequest(isCritical);
}

export function shouldRunNonCriticalJobs(): boolean {
  return getBackpressureController().shouldRunNonCriticalJobs();
}

export async function throttleAiCall(): Promise<void> {
  return getBackpressureController().throttleAiCall();
}

export function releaseAiCall(): void {
  getBackpressureController().releaseAiCall();
}

export { BackpressureController, BackpressureLevel, ThrottleConfig };
