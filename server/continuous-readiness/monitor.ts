/**
 * Continuous Readiness Monitor - Core Monitor Logic
 */

import { createLogger } from '../lib/logger';
import { READINESS_CONFIG, isContinuousReadinessEnabled } from './config';
import type {
  ReadinessState, ReadinessCheck, ReadinessSnapshot,
  DegradationEvent, MTTRStats, ReadinessEvent, MonitorStatus,
} from './types';

const logger = createLogger('continuous-readiness');

// Storage
let currentState: ReadinessState = 'UNKNOWN';
let lastSnapshot: ReadinessSnapshot | null = null;
let monitorInterval: NodeJS.Timeout | null = null;
const snapshotHistory: ReadinessSnapshot[] = [];
const degradations: DegradationEvent[] = [];
const events: ReadinessEvent[] = [];
const mttrSamples: number[] = [];

// Event listeners
type EventListener = (event: ReadinessEvent) => void;
const listeners: EventListener[] = [];

// ============================================================================
// Check Execution
// ============================================================================

async function runChecks(): Promise<ReadinessCheck[]> {
  const checks: ReadinessCheck[] = [];
  const now = new Date();

  // Check 1: Platform Readiness
  try {
    const start = Date.now();
    const rm = await import('../platform-readiness');
    if (rm.isPlatformReadinessEnabled()) {
      const result = await rm.evaluateReadiness();
      checks.push({
        id: 'platform_readiness',
        name: 'Platform Readiness',
        category: 'platform',
        status: result.status === 'READY' ? 'pass' : result.status === 'WARNING' ? 'warn' : 'fail',
        score: result.score,
        message: `Score: ${result.score}, Blockers: ${result.blockers.length}`,
        checkedAt: now,
        durationMs: Date.now() - start,
      });
    } else {
      checks.push({
        id: 'platform_readiness',
        name: 'Platform Readiness',
        category: 'platform',
        status: 'skip',
        score: 100,
        message: 'Platform readiness not enabled',
        checkedAt: now,
        durationMs: 0,
      });
    }
  } catch {
    checks.push({
      id: 'platform_readiness',
      name: 'Platform Readiness',
      category: 'platform',
      status: 'skip',
      score: 100,
      message: 'Platform readiness not available',
      checkedAt: now,
      durationMs: 0,
    });
  }

  // Check 2: Platform Governor
  try {
    const start = Date.now();
    const gm = await import('../platform-governor');
    if (gm.isPlatformGovernorEnabled()) {
      const restrictions = gm.getActiveRestrictions();
      const hasBlocking = restrictions.some(r => r.decision === 'BLOCK');
      checks.push({
        id: 'platform_governor',
        name: 'Platform Governor',
        category: 'governance',
        status: hasBlocking ? 'fail' : restrictions.length > 0 ? 'warn' : 'pass',
        score: hasBlocking ? 0 : restrictions.length > 0 ? 70 : 100,
        message: `Active restrictions: ${restrictions.length}`,
        checkedAt: now,
        durationMs: Date.now() - start,
      });
    } else {
      checks.push({
        id: 'platform_governor',
        name: 'Platform Governor',
        category: 'governance',
        status: 'skip',
        score: 100,
        message: 'Platform governor not enabled',
        checkedAt: now,
        durationMs: 0,
      });
    }
  } catch {
    checks.push({
      id: 'platform_governor',
      name: 'Platform Governor',
      category: 'governance',
      status: 'skip',
      score: 100,
      message: 'Platform governor not available',
      checkedAt: now,
      durationMs: 0,
    });
  }

  // Check 3: Incidents
  try {
    const start = Date.now();
    const im = await import('../incidents');
    if (im.isIncidentsEnabled()) {
      const summary = im.getSummary();
      const hasCritical = summary.bySeverity.critical > 0;
      checks.push({
        id: 'incidents',
        name: 'Incident Status',
        category: 'ops',
        status: hasCritical ? 'fail' : summary.open > 0 ? 'warn' : 'pass',
        score: hasCritical ? 0 : summary.open > 0 ? 70 : 100,
        message: `Open: ${summary.open}, Critical: ${summary.bySeverity.critical}`,
        checkedAt: now,
        durationMs: Date.now() - start,
      });
    } else {
      checks.push({
        id: 'incidents',
        name: 'Incident Status',
        category: 'ops',
        status: 'skip',
        score: 100,
        message: 'Incidents not enabled',
        checkedAt: now,
        durationMs: 0,
      });
    }
  } catch {
    checks.push({
      id: 'incidents',
      name: 'Incident Status',
      category: 'ops',
      status: 'skip',
      score: 100,
      message: 'Incidents not available',
      checkedAt: now,
      durationMs: 0,
    });
  }

  // Check 4: Memory
  const memUsage = process.memoryUsage();
  const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  checks.push({
    id: 'memory',
    name: 'Memory Usage',
    category: 'infra',
    status: memPercent > 90 ? 'fail' : memPercent > 75 ? 'warn' : 'pass',
    score: Math.max(0, 100 - memPercent),
    message: `Heap usage: ${memPercent}%`,
    checkedAt: now,
    durationMs: 0,
  });

  return checks;
}

// ============================================================================
// State Calculation
// ============================================================================

function calculateState(checks: ReadinessCheck[]): { state: ReadinessState; score: number } {
  const activeChecks = checks.filter(c => c.status !== 'skip');
  if (activeChecks.length === 0) {
    return { state: 'UNKNOWN', score: 100 };
  }

  const hasFailed = activeChecks.some(c => c.status === 'fail');
  const hasWarning = activeChecks.some(c => c.status === 'warn');
  const avgScore = Math.round(activeChecks.reduce((sum, c) => sum + c.score, 0) / activeChecks.length);

  if (hasFailed || avgScore < READINESS_CONFIG.degradationThreshold) {
    return { state: 'NOT_READY', score: avgScore };
  }
  if (hasWarning || avgScore < READINESS_CONFIG.recoveryThreshold) {
    return { state: 'DEGRADED', score: avgScore };
  }
  return { state: 'READY', score: avgScore };
}

function calculateMTTR(): MTTRStats {
  const now = new Date();
  const windowStart = now.getTime() - READINESS_CONFIG.mttrWindowMs;
  const recentSamples = mttrSamples.filter((_, i) => {
    const deg = degradations[i];
    return deg && deg.resolvedAt && deg.resolvedAt.getTime() > windowStart;
  });

  if (recentSamples.length === 0) {
    return {
      current: null,
      average: 0,
      p50: 0,
      p95: 0,
      sampleCount: 0,
      lastCalculatedAt: now,
    };
  }

  const sorted = [...recentSamples].sort((a, b) => a - b);
  const average = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] || 0;

  const activeDeg = degradations.find(d => !d.resolvedAt);
  const current = activeDeg ? Date.now() - activeDeg.detectedAt.getTime() : null;

  return {
    current,
    average,
    p50,
    p95,
    sampleCount: sorted.length,
    lastCalculatedAt: now,
  };
}

// ============================================================================
// Event Emission
// ============================================================================

function emit(event: ReadinessEvent): void {
  events.unshift(event);
  if (events.length > READINESS_CONFIG.maxHistory) {
    events.pop();
  }
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch (err) {
      logger.error({ err }, 'Event listener error');
    }
  });
}

export function subscribe(listener: EventListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

// ============================================================================
// Monitor Execution
// ============================================================================

async function runMonitorCycle(): Promise<ReadinessSnapshot> {
  const start = Date.now();
  const checks = await runChecks();
  const { state, score } = calculateState(checks);
  const previousState = currentState;

  // Detect state changes
  if (previousState !== state && previousState !== 'UNKNOWN') {
    const isRecovery = (previousState === 'NOT_READY' || previousState === 'DEGRADED') && state === 'READY';
    const isDegradation = previousState === 'READY' && (state === 'DEGRADED' || state === 'NOT_READY');

    if (isDegradation) {
      const deg: DegradationEvent = {
        id: `deg_${Date.now()}`,
        source: 'monitor',
        previousState,
        newState: state,
        detectedAt: new Date(),
        description: `System degraded from ${previousState} to ${state}`,
      };
      degradations.unshift(deg);
      emit({
        id: `evt_${Date.now()}`,
        type: 'degradation_detected',
        timestamp: new Date(),
        data: { degradation: deg },
      });
      logger.warn({ from: previousState, to: state }, 'Degradation detected');
    }

    if (isRecovery) {
      const activeDeg = degradations.find(d => !d.resolvedAt);
      if (activeDeg) {
        activeDeg.resolvedAt = new Date();
        activeDeg.durationMs = activeDeg.resolvedAt.getTime() - activeDeg.detectedAt.getTime();
        mttrSamples.push(activeDeg.durationMs);
        emit({
          id: `evt_${Date.now()}`,
          type: 'recovery_detected',
          timestamp: new Date(),
          data: { degradation: activeDeg, mttr: activeDeg.durationMs },
        });
        logger.info({ durationMs: activeDeg.durationMs }, 'Recovery detected');
      }
    }

    emit({
      id: `evt_${Date.now()}`,
      type: 'state_change',
      timestamp: new Date(),
      data: { from: previousState, to: state, score },
    });
  }

  currentState = state;

  const snapshot: ReadinessSnapshot = {
    id: `snap_${Date.now()}`,
    timestamp: new Date(),
    state,
    overallScore: score,
    checks,
    degradations: degradations.filter(d => !d.resolvedAt),
    mttr: calculateMTTR(),
  };

  lastSnapshot = snapshot;
  snapshotHistory.unshift(snapshot);
  if (snapshotHistory.length > READINESS_CONFIG.maxHistory) {
    snapshotHistory.pop();
  }

  logger.debug({ state, score, durationMs: Date.now() - start }, 'Monitor cycle completed');
  return snapshot;
}

// ============================================================================
// Public API
// ============================================================================

export async function checkNow(): Promise<ReadinessSnapshot> {
  return runMonitorCycle();
}

export function startMonitor(): void {
  if (!isContinuousReadinessEnabled()) {
    throw new Error('Continuous readiness is not enabled');
  }
  if (monitorInterval) {
    return; // Already running
  }
  monitorInterval = setInterval(() => {
    runMonitorCycle().catch(err => {
      logger.error({ err }, 'Monitor cycle failed');
    });
  }, READINESS_CONFIG.intervalMs);
  logger.info({ intervalMs: READINESS_CONFIG.intervalMs }, 'Monitor started');
}

export function stopMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info('Monitor stopped');
  }
}

export function getMonitorStatus(): MonitorStatus {
  return {
    enabled: isContinuousReadinessEnabled(),
    running: monitorInterval !== null,
    lastCheckAt: lastSnapshot?.timestamp,
    nextCheckAt: monitorInterval && lastSnapshot
      ? new Date(lastSnapshot.timestamp.getTime() + READINESS_CONFIG.intervalMs)
      : undefined,
    currentState,
    checksCount: lastSnapshot?.checks.length || 0,
    degradationsActive: degradations.filter(d => !d.resolvedAt).length,
  };
}

export function getCurrentState(): ReadinessState {
  return currentState;
}

export function getLastSnapshot(): ReadinessSnapshot | null {
  return lastSnapshot;
}

export function getSnapshotHistory(limit = 50): ReadinessSnapshot[] {
  return snapshotHistory.slice(0, limit);
}

export function getActiveDegradations(): DegradationEvent[] {
  return degradations.filter(d => !d.resolvedAt);
}

export function getAllDegradations(limit = 100): DegradationEvent[] {
  return degradations.slice(0, limit);
}

export function getMTTRStats(): MTTRStats {
  return calculateMTTR();
}

export function getEvents(limit = 100): ReadinessEvent[] {
  return events.slice(0, limit);
}

export function clearAll(): void {
  currentState = 'UNKNOWN';
  lastSnapshot = null;
  snapshotHistory.length = 0;
  degradations.length = 0;
  events.length = 0;
  mttrSamples.length = 0;
}
