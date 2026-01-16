/**
 * Internal Competition Detector Types
 *
 * FEATURE 9: Internal Competition (Cannibalization) Detector
 * Detects content competing for the same keywords/topics
 */

export type CompetitionType = 'keyword' | 'topic' | 'entity' | 'audience' | 'intent';
export type CompetitionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ResolutionStrategy = 'merge' | 'differentiate' | 'redirect' | 'delete' | 'no_action';

export interface CompetitionPair {
  id: string;
  contentIdA: string;
  contentIdB: string;
  titleA: string;
  titleB: string;
  type: CompetitionType;
  severity: CompetitionSeverity;
  overlapScore: number; // 0-100 how much they overlap
  sharedElements: string[]; // Keywords, topics, entities that overlap
  impactEstimate: string; // Description of potential impact
  suggestedStrategy: ResolutionStrategy;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: ResolutionStrategy;
  resolvedBy?: string;
}

export interface CompetitionAnalysis {
  contentId: string;
  contentTitle: string;
  competingContent: CompetitionPair[];
  totalCompetitors: number;
  highestOverlap: number;
  primaryRisk: CompetitionType | null;
  analyzedAt: Date;
}

export interface CompetitionCluster {
  id: string;
  name: string;
  description: string;
  contentIds: string[];
  sharedKeywords: string[];
  sharedTopics: string[];
  recommendedCanonical?: string;
  createdAt: Date;
}

export interface CompetitionStats {
  totalPairsDetected: number;
  byType: Record<CompetitionType, number>;
  bySeverity: Record<CompetitionSeverity, number>;
  resolved: number;
  unresolved: number;
  clusters: number;
  avgOverlapScore: number;
}

// Weights for calculating overlap score
export const OVERLAP_WEIGHTS: Record<CompetitionType, number> = {
  keyword: 0.35,
  topic: 0.25,
  entity: 0.20,
  audience: 0.10,
  intent: 0.10,
};

// Severity thresholds
export const SEVERITY_THRESHOLDS = {
  critical: 80,
  high: 60,
  medium: 40,
  low: 20,
};

export function isInternalCompetitionEnabled(): boolean {
  return process.env.ENABLE_INTERNAL_COMPETITION === 'true';
}
