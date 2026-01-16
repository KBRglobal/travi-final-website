/**
 * Traffic Optimization - Integration Tests
 *
 * Tests the full pipeline: traffic data → bottleneck → proposal
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TrafficSegmentAnalyzer,
  BottleneckDetector,
  ProposalEngine,
  resetSegmentAnalyzer,
  resetBottleneckDetector,
  resetProposalEngine,
} from '../../../server/traffic-optimization';

describe('Traffic → Bottleneck → Proposal Pipeline', () => {
  let segmentAnalyzer: TrafficSegmentAnalyzer;
  let bottleneckDetector: BottleneckDetector;
  let proposalEngine: ProposalEngine;

  beforeEach(() => {
    segmentAnalyzer = new TrafficSegmentAnalyzer();
    bottleneckDetector = new BottleneckDetector();
    proposalEngine = new ProposalEngine();
  });

  afterEach(() => {
    segmentAnalyzer.clear();
    bottleneckDetector.clear();
    proposalEngine.clear();
    resetSegmentAnalyzer();
    resetBottleneckDetector();
    resetProposalEngine();
  });

  it('should generate proposals from traffic data with high bounce rate', () => {
    // Step 1: Record traffic visits with poor engagement
    const contentId = 'article-123';
    const contentTitle = 'How to Improve SEO Rankings';

    // Simulate 100 visits with high bounce rate
    for (let i = 0; i < 100; i++) {
      segmentAnalyzer.recordVisit('organic_search', 'informational', 'desktop', {
        contentId,
        isBounce: i < 80, // 80% bounce rate
        timeOnPage: i < 80 ? 5 : 120,
        isConversion: i > 95, // 4% conversion
      });
    }

    // Step 2: Generate segment report
    const segmentReport = segmentAnalyzer.generateReport();
    expect(segmentReport.segments.length).toBe(1);

    const segment = segmentReport.segments[0];
    expect(segment.metrics.bounceRate).toBe(0.8);

    // Step 3: Feed segment data to bottleneck detector
    bottleneckDetector.addContentMetrics({
      contentId,
      title: contentTitle,
      impressions: 500,
      visits: segment.metrics.visits,
      bounceRate: segment.metrics.bounceRate,
      avgTimeOnPage: segment.metrics.avgTimeOnPage,
      conversionRate: segment.metrics.conversionRate,
      ctr: 0.2,
    });

    // Step 4: Detect bottlenecks
    const bottlenecks = bottleneckDetector.detect();
    expect(bottlenecks.length).toBeGreaterThan(0);

    // Should detect high bounce rate
    const bounceBottleneck = bottlenecks.find((b) => b.type === 'high_bounce_rate');
    expect(bounceBottleneck).toBeDefined();

    // Step 5: Generate proposals from bottlenecks
    const proposals = proposalEngine.generateFromBottleneck(bounceBottleneck!, {
      contentId,
      contentTitle,
      currentMetrics: {
        bounceRate: segment.metrics.bounceRate,
        visits: segment.metrics.visits,
      },
    });

    // Should generate at least one proposal
    expect(proposals.length).toBeGreaterThan(0);

    // Check proposal properties
    const proposal = proposals[0];
    expect(proposal.contentId).toBe(contentId);
    expect(proposal.status).toBe('pending');
    expect(proposal.isReversible).toBe(true);
    expect(proposal.changes.length).toBeGreaterThan(0);
  });

  it('should generate AEO proposal for AI traffic on non-optimized content', () => {
    const contentId = 'guide-456';
    const contentTitle = 'Complete Guide to Machine Learning';

    // Step 1: Record AI search visits
    for (let i = 0; i < 50; i++) {
      segmentAnalyzer.recordVisit('ai_search', 'informational', 'desktop', {
        contentId,
        subSource: 'chatgpt',
        isBounce: i < 25,
        timeOnPage: 90,
      });
    }

    const segmentReport = segmentAnalyzer.generateReport();
    const aiSegment = segmentReport.segments.find((s) => s.segment.source === 'ai_search');
    expect(aiSegment).toBeDefined();

    // Step 2: Add content metrics indicating non-AEO content
    bottleneckDetector.addContentMetrics({
      contentId,
      title: contentTitle,
      impressions: 300,
      visits: 100,
      bounceRate: 0.5,
      avgTimeOnPage: 90,
      conversionRate: 0.02,
      ctr: 0.05,
      aiVisibilityScore: 20, // Low AI visibility
      hasAeoCapsule: false,
      segments: [
        {
          segment: aiSegment!.segment,
          visits: aiSegment!.metrics.visits,
          uniqueVisitors: aiSegment!.metrics.uniqueVisitors,
          bounceRate: aiSegment!.metrics.bounceRate,
          avgTimeOnPage: aiSegment!.metrics.avgTimeOnPage,
          conversionRate: aiSegment!.metrics.conversionRate,
          engagementScore: aiSegment!.metrics.engagementScore,
        },
      ],
    });

    // Step 3: Detect bottlenecks
    const bottlenecks = bottleneckDetector.detect();
    const aiBottleneck = bottlenecks.find((b) => b.type === 'ai_traffic_non_aeo');
    expect(aiBottleneck).toBeDefined();
    expect(aiBottleneck?.affectedSegments.length).toBeGreaterThan(0);

    // Step 4: Generate proposals
    const proposals = proposalEngine.generateFromBottleneck(aiBottleneck!, {
      contentId,
      contentTitle,
      currentMetrics: {
        aiVisibilityScore: 20,
        visits: 100,
      },
    });

    // Should include AEO capsule proposal
    const aeoCapsuleProposal = proposals.find((p) => p.type === 'add_aeo_capsule');
    expect(aeoCapsuleProposal).toBeDefined();
    expect(aeoCapsuleProposal?.changes[0].field).toBe('answerCapsule');
    expect(aeoCapsuleProposal?.expectedImpact[0].metric).toBe('aiVisibilityScore');
  });

  it('should recommend experiment for high-traffic content proposals', () => {
    const contentId = 'popular-article';
    const contentTitle = 'Top 10 Travel Destinations';

    // Simulate high traffic with low CTR
    for (let i = 0; i < 200; i++) {
      segmentAnalyzer.recordVisit('organic_search', 'commercial', 'mobile', {
        contentId,
        isBounce: i < 100,
        timeOnPage: 60,
      });
    }

    bottleneckDetector.addContentMetrics({
      contentId,
      title: contentTitle,
      impressions: 5000,
      visits: 200,
      bounceRate: 0.5,
      avgTimeOnPage: 60,
      conversionRate: 0.01,
      ctr: 0.015, // Low CTR
    });

    const bottlenecks = bottleneckDetector.detect();
    const ctrBottleneck = bottlenecks.find((b) => b.type === 'high_impressions_low_ctr');
    expect(ctrBottleneck).toBeDefined();

    const proposals = proposalEngine.generateFromBottleneck(ctrBottleneck!, {
      contentId,
      contentTitle,
      contentSlug: 'top-10-travel-destinations',
      currentMetrics: {
        ctr: 0.015,
        visits: 500, // High traffic - above experiment threshold
      },
    });

    // At least one proposal should recommend an experiment
    const experimentProposal = proposals.find((p) => p.shouldExperiment);
    expect(experimentProposal).toBeDefined();
    expect(experimentProposal?.experimentConfig).toBeDefined();
    expect(experimentProposal?.experimentConfig?.variants.length).toBe(2);
    expect(experimentProposal?.experimentConfig?.type).toBe('ab_test');
  });

  it('should track proposal lifecycle correctly', () => {
    const contentId = 'test-content';
    const contentTitle = 'Test Article';

    bottleneckDetector.addContentMetrics({
      contentId,
      title: contentTitle,
      impressions: 500,
      visits: 100,
      bounceRate: 0.8,
      avgTimeOnPage: 20,
      conversionRate: 0.005,
      ctr: 0.03,
    });

    const bottlenecks = bottleneckDetector.detect();
    const proposals = proposalEngine.generateFromBottleneck(bottlenecks[0], {
      contentId,
      contentTitle,
      currentMetrics: { visits: 100 },
    });

    const proposalId = proposals[0].id;

    // Initial state
    expect(proposals[0].status).toBe('pending');

    // Approve
    const approved = proposalEngine.approveProposal(proposalId, 'admin@example.com');
    expect(approved?.status).toBe('approved');
    expect(approved?.approvedBy).toBe('admin@example.com');

    // Implement
    const implemented = proposalEngine.markImplemented(proposalId);
    expect(implemented?.status).toBe('implemented');
    expect(implemented?.implementedAt).toBeDefined();

    // Rollback
    const rolledBack = proposalEngine.rollback(proposalId, 'Performance degraded');
    expect(rolledBack?.status).toBe('rolled_back');
    expect(rolledBack?.rollbackReason).toBe('Performance degraded');
  });

  it('should reject proposal and track reason', () => {
    bottleneckDetector.addContentMetrics({
      contentId: 'test',
      impressions: 500,
      visits: 100,
      bounceRate: 0.8,
      avgTimeOnPage: 20,
      conversionRate: 0.005,
      ctr: 0.03,
    });

    const bottlenecks = bottleneckDetector.detect();
    const proposals = proposalEngine.generateFromBottleneck(bottlenecks[0], {
      contentId: 'test',
      contentTitle: 'Test',
      currentMetrics: { visits: 100 },
    });

    const proposalId = proposals[0].id;

    const rejected = proposalEngine.rejectProposal(
      proposalId,
      'editor@example.com',
      'Not aligned with brand voice'
    );

    expect(rejected?.status).toBe('rejected');
    expect(rejected?.rejectedBy).toBe('editor@example.com');
    expect(rejected?.rejectionReason).toBe('Not aligned with brand voice');
  });

  it('should handle multiple content items and aggregate proposals', () => {
    const contentItems = [
      { id: 'article-1', bounceRate: 0.85, visits: 100 },
      { id: 'article-2', bounceRate: 0.9, visits: 150 },
      { id: 'article-3', bounceRate: 0.4, visits: 200 }, // Good engagement
    ];

    for (const item of contentItems) {
      bottleneckDetector.addContentMetrics({
        contentId: item.id,
        title: `Article ${item.id}`,
        impressions: item.visits * 5,
        visits: item.visits,
        bounceRate: item.bounceRate,
        avgTimeOnPage: item.bounceRate > 0.7 ? 15 : 120,
        conversionRate: item.bounceRate > 0.7 ? 0.005 : 0.03,
        ctr: 0.04,
      });
    }

    bottleneckDetector.detect();
    const report = bottleneckDetector.generateReport();

    // Should detect issues for articles 1 and 2, but not 3
    const affectedContentIds = new Set(
      report.bottlenecks.flatMap((b) => b.affectedContent.map((c) => c.contentId))
    );

    expect(affectedContentIds.has('article-1')).toBe(true);
    expect(affectedContentIds.has('article-2')).toBe(true);
    expect(affectedContentIds.has('article-3')).toBe(false);

    // Generate proposals for all bottlenecks
    let totalProposals = 0;
    for (const bottleneck of report.bottlenecks) {
      const proposals = proposalEngine.generateFromBottleneck(bottleneck, {
        contentId: bottleneck.affectedContent[0].contentId,
        contentTitle: bottleneck.affectedContent[0].title,
        currentMetrics: { visits: 100 },
      });
      totalProposals += proposals.length;
    }

    expect(totalProposals).toBeGreaterThan(0);

    const summary = proposalEngine.getSummary();
    expect(summary.pending).toBe(totalProposals);
  });
});
