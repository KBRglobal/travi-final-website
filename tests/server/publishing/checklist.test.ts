/**
 * Pre-Publish Checklist Tests
 *
 * Tests for checklist evaluation logic.
 *
 * FEATURE 5: Pre-Publish Checklist UI
 */

import { describe, it, expect, vi } from 'vitest';

type ChecklistItemStatus = 'pass' | 'fail' | 'warning' | 'skip';
type ChecklistCategory = 'content' | 'seo' | 'aeo' | 'media' | 'compliance';

interface ContentData {
  id: string;
  title: string;
  type: string;
  slug: string | null;
  blocks: unknown[] | null;
  answerCapsule: string | null;
  aeoScore: number | null;
  seoScore: number | null;
  metaTitle: string | null;
  metaDescription: string | null;
  primaryKeyword: string | null;
  heroImage: string | null;
  cardImage: string | null;
  wordCount: number | null;
}

interface CheckResult {
  status: ChecklistItemStatus;
  message: string;
}

describe('Pre-Publish Checklist - Title Check', () => {
  const checkTitle = (content: ContentData): CheckResult => {
    if (!content.title || content.title.trim().length === 0) {
      return { status: 'fail', message: 'Title is required' };
    }
    if (content.title.length < 10) {
      return { status: 'warning', message: 'Title is very short (< 10 characters)' };
    }
    return { status: 'pass', message: 'Title is set' };
  };

  it('should fail when title is empty', () => {
    const result = checkTitle({ title: '', id: '1', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('fail');
  });

  it('should warn when title is very short', () => {
    const result = checkTitle({ title: 'Short', id: '1', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
  });

  it('should pass when title is good length', () => {
    const result = checkTitle({ title: 'A Great Article Title', id: '1', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('pass');
  });
});

describe('Pre-Publish Checklist - Body Check', () => {
  const checkBody = (content: ContentData): CheckResult => {
    const blocks = content.blocks as unknown[] | null;
    if (!blocks || blocks.length === 0) {
      return { status: 'fail', message: 'Content has no body blocks' };
    }
    if (blocks.length < 2) {
      return { status: 'warning', message: 'Content has minimal body (only 1 block)' };
    }
    return { status: 'pass', message: `${blocks.length} content blocks` };
  };

  it('should fail when no blocks', () => {
    const result = checkBody({ blocks: null, id: '1', title: 'Test', type: 'article', slug: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('fail');
  });

  it('should fail when empty blocks array', () => {
    const result = checkBody({ blocks: [], id: '1', title: 'Test', type: 'article', slug: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('fail');
  });

  it('should warn when only 1 block', () => {
    const result = checkBody({ blocks: [{}], id: '1', title: 'Test', type: 'article', slug: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
  });

  it('should pass when 2+ blocks', () => {
    const result = checkBody({ blocks: [{}, {}, {}], id: '1', title: 'Test', type: 'article', slug: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('pass');
    expect(result.message).toContain('3');
  });
});

describe('Pre-Publish Checklist - Slug Check', () => {
  const checkSlug = (content: ContentData): CheckResult => {
    if (!content.slug) {
      return { status: 'fail', message: 'URL slug is required' };
    }
    if (content.slug.includes(' ')) {
      return { status: 'fail', message: 'Slug contains spaces (invalid URL)' };
    }
    return { status: 'pass', message: `Slug: /${content.slug}` };
  };

  it('should fail when no slug', () => {
    const result = checkSlug({ slug: null, id: '1', title: 'Test', type: 'article', blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('fail');
  });

  it('should fail when slug has spaces', () => {
    const result = checkSlug({ slug: 'my article', id: '1', title: 'Test', type: 'article', blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('fail');
    expect(result.message).toContain('spaces');
  });

  it('should pass when valid slug', () => {
    const result = checkSlug({ slug: 'my-article', id: '1', title: 'Test', type: 'article', blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('pass');
  });
});

describe('Pre-Publish Checklist - Meta Title Check', () => {
  const checkMetaTitle = (content: ContentData): CheckResult => {
    if (!content.metaTitle) {
      return { status: 'warning', message: 'Meta title not set (will use page title)' };
    }
    if (content.metaTitle.length > 60) {
      return { status: 'warning', message: `Meta title too long (${content.metaTitle.length}/60 chars)` };
    }
    if (content.metaTitle.length < 30) {
      return { status: 'warning', message: `Meta title short (${content.metaTitle.length}/60 chars)` };
    }
    return { status: 'pass', message: `${content.metaTitle.length}/60 characters` };
  };

  it('should warn when no meta title', () => {
    const result = checkMetaTitle({ metaTitle: null, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
  });

  it('should warn when meta title too long', () => {
    const longTitle = 'A'.repeat(70);
    const result = checkMetaTitle({ metaTitle: longTitle, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
    expect(result.message).toContain('too long');
  });

  it('should warn when meta title too short', () => {
    const result = checkMetaTitle({ metaTitle: 'Short', id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
    expect(result.message).toContain('short');
  });

  it('should pass when ideal length', () => {
    const result = checkMetaTitle({ metaTitle: 'A Well Crafted SEO Meta Title for the Article', id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('pass');
  });
});

describe('Pre-Publish Checklist - Meta Description Check', () => {
  const checkMetaDescription = (content: ContentData): CheckResult => {
    if (!content.metaDescription) {
      return { status: 'warning', message: 'Meta description not set' };
    }
    if (content.metaDescription.length > 160) {
      return { status: 'warning', message: `Description too long (${content.metaDescription.length}/160 chars)` };
    }
    if (content.metaDescription.length < 70) {
      return { status: 'warning', message: `Description short (${content.metaDescription.length}/160 chars)` };
    }
    return { status: 'pass', message: `${content.metaDescription.length}/160 characters` };
  };

  it('should warn when no description', () => {
    const result = checkMetaDescription({ metaDescription: null, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
  });

  it('should warn when description too long', () => {
    const longDesc = 'A'.repeat(170);
    const result = checkMetaDescription({ metaDescription: longDesc, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
  });

  it('should pass when ideal length', () => {
    const desc = 'This is a well-crafted meta description that provides a concise summary of the article content for search engines.';
    const result = checkMetaDescription({ metaDescription: desc, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, seoScore: null, metaTitle: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('pass');
  });
});

describe('Pre-Publish Checklist - SEO Score Check', () => {
  const checkSeoScore = (content: ContentData): CheckResult => {
    if (!content.seoScore) {
      return { status: 'warning', message: 'SEO score not calculated' };
    }
    if (content.seoScore < 30) {
      return { status: 'fail', message: `SEO score very low (${content.seoScore}/100)` };
    }
    if (content.seoScore < 50) {
      return { status: 'warning', message: `SEO score needs improvement (${content.seoScore}/100)` };
    }
    if (content.seoScore >= 80) {
      return { status: 'pass', message: `Excellent SEO score (${content.seoScore}/100)` };
    }
    return { status: 'pass', message: `Good SEO score (${content.seoScore}/100)` };
  };

  it('should warn when no SEO score', () => {
    const result = checkSeoScore({ seoScore: null, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
  });

  it('should fail when SEO score very low', () => {
    const result = checkSeoScore({ seoScore: 20, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('fail');
  });

  it('should warn when SEO score needs improvement', () => {
    const result = checkSeoScore({ seoScore: 40, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
  });

  it('should pass when good SEO score', () => {
    const result = checkSeoScore({ seoScore: 65, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('pass');
  });

  it('should indicate excellent SEO score', () => {
    const result = checkSeoScore({ seoScore: 85, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, answerCapsule: null, aeoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('pass');
    expect(result.message).toContain('Excellent');
  });
});

describe('Pre-Publish Checklist - Answer Capsule Check', () => {
  const checkAnswerCapsule = (content: ContentData): CheckResult => {
    if (!content.answerCapsule) {
      return { status: 'warning', message: 'No answer capsule for AI engines' };
    }
    const words = content.answerCapsule.trim().split(/\s+/).length;
    if (words < 30) {
      return { status: 'warning', message: `Answer capsule short (${words} words, aim for 40-60)` };
    }
    if (words > 80) {
      return { status: 'warning', message: `Answer capsule long (${words} words, aim for 40-60)` };
    }
    return { status: 'pass', message: `${words} words (ideal: 40-60)` };
  };

  it('should warn when no answer capsule', () => {
    const result = checkAnswerCapsule({ answerCapsule: null, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
  });

  it('should warn when capsule too short', () => {
    const result = checkAnswerCapsule({ answerCapsule: 'This is a short capsule.', id: '1', title: 'Test', type: 'article', slug: null, blocks: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
    expect(result.message).toContain('short');
  });

  it('should warn when capsule too long', () => {
    const longCapsule = Array(100).fill('word').join(' ');
    const result = checkAnswerCapsule({ answerCapsule: longCapsule, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('warning');
    expect(result.message).toContain('long');
  });

  it('should pass when ideal length', () => {
    const idealCapsule = Array(50).fill('word').join(' ');
    const result = checkAnswerCapsule({ answerCapsule: idealCapsule, id: '1', title: 'Test', type: 'article', slug: null, blocks: null, aeoScore: null, seoScore: null, metaTitle: null, metaDescription: null, primaryKeyword: null, heroImage: null, cardImage: null, wordCount: null });
    expect(result.status).toBe('pass');
  });
});

describe('Pre-Publish Checklist - Summary Calculation', () => {
  interface ChecklistItem {
    status: ChecklistItemStatus;
    priority: 'required' | 'recommended' | 'optional';
  }

  const calculateSummary = (items: ChecklistItem[]) => {
    return {
      passed: items.filter(i => i.status === 'pass').length,
      failed: items.filter(i => i.status === 'fail').length,
      warnings: items.filter(i => i.status === 'warning').length,
      skipped: items.filter(i => i.status === 'skip').length,
      total: items.length,
    };
  };

  const canPublish = (items: ChecklistItem[]): boolean => {
    const requiredItems = items.filter(i => i.priority === 'required');
    return requiredItems.every(i => i.status === 'pass');
  };

  it('should calculate summary correctly', () => {
    const items: ChecklistItem[] = [
      { status: 'pass', priority: 'required' },
      { status: 'pass', priority: 'required' },
      { status: 'fail', priority: 'recommended' },
      { status: 'warning', priority: 'optional' },
      { status: 'skip', priority: 'optional' },
    ];

    const summary = calculateSummary(items);
    expect(summary.passed).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.warnings).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.total).toBe(5);
  });

  it('should allow publish when all required items pass', () => {
    const items: ChecklistItem[] = [
      { status: 'pass', priority: 'required' },
      { status: 'pass', priority: 'required' },
      { status: 'fail', priority: 'recommended' },
      { status: 'warning', priority: 'optional' },
    ];

    expect(canPublish(items)).toBe(true);
  });

  it('should block publish when any required item fails', () => {
    const items: ChecklistItem[] = [
      { status: 'pass', priority: 'required' },
      { status: 'fail', priority: 'required' },
      { status: 'pass', priority: 'recommended' },
    ];

    expect(canPublish(items)).toBe(false);
  });

  it('should allow publish when recommended items fail but required pass', () => {
    const items: ChecklistItem[] = [
      { status: 'pass', priority: 'required' },
      { status: 'fail', priority: 'recommended' },
      { status: 'fail', priority: 'optional' },
    ];

    expect(canPublish(items)).toBe(true);
  });
});

describe('Pre-Publish Checklist - Overall Score', () => {
  const calculateOverallScore = (passed: number, failed: number, warnings: number): number => {
    const total = passed + failed + warnings;
    if (total === 0) return 0;
    return Math.round((passed / total) * 100);
  };

  it('should return 100 when all pass', () => {
    expect(calculateOverallScore(10, 0, 0)).toBe(100);
  });

  it('should return 0 when all fail', () => {
    expect(calculateOverallScore(0, 10, 0)).toBe(0);
  });

  it('should calculate partial score correctly', () => {
    // 5 pass, 3 fail, 2 warnings = 5/10 = 50%
    expect(calculateOverallScore(5, 3, 2)).toBe(50);
  });

  it('should handle empty case', () => {
    expect(calculateOverallScore(0, 0, 0)).toBe(0);
  });
});
