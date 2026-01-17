/**
 * CTA A/B Testing
 * 
 * A/B testing framework for call-to-action elements
 * - Test creation and management
 * - Variant tracking
 * - Statistical analysis
 * - Winner selection
 */

import { db } from "../db";
import { abTests, abTestVariants, abTestEvents } from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export interface ABTestConfig {
  name: string;
  description?: string;
  type: string;
  targetUrl?: string;
  trafficAllocation: number;
  variants: Array<{
    name: string;
    description?: string;
    config: Record<string, unknown>;
    isControl: boolean;
    weight: number;
  }>;
}

export interface ABTestResult {
  testId: string;
  variants: Array<{
    variantId: string;
    name: string;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number; // Click-through rate
    cvr: number; // Conversion rate
    confidence: number;
  }>;
  winner: {
    variantId: string;
    name: string;
    improvement: number;
    confidence: number;
  } | null;
}

export const ctaAbTesting = {
  /**
   * Create new A/B test
   */
  async createTest(config: ABTestConfig, userId: string): Promise<string | null> {
    try {
      // Validate variants
      if (config.variants.length < 2) {
        throw new Error("At least 2 variants required");
      }

      // Ensure exactly one control variant
      const controlCount = config.variants.filter(v => v.isControl).length;
      if (controlCount !== 1) {
        throw new Error("Exactly one control variant required");
      }

      // Validate weights sum to 100
      const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
      if (totalWeight !== 100) {
        throw new Error("Variant weights must sum to 100");
      }

      // Create test
      const test = await db
        .insert(abTests)
        .values({
          name: config.name,
          description: config.description,
          type: config.type,
          status: "draft",
          targetUrl: config.targetUrl,
          trafficAllocation: config.trafficAllocation,
          createdBy: userId,
        } as any)
        .returning();

      const testId = test[0].id;

      // Create variants
      for (const variant of config.variants) {
        await db.insert(abTestVariants).values({
          testId,
          name: variant.name,
          description: variant.description,
          config: variant.config as unknown as Record<string, unknown>,
          isControl: variant.isControl,
          weight: variant.weight,
        } as any);
      }

      return testId;
    } catch (error) {
      console.error("[A/B Testing] Error creating test:", error);
      return null;
    }
  },

  /**
   * Start a test
   */
  async startTest(testId: string): Promise<boolean> {
    try {
      await db
        .update(abTests)
        .set({
          status: "running",
          startDate: new Date(),
        } as any)
        .where(eq(abTests.id, testId));

      return true;
    } catch (error) {
      console.error("[A/B Testing] Error starting test:", error);
      return false;
    }
  },

  /**
   * Stop a test
   */
  async stopTest(testId: string): Promise<boolean> {
    try {
      await db
        .update(abTests)
        .set({
          status: "completed",
          endDate: new Date(),
        } as any)
        .where(eq(abTests.id, testId));

      return true;
    } catch (error) {
      console.error("[A/B Testing] Error stopping test:", error);
      return false;
    }
  },

  /**
   * Get variant for user (assigns user to variant)
   */
  async getVariant(
    testId: string,
    userId: string,
    sessionId: string
  ): Promise<{ variantId: string; config: Record<string, unknown> } | null> {
    try {
      // Check if test is running
      const test = await db
        .select()
        .from(abTests)
        .where(eq(abTests.id, testId))
        .limit(1);

      if (test.length === 0 || test[0].status !== "running") {
        return null;
      }

      // Get variants
      const variants = await db
        .select()
        .from(abTestVariants)
        .where(eq(abTestVariants.testId, testId));

      if (variants.length === 0) {
        return null;
      }

      // Assign variant based on weights
      // Use hash of userId/sessionId for consistent assignment
      const hash = this.hashString(userId || sessionId);
      const assignmentValue = hash % 100;

      let cumulativeWeight = 0;
      let selectedVariant = variants[0];

      for (const variant of variants) {
        cumulativeWeight += variant.weight;
        if (assignmentValue < cumulativeWeight) {
          selectedVariant = variant;
          break;
        }
      }

      // Track impression
      await this.trackEvent(testId, selectedVariant.id, "impression", userId, sessionId);

      return {
        variantId: selectedVariant.id,
        config: selectedVariant.config as Record<string, unknown>,
      };
    } catch (error) {
      console.error("[A/B Testing] Error getting variant:", error);
      return null;
    }
  },

  /**
   * Track event (impression, click, conversion)
   */
  async trackEvent(
    testId: string,
    variantId: string,
    eventType: "impression" | "click" | "conversion",
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Record event
      await db.insert(abTestEvents).values({
        testId,
        variantId,
        eventType,
        userId,
        sessionId,
        metadata: metadata as unknown as Record<string, unknown>,
      } as any);

      // Update variant stats using atomic increment
      const updateField =
        eventType === "impression"
          ? "impressions"
          : eventType === "click"
          ? "clicks"
          : "conversions";

      // Use SQL increment for atomic operation
      const variant = await db
        .select()
        .from(abTestVariants)
        .where(eq(abTestVariants.id, variantId))
        .limit(1);

      if (variant.length > 0) {
        const currentValue = variant[0][updateField] || 0;
        await db
          .update(abTestVariants)
          .set({
            [updateField]: currentValue + 1,
          })
          .where(eq(abTestVariants.id, variantId));
      }
    } catch (error) {
      console.error("[A/B Testing] Error tracking event:", error);
    }
  },

  /**
   * Get test results with statistical analysis
   */
  async getTestResults(testId: string): Promise<ABTestResult | null> {
    try {
      // Get test
      const test = await db
        .select()
        .from(abTests)
        .where(eq(abTests.id, testId))
        .limit(1);

      if (test.length === 0) {
        return null;
      }

      // Get variants with stats
      const variants = await db
        .select()
        .from(abTestVariants)
        .where(eq(abTestVariants.testId, testId));

      // Calculate metrics for each variant
      const results = variants.map(variant => {
        const impressions = variant.impressions || 0;
        const clicks = variant.clicks || 0;
        const conversions = variant.conversions || 0;

        const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
        const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;

        // Simple confidence calculation (requires more data for accuracy)
        const confidence = this.calculateConfidence(impressions, clicks, conversions);

        return {
          variantId: variant.id,
          name: variant.name,
          impressions,
          clicks,
          conversions,
          ctr,
          cvr,
          confidence,
        };
      });

      // Find control variant
      const controlVariant = variants.find(v => v.isControl);
      const control = results.find(r => r.variantId === controlVariant?.id);

      // Determine winner (if any)
      let winner: ABTestResult['winner'] = null;

      if (control && results.length > 1) {
        // Find best performing variant (excluding control)
        const candidates = results.filter(r => r.variantId !== control.variantId);
        const best = candidates.reduce((prev, curr) =>
          curr.cvr > prev.cvr ? curr : prev
        );

        // Check if improvement is significant (>10% and confidence >80%)
        const improvement = ((best.cvr - control.cvr) / control.cvr) * 100;
        if (improvement > 10 && best.confidence > 80) {
          winner = {
            variantId: best.variantId,
            name: best.name,
            improvement,
            confidence: best.confidence,
          };
        }
      }

      return {
        testId,
        variants: results,
        winner,
      };
    } catch (error) {
      console.error("[A/B Testing] Error getting test results:", error);
      return null;
    }
  },

  /**
   * Simple hash function for consistent variant assignment
   */
  hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  },

  /**
   * Calculate confidence score (simplified)
   */
  calculateConfidence(impressions: number, clicks: number, conversions: number): number {
    // Simple confidence based on sample size
    // In production, use proper statistical tests (z-test, t-test)
    if (impressions < 100) return 0;
    if (impressions < 500) return 50;
    if (impressions < 1000) return 70;
    if (impressions < 5000) return 85;
    return 95;
  },

  /**
   * List all tests
   */
  async listTests(status?: "draft" | "running" | "paused" | "completed"): Promise<Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
  }>> {
    try {
      let query = db.select().from(abTests) as any;

      if (status) {
        query = query.where(eq(abTests.status, status as any));
      }

      const tests = await query;

      return tests.map((test: any) => ({
        id: test.id,
        name: test.name,
        type: test.type,
        status: test.status,
        startDate: test.startDate,
        endDate: test.endDate,
      }));
    } catch (error) {
      console.error("[A/B Testing] Error listing tests:", error);
      return [];
    }
  },
};
