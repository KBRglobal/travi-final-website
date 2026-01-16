/**
 * PCAL Phase 3: Platform Memory
 *
 * Living operational memory that:
 * - Groups repeated failures into patterns
 * - Detects "we keep making the same mistake"
 * - Links incidents ↔ decisions ↔ outcomes
 * - Tracks MTTR trends by subsystem
 * - Surfaces silent regressions
 */

import { createLogger } from '../lib/logger';
import { PCAL_CONFIG, isPCALEnabled } from './config';
import { getRecentDecisions, getDecisionsByOutcome } from './decision-stream';
import type {
  FailurePattern,
  IncidentDecisionLink,
  SubsystemHealth,
  SilentRegression,
  PlatformMemorySnapshot,
  RepeatedMistake,
  DecisionRecord,
} from './types';

const logger = createLogger('pcal-platform-memory');

// Safe import helper for optional modules
async function safeImport<T>(path: string): Promise<T | null> {
  try {
    return await import(/* @vite-ignore */ path) as T;
  } catch {
    return null;
  }
}

// Memory storage
const patterns: FailurePattern[] = [];
const incidentLinks: IncidentDecisionLink[] = [];
const subsystemHealthCache = new Map<string, SubsystemHealth>();
const silentRegressions: SilentRegression[] = [];
const repeatedMistakes: RepeatedMistake[] = [];
const mttrHistory = new Map<string, number[]>();

// ============================================================================
// Pattern Detection
// ============================================================================

interface PatternCandidate {
  signature: string;
  decisions: DecisionRecord[];
  systems: Set<string>;
}

function computePatternSignature(decision: DecisionRecord): string {
  // Signature based on source + scope + outcome
  return `${decision.source}:${decision.scope}:${decision.outcome}`;
}

export function detectPatterns(): FailurePattern[] {
  if (!isPCALEnabled()) return [];

  const now = Date.now();
  const windowStart = now - PCAL_CONFIG.patternWindowMs;

  // Get recent failure decisions
  const failures = getDecisionsByOutcome('blocked', 500)
    .concat(getDecisionsByOutcome('denied', 500))
    .concat(getDecisionsByOutcome('escalated', 500))
    .filter(d => d.timestamp.getTime() > windowStart);

  // Group by signature
  const candidates = new Map<string, PatternCandidate>();

  for (const decision of failures) {
    const sig = computePatternSignature(decision);
    if (!candidates.has(sig)) {
      candidates.set(sig, { signature: sig, decisions: [], systems: new Set() });
    }
    const candidate = candidates.get(sig)!;
    candidate.decisions.push(decision);
    candidate.systems.add(decision.source);
  }

  // Convert to patterns (threshold filter)
  const newPatterns: FailurePattern[] = [];

  for (const [sig, candidate] of candidates) {
    if (candidate.decisions.length >= PCAL_CONFIG.patternThreshold) {
      const existing = patterns.find(p => p.id === sig);
      const sorted = candidate.decisions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (existing) {
        existing.occurrences = candidate.decisions.length;
        existing.lastSeen = sorted[sorted.length - 1].timestamp;
        existing.linkedDecisions = candidate.decisions.map(d => d.id);
        existing.trend = calculateTrend(existing);
      } else {
        const pattern: FailurePattern = {
          id: sig,
          name: `${candidate.decisions[0].source} ${candidate.decisions[0].outcome} pattern`,
          description: `Repeated ${candidate.decisions[0].outcome} from ${candidate.decisions[0].source}`,
          occurrences: candidate.decisions.length,
          firstSeen: sorted[0].timestamp,
          lastSeen: sorted[sorted.length - 1].timestamp,
          affectedSystems: Array.from(candidate.systems),
          linkedDecisions: candidate.decisions.map(d => d.id),
          linkedIncidents: [],
          severity: candidate.decisions.length > 10 ? 'high' : candidate.decisions.length > 5 ? 'medium' : 'low',
          trend: 'stable',
        };
        patterns.push(pattern);
        newPatterns.push(pattern);
      }
    }
  }

  // Limit stored patterns
  while (patterns.length > 100) {
    patterns.shift();
  }

  if (newPatterns.length > 0) {
    logger.info({ count: newPatterns.length }, 'New failure patterns detected');
  }

  return newPatterns;
}

function calculateTrend(pattern: FailurePattern): 'improving' | 'stable' | 'worsening' {
  const timeSinceFirst = Date.now() - pattern.firstSeen.getTime();
  const timeSinceLast = Date.now() - pattern.lastSeen.getTime();
  const ratePerDay = pattern.occurrences / (timeSinceFirst / 86400000);

  if (timeSinceLast > 86400000 && ratePerDay < 0.5) return 'improving';
  if (ratePerDay > 2) return 'worsening';
  return 'stable';
}

export function getPatterns(limit = 20): FailurePattern[] {
  return patterns.slice(-limit);
}

export function getPatternById(id: string): FailurePattern | null {
  return patterns.find(p => p.id === id) || null;
}

// ============================================================================
// Incident-Decision Linking
// ============================================================================

export function linkIncidentToDecision(
  incidentId: string,
  decisionId: string,
  linkType: 'caused_by' | 'followed' | 'related' | 'resolved_by',
  confidence: number
): IncidentDecisionLink {
  const link: IncidentDecisionLink = {
    incidentId,
    decisionId,
    linkType,
    confidence,
    detectedAt: new Date(),
  };

  incidentLinks.push(link);

  // Limit storage
  if (incidentLinks.length > 1000) {
    incidentLinks.shift();
  }

  // Update patterns with incident links
  for (const pattern of patterns) {
    if (pattern.linkedDecisions.includes(decisionId)) {
      if (!pattern.linkedIncidents.includes(incidentId)) {
        pattern.linkedIncidents.push(incidentId);
      }
    }
  }

  logger.debug({ incidentId, decisionId, linkType }, 'Incident-decision link created');
  return link;
}

export async function autoLinkIncidents(): Promise<IncidentDecisionLink[]> {
  const newLinks: IncidentDecisionLink[] = [];

  try {
    const incidents = await safeImport<{
      isIncidentsEnabled?: () => boolean;
      getAllIncidents?: (limit: number) => Array<{ id: string; createdAt?: Date }>;
    }>('../incidents');
    if (!incidents?.isIncidentsEnabled?.()) return newLinks;

    const recentIncidents = incidents.getAllIncidents?.(50) || [];
    const recentDecisions = getRecentDecisions(100);

    for (const incident of recentIncidents) {
      const incidentTime = incident.createdAt || new Date();

      // Find decisions within correlation window
      const correlatedDecisions = recentDecisions.filter(d => {
        const timeDiff = Math.abs(d.timestamp.getTime() - incidentTime.getTime());
        return timeDiff < PCAL_CONFIG.incidentCorrelationWindowMs;
      });

      for (const decision of correlatedDecisions) {
        // Check if link already exists
        const exists = incidentLinks.some(
          l => l.incidentId === incident.id && l.decisionId === decision.id
        );

        if (!exists && decision.outcome !== 'approved') {
          const link = linkIncidentToDecision(
            incident.id,
            decision.id,
            decision.timestamp < incidentTime ? 'caused_by' : 'followed',
            70
          );
          newLinks.push(link);
        }
      }
    }
  } catch {
    // Incidents not available
  }

  return newLinks;
}

export function getLinksForIncident(incidentId: string): IncidentDecisionLink[] {
  return incidentLinks.filter(l => l.incidentId === incidentId);
}

export function getLinksForDecision(decisionId: string): IncidentDecisionLink[] {
  return incidentLinks.filter(l => l.decisionId === decisionId);
}

// ============================================================================
// MTTR Tracking
// ============================================================================

export function recordMTTR(subsystem: string, mttrMs: number): void {
  if (!mttrHistory.has(subsystem)) {
    mttrHistory.set(subsystem, []);
  }

  const history = mttrHistory.get(subsystem)!;
  history.push(mttrMs);

  // Keep last 100 samples per subsystem
  if (history.length > 100) {
    history.shift();
  }

  updateSubsystemHealth(subsystem);
}

function updateSubsystemHealth(subsystem: string): void {
  const history = mttrHistory.get(subsystem) || [];
  if (history.length === 0) return;

  const avgMttr = history.reduce((a, b) => a + b, 0) / history.length;
  const recentMttr = history.slice(-10);
  const recentAvg = recentMttr.reduce((a, b) => a + b, 0) / recentMttr.length;

  const trend: 'improving' | 'stable' | 'worsening' =
    recentAvg < avgMttr * 0.8 ? 'improving' :
    recentAvg > avgMttr * 1.2 ? 'worsening' : 'stable';

  subsystemHealthCache.set(subsystem, {
    subsystem,
    mttrMs: Math.round(recentAvg),
    mttrTrend: trend,
    failureRate: calculateFailureRate(subsystem),
    lastIncident: undefined,
    silentRegressions: silentRegressions.filter(r => r.subsystem === subsystem),
  });
}

function calculateFailureRate(subsystem: string): number {
  const recentDecisions = getRecentDecisions(200);
  const subsystemDecisions = recentDecisions.filter(d => d.source === subsystem || d.scopeId === subsystem);
  const failures = subsystemDecisions.filter(d => d.outcome === 'blocked' || d.outcome === 'denied');
  return subsystemDecisions.length > 0 ? failures.length / subsystemDecisions.length : 0;
}

export function getSubsystemHealth(subsystem: string): SubsystemHealth | null {
  return subsystemHealthCache.get(subsystem) || null;
}

export function getAllSubsystemHealth(): SubsystemHealth[] {
  return Array.from(subsystemHealthCache.values());
}

// ============================================================================
// Silent Regression Detection
// ============================================================================

interface MetricSample {
  value: number;
  timestamp: Date;
}

const metricHistory = new Map<string, MetricSample[]>();

export function recordMetric(subsystem: string, metric: string, value: number): void {
  const key = `${subsystem}:${metric}`;

  if (!metricHistory.has(key)) {
    metricHistory.set(key, []);
  }

  const samples = metricHistory.get(key)!;
  samples.push({ value, timestamp: new Date() });

  // Keep last 1000 samples
  if (samples.length > 1000) {
    samples.shift();
  }

  // Check for regression
  checkForRegression(subsystem, metric, samples);
}

function checkForRegression(subsystem: string, metric: string, samples: MetricSample[]): void {
  if (samples.length < 20) return;

  const recent = samples.slice(-10);
  const baseline = samples.slice(-50, -10);

  if (baseline.length < 10) return;

  const recentAvg = recent.reduce((sum, s) => sum + s.value, 0) / recent.length;
  const baselineAvg = baseline.reduce((sum, s) => sum + s.value, 0) / baseline.length;

  if (baselineAvg === 0) return;

  const degradationPercent = ((recentAvg - baselineAvg) / baselineAvg) * 100;

  // Only track degradations (positive means worse for most metrics)
  if (Math.abs(degradationPercent) >= PCAL_CONFIG.regressionThresholdPercent) {
    const existingIdx = silentRegressions.findIndex(
      r => r.subsystem === subsystem && r.metric === metric
    );

    const regression: SilentRegression = {
      id: `reg_${subsystem}_${metric}`,
      subsystem,
      metric,
      previousValue: baselineAvg,
      currentValue: recentAvg,
      degradationPercent: Math.round(degradationPercent * 100) / 100,
      detectedAt: new Date(),
      description: `${metric} changed by ${Math.abs(degradationPercent).toFixed(1)}% in ${subsystem}`,
    };

    if (existingIdx >= 0) {
      silentRegressions[existingIdx] = regression;
    } else {
      silentRegressions.push(regression);
      logger.warn({ subsystem, metric, degradationPercent }, 'Silent regression detected');
    }

    // Limit regressions
    if (silentRegressions.length > 50) {
      silentRegressions.shift();
    }
  }
}

export function getSilentRegressions(): SilentRegression[] {
  return [...silentRegressions];
}

// ============================================================================
// Repeated Mistakes
// ============================================================================

export function detectRepeatedMistakes(): RepeatedMistake[] {
  const detected: RepeatedMistake[] = [];

  // Find patterns that have both decisions and incidents linked
  for (const pattern of patterns) {
    if (pattern.linkedIncidents.length > 0 && pattern.occurrences >= 3) {
      const existing = repeatedMistakes.find(m => m.id === `mistake_${pattern.id}`);

      const mistake: RepeatedMistake = {
        id: `mistake_${pattern.id}`,
        description: `${pattern.name} - occurred ${pattern.occurrences} times, caused ${pattern.linkedIncidents.length} incidents`,
        occurrenceCount: pattern.occurrences,
        decisions: pattern.linkedDecisions,
        incidents: pattern.linkedIncidents,
        lastOccurred: pattern.lastSeen,
        recommendation: generateMistakeRecommendation(pattern),
      };

      if (existing) {
        Object.assign(existing, mistake);
      } else {
        repeatedMistakes.push(mistake);
        detected.push(mistake);
      }
    }
  }

  // Limit storage
  while (repeatedMistakes.length > 50) {
    repeatedMistakes.shift();
  }

  return detected;
}

function generateMistakeRecommendation(pattern: FailurePattern): string {
  if (pattern.severity === 'critical' || pattern.severity === 'high') {
    return `Consider adding automated gate for ${pattern.affectedSystems.join(', ')} before allowing similar operations`;
  }
  if (pattern.trend === 'worsening') {
    return `Trend worsening - review ${pattern.affectedSystems.join(', ')} configuration`;
  }
  return `Monitor ${pattern.affectedSystems.join(', ')} more closely`;
}

export function getRepeatedMistakes(): RepeatedMistake[] {
  return [...repeatedMistakes];
}

// ============================================================================
// Memory Snapshot
// ============================================================================

export function captureMemorySnapshot(): PlatformMemorySnapshot {
  detectPatterns();
  detectRepeatedMistakes();

  return {
    id: `mem_${Date.now()}`,
    capturedAt: new Date(),
    patterns: [...patterns],
    subsystemHealth: getAllSubsystemHealth(),
    silentRegressions: [...silentRegressions],
    repeatedMistakes: [...repeatedMistakes],
  };
}

// ============================================================================
// Maintenance
// ============================================================================

export function clearAll(): void {
  patterns.length = 0;
  incidentLinks.length = 0;
  subsystemHealthCache.clear();
  silentRegressions.length = 0;
  repeatedMistakes.length = 0;
  mttrHistory.clear();
  metricHistory.clear();
}
