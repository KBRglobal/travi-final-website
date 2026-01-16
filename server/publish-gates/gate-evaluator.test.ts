/**
 * Publish Gates - Gate Evaluator Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GateEvaluation, GateReport } from './types';

// Mock the rules
vi.mock('./rules/entity-coverage.rule', () => ({
  evaluateEntityCoverage: vi.fn(),
}));

vi.mock('./rules/search-index.rule', () => ({
  evaluateSearchIndex: vi.fn(),
}));

vi.mock('./rules/aeo-exists.rule', () => ({
  evaluateAeoExists: vi.fn(),
}));

vi.mock('./rules/blocks-valid.rule', () => ({
  evaluateBlocksValid: vi.fn(),
}));

import { evaluateEntityCoverage } from './rules/entity-coverage.rule';
import { evaluateSearchIndex } from './rules/search-index.rule';
import { evaluateAeoExists } from './rules/aeo-exists.rule';
import { evaluateBlocksValid } from './rules/blocks-valid.rule';
import { evaluateGates, combineResults } from './gate-evaluator';

describe('Gate Evaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('combineResults', () => {
    it('returns PASS when all evaluations pass', () => {
      const evaluations: GateEvaluation[] = [
        { rule: 'rule1', result: 'PASS', message: 'OK' },
        { rule: 'rule2', result: 'PASS', message: 'OK' },
      ];

      expect(combineResults(evaluations)).toBe('PASS');
    });

    it('returns WARN when at least one WARN and no BLOCK', () => {
      const evaluations: GateEvaluation[] = [
        { rule: 'rule1', result: 'PASS', message: 'OK' },
        { rule: 'rule2', result: 'WARN', message: 'Warning' },
        { rule: 'rule3', result: 'PASS', message: 'OK' },
      ];

      expect(combineResults(evaluations)).toBe('WARN');
    });

    it('returns BLOCK when at least one BLOCK', () => {
      const evaluations: GateEvaluation[] = [
        { rule: 'rule1', result: 'PASS', message: 'OK' },
        { rule: 'rule2', result: 'WARN', message: 'Warning' },
        { rule: 'rule3', result: 'BLOCK', message: 'Blocked' },
      ];

      expect(combineResults(evaluations)).toBe('BLOCK');
    });

    it('returns PASS for empty evaluations', () => {
      expect(combineResults([])).toBe('PASS');
    });
  });

  describe('evaluateGates', () => {
    it('runs all rules and combines results', async () => {
      vi.mocked(evaluateEntityCoverage).mockResolvedValue({
        rule: 'entity-coverage',
        result: 'PASS',
        message: 'Has entities',
      });
      vi.mocked(evaluateSearchIndex).mockResolvedValue({
        rule: 'search-index',
        result: 'PASS',
        message: 'Indexed',
      });
      vi.mocked(evaluateAeoExists).mockResolvedValue({
        rule: 'aeo-exists',
        result: 'PASS',
        message: 'Has AEO',
      });
      vi.mocked(evaluateBlocksValid).mockResolvedValue({
        rule: 'blocks-valid',
        result: 'PASS',
        message: 'Valid blocks',
      });

      const report = await evaluateGates('content-123');

      expect(report.contentId).toBe('content-123');
      expect(report.overallResult).toBe('PASS');
      expect(report.evaluations).toHaveLength(4);
      expect(report.canPublish).toBe(true);
    });

    it('blocks publishing when any rule blocks', async () => {
      vi.mocked(evaluateEntityCoverage).mockResolvedValue({
        rule: 'entity-coverage',
        result: 'BLOCK',
        message: 'No entities',
      });
      vi.mocked(evaluateSearchIndex).mockResolvedValue({
        rule: 'search-index',
        result: 'PASS',
        message: 'Indexed',
      });
      vi.mocked(evaluateAeoExists).mockResolvedValue({
        rule: 'aeo-exists',
        result: 'PASS',
        message: 'Has AEO',
      });
      vi.mocked(evaluateBlocksValid).mockResolvedValue({
        rule: 'blocks-valid',
        result: 'PASS',
        message: 'Valid blocks',
      });

      const report = await evaluateGates('content-123');

      expect(report.overallResult).toBe('BLOCK');
      expect(report.canPublish).toBe(false);
      expect(report.blockedBy).toHaveLength(1);
      expect(report.blockedBy[0].rule).toBe('entity-coverage');
    });

    it('allows publishing with warnings', async () => {
      vi.mocked(evaluateEntityCoverage).mockResolvedValue({
        rule: 'entity-coverage',
        result: 'WARN',
        message: 'Few entities',
      });
      vi.mocked(evaluateSearchIndex).mockResolvedValue({
        rule: 'search-index',
        result: 'WARN',
        message: 'Not indexed yet',
      });
      vi.mocked(evaluateAeoExists).mockResolvedValue({
        rule: 'aeo-exists',
        result: 'PASS',
        message: 'Has AEO',
      });
      vi.mocked(evaluateBlocksValid).mockResolvedValue({
        rule: 'blocks-valid',
        result: 'PASS',
        message: 'Valid blocks',
      });

      const report = await evaluateGates('content-123');

      expect(report.overallResult).toBe('WARN');
      expect(report.canPublish).toBe(true);
      expect(report.warnings).toHaveLength(2);
    });
  });
});
