#!/usr/bin/env npx tsx
/**
 * Smoke Test: Media Intelligence v2
 *
 * Usage: npx tsx scripts/smoke-test-media-intel.ts
 *
 * Exit codes:
 *   0 - All tests passed
 *   1 - Critical regression found
 */

import {
  registerAsset,
  getAsset,
  trackAssetUsage,
  scoreAsset,
  batchScanAssets,
  getOrphanedAssets,
  getAssetsMissingAlt,
  findDuplicates,
  getMediaStatsV2,
  clearCaches,
  getCacheStats,
} from '../server/media-intelligence/asset-manager';
import { scoreToGrade, assessAltTextQuality } from '../server/media-intelligence/scoring-engine';
import { generateAltText } from '../server/media-intelligence/alt-generator';

// Enable feature for testing
process.env.ENABLE_MEDIA_INTELLIGENCE = 'true';
process.env.ENABLE_MEDIA_ALT_AI = 'true';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function log(message: string, color: string = RESET): void {
  console.log(`${color}${message}${RESET}`);
}

function assert(condition: boolean, message: string): void {
  if (condition) {
    log(`  ✓ ${message}`, GREEN);
    passed++;
  } else {
    log(`  ✗ ${message}`, RED);
    failed++;
  }
}

async function runTests(): Promise<void> {
  log('\n═══════════════════════════════════════════');
  log('  MEDIA INTELLIGENCE v2 - SMOKE TEST');
  log('═══════════════════════════════════════════\n');

  // Clear any previous state
  clearCaches();

  // Test 1: Asset Registration
  log('1. Asset Registration', YELLOW);
  const asset1 = registerAsset('smoke-1', 'https://example.com/beach-sunset.jpg', 'beach-sunset.jpg', {
    format: 'jpg',
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    fileSize: 450000,
    altText: 'A beautiful sunset over the beach with orange and pink clouds',
  });
  assert(asset1 !== undefined, 'Asset registered successfully');
  assert(asset1.classifier.altTextQuality === 'good', 'Alt text quality assessed correctly');
  assert(asset1.classifier.isOrphan === true, 'New asset marked as orphan');

  // Test 2: Asset Usage Tracking
  log('\n2. Asset Usage Tracking', YELLOW);
  trackAssetUsage('smoke-1', 'content-123', 'heroImage', 'en', 'hero-block', 0);
  const trackedAsset = getAsset('smoke-1');
  assert(trackedAsset!.classifier.isOrphan === false, 'Asset no longer orphan after usage');
  assert(trackedAsset!.linkage.primaryPlacement === 'hero', 'Placement role detected');
  assert(trackedAsset!.linkage.localeCoverage.includes('en'), 'Locale coverage tracked');

  // Test 3: Scoring Determinism
  log('\n3. Scoring Determinism', YELLOW);
  const score1 = scoreAsset('smoke-1');
  const score2 = scoreAsset('smoke-1');
  assert(score1!.score === score2!.score, 'Scoring is deterministic');
  assert(score1!.score >= 0 && score1!.score <= 100, 'Score within valid range');
  assert(['A', 'B', 'C', 'D', 'F'].includes(score1!.grade), 'Grade is valid');

  // Test 4: Grade Calculation
  log('\n4. Grade Calculation', YELLOW);
  assert(scoreToGrade(95) === 'A', 'Score 95 = Grade A');
  assert(scoreToGrade(85) === 'B', 'Score 85 = Grade B');
  assert(scoreToGrade(75) === 'C', 'Score 75 = Grade C');
  assert(scoreToGrade(65) === 'D', 'Score 65 = Grade D');
  assert(scoreToGrade(50) === 'F', 'Score 50 = Grade F');

  // Test 5: Alt Text Quality Assessment
  log('\n5. Alt Text Quality Assessment', YELLOW);
  assert(assessAltTextQuality(undefined) === 'missing', 'Undefined alt = missing');
  assert(assessAltTextQuality('') === 'missing', 'Empty alt = missing');
  assert(assessAltTextQuality('image') === 'poor', 'Generic "image" = poor');
  assert(assessAltTextQuality('A detailed description of the scene') === 'good', 'Descriptive alt = good');

  // Test 6: Orphan Detection
  log('\n6. Orphan Detection', YELLOW);
  registerAsset('smoke-orphan', 'https://example.com/unused.jpg', 'unused.jpg', {
    format: 'jpg',
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    fileSize: 100000,
  });
  const orphans = getOrphanedAssets();
  assert(orphans.some(o => o.id === 'smoke-orphan'), 'Orphan asset detected');
  assert(!orphans.some(o => o.id === 'smoke-1'), 'Used asset not marked as orphan');

  // Test 7: Missing Alt Detection
  log('\n7. Missing Alt Detection', YELLOW);
  registerAsset('smoke-no-alt', 'https://example.com/no-alt.jpg', 'no-alt.jpg', {
    format: 'jpg',
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    fileSize: 100000,
  });
  const missingAlt = getAssetsMissingAlt();
  assert(missingAlt.some(a => a.id === 'smoke-no-alt'), 'Asset without alt detected');
  assert(!missingAlt.some(a => a.id === 'smoke-1'), 'Asset with alt not in missing list');

  // Test 8: Duplicate Detection
  log('\n8. Duplicate Detection', YELLOW);
  registerAsset('smoke-dup-1', 'https://example.com/dup1.jpg', 'dup1.jpg', {
    format: 'jpg',
    mimeType: 'image/jpeg',
    width: 1280,
    height: 720,
    fileSize: 250000,
  });
  registerAsset('smoke-dup-2', 'https://example.com/dup2.jpg', 'dup2.jpg', {
    format: 'jpg',
    mimeType: 'image/jpeg',
    width: 1280,
    height: 720,
    fileSize: 250000,
  });
  const duplicates = findDuplicates();
  const hasDupPair = duplicates.some(d =>
    d.assetIds.includes('smoke-dup-1') && d.assetIds.includes('smoke-dup-2')
  );
  assert(hasDupPair, 'Duplicate pair detected by hash');

  // Test 9: Batch Scanning
  log('\n9. Batch Scanning', YELLOW);
  const batchResult = batchScanAssets({ limit: 10 });
  assert(batchResult.scanned > 0, 'Batch scan processed assets');
  assert(batchResult.results.length > 0, 'Batch scan returned results');
  assert(batchResult.failed === 0, 'No failures in batch scan');

  // Test 10: Bounded Cache
  log('\n10. Bounded Cache', YELLOW);
  const cacheStats = getCacheStats();
  assert(cacheStats.assets.size > 0, 'Cache has assets');
  assert(cacheStats.assets.maxSize > 0, 'Cache has max size limit');
  assert(cacheStats.assets.size <= cacheStats.assets.maxSize, 'Cache respects max size');

  // Test 11: Stats Generation
  log('\n11. Stats Generation', YELLOW);
  const stats = getMediaStatsV2();
  assert(stats.totalAssets > 0, 'Stats count total assets');
  assert(stats.scannedAssets >= 0, 'Stats count scanned assets');
  assert(typeof stats.averageScore === 'number', 'Stats include average score');
  assert(stats.orphanedAssets >= 0, 'Stats count orphaned assets');

  // Test 12: Alt Text Generation
  log('\n12. Alt Text Generation', YELLOW);
  const altResult = await generateAltText('smoke-1', { useAI: false });
  assert(!altResult.rateLimited, 'Alt generation not rate limited');
  assert(altResult.suggestions.length >= 0, 'Alt generation returns suggestions array');

  // Summary
  log('\n═══════════════════════════════════════════');
  log('  SMOKE TEST SUMMARY');
  log('═══════════════════════════════════════════');
  log(`  Passed: ${passed}`, GREEN);
  if (failed > 0) {
    log(`  Failed: ${failed}`, RED);
  }
  log('═══════════════════════════════════════════\n');

  // Clean up
  clearCaches();
}

// Run and exit with appropriate code
runTests()
  .then(() => {
    if (failed > 0) {
      log('CRITICAL: Smoke test failed with regressions!', RED);
      process.exit(1);
    } else {
      log('All smoke tests passed!', GREEN);
      process.exit(0);
    }
  })
  .catch((err) => {
    log(`CRITICAL: Smoke test threw error: ${err}`, RED);
    process.exit(1);
  });
