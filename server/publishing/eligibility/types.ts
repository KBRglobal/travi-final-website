/**
 * Publishing Eligibility Types
 *
 * Type definitions for the publish control and safety layer.
 */

export interface EligibilityResult {
  contentId: string;
  allowed: boolean;
  blockingReasons: string[];
  warnings: string[];
  score: number; // 0-100
  evaluatedAt: Date;
}

export interface EligibilityOptions {
  forcePublish?: boolean;
  skipAeoCheck?: boolean;
  skipEntityCheck?: boolean;
  skipIntelligenceCheck?: boolean;
}

export interface BlockedContent {
  contentId: string;
  title: string;
  type: string;
  blockingReasons: string[];
  blockedSince: Date;
  lastEvaluatedAt: Date;
}

export interface PublishGuardResult {
  allowed: boolean;
  eligibility: EligibilityResult;
  action: 'proceed' | 'blocked' | 'warning';
}

/**
 * Feature flag checks
 */
export function isPublishGuardsEnabled(): boolean {
  return process.env.ENABLE_PUBLISH_GUARDS === 'true';
}

export function isAeoRequired(): boolean {
  return process.env.ENABLE_AEO_REQUIRED === 'true';
}

export function isEntityRequired(): boolean {
  return process.env.ENABLE_ENTITY_REQUIRED === 'true';
}

export function isIntelligenceCoverageRequired(): boolean {
  return process.env.ENABLE_INTELLIGENCE_COVERAGE === 'true';
}
