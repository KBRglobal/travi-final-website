/**
 * Publish Gates - Integration Tests
 *
 * Tests the full publish gate flow from content to blocked/allowed publishing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublishBlockedError } from './errors';
import { GateReport } from './types';

// Mock the gate evaluator
vi.mock('./gate-evaluator', () => ({
  evaluateGates: vi.fn(),
}));

// Mock feature flag
vi.mock('./types', async () => {
  const actual = await vi.importActual('./types');
  return {
    ...actual,
    isPublishGatesEnabled: () => true,
  };
});

import { evaluateGates } from './gate-evaluator';
import { enforcePublishGates, checkPublishEligibility } from './gate-service';

describe('Publish Gates Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Invalid content → publish blocked', () => {
    it('blocks content with no entities', async () => {
      const mockReport: GateReport = {
        contentId: 'content-no-entities',
        evaluations: [
          { rule: 'entity-coverage', result: 'BLOCK', message: 'Content has no linked entities' },
          { rule: 'search-index', result: 'PASS', message: 'Content is indexed' },
          { rule: 'aeo-exists', result: 'PASS', message: 'AEO capsule found' },
          { rule: 'blocks-valid', result: 'PASS', message: 'Blocks are valid' },
        ],
        overallResult: 'BLOCK',
        canPublish: false,
        blockedBy: [
          { rule: 'entity-coverage', result: 'BLOCK', message: 'Content has no linked entities' },
        ],
        warnings: [],
        evaluatedAt: new Date(),
      };

      vi.mocked(evaluateGates).mockResolvedValue(mockReport);

      await expect(enforcePublishGates('content-no-entities')).rejects.toThrow(
        PublishBlockedError
      );

      try {
        await enforcePublishGates('content-no-entities');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishBlockedError);
        const blocked = error as PublishBlockedError;
        expect(blocked.code).toBe('PUBLISH_BLOCKED');
        expect(blocked.contentId).toBe('content-no-entities');
        expect(blocked.blockedBy).toHaveLength(1);
        expect(blocked.blockedBy[0].rule).toBe('entity-coverage');
      }
    });

    it('blocks content with empty blocks', async () => {
      const mockReport: GateReport = {
        contentId: 'content-empty-blocks',
        evaluations: [
          { rule: 'entity-coverage', result: 'PASS', message: 'Has entities' },
          { rule: 'search-index', result: 'PASS', message: 'Indexed' },
          { rule: 'aeo-exists', result: 'PASS', message: 'Has AEO' },
          { rule: 'blocks-valid', result: 'BLOCK', message: 'Content has no blocks' },
        ],
        overallResult: 'BLOCK',
        canPublish: false,
        blockedBy: [
          { rule: 'blocks-valid', result: 'BLOCK', message: 'Content has no blocks' },
        ],
        warnings: [],
        evaluatedAt: new Date(),
      };

      vi.mocked(evaluateGates).mockResolvedValue(mockReport);

      await expect(enforcePublishGates('content-empty-blocks')).rejects.toThrow(
        PublishBlockedError
      );
    });

    it('blocks content without AEO capsule', async () => {
      const mockReport: GateReport = {
        contentId: 'content-no-aeo',
        evaluations: [
          { rule: 'entity-coverage', result: 'PASS', message: 'Has entities' },
          { rule: 'search-index', result: 'PASS', message: 'Indexed' },
          { rule: 'aeo-exists', result: 'BLOCK', message: 'No AEO capsule found' },
          { rule: 'blocks-valid', result: 'PASS', message: 'Valid blocks' },
        ],
        overallResult: 'BLOCK',
        canPublish: false,
        blockedBy: [
          { rule: 'aeo-exists', result: 'BLOCK', message: 'No AEO capsule found' },
        ],
        warnings: [],
        evaluatedAt: new Date(),
      };

      vi.mocked(evaluateGates).mockResolvedValue(mockReport);

      await expect(enforcePublishGates('content-no-aeo')).rejects.toThrow(
        PublishBlockedError
      );
    });

    it('blocks content with multiple failures', async () => {
      const mockReport: GateReport = {
        contentId: 'content-multiple-issues',
        evaluations: [
          { rule: 'entity-coverage', result: 'BLOCK', message: 'No entities' },
          { rule: 'search-index', result: 'WARN', message: 'Not indexed' },
          { rule: 'aeo-exists', result: 'BLOCK', message: 'No AEO' },
          { rule: 'blocks-valid', result: 'BLOCK', message: 'Empty blocks' },
        ],
        overallResult: 'BLOCK',
        canPublish: false,
        blockedBy: [
          { rule: 'entity-coverage', result: 'BLOCK', message: 'No entities' },
          { rule: 'aeo-exists', result: 'BLOCK', message: 'No AEO' },
          { rule: 'blocks-valid', result: 'BLOCK', message: 'Empty blocks' },
        ],
        warnings: [
          { rule: 'search-index', result: 'WARN', message: 'Not indexed' },
        ],
        evaluatedAt: new Date(),
      };

      vi.mocked(evaluateGates).mockResolvedValue(mockReport);

      try {
        await enforcePublishGates('content-multiple-issues');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PublishBlockedError);
        const blocked = error as PublishBlockedError;
        expect(blocked.blockedBy).toHaveLength(3);
      }
    });
  });

  describe('Valid content → publish allowed', () => {
    it('allows content that passes all gates', async () => {
      const mockReport: GateReport = {
        contentId: 'content-valid',
        evaluations: [
          { rule: 'entity-coverage', result: 'PASS', message: 'Has 5 entities' },
          { rule: 'search-index', result: 'PASS', message: 'Indexed' },
          { rule: 'aeo-exists', result: 'PASS', message: 'AEO capsule found' },
          { rule: 'blocks-valid', result: 'PASS', message: 'Valid content blocks' },
        ],
        overallResult: 'PASS',
        canPublish: true,
        blockedBy: [],
        warnings: [],
        evaluatedAt: new Date(),
      };

      vi.mocked(evaluateGates).mockResolvedValue(mockReport);

      // Should not throw
      await expect(enforcePublishGates('content-valid')).resolves.toBeUndefined();
    });

    it('allows content with warnings', async () => {
      const mockReport: GateReport = {
        contentId: 'content-with-warnings',
        evaluations: [
          { rule: 'entity-coverage', result: 'WARN', message: 'Only 2 entities' },
          { rule: 'search-index', result: 'WARN', message: 'Not indexed yet' },
          { rule: 'aeo-exists', result: 'PASS', message: 'AEO capsule found' },
          { rule: 'blocks-valid', result: 'PASS', message: 'Valid content blocks' },
        ],
        overallResult: 'WARN',
        canPublish: true,
        blockedBy: [],
        warnings: [
          { rule: 'entity-coverage', result: 'WARN', message: 'Only 2 entities' },
          { rule: 'search-index', result: 'WARN', message: 'Not indexed yet' },
        ],
        evaluatedAt: new Date(),
      };

      vi.mocked(evaluateGates).mockResolvedValue(mockReport);

      // Should not throw even with warnings
      await expect(enforcePublishGates('content-with-warnings')).resolves.toBeUndefined();
    });
  });

  describe('checkPublishEligibility', () => {
    it('returns report without throwing for blocked content', async () => {
      const mockReport: GateReport = {
        contentId: 'content-blocked',
        evaluations: [
          { rule: 'entity-coverage', result: 'BLOCK', message: 'No entities' },
        ],
        overallResult: 'BLOCK',
        canPublish: false,
        blockedBy: [{ rule: 'entity-coverage', result: 'BLOCK', message: 'No entities' }],
        warnings: [],
        evaluatedAt: new Date(),
      };

      vi.mocked(evaluateGates).mockResolvedValue(mockReport);

      // checkPublishEligibility should NOT throw
      const report = await checkPublishEligibility('content-blocked');
      expect(report.canPublish).toBe(false);
      expect(report.overallResult).toBe('BLOCK');
    });

    it('returns report for valid content', async () => {
      const mockReport: GateReport = {
        contentId: 'content-valid',
        evaluations: [
          { rule: 'entity-coverage', result: 'PASS', message: 'Has entities' },
        ],
        overallResult: 'PASS',
        canPublish: true,
        blockedBy: [],
        warnings: [],
        evaluatedAt: new Date(),
      };

      vi.mocked(evaluateGates).mockResolvedValue(mockReport);

      const report = await checkPublishEligibility('content-valid');
      expect(report.canPublish).toBe(true);
      expect(report.overallResult).toBe('PASS');
    });
  });
});
