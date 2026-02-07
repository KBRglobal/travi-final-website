/**
 * Entity Quality: Dedup Scanner - Configuration
 * Feature Flag: ENABLE_ENTITY_QUALITY=true
 */

export function isEntityQualityEnabled(): boolean {
  return process.env.ENABLE_ENTITY_QUALITY === "true";
}

export const ENTITY_QUALITY_CONFIG = {
  // Batch size for scanning
  batchSize: Number.parseInt(process.env.ENTITY_DEDUP_BATCH_SIZE || "100", 10),

  // Minimum confidence score to create a suggestion
  minConfidenceThreshold: Number.parseInt(process.env.ENTITY_DEDUP_MIN_CONFIDENCE || "70", 10),

  // Maximum suggestions to store
  maxSuggestionsStored: Number.parseInt(process.env.ENTITY_DEDUP_MAX_SUGGESTIONS || "1000", 10),

  // Distance threshold for geo matching (in km)
  geoProximityKm: Number.parseFloat(process.env.ENTITY_GEO_PROXIMITY_KM || "0.5"),

  // Weight for each match factor
  weights: {
    name: 0.5,
    geo: 0.2,
    website: 0.15,
    phone: 0.15,
  },
} as const;
