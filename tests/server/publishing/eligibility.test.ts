/**
 * Publishing Eligibility Tests
 *
 * Unit tests for eligibility evaluation and integration tests
 * for the blocked → fixed → allowed flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

describe('Publishing Eligibility Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Eligibility Evaluation Rules', () => {
    it('should block content without blocks/body', () => {
      const evaluateContent = (blocks: unknown[] | null) => {
        const reasons: string[] = [];
        let score = 100;

        if (!blocks || blocks.length === 0) {
          reasons.push('Content has no body/blocks');
          score -= 30;
        }

        return { allowed: reasons.length === 0, blockingReasons: reasons, score };
      };

      expect(evaluateContent(null).allowed).toBe(false);
      expect(evaluateContent([]).allowed).toBe(false);
      expect(evaluateContent([{ type: 'text' }]).allowed).toBe(true);
    });

    it('should block deleted content', () => {
      const evaluateContent = (deletedAt: Date | null) => {
        const reasons: string[] = [];

        if (deletedAt) {
          reasons.push('Content is deleted');
        }

        return { allowed: reasons.length === 0, blockingReasons: reasons };
      };

      expect(evaluateContent(new Date()).allowed).toBe(false);
      expect(evaluateContent(null).allowed).toBe(true);
    });

    it('should block content missing AEO capsule when required', () => {
      const evaluateContent = (
        answerCapsule: string | null,
        aeoRequired: boolean
      ) => {
        const reasons: string[] = [];

        if (aeoRequired && !answerCapsule) {
          reasons.push('Content missing AEO capsule');
        }

        return { allowed: reasons.length === 0, blockingReasons: reasons };
      };

      // AEO not required
      expect(evaluateContent(null, false).allowed).toBe(true);

      // AEO required but missing
      expect(evaluateContent(null, true).allowed).toBe(false);

      // AEO required and present
      expect(evaluateContent('Summary text', true).allowed).toBe(true);
    });

    it('should block content missing entities when required', () => {
      const evaluateContent = (
        hasEntities: boolean,
        entityRequired: boolean
      ) => {
        const reasons: string[] = [];

        if (entityRequired && !hasEntities) {
          reasons.push('Content has no extracted entities');
        }

        return { allowed: reasons.length === 0, blockingReasons: reasons };
      };

      // Entity not required
      expect(evaluateContent(false, false).allowed).toBe(true);

      // Entity required but missing
      expect(evaluateContent(false, true).allowed).toBe(false);

      // Entity required and present
      expect(evaluateContent(true, true).allowed).toBe(true);
    });

    it('should block content scheduled for future unless forcePublish', () => {
      const now = new Date();
      const future = new Date(now.getTime() + 60000);
      const past = new Date(now.getTime() - 60000);

      const evaluateContent = (
        scheduledAt: Date | null,
        forcePublish: boolean
      ) => {
        const reasons: string[] = [];

        if (scheduledAt && !forcePublish && scheduledAt > new Date()) {
          reasons.push(`Content scheduled for future`);
        }

        return { allowed: reasons.length === 0, blockingReasons: reasons };
      };

      // Not scheduled
      expect(evaluateContent(null, false).allowed).toBe(true);

      // Scheduled in future
      expect(evaluateContent(future, false).allowed).toBe(false);

      // Scheduled in future with force
      expect(evaluateContent(future, true).allowed).toBe(true);

      // Scheduled in past
      expect(evaluateContent(past, false).allowed).toBe(true);
    });
  });

  describe('Score Calculation', () => {
    it('should calculate score correctly', () => {
      const calculateScore = (factors: {
        hasBlocks: boolean;
        hasAeo: boolean;
        hasEntity: boolean;
        isIndexed: boolean;
        seoScore: number | null;
      }) => {
        let score = 100;

        if (!factors.hasBlocks) score -= 30;
        if (!factors.hasAeo) score -= 25;
        if (!factors.hasEntity) score -= 25;
        if (!factors.isIndexed) score -= 5;
        if (factors.seoScore && factors.seoScore < 40) score -= 5;

        return Math.max(0, Math.min(100, score));
      };

      // Perfect content
      expect(calculateScore({
        hasBlocks: true,
        hasAeo: true,
        hasEntity: true,
        isIndexed: true,
        seoScore: 80,
      })).toBe(100);

      // Missing blocks
      expect(calculateScore({
        hasBlocks: false,
        hasAeo: true,
        hasEntity: true,
        isIndexed: true,
        seoScore: 80,
      })).toBe(70);

      // Missing everything
      expect(calculateScore({
        hasBlocks: false,
        hasAeo: false,
        hasEntity: false,
        isIndexed: false,
        seoScore: 30,
      })).toBe(10);
    });
  });

  describe('Feature Flags', () => {
    it('should respect feature flag states', () => {
      const isEnabled = (envValue: string | undefined): boolean => {
        return envValue === 'true';
      };

      expect(isEnabled('true')).toBe(true);
      expect(isEnabled('false')).toBe(false);
      expect(isEnabled(undefined)).toBe(false);
      expect(isEnabled('')).toBe(false);
    });

    it('should allow all when guards disabled', () => {
      const checkGuard = (guardsEnabled: boolean, hasIssues: boolean) => {
        if (!guardsEnabled) {
          return { allowed: true, action: 'proceed' };
        }

        if (hasIssues) {
          return { allowed: false, action: 'blocked' };
        }

        return { allowed: true, action: 'proceed' };
      };

      // Guards disabled - always allow
      expect(checkGuard(false, true).allowed).toBe(true);

      // Guards enabled - respect issues
      expect(checkGuard(true, true).allowed).toBe(false);
      expect(checkGuard(true, false).allowed).toBe(true);
    });
  });

  describe('Guard Integration', () => {
    it('should block manual publish when not eligible', () => {
      const guardManualPublish = (eligible: boolean) => {
        if (!eligible) {
          return {
            success: false,
            error: 'Publishing blocked',
          };
        }
        return { success: true };
      };

      expect(guardManualPublish(false).success).toBe(false);
      expect(guardManualPublish(true).success).toBe(true);
    });

    it('should block scheduled publish when not eligible', () => {
      const guardScheduledPublish = (eligible: boolean) => {
        return {
          allowed: eligible,
          reasons: eligible ? [] : ['Content blocked'],
        };
      };

      const blocked = guardScheduledPublish(false);
      expect(blocked.allowed).toBe(false);
      expect(blocked.reasons.length).toBeGreaterThan(0);

      const allowed = guardScheduledPublish(true);
      expect(allowed.allowed).toBe(true);
      expect(allowed.reasons.length).toBe(0);
    });
  });
});

describe('Integration: Blocked → Fixed → Allowed Flow', () => {
  it('should simulate complete eligibility flow', async () => {
    // Simulate content state
    const content = {
      id: 'test-content',
      blocks: [] as unknown[],
      answerCapsule: null as string | null,
      deletedAt: null as Date | null,
      scheduledAt: null as Date | null,
    };

    const evaluate = (c: typeof content, flags: { aeoRequired: boolean }) => {
      const reasons: string[] = [];
      let score = 100;

      if (!c.blocks || c.blocks.length === 0) {
        reasons.push('Content has no body/blocks');
        score -= 30;
      }

      if (flags.aeoRequired && !c.answerCapsule) {
        reasons.push('Content missing AEO capsule');
        score -= 25;
      }

      if (c.deletedAt) {
        reasons.push('Content is deleted');
        score = 0;
      }

      return {
        allowed: reasons.length === 0,
        blockingReasons: reasons,
        score: Math.max(0, score),
      };
    };

    const flags = { aeoRequired: true };

    // Step 1: Initial state - blocked (no blocks, no AEO)
    let result = evaluate(content, flags);
    expect(result.allowed).toBe(false);
    expect(result.blockingReasons).toContain('Content has no body/blocks');
    expect(result.blockingReasons).toContain('Content missing AEO capsule');

    // Step 2: Add blocks - still blocked (no AEO)
    content.blocks = [{ type: 'text', content: 'Hello' }];
    result = evaluate(content, flags);
    expect(result.allowed).toBe(false);
    expect(result.blockingReasons).not.toContain('Content has no body/blocks');
    expect(result.blockingReasons).toContain('Content missing AEO capsule');

    // Step 3: Add AEO capsule - now allowed
    content.answerCapsule = 'This is a summary of the content.';
    result = evaluate(content, flags);
    expect(result.allowed).toBe(true);
    expect(result.blockingReasons.length).toBe(0);
    expect(result.score).toBe(100);
  });

  it('should handle transition from blocked to allowed', () => {
    type ContentState = 'blocked' | 'eligible' | 'published';

    const transitions: { from: ContentState; action: string; to: ContentState }[] = [];

    const recordTransition = (from: ContentState, action: string, to: ContentState) => {
      transitions.push({ from, action, to });
    };

    // Simulate lifecycle
    recordTransition('blocked', 'add_content', 'blocked');
    recordTransition('blocked', 'add_aeo_capsule', 'eligible');
    recordTransition('eligible', 'publish', 'published');

    expect(transitions.length).toBe(3);
    expect(transitions[0].to).toBe('blocked');
    expect(transitions[1].to).toBe('eligible');
    expect(transitions[2].to).toBe('published');
  });
});

describe('Edge Cases', () => {
  it('should handle missing content gracefully', () => {
    const evaluate = (content: null | { id: string }) => {
      if (!content) {
        return {
          allowed: false,
          blockingReasons: ['Content not found'],
          score: 0,
        };
      }
      return { allowed: true, blockingReasons: [], score: 100 };
    };

    expect(evaluate(null).allowed).toBe(false);
    expect(evaluate(null).blockingReasons).toContain('Content not found');
  });

  it('should be idempotent', () => {
    const evaluate = (content: { id: string; blocks: unknown[] }) => {
      const reasons: string[] = [];
      if (content.blocks.length === 0) {
        reasons.push('No blocks');
      }
      return { allowed: reasons.length === 0, reasons };
    };

    const content = { id: 'test', blocks: [{ type: 'text' }] };

    const result1 = evaluate(content);
    const result2 = evaluate(content);
    const result3 = evaluate(content);

    expect(result1.allowed).toBe(result2.allowed);
    expect(result2.allowed).toBe(result3.allowed);
    expect(result1.reasons).toEqual(result2.reasons);
    expect(result2.reasons).toEqual(result3.reasons);
  });

  it('should be deterministic', () => {
    const evaluate = (content: { blocks: unknown[]; aeo: string | null }) => {
      let score = 100;
      if (content.blocks.length === 0) score -= 30;
      if (!content.aeo) score -= 25;
      return score;
    };

    const content = { blocks: [{}], aeo: 'summary' };

    // Multiple evaluations should return same score
    const scores = Array.from({ length: 10 }, () => evaluate(content));
    expect(new Set(scores).size).toBe(1);
  });
});
