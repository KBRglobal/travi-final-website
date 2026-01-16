/**
 * Intelligence Coverage Engine - Tests
 *
 * Tests for coverage scoring and idempotent evaluation.
 */

import { describe, it, expect } from 'vitest';
import { calculateCoverageScore } from './evaluator';
import type { ContentCoverageSignals } from './types';

describe('calculateCoverageScore', () => {
  it('returns 0 for content with no signals', () => {
    const signals: ContentCoverageSignals = {
      hasEntities: false,
      entityCount: 0,
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: false,
      hasAeoCapsule: false,
      aeoScore: null,
      isPublished: false,
    };

    const score = calculateCoverageScore(signals);
    expect(score).toBe(0);
  });

  it('returns max score for fully optimized content', () => {
    const signals: ContentCoverageSignals = {
      hasEntities: true,
      entityCount: 10,
      linkedEntitiesCount: 5,
      hasInternalLinks: true,
      internalLinkCount: 10,
      isSearchIndexed: true,
      hasAeoCapsule: true,
      aeoScore: 100,
      isPublished: true,
    };

    const score = calculateCoverageScore(signals);
    expect(score).toBe(100);
  });

  it('weights entity presence heavily', () => {
    const withEntities: ContentCoverageSignals = {
      hasEntities: true,
      entityCount: 1,
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: false,
      hasAeoCapsule: false,
      aeoScore: null,
      isPublished: false,
    };

    const withoutEntities: ContentCoverageSignals = {
      hasEntities: false,
      entityCount: 0,
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: false,
      hasAeoCapsule: false,
      aeoScore: null,
      isPublished: false,
    };

    const scoreWith = calculateCoverageScore(withEntities);
    const scoreWithout = calculateCoverageScore(withoutEntities);

    // Entity presence should add at least 25 points
    expect(scoreWith - scoreWithout).toBeGreaterThanOrEqual(25);
  });

  it('weights search indexing appropriately', () => {
    const indexed: ContentCoverageSignals = {
      hasEntities: false,
      entityCount: 0,
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: true,
      hasAeoCapsule: false,
      aeoScore: null,
      isPublished: true,
    };

    const notIndexed: ContentCoverageSignals = {
      hasEntities: false,
      entityCount: 0,
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: false,
      hasAeoCapsule: false,
      aeoScore: null,
      isPublished: true,
    };

    const scoreIndexed = calculateCoverageScore(indexed);
    const scoreNotIndexed = calculateCoverageScore(notIndexed);

    // Search indexing should add 20 points
    expect(scoreIndexed - scoreNotIndexed).toBe(20);
  });

  it('applies diminishing returns for entity count', () => {
    const fewEntities: ContentCoverageSignals = {
      hasEntities: true,
      entityCount: 2,
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: false,
      hasAeoCapsule: false,
      aeoScore: null,
      isPublished: false,
    };

    const manyEntities: ContentCoverageSignals = {
      hasEntities: true,
      entityCount: 20, // More than max threshold
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: false,
      hasAeoCapsule: false,
      aeoScore: null,
      isPublished: false,
    };

    const scoreFew = calculateCoverageScore(fewEntities);
    const scoreMany = calculateCoverageScore(manyEntities);

    // Score should cap at threshold, not increase linearly
    // Max 10 points for entityCount, so difference should be <= 10
    expect(scoreMany - scoreFew).toBeLessThanOrEqual(10);
  });

  it('is deterministic (idempotent scoring)', () => {
    const signals: ContentCoverageSignals = {
      hasEntities: true,
      entityCount: 5,
      linkedEntitiesCount: 2,
      hasInternalLinks: true,
      internalLinkCount: 3,
      isSearchIndexed: true,
      hasAeoCapsule: true,
      aeoScore: 75,
      isPublished: true,
    };

    // Call multiple times
    const score1 = calculateCoverageScore(signals);
    const score2 = calculateCoverageScore(signals);
    const score3 = calculateCoverageScore(signals);

    // All scores should be identical
    expect(score1).toBe(score2);
    expect(score2).toBe(score3);
  });

  it('includes AEO score contribution when available', () => {
    const withAeo: ContentCoverageSignals = {
      hasEntities: false,
      entityCount: 0,
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: false,
      hasAeoCapsule: true,
      aeoScore: 100,
      isPublished: false,
    };

    const withoutAeoScore: ContentCoverageSignals = {
      hasEntities: false,
      entityCount: 0,
      linkedEntitiesCount: 0,
      hasInternalLinks: false,
      internalLinkCount: 0,
      isSearchIndexed: false,
      hasAeoCapsule: true,
      aeoScore: null,
      isPublished: false,
    };

    const scoreWithAeo = calculateCoverageScore(withAeo);
    const scoreWithoutAeoScore = calculateCoverageScore(withoutAeoScore);

    // AEO score should add up to 5 points
    expect(scoreWithAeo - scoreWithoutAeoScore).toBe(5);
  });
});
