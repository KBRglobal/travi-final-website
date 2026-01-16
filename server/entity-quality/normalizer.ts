/**
 * Entity Quality: Dedup Scanner - Normalizer
 * Text normalization and similarity calculation utilities
 */

// ============================================================================
// Text Normalization
// ============================================================================

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove common suffixes/prefixes
    .replace(/^the\s+/i, '')
    .replace(/\s+(hotel|restaurant|cafe|bar|lounge|beach|club)$/i, '')
    // Remove special characters except spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

export function normalizeWebsite(url: string): string {
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

// ============================================================================
// Similarity Calculations
// ============================================================================

/**
 * Levenshtein distance-based similarity
 */
export function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  const longerLength = longer.length;
  if (longerLength === 0) return 1;

  const distance = levenshteinDistance(longer, shorter);
  return (longerLength - distance) / longerLength;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) {
      costs[s2.length] = lastValue;
    }
  }
  return costs[s2.length];
}

/**
 * Haversine formula for distance between two points
 */
export function geoDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate geo similarity based on distance
 */
export function geoSimilarity(
  lat1: number | undefined,
  lon1: number | undefined,
  lat2: number | undefined,
  lon2: number | undefined,
  thresholdKm: number
): number {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }

  const distance = geoDistance(lat1, lon1, lat2, lon2);
  if (distance > thresholdKm * 2) return 0;
  if (distance <= thresholdKm) return 1 - (distance / thresholdKm) * 0.5;
  return 0.5 - ((distance - thresholdKm) / thresholdKm) * 0.5;
}

/**
 * Phone number similarity
 */
export function phoneSimilarity(phone1: string | undefined, phone2: string | undefined): number {
  if (!phone1 || !phone2) return 0;

  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);

  if (normalized1 === normalized2) return 1;

  // Check if one is a suffix of the other (accounting for country codes)
  if (normalized1.endsWith(normalized2) || normalized2.endsWith(normalized1)) {
    return 0.9;
  }

  return stringSimilarity(normalized1, normalized2);
}

/**
 * Website similarity
 */
export function websiteSimilarity(url1: string | undefined, url2: string | undefined): number {
  if (!url1 || !url2) return 0;

  const normalized1 = normalizeWebsite(url1);
  const normalized2 = normalizeWebsite(url2);

  if (normalized1 === normalized2) return 1;

  // Extract domain only
  const domain1 = normalized1.split('/')[0];
  const domain2 = normalized2.split('/')[0];

  if (domain1 === domain2) return 0.95;

  return stringSimilarity(domain1, domain2);
}
