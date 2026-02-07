/**
 * Locale Purity Calculator
 * ========================
 * Extended locale purity validation for all 30 supported locales
 * Calculates what percentage of content is in the target locale's script
 */

import {
  SCRIPT_REGEX,
  getPrimaryScripts,
  countCharsByScript,
  isRtlScript,
} from "./script-validators";
import { getQualityThresholds } from "../cultural-contexts";

/**
 * Universal technical terms that are acceptable in any locale
 * These are exempt from locale purity calculations
 */
// Currency codes and measurement units (split out for regex complexity)
const CURRENCY_CODES = "AED|USD|EUR|GBP|JPY|CNY|INR|RUB|SAR|QAR|BHD|OMR|KWD";
const MEASUREMENT_UNITS = "km|mi|ft|min|hr|hours?|minutes?|kg|lb|cm|inch|mm";
const MEASUREMENTS_PATTERN = new RegExp(
  `\\b\\d+[.,]?\\d*\\s*(${CURRENCY_CODES}|${MEASUREMENT_UNITS}|m)\\b`,
  "gi"
);

const UNIVERSAL_TECHNICAL_PATTERNS = [
  // Tech brands and apps
  /\b(WhatsApp|Google|Maps|Uber|WiFi|GPS|URL|HTTP|HTTPS|API|iOS|Android|iPhone|iPad|Samsung)\b/gi,
  // Time patterns
  /\b\d+:\d+\b/g,
  // Measurements and currencies
  MEASUREMENTS_PATTERN,
  // Years
  /\b(19|20)\d{2}\b/g,
  // Common brand names
  /\b(Facebook|Instagram|Twitter|TikTok|YouTube|Netflix|Spotify|Amazon|Apple|Microsoft)\b/gi,
  // Email patterns
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // URLs
  /https?:\/\/[^\s]+/g,
];

/**
 * Locale-specific purity thresholds
 * Tier 1 locales have stricter requirements
 */
const DEFAULT_PURITY_THRESHOLDS: Record<string, number> = {
  // Tier 1 - Strict
  en: 0.99,
  ar: 0.98,
  hi: 0.98,
  // Tier 2-5 - Relaxed
  default: 0.95,
};

/**
 * Calculate locale purity score for a piece of text
 *
 * @param text - The text to analyze
 * @param targetLocale - The expected locale code
 * @param exemptions - Additional strings to exempt (proper nouns, etc.)
 * @returns Purity score between 0.0 and 1.0
 */
export function calculateLocalePurity(
  text: string,
  targetLocale: string,
  exemptions: string[] = []
): number {
  if (!text || text.trim().length === 0) return 1;

  let cleanText = text;

  // Remove universal technical terms
  for (const pattern of UNIVERSAL_TECHNICAL_PATTERNS) {
    cleanText = cleanText.replace(pattern, "");
  }

  // Remove dynamic exemptions (proper nouns, attraction names, etc.)
  for (const exemption of exemptions) {
    if (exemption?.trim()) {
      const escapedExemption = exemption.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
      cleanText = cleanText.replace(new RegExp(escapedExemption, "gi"), "");
    }
  }

  // Remove numbers and common punctuation
  cleanText = cleanText.replace(/[0-9.,!?;:'"()[\]{}<>@#$%^&*+=_~`\\|/\-–—\n\r\t]/g, " ");
  cleanText = cleanText.trim();

  if (cleanText.length === 0) return 1;

  // Get the primary script regex for this locale
  const primaryScripts = getPrimaryScripts(targetLocale);
  const primaryScript = primaryScripts[0] || "latin";
  const scriptRegex = SCRIPT_REGEX[primaryScript] || SCRIPT_REGEX.latin;

  // Count characters in target script
  const scriptMatches = cleanText.match(scriptRegex) || [];
  const scriptCharCount = scriptMatches.length;

  // Count total non-whitespace characters
  const totalChars = cleanText.replace(/\s/g, "").length;

  if (totalChars === 0) return 1;

  return scriptCharCount / totalChars;
}

/**
 * Calculate detailed locale purity with breakdown
 */
export function calculateLocalePurityDetailed(
  text: string,
  targetLocale: string,
  exemptions: string[] = []
): {
  score: number;
  breakdown: Record<string, number>;
  totalChars: number;
  targetScriptChars: number;
  violations: string[];
} {
  if (!text || text.trim().length === 0) {
    return {
      score: 1,
      breakdown: {},
      totalChars: 0,
      targetScriptChars: 0,
      violations: [],
    };
  }

  let cleanText = text;

  // Remove exemptions
  for (const pattern of UNIVERSAL_TECHNICAL_PATTERNS) {
    cleanText = cleanText.replace(pattern, "");
  }

  for (const exemption of exemptions) {
    if (exemption?.trim()) {
      const escapedExemption = exemption.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
      cleanText = cleanText.replace(new RegExp(escapedExemption, "gi"), "");
    }
  }

  cleanText = cleanText.replace(/[0-9.,!?;:'"()[\]{}<>@#$%^&*+=_~`\\|/\-–—\n\r\t]/g, " ");

  // Count characters by script
  const breakdown = countCharsByScript(cleanText);

  // Get primary script for locale
  const primaryScripts = getPrimaryScripts(targetLocale);
  const primaryScript = primaryScripts[0] || "latin";

  // Calculate totals
  const totalChars = Object.values(breakdown).reduce((sum, count) => sum + count, 0);
  const targetScriptChars = breakdown[primaryScript] || 0;

  // Find violations (non-target script characters)
  const violations: string[] = [];
  for (const [script, count] of Object.entries(breakdown)) {
    if (script !== primaryScript && script !== "other" && count > 0) {
      violations.push(`${script}: ${count} chars`);
    }
  }

  const score = totalChars > 0 ? targetScriptChars / totalChars : 1;

  return {
    score,
    breakdown,
    totalChars,
    targetScriptChars,
    violations,
  };
}

/**
 * Validate content locale purity against threshold
 */
export function validateLocalePurity(
  content: {
    introduction?: string;
    whatToExpect?: string;
    visitorTips?: string;
    howToGetThere?: string;
    metaTitle?: string;
    metaDescription?: string;
    answerCapsule?: string;
    faqs?: Array<{ question: string; answer: string }>;
  },
  locale: string,
  exemptions: string[] = []
): {
  passed: boolean;
  score: number;
  threshold: number;
  sectionScores: Record<string, number>;
} {
  // Get threshold from cultural context or use default
  const qualityThresholds = getQualityThresholds(locale);
  const threshold = qualityThresholds.purityThreshold;

  // Combine all content for analysis
  const allText = [
    content.introduction || "",
    content.whatToExpect || "",
    content.visitorTips || "",
    content.howToGetThere || "",
    content.metaTitle || "",
    content.metaDescription || "",
    content.answerCapsule || "",
    ...(content.faqs?.map(f => `${f.question} ${f.answer}`) || []),
  ].join(" ");

  // Calculate overall score
  const score = calculateLocalePurity(allText, locale, exemptions);

  // Calculate per-section scores
  const sectionScores: Record<string, number> = {};

  if (content.introduction) {
    sectionScores.introduction = calculateLocalePurity(content.introduction, locale, exemptions);
  }
  if (content.whatToExpect) {
    sectionScores.whatToExpect = calculateLocalePurity(content.whatToExpect, locale, exemptions);
  }
  if (content.visitorTips) {
    sectionScores.visitorTips = calculateLocalePurity(content.visitorTips, locale, exemptions);
  }
  if (content.howToGetThere) {
    sectionScores.howToGetThere = calculateLocalePurity(content.howToGetThere, locale, exemptions);
  }
  if (content.metaTitle) {
    sectionScores.metaTitle = calculateLocalePurity(content.metaTitle, locale, exemptions);
  }
  if (content.metaDescription) {
    sectionScores.metaDescription = calculateLocalePurity(
      content.metaDescription,
      locale,
      exemptions
    );
  }
  if (content.answerCapsule) {
    sectionScores.answerCapsule = calculateLocalePurity(content.answerCapsule, locale, exemptions);
  }

  const passed = score >= threshold;

  return {
    passed,
    score,
    threshold,
    sectionScores,
  };
}

/**
 * Get purity threshold for a locale
 */
export function getPurityThreshold(locale: string): number {
  const qualityThresholds = getQualityThresholds(locale);
  return qualityThresholds.purityThreshold;
}

/**
 * Check if content passes RTL validation (for RTL locales)
 */
export function validateRtlContent(
  content: string,
  locale: string
): { passed: boolean; issues: string[] } {
  if (!isRtlScript(locale)) {
    return { passed: true, issues: [] };
  }

  const issues: string[] = [];

  // Check for common RTL issues
  // Note: Most RTL formatting is handled by CSS, but we can check for common issues

  // Check for LTR override characters that shouldn't be there
  if (content.includes("\u202A") || content.includes("\u202B")) {
    issues.push("Contains explicit RTL/LTR override characters");
  }

  // Check if content starts with expected RTL characters
  const primaryScripts = getPrimaryScripts(locale);
  const scriptRegex = SCRIPT_REGEX[primaryScripts[0]];

  if (scriptRegex) {
    const firstNonSpaceChar = content.trim()[0];
    if (firstNonSpaceChar && !scriptRegex.test(firstNonSpaceChar)) {
      // Allow if it's a number or punctuation
      if (!/[0-9.,!?;:"'()]/.test(firstNonSpaceChar)) {
        issues.push("Content does not start with expected RTL script character");
      }
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Export all validators
 */
export const localePurityValidators = {
  calculateLocalePurity,
  calculateLocalePurityDetailed,
  validateLocalePurity,
  getPurityThreshold,
  validateRtlContent,
};

export default localePurityValidators;
