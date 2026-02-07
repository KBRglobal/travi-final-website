/**
 * Quality Gates for Native Content
 * =================================
 * Language-specific quality thresholds for content validation
 */

import { getQualityThresholds, getCulturalContext } from "../cultural-contexts";

/**
 * Quality gate result
 */
export interface QualityGateResult {
  passed: boolean;
  gateName: string;
  actual: number | string;
  expected: string;
  message: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  passed: boolean;
  locale: string;
  tier: number;
  gates: QualityGateResult[];
  summary: {
    passedCount: number;
    failedCount: number;
    criticalFailures: string[];
  };
}

/**
 * Content structure for validation
 */
export interface ContentForValidation {
  introduction?: string;
  whatToExpect?: string;
  visitorTips?: string;
  howToGetThere?: string;
  highlights?: string[];
  faq?: Array<{ question: string; answer: string }>;
  answerCapsule?: string;
  metaTitle?: string;
  metaDescription?: string;
  localePurityScore?: number;
}

/**
 * Count words in text
 */
function countWords(text: string | undefined | null): number {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

/**
 * Validate locale purity gate
 */
function validatePurityGate(score: number | undefined, threshold: number): QualityGateResult {
  const actualScore = score ?? 0;
  const passed = actualScore >= threshold;

  return {
    passed,
    gateName: "Locale Purity",
    actual: (actualScore * 100).toFixed(1) + "%",
    expected: `>= ${(threshold * 100).toFixed(0)}%`,
    message: passed
      ? `Purity score meets threshold`
      : `Purity score ${(actualScore * 100).toFixed(1)}% below threshold ${(threshold * 100).toFixed(0)}%`,
  };
}

/**
 * Validate minimum word count gate
 */
function validateMinWordCountGate(
  content: ContentForValidation,
  minWords: number
): QualityGateResult {
  const totalWords =
    countWords(content.introduction) +
    countWords(content.whatToExpect) +
    countWords(content.visitorTips) +
    countWords(content.howToGetThere) +
    (content.faq?.reduce((sum, f) => sum + countWords(f.question) + countWords(f.answer), 0) || 0);

  const passed = totalWords >= minWords;

  return {
    passed,
    gateName: "Minimum Word Count",
    actual: totalWords,
    expected: `>= ${minWords}`,
    message: passed
      ? `Word count meets minimum`
      : `Word count ${totalWords} below minimum ${minWords}`,
  };
}

/**
 * Validate maximum word count gate
 */
function validateMaxWordCountGate(
  content: ContentForValidation,
  maxWords: number
): QualityGateResult {
  const totalWords =
    countWords(content.introduction) +
    countWords(content.whatToExpect) +
    countWords(content.visitorTips) +
    countWords(content.howToGetThere) +
    (content.faq?.reduce((sum, f) => sum + countWords(f.question) + countWords(f.answer), 0) || 0);

  const passed = totalWords <= maxWords;

  return {
    passed,
    gateName: "Maximum Word Count",
    actual: totalWords,
    expected: `<= ${maxWords}`,
    message: passed
      ? `Word count within limit`
      : `Word count ${totalWords} exceeds maximum ${maxWords}`,
  };
}

/**
 * Validate FAQ count gate
 */
function validateFaqCountGate(content: ContentForValidation, minFaq: number): QualityGateResult {
  const faqCount = content.faq?.length || 0;
  const passed = faqCount >= minFaq;

  return {
    passed,
    gateName: "FAQ Count",
    actual: faqCount,
    expected: `>= ${minFaq}`,
    message: passed ? `FAQ count meets minimum` : `FAQ count ${faqCount} below minimum ${minFaq}`,
  };
}

/**
 * Validate answer capsule gate
 */
function validateAnswerCapsuleGate(
  content: ContentForValidation,
  minLength: number
): QualityGateResult {
  const capsuleLength = content.answerCapsule?.length || 0;
  const passed = capsuleLength >= minLength;

  return {
    passed,
    gateName: "Answer Capsule",
    actual: capsuleLength,
    expected: `>= ${minLength} chars`,
    message: passed
      ? `Answer capsule meets minimum`
      : `Answer capsule ${capsuleLength} chars below minimum ${minLength}`,
  };
}

/**
 * Validate meta title gate
 */
function validateMetaTitleGate(content: ContentForValidation): QualityGateResult {
  const length = content.metaTitle?.length || 0;
  const minLength = 30;
  const maxLength = 70;
  const passed = length >= minLength && length <= maxLength;

  return {
    passed,
    gateName: "Meta Title Length",
    actual: length,
    expected: `${minLength}-${maxLength} chars`,
    message: passed
      ? `Meta title length is optimal`
      : `Meta title ${length} chars (should be ${minLength}-${maxLength})`,
  };
}

/**
 * Validate meta description gate
 */
function validateMetaDescriptionGate(content: ContentForValidation): QualityGateResult {
  const length = content.metaDescription?.length || 0;
  const minLength = 120;
  const maxLength = 160;
  const passed = length >= minLength && length <= maxLength;

  return {
    passed,
    gateName: "Meta Description Length",
    actual: length,
    expected: `${minLength}-${maxLength} chars`,
    message: passed
      ? `Meta description length is optimal`
      : `Meta description ${length} chars (should be ${minLength}-${maxLength})`,
  };
}

/**
 * Validate section completeness gate
 */
function validateCompletenessGate(content: ContentForValidation): QualityGateResult {
  const requiredSections = [
    "introduction",
    "whatToExpect",
    "visitorTips",
    "howToGetThere",
    "answerCapsule",
    "metaTitle",
    "metaDescription",
  ] as const;

  const missingSections: string[] = [];

  for (const section of requiredSections) {
    const value = content[section];
    if (!value || (typeof value === "string" && value.trim().length === 0)) {
      missingSections.push(section);
    }
  }

  // Check FAQ separately
  if (!content.faq || content.faq.length === 0) {
    missingSections.push("faq");
  }

  const passed = missingSections.length === 0;

  return {
    passed,
    gateName: "Section Completeness",
    actual:
      missingSections.length > 0
        ? `Missing: ${missingSections.join(", ")}`
        : "All sections present",
    expected: "All required sections",
    message: passed
      ? `All required sections are present`
      : `Missing sections: ${missingSections.join(", ")}`,
  };
}

/**
 * Run all quality gates for a locale
 */
export function runQualityGates(content: ContentForValidation, locale: string): ValidationResult {
  const context = getCulturalContext(locale);
  const thresholds = getQualityThresholds(locale);
  const tier = context?.tier || 5;

  const gates: QualityGateResult[] = [];

  // Critical gates (must pass), important gates, and SEO gates
  gates.push(
    validatePurityGate(content.localePurityScore, thresholds.purityThreshold),
    validateCompletenessGate(content),
    validateMinWordCountGate(content, thresholds.minWordCount),
    validateFaqCountGate(content, thresholds.minFaqCount),
    validateAnswerCapsuleGate(content, thresholds.minAnswerCapsuleLength),
    validateMetaTitleGate(content),
    validateMetaDescriptionGate(content)
  );

  // Optional gates for higher tiers
  if (tier <= 2) {
    gates.push(validateMaxWordCountGate(content, thresholds.maxWordCount));
  }

  // Calculate summary
  const passedCount = gates.filter(g => g.passed).length;
  const failedCount = gates.filter(g => !g.passed).length;

  // Critical failures are the first 3 gates (purity, completeness, word count)
  const criticalFailures = gates
    .slice(0, 3)
    .filter(g => !g.passed)
    .map(g => g.gateName);

  return {
    passed: criticalFailures.length === 0,
    locale,
    tier,
    gates,
    summary: {
      passedCount,
      failedCount,
      criticalFailures,
    },
  };
}

/**
 * Quick check if content passes minimum requirements
 */
export function quickPassCheck(
  content: ContentForValidation,
  locale: string
): { passes: boolean; reason?: string } {
  const thresholds = getQualityThresholds(locale);

  // Check purity
  if (
    content.localePurityScore !== undefined &&
    content.localePurityScore < thresholds.purityThreshold
  ) {
    return {
      passes: false,
      reason: `Locale purity ${(content.localePurityScore * 100).toFixed(1)}% below ${(thresholds.purityThreshold * 100).toFixed(0)}%`,
    };
  }

  // Check word count
  const totalWords =
    countWords(content.introduction) +
    countWords(content.whatToExpect) +
    countWords(content.visitorTips) +
    countWords(content.howToGetThere);

  if (totalWords < thresholds.minWordCount * 0.5) {
    // Allow 50% buffer for initial check
    return {
      passes: false,
      reason: `Word count ${totalWords} too low (min: ${thresholds.minWordCount})`,
    };
  }

  // Check FAQ
  if (!content.faq || content.faq.length < thresholds.minFaqCount) {
    return {
      passes: false,
      reason: `FAQ count ${content.faq?.length || 0} below minimum ${thresholds.minFaqCount}`,
    };
  }

  return { passes: true };
}

/**
 * Get tier-specific requirements summary
 */
export function getTierRequirements(tier: 1 | 2 | 3 | 4 | 5): {
  purity: string;
  minWords: string;
  faq: string;
  description: string;
} {
  const tierConfig: Record<
    number,
    { purity: string; minWords: string; faq: string; description: string }
  > = {
    1: {
      purity: "98-99%",
      minWords: "1500-1800",
      faq: "5-8",
      description: "Core languages - strict quality",
    },
    2: {
      purity: "96-97%",
      minWords: "1200-1500",
      faq: "5",
      description: "High ROI languages - high quality",
    },
    3: {
      purity: "95%",
      minWords: "1200",
      faq: "5",
      description: "Growing markets - standard quality",
    },
    4: {
      purity: "95%",
      minWords: "1000-1200",
      faq: "5",
      description: "Niche markets - standard quality",
    },
    5: {
      purity: "95%",
      minWords: "1000",
      faq: "5",
      description: "European expansion - minimum viable",
    },
  };

  return tierConfig[tier] || tierConfig[5];
}

export default {
  runQualityGates,
  quickPassCheck,
  getTierRequirements,
  validatePurityGate,
  validateCompletenessGate,
  validateMinWordCountGate,
  validateFaqCountGate,
};
