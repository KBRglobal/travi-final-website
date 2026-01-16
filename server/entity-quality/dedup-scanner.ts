/**
 * Entity Quality: Dedup Scanner - Core Scanner Logic
 * Identifies potential duplicate entities
 */

import { createLogger } from '../lib/logger';
import { ENTITY_QUALITY_CONFIG } from './config';
import {
  normalizeText,
  stringSimilarity,
  geoSimilarity,
  phoneSimilarity,
  websiteSimilarity,
} from './normalizer';
import type { EntityReference, MatchReason, MergeSuggestion, EntityType, DedupScanResult } from './types';

const logger = createLogger('dedup-scanner');

// ============================================================================
// Match Scoring
// ============================================================================

export interface MatchResult {
  similarity: number;
  reasons: MatchReason[];
}

export function calculateMatch(
  entity1: EntityReference,
  entity2: EntityReference
): MatchResult {
  const reasons: MatchReason[] = [];
  const weights = ENTITY_QUALITY_CONFIG.weights;

  // Name similarity (required)
  const nameSim = stringSimilarity(entity1.normalizedName, entity2.normalizedName);
  if (nameSim > 0.7) {
    reasons.push({
      field: 'name',
      similarity: nameSim,
      description: `Names are ${Math.round(nameSim * 100)}% similar`,
    });
  }

  // Geo proximity
  const geoSim = geoSimilarity(
    entity1.latitude,
    entity1.longitude,
    entity2.latitude,
    entity2.longitude,
    ENTITY_QUALITY_CONFIG.geoProximityKm
  );
  if (geoSim > 0) {
    reasons.push({
      field: 'geo',
      similarity: geoSim,
      description: `Locations are within proximity (${Math.round(geoSim * 100)}%)`,
    });
  }

  // Website
  const webSim = websiteSimilarity(entity1.website, entity2.website);
  if (webSim > 0.8) {
    reasons.push({
      field: 'website',
      similarity: webSim,
      description: `Websites match (${Math.round(webSim * 100)}%)`,
    });
  }

  // Phone
  const phoneSim = phoneSimilarity(entity1.phone, entity2.phone);
  if (phoneSim > 0.8) {
    reasons.push({
      field: 'phone',
      similarity: phoneSim,
      description: `Phone numbers match (${Math.round(phoneSim * 100)}%)`,
    });
  }

  // Calculate weighted score
  const totalSimilarity =
    nameSim * weights.name +
    geoSim * weights.geo +
    webSim * weights.website +
    phoneSim * weights.phone;

  // Normalize to 0-100
  const score = Math.round(totalSimilarity * 100);

  return { similarity: score, reasons };
}

// ============================================================================
// Scanner
// ============================================================================

export function scanForDuplicates(
  entities: EntityReference[],
  entityType: EntityType
): MergeSuggestion[] {
  const startTime = Date.now();
  const suggestions: MergeSuggestion[] = [];
  const minConfidence = ENTITY_QUALITY_CONFIG.minConfidenceThreshold;
  const batchSize = ENTITY_QUALITY_CONFIG.batchSize;

  // Limit to batch size
  const toScan = entities.slice(0, batchSize);

  logger.debug({ entityType, count: toScan.length }, 'Starting dedup scan');

  // Compare each pair (O(n²) but bounded by batch size)
  for (let i = 0; i < toScan.length; i++) {
    for (let j = i + 1; j < toScan.length; j++) {
      const entity1 = toScan[i];
      const entity2 = toScan[j];

      // Skip if same destination (likely not duplicates)
      if (entity1.destinationId !== entity2.destinationId) {
        continue;
      }

      const match = calculateMatch(entity1, entity2);

      if (match.similarity >= minConfidence) {
        const suggestion: MergeSuggestion = {
          id: `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          entityType,
          primaryEntity: entity1,
          duplicateEntity: entity2,
          confidenceScore: match.similarity,
          matchReasons: match.reasons,
          status: 'open',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        suggestions.push(suggestion);
      }
    }
  }

  const duration = Date.now() - startTime;
  logger.info({
    entityType,
    scanned: toScan.length,
    found: suggestions.length,
    durationMs: duration,
  }, 'Dedup scan completed');

  return suggestions;
}

export function createScanResult(
  entityType: EntityType,
  scannedCount: number,
  suggestionsFound: number,
  durationMs: number
): DedupScanResult {
  return {
    entityType,
    scannedCount,
    suggestionsFound,
    duration: durationMs,
    timestamp: new Date(),
  };
}
