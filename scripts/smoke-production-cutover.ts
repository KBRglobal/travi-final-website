#!/usr/bin/env npx ts-node
/**
 * Smoke Test for Production Cutover & Continuous Readiness System
 *
 * Tests all 5 features:
 * 1. Production Cutover Engine
 * 2. Continuous Readiness Monitor
 * 3. Blast Radius & Impact Simulator
 * 4. Go-Live Timeline & Forensics
 * 5. Executive Go-Live Report
 *
 * Run: npx ts-node scripts/smoke-production-cutover.ts
 */

// Enable all features
process.env.ENABLE_PRODUCTION_CUTOVER = 'true';
process.env.ENABLE_CONTINUOUS_READINESS = 'true';
process.env.ENABLE_BLAST_RADIUS = 'true';
process.env.ENABLE_GO_LIVE_FORENSICS = 'true';
process.env.ENABLE_EXECUTIVE_REPORT = 'true';

async function smokeTest() {
  console.log('='.repeat(60));
  console.log('Production Cutover & Continuous Readiness - Smoke Test');
  console.log('='.repeat(60));
  console.log();

  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error}`);
      failed++;
    }
  };

  // =========================================================================
  // Feature 1: Production Cutover Engine
  // =========================================================================
  console.log('\n--- Feature 1: Production Cutover Engine ---\n');

  await test('Import production-cutover module', async () => {
    const mod = await import('../server/production-cutover');
    if (!mod.isProductionCutoverEnabled) throw new Error('Missing isProductionCutoverEnabled');
    if (!mod.evaluateCutover) throw new Error('Missing evaluateCutover');
  });

  await test('Check cutover feature flag', async () => {
    const { isProductionCutoverEnabled } = await import('../server/production-cutover');
    if (!isProductionCutoverEnabled()) throw new Error('Should be enabled');
  });

  await test('Run dry-run evaluation', async () => {
    const { dryRun } = await import('../server/production-cutover');
    const result = await dryRun();
    if (!result.decision) throw new Error('Missing decision');
    if (!['CAN_GO_LIVE', 'WARN', 'BLOCK'].includes(result.decision)) {
      throw new Error(`Invalid decision: ${result.decision}`);
    }
    console.log(`    Decision: ${result.decision}, Score: ${result.score}`);
  });

  await test('Run live evaluation', async () => {
    const { evaluateCutover } = await import('../server/production-cutover');
    const result = await evaluateCutover('live');
    if (!result.signature) throw new Error('Missing signature');
    if (!result.snapshot) throw new Error('Missing snapshot');
  });

  await test('Create time-boxed approval', async () => {
    const { createApproval, getActiveApproval } = await import('../server/production-cutover');
    const approval = createApproval('test@smoke.com', 'Smoke test approval');
    if (!approval.id) throw new Error('Missing approval ID');
    const active = getActiveApproval();
    if (!active) throw new Error('Approval not active');
  });

  await test('Create emergency override', async () => {
    const { createOverride, getActiveOverride, clearOverride } = await import('../server/production-cutover');
    const override = createOverride('ops@smoke.com', 'CAN_GO_LIVE', 'Smoke test override');
    if (!override.id) throw new Error('Missing override ID');
    if (!override.logged) throw new Error('Override not logged');
    clearOverride();
  });

  // =========================================================================
  // Feature 2: Continuous Readiness Monitor
  // =========================================================================
  console.log('\n--- Feature 2: Continuous Readiness Monitor ---\n');

  await test('Import continuous-readiness module', async () => {
    const mod = await import('../server/continuous-readiness');
    if (!mod.isContinuousReadinessEnabled) throw new Error('Missing isContinuousReadinessEnabled');
    if (!mod.checkNow) throw new Error('Missing checkNow');
  });

  await test('Check readiness feature flag', async () => {
    const { isContinuousReadinessEnabled } = await import('../server/continuous-readiness');
    if (!isContinuousReadinessEnabled()) throw new Error('Should be enabled');
  });

  await test('Run immediate readiness check', async () => {
    const { checkNow } = await import('../server/continuous-readiness');
    const snapshot = await checkNow();
    if (!snapshot.id) throw new Error('Missing snapshot ID');
    if (!['READY', 'DEGRADED', 'NOT_READY', 'UNKNOWN'].includes(snapshot.state)) {
      throw new Error(`Invalid state: ${snapshot.state}`);
    }
    console.log(`    State: ${snapshot.state}, Score: ${snapshot.overallScore}`);
  });

  await test('Get monitor status', async () => {
    const { getMonitorStatus } = await import('../server/continuous-readiness');
    const status = getMonitorStatus();
    if (typeof status.enabled !== 'boolean') throw new Error('Missing enabled');
    if (typeof status.running !== 'boolean') throw new Error('Missing running');
  });

  await test('Get MTTR stats', async () => {
    const { getMTTRStats } = await import('../server/continuous-readiness');
    const stats = getMTTRStats();
    if (typeof stats.average !== 'number') throw new Error('Missing average');
    if (typeof stats.sampleCount !== 'number') throw new Error('Missing sampleCount');
  });

  // =========================================================================
  // Feature 3: Blast Radius & Impact Simulator
  // =========================================================================
  console.log('\n--- Feature 3: Blast Radius & Impact Simulator ---\n');

  await test('Import blast-radius module', async () => {
    const mod = await import('../server/blast-radius');
    if (!mod.isBlastRadiusEnabled) throw new Error('Missing isBlastRadiusEnabled');
    if (!mod.simulateBlastRadius) throw new Error('Missing simulateBlastRadius');
  });

  await test('Check blast radius feature flag', async () => {
    const { isBlastRadiusEnabled } = await import('../server/blast-radius');
    if (!isBlastRadiusEnabled()) throw new Error('Should be enabled');
  });

  await test('Simulate feature impact', async () => {
    const { simulateBlastRadius } = await import('../server/blast-radius');
    const result = await simulateBlastRadius({ type: 'feature', id: 'checkout' });
    if (!result.id) throw new Error('Missing result ID');
    if (!result.severity) throw new Error('Missing severity');
    console.log(`    Severity: ${result.severity}, Users: ${result.metrics.usersAffected}`);
  });

  await test('Simulate locale impact', async () => {
    const { simulateBlastRadius } = await import('../server/blast-radius');
    const result = await simulateBlastRadius({ type: 'locale', id: 'en-US' });
    if (!result.breakdown.byLocale) throw new Error('Missing locale breakdown');
  });

  await test('Simulate multiple targets', async () => {
    const { simulateMultiple, compareScenarios } = await import('../server/blast-radius');
    const results = await simulateMultiple([
      { type: 'feature', id: 'search' },
      { type: 'locale', id: 'de-DE' },
    ]);
    if (results.length !== 2) throw new Error('Should have 2 results');
    const comparison = compareScenarios(results);
    if (!comparison.worstCase) throw new Error('Missing worst case');
  });

  // =========================================================================
  // Feature 4: Go-Live Timeline & Forensics
  // =========================================================================
  console.log('\n--- Feature 4: Go-Live Timeline & Forensics ---\n');

  await test('Import go-live-forensics module', async () => {
    const mod = await import('../server/go-live-forensics');
    if (!mod.isGoLiveForensicsEnabled) throw new Error('Missing isGoLiveForensicsEnabled');
    if (!mod.recordEvent) throw new Error('Missing recordEvent');
  });

  await test('Check forensics feature flag', async () => {
    const { isGoLiveForensicsEnabled } = await import('../server/go-live-forensics');
    if (!isGoLiveForensicsEnabled()) throw new Error('Should be enabled');
  });

  await test('Record forensics event', async () => {
    const { recordEvent } = await import('../server/go-live-forensics');
    const event = recordEvent('manual', 'info', 'smoke-test', 'Smoke Test Event', 'Testing');
    if (!event.id) throw new Error('Missing event ID');
    if (!event.immutable) throw new Error('Event not immutable');
    if (!event.signature) throw new Error('Missing signature');
  });

  await test('Record decision event', async () => {
    const { recordDecision } = await import('../server/go-live-forensics');
    const event = recordDecision('CAN_GO_LIVE', 'cutover', { score: 85 }, 'smoke-bot');
    if (event.type !== 'decision') throw new Error('Wrong event type');
  });

  await test('Query timeline', async () => {
    const { queryTimeline } = await import('../server/go-live-forensics');
    const result = queryTimeline({ limit: 10 });
    if (!Array.isArray(result.events)) throw new Error('Events should be array');
    console.log(`    Events found: ${result.total}`);
  });

  await test('Get forensics summary', async () => {
    const { getSummary } = await import('../server/go-live-forensics');
    const summary = getSummary();
    if (typeof summary.totalEvents !== 'number') throw new Error('Missing totalEvents');
    if (!summary.byType) throw new Error('Missing byType');
  });

  // =========================================================================
  // Feature 5: Executive Go-Live Report
  // =========================================================================
  console.log('\n--- Feature 5: Executive Go-Live Report ---\n');

  await test('Import executive report module', async () => {
    const mod = await import('../server/executive/go-live-report');
    if (!mod.isExecutiveReportEnabled) throw new Error('Missing isExecutiveReportEnabled');
    if (!mod.generateReport) throw new Error('Missing generateReport');
  });

  await test('Check executive report feature flag', async () => {
    const { isExecutiveReportEnabled } = await import('../server/executive/go-live-report');
    if (!isExecutiveReportEnabled()) throw new Error('Should be enabled');
  });

  await test('Generate executive report', async () => {
    const { generateReport } = await import('../server/executive/go-live-report');
    const report = await generateReport('json', 'smoke-test@exec.com');
    if (!report.id) throw new Error('Missing report ID');
    if (!report.summary.recommendation) throw new Error('Missing recommendation');
    console.log(`    Recommendation: ${report.summary.recommendation} (${report.summary.confidence})`);
    console.log(`    Overall Score: ${report.scorecard.overall}`);
  });

  await test('Generate markdown report', async () => {
    const { generateReport, toMarkdown, clearCache } = await import('../server/executive/go-live-report');
    clearCache();
    const report = await generateReport('markdown');
    const md = toMarkdown(report);
    if (!md.includes('# Go-Live Report')) throw new Error('Invalid markdown');
  });

  await test('Get report status', async () => {
    const { getStatus } = await import('../server/executive/go-live-report');
    const status = getStatus();
    if (typeof status.enabled !== 'boolean') throw new Error('Missing enabled');
    if (typeof status.reportsGenerated !== 'number') throw new Error('Missing reportsGenerated');
  });

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

smokeTest().catch(err => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
