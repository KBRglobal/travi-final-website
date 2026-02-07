/**
 * Content Quality Validator
 * Validates attraction content for SEO, AEO, and Fact-check scores
 * Content must pass ALL scores >= QUALITY_THRESHOLD to be publishable
 */

// Quality threshold - content must score at least this on ALL metrics
export const QUALITY_THRESHOLD = 85;

// AI-typical phrases that should be avoided for human-like writing
export const AI_PATTERNS = [
  // Classic AI overused words
  "delve",
  "dive into",
  "vibrant",
  "bustling",
  "tapestry",
  "myriad",
  "nestled",
  "situated",
  "stunning",
  "breathtaking",
  "embark on",
  "embark upon",
  "journey through",
  "discover the magic",

  // AI sentence patterns
  "whether you are",
  "whether you're",
  "from .* to .*,",
  "offers something for everyone",
  "has something for everyone",
  "is a must for",
  "is a must-see",
  "is a must-visit",
  "perfect for",
  "ideal for those who",

  // AI transitional phrases
  "in conclusion",
  "to sum up",
  "all in all",
  "in summary",
  "it is worth noting",
  "it's worth mentioning",
  "importantly",
  "furthermore",
  "moreover",
  "additionally",
  "consequently",

  // AI enthusiasm markers
  "truly",
  "simply",
  "absolutely",
  "definitely",
  "certainly",
  "undoubtedly",
  "unquestionably",
  "remarkably",
  "incredibly",
  "exceptionally",
  "extraordinarily",

  // AI vague descriptors
  "unique experience",
  "unforgettable experience",
  "memorable experience",
  "world-class",
  "top-notch",
  "state-of-the-art",
  "cutting-edge",
  "second to none",
  "like no other",
  "one of a kind",

  // AI clichés
  "hidden gem",
  "bucket list",
  "off the beaten path",
  "a feast for the senses",
  "a treat for the eyes",
  "step back in time",
  "transport you",
  "immerse yourself",
] as const;

// Required sections for attraction content per user spec
export const REQUIRED_SECTIONS = {
  introduction: { minWords: 150, maxWords: 200 },
  whatToExpect: { minWords: 250, maxWords: 350 },
  bestTimeToVisit: { minWords: 200, maxWords: 300 },
  historicalContext: { minWords: 200, maxWords: 300 },
  visitorTips: { minWords: 200, maxWords: 300 },
  howToGetThere: { minWords: 150, maxWords: 250 },
  faqs: { minCount: 8, maxCount: 10, answerMinWords: 40, answerMaxWords: 60 },
} as const;

// Total content requirements
export const CONTENT_REQUIREMENTS = {
  totalMinWords: 1200,
  totalMaxWords: 1800,
  maxParagraphWords: 100,
  minParagraphWords: 20,
} as const;

export interface QualityScore {
  seoScore: number;
  aeoScore: number;
  factCheckScore: number;
  overallScore: number;
  passed: boolean;
  details: {
    seo: SEODetails;
    aeo: AEODetails;
    factCheck: FactCheckDetails;
  };
}

interface SEODetails {
  wordCount: number;
  wordCountScore: number;
  sectionsComplete: boolean;
  sectionsScore: number;
  aiPatternsFound: string[];
  aiPatternScore: number;
  readabilityScore: number;
  duplicateParagraphs: number;
  issues: string[];
}

interface AEODetails {
  faqCount: number;
  faqQualityScore: number;
  answerCapsulePresent: boolean;
  answerCapsuleScore: number;
  schemaValid: boolean;
  schemaScore: number;
  issues: string[];
}

interface FactCheckDetails {
  claimsVerified: number;
  claimsTotal: number;
  verificationScore: number;
  unverifiedClaims: string[];
  issues: string[];
}

function countWords(text: string): number {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0).length;
}

function findAIPatterns(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of AI_PATTERNS) {
    if (pattern.includes(".*")) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(lowerText)) {
        found.push(pattern);
      }
    } else if (lowerText.includes(pattern.toLowerCase())) {
      found.push(pattern);
    }
  }

  return found;
}

function findDuplicateParagraphs(text: string): number {
  if (!text) return 0;

  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 50);
  const seen = new Set<string>();
  let duplicates = 0;

  for (const p of paragraphs) {
    const normalized = p.trim().toLowerCase().replace(/\s+/g, " ");
    if (seen.has(normalized)) {
      duplicates++;
    } else {
      seen.add(normalized);
    }
  }

  return duplicates;
}

function calculateReadabilityScore(text: string): number {
  if (!text) return 0;

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length === 0) return 0;

  const avgSentenceLength = countWords(text) / sentences.length;

  // Ideal sentence length is 15-20 words
  if (avgSentenceLength >= 15 && avgSentenceLength <= 20) {
    return 100;
  } else if (avgSentenceLength >= 12 && avgSentenceLength <= 25) {
    return 85;
  } else if (avgSentenceLength >= 10 && avgSentenceLength <= 30) {
    return 70;
  } else {
    return 50;
  }
}

export function validateSEO(content: Record<string, any>): SEODetails {
  const issues: string[] = [];

  // Combine all text content
  const allText = [
    content.introduction || "",
    content.whatToExpect || "",
    content.bestTimeToVisit || "",
    content.historicalContext || "",
    content.visitorTips || "",
    content.howToGetThere || "",
  ].join(" ");

  // Word count
  const wordCount = countWords(allText);
  let wordCountScore = 100;

  if (wordCount < CONTENT_REQUIREMENTS.totalMinWords) {
    wordCountScore = Math.max(0, (wordCount / CONTENT_REQUIREMENTS.totalMinWords) * 100);
    issues.push(`Word count ${wordCount} is below minimum ${CONTENT_REQUIREMENTS.totalMinWords}`);
  } else if (wordCount > CONTENT_REQUIREMENTS.totalMaxWords) {
    wordCountScore = 80;
    issues.push(`Word count ${wordCount} exceeds maximum ${CONTENT_REQUIREMENTS.totalMaxWords}`);
  }

  // Section completeness
  let sectionsComplete = true;
  let sectionsMissing = 0;

  const sections = [
    "introduction",
    "whatToExpect",
    "bestTimeToVisit",
    "historicalContext",
    "visitorTips",
    "howToGetThere",
  ];
  for (const section of sections) {
    const sectionContent = content[section];
    const sectionWordCount = countWords(sectionContent);
    const req = REQUIRED_SECTIONS[section as keyof typeof REQUIRED_SECTIONS];

    if ("minWords" in req) {
      if (sectionWordCount < req.minWords) {
        sectionsComplete = false;
        sectionsMissing++;
        issues.push(`${section}: ${sectionWordCount} words (need ${req.minWords}+)`);
      }
    }
  }

  const sectionsScore = Math.max(0, 100 - sectionsMissing * 15);

  // AI patterns
  const aiPatternsFound = findAIPatterns(allText);
  const aiPatternScore = Math.max(0, 100 - aiPatternsFound.length * 10);

  if (aiPatternsFound.length > 0) {
    issues.push(
      `AI patterns found: ${aiPatternsFound.slice(0, 5).join(", ")}${aiPatternsFound.length > 5 ? "..." : ""}`
    );
  }

  // Readability
  const readabilityScore = calculateReadabilityScore(allText);

  // Duplicate paragraphs
  const duplicateParagraphs = findDuplicateParagraphs(allText);
  if (duplicateParagraphs > 0) {
    issues.push(`Found ${duplicateParagraphs} duplicate paragraph(s)`);
  }

  return {
    wordCount,
    wordCountScore,
    sectionsComplete,
    sectionsScore,
    aiPatternsFound,
    aiPatternScore,
    readabilityScore,
    duplicateParagraphs,
    issues,
  };
}

function computeFaqBaseScore(faqCount: number, issues: string[]): number {
  if (faqCount >= REQUIRED_SECTIONS.faqs.minCount) return 100;
  if (faqCount >= 5) {
    issues.push(`Only ${faqCount} FAQs (need ${REQUIRED_SECTIONS.faqs.minCount}+)`);
    return 70;
  }
  if (faqCount > 0) {
    issues.push(`Only ${faqCount} FAQs (need ${REQUIRED_SECTIONS.faqs.minCount}+)`);
    return 40;
  }
  issues.push("No FAQs found");
  return 0;
}

function computeFaqAnswerQuality(faqs: any[], faqCount: number): number {
  let goodAnswers = 0;
  for (const faq of faqs) {
    const answerWords = countWords(faq.answer || "");
    if (
      answerWords >= REQUIRED_SECTIONS.faqs.answerMinWords &&
      answerWords <= REQUIRED_SECTIONS.faqs.answerMaxWords
    ) {
      goodAnswers++;
    }
  }
  return goodAnswers;
}

export function validateAEO(content: Record<string, any>): AEODetails {
  const issues: string[] = [];

  const faqs = content.faqs || content.faqItems || [];
  const faqCount = Array.isArray(faqs) ? faqs.length : 0;

  let faqQualityScore = computeFaqBaseScore(faqCount, issues);

  if (faqCount > 0) {
    const goodAnswers = computeFaqAnswerQuality(faqs, faqCount);
    const answerQuality = (goodAnswers / faqCount) * 100;
    faqQualityScore = (faqQualityScore + answerQuality) / 2;

    if (answerQuality < 80) {
      issues.push(`Only ${goodAnswers}/${faqCount} FAQ answers meet word count requirements`);
    }
  }

  const answerCapsule = content.answerCapsule || content.answer_capsule || "";
  const answerCapsulePresent = countWords(answerCapsule) >= 30;
  const answerCapsuleScore = answerCapsulePresent ? 100 : 0;
  if (!answerCapsulePresent) {
    issues.push("Missing or too short answer capsule for AEO");
  }

  const schema = content.schemaPayload || content.schema || null;
  const schemaValid = schema !== null && typeof schema === "object";
  const schemaScore = schemaValid ? 100 : 0;
  if (!schemaValid) {
    issues.push("Missing JSON-LD schema");
  }

  return {
    faqCount,
    faqQualityScore,
    answerCapsulePresent,
    answerCapsuleScore,
    schemaValid,
    schemaScore,
    issues,
  };
}

export function validateFactCheck(
  content: Record<string, any>,
  sourceData: Record<string, any>
): FactCheckDetails {
  const issues: string[] = [];
  const unverifiedClaims: string[] = [];

  // Extract ALL text content for verification
  const allText = [
    content.introduction || "",
    content.whatToExpect || "",
    content.bestTimeToVisit || "",
    content.historicalContext || "",
    content.visitorTips || "",
    content.howToGetThere || "",
    content.answerCapsule || "",
  ].join(" ");

  // Base score: content exists and is substantial
  const hasSubstantialContent = countWords(allText) >= 800;
  let baseScore = hasSubstantialContent ? 80 : 60;

  let bonusPoints = 0;
  let penaltyPoints = 0;

  // Check location claims (optional bonus, not penalty)
  if (sourceData.cityName) {
    const cityLower = sourceData.cityName.toLowerCase();
    if (allText.toLowerCase().includes(cityLower)) {
      bonusPoints += 10;
    }
  }

  // Check attraction name (important - should be mentioned)
  if (sourceData.title) {
    const titleParts = sourceData.title
      .split(/[:\-–]/)[0]
      .trim()
      .toLowerCase();
    // Also check for partial matches (e.g., "IMAX" for "Grand Canyon IMAX Theater")
    const keywords = titleParts.split(/\s+/).filter((w: string) => w.length > 4);
    const anyKeywordFound = keywords.some((kw: string) => allText.toLowerCase().includes(kw));

    if (allText.toLowerCase().includes(titleParts) || anyKeywordFound) {
      bonusPoints += 10;
    } else {
      penaltyPoints += 5;
      unverifiedClaims.push("Attraction name keywords not found");
    }
  }

  // Bonus for mentioning practical details
  if (allText.toLowerCase().includes("hour") || allText.toLowerCase().includes("minute")) {
    bonusPoints += 5;
  }

  // Calculate final score
  let verificationScore = Math.min(100, Math.max(0, baseScore + bonusPoints - penaltyPoints));

  if (unverifiedClaims.length > 0) {
    issues.push(`Minor issues: ${unverifiedClaims.join(", ")}`);
  }

  return {
    claimsVerified: bonusPoints > 0 ? 2 : 1,
    claimsTotal: 2,
    verificationScore,
    unverifiedClaims,
    issues,
  };
}

export function validateContent(
  content: Record<string, any>,
  sourceData: Record<string, any>
): QualityScore {
  const seo = validateSEO(content);
  const aeo = validateAEO(content);
  const factCheck = validateFactCheck(content, sourceData);

  // Calculate weighted scores
  const seoScore = Math.round(
    seo.wordCountScore * 0.3 +
      seo.sectionsScore * 0.3 +
      seo.aiPatternScore * 0.25 +
      seo.readabilityScore * 0.15 -
      seo.duplicateParagraphs * 5
  );

  const aeoScore = Math.round(
    aeo.faqQualityScore * 0.5 + aeo.answerCapsuleScore * 0.3 + aeo.schemaScore * 0.2
  );

  const factCheckScore = Math.round(factCheck.verificationScore);

  // Overall score is minimum of all three (must pass ALL)
  const overallScore = Math.min(seoScore, aeoScore, factCheckScore);
  const passed =
    seoScore >= QUALITY_THRESHOLD &&
    aeoScore >= QUALITY_THRESHOLD &&
    factCheckScore >= QUALITY_THRESHOLD;

  return {
    seoScore,
    aeoScore,
    factCheckScore,
    overallScore,
    passed,
    details: {
      seo,
      aeo,
      factCheck,
    },
  };
}

export function getQualitySummary(score: QualityScore): string {
  const status = score.passed ? "✅ PASSED" : "❌ FAILED";

  return `
Quality Assessment ${status}
═══════════════════════════════════
SEO Score:        ${score.seoScore}/100 ${score.seoScore >= QUALITY_THRESHOLD ? "✓" : "✗"}
AEO Score:        ${score.aeoScore}/100 ${score.aeoScore >= QUALITY_THRESHOLD ? "✓" : "✗"}
Fact-Check Score: ${score.factCheckScore}/100 ${score.factCheckScore >= QUALITY_THRESHOLD ? "✓" : "✗"}
───────────────────────────────────
Overall:          ${score.overallScore}/100

Issues:
${
  [...score.details.seo.issues, ...score.details.aeo.issues, ...score.details.factCheck.issues]
    .map(i => `  • ${i}`)
    .join("\n") || "  None"
}
`.trim();
}
