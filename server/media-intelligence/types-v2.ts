/**
 * Media Intelligence v2 - Enhanced Type Definitions
 *
 * Feature flags:
 * - ENABLE_MEDIA_INTELLIGENCE=true (main toggle)
 * - ENABLE_MEDIA_ALT_AI=true (AI-powered alt text)
 * - ENABLE_MEDIA_AUTO_APPLY=true (auto-apply suggestions)
 * - ENABLE_MEDIA_DESTRUCTIVE_OPS=true (allow deletes)
 */

export function isMediaIntelligenceEnabled(): boolean {
  return process.env.ENABLE_MEDIA_INTELLIGENCE === 'true';
}

export function isAltAIEnabled(): boolean {
  return process.env.ENABLE_MEDIA_ALT_AI === 'true';
}

export function isAutoApplyEnabled(): boolean {
  return process.env.ENABLE_MEDIA_AUTO_APPLY === 'true';
}

export function isDestructiveOpsEnabled(): boolean {
  return process.env.ENABLE_MEDIA_DESTRUCTIVE_OPS === 'true';
}

// Severity levels
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

// Grade levels
export type MediaGrade = 'A' | 'B' | 'C' | 'D' | 'F';

// Placement roles
export type PlacementRole = 'hero' | 'card' | 'thumbnail' | 'inline' | 'background' | 'icon' | 'unknown';

// Issue types
export type IssueType =
  | 'missing_alt'
  | 'low_quality_alt'
  | 'too_small_for_placement'
  | 'oversized_file'
  | 'wrong_format'
  | 'duplicate_near_identical'
  | 'orphaned'
  | 'missing_hero'
  | 'broken_reference'
  | 'missing_exif'
  | 'low_resolution'
  | 'excessive_compression'
  | 'missing_dimensions';

/**
 * Asset classifier signals
 */
export interface AssetClassifier {
  type: 'image' | 'video' | 'document' | 'unknown';
  format: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  compressionRatio?: number;
  hasExif: boolean;
  exifData?: Record<string, unknown>;
  altText?: string;
  altTextQuality: 'good' | 'poor' | 'missing';
  duplicateSimilarityHash?: string;
  isOrphan: boolean;
}

/**
 * Content linkage signals
 */
export interface ContentLinkage {
  referencedByContentIds: string[];
  placementRoles: PlacementRole[];
  localeCoverage: string[];
  totalReferences: number;
  primaryPlacement?: PlacementRole;
}

/**
 * Performance signals (optional)
 */
export interface PerformanceSignals {
  impressions: number;
  clicks: number;
  ctr: number;
  available: boolean;
}

/**
 * Enhanced media asset
 */
export interface MediaAssetV2 {
  id: string;
  url: string;
  filename: string;
  classifier: AssetClassifier;
  linkage: ContentLinkage;
  performance: PerformanceSignals;
  createdAt: Date;
  updatedAt: Date;
  lastScannedAt?: Date;
}

/**
 * Media issue
 */
export interface MediaIssue {
  type: IssueType;
  severity: IssueSeverity;
  description: string;
  affectedField?: string;
  context?: Record<string, unknown>;
}

/**
 * Remediation recommendation
 */
export interface RemediationRecommendation {
  id: string;
  action: 'replace_hero' | 'generate_alt' | 'compress' | 'convert_format' | 'delete_orphan' | 'resize' | 'add_dimensions';
  description: string;
  fixCost: 'low' | 'medium' | 'high';
  impactScore: number; // 1-100
  autoFixable: boolean;
  dryRunOnly?: boolean;
}

/**
 * Media quality score result
 */
export interface MediaQualityScore {
  assetId: string;
  score: number; // 0-100
  grade: MediaGrade;
  issues: MediaIssue[];
  recommendations: RemediationRecommendation[];
  seoScore: number;
  aeoScore: number;
  uxScore: number;
  revenueReadinessScore: number;
  scoredAt: Date;
}

/**
 * Content media fitness
 */
export interface ContentMediaFitness {
  contentId: string;
  overallScore: number;
  grade: MediaGrade;
  hasHero: boolean;
  heroQuality?: MediaQualityScore;
  mediaCount: number;
  issuesCount: number;
  criticalIssues: number;
  recommendations: RemediationRecommendation[];
  evaluatedAt: Date;
}

/**
 * Batch scan request
 */
export interface BatchScanRequest {
  assetIds?: string[];
  contentIds?: string[];
  limit?: number;
  offset?: number;
  forceRescan?: boolean;
}

/**
 * Batch scan result
 */
export interface BatchScanResult {
  scanned: number;
  failed: number;
  skipped: number;
  duration: number;
  results: MediaQualityScore[];
  errors: Array<{ assetId: string; error: string }>;
}

/**
 * Scan job status
 */
export interface ScanJobStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total: number;
  scanned: number;
  failed: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Alt text suggestion with AI
 */
export interface AltTextSuggestionV2 {
  assetId: string;
  currentAlt?: string;
  suggestions: Array<{
    text: string;
    confidence: number;
    source: 'ai' | 'filename' | 'tags' | 'objects';
  }>;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  generatedAt: Date;
}

/**
 * Remediation action request
 */
export interface RemediationActionRequest {
  assetId: string;
  action: RemediationRecommendation['action'];
  dryRun: boolean;
  confirmToken?: string;
}

/**
 * Remediation action result
 */
export interface RemediationActionResult {
  assetId: string;
  action: string;
  success: boolean;
  dryRun: boolean;
  message: string;
  changes?: Record<string, unknown>;
}

/**
 * Media stats v2
 */
export interface MediaStatsV2 {
  totalAssets: number;
  scannedAssets: number;
  averageScore: number;
  gradeDistribution: Record<MediaGrade, number>;
  issuesBySeverity: Record<IssueSeverity, number>;
  orphanedAssets: number;
  missingAltCount: number;
  oversizedCount: number;
  totalStorageBytes: number;
  potentialSavingsBytes: number;
}

// Scoring weights configuration
export interface ScoringWeights {
  altTextPresent: number;
  altTextQuality: number;
  appropriateSize: number;
  optimalFormat: number;
  noDuplicates: number;
  hasUsage: number;
  performanceOptimized: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  altTextPresent: 25,
  altTextQuality: 10,
  appropriateSize: 20,
  optimalFormat: 15,
  noDuplicates: 10,
  hasUsage: 10,
  performanceOptimized: 10,
};

// Size thresholds by placement
export const SIZE_THRESHOLDS: Record<PlacementRole, { minWidth: number; minHeight: number; maxBytes: number }> = {
  hero: { minWidth: 1200, minHeight: 600, maxBytes: 500000 },
  card: { minWidth: 400, minHeight: 300, maxBytes: 150000 },
  thumbnail: { minWidth: 150, minHeight: 150, maxBytes: 50000 },
  inline: { minWidth: 300, minHeight: 200, maxBytes: 200000 },
  background: { minWidth: 1920, minHeight: 1080, maxBytes: 800000 },
  icon: { minWidth: 32, minHeight: 32, maxBytes: 20000 },
  unknown: { minWidth: 200, minHeight: 200, maxBytes: 300000 },
};
