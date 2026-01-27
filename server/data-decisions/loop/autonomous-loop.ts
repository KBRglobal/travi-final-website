/**
 * Autonomous Data Loop
 * Implements the closed-loop system: Measure → Decide → Act → Observe → Adjust
 */

import { randomUUID } from "crypto";
import type {
  LoopState,
  LoopCycle,
  LoopPhase,
  PhaseResult,
  Decision,
  AutopilotMode,
  MetricConflict,
} from "../types";
import { decisionEngine, type MetricData, type DecisionResult } from "../engine";
import { confidenceEngine, type MetricHistory } from "../confidence";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface LoopConfig {
  cycleIntervalMs: number; // How often to run a cycle
  measureTimeoutMs: number;
  decideTimeoutMs: number;
  actTimeoutMs: number;
  observeTimeoutMs: number;
  adjustTimeoutMs: number;
  maxCyclesPerHour: number;
  enableAutoAdjust: boolean;
}

const DEFAULT_LOOP_CONFIG: LoopConfig = {
  cycleIntervalMs: 5 * 60 * 1000, // 5 minutes
  measureTimeoutMs: 30000,
  decideTimeoutMs: 30000,
  actTimeoutMs: 60000,
  observeTimeoutMs: 30000,
  adjustTimeoutMs: 30000,
  maxCyclesPerHour: 12,
  enableAutoAdjust: true,
};

// =============================================================================
// ACTION EXECUTORS
// =============================================================================

type ActionExecutor = (decision: Decision) => Promise<{
  success: boolean;
  result?: unknown;
  error?: string;
}>;

// =============================================================================
// AUTONOMOUS LOOP
// =============================================================================

export class AutonomousLoop {
  private config: LoopConfig;
  private state: LoopState;
  private cycles: LoopCycle[] = [];
  private running = false;
  private intervalId?: NodeJS.Timeout;
  private actionExecutors: Map<string, ActionExecutor> = new Map();
  private metricsProvider?: () => Promise<MetricData[]>;
  private historyProvider?: (metricId: string) => Promise<MetricHistory | null>;

  constructor(config: Partial<LoopConfig> = {}) {
    this.config = { ...DEFAULT_LOOP_CONFIG, ...config };
    this.state = this.createInitialState();
    this.registerDefaultExecutors();
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  private createInitialState(): LoopState {
    return {
      currentPhase: "measure",
      cycleId: "",
      cycleNumber: 0,
      startedAt: new Date(),
      metrics: {
        collected: 0,
        anomaliesDetected: 0,
        conflictsFound: 0,
      },
      decisions: {
        generated: 0,
        autoExecuted: 0,
        pendingApproval: 0,
        escalated: 0,
      },
      actions: {
        executed: 0,
        successful: 0,
        failed: 0,
      },
      observations: {
        outcomes: 0,
        improvements: 0,
        regressions: 0,
      },
      adjustments: {
        thresholdChanges: 0,
        bindingUpdates: 0,
        modelRetraining: 0,
      },
    };
  }

  private registerDefaultExecutors(): void {
    // Register default action executors
    this.registerExecutor("LOG_AND_MONITOR", async decision => {
      return { success: true };
    });

    this.registerExecutor("ESCALATE_TO_HUMAN", async decision => {
      // In real implementation, this would send notifications
      return { success: true, result: { notificationSent: true } };
    });

    this.registerExecutor("TRIGGER_INVESTIGATION", async decision => {
      return { success: true, result: { investigationQueued: true } };
    });

    // Add more default executors as needed
  }

  // =========================================================================
  // LIFECYCLE MANAGEMENT
  // =========================================================================

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    // Run first cycle immediately
    this.runCycle().catch(err => {});

    // Schedule recurring cycles
    this.intervalId = setInterval(() => {
      this.runCycle().catch(err => {});
    }, this.config.cycleIntervalMs);
  }

  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  // =========================================================================
  // PROVIDERS
  // =========================================================================

  setMetricsProvider(provider: () => Promise<MetricData[]>): void {
    this.metricsProvider = provider;
  }

  setHistoryProvider(provider: (metricId: string) => Promise<MetricHistory | null>): void {
    this.historyProvider = provider;
  }

  registerExecutor(actionType: string, executor: ActionExecutor): void {
    this.actionExecutors.set(actionType, executor);
  }

  // =========================================================================
  // MAIN CYCLE
  // =========================================================================

  async runCycle(): Promise<LoopCycle> {
    const cycleId = `cycle-${randomUUID().substring(0, 8)}`;
    const cycleNumber = this.state.cycleNumber + 1;
    const startedAt = new Date();

    this.state.cycleId = cycleId;
    this.state.cycleNumber = cycleNumber;
    this.state.startedAt = startedAt;

    const cycle: LoopCycle = {
      id: cycleId,
      number: cycleNumber,
      startedAt,
      phases: {} as LoopCycle["phases"],
      summary: {
        totalDecisions: 0,
        executedActions: 0,
        successRate: 0,
        anomaliesHandled: 0,
      },
    };

    try {
      // Phase 1: MEASURE
      this.state.currentPhase = "measure";
      cycle.phases.measure = await this.phaseMeasure();

      // Phase 2: DECIDE
      this.state.currentPhase = "decide";
      cycle.phases.decide = await this.phaseDecide(
        cycle.phases.measure.output.metrics as MetricData[]
      );

      // Phase 3: ACT
      this.state.currentPhase = "act";
      cycle.phases.act = await this.phaseAct(
        cycle.phases.decide.output.decisions as DecisionResult[]
      );

      // Phase 4: OBSERVE
      this.state.currentPhase = "observe";
      cycle.phases.observe = await this.phaseObserve(
        cycle.phases.act.output.executedDecisions as Decision[]
      );

      // Phase 5: ADJUST
      this.state.currentPhase = "adjust";
      cycle.phases.adjust = await this.phaseAdjust(
        cycle.phases.observe.output as Record<string, unknown>
      );

      // Calculate summary
      cycle.completedAt = new Date();
      cycle.duration = cycle.completedAt.getTime() - startedAt.getTime();

      const decisions = cycle.phases.decide.output.decisions as DecisionResult[];
      const executedActions = cycle.phases.act.output.executedDecisions as Decision[];

      cycle.summary = {
        totalDecisions: decisions?.length || 0,
        executedActions: executedActions?.length || 0,
        successRate: this.calculateSuccessRate(cycle.phases.act.output),
        anomaliesHandled: (cycle.phases.decide.output.anomalies as unknown[])?.length || 0,
      };

      this.cycles.push(cycle);

      // Keep only last 100 cycles
      if (this.cycles.length > 100) {
        this.cycles.shift();
      }
    } catch (error) {
      // Record partial cycle
      cycle.completedAt = new Date();
      cycle.duration = cycle.completedAt.getTime() - startedAt.getTime();
      this.cycles.push(cycle);
    }

    return cycle;
  }

  // =========================================================================
  // PHASE: MEASURE
  // =========================================================================

  private async phaseMeasure(): Promise<PhaseResult> {
    const startedAt = new Date();
    const errors: string[] = [];
    let metrics: MetricData[] = [];

    try {
      if (this.metricsProvider) {
        metrics = await Promise.race([
          this.metricsProvider(),
          new Promise<MetricData[]>((_, reject) =>
            setTimeout(() => reject(new Error("Measure timeout")), this.config.measureTimeoutMs)
          ),
        ]);
      } else {
        // Default: empty metrics
      }

      this.state.metrics.collected = metrics.length;
    } catch (error) {
      errors.push(`Measure error: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    return {
      startedAt,
      completedAt: new Date(),
      duration: new Date().getTime() - startedAt.getTime(),
      success: errors.length === 0,
      output: { metrics, count: metrics.length },
      errors,
    };
  }

  // =========================================================================
  // PHASE: DECIDE
  // =========================================================================

  private async phaseDecide(metrics: MetricData[]): Promise<PhaseResult> {
    const startedAt = new Date();
    const errors: string[] = [];
    let decisions: DecisionResult[] = [];
    const anomalies: unknown[] = [];
    const conflicts: MetricConflict[] = [];

    try {
      // Process metrics through decision engine
      decisions = decisionEngine.processMetrics(metrics);

      // Calculate confidence for each decision
      for (const result of decisions) {
        if (this.historyProvider) {
          const history = await this.historyProvider(result.decision.signal.metricId);
          if (history) {
            const confidence = confidenceEngine.calculateConfidence(result.decision, history);
            result.decision.confidence = confidence.overall;
          }
        }
      }

      // Update state
      this.state.decisions.generated = decisions.length;
      this.state.decisions.autoExecuted = decisions.filter(d => d.shouldExecute).length;
      this.state.decisions.pendingApproval = decisions.filter(d => d.requiresApproval).length;
      this.state.decisions.escalated = decisions.filter(
        d => d.decision.category === "escalation_only"
      ).length;

      // Detect conflicts
      const detectedConflicts = this.detectConflicts(metrics);
      conflicts.push(...detectedConflicts);
      this.state.metrics.conflictsFound = conflicts.length;
    } catch (error) {
      errors.push(`Decide error: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    return {
      startedAt,
      completedAt: new Date(),
      duration: new Date().getTime() - startedAt.getTime(),
      success: errors.length === 0,
      output: { decisions, anomalies, conflicts },
      errors,
    };
  }

  private detectConflicts(metrics: MetricData[]): MetricConflict[] {
    const conflicts: MetricConflict[] = [];

    // Check for known conflict pairs
    const conflictPairs = [
      ["seo.seo_score", "revenue.total_revenue"],
      ["engagement.bounce_rate", "conversion.conversion_rate"],
      ["traffic.organic_sessions", "content.quality_score"],
    ];

    for (const [metric1, metric2] of conflictPairs) {
      const m1 = metrics.find(m => m.metricId === metric1);
      const m2 = metrics.find(m => m.metricId === metric2);

      if (m1 && m2 && m1.previousValue && m2.previousValue) {
        const m1Trend = m1.currentValue > m1.previousValue ? "up" : "down";
        const m2Trend = m2.currentValue > m2.previousValue ? "up" : "down";

        // Detect inverse correlation
        if (m1Trend !== m2Trend) {
          const m1Change = ((m1.currentValue - m1.previousValue) / m1.previousValue) * 100;
          const m2Change = ((m2.currentValue - m2.previousValue) / m2.previousValue) * 100;

          // Only flag if changes are significant (>10%)
          if (Math.abs(m1Change) > 10 && Math.abs(m2Change) > 10) {
            conflicts.push({
              id: `CONF-${Date.now()}-${randomUUID().substring(0, 4)}`,
              type: "inverse_correlation",
              severity: Math.abs(m1Change) > 20 || Math.abs(m2Change) > 20 ? "high" : "medium",
              metrics: [
                { id: metric1, trend: m1Trend, value: m1.currentValue, change: m1Change },
                { id: metric2, trend: m2Trend, value: m2.currentValue, change: m2Change },
              ],
              resolution: {
                decision: "pending_review",
                action: "ESCALATE_TO_HUMAN",
                rationale: `Detected inverse correlation between ${metric1} and ${metric2}`,
                decidedBy: "automated",
              },
              detectedAt: new Date(),
            });
          }
        }
      }
    }

    return conflicts;
  }

  // =========================================================================
  // PHASE: ACT
  // =========================================================================

  private async phaseAct(decisions: DecisionResult[]): Promise<PhaseResult> {
    const startedAt = new Date();
    const errors: string[] = [];
    const executedDecisions: Decision[] = [];
    let successful = 0;
    let failed = 0;

    try {
      // Execute auto-execute decisions
      const autoExecute = decisions.filter(d => d.shouldExecute);

      for (const result of autoExecute) {
        const executor = this.actionExecutors.get(result.decision.type);

        if (executor) {
          try {
            const execResult = await executor(result.decision);

            if (execResult.success) {
              result.decision.outcome = "success";
              result.decision.outcomeDetails = execResult.result as Record<string, unknown>;
              successful++;
            } else {
              result.decision.outcome = "failure";
              result.decision.outcomeDetails = { error: execResult.error };
              failed++;
            }

            result.decision.executedAt = new Date();
            result.decision.status = "executed";
            executedDecisions.push(result.decision);
          } catch (error) {
            result.decision.outcome = "failure";
            result.decision.outcomeDetails = {
              error: error instanceof Error ? error.message : "Unknown",
            };
            failed++;
            errors.push(`Execution error for ${result.decision.type}: ${error}`);
          }
        } else {
          // No executor registered - mark as pending
        }
      }

      this.state.actions.executed = executedDecisions.length;
      this.state.actions.successful = successful;
      this.state.actions.failed = failed;
    } catch (error) {
      errors.push(`Act error: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    return {
      startedAt,
      completedAt: new Date(),
      duration: new Date().getTime() - startedAt.getTime(),
      success: errors.length === 0,
      output: { executedDecisions, successful, failed },
      errors,
    };
  }

  // =========================================================================
  // PHASE: OBSERVE
  // =========================================================================

  private async phaseObserve(executedDecisions: Decision[]): Promise<PhaseResult> {
    const startedAt = new Date();
    const errors: string[] = [];
    let improvements = 0;
    let regressions = 0;

    try {
      // Record outcomes for confidence tracking
      for (const decision of executedDecisions) {
        if (decision.outcome) {
          confidenceEngine.recordOutcome({
            decisionId: decision.id,
            bindingId: decision.bindingId,
            decisionType: decision.type,
            outcome: decision.outcome,
            timestamp: new Date(),
            confidenceAtDecision: decision.confidence,
          });

          if (decision.outcome === "success") {
            improvements++;
          } else if (decision.outcome === "failure") {
            regressions++;
          }
        }
      }

      this.state.observations.outcomes = executedDecisions.length;
      this.state.observations.improvements = improvements;
      this.state.observations.regressions = regressions;
    } catch (error) {
      errors.push(`Observe error: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    return {
      startedAt,
      completedAt: new Date(),
      duration: new Date().getTime() - startedAt.getTime(),
      success: errors.length === 0,
      output: { outcomes: executedDecisions.length, improvements, regressions },
      errors,
    };
  }

  // =========================================================================
  // PHASE: ADJUST
  // =========================================================================

  private async phaseAdjust(observations: Record<string, unknown>): Promise<PhaseResult> {
    const startedAt = new Date();
    const errors: string[] = [];
    let thresholdChanges = 0;
    let bindingUpdates = 0;

    try {
      if (!this.config.enableAutoAdjust) {
        return {
          startedAt,
          completedAt: new Date(),
          duration: 0,
          success: true,
          output: { autoAdjustDisabled: true },
          errors: [],
        };
      }

      // Get confidence statistics
      const stats = confidenceEngine.getStatistics();

      // If success rate is too low, consider raising confidence threshold
      if (stats.successRate < 60 && stats.totalOutcomes > 10) {
        // Would adjust thresholds here

        thresholdChanges++;
      }

      // If success rate is very high, could lower threshold
      if (stats.successRate > 90 && stats.totalOutcomes > 20) {
      }

      // Check for consistently failing bindings
      // In a real implementation, this would disable or adjust specific bindings

      this.state.adjustments.thresholdChanges = thresholdChanges;
      this.state.adjustments.bindingUpdates = bindingUpdates;
    } catch (error) {
      errors.push(`Adjust error: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    return {
      startedAt,
      completedAt: new Date(),
      duration: new Date().getTime() - startedAt.getTime(),
      success: errors.length === 0,
      output: { thresholdChanges, bindingUpdates },
      errors,
    };
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================

  private calculateSuccessRate(actOutput: Record<string, unknown>): number {
    const successful = (actOutput.successful as number) || 0;
    const failed = (actOutput.failed as number) || 0;
    const total = successful + failed;

    if (total === 0) return 100;
    return Math.round((successful / total) * 100);
  }

  // =========================================================================
  // STATE & STATISTICS
  // =========================================================================

  getState(): LoopState {
    return { ...this.state };
  }

  getCycles(limit = 10): LoopCycle[] {
    return this.cycles.slice(-limit);
  }

  getLastCycle(): LoopCycle | null {
    return this.cycles[this.cycles.length - 1] || null;
  }

  getStatistics(): {
    totalCycles: number;
    averageCycleDuration: number;
    totalDecisions: number;
    totalActions: number;
    overallSuccessRate: number;
    isRunning: boolean;
    currentPhase: LoopPhase;
  } {
    const completedCycles = this.cycles.filter(c => c.duration);

    const avgDuration =
      completedCycles.length > 0
        ? completedCycles.reduce((sum, c) => sum + (c.duration || 0), 0) / completedCycles.length
        : 0;

    const totalDecisions = completedCycles.reduce((sum, c) => sum + c.summary.totalDecisions, 0);
    const totalActions = completedCycles.reduce((sum, c) => sum + c.summary.executedActions, 0);

    const successRates = completedCycles.map(c => c.summary.successRate).filter(r => r > 0);
    const overallSuccess =
      successRates.length > 0 ? successRates.reduce((a, b) => a + b, 0) / successRates.length : 0;

    return {
      totalCycles: this.cycles.length,
      averageCycleDuration: Math.round(avgDuration),
      totalDecisions,
      totalActions,
      overallSuccessRate: Math.round(overallSuccess),
      isRunning: this.running,
      currentPhase: this.state.currentPhase,
    };
  }
}

// Singleton instance
export const autonomousLoop = new AutonomousLoop();
