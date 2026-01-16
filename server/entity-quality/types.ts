/**
 * Entity Quality: Dedup Scanner - Type Definitions
 * Feature Flag: ENABLE_ENTITY_QUALITY=true
 */

export type EntityType = 'hotel' | 'attraction' | 'dining' | 'transport' | 'district';
export type SuggestionStatus = 'open' | 'ignored' | 'merged';

export interface EntityReference {
  id: string;
  type: EntityType;
  name: string;
  normalizedName: string;
  destinationId?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
}

export interface MergeSuggestion {
  id: string;
  entityType: EntityType;
  primaryEntity: EntityReference;
  duplicateEntity: EntityReference;
  confidenceScore: number; // 0-100
  matchReasons: MatchReason[];
  status: SuggestionStatus;
  createdAt: Date;
  updatedAt: Date;
  ignoredBy?: string;
  ignoredAt?: Date;
  mergedBy?: string;
  mergedAt?: Date;
}

export interface MatchReason {
  field: string;
  similarity: number; // 0-1
  description: string;
}

export interface DedupScanResult {
  entityType: EntityType;
  scannedCount: number;
  suggestionsFound: number;
  duration: number;
  timestamp: Date;
}

export interface SuggestionQueryOptions {
  entityType?: EntityType;
  status?: SuggestionStatus;
  minConfidence?: number;
  limit?: number;
  offset?: number;
}

export interface EntityQualityStatus {
  enabled: boolean;
  totalSuggestions: number;
  openSuggestions: number;
  config: {
    batchSize: number;
    minConfidenceThreshold: number;
  };
}

export type QualityDimension =
  | 'completeness'
  | 'accuracy'
  | 'freshness'
  | 'consistency'
  | 'richness'
  | 'engagement';

export interface DimensionScore {
  score: number;
  weight: number;
  components: Array<{ name: string; score: number; max: number }>;
}

export interface QualityIssue {
  code: string;
  dimension: QualityDimension;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface QualityScore {
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: Record<QualityDimension, DimensionScore>;
  issues: QualityIssue[];
  computedAt: Date;
}

export interface QualityStats {
  averageScore: number;
  gradeDistribution: Record<string, number>;
  topIssues: Array<{ code: string; count: number }>;
  totalEvaluated: number;
}

export type QualityGrade = QualityScore['grade'];

export const DIMENSION_WEIGHTS: Record<QualityDimension, number> = {
  completeness: 0.25,
  accuracy: 0.20,
  freshness: 0.15,
  consistency: 0.15,
  richness: 0.15,
  engagement: 0.10,
};

export const DEFAULT_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
};
