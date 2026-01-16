/**
 * Organizational Memory & RCA Engine - Types
 */

export type MemoryEventType =
  | 'incident'
  | 'governor_action'
  | 'readiness_block'
  | 'failed_publish'
  | 'rollback'
  | 'deployment_failure'
  | 'outage'
  | 'security_event';

export type CauseSeverity = 'primary' | 'contributing' | 'incidental';

export type PatternType =
  | 'repeated_failure'
  | 'slow_burn'
  | 'escalation_chain'
  | 'cascade_failure'
  | 'resource_exhaustion'
  | 'timing_correlation';

export type LearningCategory =
  | 'prevention'
  | 'detection'
  | 'response'
  | 'monitoring'
  | 'policy'
  | 'architecture';

/**
 * A memory event (incident, action, etc.)
 */
export interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  title: string;
  description: string;

  // When
  occurredAt: Date;
  resolvedAt?: Date;
  durationMs?: number;

  // What
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedSystems: string[];
  affectedEntities?: string[];

  // Context
  signals: string[];        // Related signal IDs
  decisions: string[];      // Related decision IDs
  metadata: Record<string, unknown>;

  // Status
  rcaComplete: boolean;
  rcaId?: string;
}

/**
 * A cause identified in RCA
 */
export interface Cause {
  id: string;
  severity: CauseSeverity;
  description: string;
  category: string;

  // Evidence
  signals: string[];
  evidence: string[];

  // Analysis
  confidence: number;       // 0-100
  preventable: boolean;
  detectable: boolean;
}

/**
 * Missed warning during incident
 */
export interface MissedWarning {
  signalSource: string;
  signalType: string;
  occurredAt: Date;
  description: string;
  whyMissed: string;
}

/**
 * Root Cause Analysis result
 */
export interface RCAResult {
  id: string;
  eventId: string;
  event: MemoryEvent;

  // Analysis
  primaryCause: Cause;
  contributingCauses: Cause[];

  // Warnings
  missedWarnings: MissedWarning[];

  // Scoring
  preventabilityScore: number;  // 0-100
  detectabilityScore: number;   // 0-100
  responseScore: number;        // 0-100

  // Summary
  summary: string;
  timeline: TimelineEntry[];

  // Metadata
  analyzedAt: Date;
  analysisVersion: string;
}

/**
 * Timeline entry
 */
export interface TimelineEntry {
  timestamp: Date;
  type: 'signal' | 'decision' | 'action' | 'event';
  description: string;
  significance: 'low' | 'medium' | 'high';
}

/**
 * Detected pattern
 */
export interface Pattern {
  id: string;
  type: PatternType;
  name: string;
  description: string;

  // Detection
  firstDetected: Date;
  lastOccurrence: Date;
  occurrenceCount: number;

  // Events
  eventIds: string[];

  // Analysis
  severity: 'low' | 'medium' | 'high' | 'critical';
  trend: 'improving' | 'stable' | 'worsening';

  // Context
  affectedSystems: string[];
  commonCauses: string[];
}

/**
 * Actionable learning
 */
export interface Learning {
  id: string;
  category: LearningCategory;
  title: string;
  description: string;

  // Source
  sourceEventIds: string[];
  sourcePatternIds: string[];

  // Recommendation
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  priority: number;           // 1-10

  // Status
  status: 'proposed' | 'accepted' | 'implemented' | 'rejected';
  createdAt: Date;
  implementedAt?: Date;
}

/**
 * Memory query
 */
export interface MemoryQuery {
  types?: MemoryEventType[];
  severity?: string[];
  affectedSystem?: string;
  since?: Date;
  until?: Date;
  rcaComplete?: boolean;
  limit?: number;
}

/**
 * Pattern query
 */
export interface PatternQuery {
  types?: PatternType[];
  severity?: string[];
  affectedSystem?: string;
  minOccurrences?: number;
  limit?: number;
}

/**
 * Learning query
 */
export interface LearningQuery {
  categories?: LearningCategory[];
  status?: Learning['status'][];
  minPriority?: number;
  limit?: number;
}
