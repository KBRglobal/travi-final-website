/**
 * Newsletter A/B Testing
 * Test subject lines, content, and send times for optimal engagement
 */

import { db } from "../db";
import {
  newsletterAbTests,
  campaignEvents,
  type NewsletterAbTest,
  type InsertNewsletterAbTest,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

// ============================================================================
// A/B TEST CRUD
// ============================================================================

/**
 * Create a new A/B test
 */
export async function createAbTest(
  data: Omit<InsertNewsletterAbTest, "statsA" | "statsB">
): Promise<NewsletterAbTest> {
  const [test] = await db
    .insert(newsletterAbTests)
    .values({
      ...data,
      statsA: { sent: 0, opened: 0, clicked: 0 },
      statsB: { sent: 0, opened: 0, clicked: 0 },
    } as any)
    .returning();
  
  return test;
}

/**
 * Get all A/B tests
 */
export async function getAbTests(): Promise<NewsletterAbTest[]> {
  return db
    .select()
    .from(newsletterAbTests)
    .orderBy(desc(newsletterAbTests.createdAt));
}

/**
 * Get A/B test by ID
 */
export async function getAbTest(testId: string): Promise<NewsletterAbTest | null> {
  const [test] = await db
    .select()
    .from(newsletterAbTests)
    .where(eq(newsletterAbTests.id, testId))
    .limit(1);
  
  return test || null;
}

/**
 * Update A/B test
 */
export async function updateAbTest(
  testId: string,
  data: Partial<InsertNewsletterAbTest>
): Promise<NewsletterAbTest | null> {
  const [updated] = await db
    .update(newsletterAbTests)
    .set(data)
    .where(eq(newsletterAbTests.id, testId))
    .returning();
  
  return updated || null;
}

/**
 * Delete A/B test
 */
export async function deleteAbTest(testId: string): Promise<boolean> {
  const result = await db
    .delete(newsletterAbTests)
    .where(eq(newsletterAbTests.id, testId));
  
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// TEST EXECUTION
// ============================================================================

/**
 * Determine which variant a subscriber should receive
 */
export function getVariantForSubscriber(
  subscriberId: string,
  splitPercentage: number
): "a" | "b" {
  // Use hash of subscriber ID to consistently assign variant
  const hash = subscriberId.split("").reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return (hash % 100) < splitPercentage ? "a" : "b";
}

/**
 * Record A/B test send
 */
export async function recordSend(
  testId: string,
  variant: "a" | "b"
): Promise<void> {
  const test = await getAbTest(testId);
  if (!test) return;
  
  const stats = variant === "a" ? test.statsA : test.statsB;
  const updatedStats = { ...stats, sent: stats.sent + 1 };
  
  await db
    .update(newsletterAbTests)
    .set((variant === "a" ? { statsA: updatedStats } : { statsB: updatedStats }) as any)
    .where(eq(newsletterAbTests.id, testId));
}

/**
 * Record A/B test open
 */
export async function recordOpen(
  testId: string,
  variant: "a" | "b"
): Promise<void> {
  const test = await getAbTest(testId);
  if (!test) return;
  
  const stats = variant === "a" ? test.statsA : test.statsB;
  const updatedStats = { ...stats, opened: stats.opened + 1 };
  
  await db
    .update(newsletterAbTests)
    .set((variant === "a" ? { statsA: updatedStats } : { statsB: updatedStats }) as any)
    .where(eq(newsletterAbTests.id, testId));
}

/**
 * Record A/B test click
 */
export async function recordClick(
  testId: string,
  variant: "a" | "b"
): Promise<void> {
  const test = await getAbTest(testId);
  if (!test) return;
  
  const stats = variant === "a" ? test.statsA : test.statsB;
  const updatedStats = { ...stats, clicked: stats.clicked + 1 };
  
  await db
    .update(newsletterAbTests)
    .set((variant === "a" ? { statsA: updatedStats } : { statsB: updatedStats }) as any)
    .where(eq(newsletterAbTests.id, testId));
}

// ============================================================================
// WINNER DETERMINATION
// ============================================================================

/**
 * Calculate winner based on metric
 */
export async function calculateWinner(testId: string): Promise<"a" | "b" | null> {
  const test = await getAbTest(testId);
  if (!test || test.status !== "running") return null;
  
  const statsA = test.statsA;
  const statsB = test.statsB;
  
  // Need minimum sample size
  if (statsA.sent < 100 || statsB.sent < 100) return null;
  
  let rateA = 0;
  let rateB = 0;
  
  // Calculate rates based on winner metric
  switch (test.winnerMetric) {
    case "open_rate":
      rateA = statsA.sent > 0 ? (statsA.opened / statsA.sent) * 100 : 0;
      rateB = statsB.sent > 0 ? (statsB.opened / statsB.sent) * 100 : 0;
      break;
    case "click_rate":
      rateA = statsA.sent > 0 ? (statsA.clicked / statsA.sent) * 100 : 0;
      rateB = statsB.sent > 0 ? (statsB.clicked / statsB.sent) * 100 : 0;
      break;
  }
  
  // Need statistically significant difference (5% minimum)
  if (Math.abs(rateA - rateB) < 5) return null;
  
  return rateA > rateB ? "a" : "b";
}

/**
 * Auto-select winner for test
 */
export async function autoSelectWinner(testId: string): Promise<boolean> {
  const winner = await calculateWinner(testId);
  if (!winner) return false;
  
  await db
    .update(newsletterAbTests)
    .set({
      winnerId: winner,
      status: "completed",
      completedAt: new Date(),
    } as any)
    .where(eq(newsletterAbTests.id, testId));
  
  return true;
}

/**
 * Get A/B test results
 */
export async function getTestResults(testId: string) {
  const test = await getAbTest(testId);
  if (!test) return null;
  
  const statsA = test.statsA;
  const statsB = test.statsB;
  
  const openRateA = statsA.sent > 0 ? (statsA.opened / statsA.sent) * 100 : 0;
  const openRateB = statsB.sent > 0 ? (statsB.opened / statsB.sent) * 100 : 0;
  
  const clickRateA = statsA.sent > 0 ? (statsA.clicked / statsA.sent) * 100 : 0;
  const clickRateB = statsB.sent > 0 ? (statsB.clicked / statsB.sent) * 100 : 0;
  
  return {
    test,
    variantA: {
      stats: statsA,
      openRate: openRateA.toFixed(2),
      clickRate: clickRateA.toFixed(2),
    },
    variantB: {
      stats: statsB,
      openRate: openRateB.toFixed(2),
      clickRate: clickRateB.toFixed(2),
    },
    winner: test.winnerId,
    isComplete: test.status === "completed",
  };
}
