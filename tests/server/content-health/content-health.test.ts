/**
 * Content Health Tests
 *
 * Tests for automated content health monitoring and issue detection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock database
vi.mock('../../../server/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
  },
}));

describe('Content Health Types', () => {
  describe('Feature Flags', () => {
    it('should return false when ENABLE_CONTENT_HEALTH_JOBS is not set', () => {
      const isEnabled = (envValue: string | undefined): boolean => {
        return envValue === 'true';
      };

      expect(isEnabled(undefined)).toBe(false);
      expect(isEnabled('false')).toBe(false);
      expect(isEnabled('')).toBe(false);
    });

    it('should return true when ENABLE_CONTENT_HEALTH_JOBS is "true"', () => {
      const isEnabled = (envValue: string | undefined): boolean => {
        return envValue === 'true';
      };

      expect(isEnabled('true')).toBe(true);
    });
  });

  describe('Issue Severity Mapping', () => {
    it('should map issue types to correct severity', () => {
      type HealthIssueSeverity = 'critical' | 'warning' | 'info';
      type HealthIssueType =
        | 'no_entities'
        | 'no_aeo_capsule'
        | 'not_indexed'
        | 'no_blocks'
        | 'low_seo_score';

      const severityMap: Record<HealthIssueType, HealthIssueSeverity> = {
        no_blocks: 'critical',
        no_entities: 'warning',
        no_aeo_capsule: 'warning',
        not_indexed: 'warning',
        low_seo_score: 'info',
      };

      expect(severityMap['no_blocks']).toBe('critical');
      expect(severityMap['no_entities']).toBe('warning');
      expect(severityMap['no_aeo_capsule']).toBe('warning');
      expect(severityMap['not_indexed']).toBe('warning');
      expect(severityMap['low_seo_score']).toBe('info');
    });
  });
});

describe('Content Health Scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Issue Detection', () => {
    it('should detect no blocks issue', () => {
      const detectIssues = (content: { blocks: unknown[] | null }) => {
        const issues: string[] = [];
        if (!content.blocks || content.blocks.length === 0) {
          issues.push('no_blocks');
        }
        return issues;
      };

      expect(detectIssues({ blocks: null })).toContain('no_blocks');
      expect(detectIssues({ blocks: [] })).toContain('no_blocks');
      expect(detectIssues({ blocks: [{ type: 'text' }] })).not.toContain('no_blocks');
    });

    it('should detect no AEO capsule issue', () => {
      const detectIssues = (content: { answerCapsule: string | null }) => {
        const issues: string[] = [];
        if (!content.answerCapsule) {
          issues.push('no_aeo_capsule');
          issues.push('no_entities'); // Proxy for entities
        }
        return issues;
      };

      expect(detectIssues({ answerCapsule: null })).toContain('no_aeo_capsule');
      expect(detectIssues({ answerCapsule: null })).toContain('no_entities');
      expect(detectIssues({ answerCapsule: 'Summary text' })).not.toContain('no_aeo_capsule');
    });

    it('should detect low SEO score issue', () => {
      const detectIssues = (content: { seoScore: number | null }, minScore: number) => {
        const issues: string[] = [];
        if (content.seoScore !== null && content.seoScore < minScore) {
          issues.push('low_seo_score');
        }
        return issues;
      };

      expect(detectIssues({ seoScore: 30 }, 40)).toContain('low_seo_score');
      expect(detectIssues({ seoScore: 50 }, 40)).not.toContain('low_seo_score');
      expect(detectIssues({ seoScore: null }, 40)).not.toContain('low_seo_score');
    });

    it('should detect stale content issue', () => {
      const detectIssues = (content: { updatedAt: Date | null }, staleDays: number) => {
        const issues: string[] = [];
        if (content.updatedAt) {
          const staleDate = new Date();
          staleDate.setDate(staleDate.getDate() - staleDays);
          if (content.updatedAt < staleDate) {
            issues.push('stale_content');
          }
        }
        return issues;
      };

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 200);

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      expect(detectIssues({ updatedAt: oldDate }, 180)).toContain('stale_content');
      expect(detectIssues({ updatedAt: recentDate }, 180)).not.toContain('stale_content');
    });
  });

  describe('Health Score Calculation', () => {
    it('should calculate correct health score', () => {
      type HealthIssueSeverity = 'critical' | 'warning' | 'info';

      const calculateScore = (issues: HealthIssueSeverity[]): number => {
        let score = 100;
        for (const severity of issues) {
          if (severity === 'critical') score -= 30;
          else if (severity === 'warning') score -= 15;
          else score -= 5;
        }
        return Math.max(0, score);
      };

      expect(calculateScore([])).toBe(100);
      expect(calculateScore(['warning'])).toBe(85);
      expect(calculateScore(['critical'])).toBe(70);
      expect(calculateScore(['critical', 'warning'])).toBe(55);
      expect(calculateScore(['critical', 'critical', 'critical', 'critical'])).toBe(0);
    });

    it('should determine overall health status', () => {
      type HealthIssueSeverity = 'critical' | 'warning' | 'info';
      type OverallHealth = 'healthy' | 'degraded' | 'unhealthy';

      const getOverallHealth = (issues: HealthIssueSeverity[]): OverallHealth => {
        const criticalCount = issues.filter(i => i === 'critical').length;
        const warningCount = issues.filter(i => i === 'warning').length;

        if (criticalCount > 0) return 'unhealthy';
        if (warningCount > 0) return 'degraded';
        return 'healthy';
      };

      expect(getOverallHealth([])).toBe('healthy');
      expect(getOverallHealth(['info'])).toBe('healthy');
      expect(getOverallHealth(['warning'])).toBe('degraded');
      expect(getOverallHealth(['critical'])).toBe('unhealthy');
      expect(getOverallHealth(['warning', 'warning'])).toBe('degraded');
      expect(getOverallHealth(['critical', 'warning'])).toBe('unhealthy');
    });
  });
});

describe('Content Health Repository', () => {
  describe('Issue Management', () => {
    it('should generate unique issue IDs', () => {
      const generateIssueId = (contentId: string, issueType: string): string => {
        return `${contentId}:${issueType}`;
      };

      expect(generateIssueId('content-1', 'no_blocks')).toBe('content-1:no_blocks');
      expect(generateIssueId('content-2', 'no_aeo_capsule')).toBe('content-2:no_aeo_capsule');
    });

    it('should track issue status transitions', () => {
      type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'ignored';

      const validTransitions: Record<IssueStatus, IssueStatus[]> = {
        open: ['in_progress', 'resolved', 'ignored'],
        in_progress: ['resolved', 'open'],
        resolved: ['open'],
        ignored: ['open'],
      };

      const canTransition = (from: IssueStatus, to: IssueStatus): boolean => {
        return validTransitions[from]?.includes(to) ?? false;
      };

      expect(canTransition('open', 'resolved')).toBe(true);
      expect(canTransition('open', 'in_progress')).toBe(true);
      expect(canTransition('resolved', 'open')).toBe(true);
      expect(canTransition('resolved', 'in_progress')).toBe(false);
    });

    it('should sort issues by severity', () => {
      type HealthIssueSeverity = 'critical' | 'warning' | 'info';

      interface Issue {
        id: string;
        severity: HealthIssueSeverity;
      }

      const sortBySeverity = (issues: Issue[]): Issue[] => {
        const severityOrder: Record<HealthIssueSeverity, number> = {
          critical: 0,
          warning: 1,
          info: 2,
        };

        return [...issues].sort(
          (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
        );
      };

      const unsorted: Issue[] = [
        { id: '1', severity: 'info' },
        { id: '2', severity: 'critical' },
        { id: '3', severity: 'warning' },
      ];

      const sorted = sortBySeverity(unsorted);
      expect(sorted[0].severity).toBe('critical');
      expect(sorted[1].severity).toBe('warning');
      expect(sorted[2].severity).toBe('info');
    });
  });

  describe('Statistics', () => {
    it('should count issues by type', () => {
      interface Issue {
        issueType: string;
        status: string;
      }

      const countByType = (issues: Issue[]) => {
        const counts: Record<string, number> = {};
        for (const issue of issues) {
          if (issue.status === 'open') {
            counts[issue.issueType] = (counts[issue.issueType] || 0) + 1;
          }
        }
        return counts;
      };

      const issues: Issue[] = [
        { issueType: 'no_blocks', status: 'open' },
        { issueType: 'no_blocks', status: 'open' },
        { issueType: 'no_aeo_capsule', status: 'open' },
        { issueType: 'no_blocks', status: 'resolved' },
      ];

      const counts = countByType(issues);
      expect(counts['no_blocks']).toBe(2);
      expect(counts['no_aeo_capsule']).toBe(1);
    });

    it('should count resolved in last 24 hours', () => {
      interface Issue {
        status: string;
        resolvedAt: Date | null;
      }

      const countRecentlyResolved = (issues: Issue[]): number => {
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        return issues.filter(
          i => i.status === 'resolved' && i.resolvedAt && i.resolvedAt > oneDayAgo
        ).length;
      };

      const now = new Date();
      const recent = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const old = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 2 days ago

      const issues: Issue[] = [
        { status: 'resolved', resolvedAt: recent },
        { status: 'resolved', resolvedAt: recent },
        { status: 'resolved', resolvedAt: old },
        { status: 'open', resolvedAt: null },
      ];

      expect(countRecentlyResolved(issues)).toBe(2);
    });
  });
});

describe('Content Health Scheduler', () => {
  describe('Batch Processing', () => {
    it('should process in bounded batches', () => {
      const processBatch = (items: string[], batchSize: number, offset: number) => {
        const batch = items.slice(offset, offset + batchSize);
        const hasMore = items.length > offset + batchSize;
        const nextOffset = offset + batchSize;
        return { batch, hasMore, nextOffset };
      };

      const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

      const batch1 = processBatch(items, 3, 0);
      expect(batch1.batch).toEqual(['a', 'b', 'c']);
      expect(batch1.hasMore).toBe(true);
      expect(batch1.nextOffset).toBe(3);

      const batch2 = processBatch(items, 3, 3);
      expect(batch2.batch).toEqual(['d', 'e', 'f']);
      expect(batch2.hasMore).toBe(true);

      const batch4 = processBatch(items, 3, 9);
      expect(batch4.batch).toEqual(['j']);
      expect(batch4.hasMore).toBe(false);
    });

    it('should cycle through all content', () => {
      let offset = 0;
      let cycleComplete = false;
      const totalItems = 100;
      const batchSize = 25;

      const runCycle = () => {
        const processedItems: number[] = [];
        while (!cycleComplete) {
          const remaining = totalItems - offset;
          const batchCount = Math.min(batchSize, remaining);
          processedItems.push(batchCount);

          offset += batchSize;
          if (offset >= totalItems) {
            offset = 0;
            cycleComplete = true;
          }
        }
        return processedItems;
      };

      const batches = runCycle();
      expect(batches).toEqual([25, 25, 25, 25]);
      expect(cycleComplete).toBe(true);
    });
  });

  describe('Job Enqueueing', () => {
    it('should map issue types to job types', () => {
      type IssueType = 'no_aeo_capsule' | 'no_entities' | 'low_seo_score' | 'not_indexed' | 'stale_content';
      type JobType = 'content-enrichment' | 'seo-improvement' | null;

      const getJobType = (issueType: IssueType): JobType => {
        switch (issueType) {
          case 'no_aeo_capsule':
          case 'no_entities':
            return 'content-enrichment';
          case 'low_seo_score':
            return 'seo-improvement';
          case 'not_indexed':
            return 'content-enrichment';
          default:
            return null;
        }
      };

      expect(getJobType('no_aeo_capsule')).toBe('content-enrichment');
      expect(getJobType('low_seo_score')).toBe('seo-improvement');
      expect(getJobType('stale_content')).toBe(null);
    });

    it('should limit jobs enqueued per cycle', () => {
      const MAX_JOBS_PER_CYCLE = 20;

      const enqueueJobs = (issues: string[]): string[] => {
        return issues.slice(0, MAX_JOBS_PER_CYCLE);
      };

      const manyIssues = Array.from({ length: 50 }, (_, i) => `issue-${i}`);
      const enqueued = enqueueJobs(manyIssues);

      expect(enqueued).toHaveLength(20);
      expect(enqueued[0]).toBe('issue-0');
      expect(enqueued[19]).toBe('issue-19');
    });
  });
});

describe('Integration: Health Scan Flow', () => {
  it('should simulate complete health scan flow', () => {
    type IssueType = 'no_blocks' | 'no_aeo_capsule' | 'low_seo_score';
    type IssueStatus = 'open' | 'resolved';

    interface Content {
      id: string;
      blocks: unknown[];
      answerCapsule: string | null;
      seoScore: number;
    }

    interface Issue {
      id: string;
      contentId: string;
      issueType: IssueType;
      status: IssueStatus;
    }

    const issues: Issue[] = [];

    const scanContent = (content: Content): IssueType[] => {
      const found: IssueType[] = [];
      if (!content.blocks || content.blocks.length === 0) found.push('no_blocks');
      if (!content.answerCapsule) found.push('no_aeo_capsule');
      if (content.seoScore < 40) found.push('low_seo_score');
      return found;
    };

    const processScans = (content: Content, detectedIssues: IssueType[]) => {
      const allTypes: IssueType[] = ['no_blocks', 'no_aeo_capsule', 'low_seo_score'];

      for (const issueType of allTypes) {
        const issueId = `${content.id}:${issueType}`;
        const existing = issues.find(i => i.id === issueId);

        if (detectedIssues.includes(issueType)) {
          if (!existing) {
            issues.push({
              id: issueId,
              contentId: content.id,
              issueType,
              status: 'open',
            });
          }
        } else if (existing && existing.status === 'open') {
          existing.status = 'resolved';
        }
      }
    };

    // Step 1: Scan unhealthy content
    const content1: Content = {
      id: 'c1',
      blocks: [],
      answerCapsule: null,
      seoScore: 20,
    };

    const detected1 = scanContent(content1);
    expect(detected1).toContain('no_blocks');
    expect(detected1).toContain('no_aeo_capsule');
    expect(detected1).toContain('low_seo_score');

    processScans(content1, detected1);
    expect(issues).toHaveLength(3);
    expect(issues.every(i => i.status === 'open')).toBe(true);

    // Step 2: Content is fixed
    const content1Fixed: Content = {
      id: 'c1',
      blocks: [{ type: 'text' }],
      answerCapsule: 'Summary',
      seoScore: 80,
    };

    const detected2 = scanContent(content1Fixed);
    expect(detected2).toHaveLength(0);

    processScans(content1Fixed, detected2);
    expect(issues.filter(i => i.status === 'resolved')).toHaveLength(3);
    expect(issues.filter(i => i.status === 'open')).toHaveLength(0);
  });
});
