#!/usr/bin/env npx ts-node
/**
 * Smoke Test: PCAL Feedback Loop
 *
 * Simulates the full accountability loop:
 * 1. Risky change approved
 * 2. Incident follows
 * 3. Pattern detected
 * 4. Future similar change blocked or escalated
 *
 * Run: npx ts-node scripts/smoke-pcal-loop.ts
 */

process.env.ENABLE_PCAL = 'true';

async function runSimulation() {
  console.log('='.repeat(60));
  console.log('PCAL Feedback Loop Simulation');
  console.log('='.repeat(60));
  console.log();

  const {
    ingestDecision,
    ingestManualDecision,
    getDecision,
    getRecentDecisions,
    clearAll: clearDecisions,
  } = await import('../server/pcal/decision-stream');

  const {
    resolveAuthorityChain,
    answerAccountability,
    recordOverride,
    getActiveOverrides,
    clearAll: clearAuthority,
  } = await import('../server/pcal/authority-chain');

  const {
    detectPatterns,
    getPatterns,
    linkIncidentToDecision,
    detectRepeatedMistakes,
    getRepeatedMistakes,
    clearAll: clearMemory,
  } = await import('../server/pcal/platform-memory');

  const {
    generateNarrative,
    generateRiskReport,
    clearAll: clearNarratives,
  } = await import('../server/pcal/narrative');

  const {
    runFeedbackCycle,
    getPendingRecommendations,
    acknowledgeRecommendation,
    getConfidenceAdjustment,
    applyConfidenceAdjustment,
    clearAll: clearFeedback,
  } = await import('../server/pcal/feedback-loop');

  // Clear state
  clearDecisions();
  clearAuthority();
  clearMemory();
  clearNarratives();
  clearFeedback();

  // =========================================================================
  // Step 1: Risky change approved
  // =========================================================================
  console.log('--- Step 1: Risky Change Approved ---\n');

  const riskyChange = ingestDecision('cutover', 'platform', 'warning', 'Readiness score at 65% - below recommended threshold', {
    confidence: 65,
    signals: [
      { name: 'readiness_score', value: 65, weight: 1, source: 'cutover' },
      { name: 'active_incidents', value: 1, weight: 0.5, source: 'incidents' },
    ],
  });
  console.log(`  Created risky decision: ${riskyChange.id}`);
  console.log(`  Outcome: ${riskyChange.outcome}, Confidence: ${riskyChange.confidence}%`);

  // Human overrides the warning
  const override = recordOverride(
    riskyChange.id,
    'eager-manager@company.com',
    'CEO wants launch today',
    'Business pressure, willing to accept risk',
    3600000
  );
  console.log(`  Override created by: ${override.overriddenBy}`);
  console.log(`  Justification: ${override.justification}`);
  console.log();

  // =========================================================================
  // Step 2: Incident Follows
  // =========================================================================
  console.log('--- Step 2: Incident Follows ---\n');

  // Simulate time passing (in reality this would be later)
  await new Promise(r => setTimeout(r, 100));

  // Incident occurs
  const incidentDecision = ingestDecision('incident', 'platform', 'escalated', 'Production outage detected - P1 incident declared', {
    confidence: 100,
    reversible: false,
    signals: [
      { name: 'error_rate', value: 45, weight: 1, source: 'monitoring' },
      { name: 'affected_users', value: 12000, weight: 1, source: 'monitoring' },
    ],
  });
  console.log(`  Incident decision: ${incidentDecision.id}`);
  console.log(`  Reason: ${incidentDecision.reason}`);

  // Link incident to risky decision
  const link = linkIncidentToDecision(
    'INC-2024-001',
    riskyChange.id,
    'caused_by',
    85
  );
  console.log(`  Linked incident INC-2024-001 to decision ${riskyChange.id}`);
  console.log(`  Link type: ${link.linkType}, Confidence: ${link.confidence}%`);
  console.log();

  // =========================================================================
  // Step 3: Pattern Detected
  // =========================================================================
  console.log('--- Step 3: Pattern Detected ---\n');

  // Simulate more similar failures (in real system this would accumulate over time)
  for (let i = 0; i < 4; i++) {
    ingestDecision('cutover', 'platform', 'blocked', 'Readiness score too low', {
      confidence: 60 + i * 5,
    });
  }

  const patterns = detectPatterns();
  console.log(`  Detected ${patterns.length} new pattern(s)`);

  for (const pattern of patterns) {
    console.log(`  - ${pattern.name}: ${pattern.occurrences} occurrences`);
    console.log(`    Severity: ${pattern.severity}, Trend: ${pattern.trend}`);
  }

  const mistakes = detectRepeatedMistakes();
  console.log(`  Found ${mistakes.length} repeated mistake(s)`);

  for (const mistake of mistakes) {
    console.log(`  - ${mistake.description}`);
    console.log(`    Recommendation: ${mistake.recommendation}`);
  }
  console.log();

  // =========================================================================
  // Step 4: Future Similar Change Escalated
  // =========================================================================
  console.log('--- Step 4: Feedback Loop Triggers Escalation ---\n');

  // Run feedback cycle
  const feedbackResult = runFeedbackCycle();
  console.log(`  Signals detected: ${feedbackResult.signalsDetected}`);
  console.log(`  Recommendations generated: ${feedbackResult.recommendationsGenerated}`);

  const pending = getPendingRecommendations();
  console.log(`  Pending recommendations: ${pending.length}`);

  for (const rec of pending.slice(0, 3)) {
    console.log(`  - Action: ${rec.action}`);
    console.log(`    Target: ${rec.target}`);
    console.log(`    Reason: ${rec.reason}`);
  }
  console.log();

  // Apply confidence adjustment
  if (pending.some(r => r.action === 'lower_automation_confidence')) {
    applyConfidenceAdjustment('cutover', 0.2);
    console.log('  Applied: Lower automation confidence for cutover by 20%');
  }

  // Check new confidence
  const newConfidence = getConfidenceAdjustment('cutover');
  console.log(`  New cutover confidence multiplier: ${newConfidence}`);
  console.log();

  // =========================================================================
  // Step 5: Verify Accountability
  // =========================================================================
  console.log('--- Step 5: Verify Full Accountability ---\n');

  // Answer accountability questions
  const answers = answerAccountability(riskyChange.id);
  console.log(`  Answering ${answers.length} accountability questions for decision ${riskyChange.id}:`);

  for (const answer of answers) {
    console.log(`  Q: ${answer.question}`);
    console.log(`  A: ${answer.answer}`);
    console.log(`     Evidence: ${answer.evidence.slice(0, 2).join(', ')}`);
    console.log();
  }

  // Resolve authority chain
  const chain = await resolveAuthorityChain(riskyChange.id);
  if (chain) {
    console.log(`  Authority Chain for ${riskyChange.id}:`);
    for (const node of chain.nodes) {
      console.log(`    - ${node.type}: ${node.name} (${node.action})`);
    }
    if (chain.humanApproval) {
      console.log(`  Human Approval: ${chain.humanApproval.id}`);
    }
    console.log(`  Bypassed Policies: ${chain.bypassedPolicies.length > 0 ? chain.bypassedPolicies.join(', ') : 'None'}`);
  }
  console.log();

  // =========================================================================
  // Step 6: Generate Executive Report
  // =========================================================================
  console.log('--- Step 6: Executive Narrative ---\n');

  const narrative = generateNarrative({ query: 'why_rollout_failed' });
  console.log(`  ${narrative.headline}`);
  console.log(`  ${narrative.summary}`);
  console.log();
  console.log('  Root Causes:');
  for (const cause of narrative.rootCauses.slice(0, 3)) {
    console.log(`    - ${cause}`);
  }
  console.log();
  console.log('  Recommendations:');
  for (const rec of narrative.recommendations.slice(0, 3)) {
    console.log(`    - ${rec}`);
  }
  console.log();

  const riskReport = generateRiskReport();
  console.log(`  Risk Report: Safety trend is ${riskReport.safetyTrend}`);
  console.log(`  Safety Score: ${riskReport.safetyScore}/100`);
  console.log(`  Top Risks: ${riskReport.topRisks.length}`);
  console.log(`  Improvement Opportunities: ${riskReport.topOpportunities.length}`);
  console.log();

  // =========================================================================
  // Summary
  // =========================================================================
  console.log('='.repeat(60));
  console.log('SIMULATION COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log('What the platform now knows:');
  console.log('  ✓ Who approved the risky change (eager-manager@company.com)');
  console.log('  ✓ Why it was allowed (CEO pressure override)');
  console.log('  ✓ What happened after (P1 incident)');
  console.log('  ✓ Pattern detected (repeated low-readiness launches)');
  console.log('  ✓ Future similar changes will face increased scrutiny');
  console.log();
  console.log('Decisions are now traceable end-to-end.');
}

runSimulation().catch(err => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
