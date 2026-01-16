/**
 * System Health Monitor
 * Monitors the health of the Data Decision System
 */

import type {
  SystemHealthStatus,
  ComponentHealth,
  SystemAlert,
  CircuitBreaker,
  CircuitBreakerState,
} from '../types';
import { decisionEngine } from '../engine';
import { autonomousLoop } from '../loop';
import { confidenceEngine } from '../confidence';

// =============================================================================
// CONFIGURATION
// =============================================================================

interface HealthConfig {
  checkIntervalMs: number;
  componentTimeoutMs: number;
  errorRateThreshold: number;
  latencyThresholdMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;
}

const DEFAULT_HEALTH_CONFIG: HealthConfig = {
  checkIntervalMs: 60000, // 1 minute
  componentTimeoutMs: 5000,
  errorRateThreshold: 5, // 5%
  latencyThresholdMs: 5000,
  circuitBreakerThreshold: 5, // 5 failures
  circuitBreakerCooldownMs: 300000, // 5 minutes
};

// =============================================================================
// SYSTEM HEALTH MONITOR
// =============================================================================

export class SystemHealthMonitor {
  private config: HealthConfig;
  private alerts: SystemAlert[] = [];
  private componentStatus: Map<string, ComponentHealth> = new Map();
  private circuitBreaker: CircuitBreaker;
  private lastCheck: Date = new Date();
  private startTime: Date = new Date();
  private intervalId?: NodeJS.Timeout;
  private errorCounts: Map<string, number[]> = new Map();

  constructor(config: Partial<HealthConfig> = {}) {
    this.config = { ...DEFAULT_HEALTH_CONFIG, ...config };
    this.circuitBreaker = this.createInitialCircuitBreaker();
    this.initializeComponents();
  }

  // =========================================================================
  // INITIALIZATION
  // =========================================================================

  private createInitialCircuitBreaker(): CircuitBreaker {
    return {
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      autoRecovery: true,
    };
  }

  private initializeComponents(): void {
    const components = [
      'metricsCollection',
      'decisionEngine',
      'actionExecution',
      'dataFreshness',
      'circuitBreaker',
    ];

    for (const component of components) {
      this.componentStatus.set(component, {
        status: 'unknown',
        lastCheck: new Date(),
      });
    }
  }

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

  start(): void {
    this.intervalId = setInterval(() => {
      this.performHealthCheck().catch(console.error);
    }, this.config.checkIntervalMs);

    console.log('[Health] System health monitor started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('[Health] System health monitor stopped');
  }

  // =========================================================================
  // HEALTH CHECKS
  // =========================================================================

  async performHealthCheck(): Promise<SystemHealthStatus> {
    const timestamp = new Date();
    this.lastCheck = timestamp;

    // Check each component
    await Promise.all([
      this.checkMetricsCollection(),
      this.checkDecisionEngine(),
      this.checkActionExecution(),
      this.checkDataFreshness(),
      this.checkCircuitBreaker(),
    ]);

    // Determine overall health
    const overall = this.calculateOverallHealth();

    // Get loop statistics
    const loopStats = autonomousLoop.getStatistics();

    return {
      overall,
      timestamp,
      components: {
        metricsCollection: this.componentStatus.get('metricsCollection')!,
        decisionEngine: this.componentStatus.get('decisionEngine')!,
        actionExecution: this.componentStatus.get('actionExecution')!,
        dataFreshness: this.componentStatus.get('dataFreshness')!,
        circuitBreaker: this.componentStatus.get('circuitBreaker')!,
      },
      alerts: this.alerts.filter(a => !a.acknowledged).slice(-20),
      uptime: Date.now() - this.startTime.getTime(),
      lastCycleAt: autonomousLoop.getLastCycle()?.completedAt || this.startTime,
      cyclesLast24h: loopStats.totalCycles,
    };
  }

  private async checkMetricsCollection(): Promise<void> {
    const startTime = Date.now();

    try {
      // Check if we're receiving metrics
      const loopState = autonomousLoop.getState();
      const metricsCollected = loopState.metrics.collected;

      const status: ComponentHealth = {
        status: metricsCollected > 0 ? 'healthy' : 'degraded',
        lastCheck: new Date(),
        latency: Date.now() - startTime,
        details: `${metricsCollected} metrics collected in last cycle`,
      };

      this.componentStatus.set('metricsCollection', status);
    } catch (error) {
      this.recordComponentFailure('metricsCollection', error);
    }
  }

  private async checkDecisionEngine(): Promise<void> {
    const startTime = Date.now();

    try {
      const stats = decisionEngine.getStatistics();

      const status: ComponentHealth = {
        status: stats.circuitBreakerOpen ? 'critical' : 'healthy',
        lastCheck: new Date(),
        latency: Date.now() - startTime,
        details: `${stats.pending} pending, ${stats.executed} executed, mode: ${stats.autopilotMode}`,
      };

      this.componentStatus.set('decisionEngine', status);

      if (stats.circuitBreakerOpen) {
        this.addAlert({
          severity: 'critical',
          component: 'decisionEngine',
          message: 'Decision engine circuit breaker is open',
        });
      }
    } catch (error) {
      this.recordComponentFailure('decisionEngine', error);
    }
  }

  private async checkActionExecution(): Promise<void> {
    const startTime = Date.now();

    try {
      const loopState = autonomousLoop.getState();
      const { executed, successful, failed } = loopState.actions;

      const errorRate = executed > 0 ? (failed / executed) * 100 : 0;

      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (errorRate > this.config.errorRateThreshold * 2) {
        status = 'critical';
      } else if (errorRate > this.config.errorRateThreshold) {
        status = 'degraded';
      }

      const componentHealth: ComponentHealth = {
        status,
        lastCheck: new Date(),
        latency: Date.now() - startTime,
        errorRate,
        details: `${successful} successful, ${failed} failed (${errorRate.toFixed(1)}% error rate)`,
      };

      this.componentStatus.set('actionExecution', componentHealth);

      if (status === 'critical') {
        this.addAlert({
          severity: 'critical',
          component: 'actionExecution',
          message: `High action failure rate: ${errorRate.toFixed(1)}%`,
        });
      }
    } catch (error) {
      this.recordComponentFailure('actionExecution', error);
    }
  }

  private async checkDataFreshness(): Promise<void> {
    const startTime = Date.now();

    try {
      // Check confidence engine statistics for data freshness info
      const stats = confidenceEngine.getStatistics();

      const status: ComponentHealth = {
        status: 'healthy', // Would check actual data freshness in real implementation
        lastCheck: new Date(),
        latency: Date.now() - startTime,
        details: `${stats.bindingsWithHistory} bindings with historical data`,
      };

      this.componentStatus.set('dataFreshness', status);
    } catch (error) {
      this.recordComponentFailure('dataFreshness', error);
    }
  }

  private async checkCircuitBreaker(): Promise<void> {
    const startTime = Date.now();

    try {
      let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

      if (this.circuitBreaker.state === 'open') {
        status = 'critical';
      } else if (this.circuitBreaker.state === 'half_open') {
        status = 'degraded';
      }

      const componentHealth: ComponentHealth = {
        status,
        lastCheck: new Date(),
        latency: Date.now() - startTime,
        details: `State: ${this.circuitBreaker.state}, failures: ${this.circuitBreaker.failureCount}`,
      };

      this.componentStatus.set('circuitBreaker', componentHealth);
    } catch (error) {
      this.recordComponentFailure('circuitBreaker', error);
    }
  }

  // =========================================================================
  // OVERALL HEALTH CALCULATION
  // =========================================================================

  private calculateOverallHealth(): 'healthy' | 'degraded' | 'critical' {
    const statuses = Array.from(this.componentStatus.values()).map(c => c.status);

    if (statuses.some(s => s === 'critical')) {
      return 'critical';
    }

    if (statuses.some(s => s === 'degraded')) {
      return 'degraded';
    }

    if (statuses.every(s => s === 'healthy')) {
      return 'healthy';
    }

    return 'degraded'; // Default if any unknown
  }

  // =========================================================================
  // ERROR TRACKING
  // =========================================================================

  private recordComponentFailure(component: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Track error counts
    const errors = this.errorCounts.get(component) || [];
    errors.push(Date.now());
    this.errorCounts.set(component, errors.filter(t => t > Date.now() - 3600000)); // Last hour

    const componentHealth: ComponentHealth = {
      status: 'critical',
      lastCheck: new Date(),
      details: errorMessage,
    };

    this.componentStatus.set(component, componentHealth);

    this.addAlert({
      severity: 'critical',
      component,
      message: `Component failure: ${errorMessage}`,
    });

    // Check if we should open circuit breaker
    this.evaluateCircuitBreaker();
  }

  recordSuccess(component: string): void {
    this.circuitBreaker.successCount++;
    this.circuitBreaker.lastSuccessAt = new Date();

    // If in half-open state and we have successes, close the circuit
    if (this.circuitBreaker.state === 'half_open' && this.circuitBreaker.successCount >= 3) {
      this.closeCircuitBreaker();
    }
  }

  recordFailure(component: string): void {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureAt = new Date();

    this.evaluateCircuitBreaker();
  }

  // =========================================================================
  // CIRCUIT BREAKER
  // =========================================================================

  private evaluateCircuitBreaker(): void {
    // Count recent failures across all components
    let totalRecentFailures = 0;
    for (const errors of this.errorCounts.values()) {
      totalRecentFailures += errors.filter(t => t > Date.now() - 300000).length; // Last 5 min
    }

    if (totalRecentFailures >= this.config.circuitBreakerThreshold) {
      this.openCircuitBreaker('Too many failures across components');
    }
  }

  openCircuitBreaker(reason: string): void {
    if (this.circuitBreaker.state === 'open') return;

    this.circuitBreaker.state = 'open';
    this.circuitBreaker.openedAt = new Date();
    this.circuitBreaker.reason = reason;
    this.circuitBreaker.cooldownEndsAt = new Date(
      Date.now() + this.config.circuitBreakerCooldownMs
    );

    // Also open the decision engine's circuit breaker
    decisionEngine.openCircuitBreaker(reason);

    this.addAlert({
      severity: 'critical',
      component: 'circuitBreaker',
      message: `Circuit breaker opened: ${reason}`,
    });

    console.error(`[Health] Circuit breaker opened: ${reason}`);

    // Schedule auto-recovery check
    if (this.circuitBreaker.autoRecovery) {
      setTimeout(() => {
        this.tryHalfOpen();
      }, this.config.circuitBreakerCooldownMs);
    }
  }

  private tryHalfOpen(): void {
    if (this.circuitBreaker.state !== 'open') return;

    this.circuitBreaker.state = 'half_open';
    this.circuitBreaker.successCount = 0;

    console.log('[Health] Circuit breaker transitioning to half-open');
  }

  closeCircuitBreaker(): void {
    this.circuitBreaker.state = 'closed';
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.successCount = 0;
    this.circuitBreaker.openedAt = undefined;
    this.circuitBreaker.reason = undefined;
    this.circuitBreaker.cooldownEndsAt = undefined;

    decisionEngine.closeCircuitBreaker();

    console.log('[Health] Circuit breaker closed');
  }

  getCircuitBreakerState(): CircuitBreaker {
    return { ...this.circuitBreaker };
  }

  // =========================================================================
  // ALERTS
  // =========================================================================

  private addAlert(alert: Omit<SystemAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const newAlert: SystemAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ...alert,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(newAlert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      return true;
    }
    return false;
  }

  getAlerts(unacknowledgedOnly = false): SystemAlert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  // =========================================================================
  // STATUS GETTERS
  // =========================================================================

  getStatus(): SystemHealthStatus {
    return {
      overall: this.calculateOverallHealth(),
      timestamp: this.lastCheck,
      components: {
        metricsCollection: this.componentStatus.get('metricsCollection')!,
        decisionEngine: this.componentStatus.get('decisionEngine')!,
        actionExecution: this.componentStatus.get('actionExecution')!,
        dataFreshness: this.componentStatus.get('dataFreshness')!,
        circuitBreaker: this.componentStatus.get('circuitBreaker')!,
      },
      alerts: this.getAlerts(true).slice(-20),
      uptime: Date.now() - this.startTime.getTime(),
      lastCycleAt: autonomousLoop.getLastCycle()?.completedAt || this.startTime,
      cyclesLast24h: autonomousLoop.getStatistics().totalCycles,
    };
  }

  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }
}

// Singleton instance
export const systemHealthMonitor = new SystemHealthMonitor();
