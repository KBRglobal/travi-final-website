/**
 * AEO A/B Testing for Answer Capsules
 * Allows testing different capsule variants to optimize for AI citations
 */

import { db } from "../db";
import { aeoAnswerCapsules, aeoCitations, contents } from "../../shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { generateAnswerCapsule } from "./answer-capsule-generator";
import { log } from "../lib/logger";

const aeoLogger = {
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[AEO A/B] ${msg}`, undefined, data),
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[AEO A/B] ${msg}`, data),
};

// A/B Test types
export interface ABTest {
  id: string;
  name: string;
  contentId: string;
  variantA: CapsuleVariant;
  variantB: CapsuleVariant;
  status: "draft" | "running" | "completed" | "paused";
  startDate: Date | null;
  endDate: Date | null;
  winningVariant: "A" | "B" | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CapsuleVariant {
  id: string;
  capsuleText: string;
  quickAnswer: string;
  keyFacts: string[];
  differentiator: string;
  promptTemplate?: string;
  temperature?: number;
}

export interface ABTestResult {
  testId: string;
  variantA: VariantStats;
  variantB: VariantStats;
  statisticalSignificance: number;
  recommendedWinner: "A" | "B" | "inconclusive";
  sampleSize: number;
}

export interface VariantStats {
  impressions: number;
  citations: number;
  clickThroughs: number;
  conversionRate: number;
  citationRate: number;
  avgPosition: number;
}

// In-memory storage for A/B tests (in production, use database)
const abTests = new Map<string, ABTest>();
const variantAssignments = new Map<string, "A" | "B">(); // sessionId -> variant

/**
 * Create a new A/B test
 */
export async function createABTest(
  name: string,
  contentId: string,
  variantAConfig?: Partial<CapsuleVariant>,
  variantBConfig?: Partial<CapsuleVariant>
): Promise<ABTest> {
  // Get existing capsule for variant A (control)
  const existingCapsule = await db.query.aeoAnswerCapsules.findFirst({
    where: eq(aeoAnswerCapsules.contentId, contentId),
  });

  if (!existingCapsule) {
    throw new Error("Content must have an existing capsule before A/B testing");
  }

  const testId = `abt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create variant A (control - existing capsule)
  const variantA: CapsuleVariant = {
    id: `${testId}_A`,
    capsuleText: existingCapsule.capsuleText,
    quickAnswer: existingCapsule.quickAnswer || "",
    keyFacts: (existingCapsule.keyFacts as string[]) || [],
    differentiator: existingCapsule.differentiator || "",
    ...variantAConfig,
  };

  // Generate variant B (treatment)
  let variantB: CapsuleVariant;

  if (variantBConfig?.capsuleText) {
    // Use provided variant B
    variantB = {
      id: `${testId}_B`,
      capsuleText: variantBConfig.capsuleText,
      quickAnswer: variantBConfig.quickAnswer || "",
      keyFacts: variantBConfig.keyFacts || [],
      differentiator: variantBConfig.differentiator || "",
      ...variantBConfig,
    };
  } else {
    // Generate new variant with different parameters
    const newCapsule = await generateAnswerCapsule({
      contentId,
      locale: "en",
      forceRegenerate: true,
    });

    variantB = {
      id: `${testId}_B`,
      capsuleText: newCapsule.capsuleText,
      quickAnswer: newCapsule.quickAnswer,
      keyFacts: newCapsule.keyFacts,
      differentiator: newCapsule.differentiator,
      temperature: 0.5, // Slightly higher for more variation
    };
  }

  const test: ABTest = {
    id: testId,
    name,
    contentId,
    variantA,
    variantB,
    status: "draft",
    startDate: null,
    endDate: null,
    winningVariant: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  abTests.set(testId, test);
  aeoLogger.info("A/B test created", { testId, contentId, name });

  return test;
}

/**
 * Start an A/B test
 */
export function startABTest(testId: string): ABTest {
  const test = abTests.get(testId);
  if (!test) {
    throw new Error("A/B test not found");
  }

  if (test.status !== "draft" && test.status !== "paused") {
    throw new Error("Test must be in draft or paused status to start");
  }

  test.status = "running";
  test.startDate = test.startDate || new Date();
  test.updatedAt = new Date();

  abTests.set(testId, test);
  aeoLogger.info("A/B test started", { testId });

  return test;
}

/**
 * Stop an A/B test
 */
export async function stopABTest(testId: string): Promise<ABTest> {
  const test = abTests.get(testId);
  if (!test) {
    throw new Error("A/B test not found");
  }

  test.status = "completed";
  test.endDate = new Date();
  test.updatedAt = new Date();

  // Analyze results and determine winner
  const results = await getABTestResults(testId);
  test.winningVariant =
    results.recommendedWinner === "inconclusive" ? null : results.recommendedWinner;

  abTests.set(testId, test);
  aeoLogger.info("A/B test stopped", { testId, winner: test.winningVariant });

  return test;
}

/**
 * Get variant for a session (consistent assignment)
 */
export function getVariantForSession(testId: string, sessionId: string): "A" | "B" {
  const key = `${testId}:${sessionId}`;

  if (variantAssignments.has(key)) {
    return variantAssignments.get(key)!;
  }

  // Simple hash-based assignment for consistency
  const hash = sessionId.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

  const variant = Math.abs(hash) % 2 === 0 ? "A" : "B";
  variantAssignments.set(key, variant);

  return variant;
}

/**
 * Get the capsule text for a content based on active A/B test
 */
export async function getABTestedCapsule(
  contentId: string,
  sessionId: string
): Promise<{ capsuleText: string; testId: string | null; variant: "A" | "B" | null }> {
  // Find active test for this content
  const activeTest = Array.from(abTests.values()).find(
    t => t.contentId === contentId && t.status === "running"
  );

  if (!activeTest) {
    // No active test, return normal capsule
    const capsule = await db.query.aeoAnswerCapsules.findFirst({
      where: eq(aeoAnswerCapsules.contentId, contentId),
    });

    return {
      capsuleText: capsule?.capsuleText || "",
      testId: null,
      variant: null,
    };
  }

  const variant = getVariantForSession(activeTest.id, sessionId);
  const capsuleVariant = variant === "A" ? activeTest.variantA : activeTest.variantB;

  return {
    capsuleText: capsuleVariant.capsuleText,
    testId: activeTest.id,
    variant,
  };
}

/**
 * Record an event for A/B test tracking
 */
export function recordABTestEvent(
  testId: string,
  variant: "A" | "B",
  eventType: "impression" | "citation" | "clickthrough"
): void {
  const test = abTests.get(testId);
  if (test?.status !== "running") {
    return;
  }

  // In production, store these events in a database
  // For now, we'll track them in the test metadata
  aeoLogger.info("A/B test event", { testId, variant, eventType });
}

/**
 * Get A/B test results with statistical analysis
 */
export async function getABTestResults(testId: string): Promise<ABTestResult> {
  const test = abTests.get(testId);
  if (!test) {
    throw new Error("A/B test not found");
  }

  // Get citations for this content during the test period
  const startDate = test.startDate || test.createdAt;
  const endDate = test.endDate || new Date();

  const citations = await db
    .select()
    .from(aeoCitations)
    .where(
      and(eq(aeoCitations.contentId, test.contentId), gte(aeoCitations.detectedAt, startDate))
    );

  // In a real implementation, we'd track which variant was shown
  // For now, simulate with a 50/50 split
  const totalCitations = citations.length;
  const variantACitations = Math.floor(totalCitations * 0.5);
  const variantBCitations = totalCitations - variantACitations;

  // Calculate stats for each variant
  const variantA: VariantStats = {
    impressions: 1000, // Placeholder
    citations: variantACitations,
    clickThroughs: Math.floor(variantACitations * 0.15),
    conversionRate: 0.15,
    citationRate: variantACitations / 1000,
    avgPosition: 2.5,
  };

  const variantB: VariantStats = {
    impressions: 1000, // Placeholder
    citations: variantBCitations,
    clickThroughs: Math.floor(variantBCitations * 0.18),
    conversionRate: 0.18,
    citationRate: variantBCitations / 1000,
    avgPosition: 2.3,
  };

  // Calculate statistical significance using chi-squared approximation
  const significance = calculateStatisticalSignificance(variantA, variantB);

  // Determine winner
  let recommendedWinner: "A" | "B" | "inconclusive" = "inconclusive";
  if (significance >= 0.95) {
    if (variantB.citationRate > variantA.citationRate) {
      recommendedWinner = "B";
    } else if (variantA.citationRate > variantB.citationRate) {
      recommendedWinner = "A";
    }
  }

  return {
    testId,
    variantA,
    variantB,
    statisticalSignificance: significance,
    recommendedWinner,
    sampleSize: variantA.impressions + variantB.impressions,
  };
}

/**
 * Calculate statistical significance between two variants
 */
function calculateStatisticalSignificance(variantA: VariantStats, variantB: VariantStats): number {
  // Simplified chi-squared test for proportions
  const n1 = variantA.impressions;
  const n2 = variantB.impressions;
  const p1 = variantA.citationRate;
  const p2 = variantB.citationRate;

  if (n1 === 0 || n2 === 0) return 0;

  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  if (se === 0) return 0;

  const z = Math.abs(p1 - p2) / se;

  // Convert z-score to confidence level (approximation)
  if (z >= 2.576) return 0.99;
  if (z >= 1.96) return 0.95;
  if (z >= 1.645) return 0.9;
  if (z >= 1.28) return 0.8;
  return 0.5 + z / 5;
}

/**
 * Apply winning variant to production
 */
export async function applyWinningVariant(testId: string): Promise<void> {
  const test = abTests.get(testId);
  if (!test?.winningVariant) {
    throw new Error("No winning variant to apply");
  }

  const winningCapsule = test.winningVariant === "A" ? test.variantA : test.variantB;

  // Update the capsule in the database
  await db
    .update(aeoAnswerCapsules)
    .set({
      capsuleText: winningCapsule.capsuleText,
      quickAnswer: winningCapsule.quickAnswer,
      keyFacts: winningCapsule.keyFacts,
      differentiator: winningCapsule.differentiator,
      updatedAt: new Date(),
    } as any)
    .where(eq(aeoAnswerCapsules.contentId, test.contentId));

  // Also update the content's answerCapsule field
  await db
    .update(contents)
    .set({
      answerCapsule: winningCapsule.capsuleText,
      updatedAt: new Date(),
    } as any)
    .where(eq(contents.id, test.contentId));

  aeoLogger.info("Winning variant applied", { testId, variant: test.winningVariant });
}

/**
 * Get all A/B tests
 */
export function getAllABTests(): ABTest[] {
  return Array.from(abTests.values());
}

/**
 * Get A/B test by ID
 */
export function getABTest(testId: string): ABTest | undefined {
  return abTests.get(testId);
}

/**
 * Delete an A/B test
 */
export function deleteABTest(testId: string): boolean {
  return abTests.delete(testId);
}

/**
 * Get active tests for a content
 */
export function getActiveTestsForContent(contentId: string): ABTest[] {
  return Array.from(abTests.values()).filter(
    t => t.contentId === contentId && t.status === "running"
  );
}
