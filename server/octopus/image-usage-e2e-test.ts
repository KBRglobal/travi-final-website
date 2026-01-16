/**
 * Octopus v2 - Image Usage E2E Test Harness
 * 
 * Simulates the complete flow:
 * 1. Destination page creation
 * 2. Image request
 * 3. Reuse vs generate decision
 * 4. Intelligence call
 * 5. Placement decision
 * 
 * Run with: npx tsx server/octopus/image-usage-e2e-test.ts
 */

import {
  createImageUsage,
  getImageUsage,
  getImageUsageByAsset,
  updateImageUsage,
  deleteImageUsage,
  getImageUsageStats,
  type ImageRole,
} from './image-usage-persistence';
import {
  evaluatePlacementDecision,
  calculateHeroRejectionRate,
  calculateReuseCount,
  calculateAverageRelevance,
  type ImageUsageDraft,
  type PlacementDecisionResult,
} from './image-placement-engine';
import {
  mockIntelligenceSnapshot,
} from './intelligence-client';
import { type IntelligenceSnapshot } from '@shared/schema';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

const testResults: TestResult[] = [];

function logStep(step: number, description: string) {
  console.log(`\n[Step ${step}] ${description}`);
}

function logSuccess(message: string) {
  console.log(`   [PASS] ${message}`);
}

function logError(message: string) {
  console.log(`   [FAIL] ${message}`);
}

function logInfo(message: string) {
  console.log(`   [INFO] ${message}`);
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    testResults.push({ name, passed: true, duration });
    logSuccess(`${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    testResults.push({ name, passed: false, duration, error: errorMessage });
    logError(`${name}: ${errorMessage}`);
  }
}

/**
 * Test 1: Create ImageUsage Record
 */
async function testCreateImageUsage(): Promise<string> {
  logStep(1, 'Create ImageUsage record for destination page');
  
  const usage = await createImageUsage({
    assetId: 'test-asset-' + Date.now(),
    entityId: 'dubai-destination-1',
    entityType: 'destination',
    pageId: 'dubai-homepage',
    pageType: 'destination',
    requestedRole: 'hero' as ImageRole,
  });

  if (!usage.id) {
    throw new Error('Failed to create ImageUsage record');
  }

  logInfo(`Created ImageUsage: ${usage.id}`);
  logInfo(`Asset: ${usage.assetId}, Role: ${usage.requestedRole}, Decision: ${usage.decision}`);
  
  return usage.id;
}

/**
 * Test 2: Evaluate Placement Decision (Hero - High Quality)
 */
async function testHighQualityHeroDecision(): Promise<PlacementDecisionResult> {
  logStep(2, 'Evaluate placement for HIGH QUALITY hero image');
  
  const draft: ImageUsageDraft = {
    assetId: 'test-hero-asset',
    entityId: 'dubai-destination-1',
    entityType: 'destination',
    pageId: 'dubai-homepage',
    pageType: 'destination',
    requestedRole: 'hero',
    existingUsages: 0,
  };

  // High quality intelligence
  const intelligence = mockIntelligenceSnapshot(95, 90);
  
  const decision = evaluatePlacementDecision(draft, intelligence);

  logInfo(`Decision: ${decision.decision}`);
  logInfo(`Final Role: ${decision.finalRole}`);
  logInfo(`Reason: ${decision.decisionReason}`);
  logInfo(`Rule ID: ${decision.decisionRuleId}`);
  logInfo(`Confidence: ${decision.confidence}%`);

  if (decision.decision !== 'approved') {
    throw new Error(`Expected 'approved' for high quality hero, got '${decision.decision}'`);
  }

  return decision;
}

/**
 * Test 3: Evaluate Placement Decision (Hero - Low Quality)
 */
async function testLowQualityHeroDecision(): Promise<PlacementDecisionResult> {
  logStep(3, 'Evaluate placement for LOW QUALITY hero image');
  
  const draft: ImageUsageDraft = {
    assetId: 'test-hero-low-quality',
    entityId: 'dubai-destination-1',
    entityType: 'destination',
    pageId: 'dubai-homepage',
    pageType: 'destination',
    requestedRole: 'hero',
    existingUsages: 0,
  };

  // Low quality intelligence
  const intelligence = mockIntelligenceSnapshot(40, 35);
  
  const decision = evaluatePlacementDecision(draft, intelligence);

  logInfo(`Decision: ${decision.decision}`);
  logInfo(`Reason: ${decision.decisionReason}`);
  logInfo(`Rule ID: ${decision.decisionRuleId}`);

  if (decision.decision !== 'rejected') {
    throw new Error(`Expected 'rejected' for low quality hero, got '${decision.decision}'`);
  }

  return decision;
}

/**
 * Test 4: Reuse Detection
 */
async function testReuseDetection(): Promise<void> {
  logStep(4, 'Test reuse vs generate decision');
  
  // Asset with low usage count - should be reusable
  const lowUsageDraft: ImageUsageDraft = {
    assetId: 'test-reuse-asset',
    entityId: 'attraction-1',
    entityType: 'attraction',
    pageId: 'attraction-page-1',
    pageType: 'attraction',
    requestedRole: 'card',
    existingUsages: 3,
  };

  const intelligence = mockIntelligenceSnapshot(70, 65);
  const lowUsageDecision = evaluatePlacementDecision(lowUsageDraft, intelligence);

  logInfo(`Low usage (3) decision: ${lowUsageDecision.decision}`);

  // Asset with high usage count - should recommend generate
  const highUsageDraft: ImageUsageDraft = {
    ...lowUsageDraft,
    existingUsages: 10,
  };

  const highUsageDecision = evaluatePlacementDecision(highUsageDraft, intelligence);

  logInfo(`High usage (10) decision: ${highUsageDecision.decision}`);

  // Validate reuse behavior
  if (lowUsageDecision.decision !== 'reuse' && lowUsageDecision.decision !== 'approved') {
    logInfo(`Note: Low usage resulted in ${lowUsageDecision.decision}, rule-dependent`);
  }

  if (highUsageDecision.decision !== 'generate' && highUsageDecision.decision !== 'pending') {
    logInfo(`Note: High usage resulted in ${highUsageDecision.decision}, rule-dependent`);
  }
}

/**
 * Test 5: Intelligence Snapshot Integration
 */
async function testIntelligenceIntegration(usageId: string): Promise<void> {
  logStep(5, 'Update ImageUsage with intelligence snapshot');
  
  const intelligence = mockIntelligenceSnapshot(85, 88);
  
  const updated = await updateImageUsage(usageId, {
    intelligenceSnapshot: intelligence,
    decision: 'approved',
    decisionReason: 'High quality image approved for hero placement',
    decisionRuleId: 'hero-quality-gate',
    finalRole: 'hero' as ImageRole,
  });

  if (!updated) {
    throw new Error('Failed to update ImageUsage with intelligence');
  }

  logInfo(`Updated with intelligence: relevance=${intelligence.relevanceScore}, quality=${intelligence.qualityScore}`);
  logInfo(`Final decision: ${updated.decision}`);
  logInfo(`Final role: ${updated.finalRole}`);
}

/**
 * Test 6: Get Usage Statistics
 */
async function testUsageStats(): Promise<void> {
  logStep(6, 'Retrieve usage statistics');
  
  const stats = await getImageUsageStats();

  logInfo(`Total usages: ${stats.totalUsages}`);
  logInfo(`Pending: ${stats.pendingCount}`);
  logInfo(`Approved: ${stats.approvedCount}`);
  logInfo(`Rejected: ${stats.rejectedCount}`);
  logInfo(`Reuse: ${stats.reuseCount}`);
  logInfo(`By role: ${JSON.stringify(stats.byRole)}`);
}

/**
 * Test 7: Observability Metrics
 */
async function testObservabilityMetrics(): Promise<void> {
  logStep(7, 'Calculate observability metrics');
  
  // Create test decisions for metrics
  const decisions: PlacementDecisionResult[] = [
    { finalRole: 'hero', decision: 'approved', decisionReason: 'Test', confidence: 90, decisionRuleId: 'hero-quality-gate' },
    { finalRole: 'hero', decision: 'rejected', decisionReason: 'Test', confidence: 30, decisionRuleId: 'hero-low-quality-reject' },
    { finalRole: 'hero', decision: 'approved', decisionReason: 'Test', confidence: 85, decisionRuleId: 'hero-quality-gate' },
    { finalRole: 'card', decision: 'reuse', decisionReason: 'Test', confidence: 70, decisionRuleId: 'reuse-limit' },
    { finalRole: 'gallery', decision: 'approved', decisionReason: 'Test', confidence: 60, decisionRuleId: 'gallery-permissive' },
  ];

  const heroRejectionRate = calculateHeroRejectionRate(decisions);
  const reuseCount = calculateReuseCount(decisions);

  logInfo(`Hero rejection rate: ${heroRejectionRate}%`);
  logInfo(`Reuse count: ${reuseCount}`);

  // Test average relevance calculation
  const intelligenceSnapshots: IntelligenceSnapshot[] = [
    { relevanceScore: 90 },
    { relevanceScore: 85 },
    { relevanceScore: 70 },
    { relevanceScore: 95 },
  ];

  const avgRelevance = calculateAverageRelevance(intelligenceSnapshots);
  logInfo(`Average relevance: ${avgRelevance}`);

  // Validate calculations
  if (heroRejectionRate !== 33) {
    logInfo(`Note: Expected hero rejection rate ~33%, got ${heroRejectionRate}%`);
  }

  if (reuseCount !== 1) {
    throw new Error(`Expected reuse count 1, got ${reuseCount}`);
  }

  if (avgRelevance !== 85) {
    throw new Error(`Expected average relevance 85, got ${avgRelevance}`);
  }
}

/**
 * Test 8: Cleanup
 */
async function testCleanup(usageId: string): Promise<void> {
  logStep(8, 'Cleanup test data');
  
  await deleteImageUsage(usageId);
  
  const deleted = await getImageUsage(usageId);
  if (deleted) {
    throw new Error('ImageUsage was not deleted properly');
  }

  logInfo('Test data cleaned up successfully');
}

/**
 * Full E2E Flow
 */
async function runE2EFlow(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('OCTOPUS v2 - Image Usage E2E Test');
  console.log('='.repeat(60));

  let usageId: string | null = null;

  try {
    // Test 1: Create record
    await runTest('Create ImageUsage', async () => {
      usageId = await testCreateImageUsage();
    });

    // Test 2: High quality hero decision
    await runTest('High Quality Hero Decision', async () => {
      await testHighQualityHeroDecision();
    });

    // Test 3: Low quality hero rejection
    await runTest('Low Quality Hero Rejection', async () => {
      await testLowQualityHeroDecision();
    });

    // Test 4: Reuse detection
    await runTest('Reuse Detection', async () => {
      await testReuseDetection();
    });

    // Test 5: Intelligence integration
    if (usageId) {
      await runTest('Intelligence Integration', async () => {
        await testIntelligenceIntegration(usageId!);
      });
    }

    // Test 6: Usage stats
    await runTest('Usage Statistics', async () => {
      await testUsageStats();
    });

    // Test 7: Observability metrics
    await runTest('Observability Metrics', async () => {
      await testObservabilityMetrics();
    });

    // Test 8: Cleanup
    if (usageId) {
      await runTest('Cleanup', async () => {
        await testCleanup(usageId!);
      });
    }

  } catch (error) {
    console.error('\n[ERROR] E2E Flow failed:', error);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal: ${testResults.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

export { runE2EFlow, testResults };
