/**
 * Intelligence Coverage Engine - Types
 *
 * Core type definitions for the ICE system.
 */

export interface ContentCoverageSignals {
  /** Content has entity tags attached */
  hasEntities: boolean;
  /** Count of entity tags on this content */
  entityCount: number;
  /** Count of entities that link/reference this content */
  linkedEntitiesCount: number;
  /** Content has outbound internal links */
  hasInternalLinks: boolean;
  /** Count of outbound internal links */
  internalLinkCount: number;
  /** Content exists in search index */
  isSearchIndexed: boolean;
  /** Content has an answer capsule for AEO */
  hasAeoCapsule: boolean;
  /** Content AEO score (0-100, null if not scored) */
  aeoScore: number | null;
  /** Content is published */
  isPublished: boolean;
}

export interface ContentCoverage {
  contentId: string;
  contentType: string;
  contentTitle: string;
  signals: ContentCoverageSignals;
  /** Composite coverage score 0-100 */
  coverageScore: number;
  /** Timestamp of evaluation */
  evaluatedAt: Date;
}

export interface CoverageEvaluationResult {
  success: boolean;
  contentId: string;
  coverage: ContentCoverage | null;
  error?: string;
}

export interface BatchEvaluationResult {
  total: number;
  evaluated: number;
  failed: number;
  results: CoverageEvaluationResult[];
  cursor?: string;
}

export interface CoverageSummary {
  /** Total content count */
  totalContent: number;
  /** Content with zero entities */
  zeroEntityCount: number;
  /** Published but not indexed */
  publishedNotIndexed: number;
  /** Has AEO but no entities */
  aeoWithoutEntities: number;
  /** Average coverage score */
  averageCoverageScore: number;
  /** Coverage score distribution */
  scoreDistribution: {
    excellent: number; // 80-100
    good: number;      // 60-79
    fair: number;      // 40-59
    poor: number;      // 20-39
    critical: number;  // 0-19
  };
  /** Last evaluation timestamp */
  lastEvaluatedAt: Date | null;
}

export interface CoverageJobPayload {
  type: 'single' | 'batch';
  contentId?: string;
  batchSize?: number;
  cursor?: string;
}
