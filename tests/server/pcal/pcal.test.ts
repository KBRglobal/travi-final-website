/**
 * Tests for Platform Command & Accountability Layer (PCAL)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_PCAL', 'true');

import { isPCALEnabled, PCAL_CONFIG } from '../../../server/pcal/config';
import {
  ingestDecision,
  ingestManualDecision,
  getDecision,
  getRecentDecisions,
  getDecisionsBySource,
  getDecisionsByOutcome,
  getDecisionStats,
  clearAll as clearDecisions,
} from '../../../server/pcal/decision-stream';
import {
  resolveAuthorityChain,
  answerAccountability,
  recordApproval,
  recordOverride,
  getActiveOverrides,
  clearAll as clearAuthority,
} from '../../../server/pcal/authority-chain';
import {
  detectPatterns,
  getPatterns,
  linkIncidentToDecision,
  getRepeatedMistakes,
  captureMemorySnapshot,
  clearAll as clearMemory,
} from '../../../server/pcal/platform-memory';
import {
  generateNarrative,
  generateRiskReport,
  clearAll as clearNarratives,
} from '../../../server/pcal/narrative';
import {
  runFeedbackCycle,
  getPendingRecommendations,
  acknowledgeRecommendation,
  clearAll as clearFeedback,
} from '../../../server/pcal/feedback-loop';

describe('PCAL - Platform Command & Accountability Layer', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_PCAL', 'true');
    clearDecisions();
    clearAuthority();
    clearMemory();
    clearNarratives();
    clearFeedback();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      expect(isPCALEnabled()).toBe(true);
    });

    it('should have valid config', () => {
      expect(PCAL_CONFIG.maxDecisions).toBeGreaterThan(0);
      expect(PCAL_CONFIG.patternThreshold).toBeGreaterThan(0);
    });
  });

  describe('Phase 1: Decision Stream', () => {
    it('should ingest decision', () => {
      const decision = ingestDecision('cutover', 'platform', 'blocked', 'Test block', {
        confidence: 85,
      });

      expect(decision.id).toBeDefined();
      expect(decision.source).toBe('cutover');
      expect(decision.outcome).toBe('blocked');
      expect(decision.signature).toBeDefined();
    });

    it('should ingest manual decision', () => {
      const decision = ingestManualDecision('feature', 'approved', 'Manual approval', 'admin@test.com');

      expect(decision.authority).toBe('human');
      expect(decision.actor).toBe('admin@test.com');
    });

    it('should retrieve decision by id', () => {
      const created = ingestDecision('governor', 'feature', 'warning', 'Test warning');
      const found = getDecision(created.id);

      expect(found).not.toBeNull();
      expect(found?.id).toBe(created.id);
    });

    it('should get decisions by source', () => {
      ingestDecision('glcp', 'platform', 'approved', 'GLCP OK');
      ingestDecision('glcp', 'platform', 'warning', 'GLCP warn');
      ingestDecision('cutover', 'platform', 'blocked', 'Cutover block');

      const glcpDecisions = getDecisionsBySource('glcp');
      expect(glcpDecisions.length).toBe(2);
    });

    it('should get decisions by outcome', () => {
      ingestDecision('glcp', 'platform', 'blocked', 'Block 1');
      ingestDecision('cutover', 'platform', 'blocked', 'Block 2');
      ingestDecision('governor', 'feature', 'approved', 'Approve');

      const blocked = getDecisionsByOutcome('blocked');
      expect(blocked.length).toBe(2);
    });

    it('should calculate decision stats', () => {
      ingestDecision('glcp', 'platform', 'approved', 'OK', { confidence: 90 });
      ingestDecision('cutover', 'platform', 'blocked', 'Block', { confidence: 70 });

      const stats = getDecisionStats();
      expect(stats.total).toBe(2);
      expect(stats.avgConfidence).toBe(80);
    });
  });

  describe('Phase 2: Authority Chain', () => {
    it('should resolve authority chain', async () => {
      const decision = ingestDecision('cutover', 'platform', 'blocked', 'Test', {
        actor: 'admin@test.com',
      });

      const chain = await resolveAuthorityChain(decision.id);

      expect(chain).not.toBeNull();
      expect(chain?.decisionId).toBe(decision.id);
      expect(chain?.nodes.length).toBeGreaterThan(0);
    });

    it('should answer accountability questions', () => {
      const decision = ingestDecision('governor', 'feature', 'blocked', 'Policy violation', {
        actor: 'system',
        authority: 'policy',
      });

      const answers = answerAccountability(decision.id);

      expect(answers.length).toBeGreaterThan(0);
      expect(answers.some(a => a.question.includes('system allowed'))).toBe(true);
    });

    it('should record approval', () => {
      const approval = recordApproval('admin@test.com', 'human', 'feature:123', 'Approved after review');

      expect(approval.id).toBeDefined();
      expect(approval.approvedBy).toBe('admin@test.com');
    });

    it('should record override', () => {
      const decision = ingestDecision('governor', 'feature', 'blocked', 'Blocked');
      const override = recordOverride(decision.id, 'ops@test.com', 'Emergency', 'Production down', 3600000);

      expect(override.id).toBeDefined();
      expect(override.stillActive).toBe(true);
    });

    it('should track active overrides', () => {
      const decision = ingestDecision('governor', 'feature', 'blocked', 'Blocked');
      recordOverride(decision.id, 'ops@test.com', 'Emergency', 'Production down', 3600000);

      const active = getActiveOverrides();
      expect(active.length).toBe(1);
    });
  });

  describe('Phase 3: Platform Memory', () => {
    it('should detect patterns from repeated failures', () => {
      // Create repeated failures
      for (let i = 0; i < 5; i++) {
        ingestDecision('cutover', 'platform', 'blocked', 'Readiness low');
      }

      const patterns = detectPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should link incidents to decisions', () => {
      const decision = ingestDecision('cutover', 'platform', 'blocked', 'Block');

      const link = linkIncidentToDecision('INC-001', decision.id, 'caused_by', 80);

      expect(link.incidentId).toBe('INC-001');
      expect(link.decisionId).toBe(decision.id);
    });

    it('should capture memory snapshot', () => {
      ingestDecision('cutover', 'platform', 'blocked', 'Block');
      detectPatterns();

      const snapshot = captureMemorySnapshot();

      expect(snapshot.id).toBeDefined();
      expect(snapshot.capturedAt).toBeInstanceOf(Date);
    });
  });

  describe('Phase 4: Narrative Generation', () => {
    it('should generate rollout failure narrative', () => {
      ingestDecision('cutover', 'platform', 'blocked', 'Readiness score too low');

      const narrative = generateNarrative({ query: 'why_rollout_failed' });

      expect(narrative.id).toBeDefined();
      expect(narrative.headline).toBeDefined();
      expect(narrative.summary).toBeDefined();
    });

    it('should generate feature blocked narrative', () => {
      ingestDecision('governor', 'feature', 'blocked', 'Policy violation');

      const narrative = generateNarrative({ query: 'why_feature_blocked' });

      expect(narrative.query).toBe('why_feature_blocked');
      expect(narrative.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate riskiest area narrative', () => {
      for (let i = 0; i < 5; i++) {
        ingestDecision('cutover', 'platform', 'blocked', 'Risk');
      }
      detectPatterns();

      const narrative = generateNarrative({ query: 'riskiest_area' });

      expect(narrative.headline).toBeDefined();
    });

    it('should generate safety trend narrative', () => {
      ingestDecision('glcp', 'platform', 'approved', 'OK');

      const narrative = generateNarrative({ query: 'safety_trend' });

      expect(narrative.query).toBe('safety_trend');
      expect(narrative.rootCauses.length).toBeGreaterThan(0);
    });

    it('should generate risk report', () => {
      const report = generateRiskReport();

      expect(report.id).toBeDefined();
      expect(report.safetyScore).toBeDefined();
      expect(['safer', 'same', 'riskier']).toContain(report.safetyTrend);
    });
  });

  describe('Phase 5: Feedback Loop', () => {
    it('should run feedback cycle', () => {
      // Create conditions for signals
      for (let i = 0; i < 6; i++) {
        ingestDecision('override', 'platform', 'approved', 'Override', {
          authority: 'human',
          actor: 'admin',
        });
      }

      const result = runFeedbackCycle();

      expect(result.signalsDetected).toBeDefined();
      expect(result.recommendationsGenerated).toBeDefined();
      expect(result.state).toBeDefined();
    });

    it('should acknowledge recommendation', () => {
      // Create override signal
      for (let i = 0; i < 6; i++) {
        ingestDecision('override', 'platform', 'approved', 'Override', {
          authority: 'human',
        });
      }
      runFeedbackCycle();

      const pending = getPendingRecommendations();
      if (pending.length > 0) {
        const success = acknowledgeRecommendation(pending[0].id, 'admin@test.com');
        expect(success).toBe(true);
      }
    });
  });

  describe('End-to-End Traceability', () => {
    it('should trace decision through full lifecycle', async () => {
      // 1. Decision made
      const decision = ingestDecision('cutover', 'platform', 'blocked', 'Readiness 60%', {
        confidence: 60,
        signals: [{ name: 'readiness', value: 60, weight: 1, source: 'cutover' }],
      });

      // 2. Override created
      recordOverride(decision.id, 'ops@test.com', 'Emergency go-live', 'CEO directive', 1800000);

      // 3. Authority chain resolved
      const chain = await resolveAuthorityChain(decision.id);

      // 4. Accountability answered
      const answers = answerAccountability(decision.id);

      // 5. Pattern detected
      detectPatterns();

      // 6. Narrative generated
      const narrative = generateNarrative({ query: 'why_rollout_failed' });

      // Verify traceability
      expect(chain).not.toBeNull();
      expect(chain?.overrides.length).toBe(1);
      expect(answers.some(a => a.answer.includes('cutover'))).toBe(true);
      expect(narrative.headline).toBeDefined();
    });
  });
});
