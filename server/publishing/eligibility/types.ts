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
  skipQuality108Check?: boolean;
  skipInternalLinkingCheck?: boolean;
  skipFaqCheck?: boolean;
}

/**
 * SEO Publishing Gates Configuration
 * Controls minimum requirements for auto-publishing
 */
export interface SEOPublishingGates {
  // Quality 108 minimum score (out of 108)
  quality108Minimum: number;
  // Require all Tier 1 criteria to pass
  tier1Must100Percent: boolean;
  // Minimum AEO score (out of 100)
  aeoMinimum: number;
  // Require answer capsule
  mustHaveAnswerCapsule: boolean;
  // Require FAQ section
  mustHaveFAQ: boolean;
  // Minimum FAQ count
  minFAQCount: number;
  // Minimum internal links
  minInternalLinks: number;
  // No orphan pages allowed
  noOrphanPages: boolean;
}

/**
 * Default SEO Publishing Gates
 */
export const DEFAULT_SEO_GATES: SEOPublishingGates = {
  quality108Minimum: 75, // 70% minimum
  tier1Must100Percent: true,
  aeoMinimum: 60,
  mustHaveAnswerCapsule: true,
  mustHaveFAQ: true,
  minFAQCount: 6,
  minInternalLinks: 3,
  noOrphanPages: true,
};

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
  action: "proceed" | "blocked" | "warning";
}

/**
 * Feature flag checks
 */
export function isPublishGuardsEnabled(): boolean {
  return process.env.ENABLE_PUBLISH_GUARDS === "true";
}

export function isAeoRequired(): boolean {
  return process.env.ENABLE_AEO_REQUIRED === "true";
}

export function isEntityRequired(): boolean {
  return process.env.ENABLE_ENTITY_REQUIRED === "true";
}

export function isIntelligenceCoverageRequired(): boolean {
  return process.env.ENABLE_INTELLIGENCE_COVERAGE === "true";
}

export function isQuality108Required(): boolean {
  return process.env.ENABLE_QUALITY_108_REQUIRED === "true";
}

export function isInternalLinkingRequired(): boolean {
  return process.env.ENABLE_INTERNAL_LINKING_REQUIRED === "true";
}

export function isFaqRequired(): boolean {
  return process.env.ENABLE_FAQ_REQUIRED === "true";
}

export function getSEOGates(): SEOPublishingGates {
  return {
    quality108Minimum: Number.parseInt(process.env.SEO_QUALITY_108_MIN || "75", 10),
    tier1Must100Percent: process.env.SEO_TIER1_REQUIRED !== "false",
    aeoMinimum: Number.parseInt(process.env.SEO_AEO_MIN || "60", 10),
    mustHaveAnswerCapsule: process.env.SEO_CAPSULE_REQUIRED !== "false",
    mustHaveFAQ: process.env.SEO_FAQ_REQUIRED !== "false",
    minFAQCount: Number.parseInt(process.env.SEO_MIN_FAQ || "6", 10),
    minInternalLinks: Number.parseInt(process.env.SEO_MIN_LINKS || "3", 10),
    noOrphanPages: process.env.SEO_NO_ORPHANS !== "false",
  };
}
