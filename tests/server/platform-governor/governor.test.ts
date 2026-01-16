/**
 * Tests for Autonomous Platform Governor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubEnv('ENABLE_PLATFORM_GOVERNOR', 'true');

import {
  isPlatformGovernorEnabled,
  GOVERNOR_CONFIG,
} from '../../../server/platform-governor/config';
import {
  getAllRules,
  getEnabledRules,
  getRuleById,
  DEFAULT_RULES,
} from '../../../server/platform-governor/rules';
import {
  evaluateRules,
  getActiveRestrictions,
  isSystemRestricted,
  overrideDecision,
  resetAllRestrictions,
  getRecentDecisions,
  getAuditLog,
  clearAll,
} from '../../../server/platform-governor/decision-engine';
import {
  collectContext,
  createTestContext,
  recordAiCost,
  resetDailyAiCost,
  recordError,
  recordRequest,
  resetErrorMetrics,
} from '../../../server/platform-governor/context-collector';
import type { GovernorContext } from '../../../server/platform-governor/types';

describe('Platform Governor System', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_PLATFORM_GOVERNOR', 'true');
    clearAll();
    resetDailyAiCost();
    resetErrorMetrics();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearAll();
  });

  describe('Feature Flag', () => {
    it('should be enabled when env is true', () => {
      vi.stubEnv('ENABLE_PLATFORM_GOVERNOR', 'true');
      expect(isPlatformGovernorEnabled()).toBe(true);
    });

    it('should be disabled when env is not set', () => {
      vi.stubEnv('ENABLE_PLATFORM_GOVERNOR', '');
      expect(isPlatformGovernorEnabled()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should have valid thresholds', () => {
      expect(GOVERNOR_CONFIG.thresholds.aiCostBudget).toBeGreaterThan(0);
      expect(GOVERNOR_CONFIG.thresholds.errorRateSpike).toBeGreaterThan(0);
      expect(GOVERNOR_CONFIG.thresholds.queueBacklogMax).toBeGreaterThan(0);
    });
  });

  describe('Rules', () => {
    it('should have default rules defined', () => {
      expect(DEFAULT_RULES.length).toBeGreaterThan(0);
    });

    it('should return all rules', () => {
      const rules = getAllRules();
      expect(rules.length).toBeGreaterThanOrEqual(DEFAULT_RULES.length);
    });

    it('should return enabled rules', () => {
      const enabled = getEnabledRules();
      expect(enabled.every(r => r.enabled)).toBe(true);
    });

    it('should find rule by id', () => {
      const rule = getRuleById('ai_cost_exceeded');
      expect(rule).toBeDefined();
      expect(rule?.id).toBe('ai_cost_exceeded');
    });

    it('should have valid rule structure', () => {
      for (const rule of DEFAULT_RULES) {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.conditions.length).toBeGreaterThan(0);
        expect(rule.actions.length).toBeGreaterThan(0);
        expect(rule.priority).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Context Collection', () => {
    it('should collect context', () => {
      const context = collectContext();

      expect(context.aiCostToday).toBeDefined();
      expect(context.aiCostBudget).toBeDefined();
      expect(context.errorRate).toBeDefined();
      expect(context.memoryUsagePercent).toBeDefined();
    });

    it('should create test context with defaults', () => {
      const context = createTestContext();

      expect(context.aiCostToday).toBe(0);
      expect(context.errorRate).toBe(0);
      expect(context.incidentSeverity).toBe('none');
    });

    it('should create test context with overrides', () => {
      const context = createTestContext({
        aiCostToday: 150,
        incidentSeverity: 'critical',
      });

      expect(context.aiCostToday).toBe(150);
      expect(context.incidentSeverity).toBe('critical');
    });

    it('should track AI cost', () => {
      recordAiCost(10);
      recordAiCost(20);

      const context = collectContext();
      expect(context.aiCostToday).toBe(30);
    });

    it('should calculate error rate', () => {
      recordRequest();
      recordRequest();
      recordError();

      const context = collectContext();
      expect(context.errorRate).toBe(0.5);
    });
  });

  describe('Rule Evaluation', () => {
    it('should not trigger on healthy context', () => {
      const context = createTestContext({
        aiCostToday: 10,
        aiCostBudget: 100,
        errorRate: 0.01,
        incidentSeverity: 'none',
        queueBacklog: 10,
        memoryUsagePercent: 50,
      });

      const decisions = evaluateRules(context);
      expect(decisions.length).toBe(0);
    });

    it('should trigger on AI cost exceeded', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      const decisions = evaluateRules(context);
      const aiDecision = decisions.find(d => d.ruleId === 'ai_cost_exceeded');
      expect(aiDecision).toBeDefined();
    });

    it('should trigger on critical incident', () => {
      const context = createTestContext({
        incidentSeverity: 'critical',
      });

      const decisions = evaluateRules(context);
      const incidentDecision = decisions.find(d => d.ruleId === 'critical_incident');
      expect(incidentDecision).toBeDefined();
    });

    it('should respect cooldown', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      const first = evaluateRules(context);
      const second = evaluateRules(context);

      expect(first.length).toBeGreaterThan(0);
      expect(second.length).toBe(0); // Cooldown active
    });
  });

  describe('Restrictions', () => {
    it('should track active restrictions', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      evaluateRules(context);
      const restrictions = getActiveRestrictions();

      expect(restrictions.length).toBeGreaterThan(0);
    });

    it('should check if system is restricted', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      evaluateRules(context);

      // AI rule disables regeneration
      expect(isSystemRestricted('regeneration')).toBe(true);
    });
  });

  describe('Override & Reset', () => {
    it('should override decision', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      const decisions = evaluateRules(context);
      const decision = decisions[0];

      const success = overrideDecision(decision.id, 'admin');
      expect(success).toBe(true);
    });

    it('should reset all restrictions', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      evaluateRules(context);
      expect(getActiveRestrictions().length).toBeGreaterThan(0);

      resetAllRestrictions('admin');
      expect(getActiveRestrictions().length).toBe(0);
    });
  });

  describe('Audit Trail', () => {
    it('should log decisions', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      evaluateRules(context);
      const audit = getAuditLog();

      expect(audit.length).toBeGreaterThan(0);
    });

    it('should include required audit fields', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      evaluateRules(context);
      const [entry] = getAuditLog();

      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.ruleId).toBeDefined();
      expect(entry.decision).toBeDefined();
      expect(entry.actions).toBeDefined();
    });

    it('should track recent decisions', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      evaluateRules(context);
      const decisions = getRecentDecisions();

      expect(decisions.length).toBeGreaterThan(0);
    });
  });

  describe('Decision Types', () => {
    it('should return BLOCK for blocking actions', () => {
      const context = createTestContext({
        errorRate: 0.5, // High error rate
        errorRateThreshold: 0.1,
      });

      const decisions = evaluateRules(context);
      const blockDecision = decisions.find(d => d.decision === 'BLOCK');

      // Error rate spike should cause BLOCK
      expect(blockDecision).toBeDefined();
    });

    it('should return THROTTLE for throttling actions', () => {
      const context = createTestContext({
        aiCostToday: 150,
        aiCostBudget: 100,
      });

      const decisions = evaluateRules(context);
      const throttleDecision = decisions.find(d => d.decision === 'THROTTLE');

      expect(throttleDecision).toBeDefined();
    });
  });
});
